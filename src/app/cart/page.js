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

  const [formData, setFormData] = useState({
    selectedLocationId: "",
    deliveryMethod: "delivery",
    paymentMethod: "cash",
    discountCode: "",
    tipAmount: "",
    notes: "",
  });

  const [profileData, setProfileData] = useState({ name: "", email: "" });
  const [contactEmail, setContactEmail] = useState("");
  const [guestDetails, setGuestDetails] = useState({
    phone: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
  });
  const [isGuest, setIsGuest] = useState(true);
  const [message, setMessage] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [savedLocations, setSavedLocations] = useState([]);
  
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addressForm, setAddressForm] = useState({ recipientName: "", label: "", address1: "", address2: "", city: "", state: "", postalCode: "", phone: "", notes: "", isDefault: true });
  const [addressBusy, setAddressBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setIsGuest(false);
        const response = await fetch("/api/profile", { headers: { Authorization: `Bearer ${session.access_token}` } });
        const data = await response.json().catch(() => ({}));
        const profile = data.profile || {};
        const locations = Array.isArray(profile.location) ? profile.location : [];
        setSavedLocations(locations);
        setProfileData({ name: profile.name || "", email: profile.email || session.user.email || "" });
        const selected = locations.find((item) => item.isDefault) || locations[0];
        if (selected) {
          setFormData(prev => ({ ...prev, selectedLocationId: selected.id }));
        }
      } else {
        setIsGuest(true);
      }
    });

    const paymentState = searchParams.get("payment");
    if (paymentState === "return") {
      setMessage(locale === "ar" ? "لو الدفع تم بنجاح، حالة الطلب هتتحدث تلقائيًا." : "If payment was successful, the order status will be updated automatically.");
    }
  }, [searchParams, locale]);

  // Clean up any deleted items in cart on mount
  useEffect(() => {
    fetch("/api/store-products")
      .then((res) => res.json())
      .then((data) => {
        // Only clean if the DB is configured and actually returned products
        // (avoid false positives when api fails or returns empty during loading)
        if (data && data.configured !== false && Array.isArray(data.products) && data.products.length > 0) {
          const dbProductIds = new Set(data.products.map(p => String(p.id)));
          let cleanedAny = false;
          
          Object.keys(cart).forEach((cartItemId) => {
            const baseId = String(cartItemId.split("::")[0]);
            if (!dbProductIds.has(baseId)) {
              removeFromCart(cartItemId);
              cleanedAny = true;
            }
          });
          
          if (cleanedAny) {
            alert(locale === "ar" 
              ? "تمت إزالة بعض المنتجات من السلة لأنها لم تعد متوفرة." 
              : "Some products were removed from your cart because they are no longer available.");
          }
        }
      })
      .catch(() => {});
  }, []);

  const saveNewAddress = async (e) => {
    e.preventDefault();
    setAddressBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("يجب تسجيل الدخول لإضافة عنوان.");
      
      const newLoc = { id: crypto.randomUUID(), ...addressForm };
      const updatedLocations = [...savedLocations.map(l => addressForm.isDefault ? {...l, isDefault: false} : l), newLoc];
      
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ location: updatedLocations })
      });
      
      if (!res.ok) throw new Error("فشل حفظ العنوان.");
      
      setSavedLocations(updatedLocations);
      setShowAddressModal(false);
      setFormData(prev => ({ ...prev, selectedLocationId: newLoc.id }));
      setAddressForm({ recipientName: "", label: "", address1: "", address2: "", city: "", state: "", postalCode: "", phone: "", notes: "", isDefault: true });
    } catch (err) {
      alert(err.message);
    } finally {
      setAddressBusy(false);
    }
  };

  const cartEntries = Object.entries(cart).map(([id, item]) => ({ id, product: item.snapshot, quantity: item.quantity }));
  const subtotal = cartEntries.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  useEffect(() => {
    const code = couponCode.trim().toUpperCase();
    const coupon = DEFAULT_COUPONS[code];
    if (!code || !coupon || subtotal < Number(coupon.minSubtotal || 0)) {
      setDiscountAmount(0);
      return;
    }
    const amt = coupon.type === "percent" ? Math.round((subtotal * Number(coupon.value || 0)) / 100) : Math.max(0, Number(coupon.value || 0));
    setDiscountAmount(amt);
  }, [couponCode, subtotal]);

  let deliveryFee = 0;
  if (cartCount > 0) {
    if (formData.deliveryMethod === "family_representative") deliveryFee = 90;
    else if (formData.deliveryMethod === "pickup") deliveryFee = 0;
    else deliveryFee = 45;
  }

  const grandTotal = Math.max(0, subtotal - discountAmount + deliveryFee);

  const formatMoney = (amount) => {
    return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", { style: "currency", currency: "EGP", maximumFractionDigits: 0 }).format(amount);
  };

  const selectedLocation = savedLocations.find(l => l.id === formData.selectedLocationId);

  const handleCheckout = async (payMethod) => {
    try {
      if (formData.deliveryMethod === 'delivery') {
        if (isGuest) {
          if (!profileData.name.trim()) throw new Error(locale === "ar" ? "الرجاء كتابة الاسم بالكامل." : "Please enter your full name.");
          if (!guestDetails.phone.trim()) throw new Error(locale === "ar" ? "الرجاء كتابة رقم الهاتف." : "Please enter your phone number.");
          if (!profileData.email.trim()) throw new Error(locale === "ar" ? "الرجاء كتابة البريد الإلكتروني للتواصل." : "Please enter your contact email.");
          if (!guestDetails.address1.trim()) throw new Error(locale === "ar" ? "الرجاء كتابة العنوان بالتفصيل." : "Please enter your detailed address.");
          if (!guestDetails.city.trim()) throw new Error(locale === "ar" ? "الرجاء كتابة المدينة." : "Please enter your city.");
          if (!guestDetails.state) throw new Error(locale === "ar" ? "الرجاء اختيار المحافظة." : "Please select your governorate.");
        } else if (!selectedLocation) {
          throw new Error(locale === "ar" ? "اختر عنواناً أولاً." : "Please select an address.");
        }
      } else {
        if (isGuest) {
          if (!profileData.name.trim()) throw new Error(locale === "ar" ? "الرجاء كتابة الاسم بالكامل." : "Please enter your full name.");
          if (!guestDetails.phone.trim()) throw new Error(locale === "ar" ? "الرجاء كتابة رقم الهاتف." : "Please enter your phone number.");
          if (!profileData.email.trim()) throw new Error(locale === "ar" ? "الرجاء كتابة البريد الإلكتروني للتواصل." : "Please enter your contact email.");
        }
      }
      setLoading(true);
      setMessage(locale === "ar" ? "بنجهز طلبك..." : "Processing your order...");

      const resolvedEmail = contactEmail.trim() || profileData.email.trim();
      const orderPayload = {
        channel: "website",
        customer: {
          name: profileData.name.trim(),
          phone: isGuest ? guestDetails.phone.trim() : (selectedLocation?.phone || ""),
          email: resolvedEmail,
          city: isGuest ? guestDetails.city.trim() : (selectedLocation?.city || ""),
          address: isGuest 
            ? [guestDetails.address1.trim(), guestDetails.address2.trim(), guestDetails.state].filter(Boolean).join(", ") 
            : (selectedLocation ? [selectedLocation.address1, selectedLocation.address2].filter(Boolean).join(", ") : ""),
          locationLink: "",
        },
        notes: formData.notes.trim(),
        deliveryMethod: formData.deliveryMethod,
        paymentMethod: payMethod,
        discountCode: couponCode.trim().toUpperCase(),
        tipAmount: formData.tipAmount,
        branchLocation: formData.deliveryMethod === 'pickup' ? "Cover Up Main Branch, Cairo" : "",
        items: cartEntries.map((item) => ({
          id: item.product.id || item.id.split("::")[0],
          cartKey: item.id,
          product_version_id: item.product.product_version_id || item.product.selectedVersion?.id || null,
          phone_model: item.product.phone_model || item.product.selectedVersion?.phone_model || "",
          quantity: item.quantity,
          color: item.product.selectedColor || null
        })),
      };

      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
        body: JSON.stringify(orderPayload),
      });

      const resData = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(resData.message || (locale === "ar" ? "فشل إنشاء الطلب." : "Failed to create order."));

      const order = resData.order;

      if (payMethod === "online") {
        // Don't clear cart yet — only clear after payment is confirmed on the payment page
        window.location.href = `/checkout-payment?orderId=${order.id}`;
      } else {
        clearCart();
        window.location.href = `/checkout-success?orderId=${order.id}`;
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
        <Link href="/products" className="button" style={{ background: '#0070f3', color: '#fff', border: 'none' }}>
          {locale === "ar" ? "اكمل تسوق" : "Continue Shopping"}
        </Link>
      </section>

      {cartEntries.length > 0 ? (
        <section className="cart-layout" style={{ gap: '32px' }}>
          <div className="cart-main-card" style={{ background: 'transparent', boxShadow: 'none', border: 'none', padding: 0 }}>
            <div className="cart-page-list">
              {cartEntries.map((item) => {
                const displayName = locale === "en" && item.product.name_en ? item.product.name_en : item.product.name;
                return (
                  <article key={item.id} className="cart-page-item" style={{ background: 'var(--panel)', borderRadius: '16px', border: '1px solid var(--line)', padding: '16px', marginBottom: '16px' }}>
                    <div className="cart-page-media"><img src={item.product.image} alt={displayName} loading="lazy" decoding="async" style={{ borderRadius: '12px' }}/></div>
                    <div className="cart-page-info">
                      <div className="cart-page-item-head">
                        <h2 style={{ fontSize: '18px', margin: '0 0 8px 0' }}><Link href={`/product?id=${item.id.split('::')[0]}`}>{displayName}</Link></h2>
                        {item.product.selectedColor && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                            <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: item.product.selectedColor.hex, border: '1px solid rgba(0,0,0,0.1)' }} />
                            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{item.product.selectedColor.name}</span>
                          </div>
                        )}
                        {(item.product.phone_model || item.product.selectedVersion?.phone_model) && (
                          <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px' }}>
                            {locale === "ar" ? "الموديل: " : "Model: "}{item.product.phone_model || item.product.selectedVersion?.phone_model}
                          </div>
                        )}
                        <strong style={{ fontSize: '18px', color: '#0070f3' }}>{formatMoney(item.product.price * item.quantity)}</strong>
                      </div>
                      <div className="cart-page-actions" style={{ marginTop: '16px', background: 'var(--input-bg)', padding: '4px', borderRadius: '8px', display: 'inline-flex' }}>
                        <button type="button" className="quantity-btn" onClick={() => updateQuantity(item.id, item.quantity - 1)}>-</button>
                        <span style={{ padding: '0 12px', fontWeight: 'bold' }}>{item.quantity}</span>
                        <button type="button" className="quantity-btn" onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                      </div>
                      <button type="button" onClick={() => removeFromCart(item.id)} style={{ background: 'none', border: 'none', color: '#ff4d4d', fontSize: '13px', cursor: 'pointer', marginTop: '12px', display: 'block' }}>{locale === "ar" ? "إزالة" : "Remove"}</button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <aside className="cart-summary-card" style={{ background: 'var(--panel)', borderRadius: '24px', border: '1px solid var(--line)', padding: '32px', boxShadow: '0 8px 32px rgba(0,0,0,0.04)' }}>
            <div className="cart-delivery-tabs" style={{ display: 'flex', background: 'var(--input-bg)', borderRadius: '12px', padding: '6px', marginBottom: '32px' }}>
              <button 
                type="button" 
                style={{ flex: 1, background: formData.deliveryMethod !== "pickup" ? 'var(--panel)' : 'transparent', border: 'none', padding: '12px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', color: formData.deliveryMethod !== "pickup" ? 'var(--text)' : 'var(--muted)', boxShadow: formData.deliveryMethod !== "pickup" ? '0 2px 8px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s' }}
                onClick={() => setFormData({...formData, deliveryMethod: "delivery"})}
              >
                {locale === "ar" ? "التوصيل الى المنزل" : "Home Delivery"}
              </button>
              <button 
                type="button" 
                style={{ flex: 1, background: formData.deliveryMethod === "pickup" ? 'var(--panel)' : 'transparent', border: 'none', padding: '12px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', color: formData.deliveryMethod === "pickup" ? 'var(--text)' : 'var(--muted)', boxShadow: formData.deliveryMethod === "pickup" ? '0 2px 8px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s' }}
                onClick={() => setFormData({...formData, deliveryMethod: "pickup"})}
              >
                {locale === "ar" ? "الاستلام من الفرع" : "Branch Pickup"}
              </button>
            </div>

            <div className="cart-checkout-form" style={{ display: 'grid', gap: '24px' }}>
              {isGuest ? (
                <div style={{ display: 'grid', gap: '16px' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold' }}>
                    {locale === "ar" ? "بيانات إتمام الطلب (زائر)" : "Checkout Details (Guest)"}
                  </h3>
                  
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: 'bold' }}>
                    {locale === "ar" ? "الاسم بالكامل" : "Full Name"}
                    <input 
                      type="text" 
                      style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--line)', background: 'var(--input-bg)', color: 'var(--text)', outline: 'none', fontSize: '14px' }}
                      value={profileData.name} 
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })} 
                      placeholder={locale === "ar" ? "اكتب اسمك بالكامل" : "Full Name"} 
                      required 
                    />
                  </label>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: 'bold' }}>
                      {locale === "ar" ? "رقم الهاتف" : "Phone Number"}
                      <input 
                        type="tel" 
                        style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--line)', background: 'var(--input-bg)', color: 'var(--text)', outline: 'none', fontSize: '14px' }}
                        value={guestDetails.phone} 
                        onChange={(e) => setGuestDetails({ ...guestDetails, phone: e.target.value })} 
                        placeholder="01xxxxxxxxx" 
                        required 
                      />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: 'bold' }}>
                      {locale === "ar" ? "البريد الإلكتروني للتواصل" : "Contact Email"}
                      <input 
                        type="email" 
                        style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--line)', background: 'var(--input-bg)', color: 'var(--text)', outline: 'none', fontSize: '14px' }}
                        value={profileData.email} 
                        onChange={(e) => setProfileData({ ...profileData, email: e.target.value })} 
                        placeholder="name@example.com" 
                        required 
                      />
                    </label>
                  </div>

                  {formData.deliveryMethod !== "pickup" && (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: 'bold' }}>
                          {locale === "ar" ? "المحافظة" : "Governorate"}
                          <select 
                            style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--line)', background: 'var(--input-bg)', color: 'var(--text)', outline: 'none', cursor: 'pointer', fontSize: '14px' }}
                            value={guestDetails.state} 
                            onChange={(e) => setGuestDetails({ ...guestDetails, state: e.target.value })}
                          >
                            <option value="">{locale === "ar" ? "اختر المحافظة" : "Select Governorate"}</option>
                            <option value="القاهرة">القاهرة (Cairo)</option>
                            <option value="الجيزة">الجيزة (Giza)</option>
                            <option value="الإسكندرية">الإسكندرية (Alexandria)</option>
                            <option value="الدقهلية">الدقهلية (Dakahlia)</option>
                            <option value="الشرقية">الشرقية (Al Sharqia)</option>
                            <option value="المنوفية">المنوفية (Monufia)</option>
                            <option value="القليوبية">القليوبية (Qalyubia)</option>
                            <option value="البحيرة">البحيرة (Beheira)</option>
                            <option value="الغربية">الغربية (Gharbia)</option>
                            <option value="بورسعيد">بورسعيد (Port Said)</option>
                            <option value="دمياط">دمياط (Damietta)</option>
                            <option value="الإسماعيلية">الإسماعيلية (Ismailia)</option>
                            <option value="السويس">السويس (Suez)</option>
                            <option value="كفر الشيخ">كفر الشيخ (Kafr El Sheikh)</option>
                            <option value="الفيوم">الفيوم (Faiyum)</option>
                            <option value="بني سويف">بني سويف (Beni Suef)</option>
                            <option value="مطروح">مطروح (Matrouh)</option>
                            <option value="شمال سيناء">شمال سيناء (North Sinai)</option>
                            <option value="جنوب سيناء">جنوب سيناء (South Sinai)</option>
                            <option value="المنيا">المنيا (Minya)</option>
                            <option value="أسيوط">أسيوط (Asyut)</option>
                            <option value="سوهاج">سوهاج (Sohag)</option>
                            <option value="قنا">قنا (Qena)</option>
                            <option value="البحر الأحمر">البحر الأحمر (Red Sea)</option>
                            <option value="الأقصر">الأقصر (Luxor)</option>
                            <option value="أسوان">أسوان (Aswan)</option>
                            <option value="الوادي الجديد">الوادي الجديد (New Valley)</option>
                          </select>
                        </label>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: 'bold' }}>
                          {locale === "ar" ? "المدينة / المنطقة" : "City / Area"}
                          <input 
                            type="text" 
                            style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--line)', background: 'var(--input-bg)', color: 'var(--text)', outline: 'none', fontSize: '14px' }}
                            value={guestDetails.city} 
                            onChange={(e) => setGuestDetails({ ...guestDetails, city: e.target.value })} 
                            placeholder={locale === "ar" ? "الرحاب، الدقي..." : "City"} 
                            required 
                          />
                        </label>
                      </div>

                      <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: 'bold' }}>
                        {locale === "ar" ? "العنوان بالتفصيل" : "Detailed Address"}
                        <input 
                          type="text" 
                          style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--line)', background: 'var(--input-bg)', color: 'var(--text)', outline: 'none', fontSize: '14px' }}
                          value={guestDetails.address1} 
                          onChange={(e) => setGuestDetails({ ...guestDetails, address1: e.target.value })} 
                          placeholder={locale === "ar" ? "رقم المبنى، اسم الشارع، الشقة" : "Building name, street number, apartment"} 
                          required 
                        />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: 'bold' }}>
                        {locale === "ar" ? "تفاصيل إضافية للعنوان (اختياري)" : "Address Line 2 (Optional)"}
                        <input 
                          type="text" 
                          style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--line)', background: 'var(--input-bg)', color: 'var(--text)', outline: 'none', fontSize: '14px' }}
                          value={guestDetails.address2} 
                          onChange={(e) => setGuestDetails({ ...guestDetails, address2: e.target.value })} 
                          placeholder={locale === "ar" ? "الدور، علامة مميزة بجوار العنوان" : "Floor, landmark"} 
                        />
                      </label>
                    </>
                  )}
                </div>
              ) : (
                <>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: 'bold' }}>
                    {locale === "ar" ? "البريد الإلكتروني للتواصل (اختياري)" : "Contact Email (Optional)"}
                    <input
                      type="email"
                      style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--line)', background: 'var(--input-bg)', color: 'var(--text)', outline: 'none', fontSize: '14px' }}
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder={profileData.email || "name@example.com"}
                    />
                  </label>
                  {formData.deliveryMethod !== "pickup" ? (
                    <div style={{ display: 'grid', gap: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label style={{ fontWeight: 'bold', fontSize: '14px' }}>{locale === "ar" ? "عنوان التوصيل" : "Delivery Address"}</label>
                        <button type="button" onClick={() => setShowAddressModal(true)} style={{ background: 'none', border: 'none', color: '#0070f3', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>
                          {locale === "ar" ? "+ إضافة أو تغيير عنوان" : "+ Change or Add Address"}
                        </button>
                      </div>
                      
                      {selectedLocation ? (
                        <div style={{ padding: '16px', background: 'var(--input-bg)', border: '1px solid var(--line)', borderRadius: '12px', cursor: 'pointer' }} onClick={() => setShowAddressModal(true)}>
                          <strong style={{ display: 'block', fontSize: '15px', color: 'var(--text)' }}>{selectedLocation.label}</strong>
                          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--muted)' }}>{selectedLocation.address1}, {selectedLocation.city}</p>
                          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--muted)' }}>{selectedLocation.phone}</p>
                        </div>
                      ) : (
                        <div style={{ padding: '24px', background: 'rgba(0,112,243,0.05)', border: '1px dashed #0070f3', borderRadius: '12px', textAlign: 'center', cursor: 'pointer' }} onClick={() => setShowAddressModal(true)}>
                          <p style={{ margin: 0, color: '#0070f3', fontWeight: 'bold', fontSize: '14px' }}>{locale === "ar" ? "لم يتم تحديد عنوان. انقر هنا للاختيار." : "No address selected. Click to choose."}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gap: '16px' }}>
                      <label style={{ fontWeight: 'bold', fontSize: '14px' }}>{locale === "ar" ? "مكان الاستلام" : "Pickup Location"}</label>
                      <div style={{ padding: '16px', background: 'var(--input-bg)', border: '1px solid var(--line)', borderRadius: '12px' }}>
                         <strong style={{ display: 'block', fontSize: '15px' }}>Cover Up Main Branch</strong>
                         <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--muted)' }}>123 Main St, Cairo, Egypt</p>
                      </div>
                    </div>
                  )}
                </>
              )}

              <div>
                <label style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '12px', display: 'block' }}>{locale === "ar" ? "طريقة الدفع" : "Payment Method"}</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div 
                    style={{ padding: '16px', background: formData.paymentMethod === 'cash' ? '#0070f3' : 'var(--input-bg)', color: formData.paymentMethod === 'cash' ? '#fff' : 'var(--text)', border: formData.paymentMethod === 'cash' ? 'none' : '1px solid var(--line)', borderRadius: '12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', transition: 'all 0.3s ease', boxShadow: formData.paymentMethod === 'cash' ? '0 8px 24px rgba(0, 112, 243, 0.4)' : 'none' }}
                    onClick={() => setFormData({...formData, paymentMethod: 'cash'})}
                  >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"></rect><circle cx="12" cy="12" r="2"></circle><path d="M6 12h.01M18 12h.01"></path></svg>
                    <span style={{ fontWeight: 'bold', fontSize: '13px' }}>{locale === "ar" ? "كاش" : "Cash"}</span>
                  </div>
                  <div 
                    style={{ padding: '16px', background: formData.paymentMethod === 'online' ? '#0070f3' : 'var(--input-bg)', color: formData.paymentMethod === 'online' ? '#fff' : 'var(--text)', border: formData.paymentMethod === 'online' ? 'none' : '1px solid var(--line)', borderRadius: '12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', transition: 'all 0.3s ease', boxShadow: formData.paymentMethod === 'online' ? '0 8px 24px rgba(0, 112, 243, 0.4)' : 'none' }}
                    onClick={() => setFormData({...formData, paymentMethod: 'online'})}
                  >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
                    <span style={{ fontWeight: 'bold', fontSize: '13px' }}>{locale === "ar" ? "دفع إلكتروني" : "Online"}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--muted)' }}>{locale === "ar" ? "كوبون الخصم" : "Discount Coupon"}</label>
                  <div style={{ display: 'flex', alignItems: 'center', borderBottom: '2px solid var(--line)', paddingBottom: '8px' }}>
                    <input style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '15px', color: 'var(--text)' }} name="discountCode" type="text" placeholder="COVERUP10" value={formData.discountCode} onChange={(e) => { setFormData(prev => ({...prev, discountCode: e.target.value})); setCouponCode(e.target.value); }} />
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--muted)' }}>{locale === "ar" ? "إكرامية (اختياري)" : "Tip (Optional)"}</label>
                  <div style={{ display: 'flex', alignItems: 'center', borderBottom: '2px solid var(--line)', paddingBottom: '8px' }}>
                    <input style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '15px', color: 'var(--text)' }} name="tipAmount" type="number" min="0" placeholder="0" value={formData.tipAmount} onChange={(e) => setFormData(prev => ({...prev, tipAmount: e.target.value}))} />
                    <span style={{ fontSize: '14px', color: 'var(--muted)', fontWeight: 'bold' }}>{locale === "ar" ? "ج.م" : "EGP"}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--muted)' }}>{locale === "ar" ? "ملاحظات إضافية (اختياري)" : "Additional Notes (Optional)"}</label>
                  <div style={{ display: 'flex', alignItems: 'center', borderBottom: '2px solid var(--line)', paddingBottom: '8px' }}>
                    <input style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '15px', color: 'var(--text)' }} name="notes" type="text" placeholder={locale === "ar" ? "اكتب أي ملاحظات للطلب هنا..." : "Any special requests..."} value={formData.notes} onChange={(e) => setFormData(prev => ({...prev, notes: e.target.value}))} />
                  </div>
                </div>
              </div>
            </div>

            <div style={{ margin: '32px 0', display: 'grid', gap: '12px', paddingTop: '32px', borderTop: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: 'var(--muted)' }}>
                <span>{locale === "ar" ? "إجمالي المنتجات" : "Subtotal"}</span>
                <b>{formatMoney(subtotal)}</b>
              </div>
              {discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#4caf50' }}>
                  <span>{locale === "ar" ? "الخصم" : "Discount"}</span>
                  <b>-{formatMoney(discountAmount)}</b>
                </div>
              )}
              {formData.deliveryMethod !== "pickup" && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: 'var(--muted)' }}>
                  <span>{locale === "ar" ? "رسوم التوصيل" : "Delivery Fee"}</span>
                  <b>{formatMoney(deliveryFee)}</b>
                </div>
              )}
              {Number(formData.tipAmount) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: 'var(--muted)' }}>
                  <span>{locale === "ar" ? "إكرامية" : "Tip"}</span>
                  <b>{formatMoney(Number(formData.tipAmount))}</b>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '20px', fontWeight: 'bold', marginTop: '12px' }}>
                <span>{locale === "ar" ? "الإجمالي النهائي" : "Grand Total"}</span>
                <b style={{ color: '#0070f3' }}>{formatMoney(grandTotal + (Number(formData.tipAmount) || 0))}</b>
              </div>
            </div>

            <button
              style={{ width: '100%', padding: '16px', borderRadius: '12px', border: 'none', background: 'var(--text)', color: 'var(--panel)', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.3s ease', opacity: loading ? 0.7 : 1 }}
              type="button"
              disabled={loading}
              onClick={() => handleCheckout(formData.paymentMethod)}
            >
              {loading ? (locale === "ar" ? "جارٍ التنفيذ..." : "Processing...") : (formData.paymentMethod === 'online' ? (locale === "ar" ? "الاستمرار للدفع" : "Continue to Pay") : (locale === "ar" ? "إكمال الطلب" : "Complete Order"))}
            </button>
            
            {message && (
              <div style={{ marginTop: "16px", padding: "16px", borderRadius: "12px", background: "var(--input-bg)", textAlign: "center" }}>
                <p style={{ margin: 0, fontSize: "14px", color: message.includes("تم") || message.includes("successfully") ? "#4caf50" : "#ff8f3d", fontWeight: "bold" }}>{message}</p>
              </div>
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

      {/* Address Selection / Add Modal */}
      {showAddressModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: 'var(--panel)', padding: '32px', borderRadius: '24px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 48px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontSize: '20px' }}>{locale === "ar" ? "عناويني" : "My Addresses"}</h2>
              <button type="button" onClick={() => setShowAddressModal(false)} style={{ background: 'var(--input-bg)', border: 'none', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', cursor: 'pointer', color: 'var(--text)' }}>&times;</button>
            </div>

            {savedLocations.length > 0 && (
              <div style={{ display: 'grid', gap: '12px', marginBottom: '24px' }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--muted)' }}>{locale === "ar" ? "اختر عنواناً محفوظاً" : "Select saved address"}</label>
                {savedLocations.map((loc) => (
                  <div 
                    key={loc.id} 
                    onClick={() => { setFormData(prev => ({...prev, selectedLocationId: loc.id})); setShowAddressModal(false); }}
                    style={{ padding: '16px', background: formData.selectedLocationId === loc.id ? 'rgba(0,112,243,0.05)' : 'var(--input-bg)', border: formData.selectedLocationId === loc.id ? '2px solid #0070f3' : '1px solid var(--line)', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s' }}
                  >
                    <strong style={{ display: 'block', fontSize: '15px', color: formData.selectedLocationId === loc.id ? '#0070f3' : 'var(--text)' }}>{loc.label}</strong>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--muted)' }}>{loc.address1}, {loc.city}</p>
                  </div>
                ))}
              </div>
            )}

            <div style={{ borderTop: '1px solid var(--line)', paddingTop: '24px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>{locale === "ar" ? "إضافة عنوان جديد" : "Add New Address"}</h3>
              <form onSubmit={saveNewAddress} style={{ display: 'grid', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', fontWeight: 'bold' }}>{locale === "ar" ? "الاسم الشخصي" : "Recipient Name"}
                    <input style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--line)', background: 'var(--input-bg)', outline: 'none', fontSize: '14px', color: 'var(--text)' }} value={addressForm.recipientName} onChange={(e) => setAddressForm({...addressForm, recipientName: e.target.value})} placeholder={locale === "ar" ? "اسم المستلم" : "Full Name"} required />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', fontWeight: 'bold' }}>{locale === "ar" ? "اسم العنوان" : "Address Label"}
                    <input style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--line)', background: 'var(--input-bg)', outline: 'none', fontSize: '14px', color: 'var(--text)' }} value={addressForm.label} onChange={(e) => setAddressForm({...addressForm, label: e.target.value})} placeholder={locale === "ar" ? "المنزل" : "Home"} required />
                  </label>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', fontWeight: 'bold' }}>{locale === "ar" ? "رقم الهاتف" : "Phone"}
                    <input style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--line)', background: 'var(--input-bg)', outline: 'none', fontSize: '14px', color: 'var(--text)' }} type="tel" value={addressForm.phone} onChange={(e) => setAddressForm({...addressForm, phone: e.target.value})} required />
                  </label>
                </div>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', fontWeight: 'bold' }}>{locale === "ar" ? "العنوان الأول" : "Address Line 1"}
                  <input style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--line)', background: 'var(--input-bg)', outline: 'none', fontSize: '14px', color: 'var(--text)' }} value={addressForm.address1} onChange={(e) => setAddressForm({...addressForm, address1: e.target.value})} required placeholder={locale === "ar" ? "رقم المبنى والشارع" : "Building and street"} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', fontWeight: 'bold' }}>{locale === "ar" ? "العنوان الثاني" : "Address Line 2"}
                  <input style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--line)', background: 'var(--input-bg)', outline: 'none', fontSize: '14px', color: 'var(--text)' }} value={addressForm.address2} onChange={(e) => setAddressForm({...addressForm, address2: e.target.value})} placeholder={locale === "ar" ? "الشقة، الدور، العلامة المميزة" : "Apartment, floor, landmark"} />
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', fontWeight: 'bold' }}>{locale === "ar" ? "المدينة" : "City"}
                    <input style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--line)', background: 'var(--input-bg)', outline: 'none', fontSize: '14px', color: 'var(--text)' }} value={addressForm.city} onChange={(e) => setAddressForm({...addressForm, city: e.target.value})} required />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', fontWeight: 'bold' }}>{locale === "ar" ? "المحافظة" : "State"}
                    <select style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--line)', background: 'var(--input-bg)', outline: 'none', fontSize: '14px', color: 'var(--text)', cursor: 'pointer' }} value={addressForm.state} onChange={(e) => setAddressForm({...addressForm, state: e.target.value})}>

                      <option value="">{locale === "ar" ? "اختر المحافظة" : "Select Governorate"}</option>
                      <option value="القاهرة">القاهرة (Cairo)</option>
                      <option value="الجيزة">الجيزة (Giza)</option>
                      <option value="الإسكندرية">الإسكندرية (Alexandria)</option>
                      <option value="الدقهلية">الدقهلية (Dakahlia)</option>
                      <option value="الشرقية">الشرقية (Al Sharqia)</option>
                      <option value="المنوفية">المنوفية (Monufia)</option>
                      <option value="القليوبية">القليوبية (Qalyubia)</option>
                      <option value="البحيرة">البحيرة (Beheira)</option>
                      <option value="الغربية">الغربية (Gharbia)</option>
                      <option value="بورسعيد">بورسعيد (Port Said)</option>
                      <option value="دمياط">دمياط (Damietta)</option>
                      <option value="الإسماعيلية">الإسماعيلية (Ismailia)</option>
                      <option value="السويس">السويس (Suez)</option>
                      <option value="كفر الشيخ">كفر الشيخ (Kafr El Sheikh)</option>
                      <option value="الفيوم">الفيوم (Faiyum)</option>
                      <option value="بني سويف">بني سويف (Beni Suef)</option>
                      <option value="مطروح">مطروح (Matrouh)</option>
                      <option value="شمال سيناء">شمال سيناء (North Sinai)</option>
                      <option value="جنوب سيناء">جنوب سيناء (South Sinai)</option>
                      <option value="المنيا">المنيا (Minya)</option>
                      <option value="أسيوط">أسيوط (Asyut)</option>
                      <option value="سوهاج">سوهاج (Sohag)</option>
                      <option value="قنا">قنا (Qena)</option>
                      <option value="البحر الأحمر">البحر الأحمر (Red Sea)</option>
                      <option value="الأقصر">الأقصر (Luxor)</option>
                      <option value="أسوان">أسوان (Aswan)</option>
                      <option value="الوادي الجديد">الوادي الجديد (New Valley)</option>

                    </select>
                  </label>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', fontWeight: 'bold' }}>{locale === "ar" ? "الرمز البريدي" : "Postal Code"}
                    <input style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--line)', background: 'var(--input-bg)', outline: 'none', fontSize: '14px', color: 'var(--text)' }} value={addressForm.postalCode} onChange={(e) => setAddressForm({...addressForm, postalCode: e.target.value})} />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', fontWeight: 'bold' }}>{locale === "ar" ? "ملاحظات التوصيل" : "Delivery Notes"}
                    <input style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--line)', background: 'var(--input-bg)', outline: 'none', fontSize: '14px', color: 'var(--text)' }} value={addressForm.notes} onChange={(e) => setAddressForm({...addressForm, notes: e.target.value})} />
                  </label>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer', marginTop: '8px' }}>
                  <input type="checkbox" checked={addressForm.isDefault} onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })} style={{ width: '18px', height: '18px', accentColor: '#0070f3' }} /> 
                  {locale === "ar" ? "استخدام كعنوان أساسي" : "Set as default"}
                </label>
                <button type="submit" disabled={addressBusy} style={{ padding: '16px', borderRadius: '12px', border: 'none', background: '#0070f3', color: 'white', fontWeight: 'bold', cursor: 'pointer', marginTop: '8px' }}>
                  {addressBusy ? (locale === "ar" ? "جارٍ الحفظ..." : "Saving...") : (locale === "ar" ? "حفظ واستخدام العنوان" : "Save & Use Address")}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function CartPage() {
  return (
    <Suspense fallback={<main className="cart-page"><p className="empty-cart">Loading...</p></main>}>
      <CartContent />
    </Suspense>
  );
}
