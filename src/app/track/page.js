"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import styles from "./page.module.css";

const recentOrdersStorageKey = "coverup-recent-orders";

export default function TrackPage() {
  const { locale } = useLanguage();
  const ar = locale === "ar";

  // State
  const [orderIdInput, setOrderIdInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [trackingResult, setTrackingResult] = useState(null);
  const [trackingError, setTrackingError] = useState("");
  const [loading, setLoading] = useState(false);
  const [recentOrders, setRecentOrders] = useState([]);

  const formatMoney = (amount) => {
    return new Intl.NumberFormat(ar ? "ar-EG" : "en-US", {
      style: "currency",
      currency: "EGP",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const statusLabel = (status) => {
    const labels = {
      new: ar ? "جديد" : "New",
      pending_payment: ar ? "في انتظار الدفع" : "Pending Payment",
      paid: ar ? "مدفوع" : "Paid",
      confirmed: ar ? "مؤكد" : "Confirmed",
      preparing: ar ? "جاري التجهيز" : "Preparing",
      with_courier: ar ? "مع المندوب" : "With Courier",
      delivered: ar ? "تم التسليم" : "Delivered",
      cancelled: ar ? "ملغي" : "Cancelled",
      refunded: ar ? "مسترجع" : "Refunded",
      payment_failed: ar ? "الدفع فشل" : "Payment Failed",
    };
    return labels[status] || status || (ar ? "قيد المراجعة" : "Under Review");
  };

  const getStatusBadgeClass = (status) => {
    if (["delivered", "paid"].includes(status)) return styles.badgeSuccess;
    if (["cancelled", "refunded", "payment_failed"].includes(status)) return styles.badgeDanger;
    if (["new", "pending_payment"].includes(status)) return styles.badgeWarning;
    return styles.badgeInfo;
  };

  const getProgressStep = (status) => {
    switch (status) {
      case "delivered": return 5;
      case "with_courier": return 4;
      case "preparing": return 3;
      case "confirmed": return 2;
      default: return 1;
    }
  };

  const isCancelled = (status) => {
    return ["cancelled", "refunded", "payment_failed"].includes(status);
  };

  // Load and merge recent orders on mount
  useEffect(() => {
    async function loadRecentOrders() {
      let localOrders = [];
      try {
        localOrders = JSON.parse(localStorage.getItem(recentOrdersStorageKey) || "[]").filter((o) => o?.id);
      } catch {}

      setRecentOrders(localOrders);

      // Fetch updates for local orders
      const liveLocalOrders = await Promise.all(
        localOrders.map(async (order) => {
          if (!order.phone) return order;
          try {
            const params = new URLSearchParams({ orderId: order.id, phone: order.phone });
            const res = await fetch(`/api/track-order?${params.toString()}`);
            if (!res.ok) return order;
            const data = await res.json();
            return { ...order, ...data.order, phone: order.phone };
          } catch {
            return order;
          }
        })
      );

      // Fetch customer account orders
      let accountOrders = [];
      try {
        const sessionRes = await fetch("/api/customer-session");
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          accountOrders = Array.isArray(sessionData.orders) ? sessionData.orders : [];
        }
      } catch {}

      const merged = [...accountOrders, ...liveLocalOrders];
      
      // Deduplicate orders
      const deduplicated = merged.reduce((unique, order) => {
        if (!unique.some((item) => item.id === order.id)) {
          unique.push({
            ...order,
            phone: order.phone || order.customer?.phone || "",
          });
        }
        return unique;
      }, []);

      const compact = deduplicated.slice(0, 20);
      setRecentOrders(compact);
      try {
        localStorage.setItem(recentOrdersStorageKey, JSON.stringify(compact));
      } catch {}
    }

    loadRecentOrders();
  }, [locale]);

  // Execute tracking
  const trackOrderByIdAndPhone = async (orderId, phone) => {
    setLoading(true);
    setTrackingError("");
    setTrackingResult(null);

    const cleanId = String(orderId).trim();
    const cleanPhone = String(phone).trim();

    try {
      const params = new URLSearchParams({
        orderId: cleanId,
        phone: cleanPhone,
      });
      const res = await fetch(`/api/track-order?${params.toString()}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || (ar ? "فشل العثور على الطلب. تأكد من رقم الأوردر والموبايل." : "Failed to find order. Please verify order ID and phone."));
      }

      setTrackingResult(data.order);
      
      // Cache this order locally for recent orders list
      setRecentOrders((prev) => {
        const alreadyCached = prev.some((item) => item.id === data.order.id);
        if (alreadyCached) {
          // Update it
          const updated = prev.map((item) => item.id === data.order.id ? { ...data.order, phone: cleanPhone } : item);
          localStorage.setItem(recentOrdersStorageKey, JSON.stringify(updated));
          return updated;
        } else {
          // Insert it
          const compact = [{ ...data.order, phone: cleanPhone }, ...prev].slice(0, 20);
          localStorage.setItem(recentOrdersStorageKey, JSON.stringify(compact));
          return compact;
        }
      });
    } catch (err) {
      setTrackingError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTrackSubmit = (e) => {
    e.preventDefault();
    if (!orderIdInput.trim() || !phoneInput.trim()) return;
    trackOrderByIdAndPhone(orderIdInput, phoneInput);
  };

  return (
    <main className={styles.page} dir={ar ? "rtl" : "ltr"}>
      {/* Hero */}
      <section className={styles.hero}>
        <p className={styles.eyebrow}>{ar ? "تتبع حالة الطلب" : "Order Tracking"}</p>
        <h1>{ar ? "تابع شحنتك خطوة بخطوة." : "Track your shipment step-by-step."}</h1>
        <p>
          {ar
            ? "اكتب رقم الطلب ورقم الموبايل المسجل للوصول السريع لحالة الأوردر وتفاصيل الشحن."
            : "Enter your order number and mobile number to quickly check order details and shipment status."}
        </p>
      </section>

      {/* Grid Container */}
      <section className={styles.container}>
        {/* Left Column: Form & Tracking Result */}
        <div>
          <div className={styles.card}>
            <h2>{ar ? "بيانات التتبع" : "Tracking Details"}</h2>
            <p className={styles.cardSubtitle}>
              {ar
                ? "بنحتاج رقم الموبايل للتأكد من هويتك وحماية بياناتك."
                : "We verify your phone number to keep your order details secure."}
            </p>

            <form className={styles.form} onSubmit={handleTrackSubmit}>
              <div className={styles.formGroup}>
                <label>{ar ? "رقم الطلب" : "Order ID"}</label>
                <input
                  type="text"
                  value={orderIdInput}
                  onChange={(e) => setOrderIdInput(e.target.value)}
                  placeholder={ar ? "مثال: 53896" : "e.g. 53896"}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>{ar ? "رقم الموبايل" : "Phone Number"}</label>
                <input
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="010..."
                  required
                />
              </div>
              <button className={styles.submitBtn} type="submit" disabled={loading}>
                {loading ? (ar ? "جاري التتبع..." : "Tracking...") : (ar ? "تتبع الطلب" : "Track Order")}
              </button>
            </form>

            {trackingError && (
              <div className={styles.errorBox}>
                {trackingError}
              </div>
            )}
          </div>

          {/* Tracking Result View */}
          {trackingResult && (
            <div className={styles.resultContainer}>
              <div className={styles.resultCard}>
                <div className={styles.resultHeader}>
                  <h3 className={styles.orderTitle}>
                    {ar ? "أوردر رقم" : "Order #"}{trackingResult.id.startsWith("CU") ? trackingResult.id : trackingResult.id.slice(0, 8)}
                  </h3>
                  <div className={styles.statusBadges}>
                    <span className={`${styles.badge} ${getStatusBadgeClass(trackingResult.status)}`}>
                      {statusLabel(trackingResult.status)}
                    </span>
                    <span className={`${styles.badge} ${getStatusBadgeClass(trackingResult.payment_status)}`}>
                      {statusLabel(trackingResult.payment_status)}
                    </span>
                  </div>
                </div>

                {/* Progress Stepper */}
                {isCancelled(trackingResult.status) ? (
                  <div className={styles.errorBox} style={{ margin: "10px 0 20px" }}>
                    ⚠️ {ar ? "عذراً، هذا الطلب تم إلغاؤه أو استرجاعه." : "This order has been cancelled or refunded."} ({statusLabel(trackingResult.status)})
                  </div>
                ) : (
                  <div className={styles.trackerWrapper}>
                    <div className={styles.progressTracker}>
                      {/* Active line width percentage logic */}
                      <div
                        className={styles.progressLineActive}
                        style={{
                          width: `${(getProgressStep(trackingResult.status) - 1) * 25}%`
                        }}
                      ></div>
                      
                      {[
                        { step: 1, labelAr: "تم الطلب", labelEn: "Ordered" },
                        { step: 2, labelAr: "تم التأكيد", labelEn: "Confirmed" },
                        { step: 3, labelAr: "جاري التجهيز", labelEn: "Preparing" },
                        { step: 4, labelAr: "مع المندوب", labelEn: "With Courier" },
                        { step: 5, labelAr: "تم التسليم", labelEn: "Delivered" },
                      ].map((item) => {
                        const currentActiveStep = getProgressStep(trackingResult.status);
                        const isCompleted = item.step < currentActiveStep;
                        const isActive = item.step === currentActiveStep;
                        
                        return (
                          <div
                            key={item.step}
                            className={`${styles.step} ${isCompleted ? styles.stepCompleted : ""} ${isActive ? styles.stepActive : ""}`}
                          >
                            <div className={styles.bullet}>
                              {isCompleted ? "✓" : item.step}
                            </div>
                            <div className={styles.stepLabel}>
                              {ar ? item.labelAr : item.labelEn}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Items Summary */}
                <h4 className={styles.summaryTitle}>{ar ? "تفاصيل المنتجات" : "Items Summary"}</h4>
                <div className={styles.itemsList}>
                  {Array.isArray(trackingResult.items) && trackingResult.items.map((item, idx) => (
                    <div key={idx} className={styles.itemRow}>
                      <div>
                        <div className={styles.itemName}>{item.name}</div>
                        <div className={styles.itemQuantity}>
                          {ar ? "الكمية: " : "Qty: "}{item.quantity}
                        </div>
                      </div>
                      <div className={styles.itemPrice}>
                        {formatMoney((item.price || 0) * (item.quantity || 1))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Invoice Totals */}
                <div className={styles.invoice}>
                  <div className={styles.invoiceRow}>
                    <span>{ar ? "المجموع الفرعي" : "Subtotal"}</span>
                    <span>{formatMoney(trackingResult.subtotal || trackingResult.total || 0)}</span>
                  </div>
                  {trackingResult.shipping_fee > 0 && (
                    <div className={styles.invoiceRow}>
                      <span>{ar ? "تكلفة الشحن" : "Shipping"}</span>
                      <span>{formatMoney(trackingResult.shipping_fee)}</span>
                    </div>
                  )}
                  <div className={`${styles.invoiceRow} ${styles.invoiceTotal}`}>
                    <span>{ar ? "الإجمالي الكلي" : "Grand Total"}</span>
                    <span className={styles.invoiceTotalVal}>
                      {formatMoney(trackingResult.grand_total || trackingResult.total || 0)}
                    </span>
                  </div>
                </div>

                {/* Historical Timeline */}
                {trackingResult.status_history && trackingResult.status_history.length > 0 && (
                  <>
                    <h4 className={styles.timelineTitle}>{ar ? "تاريخ تحديثات الطلب" : "Status Updates Timeline"}</h4>
                    <div className={styles.timeline}>
                      {trackingResult.status_history.map((historyItem, idx) => (
                        <div
                          key={idx}
                          className={`${styles.timelineItem} ${idx === 0 ? styles.timelineItemActive : ""}`}
                        >
                          <p className={styles.timelineStatus}>
                            {statusLabel(historyItem.status)}
                          </p>
                          <p className={styles.timelineTime}>
                            {new Date(historyItem.at).toLocaleString(ar ? "ar-EG" : "en-US")}
                          </p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Recent Orders */}
        <div className={styles.card}>
          <h2>{ar ? "طلباتك الأخيرة" : "Recent Orders"}</h2>
          <p className={styles.cardSubtitle}>
            {ar
              ? "الطلبات التي قمت بتتبعها مؤخراً على هذا الجهاز."
              : "Orders you recently tracked on this device."}
          </p>

          <div className={styles.recentOrders}>
            {recentOrders.length > 0 ? (
              recentOrders.map((order) => (
                <button
                  type="button"
                  key={order.id}
                  className={styles.recentCard}
                  onClick={() => {
                    setOrderIdInput(order.id);
                    setPhoneInput(order.phone || "");
                    trackOrderByIdAndPhone(order.id, order.phone || "");
                  }}
                >
                  <div className={styles.recentHeader}>
                    <div>
                      <div className={styles.recentId}>
                        {ar ? "طلب #" : "Order #"}{String(order.id).startsWith("CU") ? order.id : String(order.id).slice(0, 8)}
                      </div>
                      <div className={styles.recentDate}>
                        {order.created_at ? new Date(order.created_at).toLocaleDateString(ar ? "ar-EG" : "en-US") : ""}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
                      <span className={`${styles.badge} ${getStatusBadgeClass(order.status)}`}>
                        {statusLabel(order.status)}
                      </span>
                      <div className={styles.recentPrice}>
                        {formatMoney(order.grand_total || order.total || 0)}
                      </div>
                    </div>
                  </div>
                  <div className={styles.recentProducts}>
                    {Array.isArray(order.items)
                      ? order.items.map((item) => `${item.name} (×${item.quantity})`).join(" | ")
                      : ""}
                  </div>
                </button>
              ))
            ) : (
              <p style={{ opacity: 0.6, fontSize: "0.88rem", textAlign: "center", padding: "20px 0" }}>
                {ar
                  ? "لا توجد طلبات مسجلة في الذاكرة حالياً."
                  : "No recently tracked orders found."}
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
