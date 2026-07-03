const crypto = require("node:crypto");
const {
  createCustomerSession,
  deleteCustomerSession,
  findCustomerById,
  findCustomerSessionByToken,
  touchCustomerSession,
} = require("./_store");

const SESSION_COOKIE = "coverup_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

function hashSessionToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

function parseCookies(headerValue = "") {
  return headerValue
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((cookies, part) => {
      const separator = part.indexOf("=");
      if (separator === -1) {
        return cookies;
      }

      const key = part.slice(0, separator).trim();
      const value = decodeURIComponent(part.slice(separator + 1).trim());
      cookies[key] = value;
      return cookies;
    }, {});
}

function sessionCookie(value, maxAge) {
  return [
    `${SESSION_COOKIE}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    process.env.NODE_ENV === "production" ? "Secure" : "",
    typeof maxAge === "number" ? `Max-Age=${maxAge}` : "",
  ]
    .filter(Boolean)
    .join("; ");
}

function sessionTokenFromRequest(request) {
  const cookies = parseCookies(request.headers.cookie || "");
  return cookies[SESSION_COOKIE] || "";
}

async function beginCustomerSession(response, customer, request) {
  const token = crypto.randomBytes(32).toString("hex");
  await createCustomerSession({
    customerId: customer.id,
    tokenHash: hashSessionToken(token),
    expiresAt: new Date(Date.now() + SESSION_MAX_AGE * 1000).toISOString(),
    userAgent: request.headers["user-agent"] || "",
    ipAddress: request.headers["x-forwarded-for"] || request.socket?.remoteAddress || "",
  });

  response.setHeader("Set-Cookie", sessionCookie(encodeURIComponent(token), SESSION_MAX_AGE));
}

async function endCustomerSession(response, request) {
  const token = sessionTokenFromRequest(request);
  if (token) {
    await deleteCustomerSession(hashSessionToken(token));
  }

  response.setHeader("Set-Cookie", sessionCookie("", 0));
}

async function authenticatedCustomer(request) {
  const token = sessionTokenFromRequest(request);
  if (!token) {
    return null;
  }

  const session = await findCustomerSessionByToken(hashSessionToken(token));
  if (!session) {
    return null;
  }

  if (new Date(session.expires_at).getTime() < Date.now()) {
    await deleteCustomerSession(session.token_hash);
    return null;
  }

  await touchCustomerSession(session.id);
  return findCustomerById(session.customer_id);
}

module.exports = {
  SESSION_COOKIE,
  authenticatedCustomer,
  beginCustomerSession,
  endCustomerSession,
  sessionTokenFromRequest,
};
