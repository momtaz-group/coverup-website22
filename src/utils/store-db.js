const TABLES = {
  products: "products",
  orders: "orders",
  reviews: "reviews",
  complaints: "complaints",
  chats: "chats",
  profiles: "profiles",
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
  return process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "https://rdxkrmcegrlgixnciyzz.supabase.co";
}

function supabaseServiceKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";
}

function jwtRole(token) {
  try {
    const payload = token.split(".")[1];
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(Buffer.from(normalized, "base64").toString("utf8"))?.role || "";
  } catch {
    return "";
  }
}

function hasServiceRoleKey() {
  const key = supabaseServiceKey();
  return Boolean(key && jwtRole(key) === "service_role");
}

function supabaseAnonKey() {
  return process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkeGtybWNlZ3JsZ2l4bmNpeXp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwMTk3ODMsImV4cCI6MjA5ODU5NTc4M30.oD9mNx2kZZ_wc2lR7oiHWd1LS3z11NNxbLCD42CKea4";
}

function supabaseConfigured(requireService = false) {
  return Boolean(supabaseUrl() && (requireService ? hasServiceRoleKey() : supabaseAnonKey()));
}

function storageConfigured() {
  return Boolean(supabaseUrl() && hasServiceRoleKey());
}

async function supabaseRequest(table, options = {}) {
  const useService = options.service === true;
  const key = useService ? supabaseServiceKey() : supabaseAnonKey();

  if (!supabaseUrl() || !key) {
    throw new Error("Supabase is not configured");
  }

  if (useService && !hasServiceRoleKey()) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY must be a real service_role key, not the public anon key.");
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

const PRODUCT_IMAGE_FALLBACKS = {
  "black-full-glue-screen-protector": "assets/products/black-full-glue-screen-protector.jpeg",
  "black-magsafe-fabric-case": "assets/products/black-magsafe-fabric-case.jpeg",
  "brown-magsafe-fabric-case": "assets/products/brown-magsafe-fabric-case.jpeg",
  "carbon-slide-camera-case": "assets/products/carbon-slide-camera-case.jpeg",
  "navy-apple-fabric-case": "assets/products/navy-apple-fabric-case.jpeg",
  "orange-leopard-camera-case": "assets/products/orange-leopard-camera-case.jpeg",
  "privacy-screen-protector": "assets/products/privacy-screen-protector.jpeg",
  "samsung-clear-shockproof-case": "assets/products/samsung-clear-shockproof-case.jpeg",
  "tempered-glass-screen-protector": "assets/products/tempered-glass-screen-protector.jpeg",
};

function publicProductImage(id, image) {
  const value = String(image || "").trim();
  if (!value || value.startsWith("data:image/")) {
    return PRODUCT_IMAGE_FALLBACKS[id] ? `/${PRODUCT_IMAGE_FALLBACKS[id]}` : "";
  }

  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/")) {
    return value;
  }

  if (/\.(png|jpe?g|webp|gif|avif|svg)$/i.test(value) && !value.includes("://")) {
    return `/${value.replace(/^\/+/, "")}`;
  }

  return PRODUCT_IMAGE_FALLBACKS[id] ? `/${PRODUCT_IMAGE_FALLBACKS[id]}` : "";
}

function publicProductImages(id, images) {
  return cleanArray(images)
    .filter((image) => !image.startsWith("data:image/"))
    .map((image) => publicProductImage(id, image))
    .filter(Boolean)
    .slice(0, 8);
}

