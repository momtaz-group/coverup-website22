"use client";

import { useState, useEffect, useMemo } from "react";

export default function FeaturedProductsTab({ setStatusMessage }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Settings state
  const [mode, setMode] = useState("custom"); // 'most_sold' | 'custom'
  const [count, setCount] = useState(8);
  const [selectedProductIds, setSelectedProductIds] = useState([]);

  // Data state
  const [allProducts, setAllProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");
  const [modalSelectedIds, setModalSelectedIds] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch all products for selection modal
      const prodRes = await fetch("/api/store-products?admin=1");
      const prodData = await prodRes.json().catch(() => ({}));
      if (prodRes.ok && Array.isArray(prodData.products)) {
        setAllProducts(prodData.products.filter((p) => p.status !== "hidden"));
      }

      // Fetch categories for filtering
      const catRes = await fetch("/api/store-categories");
      const catData = await catRes.json().catch(() => ({}));
      if (catRes.ok && Array.isArray(catData.categories)) {
        setCategories(catData.categories);
      }

      // Fetch featured products config
      const featRes = await fetch("/api/featured-products");
      const featData = await featRes.json().catch(() => ({}));
      if (featRes.ok && featData.config) {
        setMode(featData.config.mode || "custom");
        setCount(Math.min(25, Math.max(1, Number(featData.config.count) || 8)));
        setSelectedProductIds(Array.isArray(featData.config.product_ids) ? featData.config.product_ids : []);
      }
    } catch (err) {
      console.error("Error loading featured products data:", err);
      setStatusMessage("فشل تحميل إعدادات المنتجات المميزة.");
    } finally {
      setLoading(false);
    }
  };

  // Map of products by ID
  const productMap = useMemo(() => {
    return new Map(allProducts.map((p) => [p.id, p]));
  }, [allProducts]);

  // Selected products array in exact rank order
  const selectedProductsList = useMemo(() => {
    return selectedProductIds.map((id) => productMap.get(id)).filter(Boolean);
  }, [selectedProductIds, productMap]);

  // Move product in rank order
  const moveProduct = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= selectedProductIds.length) return;
    const next = [...selectedProductIds];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setSelectedProductIds(next);
  };

  // Remove product from selected list
  const removeProduct = (id) => {
    setSelectedProductIds((prev) => prev.filter((pId) => pId !== id));
  };

  // Modal open handler
  const handleOpenModal = () => {
    setModalSelectedIds([...selectedProductIds]);
    setSearchQuery("");
    setSelectedCategoryFilter("all");
    setModalOpen(true);
  };

  // Toggle item in modal
  const handleToggleModalItem = (id) => {
    setModalSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Apply modal selection
  const handleApplyModalSelection = () => {
    setSelectedProductIds(modalSelectedIds);
    setModalOpen(false);
  };

  // Filtered products inside modal
  const modalFilteredProducts = useMemo(() => {
    return allProducts.filter((p) => {
      const matchSearch =
        !searchQuery.trim() ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.category || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.brand || "").toLowerCase().includes(searchQuery.toLowerCase());

      const matchCategory =
        selectedCategoryFilter === "all" ||
        String(p.category || "").toLowerCase() === selectedCategoryFilter.toLowerCase();

      return matchSearch && matchCategory;
    });
  }, [allProducts, searchQuery, selectedCategoryFilter]);

  // Save config handler
  const handleSaveConfig = async () => {
    setSaving(true);
    setStatusMessage("جارٍ حفظ إعدادات المنتجات المميزة...");
    try {
      const res = await fetch("/api/featured-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          count: Number(count),
          product_ids: selectedProductIds,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "فشل حفظ البيانات.");
      }

      setStatusMessage("تم حفظ إعدادات وترتيب المنتجات المميزة بنجاح!");
    } catch (err) {
      setStatusMessage(err.message || "تعذر حفظ البيانات.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="tab-pane" style={{ padding: "40px", textAlign: "center" }}>
        <p style={{ color: "#666", fontWeight: "bold" }}>جارٍ تحميل إعدادات المنتجات المميزة...</p>
      </div>
    );
  }

  return (
    <div className="tab-pane">
      <div className="pane-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2>إدارة قسم المنتجات المميزة (Featured Products)</h2>
          <p>التحكم في طريقة عرض وترتيب المنتجات المميزة بالصفحة الرئيسية للمتجر.</p>
        </div>
        <button
          type="button"
          className="primary-black-btn"
          onClick={handleSaveConfig}
          disabled={saving}
          style={{ background: "#0070f3", color: "#fff", padding: "10px 20px", borderRadius: "10px", fontSize: "0.9rem", fontWeight: "bold" }}
        >
          {saving ? "جارٍ الحفظ..." : "حفظ التغييرات"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "24px", marginTop: "20px" }}>
        {/* Left Box: Display Settings */}
        <div style={{ background: "var(--panel)", padding: "24px", borderRadius: "16px", border: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: "20px" }}>
          <h3 style={{ margin: 0, fontSize: "1.1rem", color: "var(--gold)" }}>1. طريقة تحديد المنتجات</h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px", borderRadius: "12px", border: mode === "most_sold" ? "2px solid #0070f3" : "1px solid var(--line)", background: mode === "most_sold" ? "rgba(0, 112, 243, 0.05)" : "transparent", cursor: "pointer" }}>
              <input type="radio" name="featured_mode" checked={mode === "most_sold"} onChange={() => setMode("most_sold")} />
              <div>
                <strong style={{ display: "block", fontSize: "0.95rem" }}>الأكثر مبيعاً تلقائياً (Most Sold Metrics)</strong>
                <span style={{ fontSize: "0.8rem", color: "#666" }}>يعتمد على إحصائيات المبيعات المحسوبة تلقائياً من الطلبات المستلمة.</span>
              </div>
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px", borderRadius: "12px", border: mode === "custom" ? "2px solid #0070f3" : "1px solid var(--line)", background: mode === "custom" ? "rgba(0, 112, 243, 0.05)" : "transparent", cursor: "pointer" }}>
              <input type="radio" name="featured_mode" checked={mode === "custom"} onChange={() => setMode("custom")} />
              <div>
                <strong style={{ display: "block", fontSize: "0.95rem" }}>منتجات مخصصة وتحديد يدوي (Custom Selected Products)</strong>
                <span style={{ fontSize: "0.8rem", color: "#666" }}>تحديد المنتجات وترتيب ظهورها يدوياً بالرتب والترتيب المطلوب.</span>
              </div>
            </label>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label style={{ fontWeight: "bold", fontSize: "0.9rem" }}>عدد الكروت المعروضة في الصفحة (من 1 إلى 25):</label>
              <span style={{ fontWeight: "bold", color: "#0070f3", fontSize: "1.1rem" }}>{count} منتجات</span>
            </div>
            <input
              type="range"
              min="1"
              max="25"
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              style={{ width: "100%", accentColor: "#0070f3", cursor: "pointer" }}
            />
          </div>
        </div>

        {/* Right Box: Custom Products Manager */}
        <div style={{ background: "var(--panel)", padding: "24px", borderRadius: "16px", border: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0, fontSize: "1.1rem", color: "var(--gold)" }}>2. المنتجات المختارة والترتيب</h3>
            {mode === "custom" && (
              <button
                type="button"
                onClick={handleOpenModal}
                style={{ padding: "8px 14px", borderRadius: "8px", border: "none", background: "#0070f3", color: "#fff", fontWeight: "bold", fontSize: "0.85rem", cursor: "pointer" }}
              >
                + إضافة / تعديل المنتجات
              </button>
            )}
          </div>

          {mode === "most_sold" ? (
            <div style={{ padding: "20px", background: "var(--panel-soft)", borderRadius: "12px", textAlign: "center", color: "#666", fontSize: "0.9rem" }}>
              ⚡ يتم حساب المنتجات الأكثر مبيعاً تلقائياً وعرض أعلى <strong>{count}</strong> منتجات في الصفحة الرئيسية.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "420px", overflowY: "auto", paddingRight: "4px" }}>
              {selectedProductsList.length === 0 ? (
                <div style={{ padding: "30px", textAlign: "center", border: "2px dashed var(--line)", borderRadius: "12px" }}>
                  <p style={{ color: "#888", margin: 0 }}>لم تظف أي منتجات بعد.</p>
                  <button type="button" onClick={handleOpenModal} style={{ marginTop: "10px", padding: "8px 16px", borderRadius: "8px", background: "#0070f3", color: "#fff", border: "none", cursor: "pointer" }}>
                    + أضف منتجات الآن
                  </button>
                </div>
              ) : (
                selectedProductsList.slice(0, count).map((prod, index) => (
                  <div
                    key={prod.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "10px 14px",
                      background: "var(--panel-soft)",
                      borderRadius: "12px",
                      border: "1px solid var(--line)",
                    }}
                  >
                    <span style={{ fontWeight: "bold", background: "#0070f3", color: "#fff", width: "26px", height: "26px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", flexShrink: 0 }}>
                      #{index + 1}
                    </span>

                    <img src={prod.image} alt="" style={{ width: "40px", height: "40px", objectFit: "contain", borderRadius: "6px", background: "#fff" }} />

                    <div style={{ flex: 1, overflow: "hidden" }}>
                      <strong style={{ display: "block", fontSize: "0.85rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{prod.name}</strong>
                      <small style={{ color: "#666" }}>{prod.category} | {prod.price} EGP</small>
                    </div>

                    <div style={{ display: "flex", gap: "4px" }}>
                      <button
                        type="button"
                        onClick={() => moveProduct(index, index - 1)}
                        disabled={index === 0}
                        title="تحريك للأعلى"
                        style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid var(--line)", background: "transparent", cursor: index === 0 ? "not-allowed" : "pointer" }}
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => moveProduct(index, index + 1)}
                        disabled={index === selectedProductsList.slice(0, count).length - 1}
                        title="تحريك للأسفل"
                        style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid var(--line)", background: "transparent", cursor: index === selectedProductsList.slice(0, count).length - 1 ? "not-allowed" : "pointer" }}
                      >
                        ▼
                      </button>
                      <button
                        type="button"
                        onClick={() => removeProduct(prod.id)}
                        title="إزالة"
                        style={{ padding: "4px 8px", borderRadius: "4px", border: "none", background: "#ff4d4d", color: "#fff", cursor: "pointer" }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modern Pop-up Modal for Product Selection */}
      {modalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ background: "#ffffff", borderRadius: "20px", width: "100%", maxWidth: "850px", maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 20px 50px rgba(0,0,0,0.3)" }}>
            {/* Modal Header */}
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: "bold" }}>اختر المنتجات المميزة (Select Featured Products)</h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "#64748b" }}>ابحث وقم بتحديد المنتجات المطلوبة. الترتيب يظهر حسب أولوية تحديدك.</p>
              </div>
              <button type="button" onClick={() => setModalOpen(false)} style={{ background: "transparent", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "#64748b" }}>
                ×
              </button>
            </div>

            {/* Filters Bar */}
            <div style={{ padding: "16px 24px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", gap: "16px", flexWrap: "wrap" }}>
              <input
                type="text"
                placeholder="ابحث بالاسم أو الماركة أو القسم..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ flex: 1, minWidth: "220px", padding: "10px 14px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
              />

              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                style={{ padding: "10px 14px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "0.9rem", background: "#fff" }}
              >
                <option value="all">جميع الأقسام</option>
                {categories.map((c) => (
                  <option key={c.id || c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Modal Body: Products Grid */}
            <div style={{ padding: "20px 24px", flex: 1, overflowY: "auto", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px" }}>
              {modalFilteredProducts.map((prod) => {
                const isSelected = modalSelectedIds.includes(prod.id);
                const rankIndex = modalSelectedIds.indexOf(prod.id);

                return (
                  <div
                    key={prod.id}
                    onClick={() => handleToggleModalItem(prod.id)}
                    style={{
                      border: isSelected ? "2px solid #0070f3" : "1px solid #e2e8f0",
                      background: isSelected ? "rgba(0, 112, 243, 0.04)" : "#fff",
                      borderRadius: "14px",
                      padding: "12px",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                      position: "relative",
                      transition: "all 0.2s",
                    }}
                  >
                    {isSelected && (
                      <span style={{ position: "absolute", top: "10px", left: "10px", background: "#0070f3", color: "#fff", width: "24px", height: "24px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: "bold", zIndex: 2 }}>
                        #{rankIndex + 1}
                      </span>
                    )}

                    <div style={{ width: "100%", height: "120px", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", borderRadius: "10px", overflow: "hidden" }}>
                      <img src={prod.image} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <strong style={{ fontSize: "0.85rem", color: "#0f172a", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.3 }}>{prod.name}</strong>
                      <span style={{ fontSize: "0.75rem", color: "#64748b" }}>{prod.category}</span>
                      <strong style={{ fontSize: "0.85rem", color: "#0070f3", marginTop: "4px" }}>{prod.price} EGP</strong>
                    </div>
                  </div>
                );
              })}

              {modalFilteredProducts.length === 0 && (
                <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px", color: "#64748b" }}>
                  لا توجد منتجات مطابقة لخيارات البحث.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: "16px 24px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
              <span style={{ fontSize: "0.9rem", color: "#0f172a", fontWeight: "bold" }}>
                تم تحديد <strong>{modalSelectedIds.length}</strong> منتج
              </span>
              <div style={{ display: "flex", gap: "10px" }}>
                <button type="button" onClick={() => setModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "10px", border: "1px solid #cbd5e1", background: "#fff", fontWeight: "bold", cursor: "pointer" }}>
                  إلغاء
                </button>
                <button type="button" onClick={handleApplyModalSelection} style={{ padding: "10px 22px", borderRadius: "10px", border: "none", background: "#0070f3", color: "#fff", fontWeight: "bold", cursor: "pointer" }}>
                  تأكيد واختيار المنتجات
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
