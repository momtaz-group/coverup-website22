import React, { useState, useMemo } from "react";
import { brandsData, FAMOUS_COLORS } from "@/utils/brandsData";

export default function ProductEditor({ form, setForm, imageFile, setImageFile, galleryFiles, setGalleryFiles, sections, onSubmit, onDelete, onClose }) {
  const [customModelInput, setCustomModelInput] = useState("");
  const [newColorHex, setNewColorHex] = useState("#000000");
  const [newColorName, setNewColorName] = useState("");

  // Variant Creation Modal State
  const [variantModalOpen, setVariantModalOpen] = useState(false);
  const [variantModalBrand, setVariantModalBrand] = useState(form.brand || "");
  const [variantModalFamily, setVariantModalFamily] = useState(form.product_family || "");
  const [variantModalSearch, setVariantModalSearch] = useState("");
  const [variantModalSelectedModels, setVariantModalSelectedModels] = useState([]);
  const [customVariantBrand, setCustomVariantBrand] = useState("");
  const [customVariantFamily, setCustomVariantFamily] = useState("");
  const [customVariantModel, setCustomVariantModel] = useState("");

  // Per-variant color creation temp state
  const [variantColorHexMap, setVariantColorHexMap] = useState({});
  const [variantColorNameMap, setVariantColorNameMap] = useState({});

  const deviceCategoryPatterns = [
    "phone cases",
    "phone covers",
    "cases",
    "covers",
    "screen protectors",
    "screen protection",
    "كفر",
    "كفرات",
    "حماية الشاشة",
    "اسكرينة",
    "سكرينة",
  ];
  const supportsDeviceVersions = deviceCategoryPatterns.some((pattern) =>
    String(form.category || "").trim().toLowerCase().includes(pattern),
  );

  const selectedBrand = brandsData.find(b => b.brand === form.brand) || null;
  const selectedFamily = selectedBrand?.families.find(f => f.family === form.product_family) || null;
  const availableModels = Array.from(new Set([...(selectedFamily?.models || []), ...(form.compatible_models || [])]));

  const modalSelectedBrand = brandsData.find(b => b.brand === (variantModalBrand || form.brand)) || brandsData[0];
  const modalSelectedFamily = modalSelectedBrand?.families.find(f => f.family === (variantModalFamily || form.product_family)) || modalSelectedBrand?.families[0];
  const modalAvailableModels = modalSelectedFamily?.models || [];

  const modalFilteredModels = useMemo(() => {
    return modalAvailableModels.filter(m =>
      !variantModalSearch.trim() || m.toLowerCase().includes(variantModalSearch.toLowerCase())
    );
  }, [modalAvailableModels, variantModalSearch]);

  // Helper to gather available images specifically for color linking
  const getAllAvailableImages = (currentVersion = null) => {
    const images = [];

    const mainProductImgs = new Set([
      form.image,
      ...(imageFile ? [imageFile.name] : []),
      ...(form.images || []),
      ...(galleryFiles || []).map(f => f.name),
    ].filter(Boolean));

    if (currentVersion) {
      // ONLY include this specific variant's images (excluding main product images)!
      if (currentVersion.main_image_url && !mainProductImgs.has(currentVersion.main_image_url)) {
        images.push({ id: currentVersion.main_image_url, src: currentVersion.main_image_url, label: "رئيسية هذا الإصدار" });
      }
      if (currentVersion._mainImageFile && !mainProductImgs.has(currentVersion._mainImageFile.name)) {
        images.push({ id: currentVersion._mainImageFile.name, src: URL.createObjectURL(currentVersion._mainImageFile), label: "ملف غلاف هذا الإصدار" });
      }
      (currentVersion.images || []).forEach((img, i) => {
        if (img && !mainProductImgs.has(img)) {
          images.push({ id: img, src: img, label: `صورة معرض الإصدار ${i + 1}` });
        }
      });
      (currentVersion._galleryFiles || []).forEach((f, i) => {
        if (f && !mainProductImgs.has(f.name)) {
          images.push({ id: f.name, src: URL.createObjectURL(f), label: `ملف معرض الإصدار ${i + 1}` });
        }
      });
    } else {
      // Main product images only
      if (form.image) images.push({ id: form.image, src: form.image, label: "الأساسية للمنتج" });
      if (imageFile) images.push({ id: imageFile.name, src: URL.createObjectURL(imageFile), label: "ملف رئيسي للمنتج" });
      (form.images || []).forEach((img, i) => images.push({ id: img, src: img, label: `معرض المنتج ${i + 1}` }));
      (galleryFiles || []).forEach((f, i) => images.push({ id: f.name, src: URL.createObjectURL(f), label: `ملف معرض المنتج ${i + 1}` }));
    }

    const seen = new Set();
    return images.filter(img => {
      if (!img.id || seen.has(img.id)) return false;
      seen.add(img.id);
      return true;
    });
  };

  const makeVersionName = (phoneModel) => [form.name, phoneModel].filter(Boolean).join(" - ");

  const normalizeVersion = (version = {}, index = 0) => ({
    version_name: version.version_name || version.versionName || makeVersionName(version.phone_model || ""),
    brand: version.brand || form.brand || "",
    product_family: version.product_family || version.productFamily || form.product_family || "",
    phone_model: version.phone_model || version.phoneModel || "",
    sku: version.sku || "",
    barcode: version.barcode || "",
    price: version.price ?? form.price ?? "",
    compare_at_price: version.compare_at_price ?? version.compareAtPrice ?? "",
    stock_quantity: version.stock_quantity ?? version.stockQuantity ?? form.stock_quantity ?? "",
    main_image_url: version.main_image_url || version.mainImageUrl || "",
    images: Array.isArray(version.images) ? version.images : [],
    colors: Array.isArray(version.colors) ? version.colors : [],
    status: version.status || (version.is_active === false ? "inactive" : "active"),
    sort_order: version.sort_order ?? version.sortOrder ?? index,
    ...version,
  });

  const handleAddCustomModel = () => {
    if (!customModelInput.trim()) return;
    const model = customModelInput.trim();
    const current = form.compatible_models || [];
    if (!current.includes(model)) {
      setForm({ ...form, compatible_models: [...current, model] });
    }
    setCustomModelInput("");
  };

  const handleAddAllCompatibleModels = () => {
    const allModels = selectedFamily?.models || [];
    if (!allModels.length) return;
    const current = form.compatible_models || [];
    const merged = Array.from(new Set([...current, ...allModels]));
    setForm({ ...form, compatible_models: merged });
  };

  const handleAddColor = (colorObj) => {
    if (!form.colors.some(c => c.hex === colorObj.hex && c.name === colorObj.name)) {
      setForm({ ...form, colors: [...form.colors, colorObj] });
    }
  };

  const handleRemoveColor = (index) => {
    const colors = [...form.colors];
    colors.splice(index, 1);
    setForm({ ...form, colors });
  };

  const handleToggleModel = (model) => {
    const current = form.compatible_models || [];
    if (current.includes(model)) {
      setForm({ ...form, compatible_models: current.filter(m => m !== model) });
    } else {
      setForm({ ...form, compatible_models: [...current, model] });
    }
  };

  // Open Variant Creation Modal
  const openVariantModal = () => {
    setVariantModalBrand(form.brand || brandsData[0]?.brand || "");
    setVariantModalFamily(form.product_family || (brandsData[0]?.families[0]?.family) || "");
    setVariantModalSearch("");
    setVariantModalSelectedModels([]);
    setVariantModalOpen(true);
  };

  // Toggle model inside variant modal
  const toggleModalModelSelect = (model) => {
    setVariantModalSelectedModels(prev =>
      prev.includes(model) ? prev.filter(m => m !== model) : [...prev, model]
    );
  };

  // Select all visible models in variant modal
  const selectAllModalModels = () => {
    if (variantModalSelectedModels.length === modalFilteredModels.length) {
      setVariantModalSelectedModels([]);
    } else {
      setVariantModalSelectedModels([...modalFilteredModels]);
    }
  };

  // Add manual custom variant (independent brand/family/model)
  const handleAddManualCustomVariant = () => {
    const targetModel = customVariantModel.trim();
    if (!targetModel) return;
    const targetBrand = customVariantBrand.trim() || variantModalBrand || form.brand || "";
    const targetFamily = customVariantFamily.trim() || variantModalFamily || form.product_family || "";

    const newVersion = normalizeVersion({
      brand: targetBrand,
      product_family: targetFamily,
      phone_model: targetModel,
      version_name: makeVersionName(targetModel),
    }, (form.versions || []).length);

    setForm({
      ...form,
      brand: form.brand || targetBrand,
      product_family: form.product_family || targetFamily,
      versions: [...(form.versions || []), newVersion],
    });

    setCustomVariantModel("");
    setVariantModalOpen(false);
  };

  // Add selected variants from modal into form.versions
  const confirmAddVariantsFromModal = () => {
    if (!variantModalSelectedModels.length) return;
    const targetBrand = variantModalBrand || form.brand || "";
    const targetFamily = variantModalFamily || form.product_family || "";

    const existing = new Set((form.versions || []).map(v => String(v.phone_model || "").toLowerCase()));
    const newVersions = variantModalSelectedModels
      .filter(model => !existing.has(model.toLowerCase()))
      .map((model, offset) => normalizeVersion({
        brand: targetBrand,
        product_family: targetFamily,
        phone_model: model,
        version_name: makeVersionName(model),
      }, (form.versions || []).length + offset));

    if (newVersions.length > 0) {
      setForm({
        ...form,
        brand: form.brand || targetBrand,
        product_family: form.product_family || targetFamily,
        versions: [...(form.versions || []), ...newVersions],
      });
    }
    setVariantModalOpen(false);
  };

  const updateVersion = (index, field, value) => {
    const versions = [...(form.versions || [])];
    versions[index] = { ...versions[index], [field]: value };
    setForm({ ...form, versions });
  };

  const updateVersionPhoneModel = (index, phoneModel) => {
    const versions = [...(form.versions || [])];
    const previous = versions[index] || {};
    const previousAutoName = makeVersionName(previous.phone_model || "");
    versions[index] = {
      ...previous,
      phone_model: phoneModel,
      version_name: !previous.version_name || previous.version_name === previousAutoName
        ? makeVersionName(phoneModel)
        : previous.version_name,
    };
    setForm({ ...form, versions });
  };

  const removeVersion = (index) => {
    setForm({ ...form, versions: (form.versions || []).filter((_, versionIndex) => versionIndex !== index) });
  };

  const duplicateVersion = (index) => {
    const versions = [...(form.versions || [])];
    const copy = { ...normalizeVersion(versions[index], versions.length), id: undefined, sku: "", phone_model: "", version_name: `${versions[index]?.version_name || form.name} Copy` };
    versions.splice(index + 1, 0, copy);
    setForm({ ...form, versions });
  };

  // Per-variant color management
  const addVersionColor = (vIndex, colorObj) => {
    const versions = [...(form.versions || [])];
    const currentColors = versions[vIndex].colors || [];
    if (!currentColors.some(c => c.hex === colorObj.hex && c.name === colorObj.name)) {
      versions[vIndex] = {
        ...versions[vIndex],
        colors: [...currentColors, colorObj],
      };
      setForm({ ...form, versions });
    }
  };

  const removeVersionColor = (vIndex, colorIndex) => {
    const versions = [...(form.versions || [])];
    const currentColors = [...(versions[vIndex].colors || [])];
    currentColors.splice(colorIndex, 1);
    versions[vIndex] = { ...versions[vIndex], colors: currentColors };
    setForm({ ...form, versions });
  };

  const linkVersionColorImage = (vIndex, colorIndex, imageId) => {
    const versions = [...(form.versions || [])];
    const currentColors = [...(versions[vIndex].colors || [])];
    const targetColor = currentColors[colorIndex];
    const currentImages = targetColor.images || (targetColor.image ? [targetColor.image] : []);
    const nextImages = currentImages.includes(imageId)
      ? currentImages.filter(id => id !== imageId)
      : [...currentImages, imageId];

    currentColors[colorIndex] = {
      ...targetColor,
      image: nextImages[0] || null,
      images: nextImages,
    };
    versions[vIndex] = { ...versions[vIndex], colors: currentColors };
    setForm({ ...form, versions });
  };

  const uploadVersionColorCustomImage = (vIndex, colorIndex, file) => {
    if (!file) return;
    const fileUrl = URL.createObjectURL(file);
    const versions = [...(form.versions || [])];
    const currentColors = [...(versions[vIndex].colors || [])];
    const targetColor = currentColors[colorIndex];
    const currentImages = targetColor.images || (targetColor.image ? [targetColor.image] : []);
    const nextImages = Array.from(new Set([...currentImages, file.name]));

    currentColors[colorIndex] = {
      ...targetColor,
      _colorFile: file,
      image: file.name,
      images: nextImages,
      custom_preview: fileUrl,
    };
    versions[vIndex] = { ...versions[vIndex], colors: currentColors };
    setForm({ ...form, versions });
  };

  const uploadGlobalColorCustomImage = (colorIndex, file) => {
    if (!file) return;
    const fileUrl = URL.createObjectURL(file);
    const colors = [...(form.colors || [])];
    const targetColor = colors[colorIndex];
    const currentImages = targetColor.images || (targetColor.image ? [targetColor.image] : []);
    const nextImages = Array.from(new Set([...currentImages, file.name]));

    colors[colorIndex] = {
      ...targetColor,
      _colorFile: file,
      image: file.name,
      images: nextImages,
      custom_preview: fileUrl,
    };
    setForm({ ...form, colors });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", padding: "28px", background: "#fbfbfd", borderRadius: "24px", border: "1px solid #e5e5ea", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Almarai', sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e5e5ea", paddingBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button type="button" onClick={onClose} style={{ background: "#ffffff", border: "1px solid #d2d2d7", width: "42px", height: "42px", borderRadius: "50%", cursor: "pointer", fontSize: "1.2rem", display: "flex", alignItems: "center", justifyContent: "center", color: "#1d1d1f", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            &rarr;
          </button>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.6rem", fontWeight: "700", color: "#1d1d1f", letterSpacing: "-0.02em" }}>{form.id ? "تعديل المنتج" : "إنشاء منتج جديد"}</h2>
            <p style={{ margin: "2px 0 0 0", fontSize: "0.85rem", color: "#86868b" }}>قم بإدخال تفاصيل المنتج، الصور المعالجة صيغياً، والألوان والإصدارات الخاصة.</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          {form.id && (
            <button type="button" onClick={() => onDelete(form.id)} style={{ padding: "10px 20px", borderRadius: "12px", border: "1px solid #ff3b30", background: "transparent", cursor: "pointer", fontWeight: "600", color: "#ff3b30" }}>
              حذف المنتج
            </button>
          )}
          <button type="button" onClick={onClose} style={{ padding: "10px 20px", borderRadius: "12px", border: "1px solid #d2d2d7", background: "#ffffff", cursor: "pointer", fontWeight: "600", color: "#1d1d1f" }}>
            إلغاء
          </button>
          <button type="button" onClick={onSubmit} style={{ padding: "10px 28px", borderRadius: "12px", border: "none", background: "#0071e3", color: "#ffffff", cursor: "pointer", fontWeight: "600", fontSize: "0.95rem", boxShadow: "0 4px 12px rgba(0, 113, 227, 0.25)" }}>
            حفظ المنتج
          </button>
        </div>
      </div>

      <form style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
        
        {/* Status & Name */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "20px" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "8px", fontWeight: "600", color: "#1d1d1f", fontSize: "0.9rem" }}>
            حالة المنتج (Status)
            <select value={form.status || "public"} onChange={e => setForm({...form, status: e.target.value})} style={{ padding: "12px 14px", borderRadius: "12px", border: "1px solid #d2d2d7", background: "#ffffff", color: "#1d1d1f", outline: "none", fontSize: "0.95rem" }}>
              <option value="public">متاح في المتجر (Public)</option>
              <option value="unavailable">غير متاح حالياً (Unavailable)</option>
              <option value="hidden">مخفي عن الزوار (Hidden)</option>
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "8px", fontWeight: "600", color: "#1d1d1f", fontSize: "0.9rem" }}>
            اسم المنتج العربي
            <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="مثال: كفر Carbon Slide لموبايل آيفون" required style={{ padding: "12px 14px", borderRadius: "12px", border: "1px solid #d2d2d7", background: "#ffffff", color: "#1d1d1f", outline: "none", fontSize: "0.95rem" }} />
          </label>
        </div>

        {/* Section Category & Price */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "8px", fontWeight: "600", color: "#1d1d1f", fontSize: "0.9rem" }}>
            القسم
            <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} required style={{ padding: "12px 14px", borderRadius: "12px", border: "1px solid #d2d2d7", background: "#ffffff", color: "#1d1d1f", outline: "none", fontSize: "0.95rem" }}>
              <option value="">-- اختر القسم --</option>
              {sections.map(sec => <option key={sec} value={sec}>{sec}</option>)}
            </select>
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "8px", fontWeight: "600", color: "#1d1d1f", fontSize: "0.9rem" }}>
            السعر الأساسي (EGP)
            <input type="number" step="0.01" value={form.price} onChange={e => setForm({...form, price: e.target.value})} required style={{ padding: "12px 14px", borderRadius: "12px", border: "1px solid #d2d2d7", background: "#ffffff", color: "#1d1d1f", outline: "none", fontSize: "0.95rem" }} />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "8px", fontWeight: "600", color: "#1d1d1f", fontSize: "0.9rem" }}>
            المخزون الكلي
            <input type="number" min="0" value={form.stock_quantity ?? ""} onChange={e => setForm({...form, stock_quantity: e.target.value})} placeholder="0" style={{ padding: "12px 14px", borderRadius: "12px", border: "1px solid #d2d2d7", background: "#ffffff", color: "#1d1d1f", outline: "none", fontSize: "0.95rem" }} />
          </label>
        </div>

        {/* APPLE-DESIGNED PRODUCT MEDIA STUDIO */}
        <div style={{ background: "#ffffff", borderRadius: "20px", padding: "24px", border: "1px solid #e5e5ea", boxShadow: "0 4px 20px rgba(0,0,0,0.03)", display: "flex", flexDirection: "column", gap: "20px" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: "700", color: "#1d1d1f", letterSpacing: "-0.01em" }}>صور المنتج الرئيسية والمعرض (Media Studio)</h3>
            <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "#86868b" }}>يتم تحويل صيغ الصور إلى WebP تلقائياً لتحسين السرعة والأداء.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
            {/* Main Image Apple Dropzone */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <span style={{ fontWeight: "700", fontSize: "0.9rem", color: "#1d1d1f" }}>الصورة الرئيسية الغلاف (Cover Image)</span>
              <label style={{ position: "relative", minHeight: "160px", borderRadius: "16px", border: "2px dashed #0071e3", background: "rgba(0, 113, 227, 0.02)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px", cursor: "pointer", transition: "all 0.2s" }}>
                <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} style={{ display: "none" }} />
                {(imageFile || form.image) ? (
                  <div style={{ position: "relative", width: "100%", height: "140px", borderRadius: "12px", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: "#fbfbfd" }}>
                    <img src={imageFile ? URL.createObjectURL(imageFile) : form.image} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setImageFile(null); setForm({...form, image: ""}); }}
                      style={{ position: "absolute", top: "8px", right: "8px", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", color: "#fff", border: "none", width: "28px", height: "28px", borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}
                      title="حذف الصورة"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#0071e3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="5" ry="5"></rect>
                      <circle cx="8.5" cy="8.5" r="1.5"></circle>
                      <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                    <span style={{ fontWeight: "700", color: "#0071e3", fontSize: "0.9rem" }}>انقر أو اسحب رفع الصورة الرئيسية</span>
                    <span style={{ fontSize: "0.78rem", color: "#86868b" }}>تظهر في الكروت والقوائم الرئيسية بالمتجر</span>
                  </div>
                )}
              </label>
            </div>

            {/* Gallery Images Apple Grid */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <span style={{ fontWeight: "700", fontSize: "0.9rem", color: "#1d1d1f" }}>معرض الصور الإضافية (Gallery Grid)</span>

              <label style={{ minHeight: "160px", borderRadius: "16px", border: "1px solid #d2d2d7", background: "#fbfbfd", display: "flex", flexDirection: "column", padding: "16px", cursor: "pointer" }}>
                <input type="file" accept="image/*" multiple onChange={e => setGalleryFiles(Array.from(e.target.files || []))} style={{ display: "none" }} />
                
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", borderBottom: "1px solid #e5e5ea", paddingBottom: "8px" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "#0071e3" }}>+ إضافة صور جديدة لمعرض المنتج</span>
                  <span style={{ fontSize: "0.75rem", color: "#86868b" }}>{(form.images || []).length + (galleryFiles || []).length} صور</span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(64px, 1fr))", gap: "10px", width: "100%", maxHeight: "110px", overflowY: "auto" }}>
                  {(form.images || []).map((img, i) => (
                    <div key={`exist-${i}`} style={{ width: "64px", height: "64px", borderRadius: "10px", border: "1px solid #e5e5ea", overflow: "hidden", background: "#fff", position: "relative" }}>
                      <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  ))}
                  {(galleryFiles || []).map((f, i) => (
                    <div key={`new-${i}`} style={{ width: "64px", height: "64px", borderRadius: "10px", border: "1px solid #0071e3", overflow: "hidden", background: "#fff", position: "relative" }}>
                      <img src={URL.createObjectURL(f)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  ))}

                  {!(form.images || []).length && !(galleryFiles || []).length && (
                    <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "20px 0", color: "#86868b", fontSize: "0.85rem" }}>
                      انقر هنا لإضافة مجموعة صور إضافية لمعرض هذا المنتج.
                    </div>
                  )}
                </div>
              </label>
            </div>

          </div>
        </div>

        {/* Brand & Product Family */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontWeight: "600", color: "#1d1d1f", fontSize: "0.9rem" }}>
            الماركة (Brand)
            <select
              value={form.brand || ""}
              onChange={e => {
                const brandName = e.target.value;
                const brandObj = brandsData.find(b => b.brand === brandName);
                const firstFamily = brandObj?.families[0]?.family || "";
                setForm({...form, brand: brandName, product_family: firstFamily});
              }}
              style={{ padding: "12px 14px", borderRadius: "12px", border: "1px solid #d2d2d7", background: "#ffffff", color: "#1d1d1f", outline: "none", fontSize: "0.95rem" }}
            >
              <option value="">-- اختر الماركة (Brand) --</option>
              {brandsData.map(b => <option key={b.brand} value={b.brand}>{b.brand}</option>)}
            </select>
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontWeight: "600", color: "#1d1d1f", fontSize: "0.9rem" }}>
            عائلة الأجهزة (Product Family)
            <select
              value={form.product_family || ""}
              onChange={e => setForm({...form, product_family: e.target.value})}
              style={{ padding: "12px 14px", borderRadius: "12px", border: "1px solid #d2d2d7", background: "#ffffff", color: "#1d1d1f", outline: "none", fontSize: "0.95rem" }}
            >
              <option value="">-- اختر العائلة / السلسلة (Family) --</option>
              {(selectedBrand?.families || []).map(f => <option key={f.family} value={f.family}>{f.family}</option>)}
            </select>
          </label>
        </div>

        {/* Product Variants / Versions Panel */}
        <div className="product-versions-panel" style={{ marginTop: "24px", background: "#ffffff", padding: "24px", borderRadius: "20px", border: "1px solid #e5e5ea", boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
          <div className="product-versions-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: "700", color: "#1d1d1f", letterSpacing: "-0.01em" }}>إصدارات المنتج (Product Variants)</h3>
              <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "#86868b" }}>تخصيص إصدارات مستقلة لكل موديل هاتف مع ربط الألوان والصور لكل إصدار.</p>
            </div>
            <button
              type="button"
              onClick={openVariantModal}
              style={{ padding: "12px 24px", borderRadius: "12px", border: "none", background: "#0071e3", color: "#ffffff", fontWeight: "600", cursor: "pointer", fontSize: "0.9rem", boxShadow: "0 4px 12px rgba(0, 113, 227, 0.2)" }}
            >
              + إضافة إصدار (Add Variant)
            </button>
          </div>

          {(form.versions || []).length === 0 ? (
            <div className="product-versions-empty" style={{ padding: "40px", textAlign: "center", color: "#86868b", border: "2px dashed #d2d2d7", borderRadius: "16px", background: "#fbfbfd" }}>
              <p style={{ margin: 0, fontSize: "0.95rem", fontWeight: "600", color: "#1d1d1f" }}>لا توجد إصدارات مضافة بعد.</p>
              <button type="button" onClick={openVariantModal} style={{ marginTop: "14px", padding: "10px 20px", borderRadius: "12px", background: "#0071e3", color: "#fff", border: "none", cursor: "pointer", fontWeight: "600" }}>
                + افتح نافذة إضافة الإصدارات
              </button>
            </div>
          ) : (
            <div className="product-versions-list" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {(form.versions || []).map((rawVersion, index) => {
                const version = normalizeVersion(rawVersion, index);
                const versionBrand = brandsData.find(b => b.brand === version.brand) || null;
                const versionFamily = versionBrand?.families.find(f => f.family === version.product_family) || null;
                const availableVariantImages = getAllAvailableImages(version);

                return (
                  <details className="product-version-card" key={version.id || `version-${index}`} open={index < 2} style={{ background: "#fbfbfd", border: "1px solid #e5e5ea", borderRadius: "16px", padding: "20px" }}>
                    <summary style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", fontWeight: "700", outline: "none", fontSize: "1.05rem", color: "#1d1d1f" }}>
                      <span>{version.version_name || `إصدار ${index + 1}`}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <span style={{ fontSize: "0.82rem", padding: "6px 12px", borderRadius: "20px", background: "rgba(0, 113, 227, 0.08)", color: "#0071e3", fontWeight: "700" }}>
                          المخزون: {version.stock_quantity || 0}
                        </span>
                      </div>
                    </summary>

                    <div className="product-version-fields" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px", marginTop: "20px" }}>
                      <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "0.85rem", fontWeight: "600" }}>
                        اسم الإصدار
                        <input value={version.version_name || ""} onChange={(event) => updateVersion(index, "version_name", event.target.value)} required style={{ padding: "10px", borderRadius: "10px", border: "1px solid #d2d2d7", background: "#fff" }} />
                      </label>
                      <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "0.85rem", fontWeight: "600" }}>
                        الماركة (Brand)
                        <select
                          value={version.brand || ""}
                          onChange={(event) => {
                            const bName = event.target.value;
                            const bObj = brandsData.find(x => x.brand === bName);
                            const fName = bObj?.families[0]?.family || "";
                            updateVersion(index, "brand", bName);
                            updateVersion(index, "product_family", fName);
                          }}
                          required
                          style={{ padding: "10px", borderRadius: "10px", border: "1px solid #d2d2d7", background: "#fff" }}
                        >
                          <option value="">اختر الماركة</option>
                          {brandsData.map(b => <option key={b.brand} value={b.brand}>{b.brand}</option>)}
                        </select>
                      </label>
                      <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "0.85rem", fontWeight: "600" }}>
                        عائلة الأجهزة
                        <select
                          value={version.product_family || ""}
                          onChange={(event) => updateVersion(index, "product_family", event.target.value)}
                          required
                          style={{ padding: "10px", borderRadius: "10px", border: "1px solid #d2d2d7", background: "#fff" }}
                        >
                          <option value="">اختر العائلة</option>
                          {(versionBrand?.families || []).map((family) => <option key={family.family} value={family.family}>{family.family}</option>)}
                        </select>
                      </label>
                      <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "0.85rem", fontWeight: "600" }}>
                        موديل الهاتف
                        <select
                          value={version.phone_model || ""}
                          onChange={(event) => updateVersionPhoneModel(index, event.target.value)}
                          required
                          style={{ padding: "10px", borderRadius: "10px", border: "1px solid #d2d2d7", background: "#fff" }}
                        >
                          <option value="">اختر موديل الهاتف</option>
                          {Array.from(new Set([...(versionFamily?.models || []), ...availableModels])).map(model => (
                            <option key={model} value={model}>{model}</option>
                          ))}
                        </select>
                      </label>
                      <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "0.85rem", fontWeight: "600" }}>
                        SKU (رمز المنتج)
                        <input value={version.sku || ""} onChange={(event) => updateVersion(index, "sku", event.target.value)} placeholder="تلقائي إن تركته فارغاً" style={{ padding: "10px", borderRadius: "10px", border: "1px solid #d2d2d7", background: "#fff" }} />
                      </label>
                      <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "0.85rem", fontWeight: "600" }}>
                        الكمية بالمخزن
                        <input type="number" min="0" value={version.stock_quantity ?? ""} onChange={(event) => updateVersion(index, "stock_quantity", event.target.value)} required style={{ padding: "10px", borderRadius: "10px", border: "1px solid #d2d2d7", background: "#fff" }} />
                      </label>
                      {/* APPLE-DESIGNED VARIANT MEDIA STUDIO */}
                      <div style={{ gridColumn: "1 / -1", background: "#ffffff", borderRadius: "16px", padding: "18px", border: "1px solid #e5e5ea", display: "flex", flexDirection: "column", gap: "16px", marginTop: "8px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", paddingBottom: "10px" }}>
                          <div>
                            <strong style={{ fontSize: "0.95rem", color: "#1d1d1f" }}>استوديو صور هذا الإصدار (Variant Media Studio)</strong>
                            <p style={{ margin: "2px 0 0 0", fontSize: "0.8rem", color: "#86868b" }}>اختر وعدل واحذف صور هذا الإصدار بحرية.</p>
                          </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                          {/* Variant Main Cover Image Dropzone */}
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            <span style={{ fontWeight: "700", fontSize: "0.85rem", color: "#1d1d1f" }}>الصورة الرئيسية للإصدار</span>
                            <label style={{ position: "relative", minHeight: "130px", borderRadius: "14px", border: "2px dashed #0071e3", background: "rgba(0, 113, 227, 0.02)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "14px", cursor: "pointer", transition: "all 0.2s" }}>
                              <input type="file" accept="image/*" onChange={(event) => updateVersion(index, "_mainImageFile", event.target.files?.[0] || null)} style={{ display: "none" }} />
                              {(version._mainImageFile || version.main_image_url) ? (
                                <div style={{ position: "relative", width: "100%", height: "110px", borderRadius: "10px", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: "#fbfbfd" }}>
                                  <img src={version._mainImageFile ? URL.createObjectURL(version._mainImageFile) : version.main_image_url} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateVersion(index, "_mainImageFile", null);
                                      updateVersion(index, "main_image_url", "");
                                    }}
                                    style={{ position: "absolute", top: "6px", right: "6px", background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)", color: "#fff", border: "none", width: "26px", height: "26px", borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}
                                    title="حذف الصورة الرئيسية للإصدار"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0071e3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="3" width="18" height="18" rx="5" ry="5"></rect>
                                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                    <polyline points="21 15 16 10 5 21"></polyline>
                                  </svg>
                                  <span style={{ fontWeight: "700", color: "#0071e3", fontSize: "0.85rem" }}>انقر لرفع صورة الغلاف</span>
                                </div>
                              )}
                            </label>
                          </div>

                          {/* Variant Gallery Grid & Previews */}
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            <span style={{ fontWeight: "700", fontSize: "0.85rem", color: "#1d1d1f" }}>معرض صور الإصدار</span>
                            <label style={{ minHeight: "130px", borderRadius: "14px", border: "1px solid #d2d2d7", background: "#fbfbfd", display: "flex", flexDirection: "column", padding: "12px", cursor: "pointer" }}>
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={(event) => {
                                  const existing = version._galleryFiles || [];
                                  const added = Array.from(event.target.files || []);
                                  updateVersion(index, "_galleryFiles", [...existing, ...added]);
                                }}
                                style={{ display: "none" }}
                              />
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px", borderBottom: "1px solid #e5e5ea", paddingBottom: "6px" }}>
                                <span style={{ fontSize: "0.8rem", fontWeight: "700", color: "#0071e3" }}>+ إضافة صور للمعرض</span>
                                <span style={{ fontSize: "0.75rem", color: "#86868b" }}>
                                  {((version.images || version.gallery_images || []).length + (version._galleryFiles || []).length)} صور
                                </span>
                              </div>
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(50px, 1fr))", gap: "8px", maxHeight: "110px", overflowY: "auto" }}>
                                {/* Saved image URLs */}
                                {(version.images || version.gallery_images || []).map((imgUrl, imgIdx) => (
                                  <div key={imgIdx} style={{ position: "relative", width: "50px", height: "50px", borderRadius: "8px", overflow: "hidden", border: "1px solid #e5e5ea", background: "#ffffff" }}>
                                    <img src={imgUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const currentImgs = Array.from(version.images || version.gallery_images || []);
                                        currentImgs.splice(imgIdx, 1);
                                        updateVersion(index, "images", currentImgs);
                                        updateVersion(index, "gallery_images", currentImgs);
                                      }}
                                      style={{ position: "absolute", top: "2px", right: "2px", background: "rgba(220, 38, 38, 0.9)", color: "#fff", border: "none", width: "18px", height: "18px", borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: "bold" }}
                                      title="حذف من المعرض"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ))}
                                {/* Newly selected files */}
                                {(version._galleryFiles || []).map((fileObj, fileIdx) => (
                                  <div key={`new-${fileIdx}`} style={{ position: "relative", width: "50px", height: "50px", borderRadius: "8px", overflow: "hidden", border: "1px solid #0071e3", background: "#ffffff" }}>
                                    <img src={URL.createObjectURL(fileObj)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const currentFiles = Array.from(version._galleryFiles || []);
                                        currentFiles.splice(fileIdx, 1);
                                        updateVersion(index, "_galleryFiles", currentFiles);
                                      }}
                                      style={{ position: "absolute", top: "2px", right: "2px", background: "rgba(220, 38, 38, 0.9)", color: "#fff", border: "none", width: "18px", height: "18px", borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: "bold" }}
                                      title="إلغاء الصورة الجديدة"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </label>
                          </div>
                        </div>
                      </div>

                      <label className="product-version-toggle" style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", fontWeight: "600", marginTop: "12px" }}>
                        <input type="checkbox" checked={version.status !== "inactive"} onChange={(event) => updateVersion(index, "status", event.target.checked ? "active" : "inactive")} />
                        نشط (Active)
                      </label>
                    </div>

                    {/* Per-Variant Colors & Image Linking System */}
                    <div style={{ marginTop: "20px", padding: "16px", background: "#ffffff", borderRadius: "14px", border: "1px solid #e5e5ea" }}>
                      <strong style={{ display: "block", fontSize: "0.92rem", color: "#1d1d1f", marginBottom: "12px", fontWeight: "700" }}>
                        ألوان هذا الإصدار وربط الصور (Variant Colors & Image Studio)
                      </strong>

                      {(version.colors || []).length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "16px" }}>
                          {(version.colors || []).map((cObj, cIdx) => {
                            const selectedColorImages = cObj.images || (cObj.image ? [cObj.image] : []);
                            return (
                              <div key={`${cObj.hex}-${cIdx}`} style={{ background: "#fbfbfd", padding: "14px", borderRadius: "12px", border: "1px solid #e5e5ea", display: "flex", flexDirection: "column", gap: "12px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                  <span style={{ width: "22px", height: "22px", borderRadius: "50%", background: cObj.hex, border: "1px solid rgba(0,0,0,0.15)", boxShadow: "0 2px 6px rgba(0,0,0,0.1)" }} />
                                  <strong style={{ fontSize: "0.95rem", flex: 1, color: "#1d1d1f" }}>{cObj.name}</strong>

                                  {/* Upload Custom Image for this Color */}
                                  <label style={{ cursor: "pointer", background: "rgba(0,113,227,0.08)", color: "#0071e3", padding: "6px 14px", borderRadius: "8px", fontSize: "0.8rem", fontWeight: "700" }}>
                                    + رفع صورة لهذا اللون
                                    <input
                                      type="file"
                                      accept="image/*"
                                      style={{ display: "none" }}
                                      onChange={(e) => uploadVersionColorCustomImage(index, cIdx, e.target.files?.[0])}
                                    />
                                  </label>

                                  <button type="button" onClick={() => removeVersionColor(index, cIdx)} style={{ background: "none", border: "none", color: "#ff3b30", cursor: "pointer", fontWeight: "700", fontSize: "1.1rem" }}>
                                    ✕
                                  </button>
                                </div>

                                {cObj.custom_preview && (
                                  <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "#ffffff", padding: "8px 12px", borderRadius: "10px", border: "1px solid #e5e5ea" }}>
                                    <img src={cObj.custom_preview} alt="" style={{ width: "42px", height: "42px", objectFit: "contain", borderRadius: "8px" }} />
                                    <span style={{ fontSize: "0.8rem", color: "#0071e3", fontWeight: "700" }}>صورة مرفوعة مخصصة لهذا اللون</span>
                                  </div>
                                )}

                                {/* Available Images Checkbox Selection Grid */}
                                {availableVariantImages.length > 0 && (
                                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                    <span style={{ fontSize: "0.8rem", fontWeight: "700", color: "#86868b" }}>انقر فوق الصور لربطها بهذا اللون:</span>
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                                      {availableVariantImages.map((img, imgIdx) => {
                                        const isSelected = selectedColorImages.includes(img.id);
                                        return (
                                          <div
                                            key={`${img.id}-${imgIdx}`}
                                            onClick={() => linkVersionColorImage(index, cIdx, img.id)}
                                            style={{
                                              display: "flex",
                                              alignItems: "center",
                                              gap: "8px",
                                              padding: "6px 12px",
                                              background: isSelected ? "rgba(0, 113, 227, 0.08)" : "#ffffff",
                                              borderRadius: "10px",
                                              border: isSelected ? "2px solid #0071e3" : "1px solid #d2d2d7",
                                              cursor: "pointer",
                                              transition: "all 0.2s"
                                            }}
                                          >
                                            <div style={{ width: "36px", height: "36px", borderRadius: "8px", overflow: "hidden", background: "#fff", border: "1px solid #e5e5ea" }}>
                                              <img src={img.src} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                                            </div>
                                            <span style={{ fontSize: "0.8rem", color: isSelected ? "#0071e3" : "#1d1d1f", fontWeight: isSelected ? "700" : "500" }}>{img.label}</span>
                                            {isSelected && <span style={{ color: "#0071e3", fontWeight: "700", fontSize: "0.9rem" }}>✓</span>}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                        <input
                          type="color"
                          value={variantColorHexMap[index] || "#000000"}
                          onChange={e => setVariantColorHexMap({ ...variantColorHexMap, [index]: e.target.value })}
                          style={{ width: "38px", height: "38px", border: "none", borderRadius: "10px", cursor: "pointer", padding: 0 }}
                        />
                        <input
                          type="text"
                          placeholder="اسم لون الإصدار (مثال: أزرق كحلي / Navy Blue)"
                          value={variantColorNameMap[index] || ""}
                          onChange={e => setVariantColorNameMap({ ...variantColorNameMap, [index]: e.target.value })}
                          style={{ flex: 1, padding: "10px 14px", borderRadius: "10px", border: "1px solid #d2d2d7", fontSize: "0.88rem", outline: "none" }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const cName = (variantColorNameMap[index] || "").trim();
                            if (cName) {
                              addVersionColor(index, { hex: variantColorHexMap[index] || "#000000", name: cName });
                              setVariantColorNameMap({ ...variantColorNameMap, [index]: "" });
                            }
                          }}
                          style={{ padding: "10px 18px", borderRadius: "10px", border: "none", background: "#0071e3", color: "#ffffff", cursor: "pointer", fontWeight: "600", fontSize: "0.88rem" }}
                        >
                          + إضافة لون للإصدار
                        </button>
                      </div>
                    </div>

                    {(version.main_image_url || version._mainImageFile || (version.images || []).length > 0) && (
                      <div className="product-version-preview" style={{ display: "flex", gap: "10px", marginTop: "16px", overflowX: "auto" }}>
                        {(version._mainImageFile || version.main_image_url) && (
                          <img src={version._mainImageFile ? URL.createObjectURL(version._mainImageFile) : version.main_image_url} alt="" style={{ width: "54px", height: "54px", objectFit: "cover", borderRadius: "10px", border: "1px solid #e5e5ea" }} />
                        )}
                        {(version.images || []).map((image, imageIndex) => <img key={`${image}-${imageIndex}`} src={image} alt="" style={{ width: "54px", height: "54px", objectFit: "cover", borderRadius: "10px", border: "1px solid #e5e5ea" }} />)}
                      </div>
                    )}

                    <div className="product-version-actions" style={{ display: "flex", gap: "8px", marginTop: "16px", justifyContent: "flex-end" }}>
                      <button type="button" onClick={() => duplicateVersion(index)} style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #d2d2d7", background: "#ffffff", cursor: "pointer", fontSize: "0.85rem", fontWeight: "600" }}>تكرار (Duplicate)</button>
                      <button type="button" className="danger" onClick={() => removeVersion(index)} style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: "#ff3b30", color: "#ffffff", cursor: "pointer", fontSize: "0.85rem", fontWeight: "600" }}>حذف (Delete)</button>
                    </div>
                  </details>
                );
              })}
            </div>
          )}
        </div>

        {/* Compatible Devices Section specifically for Screen Protectors */}
        {["screen protectors", "screen protection", "حماية الشاشة", "اسكرينة", "سكرينة"].some(p => String(form.category || "").trim().toLowerCase().includes(p)) && (
          <div style={{ marginTop: "20px", background: "#ffffff", padding: "24px", borderRadius: "20px", border: "1px solid #e5e5ea", boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: "12px", fontWeight: "600" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "1.05rem", color: "#1d1d1f", fontWeight: "700" }}>الموديلات المتوافقة مع اسكرينة الشاشة (Screen Protector Compatible Devices)</span>
                <button
                  type="button"
                  onClick={handleAddAllCompatibleModels}
                  style={{ padding: "8px 16px", borderRadius: "10px", border: "none", background: "#0071e3", color: "#ffffff", fontWeight: "600", cursor: "pointer", fontSize: "0.85rem" }}
                >
                  + إضافة كل موديلات العائلة (Add All Models)
                </button>
              </div>

              {Array.from(new Set([...(selectedFamily?.models || []), ...(form.compatible_models || [])])).length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", padding: "18px", background: "#fbfbfd", borderRadius: "14px", border: "1px solid #e5e5ea", maxHeight: "200px", overflowY: "auto" }}>
                  {Array.from(new Set([...(selectedFamily?.models || []), ...(form.compatible_models || [])])).map(model => {
                    const isSelected = (form.compatible_models || []).includes(model);
                    return (
                      <button
                        key={model}
                        type="button"
                        onClick={() => handleToggleModel(model)}
                        style={{
                          padding: "8px 16px",
                          borderRadius: "20px",
                          fontSize: "0.88rem",
                          fontWeight: "600",
                          cursor: "pointer",
                          transition: "all 0.2s",
                          border: isSelected ? "2px solid #0071e3" : "1px solid #d2d2d7",
                          background: isSelected ? "rgba(0, 113, 227, 0.08)" : "#ffffff",
                          color: isSelected ? "#0071e3" : "#1d1d1f"
                        }}
                      >
                        {model}
                      </button>
                    );
                  })}
                </div>
              )}

              <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                <input 
                  type="text"
                  placeholder="أضف موديل متوافق يدوياً (مثال: Galaxy S24 Ultra / iPhone 16)"
                  value={customModelInput}
                  onChange={e => setCustomModelInput(e.target.value)}
                  style={{ flex: 1, padding: "10px 14px", borderRadius: "10px", border: "1px solid #d2d2d7", background: "#ffffff", color: "#1d1d1f" }}
                />
                <button 
                  type="button" 
                  onClick={handleAddCustomModel} 
                  style={{ padding: "10px 20px", borderRadius: "10px", border: "none", background: "#0071e3", color: "#ffffff", cursor: "pointer", fontWeight: "600" }}
                >
                  إضافة
                </button>
              </div>
            </label>
          </div>
        )}

        {/* Global Product Colors System */}
        <div style={{ padding: "24px", background: "#ffffff", borderRadius: "20px", border: "1px solid #e5e5ea", boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: "1.2rem", fontWeight: "700", color: "#1d1d1f", letterSpacing: "-0.01em" }}>الألوان الأساسية للمنتج (Global Product Colors)</h3>
          
          {/* Selected Colors List */}
          {form.colors && form.colors.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "20px" }}>
              {form.colors.map((c, index) => {
                const colorObj = typeof c === "string" ? { name: c, hex: "#ccc" } : c;
                const globalAvailableImages = getAllAvailableImages();
                const selectedImageIds = colorObj.images || (colorObj.image ? [colorObj.image] : []);

                return (
                  <div key={`${colorObj.hex || 'ccc'}-${colorObj.name || ''}-${index}`} style={{ display: "flex", flexDirection: "column", gap: "14px", padding: "18px", background: "#fbfbfd", border: "1px solid #e5e5ea", borderRadius: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: colorObj.hex || "#ccc", border: "1px solid rgba(0,0,0,0.15)", boxShadow: "0 2px 6px rgba(0,0,0,0.1)" }} />
                      <span style={{ fontSize: "1rem", fontWeight: "700", flex: 1, color: "#1d1d1f" }}>{colorObj.name}</span>

                      {/* Custom Image Upload for Global Color */}
                      <label style={{ cursor: "pointer", background: "rgba(0,113,227,0.08)", color: "#0071e3", padding: "8px 16px", borderRadius: "10px", fontSize: "0.82rem", fontWeight: "700" }}>
                        + رفع صورة لـ {colorObj.name}
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: "none" }}
                          onChange={(e) => uploadGlobalColorCustomImage(index, e.target.files?.[0])}
                        />
                      </label>

                      <button type="button" onClick={() => handleRemoveColor(index)} style={{ background: "none", border: "none", color: "#ff3b30", cursor: "pointer", padding: "4px", fontSize: "1.2rem", fontWeight: "bold" }}>
                        ✕
                      </button>
                    </div>

                    {colorObj.custom_preview && (
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "#ffffff", padding: "8px 14px", borderRadius: "10px", border: "1px solid #e5e5ea" }}>
                        <img src={colorObj.custom_preview} alt="" style={{ width: "42px", height: "42px", objectFit: "contain", borderRadius: "8px" }} />
                        <span style={{ fontSize: "0.82rem", color: "#0071e3", fontWeight: "700" }}>صورة مرفوعة مخصصة لهذا اللون</span>
                      </div>
                    )}
                    
                    {globalAvailableImages.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
                        <span style={{ fontSize: "0.82rem", fontWeight: "700", color: "#86868b" }}>اختر الصور المرتبطة بهذا اللون من كافة الصور المتاحة بالمنتج والإصدارات:</span>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                          {globalAvailableImages.map((img, imgIdx) => {
                            const isSelected = selectedImageIds.includes(img.id);
                            return (
                              <div
                                key={`${img.id}-${imgIdx}`}
                                onClick={() => {
                                  const nextImages = isSelected ? selectedImageIds.filter(id => id !== img.id) : [...selectedImageIds, img.id];
                                  const newColors = [...form.colors];
                                  newColors[index] = { ...colorObj, image: nextImages[0] || null, images: nextImages };
                                  setForm({ ...form, colors: newColors });
                                }}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                  padding: "8px 14px",
                                  background: isSelected ? "rgba(0,113,227,0.08)" : "#ffffff",
                                  borderRadius: "10px",
                                  border: isSelected ? "2px solid #0071e3" : "1px solid #d2d2d7",
                                  cursor: "pointer",
                                  transition: "all 0.2s"
                                }}
                              >
                                <div style={{ width: "36px", height: "36px", borderRadius: "8px", overflow: "hidden", background: "#fff", border: "1px solid #e5e5ea" }}>
                                  <img src={img.src} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                                </div>
                                <span style={{ fontSize: "0.82rem", color: isSelected ? "#0071e3" : "#1d1d1f", fontWeight: isSelected ? "700" : "500" }}>{img.label}</span>
                                {isSelected && <span style={{ color: "#0071e3", fontWeight: "700", fontSize: "0.95rem" }}>✓</span>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <span style={{ fontSize: "0.85rem", color: "#86868b" }}>قم برفع صور للمنتج أولاً لربطها بهذا اللون.</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <input type="color" value={newColorHex} onChange={e => setNewColorHex(e.target.value)} style={{ width: "42px", height: "42px", padding: "0", border: "none", borderRadius: "10px", cursor: "pointer" }} />
            <input type="text" placeholder="اسم اللون (مثال: أزرق سماوي / Sky Blue)" value={newColorName} onChange={e => setNewColorName(e.target.value)} style={{ flex: 1, padding: "12px 14px", borderRadius: "12px", border: "1px solid #d2d2d7", background: "#ffffff", color: "#1d1d1f", outline: "none", fontSize: "0.95rem" }} />
            <button type="button" onClick={() => {
              if (newColorName.trim()) {
                handleAddColor({ hex: newColorHex, name: newColorName.trim() });
                setNewColorName("");
              }
            }} style={{ padding: "12px 24px", borderRadius: "12px", border: "none", background: "#0071e3", color: "#ffffff", cursor: "pointer", fontWeight: "600", fontSize: "0.95rem" }}>
              إضافة اللون
            </button>
          </div>

          {/* Quick famous colors */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "14px" }}>
            {FAMOUS_COLORS.map(fc => (
              <button key={fc.hex} type="button" onClick={() => handleAddColor(fc)} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 14px", borderRadius: "20px", border: "1px solid #d2d2d7", background: "#ffffff", cursor: "pointer", fontWeight: "600" }}>
                <span style={{ width: "14px", height: "14px", borderRadius: "50%", background: fc.hex, border: "1px solid rgba(0,0,0,0.15)" }} />
                <span style={{ fontSize: "0.82rem", color: "#1d1d1f" }}>{fc.name}</span>
              </button>
            ))}
          </div>
        </div>

      </form>

      {/* Perfectly Designed Variant Creation Pop-up Modal */}
      {variantModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ background: "#ffffff", borderRadius: "24px", width: "100%", maxWidth: "800px", maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,0.2)" }}>
            {/* Modal Header */}
            <div style={{ padding: "24px", borderBottom: "1px solid #e5e5ea", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.3rem", fontWeight: "700", color: "#1d1d1f" }}>إضافة إصدارات جديدة (Add Product Variants)</h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "#86868b" }}>اختر الماركة والعائلة والموديلات لإنشاء إصدارات مستقلة فورية.</p>
              </div>
              <button type="button" onClick={() => setVariantModalOpen(false)} style={{ background: "transparent", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "#86868b" }}>
                ×
              </button>
            </div>

            {/* Filters Bar */}
            <div style={{ padding: "18px 24px", background: "#fbfbfd", borderBottom: "1px solid #e5e5ea", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "0.85rem", fontWeight: "700", color: "#1d1d1f" }}>
                الماركة (Brand)
                <select
                  value={variantModalBrand}
                  onChange={(e) => {
                    const b = e.target.value;
                    setVariantModalBrand(b);
                    const bObj = brandsData.find(x => x.brand === b);
                    setVariantModalFamily(bObj?.families[0]?.family || "");
                    setVariantModalSelectedModels([]);
                  }}
                  style={{ padding: "10px 14px", borderRadius: "10px", border: "1px solid #d2d2d7", background: "#ffffff", outline: "none" }}
                >
                  {brandsData.map(b => <option key={b.brand} value={b.brand}>{b.brand}</option>)}
                </select>
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "0.85rem", fontWeight: "700", color: "#1d1d1f" }}>
                عائلة الأجهزة (Family)
                <select
                  value={variantModalFamily}
                  onChange={(e) => {
                    setVariantModalFamily(e.target.value);
                    setVariantModalSelectedModels([]);
                  }}
                  style={{ padding: "10px 14px", borderRadius: "10px", border: "1px solid #d2d2d7", background: "#ffffff", outline: "none" }}
                >
                  {modalSelectedBrand?.families.map(f => <option key={f.family} value={f.family}>{f.family}</option>)}
                </select>
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "0.85rem", fontWeight: "700", color: "#1d1d1f" }}>
                بحث في الموديلات
                <input
                  type="text"
                  placeholder="ابحث بالموديل..."
                  value={variantModalSearch}
                  onChange={(e) => setVariantModalSearch(e.target.value)}
                  style={{ padding: "10px 14px", borderRadius: "10px", border: "1px solid #d2d2d7", outline: "none" }}
                />
              </label>
            </div>

            {/* Select All Bar */}
            <div style={{ padding: "12px 24px", background: "#ffffff", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.85rem", color: "#86868b" }}>
                الموديلات المتاحة في {variantModalFamily || variantModalBrand}: <strong>{modalFilteredModels.length}</strong>
              </span>
              <button
                type="button"
                onClick={selectAllModalModels}
                style={{ padding: "6px 14px", borderRadius: "8px", border: "1px solid #0071e3", background: "rgba(0,113,227,0.08)", color: "#0071e3", fontSize: "0.82rem", cursor: "pointer", fontWeight: "700" }}
              >
                {variantModalSelectedModels.length === modalFilteredModels.length ? "إلغاء تحديد الكل" : "تحديد كافة الموديلات المعروضة"}
              </button>
            </div>

            {/* Modal Body: Models Grid */}
            <div style={{ padding: "20px 24px", flex: 1, overflowY: "auto", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "12px" }}>
              {modalFilteredModels.map((model) => {
                const isSelected = variantModalSelectedModels.includes(model);
                return (
                  <button
                    key={model}
                    type="button"
                    onClick={() => toggleModalModelSelect(model)}
                    style={{
                      padding: "14px",
                      borderRadius: "14px",
                      border: isSelected ? "2px solid #0071e3" : "1px solid #e5e5ea",
                      background: isSelected ? "rgba(0,113,227,0.06)" : "#ffffff",
                      color: isSelected ? "#0071e3" : "#1d1d1f",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontWeight: "700",
                      fontSize: "0.88rem",
                      transition: "all 0.2s",
                      textAlign: "right"
                    }}
                  >
                    <span>{model}</span>
                    {isSelected && <span style={{ background: "#0071e3", color: "#fff", borderRadius: "50%", width: "22px", height: "22px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem" }}>✓</span>}
                  </button>
                );
              })}

              {modalFilteredModels.length === 0 && (
                <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px", color: "#86868b" }}>
                  لا توجد موديلات مطابقة للبحث.
                </div>
              )}
            </div>

            {/* Custom Manual Variant Entry Section */}
            <div style={{ padding: "16px 24px", background: "#fbfbfd", borderTop: "1px solid #e5e5ea", display: "flex", flexDirection: "column", gap: "10px" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "#0071e3" }}>
                + أو أضف ماركة / عائلة / موديل يدوي مخصص (Custom Model / Brand Entry):
              </span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "10px", alignItems: "center" }}>
                <input
                  type="text"
                  placeholder="الماركة (اختياري)"
                  value={customVariantBrand}
                  onChange={(e) => setCustomVariantBrand(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #d2d2d7", fontSize: "0.85rem" }}
                />
                <input
                  type="text"
                  placeholder="عائلة المنتج (اختياري)"
                  value={customVariantFamily}
                  onChange={(e) => setCustomVariantFamily(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #d2d2d7", fontSize: "0.85rem" }}
                />
                <input
                  type="text"
                  placeholder="اسم الموديل المخصص *"
                  value={customVariantModel}
                  onChange={(e) => setCustomVariantModel(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #d2d2d7", fontSize: "0.85rem" }}
                />
                <button
                  type="button"
                  onClick={handleAddManualCustomVariant}
                  disabled={!customVariantModel.trim()}
                  style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: "#0071e3", color: "#fff", fontWeight: "700", fontSize: "0.85rem", cursor: !customVariantModel.trim() ? "not-allowed" : "pointer", opacity: !customVariantModel.trim() ? 0.5 : 1 }}
                >
                  إضافة الإصدار المخصص
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: "20px 24px", borderTop: "1px solid #e5e5ea", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fbfbfd" }}>
              <span style={{ fontSize: "0.9rem", color: "#1d1d1f", fontWeight: "700" }}>
                تم تحديد <strong>{variantModalSelectedModels.length}</strong> موديل
              </span>
              <div style={{ display: "flex", gap: "12px" }}>
                <button type="button" onClick={() => setVariantModalOpen(false)} style={{ padding: "10px 20px", borderRadius: "12px", border: "1px solid #d2d2d7", background: "#ffffff", fontWeight: "600", cursor: "pointer" }}>
                  إلغاء (Cancel)
                </button>
                <button type="button" onClick={confirmAddVariantsFromModal} disabled={!variantModalSelectedModels.length} style={{ padding: "10px 24px", borderRadius: "12px", border: "none", background: "#0071e3", color: "#ffffff", fontWeight: "600", cursor: !variantModalSelectedModels.length ? "not-allowed" : "pointer", opacity: !variantModalSelectedModels.length ? 0.5 : 1 }}>
                  إضافة الإصدارات المحددة (Add Selected Variants)
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
