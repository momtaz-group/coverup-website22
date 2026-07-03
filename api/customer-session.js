const { authenticatedCustomer, endCustomerSession } = require("./_auth");
const { sendJson, supabaseConfigured } = require("./_store");

function publicCustomer(customer) {
  return customer
    ? {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        username: customer.username,
        address: customer.address,
        city: customer.city,
        notes: customer.notes,
        avatar_url: customer.avatar_url || "",
        email_verified_at: customer.email_verified_at,
        created_at: customer.created_at,
      }
    : null;
}

module.exports = async function handler(request, response) {
  try {
    if (!supabaseConfigured(true)) {
      return sendJson(response, 501, { message: "Supabase service role is not configured." });
    }

    if (request.method === "GET") {
      const customer = await authenticatedCustomer(request);
      return sendJson(response, 200, { customer: publicCustomer(customer) });
    }

    if (request.method === "DELETE") {
      await endCustomerSession(response, request);
      return sendJson(response, 200, { message: "تم تسجيل الخروج." });
    }

    return sendJson(response, 405, { message: "Method not allowed" });
  } catch (error) {
    return sendJson(response, 500, { message: error.message || "Session error" });
  }
};
