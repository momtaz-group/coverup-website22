"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import styles from "./FamilyRepresentative.module.css";

const MEMBERS = [
  { key: "father", name: "Ahmed", nameAr: "أحمد", role: "Father", roleAr: "الأب", phone: "iPhone 15 Pro Max" },
  { key: "mother", name: "Mother", nameAr: "الأم", role: "Mother", roleAr: "الأم", phone: "Galaxy S24" },
  { key: "me", name: "Me", nameAr: "أنا", role: "Representative", roleAr: "مندوب العيلة", phone: "iPhone 16 Pro" },
  { key: "sister", name: "Sara", nameAr: "سارة", role: "Sister", roleAr: "الأخت", phone: "iPhone 13" },
  { key: "brother", name: "Omar", nameAr: "عمر", role: "Brother", roleAr: "الأخ", phone: "Redmi Note 13" },
  { key: "friend", name: "Friend", nameAr: "صديق", role: "Friend", roleAr: "صديق", phone: "Samsung A55" },
];

const BENEFITS = [
  {
    title: "One Dashboard",
    titleAr: "لوحة واحدة",
    body: "Manage every family device from one account.",
    bodyAr: "ادير كل موبايلات العيلة من حساب واحد.",
  },
  {
    title: "Device Library",
    titleAr: "مكتبة الأجهزة",
    body: "Save each member's phone and never guess again.",
    bodyAr: "احفظ موبايل كل فرد وماتسألش تاني.",
  },
  {
    title: "MEMO AI",
    titleAr: "MEMO AI",
    body: "Get cases, screen protectors, chargers, cables, and accessories that fit.",
    bodyAr: "ترشيحات للكفرات والاسكرينات والشواحن والكابلات المناسبة.",
  },
  {
    title: "Quick Reorder",
    titleAr: "إعادة طلب سريعة",
    body: "Broken protector or missing cable? One click.",
    bodyAr: "اسكرينة اتكسرت أو كابل ناقص؟ ضغطة واحدة.",
  },
];

const TIMELINE = [
  { label: "Add family", labelAr: "أضف العيلة", detail: "Names, roles, and phones.", detailAr: "الأسماء، صلة القرابة، والموبايلات." },
  { label: "MEMO remembers", labelAr: "ميمو يفتكر", detail: "Compatibility and past orders.", detailAr: "التوافق والطلبات السابقة." },
  { label: "Order faster", labelAr: "اطلب أسرع", detail: "Cases, protectors, chargers, cables.", detailAr: "كفرات، اسكرينات، شواحن، وكابلات." },
];

const RECOMMENDATIONS = ["Carbon case", "Privacy glass", "65W charger", "USB-C cable", "Power bank"];

const AVATAR_IMAGES = {
  me: "/assets/family-members/avatar-me-crown-v4.png",
  father: "/assets/family-members/avatar-father-v4.png",
  mother: "/assets/family-members/avatar-mother-v4.png",
  wife: "/assets/family-members/avatar-wife-v4.png",
  sister: "/assets/family-members/avatar-sister-v4.png",
  brother: "/assets/family-members/avatar-brother-v4.png",
  friend: "/assets/family-members/avatar-friend-v4.png",
};

function AvatarLine({ type }) {
  return (
    <span className={styles.avatarLine} aria-hidden="true">
      <Image src={AVATAR_IMAGES[type] || AVATAR_IMAGES.friend} alt="" fill sizes="56px" className={styles.avatarImage} />
    </span>
  );
}

function FloatingCard({ member, index, ar }) {
  return (
    <article className={`${styles.floatCard} ${styles[`floatCard${index + 1}`]}`}>
      <AvatarLine type={member.key} />
      <div>
        <span>{ar ? member.roleAr : member.role}</span>
        <strong>{ar ? member.nameAr : member.name}</strong>
        <small>{member.phone}</small>
      </div>
    </article>
  );
}

