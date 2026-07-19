"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/utils/supabase";
import { useLanguage } from "@/context/LanguageContext";
import styles from "./page.module.css";

const phoneModels = [
  { brand: "Apple", name: "iPhone 16 Pro", design: "pro" },
  { brand: "Apple", name: "iPhone 16", design: "dual" },
  { brand: "Apple", name: "iPhone 15 Pro Max", design: "pro" },
  { brand: "Samsung", name: "Galaxy S25 Ultra", design: "ultra" },
  { brand: "Samsung", name: "Galaxy S25", design: "triple" },
  { brand: "Samsung", name: "Galaxy A56 5G", design: "triple" },
  { brand: "Infinix", name: "Note 50 Pro", design: "triple" },
  { brand: "Infinix", name: "Hot 50", design: "dual" },
  { brand: "OPPO", name: "Reno13 Pro", design: "triple" },
  { brand: "OPPO", name: "A5 Pro", design: "dual" },
];

const fallbackProducts = [
  { id: "carbon-slide-camera-case", name: "كفر Carbon Slide Camera", name_en: "Carbon Slide Camera Case", category_en: "Cases", price: 449, image: "/assets/products/carbon-slide-camera-case.jpeg", compatible_models: ["iPhone 15 Pro Max", "Samsung S24 Ultra"] },
  { id: "samsung-clear-shockproof-case", name: "كفر Samsung Clear Shockproof", name_en: "Samsung Clear Shockproof Case", category_en: "Cases", price: 299, image: "/assets/products/samsung-clear-shockproof-case.jpeg", compatible_models: ["Samsung S24 Ultra", "Samsung S23 Ultra"] },
  { id: "tempered-glass-screen-protector", name: "اسكرينة Tempered Glass", name_en: "Tempered Glass Screen Protector", category_en: "Screen Protection", price: 199, image: "/assets/products/tempered-glass-screen-protector.jpeg", compatible_models: ["iPhone 15 Pro Max", "Samsung S24 Ultra"] },
  { id: "privacy-screen-protector", name: "اسكرينة Privacy", name_en: "Privacy Screen Protector", category_en: "Screen Protection", price: 299, image: "/assets/products/privacy-screen-protector.jpeg", compatible_models: ["iPhone 15 Pro Max", "Samsung S24 Ultra"] },
];

function safeProductImage(product) {
  const value = String(product?.image || "").trim();
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/")) {
    return value;
  }

  const fallback = fallbackProducts.find((item) => item.id === product?.id)?.image;
  return fallback || "/assets/products/tempered-glass-screen-protector.jpeg";
}

