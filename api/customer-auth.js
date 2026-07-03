const crypto = require("node:crypto");
const {
  createCustomer,
  createEmailVerification,
  createPasswordReset,
  findCustomer,
  getLatestEmailVerification,
  sendJson,
  supabaseConfigured,
  updateCustomer,
  updateEmailVerification,
} = require("./_store");

const passwordIterations = 120000;
const passwordLength = 64;
const passwordDigest = "sha512";

function cleanText(value, limit = 200) {
  return String(value || "").trim().slice(0, limit);
}

function normalizeUsername(value) {
  return cleanText(value, 80).toLowerCase().replace(/[^a-z0-9._-]/g, "");
}

function normalizeEmail(value) {
  return cleanText(value, 160).toLowerCase();
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto
    .pbkdf2Sync(String(password), salt, passwordIterations, passwordLength, passwordDigest)
    .toString("hex");

  return { hash, salt };
}

function verifyPassword(password, hash, salt) {
  const candidate = hashPassword(password, salt).hash;
  const storedBuffer = Buffer.from(hash, "hex");
  const candidateBuffer = Buffer.from(candidate, "hex");

  return storedBuffer.length === candidateBuffer.length && crypto.timingSafeEqual(storedBuffer, candidateBuffer);
}

function publicCustomer(customer) {
  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
    username: customer.username,
    address: customer.address,
    city: customer.city,
    notes: customer.notes,
    email_verified_at: customer.email_verified_at,
    created_at: customer.created_at,
  };
}

function verificationCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function hashToken(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

async function issueEmailVerification(customer, { isWelcome = false } = {}) {
  const code = verificationCode();
  const codeHash = hashToken(code);

  const saved = await createEmailVerification({
    customer_id: customer.id,
    email: customer.email,
    code_hash: codeHash,
    status: "pending",
  });

  const emailSent = await sendOfficialEmail({
    to: customer.email,
    subject: isWelcome ? "كود تأكيد إيميل Cover Up" : "إعادة إرسال كود تأكيد Cover Up",
    html: `
      <p>أهلًا ${customer.name}،</p>
      <p>كود تأكيد الإيميل الخاص بحسابك على Cover Up هو:</p>
      <p style="font-size:28px;font-weight:700;letter-spacing:6px">${code}</p>
      <p>الكود صالح لمدة 15 دقيقة.</p>
    `,
  }).catch(() => false);

  if (!emailSent) {
    await updateEmailVerification(saved.id, { status: "email_not_configured" });
  }

  return { emailSent, code };
}

async function sendOfficialEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.OFFICIAL_EMAIL_FROM || "Cover Up <hello@coverup.tech>";

  if (!apiKey || !to) {
    return false;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  return response.ok;
}

async function register(body) {
  const name = cleanText(body.name, 120);
  const phone = cleanText(body.phone, 60);
  const email = normalizeEmail(body.email);
  const username = normalizeUsername(body.username);
  const password = String(body.password || "");
  const address = cleanText(body.address, 300);
  const city = cleanText(body.city, 120);
  const notes = cleanText(body.notes, 500);

  if (!name || !phone || !email || !username || !address || !password) {
    return { status: 400, payload: { message: "كمل الاسم ورقم الموبايل والإيميل واسم المستخدم والعنوان وكلمة السر." } };
  }

  if (password.length < 8) {
    return { status: 400, payload: { message: "كلمة السر لازم تكون 8 حروف أو أرقام على الأقل." } };
  }

  if (await findCustomer(username)) {
    return { status: 409, payload: { message: "اسم المستخدم موجود قبل كده." } };
  }

  if (await findCustomer(email)) {
    return { status: 409, payload: { message: "الإيميل مسجل قبل كده." } };
  }

  if (await findCustomer(phone)) {
    return { status: 409, payload: { message: "رقم الموبايل مسجل قبل كده." } };
  }

  const passwordData = hashPassword(password);
  const customer = await createCustomer({
    name,
    phone,
    email,
    username,
    address,
    city,
    notes,
    password_hash: passwordData.hash,
    password_salt: passwordData.salt,
  });

  sendOfficialEmail({
    to: email,
    subject: "أهلًا بيك في Cover Up",
    html: `<p>أهلًا ${name}، حسابك على Cover Up اتعمل بنجاح.</p><p>اسم المستخدم: <b>${username}</b></p>`,
  }).catch(() => {});

  const verification = await issueEmailVerification(customer, { isWelcome: true }).catch(() => ({ emailSent: false }));

  return {
    status: 200,
    payload: {
      customer: publicCustomer(customer),
      requiresEmailVerification: true,
      emailDeliveryReady: verification.emailSent,
    },
  };
}

async function login(body) {
  const identity = cleanText(body.identity, 160);
  const password = String(body.password || "");
  const customer = await findCustomer(identity, true);

  if (!customer || !verifyPassword(password, customer.password_hash, customer.password_salt)) {
    return { status: 401, payload: { message: "بيانات الدخول غير صحيحة." } };
  }

  const updated = await updateCustomer(customer.id, { last_login_at: new Date().toISOString() });
  return {
    status: 200,
    payload: {
      customer: publicCustomer(updated || customer),
      requiresEmailVerification: !(updated || customer).email_verified_at,
    },
  };
}

async function forgotPassword(body) {
  const identity = cleanText(body.identity, 160);
  const genericMessage = "لو البيانات مسجلة عندنا، هنرسل لك خطوات استرجاع كلمة السر على الإيميل أو يتابع معاك فريق الدعم.";
  const customer = await findCustomer(identity, true);

  if (!customer) {
    await createPasswordReset({
      email: identity.includes("@") ? identity.toLowerCase() : "",
      phone: identity.includes("@") ? "" : identity,
      status: "unknown_identity",
    });
    return { status: 200, payload: { message: genericMessage } };
  }

  const temporaryPassword = `CU-${crypto.randomBytes(5).toString("hex")}`;
  const passwordData = hashPassword(temporaryPassword);
  const tokenHash = crypto.createHash("sha256").update(temporaryPassword).digest("hex");
  const emailSent = await sendOfficialEmail({
    to: customer.email,
    subject: "استرجاع كلمة سر Cover Up",
    html: `
      <p>أهلًا ${customer.name}،</p>
      <p>استخدم كلمة السر المؤقتة دي لتسجيل الدخول، وبعدها ابعت لنا لو حابب نغيرها لك:</p>
      <p><b>${temporaryPassword}</b></p>
      <p>لو أنت ماطلبتش الاسترجاع، تجاهل الرسالة وتواصل معنا فورًا.</p>
    `,
  }).catch(() => false);

  await createPasswordReset({
    customer_id: customer.id,
    email: customer.email,
    phone: customer.phone,
    token_hash: tokenHash,
    status: emailSent ? "temporary_password_sent" : "email_not_configured",
  });

  if (emailSent) {
    await updateCustomer(customer.id, {
      password_hash: passwordData.hash,
      password_salt: passwordData.salt,
    });
  }

  return { status: 200, payload: { message: genericMessage } };
}

async function verifyEmail(body) {
  const identity = cleanText(body.identity, 160);
  const code = cleanText(body.code, 20);
  const customer = await findCustomer(identity, true);

  if (!customer) {
    return { status: 404, payload: { message: "الحساب غير موجود." } };
  }

  const latest = await getLatestEmailVerification(customer.id);
  if (!latest) {
    return { status: 404, payload: { message: "مفيش كود تأكيد متاح للحساب ده." } };
  }

  if (latest.status !== "pending" && latest.status !== "email_not_configured") {
    return { status: 400, payload: { message: "الكود ده تم استخدامه أو انتهت صلاحيته." } };
  }

  if (new Date(latest.expires_at).getTime() < Date.now()) {
    await updateEmailVerification(latest.id, { status: "expired" });
    return { status: 400, payload: { message: "الكود انتهت صلاحيته. اطلب كود جديد." } };
  }

  if (hashToken(code) !== latest.code_hash) {
    return { status: 400, payload: { message: "الكود غير صحيح." } };
  }

  await updateEmailVerification(latest.id, { status: "verified" });
  const updated = await updateCustomer(customer.id, { email_verified_at: new Date().toISOString() });
  await sendOfficialEmail({
    to: customer.email,
    subject: "تم تأكيد إيميل Cover Up",
    html: `<p>أهلًا ${customer.name}، تم تأكيد إيميل حسابك بنجاح. أهلًا بيك في Cover Up.</p>`,
  }).catch(() => {});

  return { status: 200, payload: { customer: publicCustomer(updated || customer) } };
}

async function resendVerification(body) {
  const identity = cleanText(body.identity, 160);
  const customer = await findCustomer(identity, true);

  if (!customer) {
    return { status: 404, payload: { message: "الحساب غير موجود." } };
  }

  if (customer.email_verified_at) {
    return { status: 200, payload: { message: "الإيميل متأكد بالفعل.", customer: publicCustomer(customer) } };
  }

  const verification = await issueEmailVerification(customer).catch(() => ({ emailSent: false }));
  return {
    status: 200,
    payload: {
      message: verification.emailSent
        ? "تم إرسال كود جديد على الإيميل."
        : "طلب الكود اتسجل، لكن لازم نفعّل خدمة الإيميل الرسمي أولًا.",
    },
  };
}

module.exports = async function handler(request, response) {
  try {
    if (request.method !== "POST") {
      return sendJson(response, 405, { message: "Method not allowed" });
    }

    if (!supabaseConfigured(true)) {
      return sendJson(response, 501, { message: "Supabase service role is not configured." });
    }

    const action = cleanText(request.body?.action, 40);
    const handlers = { register, login, forgotPassword, verifyEmail, resendVerification };
    const run = handlers[action];

    if (!run) {
      return sendJson(response, 400, { message: "Invalid action" });
    }

    const result = await run(request.body || {});
    return sendJson(response, result.status, result.payload);
  } catch (error) {
    if (String(error.message || "").includes("duplicate key")) {
      return sendJson(response, 409, { message: "البيانات دي مسجلة قبل كده." });
    }

    return sendJson(response, 500, { message: error.message || "Customer account error" });
  }
};
