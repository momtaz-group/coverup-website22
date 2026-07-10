"use client";

import React from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import styles from "./page.module.css";

export default function ContactPage() {
  const { t, locale } = useLanguage();
  const ar = locale === "ar";

  const phoneNumber = "01050310516";
  const emailAddress = "hello@coverup.tech";
  const addressText = ar ? "الحي السكني R3، مصر" : "R3, Egypt";
  const mapsUrl = "https://maps.google.com/?q=R3,Egypt";

  return (
    <main className={styles.page} dir={ar ? "rtl" : "ltr"}>
      {/* Hero */}
      <section className={styles.hero}>
        <p className={styles.eyebrow}>{ar ? "تواصل معنا" : "Contact Us"}</p>
        <h1>{ar ? "يسعدنا دائماً تواصلك معنا." : "We'd love to hear from you."}</h1>
        <p>
          {ar
            ? "فريق Cover Up متواجد دائماً للإجابة على استفساراتك وتقديم الدعم بخصوص المنتجات والصيانة."
            : "The Cover Up team is always here to answer your questions and support you regarding products and repairs."}
        </p>
      </section>

      {/* Grid Container */}
      <section className={styles.container}>
        {/* Contact Info Cards */}
        <div className={styles.grid}>
          {/* Card 1: Phone */}
          <a href={`tel:+20${phoneNumber}`} className={styles.card}>
            <div className={styles.iconWrapper}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
            </div>
            <div className={styles.cardContent}>
              <h3 className={styles.cardTitle}>{ar ? "رقم الهاتف" : "Phone Number"}</h3>
              <p className={styles.cardVal}>{phoneNumber}</p>
              <span className={styles.cardLink}>
                {ar ? "اتصل الآن" : "Call now"} {ar ? "←" : "→"}
              </span>
            </div>
          </a>

          {/* Card 2: Email */}
          <a href={`mailto:${emailAddress}`} className={styles.card}>
            <div className={styles.iconWrapper}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
            </div>
            <div className={styles.cardContent}>
              <h3 className={styles.cardTitle}>{ar ? "البريد الإلكتروني" : "Email Address"}</h3>
              <p className={styles.cardVal}>{emailAddress}</p>
              <span className={styles.cardLink}>
                {ar ? "أرسل رسالة" : "Send email"} {ar ? "←" : "→"}
              </span>
            </div>
          </a>

          {/* Card 3: Address */}
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className={styles.card}>
            <div className={styles.iconWrapper}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
            </div>
            <div className={styles.cardContent}>
              <h3 className={styles.cardTitle}>{ar ? "العنوان" : "Store Location"}</h3>
              <p className={styles.cardVal}>{addressText}</p>
              <span className={styles.cardLink}>
                {ar ? "الاتجاهات على الخريطة" : "Get directions"} {ar ? "←" : "→"}
              </span>
            </div>
          </a>

          {/* Card 4: Hours */}
          <div className={styles.card} style={{ cursor: "default" }}>
            <div className={styles.iconWrapper}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </div>
            <div className={styles.cardContent}>
              <h3 className={styles.cardTitle}>{ar ? "مواعيد العمل" : "Working Hours"}</h3>
              <p className={styles.cardVal}>{t("hours")}</p>
              <span className={styles.cardLink} style={{ color: "var(--muted)", fontWeight: "normal" }}>
                {ar ? "متاحين خلالها للرد الفوري" : "Available for instant replies"}
              </span>
            </div>
          </div>
        </div>

        {/* WhatsApp Call To Action */}
        <div className={styles.whatsappCta}>
          <h2 className={styles.whatsappTitle}>{ar ? "تواصل معنا مباشرة عبر واتساب" : "Chat Directly on WhatsApp"}</h2>
          <p className={styles.whatsappDesc}>
            {ar
              ? "اضغط على الزر أدناه ليتم تحويلك مباشرة للدردشة معنا في أي استفسار بخصوص المنتجات، الطلبات، أو لحجز موعد صيانة."
              : "Click the button below to directly start a conversation with us for any inquiries about products, orders, or booking a repair."}
          </p>
          <a
            href={`https://wa.me/20${phoneNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.whatsappBtn}
          >
            {/* WhatsApp Icon */}
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.5-5.739-1.446L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.852.002-2.63-1.018-5.101-2.87-6.956-1.851-1.854-4.321-2.875-6.958-2.876-5.44 0-9.866 4.42-9.87 9.853-.001 1.702.46 3.366 1.336 4.815l-.991 3.623 3.714-.975zm11.367-7.393c-.092-.154-.344-.246-.723-.437-.379-.191-2.242-1.107-2.587-1.233-.345-.126-.597-.191-.849.191-.252.382-.975 1.233-1.196 1.488-.22.254-.441.286-.82.095-.379-.191-1.6-.59-3.048-1.882-1.127-1.006-1.888-2.248-2.11-2.63-.22-.382-.023-.588.168-.778.172-.171.379-.442.569-.663.19-.221.253-.379.379-.633.126-.254.063-.477-.031-.668-.095-.191-.849-2.046-1.164-2.805-.306-.738-.617-.639-.849-.651-.215-.011-.46-.013-.705-.013-.245 0-.644.092-.98.468-.337.376-1.287 1.258-1.287 3.067 0 1.81 1.317 3.557 1.501 3.801.184.245 2.593 3.96 6.282 5.556.877.38 1.562.607 2.095.777.881.28 1.684.24 2.318.146.707-.106 2.242-.916 2.556-1.802.315-.886.315-1.644.221-1.802z"/>
            </svg>
            <span>{ar ? "تواصل معنا على واتساب" : "Chat with us on WhatsApp"}</span>
          </a>
        </div>

        {/* Interactive Stylized Map Card */}
        <div className={styles.mapCard} id="map">
          <h3 className={styles.mapTitle}>{ar ? "موقع الفرع" : "Our Flagship Store"}</h3>
          <div className={styles.mapVisual}>
            {/* Visual Pin Icon */}
            <svg
              className={styles.mapPin}
              width="44"
              height="44"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" fill="rgba(180,35,24,0.1)"></path>
              <circle cx="12" cy="10" r="3" fill="#fff"></circle>
            </svg>
          </div>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.mapBtn}
          >
            {ar ? "فتح الموقع في خرائط Google" : "Open in Google Maps"}
          </a>
        </div>
      </section>
    </main>
  );
}
