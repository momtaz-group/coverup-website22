const whatsappNumber = "201050310516";

const products = [
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

const formatter = new Intl.NumberFormat("ar-EG", {
  style: "currency",
  currency: "EGP",
  maximumFractionDigits: 0,
});

const state = {
  search: "",
  category: "الكل",
  cart: JSON.parse(localStorage.getItem("coverup-cart") || "{}"),
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
const checkoutLink = document.querySelector("[data-checkout-link]");
const checkoutForm = document.querySelector("[data-checkout-form]");
const paymentButton = document.querySelector("[data-pay-online]");
const paymentMessage = document.querySelector("[data-payment-message]");
const familyForm = document.querySelector("[data-family-form]");
const phoneCountInput = document.querySelector("[data-phone-count]");
const timeSlots = document.querySelector("[data-time-slots]");
const deviceList = document.querySelector("[data-device-list]");
const menuToggle = document.querySelector(".menu-toggle");
const header = document.querySelector(".site-header");
const year = document.querySelector("[data-year]");

year.textContent = new Date().getFullYear();
countNode.textContent = products.length;

const visitDateInput = familyForm.querySelector('input[name="visitDate"]');
visitDateInput.min = new Date().toISOString().slice(0, 10);

function saveCart() {
  localStorage.setItem("coverup-cart", JSON.stringify(state.cart));
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
    name: data.get("name")?.trim() || "",
    phone: data.get("phone")?.trim() || "",
    address: data.get("address")?.trim() || "",
  };
}

function cartEntries() {
  return Object.entries(state.cart)
    .map(([id, quantity]) => {
      const product = products.find((item) => item.id === id);
      return product ? { product, quantity } : null;
    })
    .filter(Boolean);
}

function renderCart() {
  const entries = cartEntries();
  const totalQuantity = entries.reduce((sum, entry) => sum + entry.quantity, 0);
  const total = entries.reduce((sum, entry) => sum + entry.product.price * entry.quantity, 0);

  cartCount.textContent = totalQuantity;
  cartTotal.textContent = formatter.format(total);

  if (entries.length === 0) {
    cartItems.innerHTML = `<p class="empty-cart">السلة فاضية. ضيف منتجات الأول.</p>`;
    checkoutLink.href = `https://wa.me/${whatsappNumber}`;
    paymentButton.disabled = true;
    return;
  }

  paymentButton.disabled = false;

  cartItems.innerHTML = entries
    .map(
      ({ product, quantity }) => `
        <article class="cart-item">
          <div>
            <strong>${product.name}</strong>
            <span>${formatter.format(product.price)} × ${quantity}</span>
          </div>
          <div class="quantity-control">
            <button type="button" data-decrease="${product.id}" aria-label="قلل ${product.name}">−</button>
            <span>${quantity}</span>
            <button type="button" data-increase="${product.id}" aria-label="زود ${product.name}">+</button>
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

function openCart() {
  cartDrawer.classList.add("is-open");
  cartDrawer.setAttribute("aria-hidden", "false");
}

function closeCart() {
  cartDrawer.classList.remove("is-open");
  cartDrawer.setAttribute("aria-hidden", "true");
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

document.addEventListener("click", (event) => {
  const addId = event.target.closest("[data-add-product]")?.dataset.addProduct;
  const increaseId = event.target.closest("[data-increase]")?.dataset.increase;
  const decreaseId = event.target.closest("[data-decrease]")?.dataset.decrease;
  const category = event.target.closest("[data-category]")?.dataset.category;

  if (addId) {
    state.cart[addId] = (state.cart[addId] || 0) + 1;
    saveCart();
    renderCart();
    openCart();
  }

  if (increaseId) {
    state.cart[increaseId] = (state.cart[increaseId] || 0) + 1;
    saveCart();
    renderCart();
  }

  if (decreaseId) {
    state.cart[decreaseId] -= 1;
    if (state.cart[decreaseId] <= 0) {
      delete state.cart[decreaseId];
    }
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
paymentButton.addEventListener("click", payOnline);
checkoutForm.addEventListener("input", renderCart);
phoneCountInput.addEventListener("input", renderDeviceRows);

familyForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const message = familyVisitMessage(familyForm);
  window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, "_blank", "noopener");
});

cartDrawer.addEventListener("click", (event) => {
  if (event.target === cartDrawer) {
    closeCart();
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

renderFilters();
renderTimeSlots();
renderDeviceRows();
renderProducts();
renderCart();
