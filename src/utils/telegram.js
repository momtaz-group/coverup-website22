function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://coverup.tech";
}

function htmlEscape(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cleanList(value) {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function currency(value) {
  return `${Math.round(Number(value || 0))} EGP`;
}

function deliveryLabel(method) {
  switch (method) {
    case "pickup":
      return "استلام من الفرع";
    case "family_representative":
      return "مندوب العيلة";
    default:
      return "توصيل";
  }
}

function paymentLabel(method) {
  switch (method) {
    case "online":
      return "دفع إلكتروني";
    case "card":
      return "كارت";
    case "wallet":
      return "محفظة / Instapay";
    default:
      return "كاش";
  }
}

function formatItems(items = []) {
  return items
    .slice(0, 12)
    .map((item, index) => {
      const color = item.color ? ` - ${item.color}` : "";
      return `${index + 1}. ${item.name} × ${item.quantity}${color} = ${currency(item.line_total || Number(item.price || 0) * Number(item.quantity || 1))}`;
    })
    .join("\n");
}

function buildOrderTelegramMessage(order) {
  const customer = order?.customer || {};
  const itemsText = formatItems(order?.items);
  const adminUrl = `${siteUrl().replace(/\/$/, "")}/admin/orders/${encodeURIComponent(order?.id || "")}`;

  const parts = [
    "🛒 <b>طلب جديد وصل</b>",
    "",
    `• <b>رقم الطلب:</b> ${htmlEscape(order?.id || "-")}`,
    `• <b>الحالة:</b> ${htmlEscape(order?.status || "-")}`,
    `• <b>العميل:</b> ${htmlEscape(customer.name || "غير متوفر")}`,
    `• <b>الموبايل:</b> ${htmlEscape(customer.phone || "غير متوفر")}`,
    `• <b>الإيميل:</b> ${htmlEscape(customer.email || "غير متوفر")}`,
    `• <b>المدينة:</b> ${htmlEscape(customer.city || "غير متوفر")}`,
    `• <b>العنوان:</b> ${htmlEscape(customer.address || "غير متوفر")}`,
    `• <b>التوصيل:</b> ${htmlEscape(deliveryLabel(order?.delivery_method))}`,
    `• <b>الدفع:</b> ${htmlEscape(paymentLabel(order?.payment_method))}`,
    `• <b>الإجمالي:</b> ${htmlEscape(currency(order?.grand_total ?? order?.total ?? 0))}`,
  ];

  if (order?.discount_code) {
    parts.push(`• <b>كود الخصم:</b> ${htmlEscape(order.discount_code)}`);
  }

  if (customer.location_link) {
    parts.push(`• <b>لوكيشن:</b> ${htmlEscape(customer.location_link)}`);
  }

  if (order?.notes) {
    parts.push(`• <b>ملاحظات:</b> ${htmlEscape(order.notes)}`);
  }

  parts.push("", "<b>المنتجات:</b>");
  parts.push(htmlEscape(itemsText || "لا توجد منتجات"));
  parts.push("", `• <a href="${htmlEscape(adminUrl)}">فتح الطلب في لوحة الأدمن</a>`);

  return parts.join("\n").slice(0, 4000);
}

async function sendTelegramMessage({ chatId, text }) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !chatId || !text) {
    return { success: false, error: "Missing Telegram configuration" };
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok === false) {
      return {
        success: false,
        error: payload?.description || `Telegram request failed: ${response.status}`,
      };
    }

    return { success: true, result: payload.result || null };
  } catch (error) {
    return { success: false, error: error.message || "Telegram request failed" };
  }
}

export async function sendTelegramOrderNotification(order) {
  const chatIds = cleanList(process.env.TELEGRAM_CHAT_ID);
  if (!process.env.TELEGRAM_BOT_TOKEN || !chatIds.length) {
    return { success: false, skipped: true, error: "Telegram is not configured" };
  }

  const text = buildOrderTelegramMessage(order);
  const results = [];

  for (const chatId of chatIds) {
    results.push(await sendTelegramMessage({ chatId, text }));
  }

  return {
    success: results.every((entry) => entry.success),
    skipped: false,
    results,
  };
}
