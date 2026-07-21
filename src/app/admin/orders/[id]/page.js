"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

const locale = "ar";

// Payment rejection reasons
const REJECT_REASONS = [
  "المبلغ ناقص / غير مطابق لقيمة الطلب",
  "المبلغ المستلم لا يتوافق مع ثمن المنتجات المختارة",
  "لم يتم استلام المبلغ على الحساب أو المحفظة",
  "بيانات التحويل غير صحيحة",
  "أخرى..."
];

const ORDER_STATUSES = [
  "new",
  "pending_payment",
  "paid",
  "confirmed",
  "preparing",
  "fetching_required_items",
  "representative_on_way",
  "with_courier",
  "delivered",
  "suspended",
  "cancelled",
  "refunded",
  "payment_failed",
];

export default function OrderDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id;

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const [modalTab, setModalTab] = useState("payment"); // payment, details, status, emails
  const [rejectReason, setRejectReason] = useState(REJECT_REASONS[0]);
  const [customRejectReason, setCustomRejectReason] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const [emailLogs, setEmailLogs] = useState([]);
  const [loadingEmails, setLoadingEmails] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchOrder();
    fetchEmailLogs();
  }, [id]);

  const fetchEmailLogs = async () => {
    setLoadingEmails(true);
    try {
      const res = await fetch(`/api/admin/emails?orderId=${encodeURIComponent(id)}`);
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setEmailLogs(data.logs || []);
      }
    } catch (err) {
      console.error("Error loading email logs:", err);
    } finally {
      setLoadingEmails(false);
    }
  };

  const fetchOrder = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin-orders?orderId=${encodeURIComponent(id)}`);
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        router.push("/account?showAdminLogin=true");
        return;
      }
      if (!res.ok) throw new Error(data.message || "Failed to load order details");
      setOrder(data.order);
      setNewStatus(data.order.status || "");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId, status, note = "") => {
    try {
      const res = await fetch("/api/admin-orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status, note }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to update order status");
      
      setOrder(data.order);
      setNewStatus(data.order.status || "");
      if (data.email?.success) {
        setStatusMessage("تم تحديث حالة الطلب وإرسال الإيميل للعميل بنجاح.");
      } else if (data.email && !data.email.success) {
        setStatusMessage(`تم تحديث حالة الطلب لكن فشل إرسال الإيميل: ${data.email.error || "خطأ غير معروف"}`);
      } else {
        setStatusMessage("تم تحديث حالة الطلب بنجاح.");
      }
      setTimeout(() => setStatusMessage(""), 4000);
      fetchEmailLogs();
    } catch (err) {
      setStatusMessage(err.message);
    }
  };

  const handleRetryEmail = async (logId) => {
    try {
      const res = await fetch("/api/admin/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to retry email");
      setStatusMessage("تمت إعادة محاولة إرسال البريد بنجاح.");
      setTimeout(() => setStatusMessage(""), 4000);
      fetchEmailLogs();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleApprovePayment = async () => {
    setIsUpdating(true);
    await handleUpdateOrderStatus(order.id, "paid", "تم تأكيد الدفع الإلكتروني بنجاح.");
    setIsUpdating(false);
  };

  const handleRejectPayment = async () => {
    const reason = rejectReason === "أخرى..." ? customRejectReason : rejectReason;
    if (!reason.trim()) {
      alert("الرجاء تحديد سبب الرفض.");
      return;
    }
    setIsUpdating(true);
    await handleUpdateOrderStatus(order.id, "payment_failed", `تم رفض الدفع: ${reason}`);
    setIsUpdating(false);
  };

  const handleStatusUpdate = async () => {
    if (!newStatus) return;
    setIsUpdating(true);
    await handleUpdateOrderStatus(order.id, newStatus, "تم تحديث الحالة يدوياً من لوحة التحكم.");
    setIsUpdating(false);
  };

  if (loading) {
    return (
      <main className="loading-screen">
        <div className="loader"></div>
        <p>جاري تحميل تفاصيل الطلب...</p>
        <style jsx>{`
          .loading-screen { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 80vh; font-family: system-ui, sans-serif; }
          .loader { width: 40px; height: 40px; border: 3px solid #f3f3f3; border-top: 3px solid #0052ff; border-radius: 50%; animation: spin 0.8s linear infinite; margin-bottom: 16px; }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}</style>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="error-screen">
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
        <h2>حدث خطأ أثناء تحميل الطلب</h2>
        <p>{error || "الطلب غير موجود."}</p>
        <Link href="/admin" className="back-link">العودة للوحة التحكم</Link>
        <style jsx>{`
          .error-screen { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 80vh; font-family: system-ui, sans-serif; padding: 20px; text-align: center; }
          .back-link { margin-top: 24px; padding: 12px 24px; background: #0052ff; color: #fff; text-decoration: none; border-radius: 8px; font-weight: bold; }
        `}</style>
      </main>
    );
  }

  const shortId = order.id.startsWith("CU") ? order.id : order.id.slice(0, 8);

  return (
    <main className="order-page-container">
      <header className="page-header">
        <Link href="/admin" className="btn-back">
          {locale === "ar" ? "← العودة للوحة التحكم" : "← Back to Dashboard"}
        </Link>
        <div className="title-area">
          <h1>طلب #{shortId}</h1>
          <span className={`status-badge status-${order.status}`}>{order.status}</span>
        </div>
      </header>

      {statusMessage && (
        <div className="status-alert">
          {statusMessage}
        </div>
      )}

      <div className="page-layout">
        {/* Navigation Tabs */}
        <div className="page-tabs">
          <button className={modalTab === "payment" ? "active" : ""} onClick={() => setModalTab("payment")}>تفاصيل الدفع</button>
          <button className={modalTab === "details" ? "active" : ""} onClick={() => setModalTab("details")}>تفاصيل الطلب والعميل</button>
          <button className={modalTab === "status" ? "active" : ""} onClick={() => setModalTab("status")}>تحديث الحالة والسجل</button>
          <button className={modalTab === "emails" ? "active" : ""} onClick={() => setModalTab("emails")}>سجل الإيميلات</button>
        </div>

        <div className="tab-content-card">
          {/* TAB 1: PAYMENT */}
          {modalTab === "payment" && (
            <div className="payment-tab">
              {["payment_failed", "cancelled", "refunded"].includes(order.status) ? (
                <div className="alert-box error">
                  هذا الطلب تم رفضه أو إلغاؤه (الحالة: {order.status}). لا يمكن معالجة الدفع له بعد الآن.
                </div>
              ) : (
                <>
                  {order.payment_status === "paid" ? (
                    <div className="alert-box success">تم تأكيد الدفع لهذا الطلب بنجاح.</div>
                  ) : null}

                  <div className="payment-info-grid">
                    <div className="info-card">
                      <label>طريقة الدفع</label>
                      <strong>{order.payment_method}</strong>
                    </div>
                    <div className="info-card">
                      <label>المبلغ المطلوب</label>
                      <strong style={{ color: "#0052ff" }}>{order.grand_total} EGP</strong>
                    </div>
                    <div className="info-card">
                      <label>حالة الدفع الحالية</label>
                      <strong>{order.payment_status}</strong>
                    </div>
                  </div>

                  {order.payment_payload && order.payment_payload.paymentTransactionId && (
                    <div className="transfer-details">
                      <h3>بيانات التحويل المدخلة من العميل:</h3>
                      <div className="transfer-grid">
                        <div>
                          <span>رقم العملية / المعرف:</span>
                          <strong>{order.payment_payload.paymentTransactionId}</strong>
                        </div>
                        <div>
                          <span>حساب / رقم المرسل:</span>
                          <strong>{order.payment_payload.senderInfo}</strong>
                        </div>
                        {order.payment_payload.notes && (
                          <div style={{ gridColumn: "1 / -1" }}>
                            <span>ملاحظات العميل:</span>
                            <strong>{order.payment_payload.notes}</strong>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {order.payment_reference && (
                    <div className="screenshot-section">
                      <h3>إثبات التحويل (صورة)</h3>
                      <a href={order.payment_reference} target="_blank" rel="noreferrer">
                        <img src={order.payment_reference} alt="Payment Proof" className="proof-image" />
                      </a>
                    </div>
                  )}

                  {/* Action buttons (only show if it's a manual transfer that needs review) */}
                  {["vodafone_cash", "instapay", "telda"].includes(order.payment_method) && order.payment_status !== "paid" && (
                    <div className="payment-actions">
                      <div className="action-row">
                        <button className="btn-approve" onClick={handleApprovePayment} disabled={isUpdating}>
                          {isUpdating ? "جاري التأكيد..." : "تأكيد الدفع (Approve)"}
                        </button>
                      </div>
                      
                      <div className="reject-box">
                        <h4>رفض التحويل:</h4>
                        <select value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} disabled={isUpdating}>
                          {REJECT_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                        {rejectReason === "أخرى..." && (
                          <input 
                            type="text" 
                            placeholder="اكتب سبب الرفض هنا..." 
                            value={customRejectReason}
                            onChange={(e) => setCustomRejectReason(e.target.value)}
                            disabled={isUpdating}
                          />
                        )}
                        <button className="btn-reject" onClick={handleRejectPayment} disabled={isUpdating}>
                          {isUpdating ? "جاري الرفض..." : "رفض الدفع (Reject)"}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* TAB 2: ORDER DETAILS */}
          {modalTab === "details" && (
            <div className="details-tab">
              <div className="customer-info-box">
                <h3>بيانات العميل</h3>
                <p><strong>الاسم:</strong> {order.customer?.name}</p>
                <p><strong>الهاتف:</strong> {order.customer?.phone}</p>
                <p><strong>البريد الإلكتروني:</strong> {order.customer?.email || "غير متوفر"}</p>
                <p><strong>المحافظة / المدينة:</strong> {order.customer?.city}</p>
                <p><strong>العنوان بالتفصيل:</strong> {order.customer?.address}</p>
                {order.notes && <p><strong>ملاحظات الطلب:</strong> {order.notes}</p>}
              </div>

              <div className="items-list-box">
                <h3>المنتجات المطلوبة ({order.items?.length || 0})</h3>
                <div className="items-grid">
                  {order.items?.map((item, idx) => (
                    <div key={idx} className="item-card">
                      {item.image && <img src={item.image} alt="" className="item-thumb" />}
                      <div className="item-info">
                        <h4>{item.name}</h4>
                        <span>SKU: {item.sku || "N/A"}</span>
                        {item.family_member && (
                          <span>فرد العيلة: {item.family_member.name} | {item.phone?.label || "موبايل محفوظ"} | {item.phone?.brand} {item.phone?.model}</span>
                        )}
                        {item.service_type && (
                          <span>الخدمة: {item.service_label || item.service_type}{item.auto_choose ? " | Cover Up يحدد الاختيار الأنسب" : ""}</span>
                        )}
                        {item.representative_note && <span>{item.representative_note}</span>}
                        {item.color && <span>اللون المختارة: <span style={{ display: "inline-block", width: "12px", height: "12px", background: item.color.hex, borderRadius: "50%", verticalAlign: "middle" }}></span> {item.color.name}</span>}
                        <strong>{item.quantity} × {item.price} EGP = {item.line_total} EGP</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: STATUS UPDATE */}
          {modalTab === "status" && (
            <div className="status-tab">
              <div className="status-update-box">
                <h3>تحديث حالة الطلب</h3>
                <p>تستخدم هذه الصفحة لتغيير مرحلة شحن أو تحضير الطلب الحالية.</p>
                
                <label>الحالة الجديدة:</label>
                <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                  {ORDER_STATUSES.map(st => <option key={st} value={st}>{st}</option>)}
                </select>

                <button className="btn-update-status" onClick={handleStatusUpdate} disabled={isUpdating || newStatus === order.status}>
                  {isUpdating ? "جاري الحفظ..." : "حفظ التغييرات"}
                </button>
              </div>

              <div className="status-history">
                <h3>سجل الحالات:</h3>
                <ul>
                  {order.status_history?.map((hist, idx) => (
                    <li key={idx}>
                      <strong>{hist.status}</strong> - {new Date(hist.at).toLocaleString("ar-EG")}
                      <p>{hist.note}</p>
                      <small>بواسطة: {hist.actor}</small>
                    </li>
                  )).reverse()}
                </ul>
              </div>
            </div>
          )}

          {/* TAB 4: EMAIL LOGS */}
          {modalTab === "emails" && (
            <div className="emails-tab">
              <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0 }}>سجل الإيميلات المرسلة للطلب</h3>
                <button 
                  onClick={fetchEmailLogs} 
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#f1f5f9",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: "bold",
                    fontSize: "13px"
                  }}
                >
                  تحديث السجل
                </button>
              </div>
              {loadingEmails ? (
                <p>جاري تحميل سجل الإيميلات...</p>
              ) : emailLogs.length === 0 ? (
                <p>لم يتم إرسال أي إيميلات لهذا الطلب بعد.</p>
              ) : (
                <div className="email-logs-list" style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "right" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                        <th style={{ padding: "12px 8px" }}>نوع البريد</th>
                        <th style={{ padding: "12px 8px" }}>المستلم</th>
                        <th style={{ padding: "12px 8px" }}>تاريخ الإرسال</th>
                        <th style={{ padding: "12px 8px" }}>الحالة</th>
                        <th style={{ padding: "12px 8px" }}>الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {emailLogs.map((log) => (
                        <tr key={log.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "12px 8px" }}><strong>{log.email_type}</strong></td>
                          <td style={{ padding: "12px 8px" }}><span style={{ fontFamily: "monospace" }}>{log.recipient}</span></td>
                          <td style={{ padding: "12px 8px" }}><small>{new Date(log.created_at).toLocaleString("ar-EG")}</small></td>
                          <td style={{ padding: "12px 8px" }}>
                            <span className={`status-badge email-status-${log.delivery_status}`}>
                              {log.delivery_status}
                            </span>
                            {log.error_message && (
                              <div style={{ color: "#ef4444", fontSize: "11px", marginTop: "4px" }}>
                                {log.error_message}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: "12px 8px" }}>
                            {["failed", "bounced", "queued"].includes(log.delivery_status) && (
                              <button 
                                className="btn-retry-email"
                                onClick={() => handleRetryEmail(log.id)}
                                style={{
                                  padding: "6px 12px",
                                  backgroundColor: "#ef4444",
                                  color: "#fff",
                                  border: "none",
                                  borderRadius: "6px",
                                  fontSize: "12px",
                                  fontWeight: "bold",
                                  cursor: "pointer"
                                }}
                              >
                                إعادة إرسال
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        .order-page-container {
          max-width: 1000px;
          margin: 0 auto;
          padding: 40px 20px;
          font-family: system-ui, -apple-system, sans-serif;
          color: #1e293b;
          text-align: right;
        }
        .page-header {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 32px;
        }
        .btn-back {
          align-self: flex-start;
          text-decoration: none;
          color: #0052ff;
          font-weight: bold;
          font-size: 14px;
        }
        .title-area {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .title-area h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 800;
        }
        
        .status-badge {
          font-size: 12px;
          padding: 6px 14px;
          border-radius: 20px;
          background: #e2e8f0;
          color: #334155;
          font-weight: bold;
        }
        .status-new, .status-pending_payment { background: #fef08a; color: #854d0e; }
        .status-paid, .status-confirmed { background: #bbf7d0; color: #166534; }
        .status-fetching_required_items, .status-representative_on_way, .status-with_courier, .status-preparing { background: #dbeafe; color: #1d4ed8; }
        .status-cancelled, .status-refunded, .status-payment_failed, .status-suspended { background: #fecaca; color: #991b1b; }
        .status-badge.email-status-sent, .status-badge.email-status-delivered { background: #bbf7d0 !important; color: #166534 !important; }
        .status-badge.email-status-queued { background: #e2e8f0 !important; color: #334155 !important; }
        .status-badge.email-status-failed, .status-badge.email-status-bounced { background: #fecaca !important; color: #991b1b !important; }
        .status-badge.email-status-retried { background: #fed7aa !important; color: #c2410c !important; }

        .status-alert {
          background: #e0f2fe;
          border: 1px solid #bae6fd;
          color: #0369a1;
          padding: 16px;
          border-radius: 8px;
          font-weight: bold;
          margin-bottom: 24px;
        }

        .page-tabs {
          display: flex;
          border-bottom: 1px solid #e2e8f0;
          margin-bottom: 24px;
        }
        .page-tabs button {
          flex: 1;
          padding: 16px;
          background: none;
          border: none;
          border-bottom: 3px solid transparent;
          cursor: pointer;
          font-weight: bold;
          font-size: 15px;
          color: #64748b;
          transition: all 0.2s;
        }
        .page-tabs button.active {
          color: #0052ff;
          border-bottom-color: #0052ff;
        }

        .tab-content-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 32px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.02);
        }

        .alert-box { padding: 14px 20px; border-radius: 8px; font-weight: bold; margin-bottom: 24px; font-size: 14px; }
        .alert-box.error { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
        .alert-box.success { background: #d1fae5; color: #065f46; border: 1px solid #6ee7b7; }

        .payment-info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 32px; }
        .info-card { background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; }
        .info-card label { display: block; font-size: 12px; color: #64748b; margin-bottom: 6px; }
        .info-card strong { font-size: 18px; }

        .transfer-details { background: #f8fafc; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 32px; }
        .transfer-details h3 { margin: 0 0 16px 0; font-size: 16px; }
        .transfer-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; }
        .transfer-grid span { display: block; font-size: 12px; color: #64748b; margin-bottom: 6px; }
        .transfer-grid strong { font-size: 15px; }

        .screenshot-section { background: #f8fafc; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 32px; }
        .screenshot-section h3 { margin: 0 0 16px 0; font-size: 16px; }
        .proof-image { max-width: 100%; max-height: 400px; border-radius: 8px; border: 1px solid #cbd5e1; object-fit: contain; }

        .payment-actions { display: flex; flex-direction: column; gap: 32px; }
        .btn-approve { background: #059669; color: #fff; border: none; padding: 18px; border-radius: 8px; font-size: 16px; font-weight: bold; cursor: pointer; width: 100%; transition: opacity 0.2s; }
        .btn-approve:disabled { opacity: 0.6; cursor: not-allowed; }
        
        .reject-box { background: #fff; padding: 24px; border-radius: 12px; border: 1px solid #fca5a5; display: flex; flex-direction: column; gap: 16px; }
        .reject-box h4 { margin: 0; color: #991b1b; font-size: 16px; }
        .reject-box select, .reject-box input { padding: 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; width: 100%; box-sizing: border-box; }
        .btn-reject { background: #ef4444; color: #fff; border: none; padding: 14px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 15px; }
        .btn-reject:disabled { opacity: 0.6; cursor: not-allowed; }

        .customer-info-box, .items-list-box { background: #f8fafc; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 32px; }
        .customer-info-box h3, .items-list-box h3 { margin: 0 0 20px 0; font-size: 17px; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; }
        .customer-info-box p { margin: 0 0 12px 0; font-size: 15px; }

        .items-grid { display: grid; gap: 16px; }
        .item-card { display: flex; gap: 20px; padding: 16px; border: 1px solid #e2e8f0; border-radius: 10px; background: #fff; align-items: center; }
        .item-thumb { width: 64px; height: 64px; object-fit: cover; border-radius: 8px; border: 1px solid #cbd5e1; }
        .item-info h4 { margin: 0 0 6px 0; font-size: 15px; }
        .item-info span { display: block; font-size: 12px; color: #64748b; margin-bottom: 4px; }
        
        .status-update-box, .status-history { background: #f8fafc; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 32px; }
        .status-update-box h3, .status-history h3 { margin: 0 0 20px 0; font-size: 17px; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; }
        .status-update-box p { font-size: 14px; color: #64748b; margin-bottom: 20px; }
        .status-update-box label { display: block; margin-bottom: 10px; font-weight: bold; font-size: 14px; }
        .status-update-box select { width: 100%; padding: 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; margin-bottom: 20px; box-sizing: border-box; }
        .btn-update-status { background: #0052ff; color: #fff; border: none; padding: 14px 28px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 15px; }
        .btn-update-status:disabled { opacity: 0.6; cursor: not-allowed; }

        .status-history ul { list-style: none; padding: 0; margin: 0; }
        .status-history li { padding: 20px 0; border-bottom: 1px solid #e2e8f0; }
        .status-history li:last-child { border-bottom: none; }
        .status-history li p { margin: 10px 0; font-size: 14px; color: #475569; }
        .status-history li small { font-size: 12px; color: #94a3b8; }
      `}</style>
    </main>
  );
}
