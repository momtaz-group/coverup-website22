const whatsappNumber = "201050310516";

const defaultProducts = [
  {
    id: "carbon-slide-camera-case",
    name: "كفر Carbon Slide Camera",
    category: "كفرات",
    price: 449,
    image: "assets/products/carbon-slide-camera-case.jpeg",
    badge: "Premium",
    description: "كفر شكل كاربون مع حماية متحركة لمنطقة الكاميرا.",
  },
  {
    id: "orange-leopard-camera-case",
    name: "كفر Leopard Orange",
    category: "كفرات",
    price: 399,
    image: "assets/products/orange-leopard-camera-case.jpeg",
    badge: "ستايل",
    description: "كفر ليوبارد بلون برتقالي مع حماية بارزة للكاميرا.",
  },
  {
    id: "samsung-clear-shockproof-case",
    name: "كفر Samsung Clear Shockproof",
    category: "كفرات",
    price: 299,
    image: "assets/products/samsung-clear-shockproof-case.jpeg",
    badge: "شفاف",
    description: "كفر شفاف لسامسونج بحماية جوانب وظهر ضد الخدوش.",
  },
  {
    id: "black-magsafe-fabric-case",
    name: "كفر MagSafe Fabric أسود",
    category: "كفرات MagSafe",
    price: 549,
    image: "assets/products/black-magsafe-fabric-case.jpeg",
    badge: "MagSafe",
    description: "كفر قماش بإحساس Premium ودائرة MagSafe للحوامل والشواحن.",
  },
  {
    id: "tempered-glass-screen-protector",
    name: "اسكرينة Tempered Glass",
    category: "حماية الشاشة",
    price: 199,
    image: "assets/products/tempered-glass-screen-protector.jpeg",
    badge: "حماية",
    description: "اسكرينة زجاج حراري لحماية الشاشة من الخدوش والصدمات.",
  },
  {
    id: "navy-apple-fabric-case",
    name: "كفر iPhone Fabric Navy",
    category: "كفرات",
    price: 499,
    image: "assets/products/navy-apple-fabric-case.jpeg",
    badge: "أنيق",
    description: "كفر قماش أزرق بإحساس ناعم وشكل مناسب للاستخدام اليومي.",
  },
  {
    id: "black-full-glue-screen-protector",
    name: "اسكرينة Full Glue Black",
    category: "حماية الشاشة",
    price: 249,
    image: "assets/products/black-full-glue-screen-protector.jpeg",
    badge: "Full Glue",
    description: "اسكرينة كاملة الحواف بلون أسود لتغطية الشاشة بالكامل.",
  },
  {
    id: "privacy-screen-protector",
    name: "اسكرينة Privacy",
    category: "حماية الشاشة",
    price: 299,
    image: "assets/products/privacy-screen-protector.jpeg",
    badge: "Privacy",
    description: "حماية شاشة بفلتر خصوصية يقلل الرؤية من الجوانب.",
  },
  {
    id: "brown-magsafe-fabric-case",
    name: "كفر MagSafe Fabric بني",
    category: "كفرات MagSafe",
    price: 549,
    image: "assets/products/brown-magsafe-fabric-case.jpeg",
    badge: "Premium",
    description: "كفر قماش بني بدائرة MagSafe وشكل رسمي نضيف.",
  },
];

let products = [...defaultProducts];

const formatter = new Intl.NumberFormat("ar-EG", {
  style: "currency",
  currency: "EGP",
  maximumFractionDigits: 0,
});

const state = {
  search: "",
  category: "الكل",
  cart: readCartState(),
  customer: JSON.parse(localStorage.getItem("coverup-customer") || "null"),
};

