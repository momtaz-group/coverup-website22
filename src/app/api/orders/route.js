import { NextResponse } from "next/server";
import {
  createOrder,
  getProducts,
  requireAdmin,
  reserveInventoryForOrder,
  supabaseConfigured,
} from "@/utils/store-db";
import { getAuthenticatedCustomer } from "@/utils/server-auth";
import { sendTransactionalEmail } from "@/utils/email";
import { sendTelegramOrderNotification } from "@/utils/telegram";
import { rateLimit } from "@/utils/rate-limit";

const DEFAULT_COUPONS = {
  COVERUP10: { type: "percent", value: 10, minSubtotal: 0 },
  FAMILY50: { type: "fixed", value: 50, minSubtotal: 500 },
};

function cleanText(value, limit = 200) {
  return String(value || "").trim().slice(0, limit);
}

function parseCoupons() {
  try {
    return {
      ...DEFAULT_COUPONS,
      ...(process.env.CHECKOUT_COUPONS_JSON ? JSON.parse(process.env.CHECKOUT_COUPONS_JSON) : {}),
    };
  } catch {
    return DEFAULT_COUPONS;
  }
}

function applyCoupon(subtotal, code) {
  const normalized = cleanText(code, 60).toUpperCase();
  if (!normalized) {
    return { code: "", amount: 0 };
  }

  const coupon = parseCoupons()[normalized];
  if (!coupon) {
    throw new Error("كود الخصم غير صحيح.");
  }

  if (subtotal < Number(coupon.minSubtotal || 0)) {
    throw new Error("الحد الأدنى للطلب غير متحقق لتفعيل الكوبون.");
  }

  const amount = coupon.type === "percent"
    ? Math.round((subtotal * Number(coupon.value || 0)) / 100)
    : Number(coupon.value || 0);

  return { code: normalized, amount: Math.max(0, Math.min(subtotal, amount)) };
}

function deliveryFee(method) {
  switch (method) {
    case "pickup":
      return 0;
    case "family_representative":
      return 90;
    default:
      return 45;
  }
}

function deliveryLabel(method) {
  switch (method) {
    case "pickup":
      return "استلام من الفرع";
    case "family_representative":
      return "مندوب العيلة";
    default:
      return "توصيل عادي";
  }
}

function paymentLabel(method) {
  switch (method) {
    case "online":
      return "دفع إلكتروني";
    case "card":
      return "كارت في الفرع";
    case "wallet":
      return "محفظة / Instapay";
    default:
      return "كاش";
  }
}

function availableStock(product) {
  if (!product || product.is_in_stock === false) {
    return 0;
  }

  const quantity = Number(product.stock_quantity || 0);
  return quantity > 0 ? quantity : Number.POSITIVE_INFINITY;
}

function normalizeItems(items, products) {
  return items.map((item) => {
    const baseId = item.id.split('::')[0];
    const product = products.find((entry) => entry.id === baseId);
    if (!product) {
      throw new Error("في منتج داخل السلة لم يعد متاحًا.");
    }

    const quantity = Math.max(1, Number(item.quantity || 0));
    if (quantity > availableStock(product)) {
      throw new Error(`الكمية المطلوبة من ${product.name} غير متاحة.`);
    }

    return {
      id: product.id,
      name: product.name,
      sku: product.sku || "",
      price: Number(product.price || 0),
      quantity,
      image: product.image || "",
      line_total: Number(product.price || 0) * quantity,
      color: item.color || null,
    };
  });
}

