const customerStorageKey = "coverup-customer";

const state = {
  customer: JSON.parse(localStorage.getItem(customerStorageKey) || "null"),
  activeIdentity: "",
  pendingAvatarUrl: "",
};

const authCard = document.querySelector("[data-auth-card]");
const profilePanel = document.querySelector("[data-profile-panel]");
const authStatus = document.querySelector("[data-auth-status]");
const profileMessage = document.querySelector("[data-profile-message]");
const activeIdentityNode = document.querySelector("[data-active-identity]");
const logoutButton = document.querySelector("[data-logout-account]");
const profileForm = document.querySelector("[data-profile-form]");
const profileName = document.querySelector("[data-profile-name]");
const profileEmail = document.querySelector("[data-profile-email]");
const profileStatus = document.querySelector("[data-profile-status]");
const avatarInput = document.querySelector("[data-profile-avatar-input]");
const avatarPreview = document.querySelector("[data-profile-avatar-preview]");

function saveCustomer(customer) {
  state.customer = customer;
  if (customer) {
    localStorage.setItem(customerStorageKey, JSON.stringify(customer));
    return;
  }

  localStorage.removeItem(customerStorageKey);
}

function setStatus(message, type = "") {
  authStatus.textContent = message || "";
  authStatus.dataset.state = type;
}

function setProfileMessage(message, type = "") {
  profileMessage.textContent = message || "";
  profileMessage.dataset.state = type;
}

function loadAvatar() {
  avatarPreview.src = state.pendingAvatarUrl || state.customer?.avatar_url || "assets/brand/cover-up-symbol.png";
}

function syncVerifyIdentity() {
  const verifyForm = document.querySelector('[data-auth-form="verify"]');
  if (!verifyForm) {
    return;
  }

  verifyForm.elements.identity.value = state.activeIdentity || state.customer?.email || state.customer?.username || "";
}

function openScreen(screen) {
  authCard.hidden = false;
  profilePanel.hidden = true;
  document.querySelectorAll("[data-auth-screen]").forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.authScreen === screen);
  });
  activeIdentityNode.textContent = state.activeIdentity || "لا توجد بيانات محددة بعد";
  syncVerifyIdentity();
  setStatus("");
}

function prefillIdentity(identity) {
  state.activeIdentity = String(identity || "").trim();
  const identityForms = [
    document.querySelector('[data-auth-form="login-identity"]'),
    document.querySelector('[data-auth-form="forgot"]'),
    document.querySelector('[data-auth-form="verify"]'),
  ];

  identityForms.forEach((form) => {
    if (form?.elements.identity && state.activeIdentity) {
      form.elements.identity.value = state.activeIdentity;
    }
  });
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "حصل خطأ في الطلب.");
  }
  return data;
}

async function loadSessionCustomer() {
  try {
    const result = await requestJson("/api/customer-session");
    saveCustomer(result.customer || null);
    return result.customer || null;
  } catch {
    saveCustomer(null);
    return null;
  }
}

async function accountRequest(payload) {
  return requestJson("/api/customer-auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

function redirectToStore() {
  window.setTimeout(() => {
    window.location.href = "products.html";
  }, 750);
}

function showProfile(message = "") {
  if (!state.customer) {
    openScreen("login-identity");
    return;
  }

  authCard.hidden = true;
  profilePanel.hidden = false;

  profileName.textContent = state.customer.name || "عميل Cover Up";
  profileEmail.textContent = state.customer.email || state.customer.username || "";
  profileStatus.textContent = state.customer.email_verified_at ? "الإيميل متأكد وجاهز." : "الإيميل لسه محتاج تأكيد.";

  profileForm.elements.name.value = state.customer.name || "";
  profileForm.elements.phone.value = state.customer.phone || "";
  profileForm.elements.email.value = state.customer.email || "";
  profileForm.elements.username.value = state.customer.username || "";
  profileForm.elements.city.value = state.customer.city || "";
  profileForm.elements.address.value = state.customer.address || "";
  profileForm.elements.notes.value = state.customer.notes || "";
  state.pendingAvatarUrl = state.customer.avatar_url || "";
  loadAvatar();
  setProfileMessage(message, message ? "success" : "");
}

async function uploadAvatar(file) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const uploaded = await requestJson("/api/storage-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind: "avatar",
      fileName: file.name || "avatar.png",
      dataUrl,
    }),
  });

  state.pendingAvatarUrl = uploaded.url;
  loadAvatar();
  setProfileMessage("تم رفع الصورة، اضغط حفظ التعديلات لتأكيدها على الحساب.", "success");
}

document.querySelectorAll("[data-open-screen]").forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.dataset.openScreen;
    if (target === "forgot") {
      prefillIdentity(state.activeIdentity || state.customer?.email || state.customer?.username || "");
    }
    openScreen(target);
  });
});

