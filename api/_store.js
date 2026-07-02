const TABLES = {
  products: "products",
  orders: "orders",
  reviews: "reviews",
  complaints: "complaints",
  chats: "chats",
  customers: "customers",
  passwordResets: "password_resets",
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
    last_login_at: row.last_login_at,
    created_at: row.created_at,
  };

  if (includePrivate) {
    customer.password_hash = row.password_hash;
    customer.password_salt = row.password_salt;
  }

  return customer;
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

async function createPasswordReset(reset) {
  const rows = await supabaseRequest(TABLES.passwordResets, {
    service: true,
    method: "POST",
    body: reset,
  });

  return rows[0];
}

async function getEvents() {
  const [orders, reviews, complaints, chats, customers, passwordResets] = await Promise.all([
    supabaseRequest(TABLES.orders, { service: true, query: "?select=*&order=created_at.desc&limit=500" }),
    supabaseRequest(TABLES.reviews, { service: true, query: "?select=*&order=created_at.desc&limit=500" }),
    supabaseRequest(TABLES.complaints, { service: true, query: "?select=*&order=created_at.desc&limit=500" }),
    supabaseRequest(TABLES.chats, { service: true, query: "?select=*&order=created_at.desc&limit=500" }),
    supabaseRequest(TABLES.customers, {
      service: true,
      query: "?select=id,name,phone,email,username,address,city,notes,last_login_at,created_at&order=created_at.desc&limit=500",
    }),
    supabaseRequest(TABLES.passwordResets, {
      service: true,
      query: "?select=*&order=created_at.desc&limit=200",
    }),
  ]);

  return { orders, reviews, complaints, chats, customers, passwordResets };
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
  createCustomer,
  createPasswordReset,
  findCustomer,
  getEvents,
  getProducts,
  requireAdmin,
  sendJson,
  setProducts,
  supabaseConfigured,
  updateCustomer,
};
