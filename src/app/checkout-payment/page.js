"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useLanguage } from "@/context/LanguageContext";

const methods = [
  {
    id: "vodafone_cash",
    logo: "/assets/payment_methods/Vodafone Cash.png",
    account: "01050310516",
    color: "#e60000",
  },
  {
    id: "instapay",
    logo: "/assets/payment_methods/InstaPay_Logo.png",
    account: "coverup@instapay",
    phone: "01050310516",
    color: "#5b2bd8",
  },
  {
    id: "telda",
    logo: "/assets/payment_methods/telda.jpg",
    account: "@coverup",
    color: "#111827",
  },
];

function PaymentContent() {
  const { locale } = useLanguage();
  const { clearCart } = useCart();
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get("orderId");
  const isAr = locale === "ar";

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);
  const [selectedMethod, setSelectedMethod] = useState("");
  const [instapaySubOption, setInstapaySubOption] = useState("ipa");
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [senderInfo, setSenderInfo] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [copyNotice, setCopyNotice] = useState("");

  useEffect(() => {
    if (!orderId) {
      setError(isAr ? "رقم الطلب غير صحيح." : "Invalid order number.");
      setLoading(false);
      return;
    }

    fetch(`/api/orders/payment-details?orderId=${encodeURIComponent(orderId)}`)
      .then((res) => {
        if (!res.ok) throw new Error(isAr ? "فشل تحميل تفاصيل الطلب." : "Failed to load order details.");
        return res.json();
      })
      .then((data) => {
        if (data.order) {
          setOrder(data.order);
        } else {
          setError(isAr ? "الطلب غير موجود." : "Order not found.");
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [orderId, isAr]);

  const selectedMethodInfo = useMemo(
    () => methods.find((method) => method.id === selectedMethod),
    [selectedMethod]
  );

  const labels = {
    vodafone_cash: isAr ? "فودافون كاش" : "Vodafone Cash",
    instapay: isAr ? "إنستا باي" : "InstaPay",
    telda: isAr ? "تيلدا" : "Telda",
  };

  const descriptions = {
    vodafone_cash: isAr ? "تحويل فوري عبر المحفظة" : "Instant wallet transfer",
    instapay: isAr ? "تحويل مباشر من حسابك البنكي" : "Direct bank transfer",
    telda: isAr ? "تحويل من تطبيق تيلدا" : "Transfer from Telda app",
  };

  const steps = [
    isAr ? "طريقة الدفع" : "Method",
    isAr ? "إثبات التحويل" : "Proof",
    isAr ? "تم الإرسال" : "Submitted",
  ];

  const amount = order?.grand_total ? Number(order.grand_total).toLocaleString(isAr ? "ar-EG" : "en-US") : "-";

  const fileToDataUrl = (file) =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });

  const handleCopy = async (text) => {
    await navigator.clipboard.writeText(text);
    setCopyNotice(isAr ? "تم النسخ" : "Copied");
    window.setTimeout(() => setCopyNotice(""), 1600);
  };

  const chooseMethod = (methodId) => {
    setSelectedMethod(methodId);
    setFormError("");
    setStep(2);
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setProofFile(file);
    setProofPreview(URL.createObjectURL(file));
    setFormError("");
  };

  const resetProof = () => {
    setProofFile(null);
    setProofPreview("");
  };

  const validatePayment = () => {
    if (!proofFile) return isAr ? "ارفع صورة إثبات التحويل أولاً." : "Upload the transfer proof image first.";
    if ((selectedMethod === "vodafone_cash" || selectedMethod === "instapay") && !senderInfo.trim()) {
      return isAr ? "اكتب الرقم أو الحساب الذي تم التحويل منه." : "Enter the sender phone number or account.";
    }
    if ((selectedMethod === "vodafone_cash" || selectedMethod === "instapay") && !transactionId.trim()) {
      return isAr ? "اكتب رقم عملية التحويل." : "Enter the transaction reference.";
    }
    if (selectedMethod === "telda" && !senderInfo.trim()) {
      return isAr ? "اكتب اسم حسابك في تيلدا." : "Enter your Telda username.";
    }
    return "";
  };

  const handleConfirmPayment = async () => {
    const validationError = validatePayment();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSubmitting(true);
    setFormError("");

    try {
      const dataUrl = await fileToDataUrl(proofFile);
      const uploadRes = await fetch("/api/storage-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "payment",
          orderId: order.id,
          method: selectedMethod,
          dataUrl,
        }),
      });

      const uploadData = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok) throw new Error(uploadData.message || (isAr ? "فشل رفع إثبات الدفع." : "Failed to upload payment proof."));

      const paymentRes = await fetch("/api/orders/payment-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          paymentMethod: selectedMethod,
          paymentTransactionId: transactionId || `@${senderInfo.replace(/^@/, "")}`,
          paymentReference: uploadData.url,
          senderInfo,
          notes: paymentNotes,
        }),
      });

      const paymentData = await paymentRes.json().catch(() => ({}));
      if (!paymentRes.ok) throw new Error(paymentData.message || (isAr ? "فشل إرسال بيانات الدفع." : "Failed to submit payment details."));

      setSuccessMessage(isAr ? "تم إرسال بيانات الدفع بنجاح." : "Payment details submitted successfully.");
      clearCart();
      setStep(3);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="gateway-loading">
        <span className="gateway-spinner" />
        <p>{isAr ? "جارٍ تحميل بوابة الدفع..." : "Loading payment gateway..."}</p>
        <style jsx>{`
          .gateway-loading {
            min-height: 70vh;
            display: grid;
            place-items: center;
            align-content: center;
            gap: 16px;
            background: #ffffff;
            color: #111827;
            font-weight: 800;
          }
          .gateway-spinner {
            width: 42px;
            height: 42px;
            border: 3px solid #e5e7eb;
            border-top-color: #155bd0;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="gateway-state">
        <div className="state-card">
          <span className="state-mark">!</span>
          <h1>{isAr ? "تعذر فتح بوابة الدفع" : "Payment gateway unavailable"}</h1>
          <p>{error || (isAr ? "الطلب غير موجود." : "Order not found.")}</p>
          <button type="button" onClick={() => router.push("/")}>
            {isAr ? "العودة للرئيسية" : "Back home"}
          </button>
        </div>
        <style jsx>{gatewayStyles}</style>
      </main>
    );
  }

  return (
    <main className="gateway-page">
      <section className="gateway-shell" dir={isAr ? "rtl" : "ltr"}>
        <aside className="gateway-overview" aria-label={isAr ? "ملخص الدفع" : "Payment summary"}>
          <p className="eyebrow">{isAr ? "بوابة دفع Cover Up" : "Cover Up Payment"}</p>
          <h1>{isAr ? "أكمل التحويل بثقة ووضوح." : "Finish your transfer with a clean, verified flow."}</h1>
          <p className="gateway-copy">
            {isAr
              ? "اختر طريقة الدفع، ارفع إثبات التحويل، وسنراجع الطلب قبل التجهيز والشحن."
              : "Choose a method, upload proof, and our team will verify your order before fulfillment."}
          </p>

          <div className="order-panel">
            <span>{isAr ? "رقم الطلب" : "Order number"}</span>
            <strong>{order.id}</strong>
            <button type="button" onClick={() => handleCopy(order.id)}>
              {isAr ? "نسخ" : "Copy"}
            </button>
          </div>

          <div className="amount-card">
            <span>{isAr ? "المبلغ المطلوب" : "Amount due"}</span>
            <strong>{amount} EGP</strong>
          </div>

          <div className="gateway-rail">
            {steps.map((label, index) => {
              const stepNumber = index + 1;
              return (
                <div key={label} className={`rail-item ${step >= stepNumber ? "is-active" : ""}`}>
                  <span>{stepNumber}</span>
                  <p>{label}</p>
                </div>
              );
            })}
          </div>
        </aside>

        <section className="gateway-card">
          {copyNotice && <div className="copy-toast">{copyNotice}</div>}

          {step === 1 && (
            <div className="step-panel">
              <div className="section-head">
                <p>{isAr ? "الخطوة الأولى" : "Step one"}</p>
                <h2>{isAr ? "اختر طريقة الدفع المناسبة" : "Choose your payment method"}</h2>
              </div>

              <div className="method-grid">
                {methods.map((method) => (
                  <button key={method.id} type="button" className="method-card" onClick={() => chooseMethod(method.id)}>
                    <span className="method-logo" style={{ "--method-color": method.color }}>
                      <img src={method.logo} alt={labels[method.id]} />
                    </span>
                    <span>
                      <strong>{labels[method.id]}</strong>
                      <small>{descriptions[method.id]}</small>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && selectedMethodInfo && (
            <div className="step-panel">
              <button type="button" className="ghost-button" onClick={() => setStep(1)}>
                {isAr ? "رجوع لاختيار الطريقة" : "Back to methods"}
              </button>

              <div className="selected-method">
                <span className="method-logo large" style={{ "--method-color": selectedMethodInfo.color }}>
                  <img src={selectedMethodInfo.logo} alt={labels[selectedMethodInfo.id]} />
                </span>
                <div>
                  <p>{isAr ? "طريقة الدفع المختارة" : "Selected method"}</p>
                  <h2>{labels[selectedMethodInfo.id]}</h2>
                </div>
              </div>

              {selectedMethod === "instapay" && (
                <div className="segmented-pay">
                  <button type="button" className={instapaySubOption === "ipa" ? "active" : ""} onClick={() => setInstapaySubOption("ipa")}>
                    {isAr ? "عنوان الدفع" : "Payment address"}
                  </button>
                  <button type="button" className={instapaySubOption === "phone" ? "active" : ""} onClick={() => setInstapaySubOption("phone")}>
                    {isAr ? "رقم الهاتف" : "Phone number"}
                  </button>
                </div>
              )}

              <div className="transfer-card">
                <div>
                  <span>{isAr ? "حوّل المبلغ" : "Transfer amount"}</span>
                  <strong>{amount} EGP</strong>
                </div>
                <div>
                  <span>{isAr ? "إلى" : "To"}</span>
                  <strong>
                    {selectedMethod === "instapay" && instapaySubOption === "phone"
                      ? selectedMethodInfo.phone
                      : selectedMethodInfo.account}
                  </strong>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(
                        selectedMethod === "instapay" && instapaySubOption === "phone"
                          ? selectedMethodInfo.phone
                          : selectedMethodInfo.account
                      )
                    }
                  >
                    {isAr ? "نسخ" : "Copy"}
                  </button>
                </div>
              </div>

              <ol className="instruction-list">
                <li>{isAr ? "قم بتحويل نفس المبلغ الموضح بدون تقريب." : "Transfer the exact amount shown above."}</li>
                <li>{isAr ? "احتفظ بلقطة شاشة واضحة لتأكيد التحويل." : "Keep a clear screenshot of the transfer confirmation."}</li>
                <li>{isAr ? "ارفع الصورة واكتب بيانات التحويل للمراجعة." : "Upload it and add the transfer details for review."}</li>
              </ol>

              <div className="proof-section">
                <label className="upload-box">
                  <input type="file" accept="image/*" onChange={handleFileChange} />
                  {proofPreview ? (
                    <span className="preview-wrap">
                      <img src={proofPreview} alt={isAr ? "إثبات التحويل" : "Transfer proof"} />
                      <small>{proofFile?.name}</small>
                    </span>
                  ) : (
                    <span>
                      <strong>{isAr ? "ارفع صورة إثبات التحويل" : "Upload transfer proof"}</strong>
                      <small>{isAr ? "PNG أو JPG أو WebP حتى 10MB" : "PNG, JPG, or WebP up to 10MB"}</small>
                    </span>
                  )}
                </label>
                {proofPreview && (
                  <button type="button" className="danger-lite" onClick={resetProof}>
                    {isAr ? "إزالة الصورة" : "Remove image"}
                  </button>
                )}
              </div>

              <div className="input-grid">
                <label>
                  {selectedMethod === "telda"
                    ? isAr ? "اسم حسابك في تيلدا" : "Your Telda username"
                    : isAr ? "الرقم أو الحساب المحوّل منه" : "Sender phone or account"}
                  <input
                    type="text"
                    value={senderInfo}
                    onChange={(event) => setSenderInfo(event.target.value)}
                    placeholder={selectedMethod === "telda" ? "@username" : selectedMethod === "vodafone_cash" ? "01xxxxxxxxx" : "name@bank"}
                  />
                </label>

                {selectedMethod !== "telda" && (
                  <label>
                    {isAr ? "رقم عملية التحويل" : "Transaction reference"}
                    <input type="text" value={transactionId} onChange={(event) => setTransactionId(event.target.value)} placeholder="123456789" />
                  </label>
                )}
              </div>

              <label className="notes-field">
                {isAr ? "ملاحظات إضافية" : "Additional notes"}
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(event) => setPaymentNotes(event.target.value)}
                  placeholder={isAr ? "أي تفاصيل تساعدنا في المراجعة..." : "Anything that helps us verify faster..."}
                />
              </label>

              {formError && <p className="form-error">{formError}</p>}

              <button type="button" className="primary-pay" disabled={submitting} onClick={handleConfirmPayment}>
                {submitting ? (isAr ? "جارٍ إرسال البيانات..." : "Submitting details...") : isAr ? "تأكيد وإتمام الدفع" : "Confirm payment details"}
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="success-panel">
              <span className="success-ring">✓</span>
              <p>{successMessage}</p>
              <h2>{isAr ? "تم استلام بيانات التحويل." : "Payment details received."}</h2>
              <span>{isAr ? "سنراجع التحويل ونؤكد الطلب في أقرب وقت." : "We will review the transfer and confirm the order shortly."}</span>
              <div className="order-panel compact">
                <span>{isAr ? "رقم الطلب" : "Order number"}</span>
                <strong>{order.id}</strong>
                <button type="button" onClick={() => handleCopy(order.id)}>
                  {isAr ? "نسخ" : "Copy"}
                </button>
              </div>
              <button type="button" className="primary-pay" onClick={() => router.push("/")}>
                {isAr ? "العودة للرئيسية" : "Go to homepage"}
              </button>
            </div>
          )}
        </section>
      </section>
      <style jsx>{gatewayStyles}</style>
    </main>
  );
}

const gatewayStyles = `
  .gateway-page,
  .gateway-state {
    min-height: 100vh;
    max-width: 100%;
    overflow-x: hidden;
    padding: clamp(24px, 5vw, 64px) 18px;
    background:
      radial-gradient(circle at 15% 10%, rgba(21, 91, 208, 0.12), transparent 30%),
      linear-gradient(180deg, #ffffff 0%, #f5f8ff 100%);
    color: #111827;
  }

  .gateway-shell {
    width: min(1120px, 100%);
    max-width: 100%;
    margin: 0 auto;
    display: grid;
    grid-template-columns: minmax(280px, 0.86fr) minmax(0, 1.14fr);
    gap: 22px;
    align-items: stretch;
  }

  .gateway-overview,
  .gateway-card,
  .state-card {
    min-width: 0;
    max-width: 100%;
    border: 1px solid rgba(17, 24, 39, 0.1);
    border-radius: 21px;
    background: rgba(255, 255, 255, 0.82);
    box-shadow: 0 28px 80px rgba(21, 91, 208, 0.12);
    backdrop-filter: blur(22px);
  }

  .gateway-overview {
    padding: clamp(24px, 4vw, 42px);
    display: flex;
    flex-direction: column;
    gap: 22px;
  }

  .eyebrow,
  .section-head p,
  .selected-method p {
    margin: 0;
    color: #155bd0;
    font-size: 0.78rem;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0;
  }

  .gateway-overview h1 {
    margin: 0;
    font-size: clamp(2rem, 4vw, 4rem);
    line-height: 1.02;
    letter-spacing: 0;
    overflow-wrap: anywhere;
  }

  .gateway-copy {
    margin: 0;
    color: #5b6472;
    font-size: 1rem;
    line-height: 1.8;
  }

  .order-panel,
  .amount-card,
  .transfer-card {
    min-width: 0;
    max-width: 100%;
    display: grid;
    gap: 8px;
    border: 1px solid rgba(17, 24, 39, 0.08);
    border-radius: 18px;
    background: #ffffff;
    padding: 18px;
  }

  .order-panel span,
  .amount-card span,
  .transfer-card span,
  .instruction-list,
  .upload-box small,
  .success-panel span {
    color: #667085;
  }

  .order-panel strong,
  .amount-card strong,
  .transfer-card strong {
    font-size: 1.16rem;
    overflow-wrap: anywhere;
  }

  .order-panel button,
  .transfer-card button,
  .ghost-button,
  .danger-lite {
    max-width: 100%;
    width: fit-content;
    border: 1px solid rgba(21, 91, 208, 0.14);
    border-radius: 999px;
    background: rgba(21, 91, 208, 0.08);
    color: #155bd0;
    padding: 8px 13px;
    font-weight: 900;
    cursor: pointer;
  }

  .transfer-card > div {
    display: flex;
    min-width: 0;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    flex-wrap: wrap;
  }

  .transfer-card > div > span {
    flex: 1 0 100%;
  }

  .transfer-card > div > strong {
    min-width: 0;
    margin-inline-end: 10px;
  }

  .order-panel button {
    margin-top: 4px;
  }

  .amount-card {
    background: #111827;
    color: #ffffff;
  }

  .amount-card span {
    color: rgba(255, 255, 255, 0.7);
  }

  .gateway-rail {
    display: grid;
    min-width: 0;
    max-width: 100%;
    gap: 12px;
    margin-top: auto;
  }

  .rail-item {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 12px;
    color: #98a2b3;
    font-weight: 900;
  }

  .rail-item span {
    width: 32px;
    height: 32px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    border: 1px solid #e5e7eb;
    background: #ffffff;
  }

  .rail-item.is-active {
    color: #155bd0;
  }

  .rail-item.is-active span {
    color: #ffffff;
    background: #155bd0;
    border-color: #155bd0;
  }

  .gateway-card {
    position: relative;
    min-width: 0;
    padding: clamp(22px, 4vw, 42px);
  }

  .copy-toast {
    position: absolute;
    top: 18px;
    inset-inline-end: 18px;
    z-index: 2;
    border-radius: 999px;
    background: #111827;
    color: #ffffff;
    padding: 9px 14px;
    font-size: 0.85rem;
    font-weight: 900;
    box-shadow: 0 16px 40px rgba(17, 24, 39, 0.18);
  }

  .step-panel,
  .success-panel {
    min-width: 0;
    max-width: 100%;
    display: grid;
    gap: 22px;
  }

  .section-head h2,
  .selected-method h2,
  .success-panel h2 {
    margin: 6px 0 0;
    font-size: clamp(1.55rem, 3vw, 2.35rem);
    letter-spacing: 0;
    overflow-wrap: anywhere;
  }

  .method-grid {
    display: grid;
    min-width: 0;
    gap: 14px;
  }

  .method-card {
    width: 100%;
    min-width: 0;
    min-height: 92px;
    display: flex;
    align-items: center;
    gap: 16px;
    border: 1px solid rgba(17, 24, 39, 0.09);
    border-radius: 21px;
    background: #ffffff;
    padding: 18px;
    color: inherit;
    text-align: start;
    cursor: pointer;
    transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  }

  .method-card:hover {
    transform: translateY(-2px);
    border-color: rgba(21, 91, 208, 0.24);
    box-shadow: 0 18px 45px rgba(21, 91, 208, 0.12);
  }

  .method-card strong {
    display: block;
    font-size: 1.02rem;
    overflow-wrap: anywhere;
  }

  .method-card small {
    display: block;
    min-width: 0;
    margin-top: 5px;
    color: #667085;
    overflow-wrap: anywhere;
  }

  .method-logo {
    width: 54px;
    height: 54px;
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    border-radius: 17px;
    background: color-mix(in srgb, var(--method-color) 10%, white);
    border: 1px solid color-mix(in srgb, var(--method-color) 16%, white);
  }

  .method-logo.large {
    width: 68px;
    height: 68px;
  }

  .method-logo img {
    width: 72%;
    height: 72%;
    object-fit: contain;
    border-radius: 12px;
  }

  .selected-method {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 16px;
  }

  .selected-method > div {
    min-width: 0;
  }

  .segmented-pay {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    min-width: 0;
    padding: 5px;
    border-radius: 17px;
    background: #f2f5fb;
  }

  .segmented-pay button {
    min-width: 0;
    border: 0;
    border-radius: 13px;
    background: transparent;
    padding: 12px;
    color: #667085;
    font-weight: 900;
    overflow-wrap: anywhere;
    cursor: pointer;
  }

  .segmented-pay button.active {
    background: #ffffff;
    color: #155bd0;
    box-shadow: 0 10px 26px rgba(17, 24, 39, 0.08);
  }

  .transfer-card {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .instruction-list {
    margin: 0;
    padding-inline-start: 22px;
    line-height: 1.8;
  }

  .proof-section {
    display: grid;
    gap: 10px;
  }

  .upload-box {
    max-width: 100%;
    min-height: 178px;
    display: grid;
    place-items: center;
    border: 1.5px dashed rgba(21, 91, 208, 0.28);
    border-radius: 21px;
    background: linear-gradient(180deg, rgba(21, 91, 208, 0.06), rgba(255, 255, 255, 0.92));
    text-align: center;
    cursor: pointer;
    overflow: hidden;
  }

  .upload-box input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
    pointer-events: none;
  }

  .upload-box strong,
  .upload-box small {
    display: block;
  }

  .preview-wrap {
    width: 100%;
    padding: 14px;
  }

  .preview-wrap img {
    max-width: 100%;
    max-height: 220px;
    object-fit: contain;
    border-radius: 17px;
    box-shadow: 0 18px 40px rgba(17, 24, 39, 0.12);
  }

  .danger-lite {
    color: #b42318;
    border-color: rgba(180, 35, 24, 0.16);
    background: rgba(180, 35, 24, 0.07);
  }

  .input-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }

  label {
    display: grid;
    min-width: 0;
    gap: 8px;
    color: #344054;
    font-size: 0.92rem;
    font-weight: 900;
  }

  input {
    width: 100%;
    min-width: 0;
    min-height: 50px;
    border: 1px solid rgba(17, 24, 39, 0.12);
    border-radius: 15px;
    background: #ffffff;
    padding: 0 15px;
    color: #111827;
    font: inherit;
    outline: none;
  }

  input:focus {
    border-color: #155bd0;
    box-shadow: 0 0 0 4px rgba(21, 91, 208, 0.12);
  }

  :global([data-theme="dark"]) .gateway-page,
  :global([data-theme="dark"]) .gateway-state {
    background:
      radial-gradient(circle at 15% 10%, rgba(21, 91, 208, 0.18), transparent 30%),
      linear-gradient(180deg, #000000 0%, #080b12 100%);
    color: #ffffff;
  }

  :global([data-theme="dark"]) .gateway-overview,
  :global([data-theme="dark"]) .gateway-card,
  :global([data-theme="dark"]) .state-card,
  :global([data-theme="dark"]) .order-panel,
  :global([data-theme="dark"]) .transfer-card,
  :global([data-theme="dark"]) .method-card,
  :global([data-theme="dark"]) .upload-box,
  :global([data-theme="dark"]) .segmented-pay,
  :global([data-theme="dark"]) .success-ring,
  :global([data-theme="dark"]) .rail-item span {
    border-color: rgba(255, 255, 255, 0.14);
    background: #111111;
    color: #ffffff;
  }

  :global([data-theme="dark"]) .gateway-copy,
  :global([data-theme="dark"]) .order-panel span,
  :global([data-theme="dark"]) .transfer-card span,
  :global([data-theme="dark"]) .instruction-list,
  :global([data-theme="dark"]) .upload-box small,
  :global([data-theme="dark"]) .success-panel span,
  :global([data-theme="dark"]) .method-card small,
  :global([data-theme="dark"]) label {
    color: #a1a1aa;
  }

  :global([data-theme="dark"]) .amount-card {
    background: #155bd0;
    color: #ffffff;
  }

  :global([data-theme="dark"]) .segmented-pay {
    background: #181818;
  }

  :global([data-theme="dark"]) .segmented-pay button.active,
  :global([data-theme="dark"]) input {
    border-color: rgba(255, 255, 255, 0.14);
    background: #181818;
    color: #ffffff;
  }

  :global([data-theme="dark"]) .upload-box {
    background: linear-gradient(180deg, rgba(21, 91, 208, 0.16), #111111);
  }

  :global([data-theme="dark"]) .form-error {
    border-color: rgba(248, 113, 113, 0.28);
    background: rgba(127, 29, 29, 0.28);
    color: #fca5a5;
  }

  :global([data-theme="dark"]) .copy-toast {
    background: #ffffff;
    color: #111827;
  }

  .form-error {
    margin: 0;
    border: 1px solid rgba(180, 35, 24, 0.16);
    border-radius: 16px;
    background: #fff4f3;
    color: #b42318;
    padding: 13px 15px;
    font-weight: 800;
  }

  .primary-pay,
  .state-card button {
    max-width: 100%;
    min-height: 54px;
    border: 0;
    border-radius: 17px;
    background: #155bd0;
    color: #ffffff;
    padding: 0 22px;
    font-weight: 950;
    cursor: pointer;
    box-shadow: 0 18px 36px rgba(21, 91, 208, 0.22);
  }

  .primary-pay:disabled {
    cursor: wait;
    opacity: 0.68;
  }

  .success-panel {
    min-height: 520px;
    place-items: center;
    text-align: center;
  }

  .success-ring,
  .state-mark {
    width: 76px;
    height: 76px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: #ecfdf3;
    color: #039855;
    font-size: 2rem;
    font-weight: 950;
  }

  .success-panel p {
    margin: 0;
    color: #039855;
    font-weight: 950;
  }

  .order-panel.compact {
    width: min(360px, 100%);
  }

  .state-card {
    width: min(520px, 100%);
    margin: 8vh auto 0;
    padding: 34px;
    display: grid;
    place-items: center;
    gap: 14px;
    text-align: center;
  }

  .state-mark {
    background: #fff4f3;
    color: #b42318;
  }

  .state-card h1,
  .state-card p {
    margin: 0;
  }

  @media (max-width: 860px) {
    .gateway-shell {
      grid-template-columns: 1fr;
    }

    .gateway-overview {
      gap: 16px;
    }

    .gateway-rail {
      grid-template-columns: repeat(3, 1fr);
    }

    .rail-item {
      display: grid;
      place-items: center;
      text-align: center;
      gap: 7px;
    }
  }

  @media (max-width: 620px) {
    .gateway-page,
    .gateway-state {
      padding: 16px 12px 28px;
    }

    .gateway-shell {
      width: 100%;
    }

    .transfer-card,
    .input-grid {
      grid-template-columns: 1fr;
    }

    .gateway-card,
    .gateway-overview {
      padding: 20px;
    }

    .gateway-rail {
      grid-template-columns: 1fr;
    }

    .rail-item {
      display: grid;
      grid-template-columns: 32px minmax(0, 1fr);
      place-items: initial;
      text-align: start;
    }

    .method-card,
    .selected-method {
      align-items: flex-start;
    }

    .selected-method {
      flex-wrap: wrap;
    }

    .transfer-card > div {
      align-items: flex-start;
    }

    .order-panel button,
    .transfer-card button,
    .primary-pay {
      width: 100%;
    }
  }
`;

export default function PaymentPage() {
  return (
    <Suspense
      fallback={
        <main className="gateway-loading">
          <p>Loading...</p>
        </main>
      }
    >
      <PaymentContent />
    </Suspense>
  );
}
