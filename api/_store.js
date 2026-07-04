const TABLES = {
  products: "products",
  orders: "orders",
  reviews: "reviews",
  complaints: "complaints",
  chats: "chats",
  customers: "customers",
  customerSessions: "customer_sessions",
  passwordResets: "password_resets",
  emailVerifications: "email_verifications",
};

const ORDER_STATUSES = [
  "new",
  "pending_payment",
  "paid",
  "confirmed",
  "preparing",
  "with_courier",
  "delivered",
  "cancelled",
  "refunded",
  "payment_failed",
];

function sendJson(response, statusCode, payload) {
  response.status(statusCode).json(payload);
}

function supabaseUrl() {
  return process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
}

function supabaseServiceKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
}

function supabaseAnonKey() {
  return process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

function supabaseConfigured(requireService = false) {
  return Boolean(supabaseUrl() && (requireService ? supabaseServiceKey() : supabaseAnonKey()));
}

function storageConfigured() {
  return Boolean(supabaseUrl() && supabaseServiceKey());
}

async function supabaseRequest(table, options = {}) {
  const useService = options.service === true;
  const key = useService ? supabaseServiceKey() : supabaseAnonKey();

  if (!supabaseUrl() || !key) {
    throw new Error("Supabase is not configured");
  }

  const query = options.query || "";
  const result = await fetch(`${supabaseUrl()}/rest/v1/${table}${query}`, {
    method: options.method || "GET",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: options.prefer || "return=representation",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!result.ok) {
    const message = await result.text().catch(() => "");
    throw new Error(message || `Supabase request failed: ${result.status}`);
  }

  if (result.status === 204) {
    return [];
  }

  return result.json();
}

function cleanArray(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || "").trim())
      .filter(Boolean)
      .slice(0, 40);
  }

  if (typeof value === "string") {
    return value
      .split(/[,\n]/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 40);
  }

  return [];
}

function toBoolean(value, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    if (value === "true" || value === "1" || value === "yes") {
      return true;
    }
    if (value === "false" || value === "0" || value === "no") {
      return false;
    }
  }

  return fallback;
}

