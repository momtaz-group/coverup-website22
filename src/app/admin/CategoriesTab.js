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
  const [title, setTitle] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0] || null;
    setImageFile(file);
    setPreviewUrl(file ? await fileToDataUrl(file) : "");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!title.trim() || !imageFile) {
      setStatusMessage("اسم القسم والصورة مطلوبان.");
      return;
    }

    setSaving(true);
    setStatusMessage("جارٍ تحويل الصورة إلى WebP ورفعها إلى Cloudflare...");
    try {
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

      const response = await fetch("/api/store-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: title.trim(), image_url: uploadData.url }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.category) {
        throw new Error(data.message || "فشل حفظ القسم في Supabase.");
      }

      setTitle("");
      setImageFile(null);
      setPreviewUrl("");
      setStatusMessage("تم حفظ القسم وصورته بنجاح.");
      await onSaved();
    } catch (error) {
      setStatusMessage(error.message || "تعذر حفظ القسم.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="tab-pane">
      <div className="pane-header">
        <h2>إدارة الأقسام</h2>
        <p>أضف اسم القسم وصورته. يتم تحويل الصورة إلى WebP وحفظها في Cloudflare R2.</p>
      </div>

      <div className="category-admin-layout">
        <form className="category-admin-form" onSubmit={handleSubmit}>
          <label>
            اسم القسم
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={100}
              required
              placeholder="مثال: كفرات الموبايل"
            />
          </label>

          <label className="category-image-upload">
            صورة القسم
            <span className="category-image-preview">
              {previewUrl ? (
                <img src={previewUrl} alt="معاينة صورة القسم" />
              ) : (
                <span>اختر صورة واضحة بخلفية شفافة أو فاتحة</span>
              )}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/avif"
                onChange={handleImageChange}
                required
              />
            </span>
          </label>

          <button className="primary-black-btn" type="submit" disabled={saving}>
            {saving ? "جارٍ الحفظ..." : "إضافة القسم"}
          </button>
        </form>

        <section className="category-admin-list" aria-label="الأقسام المحفوظة">
          {categories.map((category) => (
            <article key={category.id || category.name} className="category-admin-card">
              <div className="category-admin-card-image">
                {category.image_url ? <img src={category.image_url} alt="" /> : <span>لا توجد صورة</span>}
              </div>
              <strong>{category.name}</strong>
            </article>
          ))}
          {!categories.length && <p className="category-admin-empty">لا توجد أقسام محفوظة بعد.</p>}
        </section>
      </div>
    </div>
  );
}
