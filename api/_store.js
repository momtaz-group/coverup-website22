const STORE_KEYS = {
  products: "coverup:products",
  orders: "coverup:orders",
  reviews: "coverup:reviews",
  complaints: "coverup:complaints",
  chats: "coverup:chats",
};

const { randomUUID } = require("node:crypto");

function sendJson(response, statusCode, payload) {
  response.status(statusCode).json(payload);
}

function kvConfigured() {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

async function kv(command) {
  const result = await fetch(process.env.KV_REST_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });

  if (!result.ok) {
    throw new Error("KV request failed");
  }

  return result.json();
}

async function getJson(key, fallback) {
  if (!kvConfigured()) {
    return { configured: false, data: fallback };
  }

  const response = await kv(["GET", key]);
  if (!response.result) {
    return { configured: true, data: fallback };
  }

  try {
    return { configured: true, data: JSON.parse(response.result) };
  } catch {
    return { configured: true, data: fallback };
  }
}

async function setJson(key, data) {
  if (!kvConfigured()) {
    throw new Error("KV is not configured");
  }

  await kv(["SET", key, JSON.stringify(data)]);
}

async function appendJson(key, item) {
  const current = await getJson(key, []);
  const next = [{ ...item, id: item.id || randomUUID(), createdAt: new Date().toISOString() }, ...current.data].slice(0, 500);
  await setJson(key, next);
  return next[0];
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
  STORE_KEYS,
  appendJson,
  getJson,
  kvConfigured,
  requireAdmin,
  sendJson,
  setJson,
};
