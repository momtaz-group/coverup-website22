import { NextResponse } from "next/server";
import { requireAdmin, supabaseConfigured, findOrderById } from "@/utils/store-db";
import { getSupabaseServerClient } from "@/utils/supabase";
import { sendTransactionalEmail } from "@/utils/email";

// Fetch email logs for a specific order
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
    const orderId = searchParams.get("orderId");

    if (!orderId) {
      return NextResponse.json({ message: "Order ID is required." }, { status: 400 });
    }

    const client = getSupabaseServerClient();
    const { data: logs, error } = await client
      .from("email_logs")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ logs });
  } catch (error) {
    return NextResponse.json({ message: error.message || "Failed to fetch email logs" }, { status: 500 });
  }
}

// Retry a failed email
export async function POST(request) {
  try {
    const adminCheck = requireAdmin(request);
    if (!adminCheck.authorized) {
      return NextResponse.json({ message: adminCheck.message }, { status: adminCheck.status });
    }

    if (!supabaseConfigured(true)) {
      return NextResponse.json({ message: "Supabase service role is not configured." }, { status: 501 });
    }

    const { logId } = await request.json().catch(() => ({}));
    if (!logId) {
      return NextResponse.json({ message: "Log ID is required" }, { status: 400 });
    }

    const client = getSupabaseServerClient();
    const { data: log, error } = await client
      .from("email_logs")
      .select("*")
      .eq("id", logId)
      .maybeSingle();

    if (error || !log) {
      return NextResponse.json({ message: "Log entry not found" }, { status: 404 });
    }

    if (log.delivery_status === "sent" || log.delivery_status === "delivered") {
      return NextResponse.json({ message: "Email has already been sent successfully" }, { status: 400 });
    }

    // Fetch order details
    let order = null;
    if (log.order_id) {
      order = await findOrderById(log.order_id);
    }

    // Retry sending with unique event key to bypass duplicate checks
    const result = await sendTransactionalEmail(log.email_type, {
      to: log.recipient,
      order,
      customer: order?.customer,
      eventKey: `${log.event_key}:retry:${Date.now()}`,
      user_id: log.user_id,
    });

    if (result.success) {
      // Mark old log as retried
      await client
        .from("email_logs")
        .update({ delivery_status: "retried", updated_at: new Date().toISOString() })
        .eq("id", logId);

      return NextResponse.json({ success: true, emailId: result.emailId });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ message: error.message || "Failed to retry email" }, { status: 500 });
  }
}
