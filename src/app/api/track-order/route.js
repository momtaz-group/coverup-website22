import { NextResponse } from "next/server";
import { findOrderForTracking, supabaseConfigured } from "@/utils/store-db";

function cleanText(value, limit = 160) {
  return String(value || "").trim().slice(0, limit);
}

function publicOrder(order) {
  return {
    id: order.id,
    status: order.status,
    payment_status: order.payment_status,
    delivery_method: order.delivery_method,
    grand_total: order.grand_total,
    items: order.items || [],
    customer: {
      name: order.customer?.name || "",
      city: order.customer?.city || "",
      address: order.customer?.address || "",
    },
    status_history: order.status_history || [],
    created_at: order.created_at,
    updated_at: order.updated_at,
  };
}

export async function GET(request) {
  try {
    if (!supabaseConfigured(true)) {
      return NextResponse.json({ message: "Supabase service role is not configured." }, { status: 501 });
    }

    const { searchParams } = new URL(request.url);
    const orderId = cleanText(searchParams.get("orderId"), 120);
    const phone = cleanText(searchParams.get("phone"), 60);

    const order = await findOrderForTracking(orderId, phone);

    if (!order) {
      return NextResponse.json({ message: "مش لاقيين طلب بالبيانات دي." }, { status: 404 });
    }

    return NextResponse.json({ order: publicOrder(order) });
  } catch (error) {
    return NextResponse.json({ message: "حدث خطأ أثناء تتبع الطلب." }, { status: 400 });
  }
}
