const whatsappNumber = "201050310516";
const customerStorageKey = "coverup-customer";

const fallbackProducts = [
  {
    id: "carbon-slide-camera-case",
    name: "كفر Carbon Slide Camera",
    category: "كفرات",
    price: 449,
    image: "assets/products/carbon-slide-camera-case.jpeg",
    badge: "Premium",
    stock_quantity: 10,
    is_in_stock: true,
    compatible_models: ["iPhone 15 Pro Max"],
  },
  {
    id: "orange-leopard-camera-case",
    name: "كفر Leopard Orange",
    category: "كفرات",
    price: 399,
    image: "assets/products/orange-leopard-camera-case.jpeg",
    badge: "ستايل",
    stock_quantity: 10,
    is_in_stock: true,
    compatible_models: ["iPhone 14 Pro"],
  },
];

const formatter = new Intl.NumberFormat("ar-EG", {
  style: "currency",
  currency: "EGP",
  maximumFractionDigits: 0,
});

const DEFAULT_COUPONS = {
  COVERUP10: { type: "percent", value: 10, minSubtotal: 0 },
  FAMILY50: { type: "fixed", value: 50, minSubtotal: 500 },
};

let products = [...fallbackProducts];

const state = {
  cart: readCart(),
  customer: JSON.parse(localStorage.getItem(customerStorageKey) || "null"),
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
const cashButton = document.querySelector("[data-place-cash-order]");
const messageNode = document.querySelector("[data-cart-message]");
const accountLabel = document.querySelector("[data-account-label]");
const summarySubtotal = document.querySelector("[data-summary-subtotal]");
const summaryDiscount = document.querySelector("[data-summary-discount]");
const summaryDelivery = document.querySelector("[data-summary-delivery]");
const summaryGrandTotal = document.querySelector("[data-summary-grand-total]");
const menuToggle = document.querySelector(".menu-toggle");
const header = document.querySelector(".site-header");
const year = document.querySelector("[data-year]");

year.textContent = new Date().getFullYear();

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

function saveCustomer(customer) {
  state.customer = customer;
  if (customer) {
    localStorage.setItem(customerStorageKey, JSON.stringify(customer));
  } else {
    localStorage.removeItem(customerStorageKey);
  }
}

function productSnapshot(product) {
  return {
    id: product.id,
    name: product.name,
    category: product.category || "منتجات",
    price: Number(product.price) || 0,
    image: product.image || "",
    badge: product.badge || "",
    stock_quantity: Number(product.stock_quantity || 0),
    is_in_stock: Boolean(product.is_in_stock),
    compatible_models: Array.isArray(product.compatible_models) ? product.compatible_models : [],
  };
}

async function loadSessionCustomer() {
  try {
    const response = await fetch("/api/customer-session");
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      saveCustomer(data.customer || null);
    }
  } catch {
    // Keep existing local value if session check fails.
  }
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
        return null;
      }

      return {
        product: resolved,
        quantity: item.quantity,
        unavailable: !product || !resolved.is_in_stock,
      };
    })
    .filter(Boolean);
}

function couponSummary(subtotal) {
  const code = String(checkoutForm.elements.discountCode.value || "").trim().toUpperCase();
  const coupon = DEFAULT_COUPONS[code];

  if (!code || !coupon || subtotal < Number(coupon.minSubtotal || 0)) {
    return { code: "", amount: 0 };
  }

  return {
    code,
    amount: coupon.type === "percent"
      ? Math.round((subtotal * Number(coupon.value || 0)) / 100)
      : Math.max(0, Number(coupon.value || 0)),
  };
}

function deliveryFee(method) {
  switch (method) {
    case "pickup":
      return 0;
    case "family_representative":
      return 90;
    default:
      return 45;
  }
}

function customerData() {
  const form = new FormData(checkoutForm);
  return {
    name: String(form.get("name") || state.customer?.name || "").trim(),
    phone: String(form.get("phone") || state.customer?.phone || "").trim(),
    email: String(form.get("email") || state.customer?.email || "").trim(),
    city: String(form.get("city") || state.customer?.city || "").trim(),
    address: String(form.get("address") || state.customer?.address || "").trim(),
    locationLink: String(form.get("locationLink") || "").trim(),
  };
}

