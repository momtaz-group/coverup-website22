function sendJson(response, statusCode, payload) {
  response.status(statusCode).json(payload);
}

module.exports = async function handler(request, response) {
  if (request.method !== "POST" && request.method !== "GET") {
    return sendJson(response, 405, { message: "Method not allowed" });
  }

  return sendJson(response, 200, { received: true });
};