const grid = document.querySelector("[data-products-grid]");
const searchInput = document.querySelector("[data-product-search]");
const filters = document.querySelector("[data-category-filters]");
const emptyState = document.querySelector("[data-empty-state]");
const countNode = document.querySelector("[data-products-count]");
const cartDrawer = document.querySelector("[data-cart-drawer]");
const cartItems = document.querySelector("[data-cart-items]");
const cartTotal = document.querySelector("[data-cart-total]");
const cartCount = document.querySelector("[data-cart-count]");
const cartItemsTotal = document.querySelector("[data-cart-items-total]");
const cartSubtotal = document.querySelector("[data-cart-subtotal]");
const accountDrawer = document.querySelector("[data-account-drawer]");
const accountLabel = document.querySelector("[data-account-label]");
const accountSummary = document.querySelector("[data-account-summary]");
const accountStatus = document.querySelector("[data-account-status]");
const accountLogout = document.querySelector("[data-account-logout]");
const loginAccountForm = document.querySelector("[data-login-account-form]");
const registerAccountForm = document.querySelector("[data-register-account-form]");
const forgotAccountForm = document.querySelector("[data-forgot-account-form]");
const cartAccountLine = document.querySelector("[data-cart-account-line]");
const checkoutLink = document.querySelector("[data-checkout-link]");
const checkoutForm = document.querySelector("[data-checkout-form]");
const paymentButton = document.querySelector("[data-pay-online]");
const paymentMessage = document.querySelector("[data-payment-message]");
const familyForm = document.querySelector("[data-family-form]");
const phoneCountInput = document.querySelector("[data-phone-count]");
const timeSlots = document.querySelector("[data-time-slots]");
const deviceList = document.querySelector("[data-device-list]");
const reviewForm = document.querySelector("[data-review-form]");
const complaintForm = document.querySelector("[data-complaint-form]");
const chatForm = document.querySelector("[data-chat-form]");
const chatLog = document.querySelector("[data-chat-log]");
const menuToggle = document.querySelector(".menu-toggle");
const header = document.querySelector(".site-header");
const year = document.querySelector("[data-year]");

year.textContent = new Date().getFullYear();

const visitDateInput = familyForm.querySelector('input[name="visitDate"]');
visitDateInput.min = new Date().toISOString().slice(0, 10);

async function loadDashboardProducts() {
  try {
    const response = await fetch("/api/store-products");
    if (!response.ok) {
      return;
    }

    const data = await response.json();
    if (Array.isArray(data.products) && data.products.length) {
      products = data.products;
    }
  } catch {
    products = [...defaultProducts];
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

function readCartState() {
  const raw = JSON.parse(localStorage.getItem("coverup-cart-v2") || localStorage.getItem("coverup-cart") || "{}");

  return Object.entries(raw).reduce((accumulator, [id, item]) => {
    if (typeof item === "number" && item > 0) {
      accumulator[id] = { quantity: item, snapshot: null };
      return accumulator;
    }

    if (item && typeof item === "object" && Number(item.quantity) > 0) {
      accumulator[id] = {
        quantity: Number(item.quantity),
        snapshot: item.snapshot && typeof item.snapshot === "object" ? item.snapshot : null,
      };
    }

    return accumulator;
  }, {});
}

function productSnapshot(product) {
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    price: Number(product.price) || 0,
    image: product.image || "",
    badge: product.badge || "",
  };
}

function syncCartSnapshots() {
  Object.entries(state.cart).forEach(([id, item]) => {
    const product = products.find((entry) => entry.id === id);
    if (product) {
      item.snapshot = productSnapshot(product);
    }
  });
  saveCart();
}

function saveCustomer(customer) {
  state.customer = customer;
  if (customer) {
    localStorage.setItem("coverup-customer", JSON.stringify(customer));
  } else {
    localStorage.removeItem("coverup-customer");
  }
}

function escapeText(value) {
  return String(value || "").replace(/[<>&"]/g, (char) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    '"': "&quot;",
  }[char]));
}

function productImage(product) {
  if (product.image) {
    return `<img src="${product.image}" alt="${product.name}" loading="lazy" />`;
  }

  return `<div class="product-placeholder" aria-hidden="true"><bdi>Cover Up</bdi></div>`;
}

function productMatches(product) {
  const query = state.search.trim().toLowerCase();
  const categoryMatch = state.category === "الكل" || product.category === state.category;
  const searchMatch =
    !query ||
    product.name.toLowerCase().includes(query) ||
    product.category.toLowerCase().includes(query) ||
    product.description.toLowerCase().includes(query);

  return categoryMatch && searchMatch;
}

