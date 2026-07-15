import { Resend } from "resend";
import { logEmail, getEmailLogByEventKey, updateEmailLogStatus } from "@/utils/store-db";
import { renderEmail } from "@/utils/emailComponents";

// Centralized Resend client
const resendApiKey = process.env.RESEND_API_KEY || "temp_key";
const resend = new Resend(resendApiKey);

function officialFrom() {
  return process.env.RESEND_FROM_EMAIL || "CoverUp <orders@mail.coverup.tech>";
}

export async function sendEmail({ to, subject, html }) {
  if (!process.env.RESEND_API_KEY || !to) {
    console.error("Missing RESEND_API_KEY or recipient email");
    return { success: false, error: "Missing configuration or recipient" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: officialFrom(),
      to: [to],
      subject,
      html,
    });

    if (error) {
      console.error("Resend API error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, emailId: data?.id };
  } catch (err) {
    console.error("Fatal error sending email:", err);
    return { success: false, error: err.message || err };
  }
}

export async function sendTransactionalEmail(type, data = {}) {
  const recipient = data.to || data.customer?.email || data.email;
  if (!recipient) {
    console.error(`Missing recipient email for template: ${type}`);
    return { success: false, error: "Missing recipient" };
  }

  // Idempotency check:
  let eventKey = data.eventKey;
  if (!eventKey) {
    if (type === "welcome" && (data.customer?.id || data.user_id)) {
      eventKey = `welcome:${data.customer?.id || data.user_id}`;
    } else if (type.startsWith("order_") && data.order?.id) {
      eventKey = `order-status:${data.order.id}:${type}`;
    }
  }

  if (eventKey) {
    try {
      const existingLog = await getEmailLogByEventKey(eventKey);
      if (existingLog && (existingLog.delivery_status === "sent" || existingLog.delivery_status === "delivered")) {
        console.log(`Duplicate email prevented for event key: ${eventKey}`);
        return { success: true, skipped: true, emailId: existingLog.resend_email_id };
      }
    } catch (err) {
      console.error("Idempotency log read failed (ignoring check):", err);
    }
  }

  // Render using separate email components file
  let subject = "";
  let html = "";
  try {
    const rendered = renderEmail(type, data);
    subject = rendered.subject;
    html = rendered.html;
  } catch (err) {
    console.error(`Failed to render email for type: ${type}`, err);
    return { success: false, error: `Template render failed: ${err.message}` };
  }

  // Write initial log to database
  let dbLogId = null;
  try {
    const logResult = await logEmail({
      event_key: eventKey,
      email_type: type,
      recipient,
      user_id: data.user_id || data.customer?.id || null,
      order_id: data.order?.id || null,
      order_status: data.order?.status || null,
      delivery_status: "queued",
      metadata: { eventKey, ...data.metadata }
    });
    dbLogId = logResult?.id;
  } catch (err) {
    console.error("Failed to write initial email log to db:", err);
  }

  // Send the email
  const sendResult = await sendEmail({ to: recipient, subject, html });

  // Update email log in database with delivery status
  if (sendResult.success) {
    try {
      await updateEmailLogStatus({ id: dbLogId, resend_email_id: sendResult.emailId, status: "sent" });
    } catch (err) {
      console.error("Failed to update email log status in db:", err);
    }
  } else {
    try {
      if (dbLogId) {
        await updateEmailLogStatus({ id: dbLogId, status: "failed", error_message: sendResult.error });
      }
    } catch (err) {
      console.error("Failed to log email send failure in db:", err);
    }
  }

  return sendResult;
}
