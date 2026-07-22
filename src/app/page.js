"use client";

import { useEffect, useMemo, useState, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import OptimizedVideo from "@/components/OptimizedVideo";
import { useLanguage } from "@/context/LanguageContext";
import { useCart } from "@/context/CartContext";
import { supabase } from "@/utils/supabase";
import { createUserPhone, deleteUserPhone, loadUserPhones, updateUserPhone } from "@/utils/userPhones";
import { isIOSBrowser } from "@/utils/ios-media";
import { loadInitialMessages, storeMessages, loadInitialChatPhone, storeChatPhone } from "@/utils/chatStore";
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

const subscribeToDeviceSnapshot = () => () => {};
const getIOSBrowserSnapshot = () => isIOSBrowser();
const getServerIOSBrowserSnapshot = () => false;

function TypewriterText({ text, speed = 10, onComplete, scrollContainerRef }) {
  const [displayText, setDisplayText] = useState("");
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    let index = 0;
    setDisplayText("");
    const interval = setInterval(() => {
      setDisplayText((current) => {
        if (index >= text.length) {
          clearInterval(interval);
          return current;
        }
        return current + text.charAt(index);
      });
      index++;

      if (scrollContainerRef && scrollContainerRef.current) {
        const container = scrollContainerRef.current;
        const isNearBottom = container.scrollHeight - container.clientHeight - container.scrollTop < 80;
        if (isNearBottom) {
          container.scrollTop = container.scrollHeight;
        }
      }

      if (index >= text.length) {
        clearInterval(interval);
        if (onCompleteRef.current) onCompleteRef.current();
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, scrollContainerRef]);

  return <>{displayText}</>;
}

export default function HomePage() {
  const { locale } = useLanguage(); const ar = locale === "ar";
  const { addToCart, showToast } = useCart();
  const text = (en, arabic) => ar ? arabic : en;
  const [phones, setPhones] = useState([]); const [modal, setModal] = useState(false); const [query, setQuery] = useState(""); const [custom, setCustom] = useState(false);
  const [phoneName, setPhoneName] = useState(""); const [selected, setSelected] = useState(null); const [customBrand, setCustomBrand] = useState(""); const [customModel, setCustomModel] = useState(""); const [saving, setSaving] = useState(false); const [notice, setNotice] = useState("");
  const [editingPhone, setEditingPhone] = useState(null);
  const [phoneToDelete, setPhoneToDelete] = useState(null);
  const [phoneMenuOpen, setPhoneMenuOpen] = useState("");
  const [deletingPhone, setDeletingPhone] = useState(false);
  const [chatPhone, setChatPhone] = useState(null);
  const [isChatSelection, setIsChatSelection] = useState(false);


  const [messages, setMessages] = useState(() => {
    const stored = loadInitialMessages();
    if (stored && stored.length > 0) return stored;
    return [{ who: "ai", text: text("Hey, I’m Memo. Tell me your phone and I’ll help you find something that actually fits.", "أهلاً، أنا Memo. قل لي نوع موبايلك وأنا أظبطلك حاجة تركب عليه بجد.") }];
  });
  
  const [inputText, setInputText] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  
  const messagesContainerRef = useRef(null);

  // Sync messages to module store + sessionStorage on every change
  useEffect(() => {
    storeMessages(messages);
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Also scroll when loading state changes
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [aiBusy]);

  const handleTypewriterComplete = (index) => {
    setMessages((current) =>
      current.map((msg, i) => (i === index ? { ...msg, isNew: false } : msg))
    );
  };

  const idleVideoRef = useRef(null);
  const searchVideoRef = useRef(null);
  const useIosMemoMov = useSyncExternalStore(
    subscribeToDeviceSnapshot,
    getIOSBrowserSnapshot,
    getServerIOSBrowserSnapshot
  );

  const [activeVideo, setActiveVideo] = useState("idle");
  const targetVideoState = inputText.trim().length > 0 || aiBusy ? "searching" : "idle";
  const idleVideoSrc = useIosMemoMov ? "https://assets.coverup.tech/Memo_The_Mascoot/idle.mov" : "/media/memo/idle.webm";
  const searchingVideoSrc = useIosMemoMov ? "https://assets.coverup.tech/Memo_The_Mascoot/Searching.mov" : "/media/memo/Searching.webm";

  const handleVideoEnded = (type) => {
    if (activeVideo !== type) return;

    if (activeVideo !== targetVideoState) {
      setActiveVideo(targetVideoState);
      const nextRef = targetVideoState === "idle" ? idleVideoRef.current : searchVideoRef.current;
      if (nextRef) {
        nextRef.currentTime = 0;
        nextRef.play().catch(()=>{});
      }
    } else {
      const currentRef = activeVideo === "idle" ? idleVideoRef.current : searchVideoRef.current;
      if (currentRef) {
        currentRef.currentTime = 0;
        currentRef.play().catch(()=>{});
      }
    }
  };

  const submitMessage = async (messageText, activePhone = chatPhone) => {
    if (!messageText.trim()) return;

    setAiBusy(true);

    const updatedMessages = [
      ...messages,
      { who: "user", text: messageText }
    ];

    setMessages(updatedMessages);
    // Synchronously persist to module store so /chat page reads this immediately on navigation
    storeMessages(updatedMessages);

    const apiMessages = updatedMessages.map(m => ({
      role: m.who === "user" ? "user" : "assistant",
      content: m.text
    }));

    if (activePhone) {
      apiMessages.unshift({
        role: "system",
        content: `The customer has selected their phone model: ${activePhone.brand} ${activePhone.model}. Keep this model in mind for recommendations.`
      });
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, phone: activePhone })
      });

      const data = await response.json();
      if (response.ok) {
        const withAi = [
          ...updatedMessages,
          { 
            who: "ai", 
            text: data.message, 
            products: data.products || [],
            isNew: true
          }
        ];
        setMessages(withAi);
        storeMessages(withAi); // storeMessages strips isNew before saving
      } else {
        setMessages((current) => [
          ...current,
          { 
            who: "ai", 
            text: data.message || (ar ? "عذراً، حدث خطأ ما." : "Sorry, an error occurred.") 
          }
        ]);
      }
    } catch (err) {
      console.error(err);
      setMessages((current) => [
        ...current,
        { 
          who: "ai", 
          text: ar 
            ? "ثانية واحدة، واضح إن ميمو اتخانق مع السيرفر. جرّب تاني كمان لحظة." 
            : "Memo lost the argument with the server for a second. Please try again." 
        }
      ]);
    } finally {
      setAiBusy(false);
    }
  };

  const handleSendGpt = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    const userMessage = inputText.trim();
    setInputText("");
    await submitMessage(userMessage);
  };
  
  const [wishlist, setWishlist] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);

  const toggleWishlist = (id) => {
    setWishlist((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        localStorage.setItem("coverup_wishlist", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const results = useMemo(() => MODELS.filter((model) => `${model.brand} ${model.name}`.toLowerCase().includes(query.toLowerCase())), [query]);
  
  useEffect(() => {
    let active = true;

    // Load featured products config and items
    fetch("/api/featured-products")
      .then((res) => res.json())
      .then((data) => {
        if (active && data && Array.isArray(data.products)) {
          setFeaturedProducts(data.products);
        }
      })
      .catch(() => {});

    try {
      const savedWishlist = JSON.parse(localStorage.getItem("coverup_wishlist") || "[]");
      if (Array.isArray(savedWishlist)) setWishlist(savedWishlist);
    } catch {}

    loadUserPhones()
      .then((data) => {
        if (active) setPhones(data);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);
  const handleSelectChatPhone = (brand, model) => {
    const nextPhone = { brand, model };
    setChatPhone(nextPhone);
    setModal(false);
    submitMessage(ar ? `موبايلي هو ${brand} ${model}` : `My phone is ${brand} ${model}`, nextPhone);
  };

  const openChatPhoneSelection = () => {
    setIsChatSelection(true);
    setModal(true);
  };

  const openAddPhone = () => {
    setIsChatSelection(false);
    setEditingPhone(null);
    setPhoneName("");
    setSelected(null);
    setCustom(false);
    setCustomBrand("");
    setCustomModel("");
    setQuery("");
    setModal(true);
  };

  const openEditPhone = (phone) => {
    setIsChatSelection(false);
    setEditingPhone(phone);
    setPhoneName(phone.phone_name || "");
    setSelected(null);
    setCustom(true);
    setCustomBrand(phone.brand || "");
    setCustomModel(phone.model || "");
    setQuery("");
    setModal(true);
  };

  const confirmDeletePhone = async () => {
    if (!phoneToDelete) return;
    setNotice("");
    setDeletingPhone(true);
    try {
      await deleteUserPhone(phoneToDelete.id);
      setPhones((items) => items.filter((item) => item.id !== phoneToDelete.id));
      if (chatPhone?.brand === phoneToDelete.brand && chatPhone?.model === phoneToDelete.model) {
        setChatPhone(null);
      }
      setPhoneToDelete(null);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setDeletingPhone(false);
    }
  };

  const ask = (prompt) => {
    const promptText = typeof prompt === "string" ? prompt : "";
    if (promptText) {
      submitMessage(promptText);
    }
  };

  const savePhone = async (event) => {
    event.preventDefault();
    const device = custom ? { brand: customBrand.trim(), name: customModel.trim(), design: "triple" } : selected;
    if (!device?.brand || !device?.name || !phoneName.trim()) return;
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) {
      setSaving(false);
      setNotice(text("Please sign in before saving a phone.", "سجّل الدخول أولاً لحفظ موبايلك."));
      return;
    }
    try {
      const payload = {
        id: editingPhone?.id,
        phone_name: phoneName.trim(),
        brand: device.brand,
        model: device.name,
        design_key: device.design,
      };
      const data = editingPhone ? await updateUserPhone(payload) : await createUserPhone(payload);
      setPhones((items) => editingPhone
        ? items.map((item) => item.id === data.id ? data : item)
        : [data, ...items]);
      if (chatPhone?.brand === editingPhone?.brand && chatPhone?.model === editingPhone?.model) {
        setChatPhone({ brand: data.brand, model: data.model });
      }
      setModal(false);
      setPhoneName("");
      setSelected(null);
      setCustom(false);
      setCustomBrand("");
      setCustomModel("");
      setEditingPhone(null);
      setNotice("");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setSaving(false);
    }
  };

  const latestAiMessage = useMemo(() => {
    return [...messages].reverse().find((m) => m.who === "ai");
  }, [messages]);

  const recommendedProducts = useMemo(() => {
    if (latestAiMessage?.isNew) return [];
    return latestAiMessage?.products || [];
  }, [latestAiMessage]);

  const wordCount = useMemo(() => {
    return inputText.trim() ? inputText.trim().split(/\s+/).filter(Boolean).length : 0;
  }, [inputText]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    const words = value.trim().split(/\s+/).filter(Boolean);
    if (words.length > 400) {
      const truncated = value.split(/\s+/).slice(0, 400).join(" ");
      setInputText(truncated);
    } else {
      setInputText(value);
    }
  };

  return <main className={styles.home} dir={ar ? "rtl" : "ltr"}>
    <section className={styles.heroNew}>
      <div className={styles.heroTitleContainer}>
        <h1>{text("Ask Memo and he'll help you find what you're looking for", "اسأل Memo وسيساعدك في العثور على ما تبحث عنه")}</h1>
      </div>

      <div className={styles.heroContentRow}>
        <div className={styles.heroMascotCol}>
          <div className={styles.mascotVideoWrapper}>
            <OptimizedVideo 
              ref={idleVideoRef}
              src={idleVideoSrc}
              onEnded={() => handleVideoEnded("idle")}
              className={styles.mascotImage}
              wrapperClassName={`${styles.mascotVideoLayer} ${activeVideo !== "idle" ? styles.hiddenVideo : ""}`}
              active={activeVideo === "idle"}
              transparent
              forceLoad
              preload="auto"
              rootMargin="520px 0px"
              warmDelay={0}
              muted 
              playsInline
              autoPlay
            />
            <OptimizedVideo 
              ref={searchVideoRef}
              src={searchingVideoSrc}
              onEnded={() => handleVideoEnded("searching")}
              className={styles.mascotImage}
              wrapperClassName={`${styles.mascotVideoLayer} ${styles.mascotVideoLayerAbsolute} ${activeVideo !== "searching" ? styles.hiddenVideo : ""}`}
              active={activeVideo === "searching"}
              transparent
              forceLoad
              preload="auto"
              rootMargin="520px 0px"
              warmDelay={180}
              muted 
              playsInline
              autoPlay
            />
            <div 
              className={styles.videoProtectionOverlay} 
              onContextMenu={(e) => e.preventDefault()} 
            />
          </div>
        </div>
        
        <div className={styles.heroChatCol}>
          <div className={styles.chatCardGpt} style={{ position: "relative", overflow: "hidden" }}>
            <div className={styles.chatHeaderGpt}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Link 
                  href="/chat" 
                  className={styles.enlargeBtnGpt}
                  aria-label="Enlarge Chat"
                  title={text("تكبير", "Enlarge")}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 3 21 3 21 9" />
                    <polyline points="9 21 3 21 3 15" />
                    <line x1="21" y1="3" x2="14" y2="10" />
                    <line x1="3" y1="21" x2="10" y2="14" />
                  </svg>
                </Link>
              </div>
              
              <div className={styles.headerRightGpt}>
                <span className={styles.aiStatusLabel}>Memo</span>
                <div className={styles.headerAvatarWrapper}>
                  <img src="/assets/memo-profile-96.webp" alt="Memo" className={styles.headerMemoImg} width="32" height="32" decoding="async" />
                  <i className={styles.statusDotGpt} />
                </div>
              </div>
            </div>

            <div ref={messagesContainerRef} className={styles.messagesGpt}>
              {messages.map((message, index) => (
                <div key={index} style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%" }}>
                  <div className={message.who === "ai" ? styles.msgRowAi : styles.msgRowUser}>
                    <div className={styles.avatarGpt}>
                      {message.who === "ai" ? (
                        <img src="/assets/memo-profile-96.webp" alt="Memo" className={styles.memoProfileImg} width="32" height="32" decoding="async" />
                      ) : (
                        "U"
                      )}
                    </div>
                    <div className={styles.msgBubbleGpt}>
                      {message.who === "ai" && message.isNew ? (
                        <TypewriterText 
                          text={message.text}
                          scrollContainerRef={messagesContainerRef}
                          onComplete={() => handleTypewriterComplete(index)}
                        />
                      ) : (
                        message.text
                      )}
                    </div>
                  </div>
                  
                  {message.who === "ai" && !message.isNew && message.products && message.products.length > 0 && (
                    <div className={styles.chatProductsGrid} style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                      gap: "10px",
                      padding: ar ? "4px 44px 12px 0" : "4px 0 12px 44px",
                      width: "100%"
                    }}>
                      {message.products.map((product) => (
                        <div key={product.id} className={styles.chatProductCard} style={{
                          background: "var(--panel-soft)",
                          border: "1px solid var(--line)",
                          borderRadius: "12px",
                          padding: "10px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                          position: "relative"
                        }}>
                          {product.image && (
                            <div style={{
                              width: "100%",
                              height: "100px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              background: "#fff",
                              borderRadius: "8px",
                              overflow: "hidden"
                            }}>
                              <img src={product.image} alt={product.name} style={{
                                maxWidth: "100%",
                                maxHeight: "100%",
                                objectFit: "contain"
                              }} />
                            </div>
                          )}
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px", flexGrow: 1 }}>
                            <strong style={{ fontSize: "0.8rem", color: "var(--text)", lineHeight: "1.3" }}>
                              {ar ? product.name : (product.name_en || product.name)}
                            </strong>
                            <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
                              {product.category}
                            </span>
                            <span style={{ fontSize: "0.82rem", fontWeight: "bold", color: "var(--blue)", marginTop: "2px" }}>
                              {product.price} EGP
                            </span>
                          </div>
                          
                          <div style={{ display: "flex", gap: "4px", marginTop: "4px" }}>
                            <Link href={`/product/${product.id}`} className={styles.chipGpt} style={{
                              flex: 1,
                              justifyContent: "center",
                              padding: "4px 0",
                              fontSize: "0.7rem",
                              borderRadius: "6px",
                              textAlign: "center"
                            }}>
                              {ar ? "عرض" : "View"}
                            </Link>
                            {product.stockStatus === "in_stock" ? (
                              <button
                                type="button"
                                onClick={() => {
                                  addToCart(product);
                                  showToast(locale === "ar" ? "تمت الإضافة للسلة!" : "Added to cart!");
                                }}
                                className={styles.chipGpt}
                                style={{
                                  flex: 1,
                                  justifyContent: "center",
                                  padding: "4px 0",
                                  fontSize: "0.7rem",
                                  borderRadius: "6px",
                                  background: "var(--blue)",
                                  color: "#fff",
                                  border: "none",
                                  cursor: "pointer"
                                }}
                              >
                                {ar ? "شراء" : "Buy"}
                              </button>
                            ) : (
                              <span style={{
                                fontSize: "0.7rem",
                                color: "var(--muted)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flex: 1
                              }}>
                                {ar ? "نفذ" : "Out"}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              
              {aiBusy && (
                <div className={styles.msgRowAi}>
                  <div className={styles.avatarGpt}>
                    <img src="/assets/memo-profile-96.webp" alt="Memo" className={styles.memoProfileImg} width="32" height="32" decoding="async" />
                  </div>
                  <div className={styles.msgBubbleGpt} style={{ display: "flex", gap: "5px", padding: "12px 16px", alignItems: "center" }}>
                    <span className={styles.loadingDot} />
                    <span className={styles.loadingDot} style={{ animationDelay: "0.2s" }} />
                    <span className={styles.loadingDot} style={{ animationDelay: "0.4s" }} />
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleSendGpt} className={styles.inputFormGpt}>
              <div className={styles.chipsGpt}>
                <button type="button" onClick={() => ask(text("I need a case", "أحتاج جراباً"))} className={styles.chipGpt}>
                  {text("I need a case", "أحتاج جراباً")}
                </button>
                <button type="button" onClick={() => ask(text("I need a screen protector", "أحتاج اسكرينة"))} className={styles.chipGpt}>
                  {text("Screen protector", "اسكرينة")}
                </button>
                {chatPhone && (
                  <>
                    <Link 
                      href={`/products?model=${encodeURIComponent(chatPhone.model)}&category=${encodeURIComponent(ar ? "كفرات" : "Cases")}`}
                      className={styles.chipGpt}
                    >
                      {text(`View cases`, `عرض الكفرات`)}
                    </Link>
                    <Link 
                      href={`/products?model=${encodeURIComponent(chatPhone.model)}&category=${encodeURIComponent(ar ? "حماية الشاشة" : "Screen Protection")}`}
                      className={styles.chipGpt}
                    >
                      {text(`View protectors`, `عرض الحماية`)}
                    </Link>
                    <button type="button" onClick={openChatPhoneSelection} className={styles.chipGpt}>
                      {text("Change phone", "تغيير الموبايل")}
                    </button>
                  </>
                )}
              </div>

              {recommendedProducts.length > 0 && (
                <div className={styles.chatFloatingProducts} style={{
                  display: "flex",
                  gap: "10px",
                  padding: "10px 16px",
                  background: "var(--panel-soft)",
                  borderTop: "1px solid var(--line)",
                  borderBottom: "1px solid var(--line)",
                  overflowX: "auto",
                  width: "100%",
                  boxSizing: "border-box"
                }}>
                  {recommendedProducts.map((product) => (
                    <Link 
                      key={product.id} 
                      href={`/product/${product.id}`}
                      className={styles.floatingProductCard}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        background: "var(--panel)",
                        border: "1px solid var(--line)",
                        borderRadius: "10px",
                        padding: "6px 12px",
                        minWidth: "200px",
                        flexShrink: 0,
                        textDecoration: "none",
                        color: "inherit",
                        cursor: "pointer"
                      }}
                    >
                      {product.image && (
                        <img src={product.image} alt={product.name} style={{
                          width: "36px",
                          height: "36px",
                          objectFit: "contain",
                          background: "#fff",
                          borderRadius: "4px"
                        }} />
                      )}
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px", overflow: "hidden", flexGrow: 1 }}>
                        <span style={{ fontSize: "0.78rem", fontWeight: "bold", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "var(--text)" }}>
                          {ar ? product.name : (product.name_en || product.name)}
                        </span>
                        <span style={{ fontSize: "0.75rem", color: "var(--blue)" }}>
                          {product.price} EGP
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              <div className={styles.inputRowGpt}>
                <input 
                  type="text" 
                  value={inputText}
                  onChange={handleInputChange}
                  placeholder={text("Message Memo...", "اسأل Memo...")}
                  className={styles.textInputGpt}
                />
                <button 
                  className={styles.modelSelectorGpt} 
                  type="button" 
                  onClick={openChatPhoneSelection}
                  style={{
                    borderRadius: "12px",
                    border: "none",
                    background: "var(--panel-soft)",
                    fontSize: "0.75rem",
                    padding: "8px 10px",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    color: "var(--muted)",
                    flexShrink: 0
                  }}
                  title={text("Choose phone", "اختر الهاتف")}
                >
                  <span style={{ maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {chatPhone ? `${chatPhone.brand} ${chatPhone.model}` : text("Phone", "الهاتف")}
                  </span>
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" style={{ flexShrink: 0 }}>
                    <path d="M7 10l5 5 5-5H7z" />
                  </svg>
                </button>
                <button type="submit" className={styles.sendBtnGpt} disabled={!inputText.trim() || wordCount > 400} aria-label="Send">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                </button>
              </div>
              {wordCount > 300 && (
                <div style={{
                  fontSize: "0.72rem",
                  color: wordCount >= 400 ? "#f44336" : "var(--muted)",
                  padding: "4px 12px 0 12px",
                  textAlign: ar ? "left" : "right"
                }}>
                  {wordCount}/400 {ar ? "كلمة" : "words"}
                </div>
              )}
            </form>
          </div>
        </div>
      </div>

      <div className={styles.heroDescriptionContainer}>
        <p>{text("A quick chat is all it takes to find accessories made for your exact phone.", "محادثة قصيرة تكفي لتجد الإكسسوارات المصممة لموبايلك بالضبط.")}</p>
        <div className={styles.trust}>
          <span>✓ {text("Exact model match", "مطابقة دقيقة للموديل")}</span>
          <span>✓ {text("Fast delivery", "توصيل سريع")}</span>
        </div>
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
                <div style={{ display: "flex", gap: "8px", marginTop: "12px", flexWrap: "wrap" }}>
                  <button type="button" onClick={() => openEditPhone(phone)} style={{ border: "1px solid var(--line)", background: "var(--panel-soft)", color: "var(--text)", borderRadius: "8px", padding: "7px 10px", font: "inherit", fontSize: "0.76rem", fontWeight: 800, cursor: "pointer" }}>
                    {text("Edit", "تعديل")}
                  </button>
                  <button type="button" onClick={() => setPhoneToDelete(phone)} style={{ border: "1px solid rgba(255, 77, 77, 0.35)", background: "rgba(255, 77, 77, 0.08)", color: "#d82f45", borderRadius: "8px", padding: "7px 10px", font: "inherit", fontSize: "0.76rem", fontWeight: 800, cursor: "pointer" }}>
                    {text("Delete", "حذف")}
                  </button>
                </div>
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

    {/* Featured Products Section */}
    <section className={styles.featuredSection} style={{ padding: "40px 0", width: "100%" }}>
      <div style={{ textAlign: "center", marginBottom: "32px", padding: "0 24px" }}>
        <span style={{ color: "var(--gold)", fontSize: "0.85rem", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px", display: "block" }}>
          {text("FEATURED PRODUCTS", "منتجات مميزة")}
        </span>
        <h2 style={{ fontSize: "2rem", fontWeight: "800", margin: "8px 0 0 0", color: "var(--text)", textAlign: "center" }}>
          {text("Engineered to protect.", "مصممة خصيصاً لحماية جهازك.")}
        </h2>
      </div>

      <div style={{
        width: "100%",
        boxSizing: "border-box",
        padding: "0 24px",
      }}>
        <div style={{
          display: "flex",
          gap: "24px",
          overflowX: "auto",
          paddingBottom: "20px",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch",
          width: "100%",
        }}>
          {featuredProducts.map((p) => {
            const pName = ar ? p.name : (p.name_en || p.name);
            const pCat = ar ? p.category : (p.category_en || p.category);
            const isFav = wishlist.includes(p.id);
            return (
              <article
                key={p.id}
                style={{
                  background: "var(--panel)",
                  borderRadius: "20px",
                  border: "none",
                  padding: "18px",
                  position: "relative",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  minWidth: "240px",
                  maxWidth: "260px",
                  flexShrink: 0,
                  boxSizing: "border-box",
                }}
              >
                <Link href={`/product?id=${p.id}`} style={{ display: "block", height: "200px", borderRadius: "14px", overflow: "hidden", background: "transparent", padding: "0" }}>
                  <img src={p.image} alt={pName} loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                </Link>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", fontWeight: "bold" }}>{pCat}</span>
                  <h3 style={{ fontSize: "14px", margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.4 }}>
                    <Link href={`/product?id=${p.id}`} style={{ color: "inherit", textDecoration: "none" }}>{pName}</Link>
                  </h3>
                </div>
                <div style={{ fontSize: "16px", fontWeight: "bold", color: "#0070f3" }}>
                  {p.price} EGP
                </div>
              </article>
            );
          })}
          {featuredProducts.length === 0 && (
            <div style={{ width: "100%", textAlign: "center", padding: "20px", color: "var(--muted)" }}>
              {text("Loading featured products...", "جارٍ تحميل المنتجات المميزة...")}
            </div>
          )}
        </div>
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
              <h2>{isChatSelection ? text("Select phone for chat", "تحديد الموبايل للمساعد") : editingPhone ? text("Edit phone", "تعديل الموبايل") : text("Add a phone", "إضافة موبايل")}</h2>
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
                  <article key={phone.id} className={styles.savedPhoneCard}>
                    <Link href={`/products?model=${encodeURIComponent(phone.model)}`} onClick={() => setModal(false)}>
                      <DeviceSketch design={phone.design_key} />
                      <span>{phone.phone_name}</span>
                      <small>{phone.brand} · {phone.model}</small>
                    </Link>
                    <button type="button" className={styles.phoneMoreButton} aria-label={text("Phone options", "خيارات الموبايل")} onClick={() => setPhoneMenuOpen((current) => current === phone.id ? "" : phone.id)}>
                      ⋯
                    </button>
                    {phoneMenuOpen === phone.id && (
                      <div className={styles.phoneMoreMenu}>
                        <button type="button" onClick={() => { setPhoneMenuOpen(""); openEditPhone(phone); }}>{text("Edit phone", "تعديل الموبايل")}</button>
                        <button type="button" onClick={() => { setPhoneMenuOpen(""); setPhoneToDelete(phone); }}>{text("Delete phone", "حذف الموبايل")}</button>
                      </div>
                    )}
                  </article>
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
                : editingPhone ? text("Update phone", "تحديث الموبايل") : text("Save phone", "حفظ الموبايل")}
          </button>
        </form>
      </div>
    )}

    {phoneToDelete && (
      <div className={styles.overlay} onMouseDown={() => !deletingPhone && setPhoneToDelete(null)}>
        <section className={styles.modal} onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="delete-phone-title" style={{ maxWidth: "460px" }}>
          <div className={styles.modalTop}>
            <div>
              <span className={styles.eyebrow}>{text("DELETE PHONE", "حذف الموبايل")}</span>
              <h2 id="delete-phone-title">{text("Delete this phone?", "حذف هذا الموبايل؟")}</h2>
            </div>
            <button type="button" onClick={() => setPhoneToDelete(null)} disabled={deletingPhone} aria-label={text("Close", "إغلاق")}>×</button>
          </div>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7 }}>
            {text("This phone will be removed from your saved devices.", "سيتم حذف هذا الموبايل من أجهزتك المحفوظة.")}
          </p>
          <div className={styles.preview}>
            <DeviceSketch design={phoneToDelete.design_key} />
            <p>
              <strong>{phoneToDelete.phone_name}</strong>
              {phoneToDelete.brand} · {phoneToDelete.model}
            </p>
          </div>
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", flexWrap: "wrap" }}>
            <button type="button" onClick={() => setPhoneToDelete(null)} disabled={deletingPhone} style={{ border: "1px solid var(--line)", background: "var(--panel-soft)", color: "var(--text)", borderRadius: "10px", padding: "12px 16px", font: "inherit", fontWeight: 800, cursor: "pointer" }}>
              {text("Cancel", "إلغاء")}
            </button>
            <button type="button" onClick={confirmDeletePhone} disabled={deletingPhone} style={{ border: "1px solid rgba(255, 77, 77, 0.35)", background: "#d82f45", color: "white", borderRadius: "10px", padding: "12px 16px", font: "inherit", fontWeight: 900, cursor: "pointer" }}>
              {deletingPhone ? text("Deleting...", "جارٍ الحذف...") : text("Delete phone", "حذف الموبايل")}
            </button>
          </div>
        </section>
      </div>
    )}
  </main>;
}
