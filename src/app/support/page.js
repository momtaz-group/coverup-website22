"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import styles from "./page.module.css";

const whatsappNumber = "201050310516";

const stepsAr = [
  "بيانات العميل",
  "بيانات الطلب",
  "تفاصيل الاستفسار",
  "مراجعة وإرسال",
];

const stepsEn = [
  "Customer Details",
  "Order Details",
  "Inquiry Details",
  "Review & Send",
];

export default function SupportPage() {
  const { locale } = useLanguage();
  const ar = locale === "ar";
  const steps = ar ? stepsAr : stepsEn;

  // Form State
  const [activeStep, setActiveStep] = useState(0);
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    clientName: "",
    clientPhone: "",
    orderRef: "",
    message: "",
  });

  const updateField = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const canOpenStep = (index) => {
    if (index <= activeStep) return true;
    if (index === 1) return form.clientName.trim() && form.clientPhone.trim();
    if (index === 2) return form.clientName.trim() && form.clientPhone.trim();
    if (index === 3) return form.clientName.trim() && form.clientPhone.trim() && form.message.trim();
    return false;
  };

  const goNext = () => {
    setNotice("");
    if (activeStep === 0) {
      if (!form.clientName.trim() || !form.clientPhone.trim()) {
        setNotice(ar ? "يرجى كتابة الاسم ورقم الموبايل." : "Please enter your name and phone number.");
        return;
      }
    } else if (activeStep === 2) {
      if (!form.message.trim()) {
        setNotice(ar ? "يرجى كتابة تفاصيل الاستفسار أو الشكوى." : "Please enter your inquiry details.");
        return;
      }
    }

    if (canOpenStep(activeStep + 1)) {
      setActiveStep((current) => Math.min(current + 1, steps.length - 1));
      return;
    }
    setNotice(ar ? "أكمل بيانات هذه الخطوة أولاً." : "Please complete this step first.");
  };

  const submitRequest = () => {
    setNotice("");
    if (!form.clientName.trim() || !form.clientPhone.trim() || !form.message.trim()) {
      setNotice(ar ? "يرجى مراجعة البيانات الأساسية قبل الإرسال." : "Please check required fields before submitting.");
      return;
    }

    setSubmitting(true);

    const whatsappMsg = [
      ar ? "📩 *طلب دعم جديد من الموقع:*" : "📩 *New Support Request:*",
      `👤 *${ar ? "الاسم" : "Name"}:* ${form.clientName.trim()}`,
      `📞 *${ar ? "الموبايل" : "Phone"}:* ${form.clientPhone.trim()}`,
      form.orderRef.trim() ? `🆔 *${ar ? "رقم الطلب" : "Order ID"}:* ${form.orderRef.trim()}` : "",
      `📝 *${ar ? "تفاصيل الاستفسار" : "Details"}:*\n${form.message.trim()}`
    ].filter(Boolean).join("\n");

    setTimeout(() => {
      window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMsg)}`, "_blank", "noopener");
      setSubmitting(false);
      setNotice(ar ? "جاري تحويلك إلى واتساب لمتابعة طلبك..." : "Redirecting you to WhatsApp to follow up...");
    }, 1000);
  };

  return (
    <main className={styles.page} dir={ar ? "rtl" : "ltr"}>
      {/* Hero Header */}
      <section className={styles.hero}>
        <p className={styles.eyebrow}>{ar ? "الدعم الفني" : "Customer Support"}</p>
        <h1>{ar ? "تواصل مع فريق الدعم الفني." : "Contact our technical support."}</h1>
        <p>
          {ar
            ? "اكتب تفاصيل مشكلتك أو استفسارك وسيقوم فريقنا بمساعدتك فوراً على واتساب."
            : "Describe your issue or inquiry, and our support team will help you instantly via WhatsApp."}
        </p>
        <div>
          <Link href="/faq" className={styles.faqNotice}>
            {ar ? "← تبحث عن إجابات سريعة؟ تصفح الأسئلة الشائعة" : "→ Looking for quick answers? Browse our FAQ"}
          </Link>
        </div>
      </section>

      {/* Stepper Section */}
      <section className={styles.stepper}>
        {/* Step Indicator Tabs */}
        <aside className={styles.tabs} aria-label="خطوات طلب الدعم">
          {steps.map((step, index) => (
            <button
              key={step}
              className={index === activeStep ? styles.activeTab : ""}
              type="button"
              onClick={() => canOpenStep(index) && (setActiveStep(index), setNotice(""))}
            >
              <span>{index + 1}</span>
              {step}
            </button>
          ))}
        </aside>

        {/* Current Active Step Panel */}
        <div className={styles.panel}>
          {activeStep === 0 && (
            <div className={styles.stepContent}>
              <h2>{ar ? "بيانات العميل" : "Customer Information"}</h2>
              <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
                {ar
                  ? "الرجاء إدخال اسمك ورقم هاتفك للتواصل."
                  : "Please enter your name and phone number so we can contact you."}
              </p>
              <div className={styles.fieldGrid}>
                <label className={styles.fullField}>
                  {ar ? "الاسم بالكامل" : "Full Name"}
                  <input
                    value={form.clientName}
                    onChange={(e) => updateField("clientName", e.target.value)}
                    placeholder={ar ? "مثال: أحمد محمد" : "e.g. John Doe"}
                    required
                  />
                </label>
                <label className={styles.fullField}>
                  {ar ? "رقم الموبايل" : "Phone Number"}
                  <input
                    value={form.clientPhone}
                    onChange={(e) => updateField("clientPhone", e.target.value)}
                    placeholder="010..."
                    inputMode="tel"
                    required
                  />
                </label>
              </div>
            </div>
          )}

          {activeStep === 1 && (
            <div className={styles.stepContent}>
              <h2>{ar ? "بيانات الطلب (اختياري)" : "Order Information (Optional)"}</h2>
              <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
                {ar
                  ? "إذا كان استفسارك بخصوص أوردر معين، يرجى كتابة رقم الطلب لمساعدتك بشكل أسرع."
                  : "If your inquiry is regarding a specific order, please provide the Order ID."}
              </p>
              <div className={styles.fieldGrid}>
                <label className={styles.fullField}>
                  {ar ? "رقم الطلب إن وجد" : "Order Reference ID"}
                  <input
                    value={form.orderRef}
                    onChange={(e) => updateField("orderRef", e.target.value)}
                    placeholder={ar ? "متاح في إيميل التأكيد" : "Available in confirmation email"}
                  />
                </label>
              </div>
            </div>
          )}

          {activeStep === 2 && (
            <div className={styles.stepContent}>
              <h2>{ar ? "تفاصيل الاستفسار" : "Inquiry Details"}</h2>
              <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
                {ar
                  ? "اشرح المشكلة أو الاستفسار بالتفصيل لمساعدتك بفعالية."
                  : "Explain your issue or question in detail to help us understand."}
              </p>
              <div className={styles.fieldGrid}>
                <label className={styles.fullField}>
                  {ar ? "تفاصيل المشكلة أو الرسالة" : "Describe your issue / message"}
                  <textarea
                    value={form.message}
                    onChange={(e) => updateField("message", e.target.value)}
                    placeholder={ar ? "احكي لنا المشكلة أو اكتب سؤالك بوضوح..." : "Explain your query clearly..."}
                    rows="5"
                    required
                  />
                </label>
              </div>
            </div>
          )}

          {activeStep === 3 && (
            <div className={styles.stepContent}>
              <h2>{ar ? "مراجعة الطلب" : "Review Support Request"}</h2>
              <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
                {ar
                  ? "تأكد من صحة البيانات قبل إرسالها لفريق الدعم الفني."
                  : "Please make sure your details are correct before sending."}
              </p>
              <dl className={styles.review}>
                <div>
                  <dt>{ar ? "العميل" : "Client"}</dt>
                  <dd>{form.clientName || (ar ? "غير محدد" : "Not specified")}</dd>
                </div>
                <div>
                  <dt>{ar ? "رقم الموبايل" : "Phone"}</dt>
                  <dd>{form.clientPhone || (ar ? "غير محدد" : "Not specified")}</dd>
                </div>
                {form.orderRef.trim() && (
                  <div>
                    <dt>{ar ? "رقم الطلب" : "Order ID"}</dt>
                    <dd>{form.orderRef}</dd>
                  </div>
                )}
                <div>
                  <dt>{ar ? "التفاصيل" : "Message"}</dt>
                  <dd style={{ whiteSpace: "pre-line" }}>{form.message || (ar ? "غير محدد" : "Not specified")}</dd>
                </div>
              </dl>
            </div>
          )}

          {notice && (
            <p className={submitting ? styles.successNotice : styles.notice}>
              {notice}
            </p>
          )}

          {/* Stepper Navigation Buttons */}
          <div className={styles.actions}>
            <button
              className={styles.backButton}
              type="button"
              disabled={activeStep === 0 || submitting}
              onClick={() => {
                setActiveStep((current) => Math.max(current - 1, 0));
                setNotice("");
              }}
            >
              {ar ? "رجوع" : "Back"}
            </button>
            {activeStep < steps.length - 1 ? (
              <button className={styles.primaryButton} type="button" onClick={goNext}>
                {ar ? "التالي" : "Next"}
              </button>
            ) : (
              <button
                className={styles.primaryButton}
                type="button"
                disabled={submitting}
                onClick={submitRequest}
              >
                {submitting ? (ar ? "جاري التحويل..." : "Redirecting...") : (ar ? "إرسال الدعم عبر واتساب" : "Send Support via WhatsApp")}
              </button>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
