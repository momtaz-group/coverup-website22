"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { useCart } from "@/context/CartContext";
import { supabase } from "@/utils/supabase";

const DEFAULT_COUPONS = {
  COVERUP10: { type: "percent", value: 10, minSubtotal: 0 },
  FAMILY50: { type: "fixed", value: 50, minSubtotal: 500 },
};

function CartContent() {
  const { t, locale } = useLanguage();
  const { cart, updateQuantity, removeFromCart, clearCart, cartCount } = useCart();
  const searchParams = useSearchParams();

  // Form inputs state
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    city: "",
    address: "",
    locationLink: "",
    deliveryMethod: "delivery",
    paymentMethod: "cash",
    discountCode: "",
    notes: "",
  });

  // UI state
  const [message, setMessage] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [savedLocations, setSavedLocations] = useState([]);

  // Load customer metadata on session load
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const response = await fetch("/api/profile", { headers: { Authorization: `Bearer ${session.access_token}` } });
        const data = await response.json().catch(() => ({}));
        const profile = data.profile || {};
        const locations = Array.isArray(profile.location) ? profile.location : [];
        setSavedLocations(locations);
        const selected = locations.find((item) => item.isDefault) || locations[0];
        setFormData((prev) => selected ? ({
          ...prev,
          name: profile.name || prev.name,
          phone: selected.phone || profile.phone || prev.phone,
          email: profile.email || session.user.email || prev.email,
          city: selected.city || prev.city,
          address: [selected.address1, selected.address2].filter(Boolean).join(", "),
        }) : ({ ...prev, name: profile.name || prev.name, phone: profile.phone || prev.phone, email: profile.email || session.user.email || prev.email }));
      }
    });

    const paymentState = searchParams.get("payment");
    if (paymentState === "return") {
      setMessage(
        locale === "ar"
          ? "لو الدفع تم بنجاح، حالة الطلب هتتحدث تلقائيًا بعد ما Paymob يبعت التأكيد."
          : "If the payment was successful, the order status will be updated automatically as soon as Paymob confirms the transaction."
      );
    }
  }, [searchParams, locale]);

  // Handle inputs changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const selectSavedLocation = (event) => {
    const selected = savedLocations.find((location) => location.id === event.target.value);
    if (!selected) return;
    setFormData((prev) => ({
      ...prev,
      phone: selected.phone || prev.phone,
      city: selected.city || prev.city,
      address: [selected.address1, selected.address2].filter(Boolean).join(", "),
    }));
  };

  // Convert cart object to array
  const cartEntries = Object.entries(cart).map(([id, item]) => ({
    id,
    product: item.snapshot,
    quantity: item.quantity,
  }));

  // Calculations
  const subtotal = cartEntries.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  // Recalculate discount when subtotal or applied coupon code changes
  useEffect(() => {
    const code = couponCode.trim().toUpperCase();
    const coupon = DEFAULT_COUPONS[code];
    if (!code || !coupon || subtotal < Number(coupon.minSubtotal || 0)) {
      setDiscountAmount(0);
      return;
    }

    const amt =
      coupon.type === "percent"
        ? Math.round((subtotal * Number(coupon.value || 0)) / 100)
        : Math.max(0, Number(coupon.value || 0));
    setDiscountAmount(amt);
  }, [couponCode, subtotal]);

  // Shipping fee
  let deliveryFee = 0;
  if (cartCount > 0) {
    if (formData.deliveryMethod === "family_representative") {
      deliveryFee = 90;
    } else if (formData.deliveryMethod === "pickup") {
      deliveryFee = 0;
    } else {
      deliveryFee = 45;
    }
  }

  const grandTotal = Math.max(0, subtotal - discountAmount + deliveryFee);

  const formatMoney = (amount) => {
    return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", {
      style: "currency",
      currency: "EGP",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Validate form details
  const validateForm = () => {
    if (!formData.name.trim() || !formData.phone.trim() || !formData.address.trim()) {
      throw new Error(locale === "ar" ? "كمل الاسم والموبايل والعنوان الأول." : "Please fill in Name, Phone, and Address.");
    }
  };

  // Checkout Handler
  const handleCheckout = async (payMethod) => {
    try {
      validateForm();
      setLoading(true);
      setMessage(locale === "ar" ? "بنجهز طلبك..." : "Processing your order...");

      const orderPayload = {
        channel: "website",
        customer: {
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          city: formData.city.trim(),
          address: formData.address.trim(),
          locationLink: formData.locationLink.trim(),
        },
        notes: formData.notes.trim(),
        deliveryMethod: formData.deliveryMethod,
        paymentMethod: payMethod,
        discountCode: couponCode.trim().toUpperCase(),
        items: cartEntries.map((item) => ({
          id: item.id,
          quantity: item.quantity,
        })),
      };

      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
        body: JSON.stringify(orderPayload),
      });

      const resData = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(resData.message || (locale === "ar" ? "فشل إنشاء الطلب." : "Failed to create order."));
      }

      const order = resData.order;

      if (payMethod === "online") {
        setMessage(locale === "ar" ? "بنجهز رابط الدفع الآمن..." : "Redirecting to secure gateway...");
        const payRes = await fetch("/api/create-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: order.id }),
        });

        const payData = await payRes.json().catch(() => ({}));
        if (!payRes.ok) {
          throw new Error(payData.message || "Failed to initiate online payment.");
        }

        clearCart();
        window.location.href = payData.checkoutUrl;
      } else {
        clearCart();
        setMessage(
          locale === "ar"
            ? `تم تأكيد طلبك رقم ${String(order.id).slice(0, 8)} بنجاح. `
            : `Order #${String(order.id).slice(0, 8)} placed successfully. `
        );
      }
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="cart-page">
      <section className="cart-page-head">
        <div>
          <p className="eyebrow">{locale === "ar" ? "سلة Cover Up" : "Your Cart"}</p>
          <h1>{locale === "ar" ? "راجع طلبك قبل التأكيد." : "Review your details."}</h1>
        </div>
        <Link href="/products" className="button button-secondary">
          {locale === "ar" ? "اكمل تسوق" : "Continue Shopping"}
        </Link>
      </section>

      {cartEntries.length > 0 ? (
        <section className="cart-layout">
          {/* Cart items list */}
          <div className="cart-main-card">
            <div className="cart-main-title">
              <h2>{locale === "ar" ? "سلة المشتريات" : "Shopping Cart"}</h2>
              <span>{locale === "ar" ? "السعر" : "Price"}</span>
            </div>
            
            <div className="cart-page-list">
              {cartEntries.map((item) => {
                const displayName = locale === "en" && item.product.name_en ? item.product.name_en : item.product.name;
                return (
                  <article key={item.id} className="cart-page-item">
                    <div className="cart-page-media"><img src={item.product.image} alt={displayName} /></div>
                    <div className="cart-page-info">
                      <div className="cart-page-item-head">
                        <h2><Link href={`/product?id=${item.id}`}>{displayName}</Link></h2>
                        <strong>{formatMoney(item.product.price * item.quantity)}</strong>
                      </div>
                      <span className="cart-page-stock">{locale === "ar" ? "متوفر" : "In Stock"}</span>
                      <small>{locale === "ar" ? "شحن من Cover Up" : "Ships from Cover Up"}</small>
                      <div className="cart-page-actions">
                        <button type="button" className="quantity-btn" onClick={() => updateQuantity(item.id, item.quantity - 1)}>-</button>
                        <span>{item.quantity}</span>
                        <button type="button" className="quantity-btn" onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                        <button type="button" className="remove-cart-item" onClick={() => removeFromCart(item.id)}>{locale === "ar" ? "إزالة" : "Delete"}</button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="cart-page-subtotal">
              <span>{locale === "ar" ? `إجمالي المنتجات (${cartCount} قطعة):` : `Products Subtotal (${cartCount} items):`}</span>
              <strong>{formatMoney(subtotal)}</strong>
            </div>
          </div>

          {/* Checkout sidebar */}
          <aside className="cart-summary-card">
            <div className="cart-summary-top">
              <span>{locale === "ar" ? "جاهز لإتمام الطلب" : "Ready to check out"}</span>
              <strong>{locale === "ar" ? `إجمالي الطلب (${cartCount} قطعة)` : `Total Order (${cartCount} items)`}</strong>
              <b>{formatMoney(grandTotal)}</b>
            </div>

            <div className="cart-checkout-form">
              <div className="cart-form-grid">
                {savedLocations.length > 0 && (
                  <label className="cart-span-full">
                    {locale === "ar" ? "استخدم عنواناً محفوظاً" : "Use a saved address"}
                    <select defaultValue="" onChange={selectSavedLocation}>
                      <option value="">{locale === "ar" ? "اختر عنواناً" : "Choose an address"}</option>
                      {savedLocations.map((location) => <option key={location.id} value={location.id}>{location.label} - {location.address1}, {location.city}</option>)}
                    </select>
                  </label>
                )}
                <label>
                  {locale === "ar" ? "الاسم" : "Name"}
                  <input name="name" type="text" value={formData.name} onChange={handleInputChange} required />
                </label>
                <label>
                  {locale === "ar" ? "رقم الموبايل" : "Phone"}
                  <input name="phone" type="tel" value={formData.phone} onChange={handleInputChange} required />
                </label>
                <label>
                  {locale === "ar" ? "الإيميل" : "Email"}
                  <input name="email" type="email" value={formData.email} onChange={handleInputChange} />
                </label>
                <label>
                  {locale === "ar" ? "المدينة / المنطقة" : "City / Region"}
                  <input name="city" type="text" value={formData.city} onChange={handleInputChange} />
                </label>
                <label className="cart-span-full">
                  {locale === "ar" ? "العنوان بالتفصيل" : "Full Address"}
                  <textarea name="address" rows="3" value={formData.address} onChange={handleInputChange} required></textarea>
                </label>
                <label className="cart-span-full">
                  {locale === "ar" ? "لينك اللوكيشن" : "Google Maps Link"}
                  <input name="locationLink" type="url" value={formData.locationLink} onChange={handleInputChange} />
                </label>
                
                <label>
                  {locale === "ar" ? "طريقة التوصيل" : "Delivery Method"}
                  <select name="deliveryMethod" value={formData.deliveryMethod} onChange={handleInputChange}>
                    <option value="delivery">{locale === "ar" ? "توصيل عادي" : "Standard Delivery"}</option>
                    <option value="family_representative">{locale === "ar" ? "مندوب العيلة" : "Family Representative Visit"}</option>
                    <option value="pickup">{locale === "ar" ? "استلام من الفرع" : "Pickup from Store"}</option>
                  </select>
                </label>
                <label>
                  {locale === "ar" ? "طريقة الدفع" : "Payment Method"}
                  <select name="paymentMethod" value={formData.paymentMethod} onChange={handleInputChange}>
                    <option value="cash">{locale === "ar" ? "كاش عند الاستلام" : "Cash on Delivery"}</option>
                    <option value="online">{locale === "ar" ? "دفع إلكتروني" : "Online Card Payment"}</option>
                  </select>
                </label>
                <label>
                  {locale === "ar" ? "كوبون خصم" : "Discount Coupon"}
                  <input
                    name="discountCode"
                    type="text"
                    placeholder="COVERUP10 / FAMILY50"
                    value={formData.discountCode}
                    onChange={(e) => {
                      handleInputChange(e);
                      setCouponCode(e.target.value);
                    }}
                  />
                </label>
                <label>
                  {locale === "ar" ? "ملاحظات للطلب" : "Order Notes"}
                  <input name="notes" type="text" value={formData.notes} onChange={handleInputChange} />
                </label>
              </div>
            </div>

            <div className="cart-pricing-box">
              <div>
                <span>{locale === "ar" ? "إجمالي المنتجات" : "Subtotal"}</span>
                <b>{formatMoney(subtotal)}</b>
              </div>
              {discountAmount > 0 && (
                <div>
                  <span>{locale === "ar" ? "الخصم" : "Discount"}</span>
                  <b style={{ color: "#4caf50" }}>-{formatMoney(discountAmount)}</b>
                </div>
              )}
              <div>
                <span>{locale === "ar" ? "رسوم التوصيل" : "Delivery Fee"}</span>
                <b>{formatMoney(deliveryFee)}</b>
              </div>
              <div className="is-total">
                <span>{locale === "ar" ? "الإجمالي النهائي" : "Grand Total"}</span>
                <b>{formatMoney(grandTotal)}</b>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {formData.paymentMethod === "online" ? (
                <button
                  className="button button-secondary"
                  type="button"
                  disabled={loading}
                  onClick={() => handleCheckout("online")}
                >
                  {locale === "ar" ? "ادفع إلكترونيًا" : "Pay Online"}
                </button>
              ) : (
                <button
                  className="button button-primary"
                  type="button"
                  disabled={loading}
                  onClick={() => handleCheckout("cash")}
                >
                  {locale === "ar" ? "تأكيد الطلب" : "Place Order"}
                </button>
              )}

              <Link href="/account" className="button button-secondary" style={{ textAlign: "center" }}>
                {locale === "ar" ? "اذهب للحساب" : "Go to Account"}
              </Link>
              
              <a
                className="button button-secondary"
                href="https://wa.me/201050310516"
                target="_blank"
                rel="noreferrer"
                style={{ textAlign: "center" }}
              >
                {locale === "ar" ? "محتاج مساعدة على واتساب" : "Need help on WhatsApp"}
              </a>
            </div>
            
            {message && (
              <p
                className="payment-message"
                style={{ marginTop: "12px", fontSize: "14px", color: message.includes("تم") ? "#4caf50" : "#ff8f3d" }}
                dangerouslySetInnerHTML={{ __html: message }}
              ></p>
            )}
          </aside>
        </section>
      ) : (
        <section style={{ minHeight: "40vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <p className="empty-cart">{locale === "ar" ? "سلة المشتريات فارغة." : "Your shopping cart is empty."}</p>
          <Link href="/products" className="button button-primary" style={{ marginTop: "16px" }}>
            {locale === "ar" ? "تصفح المنتجات" : "Browse Products"}
          </Link>
        </section>
      )}
    </main>
  );
}

export default function CartPage() {
  return (
    <Suspense fallback={
      <main className="cart-page">
        <section className="cart-page-head" style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p className="empty-cart">Loading cart...</p>
        </section>
      </main>
    }>
      <CartContent />
    </Suspense>
  );
}
