"use client";

import React, { useState, useEffect, Suspense, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { useCart } from "@/context/CartContext";
import Link from "next/link";
import { supabase } from "@/utils/supabase";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mainImage, setMainImage] = useState("");
  const [wishlist, setWishlist] = useState([]);
  const [quantity, setQuantity] = useState(1);

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
        .catch(() => ({ products: [] }))
    ])
      .then(([productData, reviewsData, allProductsData]) => {
        if (productData.product) {
          setProduct(productData.product);
          setReviews(reviewsData.reviews || []);
          setMainImage(productData.product.image);

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
      <main style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontSize: "18px", color: "var(--muted)", fontWeight: "bold" }}>{locale === "ar" ? "جارٍ التحميل..." : "Loading..."}</p>
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

  const galleryImages = [product.image, ...(Array.isArray(product.images) ? product.images : [])].filter(Boolean);
  const isFavorite = wishlist.includes(product.id);

  const displayName = locale === "en" && product.name_en ? product.name_en : product.name;
  const displayDesc = locale === "en" && product.description_en ? product.description_en : product.description;
  const displayBadge = locale === "en" && product.badge_en ? product.badge_en : product.badge;
  const displayCategory = locale === "en" && product.category_en ? product.category_en : product.category;

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      addToCart(product);
    }
    router.push("/cart");
  };

  return (
    <main style={{ padding: '40px 20px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'var(--font-sans)' }}>
      {/* Hero Section */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '48px', marginBottom: '64px', alignItems: 'start' }}>
        
        {/* Info Column (Left typically, but standard flow puts it first in DOM. We can use dir='ltr'/'rtl' to manage right/left natively) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', order: locale === "ar" ? 2 : 1 }}>
          <div>
            {displayBadge && <span style={{ background: 'rgba(0,112,243,0.1)', color: '#0070f3', padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold', marginBottom: '12px', display: 'inline-block' }}>{displayBadge}</span>}
            <h1 style={{ fontSize: '32px', margin: '0 0 8px 0', lineHeight: 1.2 }}>{displayName}</h1>
            <p style={{ fontSize: '15px', color: 'var(--muted)', margin: 0 }}>{displayCategory}</p>
          </div>

          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0070f3' }}>
            {formatMoney(product.price)} <span style={{ fontSize: '14px', color: 'var(--muted)', fontWeight: 'normal' }}>{locale === "ar" ? "شامل ضريبة القيمة المضافة" : "VAT included"}</span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', background: 'var(--input-bg)', padding: '16px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{locale === "ar" ? "حالة المخزون" : "Availability"}</span>
              <strong style={{ fontSize: '14px', color: product.is_in_stock === false ? '#ff4d4d' : '#4caf50' }}>
                {product.is_in_stock === false ? (locale === "ar" ? "نفد من المخزون" : "Out of stock") : (locale === "ar" ? "متوفر" : "In stock")}
              </strong>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: locale === 'en' ? '1px solid var(--line)' : 'none', borderRight: locale === 'ar' ? '1px solid var(--line)' : 'none', paddingLeft: locale === 'en' ? '16px' : 0, paddingRight: locale === 'ar' ? '16px' : 0 }}>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{locale === "ar" ? "رمز المنتج" : "SKU"}</span>
              <strong style={{ fontSize: '14px' }}>{product.sku || (locale === "ar" ? "بدون" : "None")}</strong>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '16px' }}>
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

          <button
            type="button"
            disabled={product.is_in_stock === false}
            onClick={handleAddToCart}
            style={{ width: '100%', padding: '18px', borderRadius: '16px', border: 'none', background: '#0070f3', color: 'white', fontSize: '16px', fontWeight: 'bold', cursor: product.is_in_stock === false ? 'not-allowed' : 'pointer', opacity: product.is_in_stock === false ? 0.5 : 1, transition: 'all 0.3s', boxShadow: '0 8px 24px rgba(0, 112, 243, 0.4)', marginTop: '8px' }}
          >
            {locale === "ar" ? "أضف إلى السلة" : "Add to Cart"}
          </button>
        </div>

        {/* Gallery Column (Right typically, order 2 in standard DOM, or order 1 in AR if we want it on the right) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', order: locale === "ar" ? 1 : 2 }}>
          <div style={{ background: 'var(--panel)', borderRadius: '24px', padding: '16px', border: '1px solid var(--line)', boxShadow: '0 12px 40px rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
             {mainImage ? <img src={mainImage} alt={displayName} decoding="async" style={{ width: '100%', height: 'auto', maxHeight: '500px', objectFit: 'contain', borderRadius: '16px' }} /> : <span style={{ color: 'var(--muted)' }}>No Image</span>}
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
        <section style={{ marginBottom: '64px', background: 'var(--panel)', padding: '40px', borderRadius: '24px', border: '1px solid var(--line)', boxShadow: '0 8px 32px rgba(0,0,0,0.04)' }}>
          <h2 style={{ fontSize: '22px', marginBottom: '24px', borderBottom: '1px solid var(--line)', paddingBottom: '16px' }}>{locale === "ar" ? "التفاصيل الوصفية" : "Description"}</h2>
          <div style={{ fontSize: '16px', lineHeight: 1.8, color: 'var(--text)', whiteSpace: 'pre-line' }}>
            {displayDesc}
          </div>
        </section>
      )}

      {/* Suggested Products Section */}
      {suggestedProducts.length > 0 && (
        <section>
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
