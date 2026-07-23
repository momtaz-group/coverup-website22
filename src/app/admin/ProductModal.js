import React, { useState } from "react";
import { brandsData, FAMOUS_COLORS } from "@/utils/brandsData";
import { supabase } from "@/utils/supabase";
import { getSectionType } from "@/utils/section-utils";

export default function ProductModal({ form, setForm, imageFile, setImageFile, galleryFiles, setGalleryFiles, sections, setSections, categories = [], onSubmit, onClose }) {
  const [newSection, setNewSection] = useState("");
  const [newColorHex, setNewColorHex] = useState("#000000");
  const [newColorName, setNewColorName] = useState("");
  const [customModelInput, setCustomModelInput] = useState("");

  const sectionType = getSectionType(form.category, categories.length ? categories : sections);
  const isScreenProtector = sectionType === "screen_protectors";

  const selectedBrand = brandsData.find(b => b.brand === form.brand) || null;
  const selectedFamily = selectedBrand?.families.find(f => f.family === form.product_family) || null;

  const handleAddSection = async () => {
    if (!newSection.trim()) return;
    const name = newSection.trim();
    if (sections.includes(name)) {
      setForm({ ...form, category: name });
      setNewSection("");
      return;
    }
    // save to DB
    await supabase.from("product_sections").insert([{ name }]);
    setSections([...sections, name]);
    setForm({ ...form, category: name });
    setNewSection("");
  };

  const handleAddColor = (colorObj) => {
    // colorObj: { name, hex }
    if (!form.colors.some(c => c.hex === colorObj.hex)) {
      setForm({ ...form, colors: [...form.colors, colorObj] });
    }
  };

  const handleRemoveColor = (hex) => {
    setForm({ ...form, colors: form.colors.filter(c => c.hex !== hex) });
  };

  const handleToggleModel = (model) => {
    const current = form.compatible_models || [];
    if (current.includes(model)) {
      setForm({ ...form, compatible_models: current.filter(m => m !== model) });
    } else {
      setForm({ ...form, compatible_models: [...current, model] });
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000, padding: "20px", boxSizing: "border-box" }}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "800px", width: "100%", maxHeight: "90vh", overflowY: "auto", padding: 0, borderRadius: "20px", display: "flex", flexDirection: "column" }}>
        <div className="modal-header" style={{ padding: "20px 24px", borderBottom: "1px solid var(--line)", position: "sticky", top: 0, background: "var(--panel)", zIndex: 10, display: "flex", justifyContent: "space-between", alignItems: "center", borderRadius: "20px 20px 0 0" }}>
          <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: "bold" }}>{form.id ? "تعديل المنتج" : "إضافة منتج جديد"}</h2>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "var(--muted)" }}>×</button>
        </div>
        
        <form onSubmit={onSubmit} style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "32px" }}>
          
          {/* Main Picture Upload with dimensions like product card */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
            <label style={{ width: "100%", textAlign: "center", fontSize: "0.95rem", fontWeight: "600" }}>الصورة الأساسية (Main Picture)</label>
            <div style={{ position: "relative", width: "220px", height: "280px", borderRadius: "16px", background: "var(--panel-soft)", border: "2px dashed var(--line)", display: "flex", justifyContent: "center", alignItems: "center", overflow: "hidden", cursor: "pointer" }}>
              {(imageFile || form.image) ? (
                <img src={imageFile ? URL.createObjectURL(imageFile) : form.image} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", padding: "16px" }} />
              ) : (
                <span style={{ color: "var(--muted)", fontSize: "0.9rem" }}>اضغط لرفع الصورة</span>
              )}
              {form.name && (
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "12px", background: "linear-gradient(to bottom, rgba(0,0,0,0.5), transparent)", color: "#fff", textAlign: "center", fontWeight: "bold", fontSize: "1rem" }}>
                  {form.name}
                </div>
              )}
              <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }} />
            </div>
            
            {/* More Photos */}
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "8px", marginTop: "16px" }}>
              <label style={{ fontSize: "0.9rem", fontWeight: "600" }}>صور إضافية للمنتج (Gallery)</label>
              <input type="file" accept="image/*" multiple onChange={(e) => setGalleryFiles([...galleryFiles, ...Array.from(e.target.files)])} style={{ padding: "8px", border: "1px solid var(--line)", borderRadius: "8px" }} />
              {(galleryFiles.length > 0 || (form.images && form.images.length > 0)) && (
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "8px" }}>
                  {(form.images || []).map((img, i) => (
                    <img key={`old-${i}`} src={img} alt="" style={{ width: "60px", height: "60px", objectFit: "cover", borderRadius: "8px", border: "1px solid var(--line)" }} />
                  ))}
                  {galleryFiles.map((f, i) => (
                    <img key={`new-${i}`} src={URL.createObjectURL(f)} alt="" style={{ width: "60px", height: "60px", objectFit: "cover", borderRadius: "8px", border: "1px solid var(--line)" }} />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontWeight: "600" }}>
              اسم المنتج
              <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--panel-soft)", color: "var(--text)" }} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontWeight: "600" }}>
              القسم (Section / Type)
              <div style={{ display: "flex", gap: "8px" }}>
                <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--panel-soft)", color: "var(--text)" }}>
                  <option value="">-- اختر القسم --</option>
                  {sections.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <div style={{ display: "flex", gap: "4px" }}>
                  <input type="text" placeholder="قسم جديد" value={newSection} onChange={e => setNewSection(e.target.value)} style={{ width: "100px", padding: "8px", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--panel-soft)", color: "var(--text)" }} />
                  <button type="button" onClick={handleAddSection} style={{ padding: "0 12px", borderRadius: "8px", border: "none", background: "var(--blue)", color: "#fff", cursor: "pointer", fontWeight: "bold" }}>+</button>
                </div>
              </div>
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontWeight: "600" }}>
              SKU
              <input type="text" value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--panel-soft)", color: "var(--text)" }} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontWeight: "600" }}>
              السعر (EGP)
              <input type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})} required style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--panel-soft)", color: "var(--text)" }} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontWeight: "600" }}>
              الكمية بالمخزن (Stock)
              <input type="number" min="0" value={form.stock_quantity} onChange={e => setForm({...form, stock_quantity: e.target.value})} required style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--panel-soft)", color: "var(--text)" }} />
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontWeight: "600" }}>
              شارة المنتج (Badge)
              <input type="text" placeholder="جديد / الأكثر مبيعاً" value={form.badge} onChange={e => setForm({...form, badge: e.target.value})} style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--panel-soft)", color: "var(--text)" }} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontWeight: "600" }}>
              كلمات مفتاحية (Tags - يفصل بينها بفاصلة)
              <input type="text" placeholder="عصري, شفاف, ضد الكسر..." value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--panel-soft)", color: "var(--text)" }} />
            </label>
          </div>

          <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontWeight: "600" }}>
            وصف المنتج
            <textarea rows="3" value={form.description} onChange={e => setForm({...form, description: e.target.value})} required style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--panel-soft)", color: "var(--text)", resize: "vertical" }} />
          </label>

          {/* Brands & Models Hierarchy (Hidden for Screen Protectors) */}
          {!isScreenProtector && (
            <div style={{ padding: "20px", background: "var(--panel-soft)", borderRadius: "16px", border: "1px solid var(--line)" }}>
              <h3 style={{ margin: "0 0 16px 0", fontSize: "1rem" }}>الأجهزة المتوافقة (Brand & Models)</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontWeight: "600" }}>
                  الماركة (Brand)
                  <select value={form.brand} onChange={e => setForm({...form, brand: e.target.value, product_family: "", compatible_models: []})} style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--panel)", color: "var(--text)" }}>
                    <option value="">-- اختر الماركة --</option>
                    {brandsData.map(b => <option key={b.brand} value={b.brand}>{b.brand}</option>)}
                  </select>
                </label>
                
                <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontWeight: "600" }}>
                  نوع المنتج (Product Family)
                  <select value={form.product_family} onChange={e => setForm({...form, product_family: e.target.value, compatible_models: []})} disabled={!form.brand} style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--panel)", color: "var(--text)" }}>
                    <option value="">-- اختر نوع المنتج --</option>
                    {selectedBrand?.families.map(f => <option key={f.family} value={f.family}>{f.family}</option>)}
                  </select>
                </label>
              </div>

              {selectedFamily && (
                <div style={{ marginTop: "20px" }}>
                  <label style={{ display: "flex", flexDirection: "column", gap: "10px", fontWeight: "600" }}>
                    الموديلات المتوافقة (Models) - يمكنك اختيار أكثر من موديل
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", padding: "16px", background: "var(--panel)", borderRadius: "8px", border: "1px solid var(--line)", maxHeight: "200px", overflowY: "auto" }}>
                      {selectedFamily.models.map(model => {
                        const isSelected = form.compatible_models.includes(model);
                        return (
                          <button
                            key={model}
                            type="button"
                            onClick={() => handleToggleModel(model)}
                            style={{
                              padding: "6px 12px",
                              borderRadius: "20px",
                              fontSize: "0.85rem",
                              cursor: "pointer",
                              transition: "all 0.2s",
                              border: isSelected ? "1px solid var(--blue)" : "1px solid var(--line)",
                              background: isSelected ? "rgba(18,103,232,0.1)" : "transparent",
                              color: isSelected ? "var(--blue)" : "var(--text)"
                            }}
                          >
                            {model}
                          </button>
                        );
                      })}
                    </div>
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Compatible Devices Tag Form Section for Screen Protectors */}
          {isScreenProtector && (
            <div style={{ padding: "20px", background: "var(--panel-soft)", borderRadius: "16px", border: "1px solid var(--blue)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <h3 style={{ margin: 0, fontSize: "1rem", color: "var(--blue)", fontWeight: "bold" }}>الأجهزة المتوافقة (Compatible Phone Models)</h3>
                {(form.compatible_models || []).length > 0 && (
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, compatible_models: [] })}
                    style={{ background: "none", border: "none", color: "#ff4d4d", fontSize: "0.85rem", cursor: "pointer", fontWeight: "bold" }}
                  >
                    مسح التاجات
                  </button>
                )}
              </div>

              <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
                <input
                  type="text"
                  placeholder="أدخل اسم هاتف متوافق (مثال: iPhone 15 Pro)"
                  value={customModelInput}
                  onChange={e => setCustomModelInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (customModelInput.trim()) {
                        const m = customModelInput.trim();
                        if (!form.compatible_models.includes(m)) {
                          setForm({ ...form, compatible_models: [...form.compatible_models, m] });
                        }
                        setCustomModelInput("");
                      }
                    }
                  }}
                  style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--panel)", color: "var(--text)" }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customModelInput.trim()) {
                      const m = customModelInput.trim();
                      if (!form.compatible_models.includes(m)) {
                        setForm({ ...form, compatible_models: [...form.compatible_models, m] });
                      }
                      setCustomModelInput("");
                    }
                  }}
                  style={{ padding: "0 16px", borderRadius: "8px", border: "none", background: "var(--blue)", color: "#fff", cursor: "pointer", fontWeight: "bold" }}
                >
                  إضافة
                </button>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", padding: "12px", background: "var(--panel)", borderRadius: "8px", border: "1px solid var(--line)", minHeight: "50px", alignItems: "center" }}>
                {(form.compatible_models || []).length > 0 ? (
                  form.compatible_models.map((model) => (
                    <span
                      key={model}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "6px 12px",
                        borderRadius: "20px",
                        background: "rgba(18,103,232,0.1)",
                        border: "1px solid var(--blue)",
                        color: "var(--blue)",
                        fontWeight: "600",
                        fontSize: "0.85rem"
                      }}
                    >
                      {model}
                      <button
                        type="button"
                        onClick={() => handleToggleModel(model)}
                        style={{ background: "none", border: "none", color: "var(--blue)", cursor: "pointer", fontWeight: "bold", fontSize: "1rem", lineHeight: 1 }}
          {/* Colors System (Hidden for Screen Protectors) */}
          {!isScreenProtector && (
            <div style={{ padding: "20px", background: "var(--panel-soft)", borderRadius: "16px", border: "1px solid var(--line)" }}>
              <h3 style={{ margin: "0 0 16px 0", fontSize: "1rem" }}>الألوان المتاحة</h3>
              
              {/* Selected Colors List */}
              {form.colors && form.colors.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
                  {form.colors.map((c, index) => {
                    const availableImages = [];
                    if (form.image) availableImages.push({ id: form.image, src: form.image, label: "الأساسية" });
                    (form.images || []).forEach((img, i) => availableImages.push({ id: img, src: img, label: `إضافية ${i+1}` }));
                    if (imageFile) availableImages.push({ id: imageFile.name, src: URL.createObjectURL(imageFile), label: "الأساسية (جديدة)" });
                    (galleryFiles || []).forEach((f, i) => availableImages.push({ id: f.name, src: URL.createObjectURL(f), label: `إضافية ${i+1} (جديدة)` }));

                    const selectedImageIds = c.images || (c.image ? [c.image] : []);

                    return (
                      <div key={c.hex || c.name || index} style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "16px", background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: c.hex || "#ccc", border: "1px solid rgba(0,0,0,0.1)" }} />
                          <span style={{ fontSize: "1rem", fontWeight: "bold", flex: 1 }}>{c.name || c}</span>
                          <button type="button" onClick={() => handleRemoveColor(c.hex || c)} style={{ background: "none", border: "none", color: "#ff4d4d", cursor: "pointer", padding: "4px", fontSize: "1.2rem" }}>
                            ×
                          </button>
                        </div>
                        
                        {availableImages.length > 0 ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
                            <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--muted)" }}>اربط الصور بهذا اللون:</span>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
                              {availableImages.map((img, imgIdx) => (
                                <label key={`${img.id}-${imgIdx}`} style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", background: "var(--input-bg)", padding: "4px 10px", borderRadius: "8px", border: selectedImageIds.includes(img.id) ? "1px solid #0070f3" : "1px solid var(--line)" }}>
                                  <input 
                                    type="checkbox" 
                                    checked={selectedImageIds.includes(img.id)}
                                    onChange={(e) => {
                                      const isChecked = e.target.checked;
                                      const nextImages = isChecked ? [...selectedImageIds, img.id] : selectedImageIds.filter(id => id !== img.id);
                                      const newColors = [...form.colors];
                                      newColors[index] = { ...c, image: nextImages[0] || null, images: nextImages };
                                      setForm({ ...form, colors: newColors });
                                    }}
                                    style={{ display: "none" }}
                                  />
                                  <img src={img.src} alt="" style={{ width: "24px", height: "24px", objectFit: "cover", borderRadius: "4px" }} />
                                  <span style={{ fontSize: "0.8rem", color: selectedImageIds.includes(img.id) ? "#0070f3" : "var(--text)" }}>{img.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>قم برفع صور للمنتج أولاً لربطها بهذا اللون.</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                <div>
                  <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontWeight: "600", fontSize: "0.9rem" }}>إضافة من الألوان الشائعة</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
                    {FAMOUS_COLORS.map(c => (
                      <button
                        key={c.hex}
                        type="button"
                        title={c.labelAr}
                        onClick={() => handleAddColor({ name: c.labelAr, hex: c.hex })}
                        style={{
                          width: "32px", height: "32px", borderRadius: "50%", cursor: "pointer",
                          background: c.hex, border: "1px solid var(--line)",
                          boxShadow: form.colors.some(col => col.hex === c.hex) ? "0 0 0 2px var(--panel), 0 0 0 4px var(--blue)" : "none"
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontWeight: "600", fontSize: "0.9rem" }}>أو إضافة لون مخصص</label>
                  <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                    <input type="color" value={newColorHex} onChange={e => setNewColorHex(e.target.value)} style={{ width: "40px", height: "40px", padding: 0, border: "none", borderRadius: "8px", cursor: "pointer" }} />
                    <input type="text" placeholder="اسم اللون (مثل: أزرق بحري)" value={newColorName} onChange={e => setNewColorName(e.target.value)} style={{ flex: 1, padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--panel)" }} />
                    <button type="button" onClick={() => { if(newColorName.trim()) { handleAddColor({ name: newColorName, hex: newColorHex }); setNewColorName(""); } }} style={{ padding: "0 16px", borderRadius: "8px", border: "none", background: "var(--text)", color: "var(--bg)", cursor: "pointer" }}>إضافة</button>
                  </div>
                </div>
              </div>
            </div>
          )}yle={{ flex: 1, padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--panel)" }} />
                  <button type="button" onClick={() => { if(newColorName.trim()) { handleAddColor({ name: newColorName, hex: newColorHex }); setNewColorName(""); } }} style={{ padding: "0 16px", borderRadius: "8px", border: "none", background: "var(--text)", color: "var(--bg)", cursor: "pointer" }}>إضافة</button>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "20px", paddingTop: "20px", borderTop: "1px solid var(--line)" }}>
            <button type="button" onClick={onClose} style={{ padding: "12px 24px", borderRadius: "10px", border: "1px solid var(--line)", background: "transparent", color: "var(--text)", cursor: "pointer", fontWeight: "bold" }}>إلغاء</button>
            <button type="submit" className="primary-black-btn" style={{ padding: "12px 32px", borderRadius: "10px" }}>حفظ بيانات المنتج</button>
          </div>

        </form>
      </div>
    </div>
  );
}
