const formatter = new Intl.NumberFormat("ar-EG", {
  style: "currency",
  currency: "EGP",
  maximumFractionDigits: 0,
});

function officialFrom() {
  return process.env.OFFICIAL_EMAIL_FROM || "Cover Up <hello@coverup.tech>";
}

function renderLayout({ eyebrow = "Cover Up", title, intro, body, note = "" }) {
  return `
    <div style="margin:0;padding:32px;background:#f5f2e8;font-family:Tahoma,Arial,sans-serif;color:#111;">
      <div style="max-width:620px;margin:0 auto;background:#111;border-radius:18px;overflow:hidden;border:1px solid rgba(212,181,72,.35);">
        <div style="padding:28px 28px 0;background:linear-gradient(135deg,#16130d 0%,#0a0907 100%);">
          <div style="display:inline-block;padding:8px 12px;border-radius:999px;background:rgba(212,181,72,.14);color:#d4b548;font-size:12px;font-weight:700;letter-spacing:.08em;">
            ${eyebrow}
          </div>
          <h1 style="margin:20px 0 10px;font-size:32px;line-height:1.15;color:#fff;">${title}</h1>
          <p style="margin:0 0 24px;color:#d7d1c2;font-size:16px;line-height:1.8;">${intro}</p>
        </div>
        <div style="padding:28px;background:#fff;color:#17130d;font-size:15px;line-height:1.9;">
          ${body}
          ${note ? `<p style="margin:20px 0 0;color:#6a624f;font-size:13px;">${note}</p>` : ""}
        </div>
      </div>
    </div>
  `;
}

function escapeHtml(value) {
  return String(value || "").replace(/[<>&"]/g, (char) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    '"': "&quot;",
  }[char]));
}

