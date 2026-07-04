const form = document.querySelector("[data-track-order-form]");
const resultNode = document.querySelector("[data-tracking-result]");
const header = document.querySelector(".site-header");
const menuToggle = document.querySelector(".menu-toggle");
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

function render(order) {
  resultNode.innerHTML = `
    <strong>حالة الطلب: ${escapeText(order.status)}</strong>
    <span>حالة الدفع: ${escapeText(order.payment_status)}</span>
    <span>الإجمالي: ${formatter.format(order.grand_total)}</span>
    <div class="tracking-timeline">
      ${(order.status_history || []).map((item) => `
        <p><b>${escapeText(item.status)}</b><small>${new Date(item.at).toLocaleString("ar-EG")}</small></p>
      `).join("")}
    </div>
  `;
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
