"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { supabase } from "@/utils/supabase";
import styles from "./page.module.css";

const MODELS = [
  ["Apple", "iPhone 16 Pro", "pro"], ["Apple", "iPhone 16", "dual"], ["Apple", "iPhone 15 Pro Max", "pro"], ["Apple", "iPhone 14", "dual"],
  ["Samsung", "Galaxy S25 Ultra", "ultra"], ["Samsung", "Galaxy S25", "triple"], ["Samsung", "Galaxy A56 5G", "triple"], ["Samsung", "Galaxy A36 5G", "triple"],
  ["Infinix", "Note 50 Pro", "triple"], ["Infinix", "Hot 50", "dual"], ["OPPO", "Reno13 Pro", "triple"], ["OPPO", "A5 Pro", "dual"],
].map(([brand, name, design]) => ({ brand, name, design }));

function DeviceSketch({ design = "pro" }) {
  const count = design === "dual" ? 2 : design === "ultra" ? 4 : 3;
  return <svg className={styles.sketch} viewBox="0 0 160 230" aria-hidden="true"><rect x="35" y="5" width="90" height="220" rx="19" fill="none" stroke="currentColor" strokeWidth="3"/><rect x="45" y="18" width="37" height={design === "ultra" ? 84 : 62} rx="10" fill="currentColor"/>{Array.from({ length: count }).map((_, index) => <circle key={index} cx={design === "ultra" ? 64 : index % 2 ? 69 : 58} cy={design === "ultra" ? 33 + index * 19 : 32 + Math.floor(index / 2) * 25} r="7" fill="white" stroke="currentColor" strokeWidth="2"/>)}<path d="M72 203h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;
}

const FEATURED_PRODUCTS = [
  {
    id: "carbon-slide",
    name: "كفر Carbon Slide Camera",
    name_en: "Carbon Slide Camera Case",
    image: "/assets/products/carbon-slide-camera-case.jpeg",
    category: "كفرات الكاربون",
    category_en: "Carbon Cases",
    category_slug: "cases"
  },
  {
    id: "orange-leopard",
    name: "كفر Leopard Orange",
    name_en: "Leopard Orange Case",
    image: "/assets/products/orange-leopard-camera-case.jpeg",
    category: "كفرات Leopard",
    category_en: "Leopard Cases",
    category_slug: "cases"
  },
  {
    id: "black-fabric",
    name: "كفر MagSafe Fabric أسود",
    name_en: "Black MagSafe Fabric Case",
    image: "/assets/products/black-magsafe-fabric-case.jpeg",
    category: "كفرات MagSafe",
    category_en: "MagSafe Cases",
    category_slug: "cases"
  },
  {
    id: "privacy-protector",
    name: "اسكرينة Privacy",
    name_en: "Privacy Screen Protector",
    image: "/assets/products/privacy-screen-protector.jpeg",
    category: "حماية الشاشة",
    category_en: "Screen Protectors",
    category_slug: "screen_protection"
  },
  {
    id: "samsung-clear",
    name: "كفر Samsung Clear Shockproof",
    name_en: "Samsung Clear Shockproof Case",
    image: "/assets/products/samsung-clear-shockproof-case.jpeg",
    category: "كفرات شفافة",
    category_en: "Clear Cases",
    category_slug: "cases"
  }
];

