"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import styles from "./page.module.css";

const faqData = {
  ar: [
    {
      question: "التوصيل بياخد قد إيه؟",
      answer: "التوصيل لجميع المحافظات خلال 2 لـ 5 أيام عمل. تكلفة الشحن بتظهر في صفحة السلة والدفع وتعتمد على موقعك."
    },
    {
      question: "إزاي مندوب العيلة بيشتغل؟",
      answer: "مندوب العيلة هي خدمة فريدة من نوعها من Cover Up. عند حجز الخدمة، يزورك مندوبنا الفني في منزلك أو مكان عملك ومعه مجموعة متنوعة من الجرابات والاسكرينات لتجربتها بنفسك على موبايلك قبل الشراء لضمان ملاءمتها الكاملة وجودتها."
    },
    {
      question: "الدفع الإلكتروني متاح؟",
      answer: "نعم، نحن نقبل الدفع كاش عند الاستلام، أو بالبطاقات الائتمانية والمحافظ الإلكترونية من خلال بوابة Paymob الآمنة والموثقة."
    },
    {
      question: "الاستبدال والاسترجاع إيه نظامه؟",
      answer: "يمكنك استبدال أو استرجاع المنتج خلال 14 يومًا من تاريخ الشراء، بشرط أن يكون المنتج في حالته الأصلية وبغلافه الأصلي دون أي تلف. في حالة وجود عيب صناعة، سنتحمل كافة تكاليف الشحن البديل."
    },
    {
      question: "هل يتوفر لديكم أسعار خاصة للشركات؟",
      answer: "نعم، نوفر باقات حماية أجهزة وعروض أسعار خاصة للشركات والمؤسسات بخصومات مميزة. يمكنك تقديم طلبك عبر صفحة 'طلبات الشركات' أو التواصل معنا مباشرة."
    }
  ],
  en: [
    {
      question: "How long does delivery take?",
      answer: "Delivery takes between 2 to 5 business days nationwide. Shipping costs are calculated at checkout and depend on your location."
    },
    {
      question: "How does the Family Representative visit work?",
      answer: "Family Representative is an exclusive service from Cover Up. Upon booking, our technical representative will visit you at your home or office with a selection of cases and screen protectors for you to try on your phone before buying, ensuring a perfect fit."
    },
    {
      question: "Is online payment supported?",
      answer: "Yes, we accept Cash on Delivery (COD) as well as credit cards and mobile wallets through the secure Paymob gateway."
    },
    {
      question: "What is the return and exchange policy?",
      answer: "You can exchange or return products within 14 days of purchase, provided the items are in their original, unused condition with original packaging. If there's a manufacturing defect, we will cover all return shipping costs."
    },
    {
      question: "Do you offer corporate discounts?",
      answer: "Yes, we offer bulk pricing and specialized device protection programs for corporate clients. You can submit a request on our 'Corporate Requests' page or contact support directly."
    }
  ]
};

export default function FAQPage() {
  const { locale } = useLanguage();
  const ar = locale === "ar";
  const faqs = faqData[locale] || faqData["ar"];

  // State to track open accordion
  const [openIndex, setOpenIndex] = useState(null);

  const toggleAccordion = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <main className={styles.page} dir={ar ? "rtl" : "ltr"}>
      {/* Hero Head */}
      <section className={styles.hero}>
        <p className={styles.eyebrow}>{ar ? "الأسئلة الشائعة" : "FAQ"}</p>
        <h1>{ar ? "إجابات سريعة لاستفساراتك." : "Quick answers to your questions."}</h1>
        <p>
          {ar
            ? "تصفح الأسئلة الشائعة لمعرفة المزيد حول خدمات التوصيل، الدعم، والسياسات الخاصة بنا."
            : "Browse through our frequently asked questions to learn more about our services, support, and policies."}
        </p>
      </section>

      {/* Accordion List */}
      <section className={styles.accordionContainer}>
        {faqs.map((faq, index) => {
          const isOpen = openIndex === index;
          return (
            <div
              key={index}
              className={`${styles.accordion} ${isOpen ? styles.accordionActive : ""}`}
            >
              <button
                type="button"
                className={styles.question}
                onClick={() => toggleAccordion(index)}
                aria-expanded={isOpen}
              >
                <span>{faq.question}</span>
                <svg
                  className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ""}`}
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
              <div
                className={`${styles.answerWrapper} ${isOpen ? styles.answerWrapperOpen : ""}`}
                style={{ maxHeight: isOpen ? "200px" : "0px" }}
              >
                <div className={styles.answer}>
                  {faq.answer}
                </div>
              </div>
            </div>
          );
        })}

        {/* Footer Support CTA */}
        <div className={styles.faqCta}>
          <h2>{ar ? "ما لقيتش إجابة لسؤالك؟" : "Didn't find what you need?"}</h2>
          <p>
            {ar
              ? "فريق الدعم الفني متواجد لمساعدتك والإجابة على أي استفسارات."
              : "Our support team is available to help and answer any questions."}
          </p>
          <Link href="/support" className={styles.ctaButton}>
            {ar ? "تواصل مع الدعم الفني" : "Contact Technical Support"}
          </Link>
        </div>
      </section>
    </main>
  );
}
