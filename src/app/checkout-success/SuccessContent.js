"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";

export default function SuccessContent() {
  const { locale } = useLanguage();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const [copied, setCopied] = useState(false);

  // We only want the first 8 characters for a clean user-facing ID, unless it starts with CU
  const shortOrderId = orderId ? (String(orderId).startsWith("CU") ? String(orderId) : String(orderId).slice(0, 8)) : "";

  const handleCopy = () => {
    if (!shortOrderId) return;
    navigator.clipboard.writeText(shortOrderId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <main style={{ padding: "80px 20px", minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ maxWidth: "600px", width: "100%", background: "#fff", padding: "48px 32px", borderRadius: "24px", textAlign: "center", boxShadow: "0 20px 40px rgba(0,0,0,0.08)", border: "1px solid #f1f5f9" }}>
        
        {/* Success Icon */}
        <div style={{ width: "80px", height: "80px", background: "#d1fae5", color: "#059669", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>

        <h1 style={{ fontSize: "28px", margin: "0 0 16px", color: "#0f172a" }}>
          {locale === "ar" ? "تم استلام طلبك بنجاح!" : "Order Placed Successfully!"}
        </h1>
        
        <p style={{ fontSize: "16px", color: "#64748b", margin: "0 0 32px", lineHeight: 1.6 }}>
          {locale === "ar" 
            ? "شكراً لثقتك بنا. جاري تجهيز طلبك وسيتم إرسال فاتورة تفصيلية ومستجدات حالة الطلب إلى بريدك الإلكتروني."
            : "Thank you for shopping with us. We are preparing your order and an invoice will be emailed to you shortly."}
        </p>

        {/* Order Number Box */}
        {shortOrderId && (
          <div style={{ background: "#f8fafc", padding: "24px", borderRadius: "16px", marginBottom: "32px", border: "1px dashed #cbd5e1" }}>
            <p style={{ margin: "0 0 8px", fontSize: "14px", color: "#64748b", fontWeight: "bold" }}>
              {locale === "ar" ? "رقم الطلب الخاص بك:" : "Your Order Number:"}
            </p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px" }}>
              <span style={{ fontSize: "32px", fontWeight: "900", color: "#0070f3", letterSpacing: "2px" }}>
                #{shortOrderId}
              </span>
              <button 
                onClick={handleCopy}
                style={{ background: "none", border: "none", cursor: "pointer", color: copied ? "#059669" : "#64748b", display: "flex", alignItems: "center", justifyContent: "center", padding: "8px", borderRadius: "8px", transition: "all 0.2s" }}
                title={locale === "ar" ? "نسخ رقم الطلب" : "Copy Order ID"}
              >
                {copied ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                )}
              </button>
            </div>
            {copied && (
              <span style={{ display: "block", marginTop: "8px", fontSize: "12px", color: "#059669", fontWeight: "bold" }}>
                {locale === "ar" ? "تم النسخ!" : "Copied!"}
              </span>
            )}
            <p style={{ margin: "16px 0 0", fontSize: "13px", color: "#475569" }}>
              {locale === "ar" 
                ? "الرجاء الاحتفاظ برقم الطلب للرجوع إليه عند الحاجة."
                : "Please save your order number for future reference."}
            </p>
          </div>
        )}

        <div style={{ display: "flex", gap: "16px", justifyContent: "center" }}>
          <Link href="/products" style={{ display: "inline-block", background: "#0070f3", color: "#fff", padding: "14px 28px", borderRadius: "8px", textDecoration: "none", fontWeight: "bold", fontSize: "15px", transition: "all 0.2s" }}>
            {locale === "ar" ? "الاستمرار في التسوق" : "Continue Shopping"}
          </Link>
          <Link href="/track" style={{ display: "inline-block", background: "#fff", color: "#0f172a", border: "1px solid #cbd5e1", padding: "14px 28px", borderRadius: "8px", textDecoration: "none", fontWeight: "bold", fontSize: "15px", transition: "all 0.2s" }}>
            {locale === "ar" ? "تتبع الطلب" : "Track Order"}
          </Link>
        </div>

      </div>
    </main>
  );
}
