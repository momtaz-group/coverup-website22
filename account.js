const formatter = new Intl.NumberFormat("ar-EG", {
  style: "currency",
  currency: "EGP",
  maximumFractionDigits: 0,
});

const customerStorageKey = "coverup-customer";
const cartStorageKey = "coverup-cart-v2";
const legacyCartStorageKey = "coverup-cart";

const state = {
  customer: JSON.parse(localStorage.getItem(customerStorageKey) || "null"),
  cart: readCart(),
  products: [],
  activeIdentity: "",
  screen: "login-identity",
};

const heroName = document.querySelector("[data-account-hero-name]");
const heroEmail = document.querySelector("[data-account-hero-email]");
const heroStatus = document.querySelector("[data-account-hero-status]");
const customerCard = document.querySelector("[data-customer-card]");
const authStatus = document.querySelector("[data-auth-status]");
const logoutButton = document.querySelector("[data-logout-account]");
const cartList = document.querySelector("[data-account-cart-list]");
const cartTotal = document.querySelector("[data-account-cart-total]");
const activeIdentityNode = document.querySelector("[data-active-identity]");

function escapeText(value) {
  return String(value || "").replace(/[<>&"]/g, (char) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    '"': "&quot;",
  }[char]));
}

function readCart() {
  const raw = JSON.parse(localStorage.getItem(cartStorageKey) || localStorage.getItem(legacyCartStorageKey) || "{}");
  return Object.entries(raw).reduce((accumulator, [id, value]) => {
    if (typeof value === "number" && value > 0) {
      accumulator[id] = { quantity: value, snapshot: null };
      return accumulator;
    }

    if (value && typeof value === "object" && Number(value.quantity) > 0) {
      accumulator[id] = {
        quantity: Number(value.quantity),
        snapshot: value.snapshot && typeof value.snapshot === "object" ? value.snapshot : null,
      };
    }

    return accumulator;
  }, {});
}

function saveCustomer(customer) {
  state.customer = customer;
  if (customer) {
    localStorage.setItem(customerStorageKey, JSON.stringify(customer));
    return;
  }

  localStorage.removeItem(customerStorageKey);
}

function saveCart() {
  localStorage.setItem(cartStorageKey, JSON.stringify(state.cart));
  localStorage.setItem(
    legacyCartStorageKey,
    JSON.stringify(
      Object.fromEntries(
        Object.entries(state.cart).map(([id, item]) => [id, item.quantity]),
      ),
    ),
  );
}

function productSnapshot(product) {
  return {
    id: product.id,
    name: product.name,
    price: Number(product.price) || 0,
  };
}

async function loadProducts() {
  try {
    const response = await fetch("/api/store-products");
    if (!response.ok) {
      return;
    }

    const data = await response.json();
    if (!Array.isArray(data.products)) {
      return;
    }

    state.products = data.products;
    Object.entries(state.cart).forEach(([id, item]) => {
      const product = state.products.find((entry) => entry.id === id);
      if (product) {
        item.snapshot = productSnapshot(product);
      }
    });
    saveCart();
  } catch {
    state.products = [];
  }
}

function cartEntries() {
  return Object.entries(state.cart)
    .map(([id, item]) => {
      const snapshot = item.snapshot || {};
      return {
        id,
        quantity: item.quantity,
        name: snapshot.name || "منتج محفوظ في السلة",
        price: Number(snapshot.price) || 0,
      };
    })
    .filter((item) => item.quantity > 0);
}

function setStatus(message, type = "") {
  authStatus.textContent = message || "";
  authStatus.dataset.state = type;
}

function renderCartSummary() {
  const entries = cartEntries();
  const total = entries.reduce((sum, entry) => sum + entry.price * entry.quantity, 0);

  cartTotal.textContent = formatter.format(total);
  cartList.innerHTML = entries.length
    ? entries
        .map(
          (entry) => `
            <article class="account-cart-item">
              <strong>${escapeText(entry.name)}</strong>
              <span>${entry.quantity} × ${formatter.format(entry.price)}</span>
              <small>${formatter.format(entry.price * entry.quantity)}</small>
            </article>
          `,
        )
        .join("")
    : '<p class="empty-cart">السلة فاضية حاليًا. اختار منتجات من المتجر وسيظهر ملخصها هنا.</p>';
}

