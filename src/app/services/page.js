"use client";

import React from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";

export default function ServicesPage() {
  const { locale } = useLanguage();

  return (
    <main className="simple-page">
      <section style={{ maxWidth: "1080px", margin: "40px auto 100px", padding: "0 20px" }}>
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <p className="eyebrow" style={{ color: "#1267e8", fontWeight: "800", letterSpacing: "0.12em" }}>
            {locale === "ar" ? "خدمات إضافية" : "More Services"}
          </p>
          <h1 style={{ marginTop: "12px", fontSize: "clamp(2rem, 4.5vw, 3.2rem)", fontWeight: "800", color: "var(--text)" }}>
            {locale === "ar" ? "كل خدمات Cover Up في مكان واحد" : "All Cover Up Services in One Place"}
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "1.05rem", maxWidth: "560px", margin: "12px auto 0" }}>
            {locale === "ar"
              ? "اختر الخدمة المطلوبة للوصول السريع إلى الدعم، التتبع، أو طلبات الشركات."
              : "Choose the service you need for quick access to support, tracking, or enterprise requests."}
          </p>
        </div>

        <div className="services-grid" style={{ display: "grid", gap: "24px", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
          {/* Card 1: Support / Complaints */}
          <Link href="/support" className="service-redirect-card">
            <div className="card-icon">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
            <h3>{locale === "ar" ? "الدعم" : "Support"}</h3>
            <p>
              {locale === "ar" 
                ? "تواصل مع الدعم الفني لتقديم الاستفسارات والشكاوى ومتابعة طلبك." 
                : "Contact technical support to submit inquiries, complaints, and follow up on your request."}
            </p>
          </Link>
 
          {/* Card 2: Track Order */}
          <Link href="/track" className="service-redirect-card">
            <div className="card-icon">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </div>
            <h3>{locale === "ar" ? "تتبع الطلب" : "Track Order"}</h3>
            <p>
              {locale === "ar" 
                ? "تابع حالة طلبك وميعاد التوصيل وسجل طلباتك الأخيرة برقم الموبايل ورقم الأوردر." 
                : "Track your order status and delivery updates instantly."}
            </p>
          </Link>
 
          {/* Card 3: Contact */}
          <Link href="/contact" className="service-redirect-card">
            <div className="card-icon">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
            </div>
            <h3>{locale === "ar" ? "تواصل معنا" : "Contact Us"}</h3>
            <p>
              {locale === "ar" 
                ? "موقع الفرع الرئيسي، أرقام التليفون، ومواعيد العمل الرسمية." 
                : "Find our flagship store location, phone numbers, and official working hours."}
            </p>
          </Link>
        </div>
      </section>
    </main>
  );
}