export default function HomePage() {
  const { locale } = useLanguage(); const ar = locale === "ar";
  const text = (en, arabic) => ar ? arabic : en;
  const [phones, setPhones] = useState([]); const [modal, setModal] = useState(false); const [query, setQuery] = useState(""); const [custom, setCustom] = useState(false);
  const [phoneName, setPhoneName] = useState(""); const [selected, setSelected] = useState(null); const [customBrand, setCustomBrand] = useState(""); const [customModel, setCustomModel] = useState(""); const [saving, setSaving] = useState(false); const [notice, setNotice] = useState("");
  const [chatPhone, setChatPhone] = useState(null);
  const [isChatSelection, setIsChatSelection] = useState(false);
  const [messages, setMessages] = useState(() => [{ who: "ai", text: text("Hey, I’m Memo. Tell me your phone and I’ll help you find something that actually fits.", "أهلاً، أنا Memo. قل لي نوع موبايلك وأنا أظبطلك حاجة تركب عليه بجد.") }]);
  
  // Carousel State & Logic
  const [activeIndex, setActiveIndex] = useState(2);
  
  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + FEATURED_PRODUCTS.length) % FEATURED_PRODUCTS.length);
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % FEATURED_PRODUCTS.length);
  };

  const getCardStyle = (index) => {
    let diff = index - activeIndex;
    const half = Math.floor(FEATURED_PRODUCTS.length / 2);
    if (diff > half) diff -= FEATURED_PRODUCTS.length;
    if (diff < -half) diff += FEATURED_PRODUCTS.length;

    const isActive = diff === 0;
    const absDiff = Math.abs(diff);

    if (absDiff > 2) {
      return {
        transform: "translateX(0) scale(0.6)",
        opacity: 0,
        zIndex: 0,
        pointerEvents: "none"
      };
    }

    const directionMultiplier = ar ? -1 : 1;
    const translationX = diff * 130 * directionMultiplier;
    const scale = isActive ? 1.12 : 1.0 - absDiff * 0.15;
    const rotateY = diff * -15 * directionMultiplier;
    const zIndex = 10 - absDiff * 2;
    const opacity = isActive ? 1 : 0.7 - absDiff * 0.2;
    const blur = isActive ? 0 : absDiff * 2.5;

    return {
      transform: `translateX(${translationX}px) scale(${scale}) rotateY(${rotateY}deg)`,
      zIndex,
      opacity,
      filter: blur > 0 ? `blur(${blur}px)` : "none",
      pointerEvents: isActive ? "auto" : "none",
      transition: "all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)"
    };
  };
  const results = useMemo(() => MODELS.filter((model) => `${model.brand} ${model.name}`.toLowerCase().includes(query.toLowerCase())), [query]);
  useEffect(() => { let active = true; supabase.auth.getUser().then(async ({ data: { user } }) => { if (!user) return; const { data } = await supabase.from("user_phones").select("*").order("created_at", { ascending: false }); if (active) setPhones(data || []); }); return () => { active = false; }; }, []);
  
  const handleSelectChatPhone = (brand, model) => {
    setChatPhone({ brand, model });
    setModal(false);
    setMessages((current) => [
      ...current,
      { who: "user", text: ar ? `موبايلي هو ${brand} ${model}` : `My phone is ${brand} ${model}` },
      { who: "ai", text: ar 
        ? `ممتاز! لقيت إكسسوارات وكفرات متوافقة مع موبايلك ${brand} ${model}. تقدر تتصفحها مباشرة من الخيارات تحت.`
        : `Awesome! I found compatible cases and screen protectors for your ${brand} ${model}. You can browse them directly from the options below.` }
    ]);
  };

  const openChatPhoneSelection = () => {
    setIsChatSelection(true);
    setModal(true);
  };

  const openAddPhone = () => {
    setIsChatSelection(false);
    setModal(true);
  };

  const ask = (prompt) => {
    // Check if prompt is a string to avoid click event objects
    const promptText = typeof prompt === "string" ? prompt : "";
    setMessages((current) => [
      ...current,
      ...(promptText ? [{ who: "user", text: promptText }] : []),
      { who: "ai", text: text("Nice. Choose a phone model, and I’ll load the right shelf for you.", "تمام. حدد موديل موبايلك وهحملك الرف المناسب ليه.") }
    ]);
    setIsChatSelection(true);
    setModal(true);
  };

  const savePhone = async (event) => {
    event.preventDefault();
    const device = custom ? { brand: customBrand.trim(), name: customModel.trim(), design: "triple" } : selected;
    if (!device?.brand || !device?.name || !phoneName.trim()) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      setNotice(text("Please sign in before saving a phone.", "سجّل الدخول أولاً لحفظ موبايلك."));
      return;
    }
    const { data, error } = await supabase.from("user_phones").insert({ user_id: user.id, phone_name: phoneName.trim(), brand: device.brand, model: device.name, design_key: device.design }).select().single();
    setSaving(false);
    if (error) {
      setNotice(error.message);
      return;
    }
    setPhones((items) => [data, ...items]);
    setModal(false);
    setPhoneName("");
    setSelected(null);
    setCustom(false);
  };
  return <main className={styles.home} dir={ar ? "rtl" : "ltr"}>
    <section className={styles.hero}>
      <div className={styles.heroIntro}>
        <span className={styles.eyebrow}>{text("SMART PROTECTION, SIMPLIFIED", "حماية ذكية، ببساطة")}</span>
        <h1>{text("Ask Memo. Find the perfect fit.", "اسأل Memo واعثر على المقاس الصح.")}</h1>
        <p>{text("A quick chat is all it takes to find accessories made for your exact phone.", "محادثة قصيرة تكفي لتجد الإكسسوارات المصممة لموبايلك بالضبط.")}</p>
        <div className={styles.trust}>
          <span>✓ {text("Exact model match", "مطابقة دقيقة للموديل")}</span>
          <span>✓ {text("Fast delivery", "توصيل سريع")}</span>
        </div>
      </div>
      <div className={styles.chatCard}>
        <div className={styles.chatHeader}>
          <span className={styles.aiMark}>M</span>
          <div>
            <strong>Memo</strong>
            <small>{text("Knows the shelves · awake", "حافظ الرفوف · صاحي")}</small>
          </div>
          <i />
        </div>
        <div className={styles.messages}>
          {messages.map((message, index) => (
            <p key={index} className={message.who === "ai" ? styles.aiMessage : styles.userMessage}>
              {message.text}
            </p>
          ))}
        </div>
        <div className={styles.chips}>
          {chatPhone ? (
            <>
              <Link 
                href={`/products?model=${encodeURIComponent(chatPhone.model)}&category=${encodeURIComponent(ar ? "كفرات" : "Cases")}`}
                className={styles.chipLink}
              >
                {text(`View cases for ${chatPhone.model}`, `عرض جرابات لـ ${chatPhone.model}`)}
              </Link>
              <Link 
                href={`/products?model=${encodeURIComponent(chatPhone.model)}&category=${encodeURIComponent(ar ? "حماية الشاشة" : "Screen Protection")}`}
                className={styles.chipLink}
              >
                {text(`View screen protectors`, `عرض اسكرينات لـ ${chatPhone.model}`)}
              </Link>
              <Link 
                href={`/family-visit?model=${encodeURIComponent(chatPhone.model)}`}
                className={styles.chipLink}
              >
                {text("Order family installation visit", "اطلب تركيب على الباب")}
              </Link>
              <button 
                type="button" 
                onClick={openChatPhoneSelection}
                style={{ background: "var(--panel-soft)", color: "var(--text)" }}
              >
                {text("Change phone", "تغيير الموبايل")}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => ask(text("I need a case", "أحتاج جراباً"))}>{text("I need a case", "أحتاج جراباً")}</button>
              <button onClick={() => ask(text("I need a screen protector", "أحتاج اسكرينة"))}>{text("Screen protector", "اسكرينة")}</button>
            </>
          )}
        </div>
        <button className={styles.chatButton} onClick={openChatPhoneSelection}>
          {chatPhone 
            ? text(`Active Phone: ${chatPhone.brand} ${chatPhone.model}`, `الهاتف الحالي: ${chatPhone.brand} ${chatPhone.model}`) 
            : text("Choose my phone", "اختيار موبايلك")} 
          <span>→</span>
        </button>
      </div>
    </section>

    <section className={styles.myPhones}>
      <div className={styles.sectionHeader}>
        <div>
          <span className={styles.eyebrow}>{text("MY PHONES", "موبايلاتي")}</span>
          <h2>{text("Your devices, ready when you are.", "أجهزتك جاهزة وقتما تحتاجها.")}</h2>
        </div>
        <button className={styles.plainButton} onClick={openAddPhone}>
          + {text("Add phone", "إضافة موبايل")}
        </button>
      </div>
      {notice && (
        <p className={styles.notice}>
          {notice} <Link href="/account">{text("Sign in", "تسجيل الدخول")}</Link>
        </p>
      )}
      <div className={styles.phoneGrid}>
        {phones.length ? (
          phones.map((phone) => (
            <article key={phone.id} className={styles.phoneCard}>
              <DeviceSketch design={phone.design_key} />
              <div>
                <span>{phone.brand}</span>
                <h3>{phone.phone_name}</h3>
                <p>{phone.model}</p>
                <Link href={`/products?model=${encodeURIComponent(phone.model)}`}>
                  {text("View matching products", "عرض المنتجات المناسبة")} →
                </Link>
              </div>
            </article>
          ))
        ) : (
          <button className={styles.emptyPhone} onClick={openAddPhone}>
            <b>+</b>
            <strong>{text("Add your phone", "أضف موبايلك")}</strong>
            <small>{text("Save your model for better recommendations.", "احفظ موديلك لترشيحات أدق.")}</small>
          </button>
        )}
      </div>
    </section>

    {/* Featured Products Cover Flow Carousel */}
    <section className={styles.featuredSection}>
      <div className={styles.sectionHeader} style={{ justifyContent: "center", textAlign: "center", flexDirection: "column", marginBottom: "40px" }}>
        <span className={styles.eyebrow}>{text("FEATURED PRODUCTS", "منتجات مميزة")}</span>
        <h2 style={{ margin: "12px 0 0", textAlign: "center" }}>{text("Engineered to protect.", "مصممة خصيصاً لحماية جهازك.")}</h2>
      </div>

      <div className={styles.carouselContainer}>
        <button
          type="button"
          className={`${styles.arrowBtn} ${styles.arrowLeft}`}
          onClick={handlePrev}
          aria-label={text("Previous product", "المنتج السابق")}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>

        <div className={styles.carouselStage}>
          {FEATURED_PRODUCTS.map((product, idx) => {
            const cardStyle = getCardStyle(idx);
            const isActive = idx === activeIndex;
            return (
              <div
                key={product.id}
                className={`${styles.carouselCard} ${isActive ? styles.cardActive : ""}`}
                style={cardStyle}
                onClick={() => setActiveIndex(idx)}
              >
                <div className={styles.cardImageWrapper}>
                  <img
                    src={product.image}
                    alt={ar ? product.name : product.name_en}
                    className={styles.cardImage}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          className={`${styles.arrowBtn} ${styles.arrowRight}`}
          onClick={handleNext}
          aria-label={text("Next product", "المنتج التالي")}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>

      {FEATURED_PRODUCTS[activeIndex] && (
        <div className={styles.infoArea}>
          <h3 className={styles.productCategory}>
            {ar ? FEATURED_PRODUCTS[activeIndex].category : FEATURED_PRODUCTS[activeIndex].category_en}
          </h3>
          <Link href={`/products?category=${FEATURED_PRODUCTS[activeIndex].category_slug}`} className={styles.shopNowLink}>
            <span>{text("Shop Now", "اطلب الآن")}</span>
            <span>{ar ? " ←" : " →"}</span>
          </Link>
        </div>
      )}

      <div className={styles.dotsContainer}>
        {FEATURED_PRODUCTS.map((_, idx) => (
          <button
            key={idx}
            type="button"
            className={`${styles.dot} ${idx === activeIndex ? styles.dotActive : ""}`}
            onClick={() => setActiveIndex(idx)}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </section>

    {modal && (
      <div className={styles.overlay} onMouseDown={() => setModal(false)}>
        <form 
          className={styles.modal} 
          onSubmit={isChatSelection ? (e) => {
            e.preventDefault();
            const brand = custom ? customBrand.trim() : selected?.brand;
            const model = custom ? customModel.trim() : selected?.name;
            if (brand && model) handleSelectChatPhone(brand, model);
          } : savePhone} 
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className={styles.modalTop}>
            <div>
              <span className={styles.eyebrow}>{text("YOUR DEVICE", "جهازك")}</span>
              <h2>{isChatSelection ? text("Select phone for chat", "تحديد الموبايل للمساعد") : text("Add a phone", "إضافة موبايل")}</h2>
            </div>
            <button type="button" onClick={() => setModal(false)} aria-label={text("Close", "إغلاق")}>×</button>
          </div>

          {phones.length > 0 && (
            <div className={styles.savedPhonePicker}>
              <strong>{text("Your saved phones", "موبايلاتك المحفوظة")}</strong>
              {phones.map((phone) => (
                isChatSelection ? (
                  <button
                    key={phone.id}
                    type="button"
                    style={{ 
                      display: "grid", 
                      gap: "4px", 
                      justifyItems: "center", 
                      background: "none", 
                      border: "1px solid var(--line)", 
                      borderRadius: "12px", 
                      padding: "10px", 
                      color: "var(--text)", 
                      cursor: "pointer" 
                    }}
                    onClick={() => handleSelectChatPhone(phone.brand, phone.model)}
                  >
                    <DeviceSketch design={phone.design_key} />
                    <span>{phone.phone_name}</span>
                    <small>{phone.brand} · {phone.model}</small>
                  </button>
                ) : (
                  <Link key={phone.id} href={`/products?model=${encodeURIComponent(phone.model)}`} onClick={() => setModal(false)}>
                    <DeviceSketch design={phone.design_key} />
                    <span>{phone.phone_name}</span>
                    <small>{phone.brand} · {phone.model}</small>
                  </Link>
                )
              ))}
            </div>
          )}

          {!isChatSelection && (
            <label>
              {text("A name for this phone", "اسم لهذا الموبايل")}
              <input autoFocus value={phoneName} onChange={(event) => setPhoneName(event.target.value)} placeholder={text("e.g. My personal phone", "مثال: موبايل الشخصي")} required />
            </label>
          )}

          <div className={styles.choiceTabs}>
            <button className={!custom ? styles.activeTab : ""} type="button" onClick={() => setCustom(false)}>{text("Find a model", "ابحث عن موديل")}</button>
            <button className={custom ? styles.activeTab : ""} type="button" onClick={() => setCustom(true)}>{text("Custom phone model", "موديل مخصص")}</button>
          </div>

          {custom ? (
            <div className={styles.customFields}>
              <label>{text("Brand", "الماركة")}<input value={customBrand} onChange={(event) => setCustomBrand(event.target.value)} placeholder={text("e.g. Xiaomi", "مثال: Xiaomi")} required /></label>
              <label>{text("Model", "الموديل")}<input value={customModel} onChange={(event) => setCustomModel(event.target.value)} placeholder={text("e.g. Redmi Note 13", "مثال: Redmi Note 13")} required /></label>
            </div>
          ) : (
            <>
              <label>{text("Search model", "ابحث عن الموديل")}<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={text("iPhone, Galaxy, OPPO…", "iPhone أو Galaxy أو OPPO…")} /></label>
              <div className={styles.results}>
                {results.map((model) => (
                  <button className={selected?.name === model.name ? styles.selected : ""} key={model.name} type="button" onClick={() => setSelected(model)}>
                    <span>{model.brand}</span>
                    <strong>{model.name}</strong>
                    <i>✓</i>
                  </button>
                ))}
              </div>
            </>
          )}

          {(selected || custom) && (
            <div className={styles.preview}>
              <DeviceSketch design={custom ? "triple" : selected.design} />
              <p>
                <strong>{custom ? (customModel || text("Your custom model", "موديلك المخصص")) : selected.name}</strong>
                {text("Your black & white fit preview", "معاينة بسيطة لمقاس جهازك")}
              </p>
            </div>
          )}

          <button className={styles.saveButton} disabled={saving || (!custom && !selected)}>
            {isChatSelection 
              ? text("Select for Chat", "تحديد للدردشة") 
              : saving 
                ? text("Saving…", "جارٍ الحفظ…") 
                : text("Save phone", "حفظ الموبايل")}
          </button>
        </form>
      </div>
    )}
  </main>;
}