export default function FamilyRepresentative({ children = null }) {
  const { locale } = useLanguage();
  const ar = locale === "ar";
  const text = (en, arabic) => (ar ? arabic : en);
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.18 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const handlePointerMove = (event) => {
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5).toFixed(3);
    const y = ((event.clientY - rect.top) / rect.height - 0.5).toFixed(3);
    node.style.setProperty("--mx", x);
    node.style.setProperty("--my", y);
  };

  return (
    <section
      ref={ref}
      className={`${styles.familySection} ${visible ? styles.visible : ""} ${children ? styles.withWorkspace : ""}`}
      dir={ar ? "rtl" : "ltr"}
      onPointerMove={handlePointerMove}
      aria-labelledby="family-representative-title"
    >
      <div className={styles.ambient} />
      <div className={styles.particles} aria-hidden="true" />

      <div className={styles.heroShell}>
        <div className={styles.copyBlock}>
          <p className={styles.kicker}>{text("Family Representative", "مندوب العيلة")}</p>
          <h2 id="family-representative-title">{text("One account for every phone in the family.", "حساب واحد لكل موبايلات العيلة.")}</h2>
          <p>
            {text(
              "Instead of everyone ordering separately, one trusted person manages devices, recommendations, reorders, warranties, and accessories from a single family dashboard.",
              "بدل ما كل فرد يطلب لوحده، شخص واحد يدير الأجهزة والترشيحات وإعادة الطلب والضمان والإكسسوارات من لوحة عائلية واحدة."
            )}
          </p>
          <div className={styles.heroActions}>
            <Link href="/family-visit#family-booking" className={styles.primaryCta}>
              {text("Open Family Dashboard", "افتح لوحة العيلة")}
            </Link>
            <Link href="/chat" className={styles.secondaryCta}>
              {text("Ask MEMO", "اسأل ميمو")}
            </Link>
          </div>
        </div>

        <div className={styles.heroVisual} aria-label={text("Family Representative preview", "معاينة مندوب العيلة")}>
          <div className={styles.heroImageFrame}>
            <Image
              src="/assets/family-representative-hero.png"
              alt={text("A family representative managing floating phone profile cards with MEMO AI", "مندوب العيلة يدير كروت موبايلات أفراد الأسرة بمساعدة ميمو")}
              width={1792}
              height={1024}
              priority={false}
              sizes="(max-width: 900px) 100vw, 58vw"
              className={styles.heroImage}
            />
            <div className={styles.scanLine} />
          </div>
          <div className={styles.orbitLayer} aria-hidden="true">
            {MEMBERS.map((member, index) => (
              <FloatingCard key={member.key} member={member} index={index} ar={ar} />
            ))}
            <svg className={styles.connections} viewBox="0 0 1000 640">
              <path d="M500 320C380 210 260 170 110 130" />
              <path d="M500 320C630 205 760 155 900 130" />
              <path d="M500 320C350 325 220 325 80 325" />
              <path d="M500 320C650 325 780 325 920 325" />
              <path d="M500 320C360 455 240 510 105 535" />
              <path d="M500 320C650 455 770 510 895 535" />
            </svg>
          </div>
        </div>
      </div>

      <div className={styles.problemBand}>
        <p>{text("Cover Up remembers what people normally forget.", "Cover Up يفتكر الحاجات اللي الناس بتنساها.")}</p>
        <div>
          {[
            text("Dad's phone model", "موبايل بابا"),
            text("Who needs a cable", "مين محتاج كابل"),
            text("Protector replacement", "ميعاد تغيير الاسكرينة"),
            text("Warranty history", "سجل الضمان"),
          ].map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </div>

      {children && <div className={styles.workspaceSlot}>{children}</div>}

      <div className={styles.dashboardStory}>
        <div className={styles.dashboardCopy}>
          <span className={styles.sectionLabel}>{text("Device Library", "مكتبة الأجهزة")}</span>
          <h3>{text("Every family member gets a living profile.", "كل فرد في العيلة له بروفايل حي.")}</h3>
          <p>
            {text(
              "Save Ahmed, Mother, Brother, kids, grandparents, or even a friend. Link each person to an existing saved phone or add a new one while booking.",
              "احفظ أحمد، الأم، الأخ، الأولاد، الجدود، أو حتى صديق. اربط كل فرد بموبايل محفوظ أو أضف موبايل جديد أثناء الحجز."
            )}
          </p>
        </div>

        <div className={styles.dashboardPanel}>
          <div className={styles.panelTop}>
            <span>{text("Family Dashboard", "لوحة العيلة")}</span>
            <strong>{MEMBERS.length} {text("profiles", "بروفايلات")}</strong>
          </div>
          <div className={styles.memberRail}>
            {MEMBERS.map((member) => (
              <article key={member.key} className={styles.memberRow}>
                <AvatarLine type={member.key} />
                <div>
                  <strong>{ar ? member.nameAr : member.name}</strong>
                  <span>{member.phone}</span>
                </div>
                <small>{text("Ready", "جاهز")}</small>
              </article>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.recommendationStrip}>
        <div>
          <span className={styles.sectionLabel}>{text("Smart Recommendations", "ترشيحات ذكية")}</span>
          <h3>{text("MEMO finds what fits before you search.", "ميمو يلاقي المناسب قبل ما تدور.")}</h3>
        </div>
        <div className={styles.recommendationCards}>
          {RECOMMENDATIONS.map((item, index) => (
            <span key={item} style={{ "--delay": `${index * 90}ms` }}>
              {item}
            </span>
          ))}
        </div>
      </div>

      <div className={styles.featureGrid}>
        {BENEFITS.map((benefit, index) => (
          <article key={benefit.title} className={styles.benefitCard} style={{ "--delay": `${index * 120}ms` }}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <h4>{ar ? benefit.titleAr : benefit.title}</h4>
            <p>{ar ? benefit.bodyAr : benefit.body}</p>
          </article>
        ))}
      </div>

      <div className={styles.timeline}>
        {TIMELINE.map((step, index) => (
          <article key={step.label} className={styles.timelineStep}>
            <span>{index + 1}</span>
            <h4>{ar ? step.labelAr : step.label}</h4>
            <p>{ar ? step.detailAr : step.detail}</p>
          </article>
        ))}
      </div>

      <div className={styles.ctaPanel}>
        <div>
          <span className={styles.kicker}>{text("Built for families", "مصمم للعيلة")}</span>
          <h3>{text("Never ask “what phone does dad have?” again.", "ماتسألش تاني: بابا معاه موبايل إيه؟")}</h3>
        </div>
        <Link href="/family-visit#family-booking" className={styles.primaryCta}>
          {text("Set up Family Representative", "فعّل مندوب العيلة")}
        </Link>
      </div>
    </section>
  );
}
