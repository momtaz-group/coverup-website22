"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { useCart } from "@/context/CartContext";

function ProductDetailContent() {
  const { t, locale } = useLanguage();
  const { addToCart } = useCart();
  const searchParams = useSearchParams();
  const router = useRouter();
  const productId = searchParams.get("id");

  // State
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mainImage, setMainImage] = useState("");
  const [wishlist, setWishlist] = useState([]);

  useEffect(() => {
    try {
      const savedWishlist = localStorage.getItem("coverup-wishlist");
      if (savedWishlist) {
        setWishlist(JSON.parse(savedWishlist));
      }
    } catch {}

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
    ])
      .then(([productData, reviewsData]) => {
        if (productData.product) {
          setProduct(productData.product);
          setReviews(reviewsData.reviews || []);
          setMainImage(productData.product.image);
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

  const toggleWishlist = (id) => {
    const next = wishlist.includes(id) ? wishlist.filter((item) => item !== id) : [...wishlist, id];
    setWishlist(next);
    localStorage.setItem("coverup-wishlist", JSON.stringify(next));
    alert(wishlist.includes(id) ? (locale === "ar" ? "تم الحذف من المفضلة!" : "Removed from wishlist!") : (locale === "ar" ? "تم الحفظ في المفضلة!" : "Saved to wishlist!"));
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
      <main className="product-detail-page">
        <section className="product-detail" style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p className="empty-cart">{locale === "ar" ? "بنحمل تفاصيل المنتج..." : "Loading product details..."}</p>
        </section>
      </main>
    );
  }

  if (error || !product) {
    return (
      <main className="product-detail-page">
        <section className="product-detail" style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p className="empty-cart">{error || (locale === "ar" ? "المنتج غير موجود." : "Product not found.")}</p>
        </section>
      </main>
    );
  }

  const galleryImages = [product.image, ...(Array.isArray(product.images) ? product.images : [])].filter(Boolean);
  const rating = reviews.length
    ? reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / reviews.length
    : 0;

  const displayName = locale === "en" && product.name_en ? product.name_en : product.name;
  const displayDesc = locale === "en" && product.description_en ? product.description_en : product.description;
  const displayBadge = locale === "en" && product.badge_en ? product.badge_en : product.badge;
  const displayCategory = locale === "en" && product.category_en ? product.category_en : product.category;

  return (
    <main className="product-detail-page">
      <section className="product-detail">
        <div className="product-gallery">
          <div className="product-main-image">
            {mainImage ? <img src={mainImage} alt={displayName} /> : <span>Cover Up</span>}
          </div>
          <div className="product-thumbs">
            {galleryImages.map((img, idx) => (
              <button key={idx} type="button" onClick={() => setMainImage(img)}>
                <img src={img} alt="" />
              </button>
            ))}
          </div>
        </div>
        
        <div className="product-detail-copy">
          <p className="eyebrow">{displayBadge || displayCategory}</p>
          <h1>{displayName}</h1>
          <p>{displayDesc}</p>
          <strong className="product-detail-price">{formatMoney(product.price)}</strong>
          
          <div className="product-detail-meta">
            <span>
              {product.is_in_stock === false 
                ? (locale === "ar" ? "نفد من المخزون" : "Out of stock") 
                : (locale === "ar" ? "متاح للطلب" : "In stock")}
            </span>
            <span>SKU: {product.sku || (locale === "ar" ? "بدون" : "None")}</span>
            {Array.isArray(product.compatible_models) && product.compatible_models.length > 0 && (
              <span>{product.compatible_models.join(" / ")}</span>
            )}
            {rating > 0 ? (
              <span>
                {locale === "ar"
                  ? `تقييم ${rating.toFixed(1)} من 5`
                  : `Rating ${rating.toFixed(1)} of 5`}
              </span>
            ) : (
              <span>{locale === "ar" ? "لسه مفيش تقييمات منشورة" : "No reviews published yet"}</span>
            )}
          </div>

          <div className="product-detail-actions">
            <button
              className="button button-primary"
              type="button"
              disabled={product.is_in_stock === false}
              onClick={() => {
                addToCart(product);
                router.push("/cart");
              }}
            >
              {locale === "ar" ? "ضيف للسلة" : "Add to Cart"}
            </button>
            <button
              className="button button-secondary"
              type="button"
              onClick={() => toggleWishlist(product.id)}
            >
              {locale === "ar" ? "احفظ في المفضلة" : "Save to Wishlist"}
            </button>
          </div>

          <section className="product-reviews">
            <h2>{locale === "ar" ? "تقييمات حقيقية بعد التسليم" : "Verified Customer Reviews"}</h2>
            {reviews.length > 0 ? (
              reviews.map((review) => (
                <article key={review.id}>
                  <strong>{"★".repeat(Number(review.rating || 5))}</strong>
                  <p>{review.message}</p>
                  <span>{review.name || (locale === "ar" ? "عميل Cover Up" : "Cover Up Customer")}</span>
                </article>
              ))
            ) : (
              <p>
                {locale === "ar"
                  ? "التقييمات تظهر هنا بعد ما العميل يستلم الأوردر ويأكد برقم الطلب."
                  : "Reviews will appear here after orders are delivered and verified."}
              </p>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

export default function ProductDetailPage() {
  return (
    <Suspense fallback={
      <main className="product-detail-page">
        <section className="product-detail" style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p className="empty-cart">Loading product details...</p>
        </section>
      </main>
    }>
      <ProductDetailContent />
    </Suspense>
  );
}
