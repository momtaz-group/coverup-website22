"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "../context/LanguageContext";

export default function Footer() {
  const { t, locale } = useLanguage();
  const pathname = usePathname();
  const currentYear = new Date().getFullYear();

  if (pathname === "/chat" || pathname.startsWith("/admin")) return null;

  return (
    <footer className="site-footer">
      <div className="footer-brand">
        <Link href="/" className="brand">
          <img className="brand-logo" src="/assets/brand/cover-up-symbol.png" alt="" />
        </Link>
        <p>{t("footerText")}</p>
      </div>
      <div>
        <h3>{t("quickLinks")}</h3>
        <Link href="/#services">{locale === "ar" ? "الخدمات" : "Services"}</Link>
        <Link href="/products">{t("navShop")}</Link>
        <Link href="/#repairs">{t("navRepairs")}</Link>
        <Link href="/#corporate">{t("navCorporate")}</Link>
        <Link href="/policies">{locale === "ar" ? "الشروط والسياسات" : "Policies"}</Link>
        <Link href="/faq">{locale === "ar" ? "الأسئلة الشائعة" : "FAQ"}</Link>
      </div>
      <div>
        <h3>{t("contactTitle")}</h3>
        <p>R3, Egypt</p>
        <a href="tel:+201050310516">01050310516</a>
        <a href="mailto:hello@coverup.tech">hello@coverup.tech</a>
        <p>{t("hours")}</p>
      </div>
      <p className="copyright">
        © <span>{currentYear}</span> Cover Up. {locale === "ar" ? "جميع الحقوق محفوظة." : "All rights reserved."}
      </p>
    </footer>
  );
}
