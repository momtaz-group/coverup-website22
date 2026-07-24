"use client";

import React, { useState, useEffect, Suspense, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { useCart } from "@/context/CartContext";
import Link from "next/link";
import { supabase } from "@/utils/supabase";
import { getSectionType } from "@/utils/section-utils";

function normalizeProductColor(value, index) {
  let color = value;
  if (typeof value === "string") {
    try {
      color = JSON.parse(value);
    } catch {
      color = { name: value, hex: "#cccccc" };
    }
  }
  if (!color || typeof color !== "object") {
    return { name: `Color ${index + 1}`, hex: "#cccccc", image: null, images: [] };
  }

  const images = Array.from(new Set([
    color.image,
    ...(Array.isArray(color.images) ? color.images : []),
  ].filter(Boolean)));
  return {
    ...color,
    name: color.name || color.label || `Color ${index + 1}`,
    hex: color.hex || color.value || "#cccccc",
    image: images[0] || null,
    images,
  };
}

function getColorImages(color, product, activeVersion) {
  if (!color) return [];
  const rawList = [
    color.image,
    ...(Array.isArray(color.images) ? color.images : [])
  ].filter(Boolean);

  const resolvedUrls = [];

  rawList.forEach((item) => {
    if (!item) return;
    if (typeof item === "string" && (item.startsWith("http://") || item.startsWith("https://") || item.startsWith("/"))) {
      if (activeVersion && product) {
        if (item === product.image || (Array.isArray(product.images) && product.images.includes(item))) {
          return;
        }
      }
      resolvedUrls.push(item);
    } else if (item === "main_cover" && !activeVersion && product?.image) {
      resolvedUrls.push(product.image);
    } else if (item === "version_cover" && activeVersion?.main_image_url) {
      if (!product || activeVersion.main_image_url !== product.image) {
        resolvedUrls.push(activeVersion.main_image_url);
      }
    } else if (typeof item === "string" && item.startsWith("img_") && !activeVersion && product?.images) {
      const idx = parseInt(item.replace("img_", ""), 10);
      if (!isNaN(idx) && product.images[idx]) {
        resolvedUrls.push(product.images[idx]);
      }
    } else if (typeof item === "string" && item.startsWith("ver_") && activeVersion?.images) {
      const idx = parseInt(item.replace("ver_", ""), 10);
      if (!isNaN(idx) && activeVersion.images[idx]) {
        if (!product || !Array.isArray(product.images) || !product.images.includes(activeVersion.images[idx])) {
          resolvedUrls.push(activeVersion.images[idx]);
        }
      }
    }
  });

  return Array.from(new Set(resolvedUrls));
}

function ProductDetailContent() {
  const { t, locale } = useLanguage();
  const { addToCart } = useCart();
  const searchParams = useSearchParams();
  const router = useRouter();
  const productId = searchParams.get("id");

  // State
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [suggestedProducts, setSuggestedProducts] = useState([]);
  const [storeCategories, setStoreCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mainImage, setMainImage] = useState("");
  const [wishlist, setWishlist] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [activeColor, setActiveColor] = useState(null);
  const [activeVersionId, setActiveVersionId] = useState("");
  const [selectedModels, setSelectedModels] = useState([]);
  const [zoomPos, setZoomPos] = useState({ x: 0, y: 0 });
  const [isZoomed, setIsZoomed] = useState(false);
  const [colorError, setColorError] = useState("");

  const isMainProductImage = (url) => {
    if (!product || !url) return false;
    if (url === product.image) return true;
    if (Array.isArray(product.images) && product.images.includes(url)) return true;
    return false;
  };

  const handleMouseMove = (e) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.pageX - left - window.scrollX) / width) * 100;
    const y = ((e.pageY - top - window.scrollY) / height) * 100;
    setZoomPos({ x, y });
  };

  const productColors = useMemo(() => {
    if (!product) return [];
    const activeVersion = (product.versions || []).find((version) => version.id === activeVersionId) || null;

    let rawColors = null;
    if (activeVersion) {
      if (Array.isArray(activeVersion.colors) && activeVersion.colors.length > 0) {
        rawColors = activeVersion.colors;
      } else if (typeof activeVersion.colors === "string" && activeVersion.colors.trim()) {
        try {
          const parsed = JSON.parse(activeVersion.colors);
          if (Array.isArray(parsed) && parsed.length > 0) rawColors = parsed;
          else rawColors = activeVersion.colors;
        } catch {
          rawColors = activeVersion.colors;
        }
      }
    }

    if (!rawColors || (Array.isArray(rawColors) && rawColors.length === 0)) {
      rawColors = product.colors;
    }

    if (!rawColors) return [];
    if (Array.isArray(rawColors)) {
      return rawColors.map(normalizeProductColor).filter(Boolean);
    }
    if (typeof rawColors === 'string') {
      return rawColors.split(/[,\n]/).map(normalizeProductColor).filter(Boolean);
    }
    return [];
  }, [product, activeVersionId]);

  const galleryImages = useMemo(() => {
    const activeVersion = (product?.versions || []).find((version) => version && version.id === activeVersionId) || null;
    const imagesList = [];

    if (activeVersion) {
      // Variant mode: ONLY variant-specific cover, gallery, and color images!
      if (activeVersion.main_image_url && !isMainProductImage(activeVersion.main_image_url)) {
        imagesList.push(activeVersion.main_image_url);
      }
      if (Array.isArray(activeVersion.images)) {
        activeVersion.images.forEach((img) => {
          if (img && !isMainProductImage(img)) imagesList.push(img);
        });
      }

      productColors.forEach((color) => {
        const colorImgs = getColorImages(color, product, activeVersion);
        colorImgs.forEach((img) => {
          if (img && !isMainProductImage(img)) imagesList.push(img);
        });
      });
    } else if (product) {
      // Main product mode: ONLY main cover, main gallery, and global color images!
      if (product.image) imagesList.push(product.image);
      if (Array.isArray(product.images)) imagesList.push(...product.images);

      productColors.forEach((color) => {
        imagesList.push(...getColorImages(color, product, null));
      });
    }

    return Array.from(new Set(imagesList.filter(Boolean)));
  }, [activeVersionId, product, productColors]);


  useEffect(() => {
    const loadWishlist = async () => {
      let localWish = [];
      try {
        const savedWishlist = localStorage.getItem("coverup-wishlist");
        if (savedWishlist) {
          localWish = JSON.parse(savedWishlist);
          setWishlist(localWish);
        }
      } catch {}

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const res = await fetch("/api/favorites", {
            headers: { Authorization: `Bearer ${session.access_token}` }
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok && Array.isArray(data.products)) {
            const dbIds = data.products.map(p => p.id);
            setWishlist(dbIds);
            localStorage.setItem("coverup-wishlist", JSON.stringify(dbIds));
          }
        }
      } catch {}
    };
    loadWishlist();

    if (!productId) {
      setError(locale === "ar" ? "المنتج غير محدد." : "Product ID not specified.");
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all([
      fetch(`/api/store-product?id=${encodeURIComponent(productId)}`).then((res) => {
        if (!res.ok) throw new Error("Failed to load product");
        return res.json();
      }),
      fetch(`/api/product-reviews?productId=${encodeURIComponent(productId)}`)
        .then((res) => res.json())
        .catch(() => ({ reviews: [] })),
      fetch(`/api/store-products`)
        .then((res) => res.json())
        .catch(() => ({ products: [] })),
      fetch(`/api/store-categories`)
        .then((res) => res.json())
        .catch(() => ({ categories: [] }))
    ])
      .then(([productData, reviewsData, allProductsData, categoriesData]) => {
        if (categoriesData && Array.isArray(categoriesData.categories)) {
          setStoreCategories(categoriesData.categories);
        }
        if (productData.product) {
          setProduct(productData.product);
          setReviews(reviewsData.reviews || []);
          setMainImage(productData.product.image);
          setActiveColor(null);
          setActiveVersionId("");
          if (Array.isArray(productData.product.compatible_models) && productData.product.compatible_models.length > 0) {
            setSelectedModels([productData.product.compatible_models[0]]);
          } else {
            setSelectedModels([]);
          }
          if (typeof window !== "undefined") {
            window.scrollTo({ top: 0, behavior: "instant" });
          }

          // Find suggested products (exclude current, prefer same category)
          if (allProductsData.products) {
            const others = allProductsData.products.filter(p => p.id !== productData.product.id);
            const sameCat = others.filter(p => p.category === productData.product.category);
            const suggestions = [...sameCat, ...others.filter(p => p.category !== productData.product.category)].slice(0, 4);
            setSuggestedProducts(suggestions);
          }
        } else {
          setError(locale === "ar" ? "المنتج غير موجود." : "Product not found.");
        }
      })
      .catch((err) => {
        setError(err.message || "An error occurred");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [productId, locale]);

  const toggleWishlist = async (id) => {
    const isFav = wishlist.includes(id);
    const next = isFav ? wishlist.filter((item) => item !== id) : [...wishlist, id];
    setWishlist(next);
    localStorage.setItem("coverup-wishlist", JSON.stringify(next));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        if (isFav) {
          await fetch(`/api/favorites?productId=${encodeURIComponent(id)}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${session.access_token}` }
          });
        } else {
          await fetch("/api/favorites", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ productId: id })
          });
        }
      }
    } catch {}
  };

  const formatMoney = (amount) => {
    return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", {
      style: "currency",
      currency: "EGP",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <main className="product-loading-screen">
        <div className="product-loader"></div>
        <p style={{ fontWeight: "bold" }}>{locale === "ar" ? "جارٍ التحميل..." : "Loading..."}</p>
        <style jsx>{`
          .product-loading-screen {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 60vh;
            background: transparent;
            color: var(--text);
          }
          .product-loader {
            width: 40px;
            height: 40px;
            border: 3px solid var(--line);
            border-top: 3px solid #0070f3;
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

  if (error || !product) {
    return (
      <main style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontSize: "18px", color: "var(--muted)", fontWeight: "bold" }}>{error || (locale === "ar" ? "المنتج غير موجود." : "Product not found.")}</p>
      </main>
    );
  }



  const isFavorite = wishlist.includes(product.id);

  const displayName = locale === "en" && product.name_en ? product.name_en : product.name;
  const displayDesc = locale === "en" && product.description_en ? product.description_en : product.description;
  const displayBadge = locale === "en" && product.badge_en ? product.badge_en : product.badge;
  const displayCategory = locale === "en" && product.category_en ? product.category_en : product.category;
  
  const sectionType = getSectionType(product?.category || displayCategory, storeCategories);
  const isScreenProtector = sectionType === "screen_protectors";
  const isCoverCategory = sectionType === "covers" || ["phone cases", "phone covers", "cases", "covers", "كفر", "كفرات"].some(p =>
    String(displayCategory || product?.category || "").trim().toLowerCase().includes(p)
  );

  const activeVersion = (product.versions || []).find((version) => version && version.id === activeVersionId) || null;
  const isVersionedProduct = !isScreenProtector && (product.product_type === "device_versions" || (product.versions || []).filter(Boolean).length > 0);
  const effectiveName = activeVersion?.version_name || displayName;
  const effectivePrice = activeVersion ? Number(activeVersion.price || 0) : Number(product.price || 0);
  const effectiveCompareAt = activeVersion?.compare_at_price ? Number(activeVersion.compare_at_price) : 0;
  const effectiveStock = activeVersion
    ? Number(activeVersion.stock_quantity || 0)
    : (isVersionedProduct
        ? (product.versions || []).reduce((sum, v) => sum + (v && v.status !== "inactive" ? Number(v.stock_quantity || 0) : 0), 0)
        : Number(product.stock_quantity || 0));
  const effectiveSku = activeVersion?.sku || product.sku || "";
  const canAddProduct = isVersionedProduct
    ? (activeVersion ? (activeVersion.status !== "inactive" && Number(activeVersion.stock_quantity || 0) > 0) : (product.versions || []).some(v => v && v.status !== "inactive" && Number(v.stock_quantity || 0) > 0))
    : (product.is_in_stock !== false && Number(product.stock_quantity || 0) > 0);

  const toggleModelSelection = (model) => {
    setColorError("");
    if (selectedModels.includes(model)) {
      setSelectedModels(selectedModels.filter(m => m !== model));
    } else {
      setSelectedModels([...selectedModels, model]);
    }
  };

  const handleAddToCart = () => {
    if (isScreenProtector) {
      if (selectedModels.length === 0) {
        setColorError(locale === "ar" ? "الرجاء اختيار موديل هاتف واحد على الأقل للمتابعة" : "Please select at least one phone model to proceed");
        return;
      }
      for (const model of selectedModels) {
        for (let i = 0; i < quantity; i++) {
          addToCart({
            ...product,
            name: displayName,
            price: effectivePrice,
            image: mainImage || product.image,
            sku: effectiveSku,
            stock_quantity: effectiveStock,
            is_in_stock: canAddProduct,
            selectedModel: model,
            phone_model: model,
          });
        }
      }
      router.push("/cart");
      return;
    }

    if (isVersionedProduct && !activeVersion) {
      setColorError(locale === "ar" ? "الرجاء اختيار موديل الهاتف أولا" : "Please select a phone model first");
      return;
    }
    if (!isScreenProtector && productColors.length > 1 && !activeColor) {
      setColorError(locale === "ar" ? "الرجاء اختيار اللون أولاً" : "Please select a color first");
      return;
    }

    for (let i = 0; i < quantity; i++) {
      addToCart({
        ...product,
        name: effectiveName,
        price: effectivePrice,
        image: mainImage || activeVersion?.main_image_url || product.image,
        sku: effectiveSku,
        stock_quantity: effectiveStock,
        is_in_stock: canAddProduct,
        selectedColor: activeColor,
        selectedVersion: activeVersion,
      });
    }
    router.push("/cart");
  };

  return (
    <main className="apple-product-page" style={{ padding: '40px 20px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'var(--font-sans)' }}>
      {/* Embedded JSON Matrix Table of Product Variants & Linked Colors */}
      {isVersionedProduct && (product.versions || []).length > 0 && (
        <script
          id="product-variants-matrix-json"
          type="application/json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              (product.versions || []).map((v) => ({
                id: v.id,
                phone_model: v.phone_model,
                version_name: v.version_name,
                price: v.price,
                compare_at_price: v.compare_at_price,
                stock_quantity: v.stock_quantity,
                status: v.status,
                main_image_url: v.main_image_url,
                images: v.images || [],
                colors: (v.colors || []).map((c) => ({
                  name: c.name,
                  hex: c.hex,
                  image: c.image || null,
                  images: c.images || [],
                })),
              })),
              null,
              2
            ),
          }}
        />
      )}

      {/* Hero Section */}
      <section className="apple-product-hero" style={{ marginBottom: '64px' }}>
        <div className="apple-product-details-column">
          {/* Title & Header Block */}
          <div className="apple-product-title-header" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              {displayBadge && <span style={{ background: 'rgba(0,112,243,0.1)', color: '#0070f3', padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold', marginBottom: '12px', display: 'inline-block' }}>{displayBadge}</span>}
              <h1 style={{ fontSize: '32px', margin: '0 0 8px 0', lineHeight: 1.2 }}>{effectiveName}</h1>
              <p style={{ fontSize: '15px', color: 'var(--muted)', margin: 0 }}>{displayCategory}</p>
              
              {/* Interactive Multi-Select Compatible Devices Card for Screen Protectors */}
              {isScreenProtector && Array.isArray(product.compatible_models) && product.compatible_models.length > 0 && (
                <div style={{
                  marginTop: '20px',
                  background: 'linear-gradient(135deg, rgba(0, 112, 243, 0.05) 0%, rgba(0, 112, 243, 0.01) 100%)',
                  border: '1.5px solid rgba(0, 112, 243, 0.25)',
                  borderRadius: '20px',
                  padding: '20px',
                  boxShadow: '0 8px 24px rgba(0, 112, 243, 0.06)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '10px',
                      background: 'rgba(0, 112, 243, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#0070f3'
                    }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="5" y="2" width="14" height="20" rx="3" ry="3"></rect>
                        <line x1="12" y1="18" x2="12.01" y2="18"></line>
                      </svg>
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: '700', color: 'var(--text)' }}>
                        {locale === "ar" ? "اختر موديل هاتفك (يمكنك اختيار أكثر من موديل)" : "Select Your Phone Model (Select one or multiple)"}
                      </h3>
                      <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                        {locale === "ar" ? "انقر على الهواتف المتوافقة التي ترغب في إضافة اسكرينات لها:" : "Click on the phone models you wish to purchase screen protectors for:"}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '14px' }}>
                    {product.compatible_models.map((model, idx) => {
                      const isSelected = selectedModels.includes(model);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => toggleModelSelection(model)}
                          style={{
                            padding: '8px 16px',
                            background: isSelected ? '#0070f3' : 'var(--panel)',
                            border: isSelected ? '1.5px solid #0070f3' : '1.5px solid var(--line)',
                            borderRadius: '24px',
                            fontSize: '0.88rem',
                            color: isSelected ? '#ffffff' : 'var(--text)',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: isSelected ? '0 4px 14px rgba(0, 112, 243, 0.3)' : '0 2px 6px rgba(0,0,0,0.03)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                        >
                          <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: isSelected ? '#ffffff' : '#0070f3'
                          }} />
                          {model}
                          {isSelected && <span style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>✓</span>}
                        </button>
                      );
                    })}
                  </div>

                  {selectedModels.length > 0 && (
                    <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px dashed rgba(0,112,243,0.2)', fontSize: '0.82rem', color: '#0070f3', fontWeight: '600' }}>
                      {locale === "ar"
                        ? `تم تحديد ${selectedModels.length} جهاز: ${selectedModels.join("، ")}`
                        : `Selected ${selectedModels.length} model(s): ${selectedModels.join(", ")}`}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Options & Actions Block */}
          <div className="apple-product-options-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {isVersionedProduct && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Apple-designed Guidance CTA Card */}
                <div style={{
                  background: 'var(--panel-soft)',
                  border: '1px solid var(--line)',
                  borderRadius: '18px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      background: '#0070f3',
                      color: '#ffffff',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      letterSpacing: '0.02em'
                    }}>
                      {locale === "ar" ? "تأكيد التوافق الدقيق" : "Exact Model Compatibility"}
                    </span>
                  </div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', color: 'var(--text)', lineHeight: 1.4 }}>
                    {locale === "ar" ? "يتوفر هذا المنتج بعدة إصدارات مخصصة لمختلف أجهزة الموبايل." : "This product is available in custom fits for multiple phone models."}
                  </h3>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)', lineHeight: 1.5 }}>
                    {locale === "ar"
                      ? "يرجى تحديد موديل هاتفك من القائمة أدناه لمعاينة التوافق والدقة المتناهية للتصميم 👇"
                      : "Please select your exact phone model from the list below to verify compatibility 👇"}
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{locale === "ar" ? "اختر موديل الهاتف:" : "Choose phone model:"}</span>
                  <select
                    value={activeVersionId}
                    onChange={(event) => {
                      const version = (product.versions || []).find((item) => item && item.id === event.target.value) || null;
                      setActiveVersionId(event.target.value);
                      setColorError("");
                      if (version) {
                        const nextImage = version.main_image_url || (Array.isArray(version.images) && version.images.length > 0 ? version.images[0] : "");
                        if (nextImage) setMainImage(nextImage);
                      } else if (product?.image) {
                        setMainImage(product.image);
                      }
                    }}
                    style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--panel)', color: 'var(--text)', fontWeight: '700' }}
                  >
                    <option value="">{locale === "ar" ? "اختر الموديل" : "Select model"}</option>
                    {(product.versions || []).map((version) => (
                      <option key={version.id} value={version.id} disabled={version.status === "inactive" || Number(version.stock_quantity || 0) <= 0}>
                        {version.phone_model} - {formatMoney(Number(version.price || 0))}
                      </option>
                    ))}
                  </select>
                </div>

              </div>
            )}

            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0070f3' }}>
              {formatMoney(effectivePrice)} {effectiveCompareAt > effectivePrice && <span style={{ fontSize: '16px', color: 'var(--muted)', textDecoration: 'line-through', marginInlineStart: '8px' }}>{formatMoney(effectiveCompareAt)}</span>} <span style={{ fontSize: '14px', color: 'var(--muted)', fontWeight: 'normal' }}>{locale === "ar" ? "شامل ضريبة القيمة المضافة" : "VAT included"}</span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', background: 'var(--input-bg)', padding: '16px', borderRadius: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{locale === "ar" ? "حالة المخزون" : "Availability"}</span>
                <strong style={{ fontSize: '14px', color: !canAddProduct ? '#ff4d4d' : '#4caf50' }}>
                  {!canAddProduct ? (locale === "ar" ? "نفد من المخزون" : "Out of stock") : (locale === "ar" ? `متوفر - ${effectiveStock} قطعة` : `In stock - ${effectiveStock} available`)}
                </strong>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: locale === 'en' ? '1px solid var(--line)' : 'none', borderRight: locale === 'ar' ? '1px solid var(--line)' : 'none', paddingLeft: locale === 'en' ? '16px' : 0, paddingRight: locale === 'ar' ? '16px' : 0 }}>
                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{locale === "ar" ? "رمز المنتج" : "SKU"}</span>
                <strong style={{ fontSize: '14px' }}>{effectiveSku || (locale === "ar" ? "بدون" : "None")}</strong>
              </div>
            </div>

            {!isScreenProtector && productColors.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{locale === "ar" ? "الألوان المتاحة:" : "Available Colors:"}</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                  {productColors.map((color, idx) => {
                    const isSelected = activeColor && (color.name ? activeColor.name === color.name : activeColor.hex === color.hex);
                    return (
                      <button
                        key={idx}
                        type="button"
                        title={color.name}
                        onClick={() => {
                          const activeVer = (product?.versions || []).find((v) => v && v.id === activeVersionId) || null;
                          const colorImages = getColorImages(color, activeVer ? null : product, activeVer);
                          if (colorImages.length > 0) {
                            setMainImage(colorImages[0]);
                          } else if (activeVer) {
                            setMainImage(activeVer.main_image_url || (Array.isArray(activeVer.images) ? activeVer.images[0] : ""));
                          } else if (product?.image) {
                            setMainImage(product.image);
                          }
                          setActiveColor(color);
                          setColorError("");
                        }}
                        style={{
                          width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer',
                          background: color.hex,
                          border: isSelected ? '3px solid #0070f3' : '1px solid rgba(0,0,0,0.15)',
                          outline: isSelected ? '2px solid rgba(0, 112, 243, 0.3)' : 'none',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                          display: 'flex', justifyContent: 'center', alignItems: 'center'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.15)';
                          e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.15)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px' }}>
              {/* Quantity Selector */}
              <div style={{ display: 'flex', alignItems: 'center', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: '12px', padding: '4px' }}>
                <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} style={{ background: 'transparent', border: 'none', fontSize: '20px', width: '36px', height: '36px', cursor: 'pointer', color: 'var(--text)' }}>-</button>
                <span style={{ width: '36px', textAlign: 'center', fontWeight: 'bold', fontSize: '16px' }}>{quantity}</span>
                <button type="button" onClick={() => setQuantity(quantity + 1)} style={{ background: 'transparent', border: 'none', fontSize: '20px', width: '36px', height: '36px', cursor: 'pointer', color: 'var(--text)' }}>+</button>
              </div>

              {/* Wishlist Button */}
              <button
                type="button"
                onClick={() => toggleWishlist(product.id)}
                style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill={isFavorite ? "#ff4d4d" : "none"} stroke={isFavorite ? "#ff4d4d" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
              </button>
            </div>

            {colorError && (
              <div style={{ color: '#ff4d4d', fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>⚠️</span> {colorError}
              </div>
            )}

            <button
              type="button"
              disabled={!canAddProduct}
              onClick={handleAddToCart}
              style={{
                width: '100%',
                padding: '16px 28px',
                borderRadius: '9999px',
                border: 'none',
                background: canAddProduct
                  ? 'linear-gradient(135deg, #0071e3 0%, #0077ed 100%)'
                  : 'var(--muted)',
                color: '#ffffff',
                fontSize: '16px',
                fontWeight: '700',
                cursor: !canAddProduct ? 'not-allowed' : 'pointer',
                opacity: !canAddProduct ? 0.55 : 1,
                transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: canAddProduct ? '0 8px 24px rgba(0, 113, 227, 0.35)' : 'none',
                marginTop: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                letterSpacing: '-0.01em',
              }}
              onMouseEnter={(e) => {
                if (canAddProduct) {
                  e.currentTarget.style.transform = 'scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 12px 30px rgba(0, 113, 227, 0.45)';
                }
              }}
              onMouseLeave={(e) => {
                if (canAddProduct) {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 113, 227, 0.35)';
                }
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <path d="M16 10a4 4 0 0 1-8 0"></path>
              </svg>
              <span>{locale === "ar" ? "أضف إلى السلة" : "Add to Cart"}</span>
            </button>
          </div>
        </div>

        {/* Gallery Column (Main Image & Thumbnails) */}
        <div className="apple-product-gallery" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: 'var(--panel)', borderRadius: '24px', padding: '16px', border: '1px solid var(--line)', boxShadow: '0 12px 40px rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '360px', overflow: 'hidden' }}>
             {mainImage ? (
               <div
                 onMouseMove={handleMouseMove}
                 onMouseEnter={() => setIsZoomed(true)}
                 onMouseLeave={() => setIsZoomed(false)}
                 style={{
                   position: 'relative',
                   width: '100%',
                   height: '100%',
                   overflow: 'hidden',
                   cursor: 'zoom-in',
                   borderRadius: '16px',
                   display: 'flex',
                   justifyContent: 'center',
                   alignItems: 'center'
                 }}
               >
                 <img
                   src={mainImage}
                   alt={effectiveName}
                   decoding="async"
                   style={{
                     width: '100%',
                     height: 'auto',
                     maxHeight: '500px',
                     objectFit: 'contain',
                     transform: isZoomed ? 'scale(2.2)' : 'scale(1)',
                     transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                     transition: isZoomed ? 'none' : 'transform 0.3s ease',
                     borderRadius: '16px'
                   }}
                 />
               </div>
             ) : (
               <span style={{ color: 'var(--muted)' }}>No Image</span>
             )}
          </div>

          {galleryImages.length > 1 && (
            <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px' }}>
              {galleryImages.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setMainImage(img)}
                  style={{ width: '80px', height: '80px', flexShrink: 0, borderRadius: '12px', border: mainImage === img ? '2px solid #0070f3' : '1px solid var(--line)', background: 'var(--panel)', padding: '4px', cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  <img src={img} alt="" loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '8px' }} />
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Description Section */}
      {displayDesc && (
        <section className="apple-product-description" style={{ marginBottom: '64px', background: 'var(--panel)', padding: '40px', borderRadius: '24px', border: '1px solid var(--line)', boxShadow: '0 8px 32px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '16px', lineHeight: 1.8, color: 'var(--text)', whiteSpace: 'pre-line' }}>
            {displayDesc}
          </div>
        </section>
      )}

      {/* Suggested Products Section */}
      {suggestedProducts.length > 0 && (
        <section className="apple-product-suggestions">
          <h2 style={{ fontSize: '24px', marginBottom: '24px' }}>{locale === "ar" ? "منتجات قد تعجبك" : "Suggested Products"}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '24px' }}>
            {suggestedProducts.map(p => {
               const pName = locale === "en" && p.name_en ? p.name_en : p.name;
               const pCat = locale === "en" && p.category_en ? p.category_en : p.category;
               const isFav = wishlist.includes(p.id);
               return (
                 <article key={p.id} style={{ background: 'var(--panel)', borderRadius: '20px', border: '1px solid var(--line)', padding: '16px', position: 'relative', transition: 'transform 0.2s', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <button 
                      type="button" 
                      onClick={() => toggleWishlist(p.id)}
                      style={{ position: 'absolute', top: '16px', left: locale === 'ar' ? '16px' : 'auto', right: locale === 'en' ? '16px' : 'auto', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill={isFav ? "#ff4d4d" : "none"} stroke={isFav ? "#ff4d4d" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                      </svg>
                    </button>
                    <Link href={`/product?id=${p.id}`} style={{ display: 'block', height: '180px', borderRadius: '12px', overflow: 'hidden', background: 'var(--input-bg)' }}>
                      <img src={p.image} alt={pName} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </Link>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                       <span style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase' }}>{pCat}</span>
                       <h3 style={{ fontSize: '14px', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                         <Link href={`/product?id=${p.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>{pName}</Link>
                       </h3>
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#0070f3' }}>
                      {formatMoney(p.price)}
                    </div>
                 </article>
               )
            })}
          </div>
        </section>
      )}
    </main>
  );
}

export default function ProductDetailPage() {
  return (
    <Suspense fallback={
      <main style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontSize: "18px", color: "var(--muted)", fontWeight: "bold" }}>Loading product details...</p>
      </main>
    }>
      <ProductDetailContent />
    </Suspense>
  );
}
