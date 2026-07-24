"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/utils/supabase";
import { useLanguage } from "../../context/LanguageContext";
import { useCart } from "../../context/CartContext";



function ShopContent() {
  const { locale, t } = useLanguage();
  const { addToCart, showToast } = useCart();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Search parameters values
  const urlSearch = searchParams.get("search") || "";
  const urlCategory = searchParams.get("category") || "All";
  const urlModel = searchParams.get("model") || "All";

  // State
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [storeCategories, setStoreCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [searchQuery, setSearchQuery] = useState(urlSearch);
  const [selectedCategory, setSelectedCategory] = useState(urlCategory);
  const [selectedModel, setSelectedModel] = useState(urlModel);
  const [sortBy, setSortBy] = useState("default");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [wishlist, setWishlist] = useState([]);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  // Category Strip Auto-scroll & Ref
  const categoryStripRef = React.useRef(null);
  const [isStripUserInteracting, setIsStripUserInteracting] = useState(false);
  const stripScrollTimeoutRef = React.useRef(null);

  useEffect(() => {
    const el = categoryStripRef.current;
    if (!el) return;

    const autoScrollInterval = setInterval(() => {
      if (isStripUserInteracting) return;
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (maxScroll <= 0) return;

      const isRTL = typeof document !== "undefined" && (document.dir === "rtl" || document.documentElement.dir === "rtl");
      if (isRTL) {
        if (Math.abs(el.scrollLeft) >= maxScroll - 4) {
          el.scrollLeft = 0;
        } else {
          el.scrollLeft -= 1.2;
        }
      } else {
        if (el.scrollLeft >= maxScroll - 4) {
          el.scrollLeft = 0;
        } else {
          el.scrollLeft += 1.2;
        }
      }
    }, 28);

    return () => clearInterval(autoScrollInterval);
  }, [isStripUserInteracting, loadingCategories]);

  // Sync state with url changes
  useEffect(() => {
    setSearchQuery(urlSearch);
    setSelectedCategory(urlCategory);
    setSelectedModel(urlModel);
  }, [urlSearch, urlCategory, urlModel]);

  // Load products & categories from DB
  useEffect(() => {
    setLoadingProducts(true);
    setLoadingCategories(true);
    fetch("/api/store-products")
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.products)) {
          const visibleProducts = data.products.filter(p => p.status !== 'hidden');
          setProducts(visibleProducts);
        }
      })
      .catch(() => {})
      .finally(() => {
        setLoadingProducts(false);
      });

    fetch("/api/store-categories")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.categories)) {
          setStoreCategories(data.categories.filter((category) => category.name && category.image_url));
        }
      })
      .catch(() => setStoreCategories([]))
      .finally(() => setLoadingCategories(false));

    const loadWishlist = async () => {
      let localWish = [];
      try {
        const saved = localStorage.getItem("coverup-wishlist");
        if (saved) {
          localWish = JSON.parse(saved);
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
  }, []);

  // Update query params helper
  const updateParams = (newParams) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(newParams).forEach(([key, value]) => {
      if (value === "All" || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    router.push(`/products?${params.toString()}`);
  };

  // Toggle wishlist helper
  const toggleWishlist = async (id) => {
    const isFav = wishlist.includes(id);
    const next = isFav ? wishlist.filter((x) => x !== id) : [...wishlist, id];
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

  // Collect unique categories dynamically
  const uniqueCategories = useMemo(() => {
    const set = new Set();
    products.forEach((p) => {
      const cat = locale === "en" && p.category_en ? p.category_en : p.category;
      if (cat) set.add(cat);
    });
    return Array.from(set);
  }, [products, locale]);

  // Collect unique models dynamically
  const uniqueModels = useMemo(() => {
    const set = new Set();
    products.forEach((p) => {
      if (Array.isArray(p.compatible_models)) {
        p.compatible_models.forEach((m) => set.add(m));
      }
    });
    return Array.from(set).sort();
  }, [products]);

  // Filter products based on search, model, category
  const filteredProducts = useMemo(() => {
    let result = [...products];

    const categoryAliases = {
      Airbuds: ["airbud", "earbud", "headphone", "سماعة", "سماعات"],
      Chargers: ["charger", "charge", "cable", "adapter", "شاحن", "كابل"],
      "Phone Covers": ["case", "cover", "magsafe", "كفر"],
      "Power Banks": ["power bank", "powerbank", "باور"],
      "Screen Protectors": ["screen", "protector", "glass", "privacy", "حماية", "اسكرينة"],
      "Phone Holders": ["holder", "stand", "mount", "حامل", "حوامل"]
    };

    const productSearchText = (p) => [
      p.name,
      p.name_en,
      p.category,
      p.category_en,
      p.description,
      p.description_en,
      p.product_family,
      ...(Array.isArray(p.tags) ? p.tags : [])
    ].filter(Boolean).join(" ").toLowerCase();

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((p) => {
        const nameMatch = (p.name || "").toLowerCase().includes(q) || (p.name_en || "").toLowerCase().includes(q);
        const descMatch = (p.description || "").toLowerCase().includes(q) || (p.description_en || "").toLowerCase().includes(q);
        const catMatch = (p.category || "").toLowerCase().includes(q) || (p.category_en || "").toLowerCase().includes(q);
        const modelMatch = Array.isArray(p.compatible_models) && p.compatible_models.some((m) => m.toLowerCase().includes(q));
        return nameMatch || descMatch || catMatch || modelMatch;
      });
    }

    // Category filter
    if (selectedCategory !== "All" && selectedCategory !== "") {
      result = result.filter((p) => {
        const cat = locale === "en" && p.category_en ? p.category_en : p.category;
        const target = selectedCategory;
        const aliases = categoryAliases[target] || [];
        return cat === target
          || p.category === target
          || p.category_en === target
          || aliases.some((alias) => productSearchText(p).includes(alias.toLowerCase()));
      });
    }

    // Model filter
    if (selectedModel !== "All" && selectedModel !== "") {
      result = result.filter((p) => {
        return Array.isArray(p.compatible_models) && p.compatible_models.includes(selectedModel);
      });
    }

    // Min price filter
    if (minPrice.trim() !== "") {
      const minVal = parseFloat(minPrice);
      if (!isNaN(minVal)) {
        result = result.filter((p) => p.price >= minVal);
      }
    }

    // Max price filter
    if (maxPrice.trim() !== "") {
      const maxVal = parseFloat(maxPrice);
      if (!isNaN(maxVal)) {
        result = result.filter((p) => p.price <= maxVal);
      }
    }

    // Sort by price
    if (sortBy === "price-asc") {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price-desc") {
      result.sort((a, b) => b.price - a.price);
    }

    return result;
  }, [products, searchQuery, selectedCategory, selectedModel, sortBy, locale, minPrice, maxPrice]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateParams({ search: searchQuery });
  };

  const handleCategoryChange = (cat) => {
    setSelectedCategory(cat);
    updateParams({ category: cat });
  };

  const handleModelChange = (model) => {
    setSelectedModel(model);
    updateParams({ model: model });
  };

  const formatMoney = (amount) => {
    return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", {
      style: "currency",
      currency: "EGP",
      maximumFractionDigits: 0
    }).format(amount);
  };

  const colorNameMap = {
    black: "#1f252c",
    midnight: "#1f252c",
    white: "#f7f5ef",
    clear: "#eef4f8",
    transparent: "#eef4f8",
    blue: "#4f7fbf",
    navy: "#233a5c",
    brown: "#8b6a4d",
    orange: "#f0a273",
    gold: "#d8cdbb",
    silver: "#c6c9d1",
    gray: "#8ca0ad",
    grey: "#8ca0ad",
    purple: "#b7b1c9",
    pink: "#efb69c",
    green: "#7d9b8c",
    red: "#c95a54"
  };

  const fallbackSwatches = ["#8ca0ad", "#b7b1c9", "#1f252c", "#d8cdbb", "#efb69c"];

  const getProductColorSwatches = (product) => {
    const values = Array.isArray(product.colors) ? product.colors : [];
    const swatches = values
      .map((item) => {
        if (!item) return null;
        if (typeof item === "object") {
          const label = item.name || item.label || item.color || item.hex || "";
          const hex = item.hex || item.value || colorNameMap[String(label).toLowerCase()];
          return hex ? { hex, label: String(label || hex) } : null;
        }
        const label = String(item).trim();
        const lower = label.toLowerCase();
        const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(label) ? label : colorNameMap[lower];
        return hex ? { hex, label } : null;
      })
      .filter(Boolean);

    return swatches.length
      ? swatches.slice(0, 6)
      : fallbackSwatches.map((hex, index) => ({ hex, label: `Color ${index + 1}` }));
  };

  const categoryTiles = [
    {
      title: locale === "ar" ? "الكل" : "All",
      image: "/assets/categories/all.png",
      category: "All"
    },
    ...storeCategories.map((category) => ({
      title: category.name,
      image: category.image_url,
      category: category.name,
    })),
  ];

  return (
    <main className="simple-page store-page" style={{ paddingInline: "clamp(16px, 3vw, 36px)", paddingTop: "40px" }}>
      {/* Shop Title and Description */}
      <section className="amazon-search-copy">
        <span className="eyebrow">{locale === "ar" ? "متجر كفر أب" : "Cover Up Store"}</span>
        <h1>{locale === "ar" ? "منتجاتنا" : "Our Products"}</h1>
        <p>
          {locale === "ar"
            ? "تصفح تشكيلة الكفرات الفخمة وحماية الشاشات الممتازة المتوافقة مع أحدث أجهزة أبل وسامسونج وغيرها."
            : "Browse our premium cases and high-grade screen protection, engineered for Apple, Samsung, and more."}
        </p>
      </section>

      {/* Desktop Inline Search Bar (Hidden on Mobile) */}
      <section className="amazon-search-bar-container">
        <form className="amazon-search-inner" onSubmit={handleSearchSubmit}>
          <div className="search-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
          <input
            type="search"
            className="amazon-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={locale === "ar" ? "ابحث عن اسم المنتج أو الموديل..." : "Search product name, category, or model..."}
          />
          {searchQuery && (
            <button
              type="button"
              className="amazon-search-clear"
              onClick={() => {
                setSearchQuery("");
                updateParams({ search: "" });
              }}
            >
              ×
            </button>
          )}
        </form>
      </section>

      <section
        ref={categoryStripRef}
        className="store-category-strip"
        aria-label={locale === "ar" ? "تصنيفات المتجر" : "Store categories"}
        onMouseEnter={() => setIsStripUserInteracting(true)}
        onMouseLeave={() => setIsStripUserInteracting(false)}
        onTouchStart={() => setIsStripUserInteracting(true)}
        onTouchEnd={() => {
          if (stripScrollTimeoutRef.current) clearTimeout(stripScrollTimeoutRef.current);
          stripScrollTimeoutRef.current = setTimeout(() => setIsStripUserInteracting(false), 3000);
        }}
        onScroll={() => {
          setIsStripUserInteracting(true);
          if (stripScrollTimeoutRef.current) clearTimeout(stripScrollTimeoutRef.current);
          stripScrollTimeoutRef.current = setTimeout(() => setIsStripUserInteracting(false), 3500);
        }}
      >
        {loadingCategories ? (
          Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="store-category-tile"
              style={{
                width: "90px",
                height: "90px",
                borderRadius: "18px",
                background: "var(--panel-soft)",
                opacity: 0.6,
                border: "1px solid var(--line)"
              }}
            />
          ))
        ) : (
          categoryTiles.map((item) => (
            <button
              key={item.image || item.category}
              type="button"
              className={`store-category-tile ${selectedCategory === item.category ? "is-active" : ""}`}
              onClick={() => handleCategoryChange(item.category)}
            >
              <span className="store-category-image">
                <img src={item.image} alt="" loading="lazy" decoding="async" />
              </span>
              <span>{item.title}</span>
            </button>
          ))
        )}
      </section>

      {/* Category Tabs under Search Bar */}
      <section className="category-tabs-container" style={{
        margin: "12px auto 24px auto",
        maxWidth: "1200px",
        padding: "0 16px",
        width: "100%",
        boxSizing: "border-box"
      }}>
        <div className="category-tabs-scroll" style={{
          display: "flex",
          gap: "10px",
          overflowX: "auto",
          paddingBottom: "8px",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch"
        }}>
          <style jsx global>{`
            .category-tabs-scroll::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          <button
            type="button"
            className={`tab-btn ${selectedCategory === "All" ? "is-active" : ""}`}
            onClick={() => handleCategoryChange("All")}
            style={{
              padding: "10px 20px",
              borderRadius: "30px",
              border: "1px solid var(--line)",
              background: selectedCategory === "All" ? "var(--gold)" : "var(--panel)",
              color: selectedCategory === "All" ? "#fff" : "var(--text)",
              fontSize: "0.88rem",
              fontWeight: "600",
              whiteSpace: "nowrap",
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
          >
            {locale === "ar" ? "جميع المنتجات" : "All Products"}
          </button>

          {uniqueCategories.map((cat) => (
            <button
              type="button"
              key={cat}
              className={`tab-btn ${selectedCategory === cat ? "is-active" : ""}`}
              onClick={() => handleCategoryChange(cat)}
              style={{
                padding: "10px 20px",
                borderRadius: "30px",
                border: "1px solid var(--line)",
                background: selectedCategory === cat ? "var(--gold)" : "var(--panel)",
                color: selectedCategory === cat ? "#fff" : "var(--text)",
                fontSize: "0.88rem",
                fontWeight: "600",
                whiteSpace: "nowrap",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
            >
              {locale === "en" ? (cat === "كفرات" ? "Cases" : cat === "كفرات MagSafe" ? "MagSafe Cases" : cat === "حماية الشاشة" ? "Screen Protection" : cat) : cat}
            </button>
          ))}
        </div>
      </section>

      {/* Main Grid split layout */}
      <div className="amazon-layout-container">
        {/* Desktop Sidebar (Hidden on mobile) */}
        <aside className="amazon-sidebar">

          {/* Model Filter Section */}
          <div className="sidebar-section">
            <h3>{locale === "ar" ? "تصفية بالموديل" : "Filter by Model"}</h3>
            <select
              className="sidebar-select"
              value={selectedModel}
              onChange={(e) => handleModelChange(e.target.value)}
            >
              <option value="All">{locale === "ar" ? "كل الموديلات" : "All Models"}</option>
              {uniqueModels.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </div>

          {/* Price Range Filter Section */}
          <div className="sidebar-section">
            <h3>{locale === "ar" ? "نطاق السعر (ج.م)" : "Price Range (EGP)"}</h3>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <input
                type="number"
                className="sidebar-select"
                style={{ padding: "8px 12px", fontSize: "13.5px", width: "100%", border: "1.5px solid #0070f3", outline: "none", background: "var(--input-bg)", color: "var(--text)" }}
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder={locale === "ar" ? "من" : "Min"}
              />
              <span style={{ color: "var(--muted)" }}>-</span>
              <input
                type="number"
                className="sidebar-select"
                style={{ padding: "8px 12px", fontSize: "13.5px", width: "100%", border: "1.5px solid #0070f3", outline: "none", background: "var(--input-bg)", color: "var(--text)" }}
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder={locale === "ar" ? "إلى" : "Max"}
              />
            </div>
          </div>

          {/* Category Filter Section */}
          <div className="sidebar-section">
            <h3>{locale === "ar" ? "الفئات" : "Categories"}</h3>
            <div className="sidebar-categories">
              <button
                type="button"
                className={`sidebar-cat-btn ${selectedCategory === "All" ? "is-active" : ""}`}
                onClick={() => handleCategoryChange("All")}
              >
                {locale === "ar" ? "جميع المنتجات" : "All Products"}
              </button>
              {uniqueCategories.map((cat) => (
                <button
                  type="button"
                  key={cat}
                  className={`sidebar-cat-btn ${selectedCategory === cat ? "is-active" : ""}`}
                  onClick={() => handleCategoryChange(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Catalog Content Area */}
        <section style={{ minWidth: 0 }}>
          {/* Header containing result count and sorting selector */}
          <div className="amazon-results-header">
            <div className="results-count">
              {locale === "ar" ? (
                <>
                  عرض <strong>{filteredProducts.length}</strong> منتج مطابِق
                </>
              ) : (
                <>
                  Showing <strong>{filteredProducts.length}</strong> matching products
                </>
              )}
            </div>

            <div className="sort-by-container">
              <span>{locale === "ar" ? "ترتيب حسب:" : "Sort by:"}</span>
              <select
                className="amazon-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="default">{locale === "ar" ? "الافتراضي" : "Default"}</option>
                <option value="price-asc">{locale === "ar" ? "السعر: من الأقل للأعلى" : "Price: Low to High"}</option>
                <option value="price-desc">{locale === "ar" ? "السعر: من الأعلى للأقل" : "Price: High to Low"}</option>
              </select>
            </div>
          </div>

          {/* Catalog grid */}
          {loadingProducts ? (
            <div style={{ minHeight: "40vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: "40px", height: "40px", border: "3px solid var(--line)", borderTop: "3px solid #0070f3", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              <p style={{ marginTop: "16px", color: "var(--muted)", fontWeight: "bold" }}>
                {locale === "ar" ? "جارٍ تحميل المنتجات..." : "Loading products..."}
              </p>
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="amazon-products-grid">
              {filteredProducts.map((p) => {
                const displayName = locale === "en" && p.name_en ? p.name_en : p.name;
                const displayBadge = locale === "en" && p.badge_en ? p.badge_en : p.badge;
                const displayCategory = locale === "en" && p.category_en ? p.category_en : p.category;
                const isFavorite = wishlist.includes(p.id);
                const colorSwatches = getProductColorSwatches(p);
                const stockQuantity = Math.max(0, Number(p.stock_quantity ?? 0));
                const isVersionedProduct = p.product_type === "device_versions";
                const isOutOfStock = !isVersionedProduct && (p.is_in_stock === false || stockQuantity === 0);

                return (
                  <article key={p.id} className="amazon-product-card">
                    {/* Add to wishlist icon button */}
                    <button
                      type="button"
                      className={`amazon-wishlist-btn ${isFavorite ? "is-active" : ""}`}
                      onClick={() => toggleWishlist(p.id)}
                      aria-label="Wishlist"
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill={isFavorite ? "#ff4d4d" : "none"} stroke={isFavorite ? "#ff4d4d" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                      </svg>
                    </button>

                    {/* Best Seller or Promo Badge */}
                    {displayBadge && (
                      <div className="amazon-badge-container">
                        <span className="amazon-best-seller-badge">{displayBadge}</span>
                      </div>
                    )}

                    {/* Product Image Link */}
                    <Link href={`/product?id=${p.id}`} className="amazon-image-container">
                      <img src={p.image} alt={displayName} loading="lazy" decoding="async" />
                    </Link>

                    {/* Product details */}
                    <div className="amazon-card-body">
                      <div className="store-color-swatches" aria-label={locale === "ar" ? "Available colors" : "Available colors"}>
                        {colorSwatches.map((color) => (
                          <span
                            key={`${p.id}-${color.hex}-${color.label}`}
                            className="store-color-swatch"
                            title={color.label}
                            style={{ backgroundColor: color.hex }}
                          />
                        ))}
                      </div>

                      <span className="amazon-brand">{displayCategory}</span>
                      <h2 className="amazon-title">
                        <Link href={`/product?id=${p.id}`}>{displayName}</Link>
                      </h2>

                      {/* Quantity remaining */}
                      <div style={{ fontSize: "12.5px", color: p.is_in_stock === false || (p.stock_quantity || 0) === 0 ? "#ff4d4d" : "#4caf50", fontWeight: "bold", margin: "4px 0" }}>
                        {locale === "ar"
                          ? (p.is_in_stock === false || (p.stock_quantity || 0) === 0 ? "نفد من المخزون" : `المتبقي في المخزون: ${p.stock_quantity || 0} قطع`)
                          : (p.is_in_stock === false || (p.stock_quantity || 0) === 0 ? "Out of stock" : `Only ${p.stock_quantity || 0} left in stock`)}
                      </div>

                      {/* Pricing block */}
                      <div className="amazon-price-row">
                        <span className="price-currency">{locale === "ar" ? "ج.م." : "EGP"}</span>
                        <span className="price-whole">{p.price}</span>
                      </div>

                      <p className="amazon-delivery" style={{ fontSize: "12.5px" }}>
                        {locale === "ar" ? (
                          <>
                            توصيل سريع خلال <strong>24-48 ساعة</strong>
                          </>
                        ) : (
                          <>
                            Fast delivery in <strong>24-48 hrs</strong>
                          </>
                        )}
                      </p>

                      {/* Add to Cart / Select Model button */}
                      <button
                        type="button"
                        className="amazon-add-to-cart-btn"
                        disabled={isOutOfStock}
                        onClick={() => {
                          if (isVersionedProduct) {
                            router.push(`/product?id=${p.id}`);
                            return;
                          }
                          addToCart(p);
                          showToast(locale === "ar" ? "تمت الإضافة للسلة!" : "Added to cart!");
                        }}
                      >
                        {locale === "ar" ? "إضافة إلى السلة" : "Add to Cart"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="empty-cart" style={{ minHeight: "40vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {locale === "ar" ? "لا توجد منتجات مطابقة لخيارات البحث والتصفية." : "No products match your search and filter criteria."}
            </p>
          )}
        </section>
      </div>

      {/* Mobile Sticky Floating Filter Button */}
      <button
        type="button"
        className="mobile-filter-fab"
        onClick={() => setMobileFiltersOpen(true)}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="21" x2="4" y2="14"></line>
          <line x1="4" y1="10" x2="4" y2="3"></line>
          <line x1="12" y1="21" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12" y2="3"></line>
          <line x1="20" y1="21" x2="20" y2="16"></line>
          <line x1="20" y1="12" x2="20" y2="3"></line>
          <line x1="1" y1="14" x2="7" y2="14"></line>
          <line x1="9" y1="8" x2="15" y2="8"></line>
          <line x1="17" y1="16" x2="23" y2="16"></line>
        </svg>
        <span>{locale === "ar" ? "تصفية" : "Filters"}</span>
      </button>

      {/* Mobile Full Screen Filter Sheet / Overlay */}
      {mobileFiltersOpen && (
        <div className="mobile-filters-overlay" role="dialog" aria-modal="true">
          <div className="mobile-filters-header">
            <h2>{locale === "ar" ? "تصفية وتحديد المنتجات" : "Filter & Sort Products"}</h2>
            <button
              type="button"
              className="mobile-filters-close"
              onClick={() => setMobileFiltersOpen(false)}
            >
              ×
            </button>
          </div>

          <div className="mobile-filters-content">

            {/* Model Filter Option */}
            <div className="filter-group">
              <h3>{locale === "ar" ? "نوع الموبايل" : "Phone Model"}</h3>
              <select
                className="sidebar-select"
                value={selectedModel}
                onChange={(e) => handleModelChange(e.target.value)}
              >
                <option value="All">{locale === "ar" ? "كل الموديلات" : "All Models"}</option>
                {uniqueModels.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Filter Options */}
            <div className="filter-group">
              <h3>{locale === "ar" ? "الفئة والنوع" : "Category"}</h3>
              <div className="sidebar-categories">
                <button
                  type="button"
                  className={`sidebar-cat-btn ${selectedCategory === "All" ? "is-active" : ""}`}
                  onClick={() => handleCategoryChange("All")}
                >
                  {locale === "ar" ? "الكل (جميع الأقسام)" : "All Categories"}
                </button>
                {uniqueCategories.map((cat) => (
                  <button
                    type="button"
                    key={cat}
                    className={`sidebar-cat-btn ${selectedCategory === cat ? "is-active" : ""}`}
                    onClick={() => handleCategoryChange(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

             {/* Price Range Filter Section */}
             <div className="filter-group">
               <h3>{locale === "ar" ? "نطاق السعر (ج.م)" : "Price Range (EGP)"}</h3>
               <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                 <input
                   type="number"
                   className="sidebar-select"
                   style={{ padding: "10px 14px", fontSize: "14px", width: "100%", border: "1.5px solid #0070f3", outline: "none", background: "var(--input-bg)", color: "var(--text)" }}
                   value={minPrice}
                   onChange={(e) => setMinPrice(e.target.value)}
                   placeholder={locale === "ar" ? "من" : "Min"}
                 />
                 <span style={{ color: "var(--muted)" }}>-</span>
                 <input
                   type="number"
                   className="sidebar-select"
                   style={{ padding: "10px 14px", fontSize: "14px", width: "100%", border: "1.5px solid #0070f3", outline: "none", background: "var(--input-bg)", color: "var(--text)" }}
                   value={maxPrice}
                   onChange={(e) => setMaxPrice(e.target.value)}
                   placeholder={locale === "ar" ? "إلى" : "Max"}
                 />
               </div>
             </div>

            {/* Sorting selector inside mobile sheet */}
            <div className="filter-group">
              <h3>{locale === "ar" ? "الترتيب" : "Sort By"}</h3>
              <select
                className="sidebar-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="default">{locale === "ar" ? "الافتراضي" : "Default"}</option>
                <option value="price-asc">{locale === "ar" ? "السعر: من الأقل للأعلى" : "Price: Low to High"}</option>
                <option value="price-desc">{locale === "ar" ? "السعر: من الأعلى للأقل" : "Price: High to Low"}</option>
              </select>
            </div>
          </div>

          <div className="mobile-filters-footer">
            <button
              type="button"
              className="apply-filters-btn"
              onClick={() => {
                setMobileFiltersOpen(false);
                updateParams({ search: searchQuery, category: selectedCategory, model: selectedModel });
              }}
            >
              {locale === "ar" ? "تطبيق تصفية المنتجات" : "Apply Filters"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <main className="simple-page" style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p className="empty-cart">Loading store...</p>
      </main>
    }>
      <ShopContent />
    </Suspense>
  );
}