function orderLines(order) {
  if (!Array.isArray(order?.items) || !order.items.length) {
    return "<p>تفاصيل الطلب هتظهر عند مراجعة الفريق.</p>";
  }

  return `
    <table style="width:100%;border-collapse:collapse;margin:18px 0;">
      <tbody>
        ${order.items
          .map(
            (item) => `
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #ece7dc;">${escapeHtml(item.name)}</td>
                <td style="padding:10px 0;border-bottom:1px solid #ece7dc;text-align:center;">${Number(item.quantity || 1)}</td>
                <td style="padding:10px 0;border-bottom:1px solid #ece7dc;text-align:left;">${formatter.format(Number(item.line_total || Number(item.price || 0) * Number(item.quantity || 1)))}</td>
              </tr>
            `,
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function template(type, data = {}) {
  const customerName = escapeHtml(data.customer?.name || data.name || "عميل Cover Up");
  const orderId = escapeHtml(data.order?.id || data.orderId || "");
  const total = formatter.format(Number(data.order?.grand_total ?? data.order?.total ?? data.total ?? 0));
  const orderSummary = data.order ? orderLines(data.order) : "";

  switch (type) {
    case "welcome":
      return {
        subject: "أهلًا بيك في Cover Up",
        html: renderLayout({
          title: `أهلًا ${customerName}`,
          intro: "حسابك اتعمل بنجاح وبقى عندك وصول أسرع للطلبات، الحساب، والمتابعة.",
          body: `<p>اسم المستخدم الخاص بيك: <b>${escapeHtml(data.username || data.customer?.username || "")}</b></p>`,
        }),
      };
    case "verification_code":
      return {
        subject: "كود تأكيد إيميل Cover Up",
        html: renderLayout({
          title: "تأكيد الإيميل",
          intro: "استخدم الكود التالي لتأكيد حسابك على Cover Up.",
          body: `
            <div style="margin:18px 0;padding:18px;border:1px solid #e4d4a0;border-radius:14px;background:#fbf5df;text-align:center;font-size:34px;font-weight:800;letter-spacing:8px;">
              ${escapeHtml(data.code || "")}
            </div>
            <p>الكود صالح لمدة 15 دقيقة.</p>
          `,
        }),
      };
    case "password_reset":
      return {
        subject: "استرجاع كلمة سر Cover Up",
        html: renderLayout({
          title: "كلمة سر مؤقتة",
          intro: "استخدم كلمة السر المؤقتة دي لتسجيل الدخول، وبعدها غيّرها من حسابك.",
          body: `<p style="font-size:24px;font-weight:800;">${escapeHtml(data.temporaryPassword || "")}</p>`,
          note: "لو أنت ما طلبتش الاسترجاع، تجاهل الرسالة وتواصل معنا فورًا.",
        }),
      };
    case "order_confirmation":
      return {
        subject: `تم استلام طلبك${orderId ? ` #${orderId.startsWith("CU") ? orderId : orderId.slice(0, 8)}` : ""}`,
        html: renderLayout({
          title: "طلبك وصلنا",
          intro: `إجمالي الطلب الحالي ${total}، وفريق Cover Up بدأ مراجعته.`,
          body: `
            <p>رقم الطلب: <b>${orderId || "سيظهر في حسابك"}</b></p>
            ${orderSummary}
            <p>طريقة الدفع: <b>${escapeHtml(data.order?.payment_method_label || data.order?.payment_method || "")}</b></p>
          `,
        }),
      };
    case "payment_success":
      return {
        subject: "تم تأكيد الدفع بنجاح",
        html: renderLayout({
          title: "الدفع تم بنجاح",
          intro: "تم تأكيد عملية الدفع الخاصة بطلبك، وفريقنا هيبدأ التنفيذ فورًا.",
          body: `
            <p>رقم الطلب: <b>${orderId}</b></p>
            <p>المبلغ المدفوع: <b>${total}</b></p>
          `,
        }),
      };
    case "payment_failed":
      return {
        subject: "محاولة الدفع لم تكتمل",
        html: renderLayout({
          title: "الدفع ماكملش",
          intro: "محاولة الدفع الأخيرة ما اكتملتش. تقدر تحاول تاني أو تكمل معنا بطريقة تانية.",
          body: `
            <p>رقم الطلب: <b>${orderId}</b></p>
            <p>لو حابب نكمل معاك يدويًا، رد على الإيميل ده أو تواصل معنا على واتساب.</p>
          `,
        }),
      };
    case "order_preparing":
      return {
        subject: "طلبك دخل مرحلة التجهيز",
        html: renderLayout({
          title: "بدأنا نجهز طلبك",
          intro: "طلبك حاليًا في مرحلة التجهيز، وبنراجع كل التفاصيل قبل الخروج.",
          body: `<p>رقم الطلب: <b>${orderId}</b></p>`,
        }),
      };
    case "order_with_courier":
      return {
        subject: "طلبك بقى مع المندوب",
        html: renderLayout({
          title: "طلبك في الطريق",
          intro: "المندوب استلم طلبك وهو في طريقه ليك.",
          body: `<p>رقم الطلب: <b>${orderId}</b></p>`,
        }),
      };
    case "order_delivered":
      return {
        subject: "تم تسليم طلبك",
        html: renderLayout({
          title: "تم التسليم بنجاح",
          intro: "نتمنى تكون التجربة عجبتك، ومستنيين تقييمك بعد الاستلام.",
          body: `<p>رقم الطلب: <b>${orderId}</b></p>`,
        }),
      };
    case "order_cancelled":
      return {
        subject: "تم إلغاء الطلب",
        html: renderLayout({
          title: "تم إلغاء الطلب",
          intro: "الطلب اتلغى وتم تحديث حالته عندنا.",
          body: `<p>رقم الطلب: <b>${orderId}</b></p>`,
        }),
      };
    case "email_verified":
      return {
        subject: "تم تأكيد إيميل Cover Up",
        html: renderLayout({
          title: "الإيميل اتأكد",
          intro: "دلوقتي حسابك جاهز بالكامل للطلبات والمتابعة.",
          body: `<p>أهلًا ${customerName}، تأكيد الإيميل تم بنجاح.</p>`,
        }),
      };
    default:
      return {
        subject: escapeHtml(data.subject || "تحديث من Cover Up"),
        html: renderLayout({
          title: escapeHtml(data.title || "تحديث جديد"),
          intro: escapeHtml(data.intro || ""),
          body: data.body || "<p>عندنا تحديث جديد مرتبط بحسابك أو طلبك.</p>",
        }),
      };
  }
}

async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey || !to) {
    return false;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: officialFrom(),
      to,
      subject,
      html,
    }),
  });

  return response.ok;
}

async function sendTransactionalEmail(type, data = {}) {
  const built = template(type, data);
  return sendEmail({
    to: data.to || data.customer?.email || data.email,
    subject: built.subject,
    html: built.html,
  });
}

export {
  sendEmail,
  sendTransactionalEmail,
};
