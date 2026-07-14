import React, { useState } from "react";
import { brandsData, FAMOUS_COLORS } from "@/utils/brandsData";
import { supabase } from "@/utils/supabase";

export default function ProductEditor({ form, setForm, imageFile, setImageFile, galleryFiles, setGalleryFiles, sections, setSections, onSubmit, onDelete, onClose }) {
  const [customModelInput, setCustomModelInput] = useState("");
  const [newColorHex, setNewColorHex] = useState("#000000");
  const [newColorName, setNewColorName] = useState("");

  const selectedBrand = brandsData.find(b => b.brand === form.brand) || null;
  const selectedFamily = selectedBrand?.families.find(f => f.family === form.product_family) || null;

  const handleAddCustomModel = () => {
    if (!customModelInput.trim()) return;
    const model = customModelInput.trim();
    const current = form.compatible_models || [];
    if (!current.includes(model)) {
      setForm({ ...form, compatible_models: [...current, model] });
    }
    setCustomModelInput("");
  };

  const handleAddColor = (colorObj) => {
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

  const removeMainImageFile = () => setImageFile(null);
  const removeMainImageUrl = () => setForm({ ...form, image: "" });
  const removeGalleryFile = (index) => {
    const newFiles = [...galleryFiles];
    newFiles.splice(index, 1);
    setGalleryFiles(newFiles);
  };
  const removeGalleryUrl = (index) => {
    const newImages = [...(form.images || [])];
    newImages.splice(index, 1);
    setForm({ ...form, images: newImages });
  };

  const mainImageSource = imageFile ? URL.createObjectURL(imageFile) : form.image;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", padding: "24px", background: "#fff", borderRadius: "16px", border: "1px solid var(--line)" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)", paddingBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button type="button" onClick={onClose} style={{ background: "var(--panel-soft)", border: "none", width: "40px", height: "40px", borderRadius: "50%", cursor: "pointer", fontSize: "1.2rem", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text)", transition: "all 0.2s" }}>
            &rarr;
          </button>
          <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: "bold" }}>{form.id ? "تعديل المنتج" : "إنشاء منتج جديد"}</h2>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          {form.id && (
            <button type="button" onClick={() => onDelete(form.id)} style={{ padding: "10px 20px", borderRadius: "8px", border: "1px solid #ff4d4d", background: "transparent", cursor: "pointer", fontWeight: "bold", color: "#ff4d4d" }}>
              حذف المنتج
            </button>
          )}
          <button type="button" onClick={onClose} style={{ padding: "10px 20px", borderRadius: "8px", border: "1px solid var(--line)", background: "#fff", cursor: "pointer", fontWeight: "bold", color: "var(--text)" }}>
            إلغاء
          </button>
          <button type="button" onClick={onSubmit} style={{ padding: "10px 24px", borderRadius: "8px", border: "none", background: "#0070f3", color: "#fff", cursor: "pointer", fontWeight: "bold", fontSize: "1rem" }}>
            حفظ المنتج
          </button>
        </div>
      </div>

      <form style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
        
        {/* Status & Name */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "20px" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "8px", fontWeight: "600" }}>
            حالة المنتج (Status)
            <select value={form.status || "public"} onChange={e => setForm({...form, status: e.target.value})} style={{ padding: "12px", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--panel-soft)", fontSize: "1rem", color: "var(--text)" }}>
              <option value="public">عام (مرئي ومتاح)</option>
              <option value="unavailable">غير متوفر (مرئي ولكن نفدت الكمية)</option>
              <option value="hidden">مخفي (غير مرئي في المتجر)</option>
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "8px", fontWeight: "600" }}>
            اسم المنتج
            <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required style={{ padding: "12px", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--panel-soft)", fontSize: "1rem", color: "var(--text)" }} />
          </label>
        </div>

        {/* Professional Image Manager */}
        <div style={{ padding: "20px", background: "var(--panel-soft)", borderRadius: "16px", border: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: "20px" }}>
          <h3 style={{ margin: 0, fontSize: "1.1rem" }}>إدارة الصور (Image Management)</h3>
          
          <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: "24px" }}>
            {/* Main Image Dropzone */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <span style={{ fontWeight: "600", fontSize: "0.9rem" }}>الصورة الأساسية (Main)</span>
              <div style={{ position: "relative", width: "100%", height: "280px", borderRadius: "16px", background: "#fff", border: "2px dashed var(--line)", display: "flex", justifyContent: "center", alignItems: "center", overflow: "hidden" }}>
                {mainImageSource ? (
                  <>
                    <img src={mainImageSource} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", padding: "8px" }} />
                    <button type="button" onClick={imageFile ? removeMainImageFile : removeMainImageUrl} style={{ position: "absolute", top: "10px", right: "10px", background: "#ff4d4d", color: "#fff", border: "none", width: "30px", height: "30px", borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>
                      ×
                    </button>
                  </>
                ) : (
                  <div style={{ textAlign: "center", color: "var(--muted)", padding: "20px" }}>
                    <div style={{ fontSize: "2rem", marginBottom: "8px" }}>📸</div>
                    <span style={{ fontSize: "0.9rem", fontWeight: "600" }}>اضغط أو اسحب صورة هنا</span>
                    <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }} />
                  </div>
                )}
              </div>
            </div>

            {/* Gallery Images */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <span style={{ fontWeight: "600", fontSize: "0.9rem" }}>الصور الإضافية (Gallery)</span>
              
              <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
                {/* Existing Images */}
                {(form.images || []).map((img, i) => (
                  <div key={`old-${i}`} style={{ position: "relative", width: "100px", height: "100px", borderRadius: "12px", border: "1px solid var(--line)", background: "#fff", overflow: "hidden" }}>
                    <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <button type="button" onClick={() => removeGalleryUrl(i)} style={{ position: "absolute", top: "4px", right: "4px", background: "rgba(255,77,77,0.9)", color: "#fff", border: "none", width: "24px", height: "24px", borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem" }}>×</button>
                  </div>
                ))}
                
                {/* New Files */}
                {galleryFiles.map((f, i) => (
                  <div key={`new-${i}`} style={{ position: "relative", width: "100px", height: "100px", borderRadius: "12px", border: "1px solid var(--line)", background: "#fff", overflow: "hidden" }}>
                    <img src={URL.createObjectURL(f)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <button type="button" onClick={() => removeGalleryFile(i)} style={{ position: "absolute", top: "4px", right: "4px", background: "rgba(255,77,77,0.9)", color: "#fff", border: "none", width: "24px", height: "24px", borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem" }}>×</button>
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: "0.6rem", textAlign: "center", padding: "2px" }}>جديد</div>
                  </div>
                ))}

                {/* Add More Button */}
                <div style={{ position: "relative", width: "100px", height: "100px", borderRadius: "12px", background: "#fff", border: "2px dashed var(--line)", display: "flex", justifyContent: "center", alignItems: "center", cursor: "pointer", transition: "all 0.2s" }}>
                  <div style={{ color: "var(--muted)", fontSize: "2rem" }}>+</div>
                  <input type="file" accept="image/*" multiple onChange={(e) => setGalleryFiles([...galleryFiles, ...Array.from(e.target.files)])} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Rest of properties */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontWeight: "600" }}>
            القسم (Section / Type)
            <input 
              type="text"
              list="sections-list"
              value={form.category || ""} 
              onChange={e => setForm({...form, category: e.target.value})} 
              placeholder="اكتب القسم أو اختر من القائمة"
              style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--line)", background: "#fff", color: "var(--text)" }} 
            />
            <datalist id="sections-list">
              {sections.map(s => <option key={s} value={s} />)}
            </datalist>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontWeight: "600" }}>
            SKU
            <input type="text" value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--panel-soft)", color: "var(--text)" }} />
          </label>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontWeight: "600" }}>
            السعر (EGP)
            <input type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})} required style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--panel-soft)", color: "var(--text)" }} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontWeight: "600" }}>
            الكمية بالمخزن (Stock)
            <input type="number" min="0" value={form.stock_quantity} onChange={e => setForm({...form, stock_quantity: e.target.value})} required style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--panel-soft)", color: "var(--text)" }} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontWeight: "600" }}>
            شارة المنتج (Badge)
            <input type="text" placeholder="جديد / الأكثر مبيعاً" value={form.badge} onChange={e => setForm({...form, badge: e.target.value})} style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--panel-soft)", color: "var(--text)" }} />
          </label>
        </div>

        <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontWeight: "600" }}>
          كلمات مفتاحية (Tags - يفصل بينها بفاصلة)
          <input type="text" placeholder="عصري, شفاف, ضد الكسر..." value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--panel-soft)", color: "var(--text)" }} />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontWeight: "600" }}>
          وصف المنتج
          <textarea rows="3" value={form.description} onChange={e => setForm({...form, description: e.target.value})} required style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--panel-soft)", color: "var(--text)", resize: "vertical" }} />
        </label>

        {/* Brands & Models Hierarchy */}
        <div style={{ padding: "20px", background: "var(--panel-soft)", borderRadius: "16px", border: "1px solid var(--line)" }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: "1.1rem" }}>الأجهزة المتوافقة (Brand & Models)</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontWeight: "600" }}>
              الماركة (Brand)
              <input 
                type="text"
                list="brands-list"
                value={form.brand || ""} 
                onChange={e => setForm({...form, brand: e.target.value})} 
                placeholder="اكتب الماركة أو اختر من القائمة"
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--line)", background: "#fff", color: "var(--text)" }} 
              />
              <datalist id="brands-list">
                {brandsData.map(b => <option key={b.brand} value={b.brand} />)}
              </datalist>
            </label>
            
            <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontWeight: "600" }}>
              نوع المنتج (Product Family)
              <input 
                type="text"
                list="families-list"
                value={form.product_family || ""} 
                onChange={e => setForm({...form, product_family: e.target.value})} 
                placeholder="اكتب نوع المنتج أو اختر من القائمة"
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--line)", background: "#fff", color: "var(--text)" }} 
              />
              <datalist id="families-list">
                {selectedBrand?.families.map(f => <option key={f.family} value={f.family} />)}
              </datalist>
            </label>
          </div>

          <div style={{ marginTop: "20px" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: "10px", fontWeight: "600" }}>
              الموديلات المتوافقة (Models) - يمكنك اختيار أكثر من موديل
              {Array.from(new Set([...(selectedFamily?.models || []), ...(form.compatible_models || [])])).length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", padding: "16px", background: "#fff", borderRadius: "8px", border: "1px solid var(--line)", maxHeight: "200px", overflowY: "auto" }}>
                  {Array.from(new Set([...(selectedFamily?.models || []), ...(form.compatible_models || [])])).map(model => {
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
                          border: isSelected ? "1px solid #0070f3" : "1px solid var(--line)",
                          background: isSelected ? "rgba(0, 112, 243, 0.1)" : "transparent",
                          color: isSelected ? "#0070f3" : "var(--text)"
                        }}
                      >
                        {model}
                      </button>
                    );
                  })}
                </div>
              )}
              <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                <input 
                  type="text" 
                  placeholder="أضف موديل يدوياً (مثال: iPhone 17)" 
                  value={customModelInput} 
                  onChange={e => setCustomModelInput(e.target.value)} 
                  style={{ flex: 1, padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--line)", background: "#fff", color: "var(--text)" }} 
                />
                <button 
                  type="button" 
                  onClick={handleAddCustomModel} 
                  style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: "#0070f3", color: "#fff", cursor: "pointer", fontWeight: "bold" }}
                >
                  إضافة
                </button>
              </div>
            </label>
          </div>
        </div>

        {/* Colors System */}
        <div style={{ padding: "20px", background: "var(--panel-soft)", borderRadius: "16px", border: "1px solid var(--line)" }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: "1.1rem" }}>الألوان المتاحة</h3>
          
          {/* Selected Colors List */}
          {form.colors && form.colors.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
              {form.colors.map((c, index) => {
                const colorObj = typeof c === "string" ? { name: c, hex: "#ccc" } : c;
                const availableImages = [];
                if (form.image) availableImages.push({ id: form.image, src: form.image, label: "الأساسية" });
                (form.images || []).forEach((img, i) => availableImages.push({ id: img, src: img, label: `إضافية ${i+1}` }));
                if (imageFile) availableImages.push({ id: imageFile.name, src: URL.createObjectURL(imageFile), label: "الأساسية (جديدة)" });
                (galleryFiles || []).forEach((f, i) => availableImages.push({ id: f.name, src: URL.createObjectURL(f), label: `إضافية ${i+1} (جديدة)` }));

                const selectedImageIds = colorObj.images || (colorObj.image ? [colorObj.image] : []);

                return (
                  <div key={`${colorObj.hex || 'ccc'}-${colorObj.name || ''}-${index}`} style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "16px", background: "#fff", border: "1px solid var(--line)", borderRadius: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: colorObj.hex || "#ccc", border: "1px solid rgba(0,0,0,0.1)" }} />
                      <span style={{ fontSize: "1rem", fontWeight: "bold", flex: 1 }}>{colorObj.name}</span>
                      <button type="button" onClick={() => handleRemoveColor(colorObj.hex)} style={{ background: "none", border: "none", color: "#ff4d4d", cursor: "pointer", padding: "4px", fontSize: "1.2rem" }}>
                        ×
                      </button>
                    </div>
                    
                    {availableImages.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
                        <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--muted)" }}>اربط الصور بهذا اللون:</span>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
                          {availableImages.map((img, imgIdx) => (
                            <label key={`${img.id}-${imgIdx}`} style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", background: "var(--input-bg)", padding: "4px 10px", borderRadius: "8px", border: selectedImageIds.includes(img.id) ? "1px solid #0070f3" : "1px solid var(--line)", transition: "all 0.2s" }}>
                              <input 
                                type="checkbox" 
                                checked={selectedImageIds.includes(img.id)}
                                onChange={(e) => {
                                  const isChecked = e.target.checked;
                                  const nextImages = isChecked ? [...selectedImageIds, img.id] : selectedImageIds.filter(id => id !== img.id);
                                  const newColors = [...form.colors];
                                  newColors[index] = { ...colorObj, image: nextImages[0] || null, images: nextImages };
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
          
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <input type="color" value={newColorHex} onChange={e => setNewColorHex(e.target.value)} style={{ width: "40px", height: "40px", padding: "0", border: "none", borderRadius: "8px", cursor: "pointer" }} />
            <input type="text" placeholder="اسم اللون (مثال: أزرق سماوي)" value={newColorName} onChange={e => setNewColorName(e.target.value)} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid var(--line)", background: "#fff", color: "var(--text)" }} />
            <button type="button" onClick={() => {
              if (newColorName.trim()) {
                handleAddColor({ hex: newColorHex, name: newColorName.trim() });
                setNewColorName("");
              }
            }} style={{ padding: "10px 20px", borderRadius: "8px", border: "none", background: "#0070f3", color: "#fff", cursor: "pointer", fontWeight: "bold" }}>
              إضافة اللون
            </button>
          </div>

          {/* Quick famous colors */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "12px" }}>
            {FAMOUS_COLORS.map(fc => (
              <button key={fc.hex} type="button" onClick={() => handleAddColor(fc)} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "4px 10px", borderRadius: "20px", border: "1px solid var(--line)", background: "#fff", cursor: "pointer" }}>
                <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: fc.hex, border: "1px solid rgba(0,0,0,0.1)" }} />
                <span style={{ fontSize: "0.8rem" }}>{fc.name}</span>
              </button>
            ))}
          </div>
        </div>

      </form>
    </div>
  );
}
