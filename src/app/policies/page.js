"use client";

import React from "react";
import { useLanguage } from "@/context/LanguageContext";

export default function PoliciesPage() {
  const { locale } = useLanguage();

  return (
    <main className="simple-page">
      <section className="policy-page">
        <p className="eyebrow">
          {locale === "ar" ? "سياسات Cover Up" : "Cover Up Policies"}
        </p>
        <h1>
          {locale === "ar"
            ? "شحن واضح، استبدال منظم، واسترجاع عادل."
            : "Clear shipping, organized exchange, and fair returns."}
        </h1>

        <article id="shipping">
          <h2>{locale === "ar" ? "الشحن والتوصيل" : "Shipping & Delivery"}</h2>
          <p>
            {locale === "ar"
              ? "التوصيل العادي داخل نطاق الخدمة يتم حسب ضغط الطلبات. مندوب العيلة متاح يوميًا من 10 صباحًا إلى 10 مساءً بعد تأكيد الموعد."
              : "Standard delivery within the service range is processed based on volume. Family Representative service is available daily from 10 AM to 10 PM upon appointment confirmation."}
          </p>
        </article>

        <article id="returns">
          <h2>{locale === "ar" ? "الاستبدال والاسترجاع" : "Refunds & Returns"}</h2>
          <p>
            {locale === "ar"
              ? "الاستبدال متاح خلال 14 يوم للمنتجات غير المستخدمة وبحالتها الأصلية. المنتجات التي تم تركيبها أو استخدامها يتم تقييمها حسب الحالة قبل قبول الاستبدال."
              : "Exchange is available within 14 days for unused products in their original condition. Applied screen protectors or used items are evaluated based on condition before exchange approval."}
          </p>
        </article>

        <article>
          <h2>{locale === "ar" ? "الضمان" : "Warranty"}</h2>
          <p>
            {locale === "ar"
              ? "أي عيب تصنيع واضح يتم مراجعته من فريق Cover Up. لا يشمل الضمان الكسر أو سوء الاستخدام أو التركيب خارج الخدمة المعتمدة."
              : "Any clear manufacturing defect will be reviewed by the Cover Up team. The warranty does not cover breakage, misuse, or installation outside of our certified services."}
          </p>
        </article>

        <article>
          <h2>{locale === "ar" ? "الخصوصية" : "Privacy Policy"}</h2>
          <p>
            {locale === "ar"
              ? "بيانات العميل تستخدم فقط لإتمام الطلبات، التوصيل، الدعم، ورسائل حالة الأوردر الرسمية."
              : "Customer data is strictly used for order processing, delivery logistics, support queries, and official order updates."}
          </p>
        </article>
      </section>
    </main>
  );
}
