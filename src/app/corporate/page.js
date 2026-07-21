"use client";

import React from "react";
import { useLanguage } from "@/context/LanguageContext";

const whatsappNumber = "201050310516";

export default function CorporatePage() {
  const { locale } = useLanguage();
  const isAr = locale === "ar";

  const handleSubmit = (event) => {
    event.preventDefault();
    const data = new FormData(event.target);

    const message = [
      isAr ? "طلب عرض سعر شركات Cover Up:" : "Cover Up Corporate Quote Request:",
      `${isAr ? "الشركة" : "Company"}: ${data.get("company")}`,
      `${isAr ? "المسؤول" : "Responsible Person"}: ${data.get("name")}`,
      `${isAr ? "الموبايل" : "Phone"}: ${data.get("phone")}`,
      data.get("email") ? `${isAr ? "الإيميل" : "Email"}: ${data.get("email")}` : "",
      `${isAr ? "عدد الأجهزة" : "Number of Devices"}: ${data.get("deviceCount")}`,
      `${isAr ? "الموديلات" : "Device Models"}: ${data.get("models")}`,
      `${isAr ? "المطلوب" : "Needs"}: ${data.get("needs")}`,
    ]
      .filter(Boolean)
      .join("\n");

    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, "_blank", "noopener");
  };

  return (
    <main className="work-page" dir={isAr ? "rtl" : "ltr"}>
      <section className="work-shell">
        <div className="work-story">
          <p className="eyebrow">{isAr ? "للشركات والفرق" : "For Companies & Teams"}</p>
          <h1>{isAr ? "جهّز أجهزة فريقك بدون فوضى." : "Equip your team’s devices without the noise."}</h1>
          <p>
            {isAr
              ? "أرسل لنا الموديلات والأعداد والخدمات المطلوبة، وسنجهز عرض سعر واضح للكفرات، الاسكرينات، الشواحن، والتركيب حسب احتياج شركتك."
              : "Send us your models, counts, and required services. We prepare a clear quote for cases, screen protectors, chargers, and setup based on your company needs."}
          </p>

          <div className="work-metrics" aria-label={isAr ? "مميزات الخدمة" : "Service highlights"}>
            <span>
              <strong>{isAr ? "24 ساعة" : "24h"}</strong>
              {isAr ? "مراجعة الطلب" : "Quote review"}
            </span>
            <span>
              <strong>{isAr ? "كل الموديلات" : "All models"}</strong>
              {isAr ? "تنسيق الأجهزة" : "Device mapping"}
            </span>
            <span>
              <strong>{isAr ? "توريد وتركيب" : "Supply & setup"}</strong>
              {isAr ? "حسب الموقع" : "By location"}
            </span>
          </div>

          <div className="work-note">
            <span>{isAr ? "كيف يعمل" : "How it works"}</span>
            <ol>
              <li>{isAr ? "اكتب بيانات الشركة وعدد الأجهزة." : "Share company details and device count."}</li>
              <li>{isAr ? "حدد الموديلات والمنتجات المطلوبة." : "List the models and accessories needed."}</li>
              <li>{isAr ? "نرسل عرض السعر مباشرة على واتساب." : "We send the quote directly on WhatsApp."}</li>
            </ol>
          </div>
        </div>

        <form className="work-form" onSubmit={handleSubmit}>
          <div className="form-head">
            <span>{isAr ? "طلب عرض سعر" : "Quote request"}</span>
            <h2>{isAr ? "بيانات العمل" : "Work details"}</h2>
          </div>

          <div className="field-grid">
            <label>
              {isAr ? "اسم الشركة" : "Company name"}
              <input name="company" type="text" placeholder={isAr ? "مثال: شركة النور" : "e.g. Acme Corp"} required />
            </label>
            <label>
              {isAr ? "اسم المسؤول" : "Contact person"}
              <input name="name" type="text" placeholder={isAr ? "الاسم بالكامل" : "Full name"} required />
            </label>
          </div>

          <div className="field-grid">
            <label>
              {isAr ? "رقم الموبايل / واتساب" : "Phone / WhatsApp"}
              <input name="phone" type="tel" placeholder="010..." required />
            </label>
            <label>
              {isAr ? "البريد الإلكتروني" : "Email address"}
              <input name="email" type="email" placeholder="name@company.com" />
            </label>
          </div>

          <label>
            {isAr ? "عدد الأجهزة المتوقع" : "Expected number of devices"}
            <input name="deviceCount" type="number" min="1" placeholder="25" required />
          </label>

          <label>
            {isAr ? "موديلات الأجهزة" : "Device models"}
            <textarea
              name="models"
              rows="4"
              placeholder={isAr ? "مثال: iPhone 15 Pro Max، Samsung S24، Redmi Note 13..." : "e.g. iPhone 15 Pro Max, Samsung S24, Redmi Note 13..."}
              required
            />
          </label>

          <label>
            {isAr ? "الخدمات المطلوبة" : "Required services"}
            <textarea
              name="needs"
              rows="4"
              placeholder={isAr ? "كفرات حماية، اسكرينات، شواحن، كابلات، تركيب في مقر الشركة..." : "Cases, screen protectors, chargers, cables, on-site setup..."}
              required
            />
          </label>

          <button type="submit">{isAr ? "إرسال الطلب عبر واتساب" : "Send request on WhatsApp"}</button>
        </form>
      </section>

      <style jsx>{`
        .work-page {
          min-height: 100vh;
          max-width: 100%;
          overflow-x: hidden;
          padding: clamp(28px, 6vw, 76px) 18px;
          background:
            radial-gradient(circle at 12% 12%, rgba(21, 91, 208, 0.12), transparent 28%),
            linear-gradient(180deg, #ffffff 0%, #f6f9ff 100%);
          color: #111827;
        }

        .work-shell {
          width: min(1160px, 100%);
          max-width: 100%;
          margin: 0 auto;
          display: grid;
          grid-template-columns: minmax(280px, 0.95fr) minmax(0, 1.05fr);
          gap: 22px;
          align-items: stretch;
        }

        .work-story,
        .work-form {
          min-width: 0;
          max-width: 100%;
          border: 1px solid rgba(17, 24, 39, 0.1);
          border-radius: 21px;
          background: rgba(255, 255, 255, 0.84);
          box-shadow: 0 30px 80px rgba(21, 91, 208, 0.12);
          backdrop-filter: blur(22px);
        }

        .work-story {
          padding: clamp(26px, 5vw, 48px);
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .eyebrow,
        .form-head span,
        .work-note span {
          margin: 0;
          color: #155bd0;
          font-size: 0.78rem;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0;
        }

        h1,
        h2,
        p {
          margin: 0;
        }

        h1 {
          font-size: clamp(2.2rem, 5vw, 4.4rem);
          line-height: 1.02;
          letter-spacing: 0;
          overflow-wrap: anywhere;
        }

        .work-story > p {
          color: #5f6b7a;
          font-size: 1.04rem;
          line-height: 1.85;
        }

        .work-metrics {
          display: grid;
          min-width: 0;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        .work-metrics span,
        .work-note {
          min-width: 0;
          border: 1px solid rgba(17, 24, 39, 0.08);
          border-radius: 18px;
          background: #ffffff;
          padding: 16px;
        }

        .work-metrics strong {
          display: block;
          overflow-wrap: anywhere;
          color: #111827;
          font-size: 1rem;
          margin-bottom: 4px;
        }

        .work-metrics span {
          color: #667085;
          font-size: 0.88rem;
          line-height: 1.5;
          overflow-wrap: anywhere;
        }

        .work-note {
          margin-top: auto;
        }

        .work-note ol {
          margin: 12px 0 0;
          padding-inline-start: 22px;
          color: #667085;
          line-height: 1.85;
        }

        .work-form {
          padding: clamp(22px, 4vw, 40px);
          display: grid;
          gap: 18px;
        }

        .form-head h2 {
          margin-top: 6px;
          font-size: clamp(1.55rem, 3vw, 2.25rem);
          letter-spacing: 0;
        }

        .field-grid {
          display: grid;
          min-width: 0;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        label {
          display: grid;
          min-width: 0;
          gap: 8px;
          color: #344054;
          font-size: 0.93rem;
          font-weight: 900;
        }

        input,
        textarea {
          width: 100%;
          min-width: 0;
          border: 1px solid rgba(17, 24, 39, 0.12);
          border-radius: 15px;
          background: #ffffff;
          color: #111827;
          padding: 14px 15px;
          font: inherit;
          outline: none;
          resize: vertical;
        }

        input {
          min-height: 52px;
        }

        input:focus,
        textarea:focus {
          border-color: #155bd0;
          box-shadow: 0 0 0 4px rgba(21, 91, 208, 0.12);
        }

        button {
          min-height: 56px;
          border: 0;
          border-radius: 17px;
          background: #155bd0;
          color: #ffffff;
          font-weight: 950;
          font-size: 1rem;
          cursor: pointer;
          box-shadow: 0 18px 36px rgba(21, 91, 208, 0.22);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        button:hover {
          transform: translateY(-1px);
          box-shadow: 0 22px 44px rgba(21, 91, 208, 0.26);
        }

        :global([data-theme="dark"]) .work-page {
          background:
            radial-gradient(circle at 12% 12%, rgba(21, 91, 208, 0.2), transparent 28%),
            linear-gradient(180deg, #000000 0%, #080b12 100%);
          color: #ffffff;
        }

        :global([data-theme="dark"]) .work-story,
        :global([data-theme="dark"]) .work-form,
        :global([data-theme="dark"]) .work-metrics span,
        :global([data-theme="dark"]) .work-note {
          border-color: rgba(255, 255, 255, 0.14);
          background: #111111;
          color: #ffffff;
          box-shadow: 0 30px 80px rgba(0, 0, 0, 0.36);
        }

        :global([data-theme="dark"]) .work-metrics span,
        :global([data-theme="dark"]) .work-note {
          background: #181818;
          box-shadow: none;
        }

        :global([data-theme="dark"]) h1,
        :global([data-theme="dark"]) h2,
        :global([data-theme="dark"]) .work-metrics strong {
          color: #ffffff;
        }

        :global([data-theme="dark"]) .work-story > p,
        :global([data-theme="dark"]) .work-metrics span,
        :global([data-theme="dark"]) .work-note ol,
        :global([data-theme="dark"]) label {
          color: #a1a1aa;
        }

        :global([data-theme="dark"]) input,
        :global([data-theme="dark"]) textarea {
          border-color: rgba(255, 255, 255, 0.14);
          background: #181818;
          color: #ffffff;
        }

        @media (max-width: 900px) {
          .work-shell {
            width: 100%;
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 620px) {
          .work-page {
            padding: 16px 12px 28px;
          }

          .field-grid,
          .work-metrics {
            grid-template-columns: 1fr;
          }

          .work-story,
          .work-form {
            padding: 20px;
          }

          button {
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
}
