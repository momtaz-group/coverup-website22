"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { useCart } from "@/context/CartContext";

function PaymentContent() {
  const { locale, t } = useLanguage();
  const { clearCart } = useCart();
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get("orderId");

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Steps: 1 = Select Method, 2 = Instructions & Proof, 3 = Confirmation
  const [step, setStep] = useState(1);
  const [selectedMethod, setSelectedMethod] = useState(""); // vodafone_cash, instapay, telda
  const [instapaySubOption, setInstapaySubOption] = useState("ipa"); // ipa (address), phone
  
  // Payment Details Form
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [senderInfo, setSenderInfo] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!orderId) {
      setError(locale === "ar" ? "رقم الطلب غير صحيح." : "Invalid Order ID.");
      setLoading(false);
      return;
    }

    fetch(`/api/orders/payment-details?orderId=${encodeURIComponent(orderId)}`)
      .then((res) => {
        if (!res.ok) throw new Error(locale === "ar" ? "فشل تحميل تفاصيل الطلب." : "Failed to load order details.");
        return res.json();
      })
      .then((data) => {
        if (data.order) {
          setOrder(data.order);
        } else {
          setError(locale === "ar" ? "الطلب غير موجود." : "Order not found.");
        }
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [orderId, locale]);

  // Convert file to Data URL
  const fileToDataUrl = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
  };

  // Copy helper
  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    alert(locale === "ar" ? "تم النسخ بنجاح!" : "Copied successfully!");
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProofFile(file);
      setProofPreview(URL.createObjectURL(file));
    }
  };

  const handleConfirmPayment = async () => {
    if (!proofFile) {
      alert(locale === "ar" ? "الرجاء رفع صورة إثبات التحويل." : "Please upload a transfer proof image.");
      return;
    }

    if (selectedMethod === "vodafone_cash" || selectedMethod === "instapay") {
      if (!senderInfo.trim()) {
        alert(locale === "ar" ? "الرجاء إدخال رقم الهاتف أو الحساب الذي قمت بالتحويل منه." : "Please enter the sender phone number or account address.");
        return;
      }
      if (!transactionId.trim()) {
        alert(locale === "ar" ? "الرجاء إدخال رقم عملية التحويل." : "Please enter the transaction reference ID.");
        return;
      }
    }

    if (selectedMethod === "telda") {
      if (!senderInfo.trim()) {
        alert(locale === "ar" ? "الرجاء إدخال اسم حسابك في تيلدا." : "Please enter your Telda username.");
        return;
      }
    }

    setSubmitting(true);
    try {
      // 1. Upload screenshot
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
      if (!uploadRes.ok) throw new Error(uploadData.message || "Failed to upload payment proof.");

      const screenshotUrl = uploadData.url;

      // 2. Submit payment details
      const paymentRes = await fetch("/api/orders/payment-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          paymentMethod: selectedMethod,
          paymentTransactionId: transactionId || `@${senderInfo.replace(/^@/, "")}`,
          paymentReference: screenshotUrl,
          senderInfo: senderInfo,
          notes: paymentNotes,
        }),
      });

      const paymentData = await paymentRes.json().catch(() => ({}));
      if (!paymentRes.ok) throw new Error(paymentData.message || "Failed to submit transaction details.");

      setSuccessMessage(locale === "ar" ? "تم إرسال بيانات الدفع بنجاح!" : "Payment details submitted successfully!");
      clearCart(); // Now it's safe to clear the cart — payment is confirmed
      setStep(3);
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="payment-loading-screen">
        <div className="payment-loader"></div>
        <p style={{ fontWeight: "bold" }}>{locale === "ar" ? "جارٍ تحميل بوابة الدفع..." : "Loading Payment Gateway..."}</p>
        <style jsx>{`
          .payment-loading-screen {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 70vh;
            background: #fff;
            color: #000;
          }
          .payment-loader {
            width: 40px;
            height: 40px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid #0052ff;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin-bottom: 16px;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px" }}>
        <div style={{ color: "#ff4d4d", fontSize: "40px", marginBottom: "16px" }}>⚠️</div>
        <p style={{ fontSize: "18px", color: "var(--muted)", fontWeight: "bold", textAlign: "center" }}>{error || "Order not found."}</p>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: "600px" }}>
      {/* Steps Indicator Bar */}
      <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginBottom: "40px" }}>
        {[1, 2, 3].map((s) => {
          const isActive = step === s;
          const isCompleted = step > s;
          return (
            <div 
              key={s} 
              style={{ 
                flex: 1, 
                height: "8px", 
                borderRadius: "4px", 
                background: isActive || isCompleted ? "#0052ff" : "#e0e0e0",
                transition: "all 0.3s ease"
              }} 
            />
          );
        })}
      </div>

      <div className="payment-card" style={{ background: "#f8f9fc", border: "1px solid #e2e8f0", borderRadius: "24px", padding: "32px", boxShadow: "0 10px 30px rgba(0,0,0,0.02)" }}>
        {/* STEP 1: Select Payment Method */}
        {step === 1 && (
          <div>
            <h2 style={{ textAlign: "center", fontSize: "20px", fontWeight: "bold", marginBottom: "12px" }}>
              {locale === "ar" ? "اختر طريقة الدفع" : "Choose Payment Method"}
            </h2>
            <p style={{ textAlign: "center", fontSize: "14px", color: "#64748b", marginBottom: "32px" }}>
              {locale === "ar" ? "حدد البوابة التي ترغب بالدفع من خلالها لإتمام الطلب" : "Choose a payment method to complete your purchase"}
            </p>

            <div style={{ display: "grid", gap: "16px" }}>
              {/* Vodafone Cash */}
              <button 
                type="button"
                onClick={() => { setSelectedMethod("vodafone_cash"); setStep(2); }}
                style={{ display: "flex", alignItems: "center", gap: "16px", padding: "20px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "16px", cursor: "pointer", width: "100%", textAlign: "left", transition: "all 0.2s" }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = "#0052ff"}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = "#e2e8f0"}
              >
                <img src="/assets/payment_methods/Vodafone Cash.png" alt="Vodafone Cash" style={{ width: "45px", height: "45px", objectFit: "contain" }} />
                <div style={{ flex: 1 }}>
                  <strong style={{ display: "block", fontSize: "16px" }}>{locale === "ar" ? "فودافون كاش" : "Vodafone Cash"}</strong>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>{locale === "ar" ? "تحويل فوري عبر المحفظة" : "Instant Wallet Transfer"}</span>
                </div>
              </button>

              {/* Instapay */}
              <button 
                type="button"
                onClick={() => { setSelectedMethod("instapay"); setStep(2); }}
                style={{ display: "flex", alignItems: "center", gap: "16px", padding: "20px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "16px", cursor: "pointer", width: "100%", textAlign: "left", transition: "all 0.2s" }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = "#0052ff"}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = "#e2e8f0"}
              >
                <img src="/assets/payment_methods/InstaPay_Logo.png" alt="InstaPay" style={{ width: "45px", height: "45px", objectFit: "contain" }} />
                <div style={{ flex: 1 }}>
                  <strong style={{ display: "block", fontSize: "16px" }}>{locale === "ar" ? "إنستا باي" : "InstaPay"}</strong>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>{locale === "ar" ? "تحويل مباشر من حسابك البنكي" : "Direct Bank Transfer"}</span>
                </div>
              </button>

              {/* Telda */}
              <button 
                type="button"
                onClick={() => { setSelectedMethod("telda"); setStep(2); }}
                style={{ display: "flex", alignItems: "center", gap: "16px", padding: "20px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "16px", cursor: "pointer", width: "100%", textAlign: "left", transition: "all 0.2s" }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = "#0052ff"}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = "#e2e8f0"}
              >
                <img src="/assets/payment_methods/telda.jpg" alt="Telda" style={{ width: "45px", height: "45px", objectFit: "cover", borderRadius: "8px" }} />
                <div style={{ flex: 1 }}>
                  <strong style={{ display: "block", fontSize: "16px" }}>{locale === "ar" ? "تيلدا" : "Telda"}</strong>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>{locale === "ar" ? "تحويل سهل عبر تطبيق تيلدا" : "Easy transfer via Telda app"}</span>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Instructions and Details Upload */}
        {step === 2 && (
          <div>
            {/* Back button */}
            <button 
              type="button" 
              onClick={() => setStep(1)} 
              style={{ background: "none", border: "none", color: "#0052ff", fontWeight: "bold", fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", marginBottom: "20px" }}
            >
              {locale === "ar" ? "← العودة للاختيار" : "← Back"}
            </button>

            {/* Vodafone Cash Flow */}
            {selectedMethod === "vodafone_cash" && (
              <div>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
                  <img src="/assets/payment_methods/Vodafone Cash.png" alt="Vodafone Cash" style={{ height: "60px" }} />
                </div>
                
                <h3 style={{ fontSize: "18px", fontWeight: "bold", textAlign: "center", marginBottom: "16px" }}>
                  {locale === "ar" ? "تحويل عبر فودافون كاش" : "Vodafone Cash Transfer"}
                </h3>

                <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "20px", display: "grid", gap: "14px", marginBottom: "24px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "10px" }}>
                    <span style={{ color: "#64748b" }}>{locale === "ar" ? "المبلغ المطلوب:" : "Amount Required:"}</span>
                    <strong style={{ fontSize: "16px", color: "#0052ff" }}>{order.grand_total} EGP</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "#64748b" }}>{locale === "ar" ? "رقم التحويل:" : "Transfer to number:"}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <strong style={{ fontSize: "16px" }}>01050310516</strong>
                      <button type="button" onClick={() => handleCopy("01050310516")} style={{ border: "none", background: "#f1f5f9", padding: "4px 8px", borderRadius: "6px", fontSize: "11px", cursor: "pointer" }}>
                        {locale === "ar" ? "نسخ" : "Copy"}
                      </button>
                    </div>
                  </div>
                </div>

                <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "12px", padding: "16px", color: "#1e3a8a", fontSize: "13px", marginBottom: "32px", lineHeight: "1.5" }}>
                  <p style={{ margin: "0 0 6px 0", fontWeight: "bold" }}>{locale === "ar" ? "خطوات الدفع:" : "Steps to pay:"}</p>
                  <ol style={{ margin: 0, paddingLeft: "16px" }}>
                    <li>{locale === "ar" ? "قم بتحويل المبلغ المذكور أعلاه إلى رقم الهاتف المحدد." : `Transfer exactly ${order.grand_total} EGP to 01050310516.`}</li>
                    <li>{locale === "ar" ? "التقط لقطة شاشة (Screenshot) لرسالة تأكيد التحويل." : "Take a screenshot of the transfer confirmation message."}</li>
                    <li>{locale === "ar" ? "ارفع لقطة الشاشة واملأ البيانات أدناه لتأكيد طلبك." : "Upload the screenshot and enter details below to confirm payment."}</li>
                  </ol>
                </div>
              </div>
            )}

            {/* Instapay Flow */}
            {selectedMethod === "instapay" && (
              <div>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
                  <img src="/assets/payment_methods/InstaPay_Logo.png" alt="InstaPay" style={{ height: "60px" }} />
                </div>
                
                <h3 style={{ fontSize: "18px", fontWeight: "bold", textAlign: "center", marginBottom: "16px" }}>
                  {locale === "ar" ? "تحويل عبر إنستا باي" : "InstaPay Transfer"}
                </h3>

                <div style={{ display: "flex", background: "#f1f5f9", borderRadius: "10px", padding: "4px", marginBottom: "20px" }}>
                  <button 
                    type="button" 
                    onClick={() => setInstapaySubOption("ipa")}
                    style={{ flex: 1, padding: "8px", border: "none", borderRadius: "8px", cursor: "pointer", background: instapaySubOption === "ipa" ? "#fff" : "transparent", fontWeight: "bold", fontSize: "13px" }}
                  >
                    {locale === "ar" ? "عنوان الدفع IPA" : "Instapay Address"}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setInstapaySubOption("phone")}
                    style={{ flex: 1, padding: "8px", border: "none", borderRadius: "8px", cursor: "pointer", background: instapaySubOption === "phone" ? "#fff" : "transparent", fontWeight: "bold", fontSize: "13px" }}
                  >
                    {locale === "ar" ? "رقم الهاتف" : "Phone Number"}
                  </button>
                </div>

                <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "20px", display: "grid", gap: "14px", marginBottom: "24px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "10px" }}>
                    <span style={{ color: "#64748b" }}>{locale === "ar" ? "المبلغ المطلوب:" : "Amount Required:"}</span>
                    <strong style={{ fontSize: "16px", color: "#0052ff" }}>{order.grand_total} EGP</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "#64748b" }}>{locale === "ar" ? "عنوان التحويل:" : "Transfer to:"}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {instapaySubOption === "ipa" ? (
                        <>
                          <strong style={{ fontSize: "15px" }}>coverup@instapay</strong>
                          <button type="button" onClick={() => handleCopy("coverup@instapay")} style={{ border: "none", background: "#f1f5f9", padding: "4px 8px", borderRadius: "6px", fontSize: "11px", cursor: "pointer" }}>
                            {locale === "ar" ? "نسخ" : "Copy"}
                          </button>
                        </>
                      ) : (
                        <>
                          <strong style={{ fontSize: "16px" }}>01050310516</strong>
                          <button type="button" onClick={() => handleCopy("01050310516")} style={{ border: "none", background: "#f1f5f9", padding: "4px 8px", borderRadius: "6px", fontSize: "11px", cursor: "pointer" }}>
                            {locale === "ar" ? "نسخ" : "Copy"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "12px", padding: "16px", color: "#1e3a8a", fontSize: "13px", marginBottom: "32px", lineHeight: "1.5" }}>
                  <p style={{ margin: "0 0 6px 0", fontWeight: "bold" }}>{locale === "ar" ? "خطوات الدفع:" : "Steps to pay:"}</p>
                  <ol style={{ margin: 0, paddingLeft: "16px" }}>
                    <li>{locale === "ar" ? "افتح تطبيق InstaPay وقم بالتحويل للعنوان أو رقم الهاتف الموضح أعلاه." : `Open InstaPay and transfer exactly ${order.grand_total} EGP to the payment address/phone above.`}</li>
                    <li>{locale === "ar" ? "قم بأخذ لقطة شاشة لعملية التحويل الناجحة." : "Take a screenshot of the successful transfer screen."}</li>
                    <li>{locale === "ar" ? "ارفع لقطة الشاشة واملأ البيانات للتأكيد." : "Upload the screenshot and enter your transfer info below."}</li>
                  </ol>
                </div>
              </div>
            )}

            {/* Telda Flow */}
            {selectedMethod === "telda" && (
              <div>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
                  <img src="/assets/payment_methods/telda.jpg" alt="Telda" style={{ height: "60px", borderRadius: "12px" }} />
                </div>
                
                <h3 style={{ fontSize: "18px", fontWeight: "bold", textAlign: "center", marginBottom: "16px" }}>
                  {locale === "ar" ? "تحويل عبر تطبيق تيلدا" : "Telda Transfer"}
                </h3>

                <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "20px", display: "grid", gap: "14px", marginBottom: "24px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "10px" }}>
                    <span style={{ color: "#64748b" }}>{locale === "ar" ? "المبلغ المطلوب:" : "Amount Required:"}</span>
                    <strong style={{ fontSize: "16px", color: "#0052ff" }}>{order.grand_total} EGP</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "#64748b" }}>{locale === "ar" ? "اسم الحساب (Username):" : "Transfer to username:"}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <strong style={{ fontSize: "16px" }}>@coverup</strong>
                      <button type="button" onClick={() => handleCopy("@coverup")} style={{ border: "none", background: "#f1f5f9", padding: "4px 8px", borderRadius: "6px", fontSize: "11px", cursor: "pointer" }}>
                        {locale === "ar" ? "نسخ" : "Copy"}
                      </button>
                    </div>
                  </div>
                </div>

                <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "12px", padding: "16px", color: "#1e3a8a", fontSize: "13px", marginBottom: "32px", lineHeight: "1.5" }}>
                  <p style={{ margin: "0 0 6px 0", fontWeight: "bold" }}>{locale === "ar" ? "خطوات الدفع:" : "Steps to pay:"}</p>
                  <ol style={{ margin: 0, paddingLeft: "16px" }}>
                    <li>{locale === "ar" ? "افتح تطبيق تيلدا (Telda) وأرسل المبلغ للمستخدم المحدد." : `Open Telda app and transfer exactly ${order.grand_total} EGP to the username @coverup.`}</li>
                    <li>{locale === "ar" ? "التقط لقطة شاشة لتفاصيل المعاملة." : "Take a screenshot of the transaction details."}</li>
                    <li>{locale === "ar" ? "ارفع الصورة واكتب اسم حسابك للتأكيد." : "Upload the screenshot and enter your Telda username to confirm."}</li>
                  </ol>
                </div>
              </div>
            )}

            {/* Proof Details Form */}
            <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "32px", display: "grid", gap: "20px" }}>
              <h4 style={{ margin: 0, fontSize: "15px", fontWeight: "bold" }}>
                {locale === "ar" ? "إدخال بيانات التحويل والإثبات" : "Enter Transfer Details & Proof"}
              </h4>

              {/* Upload screenshot */}
              <div>
                <span style={{ display: "block", fontSize: "13px", fontWeight: "bold", color: "#475569", marginBottom: "8px" }}>
                  {locale === "ar" ? "لقطة الشاشة للتحويل (مطلوب)" : "Screenshot of transfer (Required)"}
                </span>
                
                <div style={{ position: "relative", border: "2px dashed #cbd5e1", borderRadius: "16px", padding: "24px", textAlign: "center", cursor: "pointer", background: "#fff", transition: "all 0.2s" }}>
                  {proofPreview ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                      <img src={proofPreview} alt="Proof" style={{ maxWidth: "100%", maxHeight: "150px", objectFit: "contain", borderRadius: "8px" }} />
                      <span style={{ fontSize: "12px", color: "#64748b" }}>{proofFile?.name}</span>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setProofFile(null); setProofPreview(""); }} style={{ border: "none", background: "#ef4444", color: "#fff", padding: "4px 10px", borderRadius: "6px", fontSize: "11px", cursor: "pointer" }}>
                        {locale === "ar" ? "حذف" : "Remove"}
                      </button>
                    </div>
                  ) : (
                    <div>
                      <span style={{ fontSize: "32px", display: "block", marginBottom: "8px" }}>📷</span>
                      <span style={{ display: "block", fontSize: "13px", color: "#64748b" }}>
                        {locale === "ar" ? "اسحب وأسقط الصورة هنا أو اضغط للاختيار" : "Drag & drop image here or click to browse"}
                      </span>
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={handleFileChange} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }} />
                </div>
              </div>

              {/* Custom input fields */}
              {selectedMethod === "telda" ? (
                // Telda: Username only
                <label style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px", fontWeight: "bold" }}>
                  {locale === "ar" ? "اسم حسابك في تيلدا للتأكيد" : "Your Telda Username for confirmation"}
                  <input 
                    type="text" 
                    value={senderInfo} 
                    onChange={(e) => setSenderInfo(e.target.value)} 
                    placeholder="@username"
                    style={{ width: "100%", boxSizing: "border-box", padding: "12px", borderRadius: "10px", border: "1px solid #cbd5e1", background: "#fff", color: "#000", outline: "none" }}
                  />
                </label>
              ) : (
                // Vodafone cash or Instapay: Phone/Account and Transaction ID
                <>
                  <div className="payment-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <label style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px", fontWeight: "bold" }}>
                      {locale === "ar" ? "الرقم/الحساب المحوَّل منه" : "Sender Phone/Account"}
                      <input 
                        type="text" 
                        value={senderInfo} 
                        onChange={(e) => setSenderInfo(e.target.value)} 
                        placeholder={selectedMethod === "vodafone_cash" ? "01xxxxxxxxx" : "name@bank"}
                        style={{ width: "100%", boxSizing: "border-box", padding: "12px", borderRadius: "10px", border: "1px solid #cbd5e1", background: "#fff", color: "#000", outline: "none" }}
                      />
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px", fontWeight: "bold" }}>
                      {locale === "ar" ? "رقم عملية التحويل (ID)" : "Transaction Reference (ID)"}
                      <input 
                        type="text" 
                        value={transactionId} 
                        onChange={(e) => setTransactionId(e.target.value)} 
                        placeholder="123456789"
                        style={{ width: "100%", boxSizing: "border-box", padding: "12px", borderRadius: "10px", border: "1px solid #cbd5e1", background: "#fff", color: "#000", outline: "none" }}
                      />
                    </label>
                  </div>
                </>
              )}

              {/* Extra Notes */}
              <label style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px", fontWeight: "bold" }}>
                {locale === "ar" ? "ملاحظات إضافية (اختياري)" : "Additional Notes (Optional)"}
                <input 
                  type="text" 
                  value={paymentNotes} 
                  onChange={(e) => setPaymentNotes(e.target.value)} 
                  placeholder={locale === "ar" ? "اكتب أي تفاصيل أخرى ترغب بإبلاغنا بها..." : "Any other remarks..."}
                  style={{ width: "100%", boxSizing: "border-box", padding: "12px", borderRadius: "10px", border: "1px solid #cbd5e1", background: "#fff", color: "#000", outline: "none" }}
                />
              </label>

              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmPayment}
                style={{ width: "100%", padding: "16px", borderRadius: "12px", border: "none", background: "#0052ff", color: "#fff", fontWeight: "bold", fontSize: "16px", cursor: "pointer", transition: "all 0.3s ease", marginTop: "12px", opacity: submitting ? 0.7 : 1 }}
              >
                {submitting ? (locale === "ar" ? "جارٍ إرسال البيانات..." : "Submitting Details...") : (locale === "ar" ? "تأكيد وإتمام الدفع" : "Confirm & Complete Payment")}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Confirmation page */}
        {step === 3 && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "64px", marginBottom: "16px" }}>✅</div>
            
            <h2 style={{ fontSize: "22px", fontWeight: "bold", color: "#10b981", marginBottom: "12px" }}>
              {locale === "ar" ? "تم استلام بيانات التحويل!" : "Payment Details Submitted!"}
            </h2>
            <p style={{ fontSize: "14px", color: "#64748b", marginBottom: "32px", lineHeight: "1.5" }}>
              {locale === "ar" ? "سنقوم بمراجعة التحويل وتأكيد طلبك وشحنه في أقرب وقت." : "We will review your transfer proof, confirm the order, and dispatch it as soon as possible."}
            </p>

            <div style={{ background: "#fff", border: "1px solid #cbd5e1", borderRadius: "16px", padding: "24px", display: "grid", gap: "12px", marginBottom: "32px" }}>
              <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "bold", textTransform: "uppercase" }}>
                {locale === "ar" ? "رقم الطلب الخاص بك" : "Your Order Number"}
              </span>
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "10px" }}>
                <strong style={{ fontSize: "20px", color: "#0f172a" }}>{order.id}</strong>
                <button type="button" onClick={() => handleCopy(order.id)} style={{ border: "none", background: "#f1f5f9", padding: "6px 12px", borderRadius: "8px", fontSize: "12px", cursor: "pointer" }}>
                  {locale === "ar" ? "نسخ" : "Copy"}
                </button>
              </div>
            </div>

            <div style={{ background: "#fef08a", border: "1px solid #fef08a", borderRadius: "12px", padding: "16px", color: "#713f12", fontSize: "13px", marginBottom: "32px", textAlign: "left", lineHeight: "1.5" }}>
              ⚠️ {locale === "ar" ? "تنبيه هام: احتفظ برقم الطلب هذا لمتابعة الشحنة. كما تم إرسال تفاصيل الطلب كاملة إلى بريدك الإلكتروني." : "Important: Keep this order number to track your shipment. Full order summary has also been sent to your contact email."}
            </div>

            <button
              type="button"
              onClick={() => router.push("/")}
              style={{ padding: "14px 28px", borderRadius: "10px", border: "none", background: "#0f172a", color: "#fff", fontWeight: "bold", fontSize: "14px", cursor: "pointer" }}
            >
              {locale === "ar" ? "العودة للرئيسية" : "Go to Homepage"}
            </button>
          </div>
        )}
      </div>
      </div>
      <style jsx global>{`
        @media (max-width: 600px) {
          .payment-card {
            padding: 20px 16px !important;
            border-radius: 16px !important;
          }
          .payment-grid {
            grid-template-columns: 1fr !important;
          }
          img {
            max-width: 100% !important;
            height: auto !important;
          }
        }
      `}</style>
    </main>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={
      <main style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontSize: "18px", color: "var(--muted)", fontWeight: "bold" }}>Loading...</p>
      </main>
    }>
      <PaymentContent />
    </Suspense>
  );
}
