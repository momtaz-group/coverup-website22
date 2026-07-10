"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase";

const ORDER_STATUSES = [
  "new",
  "pending_payment",
  "paid",
  "confirmed",
  "preparing",
  "with_courier",
  "delivered",
  "cancelled",
  "refunded",
  "payment_failed",
];

export default function AdminPage() {
  // Authentication state
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginStatus, setLoginStatus] = useState("");

  // Dashboard data state
  const [events, setEvents] = useState({
    orders: [],
    reviews: [],
    complaints: [],
    chats: [],
    customers: [],
    passwordResets: [],
    emailVerifications: [],
  });
  const [products, setProducts] = useState([]);
  const [dashboardMessage, setDashboardMessage] = useState("");

  // Product Form state
  const [productForm, setProductForm] = useState({
    id: "",
    name: "",
    category: "",
    sku: "",
    price: "",
    stock_quantity: "",
    badge: "",
    compatible_models: "",
    colors: "",
    images: "",
    material: "",
    seo_title: "",
    seo_description: "",
    description: "",
    featured: "false",
    image: "",
  });
  const [imageFile, setImageFile] = useState(null);

  // POS Form state
  const [posForm, setPosForm] = useState({
    productId: "",
    quantity: 1,
    paymentMethod: "cash",
    customerName: "",
    customerPhone: "",
  });
  const [posMessage, setPosMessage] = useState("");

  // Load credentials from sessionStorage on mount
  useEffect(() => {
    const savedUser = sessionStorage.getItem("coverup-admin-username");
    const savedPass = sessionStorage.getItem("coverup-admin-password");
    if (savedUser && savedPass) {
      setAdminUsername(savedUser);
      setAdminPassword(savedPass);
      verifyAndLoad(savedUser, savedPass);
    }
  }, []);

  const headers = (user = adminUsername, pass = adminPassword) => {
    return {
      "Content-Type": "application/json",
      "x-admin-username": user,
      "x-admin-password": pass,
    };
  };

  const verifyAndLoad = async (user, pass) => {
    setLoginStatus("بنتحقق من بياناتك...");
    try {
      const res = await fetch("/api/store-events", {
        headers: headers(user, pass),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Unauthorized");
      }

      // Save credentials and state
      sessionStorage.setItem("coverup-admin-username", user);
      sessionStorage.setItem("coverup-admin-password", pass);
      setIsAuthenticated(true);
      setLoginStatus("");
      setEvents(data);

      // Fetch products list
      const prodRes = await fetch("/api/store-products");
      const prodData = await prodRes.json();
      if (prodRes.ok && prodData.products) {
        setProducts(prodData.products);
        if (prodData.products.length > 0) {
          setPosForm((prev) => ({ ...prev, productId: prodData.products[0].id }));
        }
      }
    } catch (err) {
      setLoginStatus(err.message || "فشل الدخول. تأكد من كلمة السر.");
      setIsAuthenticated(false);
    }
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const user = formData.get("username");
    const pass = formData.get("password");
    setAdminUsername(user);
    setAdminPassword(pass);
    verifyAndLoad(user, pass);
  };

  const handleRefresh = () => {
    verifyAndLoad(adminUsername, adminPassword);
  };

  // Convert File to Base64 data URL
  const fileToDataUrl = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const uploadProductImage = async (file) => {
    const dataUrl = await fileToDataUrl(file);
    if (!dataUrl) return "";

    try {
      const res = await fetch("/api/storage-upload", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          kind: "product",
          fileName: file.name || "product.png",
          dataUrl,
        }),
      });
      const data = await res.json();
      return res.ok ? data.url : "";
    } catch {
      return "";
    }
  };

  // Create Product Submit
  const handleProductSubmit = async (e) => {
    e.preventDefault();
    setDashboardMessage("بنوفر بيانات المنتج...");
    try {
      let uploadedUrl = productForm.image;
      if (imageFile) {
        setDashboardMessage("بنرفع صورة المنتج...");
        uploadedUrl = await uploadProductImage(imageFile);
        if (!uploadedUrl) {
          throw new Error("فشل رفع صورة المنتج.");
        }
      }

      const cleanPayload = {
        ...productForm,
        image: uploadedUrl,
        price: Number(productForm.price),
        stock_quantity: Number(productForm.stock_quantity),
        featured: productForm.featured === "true",
      };

      const res = await fetch("/api/store-product", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(cleanPayload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save product");

      setDashboardMessage("تم حفظ المنتج بنجاح.");
      setImageFile(null);
      setProductForm({
        id: "",
        name: "",
        category: "",
        sku: "",
        price: "",
        stock_quantity: "",
        badge: "",
        compatible_models: "",
        colors: "",
        images: "",
        material: "",
        seo_title: "",
        seo_description: "",
        description: "",
        featured: "false",
        image: "",
      });
      e.target.reset();
      handleRefresh();
    } catch (err) {
      setDashboardMessage(err.message);
    }
  };

  // Edit Product prefill
  const editProduct = (product) => {
    setProductForm({
      id: product.id || "",
      name: product.name || "",
      category: product.category || "",
      sku: product.sku || "",
      price: product.price || "",
      stock_quantity: product.stock_quantity || "0",
      badge: product.badge || "",
      compatible_models: Array.isArray(product.compatible_models) ? product.compatible_models.join(", ") : "",
      colors: Array.isArray(product.colors) ? product.colors.join(", ") : "",
      images: Array.isArray(product.images) ? product.images.join("\n") : "",
      material: product.material || "",
      seo_title: product.seo_title || "",
      seo_description: product.seo_description || "",
      description: product.description || "",
      featured: product.featured ? "true" : "false",
      image: product.image || "",
    });
  };

  // Update Order Status
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      const res = await fetch("/api/admin-orders", {
        method: "PATCH",
        headers: headers(),
        body: JSON.stringify({
          orderId,
          status: newStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update order status");

      setDashboardMessage(`تم تحديث حالة الطلب إلى: ${newStatus}`);
      handleRefresh();
    } catch (err) {
      setDashboardMessage(err.message);
    }
  };

  // POS Order Submit
  const handlePosSubmit = async (e) => {
    e.preventDefault();
    setPosMessage("بنسجل عملية البيع...");
    try {
      const prod = products.find((p) => p.id === posForm.productId);
      if (!prod) throw new Error("المنتج غير موجود.");

      const payload = {
        channel: "pos",
        deliveryMethod: "pickup",
        paymentMethod: posForm.paymentMethod,
        customer: {
          name: posForm.customerName.trim() || "عميل الفرع",
          phone: posForm.customerPhone.trim() || "01050310516",
        },
        items: [
          {
            id: posForm.productId,
            quantity: Number(posForm.quantity),
          },
        ],
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to submit POS order");

      setPosMessage(`تم البيع بنجاح. رقم الطلب: ${String(data.order.id).slice(0, 8)}`);
      setPosForm({
        productId: products[0]?.id || "",
        quantity: 1,
        paymentMethod: "cash",
        customerName: "",
        customerPhone: "",
      });
      handleRefresh();
    } catch (err) {
      setPosMessage(err.message);
    }
  };

  // Calculate Metrics
  const ordersList = events.orders || [];
  const customersList = events.customers || [];
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayOrders = ordersList.filter((o) => String(o.created_at || "").slice(0, 10) === todayKey);
  const salesToday = todayOrders.reduce((sum, o) => sum + Number(o.grand_total || o.total || 0), 0);
  const pendingOrders = ordersList.filter((o) => ["new", "pending_payment", "confirmed", "preparing"].includes(o.status)).length;
  const newCustomers = customersList.filter((c) => String(c.created_at || "").slice(0, 10) === todayKey).length;

  const productCounts = {};
  ordersList.forEach((o) => (o.items || []).forEach((item) => {
    productCounts[item.name] = (productCounts[item.name] || 0) + Number(item.quantity || 1);
  }));
  const topProduct = Object.entries(productCounts).sort((a, b) => b[1] - a[1])[0];

  if (!isAuthenticated) {
    return (
      <main className="admin-shell">
        <section className="admin-login">
          <img className="brand-logo" src="/assets/brand/cover-up-symbol.png" alt="" />
          <h1>Cover Up Dashboard</h1>
          <p>ادخل كلمة سر الإدارة. البيانات الحساسة لا تظهر إلا بعد التحقق من السيرفر.</p>
          <form onSubmit={handleLoginSubmit}>
            <label>
              اسم المستخدم
              <input name="username" type="text" autocomplete="username" required />
            </label>
            <label>
              كلمة سر الإدارة
              <input name="password" type="password" autocomplete="current-password" required />
            </label>
            <button className="button button-primary" type="submit">دخول</button>
          </form>
          {loginStatus && <p className="payment-message">{loginStatus}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="admin-shell" style={{ maxWidth: "1200px", margin: "40px auto", padding: "20px" }}>
      <section className="admin-dashboard" style={{ display: "block" }}>
        <div className="admin-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div>
            <p className="eyebrow">لوحة الإدارة</p>
            <h1>المنتجات، العملاء، الأوردرات، والشكاوى</h1>
          </div>
          <button className="button button-secondary" type="button" onClick={handleRefresh}>تحديث البيانات</button>
        </div>

        {dashboardMessage && (
          <p className="admin-alert" style={{ background: "#fbf5df", color: "#856404", padding: "12px", borderRadius: "8px", marginBottom: "20px" }}>
            {dashboardMessage}
          </p>
        )}

        {/* Metrics Grid */}
        <section className="admin-metrics" style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", marginBottom: "32px" }}>
          <article style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", padding: "20px", borderRadius: "8px" }}>
            <span>مبيعات اليوم</span>
            <strong style={{ display: "block", fontSize: "24px", marginTop: "8px" }}>{salesToday.toLocaleString("ar-EG")} EGP</strong>
          </article>
          <article style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", padding: "20px", borderRadius: "8px" }}>
            <span>أوردرات معلقة</span>
            <strong style={{ display: "block", fontSize: "24px", marginTop: "8px" }}>{pendingOrders}</strong>
          </article>
          <article style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", padding: "20px", borderRadius: "8px" }}>
            <span>عملاء جدد اليوم</span>
            <strong style={{ display: "block", fontSize: "24px", marginTop: "8px" }}>{newCustomers}</strong>
          </article>
          <article style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", padding: "20px", borderRadius: "8px" }}>
            <span>أكثر منتج مبيعًا</span>
            <strong style={{ display: "block", fontSize: "16px", marginTop: "8px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {topProduct ? `${topProduct[0]} (${topProduct[1]})` : "—"}
            </strong>
          </article>
        </section>

        {/* POS & Quick Stock */}
        <div className="admin-grid" style={{ display: "grid", gap: "28px", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", marginBottom: "32px" }}>
          {/* POS Panel */}
          <section className="admin-card">
            <h2>POS بيع من الفرع</h2>
            <form onSubmit={handlePosSubmit}>
              <label>
                اختار المنتج
                <select
                  value={posForm.productId}
                  onChange={(e) => setPosForm((prev) => ({ ...prev, productId: e.target.value }))}
                  required
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.stock_quantity || 0} قطعة)
                    </option>
                  ))}
                </select>
              </label>
              <label>
                عدد القطع
                <input
                  type="number"
                  min="1"
                  value={posForm.quantity}
                  onChange={(e) => setPosForm((prev) => ({ ...prev, quantity: Math.max(1, Number(e.target.value)) }))}
                  required
                />
              </label>
              <label>
                طريقة الدفع
                <select
                  value={posForm.paymentMethod}
                  onChange={(e) => setPosForm((prev) => ({ ...prev, paymentMethod: e.target.value }))}
                >
                  <option value="cash">كاش</option>
                  <option value="card">كارت في الفرع</option>
                  <option value="wallet">محفظة / Instapay</option>
                </select>
              </label>
              <label>
                اسم العميل (اختياري)
                <input
                  type="text"
                  placeholder="عميل الفرع"
                  value={posForm.customerName}
                  onChange={(e) => setPosForm((prev) => ({ ...prev, customerName: e.target.value }))}
                />
              </label>
              <label>
                رقم العميل (اختياري)
                <input
                  type="tel"
                  placeholder="010..."
                  value={posForm.customerPhone}
                  onChange={(e) => setPosForm((prev) => ({ ...prev, customerPhone: e.target.value }))}
                />
              </label>
              <button className="button button-primary" type="submit">تسجيل البيع</button>
            </form>
            {posMessage && <p className="admin-mini-note" style={{ color: "#4caf50", marginTop: "8px" }}>{posMessage}</p>}
          </section>

          {/* Quick Inventory */}
          <section className="admin-card">
            <h2>المخزون السريع</h2>
            <div className="admin-list" style={{ maxHeight: "380px", overflowY: "auto" }}>
              {products.map((prod) => (
                <div key={prod.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <span>{prod.name}</span>
                  <strong style={{ color: prod.stock_quantity < 5 ? "#ff6b6b" : "inherit" }}>
                    {prod.stock_quantity || 0} قطعة
                  </strong>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Product Editor Form */}
        <div className="admin-grid" style={{ display: "grid", gap: "28px", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", marginBottom: "32px" }}>
          <section className="admin-card">
            <h2>{productForm.id ? "تعديل منتج" : "إضافة منتج جديد"}</h2>
            <form onSubmit={handleProductSubmit}>
              <label>
                اسم المنتج
                <input
                  type="text"
                  value={productForm.name}
                  onChange={(e) => setProductForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />
              </label>
              <label>
                القسم
                <input
                  type="text"
                  placeholder="كفرات / حماية الشاشة"
                  value={productForm.category}
                  onChange={(e) => setProductForm((p) => ({ ...p, category: e.target.value }))}
                  required
                />
              </label>
              <label>
                SKU
                <input
                  type="text"
                  placeholder="CU-IP15PM-001"
                  value={productForm.sku}
                  onChange={(e) => setProductForm((p) => ({ ...p, sku: e.target.value }))}
                />
              </label>
              <label>
                السعر
                <input
                  type="number"
                  min="1"
                  value={productForm.price}
                  onChange={(e) => setProductForm((p) => ({ ...p, price: e.target.value }))}
                  required
                />
              </label>
              <label>
                الكمية المتاحة
                <input
                  type="number"
                  min="0"
                  value={productForm.stock_quantity}
                  onChange={(e) => setProductForm((p) => ({ ...p, stock_quantity: e.target.value }))}
                  required
                />
              </label>
              <label>
                Badge
                <input
                  type="text"
                  placeholder="Premium"
                  value={productForm.badge}
                  onChange={(e) => setProductForm((p) => ({ ...p, badge: e.target.value }))}
                />
              </label>
              <label>
                الموديلات المتوافقة
                <textarea
                  rows="2"
                  placeholder="iPhone 15 Pro Max, iPhone 15 Pro"
                  value={productForm.compatible_models}
                  onChange={(e) => setProductForm((p) => ({ ...p, compatible_models: e.target.value }))}
                ></textarea>
              </label>
              <label>
                الوصف
                <textarea
                  rows="3"
                  value={productForm.description}
                  onChange={(e) => setProductForm((p) => ({ ...p, description: e.target.value }))}
                  required
                ></textarea>
              </label>
              <label>
                صورة رئيسية (ملف)
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                />
              </label>
              <label>
                أو رابط صورة رئيسية
                <input
                  type="text"
                  value={productForm.image}
                  onChange={(e) => setProductForm((p) => ({ ...p, image: e.target.value }))}
                />
              </label>
              <label>
                مميز في المتجر
                <select
                  value={productForm.featured}
                  onChange={(e) => setProductForm((p) => ({ ...p, featured: e.target.value }))}
                >
                  <option value="false">لا</option>
                  <option value="true">نعم</option>
                </select>
              </label>
              <button className="button button-primary" type="submit">حفظ المنتج</button>
            </form>
          </section>

          {/* Products List */}
          <section className="admin-card">
            <h2>المنتجات ({products.length})</h2>
            <div className="admin-list" style={{ maxHeight: "600px", overflowY: "auto" }}>
              {products.map((prod) => (
                <div key={prod.id} style={{ display: "flex", gap: "10px", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <img src={prod.image} alt="" style={{ width: "40px", height: "40px", borderRadius: "4px", objectFit: "cover" }} />
                    <div>
                      <strong style={{ display: "block", fontSize: "14px" }}>{prod.name}</strong>
                      <span style={{ fontSize: "12px", opacity: 0.6 }}>{prod.category} | {prod.price} EGP</span>
                    </div>
                  </div>
                  <button className="button button-secondary button-small" onClick={() => editProduct(prod)}>تعديل</button>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Detailed lists (Orders, Customers, Reviews, Complaints) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "32px", marginTop: "32px" }}>
          {/* Orders */}
          <section className="admin-card">
            <h2>الأوردرات ({ordersList.length})</h2>
            <div className="admin-list" style={{ maxHeight: "400px", overflowY: "auto" }}>
              {ordersList.map((order) => (
                <div key={order.id} style={{ padding: "16px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                  <div>
                    <strong>طلب #{String(order.id).slice(0, 8)}</strong>
                    <br />
                    <span>العميل: {order.customer?.name || "بدون اسم"} | {order.customer?.phone || ""}</span>
                    <br />
                    <small style={{ opacity: 0.7 }}>
                      العنوان: {order.customer?.address || ""} {order.customer?.city || ""}
                    </small>
                    <br />
                    <small style={{ opacity: 0.6 }}>
                      العناصر: {order.items?.map((item) => `${item.name || item.id} × ${item.quantity || 1}`).join(", ")}
                    </small>
                  </div>
                  <div style={{ textAlign: "left" }}>
                    <strong>{Number(order.grand_total || order.total || 0).toLocaleString("ar-EG")} EGP</strong>
                    <div style={{ marginTop: "8px", display: "flex", gap: "8px", alignItems: "center" }}>
                      <select
                        value={order.status}
                        onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                        style={{ padding: "4px", fontSize: "12px", background: "none", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "4px", color: "#fff" }}
                      >
                        {ORDER_STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Customers */}
          <section className="admin-card">
            <h2>العملاء المسجلين ({customersList.length})</h2>
            <div className="admin-list" style={{ maxHeight: "300px", overflowY: "auto" }}>
              {customersList.map((cust) => (
                <div key={cust.id} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", alignItems: "center" }}>
                  <div>
                    <strong>{cust.name}</strong> (@{cust.username})
                    <br />
                    <span style={{ fontSize: "13px", opacity: 0.7 }}>{cust.email} | {cust.phone}</span>
                  </div>
                  <span style={{ fontSize: "12px", opacity: 0.6 }}>سجل: {new Date(cust.created_at).toLocaleDateString("ar-EG")}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Complaints */}
          <section className="admin-card">
            <h2>الشكاوى والمتابعات ({events.complaints?.length || 0})</h2>
            <div className="admin-list" style={{ maxHeight: "300px", overflowY: "auto" }}>
              {(events.complaints || []).map((comp) => (
                <div key={comp.id} style={{ padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <strong>{comp.name} | {comp.phone}</strong>
                    <small style={{ opacity: 0.6 }}>الطلب: {comp.order_ref || "بدون"}</small>
                  </div>
                  <p style={{ margin: "6px 0", fontSize: "14px", opacity: 0.85 }}>{comp.message}</p>
                  <small style={{ opacity: 0.6 }}>سجلت: {new Date(comp.created_at).toLocaleString("ar-EG")}</small>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