function renderCustomer() {
  logoutButton.hidden = !state.customer;

  if (!state.customer) {
    heroName.textContent = "ضيف";
    heroEmail.textContent = "سجل دخولك أو أنشئ حساب جديد.";
    heroStatus.textContent = "بعد التسجيل، هتلاقي هنا حالة الإيميل وبيانات الحساب.";
    customerCard.innerHTML = `
      <h2>حسابك</h2>
      <p>اعمل تسجيل دخول أو أنشئ حساب بخطوات سريعة، وبعدها هتقدر تراجع بياناتك وتتابع حالة تأكيد الإيميل من نفس المكان.</p>
    `;
    return;
  }

  const verified = Boolean(state.customer.email_verified_at);
  heroName.textContent = state.customer.name || "عميل Cover Up";
  heroEmail.textContent = state.customer.email || state.customer.username || "";
  heroStatus.textContent = verified ? "الإيميل متأكد وجاهز." : "الإيميل لسه محتاج كود تأكيد.";
  customerCard.innerHTML = `
    <h2>حسابك</h2>
    <div class="account-customer-grid">
      <span><strong>الاسم:</strong> ${escapeText(state.customer.name)}</span>
      <span><strong>اسم المستخدم:</strong> ${escapeText(state.customer.username)}</span>
      <span><strong>الموبايل:</strong> ${escapeText(state.customer.phone)}</span>
      <span><strong>الإيميل:</strong> ${escapeText(state.customer.email)}</span>
      <span><strong>المدينة:</strong> ${escapeText(state.customer.city || "غير محدد")}</span>
      <span><strong>الحالة:</strong> ${verified ? "تم تأكيد الإيميل" : "في انتظار التأكيد"}</span>
      <span class="full-width"><strong>العنوان:</strong> ${escapeText(state.customer.address || "غير محدد")}</span>
      ${state.customer.notes ? `<span class="full-width"><strong>ملاحظات:</strong> ${escapeText(state.customer.notes)}</span>` : ""}
    </div>
  `;
}

function syncVerifyIdentity() {
  const verifyForm = document.querySelector('[data-auth-form="verify"]');
  if (!verifyForm) {
    return;
  }

  const identityField = verifyForm.elements.identity;
  const fallbackIdentity = state.activeIdentity || state.customer?.email || state.customer?.username || "";
  identityField.value = fallbackIdentity;
}

function openScreen(screen) {
  state.screen = screen;
  document.querySelectorAll("[data-auth-screen]").forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.authScreen === screen);
  });
  activeIdentityNode.textContent = state.activeIdentity || "لا توجد بيانات محددة بعد";
  syncVerifyIdentity();
  setStatus("");
}

async function accountRequest(payload) {
  const response = await fetch("/api/customer-auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "حصل خطأ في الحساب.");
  }

  return data;
}

function prefillIdentity(identity) {
  state.activeIdentity = String(identity || "").trim();
  const loginIdentityForm = document.querySelector('[data-auth-form="login-identity"]');
  const forgotForm = document.querySelector('[data-auth-form="forgot"]');
  const verifyForm = document.querySelector('[data-auth-form="verify"]');

  if (loginIdentityForm?.elements.identity && state.activeIdentity) {
    loginIdentityForm.elements.identity.value = state.activeIdentity;
  }

  if (forgotForm?.elements.identity && state.activeIdentity) {
    forgotForm.elements.identity.value = state.activeIdentity;
  }

  if (verifyForm?.elements.identity && state.activeIdentity) {
    verifyForm.elements.identity.value = state.activeIdentity;
  }
}

document.querySelectorAll("[data-open-screen]").forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.dataset.openScreen;

    if (target === "forgot") {
      prefillIdentity(state.activeIdentity || state.customer?.email || state.customer?.username || "");
    }

    if (target === "verify") {
      syncVerifyIdentity();
    }

    openScreen(target);
  });
});

