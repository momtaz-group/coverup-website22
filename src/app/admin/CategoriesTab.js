"use client";

import { useState } from "react";

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function CategoriesTab({ categories, onSaved, setStatusMessage }) {
  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [existingImageUrl, setExistingImageUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0] || null;
    setImageFile(file);
    setPreviewUrl(file ? await fileToDataUrl(file) : existingImageUrl);
  };

  const handleStartEdit = (category) => {
    setEditingId(category.id || category.name);
    setTitle(category.name || "");
    setExistingImageUrl(category.image_url || "");
    setPreviewUrl(category.image_url || "");
    setImageFile(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setTitle("");
    setImageFile(null);
    setExistingImageUrl("");
    setPreviewUrl("");
  };

  const handleDelete = async (category) => {
    if (!window.confirm(`هل أنت تأكد من حذف قسم "${category.name}"؟`)) {
      return;
    }
    const catId = category.id || category.name;
    setDeletingId(catId);
    setStatusMessage("جارٍ حذف القسم...");
    try {
      const res = await fetch(`/api/store-categories?id=${encodeURIComponent(catId)}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "فشل حذف القسم.");
      }
      setStatusMessage("تم حذف القسم بنجاح.");
      if (editingId === catId) handleCancelEdit();
      await onSaved();
    } catch (error) {
      setStatusMessage(error.message || "تعذر حذف القسم.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!title.trim()) {
      setStatusMessage("اسم القسم مطلوب.");
      return;
    }

    if (!editingId && !imageFile) {
      setStatusMessage("صورة القسم مطلوبة عند إضافة قسم جديد.");
      return;
    }

    setSaving(true);
    setStatusMessage("جارٍ حفظ البيانات وتحديث القسم...");
    try {
      let finalImageUrl = existingImageUrl;

      if (imageFile) {
        setStatusMessage("جارٍ تحويل الصورة ورفعها...");
        const dataUrl = await fileToDataUrl(imageFile);
        const uploadResponse = await fetch("/api/storage-upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "category",
            productName: title.trim(),
            fileName: imageFile.name,
            dataUrl,
          }),
        });
        const uploadData = await uploadResponse.json().catch(() => ({}));
        if (!uploadResponse.ok || !uploadData.url) {
          throw new Error(uploadData.message || "فشل رفع صورة القسم.");
        }
        finalImageUrl = uploadData.url;
      }

      const response = await fetch("/api/store-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId || undefined,
          name: title.trim(),
          image_url: finalImageUrl,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.category) {
        throw new Error(data.message || "فشل حفظ القسم في قاعدة البيانات.");
      }

      handleCancelEdit();
      setStatusMessage("تم حفظ القسم وتحديث البيانات بنجاح.");
      await onSaved();
    } catch (error) {
      setStatusMessage(error.message || "تعذر حفظ القسم.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="tab-pane">
      <div className="pane-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2>إدارة الأقسام (Sections Management)</h2>
          <p>إضافة، تعديل، وحذف الأقسام وتغيير الصور الخاصة بها.</p>
        </div>
        {editingId && (
          <button type="button" className="action-btn-link" onClick={handleCancelEdit} style={{ fontSize: "0.85rem", color: "#666" }}>
            إلغاء التعديل
          </button>
        )}
      </div>

      <div className="category-admin-layout">
        <form className="category-admin-form" onSubmit={handleSubmit} style={{ background: "var(--panel)", padding: "20px", borderRadius: "16px", border: "1px solid var(--line)" }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: "1rem", color: "var(--gold)" }}>
            {editingId ? "تعديل القسم المحدد" : "إضافة قسم جديد"}
          </h3>
          <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontWeight: "bold" }}>
            اسم القسم
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={100}
              required
              placeholder="مثال: كفرات الموبايل"
              style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--line)" }}
            />
          </label>

          <label className="category-image-upload" style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "6px", fontWeight: "bold" }}>
            صورة القسم
            <span className="category-image-preview" style={{ display: "flex", alignItems: "center", gap: "12px", background: "var(--panel-soft)", padding: "12px", borderRadius: "10px", border: "1px dashed var(--line)" }}>
              {previewUrl ? (
                <img src={previewUrl} alt="معاينة صورة القسم" style={{ width: "60px", height: "60px", objectFit: "contain", borderRadius: "8px", background: "#fff" }} />
              ) : (
                <span style={{ fontSize: "0.8rem", color: "#888" }}>اختر صورة واضحة للقسم</span>
              )}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/avif"
                onChange={handleImageChange}
                required={!editingId && !existingImageUrl}
                style={{ fontSize: "0.8rem" }}
              />
            </span>
          </label>

          <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
            <button className="primary-black-btn" type="submit" disabled={saving} style={{ flex: 1 }}>
              {saving ? "جارٍ الحفظ..." : editingId ? "تحديث القسم" : "إضافة القسم"}
            </button>
            {editingId && (
              <button type="button" onClick={handleCancelEdit} style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid var(--line)", background: "transparent", cursor: "pointer" }}>
                إلغاء
              </button>
            )}
          </div>
        </form>

        <section className="category-admin-list" aria-label="الأقسام المحفوظة" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px", marginTop: "20px" }}>
          {categories.map((category) => {
            const catId = category.id || category.name;
            const isEditing = editingId === catId;
            const isDeleting = deletingId === catId;
            return (
              <article key={catId} className="category-admin-card" style={{ background: "var(--panel)", borderRadius: "14px", border: isEditing ? "2px solid var(--gold)" : "1px solid var(--line)", padding: "14px", display: "flex", flexDirection: "column", gap: "10px", position: "relative" }}>
                <div className="category-admin-card-image" style={{ width: "100%", height: "100px", display: "flex", alignItems: "center", justifyContent: "center", background: "#fff", borderRadius: "10px", overflow: "hidden" }}>
                  {category.image_url ? <img src={category.image_url} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} /> : <span style={{ color: "#aaa" }}>لا توجد صورة</span>}
                </div>
                <strong style={{ fontSize: "0.95rem", textAlign: "center", color: "var(--text)" }}>{category.name}</strong>
                <div style={{ display: "flex", gap: "8px", marginTop: "auto" }}>
                  <button
                    type="button"
                    onClick={() => handleStartEdit(category)}
                    style={{ flex: 1, padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--panel-soft)", fontSize: "0.8rem", cursor: "pointer", fontWeight: "600" }}
                  >
                    تعديل
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(category)}
                    disabled={isDeleting}
                    style={{ padding: "6px 10px", borderRadius: "6px", border: "none", background: "#ff4d4d", color: "#fff", fontSize: "0.8rem", cursor: "pointer", fontWeight: "600" }}
                  >
                    {isDeleting ? "..." : "حذف"}
                  </button>
                </div>
              </article>
            );
          })}
          {!categories.length && <p className="category-admin-empty" style={{ gridColumn: "1 / -1", textAlign: "center", color: "#888", padding: "20px" }}>لا توجد أقسام محفوظة بعد.</p>}
        </section>
      </div>
    </div>
  );
}
