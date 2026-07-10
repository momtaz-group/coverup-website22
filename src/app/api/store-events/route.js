import { NextResponse } from "next/server";
import { appendEvent, getEvents, requireAdmin, supabaseConfigured } from "@/utils/store-db";

function cleanText(value, limit = 800) {
  return String(value || "").trim().slice(0, limit);
}

function cleanPublicItem(type, body) {
  if (type === "order") {
    const total = Number(body.total) || 0;
    return {
      customer_id: cleanText(body.customerId, 80) || null,
      customer: {
        name: cleanText(body.customer?.name, 120),
        phone: cleanText(body.customer?.phone, 60),
        address: cleanText(body.customer?.address, 300),
        city: cleanText(body.customer?.city, 120),
        location_link: cleanText(body.customer?.locationLink, 500),
        email: cleanText(body.customer?.email, 160),
        username: cleanText(body.customer?.username, 80),
      },
      items: Array.isArray(body.items) ? body.items.slice(0, 30) : [],
      subtotal: total,
      total,
      grand_total: total + (Number(body.deliveryFee) || 0),
      channel: cleanText(body.channel, 80) || "website",
      status: cleanText(body.status, 40) || "new",
      status_history: [
        {
          status: cleanText(body.status, 40) || "new",
          at: new Date().toISOString(),
          note: cleanText(body.statusNote, 200),
          actor: "public",
        },
      ],
      payment_method: cleanText(body.paymentMethod, 40) || "cash",
      payment_status: cleanText(body.paymentStatus, 40) || "pending",
      delivery_method: cleanText(body.deliveryMethod, 60) || "delivery",
      delivery_fee: Number(body.deliveryFee) || 0,
      discount_code: cleanText(body.discountCode, 60),
      discount_amount: Number(body.discountAmount) || 0,
      location_link: cleanText(body.customer?.locationLink || body.locationLink, 500),
      notes: cleanText(body.notes, 500),
    };
  }

  if (type === "review") {
    return {
      name: cleanText(body.name, 120),
      phone: cleanText(body.phone, 60),
      product_id: cleanText(body.productId || body.product_id, 120),
      order_id: cleanText(body.orderId || body.order_id, 120) || null,
      customer_id: cleanText(body.customerId || body.customer_id, 120) || null,
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

export async function GET(request) {
  try {
    const adminCheck = requireAdmin(request);
    if (!adminCheck.authorized) {
      return NextResponse.json({ message: adminCheck.message }, { status: adminCheck.status });
    }

    if (!supabaseConfigured(true)) {
      return NextResponse.json({ message: "Supabase service role is not configured." }, { status: 501 });
    }

    const events = await getEvents();
    return NextResponse.json({ configured: true, ...events });
  } catch (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    if (!supabaseConfigured(true)) {
      return NextResponse.json({ message: "Supabase service role is not configured." }, { status: 501 });
    }

    const body = await request.json().catch(() => ({}));
    const type = cleanText(body.type, 40);
    const item = cleanPublicItem(type, body || {});

    if (!item) {
      return NextResponse.json({ message: "Invalid type" }, { status: 400 });
    }

    const saved = await appendEvent(`${type}s`, item);
    return NextResponse.json({ saved });
  } catch (error) {
    return NextResponse.json({ message: error.message || "Storage error" }, { status: 500 });
  }
}
