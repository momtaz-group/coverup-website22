const form = document.querySelector("[data-track-order-form]");
const resultNode = document.querySelector("[data-tracking-result]");
const recentOrdersNode = document.querySelector("[data-recent-orders]");
const header = document.querySelector(".site-header");
const menuToggle = document.querySelector(".menu-toggle");
const recentOrdersStorageKey = "coverup-recent-orders";
const formatter = new Intl.NumberFormat("ar-EG", {
  style: "currency",
  currency: "EGP",
  maximumFractionDigits: 0,
});

function escapeText(value) {
  return String(value || "").replace(/[<>&"]/g, (char) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    '"': "&quot;",
  }[char]));
}

async function api(path) {
  const response = await fetch(path);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }
  return data;
}

function readRecentOrders() {
  try {
    return JSON.parse(localStorage.getItem(recentOrdersStorageKey) || "[]").filter((order) => order?.id);
  } catch {
    return [];
  }
}

function saveRecentOrders(orders) {
  const compact = orders
    .filter((order) => order?.id)
    .reduce((unique, order) => {
      if (!unique.some((item) => item.id === order.id)) {
        unique.push(order);
      }
      return unique;
    }, [])
    .slice(0, 20);
  localStorage.setItem(recentOrdersStorageKey, JSON.stringify(compact));
}

function statusLabel(status) {
  const labels = {
    new: "جديد",
    pending_payment: "في انتظار الدفع",
    paid: "مدفوع",
    confirmed: "مؤكد",
    preparing: "جاري التجهيز",
    with_courier: "مع المندوب",
    delivered: "تم التسليم",
    cancelled: "ملغي",
    refunded: "مسترجع",
    payment_failed: "الدفع فشل",
  };
  return labels[status] || status || "قيد المراجعة";
}

function render(order) {
  resultNode.innerHTML = `
    <strong>حالة الطلب: ${escapeText(statusLabel(order.status))}</strong>
    <span>حالة الدفع: ${escapeText(statusLabel(order.payment_status))}</span>
    <span>الإجمالي: ${formatter.format(order.grand_total)}</span>
    <div class="tracking-timeline">
      ${(order.status_history || []).map((item) => `
        <p><b>${escapeText(item.status)}</b><small>${new Date(item.at).toLocaleString("ar-EG")}</small></p>
      `).join("")}
    </div>
  `;
}

function renderRecentOrders(orders) {
  if (!recentOrdersNode) {
    return;
  }

  if (!orders.length) {
    recentOrdersNode.innerHTML = `<p class="empty-cart">لسه مفيش طلبات محفوظة على الجهاز أو الحساب ده.</p>`;
    return;
  }

  recentOrdersNode.innerHTML = orders
    .map((order) => `
      <article class="tracking-order-card">
        <div>
          <strong>طلب #${escapeText(String(order.id).slice(0, 8))}</strong>
          <span>${escapeText(statusLabel(order.status))}</span>
          <small>${order.created_at ? new Date(order.created_at).toLocaleString("ar-EG") : ""}</small>
        </div>
        <div>
          <b>${formatter.format(order.grand_total || 0)}</b>
          <small>${Array.isArray(order.items) ? order.items.map((item) => `${escapeText(item.name || item.id || "منتج")} × ${escapeText(item.quantity || 1)}`).join(" | ") : ""}</small>
        </div>
      </article>
    `)
    .join("");
}

async function loadRecentOrders() {
  const localOrders = readRecentOrders();
  renderRecentOrders(localOrders);

  const liveLocalOrders = await Promise.all(
    localOrders.map(async (order) => {
      if (!order.phone) {
        return order;
      }
      try {
        const params = new URLSearchParams({ orderId: order.id, phone: order.phone });
        const response = await api(`/api/track-order?${params.toString()}`);
        return { ...order, ...response.order, phone: order.phone };
      } catch {
        return order;
      }
    }),
  );

  let accountOrders = [];
  try {
    const data = await api("/api/customer-session");
    accountOrders = Array.isArray(data.orders) ? data.orders : [];
  } catch {
    accountOrders = [];
  }

  const merged = [...accountOrders, ...liveLocalOrders];
  saveRecentOrders(
    merged.map((order) => ({
      ...order,
      phone: order.phone || order.customer?.phone || "",
    })),
  );
  renderRecentOrders(merged);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  resultNode.textContent = "بنراجع الطلب...";
  const data = new FormData(form);
  try {
    const params = new URLSearchParams({
      orderId: data.get("orderId"),
      phone: data.get("phone"),
    });
    const response = await api(`/api/track-order?${params.toString()}`);
    render(response.order);
  } catch (error) {
    resultNode.textContent = error.message;
  }
});

menuToggle?.addEventListener("click", () => {
  const isOpen = header.classList.toggle("menu-open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
});

loadRecentOrders();