function renderFilters() {
  countNode.textContent = products.length;
  const categories = ["الكل", ...new Set(products.map((product) => product.category))];
  filters.innerHTML = categories
    .map(
      (category) => `
        <button class="filter-chip${category === state.category ? " is-active" : ""}" type="button" data-category="${category}">
          ${category}
        </button>
      `,
    )
    .join("");
}

async function postEvent(payload) {
  try {
    const response = await fetch("/api/store-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
    return response.ok;
  } catch {
    // Keep the customer flow working even if storage is not configured yet.
    return false;
  }
}

function renderProducts() {
  const visibleProducts = products.filter(productMatches);

  grid.innerHTML = visibleProducts
    .map(
      (product) => `
        <article class="catalog-card">
          <div class="catalog-image">
            ${productImage(product)}
          </div>
          <div class="catalog-copy">
            <span>${product.badge}</span>
            <h2>${product.name}</h2>
            <p>${product.description}</p>
          </div>
          <div class="catalog-bottom">
            <strong>${formatter.format(product.price)}</strong>
            <button type="button" data-add-product="${product.id}">ضيف للسلة</button>
          </div>
        </article>
      `,
    )
    .join("");

  emptyState.hidden = visibleProducts.length > 0;
}

function checkoutData() {
  const data = new FormData(checkoutForm);
  return {
    name: data.get("name")?.trim() || state.customer?.name || "",
    phone: data.get("phone")?.trim() || state.customer?.phone || "",
    email: state.customer?.email || "",
    username: state.customer?.username || "",
    address: data.get("address")?.trim() || state.customer?.address || "",
  };
}

function cartEntries() {
  return Object.entries(state.cart)
    .map(([id, item]) => {
      const product = products.find((entry) => entry.id === id);
      const snapshot = item.snapshot || null;
      const resolved = product ? productSnapshot(product) : snapshot;

      if (!resolved) {
        return {
          product: {
            id,
            name: "منتج محفوظ في السلة",
            category: "منتجات",
            price: 0,
            image: "",
            badge: "غير متاح",
          },
          quantity: item.quantity,
          unavailable: true,
        };
      }

      return {
        product: resolved,
        quantity: item.quantity,
        unavailable: !product,
      };
    })
    .filter(Boolean);
}

function renderCart() {
  const entries = cartEntries();
  const totalQuantity = entries.reduce((sum, entry) => sum + entry.quantity, 0);
  const total = entries.reduce((sum, entry) => sum + entry.product.price * entry.quantity, 0);

  cartCount.textContent = totalQuantity;
  cartItemsTotal.textContent = totalQuantity;
  cartSubtotal.textContent = formatter.format(total);
  cartTotal.textContent = formatter.format(total);
  cartAccountLine.innerHTML = state.customer
    ? `الطلب باسم <strong>${escapeText(state.customer.name)}</strong> - ${escapeText(state.customer.phone)}`
    : `سجل دخولك عشان بياناتك تتسجل تلقائيًا وتظهر طلباتك في حسابك.`;

  if (entries.length === 0) {
    cartItems.innerHTML = `
      <div class="empty-cart">
        <strong>السلة فاضية حاليًا.</strong>
        <span>ابدأ من المتجر أو سجل دخولك عشان نجهز طلبك أسرع.</span>
      </div>
    `;
    checkoutLink.href = `https://wa.me/${whatsappNumber}`;
    paymentButton.disabled = true;
    return;
  }

  paymentButton.disabled = false;

  cartItems.innerHTML = entries
    .map(
      ({ product, quantity }) => `
        <article class="cart-item">
          <div class="cart-item-media">
            ${product.image ? `<img src="${product.image}" alt="" />` : `<span>CU</span>`}
          </div>
          <div class="cart-item-details">
            <strong>${escapeText(product.name)}</strong>
            <span>${formatter.format(product.price)} × ${quantity}</span>
            <small>${formatter.format(product.price * quantity)}</small>
            ${unavailable ? '<small>المنتج اتغير في المتجر لكنه ما زال محفوظ في السلة الحالية.</small>' : ""}
            <div class="cart-item-controls">
              <div class="quantity-control">
                <button type="button" data-decrease="${product.id}" aria-label="قلل ${product.name}">−</button>
                <span>${quantity}</span>
                <button type="button" data-increase="${product.id}" aria-label="زود ${product.name}">+</button>
              </div>
              <button class="remove-cart-item" type="button" data-remove="${product.id}">إلغاء</button>
            </div>
          </div>
        </article>
      `,
    )
    .join("");

  const lines = entries.map(
    ({ product, quantity }) =>
      `- ${product.name} × ${quantity} = ${formatter.format(product.price * quantity)}`,
  );
  const customer = checkoutData();
  const customerLines = [
    customer.name ? `الاسم: ${customer.name}` : "",
    customer.phone ? `الموبايل: ${customer.phone}` : "",
    customer.address ? `العنوان: ${customer.address}` : "",
  ].filter(Boolean);
  const message = [
    "طلب جديد من موقع Cover Up:",
    ...customerLines,
    ...lines,
    `الإجمالي: ${formatter.format(total)}`,
  ].join("\n");
  checkoutLink.href = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}

function currentOrderPayload(channel) {
  const entries = cartEntries();
  const total = entries.reduce((sum, entry) => sum + entry.product.price * entry.quantity, 0);

  return {
    type: "order",
    channel,
    customerId: state.customer?.id || "",
    customer: checkoutData(),
    total,
    items: entries.map(({ product, quantity }) => ({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity,
    })),
  };
}

function openCart() {
  prefillCheckoutFromCustomer();
  cartDrawer.classList.add("is-open");
  cartDrawer.setAttribute("aria-hidden", "false");
}

function closeCart() {
  cartDrawer.classList.remove("is-open");
  cartDrawer.setAttribute("aria-hidden", "true");
}

function openAccount() {
  renderAccount();
  accountDrawer.classList.add("is-open");
  accountDrawer.setAttribute("aria-hidden", "false");
}

function closeAccount() {
  accountDrawer.classList.remove("is-open");
  accountDrawer.setAttribute("aria-hidden", "true");
}

function setAccountTab(tab) {
  document.querySelectorAll("[data-account-tab]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.accountTab === tab);
  });

  loginAccountForm.classList.toggle("is-active", tab === "login");
  registerAccountForm.classList.toggle("is-active", tab === "register");
  forgotAccountForm.classList.toggle("is-active", tab === "forgot");
  accountStatus.textContent = "";
}

