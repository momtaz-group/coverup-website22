const formatter = new Intl.NumberFormat("ar-EG", {
  style: "currency",
  currency: "EGP",
  maximumFractionDigits: 0,
});

function officialFrom() {
  return process.env.OFFICIAL_EMAIL_FROM || "Cover Up <hello@coverup.tech>";
}

function renderStatusTracker(activeStep) {
  if (!activeStep) return "";

  const steps = [
    { key: "received", ar: "تم الاستلام", en: "Received" },
    { key: "confirmed", ar: "تم التأكيد", en: "Confirmed" },
    { key: "preparing", ar: "التجهيز", en: "Preparing" },
    { key: "shipped", ar: "مع المندوب", en: "Shipped" },
    { key: "delivered", ar: "تم التوصيل", en: "Delivered" }
  ];

  const activeIndex = steps.findIndex(s => s.key === activeStep);

  return `
    <div style="margin: 0 0 24px; padding: 18px 12px; background: #faf8f4; border-radius: 14px; border: 1px solid #e8e3d5; direction: rtl; text-align: center;">
      <table style="width: 100%; border-collapse: collapse; margin: 0 auto; max-width: 500px;">
        <tbody>
          <tr>
            ${steps.map((step, idx) => {
              const isCompleted = idx <= activeIndex;
              const isCurrent = idx === activeIndex;
              
              const circleBg = isCurrent ? "#d4b548" : isCompleted ? "#111" : "#ece7dc";
              const circleColor = isCompleted ? "#fff" : "#8c826c";
              
              const labelColor = isCurrent ? "#d4b548" : isCompleted ? "#111" : "#a19882";
              const labelWeight = isCurrent ? "700" : "normal";

              return `
                <td style="width: 20%; text-align: center; vertical-align: top; padding: 0 4px;">
                  <div style="display: inline-block; width: 24px; height: 24px; line-height: 24px; border-radius: 50%; background: ${circleBg}; color: ${circleColor}; font-size: 11px; font-weight: bold; margin-bottom: 6px; text-align: center; font-family: Arial, sans-serif;">
                    ${isCurrent ? "★" : isCompleted ? "✓" : idx + 1}
                  </div>
                  <div style="font-size: 11px; font-family: Tahoma, Arial, sans-serif; color: ${labelColor}; font-weight: ${labelWeight}; white-space: nowrap;">
                    ${step.ar}
                  </div>
                </td>
              `;
            }).join("")}
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

function renderLayout({ eyebrow = "Cover Up", title, intro, body, statusTracker = "", note = "" }) {
  return `
    <div style="margin:0;padding:32px;background:#f5f2e8;font-family:Tahoma,Arial,sans-serif;color:#111;direction:rtl;text-align:right;">
      <div style="max-width:620px;margin:0 auto;background:#111;border-radius:18px;overflow:hidden;border:1px solid rgba(212,181,72,.35);">
        <div style="padding:28px 28px 0;background:linear-gradient(135deg,#16130d 0%,#0a0907 100%);">
          <div style="display:inline-block;padding:8px 12px;border-radius:999px;background:rgba(212,181,72,.14);color:#d4b548;font-size:12px;font-weight:700;letter-spacing:.08em;">
            ${eyebrow}
          </div>
          <h1 style="margin:20px 0 10px;font-size:32px;line-height:1.15;color:#fff;text-align:right;">${title}</h1>
          <p style="margin:0 0 24px;color:#d7d1c2;font-size:16px;line-height:1.8;text-align:right;">${intro}</p>
        </div>
        <div style="padding:28px;background:#fff;color:#17130d;font-size:15px;line-height:1.9;text-align:right;">
          ${statusTracker}
          ${body}
          ${note ? `<p style="margin:20px 0 0;color:#6a624f;font-size:13px;text-align:right;border-top:1px dashed #ece7dc;padding-top:12px;">${note}</p>` : ""}
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
    <table style="width:100%;border-collapse:collapse;margin:18px 0;direction:rtl;text-align:right;">
      <tbody>
        ${order.items
          .map(
            (item) => `
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #ece7dc;font-family:Tahoma,Arial,sans-serif;font-size:14px;color:#111;text-align:right;">${escapeHtml(item.name)}</td>
                <td style="padding:10px 0;border-bottom:1px solid #ece7dc;text-align:center;font-family:Tahoma,Arial,sans-serif;font-size:14px;color:#666;">${Number(item.quantity || 1)}x</td>
                <td style="padding:10px 0;border-bottom:1px solid #ece7dc;text-align:left;font-family:Tahoma,Arial,sans-serif;font-size:14px;color:#111;font-weight:bold;">${formatter.format(Number(item.line_total || Number(item.price || 0) * Number(item.quantity || 1)))}</td>
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
  const shortOrderId = orderId ? (orderId.startsWith("CU") ? orderId : orderId.slice(0, 8)) : "";
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
            <div style="margin:18px 0;padding:18px;border:1px solid #e4d4a0;border-radius:14px;background:#fbf5df;text-align:center;font-size:34px;font-weight:800;letter-spacing:8px;color:#111;">
              ${escapeHtml(data.code || "")}
            </div>
            <p style="text-align:center;color:#666;font-size:14px;margin:0;">الكود صالح لمدة 15 دقيقة.</p>
          `,
        }),
      };
    case "password_reset":
      return {
        subject: "استرجاع كلمة سر Cover Up",
        html: renderLayout({
          title: "كلمة سر مؤقتة",
          intro: "استخدم كلمة السر المؤقتة دي لتسجيل الدخول، وبعدها غيّرها من حسابك.",
          body: `<p style="font-size:24px;font-weight:800;text-align:center;color:#d4b548;background:#faf8f5;padding:12px;border-radius:8px;border:1px solid #ece7dc;margin:18px 0;">${escapeHtml(data.temporaryPassword || "")}</p>`,
          note: "لو أنت ما طلبتش الاسترجاع، تجاهل الرسالة وتواصل معنا فورًا.",
        }),
      };
    case "order_confirmation":
      return {
        subject: `تم استلام طلبك${shortOrderId ? ` #${shortOrderId}` : ""}`,
        html: renderLayout({
          title: "طلبك وصلنا وبدأنا نراجعه",
          intro: `إجمالي طلبك هو ${total}. فريق Cover Up بيراجع تفاصيل طلبك لتأكيده في أسرع وقت.`,
          statusTracker: renderStatusTracker("received"),
          body: `
            <h3 style="margin-top:0;color:#111;border-bottom:2px solid #d4b548;padding-bottom:8px;">تفاصيل الطلب</h3>
            <p>رقم الطلب: <b>${orderId || "سيظهر في حسابك"}</b></p>
            ${orderSummary}
            <div style="background:#faf8f5;padding:14px;border-radius:10px;border:1px solid #ece7dc;margin-top:14px;">
              <p style="margin:0 0 8px;">طريقة الدفع: <b>${escapeHtml(data.order?.payment_method_label || data.order?.payment_method || "")}</b></p>
              <p style="margin:0;">طريقة التوصيل: <b>${data.order?.delivery_method === "pickup" ? "استلام من الفرع" : "شحن للمنزل"}</b></p>
            </div>
          `,
        }),
      };
    case "order_confirmed":
      return {
        subject: `تم تأكيد طلبك${shortOrderId ? ` #${shortOrderId}` : ""}`,
        html: renderLayout({
          title: "تم تأكيد طلبك بنجاح!",
          intro: `خبر سعيد! تم تأكيد طلبك رقم #${orderId}، وبدأنا نقله لمرحلة التجهيز والتحضير.`,
          statusTracker: renderStatusTracker("confirmed"),
          body: `
            <h3 style="margin-top:0;color:#111;border-bottom:2px solid #d4b548;padding-bottom:8px;">تفاصيل الطلب المؤكد</h3>
            ${orderSummary}
            <div style="background:#faf8f5;padding:14px;border-radius:10px;border:1px solid #ece7dc;margin-top:14px;">
              <p style="margin:0 0 8px;">الإجمالي المؤكد: <b>${total}</b></p>
              <p style="margin:0 0 8px;">طريقة الدفع: <b>${escapeHtml(data.order?.payment_method_label || data.order?.payment_method || "")}</b></p>
              <p style="margin:0;">طريقة التوصيل: <b>${data.order?.delivery_method === "pickup" ? "استلام من الفرع" : "شحن للمنزل"}</b></p>
            </div>
          `,
        }),
      };
    case "payment_success":
      return {
        subject: `تم تأكيد الدفع بنجاح للطلب${shortOrderId ? ` #${shortOrderId}` : ""}`,
        html: renderLayout({
          title: "الدفع تم بنجاح!",
          intro: `شكراً ليك! تم تأكيد الدفع الإلكتروني بنجاح لطلبك رقم #${orderId} بمبلغ ${total}. وفريقنا هيبدأ التجهيز فوراً.`,
          statusTracker: renderStatusTracker("confirmed"),
          body: `
            <h3 style="margin-top:0;color:#111;border-bottom:2px solid #d4b548;padding-bottom:8px;">ملخص الدفع</h3>
            <p>المبلغ الإجمالي المدفوع: <b>${total}</b></p>
            ${orderSummary}
          `,
        }),
      };
    case "payment_failed":
      return {
        subject: `عملية الدفع لم تكتمل للطلب${shortOrderId ? ` #${shortOrderId}` : ""}`,
        html: renderLayout({
          title: "الدفع ماكملش",
          intro: `محاولة الدفع الإلكتروني لطلبك رقم #${orderId} لم تكتمل بنجاح.`,
          body: `
            <p>تقدر تحاول تدفع تاني أونلاين أو تختار الدفع عند الاستلام لتجنب إلغاء الطلب.</p>
            <p>لو حابب نكمل معاك يدويًا أو تواجه مشكلة، رد على الإيميل ده أو تواصل معنا على واتساب مباشرة.</p>
          `,
        }),
      };
    case "order_preparing":
      return {
        subject: `طلبك قيد التجهيز الآن${shortOrderId ? ` #${shortOrderId}` : ""}`,
        html: renderLayout({
          title: "بنجهز طلبك بكل حب",
          intro: `طلبك رقم #${orderId} قيد التجهيز والتحضير حالياً. بنراجع كل التفاصيل ونغلف المنتجات بعناية لتصلك في أفضل صورة.`,
          statusTracker: renderStatusTracker("preparing"),
          body: `
            <h3 style="margin-top:0;color:#111;border-bottom:2px solid #d4b548;padding-bottom:8px;">المنتجات الجاري تجهيزها</h3>
            ${orderSummary}
          `,
        }),
      };
    case "order_with_courier":
      return {
        subject: `طلبك مع المندوب وفي الطريق إليك${shortOrderId ? ` #${shortOrderId}` : ""}`,
        html: renderLayout({
          title: "طلبك في الطريق ليك",
          intro: `المندوب استلم طلبك رقم #${orderId} وهو في طريقه لتسليمه ليك. جهز نفسك للاستلام قريباً!`,
          statusTracker: renderStatusTracker("shipped"),
          body: `
            <h3 style="margin-top:0;color:#111;border-bottom:2px solid #d4b548;padding-bottom:8px;">تفاصيل الشحنة</h3>
            <p>المبلغ المطلوب عند الاستلام (إن وجد): <b>${data.order?.payment_status === "paid" ? "0 EGP (تم الدفع مسبقاً)" : total}</b></p>
            <p>يرجى إبقاء الهاتف متاحاً ليسهل على المندوب التواصل معك.</p>
          `,
        }),
      };
    case "order_delivered":
      return {
        subject: `تم تسليم طلبك بنجاح${shortOrderId ? ` #${shortOrderId}` : ""}`,
        html: renderLayout({
          title: "تم التسليم بنجاح!",
          intro: `تم تسليم طلبك رقم #${orderId} بنجاح. نتمنى تكون التجربة وجودة الكفرات عجبتك!`,
          statusTracker: renderStatusTracker("delivered"),
          body: `
            <p>شكراً لثقتك في Cover Up. نتطلع دائماً لخدمتك مرة أخرى.</p>
            <div style="background:#faf8f4;padding:16px;border-radius:10px;border:1px solid #ece7dc;margin-top:14px;text-align:center;">
              <p style="margin:0 0 10px;font-weight:bold;">رأيك يهمنا جداً!</p>
              <p style="margin:0 0 14px;font-size:13px;color:#666;">شاركنا تقييمك وتجربتك مع كفراتنا.</p>
              <a href="https://coverup.tech/account" style="display:inline-block;padding:10px 20px;background:#111;color:#fff;text-align:center;text-decoration:none;border-radius:8px;font-size:14px;font-weight:bold;">تقييم المنتجات</a>
            </div>
          `,
          note: "لو عندك أي استفسار أو شكوى، رد على الإيميل ده مباشرة أو تواصل معنا عبر واتساب.",
        }),
      };
    case "order_cancelled":
      return {
        subject: `تم إلغاء طلبك${shortOrderId ? ` #${shortOrderId}` : ""}`,
        html: renderLayout({
          title: "تم إلغاء الطلب",
          intro: `تم إلغاء طلبك رقم #${orderId} بنجاح.`,
          body: `
            <p>تم تحديث حالة الطلب إلى ملغى في نظامنا.</p>
            <p>لو تم إلغاء الطلب بالخطأ أو حابب تعمل طلب جديد، تقدر ترجع لموقعنا أو تتواصل معانا على الواتساب عشان نساعدك في ثواني.</p>
          `,
        }),
      };
    case "order_refunded":
      return {
        subject: `تم استرداد مبلغ طلبك${shortOrderId ? ` #${shortOrderId}` : ""}`,
        html: renderLayout({
          title: "تم استرداد المبلغ بنجاح",
          intro: `تمت عملية استرداد المبلغ بنجاح لطلبك رقم #${orderId} بقيمة ${total}.`,
          body: `
            <p>عملية الاسترداد تمت. قد يستغرق ظهور المبلغ في حسابك البنكي من 5 إلى 14 يوم عمل حسب سياسات البنك الخاص بك.</p>
            <p>لو عندك أي استفسار تواصل معنا في أي وقت.</p>
          `,
        }),
      };
    case "email_verified":
      return {
        subject: "تم تأكيد إيميل Cover Up",
        html: renderLayout({
          title: "الإيميل اتأكد بنجاح!",
          intro: "دلوقتي حسابك مفعل بالكامل وتقدر تتابع طلباتك وتتحكم في حسابك بسهولة.",
          body: `<p>أهلًا ${customerName}، تأكيد البريد الإلكتروني تم بنجاح وسعداء بانضمامك لنا.</p>`,
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
