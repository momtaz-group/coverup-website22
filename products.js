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
const recentOrdersStorageKey = "coverup-recent-orders";

const state = {
  search: "",
  category: "الكل",
  model: "الكل",
  wishlist: JSON.parse(localStorage.getItem("coverup-wishlist") || "[]"),
  cart: readCartState(),
  customer: JSON.parse(localStorage.getItem("coverup-customer") || "null"),
};

const grid = document.querySelector("[data-products-grid]");
const searchInput = document.querySelector("[data-product-search]");
const modelFilter = document.querySelector("[data-model-filter]");
const filters = document.querySelector("[data-category-filters]");
const wishlistGrid = document.querySelector("[data-wishlist-grid]");
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
const faqList = document.querySelector("[data-faq-list]");
const trackOrderForm = document.querySelector("[data-track-order-form]");
const trackingResult = document.querySelector("[data-tracking-result]");
const reviewProductSelect = document.querySelector("[data-review-product-select]");
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

async function loadSessionCustomer() {
  try {
    const response = await fetch("/api/customer-session");
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      saveCustomer(data.customer || null);
    }
  } catch {
    // Keep local fallback for rendering until the next successful auth sync.
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

function saveWishlist() {
  localStorage.setItem("coverup-wishlist", JSON.stringify(state.wishlist));
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
    stock_quantity: Number(product.stock_quantity || 0),
    is_in_stock: product.is_in_stock !== false,
  };
}

function availableStock(product) {
  const quantity = Number(product?.stock_quantity || 0);
  return quantity > 0 ? quantity : Number.POSITIVE_INFINITY;
}

