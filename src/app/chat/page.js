"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";

import { useLanguage } from "@/context/LanguageContext";
import { useCart } from "@/context/CartContext";
import { supabase } from "@/utils/supabase";
import { loadInitialMessages, storeMessages } from "@/utils/chatStore";
import styles from "./page.module.css";

const MODELS = [
  ["Apple", "iPhone 16 Pro", "pro"], ["Apple", "iPhone 16", "dual"], ["Apple", "iPhone 15 Pro Max", "pro"], ["Apple", "iPhone 14", "dual"],
  ["Samsung", "Galaxy S25 Ultra", "ultra"], ["Samsung", "Galaxy S25", "triple"], ["Samsung", "Galaxy A56 5G", "triple"], ["Samsung", "Galaxy A36 5G", "triple"],
  ["Infinix", "Note 50 Pro", "triple"], ["Infinix", "Hot 50", "dual"], ["OPPO", "Reno13 Pro", "triple"], ["OPPO", "A5 Pro", "dual"],
].map(([brand, name, design]) => ({ brand, name, design }));

function DeviceSketch({ design = "pro" }) {
  const count = design === "dual" ? 2 : design === "ultra" ? 4 : 3;
  return (
    <svg className={styles.sketch} viewBox="0 0 160 230" aria-hidden="true">
      <rect x="35" y="5" width="90" height="220" rx="19" fill="none" stroke="currentColor" strokeWidth="3" />
      <rect x="45" y="18" width="37" height={design === "ultra" ? 84 : 62} rx="10" fill="currentColor" />
      {Array.from({ length: count }).map((_, index) => (
        <circle
          key={index}
          cx={design === "ultra" ? 64 : index % 2 ? 69 : 58}
          cy={design === "ultra" ? 33 + index * 19 : 32 + Math.floor(index / 2) * 25}
          r="7"
          fill="white"
          stroke="currentColor"
          strokeWidth="2"
        />
      ))}
      <path d="M72 203h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

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

export default function ChatPage() {
  const { locale } = useLanguage();
  const ar = locale === "ar";
  const { addToCart } = useCart();
  const text = (en, arabic) => (ar ? arabic : en);

  const [phones, setPhones] = useState([]);
  const [modal, setModal] = useState(false);
  const [query, setQuery] = useState("");
  const [custom, setCustom] = useState(false);
  const [phoneName, setPhoneName] = useState("");
  const [selected, setSelected] = useState(null);
  const [customBrand, setCustomBrand] = useState("");
  const [customModel, setCustomModel] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [chatPhone, setChatPhone] = useState(null);
  const [isChatSelection, setIsChatSelection] = useState(false);

  const [userLoaded, setUserLoaded] = useState(false);

  const [messages, setMessages] = useState(() => {
    // Module store is the most reliable source — set synchronously on navigation
    const stored = loadInitialMessages();
    if (stored && stored.length > 0) return stored;
    return [
      {
        who: "ai",
        text: text(
          "Hey, I'm Memo. Tell me your phone and I'll help you find something that actually fits.",
          "أهلاً، أنا Memo. قل لي نوع موبايلك وأنا أظبطلك حاجة تركب عليه بجد."
        ),
      },
    ];
  });

  const [inputText, setInputText] = useState("");
  const [aiBusy, setAiBusy] = useState(false);

  const messagesContainerRef = useRef(null);

  // Scroll to bottom + sync store on every messages change
  useEffect(() => {
    storeMessages(messages);
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Scroll when busy state changes
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

  const results = useMemo(
    () => MODELS.filter((model) => `${model.brand} ${model.name}`.toLowerCase().includes(query.toLowerCase())),
    [query]
  );

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (active) setUserLoaded(!!user);
      if (!user) return;
      const { data } = await supabase.from("user_phones").select("*").order("created_at", { ascending: false });
      if (active) setPhones(data || []);
    });
    return () => {
      active = false;
    };
  }, []);

  const handleSelectChatPhone = (brand, model) => {
    const nextPhone = { brand, model };
    setChatPhone(nextPhone);
    setModal(false);
    submitMessage(
      ar ? `موبايلي هو ${brand} ${model}` : `My phone is ${brand} ${model}`,
      nextPhone
    );
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      setNotice(text("Please sign in before saving a phone.", "سجّل الدخول أولاً لحفظ موبايلك."));
      return;
    }
    const { data, error } = await supabase
      .from("user_phones")
      .insert({
        user_id: user.id,
        phone_name: phoneName.trim(),
        brand: device.brand,
        model: device.name,
        design_key: device.design,
      })
      .select()
      .single();
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

  const submitMessage = async (messageText, activePhone = chatPhone) => {
    if (!messageText.trim()) return;

    setAiBusy(true);

    const updatedMessages = [
      ...messages,
      { who: "user", text: messageText },
    ];

    setMessages(updatedMessages);
    storeMessages(updatedMessages); // synchronous — no race condition

    const apiMessages = updatedMessages.map((m) => ({
      role: m.who === "user" ? "user" : "assistant",
      content: m.text,
    }));

    if (activePhone) {
      apiMessages.unshift({
        role: "system",
        content: `The customer has selected their phone model: ${activePhone.brand} ${activePhone.model}. Keep this model in mind for recommendations.`,
      });
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, phone: activePhone, chatId: currentChatId }),
      });

      const data = await response.json();
      if (response.ok) {
        const withAi = [
          ...updatedMessages,
          {
            who: "ai",
            text: data.message,
            products: data.products || [],
            isNew: true,
          },
        ];
        setMessages(withAi);
        storeMessages(withAi); // storeMessages strips isNew
        if (data.chatId) {
          setCurrentChatId(data.chatId);
          fetchChatHistory();
        }
      } else {
        setMessages((current) => [
          ...current,
          {
            who: "ai",
            text: data.message || (ar ? "عذراً، حدث خطأ ما." : "Sorry, an error occurred."),
          },
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
            : "Memo lost the argument with the server for a second. Please try again.",
        },
      ]);
    } finally {
      setAiBusy(false);
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

  const handleSendGpt = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    const userMessage = inputText.trim();
    setInputText("");
    await submitMessage(userMessage);
  };

  return (
    <div className={styles.chatPageContainer} dir={ar ? "rtl" : "ltr"}>

        {/* Full-width chat header */}
        <div className={styles.chatHeaderGpt}>
        <div className={styles.chatHeaderInner}>
          {/* Left: Avatar + name */}
          <div className={styles.headerLeftPage}>
            <div className={styles.headerAvatarWrapper}>
              <img src="/assets/memo-profile-96.webp" alt="Memo" className={styles.headerMemoImg} width="36" height="36" decoding="async" />
              <i className={styles.statusDotGpt} />
            </div>
            <div className={styles.headerTitleStatus}>
              <span className={styles.aiStatusLabel}>Memo</span>
              <span className={styles.aiOnlineSub}>{text("Online", "متصل")}</span>
            </div>
          </div>

          {/* Right: Close button */}
          <div className={styles.headerRightPage}>
            <Link href="/" className={styles.closeBtnPage} aria-label="Close Chat" title={text("Close", "إغلاق")}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </Link>
          </div>
        </div>
      </div>


      <main className={styles.chatMainArea}>
        <div className={styles.chatCardGpt}>
          {/* Messages block */}
          <div 
            ref={messagesContainerRef} 
            className={styles.messagesGpt}
          >
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
                  <div className={styles.chatProductsGrid}>
                    {message.products.map((product) => (
                      <div key={product.id} className={styles.chatProductCard}>
                        {product.image && (
                          <div className={styles.productCardImgContainer}>
                            <img src={product.image} alt={product.name} />
                          </div>
                        )}
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px", flexGrow: 1 }}>
                          <strong className={styles.productCardTitle}>
                            {ar ? product.name : product.name_en || product.name}
                          </strong>
                          <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>{product.category}</span>
                          <span className={styles.productCardPrice}>{product.price} EGP</span>
                        </div>

                        <div style={{ display: "flex", gap: "4px", marginTop: "4px" }}>
                          <Link href={`/product/${product.id}`} className={styles.chipGpt} style={{ flex: 1, justifyContent: "center", padding: "4px 0", fontSize: "0.7rem", borderRadius: "6px", textAlign: "center" }}>
                            {ar ? "عرض" : "View"}
                          </Link>
                          {product.stockStatus === "in_stock" ? (
                            <button
                              type="button"
                              onClick={() => addToCart(product)}
                              className={styles.chipGpt}
                              style={{ flex: 1, justifyContent: "center", padding: "4px 0", fontSize: "0.7rem", borderRadius: "6px", background: "var(--blue)", color: "#fff", border: "none", cursor: "pointer" }}
                            >
                              {ar ? "شراء" : "Buy"}
                            </button>
                          ) : (
                            <span style={{ fontSize: "0.7rem", color: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", flex: 1 }}>
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

          {/* Suggestions and text box fixed at the bottom */}
          <div className={styles.fixedBottomArea}>
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
                    <Link href={`/products?model=${encodeURIComponent(chatPhone.model)}&category=${encodeURIComponent(ar ? "كفرات" : "Cases")}`} className={styles.chipGpt}>
                      {text("View cases", "عرض الكفرات")}
                    </Link>
                    <Link href={`/products?model=${encodeURIComponent(chatPhone.model)}&category=${encodeURIComponent(ar ? "حماية الشاشة" : "Screen Protection")}`} className={styles.chipGpt}>
                      {text("View protectors", "عرض الحماية")}
                    </Link>
                    <button type="button" onClick={openChatPhoneSelection} className={styles.chipGpt}>
                      {text("Change phone", "تغيير الموبايل")}
                    </button>
                  </>
                )}
              </div>

              {recommendedProducts.length > 0 && (
                <div className={styles.chatFloatingProducts}>
                  {recommendedProducts.map((product) => (
                    <Link key={product.id} href={`/product/${product.id}`} className={styles.floatingProductCard}>
                      {product.image && <img src={product.image} alt={product.name} />}
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px", overflow: "hidden", flexGrow: 1 }}>
                        <span className={styles.floatingProductTitle}>
                          {ar ? product.name : product.name_en || product.name}
                        </span>
                        <span style={{ fontSize: "0.75rem", color: "var(--blue)" }}>{product.price} EGP</span>
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
                  <span className={styles.modelSelectedText} style={{ maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                <div className={styles.wordCounter}>
                  {wordCount}/400 {ar ? "كلمة" : "words"}
                </div>
              )}
            </form>
          </div>
        </div>
      </main>

      {/* Choose Phone Dialog Modal */}
      {modal && (
        <div className={styles.modalOverlay} onMouseDown={() => setModal(false)}>
          <div className={styles.modalCard} onMouseDown={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>{isChatSelection ? text("Select Phone model", "اختر موديل الموبايل") : text("Add new device", "إضافة جهاز جديد")}</h3>
              <button type="button" className={styles.modalCloseBtn} onClick={() => setModal(false)}>×</button>
            </div>
            {notice && <p className={styles.modalNotice}>{notice}</p>}

            {isChatSelection ? (
              <div className={styles.modalBody}>
                {phones.length > 0 && (
                  <div className={styles.savedPhonesList}>
                    <h4>{text("Your Saved Phones", "أجهزتك المحفوظة")}</h4>
                    <div className={styles.savedPhonesGrid}>
                      {phones.map((p) => (
                        <button key={p.id} type="button" className={styles.savedPhoneBtn} onClick={() => handleSelectChatPhone(p.brand, p.model)}>
                          <strong>{p.phone_name}</strong>
                          <span>{p.brand} {p.model}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className={styles.searchDevicesSec}>
                  <h4>{text("Choose brand or model", "اختر ماركة أو موديل")}</h4>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={text("Search model... (e.g. iPhone)", "ابحث عن الموديل... (مثال: iPhone)")}
                    className={styles.modalSearchInput}
                  />
                  <div className={styles.devicesResultsList}>
                    {results.map((m) => (
                      <button key={m.name} type="button" className={styles.deviceResultBtn} onClick={() => handleSelectChatPhone(m.brand, m.name)}>
                        <span>{m.brand}</span>
                        <strong>{m.name}</strong>
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
                  <button type="button" className={styles.modalLinkBtn} onClick={openAddPhone}>
                    + {text("Add custom phone", "إضافة هاتف مخصص")}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={savePhone} className={styles.modalBody}>
                <label className={styles.modalLabel}>
                  {text("Device label (e.g. My Phone)", "اسم الجهاز (مثال: موبايلي)")}
                  <input type="text" value={phoneName} onChange={(e) => setPhoneName(e.target.value)} placeholder="iPhone 15 Pro..." className={styles.modalInput} required />
                </label>

                <div className={styles.choiceTabs}>
                  <button type="button" className={!custom ? styles.activeChoice : ""} onClick={() => setCustom(false)}>{text("Search", "بحث")}</button>
                  <button type="button" className={custom ? styles.activeChoice : ""} onClick={() => setCustom(true)}>{text("Custom", "مخصص")}</button>
                </div>

                {custom ? (
                  <div className={styles.fieldGrid}>
                    <label className={styles.modalLabel}>
                      {text("Brand", "الماركة")}
                      <input type="text" value={customBrand} onChange={(e) => setCustomBrand(e.target.value)} placeholder="Xiaomi..." className={styles.modalInput} required />
                    </label>
                    <label className={styles.modalLabel}>
                      {text("Model", "الموديل")}
                      <input type="text" value={customModel} onChange={(e) => setCustomModel(e.target.value)} placeholder="Redmi Note 12..." className={styles.modalInput} required />
                    </label>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={text("Search model...", "ابحث عن الموديل...")}
                      className={styles.modalSearchInput}
                    />
                    <div className={styles.devicesResultsList}>
                      {results.map((m) => (
                        <button key={m.name} type="button" className={`${styles.deviceResultBtn} ${selected?.name === m.name ? styles.selectedDevice : ""}`} onClick={() => setSelected(m)}>
                          <span>{m.brand}</span>
                          <strong>{m.name}</strong>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className={styles.modalActions}>
                  <button type="button" className={styles.modalCancelBtn} onClick={() => setModal(false)}>{text("Cancel", "إلغاء")}</button>
                  <button type="submit" className={styles.modalSubmitBtn} disabled={saving}>
                    {saving ? text("Saving...", "جارٍ الحفظ...") : text("Save Phone", "حفظ الهاتف")}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
