import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { sendTransactionalEmail } from "@/utils/email";
import {
  findOrderById,
  findOrderByPaymentReference,
  reserveInventoryForOrder,
  supabaseConfigured,
  updateOrderStatus,
} from "@/utils/store-db";

function bodySignature(payload) {
  return crypto
    .createHmac("sha512", process.env.PAYMOB_HMAC_SECRET || "")
    .update(JSON.stringify(payload))
    .digest("hex");
}

function signatureValid(request, payload) {
  const secret = process.env.PAYMOB_HMAC_SECRET;
  if (!secret) {
    console.error("CRITICAL: PAYMOB_HMAC_SECRET is not set. Rejecting webhook.");
    return false;
  }

  const incoming =
    request.headers.get("x-paymob-signature") ||
    request.headers.get("x-paymob-hmac") ||
    payload?.hmac ||
    "";

  if (!incoming) {
    return false;
  }

  return bodySignature(payload) === String(incoming).trim();
}

function extractOrderReference(payload) {
  return String(
    payload?.obj?.order?.merchant_order_id ||
      payload?.obj?.merchant_order_id ||
      payload?.merchant_order_id ||
      payload?.obj?.order?.id ||
      payload?.order?.merchant_order_id ||
      "",
  ).trim();
}

function extractTransactionId(payload) {
  return String(payload?.obj?.id || payload?.transaction_id || payload?.id || "").trim();
}

function extractAmount(payload) {
  const cents = Number(payload?.obj?.amount_cents || payload?.amount_cents || 0);
  return cents ? cents / 100 : 0;
}

function paymentSucceeded(payload) {
  if (typeof payload?.success === "boolean") {
    return payload.success;
  }

  if (typeof payload?.obj?.success === "boolean") {
    return payload.obj.success;
  }

  return false;
}

export async function POST(request) {
  try {
    if (!supabaseConfigured(true)) {
      return NextResponse.json({ message: "Supabase service role is not configured." }, { status: 501 });
    }

    const payload = await request.json().catch(() => ({}));
    if (!signatureValid(request, payload)) {
      return NextResponse.json({ message: "Invalid webhook signature" }, { status: 401 });
    }

    const reference = extractOrderReference(payload);
    const transactionId = extractTransactionId(payload);
    const amount = extractAmount(payload);
    let order = reference ? await findOrderById(reference) : null;
    if (!order && reference) {
      order = await findOrderByPaymentReference(reference);
    }

    if (!order) {
      return NextResponse.json({ message: "Order not found" }, { status: 404 });
    }

    if (paymentSucceeded(payload)) {
      if (order.payment_status === "paid") {
        return NextResponse.json({ received: true, status: "already_paid" });
      }

      if (!order.inventory_reserved) {
        await reserveInventoryForOrder(order);
      }

      order = await updateOrderStatus(order.id, "paid", {
        note: "تم تأكيد الدفع من Paymob",
        actor: "paymob",
        extra: {
          payment_status: "paid",
          payment_transaction_id: transactionId,
          payment_payload: payload,
        },
      });

      await sendTransactionalEmail("payment_success", {
        to: order.customer?.email,
        customer: order.customer,
        order: {
          ...order,
          grand_total: amount || order.grand_total,
        },
      }).catch(() => {});

      return NextResponse.json({ received: true, status: "paid" });
    }

    order = await updateOrderStatus(order.id, "payment_failed", {
      note: "محاولة الدفع لم تكتمل",
      actor: "paymob",
      extra: {
        payment_status: "failed",
        payment_transaction_id: transactionId,
        payment_payload: payload,
      },
    });

    await sendTransactionalEmail("payment_failed", {
      to: order.customer?.email,
      customer: order.customer,
      order,
    }).catch(() => {});

    return NextResponse.json({ received: true, status: "payment_failed" });
  } catch (error) {
    return NextResponse.json({ message: error.message || "Webhook error" }, { status: 500 });
  }
}
