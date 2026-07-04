const { authenticatedCustomer, endCustomerSession } = require("./_auth");
const { getCustomerOrdersForTracking, sendJson, supabaseConfigured } = require("./_store");

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

function publicOrder(order) {
  return {
    id: order.id,
    status: order.status,
    payment_status: order.payment_status,
    delivery_method: order.delivery_method,
    grand_total: order.grand_total,
    items: order.items || [],
    customer: {
      name: order.customer?.name || "",
      phone: order.customer?.phone || "",
      city: order.customer?.city || "",
      address: order.customer?.address || "",
    },
    status_history: order.status_history || [],
    created_at: order.created_at,
    updated_at: order.updated_at,
  };
}

module.exports = async function handler(request, response) {
  try {
    if (!supabaseConfigured(true)) {
      return sendJson(response, 501, { message: "Supabase service role is not configured." });
    }

    if (request.method === "GET") {
      const customer = await authenticatedCustomer(request);
      const orders = customer ? await getCustomerOrdersForTracking(customer) : [];
      return sendJson(response, 200, {
        customer: publicCustomer(customer),
        orders: orders.map(publicOrder),
      });
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
