const { authenticatedCustomer } = require("./_auth");
const {
  createOrder,
  getProducts,
  reserveInventoryForOrder,
  sendJson,
  supabaseConfigured,
} = require("./_store");
const { sendTransactionalEmail } = require("./_email");

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
  return method === "online" ? "دفع إلكتروني" : "كاش عند الاستلام";
}

function normalizeItems(items, products) {
  return items.map((item) => {
    const product = products.find((entry) => entry.id === item.id);
    if (!product) {
      throw new Error("في منتج داخل السلة لم يعد متاحًا.");
    }

    const quantity = Math.max(1, Number(item.quantity || 0));
    if (!product.is_in_stock || product.stock_quantity < quantity) {
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
    };
  });
}

module.exports = async function handler(request, response) {
  try {
    if (request.method !== "POST") {
      return sendJson(response, 405, { message: "Method not allowed" });
    }

    if (!supabaseConfigured(true)) {
      return sendJson(response, 501, { message: "Supabase service role is not configured." });
    }

    const body = typeof request.body === "object" ? request.body : {};
    const customer = await authenticatedCustomer(request);
    const items = Array.isArray(body.items) ? body.items.slice(0, 30) : [];

    if (!items.length) {
      return sendJson(response, 400, { message: "السلة فاضية." });
    }

    const products = await getProducts(items.map((item) => cleanText(item.id, 120)));
    const normalizedItems = normalizeItems(items, products);
    const subtotal = normalizedItems.reduce((sum, item) => sum + item.line_total, 0);
    const discount = applyCoupon(subtotal, body.discountCode);
    const method = cleanText(body.deliveryMethod, 80) || "delivery";
    const paymentMethod = cleanText(body.paymentMethod, 40) || "cash";
    const fee = deliveryFee(method);
    const grandTotal = Math.max(0, subtotal - discount.amount + fee);
    const customerPayload = {
      name: cleanText(body.customer?.name || customer?.name, 120),
      phone: cleanText(body.customer?.phone || customer?.phone, 60),
      email: cleanText(body.customer?.email || customer?.email, 160),
      username: cleanText(customer?.username, 80),
      address: cleanText(body.customer?.address || customer?.address, 300),
      city: cleanText(body.customer?.city || customer?.city, 120),
      location_link: cleanText(body.customer?.locationLink, 500),
    };

    if (!customerPayload.name || !customerPayload.phone || !customerPayload.address) {
      return sendJson(response, 400, { message: "بيانات العميل الأساسية مطلوبة لإتمام الطلب." });
    }

    const initialStatus = paymentMethod === "online" ? "pending_payment" : "confirmed";
    const initialPaymentStatus = paymentMethod === "online" ? "pending" : "cash_pending";

    let order = await createOrder({
      customer_id: customer?.id || null,
      customer: customerPayload,
      items: normalizedItems,
      subtotal,
      total: subtotal,
      grand_total: grandTotal,
      channel: cleanText(body.channel, 80) || "website",
      status: initialStatus,
      status_history: [
        {
          status: initialStatus,
          at: new Date().toISOString(),
          note: paymentMethod === "online" ? "في انتظار الدفع الإلكتروني" : "تم تأكيد طلب الدفع عند الاستلام",
          actor: customer ? "customer" : "guest",
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

    return sendJson(response, 200, {
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
    return sendJson(response, 400, { message: error.message || "Order creation failed" });
  }
};
