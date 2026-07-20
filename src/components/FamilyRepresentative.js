"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import styles from "./FamilyRepresentative.module.css";

const FAMILY_MEMBERS = [
  { name: "Ahmed", nameAr: "أحمد", phone: "iPhone 15 Pro Max", avatar: "👨" },
  { name: "Mother", nameAr: "الأم", phone: "Galaxy S24", avatar: "👩" },
  { name: "Sara", nameAr: "سارة", phone: "iPhone 13", avatar: "👧" },
  { name: "Omar", nameAr: "عمر", phone: "Redmi Note 13", avatar: "👦" },
];

const FEATURES = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
    title: "One Dashboard",
    titleAr: "لوحة تحكم واحدة",
    description: "Manage all family members from one place.",
    descriptionAr: "أدر جميع أفراد عيلتك من مكان واحد.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
        <line x1="12" y1="18" x2="12.01" y2="18" />
      </svg>
    ),
    title: "Device Library",
    titleAr: "مكتبة الأجهزة",
    description: "Store every family member's phone.",
    descriptionAr: "احفظ موبايل كل فرد في العيلة.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    title: "Smart Recommendations",
    titleAr: "توصيات ذكية",
    description: "MEMO AI recommends the best accessories for every saved phone.",
    descriptionAr: "ميمو يرشحلك أفضل الإكسسوارات لكل موبايل محفوظ.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 4 23 10 17 10" />
        <polyline points="1 20 1 14 7 14" />
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
      </svg>
    ),
    title: "Quick Reorder",
    titleAr: "إعادة طلب سريعة",
    description: "Broken screen protector? One click.",
    descriptionAr: "اسكرينة اتكسرت؟ ضغطة واحدة.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: "Family History",
    titleAr: "سجل العيلة",
    description: "View previous orders and recommendations for every family member.",
    descriptionAr: "شوف الطلبات والتوصيات لكل فرد في العيلة.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    title: "Save Time",
    titleAr: "وفّر وقتك",
    description: "Never ask 'What phone does dad have?' again.",
    descriptionAr: "مش هتسأل تاني 'بابا عنده موبايل إيه؟'",
  },
];

function ProfileCard({ member, index, isVisible }) {
  return (
    <div
      className={`${styles.profileCard} ${isVisible ? styles.profileCardVisible : ""}`}
      style={{ animationDelay: `${index * 0.15}s` }}
    >
      <div className={styles.profileAvatar}>{member.avatar}</div>
      <div className={styles.profileInfo}>
        <span className={styles.profileName}>{member.nameAr}</span>
        <span className={styles.profilePhone}>{member.phone}</span>
      </div>
      <div className={styles.profileGlow} />
    </div>
  );
}