function renderAccount() {
  accountLabel.textContent = state.customer ? state.customer.name.split(" ")[0] : "دخول";
  accountLogout.hidden = !state.customer;
  accountSummary.hidden = !state.customer;
  accountSummary.innerHTML = state.customer
    ? `
        <strong>${escapeText(state.customer.name)}</strong>
        <span>${escapeText(state.customer.phone)} - ${escapeText(state.customer.email)}</span>
        <small>${escapeText(state.customer.address || "العنوان غير مكتمل")}</small>
      `
    : "";
  prefillCheckoutFromCustomer();
  renderCart();
}

function prefillCheckoutFromCustomer() {
  if (!state.customer) {
    return;
  }

  const nameInput = checkoutForm.elements.name;
  const phoneInput = checkoutForm.elements.phone;
  const addressInput = checkoutForm.elements.address;
  if (nameInput && !nameInput.value) nameInput.value = state.customer.name || "";
  if (phoneInput && !phoneInput.value) phoneInput.value = state.customer.phone || "";
  if (addressInput && !addressInput.value) addressInput.value = state.customer.address || "";

  const familyName = familyForm.elements.customerName;
  const familyPhone = familyForm.elements.customerPhone;
  const familyAddress = familyForm.elements.address;
  if (familyName && !familyName.value) familyName.value = state.customer.name || "";
  if (familyPhone && !familyPhone.value) familyPhone.value = state.customer.phone || "";
  if (familyAddress && !familyAddress.value) familyAddress.value = state.customer.address || "";
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

function renderTimeSlots() {
  const slots = [];
  for (let hour = 10; hour <= 22; hour += 1) {
    const labelHour = hour > 12 ? hour - 12 : hour;
    const period = hour < 12 ? "صباحًا" : "مساءً";
    slots.push(`${labelHour}:00 ${period}`);
    if (hour < 22) {
      slots.push(`${labelHour}:30 ${period}`);
    }
  }

  timeSlots.innerHTML = slots
    .map((slot) => `<option value="${slot}">${slot}</option>`)
    .join("");
}

function renderDeviceRows() {
  const count = Math.max(1, Math.min(8, Number(phoneCountInput.value) || 1));
  const productOptions = products
    .map((product) => `<option value="${product.name}">${product.name} - ${formatter.format(product.price)}</option>`)
    .join("");

  deviceList.innerHTML = Array.from({ length: count }, (_, index) => {
    const number = index + 1;
    return `
      <fieldset class="device-card">
        <legend>تليفون ${number}</legend>
        <label>
          نوع الجهاز
          <input name="deviceModel${number}" type="text" placeholder="مثال: iPhone 15 Pro Max / Samsung S24 Ultra" required />
        </label>
        <label>
          المطلوب
          <select name="deviceNeed${number}" required>
            <option value="كفر فقط">كفر فقط</option>
            <option value="اسكرينة فقط">اسكرينة فقط</option>
            <option value="كفر + اسكرينة">كفر + اسكرينة</option>
            <option value="اختيارات متعددة">اختيارات متعددة</option>
          </select>
        </label>
        <label>
          اختيار من المنتجات
          <select name="deviceProduct${number}">
            <option value="يرشحلي المندوب الأنسب">يرشحلي المندوب الأنسب</option>
            ${productOptions}
          </select>
        </label>
      </fieldset>
    `;
  }).join("");
}

function familyVisitMessage(form) {
  const data = new FormData(form);
  const count = Math.max(1, Math.min(8, Number(data.get("phoneCount")) || 1));
  const devices = [];

  for (let index = 1; index <= count; index += 1) {
    devices.push(
      `${index}. ${data.get(`deviceModel${index}`)} - ${data.get(`deviceNeed${index}`)} - ${data.get(`deviceProduct${index}`)}`,
    );
  }

  return [
    "طلب مندوب Cover Up للعيلة:",
    `الاسم: ${data.get("customerName")}`,
    `الموبايل: ${data.get("customerPhone")}`,
    `عدد التليفونات: ${count}`,
    `يوم الزيارة: ${data.get("visitDate")}`,
    `وقت الزيارة: ${data.get("visitTime")}`,
    `العنوان: ${data.get("address")}`,
    data.get("locationLink") ? `لينك اللوكيشن: ${data.get("locationLink")}` : "",
    "تفاصيل الأجهزة:",
    ...devices,
    data.get("notes") ? `ملاحظات: ${data.get("notes")}` : "",
  ].filter(Boolean).join("\n");
}

async function payOnline() {
  const entries = cartEntries();
  const total = entries.reduce((sum, entry) => sum + entry.product.price * entry.quantity, 0);
  const customer = checkoutData();

  if (!entries.length) {
    paymentMessage.textContent = "ضيف منتجات للسلة الأول.";
    return;
  }

  paymentButton.disabled = true;
  paymentMessage.textContent = "بنجهز صفحة الدفع الآمنة...";

  try {
    await postEvent(currentOrderPayload("online-payment-attempt"));

    const response = await fetch("/api/create-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer,
        amount: total,
        items: entries.map(({ product, quantity }) => ({
          id: product.id,
          name: product.name,
          price: product.price,
          quantity,
        })),
      }),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "الدفع الإلكتروني غير متاح حاليًا.");
    }

    window.location.href = data.checkoutUrl;
  } catch (error) {
    paymentMessage.textContent = `${error.message} تقدر تكمل الطلب على واتساب حاليًا.`;
    paymentButton.disabled = false;
  }
}

