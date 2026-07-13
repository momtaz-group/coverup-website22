"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLanguage } from "../context/LanguageContext";
import { useCart } from "../context/CartContext";
import { useTheme } from "../context/ThemeContext";
import { supabase } from "../utils/supabase";

export default function Header() {
  const { t, locale, toggleLanguage } = useLanguage();
  const { cartCount } = useCart();
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [sideDrawerOpen, setSideDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [hash, setHash] = useState(() => (typeof window !== "undefined" ? window.location.hash : ""));
  const [headerHidden, setHeaderHidden] = useState(false);

  useEffect(() => {
    const handleHashChange = () => {
      setHash(window.location.hash);
    };

    let lastScrollY = typeof window !== "undefined" ? window.scrollY : 0;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const isMobile = window.innerWidth <= 760;

      if (!isMobile || currentScrollY < 24) {
        setHeaderHidden(false);
      } else if (currentScrollY > lastScrollY + 8) {
        setHeaderHidden(true);
      } else if (currentScrollY < lastScrollY - 8) {
        setHeaderHidden(false);
      }

      lastScrollY = currentScrollY;
    };

    window.addEventListener("hashchange", handleHashChange);
    window.addEventListener("scroll", handleScroll, { passive: true });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setCustomerName(session.user.user_metadata?.name || session.user.user_metadata?.username || "");
      } else {
        setCustomerName("");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setCustomerName(session.user.user_metadata?.name || session.user.user_metadata?.username || "");
      } else {
        setCustomerName("");
      }
    });

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
      window.removeEventListener("scroll", handleScroll);
      subscription.unsubscribe();
    };
  }, [pathname]);

  useEffect(() => {
    setSearchOpen(false);
    setMobileSearchOpen(false);
  }, [pathname]);

  const getFirstName = (fullName) => {
    if (!fullName) return "";
    return fullName.trim().split(/\s+/)[0];
  };

  const submitSearch = (event) => {
    event.preventDefault();
    const query = searchTerm.trim();
    router.push(query ? `/products?search=${encodeURIComponent(query)}` : "/products");
    setSearchOpen(false);
    setMobileSearchOpen(false);
  };

  const navItems = [
    {
      href: "/",
      active: pathname === "/" && !hash,
      label: locale === "ar" ? "الرئيسية" : "Home",
      icon: <path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" />,
    },
    {
      href: "/products",
      active: pathname === "/products" && !hash,
      label: t("navShop"),
      icon: (
        <>
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
          <path d="M3 6h18" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </>
      ),
    },
    {
      href: "/family-visit",
      active: pathname === "/family-visit",
      label: t("navFamily"),
      icon: (
        <>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </>
      ),
    },
    {
      href: "/corporate",
      active: pathname === "/corporate",
      label: t("navCorporate"),
      icon: (
        <>
          <rect x="4" y="2" width="16" height="20" rx="2" />
          <path d="M9 22v-6h6v6" />
          <path d="M9 8h.01M15 8h.01M9 12h.01M15 12h.01" />
        </>
      ),
    },
    {
      href: "/services",
      active: pathname === "/services",
      label: locale === "ar" ? "الخدمات" : "Services",
      icon: (
        <>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v8M8 12h8" />
        </>
      ),
    },
  ];

  if (pathname === "/chat") return null;

  return (
    <>
      <header className={`site-header ${headerHidden ? "mobile-hidden" : ""}`} id="top">
        {/* Mobile Left Tools (Search & Settings) */}
        <div className="mobile-header-tools mobile-header-left">
          <button
            className="icon-action-btn mobile-search-trigger"
            type="button"
            aria-label={locale === "ar" ? "بحث" : "Search"}
            onClick={() => setMobileSearchOpen(true)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </button>

          <button
            className="icon-action-btn settings-btn"
            type="button"
            aria-label={locale === "ar" ? "الإعدادات واللغة" : "Settings & Language"}
            title={locale === "ar" ? "الإعدادات واللغة" : "Settings & Language"}
            onClick={() => setSideDrawerOpen(true)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
          </button>
        </div>

        {/* Brand Logo */}
        <Link href="/" className="brand" aria-label="Cover Up home">
          <img
            src={theme === "dark" ? "/assets/brand/Coverup(white).png" : "/assets/brand/Coverup(black).png"}
            alt="Cover Up"
            style={{ height: "40px", width: "auto", display: "block", objectFit: "contain" }}
          />
        </Link>

        {/* Desktop Main Navigation Tabs */}
        <nav className="site-nav" aria-label="Main navigation">
          <Link href="/" className={pathname === "/" && !hash ? "is-active" : ""}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            {locale === "ar" ? "الرئيسية" : "Home"}
          </Link>
          <Link href="/products" className={pathname === "/products" && !hash ? "is-active" : ""}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <path d="M16 10a4 4 0 0 1-8 0"></path>
            </svg>
            {t("navShop")}
          </Link>
          <Link href="/family-visit" className={pathname === "/family-visit" ? "is-active" : ""}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            {t("navFamily")}
          </Link>
          <Link href="/corporate" className={pathname === "/corporate" ? "is-active" : ""}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
              <line x1="9" y1="22" x2="9" y2="16"></line>
              <line x1="15" y1="22" x2="15" y2="16"></line>
              <line x1="9" y1="16" x2="15" y2="16"></line>
            </svg>
            {t("navCorporate")}
          </Link>
          <Link href="/services" className={pathname === "/services" ? "is-active" : ""}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="16"></line>
              <line x1="8" y1="12" x2="16" y2="12"></line>
            </svg>
            {locale === "ar" ? "خدمات إضافية" : "More Services"}
          </Link>
        </nav>

        {/* Desktop Header Actions (Search, Account, Cart, Settings/Customize) */}
        <div className="desktop-header-actions">
          <Link
            href="/account"
            className="icon-action-btn account-btn"
            aria-label={locale === "ar" ? (customerName ? "حسابي" : "تسجيل الدخول") : customerName ? "My Profile" : "Sign In"}
            title={customerName ? `${locale === "ar" ? "حساب: " : "Profile: "}${customerName}` : locale === "ar" ? "تسجيل الدخول" : "Sign In"}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <span className="header-username-label">
              {customerName ? getFirstName(customerName) : locale === "ar" ? "تسجيل الدخول" : "Sign In"}
            </span>
          </Link>

          <div className="header-search-wrap">
            <button
              className="icon-action-btn search-btn desktop-search-btn"
              type="button"
              aria-label={locale === "ar" ? "بحث" : "Search"}
              onClick={() => setSearchOpen((current) => !current)}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </button>
            {searchOpen && (
              <form className="header-search-popover" onSubmit={submitSearch}>
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder={locale === "ar" ? "ابحث في المنتجات..." : "Search products..."}
                  autoFocus
                />
                <button type="submit">{locale === "ar" ? "بحث" : "Search"}</button>
              </form>
            )}
          </div>

          <Link
            href="/cart"
            className="icon-action-btn cart-btn"
            aria-label={locale === "ar" ? "السلة" : "Cart"}
            title={locale === "ar" ? "السلة" : "Cart"}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </Link>

          <button
            className="icon-action-btn settings-btn"
            type="button"
            aria-label={locale === "ar" ? "الإعدادات واللغة" : "Settings & Language"}
            title={locale === "ar" ? "الإعدادات واللغة" : "Settings & Language"}
            onClick={() => setSideDrawerOpen(true)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
          </button>
        </div>

        {/* Mobile Right Tools (Account & Cart) */}
        <div className="mobile-header-tools mobile-header-right">
          <Link
            href="/account"
            className="icon-action-btn account-btn"
            aria-label={locale === "ar" ? (customerName ? "حسابي" : "تسجيل الدخول") : customerName ? "My Profile" : "Sign In"}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </Link>

          <Link
            href="/cart"
            className="icon-action-btn cart-btn"
            aria-label={locale === "ar" ? "السلة" : "Cart"}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </Link>
        </div>
      </header>

      {mobileSearchOpen && (
        <div className="mobile-search-page" role="dialog" aria-modal="true">
          <div className="mobile-search-head">
            <strong>{locale === "ar" ? "البحث" : "Search"}</strong>
            <button type="button" onClick={() => setMobileSearchOpen(false)} aria-label={locale === "ar" ? "إغلاق" : "Close"}>
              ×
            </button>
          </div>
          <form className="mobile-search-form" onSubmit={submitSearch}>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={locale === "ar" ? "اسم المنتج أو موديل الموبايل..." : "Product or phone model..."}
              autoFocus
            />
            <button type="submit">{locale === "ar" ? "بحث" : "Search"}</button>
          </form>
        </div>
      )}

      {pathname !== "/chat" && (
        <nav className="mobile-bottom-nav" aria-label={locale === "ar" ? "التنقل الرئيسي" : "Primary navigation"}>
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className={item.active ? "is-active" : ""}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {item.icon}
              </svg>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      )}

      <div className={`side-drawer-backdrop ${sideDrawerOpen ? "is-open" : ""}`} onClick={() => setSideDrawerOpen(false)}></div>

      <aside className={`side-drawer ${sideDrawerOpen ? "is-open" : ""}`}>
        <div className="side-drawer-header">
          <h2>{locale === "ar" ? "القائمة والإعدادات" : "Menu & Settings"}</h2>
          <button
            type="button"
            className="drawer-close-btn"
            aria-label={locale === "ar" ? "إغلاق" : "Close"}
            onClick={() => setSideDrawerOpen(false)}
          >
            &times;
          </button>
        </div>

        <div className="side-drawer-section">
          <h3>{locale === "ar" ? "اللغة" : "Language"}</h3>
          <div className="segmented-control">
            <button className={`segmented-option ${locale === "ar" ? "active" : ""}`} type="button" onClick={() => locale !== "ar" && toggleLanguage()}>
              العربية
            </button>
            <button className={`segmented-option ${locale === "en" ? "active" : ""}`} type="button" onClick={() => locale !== "en" && toggleLanguage()}>
              English
            </button>
          </div>
        </div>

        <div className="side-drawer-section">
          <h3>{locale === "ar" ? "المظهر" : "Appearance"}</h3>
          <div className="segmented-control">
            <button
              className={`segmented-option ${theme === "light" ? "active" : ""}`}
              type="button"
              onClick={() => setTheme("light")}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
              {locale === "ar" ? "فاتح" : "Light"}
            </button>
            <button
              className={`segmented-option ${theme === "dark" ? "active" : ""}`}
              type="button"
              onClick={() => setTheme("dark")}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
              {locale === "ar" ? "داكن" : "Dark"}
            </button>
          </div>
        </div>

        <div style={{ marginTop: "auto", borderTop: "1px solid var(--line)", paddingTop: "20px", opacity: 0.6, fontSize: "12px" }}>
          <span>© Cover Up {new Date().getFullYear()}</span>
        </div>
      </aside>
    </>
  );
}
