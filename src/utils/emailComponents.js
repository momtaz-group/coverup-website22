import React from "react";
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Button as EmailButton,
  Img,
  Hr,
  Row,
  Column,
  Link,
} from "@react-email/components";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://coverup.tech";
const logoUrl = `${siteUrl}/assets/brand/cover-up-symbol.png`;

// Base components
function EmailLayout({ lang = "ar", dir = "rtl", previewText = "", title = "", intro = "", children }) {
  const isAr = lang === "ar";
  return (
    <Html lang={lang} dir={dir}>
      <Head>
        <style>{`
          @media only screen and (max-width: 600px) {
            .email-container {
              width: 100% !important;
              padding: 16px !important;
            }
          }
        `}</style>
      </Head>
      <Preview>{previewText}</Preview>
      <Body style={styles.body}>
        <Container className="email-container" style={styles.container}>
          {/* Header */}
          <Section style={styles.header}>
            <Row style={{ width: "100%" }}>
              <Column style={{ textAlign: dir === "rtl" ? "right" : "left", verticalAlign: "middle" }}>
                <Img src={logoUrl} alt="CoverUp Logo" width="40" height="40" style={styles.logo} />
              </Column>
              <Column style={{ textAlign: dir === "rtl" ? "left" : "right", verticalAlign: "middle" }}>
                <Text style={styles.eyebrow}>CoverUp</Text>
              </Column>
            </Row>
            <Heading style={styles.title}>{title}</Heading>
            <Text style={styles.intro}>{intro}</Text>
          </Section>

          {/* Body Content */}
          <Section style={styles.content}>
            {children}
          </Section>

          {/* Footer */}
          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              {isAr ? "الدعم الفني: " : "Support: "}
              <Link href={`${siteUrl}/support`} style={styles.footerLink}>
                {isAr ? "مركز الدعم" : "Support Center"}
              </Link>{" "}
              |{" "}
              <Link href={`${siteUrl}/track`} style={styles.footerLink}>
                {isAr ? "تتبع طلبك" : "Track Order"}
              </Link>
            </Text>
            <Text style={styles.footerText}>
              &copy; {new Date().getFullYear()} CoverUp. {isAr ? "جميع الحقوق محفوظة." : "All rights reserved."}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

function StatusTracker({ activeStep = "received", lang = "ar" }) {
  const isAr = lang === "ar";
  const steps = [
    { key: "received", ar: "تم الاستلام", en: "Received" },
    { key: "confirmed", ar: "تم التأكيد", en: "Confirmed" },
    { key: "preparing", ar: "التجهيز", en: "Preparing" },
    { key: "shipped", ar: "مع المندوب", en: "Shipped" },
    { key: "delivered", ar: "تم التوصيل", en: "Delivered" },
  ];

  const activeIndex = steps.findIndex((s) => s.key === activeStep);

  return (
    <Section style={styles.trackerContainer}>
      <table style={{ width: "100%", borderCollapse: "collapse", direction: isAr ? "rtl" : "ltr" }}>
        <tbody>
          <tr>
            {steps.map((step, idx) => {
              const isCompleted = idx <= activeIndex;
              const isCurrent = idx === activeIndex;

              const circleBg = isCurrent ? "#00ffaa" : isCompleted ? "#111" : "#ece7dc";
              const circleColor = isCurrent ? "#111" : isCompleted ? "#fff" : "#8c826c";
              const labelColor = isCurrent ? "#00ffaa" : isCompleted ? "#111" : "#a19882";
              const labelWeight = isCurrent ? "700" : "normal";

              return (
                <td key={step.key} style={{ width: "20%", textAlign: "center", verticalAlign: "top", padding: "0 4px" }}>
                  <div style={{
                    display: "inline-block",
                    width: "24px",
                    height: "24px",
                    lineHeight: "24px",
                    borderRadius: "50%",
                    backgroundColor: circleBg,
                    color: circleColor,
                    fontSize: "11px",
                    fontWeight: "bold",
                    marginBottom: "6px",
                    textAlign: "center",
                    fontFamily: "Arial, sans-serif"
                  }}>
                    {isCurrent ? "★" : isCompleted ? "✓" : idx + 1}
                  </div>
                  <div style={{
                    fontSize: "11px",
                    fontFamily: "Tahoma, Arial, sans-serif",
                    color: labelColor,
                    fontWeight: labelWeight,
                    whiteSpace: "nowrap"
                  }}>
                    {isAr ? step.ar : step.en}
                  </div>
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </Section>
  );
}

function OrderSummaryCard({ order, lang = "ar" }) {
  const isAr = lang === "ar";
  const items = Array.isArray(order?.items) ? order.items : [];
  
  const formatter = new Intl.NumberFormat(isAr ? "ar-EG" : "en-US", {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 0,
  });

  return (
    <Section style={styles.card}>
      <Heading style={styles.cardHeader}>{isAr ? "ملخص المنتجات" : "Order Items"}</Heading>
      <table style={{ width: "100%", borderCollapse: "collapse", direction: isAr ? "rtl" : "ltr" }}>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} style={{ borderBottom: "1px solid #ece7dc" }}>
              <td style={{ padding: "10px 0", textAlign: isAr ? "right" : "left", color: "#111", fontSize: "14px" }}>
                <div>{item.name}</div>
                {item.compatible_model && (
                  <div style={{ fontSize: "12px", color: "#666" }}>
                    {isAr ? "الموديل: " : "Model: "} {item.compatible_model}
                  </div>
                )}
              </td>
              <td style={{ padding: "10px 0", textAlign: "center", color: "#666", fontSize: "14px", width: "40px" }}>
                {item.quantity}x
              </td>
              <td style={{ padding: "10px 0", textAlign: isAr ? "left" : "right", color: "#111", fontSize: "14px", fontWeight: "bold" }}>
                {formatter.format(Number(item.line_total || Number(item.price || 0) * Number(item.quantity || 1)))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Section style={{ marginTop: "14px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", direction: isAr ? "rtl" : "ltr" }}>
          <tbody>
            <tr>
              <td style={styles.summaryLabel}>{isAr ? "المجموع الفرعي:" : "Subtotal:"}</td>
              <td style={styles.summaryValue}>{formatter.format(Number(order.subtotal || 0))}</td>
            </tr>
            {Number(order.discount_amount) > 0 && (
              <tr>
                <td style={styles.summaryLabel}>
                  {isAr ? "الخصم:" : "Discount:"}{" "}
                  {order.discount_code ? `(${order.discount_code})` : ""}
                </td>
                <td style={styles.summaryValue}>-{formatter.format(Number(order.discount_amount))}</td>
              </tr>
            )}
            {Number(order.delivery_fee) > 0 && (
              <tr>
                <td style={styles.summaryLabel}>{isAr ? "مصاريف الشحن:" : "Shipping:"}</td>
                <td style={styles.summaryValue}>{formatter.format(Number(order.delivery_fee))}</td>
              </tr>
            )}
            <tr style={{ borderTop: "2px solid #111" }}>
              <td style={{ ...styles.summaryLabel, fontWeight: "bold", fontSize: "16px", paddingTop: "8px" }}>
                {isAr ? "الإجمالي الكلي:" : "Total:"}
              </td>
              <td style={{ ...styles.summaryValue, fontWeight: "bold", fontSize: "16px", color: "#d4b548", paddingTop: "8px" }}>
                {formatter.format(Number(order.grand_total ?? order.total ?? 0))}
              </td>
            </tr>
          </tbody>
        </table>
      </Section>
    </Section>
  );
}

function PrimaryButton({ href, label, lang = "ar" }) {
  return (
    <Section style={{ textAlign: "center", margin: "24px 0" }}>
      <EmailButton href={href} style={styles.button}>
        {label}
      </EmailButton>
    </Section>
  );
}

// Templates components
function WelcomeEmail({ customerName, username }) {
  return (
    <EmailLayout
      lang="ar"
      dir="rtl"
      previewText="أهلاً بك في CoverUp!"
      title={`أهلاً بك ${customerName}`}
      intro="حسابك جاهز دلوقتي وتقدر تبدأ تستخدمه لمتابعة طلباتك واستكشاف منتجاتنا."
    >
      <p style={{ fontSize: "15px", color: "#333" }}>
        اسم المستخدم الخاص بك هو: <strong>{username}</strong>
      </p>
      <PrimaryButton href={`${siteUrl}/products`} label="تصفح المنتجات" />
    </EmailLayout>
  );
}

function VerificationCodeEmail({ code }) {
  return (
    <EmailLayout
      lang="ar"
      dir="rtl"
      previewText="رمز التحقق الخاص بك من CoverUp"
      title="تأكيد البريد الإلكتروني"
      intro="استخدم الرمز التالي لتأكيد حسابك. الرمز صالح لمدة 15 دقيقة."
    >
      <div style={{
        margin: "24px 0",
        padding: "20px",
        backgroundColor: "#faf8f4",
        border: "2px dashed #00ffaa",
        borderRadius: "12px",
        textAlign: "center",
        fontSize: "36px",
        fontWeight: "800",
        letterSpacing: "8px",
        color: "#111",
        fontFamily: "Courier, monospace"
      }}>
        {code}
      </div>
      <p style={{ fontSize: "13px", color: "#666", textAlign: "center", margin: "16px 0 0" }}>
        إذا لم تقم بطلب هذا الرمز، يرجى تجاهل هذا البريد الإلكتروني بأمان.
      </p>
    </EmailLayout>
  );
}

function PasswordResetEmail({ temporaryPassword }) {
  return (
    <EmailLayout
      lang="ar"
      dir="rtl"
      previewText="طلب استعادة كلمة مرور CoverUp"
      title="استعادة كلمة المرور"
      intro="لقد تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك."
    >
      <p style={{ fontSize: "15px", color: "#333" }}>كلمة المرور المؤقتة الخاصة بك هي:</p>
      <p style={{
        fontSize: "24px",
        fontWeight: "bold",
        textAlign: "center",
        color: "#d4b548",
        backgroundColor: "#faf8f5",
        padding: "12px",
        borderRadius: "8px",
        border: "1px solid #ece7dc",
        margin: "18px 0"
      }}>
        {temporaryPassword}
      </p>
      <p style={{ fontSize: "15px", color: "#333" }}>يرجى تسجيل الدخول بها ثم تغييرها فوراً من إعدادات حسابك.</p>
      <PrimaryButton href={`${siteUrl}/account`} label="تسجيل الدخول" />
      <p style={{ fontSize: "12px", color: "#666", marginTop: "16px" }}>
        إذا لم تطلب تغيير كلمة المرور، يرجى تجاهل هذا الإيميل وتغيير كلمة مرورك للأمان.
      </p>
    </EmailLayout>
  );
}

function PasswordChangedEmail() {
  return (
    <EmailLayout
      lang="ar"
      dir="rtl"
      previewText="تنبيه أمني: تم تغيير كلمة المرور"
      title="تم تغيير كلمة المرور بنجاح"
      intro="نود إعلامك بأنه تم تغيير كلمة المرور الخاصة بحسابك على CoverUp بنجاح."
    >
      <div style={{
        backgroundColor: "#fffdf9",
        border: "1px solid #ffeeba",
        borderRadius: "8px",
        padding: "16px",
        margin: "16px 0",
        color: "#856404",
        fontSize: "14px"
      }}>
        <strong>تنبيه أمني:</strong> إذا لم تقم أنت بهذا التغيير، يرجى التواصل مع فريق الدعم الفني فوراً لحماية حسابك.
      </div>
      <p style={{ fontSize: "14px", color: "#666" }}>
        وقت التغيير: {new Date().toLocaleString("ar-EG", { timeZone: "Africa/Cairo" })} بتوقيت القاهرة.
      </p>
    </EmailLayout>
  );
}

function OrderConfirmationEmail({ order, paymentMethodLabel }) {
  return (
    <EmailLayout
      lang="ar"
      dir="rtl"
      previewText="طلبك وصلنا وبدأنا نراجعه"
      title="شكراً لطلبك من CoverUp"
      intro="لقد استلمنا طلبك بنجاح، وسنقوم بمراجعته وتجهيزه فوراً."
    >
      <StatusTracker activeStep="received" lang="ar" />
      <Text style={{ fontSize: "15px", color: "#111", margin: "12px 0" }}>
        رقم الطلب: <strong>#{order.id}</strong>
      </Text>
      <OrderSummaryCard order={order} lang="ar" />
      
      <div style={{
        backgroundColor: "#faf8f5",
        padding: "14px",
        borderRadius: "10px",
        border: "1px solid #ece7dc",
        marginTop: "14px",
        fontSize: "14px",
        color: "#111"
      }}>
        <p style={{ margin: "0 0 8px" }}>
          طريقة الدفع: <strong>{paymentMethodLabel || order.payment_method_label || order.payment_method}</strong>
        </p>
        <p style={{ margin: "0" }}>
          طريقة التوصيل: <strong>{order.delivery_method === "pickup" ? "استلام من الفرع" : "شحن للمنزل"}</strong>
        </p>
        {order.customer?.address && (
          <p style={{ margin: "8px 0 0" }}>
            عنوان الشحن: <strong>{order.customer.address} ({order.customer.city})</strong>
          </p>
        )}
      </div>

      <PrimaryButton href={`${siteUrl}/track?orderId=${order.id}&phone=${encodeURIComponent(order.customer?.phone || "")}`} label="تتبع طلبك الآن" />
    </EmailLayout>
  );
}

function OrderConfirmedEmail({ order }) {
  return (
    <EmailLayout
      lang="ar"
      dir="rtl"
      previewText="تم تأكيد طلبك بنجاح"
      title="طلبك اتأكد بنجاح"
      intro={`خبر سعيد! تم تأكيد طلبك رقم #${order.id}، وبدأنا نقله لمرحلة التجهيز والتحضير.`}
    >
      <StatusTracker activeStep="confirmed" lang="ar" />
      <OrderSummaryCard order={order} lang="ar" />
      <PrimaryButton href={`${siteUrl}/track?orderId=${order.id}&phone=${encodeURIComponent(order.customer?.phone || "")}`} label="تتبع طلبك" />
    </EmailLayout>
  );
}

function OrderPreparingEmail({ order }) {
  return (
    <EmailLayout
      lang="ar"
      dir="rtl"
      previewText="بدأنا تجهيز طلبك"
      title="طلبك بيتجهز بكل حب"
      intro={`طلبك رقم #${order.id} قيد التجهيز حالياً. بنراجع كل التفاصيل ونغلف المنتجات بعناية لتصلك في أفضل صورة.`}
    >
      <StatusTracker activeStep="preparing" lang="ar" />
      <OrderSummaryCard order={order} lang="ar" />
    </EmailLayout>
  );
}

function OrderWithCourierEmail({ order }) {
  return (
    <EmailLayout
      lang="ar"
      dir="rtl"
      previewText="طلبك مع المندوب وفي الطريق إليك"
      title="طلبك في الطريق ليك"
      intro={`المندوب استلم طلبك رقم #${order.id} وهو في طريقه لتسليمه ليك. جهز نفسك للاستلام قريباً!`}
    >
      <StatusTracker activeStep="shipped" lang="ar" />
      <OrderSummaryCard order={order} lang="ar" />
      <div style={{
        backgroundColor: "#faf8f5",
        padding: "14px",
        borderRadius: "10px",
        border: "1px solid #ece7dc",
        marginTop: "14px",
        fontSize: "14px"
      }}>
        <p style={{ margin: "0" }}>
          المبلغ المطلوب عند الاستلام: <strong>{order.payment_status === "paid" ? "0 EGP (تم الدفع مسبقاً)" : `${order.grand_total || order.total} EGP`}</strong>
        </p>
      </div>
    </EmailLayout>
  );
}

function OrderDeliveredEmail({ order }) {
  return (
    <EmailLayout
      lang="ar"
      dir="rtl"
      previewText="تم توصيل طلبك بنجاح"
      title="طلبك وصل بالسلامة!"
      intro={`تم تسليم طلبك رقم #${order.id} بنجاح. نتمنى تكون جودة الكفرات وتجربتك معنا ممتازة.`}
    >
      <StatusTracker activeStep="delivered" lang="ar" />
      <div style={{
        backgroundColor: "#faf8f5",
        padding: "16px",
        borderRadius: "10px",
        border: "1px solid #ece7dc",
        textAlign: "center"
      }}>
        <p style={{ margin: "0 0 10px", fontWeight: "bold" }}>رأيك يهمنا جداً!</p>
        <p style={{ margin: "0 0 14px", fontSize: "13px", color: "#666" }}>شاركنا تقييمك وتجربتك مع كفراتنا.</p>
        <PrimaryButton href={`${siteUrl}/account`} label="تقييم المنتجات" />
      </div>
    </EmailLayout>
  );
}

function OrderCancelledEmail({ order }) {
  return (
    <EmailLayout
      lang="ar"
      dir="rtl"
      previewText="تم إلغاء طلبك"
      title="تم إلغاء الطلب"
      intro={`تم إلغاء طلبك رقم #${order.id} بنجاح وتحديث حالته لدينا.`}
    >
      <p style={{ fontSize: "14px", color: "#111" }}>لو تم إلغاء الطلب بالخطأ أو حابب تعيد الطلب بطريقة تانية، تقدر ترجع لموقعنا أو تتواصل معانا على الواتساب عشان نساعدك في ثواني.</p>
    </EmailLayout>
  );
}

function OrderRefundedEmail({ order }) {
  return (
    <EmailLayout
      lang="ar"
      dir="rtl"
      previewText="تم استرداد مبلغ طلبك"
      title="تم استرداد المبلغ بنجاح"
      intro={`تمت عملية استرداد المبلغ بنجاح لطلبك رقم #${order.id}.`}
    >
      <p style={{ fontSize: "14px", color: "#111" }}>تم استرداد قيمة طلبك بالكامل. قد يستغرق ظهور المبلغ في حسابك البنكي من 5 إلى 14 يوم عمل حسب سياسات البنك الخاص بك.</p>
    </EmailLayout>
  );
}

function EmailVerifiedEmail({ customerName }) {
  return (
    <EmailLayout
      lang="ar"
      dir="rtl"
      previewText="تم تأكيد حسابك بنجاح"
      title="تم تأكيد الإيميل بنجاح"
      intro={`أهلاً بك ${customerName}، تم تأكيد البريد الإلكتروني الخاص بحسابك بنجاح.`}
    >
      <p style={{ fontSize: "14px", color: "#111" }}>دلوقتي حسابك مفعل وجاهز بالكامل. تقدر تدخل تتابع طلباتك وتتحكم في حسابك بسهولة.</p>
      <PrimaryButton href={`${siteUrl}/account`} label="دخول حسابي" />
    </EmailLayout>
  );
}

const TEMPLATES = {
  welcome: {
    subject: "أهلًا بيك في CoverUp",
    component: WelcomeEmail,
  },
  verification_code: {
    subject: "كود تأكيد إيميل CoverUp",
    component: VerificationCodeEmail,
  },
  password_reset: {
    subject: "استرجاع كلمة سر CoverUp",
    component: PasswordResetEmail,
  },
  password_changed: {
    subject: "تم تغيير كلمة مرور حسابك CoverUp",
    component: PasswordChangedEmail,
  },
  order_confirmation: {
    subject: (data) => `تم استلام طلبك من CoverUp | رقم الطلب #${data.order?.id || ""}`,
    component: OrderConfirmationEmail,
  },
  order_confirmed: {
    subject: (data) => `تم تأكيد طلبك من CoverUp | رقم الطلب #${data.order?.id || ""}`,
    component: OrderConfirmedEmail,
  },
  order_preparing: {
    subject: (data) => `بدأنا تجهيز طلبك من CoverUp | رقم الطلب #${data.order?.id || ""}`,
    component: OrderPreparingEmail,
  },
  order_with_courier: {
    subject: (data) => `طلبك مع المندوب وفي الطريق إليك | رقم الطلب #${data.order?.id || ""}`,
    component: OrderWithCourierEmail,
  },
  order_delivered: {
    subject: (data) => `تم توصيل طلبك بنجاح من CoverUp | رقم الطلب #${data.order?.id || ""}`,
    component: OrderDeliveredEmail,
  },
  order_cancelled: {
    subject: (data) => `تم إلغاء طلبك من CoverUp | رقم الطلب #${data.order?.id || ""}`,
    component: OrderCancelledEmail,
  },
  order_refunded: {
    subject: (data) => `تم استرداد مبلغ طلبك من CoverUp | رقم الطلب #${data.order?.id || ""}`,
    component: OrderRefundedEmail,
  },
  email_verified: {
    subject: "تم تأكيد إيميل CoverUp بنجاح",
    component: EmailVerifiedEmail,
  },
};

// Render Email main function
export function renderEmail(type, data) {
  const templateConfig = TEMPLATES[type];
  if (!templateConfig) {
    throw new Error(`Invalid email template type: ${type}`);
  }

  const subject = typeof templateConfig.subject === "function"
    ? templateConfig.subject(data)
    : templateConfig.subject;

  // Use dynamic require of react-dom/server to prevent compile issues on Turbopack App Router paths
  const { renderToStaticMarkup } = require("react-dom/server");
  const Component = templateConfig.component;
  const html = "<!DOCTYPE html>" + renderToStaticMarkup(<Component {...data} />);

  return { subject, html };
}

// Styling system
const styles = {
  body: {
    backgroundColor: "#f5f2e8",
    padding: "32px 0",
    margin: "0",
    fontFamily: "Tahoma, Arial, sans-serif",
  },
  container: {
    backgroundColor: "#111",
    borderRadius: "18px",
    overflow: "hidden",
    border: "1px solid rgba(212, 181, 72, 0.35)",
    maxWidth: "600px",
    margin: "0 auto",
  },
  header: {
    padding: "32px 28px 24px",
    background: "linear-gradient(135deg, #16130d 0%, #0a0907 100%)",
  },
  logo: {
    display: "block",
  },
  eyebrow: {
    color: "#00ffaa",
    fontSize: "14px",
    fontWeight: "700",
    letterSpacing: "0.08em",
    margin: "0",
  },
  title: {
    color: "#fff",
    fontSize: "28px",
    fontWeight: "700",
    lineHeight: "1.25",
    margin: "20px 0 10px",
  },
  intro: {
    color: "#d7d1c2",
    fontSize: "15px",
    lineHeight: "1.8",
    margin: "0 0 8px",
  },
  content: {
    padding: "28px",
    backgroundColor: "#fff",
    color: "#17130d",
  },
  trackerContainer: {
    margin: "0 0 24px",
  },
  card: {
    backgroundColor: "#faf8f4",
    borderRadius: "12px",
    border: "1px solid #e8e3d5",
    padding: "16px",
    margin: "18px 0",
  },
  cardHeader: {
    margin: "0 0 12px",
    fontSize: "16px",
    fontWeight: "700",
    color: "#111",
    borderBottom: "2px solid #00ffaa",
    paddingBottom: "6px",
  },
  summaryLabel: {
    padding: "4px 0",
    color: "#666",
    fontSize: "14px",
  },
  summaryValue: {
    padding: "4px 0",
    textAlign: "left",
    color: "#111",
    fontSize: "14px",
  },
  button: {
    backgroundColor: "#111",
    border: "2px solid #00ffaa",
    borderRadius: "8px",
    color: "#00ffaa",
    fontSize: "15px",
    fontWeight: "700",
    textDecoration: "none",
    textAlign: "center",
    display: "inline-block",
    padding: "12px 24px",
  },
  footer: {
    padding: "24px 28px",
    backgroundColor: "#0d0c0a",
    borderTop: "1px solid rgba(212, 181, 72, 0.15)",
    textAlign: "center",
  },
  footerText: {
    color: "#6a624f",
    fontSize: "12px",
    margin: "4px 0",
  },
  footerLink: {
    color: "#d4b548",
    textDecoration: "none",
  },
};