export async function POST(request) {
  try {
    // Rate limit: max 10 orders per minute per IP
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    if (!rateLimit(`orders:${ip}`, { maxRequests: 10, windowMs: 60000 })) {
      return NextResponse.json({ message: "تم تجاوز الحد المسموح. يرجى المحاولة لاحقاً." }, { status: 429 });
    }

    if (!supabaseConfigured(true)) {
      return NextResponse.json({ message: "Supabase service role is not configured." }, { status: 501 });
    }

    const body = await request.json().catch(() => ({}));
    const channel = cleanText(body.channel, 80) || "website";
    const isPosOrder = channel === "pos";

    if (isPosOrder) {
      const adminCheck = requireAdmin(request);
      if (!adminCheck.authorized) {
        return NextResponse.json({ message: adminCheck.message }, { status: adminCheck.status });
      }
    }

    const customer = isPosOrder ? null : await getAuthenticatedCustomer(request);
    const items = Array.isArray(body.items) ? body.items.slice(0, 30) : [];

    if (!items.length) {
      return NextResponse.json({ message: "السلة فاضية." }, { status: 400 });
    }

    const products = await getProducts(items.map((item) => cleanText(item.id, 120).split("::")[0]));
    const normalizedItems = normalizeItems(items, products);
    const subtotal = normalizedItems.reduce((sum, item) => sum + item.line_total, 0);
    const discount = applyCoupon(subtotal, body.discountCode);
    const method = isPosOrder ? "pickup" : cleanText(body.deliveryMethod, 80) || "delivery";
    const paymentMethod = cleanText(body.paymentMethod, 40) || "cash";
    const tipAmount = Math.max(0, Number(body.tipAmount) || 0);
    const branchLocation = cleanText(body.branchLocation, 200) || "";
    const fee = deliveryFee(method);
    const grandTotal = Math.max(0, subtotal - discount.amount + fee) + tipAmount;
    const savedLocation = Array.isArray(customer?.location)
      ? (customer.location.find((location) => location.isDefault) || customer.location[0])
      : null;
    const savedAddress = [savedLocation?.address1, savedLocation?.address2].filter(Boolean).join(", ");

    const customerPayload = {
      name: cleanText(body.customer?.name || customer?.name || (isPosOrder ? "عميل الفرع" : ""), 120),
      phone: cleanText(body.customer?.phone || savedLocation?.phone || customer?.phone || (isPosOrder ? "POS" : ""), 60),
      email: cleanText(body.customer?.email || customer?.email, 160),
      username: cleanText(customer?.username, 80),
      address: cleanText(body.customer?.address || savedAddress || customer?.address || (isPosOrder ? "فرع Cover Up" : ""), 300),
      city: cleanText(body.customer?.city || savedLocation?.city || customer?.city || (isPosOrder ? "Cairo" : ""), 120),
      location_link: cleanText(body.customer?.locationLink, 500),
    };

    if (!isPosOrder && (!customerPayload.name || !customerPayload.phone || !customerPayload.address)) {
      return NextResponse.json({ message: "بيانات العميل الأساسية مطلوبة لإتمام الطلب." }, { status: 400 });
    }

    const initialStatus = paymentMethod === "online" ? "pending_payment" : isPosOrder ? "paid" : "confirmed";
    const initialPaymentStatus = paymentMethod === "online" ? "pending" : isPosOrder ? "paid" : "cash_pending";

    let order = await createOrder({
      customer_id: customer?.id || null,
      customer: customerPayload,
      items: normalizedItems,
      subtotal,
      total: subtotal,
      grand_total: grandTotal,
      channel,
      status: initialStatus,
      status_history: [
        {
          status: initialStatus,
          at: new Date().toISOString(),
          note: isPosOrder
            ? "تم تسجيل بيع من الفرع"
            : paymentMethod === "online"
              ? "في انتظار الدفع الإلكتروني"
              : "تم تأكيد طلب الدفع عند الاستلام",
          actor: isPosOrder ? "admin" : customer ? "customer" : "guest",
        },
      ],
      payment_method: paymentMethod,
      payment_status: initialPaymentStatus,
      discount_code: discount.code,
      discount_amount: discount.amount,
      delivery_method: method,
      delivery_fee: fee,
      location_link: customerPayload.location_link,
      notes: cleanText(body.notes, 500),
      inventory_reserved: false,
      tip_amount: tipAmount,
      branch_location: branchLocation,
    });

    if (paymentMethod !== "online") {
      order = await reserveInventoryForOrder(order);
    }

    await sendTransactionalEmail("order_confirmation", {
      to: customerPayload.email,
      customer: customerPayload,
      order: {
        ...order,
        payment_method_label: paymentLabel(paymentMethod),
      },
    }).catch(() => {});

    if (!isPosOrder) {
      await sendTelegramOrderNotification({
        ...order,
        customer: customerPayload,
      }).catch(() => {});
    }

    return NextResponse.json({
      order,
      pricing: {
        subtotal,
        discount: discount.amount,
        deliveryFee: fee,
        grandTotal,
        discountCode: discount.code,
        deliveryLabel: deliveryLabel(method),
        paymentLabel: paymentLabel(paymentMethod),
      },
    });
  } catch (error) {
    return NextResponse.json({ message: error.message || "Order creation failed" }, { status: 400 });
  }
}