function pricingSummary() {
  const entries = cartEntries();
  const subtotal = entries.reduce((sum, entry) => sum + entry.product.price * entry.quantity, 0);
  const discount = couponSummary(subtotal);
  const fee = deliveryFee(checkoutForm.elements.deliveryMethod.value);
  const grandTotal = Math.max(0, subtotal - discount.amount + fee);

  return {
    entries,
    subtotal,
    discount,
    deliveryFee: fee,
    grandTotal,
  };
}

function updateActionStates(totalItems) {
  const onlineSelected = checkoutForm.elements.paymentMethod.value === "online";
  cashButton.textContent = onlineSelected ? "اطلب كاش عند الاستلام" : "أكد الطلب";
  payButton.disabled = !totalItems;
  cashButton.disabled = !totalItems;
}

function renderCart() {
  const { entries, subtotal, discount, deliveryFee: fee, grandTotal } = pricingSummary();
  const totalItems = entries.reduce((sum, entry) => sum + entry.quantity, 0);

  accountLabel.textContent = state.customer ? state.customer.name.split(" ")[0] : "دخول";
  cartCount.textContent = totalItems;
  itemsCount.textContent = totalItems;
  summaryCount.textContent = totalItems;
  subtotalNode.textContent = formatter.format(subtotal);
  summaryTotal.textContent = formatter.format(grandTotal);
  summarySubtotal.textContent = formatter.format(subtotal);
  summaryDiscount.textContent = formatter.format(discount.amount);
  summaryDelivery.textContent = formatter.format(fee);
  summaryGrandTotal.textContent = formatter.format(grandTotal);
  summaryStatus.textContent = totalItems ? "راجع البيانات واضغط على طريقة الإكمال المناسبة." : "السلة فاضية";

  updateActionStates(totalItems);

  if (!entries.length) {
    cartList.innerHTML = `
      <div class="cart-page-empty">
        <h2>السلة فاضية.</h2>
        <p>ارجع للمتجر واختار المنتجات اللي محتاجها، وهتلاقي Checkout كامل هنا على طول.</p>
        <a class="button button-primary" href="products.html">ابدأ التسوق</a>
      </div>
    `;
    whatsappLink.href = `https://wa.me/${whatsappNumber}`;
    return;
  }

  cartList.innerHTML = entries
    .map(({ product, quantity, unavailable }) => {
      const total = product.price * quantity;
      const maxed = quantity >= Number(product.stock_quantity || quantity);
      return `
        <article class="cart-page-item">
          <a class="cart-page-media" href="products.html" aria-label="${escapeText(product.name)}">
            ${product.image ? `<img src="${product.image}" alt="" />` : "<span>CU</span>"}
          </a>
          <div class="cart-page-info">
            <div class="cart-page-item-head">
              <div>
                <h2>${escapeText(product.name)}</h2>
                <span class="cart-page-stock">${unavailable ? "غير متاح حاليًا" : product.stock_quantity ? `متبقي ${product.stock_quantity}` : "متاح"}</span>
                <small>${escapeText(product.category || "منتجات")}${product.compatible_models?.length ? ` - ${escapeText(product.compatible_models.join(" / "))}` : ""}</small>
              </div>
              <strong>${formatter.format(total)}</strong>
            </div>
            <div class="cart-page-actions">
              <div class="amazon-quantity" aria-label="كمية ${escapeText(product.name)}">
                <button class="amazon-trash" type="button" data-remove="${product.id}" aria-label="حذف ${escapeText(product.name)}">⌫</button>
                <button type="button" data-decrease="${product.id}" aria-label="قلل ${escapeText(product.name)}">−</button>
                <b>${quantity}</b>
                <button type="button" data-increase="${product.id}" ${maxed || unavailable ? "disabled" : ""} aria-label="زود ${escapeText(product.name)}">+</button>
              </div>
              <button class="cart-page-link" type="button" data-remove="${product.id}">حذف</button>
              <span>${formatter.format(product.price)} للقطعة</span>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  const data = customerData();
  const message = [
    "أحتاج مساعدة في إكمال الطلب من موقع Cover Up:",
    data.name ? `الاسم: ${data.name}` : "",
    data.phone ? `الموبايل: ${data.phone}` : "",
    `عدد القطع: ${totalItems}`,
    `الإجمالي: ${formatter.format(grandTotal)}`,
  ]
    .filter(Boolean)
    .join("\n");
  whatsappLink.href = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}

function prefillCustomer() {
  if (!state.customer) {
    return;
  }

  if (!checkoutForm.elements.name.value) checkoutForm.elements.name.value = state.customer.name || "";
  if (!checkoutForm.elements.phone.value) checkoutForm.elements.phone.value = state.customer.phone || "";
  if (!checkoutForm.elements.email.value) checkoutForm.elements.email.value = state.customer.email || "";
  if (!checkoutForm.elements.city.value) checkoutForm.elements.city.value = state.customer.city || "";
  if (!checkoutForm.elements.address.value) checkoutForm.elements.address.value = state.customer.address || "";
}

function clearCart() {
  state.cart = {};
  saveCart();
  renderCart();
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "حصل خطأ في الطلب.");
  }
  return data;
}

function validCheckout() {
  const data = customerData();
  if (!data.name || !data.phone || !data.address) {
    throw new Error("كمل الاسم والموبايل والعنوان الأول.");
  }

  const unavailable = cartEntries().find((entry) => entry.unavailable);
  if (unavailable) {
    throw new Error(`راجع السلة لأن ${unavailable.product.name} غير متاح حاليًا.`);
  }

  return data;
}

async function createOrder(paymentMethodOverride = "") {
  const customer = validCheckout();
  const summary = pricingSummary();
  const selectedPaymentMethod = paymentMethodOverride || checkoutForm.elements.paymentMethod.value || "cash";

  return requestJson("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      channel: "website",
      customer,
      notes: checkoutForm.elements.notes.value || "",
      deliveryMethod: checkoutForm.elements.deliveryMethod.value || "delivery",
      paymentMethod: selectedPaymentMethod,
      discountCode: checkoutForm.elements.discountCode.value || "",
      items: summary.entries.map(({ product, quantity }) => ({
        id: product.id,
        quantity,
      })),
    }),
  });
}

async function placeCashOrder() {
  try {
    messageNode.textContent = "بنجهز طلبك...";
    cashButton.disabled = true;

    const result = await createOrder("cash");
    clearCart();
    messageNode.textContent = `تم تأكيد طلبك رقم ${String(result.order.id).slice(0, 8)} بنجاح.`;
  } catch (error) {
    messageNode.textContent = error.message;
  } finally {
    cashButton.disabled = false;
  }
}

async function payOnline() {
  try {
    messageNode.textContent = "بنجهز رابط الدفع الآمن...";
    payButton.disabled = true;

    const orderResult = await createOrder("online");
    const payment = await requestJson("/api/create-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: orderResult.order.id }),
    });

    window.location.href = payment.checkoutUrl;
  } catch (error) {
    messageNode.textContent = error.message;
    payButton.disabled = false;
  }
}

function addItem(productId) {
  const product = products.find((entry) => entry.id === productId);
  if (!product || !product.is_in_stock) {
    messageNode.textContent = "المنتج ده غير متاح حاليًا.";
    return;
  }

  const current = state.cart[productId] || { quantity: 0, snapshot: productSnapshot(product) };
  if (current.quantity >= Number(product.stock_quantity || 0)) {
    messageNode.textContent = "وصلت لأقصى كمية متاحة من المنتج ده.";
    return;
  }

  current.quantity += 1;
  current.snapshot = productSnapshot(product);
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

checkoutForm.addEventListener("input", () => {
  messageNode.textContent = "";
  renderCart();
});

cashButton.addEventListener("click", placeCashOrder);
payButton.addEventListener("click", payOnline);

menuToggle.addEventListener("click", () => {
  const isOpen = header.classList.toggle("menu-open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
});

async function init() {
  await loadSessionCustomer();
  await loadProducts();
  syncCartSnapshots();
  prefillCustomer();
  renderCart();

  const paymentState = new URLSearchParams(window.location.search).get("payment");
  if (paymentState === "return") {
    messageNode.textContent = "لو الدفع تم بنجاح، حالة الطلب هتتحدث تلقائيًا بعد ما Paymob يبعت التأكيد.";
  }
}

init();