function ConnectionLine({ from, to, isVisible }) {
  return (
    <svg
      className={`${styles.connectionLine} ${isVisible ? styles.connectionLineVisible : ""}`}
      style={{ animationDelay: `${0.5 + Math.random() * 0.3}s` }}
      viewBox="0 0 200 200"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={`lineGrad-${from}-${to}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0066FF" stopOpacity="0.6" />
          <stop offset="50%" stopColor="#3B82F6" stopOpacity="1" />
          <stop offset="100%" stopColor="#0066FF" stopOpacity="0.6" />
        </linearGradient>
      </defs>
      <line
        x1="100"
        y1="100"
        x2={from === "left" ? "20" : "180"}
        y2={to === "top" ? "20" : to === "bottom" ? "180" : "100"}
        stroke={`url(#lineGrad-${from}-${to})`}
        strokeWidth="1.5"
        strokeDasharray="4 4"
      />
    </svg>
  );
}

export default function FamilyRepresentative() {
  const { locale } = useLanguage();
  const ar = locale === "ar";
  const text = (en, arabic) => (ar ? arabic : en);
  const sectionRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className={styles.familySection} dir={ar ? "rtl" : "ltr"}>
      {/* Background Effects */}
      <div className={styles.bgGlow} />
      <div className={styles.bgGrid} />

      {/* Hero */}
      <div className={`${styles.hero} ${isVisible ? styles.heroVisible : ""}`}>
        <div className={styles.eyebrowContainer}>
          <span className={styles.eyebrow}>{text("FAMILY FEATURE", "ميزة عائلية")}</span>
        </div>

        <h2 className={styles.heroTitle}>
          {text("Family Representative", "مندوب العيلة")}
        </h2>

        <p className={styles.heroSubtitle}>
          {text(
            "One person manages everyone's devices from one dashboard.",
            "شخص واحد يدير أجهزة الكل من لوحة تحكم واحدة."
          )}
        </p>
      </div>

      {/* Hero Illustration - Dad with floating profile cards */}
      <div className={`${styles.illustrationContainer} ${isVisible ? styles.illustrationVisible : ""}`}>
        <div className={styles.illustrationCenter}>
          {/* Dad avatar */}
          <div className={styles.dadAvatar}>
            <div className={styles.dadIcon}>👨‍💻</div>
            <div className={styles.dadGlow} />
          </div>

          {/* Floating profile cards */}
          <div className={styles.floatingCards}>
            {FAMILY_MEMBERS.map((member, index) => (
              <ProfileCard
                key={member.name}
                member={member}
                index={index}
                isVisible={isVisible}
              />
            ))}
          </div>

          {/* Connection lines */}
          <div className={styles.connectionLines}>
            <ConnectionLine from="left" to="top" isVisible={isVisible} />
            <ConnectionLine from="right" to="top" isVisible={isVisible} />
            <ConnectionLine from="left" to="bottom" isVisible={isVisible} />
            <ConnectionLine from="right" to="bottom" isVisible={isVisible} />
          </div>

          {/* MEMO mascot floating */}
          <div className={`${styles.memoMascot} ${isVisible ? styles.memoMascotVisible : ""}`}>
            <img
              src="/assets/memo-profile-96.webp"
              alt="Memo"
              className={styles.memoImg}
              width="48"
              height="48"
            />
          </div>
        </div>
      </div>

      {/* Problems Section */}
      <div className={`${styles.problemsSection} ${isVisible ? styles.sectionVisible : ""}`}>
        <h3 className={styles.sectionTitle}>
          {text("The Problem", "المشكلة")}
        </h3>
        <div className={styles.problemsGrid}>
          <div className={styles.problemCard}>
            <span className={styles.problemIcon}>🤔</span>
            <p>{text("Which phone does each person own?", "كل واحد في العيلة عنده موبايل إيه؟")}</p>
          </div>
          <div className={styles.problemCard}>
            <span className={styles.problemIcon}>📦</span>
            <p>{text("What accessories do they need?", "محتاج إكسسوارات إيه؟")}</p>
          </div>
          <div className={styles.problemCard}>
            <span className={styles.problemIcon}>🔄</span>
            <p>{text("When to replace screen protectors?", "إمتى أغير الإسكرينة؟")}</p>
          </div>
          <div className={styles.problemCard}>
            <span className={styles.problemIcon}>🔌</span>
            <p>{text("Who has a charger?", "مين عنده شاحن؟")}</p>
          </div>
        </div>
        <div className={styles.solutionBadge}>
          <span>Cover Up {text("remembers everything", "بيفتكر كل حاجة")}</span>
        </div>
      </div>

      {/* Features Grid */}
      <div className={`${styles.featuresSection} ${isVisible ? styles.sectionVisible : ""}`}>
        <h3 className={styles.sectionTitle}>
          {text("What You Get", "اللي هتاخده")}
        </h3>
        <div className={styles.featuresGrid}>
          {FEATURES.map((feature, index) => (
            <div
              key={feature.title}
              className={`${styles.featureCard} ${isVisible ? styles.featureCardVisible : ""}`}
              style={{ animationDelay: `${0.2 + index * 0.1}s` }}
            >
              <div className={styles.featureIcon}>{feature.icon}</div>
              <h4 className={styles.featureTitle}>
                {ar ? feature.titleAr : feature.title}
              </h4>
              <p className={styles.featureDescription}>
                {ar ? feature.descriptionAr : feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Device Library Showcase */}
      <div className={`${styles.showcaseSection} ${isVisible ? styles.sectionVisible : ""}`}>
        <div className={styles.showcaseContent}>
          <h3 className={styles.sectionTitle}>
            {text("Device Library", "مكتبة الأجهزة")}
          </h3>
          <p className={styles.sectionDescription}>
            {text(
              "Store every family member's phone. MEMO will remember everything.",
              "احفظ موبايل كل فرد في العيلة. ميمو هيفتكر كل حاجة."
            )}
          </p>

          <div className={styles.deviceList}>
            {FAMILY_MEMBERS.map((member, index) => (
              <div
                key={member.name}
                className={`${styles.deviceItem} ${isVisible ? styles.deviceItemVisible : ""}`}
                style={{ animationDelay: `${0.3 + index * 0.1}s` }}
              >
                <div className={styles.deviceAvatar}>{member.avatar}</div>
                <div className={styles.deviceInfo}>
                  <span className={styles.deviceName}>{member.nameAr}</span>
                  <span className={styles.devicePhone}>{member.phone}</span>
                </div>
                <div className={styles.deviceStatus}>
                  <span className={styles.statusDot} />
                  <span>{text("Active", "نشط")}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.showcaseVisual}>
          <div className={styles.phoneMockup}>
            <div className={styles.phoneScreen}>
              <div className={styles.screenHeader}>
                <span className={styles.screenTitle}>{text("Family", "العيلة")}</span>
                <span className={styles.screenCount}>4 {text("devices", "أجهزة")}</span>
              </div>
              {FAMILY_MEMBERS.map((member, index) => (
                <div
                  key={member.name}
                  className={styles.screenMember}
                  style={{ animationDelay: `${0.5 + index * 0.15}s` }}
                >
                  <span className={styles.screenAvatar}>{member.avatar}</span>
                  <div className={styles.screenInfo}>
                    <span>{member.nameAr}</span>
                    <small>{member.phone}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className={`${styles.ctaSection} ${isVisible ? styles.ctaVisible : ""}`}>
        <h3 className={styles.ctaTitle}>
          {text("Ready to be the Family Representative?", "جاهز تبقى مندوب العيلة؟")}
        </h3>
        <p className={styles.ctaSubtitle}>
          {text(
            "Save your family's devices. Leave the rest to MEMO.",
            "احفظ أجهزة عيلتك... وسيبهــا على MEMO."
          )}
        </p>
        <div className={styles.ctaButtons}>
          <Link href="/chat" className={styles.ctaPrimary}>
            {text("Get Started Free", "ابدأ مجانًا")}
          </Link>
          <Link href="#features" className={styles.ctaSecondary}>
            {text("Learn More", "اعرف أكثر")}
          </Link>
        </div>
      </div>
    </section>
  );
}
