import { NextResponse } from "next/server";
import { getCustomerOrdersForTracking, supabaseConfigured } from "@/utils/store-db";
import { getAuthenticatedCustomer } from "@/utils/server-auth";

function publicCustomer(customer) {
  return customer
    ? {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        username: customer.username,
        address: customer.address,
        city: customer.city,
        notes: customer.notes,
        email_verified_at: customer.email_verified_at,
        created_at: customer.created_at,
      }
    : null;
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
      phone: order.customer?.phone || "",
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

    const customer = await getAuthenticatedCustomer(request);
    const orders = customer ? await getCustomerOrdersForTracking(customer) : [];

    return NextResponse.json({
      customer: publicCustomer(customer),
      orders: orders.map(publicOrder),
    });
  } catch (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function DELETE() {
  return NextResponse.json({ message: "تم تسجيل الخروج." });
}
