"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminOrdersTab({ ordersList, onUpdateOrder, ORDER_STATUSES, onRefresh, title = "قائمة الطلبات", description = "مراجعة الطلبات، تحديث حالات الشحن، وتأكيد عمليات الدفع الإلكتروني." }) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");

  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [orderPage, setOrderPage] = useState(1);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter Orders
  const filteredOrders = useMemo(() => {
    return ordersList.filter((order) => {
      const orderIdStr = String(order.id || "");
      // Search
      const matchSearch =
        orderIdStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (order.customer?.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (order.customer?.phone || "").includes(searchQuery);

      // Filters
      const matchStatus = statusFilter === "all" || order.status === statusFilter;
      const matchMethod = paymentMethodFilter === "all" || order.payment_method === paymentMethodFilter;
      const matchPayStatus = paymentStatusFilter === "all" || order.payment_status === paymentStatusFilter;

      return matchSearch && matchStatus && matchMethod && matchPayStatus;
    });
  }, [ordersList, searchQuery, statusFilter, paymentMethodFilter, paymentStatusFilter]);

  useEffect(() => {
    setOrderPage(1);
    setSelectedOrderIds([]);
  }, [searchQuery, statusFilter, paymentMethodFilter, paymentStatusFilter, ordersList]);

  const ITEMS_PER_PAGE = 30;
  const totalOrderPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE) || 1;
  const paginatedOrders = filteredOrders.slice((orderPage - 1) * ITEMS_PER_PAGE, orderPage * ITEMS_PER_PAGE);

  const handleOpenOrder = (orderId) => {
    router.push(`/admin/orders/${orderId}`);
  };

  const handleBulkDeleteOrders = async () => {
    if (selectedOrderIds.length === 0) return;
    if (!confirm(`هل أنت متأكد من رغبتك في حذف ${selectedOrderIds.length} طلب؟`)) {
      return;
    }
    
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin-orders?id=${selectedOrderIds.join(",")}`, {
        method: "DELETE"
      });
      if (res.ok) {
        alert("تم حذف الطلبات المحددة بنجاح.");
        setSelectedOrderIds([]);
        if (onRefresh) onRefresh();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.message || "فشل حذف الطلبات.");
      }
    } catch (error) {
      console.error("Error deleting orders:", error);
      alert("حدث خطأ أثناء الاتصال بالخادم.");
    } finally {
      setIsDeleting(false);
    }
  };

  const renderPagination = (currentPage, totalPages, onPageChange) => {
    if (totalPages <= 1) return null;
    return (
      <div className="pagination-controls" style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", margin: "16px 0", direction: "ltr" }}>
        <button 
          type="button" 
          disabled={currentPage === 1} 
          onClick={() => onPageChange(currentPage - 1)}
          style={{ padding: "6px 12px", border: "1px solid #cbd5e1", background: "#fff", borderRadius: "8px", cursor: currentPage === 1 ? "not-allowed" : "pointer", opacity: currentPage === 1 ? 0.5 : 1 }}
        >
          &lt;
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
          <button
            key={pg}
            type="button"
            onClick={() => onPageChange(pg)}
            style={{ 
              padding: "6px 12px", 
              border: "1px solid " + (pg === currentPage ? "#0052ff" : "#cbd5e1"), 
              background: pg === currentPage ? "#0052ff" : "#fff", 
              color: pg === currentPage ? "#fff" : "#1e293b", 
              borderRadius: "8px", 
              fontWeight: pg === currentPage ? "bold" : "normal",
              cursor: "pointer" 
            }}
          >
            {pg}
          </button>
        ))}
        <button 
          type="button" 
          disabled={currentPage === totalPages} 
          onClick={() => onPageChange(currentPage + 1)}
          style={{ padding: "6px 12px", border: "1px solid #cbd5e1", background: "#fff", borderRadius: "8px", cursor: currentPage === totalPages ? "not-allowed" : "pointer", opacity: currentPage === totalPages ? 0.5 : 1 }}
        >
          &gt;
        </button>
      </div>
    );
  };

  return (
    <div className="admin-orders-tab">
      <div className="orders-header">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>

      {/* Filters */}
      <div className="orders-filters">
        <input
          type="text"
          placeholder="البحث برقم الطلب، اسم أو هاتف العميل..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-box"
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">كل حالات الطلب</option>
          {ORDER_STATUSES.map((st) => (
            <option key={st} value={st}>{st}</option>
          ))}
        </select>
        <select value={paymentMethodFilter} onChange={(e) => setPaymentMethodFilter(e.target.value)}>
          <option value="all">كل طرق الدفع</option>
          <option value="cash">كاش (الدفع عند الاستلام)</option>
          <option value="online">إلكتروني (بطاقة)</option>
          <option value="vodafone_cash">فودافون كاش</option>
          <option value="instapay">إنستا باي</option>
          <option value="telda">تيلدا</option>
        </select>
        <select value={paymentStatusFilter} onChange={(e) => setPaymentStatusFilter(e.target.value)}>
          <option value="all">كل حالات الدفع</option>
          <option value="pending">معلق (في انتظار الدفع)</option>
          <option value="awaiting_verification">جاري المراجعة (صورة تحويل)</option>
          <option value="paid">تم الدفع</option>
          <option value="failed">مرفوض / فشل</option>
          <option value="cash_pending">الدفع عند الاستلام</option>
        </select>
      </div>

      {selectedOrderIds.length > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255, 77, 77, 0.08)", border: "1px solid rgba(255, 77, 77, 0.2)", padding: "12px 18px", borderRadius: "12px", marginBottom: "16px" }}>
          <span style={{ fontWeight: "600", color: "#ff4d4d" }}>
            تم تحديد {selectedOrderIds.length} طلب
          </span>
          <button 
            type="button" 
            onClick={handleBulkDeleteOrders} 
            disabled={isDeleting}
            style={{ padding: "8px 16px", background: "#ff4d4d", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: isDeleting ? "not-allowed" : "pointer", fontSize: "0.9rem", opacity: isDeleting ? 0.6 : 1 }}
          >
            {isDeleting ? "جاري الحذف..." : "حذف الطلبات المحددة"}
          </button>
        </div>
      )}

      {renderPagination(orderPage, totalOrderPages, setOrderPage)}

      {/* Table */}
      <div className="table-container">
        {filteredOrders.length === 0 ? (
          <p className="no-data" style={{ padding: "32px", textAlign: "center" }}>لا توجد طلبات تطابق بحثك.</p>
        ) : (
          <table className="orders-table">
            <thead>
              <tr>
                <th style={{ width: "40px", textAlign: "center" }}>
                  <input 
                    type="checkbox" 
                    checked={filteredOrders.length > 0 && filteredOrders.every(o => selectedOrderIds.includes(o.id))} 
                    onChange={() => {
                      if (filteredOrders.every(o => selectedOrderIds.includes(o.id))) {
                        setSelectedOrderIds([]);
                      } else {
                        setSelectedOrderIds(filteredOrders.map(o => o.id));
                      }
                    }}
                    style={{ cursor: "pointer", width: "16px", height: "16px" }}
                  />
                </th>
                <th>الطلب</th>
                <th>العميل</th>
                <th>المنتجات</th>
                <th>المبلغ الإجمالي</th>
                <th>الدفع</th>
                <th>الحالة</th>
                <th>إجراء</th>
              </tr>
            </thead>
            <tbody>
              {paginatedOrders.map((order) => {
                const firstItem = order.items?.[0];
                const firstFamilyMember = firstItem?.family_member?.name;
                const firstPhone = firstItem?.phone?.model || firstItem?.phone?.label;
                const itemsCount = order.items?.length || 0;
                return (
                  <tr key={order.id} className="order-row" onClick={() => handleOpenOrder(order.id)}>
                    <td style={{ textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        checked={selectedOrderIds.includes(order.id)} 
                        onChange={() => {
                          if (selectedOrderIds.includes(order.id)) {
                            setSelectedOrderIds(selectedOrderIds.filter(id => id !== order.id));
                          } else {
                            setSelectedOrderIds([...selectedOrderIds, order.id]);
                          }
                        }}
                        style={{ cursor: "pointer", width: "16px", height: "16px" }}
                      />
                    </td>
                    <td>
                      <div className="order-id">#{order.id.startsWith("CU") ? order.id : order.id.slice(0, 8)}</div>
                      <div className="order-date">{new Date(order.created_at).toLocaleDateString("ar-EG")}</div>
                    </td>
                    <td>
                      <div className="customer-name">{order.customer?.name || "بدون اسم"}</div>
                      <div className="customer-phone">{order.customer?.phone}</div>
                    </td>
                    <td>
                      {firstItem ? (
                        <div className="order-item-summary">
                          {firstItem.image && <img src={firstItem.image} alt="" className="item-thumb" />}
                          <div className="item-meta">
                            <span className="item-title">{firstItem.name}</span>
                            <span className="item-qty">{firstFamilyMember ? `${firstFamilyMember} | ${firstPhone || "موبايل محفوظ"} | ${firstItem.service_label || firstItem.service_type}` : `الكمية: ${firstItem.quantity} | SKU: ${firstItem.sku || "N/A"}`}</span>
                            {itemsCount > 1 && <span className="more-items">و {itemsCount - 1} منتج آخر</span>}
                          </div>
                        </div>
                      ) : (
                        "لا توجد منتجات"
                      )}
                    </td>
                    <td><strong>{Number(order.grand_total || order.total || 0).toLocaleString("ar-EG")} EGP</strong></td>
                    <td>
                      <div className="payment-method">{order.payment_method}</div>
                      <div className={`pay-status pay-${order.payment_status}`}>
                        {order.payment_status === "awaiting_verification" ? "يتطلب مراجعة" : order.payment_status}
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge status-${order.status}`}>{order.status}</span>
                    </td>
                    <td>
                      <button className="view-btn">عرض التفاصيل</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {renderPagination(orderPage, totalOrderPages, setOrderPage)}

      <style jsx>{`
        .admin-orders-tab {
          font-family: system-ui, -apple-system, sans-serif;
          color: #1e293b;
        }
        .orders-header {
          margin-bottom: 24px;
        }
        .orders-header h2 { margin: 0 0 8px 0; font-size: 24px; }
        .orders-header p { margin: 0; color: #64748b; }
        
        .orders-filters {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }
        .search-box {
          flex: 1;
          min-width: 250px;
          padding: 10px 16px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 14px;
        }
        .orders-filters select {
          padding: 10px 16px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          background: #fff;
          font-size: 14px;
          min-width: 150px;
        }

        .table-container {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          overflow-x: auto;
        }
        .orders-table {
          width: 100%;
          border-collapse: collapse;
          text-align: right;
        }
        .orders-table th {
          background: #f8fafc;
          padding: 16px;
          font-size: 13px;
          color: #64748b;
          border-bottom: 1px solid #e2e8f0;
        }
        .order-row {
          border-bottom: 1px solid #f1f5f9;
          cursor: pointer;
          transition: background 0.2s;
        }
        .order-row:hover {
          background: #f8fafc;
        }
        .order-row td {
          padding: 16px;
          vertical-align: middle;
        }
        .order-id { font-weight: bold; font-size: 14px; }
        .order-date { font-size: 12px; color: #64748b; }
        .customer-name { font-weight: bold; font-size: 14px; }
        .customer-phone { font-size: 13px; color: #64748b; }
        
        .order-item-summary { display: flex; gap: 12px; align-items: center; }
        .item-thumb { width: 40px; height: 40px; object-fit: cover; border-radius: 6px; border: 1px solid #e2e8f0; }
        .item-meta { display: flex; flex-direction: column; gap: 2px; }
        .item-title { font-weight: bold; font-size: 13px; }
        .item-qty { font-size: 11px; color: #64748b; }
        .more-items { font-size: 11px; color: #0052ff; font-weight: bold; }
        
        .payment-method { font-size: 13px; font-weight: bold; }
        .pay-status { font-size: 11px; padding: 4px 8px; border-radius: 4px; display: inline-block; margin-top: 4px; font-weight: bold; }
        .pay-pending { background: #fef3c7; color: #d97706; }
        .pay-cash_pending { background: #f1f5f9; color: #475569; }
        .pay-awaiting_verification { background: #dbeafe; color: #1d4ed8; }
        .pay-paid { background: #d1fae5; color: #059669; }
        .pay-failed { background: #fee2e2; color: #b91c1c; }
        
        .status-badge { font-size: 12px; padding: 4px 10px; border-radius: 20px; background: #e2e8f0; color: #334155; font-weight: bold; }
        .status-new, .status-pending_payment { background: #fef08a; color: #854d0e; }
        .status-paid, .status-confirmed { background: #bbf7d0; color: #166534; }
        .status-preparing, .status-fetching_required_items, .status-representative_on_way, .status-with_courier { background: #dbeafe; color: #1d4ed8; }
        .status-cancelled, .status-suspended, .status-refunded, .status-payment_failed { background: #fecaca; color: #991b1b; }
 
        .view-btn { padding: 6px 12px; background: #fff; border: 1px solid #cbd5e1; border-radius: 6px; cursor: pointer; font-size: 12px; transition: all 0.2s; }
        .order-row:hover .view-btn { border-color: #0052ff; color: #0052ff; }
      `}</style>
    </div>
  );
}
