import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { updateEmailLogStatus } from "@/utils/store-db";

export async function POST(request) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("Missing RESEND_WEBHOOK_SECRET environment variable");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 501 });
  }

  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const rawBody = await request.text();

  try {
    const wh = new Webhook(webhookSecret);
    const payload = wh.verify(rawBody, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    });

    const eventType = payload.type;
    const emailId = payload.data?.email_id;

    if (!emailId || !eventType) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Map webhook event to db status
    let status = "queued";
    if (eventType === "email.sent") status = "sent";
    else if (eventType === "email.delivered") status = "delivered";
    else if (eventType === "email.delivery_delayed") status = "delayed";
    else if (eventType === "email.bounced") status = "bounced";
    else if (eventType === "email.complained") status = "complained";
    else if (eventType === "email.failed") status = "failed";

    await updateEmailLogStatus({ resend_email_id: emailId, status });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
}
