const formatter = new Intl.NumberFormat("ar-EG", {
  style: "currency",
  currency: "EGP",
  maximumFractionDigits: 0,
});

const productId = new URLSearchParams(window.location.search).get("id");
const detail = document.querySelector("[data-product-detail]");
const cartCount = document.querySelector("[data-cart-count]");
const year = document.querySelector("[data-year]");
const header = document.querySelector(".site-header");
const menuToggle = document.querySelector(".menu-toggle");

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
  try {
    return JSON.parse(localStorage.getItem("coverup-cart-v2") || "{}");
  } catch {
    return {};
  }
}

function saveCart(cart) {
  localStorage.setItem("coverup-cart-v2", JSON.stringify(cart));
  localStorage.setItem(
    "coverup-cart",
    JSON.stringify(Object.fromEntries(Object.entries(cart).map(([id, item]) => [id, item.quantity]))),
  );
}

function updateCartCount() {
  const cart = readCart();
  cartCount.textContent = Object.values(cart).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
}

function productSnapshot(product) {
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    price: Number(product.price || 0),
    image: product.image || "",
    stock_quantity: Number(product.stock_quantity || 0),
    is_in_stock: product.is_in_stock !== false,
  };
}

function allImages(product) {
  return [product.image, ...(Array.isArray(product.images) ? product.images : [])].filter(Boolean);
}

function setSeo(product) {
  document.title = `${product.name} | Cover Up`;
  const description = product.seo_description || product.description || "منتج من Cover Up";
  document.querySelector("[data-product-meta]")?.setAttribute("content", description);
  document.querySelector("[data-product-og-title]")?.setAttribute("content", product.seo_title || product.name);
  document.querySelector("[data-product-og-description]")?.setAttribute("content", description);
}

async function api(path, options = {}) {
  const response = await fetch(path, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }
  return data;
}

function addToCart(product) {
  if (product.is_in_stock === false) {
    return;
  }

  const cart = readCart();
  const current = cart[product.id] || { quantity: 0, snapshot: productSnapshot(product) };
  current.quantity += 1;
  current.snapshot = productSnapshot(product);
  cart[product.id] = current;
  saveCart(cart);
  updateCartCount();
}

function toggleWishlist(productId) {
  const wishlist = JSON.parse(localStorage.getItem("coverup-wishlist") || "[]");
  const next = wishlist.includes(productId)
    ? wishlist.filter((id) => id !== productId)
    : [...wishlist, productId];
  localStorage.setItem("coverup-wishlist", JSON.stringify(next));
}

function render(product, reviews) {
  const images = allImages(product);
  const rating = reviews.length
    ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length
    : 0;

  detail.innerHTML = `
    <div class="product-gallery">
      <div class="product-main-image">
        ${images[0] ? `<img src="${images[0]}" alt="${escapeText(product.name)}" data-main-product-image />` : `<span>Cover Up</span>`}
      </div>
      <div class="product-thumbs" data-gallery-thumbs>
        ${images.map((image) => `<button type="button" data-product-thumb="${escapeText(image)}"><img src="${image}" alt="" /></button>`).join("")}
      </div>
    </div>
    <div class="product-detail-copy">
      <p class="eyebrow">${escapeText(product.badge || product.category)}</p>
      <h1 data-product-title>${escapeText(product.name)}</h1>
      <p>${escapeText(product.description)}</p>
      <strong class="product-detail-price" data-product-price>${formatter.format(product.price)}</strong>
      <div class="product-detail-meta">
        <span>${product.is_in_stock === false ? "نفد من المخزون" : "متاح للطلب"}</span>
        <span>SKU: ${escapeText(product.sku || "بدون")}</span>
        ${Array.isArray(product.compatible_models) && product.compatible_models.length ? `<span>${escapeText(product.compatible_models.join(" / "))}</span>` : ""}
        ${rating ? `<span>تقييم ${rating.toFixed(1)} من 5</span>` : `<span>لسه مفيش تقييمات منشورة</span>`}
      </div>
      <div class="product-detail-actions">
        <button class="button button-primary" type="button" data-product-add data-add-to-cart>ضيف للسلة</button>
        <button class="button button-secondary" type="button" data-product-wishlist data-wishlist-button>احفظ في المفضلة</button>
      </div>
      <section class="product-reviews" data-product-reviews>
        <h2>تقييمات حقيقية بعد التسليم</h2>
        ${reviews.length ? reviews.map((review) => `
          <article>
            <strong>${"★".repeat(Number(review.rating || 5))}</strong>
            <p>${escapeText(review.message)}</p>
            <span>${escapeText(review.name || "عميل Cover Up")}</span>
          </article>
        `).join("") : `<p>التقييمات تظهر هنا بعد ما العميل يستلم الأوردر ويأكد برقم الطلب.</p>`}
      </section>
    </div>
  `;

  detail.querySelector("[data-product-add]").addEventListener("click", () => {
    addToCart(product);
    window.location.href = "cart.html";
  });

  detail.querySelector("[data-product-wishlist]").addEventListener("click", () => {
    toggleWishlist(product.id);
  });

  detail.querySelectorAll("[data-product-thumb]").forEach((button) => {
    button.addEventListener("click", () => {
      detail.querySelector("[data-main-product-image]").src = button.dataset.productThumb;
    });
  });
}

async function init() {
  updateCartCount();
  if (!productId) {
    detail.innerHTML = `<p class="empty-cart">المنتج غير محدد.</p>`;
    return;
  }

  const [productData, reviewData] = await Promise.all([
    api(`/api/store-product?id=${encodeURIComponent(productId)}`),
    api(`/api/product-reviews?productId=${encodeURIComponent(productId)}`).catch(() => ({ reviews: [] })),
  ]);
  const product = productData.product;
  if (!product) {
    detail.innerHTML = `<p class="empty-cart">المنتج غير موجود.</p>`;
    return;
  }

  setSeo(product);
  render(product, reviewData.reviews || []);
}

menuToggle.addEventListener("click", () => {
  const isOpen = header.classList.toggle("menu-open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
});

init().catch((error) => {
  detail.innerHTML = `<p class="empty-cart">${escapeText(error.message)}</p>`;
});
