"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/utils/supabase";
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

const steps = [
  "بيانات العميل",
  "الموبايل",
  "الخدمة والمنتج",
  "الموقع",
  "مراجعة وإرسال",
];

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

    setNotice("أكمل بيانات هذه الخطوة أولاً.");
  };

  const savePhone = async (event) => {
    event.preventDefault();
    setNotice("");

    if (!user) {
      setNotice("سجّل الدخول أولاً حتى نقدر نحفظ الموبايل.");
      return;
    }

    const model = customPhone ? { brand: customBrand.trim(), name: customModel.trim(), design: "triple" } : selectedModel;
    if (!phoneName.trim() || !model?.brand || !model?.name) {
      setNotice("اكتب اسم الموبايل واختر الموديل.");
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
      setNotice("سجّل الدخول أولاً حتى يتم حفظ طلب المندوب.");
      return;
    }

    if (!selectedPhone || !form.service || !selectedProduct || !form.address.trim()) {
      setNotice("راجع البيانات المطلوبة قبل الإرسال.");
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

    setNotice("تم إرسال طلب مندوب العيلة بنجاح.");
  };

  return (
    <main className={styles.page} dir="rtl">
      <section className={styles.hero}>
        <p className={styles.eyebrow}>مندوب العيلة</p>
        <h1>احجز مندوب يجهّز حماية الموبايل عندك.</h1>
        <p>اختار الموبايل، نوع الحماية، المنتج المناسب، ومكان الزيارة. الطلب بيتحفظ على حسابك علشان نتابعه معاك بسهولة.</p>
        {!user && (
          <Link className={styles.loginNotice} href="/account">
            سجّل الدخول قبل حفظ الموبايلات أو إرسال الطلب
          </Link>
        )}
      </section>

      <section className={styles.stepper}>
        <aside className={styles.tabs} aria-label="خطوات طلب مندوب العيلة">
          {steps.map((step, index) => (
            <button
              key={step}
              className={index === activeStep ? styles.activeTab : ""}
              type="button"
              onClick={() => canOpenStep(index) && setActiveStep(index)}
            >
              <span>{index + 1}</span>
              {step}
            </button>
          ))}
        </aside>

        <div className={styles.panel}>
          {activeStep === 0 && (
            <div className={styles.stepContent}>
              <h2>بيانات العميل</h2>
              <div className={styles.fieldGrid}>
                <label>
                  اسم العميل
                  <input value={form.clientName} onChange={(event) => updateField("clientName", event.target.value)} placeholder="مثال: أحمد محمد" />
                </label>
                <label>
                  رقم الموبايل
                  <input value={form.clientPhone} onChange={(event) => updateField("clientPhone", event.target.value)} placeholder="010..." inputMode="tel" />
                </label>
              </div>
            </div>
          )}

          {activeStep === 1 && (
            <div className={styles.stepContent}>
              <div className={styles.panelHead}>
                <div>
                  <h2>الموبايل</h2>
                  <p>اختار موبايل محفوظ أو أضف موبايل جديد لنفس جدول الأجهزة.</p>
                </div>
                <button className={styles.secondaryButton} type="button" onClick={() => setPhoneModal(true)}>
                  إضافة موبايل
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
                    <span>أضف أول موبايل</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {activeStep === 2 && (
            <div className={styles.stepContent}>
              <h2>تحتاج إيه للموبايل؟</h2>
              <label>
                نوع الخدمة
                <select value={form.service} onChange={(event) => updateField("service", event.target.value)}>
                  <option value="">اختر الخدمة</option>
                  <option value="cover">كفر</option>
                  <option value="screen_protector">اسكرينة</option>
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
                      <Image src={safeProductImage(product)} alt={product.name_en || product.name} width={220} height={220} />
                      <span>{product.name_en || product.name}</span>
                      <strong>{product.price} EGP</strong>
                    </button>
                  ))}
                  {!serviceProducts.length && <p className={styles.muted}>لا توجد منتجات مطابقة لهذا الموديل حالياً.</p>}
                </div>
              )}
            </div>
          )}

          {activeStep === 3 && (
            <div className={styles.stepContent}>
              <h2>بيانات الموقع</h2>
              <div className={styles.fieldGrid}>
                <label className={styles.fullField}>
                  العنوان بالتفصيل
                  <input value={form.address} onChange={(event) => updateField("address", event.target.value)} placeholder="المدينة، المنطقة، الشارع، رقم العمارة" />
                </label>
                <label className={styles.fullField}>
                  لينك اللوكيشن
                  <input value={form.locationLink} onChange={(event) => updateField("locationLink", event.target.value)} placeholder="https://maps.google.com/..." />
                </label>
                <label className={styles.fullField}>
                  ملاحظات
                  <textarea value={form.notes} onChange={(event) => updateField("notes", event.target.value)} placeholder="أقرب علامة أو تفاصيل تساعد المندوب" rows="3" />
                </label>
              </div>
            </div>
          )}

          {activeStep === 4 && (
            <div className={styles.stepContent}>
              <h2>مراجعة الطلب</h2>
              <dl className={styles.review}>
                <div><dt>العميل</dt><dd>{form.clientName || "غير محدد"}</dd></div>
                <div><dt>رقم الموبايل</dt><dd>{form.clientPhone || "غير محدد"}</dd></div>
                <div><dt>الجهاز</dt><dd>{selectedPhone ? `${selectedPhone.phone_name} · ${selectedPhone.model}` : "غير محدد"}</dd></div>
                <div><dt>الخدمة</dt><dd>{form.service === "cover" ? "كفر" : form.service === "screen_protector" ? "اسكرينة" : "غير محدد"}</dd></div>
                <div><dt>المنتج</dt><dd>{selectedProduct?.name_en || selectedProduct?.name || "غير محدد"}</dd></div>
                <div><dt>العنوان</dt><dd>{form.address || "غير محدد"}</dd></div>
              </dl>
            </div>
          )}

          {notice && <p className={styles.notice}>{notice}</p>}

          <div className={styles.actions}>
            <button className={styles.backButton} type="button" disabled={activeStep === 0} onClick={() => setActiveStep((current) => Math.max(current - 1, 0))}>
              رجوع
            </button>
            {activeStep < steps.length - 1 ? (
              <button className={styles.primaryButton} type="button" onClick={goNext}>
                التالي
              </button>
            ) : (
              <button className={styles.primaryButton} type="button" disabled={submitting} onClick={submitRequest}>
                {submitting ? "جارٍ الإرسال..." : "إرسال الطلب"}
              </button>
            )}
          </div>
        </div>
      </section>

      {phoneModal && (
        <div className={styles.overlay} onMouseDown={() => setPhoneModal(false)}>
          <form className={styles.modal} onSubmit={savePhone} onMouseDown={(event) => event.stopPropagation()}>
            <div className={styles.modalTop}>
              <div>
                <p className={styles.eyebrow}>جهازك</p>
                <h2>إضافة موبايل</h2>
              </div>
              <button type="button" onClick={() => setPhoneModal(false)} aria-label="إغلاق">
                ×
              </button>
            </div>

            <label>
              اسم لهذا الموبايل
              <input value={phoneName} onChange={(event) => setPhoneName(event.target.value)} placeholder="مثال: موبايل الشخصي" autoFocus />
            </label>

            <div className={styles.choiceTabs}>
              <button className={!customPhone ? styles.activeChoice : ""} type="button" onClick={() => setCustomPhone(false)}>
                ابحث عن موديل
              </button>
              <button className={customPhone ? styles.activeChoice : ""} type="button" onClick={() => setCustomPhone(true)}>
                موديل مخصص
              </button>
            </div>

            {customPhone ? (
              <div className={styles.fieldGrid}>
                <label>
                  الماركة
                  <input value={customBrand} onChange={(event) => setCustomBrand(event.target.value)} placeholder="مثال: Xiaomi" />
                </label>
                <label>
                  الموديل
                  <input value={customModel} onChange={(event) => setCustomModel(event.target.value)} placeholder="مثال: Redmi Note 13" />
                </label>
              </div>
            ) : (
              <>
                <label>
                  ابحث عن الموديل
                  <input value={phoneSearch} onChange={(event) => setPhoneSearch(event.target.value)} placeholder="iPhone أو Galaxy أو OPPO" />
                </label>
                <div className={styles.modelList}>
                  {matchingModels.map((model) => (
                    <button className={selectedModel?.name === model.name ? styles.selectedModel : ""} key={model.name} type="button" onClick={() => setSelectedModel(model)}>
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
                <span>{customPhone ? customModel || "موديل مخصص" : selectedModel.name}</span>
              </div>
            )}

            {notice && <p className={styles.notice}>{notice}</p>}

            <button className={styles.primaryButton} type="submit" disabled={savingPhone}>
              {savingPhone ? "جارٍ الحفظ..." : "حفظ الموبايل"}
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