function scriptedReply(message) {
  const text = message.toLowerCase();

  if (text.includes("مندوب") || text.includes("العيلة") || text.includes("بيت")) {
    return "ينفع تطلب مندوب للعيلة من نفس الصفحة. اختار عدد التليفونات، نوع كل جهاز، المنتجات المطلوبة، العنوان، لينك اللوكيشن، والوقت من 10 صباحًا لـ 10 مساءً.";
  }

  if (text.includes("اسكرين") || text.includes("حماية") || text.includes("screen")) {
    return "عندنا اسكرينات Privacy وFull Glue وTempered Glass. اختار نوع جهازك ولو مش متأكد سيب للمندوب يرشح الأنسب.";
  }

  if (text.includes("كفر") || text.includes("case") || text.includes("magsafe")) {
    return "المتاح حاليًا كفرات Shockproof وMagSafe وFabric وCamera Slide. تقدر تستخدم البحث أو الفلاتر في المتجر.";
  }

  if (text.includes("دفع") || text.includes("فيزا") || text.includes("payment")) {
    return "الدفع الإلكتروني جاهز للربط عبر Paymob، ولحد التفعيل النهائي تقدر تكمل الطلب واتساب أو تدفع عند الاستلام حسب التأكيد.";
  }

  if (text.includes("معاد") || text.includes("وقت") || text.includes("مواعيد")) {
    return "مواعيد الزيارات من 10 صباحًا لـ 10 مساءً كل يوم. اختار الوقت المناسب من فورمة مندوب العيلة.";
  }

  return "تمام، ابعت لنا نوع جهازك والمنتج اللي محتاجه، أو استخدم فورمة مندوب العيلة لو عندك أكتر من تليفون. فريق Cover Up هيتابع معاك على واتساب.";
}

