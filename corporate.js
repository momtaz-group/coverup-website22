const whatsappNumber = "201050310516";
const form = document.querySelector("[data-corporate-form]");

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const message = [
    "طلب عرض سعر شركات Cover Up:",
    `الشركة: ${data.get("company")}`,
    `المسؤول: ${data.get("name")}`,
    `الموبايل: ${data.get("phone")}`,
    data.get("email") ? `الإيميل: ${data.get("email")}` : "",
    `عدد الأجهزة: ${data.get("deviceCount")}`,
    `الموديلات: ${data.get("models")}`,
    `المطلوب: ${data.get("needs")}`,
  ].filter(Boolean).join("\n");

  window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, "_blank", "noopener");
});
