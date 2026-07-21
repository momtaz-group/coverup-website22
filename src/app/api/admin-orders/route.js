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
  deleteOrder,
} from "@/utils/store-db";

function cleanText(value, limit = 200) {
  return String(value || "").trim().slice(0, limit);
}

function emailTypeForStatus(status) {
  switch (status) {
    case "pending_payment":
      return "order_confirmation";
    case "new":
      return "order_confirmation";
    case "confirmed":
      return "order_confirmed";
    case "preparing":
      return "order_preparing";
    case "fetching_required_items":
      return "order_preparing";
    case "representative_on_way":
      return "order_with_courier";
    case "with_courier":
      return "order_with_courier";
    case "delivered":
      return "order_delivered";
    case "cancelled":
      return "order_cancelled";
    case "suspended":
      return "order_cancelled";
    case "refunded":
      return "order_refunded";
    case "paid":
      return "payment_success";
    case "payment_failed":
      return "payment_failed";
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

    if (["confirmed", "paid", "preparing", "fetching_required_items", "representative_on_way", "with_courier", "delivered"].includes(status) && !order.inventory_reserved) {
      await reserveInventoryForOrder(order);
    }

    if (["cancelled", "suspended", "refunded"].includes(status) && order.inventory_reserved) {
      await releaseInventoryForOrder(order);
    }

    const extra = {};
    if (status === "paid") {
      extra.payment_status = "paid";
    } else if (status === "payment_failed") {
      extra.payment_status = "failed";
    } else if (status === "cancelled" || status === "suspended") {
      extra.payment_status = order.payment_method === "cash" ? "cancelled" : order.payment_status;
    }

    const updated = await updateOrderStatus(orderId, status, {
      note,
      actor: "admin",
      extra,
    });

    let email = null;
    const emailType = emailTypeForStatus(status);
    if (emailType && updated?.customer?.email) {
      email = await sendTransactionalEmail(emailType, {
        to: updated.customer.email,
        customer: updated.customer,
        order: updated,
      });
    }

    return NextResponse.json({ order: updated, email });
  } catch (error) {
    return NextResponse.json({ message: "حدث خطأ أثناء تحديث حالة الطلب." }, { status: 500 });
  }
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

    const { searchParams } = new URL(request.url);
    const orderId = cleanText(searchParams.get("orderId"), 120);

    if (!orderId) {
      return NextResponse.json({ message: "رقم الطلب مطلوب." }, { status: 400 });
    }

    const order = await findOrderById(orderId);
    if (!order) {
      return NextResponse.json({ message: "الطلب غير موجود." }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (error) {
    return NextResponse.json({ message: "حدث خطأ أثناء جلب الطلب." }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const adminCheck = requireAdmin(request);
    if (!adminCheck.authorized) {
      return NextResponse.json({ message: adminCheck.message }, { status: adminCheck.status });
    }

    if (!supabaseConfigured(true)) {
      return NextResponse.json({ message: "Supabase service role is not configured." }, { status: 501 });
    }

    const { searchParams } = new URL(request.url);
    const id = String(searchParams.get("id") || "").trim();

    if (!id) {
      return NextResponse.json({ message: "الرجاء تحديد الطلب أولاً." }, { status: 400 });
    }

    await deleteOrder(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ message: "حدث خطأ أثناء حذف الطلب." }, { status: 500 });
  }
}
