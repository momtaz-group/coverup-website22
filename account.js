const formatter = new Intl.NumberFormat("ar-EG", {
  style: "currency",
  currency: "EGP",
  maximumFractionDigits: 0,
});

const state = {
  customer: JSON.parse(localStorage.getItem("coverup-customer") || "null"),
  cart: readCart(),
  products: [],
};

const header = document.querySelector(".site-header");
const menuToggle = document.querySelector(".menu-toggle");
const accountBadge = document.querySelector("[data-account-badge]");
const cartBadge = document.querySelector("[data-cart-badge]");
const heroName = document.querySelector("[data-account-hero-name]");
const heroEmail = document.querySelector("[data-account-hero-email]");
const heroStatus = document.querySelector("[data-account-hero-status]");
const customerCard = document.querySelector("[data-customer-card]");
const authStatus = document.querySelector("[data-auth-status]");
const logoutButton = document.querySelector("[data-logout-account]");
const cartList = document.querySelector("[data-account-cart-list]");
const cartTotal = document.querySelector("[data-account-cart-total]");

function escapeText(value) {
  return String(value || "").replace(/[<>&"]/g, (char) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    '"': "&quot;",
  }[char]));
}

function readCart() {
  const raw = JSON.parse(localStorage.getItem("coverup-cart-v2") || localStorage.getItem("coverup-cart") || "{}");
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
    localStorage.setItem("coverup-customer", JSON.stringify(customer));
  } else {
    localStorage.removeItem("coverup-customer");
  }
}

function saveCart() {
  localStorage.setItem("coverup-cart-v2", JSON.stringify(state.cart));
  localStorage.setItem(
    "coverup-cart",
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
    if (Array.isArray(data.products)) {
      state.products = data.products;
      Object.entries(state.cart).forEach(([id, item]) => {
        const product = state.products.find((entry) => entry.id === id);
        if (product) {
          item.snapshot = productSnapshot(product);
        }
      });
      saveCart();
    }
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

function renderCartSummary() {
  const entries = cartEntries();
  const totalQuantity = entries.reduce((sum, entry) => sum + entry.quantity, 0);
  const total = entries.reduce((sum, entry) => sum + entry.price * entry.quantity, 0);

  cartBadge.textContent = totalQuantity;
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
    : `<p class="empty-cart">السلة فاضية حاليًا. اختار منتجات من المتجر.</p>`;
}

function renderCustomer() {
  accountBadge.textContent = state.customer ? state.customer.name.split(" ")[0] : "الدخول";
  logoutButton.hidden = !state.customer;

  if (!state.customer) {
    heroName.textContent = "ضيف";
    heroEmail.textContent = "سجل دخولك أو اعمل حساب جديد.";
    heroStatus.textContent = "بعد التفعيل، حالة الإيميل وبيانات الحساب هيظهروا هنا.";
    customerCard.innerHTML = `
      <h2>بيانات الحساب</h2>
      <p class="muted-text">مفيش حساب مسجل حاليًا. اعمل حساب أو ادخل ببياناتك، وبعدها هتظهر هنا تفاصيل العميل وربطها بالسلة والطلبات.</p>
    `;
    return;
  }

  const verified = Boolean(state.customer.email_verified_at);
  heroName.textContent = state.customer.name;
  heroEmail.textContent = state.customer.email;
  heroStatus.textContent = verified ? "الإيميل مؤكد." : "الإيميل غير مؤكد، أدخل كود التفعيل من تبويب تأكيد الإيميل.";
  customerCard.innerHTML = `
    <h2>بيانات الحساب</h2>
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

function setTab(tab) {
  document.querySelectorAll("[data-auth-tab]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.authTab === tab);
  });

  document.querySelectorAll("[data-auth-form]").forEach((form) => {
    form.classList.toggle("is-active", form.dataset.authForm === tab);
  });
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

document.querySelectorAll("[data-auth-tab]").forEach((button) => {
  button.addEventListener("click", () => {
    authStatus.textContent = "";
    setTab(button.dataset.authTab);
  });
});

document.querySelector('[data-auth-form="login"]').addEventListener("submit", async (event) => {
  event.preventDefault();
  authStatus.textContent = "بنراجع بيانات الدخول...";
  try {
    const payload = Object.fromEntries(new FormData(event.currentTarget));
    payload.action = "login";
    const result = await accountRequest(payload);
    saveCustomer(result.customer);
    renderCustomer();
    authStatus.textContent = result.requiresEmailVerification
      ? "تم تسجيل الدخول. باقي تأكيد الإيميل."
      : "تم تسجيل الدخول بنجاح.";
  } catch (error) {
    authStatus.textContent = error.message;
  }
});

document.querySelector('[data-auth-form="register"]').addEventListener("submit", async (event) => {
  event.preventDefault();
  authStatus.textContent = "بننشئ الحساب...";
  try {
    const payload = Object.fromEntries(new FormData(event.currentTarget));
    payload.action = "register";
    const result = await accountRequest(payload);
    saveCustomer(result.customer);
    renderCustomer();
    setTab("verify");
    authStatus.textContent = result.emailDeliveryReady
      ? "الحساب اتعمل وكود التأكيد اتبعت على الإيميل."
      : "الحساب اتعمل، لكن خدمة الإيميل الرسمي محتاجة تفعيل عشان الكود يوصل.";
    event.currentTarget.reset();
  } catch (error) {
    authStatus.textContent = error.message;
  }
});

document.querySelector('[data-auth-form="forgot"]').addEventListener("submit", async (event) => {
  event.preventDefault();
  authStatus.textContent = "بنراجع طلب الاسترجاع...";
  try {
    const payload = Object.fromEntries(new FormData(event.currentTarget));
    payload.action = "forgotPassword";
    const result = await accountRequest(payload);
    authStatus.textContent = result.message;
    event.currentTarget.reset();
  } catch (error) {
    authStatus.textContent = error.message;
  }
});

document.querySelector('[data-auth-form="verify"]').addEventListener("submit", async (event) => {
  event.preventDefault();
  authStatus.textContent = "بنتأكد من الكود...";
  try {
    const payload = Object.fromEntries(new FormData(event.currentTarget));
    payload.action = "verifyEmail";
    const result = await accountRequest(payload);
    saveCustomer(result.customer);
    renderCustomer();
    authStatus.textContent = "تم تأكيد الإيميل بنجاح.";
  } catch (error) {
    authStatus.textContent = error.message;
  }
});

document.querySelector("[data-resend-code]").addEventListener("click", async () => {
  const activeCustomerIdentity = state.customer?.email || state.customer?.username;
  const verifyForm = document.querySelector('[data-auth-form="verify"]');
  const identityInput = verifyForm.elements.identity;
  const identity = identityInput.value.trim() || activeCustomerIdentity;

  if (!identity) {
    authStatus.textContent = "اكتب الإيميل أو اسم المستخدم الأول.";
    return;
  }

  authStatus.textContent = "بنرسل كود جديد...";
  try {
    const result = await accountRequest({ action: "resendVerification", identity });
    authStatus.textContent = result.message;
  } catch (error) {
    authStatus.textContent = error.message;
  }
});

logoutButton.addEventListener("click", () => {
  saveCustomer(null);
  renderCustomer();
  authStatus.textContent = "تم تسجيل الخروج.";
  setTab("login");
});

menuToggle.addEventListener("click", () => {
  const isOpen = header.classList.toggle("menu-open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
});

loadProducts().finally(() => {
  renderCartSummary();
  renderCustomer();
});
