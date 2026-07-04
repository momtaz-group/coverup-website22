const defaultProducts = [];
const ORDER_STATUSES = [
  "new",
  "pending_payment",
  "paid",
  "confirmed",
  "preparing",
  "with_courier",
  "delivered",
  "cancelled",
  "refunded",
  "payment_failed",
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
const metricsNode = document.querySelector("[data-admin-metrics]");
const notificationsNode = document.querySelector("[data-admin-notifications]");
const courierNode = document.querySelector("[data-admin-courier]");

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

function safeCurrency(value) {
  return Number(value || 0).toLocaleString("ar-EG");
}

function orderWhatsAppMessage(order) {
  const statusCopy = {
    confirmed: "تم تأكيد طلبك من Cover Up.",
    preparing: "طلبك من Cover Up جاري تجهيزه.",
    with_courier: "طلبك مع مندوب Cover Up وفي الطريق إليك.",
    delivered: "تم تسليم طلبك من Cover Up. شكراً لثقتك.",
    cancelled: "تم إلغاء طلبك من Cover Up. للتفاصيل تواصل معنا.",
  };
  return [
    statusCopy[order.status] || `تحديث حالة طلب Cover Up: ${order.status}`,
    `رقم الطلب: ${order.id}`,
    `الإجمالي: ${safeCurrency(order.grand_total || order.total || 0)} EGP`,
    "تتبع الطلب:",
    `https://coverup.tech/track.html`,
  ].join("\n");
}

function renderMetrics() {
  const orders = events.orders || [];
  const customers = events.customers || [];
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayOrders = orders.filter((order) => String(order.created_at || "").slice(0, 10) === todayKey);
  const salesToday = todayOrders.reduce((sum, order) => sum + Number(order.grand_total || order.total || 0), 0);
  const pendingOrders = orders.filter((order) => ["new", "pending_payment", "confirmed", "preparing"].includes(order.status)).length;
  const newCustomers = customers.filter((customer) => String(customer.created_at || "").slice(0, 10) === todayKey).length;
  const productCounts = {};
  orders.forEach((order) => (order.items || []).forEach((item) => {
    productCounts[item.name] = (productCounts[item.name] || 0) + Number(item.quantity || 1);
  }));
  const topProduct = Object.entries(productCounts).sort((a, b) => b[1] - a[1])[0];

  metricsNode.innerHTML = [
    ["مبيعات اليوم", `${safeCurrency(salesToday)} EGP`],
    ["أوردرات معلقة", pendingOrders],
    ["عملاء جدد", newCustomers],
    ["أكتر منتج اتباع", topProduct ? `${safeText(topProduct[0])} (${topProduct[1]})` : "—"],
  ].map(([label, value]) => `
    <article>
      <span>${label}</span>
      <strong>${value}</strong>
    </article>
  `).join("");
}

function renderNotifications() {
  const orders = (events.orders || []).filter((order) => ["new", "pending_payment"].includes(order.status)).slice(0, 8);
  const complaints = (events.complaints || []).filter((complaint) => complaint.status === "new").slice(0, 8);
  const notifications = [
    ...orders.map((order) => ({ title: `أوردر جديد: ${order.customer?.name || "عميل"}`, text: `${safeCurrency(order.grand_total || order.total)} EGP - ${formatDate(order.created_at)}` })),
    ...complaints.map((complaint) => ({ title: `شكوى جديدة: ${complaint.name}`, text: `${complaint.phone} - ${formatDate(complaint.created_at)}` })),
  ];

  notificationsNode.innerHTML = notifications.length
    ? notifications.map((item) => `<article class="admin-record"><strong>${safeText(item.title)}</strong><p>${safeText(item.text)}</p></article>`).join("")
    : `<p class="empty-cart">لا توجد تنبيهات جديدة.</p>`;
}

function renderCourierBoard() {
  const courierOrders = (events.orders || [])
    .filter((order) => order.delivery_method === "family_representative" || order.status === "with_courier" || order.channel === "family-visit")
    .slice(0, 20);

  courierNode.innerHTML = courierOrders.length
    ? courierOrders.map((order) => `
      <article class="admin-record">
        <strong>${safeText(order.customer?.name || "عميل")} - ${safeText(order.status)}</strong>
        <span>${safeText(order.customer?.phone)} | ${formatDate(order.created_at)}</span>
        <p>${safeText(order.customer?.address)} ${order.location_link ? `| ${safeText(order.location_link)}` : ""}</p>
        <p>${safeText(order.notes || "")}</p>
      </article>
    `).join("")
    : `<p class="empty-cart">لا توجد زيارات مندوب حاليًا.</p>`;
}

async function fileToDataUrl(file) {
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

async function uploadProductImage(file) {
  const dataUrl = await fileToDataUrl(file);
  if (!dataUrl) {
    return "";
  }

  const result = await api("/api/storage-upload", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      kind: "product",
      fileName: file.name || "product.png",
      dataUrl,
    }),
  });

  return result.url;
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
                <span>${safeText(product.category)} - ${safeCurrency(product.price)} EGP</span>
                <p>SKU: ${safeText(product.sku || "—")} | المخزون: ${Number(product.stock_quantity || 0)}</p>
                <p>${Array.isArray(product.compatible_models) && product.compatible_models.length ? safeText(product.compatible_models.join(" / ")) : "بدون موديلات محددة"}</p>
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
  renderMetrics();
  renderNotifications();
  renderCourierBoard();

  renderList("[data-admin-customers]", events.customers, (customer) => `
    <article class="admin-record">
      <strong>${safeText(customer.name)} (@${safeText(customer.username)})</strong>
      <span>${safeText(customer.phone)} - ${safeText(customer.email)}</span>
      <p>${customer.email_verified_at ? "الإيميل متأكد" : "الإيميل غير مؤكد"}</p>
      <p>${safeText(customer.city)} ${customer.city && customer.address ? " - " : ""}${safeText(customer.address)}</p>
      <p>اتسجل: ${formatDate(customer.created_at)}${customer.last_login_at ? ` | آخر دخول: ${formatDate(customer.last_login_at)}` : ""}</p>
      ${customer.notes ? `<p>${safeText(customer.notes)}</p>` : ""}
    </article>
  `);

  renderList("[data-admin-password-resets]", events.passwordResets, (reset) => `
    <article class="admin-record">
      <strong>${safeText(reset.status)}</strong>
      <span>${safeText(reset.email)} ${reset.phone ? `- ${safeText(reset.phone)}` : ""}</span>
      <p>${formatDate(reset.created_at)}</p>
    </article>
  `);

  renderList("[data-admin-email-verifications]", events.emailVerifications, (verification) => `
    <article class="admin-record">
      <strong>${safeText(verification.status)}</strong>
      <span>${safeText(verification.email)}</span>
      <p>${formatDate(verification.created_at)}</p>
    </article>
  `);

  renderList("[data-admin-orders]", events.orders, (order) => `
    <article class="admin-record">
      <strong>${safeText(order.customer?.name || "عميل")} - ${safeText(order.status)}</strong>
      <span>${safeText(order.channel)} - ${formatDate(order.created_at)}</span>
      <p>${safeText(order.customer?.phone)}${order.customer?.email ? ` | ${safeText(order.customer.email)}` : ""}</p>
      <p>${safeText(order.customer?.address)}${order.customer?.city ? ` - ${safeText(order.customer.city)}` : ""}</p>
      <p>الدفع: ${safeText(order.payment_method || "—")} | الحالة المالية: ${safeText(order.payment_status || "—")}</p>
      <p>الخصم: ${safeText(order.discount_code || "—")} | التوصيل: ${safeCurrency(order.delivery_fee)} EGP</p>
      ${Array.isArray(order.items) ? `<p>${order.items.map((item) => `${safeText(item.name)} x ${safeText(item.quantity || 1)}`).join(" | ")}</p>` : ""}
      <p>${safeCurrency(order.grand_total || order.total || 0)} EGP</p>
      <a class="text-button" href="https://wa.me/${safeText(order.customer?.phone || "")}?text=${encodeURIComponent(orderWhatsAppMessage(order))}" target="_blank" rel="noreferrer">رسالة واتساب للحالة</a>
      <div class="admin-order-controls">
        <select data-order-status="${order.id}">
          ${ORDER_STATUSES.map((status) => `<option value="${status}" ${order.status === status ? "selected" : ""}>${status}</option>`).join("")}
        </select>
        <input data-order-note="${order.id}" type="text" placeholder="ملاحظة للحالة" />
        <button type="button" data-save-order="${order.id}">تحديث الحالة</button>
      </div>
    </article>
  `);

  renderList("[data-admin-reviews]", events.reviews, (review) => `
    <article class="admin-record">
      <strong>${safeText(review.name)} - ${safeText(review.rating)}/5</strong>
      <span>${formatDate(review.created_at)}</span>
      <p>${safeText(review.message)}</p>
    </article>
  `);

  renderList("[data-admin-complaints]", events.complaints, (complaint) => `
    <article class="admin-record">
      <strong>${safeText(complaint.name)}</strong>
      <span>${safeText(complaint.phone)} - ${formatDate(complaint.created_at)}</span>
      <p>${safeText(complaint.message)}</p>
    </article>
  `);

  renderList("[data-admin-chats]", events.chats, (chat) => `
    <article class="admin-record">
      <strong>${formatDate(chat.created_at)}</strong>
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
    ? "Supabase متفعل والداشبورد متصل. الصور والطلبات والمخزون جاهزين للإدارة."
    : "في متغيرات ناقصة في Supabase أو Vercel. راجع الإعدادات قبل استخدام كل المزايا.";
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
      productForm.elements[key].value = Array.isArray(value) ? value.join(", ") : value;
    }
  });
  productForm.elements.featured.value = product.featured ? "true" : "false";
});

productForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(productForm);
  const id = data.get("id") || data.get("name").toLowerCase().replace(/\s+/g, "-");
  const imageFile = data.get("imageFile");
  const uploadedImage = imageFile && imageFile.size ? await uploadProductImage(imageFile) : "";
  const product = {
    id,
    name: data.get("name"),
    category: data.get("category"),
    sku: data.get("sku"),
    price: Number(data.get("price")),
    stock_quantity: Number(data.get("stock_quantity")),
    badge: data.get("badge") || "متوفر",
    description: data.get("description"),
    compatible_models: String(data.get("compatible_models") || "")
      .split(/[,\n]/)
      .map((item) => item.trim())
      .filter(Boolean),
    colors: String(data.get("colors") || "")
      .split(/[,\n]/)
      .map((item) => item.trim())
      .filter(Boolean),
    images: String(data.get("images") || "")
      .split(/[,\n]/)
      .map((item) => item.trim())
      .filter(Boolean),
    material: data.get("material"),
    seo_title: data.get("seo_title"),
    seo_description: data.get("seo_description"),
    featured: data.get("featured") === "true",
    is_in_stock: Number(data.get("stock_quantity")) > 0,
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

document.addEventListener("click", async (event) => {
  const saveOrderButton = event.target.closest("[data-save-order]");
  if (!saveOrderButton) {
    return;
  }

  const orderId = saveOrderButton.dataset.saveOrder;
  const status = document.querySelector(`[data-order-status="${orderId}"]`)?.value;
  const note = document.querySelector(`[data-order-note="${orderId}"]`)?.value || "";

  try {
    await api("/api/admin-orders", {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify({ orderId, status, note }),
    });
    await loadAdmin();
  } catch (error) {
    setupMessage.textContent = error.message;
  }
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