function canSellProduct(product) {
  return Boolean(product) && product.is_in_stock !== false;
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

function saveRecentOrder(order) {
  if (!order?.id) {
    return;
  }

  const recent = JSON.parse(localStorage.getItem(recentOrdersStorageKey) || "[]");
  const next = [
    {
      id: order.id,
      phone: order.customer?.phone || "",
      status: order.status || "",
      payment_status: order.payment_status || "",
      grand_total: Number(order.grand_total || 0),
      created_at: order.created_at || new Date().toISOString(),
    },
    ...recent.filter((item) => item.id !== order.id),
  ].slice(0, 20);

  localStorage.setItem(recentOrdersStorageKey, JSON.stringify(next));
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
  const modelMatch =
    state.model === "الكل" ||
    (Array.isArray(product.compatible_models) && product.compatible_models.includes(state.model));
  const searchMatch =
    !query ||
    product.name.toLowerCase().includes(query) ||
    product.category.toLowerCase().includes(query) ||
    product.description.toLowerCase().includes(query) ||
    (Array.isArray(product.compatible_models) && product.compatible_models.join(" ").toLowerCase().includes(query));

  return categoryMatch && modelMatch && searchMatch;
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

  const models = [
    "الكل",
    ...new Set(products.flatMap((product) => Array.isArray(product.compatible_models) ? product.compatible_models : [])),
  ];
  modelFilter.innerHTML = models
    .map((model) => `<option value="${escapeText(model)}" ${state.model === model ? "selected" : ""}>${escapeText(model)}</option>`)
    .join("");

  reviewProductSelect.innerHTML = products
    .map((product) => `<option value="${escapeText(product.id)}">${escapeText(product.name)}</option>`)
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

async function api(path, options = {}) {
  const response = await fetch(path, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "حصل خطأ في الطلب.");
  }

  return data;
}

function renderProducts() {
  const visibleProducts = products.filter(productMatches);

  grid.innerHTML = visibleProducts
    .map(
      (product) => `
        <article class="catalog-card">
          <a class="catalog-image" href="product.html?id=${encodeURIComponent(product.id)}" aria-label="${escapeText(product.name)}">
            ${productImage(product)}
          </a>
          <div class="catalog-copy">
            <span>${product.badge}</span>
            <h2><a href="product.html?id=${encodeURIComponent(product.id)}">${product.name}</a></h2>
            <p>${product.description}</p>
            ${Array.isArray(product.compatible_models) && product.compatible_models.length ? `<em>${escapeText(product.compatible_models.slice(0, 3).join(" / "))}</em>` : ""}
            <small>${product.is_in_stock === false ? "نفد من المخزون" : Number(product.stock_quantity || 0) > 0 ? `${Number(product.stock_quantity || 0)} قطعة متاحة` : "متاح للطلب"}</small>
          </div>
          <div class="catalog-bottom">
            <strong>${formatter.format(product.price)}</strong>
            <button class="wishlist-button${state.wishlist.includes(product.id) ? " is-active" : ""}" type="button" data-wishlist="${product.id}" aria-label="احفظ ${escapeText(product.name)}">♡</button>
            <button type="button" data-add-product="${product.id}" ${product.is_in_stock === false ? "disabled" : ""}>
              ${product.is_in_stock === false ? "غير متاح" : "ضيف للسلة"}
            </button>
          </div>
        </article>
      `,
    )
    .join("");

  emptyState.hidden = visibleProducts.length > 0;
  renderWishlist();
}

function renderWishlist() {
  const items = state.wishlist
    .map((id) => products.find((product) => product.id === id))
    .filter(Boolean);

  wishlistGrid.innerHTML = items.length
    ? items.map((product) => `
        <article class="wishlist-card">
          ${productImage(product)}
          <div>
            <strong>${escapeText(product.name)}</strong>
            <span>${formatter.format(product.price)}</span>
          </div>
          <a href="product.html?id=${encodeURIComponent(product.id)}">التفاصيل</a>
          <button type="button" data-wishlist="${product.id}">×</button>
        </article>
      `).join("")
    : `<p class="empty-cart">لسه مفيش منتجات في المفضلة.</p>`;
}

function toggleWishlist(productId) {
  state.wishlist = state.wishlist.includes(productId)
    ? state.wishlist.filter((id) => id !== productId)
    : [...state.wishlist, productId];
  saveWishlist();
  renderProducts();
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
  const pluralLabel = totalQuantity === 1 ? "قطعة واحدة" : `${totalQuantity} قطع`;

  cartCount.textContent = totalQuantity;
  cartItemsTotal.textContent = totalQuantity;
  cartSubtotal.textContent = formatter.format(total);
  cartTotal.textContent = formatter.format(total);
  cartAccountLine.innerHTML = state.customer
    ? `<span>الطلب باسم</span><strong>${escapeText(state.customer.name)}</strong><small>${escapeText(state.customer.phone)}</small>`
    : `<span>حساب العميل</span><strong>ضيف</strong><small>سجل دخولك عشان بياناتك تتسجل تلقائيًا وتظهر طلباتك في حسابك.</small>`;

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
      ({ product, quantity, unavailable }) => `
        <article class="cart-item">
          <div class="cart-item-media">
            ${product.image ? `<img src="${product.image}" alt="" />` : `<span>CU</span>`}
          </div>
          <div class="cart-item-details">
            <div class="cart-item-head">
              <strong>${escapeText(product.name)}</strong>
              <b>${formatter.format(product.price * quantity)}</b>
            </div>
    <span class="cart-stock">${unavailable ? "محفوظ من طلب سابق" : product.stock_quantity > 0 ? `متبقي ${product.stock_quantity}` : "متاح"}</span>
            <span class="cart-unit-price">${formatter.format(product.price)} للقطعة</span>
            <div class="cart-item-controls">
              <div class="quantity-control">
                <button class="quantity-trash" type="button" data-remove="${product.id}" aria-label="احذف ${product.name}">×</button>
                <button type="button" data-decrease="${product.id}" aria-label="قلل ${product.name}">−</button>
                <span>${quantity}</span>
                <button type="button" data-increase="${product.id}" ${!unavailable && quantity >= availableStock(product) ? "disabled" : ""} aria-label="زود ${product.name}">+</button>
              </div>
              <button class="remove-cart-item" type="button" data-remove="${product.id}">حذف</button>
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
    `عدد القطع: ${pluralLabel}`,
    ...lines,
    `الإجمالي: ${formatter.format(total)}`,
  ].join("\n");
  checkoutLink.href = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}

function addCartItem(productId) {
  const product = products.find((entry) => entry.id === productId);
  if (!canSellProduct(product)) {
    paymentMessage.textContent = "المنتج ده غير متاح حاليًا.";
    return;
  }

  const current = state.cart[productId] || { quantity: 0, snapshot: product ? productSnapshot(product) : null };
  if (current.quantity >= availableStock(product)) {
    paymentMessage.textContent = "وصلت لأقصى كمية متاحة من المنتج ده.";
    return;
  }

  current.quantity += 1;
  if (product) current.snapshot = productSnapshot(product);
  state.cart[productId] = current;
  saveCart();
  renderCart();
}

function decreaseCartItem(productId) {
  if (!state.cart[productId]) {
    return;
  }

  state.cart[productId].quantity -= 1;
  if (state.cart[productId].quantity <= 0) {
    delete state.cart[productId];
  }
  saveCart();
  renderCart();
}

function removeCartItem(productId) {
  delete state.cart[productId];
  saveCart();
  renderCart();
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
  const caseOptions = products
    .filter((product) => /كفر|case|magsafe|fabric/i.test(`${product.category} ${product.name}`))
    .map((product) => `<option value="${product.name}">${product.name} - ${formatter.format(product.price)}</option>`)
    .join("");
  const screenOptions = products
    .filter((product) => /اسكرين|screen|glass|حماية/i.test(`${product.category} ${product.name}`))
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
          الكفر
          <select name="deviceCase${number}">
            <option value="يرشحلي المندوب الأنسب">يرشحلي المندوب الأنسب</option>
            ${caseOptions}
          </select>
        </label>
        <label>
          الاسكرينة
          <select name="deviceScreen${number}">
            <option value="يرشحلي المندوب الأنسب">يرشحلي المندوب الأنسب</option>
            ${screenOptions}
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
      `${index}. ${data.get(`deviceModel${index}`)} - ${data.get(`deviceNeed${index}`)} - كفر: ${data.get(`deviceCase${index}`)} - اسكرينة: ${data.get(`deviceScreen${index}`)}`,
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
  window.location.href = "cart.html";
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

  if (text.includes("استبدال") || text.includes("استرجاع") || text.includes("return")) {
    return "الاستبدال متاح خلال 14 يوم لو المنتج بحالته الأصلية، والمنتجات المركبة أو المستخدمة بتتراجع حسب الحالة. التفاصيل في صفحة السياسات.";
  }

  if (text.includes("شركات") || text.includes("bulk")) {
    return "للشركات نقدر نجهز عرض Bulk حسب عدد الأجهزة والموديلات المطلوبة. افتح صفحة الشركات وابعت بيانات الطلب.";
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
  const wishlistId = event.target.closest("[data-wishlist]")?.dataset.wishlist;
  const category = event.target.closest("[data-category]")?.dataset.category;

  if (wishlistId) {
    toggleWishlist(wishlistId);
    return;
  }

  if (addId) {
    addCartItem(addId);
    window.location.href = "cart.html";
    return;
  }

  if (category) {
    state.category = category;
    renderFilters();
    renderProducts();
  }
});

cartItems.addEventListener("click", (event) => {
  const increaseId = event.target.closest("[data-increase]")?.dataset.increase;
  const decreaseId = event.target.closest("[data-decrease]")?.dataset.decrease;
  const removeId = event.target.closest("[data-remove]")?.dataset.remove;

  if (!increaseId && !decreaseId && !removeId) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  if (increaseId) {
    addCartItem(increaseId);
    return;
  }

  if (decreaseId) {
    decreaseCartItem(decreaseId);
    return;
  }

  removeCartItem(removeId);
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
    accountStatus.textContent = result.requiresEmailVerification
      ? "تم تسجيل الدخول. كمل تأكيد الإيميل من صفحة حسابك."
      : "تم تسجيل الدخول.";
    renderAccount();
    if (result.requiresEmailVerification) {
      window.location.href = "account.html";
      return;
    }
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
    accountStatus.textContent = "حسابك اتعمل. كمل تأكيد الإيميل من صفحة حسابك.";
    renderAccount();
    window.location.href = "account.html";
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
  fetch("/api/customer-session", { method: "DELETE" })
    .catch(() => null)
    .finally(() => {
      saveCustomer(null);
      accountStatus.textContent = "تم تسجيل الخروج.";
      setAccountTab("login");
      renderAccount();
    });
});

familyForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = familyVisitMessage(familyForm);
  const formData = new FormData(familyForm);
  const selectedProducts = Array.from(deviceList.querySelectorAll("select[name^='deviceCase'], select[name^='deviceScreen']"))
    .map((select) => products.find((product) => product.name === select.value))
    .filter(Boolean)
    .map((product) => ({ id: product.id, quantity: 1 }));

  try {
    if (selectedProducts.length) {
      const orderResponse = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: "family-visit",
          deliveryMethod: "family_representative",
          paymentMethod: "cash",
          notes: message,
          customer: {
            name: formData.get("customerName"),
            phone: formData.get("customerPhone"),
            email: state.customer?.email || "",
            city: state.customer?.city || "",
            address: formData.get("address"),
            locationLink: formData.get("locationLink"),
          },
          items: selectedProducts,
        }),
      });
      const orderData = await orderResponse.json().catch(() => ({}));
      if (orderResponse.ok) {
        saveRecentOrder(orderData.order);
      }
    } else {
      await postEvent({
        type: "order",
        channel: "family-visit",
        customerId: state.customer?.id || "",
        customer: {
          name: formData.get("customerName"),
          phone: formData.get("customerPhone"),
          email: state.customer?.email || "",
          username: state.customer?.username || "",
          address: formData.get("address"),
          city: state.customer?.city || "",
          locationLink: formData.get("locationLink"),
        },
        total: 0,
        status: "new",
        notes: message,
        items: [{ name: "طلب مندوب العيلة", quantity: 1, price: 0, details: message }],
      });
    }
  } catch {
    // Keep WhatsApp flow available even if storage/order creation is temporarily unavailable.
  }
  window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, "_blank", "noopener");
});

reviewForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(reviewForm));
  try {
    await api("/api/product-reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    reviewForm.reset();
    document.querySelector("[data-review-status]").textContent = "تم نشر التقييم لأنه مرتبط بطلب تم تسليمه.";
  } catch (error) {
    document.querySelector("[data-review-status]").textContent = error.message;
  }
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

faqList.addEventListener("click", (event) => {
  const question = event.target.closest("[data-faq-question]")?.dataset.faqQuestion;
  if (!question) {
    return;
  }

  const prompts = {
    delivery: "التوصيل بياخد قد إيه؟",
    family: "إزاي مندوب العيلة بيشتغل؟",
    payment: "الدفع الإلكتروني متاح؟",
    returns: "سياسة الاستبدال والاسترجاع؟",
    bulk: "محتاج عرض سعر للشركات Bulk.",
  };
  const prompt = prompts[question] || question;
  appendChatLine("أنت", prompt);
  appendChatLine("Cover Up", scriptedReply(prompt));
});

trackOrderForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(trackOrderForm);
  trackingResult.textContent = "بنراجع الطلب...";
  try {
    const params = new URLSearchParams({
      orderId: data.get("orderId"),
      phone: data.get("phone"),
    });
    const result = await api(`/api/track-order?${params.toString()}`);
    const order = result.order;
    trackingResult.innerHTML = `
      <strong>الحالة: ${escapeText(order.status)}</strong>
      <span>الدفع: ${escapeText(order.payment_status)}</span>
      <span>الإجمالي: ${formatter.format(order.grand_total)}</span>
      <small>${Array.isArray(order.items) ? order.items.map((item) => `${escapeText(item.name)} x ${escapeText(item.quantity || 1)}`).join(" | ") : ""}</small>
    `;
  } catch (error) {
    trackingResult.textContent = error.message;
  }
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

modelFilter.addEventListener("change", (event) => {
  state.model = event.target.value;
  renderProducts();
});

menuToggle.addEventListener("click", () => {
  const isOpen = header.classList.toggle("menu-open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
});

async function init() {
  await loadSessionCustomer();
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