function productFromDb(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: Number(row.price || 0),
    image: row.image,
    images: cleanArray(row.images),
    badge: row.badge,
    description: row.description,
    seo_title: row.seo_title || "",
    seo_description: row.seo_description || "",
    sku: row.sku || "",
    stock_quantity: Number(row.stock_quantity || 0),
    is_in_stock: typeof row.is_in_stock === "boolean" ? row.is_in_stock : Number(row.stock_quantity || 0) > 0,
    compatible_models: cleanArray(row.compatible_models),
    colors: cleanArray(row.colors),
    material: row.material || "",
    featured: Boolean(row.featured),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function productToDb(product) {
  const stockQuantity = Math.max(0, Number(product.stock_quantity ?? product.stockQuantity ?? 0));

  return {
    id: String(product.id || "").trim(),
    name: String(product.name || "").trim(),
    category: String(product.category || "منتجات").trim(),
    price: Number(product.price) || 0,
    image: String(product.image || "").trim(),
    images: cleanArray(product.images),
    badge: String(product.badge || "متوفر").trim(),
    description: String(product.description || "").trim(),
    seo_title: String(product.seo_title || product.seoTitle || "").trim(),
    seo_description: String(product.seo_description || product.seoDescription || "").trim(),
    sku: String(product.sku || "").trim(),
    stock_quantity: stockQuantity,
    is_in_stock: toBoolean(product.is_in_stock ?? product.isInStock, stockQuantity > 0),
    compatible_models: cleanArray(product.compatible_models ?? product.compatibleModels),
    colors: cleanArray(product.colors),
    material: String(product.material || "").trim(),
    featured: toBoolean(product.featured, false),
    is_active: true,
  };
}

function customerFromDb(row, includePrivate = false) {
  const customer = {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    username: row.username,
    address: row.address,
    city: row.city,
    notes: row.notes,
    avatar_url: row.avatar_url || "",
    email_verified_at: row.email_verified_at,
    last_login_at: row.last_login_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };

  if (includePrivate) {
    customer.password_hash = row.password_hash;
    customer.password_salt = row.password_salt;
  }

  return customer;
}

function orderFromDb(row) {
  return {
    id: row.id,
    customer_id: row.customer_id || null,
    customer: row.customer || {},
    items: Array.isArray(row.items) ? row.items : [],
    subtotal: Number(row.subtotal ?? row.total ?? 0),
    total: Number(row.total || 0),
    grand_total: Number(row.grand_total ?? row.total ?? 0),
    channel: row.channel || "website",
    status: row.status || "new",
    status_history: Array.isArray(row.status_history) ? row.status_history : [],
    payment_method: row.payment_method || "",
    payment_status: row.payment_status || "",
    payment_transaction_id: row.payment_transaction_id || "",
    payment_reference: row.payment_reference || "",
    payment_payload: row.payment_payload || null,
    discount_code: row.discount_code || "",
    discount_amount: Number(row.discount_amount || 0),
    delivery_method: row.delivery_method || "delivery",
    delivery_fee: Number(row.delivery_fee || 0),
    location_link: row.location_link || "",
    notes: row.notes || "",
    inventory_reserved: Boolean(row.inventory_reserved),
    created_at: row.created_at,
    updated_at: row.updated_at || row.created_at,
  };
}

function reviewFromDb(row) {
  return {
    id: row.id,
    name: row.name || "",
    phone: row.phone || "",
    product_id: row.product_id || "",
    order_id: row.order_id || null,
    customer_id: row.customer_id || null,
    rating: Number(row.rating || 5),
    message: row.message || "",
    is_published: Boolean(row.is_published),
    created_at: row.created_at,
  };
}

async function getProducts(ids = []) {
  const query = ids.length
    ? `?select=*&is_active=eq.true&id=in.(${ids.map((id) => encodeURIComponent(id)).join(",")})&order=created_at.asc`
    : "?select=*&is_active=eq.true&order=created_at.asc";

  const rows = await supabaseRequest(TABLES.products, { query });
  return rows.map(productFromDb);
}

async function getProductById(id) {
  const rows = await supabaseRequest(TABLES.products, {
    service: true,
    query: `?select=*&id=eq.${encodeURIComponent(id)}&limit=1`,
  });

  return rows[0] ? productFromDb(rows[0]) : null;
}

async function upsertProduct(product) {
  const row = productToDb(product);
  if (!row.id || !row.name || row.price <= 0) {
    throw new Error("بيانات المنتج ناقصة.");
  }

  const rows = await supabaseRequest(TABLES.products, {
    service: true,
    method: "POST",
    query: "?on_conflict=id",
    body: row,
    prefer: "resolution=merge-duplicates,return=representation",
  });

  return rows[0] ? productFromDb(rows[0]) : null;
}

async function setProducts(products) {
  const rows = products.map(productToDb).filter((product) => product.id && product.name && product.price > 0);

  await supabaseRequest(TABLES.products, {
    service: true,
    method: "PATCH",
    query: "?is_active=eq.true",
    body: { is_active: false },
    prefer: "return=minimal",
  });

  if (!rows.length) {
    return [];
  }

  await supabaseRequest(TABLES.products, {
    service: true,
    method: "POST",
    query: "?on_conflict=id",
    body: rows,
    prefer: "resolution=merge-duplicates,return=representation",
  });

  return getProducts();
}

async function appendEvent(type, item) {
  const table = TABLES[type];

  if (!table) {
    throw new Error("Invalid event type");
  }

  const saved = await supabaseRequest(table, {
    service: true,
    method: "POST",
    body: item,
  });

  return saved[0];
}

async function findCustomerBy(field, value, includePrivate = false) {
  const cleanValue = String(value || "").trim();
  if (!cleanValue) {
    return null;
  }

  const rows = await supabaseRequest(TABLES.customers, {
    service: true,
    query: `?select=*&${field}=eq.${encodeURIComponent(cleanValue)}&limit=1`,
  });

  return rows[0] ? customerFromDb(rows[0], includePrivate) : null;
}

async function findCustomer(identity, includePrivate = false) {
  const cleanIdentity = String(identity || "").trim().toLowerCase();
  if (!cleanIdentity) {
    return null;
  }

  const usernameCustomer = await findCustomerBy("username", cleanIdentity, includePrivate);
  if (usernameCustomer) {
    return usernameCustomer;
  }

  const emailCustomer = await findCustomerBy("email", cleanIdentity, includePrivate);
  if (emailCustomer) {
    return emailCustomer;
  }

  return findCustomerBy("phone", cleanIdentity, includePrivate);
}

async function findCustomerById(id, includePrivate = false) {
  return findCustomerBy("id", id, includePrivate);
}

async function createCustomer(customer) {
  const rows = await supabaseRequest(TABLES.customers, {
    service: true,
    method: "POST",
    body: customer,
  });

  return customerFromDb(rows[0]);
}

async function updateCustomer(id, updates) {
  const rows = await supabaseRequest(TABLES.customers, {
    service: true,
    method: "PATCH",
    query: `?id=eq.${encodeURIComponent(id)}`,
    body: updates,
  });

  return rows[0] ? customerFromDb(rows[0]) : null;
}

async function createCustomerSession(session) {
  const rows = await supabaseRequest(TABLES.customerSessions, {
    service: true,
    method: "POST",
    body: {
      customer_id: session.customerId,
      token_hash: session.tokenHash,
      expires_at: session.expiresAt,
      user_agent: session.userAgent || "",
      ip_address: session.ipAddress || "",
    },
  });

  return rows[0] || null;
}

async function findCustomerSessionByToken(tokenHash) {
  const rows = await supabaseRequest(TABLES.customerSessions, {
    service: true,
    query: `?select=*&token_hash=eq.${encodeURIComponent(tokenHash)}&limit=1`,
  });

  return rows[0] || null;
}

async function touchCustomerSession(id) {
  const rows = await supabaseRequest(TABLES.customerSessions, {
    service: true,
    method: "PATCH",
    query: `?id=eq.${encodeURIComponent(id)}`,
    body: { last_seen_at: new Date().toISOString() },
  });

  return rows[0] || null;
}

async function deleteCustomerSession(tokenHash) {
  await supabaseRequest(TABLES.customerSessions, {
    service: true,
    method: "DELETE",
    query: `?token_hash=eq.${encodeURIComponent(tokenHash)}`,
    prefer: "return=minimal",
  });
}

async function createPasswordReset(reset) {
  const rows = await supabaseRequest(TABLES.passwordResets, {
    service: true,
    method: "POST",
    body: reset,
  });

  return rows[0];
}

async function createEmailVerification(verification) {
  const rows = await supabaseRequest(TABLES.emailVerifications, {
    service: true,
    method: "POST",
    body: verification,
  });

  return rows[0];
}

async function getLatestEmailVerification(customerId) {
  const rows = await supabaseRequest(TABLES.emailVerifications, {
    service: true,
    query: `?select=*&customer_id=eq.${encodeURIComponent(customerId)}&order=created_at.desc&limit=1`,
  });

  return rows[0] || null;
}

async function updateEmailVerification(id, updates) {
  const rows = await supabaseRequest(TABLES.emailVerifications, {
    service: true,
    method: "PATCH",
    query: `?id=eq.${encodeURIComponent(id)}`,
    body: updates,
  });

  return rows[0] || null;
}

function nextStatusHistory(order, status, details = {}) {
  const current = Array.isArray(order?.status_history) ? order.status_history : [];
  return [
    ...current,
    {
      status,
      at: new Date().toISOString(),
      note: details.note || "",
      actor: details.actor || "system",
    },
  ];
}

async function createOrder(order) {
  const saved = await supabaseRequest(TABLES.orders, {
    service: true,
    method: "POST",
    body: {
      customer_id: order.customer_id || null,
      customer: order.customer || {},
      items: Array.isArray(order.items) ? order.items : [],
      subtotal: Number(order.subtotal || 0),
      total: Number(order.total || 0),
      grand_total: Number(order.grand_total ?? order.total ?? 0),
      channel: order.channel || "website",
      status: order.status || "new",
      status_history: order.status_history || [],
      payment_method: order.payment_method || "",
      payment_status: order.payment_status || "",
      payment_transaction_id: order.payment_transaction_id || "",
      payment_reference: order.payment_reference || "",
      payment_payload: order.payment_payload || null,
      discount_code: order.discount_code || "",
      discount_amount: Number(order.discount_amount || 0),
      delivery_method: order.delivery_method || "delivery",
      delivery_fee: Number(order.delivery_fee || 0),
      location_link: order.location_link || "",
      notes: order.notes || "",
      inventory_reserved: Boolean(order.inventory_reserved),
    },
  });

  return saved[0] ? orderFromDb(saved[0]) : null;
}

async function findOrderById(id) {
  const rows = await supabaseRequest(TABLES.orders, {
    service: true,
    query: `?select=*&id=eq.${encodeURIComponent(id)}&limit=1`,
  });

  return rows[0] ? orderFromDb(rows[0]) : null;
}

async function findOrderForTracking(orderId, phone) {
  const cleanId = String(orderId || "").trim();
  const cleanPhone = String(phone || "").replace(/\D/g, "");
  if (!cleanId || !cleanPhone) {
    return null;
  }

  const order = await findOrderById(cleanId);
  if (!order) {
    return null;
  }

  const orderPhone = String(order.customer?.phone || "").replace(/\D/g, "");
  if (!orderPhone || !orderPhone.endsWith(cleanPhone.slice(-10))) {
    return null;
  }

  return order;
}

async function getCustomerOrdersForTracking(customer) {
  if (!customer) {
    return [];
  }

  const phone = String(customer.phone || "").replace(/\D/g, "");
  const filters = [`customer_id.eq.${encodeURIComponent(customer.id)}`];
  if (phone) {
    filters.push(`customer->>phone.like.*${encodeURIComponent(phone.slice(-10))}`);
  }

  const rows = await supabaseRequest(TABLES.orders, {
    service: true,
    query: `?select=*&or=(${filters.join(",")})&order=created_at.desc&limit=50`,
  });

  return rows.map(orderFromDb);
}

async function findOrderByPaymentReference(reference) {
  const rows = await supabaseRequest(TABLES.orders, {
    service: true,
    query: `?select=*&payment_reference=eq.${encodeURIComponent(reference)}&limit=1`,
  });

  return rows[0] ? orderFromDb(rows[0]) : null;
}

async function updateOrder(id, updates) {
  const rows = await supabaseRequest(TABLES.orders, {
    service: true,
    method: "PATCH",
    query: `?id=eq.${encodeURIComponent(id)}`,
    body: updates,
  });

  return rows[0] ? orderFromDb(rows[0]) : null;
}

async function updateOrderStatus(id, status, details = {}) {
  if (!ORDER_STATUSES.includes(status)) {
    throw new Error("Invalid order status");
  }

  const current = await findOrderById(id);
  if (!current) {
    return null;
  }

  return updateOrder(id, {
    status,
    status_history: nextStatusHistory(current, status, details),
    ...details.extra,
  });
}

async function getPublicProductReviews(productId) {
  const cleanProductId = String(productId || "").trim();
  if (!cleanProductId) {
    return [];
  }

  const rows = await supabaseRequest(TABLES.reviews, {
    service: true,
    query: `?select=*&product_id=eq.${encodeURIComponent(cleanProductId)}&is_published=eq.true&order=created_at.desc&limit=40`,
  });

  return rows.map(reviewFromDb);
}

async function createVerifiedReview({ orderId, productId, phone, rating, message }) {
  const order = await findOrderForTracking(orderId, phone);
  if (!order) {
    throw new Error("رقم الطلب أو الموبايل غير صحيح.");
  }

  if (order.status !== "delivered") {
    throw new Error("التقييم متاح بعد تسليم الطلب فقط.");
  }

  const existsInOrder = (order.items || []).some((item) => item.id === productId);
  if (!existsInOrder) {
    throw new Error("المنتج ده مش موجود في الطلب.");
  }

  const rows = await supabaseRequest(TABLES.reviews, {
    service: true,
    method: "POST",
    body: {
      name: order.customer?.name || "",
      phone: order.customer?.phone || phone || "",
      product_id: productId,
      order_id: order.id,
      customer_id: order.customer_id || null,
      rating: Math.max(1, Math.min(5, Number(rating) || 5)),
      message: String(message || "").trim().slice(0, 1000),
      is_published: true,
    },
  });

  return rows[0] ? reviewFromDb(rows[0]) : null;
}

async function updateProductStock(productId, nextQuantity) {
  const rows = await supabaseRequest(TABLES.products, {
    service: true,
    method: "PATCH",
    query: `?id=eq.${encodeURIComponent(productId)}`,
    body: {
      stock_quantity: Math.max(0, Number(nextQuantity || 0)),
      is_in_stock: Number(nextQuantity || 0) > 0,
    },
  });

  return rows[0] ? productFromDb(rows[0]) : null;
}

async function reserveInventoryForOrder(order) {
  const current = order?.id ? await findOrderById(order.id) : order;
  if (!current) {
    throw new Error("Order not found");
  }

  if (current.inventory_reserved) {
    return current;
  }

  for (const item of current.items || []) {
    const product = await getProductById(item.id);
    if (!product) {
      throw new Error(`المنتج ${item.name || item.id} لم يعد متاحًا.`);
    }

    const requested = Math.max(0, Number(item.quantity || 0));
    const trackedStock = Number(product.stock_quantity || 0);
    if (product.is_in_stock === false) {
      throw new Error(`المنتج ${product.name} لم يعد متاحًا.`);
    }

    if (trackedStock > 0 && trackedStock < requested) {
      throw new Error(`المخزون المتاح من ${product.name} أقل من الكمية المطلوبة.`);
    }
  }

  for (const item of current.items || []) {
    const product = await getProductById(item.id);
    if (Number(product.stock_quantity || 0) > 0) {
      await updateProductStock(item.id, product.stock_quantity - Number(item.quantity || 0));
    }
  }

  return updateOrder(current.id, { inventory_reserved: true });
}

async function releaseInventoryForOrder(order) {
  const current = order?.id ? await findOrderById(order.id) : order;
  if (!current || !current.inventory_reserved) {
    return current;
  }

  for (const item of current.items || []) {
    const product = await getProductById(item.id);
    if (!product) {
      continue;
    }

    await updateProductStock(item.id, product.stock_quantity + Number(item.quantity || 0));
  }

  return updateOrder(current.id, { inventory_reserved: false });
}

function storageObjectUrl(bucket, path) {
  const cleanBase = supabaseUrl()?.replace(/\/$/, "") || "";
  return `${cleanBase}/storage/v1/object/public/${bucket}/${path}`;
}

function parseDataUrl(dataUrl) {
  const match = String(dataUrl || "").match(/^data:(.+?);base64,(.+)$/);
  if (!match) {
    throw new Error("Unsupported image payload");
  }

  return {
    contentType: match[1],
    buffer: Buffer.from(match[2], "base64"),
  };
}

async function uploadStorageObjectFromDataUrl({ bucket, path, dataUrl }) {
  if (!storageConfigured()) {
    throw new Error("Supabase storage is not configured");
  }

  const { contentType, buffer } = parseDataUrl(dataUrl);
  const objectPath = path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  const result = await fetch(`${supabaseUrl().replace(/\/$/, "")}/storage/v1/object/${bucket}/${objectPath}`, {
    method: "POST",
    headers: {
      apikey: supabaseServiceKey(),
      Authorization: `Bearer ${supabaseServiceKey()}`,
      "Content-Type": contentType,
      "x-upsert": "true",
    },
    body: buffer,
  });

  if (!result.ok) {
    const message = await result.text().catch(() => "");
    throw new Error(message || "Storage upload failed");
  }

  return {
    path,
    url: storageObjectUrl(bucket, path),
  };
}

async function getEvents() {
  const [orders, reviews, complaints, chats, customers, passwordResets, emailVerifications] = await Promise.all([
    supabaseRequest(TABLES.orders, { service: true, query: "?select=*&order=created_at.desc&limit=500" }),
    supabaseRequest(TABLES.reviews, { service: true, query: "?select=*&order=created_at.desc&limit=500" }),
    supabaseRequest(TABLES.complaints, { service: true, query: "?select=*&order=created_at.desc&limit=500" }),
    supabaseRequest(TABLES.chats, { service: true, query: "?select=*&order=created_at.desc&limit=500" }),
    supabaseRequest(TABLES.customers, {
      service: true,
      query: "?select=id,name,phone,email,username,address,city,notes,avatar_url,email_verified_at,last_login_at,created_at,updated_at&order=created_at.desc&limit=500",
    }),
    supabaseRequest(TABLES.passwordResets, {
      service: true,
      query: "?select=*&order=created_at.desc&limit=200",
    }),
    supabaseRequest(TABLES.emailVerifications, {
      service: true,
      query: "?select=*&order=created_at.desc&limit=200",
    }),
  ]);

  return {
    orders: orders.map(orderFromDb),
    reviews,
    complaints,
    chats,
    customers: customers.map((row) => customerFromDb(row)),
    passwordResets,
    emailVerifications,
  };
}

function requireAdmin(request, response) {
  const expectedUser = process.env.ADMIN_USERNAME;
  const expected = process.env.ADMIN_PASSWORD;
  const providedUser = request.headers["x-admin-username"];
  const provided = request.headers["x-admin-password"];

  if (!expectedUser || !expected) {
    sendJson(response, 501, { message: "ADMIN_USERNAME and ADMIN_PASSWORD are not configured on Vercel." });
    return false;
  }

  if (providedUser !== expectedUser || provided !== expected) {
    sendJson(response, 401, { message: "Unauthorized" });
    return false;
  }

  return true;
}

module.exports = {
  ORDER_STATUSES,
  appendEvent,
  createCustomer,
  createCustomerSession,
  createEmailVerification,
  createOrder,
  createPasswordReset,
  createVerifiedReview,
  customerFromDb,
  deleteCustomerSession,
  findCustomer,
  findCustomerById,
  findCustomerSessionByToken,
  findOrderById,
  findOrderForTracking,
  findOrderByPaymentReference,
  getEvents,
  getLatestEmailVerification,
  getPublicProductReviews,
  getProductById,
  getProducts,
  getCustomerOrdersForTracking,
  orderFromDb,
  productFromDb,
  releaseInventoryForOrder,
  requireAdmin,
  reserveInventoryForOrder,
  sendJson,
  setProducts,
  storageConfigured,
  storageObjectUrl,
  supabaseConfigured,
  touchCustomerSession,
  updateCustomer,
  updateEmailVerification,
  updateOrder,
  updateOrderStatus,
  uploadStorageObjectFromDataUrl,
  upsertProduct,
};
