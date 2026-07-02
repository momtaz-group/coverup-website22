const { appendEvent, getEvents, requireAdmin, sendJson, supabaseConfigured } = require("./_store");

function cleanText(value, limit = 800) {
  return String(value || "").trim().slice(0, limit);
}

function cleanPublicItem(type, body) {
  if (type === "order") {
    return {
      customer: {
        name: cleanText(body.customer?.name, 120),
        phone: cleanText(body.customer?.phone, 60),
        address: cleanText(body.customer?.address, 300),
      },
      items: Array.isArray(body.items) ? body.items.slice(0, 30) : [],
      total: Number(body.total) || 0,
      channel: cleanText(body.channel, 80),
      status: "new",
    };
  }

  if (type === "review") {
    return {
      name: cleanText(body.name, 120),
      phone: cleanText(body.phone, 60),
      rating: Math.max(1, Math.min(5, Number(body.rating) || 5)),
      message: cleanText(body.message, 1000),
      is_published: false,
    };
  }

  if (type === "complaint") {
    return {
      name: cleanText(body.name, 120),
      phone: cleanText(body.phone, 60),
      order_ref: cleanText(body.orderRef, 120),
      message: cleanText(body.message, 1200),
      status: "new",
    };
  }

  if (type === "chat") {
    return {
      name: cleanText(body.name, 120),
      phone: cleanText(body.phone, 60),
      message: cleanText(body.message, 1000),
      reply: cleanText(body.reply, 1000),
      transcript: Array.isArray(body.transcript) ? body.transcript.slice(-12) : [],
    };
  }

  return null;
}

module.exports = async function handler(request, response) {
  try {
    if (request.method === "GET") {
      if (!requireAdmin(request, response)) {
        return;
      }

      if (!supabaseConfigured(true)) {
        return sendJson(response, 501, { message: "Supabase service role is not configured." });
      }

      const events = await getEvents();
      return sendJson(response, 200, { configured: true, ...events });
    }

    if (request.method === "POST") {
      if (!supabaseConfigured(true)) {
        return sendJson(response, 501, { message: "Supabase service role is not configured." });
      }

      const type = cleanText(request.body?.type, 40);
      const item = cleanPublicItem(type, request.body || {});

      if (!item) {
        return sendJson(response, 400, { message: "Invalid type" });
      }

      const saved = await appendEvent(`${type}s`, item);
      return sendJson(response, 200, { saved });
    }

    return sendJson(response, 405, { message: "Method not allowed" });
  } catch (error) {
    return sendJson(response, 500, { message: error.message || "Storage error" });
  }
};
