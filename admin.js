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
];

let adminPassword = sessionStorage.getItem("coverup-admin-password") || "";
let adminUsername = sessionStorage.getItem("coverup-admin-username") || "";
let products = [];
let events = {};

const loginPanel = document.querySelector("[data-login-panel]");
const dashboard = document.querySelector("[data-dashboard]");
const loginForm = document.querySelector("[data-login-form]");
const loginStatus = document.querySelector("[data-login-status]");
const setupMessage = document.querySelector("[data-admin-setup]");
const productForm = document.querySelector("[data-product-form]");
const productList = document.querySelector("[data-admin-products]");

function headers() {
  return {
    "Content-Type": "application/json",
    "x-admin-username": adminUsername,
    "x-admin-password": adminPassword,
  };
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString("ar-EG") : "";
}

function safeText(value) {
  return String(value || "").replace(/[<>]/g, "");
}

function recordDate(record) {
  return record?.created_at || record?.createdAt;
}

async function imageToDataUrl(file) {
  if (!file) {
    return "";
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function api(path, options = {}) {
  const response = await fetch(path, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

function renderProducts() {
  productList.innerHTML = products.length
    ? products
        .map(
          (product) => `
            <article class="admin-item">
              <img src="${product.image}" alt="" />
              <div>
                <strong>${safeText(product.name)}</strong>
                <span>${safeText(product.category)} - ${Number(product.price).toLocaleString("ar-EG")} EGP</span>
              </div>
              <button type="button" data-edit-product="${product.id}">تعديل</button>
            </article>
          `,
        )
        .join("")
    : `<p class="empty-cart">مفيش منتجات محفوظة في الداشبورد لسه.</p>`;
}

function renderList(selector, items, renderItem) {
  const node = document.querySelector(selector);
  node.innerHTML = items?.length
    ? items.map(renderItem).join("")
    : `<p class="empty-cart">لا توجد بيانات حتى الآن.</p>`;
}

function renderEvents() {
  renderList("[data-admin-orders]", events.orders, (order) => `
    <article class="admin-record">
      <strong>${safeText(order.customer?.name || "عميل")}</strong>
      <span>${safeText(order.channel)} - ${formatDate(recordDate(order))}</span>
      <p>${safeText(order.customer?.phone)} | ${safeText(order.customer?.address)}</p>
      <p>${Number(order.total || 0).toLocaleString("ar-EG")} EGP</p>
    </article>
  `);

  renderList("[data-admin-reviews]", events.reviews, (review) => `
    <article class="admin-record">
      <strong>${safeText(review.name)} - ${safeText(review.rating)}/5</strong>
      <span>${formatDate(recordDate(review))}</span>
      <p>${safeText(review.message)}</p>
    </article>
  `);

  renderList("[data-admin-complaints]", events.complaints, (complaint) => `
    <article class="admin-record">
      <strong>${safeText(complaint.name)}</strong>
      <span>${safeText(complaint.phone)} - ${formatDate(recordDate(complaint))}</span>
      <p>${safeText(complaint.message)}</p>
    </article>
  `);

  renderList("[data-admin-chats]", events.chats, (chat) => `
    <article class="admin-record">
      <strong>${formatDate(recordDate(chat))}</strong>
      <p><b>العميل:</b> ${safeText(chat.message)}</p>
      <p><b>Cover Up:</b> ${safeText(chat.reply)}</p>
    </article>
  `);
}

async function loadAdmin() {
  const [productData, eventData] = await Promise.all([
    api("/api/store-products"),
    api("/api/store-events", { headers: headers() }),
  ]);

  products = productData.products?.length ? productData.products : defaultProducts;
  events = eventData;
  setupMessage.textContent = productData.configured && eventData.configured
    ? "Supabase متفعل والداشبورد متصل."
    : "Supabase غير متفعل بالكامل. راجع SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY وبيانات دخول الإدارة على Vercel.";
  renderProducts();
  renderEvents();
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const loginData = new FormData(loginForm);
  adminUsername = loginData.get("username");
  adminPassword = loginData.get("password");
  sessionStorage.setItem("coverup-admin-username", adminUsername);
  sessionStorage.setItem("coverup-admin-password", adminPassword);

  try {
    await loadAdmin();
    loginPanel.hidden = true;
    dashboard.hidden = false;
  } catch (error) {
    loginStatus.textContent = error.message;
  }
});

document.querySelector("[data-refresh-admin]").addEventListener("click", loadAdmin);

productList.addEventListener("click", (event) => {
  const id = event.target.closest("[data-edit-product]")?.dataset.editProduct;
  const product = products.find((item) => item.id === id);
  if (!product) {
    return;
  }

  Object.entries(product).forEach(([key, value]) => {
    if (productForm.elements[key]) {
      productForm.elements[key].value = value;
    }
  });
});

productForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(productForm);
  const id = data.get("id") || data.get("name").toLowerCase().replace(/\s+/g, "-");
  const uploadedImage = await imageToDataUrl(data.get("imageFile"));
  const product = {
    id,
    name: data.get("name"),
    category: data.get("category"),
    price: Number(data.get("price")),
    badge: data.get("badge") || "متوفر",
    description: data.get("description"),
    image: uploadedImage || data.get("image"),
  };

  products = [product, ...products.filter((item) => item.id !== id)];
  await api("/api/store-products", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ products }),
  });

  productForm.reset();
  renderProducts();
});

if (adminPassword) {
  loadAdmin()
    .then(() => {
      loginPanel.hidden = true;
      dashboard.hidden = false;
    })
    .catch(() => {
      sessionStorage.removeItem("coverup-admin-username");
      sessionStorage.removeItem("coverup-admin-password");
    });
}
