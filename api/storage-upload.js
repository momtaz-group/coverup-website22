const { randomUUID } = require("node:crypto");
const { authenticatedCustomer } = require("./_auth");
const { requireAdmin, sendJson, storageConfigured, uploadStorageObjectFromDataUrl } = require("./_store");

function cleanText(value, limit = 200) {
  return String(value || "").trim().slice(0, limit);
}

module.exports = async function handler(request, response) {
  try {
    if (request.method !== "POST") {
      return sendJson(response, 405, { message: "Method not allowed" });
    }

    if (!storageConfigured()) {
      return sendJson(response, 501, { message: "Supabase storage is not configured." });
    }

    const kind = cleanText(request.body?.kind, 40);
    const fileName = cleanText(request.body?.fileName, 160)
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9._-]/gi, "")
      .toLowerCase();
    const dataUrl = request.body?.dataUrl;

    if (!dataUrl || !fileName) {
      return sendJson(response, 400, { message: "الصورة غير مكتملة." });
    }

    if (kind === "product") {
      if (!requireAdmin(request, response)) {
        return;
      }

      const path = `products/${Date.now()}-${randomUUID()}-${fileName}`;
      const uploaded = await uploadStorageObjectFromDataUrl({
        bucket: "product-images",
        path,
        dataUrl,
      });

      return sendJson(response, 200, uploaded);
    }

    if (kind === "avatar") {
      const customer = await authenticatedCustomer(request);
      if (!customer) {
        return sendJson(response, 401, { message: "الجلسة انتهت. سجل دخولك تاني." });
      }

      const path = `customers/${customer.id}/${Date.now()}-${fileName}`;
      const uploaded = await uploadStorageObjectFromDataUrl({
        bucket: "customer-avatars",
        path,
        dataUrl,
      });

      return sendJson(response, 200, uploaded);
    }

    return sendJson(response, 400, { message: "نوع الرفع غير مدعوم." });
  } catch (error) {
    return sendJson(response, 500, { message: error.message || "Upload error" });
  }
};
