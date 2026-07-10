"use client";

import React from "react";
import { useLanguage } from "@/context/LanguageContext";

const whatsappNumber = "201050310516";

export default function CorporatePage() {
  const { locale } = useLanguage();

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    
    const message = [
      locale === "ar" ? "طلب عرض سعر شركات Cover Up:" : "Cover Up Corporate Quote Request:",
      `${locale === "ar" ? "الشركة" : "Company"}: ${data.get("company")}`,
      `${locale === "ar" ? "المسؤول" : "Responsible Person"}: ${data.get("name")}`,
      `${locale === "ar" ? "الموبايل" : "Phone"}: ${data.get("phone")}`,
      data.get("email") ? `${locale === "ar" ? "الإيميل" : "Email"}: ${data.get("email")}` : "",
      `${locale === "ar" ? "عدد الأجهزة" : "Number of Devices"}: ${data.get("deviceCount")}`,
      `${locale === "ar" ? "الموديلات" : "Device Models"}: ${data.get("models")}`,
      `${locale === "ar" ? "المطلوب" : "Needs"}: ${data.get("needs")}`,
    ]
      .filter(Boolean)
      .join("\n");

    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, "_blank", "noopener");
  };

  return (
    <main className="simple-page" style={{ display: "flex", justifyContent: "center", width: "100%" }}>
      <section className="corporate-request" style={{ width: "100%", maxWidth: "760px", margin: "0 auto", textAlign: "center" }}>
        <div style={{ marginBottom: "32px" }}>
          <p className="eyebrow" style={{ color: "#1267e8", fontWeight: "800", letterSpacing: "0.1em" }}>
            {locale === "ar" ? "للشركات والأعمال" : "For Corporate & Teams"}
          </p>
          <h1 style={{ fontSize: "clamp(2rem, 4.5vw, 3.4rem)", fontWeight: "800", lineHeight: 1.2, margin: "14px 0" }}>
            {locale === "ar" 
              ? "طلب عرض سعر مخصص لأجهزة فريقك." 
              : "Request a custom quote for your team's devices."}
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "1.08rem", maxWidth: "600px", margin: "0 auto", lineHeight: 1.6 }}>
            {locale === "ar"
              ? "حدد عدد الأجهزة والموديلات والخدمة المطلوبة، وسيقوم فريقنا بتجهيز عرض سعر خاص ومدروس لمؤسستك."
              : "Specify the device models, counts, and required services, and our team will prepare a tailored corporate quote."}
          </p>
        </div>
        
        <form 
          className="visit-form corporate-form" 
          onSubmit={handleSubmit}
          style={{
            display: "grid",
            gap: "18px",
            padding: "36px clamp(20px, 4vw, 42px)",
            borderRadius: "20px",
            background: "var(--panel)",
            border: "1px solid var(--line)",
            boxShadow: "var(--shadow)",
            textAlign: "start"
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
            <label style={{ display: "grid", gap: "8px", fontWeight: "700", color: "var(--text)" }}>
              {locale === "ar" ? "اسم الشركة" : "Company Name"}
              <input name="company" type="text" placeholder={locale === "ar" ? "مثال: شركة النور" : "e.g., Acme Corp"} required />
            </label>
            <label style={{ display: "grid", gap: "8px", fontWeight: "700", color: "var(--text)" }}>
              {locale === "ar" ? "اسم المسؤول" : "Contact Person"}
              <input name="name" type="text" placeholder={locale === "ar" ? "الاسم بالكامل" : "Full Name"} required />
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
            <label style={{ display: "grid", gap: "8px", fontWeight: "700", color: "var(--text)" }}>
              {locale === "ar" ? "رقم الموبايل / واتساب" : "Phone / WhatsApp"}
              <input name="phone" type="tel" placeholder="010..." required />
            </label>
            <label style={{ display: "grid", gap: "8px", fontWeight: "700", color: "var(--text)" }}>
              {locale === "ar" ? "البريد الإلكتروني" : "Email Address"}
              <input name="email" type="email" placeholder="name@company.com" />
            </label>
          </div>

          <label style={{ display: "grid", gap: "8px", fontWeight: "700", color: "var(--text)" }}>
            {locale === "ar" ? "عدد الأجهزة المتوقعة" : "Number of Devices"}
            <input name="deviceCount" type="number" min="1" placeholder="10" required />
          </label>

          <label style={{ display: "grid", gap: "8px", fontWeight: "700", color: "var(--text)" }}>
            {locale === "ar" ? "موديلات الأجهزة" : "Device Models"}
            <textarea
              name="models"
              rows="3"
              placeholder={locale === "ar" ? "مثال: iPhone 15 Pro Max (10 أجهزة)، Samsung S24 (5 أجهزة)..." : "e.g., iPhone 15 Pro Max (10 units), Samsung S24 (5 units)..."}
              required
            ></textarea>
          </label>

          <label style={{ display: "grid", gap: "8px", fontWeight: "700", color: "var(--text)" }}>
            {locale === "ar" ? "المتطلبات والخدمات المطلوبة" : "Requirements / Needs"}
            <textarea
              name="needs"
              rows="3"
              placeholder={
                locale === "ar"
                  ? "كفرات حماية، اسكرينات ضد الصدمات، تركيب بمقر الشركة، صيانة دورية..."
                  : "e.g., protective cases, screen protectors, on-site installation..."
              }
              required
            ></textarea>
          </label>

          <button className="button button-primary" type="submit" style={{ width: "100%", padding: "16px", fontSize: "1.05rem", borderRadius: "12px", marginTop: "8px" }}>
            {locale === "ar" ? "إرسال طلب عرض السعر عبر واتساب" : "Request Corporate Quote via WhatsApp"}
          </button>
        </form>
      </section>
    </main>
  );
}