function appendChatLine(name, message) {
  const line = document.createElement("p");
  line.innerHTML = `<strong>${name}:</strong> ${message.replace(/[<>]/g, "")}`;
  chatLog.append(line);
  chatLog.scrollTop = chatLog.scrollHeight;
}

document.addEventListener("click", (event) => {
  const addId = event.target.closest("[data-add-product]")?.dataset.addProduct;
  const increaseId = event.target.closest("[data-increase]")?.dataset.increase;
  const decreaseId = event.target.closest("[data-decrease]")?.dataset.decrease;
  const removeId = event.target.closest("[data-remove]")?.dataset.remove;
  const category = event.target.closest("[data-category]")?.dataset.category;

  if (addId) {
    const product = products.find((entry) => entry.id === addId);
    const current = state.cart[addId] || { quantity: 0, snapshot: product ? productSnapshot(product) : null };
    current.quantity += 1;
    if (product) current.snapshot = productSnapshot(product);
    state.cart[addId] = current;
    saveCart();
    renderCart();
    openCart();
  }

  if (increaseId) {
    const product = products.find((entry) => entry.id === increaseId);
    const current = state.cart[increaseId] || { quantity: 0, snapshot: product ? productSnapshot(product) : null };
    current.quantity += 1;
    if (product) current.snapshot = productSnapshot(product);
    state.cart[increaseId] = current;
    saveCart();
    renderCart();
  }

  if (decreaseId) {
    if (!state.cart[decreaseId]) {
      return;
    }
    state.cart[decreaseId].quantity -= 1;
    if (state.cart[decreaseId].quantity <= 0) {
      delete state.cart[decreaseId];
    }
    saveCart();
    renderCart();
  }

  if (removeId) {
    delete state.cart[removeId];
    saveCart();
    renderCart();
  }

  if (category) {
    state.category = category;
    renderFilters();
    renderProducts();
  }
});

document.querySelectorAll("[data-cart-open]").forEach((button) => {
  button.addEventListener("click", openCart);
});
document.querySelector("[data-cart-close]").addEventListener("click", closeCart);
document.querySelectorAll("[data-account-open]").forEach((button) => {
  button.addEventListener("click", openAccount);
});
document.querySelector("[data-account-close]").addEventListener("click", closeAccount);
document.querySelector("[data-continue-shopping]").addEventListener("click", closeCart);
document.querySelector("[data-go-account]").addEventListener("click", () => {
  closeCart();
});
paymentButton.addEventListener("click", payOnline);
checkoutForm.addEventListener("input", renderCart);
phoneCountInput.addEventListener("input", renderDeviceRows);
checkoutLink.addEventListener("click", () => {
  postEvent(currentOrderPayload("whatsapp"));
});

document.querySelectorAll("[data-account-tab]").forEach((button) => {
  button.addEventListener("click", () => setAccountTab(button.dataset.accountTab));
});

loginAccountForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  accountStatus.textContent = "بنتحقق من بياناتك...";
  try {
    const data = Object.fromEntries(new FormData(loginAccountForm));
    const result = await accountRequest({ action: "login", ...data });
    saveCustomer(result.customer);
    accountStatus.textContent = "تم تسجيل الدخول.";
    renderAccount();
    closeAccount();
  } catch (error) {
    accountStatus.textContent = error.message;
  }
});

registerAccountForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  accountStatus.textContent = "بنجهز حسابك...";
  try {
    const data = Object.fromEntries(new FormData(registerAccountForm));
    const result = await accountRequest({ action: "register", ...data });
    saveCustomer(result.customer);
    registerAccountForm.reset();
    accountStatus.textContent = "حسابك اتعمل واتسجل دخولك.";
    renderAccount();
    closeAccount();
  } catch (error) {
    accountStatus.textContent = error.message;
  }
});

forgotAccountForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  accountStatus.textContent = "بنراجع الحساب...";
  try {
    const data = Object.fromEntries(new FormData(forgotAccountForm));
    const result = await accountRequest({ action: "forgotPassword", ...data });
    forgotAccountForm.reset();
    accountStatus.textContent = result.message;
  } catch (error) {
    accountStatus.textContent = error.message;
  }
});

accountLogout.addEventListener("click", () => {
  saveCustomer(null);
  accountStatus.textContent = "تم تسجيل الخروج.";
  setAccountTab("login");
  renderAccount();
});

familyForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const message = familyVisitMessage(familyForm);
  postEvent({
    type: "order",
    channel: "family-visit",
    customerId: state.customer?.id || "",
    customer: {
      name: new FormData(familyForm).get("customerName"),
      phone: new FormData(familyForm).get("customerPhone"),
      email: state.customer?.email || "",
      username: state.customer?.username || "",
      address: new FormData(familyForm).get("address"),
    },
    total: 0,
    items: [{ name: "طلب مندوب العيلة", quantity: 1, price: 0, details: message }],
  });
  window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, "_blank", "noopener");
});

reviewForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(reviewForm));
  const saved = await postEvent({ type: "review", ...data });
  reviewForm.reset();
  document.querySelector("[data-review-status]").textContent = saved
    ? "تم استلام التقييم، شكرًا لوقتك."
    : "التقييم اتكتب، لكن حفظه في الداشبورد محتاج تفعيل التخزين.";
});

complaintForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(complaintForm));
  const saved = await postEvent({ type: "complaint", ...data });
  complaintForm.reset();
  document.querySelector("[data-complaint-status]").textContent = saved
    ? "تم تسجيل الشكوى، هنراجعها ونتواصل معاك."
    : "الشكوى اتكتبت، لكن حفظها في الداشبورد محتاج تفعيل التخزين.";
});

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(chatForm);
  const message = String(form.get("message") || "").trim();
  if (!message) {
    return;
  }

  const reply = scriptedReply(message);
  appendChatLine("أنت", message);
  appendChatLine("Cover Up", reply);
  const saved = await postEvent({
    type: "chat",
    message,
    reply,
    transcript: Array.from(chatLog.querySelectorAll("p")).map((line) => line.textContent.trim()),
  });
  chatForm.reset();
  document.querySelector("[data-chat-status]").textContent = saved
    ? "تم حفظ المحادثة للمتابعة."
    : "الشات شغال، لكن حفظه في الداشبورد محتاج تفعيل التخزين.";
});

cartDrawer.addEventListener("click", (event) => {
  if (event.target === cartDrawer) {
    closeCart();
  }
});

accountDrawer.addEventListener("click", (event) => {
  if (event.target === accountDrawer) {
    closeAccount();
  }
});

searchInput.addEventListener("input", (event) => {
  state.search = event.target.value;
  renderProducts();
});

menuToggle.addEventListener("click", () => {
  const isOpen = header.classList.toggle("menu-open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
});

async function init() {
  await loadDashboardProducts();
  syncCartSnapshots();
  renderFilters();
  renderTimeSlots();
  renderDeviceRows();
  renderProducts();
  renderCart();
  renderAccount();
}

init();
