const whatsappNumber = "201050310516";

const fallbackProducts = [
  {
    id: "carbon-slide-camera-case",
    name: "كفر Carbon Slide Camera",
    category: "كفرات",
    price: 449,
    image: "assets/products/carbon-slide-camera-case.jpeg",
    badge: "Premium",
  },
  {
    id: "orange-leopard-camera-case",
    name: "كفر Leopard Orange",
    category: "كفرات",
    price: 399,
    image: "assets/products/orange-leopard-camera-case.jpeg",
    badge: "ستايل",
  },
  {
    id: "samsung-clear-shockproof-case",
    name: "كفر Samsung Clear Shockproof",
    category: "كفرات",
    price: 299,
    image: "assets/products/samsung-clear-shockproof-case.jpeg",
    badge: "شفاف",
  },
  {
    id: "black-magsafe-fabric-case",
    name: "كفر MagSafe Fabric أسود",
    category: "كفرات MagSafe",
    price: 549,
    image: "assets/products/black-magsafe-fabric-case.jpeg",
    badge: "MagSafe",
  },
  {
    id: "tempered-glass-screen-protector",
    name: "اسكرينة Tempered Glass",
    category: "حماية الشاشة",
    price: 199,
    image: "assets/products/tempered-glass-screen-protector.jpeg",
    badge: "حماية",
  },
  {
    id: "navy-apple-fabric-case",
    name: "كفر iPhone Fabric Navy",
    category: "كفرات",
    price: 499,
    image: "assets/products/navy-apple-fabric-case.jpeg",
    badge: "أنيق",
  },
  {
    id: "black-full-glue-screen-protector",
    name: "اسكرينة Full Glue Black",
    category: "حماية الشاشة",
    price: 249,
    image: "assets/products/black-full-glue-screen-protector.jpeg",
    badge: "Full Glue",
  },
  {
    id: "privacy-screen-protector",
    name: "اسكرينة Privacy",
    category: "حماية الشاشة",
    price: 299,
    image: "assets/products/privacy-screen-protector.jpeg",
    badge: "Privacy",
  },
  {
    id: "brown-magsafe-fabric-case",
    name: "كفر MagSafe Fabric بني",
    category: "كفرات MagSafe",
    price: 549,
    image: "assets/products/brown-magsafe-fabric-case.jpeg",
    badge: "Premium",
  },
];

const formatter = new Intl.NumberFormat("ar-EG", {
  style: "currency",
  currency: "EGP",
  maximumFractionDigits: 0,
});

let products = [...fallbackProducts];

const state = {
  cart: readCart(),
  customer: JSON.parse(localStorage.getItem("coverup-customer") || "null"),
};

const cartList = document.querySelector("[data-cart-list]");
const cartCount = document.querySelector("[data-cart-count]");
const itemsCount = document.querySelector("[data-cart-items-count]");
const summaryCount = document.querySelector("[data-cart-summary-count]");
const subtotalNode = document.querySelector("[data-cart-page-subtotal]");
const summaryTotal = document.querySelector("[data-cart-summary-total]");
const summaryStatus = document.querySelector("[data-cart-summary-status]");
const checkoutForm = document.querySelector("[data-cart-checkout-form]");
const whatsappLink = document.querySelector("[data-whatsapp-checkout]");
const payButton = document.querySelector("[data-pay-online]");
const messageNode = document.querySelector("[data-cart-message]");
const accountLabel = document.querySelector("[data-account-label]");
const menuToggle = document.querySelector(".menu-toggle");
const header = document.querySelector(".site-header");
const year = document.querySelector("[data-year]");

year.textContent = new Date().getFullYear();
accountLabel.textContent = state.customer ? state.customer.name.split(" ")[0] : "دخول";

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

  return Object.entries(raw).reduce((cart, [id, item]) => {
    if (typeof item === "number" && item > 0) {
      cart[id] = { quantity: item, snapshot: null };
      return cart;
    }

    if (item && typeof item === "object" && Number(item.quantity) > 0) {
      cart[id] = {
        quantity: Number(item.quantity),
        snapshot: item.snapshot && typeof item.snapshot === "object" ? item.snapshot : null,
      };
    }

    return cart;
  }, {});
}

function saveCart() {
  localStorage.setItem("coverup-cart-v2", JSON.stringify(state.cart));
  localStorage.setItem(
    "coverup-cart",
    JSON.stringify(Object.fromEntries(Object.entries(state.cart).map(([id, item]) => [id, item.quantity]))),
  );
}

function productSnapshot(product) {
  return {
    id: product.id,
    name: product.name,
    category: product.category || "منتجات",
    price: Number(product.price) || 0,
    image: product.image || "",
    badge: product.badge || "",
  };
}

async function loadProducts() {
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
    products = [...fallbackProducts];
  }
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

