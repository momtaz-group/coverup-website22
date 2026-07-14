import { NextResponse } from "next/server";
import { findOrderById, updateOrder, supabaseConfigured } from "@/utils/store-db";

function cleanText(value, limit = 200) {
  return String(value || "").trim().slice(0, limit);
}

export async function GET(request) {
  try {
    if (!supabaseConfigured(true)) {
      return NextResponse.json({ message: "Supabase service role is not configured." }, { status: 501 });
    }

    const { searchParams } = new URL(request.url);
    const orderId = cleanText(searchParams.get("orderId"), 60);

    if (!orderId) {
      return NextResponse.json({ message: "رقم الطلب مطلوب." }, { status: 400 });
    }

    const order = await findOrderById(orderId);
    if (!order) {
      return NextResponse.json({ message: "الطلب غير موجود." }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (error) {
    return NextResponse.json({ message: error.message || "Failed to fetch order" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    if (!supabaseConfigured(true)) {
      return NextResponse.json({ message: "Supabase service role is not configured." }, { status: 501 });
    }

    const body = await request.json().catch(() => ({}));
    const orderId = cleanText(body.orderId, 60);
    const paymentMethod = cleanText(body.paymentMethod, 60); // vodafone_cash, instapay, telda
    const paymentTransactionId = cleanText(body.paymentTransactionId, 100);
    const paymentReference = cleanText(body.paymentReference, 500); // Screenshot URL
    const senderInfo = cleanText(body.senderInfo, 100); // Phone number or username
    const notes = cleanText(body.notes, 500);

    if (!orderId) {
      return NextResponse.json({ message: "رقم الطلب مطلوب." }, { status: 400 });
    }

    const order = await findOrderById(orderId);
    if (!order) {
      return NextResponse.json({ message: "الطلب غير موجود." }, { status: 404 });
    }

    const nextHistory = [
      ...(order.status_history || []),
      {
        status: "pending_payment",
        at: new Date().toISOString(),
        note: `تم تقديم إثبات الدفع عبر (${paymentMethod === "vodafone_cash" ? "فودافون كاش" : paymentMethod === "instapay" ? "إنستا باي" : "تيلدا"}). بانتظار تأكيد الإدارة.`,
        actor: "customer",
      },
    ];

    const updates = {
      payment_method: paymentMethod,
      payment_status: "awaiting_verification",
      payment_transaction_id: paymentTransactionId,
      payment_reference: paymentReference,
      payment_payload: {
        sender_info: senderInfo,
        payment_notes: notes,
        submitted_at: new Date().toISOString(),
      },
      status: "pending_payment",
      status_history: nextHistory,
    };

    const updatedOrder = await updateOrder(orderId, updates);

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (error) {
    console.error("Payment details update error:", error);
    return NextResponse.json({ message: error.message || "Failed to update payment details" }, { status: 500 });
  }
}
