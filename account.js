const customerStorageKey = "coverup-customer";
const avatarStoragePrefix = "coverup-profile-avatar:";

const state = {
  customer: JSON.parse(localStorage.getItem(customerStorageKey) || "null"),
  activeIdentity: "",
  screen: "login-identity",
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

function avatarKey() {
  return `${avatarStoragePrefix}${state.customer?.id || "guest"}`;
}

function loadAvatar() {
  const savedAvatar = state.customer ? localStorage.getItem(avatarKey()) : "";
  avatarPreview.src = savedAvatar || "assets/brand/cover-up-symbol.png";
}

function syncVerifyIdentity() {
  const verifyForm = document.querySelector('[data-auth-form="verify"]');
  if (!verifyForm) {
    return;
  }

  const identityField = verifyForm.elements.identity;
  identityField.value = state.activeIdentity || state.customer?.email || state.customer?.username || "";
}

function openScreen(screen) {
  state.screen = screen;
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
  const loginIdentityForm = document.querySelector('[data-auth-form="login-identity"]');
  const forgotForm = document.querySelector('[data-auth-form="forgot"]');
  const verifyForm = document.querySelector('[data-auth-form="verify"]');

  if (loginIdentityForm?.elements.identity && state.activeIdentity) {
    loginIdentityForm.elements.identity.value = state.activeIdentity;
  }

  if (forgotForm?.elements.identity && state.activeIdentity) {
    forgotForm.elements.identity.value = state.activeIdentity;
  }

  if (verifyForm?.elements.identity && state.activeIdentity) {
    verifyForm.elements.identity.value = state.activeIdentity;
  }
}

async function accountRequest(payload) {
  const response = await fetch("/api/customer-auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "حصل خطأ في الحساب.");
  }

  return data;
}

function redirectToStore() {
  window.setTimeout(() => {
    window.location.href = "index.html";
  }, 750);
}

function showProfile(message = "") {
  if (!state.customer) {
    openScreen("login-identity");
    return;
  }

  authCard.hidden = true;
  profilePanel.hidden = false;

  const verified = Boolean(state.customer.email_verified_at);
  profileName.textContent = state.customer.name || "عميل Cover Up";
  profileEmail.textContent = state.customer.email || state.customer.username || "";
  profileStatus.textContent = verified ? "الإيميل متأكد وجاهز." : "الإيميل لسه محتاج تأكيد.";

  profileForm.elements.name.value = state.customer.name || "";
  profileForm.elements.phone.value = state.customer.phone || "";
  profileForm.elements.email.value = state.customer.email || "";
  profileForm.elements.username.value = state.customer.username || "";
  profileForm.elements.city.value = state.customer.city || "";
  profileForm.elements.address.value = state.customer.address || "";
  profileForm.elements.notes.value = state.customer.notes || "";

  loadAvatar();
  setProfileMessage(message, message ? "success" : "");
}

document.querySelectorAll("[data-open-screen]").forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.dataset.openScreen;

    if (target === "forgot") {
      prefillIdentity(state.activeIdentity || state.customer?.email || state.customer?.username || "");
    }

    if (target === "verify") {
      syncVerifyIdentity();
    }

    openScreen(target);
  });
});

document.querySelector('[data-auth-form="login-identity"]').addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const identity = String(form.get("identity") || "").trim();

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
        : "الحساب اتعمل، لكن تفعيل الإيميل الرسمي لسه مطلوب عشان الكود يوصل.",
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

  if (!state.customer?.id) {
    openScreen("login-identity");
    return;
  }

  setProfileMessage("بنحفظ التعديلات...", "loading");

  try {
    const payload = Object.fromEntries(new FormData(event.currentTarget));
    payload.action = "updateProfile";
    payload.id = state.customer.id;

    const result = await accountRequest(payload);
    saveCustomer(result.customer);
    showProfile("تم حفظ بيانات الحساب بنجاح.");
  } catch (error) {
    setProfileMessage(error.message, "error");
  }
});

avatarInput.addEventListener("change", () => {
  const file = avatarInput.files?.[0];

  if (!file || !state.customer) {
    return;
  }

  if (file.size > 2 * 1024 * 1024) {
    setProfileMessage("اختار صورة أقل من 2 ميجا.", "error");
    avatarInput.value = "";
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    localStorage.setItem(avatarKey(), reader.result);
    avatarPreview.src = reader.result;
    setProfileMessage("تم تحديث صورة الحساب على الجهاز ده.", "success");
  });
  reader.readAsDataURL(file);
});

logoutButton.addEventListener("click", () => {
  saveCustomer(null);
  prefillIdentity("");
  openScreen("login-identity");
  setStatus("تم تسجيل الخروج.", "success");
});

prefillIdentity(state.customer?.email || state.customer?.username || "");

if (state.customer) {
  showProfile();
} else {
  openScreen("login-identity");
}