function cartEntries() {
  return Object.entries(state.cart)
    .map(([id, item]) => {
      const product = products.find((entry) => entry.id === id);
      const resolved = product ? productSnapshot(product) : item.snapshot;

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
    .filter((entry) => entry.quantity > 0);
}

function customerData() {
  const form = new FormData(checkoutForm);
  return {
    name: String(form.get("name") || state.customer?.name || "").trim(),
    phone: String(form.get("phone") || state.customer?.phone || "").trim(),
    address: String(form.get("address") || state.customer?.address || "").trim(),
  };
}

function renderCart() {
  const entries = cartEntries();
  const totalItems = entries.reduce((sum, entry) => sum + entry.quantity, 0);
  const subtotal = entries.reduce((sum, entry) => sum + entry.product.price * entry.quantity, 0);

  cartCount.textContent = totalItems;
  itemsCount.textContent = totalItems;
  summaryCount.textContent = totalItems;
  subtotalNode.textContent = formatter.format(subtotal);
  summaryTotal.textContent = formatter.format(subtotal);
  summaryStatus.textContent = totalItems ? "كل المنتجات جاهزة للتأكيد" : "السلة فاضية";
  payButton.disabled = !totalItems;

  if (!entries.length) {
    cartList.innerHTML = `
      <div class="cart-page-empty">
        <h2>السلة فاضية.</h2>
        <p>ارجع للمتجر واختار المنتجات اللي محتاجها، وهتظهر هنا بنفس شكل الطلب النهائي.</p>
        <a class="button button-primary" href="products.html">ابدأ التسوق</a>
      </div>
    `;
    whatsappLink.href = `https://wa.me/${whatsappNumber}`;
    return;
  }

  cartList.innerHTML = entries
    .map(({ product, quantity, unavailable }) => {
      const total = product.price * quantity;
      return `
        <article class="cart-page-item">
          <a class="cart-page-media" href="products.html" aria-label="${escapeText(product.name)}">
            ${product.image ? `<img src="${product.image}" alt="" />` : "<span>CU</span>"}
          </a>
          <div class="cart-page-info">
            <div class="cart-page-item-head">
              <div>
                <h2>${escapeText(product.name)}</h2>
                <span class="cart-page-stock">${unavailable ? "محفوظ من طلب سابق" : "In Stock"}</span>
                <small>${escapeText(product.category || "منتجات")}</small>
              </div>
              <strong>${formatter.format(total)}</strong>
            </div>
            <div class="cart-page-actions">
              <div class="amazon-quantity" aria-label="كمية ${escapeText(product.name)}">
                <button class="amazon-trash" type="button" data-remove="${product.id}" aria-label="حذف ${escapeText(product.name)}">⌫</button>
                <button type="button" data-decrease="${product.id}" aria-label="قلل ${escapeText(product.name)}">−</button>
                <b>${quantity}</b>
                <button type="button" data-increase="${product.id}" aria-label="زود ${escapeText(product.name)}">+</button>
              </div>
              <button class="cart-page-link" type="button" data-remove="${product.id}">Delete</button>
              <span>${formatter.format(product.price)} للقطعة</span>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  const data = customerData();
  const customerLines = [
    data.name ? `الاسم: ${data.name}` : "",
    data.phone ? `الموبايل: ${data.phone}` : "",
    data.address ? `العنوان: ${data.address}` : "",
  ].filter(Boolean);
  const itemLines = entries.map(
    ({ product, quantity }) => `- ${product.name} × ${quantity} = ${formatter.format(product.price * quantity)}`,
  );
  const message = [
    "طلب جديد من موقع Cover Up:",
    ...customerLines,
    `عدد القطع: ${totalItems}`,
    ...itemLines,
    `الإجمالي: ${formatter.format(subtotal)}`,
  ].join("\n");
  whatsappLink.href = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}

function addItem(productId) {
  const product = products.find((entry) => entry.id === productId);
  const current = state.cart[productId] || { quantity: 0, snapshot: product ? productSnapshot(product) : null };
  current.quantity += 1;
  if (product) current.snapshot = productSnapshot(product);
  state.cart[productId] = current;
  saveCart();
  renderCart();
}

function decreaseItem(productId) {
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

function removeItem(productId) {
  delete state.cart[productId];
  saveCart();
  renderCart();
}

function prefillCustomer() {
  if (!state.customer) {
    return;
  }

  if (!checkoutForm.elements.name.value) checkoutForm.elements.name.value = state.customer.name || "";
  if (!checkoutForm.elements.phone.value) checkoutForm.elements.phone.value = state.customer.phone || "";
  if (!checkoutForm.elements.address.value) checkoutForm.elements.address.value = state.customer.address || "";
}

cartList.addEventListener("click", (event) => {
  const increaseId = event.target.closest("[data-increase]")?.dataset.increase;
  const decreaseId = event.target.closest("[data-decrease]")?.dataset.decrease;
  const removeId = event.target.closest("[data-remove]")?.dataset.remove;

  if (increaseId) {
    addItem(increaseId);
    return;
  }

  if (decreaseId) {
    decreaseItem(decreaseId);
    return;
  }

  if (removeId) {
    removeItem(removeId);
  }
});

checkoutForm.addEventListener("input", renderCart);
payButton.addEventListener("click", () => {
  messageNode.textContent = "الدفع الإلكتروني هيشتغل بعد ربط بيانات حساب Paymob.";
});

menuToggle.addEventListener("click", () => {
  const isOpen = header.classList.toggle("menu-open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
});

async function init() {
  await loadProducts();
  syncCartSnapshots();
  prefillCustomer();
  renderCart();
}

init();
