const TABLES = {
  products: "products",
  orders: "orders",
  reviews: "reviews",
  complaints: "complaints",
  chats: "chats",
};

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

function productFromDb(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: Number(row.price),
    image: row.image,
    badge: row.badge,
    description: row.description,
  };
}

function productToDb(product) {
  return {
    id: String(product.id || "").trim(),
    name: String(product.name || "").trim(),
    category: String(product.category || "منتجات").trim(),
    price: Number(product.price) || 0,
    image: String(product.image || "").trim(),
    badge: String(product.badge || "متوفر").trim(),
    description: String(product.description || "").trim(),
    is_active: true,
  };
}

async function getProducts() {
  const rows = await supabaseRequest(TABLES.products, {
    query: "?select=id,name,category,price,image,badge,description&is_active=eq.true&order=created_at.asc",
  });

  return rows.map(productFromDb);
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

async function getEvents() {
  const [orders, reviews, complaints, chats] = await Promise.all([
    supabaseRequest(TABLES.orders, { service: true, query: "?select=*&order=created_at.desc&limit=500" }),
    supabaseRequest(TABLES.reviews, { service: true, query: "?select=*&order=created_at.desc&limit=500" }),
    supabaseRequest(TABLES.complaints, { service: true, query: "?select=*&order=created_at.desc&limit=500" }),
    supabaseRequest(TABLES.chats, { service: true, query: "?select=*&order=created_at.desc&limit=500" }),
  ]);

  return { orders, reviews, complaints, chats };
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
  appendEvent,
  getEvents,
  getProducts,
  requireAdmin,
  sendJson,
  setProducts,
  supabaseConfigured,
};