function productFromDb(row) {
  const parsedColors = cleanArray(row.colors).map(c => {
    try {
      if (c.startsWith("{") || c.startsWith("[")) {
        return JSON.parse(c);
      }
    } catch {}
    return c;
  });

  return {
    id: row.id,
    name: row.name,
    name_en: row.name_en || "",
    category: row.category,
    category_en: row.category_en || "",
    price: Number(row.price || 0),
    image: publicProductImage(row.id, row.image),
    images: publicProductImages(row.id, row.images),
    badge: row.badge,
    badge_en: row.badge_en || "",
    description: row.description,
    description_en: row.description_en || "",
    seo_title: row.seo_title || "",
    seo_description: row.seo_description || "",
    sku: row.sku || "",
    stock_quantity: Number(row.stock_quantity || 0),
    is_in_stock: typeof row.is_in_stock === "boolean" ? row.is_in_stock : Number(row.stock_quantity || 0) > 0,
    compatible_models: cleanArray(row.compatible_models),
    colors: parsedColors,
    material: row.material || "",
    featured: Boolean(row.featured),
    status: row.status || "public",
    brand: row.brand || "",
    product_family: row.product_family || "",
    tags: cleanArray(row.tags),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function productToDb(product) {
  const stockQuantity = Math.max(0, Number(product.stock_quantity ?? product.stockQuantity ?? 0));

  const serializedColors = Array.isArray(product.colors)
    ? product.colors.map(c => typeof c === 'object' ? JSON.stringify(c) : String(c))
    : [];

  return {
    id: String(product.id || "").trim(),
    name: String(product.name || "").trim(),
    name_en: String(product.name_en || product.nameEn || "").trim(),
    category: String(product.category || "منتجات").trim(),
    category_en: String(product.category_en || product.categoryEn || "").trim(),
    price: Number(product.price) || 0,
    image: String(product.image || "").trim(),
    images: cleanArray(product.images),
    badge: String(product.badge || "متوفر").trim(),
    badge_en: String(product.badge_en || product.badgeEn || "").trim(),
    description: String(product.description || "").trim(),
    description_en: String(product.description_en || product.descriptionEn || "").trim(),
    seo_title: String(product.seo_title || product.seoTitle || "").trim(),
    seo_description: String(product.seo_description || product.seoDescription || "").trim(),
    sku: String(product.sku || "").trim(),
    stock_quantity: stockQuantity,
    is_in_stock: toBoolean(product.is_in_stock ?? product.isInStock, stockQuantity > 0),
    compatible_models: cleanArray(product.compatible_models ?? product.compatibleModels),
    colors: serializedColors,
    material: String(product.material || "").trim(),
    featured: toBoolean(product.featured, false),
    status: String(product.status || "public").trim(),
    brand: String(product.brand || "").trim(),
    product_family: String(product.product_family || "").trim(),
    tags: cleanArray(product.tags),
    is_active: true,
  };
}

function customerFromDb(row, includePrivate = false) {
  const customer = {
    id: row.id,
    name: row.full_name || row.name || "",
    phone: row.phone,
    email: row.email,
    username: row.username,
    address: row.address,
    city: row.city,
    notes: row.notes,
    location: Array.isArray(row.location) ? row.location : [],
    email_verified_at: row.email_confirmed_at || row.email_verified_at,
    last_login_at: row.last_sign_in_at || row.last_login_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };

  if (includePrivate) {
    customer.auth_provider = row.auth_provider || "";
  }

  return customer;
}

function profileToDb(profile = {}) {
  const row = {};
  const fields = ["id", "email", "phone", "username", "address", "city", "notes", "auth_provider", "location"];

  for (const field of fields) {
    if (profile[field] !== undefined) row[field] = profile[field];
  }

  if (profile.full_name !== undefined || profile.name !== undefined) {
    row.full_name = profile.full_name || profile.name || "";
  }

  if (profile.email_confirmed_at !== undefined || profile.email_verified_at !== undefined) {
    row.email_confirmed_at = profile.email_confirmed_at || profile.email_verified_at || null;
  }

  if (profile.last_sign_in_at !== undefined || profile.last_login_at !== undefined) {
    row.last_sign_in_at = profile.last_sign_in_at || profile.last_login_at || null;
  }

  return row;
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
    tip_amount: Number(row.tip_amount || 0),
    branch_location: row.branch_location || "",
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
    ? `?id=in.(${ids.map(encodeURIComponent).join(",")})`
    : "";

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

  const rows = await supabaseRequest(TABLES.profiles, {
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
  const rows = await supabaseRequest(TABLES.profiles, {
    service: true,
    method: "POST",
    body: profileToDb(customer),
  });

  return customerFromDb(rows[0]);
}

async function updateCustomer(id, updates) {
  const rows = await supabaseRequest(TABLES.profiles, {
    service: true,
    method: "PATCH",
    query: `?id=eq.${encodeURIComponent(id)}`,
    body: profileToDb(updates),
  });

  return rows[0] ? customerFromDb(rows[0]) : null;
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
  const randomDigits = Math.floor(10000000 + Math.random() * 90000000); // 8-digit random number
  const orderId = `CU${randomDigits}`;

  const saved = await supabaseRequest(TABLES.orders, {
    service: true,
    method: "POST",
    body: {
      id: orderId,
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
  const [orders, reviews, complaints, chats, profiles] = await Promise.all([
    supabaseRequest(TABLES.orders, { service: true, query: "?select=*&order=created_at.desc&limit=500" }),
    supabaseRequest(TABLES.reviews, { service: true, query: "?select=*&order=created_at.desc&limit=500" }),
    supabaseRequest(TABLES.complaints, { service: true, query: "?select=*&order=created_at.desc&limit=500" }),
    supabaseRequest(TABLES.chats, { service: true, query: "?select=*&order=created_at.desc&limit=500" }),
    supabaseRequest(TABLES.profiles, {
      service: true,
      query: "?select=id,full_name,phone,email,location,auth_provider,email_confirmed_at,last_sign_in_at,created_at,updated_at,roles&order=created_at.desc&limit=500",
    }),
  ]);

  return {
    orders: orders.map(orderFromDb),
    reviews,
    complaints,
    chats,
    customers: profiles.map((row) => customerFromDb(row)),
  };
}

function requireAdmin(request) {
  const expectedUser = "ARiana_GranDy";
  const expected = "Momtaz_beta3_el_Ma7l";
  const expectedHash = "QVJpYW5hX0dyYW5EeTpNb210YXpfYmV0YTNfZWxfTWE3bA==";

  // Check headers
  const providedUser = typeof request?.headers?.get === "function"
    ? request.headers.get("x-admin-username")
    : request?.headers?.["x-admin-username"];
  const provided = typeof request?.headers?.get === "function"
    ? request.headers.get("x-admin-password")
    : request?.headers?.["x-admin-password"];

  if (providedUser === expectedUser && provided === expected) {
    return { authorized: true };
  }

  // Check cookie
  let adminToken = "";
  if (typeof request?.cookies?.get === "function") {
    adminToken = request.cookies.get("coverup_admin_token")?.value || "";
  } else if (request?.headers?.get) {
    // Parse cookies from headers manually if request.cookies is not available
    const cookieHeader = request.headers.get("cookie") || "";
    const match = cookieHeader.match(/coverup_admin_token=([^;]+)/);
    if (match) {
      adminToken = match[1];
    }
  }

  if (adminToken === expectedHash) {
    return { authorized: true };
  }

  return {
    authorized: false,
    status: 401,
    message: "Unauthorized"
  };
}

async function deleteProduct(id) {
  const isBulk = id.includes(",");
  const query = isBulk 
    ? `?id=in.(${id.split(',').map(x => encodeURIComponent(x.trim())).join(',')})`
    : `?id=eq.${encodeURIComponent(id)}`;
  const result = await supabaseRequest(TABLES.products, {
    service: true,
    method: "DELETE",
    query,
  });
  return result;
}

async function deleteOrder(id) {
  const isBulk = id.includes(",");
  const query = isBulk 
    ? `?id=in.(${id.split(',').map(x => encodeURIComponent(x.trim())).join(',')})`
    : `?id=eq.${encodeURIComponent(id)}`;
  const result = await supabaseRequest(TABLES.orders, {
    service: true,
    method: "DELETE",
    query,
  });
  return result;
}

async function logEmail({ event_key, email_type, recipient, user_id, order_id, order_status, resend_email_id, delivery_status, error_message, metadata }) {
  try {
    const saved = await supabaseRequest("email_logs", {
      service: true,
      method: "POST",
      body: {
        event_key: event_key || null,
        email_type,
        recipient,
        user_id: user_id || null,
        order_id: order_id || null,
        order_status: order_status || null,
        resend_email_id: resend_email_id || null,
        delivery_status: delivery_status || "queued",
        error_message: error_message || null,
        metadata: metadata || {},
      }
    });
    return saved[0] || null;
  } catch (error) {
    console.error("Error logging email to db:", error);
    return null;
  }
}

async function updateEmailLogStatus({ id, resend_email_id, status, error_message }) {
  try {
    let query = "";
    if (id) {
      query = `?id=eq.${encodeURIComponent(id)}`;
    } else if (resend_email_id) {
      query = `?resend_email_id=eq.${encodeURIComponent(resend_email_id)}`;
    } else {
      return false;
    }

    const body = {
      delivery_status: status,
      updated_at: new Date().toISOString()
    };
    if (resend_email_id) body.resend_email_id = resend_email_id;
    if (error_message) body.error_message = error_message;

    await supabaseRequest("email_logs", {
      service: true,
      method: "PATCH",
      query,
      body,
    });
    return true;
  } catch (error) {
    console.error("Error updating email log status:", error);
    return false;
  }
}

async function getEmailLogByEventKey(event_key) {
  try {
    const rows = await supabaseRequest("email_logs", {
      service: true,
      query: `?select=*&event_key=eq.${encodeURIComponent(event_key)}&limit=1`
    });
    return rows[0] || null;
  } catch (error) {
    console.error("Error fetching email log:", error);
    return null;
  }
}

export {
  ORDER_STATUSES,
  appendEvent,
  createCustomer,
  createOrder,
  createVerifiedReview,
  customerFromDb,
  findCustomer,
  findCustomerBy,
  findCustomerById,
  findOrderById,
  findOrderForTracking,
  findOrderByPaymentReference,
  getEvents,
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
  updateCustomer,
  updateOrder,
  updateOrderStatus,
  uploadStorageObjectFromDataUrl,
  upsertProduct,
  deleteProduct,
  deleteOrder,
  logEmail,
  updateEmailLogStatus,
  getEmailLogByEventKey,
};
