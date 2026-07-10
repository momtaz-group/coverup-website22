import { NextResponse } from "next/server";
import { findOrderById, supabaseConfigured, updateOrder } from "@/utils/store-db";

const PAYMOB_API_BASE = process.env.PAYMOB_API_BASE || "https://accept.paymob.com";

export async function POST(request) {
  try {
    if (!supabaseConfigured(true)) {
      return NextResponse.json({ message: "Supabase service role is not configured." }, { status: 501 });
    }

    const secretKey = process.env.PAYMOB_SECRET_KEY;
    const publicKey = process.env.PAYMOB_PUBLIC_KEY;
    const integrationId = process.env.PAYMOB_INTEGRATION_ID;

    if (!secretKey || !publicKey || !integrationId) {
      return NextResponse.json({
        message:
          "الدفع الإلكتروني محتاج تفعيل بيانات Paymob على Vercel: PAYMOB_SECRET_KEY و PAYMOB_PUBLIC_KEY و PAYMOB_INTEGRATION_ID.",
      }, { status: 501 });
    }

    const body = await request.json().catch(() => ({}));
    const orderId = String(body.orderId || "").trim();
    if (!orderId) {
      return NextResponse.json({ message: "رقم الطلب مطلوب لتجهيز الدفع." }, { status: 400 });
    }

    const order = await findOrderById(orderId);
    if (!order) {
      return NextResponse.json({ message: "الطلب غير موجود." }, { status: 404 });
    }

    const amount = Math.round(Number(order.grand_total || order.total || 0) * 100);
    if (!amount) {
      return NextResponse.json({ message: "إجمالي الطلب غير صالح للدفع." }, { status: 400 });
    }

    const nameParts = String(order.customer?.name || "Cover Up Customer").trim().split(/\s+/);
    const firstName = nameParts.shift() || "Cover";
    const lastName = nameParts.join(" ") || "Up";
    const phone = String(order.customer?.phone || "01050310516").trim();
    const address = String(order.customer?.address || "Egypt").trim();
    const city = String(order.customer?.city || "Cairo").trim();

    const origin = new URL(request.url).origin;
    const redirectionUrl = process.env.PAYMOB_REDIRECT_URL || `${origin}/cart?payment=return`;
    const notificationUrl = process.env.PAYMOB_WEBHOOK_URL || `${origin}/api/paymob-webhook`;

    const intentionPayload = {
      amount,
      currency: "EGP",
      payment_methods: [Number(integrationId)],
      merchant_order_id: order.id,
      items: (order.items || []).map((item) => ({
        name: item.name,
        amount: Math.round(Number(item.price) * 100),
        description: item.name,
        quantity: Number(item.quantity),
      })),
      billing_data: {
        first_name: firstName,
        last_name: lastName,
        phone_number: phone,
        email: order.customer?.email || process.env.PAYMOB_FALLBACK_EMAIL || "hello@coverup.tech",
        apartment: "NA",
        floor: "NA",
        street: address,
        building: "NA",
        city,
        country: "EG",
        state: city,
      },
      extras: {
        source: "coverup.tech",
        order_id: order.id,
        customer_id: order.customer_id || "",
      },
      redirection_url: redirectionUrl,
      notification_url: notificationUrl,
    };

    const paymobResponse = await fetch(`${PAYMOB_API_BASE}/v1/intention/`, {
      method: "POST",
      headers: {
        Authorization: `Token ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(intentionPayload),
    });

    const data = await paymobResponse.json().catch(() => ({}));

    if (!paymobResponse.ok) {
      await updateOrder(order.id, {
        payment_status: "creation_failed",
        payment_payload: data || null,
      });

      return NextResponse.json({
        message: data.detail || data.message || "Paymob رفض إنشاء عملية الدفع. راجع بيانات حساب التاجر.",
      }, { status: paymobResponse.status });
    }

    const clientSecret = data.client_secret || data.clientSecret;
    const checkoutUrl =
      data.checkout_url ||
      data.checkoutUrl ||
      `https://accept.paymob.com/unifiedcheckout/?publicKey=${encodeURIComponent(publicKey)}&clientSecret=${encodeURIComponent(clientSecret)}`;

    await updateOrder(order.id, {
      payment_reference: order.id,
      payment_status: "initiated",
      payment_payload: data,
      status: "pending_payment",
      status_history: [
        ...(Array.isArray(order.status_history) ? order.status_history : []),
        {
          status: "pending_payment",
          at: new Date().toISOString(),
          note: "تم إنشاء رابط الدفع",
          actor: "system",
        },
      ],
    });

    return NextResponse.json({ checkoutUrl, clientSecret, orderId: order.id });
  } catch (error) {
    return NextResponse.json({ message: error.message || "Payment creation failed" }, { status: 500 });
  }
}