document.querySelector('[data-auth-form="login-identity"]').addEventListener("submit", (event) => {
  event.preventDefault();
  const identity = String(new FormData(event.currentTarget).get("identity") || "").trim();
  if (!identity) {
    setStatus("اكتب الإيميل أو رقم الموبايل أو اسم المستخدم أولًا.", "error");
    return;
  }

  prefillIdentity(identity);
  openScreen("login-password");
});

document.querySelector('[data-auth-form="login-password"]').addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("بنراجع بيانات الدخول...", "loading");

  try {
    const password = String(new FormData(event.currentTarget).get("password") || "");
    const result = await accountRequest({
      action: "login",
      identity: state.activeIdentity,
      password,
    });

    saveCustomer(result.customer);
    prefillIdentity(result.customer.email || result.customer.username);

    if (result.requiresEmailVerification) {
      openScreen("verify");
      setStatus("تم تسجيل الدخول. باقي تأكيد الإيميل بكود التفعيل.", "success");
      return;
    }

    setStatus("تم تسجيل الدخول بنجاح. هنفتح الموقع دلوقتي.", "success");
    redirectToStore();
  } catch (error) {
    setStatus(error.message, "error");
  }
});

document.querySelector('[data-auth-form="register"]').addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("بننشئ الحساب...", "loading");

  try {
    const payload = Object.fromEntries(new FormData(event.currentTarget));
    payload.action = "register";
    const result = await accountRequest(payload);
    saveCustomer(result.customer);
    prefillIdentity(result.customer.email || result.customer.username);
    event.currentTarget.reset();
    openScreen("verify");
    setStatus(
      result.emailDeliveryReady
        ? "الحساب اتعمل وكود التأكيد اتبعت على الإيميل."
        : "الحساب اتعمل، لكن خدمة الإيميل لسه محتاجة تفعيل كامل.",
      result.emailDeliveryReady ? "success" : "warning",
    );
  } catch (error) {
    setStatus(error.message, "error");
  }
});

document.querySelector('[data-auth-form="forgot"]').addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("بنراجع طلب الاسترجاع...", "loading");

  try {
    const payload = Object.fromEntries(new FormData(event.currentTarget));
    payload.action = "forgotPassword";
    const result = await accountRequest(payload);
    setStatus(result.message, "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
});

document.querySelector('[data-auth-form="verify"]').addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("بنتأكد من الكود...", "loading");

  try {
    const payload = Object.fromEntries(new FormData(event.currentTarget));
    payload.action = "verifyEmail";
    const result = await accountRequest(payload);
    saveCustomer(result.customer);
    prefillIdentity(result.customer.email || result.customer.username);
    setStatus("تم تأكيد الإيميل بنجاح. هنفتح الموقع دلوقتي.", "success");
    redirectToStore();
  } catch (error) {
    setStatus(error.message, "error");
  }
});

document.querySelector("[data-resend-code]").addEventListener("click", async () => {
  const verifyForm = document.querySelector('[data-auth-form="verify"]');
  const identity = verifyForm.elements.identity.value.trim() || state.activeIdentity || state.customer?.email || state.customer?.username;
  if (!identity) {
    setStatus("اكتب الإيميل أو اسم المستخدم الأول.", "error");
    return;
  }

  setStatus("بنرسل كود جديد...", "loading");

  try {
    const result = await accountRequest({ action: "resendVerification", identity });
    prefillIdentity(identity);
    setStatus(result.message, "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
});

profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!state.customer) {
    openScreen("login-identity");
    return;
  }

  setProfileMessage("بنحفظ التعديلات...", "loading");

  try {
    const payload = Object.fromEntries(new FormData(event.currentTarget));
    payload.action = "updateProfile";
    payload.avatar_url = state.pendingAvatarUrl || state.customer.avatar_url || "";
    const result = await accountRequest(payload);
    saveCustomer(result.customer);
    state.pendingAvatarUrl = result.customer.avatar_url || "";
    showProfile("تم حفظ بيانات الحساب بنجاح.");
  } catch (error) {
    setProfileMessage(error.message, "error");
  }
});

avatarInput.addEventListener("change", async () => {
  const file = avatarInput.files?.[0];
  if (!file || !state.customer) {
    return;
  }

  if (file.size > 2 * 1024 * 1024) {
    setProfileMessage("اختار صورة أقل من 2 ميجا.", "error");
    avatarInput.value = "";
    return;
  }

  try {
    setProfileMessage("بنرفع الصورة...", "loading");
    await uploadAvatar(file);
    avatarInput.value = "";
  } catch (error) {
    setProfileMessage(error.message, "error");
  }
});

logoutButton.addEventListener("click", async () => {
  try {
    await requestJson("/api/customer-session", { method: "DELETE" });
  } catch {
    // keep client cleanup even if the request fails
  }

  saveCustomer(null);
  state.pendingAvatarUrl = "";
  prefillIdentity("");
  openScreen("login-identity");
  setStatus("تم تسجيل الخروج.", "success");
});

async function init() {
  const customer = await loadSessionCustomer();
  prefillIdentity(customer?.email || customer?.username || "");

  if (customer) {
    showProfile();
    return;
  }

  openScreen("login-identity");
}

init();
