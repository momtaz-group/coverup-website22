import { NextResponse } from "next/server";
import { sendTransactionalEmail } from "@/utils/email";
import {
  ORDER_STATUSES,
  findOrderById,
  releaseInventoryForOrder,
  requireAdmin,
  reserveInventoryForOrder,
  supabaseConfigured,
  updateOrderStatus,
} from "@/utils/store-db";

function cleanText(value, limit = 200) {
  return String(value || "").trim().slice(0, limit);
}

function emailTypeForStatus(status) {
  switch (status) {
    case "confirmed":
      return "order_confirmation";
    case "preparing":
      return "order_preparing";
    case "with_courier":
      return "order_with_courier";
    case "delivered":
      return "order_delivered";
    case "cancelled":
      return "order_cancelled";
    default:
      return "";
  }
}

export async function PATCH(request) {
  try {
    const adminCheck = requireAdmin(request);
    if (!adminCheck.authorized) {
      return NextResponse.json({ message: adminCheck.message }, { status: adminCheck.status });
    }

    if (!supabaseConfigured(true)) {
      return NextResponse.json({ message: "Supabase service role is not configured." }, { status: 501 });
    }

    const body = await request.json().catch(() => ({}));
    const orderId = cleanText(body.orderId, 120);
    const status = cleanText(body.status, 40);
    const note = cleanText(body.note, 500);

    if (!orderId || !ORDER_STATUSES.includes(status)) {
      return NextResponse.json({ message: "بيانات تحديث الحالة غير صحيحة." }, { status: 400 });
    }

    const order = await findOrderById(orderId);
    if (!order) {
      return NextResponse.json({ message: "الطلب غير موجود." }, { status: 404 });
    }

    if (["confirmed", "paid", "preparing", "with_courier", "delivered"].includes(status) && !order.inventory_reserved) {
      await reserveInventoryForOrder(order);
    }

    if (["cancelled", "refunded"].includes(status) && order.inventory_reserved) {
      await releaseInventoryForOrder(order);
    }

    const extra = {};
    if (status === "paid") {
      extra.payment_status = "paid";
    } else if (status === "cancelled") {
      extra.payment_status = order.payment_method === "cash" ? "cancelled" : order.payment_status;
    }

    const updated = await updateOrderStatus(orderId, status, {
      note,
      actor: "admin",
      extra,
    });

    const emailType = emailTypeForStatus(status);
    if (emailType && updated?.customer?.email) {
      await sendTransactionalEmail(emailType, {
        to: updated.customer.email,
        customer: updated.customer,
        order: updated,
      }).catch(() => {});
    }

    return NextResponse.json({ order: updated });
  } catch (error) {
    return NextResponse.json({ message: error.message || "Order update failed" }, { status: 500 });
  }
}