function DeviceSketch({ design = "triple" }) {
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

export default function FamilyVisitPage() {
  const { locale } = useLanguage();
  const text = (ar, en) => (locale === "ar" ? ar : en);

  const steps = [
    text("بيانات العميل", "Customer Details"),
    text("الموبايل", "Phone Model"),
    text("الخدمة والمنتج", "Service & Product"),
    text("الموقع", "Location"),
    text("مراجعة وإرسال", "Review & Send"),
  ];

  const [activeStep, setActiveStep] = useState(0);
  const [user, setUser] = useState(null);
  const [phones, setPhones] = useState([]);
  const [products, setProducts] = useState(fallbackProducts);
  const [phoneModal, setPhoneModal] = useState(false);
  const [phoneSearch, setPhoneSearch] = useState("");
  const [phoneName, setPhoneName] = useState("");
  const [selectedModel, setSelectedModel] = useState(null);
  const [customPhone, setCustomPhone] = useState(false);
  const [customBrand, setCustomBrand] = useState("");
  const [customModel, setCustomModel] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({
    clientName: "",
    clientPhone: "",
    phoneId: "",
    service: "",
    productId: "",
    address: "",
    locationLink: "",
    notes: "",
  });

  useEffect(() => {
    let active = true;

    supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
      if (!active) return;
      setUser(currentUser || null);

      if (currentUser) {
        supabase
          .from("user_phones")
          .select("*")
          .order("created_at", { ascending: false })
          .then(({ data }) => {
            if (active) setPhones(data || []);
          });
      }
    });

    fetch("/api/store-products")
      .then((response) => response.json())
      .then((data) => {
        if (active && data.configured && data.products?.length) {
          setProducts(data.products);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  const selectedPhone = phones.find((phone) => phone.id === form.phoneId);
  const matchingModels = phoneModels.filter((phone) => `${phone.brand} ${phone.name}`.toLowerCase().includes(phoneSearch.toLowerCase()));
  const serviceProducts = products.filter((product) => {
    const category = `${product.category_en || ""} ${product.category || ""} ${product.name_en || ""}`.toLowerCase();
    const matchesService = form.service === "cover" ? category.includes("case") || category.includes("كفر") : category.includes("screen") || category.includes("protector") || category.includes("اسكرينة");
    const matchesPhone = !selectedPhone?.model || !Array.isArray(product.compatible_models) || product.compatible_models.length === 0 || product.compatible_models.includes(selectedPhone.model);

    return form.service && matchesService && matchesPhone;
  });
  const selectedProduct = products.find((product) => product.id === form.productId);

  const updateField = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
      ...(key === "service" ? { productId: "" } : null),
    }));
  };

  const canOpenStep = (index) => {
    if (index <= activeStep) return true;
    if (index === 1) return form.clientName.trim() && form.clientPhone.trim();
    if (index === 2) return form.clientName.trim() && form.clientPhone.trim() && form.phoneId;
    if (index === 3) return form.clientName.trim() && form.clientPhone.trim() && form.phoneId && form.service && form.productId;
    if (index === 4) return form.clientName.trim() && form.clientPhone.trim() && form.phoneId && form.service && form.productId && form.address.trim();
    return false;
  };

  const goNext = () => {
    if (canOpenStep(activeStep + 1)) {
      setActiveStep((current) => Math.min(current + 1, steps.length - 1));
      setNotice("");
      return;
    }

    setNotice(text("أكمل بيانات هذه الخطوة أولاً.", "Please complete this step's details first."));
  };

  const savePhone = async (event) => {
    event.preventDefault();
    setNotice("");

    if (!user) {
      setNotice(text("سجّل الدخول أولاً حتى نقدر نحفظ الموبايل.", "Please sign in first to save your phone."));
      return;
    }

    const model = customPhone ? { brand: customBrand.trim(), name: customModel.trim(), design: "triple" } : selectedModel;
    if (!phoneName.trim() || !model?.brand || !model?.name) {
      setNotice(text("اكتب اسم الموبايل واختر الموديل.", "Please write the phone name and select a model."));
      return;
    }

    setSavingPhone(true);
    const { data, error } = await supabase
      .from("user_phones")
      .insert({
        user_id: user.id,
        phone_name: phoneName.trim(),
        brand: model.brand,
        model: model.name,
        design_key: model.design,
      })
      .select()
      .single();
    setSavingPhone(false);

    if (error) {
      setNotice(error.message);
      return;
    }

    setPhones((current) => [data, ...current]);
    updateField("phoneId", data.id);
    setPhoneModal(false);
    setPhoneName("");
    setSelectedModel(null);
    setCustomPhone(false);
    setCustomBrand("");
    setCustomModel("");
  };

  const submitRequest = async () => {
    setNotice("");

    if (!user) {
      setNotice(text("سجّل الدخول أولاً حتى يتم حفظ طلب المندوب.", "Please sign in first to submit a representative request."));
      return;
    }

    if (!selectedPhone || !form.service || !selectedProduct || !form.address.trim()) {
      setNotice(text("راجع البيانات المطلوبة قبل الإرسال.", "Please review the required details before submitting."));
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("family_rep_visits").insert({
      user_id: user.id,
      client_name: form.clientName.trim(),
      client_phone: form.clientPhone.trim(),
      phone_id: selectedPhone.id,
      phone_label: selectedPhone.phone_name,
      phone_brand: selectedPhone.brand,
      phone_model: selectedPhone.model,
      requested_service: form.service,
      product_id: selectedProduct.id,
      product_name: selectedProduct.name_en || selectedProduct.name,
      address: form.address.trim(),
      location_link: form.locationLink.trim() || null,
      notes: form.notes.trim() || null,
    });
    setSubmitting(false);

    if (error) {
      setNotice(error.message);
      return;
    }

    setNotice(text("تم إرسال طلب مندوب العيلة بنجاح.", "Family representative request submitted successfully."));
  };

  return (
    <main className={styles.page} dir={locale === "ar" ? "rtl" : "ltr"}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>{text("مندوب العيلة", "Family Representative")}</p>
        <h1>{text("احجز مندوب يجهّز حماية الموبايل عندك.", "Book a representative to install protection at your place.")}</h1>
        <p>{text("اختار الموبايل، نوع الحماية، المنتج المناسب، ومكان الزيارة. الطلب بيتحفظ على حسابك علشان نتابعه معاك بسهولة.", "Choose the phone, protection type, suitable product, and visit location. The request will be saved to your account so we can easily track it with you.")}</p>
        {!user && (
          <Link className={styles.loginNotice} href="/account">
            {text("سجّل الدخول قبل حفظ الموبايلات أو إرسال الطلب", "Sign in before saving phones or submitting the request")}
          </Link>
        )}
      </section>

      <section className={styles.stepper}>
        <aside className={styles.tabs} aria-label={text("خطوات طلب مندوب العيلة", "Family representative request steps")}>
          {steps.map((step, index) => (
            <button
              key={step}
              className={index === activeStep ? styles.activeTab : ""}
              type="button"
              onClick={() => canOpenStep(index) && setActiveStep(index)}
              style={{ textAlign: locale === 'ar' ? 'right' : 'left' }}
            >
              <span>{index + 1}</span>
              {step}
            </button>
          ))}
        </aside>

        <div className={styles.panel}>
          {activeStep === 0 && (
            <div className={styles.stepContent}>
              <h2>{text("بيانات العميل", "Customer Details")}</h2>
              <div className={styles.fieldGrid}>
                <label>
                  {text("اسم العميل", "Customer Name")}
                  <input value={form.clientName} onChange={(event) => updateField("clientName", event.target.value)} placeholder={text("مثال: أحمد محمد", "e.g. John Doe")} />
                </label>
                <label>
                  {text("رقم الموبايل", "Phone Number")}
                  <input value={form.clientPhone} onChange={(event) => updateField("clientPhone", event.target.value)} placeholder="010..." inputMode="tel" />
                </label>
              </div>
            </div>
          )}

          {activeStep === 1 && (
            <div className={styles.stepContent}>
              <div className={styles.panelHead}>
                <div>
                  <h2>{text("الموبايل", "Phone Model")}</h2>
                  <p>{text("اختار موبايل محفوظ أو أضف موبايل جديد لنفس جدول الأجهزة.", "Choose a saved phone or add a new one to your device list.")}</p>
                </div>
                <button className={styles.secondaryButton} type="button" onClick={() => setPhoneModal(true)}>
                  {text("إضافة موبايل", "Add Phone")}
                </button>
              </div>

              <div className={styles.phoneGrid}>
                {phones.map((phone) => (
                  <button
                    key={phone.id}
                    className={form.phoneId === phone.id ? styles.selectedPhone : ""}
                    type="button"
                    onClick={() => updateField("phoneId", phone.id)}
                  >
                    <DeviceSketch design={phone.design_key} />
                    <strong>{phone.phone_name}</strong>
                    <small>{phone.brand} · {phone.model}</small>
                  </button>
                ))}

                {!phones.length && (
                  <button className={styles.emptyPhone} type="button" onClick={() => setPhoneModal(true)}>
                    <b>+</b>
                    <span>{text("أضف أول موبايل", "Add your first phone")}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {activeStep === 2 && (
            <div className={styles.stepContent}>
              <h2>{text("تحتاج إيه للموبايل؟", "What do you need for your phone?")}</h2>
              <label>
                {text("نوع الخدمة", "Service Type")}
                <select value={form.service} onChange={(event) => updateField("service", event.target.value)}>
                  <option value="">{text("اختر الخدمة", "Select Service")}</option>
                  <option value="cover">{text("كفر", "Case")}</option>
                  <option value="screen_protector">{text("اسكرينة", "Screen Protector")}</option>
                </select>
              </label>

              {form.service && (
                <div className={styles.productGrid}>
                  {serviceProducts.map((product) => (
                    <button
                      key={product.id}
                      className={form.productId === product.id ? styles.selectedProduct : ""}
                      type="button"
                      onClick={() => updateField("productId", product.id)}
                    >
                      <Image src={safeProductImage(product)} alt={locale === "en" && product.name_en ? product.name_en : product.name} width={220} height={220} />
                      <span>{locale === "en" && product.name_en ? product.name_en : product.name}</span>
                      <strong>{product.price} EGP</strong>
                    </button>
                  ))}
                  {!serviceProducts.length && <p className={styles.muted}>{text("لا توجد منتجات مطابقة لهذا الموديل حالياً.", "No matching products for this model at the moment.")}</p>}
                </div>
              )}
            </div>
          )}

          {activeStep === 3 && (
            <div className={styles.stepContent}>
              <h2>{text("بيانات الموقع", "Location Details")}</h2>
              <div className={styles.fieldGrid}>
                <label className={styles.fullField}>
                  {text("العنوان بالتفصيل", "Detailed Address")}
                  <input value={form.address} onChange={(event) => updateField("address", event.target.value)} placeholder={text("المدينة، المنطقة، الشارع، رقم العمارة", "City, area, street, building number")} />
                </label>
                <label className={styles.fullField}>
                  {text("لينك اللوكيشن", "Location Link")}
                  <input value={form.locationLink} onChange={(event) => updateField("locationLink", event.target.value)} placeholder="https://maps.google.com/..." />
                </label>
                <label className={styles.fullField}>
                  {text("ملاحظات", "Notes")}
                  <textarea value={form.notes} onChange={(event) => updateField("notes", event.target.value)} placeholder={text("أقرب علامة أو تفاصيل تساعد المندوب", "Nearest landmark or details to help the representative")} rows="3" />
                </label>
              </div>
            </div>
          )}

          {activeStep === 4 && (
            <div className={styles.stepContent}>
              <h2>{text("مراجعة الطلب", "Review Request")}</h2>
              <dl className={styles.review}>
                <div><dt>{text("العميل", "Customer")}</dt><dd>{form.clientName || text("غير محدد", "Not specified")}</dd></div>
                <div><dt>{text("رقم الموبايل", "Phone Number")}</dt><dd>{form.clientPhone || text("غير محدد", "Not specified")}</dd></div>
                <div><dt>{text("الجهاز", "Device")}</dt><dd>{selectedPhone ? `${selectedPhone.phone_name} · ${selectedPhone.model}` : text("غير محدد", "Not specified")}</dd></div>
                <div><dt>{text("الخدمة", "Service")}</dt><dd>{form.service === "cover" ? text("كفر", "Case") : form.service === "screen_protector" ? text("اسكرينة", "Screen Protector") : text("غير محدد", "Not specified")}</dd></div>
                <div><dt>{text("المنتج", "Product")}</dt><dd>{(locale === "en" && selectedProduct?.name_en ? selectedProduct?.name_en : selectedProduct?.name) || text("غير محدد", "Not specified")}</dd></div>
                <div><dt>{text("العنوان", "Address")}</dt><dd>{form.address || text("غير محدد", "Not specified")}</dd></div>
              </dl>
            </div>
          )}

          {notice && <p className={styles.notice}>{notice}</p>}

          <div className={styles.actions}>
            <button className={styles.backButton} type="button" disabled={activeStep === 0} onClick={() => setActiveStep((current) => Math.max(current - 1, 0))}>
              {text("رجوع", "Back")}
            </button>
            {activeStep < steps.length - 1 ? (
              <button className={styles.primaryButton} type="button" onClick={goNext}>
                {text("التالي", "Next")}
              </button>
            ) : (
              <button className={styles.primaryButton} type="button" disabled={submitting} onClick={submitRequest}>
                {submitting ? text("جارٍ الإرسال...", "Sending...") : text("إرسال الطلب", "Submit Request")}
              </button>
            )}
          </div>
        </div>
      </section>

      {phoneModal && (
        <div className={styles.overlay} onMouseDown={() => setPhoneModal(false)}>
          <form className={styles.modal} onSubmit={savePhone} onMouseDown={(event) => event.stopPropagation()} style={{ textAlign: locale === 'ar' ? 'right' : 'left' }}>
            <div className={styles.modalTop}>
              <div style={{ textAlign: locale === 'ar' ? 'right' : 'left' }}>
                <p className={styles.eyebrow}>{text("جهازك", "Your Device")}</p>
                <h2>{text("إضافة موبايل", "Add Phone")}</h2>
              </div>
              <button type="button" onClick={() => setPhoneModal(false)} aria-label={text("إغلاق", "Close")}>
                ×
              </button>
            </div>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: locale === 'ar' ? 'right' : 'left' }}>
              {text("اسم لهذا الموبايل", "Name for this phone")}
              <input value={phoneName} onChange={(event) => setPhoneName(event.target.value)} placeholder={text("مثال: موبايل الشخصي", "e.g. My Personal Phone")} autoFocus />
            </label>

            <div className={styles.choiceTabs}>
              <button className={!customPhone ? styles.activeChoice : ""} type="button" onClick={() => setCustomPhone(false)}>
                {text("ابحث عن موديل", "Search Model")}
              </button>
              <button className={customPhone ? styles.activeChoice : ""} type="button" onClick={() => setCustomPhone(true)}>
                {text("موديل مخصص", "Custom Model")}
              </button>
            </div>

            {customPhone ? (
              <div className={styles.fieldGrid}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: locale === 'ar' ? 'right' : 'left' }}>
                  {text("الماركة", "Brand")}
                  <input value={customBrand} onChange={(event) => setCustomBrand(event.target.value)} placeholder={text("مثال: Xiaomi", "e.g. Xiaomi")} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: locale === 'ar' ? 'right' : 'left' }}>
                  {text("الموديل", "Model")}
                  <input value={customModel} onChange={(event) => setCustomModel(event.target.value)} placeholder={text("مثال: Redmi Note 13", "e.g. Redmi Note 13")} />
                </label>
              </div>
            ) : (
              <>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: locale === 'ar' ? 'right' : 'left' }}>
                  {text("ابحث عن الموديل", "Search for Model")}
                  <input value={phoneSearch} onChange={(event) => setPhoneSearch(event.target.value)} placeholder={text("iPhone أو Galaxy أو OPPO", "iPhone, Galaxy or OPPO")} />
                </label>
                <div className={styles.modelList}>
                  {matchingModels.map((model) => (
                    <button className={selectedModel?.name === model.name ? styles.selectedModel : ""} key={model.name} type="button" onClick={() => setSelectedModel(model)} style={{ textAlign: locale === 'ar' ? 'right' : 'left' }}>
                      <span>{model.brand}</span>
                      <strong>{model.name}</strong>
                    </button>
                  ))}
                </div>
              </>
            )}

            {(selectedModel || customPhone) && (
              <div className={styles.preview}>
                <DeviceSketch design={customPhone ? "triple" : selectedModel.design} />
                <span>{customPhone ? customModel || text("موديل مخصص", "Custom Model") : selectedModel.name}</span>
              </div>
            )}

            {notice && <p className={styles.notice}>{notice}</p>}

            <button className={styles.primaryButton} type="submit" disabled={savingPhone}>
              {savingPhone ? text("جارٍ الحفظ...", "Saving...") : text("حفظ الموبايل", "Save Phone")}
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