document.querySelector('[data-auth-form="login-identity"]').addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const identity = String(form.get("identity") || "").trim();

  if (!identity) {
    setStatus("اكتب الإيميل أو رقم الموبايل أو اسم المستخدم أولًا.", "error");
    return;
  }

  prefillIdentity(identity);
  openScreen("login-password");
});

document.querySelector('[data-auth-form="login-password"]').addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("بنراجع بيانات الدخول...", "loading");

  try {
    const password = String(new FormData(event.currentTarget).get("password") || "");
    const result = await accountRequest({
      action: "login",
      identity: state.activeIdentity,
      password,
    });

    saveCustomer(result.customer);
    prefillIdentity(result.customer.email || result.customer.username);
    renderCustomer();
    setStatus(
      result.requiresEmailVerification
        ? "تم تسجيل الدخول. باقي تأكيد الإيميل بكود التفعيل."
        : "تم تسجيل الدخول بنجاح.",
      "success",
    );

    if (result.requiresEmailVerification) {
      openScreen("verify");
      setStatus("تم تسجيل الدخول. باقي تأكيد الإيميل بكود التفعيل.", "success");
    }
  } catch (error) {
    setStatus(error.message, "error");
  }
});

document.querySelector('[data-auth-form="register"]').addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("بننشئ الحساب...", "loading");

  try {
    const payload = Object.fromEntries(new FormData(event.currentTarget));
    payload.action = "register";

    const result = await accountRequest(payload);
    saveCustomer(result.customer);
    prefillIdentity(result.customer.email || result.customer.username);
    renderCustomer();
    event.currentTarget.reset();
    openScreen("verify");
    setStatus(
      result.emailDeliveryReady
        ? "الحساب اتعمل وكود التأكيد اتبعت على الإيميل."
        : "الحساب اتعمل، لكن تفعيل الإيميل الرسمي لسه مطلوب عشان الكود يوصل.",
      result.emailDeliveryReady ? "success" : "warning",
    );
  } catch (error) {
    setStatus(error.message, "error");
  }
});

document.querySelector('[data-auth-form="forgot"]').addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("بنراجع طلب الاسترجاع...", "loading");

  try {
    const payload = Object.fromEntries(new FormData(event.currentTarget));
    payload.action = "forgotPassword";
    const result = await accountRequest(payload);
    setStatus(result.message, "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
});

document.querySelector('[data-auth-form="verify"]').addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("بنتأكد من الكود...", "loading");

  try {
    const payload = Object.fromEntries(new FormData(event.currentTarget));
    payload.action = "verifyEmail";
    const result = await accountRequest(payload);
    saveCustomer(result.customer);
    prefillIdentity(result.customer.email || result.customer.username);
    renderCustomer();
    setStatus("تم تأكيد الإيميل بنجاح.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
});

document.querySelector("[data-resend-code]").addEventListener("click", async () => {
  const verifyForm = document.querySelector('[data-auth-form="verify"]');
  const identity = verifyForm.elements.identity.value.trim() || state.activeIdentity || state.customer?.email || state.customer?.username;

  if (!identity) {
    setStatus("اكتب الإيميل أو اسم المستخدم الأول.", "error");
    return;
  }

  setStatus("بنرسل كود جديد...", "loading");

  try {
    const result = await accountRequest({ action: "resendVerification", identity });
    prefillIdentity(identity);
    setStatus(result.message, "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
});

logoutButton.addEventListener("click", () => {
  saveCustomer(null);
  prefillIdentity("");
  renderCustomer();
  openScreen("login-identity");
  setStatus("تم تسجيل الخروج.", "success");
});

loadProducts().finally(() => {
  renderCartSummary();
  renderCustomer();
  prefillIdentity(state.customer?.email || state.customer?.username || "");

  if (state.customer && !state.customer.email_verified_at) {
    openScreen("verify");
    setStatus("الحساب مسجل، باقي تأكيد الإيميل.", "warning");
    return;
  }

  openScreen("login-identity");
});
