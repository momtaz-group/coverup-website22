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
    tipAmount: "",
    branchLocation: "",
    notes: "",
  });

  // UI state
  const [message, setMessage] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [savedLocations, setSavedLocations] = useState([]);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addressForm, setAddressForm] = useState({ label: "", address1: "", address2: "", city: "", state: "", postalCode: "", phone: "", notes: "", isDefault: true });
  const [addressBusy, setAddressBusy] = useState(false);

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
      setFormData(prev => ({
        ...prev,
        phone: newLoc.phone || prev.phone,
        city: newLoc.city || prev.city,
        address: [newLoc.address1, newLoc.address2].filter(Boolean).join(", "),
      }));
    } catch (err) {
      alert(err.message);
    } finally {
      setAddressBusy(false);
    }
  };


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

