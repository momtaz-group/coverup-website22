"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import AccountTabIcon from "@/components/AccountTabIcon";
import { useLanguage } from "@/context/LanguageContext";
import { supabase } from "@/utils/supabase";
import styles from "./page.module.css";

const CODE_LENGTH = 8;
const emptyCode = () => Array(CODE_LENGTH).fill("");
const MAX_LOCATIONS = 3;

export default function AccountPage() {
  const router = useRouter();
  const { locale } = useLanguage();
  const text = (ar, en) => (locale === "ar" ? ar : en);
  const [step, setStep] = useState("email");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState(emptyCode);
  const [status, setStatus] = useState("");
  const [activationStatus, setActivationStatus] = useState("");
  const [activationOpen, setActivationOpen] = useState(false);
  const [activationCodeSent, setActivationCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [profile, setProfile] = useState(null);
  const [profileTab, setProfileTab] = useState("name");
  const [profileName, setProfileName] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showLocationForm, setShowLocationForm] = useState(false);
  const [locationForm, setLocationForm] = useState({
    id: "",
    label: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    postalCode: "",
    phone: "",
    notes: "",
    isDefault: true,
  });
  const inputs = useRef([]);
  const isSignedInView = step === "signed-in";
  const profileTabs = [
    { id: "name", label: text("الاسم", "Name"), description: text("بيانات الحساب الأساسية", "Basic account details"), icon: "name" },
    { id: "email", label: text("البريد الإلكتروني", "Email"), description: text("عنوان تسجيل الدخول", "Sign-in address"), icon: "email" },
    { id: "password", label: text("كلمة المرور", "Password"), description: text("تحديث بيانات الأمان", "Update security details"), icon: "password" },
    { id: "location", label: text("العناوين", "Addresses"), description: text("العناوين المحفوظة والافتراضية", "Saved and default addresses"), icon: "location" },
  ];

  useEffect(() => {
    let active = true;
    const loadProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !active) return;
      const response = await fetch("/api/profile", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!active) return;
      if (!response.ok) {
        setStatus(data.message || "تعذر تحميل بيانات الحساب.");
        return;
      }
      const nextProfile = data.profile || {};
      setProfile(nextProfile);
      setProfileName(nextProfile.name || "");
      if (data.setupRequired) {
        setStatus(data.message || (locale === "ar" ? "جدول profiles غير موجود في Supabase بعد." : "The profiles table is not set up in Supabase yet."));
      }
    };

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (active && user) {
        setStep("signed-in");
        loadProfile();
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setPassword("");
        setStatus("تم التحقق من رابط الاستعادة. أدخل كلمة المرور الجديدة.");
        setStep("reset-password");
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [locale]);

  const profileRequest = async (body) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("يرجى تسجيل الدخول أولاً.");
    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "تعذر حفظ بيانات الحساب.");
    setProfile(data.profile);
    return data.profile;
  };

  const saveName = async (event) => {
    event.preventDefault();
    if (!profileName.trim()) return setStatus(text("يرجى إدخال الاسم.", "Please enter your name."));
    setBusy(true); setStatus("");
    try {
      await profileRequest({ name: profileName });
      await supabase.auth.updateUser({ data: { name: profileName.trim(), full_name: profileName.trim() } });
      setStatus(text("تم حفظ الاسم بنجاح.", "Name saved successfully."));
    } catch (error) { setStatus(error.message); }
    finally { setBusy(false); }
  };

  const savePassword = async (event) => {
    event.preventDefault();
    if (newPassword.length < 8) return setStatus("كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل.");
    if (newPassword !== confirmPassword) return setStatus("تأكيد كلمة المرور غير مطابق.");
    setBusy(true); setStatus("");
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: profile?.email || email, password: oldPassword });
      if (signInError) throw new Error("كلمة المرور الحالية غير صحيحة.");
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setOldPassword(""); setNewPassword(""); setConfirmPassword("");
      setStatus("تم تحديث كلمة المرور بنجاح.");
    } catch (error) { setStatus(error.message); }
    finally { setBusy(false); }
  };

  const saveLocation = async (event) => {
    event.preventDefault();
    if (!locationForm.address1.trim() || !locationForm.city.trim() || !locationForm.phone.trim()) {
      return setStatus(text("يرجى إدخال العنوان الأول والمدينة ورقم الهاتف.", "Please enter address line 1, city, and phone."));
    }
    const locations = Array.isArray(profile?.location) ? profile.location : [];
    if (!locationForm.id && locations.length >= MAX_LOCATIONS) {
      return setStatus(text("يمكنك حفظ حتى 3 عناوين فقط.", "You can save up to 3 addresses only."));
    }
    const next = { ...locationForm, id: locationForm.id || `location-${Date.now()}` };
    const nextLocations = locations.some((item) => item.id === next.id)
      ? locations.map((item) => item.id === next.id ? next : item)
      : [...locations, next];
    if (next.isDefault) nextLocations.forEach((item) => { item.isDefault = item.id === next.id; });
    setBusy(true); setStatus("");
    try {
      await profileRequest({ location: nextLocations });
      setLocationForm({ id: "", label: "", address1: "", address2: "", city: "", state: "", postalCode: "", phone: "", notes: "", isDefault: false });
      setShowLocationForm(false);
      setStatus(text("تم حفظ عنوان التوصيل.", "Address saved successfully."));
    } catch (error) { setStatus(error.message); }
    finally { setBusy(false); }
  };

  const editLocation = (location) => {
    setLocationForm({ ...location });
    setShowLocationForm(true);
    setProfileTab("location");
  };

  const startNewLocation = () => {
    setLocationForm({
      id: "",
      label: "",
      address1: "",
      address2: "",
      city: "",
      state: "",
      postalCode: "",
      phone: "",
      notes: "",
      isDefault: !Array.isArray(profile?.location) || profile.location.length === 0,
    });
    setShowLocationForm(true);
  };

  useEffect(() => {
    if (resendSeconds <= 0) return undefined;

    const timer = window.setInterval(() => {
      setResendSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  const beginResendCooldown = () => setResendSeconds(60);

  const isUnconfirmedEmailError = (error) => {
    const text = `${error?.code || ""} ${error?.message || ""}`.toLowerCase();
    return (
      text.includes("email_not_confirmed") ||
      text.includes("email not confirmed") ||
      text.includes("not confirmed") ||
      text.includes("confirm your email")
    );
  };

  const openActivationModal = () => {
    setCode(emptyCode());
    setActivationStatus("");
    setActivationCodeSent(false);
    setResendSeconds(0);
    setActivationOpen(true);
  };

  const closeActivationModal = () => {
    setActivationOpen(false);
    setActivationStatus("");
    setActivationCodeSent(false);
    setCode(emptyCode());
  };

  const authErrorMessage = (error) => {
    if (error?.code === "email_address_not_authorized") {
      return "إرسال البريد غير مفعّل لهذا العنوان. فعّل SMTP مخصص في Supabase أو اربط Resend/SMTP حتى تصل الأكواد إلى Gmail.";
    }

    if (error?.code === "over_email_send_rate_limit") {
      return "تم إرسال أكواد كثيرة لهذا البريد. انتظر دقيقة ثم جرّب مرة أخرى.";
    }

    return error?.message || "تعذر إرسال الرمز. حاول مرة أخرى.";
  };

  const checkEmailExists = async (emailToCheck) => {
    const cleanEmail = String(emailToCheck || "").trim().toLowerCase();
    if (!cleanEmail) return null;

    try {
      const res = await fetch("/api/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(data.message || "تعذر التحقق من البريد الإلكتروني الآن.");
        return null;
      }

      return Boolean(data.exists);
    } catch (err) {
      setStatus("تعذر الاتصال بخدمة التحقق من البريد الإلكتروني.");
    }

    return null;
  };

  const handleEmailNext = async (event) => {
    event?.preventDefault();
    if (!email.trim()) {
      setStatus("يرجى إدخال البريد الإلكتروني.");
      return;
    }

    setBusy(true);
    setStatus("");

    const exists = await checkEmailExists(email);
    setBusy(false);
    if (exists === null) return;

    if (exists) {
      setStatus("هذا البريد الإلكتروني مسجل لدينا. يرجى إدخال كلمة المرور لتسجيل الدخول.");
      setStep("password");
    } else {
      setStatus("هذا البريد الإلكتروني غير مسجل بعد. يمكنك إنشاء حساب جديد الآن.");
      setStep("name");
    }
  };

  const handleSignupEmailNext = async () => {
    if (!email.trim()) {
      setStatus("يرجى إدخال البريد الإلكتروني.");
      return;
    }

    setBusy(true);
    setStatus("");
    const exists = await checkEmailExists(email);
    setBusy(false);
    if (exists === null) return;

    if (exists === true) {
      setStatus("هذا البريد الإلكتروني مستخدم بالفعل! يرجى تسجيل الدخول بدلاً من ذلك أو استخدام بريد إلكتروني آخر.");
      return;
    }

    setStatus("البريد الإلكتروني متاح. أنشئ كلمة المرور.");
    setStep("signup-password");
  };

  const signIn = async (event) => {
    event.preventDefault();
    if (!email.trim() || !password) {
      setStatus("يرجى إدخال البريد الإلكتروني وكلمة المرور.");
      return;
    }

    setBusy(true);
    setStatus("");

    const exists = await checkEmailExists(email);
    if (exists === null) {
      setBusy(false);
      return;
    }

    if (!exists) {
      setBusy(false);
      setStatus("هذا البريد الإلكتروني غير مسجل. يرجى إنشاء حساب جديد أولاً.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setBusy(false);

    if (error) {
      if (isUnconfirmedEmailError(error)) {
        openActivationModal();
        return;
      }

      if (
        error.message.toLowerCase().includes("invalid login credentials") ||
        error.message.toLowerCase().includes("invalid")
      ) {
        setStatus("بيانات الدخول غير صحيحة (البريد الإلكتروني أو كلمة المرور).");
      } else {
        setStatus(error.message);
      }
      return;
    }

    router.push("/");
  };

  const signUp = async () => {
    if (!email.trim() || password.length < 8) {
      setStatus("يرجى إدخال بريد إلكتروني صحيح وكلمة مرور لا تقل عن 8 أحرف.");
      return;
    }

    setBusy(true);
    setStatus("");

    const exists = await checkEmailExists(email);
    if (exists === null) {
      setBusy(false);
      return;
    }

    if (exists === true) {
      setBusy(false);
      setStatus("هذا البريد الإلكتروني مستخدم بالفعل. يرجى تسجيل الدخول بدلاً من ذلك.");
      return;
    }

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { name },
        emailRedirectTo: `${window.location.origin}/account`,
      },
    });

    setBusy(false);

    if (error) {
      setStatus(authErrorMessage(error));
      return;
    }

    setCode(emptyCode());
    beginResendCooldown();
    setStatus("أرسلنا رمز التحقق إلى بريدك الإلكتروني.");
    setStep("verify");
  };

  const resendSignupCode = async () => {
    if (resendSeconds > 0 || busy) return;
    if (!email.trim()) {
      setStatus("يرجى إدخال البريد الإلكتروني.");
      return;
    }

    setBusy(true);
    setStatus("");

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/account`,
      },
    });

    setBusy(false);

    if (error) {
      setStatus(authErrorMessage(error));
      return;
    }

    setCode(emptyCode());
    beginResendCooldown();
    setStatus("أرسلنا رمز تحقق جديد إلى بريدك الإلكتروني.");
  };

  const sendActivationCode = async () => {
    if (resendSeconds > 0 || busy) return;
    if (!email.trim()) {
      setActivationStatus("يرجى إدخال البريد الإلكتروني أولاً.");
      return;
    }

    setBusy(true);
    setActivationStatus("");

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/account`,
      },
    });

    setBusy(false);

    if (error) {
      setActivationStatus(authErrorMessage(error));
      return;
    }

    setCode(emptyCode());
    setActivationCodeSent(true);
    beginResendCooldown();
    setActivationStatus(`أرسلنا رمز التفعيل المكون من ${CODE_LENGTH} أرقام إلى بريدك الإلكتروني.`);
  };

  const verifyActivationCode = async (event) => {
    event?.preventDefault();
    const tokenCode = code.join("");
    if (tokenCode.length < CODE_LENGTH) {
      setActivationStatus(`يرجى إدخال رمز التفعيل المكون من ${CODE_LENGTH} أرقام بالكامل.`);
      return;
    }

    setBusy(true);
    setActivationStatus("");

    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: tokenCode,
      type: "signup",
    });

    setBusy(false);

    if (error) {
      setActivationStatus("رمز التفعيل غير صحيح أو منتهي الصلاحية.");
      return;
    }

    closeActivationModal();
    router.push("/");
  };

  const verify = async (event) => {
    event.preventDefault();
    const tokenCode = code.join("");
    if (tokenCode.length < CODE_LENGTH) {
      setStatus(`يرجى إدخال رمز التحقق المكون من ${CODE_LENGTH} أرقام.`);
      return;
    }

    setBusy(true);
    setStatus("");

    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: tokenCode,
      type: "email",
    });
    setBusy(false);

    if (error) {
      setStatus("رمز التحقق غير صحيح أو منتهي الصلاحية.");
      return;
    }

    router.push("/");
  };

  const startForgotPassword = () => {
    setCode(emptyCode());
    setResendSeconds(0);
    setStatus("");
    setStep("forgot-email");
  };

  const sendForgotCode = async (event) => {
    event?.preventDefault();
    if (resendSeconds > 0 && step === "forgot-verify") return;

    if (!email.trim()) {
      setStatus("يرجى إدخال البريد الإلكتروني.");
      return;
    }

    setBusy(true);
    setStatus("");

    const exists = await checkEmailExists(email);
    if (exists === null) {
      setBusy(false);
      return;
    }

    if (exists === false) {
      setBusy(false);
      setStatus("هذا البريد الإلكتروني غير مسجل في النظام. يرجى التأكد منه أو إنشاء حساب جديد.");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/account`,
    });
    setBusy(false);

    if (error) {
      setStatus(authErrorMessage(error));
      return;
    }

    setCode(emptyCode());
    beginResendCooldown();
    setStatus(`تم إرسال رمز استعادة كلمة المرور المكون من ${CODE_LENGTH} أرقام إلى بريدك الإلكتروني.`);
    setStep("forgot-verify");
  };

  const verifyForgotCode = async (event) => {
    event?.preventDefault();
    const tokenCode = code.join("");
    if (tokenCode.length < CODE_LENGTH) {
      setStatus(`يرجى إدخال الرمز المكون من ${CODE_LENGTH} أرقام بالكامل.`);
      return;
    }

    setBusy(true);
    setStatus("");

    let { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: tokenCode,
      type: "recovery",
    });

    if (error) {
      const fallback = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: tokenCode,
        type: "email",
      });
      if (!fallback.error) error = null;
    }

    setBusy(false);

    if (error) {
      setStatus("رمز التحقق غير صحيح أو منتهي الصلاحية.");
      return;
    }

    setPassword("");
    setStatus("تم التحقق بنجاح. أرجو إدخال كلمة المرور الجديدة.");
    setStep("reset-password");
  };

  const saveNewPassword = async (event) => {
    event?.preventDefault();
    if (password.length < 8) {
      setStatus("يجب أن تكون كلمة المرور 8 أحرف على الأقل.");
      return;
    }

    setBusy(true);
    setStatus("");

    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);

    if (error) {
      setStatus(error.message);
      return;
    }

    setStatus("تم تحديث كلمة المرور بنجاح! يمكنك الآن استخدام حسابك.");
    setStep("signed-in");
  };

  const updateCode = (value, index) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...code];
    next[index] = value;
    setCode(next);

    if (value && index < CODE_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const title = {
    email: "تسجيل الدخول",
    password: "أهلاً بعودتك",
    name: "إنشاء حساب",
    "signup-email": "البريد الإلكتروني",
    "signup-password": "كلمة المرور",
    verify: "تأكيد البريد",
    "forgot-email": "استعادة كلمة المرور",
    "forgot-verify": "رمز التحقق للاستعادة",
    "reset-password": "كلمة المرور الجديدة",
    "signed-in": "تم تسجيل الدخول",
  }[step];

  const resendLabel = resendSeconds > 0
    ? `إعادة الإرسال بعد ${resendSeconds} ثانية`
    : "إعادة إرسال الرمز";

  return (
    <main className={`${styles.page} ${isSignedInView ? styles.pageProfile : ""}`} dir="rtl">
      <section className={`${styles.card} ${isSignedInView ? styles.profileCard : ""}`}>
        <div className={styles.brand}>
          <Image src="/assets/brand/cover-up-symbol.png" alt="Cover Up" width={44} height={44} />
          <strong>
            Cover <i>Up</i>
          </strong>
        </div>

        <div className={`${styles.content} ${isSignedInView ? styles.contentProfile : ""}`}>
          <h1>{title}</h1>

          {step === "email" && (
            <>
              <p>استخدم حساب Cover Up للمتابعة وحفظ أجهزتك وطلباتك.</p>
              <form onSubmit={handleEmailNext}>
                <input
                  type="email"
                  placeholder="البريد الإلكتروني"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoFocus
                />
                <button
                  className={styles.linkButton}
                  type="button"
                  onClick={() => {
                    setStatus("");
                    setStep("name");
                  }}
                >
                  إنشاء حساب جديد
                </button>
                <button
                  className={styles.linkButton}
                  type="button"
                  onClick={startForgotPassword}
                >
                  نسيت كلمة المرور؟
                </button>
                <div className={styles.actions}>
                  <button className={styles.next} disabled={busy}>
                    {busy ? "جارٍ التحقق..." : "التالي"}
                  </button>
                </div>
              </form>
            </>
          )}

          {step === "password" && (
            <>
              <p>أدخل كلمة المرور الخاصة بهذا البريد.</p>
              <form onSubmit={signIn}>
                <input
                  type="password"
                  placeholder="كلمة المرور"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  autoFocus
                />
                <button
                  className={styles.linkButton}
                  type="button"
                  onClick={startForgotPassword}
                >
                  نسيت كلمة المرور؟
                </button>
                <div className={styles.actions}>
                  <button
                    className={styles.back}
                    type="button"
                    onClick={() => {
                      setStatus("");
                      setStep("email");
                    }}
                  >
                    رجوع
                  </button>
                  <button className={styles.next} disabled={busy}>
                    {busy ? "جارٍ الدخول..." : "تسجيل الدخول"}
                  </button>
                </div>
              </form>
            </>
          )}

          {step === "name" && (
            <>
              <p>الخطوة الأولى: اكتب الاسم الكامل.</p>
              <input
                placeholder="الاسم الكامل"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoFocus
              />
              <div className={styles.actions}>
                <button
                  className={styles.back}
                  type="button"
                  onClick={() => {
                    setStatus("");
                    setStep("email");
                  }}
                >
                  رجوع
                </button>
                <button
                  className={styles.next}
                  type="button"
                  onClick={() => {
                    if (name.trim()) {
                      setStatus("");
                      setStep("signup-email");
                    }
                  }}
                >
                  التالي
                </button>
              </div>
            </>
          )}

          {step === "signup-email" && (
            <>
              <p>الخطوة الثانية: أضف بريدك الإلكتروني.</p>
              <input
                type="email"
                placeholder="البريد الإلكتروني"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoFocus
              />
              <div className={styles.actions}>
                <button
                  className={styles.back}
                  type="button"
                  onClick={() => {
                    setStatus("");
                    setStep("name");
                  }}
                >
                  رجوع
                </button>
                <button
                  className={styles.next}
                  type="button"
                  disabled={busy || !email.trim()}
                  onClick={handleSignupEmailNext}
                >
                  {busy ? "جارٍ التحقق..." : "التالي"}
                </button>
              </div>
            </>
          )}

          {step === "signup-password" && (
            <>
              <p>الخطوة الثالثة: أنشئ كلمة مرور من 8 أحرف على الأقل.</p>
              <input
                type="password"
                placeholder="كلمة المرور"
                minLength="8"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoFocus
              />
              <div className={styles.actions}>
                <button
                  className={styles.back}
                  type="button"
                  onClick={() => {
                    setStatus("");
                    setStep("signup-email");
                  }}
                >
                  رجوع
                </button>
                <button
                  className={styles.next}
                  type="button"
                  disabled={busy || password.length < 8}
                  onClick={signUp}
                >
                  {busy ? "جارٍ الإنشاء..." : "إنشاء الحساب"}
                </button>
              </div>
            </>
          )}

          {step === "verify" && (
            <>
              <p>
                أدخل رمز التحقق المكون من {CODE_LENGTH} أرقام المرسل إلى <b>{email}</b>.
              </p>
              <form onSubmit={verify}>
                <div className={styles.code}>
                  {code.map((digit, index) => (
                    <input
                      key={index}
                      ref={(element) => {
                        inputs.current[index] = element;
                      }}
                      value={digit}
                      onChange={(event) => updateCode(event.target.value, index)}
                      onKeyDown={(event) => {
                        if (event.key === "Backspace" && !digit && index) {
                          inputs.current[index - 1]?.focus();
                        }
                      }}
                      inputMode="numeric"
                      maxLength="1"
                      aria-label={`الرقم ${index + 1}`}
                    />
                  ))}
                </div>
                <button
                  className={styles.linkButton}
                  type="button"
                  onClick={resendSignupCode}
                  disabled={busy || resendSeconds > 0}
                >
                  {resendLabel}
                </button>
                <div className={styles.actions}>
                  <button
                    className={styles.back}
                    type="button"
                    onClick={() => {
                      setStatus("");
                      setStep("signup-password");
                    }}
                  >
                    رجوع
                  </button>
                  <button className={styles.next} disabled={busy}>
                    {busy ? "جارٍ التأكيد..." : "تأكيد"}
                  </button>
                </div>
              </form>
            </>
          )}

          {step === "forgot-email" && (
            <>
              <p>أدخل بريدك الإلكتروني لإرسال رمز إعادة تعيين كلمة المرور.</p>
              <form onSubmit={sendForgotCode}>
                <input
                  type="email"
                  placeholder="البريد الإلكتروني"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoFocus
                />
                <div className={styles.actions}>
                  <button
                    className={styles.back}
                    type="button"
                    onClick={() => {
                      setStatus("");
                      setStep("password");
                    }}
                  >
                    رجوع
                  </button>
                  <button className={styles.next} disabled={busy}>
                    {busy ? "جارٍ الإرسال..." : "إرسال الرمز"}
                  </button>
                </div>
              </form>
            </>
          )}

          {step === "forgot-verify" && (
            <>
              <p>
                أدخل رمز التحقق المكون من {CODE_LENGTH} أرقام المرسل إلى <b>{email}</b> لاستعادة كلمة المرور.
              </p>
              <form onSubmit={verifyForgotCode}>
                <div className={styles.code}>
                  {code.map((digit, index) => (
                    <input
                      key={index}
                      ref={(element) => {
                        inputs.current[index] = element;
                      }}
                      value={digit}
                      onChange={(event) => updateCode(event.target.value, index)}
                      onKeyDown={(event) => {
                        if (event.key === "Backspace" && !digit && index) {
                          inputs.current[index - 1]?.focus();
                        }
                      }}
                      inputMode="numeric"
                      maxLength="1"
                      aria-label={`الرقم ${index + 1}`}
                    />
                  ))}
                </div>
                <button
                  className={styles.linkButton}
                  type="button"
                  onClick={sendForgotCode}
                  disabled={busy || resendSeconds > 0}
                >
                  {resendLabel}
                </button>
                <div className={styles.actions}>
                  <button
                    className={styles.back}
                    type="button"
                    onClick={() => {
                      setStatus("");
                      setStep("forgot-email");
                    }}
                  >
                    رجوع
                  </button>
                  <button className={styles.next} disabled={busy}>
                    {busy ? "جارٍ التحقق..." : "تأكيد"}
                  </button>
                </div>
              </form>
            </>
          )}

          {step === "reset-password" && (
            <>
              <p>أدخل كلمة المرور الجديدة لحسابك (8 أحرف على الأقل).</p>
              <form onSubmit={saveNewPassword}>
                <input
                  type="password"
                  placeholder="كلمة المرور الجديدة"
                  minLength="8"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  autoFocus
                />
                <div className={styles.actions}>
                  <button
                    className={styles.next}
                    disabled={busy || password.length < 8}
                  >
                    {busy ? "جارٍ الحفظ..." : "حفظ كلمة المرور"}
                  </button>
                </div>
              </form>
            </>
          )}

          {step === "signed-in" && (
            <>
              <div className={styles.profileHeader}>
                <div className={styles.profileIdentity}>
                  <p className={styles.profileEyebrow}>{text("إعدادات الحساب", "Account settings")}</p>
                  <h2>{profile?.name || text("حسابي", "My account")}</h2>
                  <span>{profile?.email || email}</span>
                  <small>{text("إدارة بياناتك وعناوينك من مكان واحد.", "Manage your details and saved addresses in one place.")}</small>
                </div>
                <button className={styles.back} type="button" onClick={() => router.push("/")}>{text("الرئيسية", "Home")}</button>
              </div>
              <div className={styles.profileLayout}>
                <nav className={styles.profileTabs} aria-label={text("إعدادات الحساب", "Account settings")}>
                  {profileTabs.map((tab) => (
                    <button
                      key={tab.id}
                      className={profileTab === tab.id ? styles.activeTab : ""}
                      type="button"
                      onClick={() => setProfileTab(tab.id)}
                    >
                      <span className={styles.tabIconWrap}>
                        <AccountTabIcon name={tab.icon} className={styles.tabIcon} />
                      </span>
                      <span className={styles.tabText}>
                        <strong>{tab.label}</strong>
                        <small>{tab.description}</small>
                      </span>
                    </button>
                  ))}
                  <button className={styles.signOutTab} type="button" onClick={() => supabase.auth.signOut().then(() => { setStatus(""); setStep("email"); })}>
                    <span className={styles.tabIconWrap}>
                      <AccountTabIcon name="signout" className={styles.tabIcon} />
                    </span>
                    <span className={styles.tabText}>
                      <strong>{text("تسجيل الخروج", "Sign out")}</strong>
                      <small>{text("إنهاء الجلسة الحالية", "End the current session")}</small>
                    </span>
                  </button>
                </nav>
                <section className={styles.profilePanel}>
                  {profileTab === "name" && <form onSubmit={saveName} className={styles.settingsForm}>
                    <h3>{text("الاسم", "Name")}</h3>
                    <p>{text("حدّث الاسم الذي يظهر في حسابك وطلباتك.", "Update the name shown in your account and orders.")}</p>
                    <label>{text("الاسم", "Name")}<input value={profileName} onChange={(event) => setProfileName(event.target.value)} required /></label>
                    <button className={styles.next} disabled={busy}>{busy ? text("جارٍ الحفظ...", "Saving...") : text("حفظ التغييرات", "Save changes")}</button>
                  </form>}
                  {profileTab === "email" && <div className={styles.settingsForm}>
                    <h3>{text("البريد الإلكتروني", "Email")}</h3><p>{text("البريد المرتبط بحسابك في Supabase Auth.", "The email linked to your Supabase Auth account.")}</p>
                    <label>{text("البريد الإلكتروني", "Email")}<input value={profile?.email || email} readOnly type="email" /></label>
                  </div>}
                  {profileTab === "password" && <form onSubmit={savePassword} className={styles.settingsForm}>
                    <h3>{text("تحديث كلمة المرور", "Update password")}</h3><p>{text("أدخل كلمة المرور الحالية أولاً لحماية حسابك.", "Enter your current password first to protect your account.")}</p>
                    <label>{text("كلمة المرور الحالية", "Current password")}<input type="password" value={oldPassword} onChange={(event) => setOldPassword(event.target.value)} required /></label>
                    <label>{text("كلمة المرور الجديدة", "New password")}<input type="password" minLength="8" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required /></label>
                    <label>{text("تأكيد كلمة المرور", "Confirm password")}<input type="password" minLength="8" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /></label>
                    <button className={styles.next} disabled={busy}>{busy ? text("جارٍ الحفظ...", "Saving...") : text("تحديث كلمة المرور", "Update password")}</button>
                  </form>}
                  {profileTab === "location" && <div className={styles.settingsForm}>
                    <h3>{text("عناوين التوصيل", "Delivery addresses")}</h3><p>{text("احفظ حتى 3 عناوين واختر العنوان الافتراضي عند الدفع.", "Save up to 3 addresses and choose the default one at checkout.")}</p>
                    {Array.isArray(profile?.location) && profile.location.length > 0 && <div className={styles.savedLocations}>
                      {profile.location.map((location) => (
                        <article key={location.id} className={styles.savedLocation}>
                          <div className={styles.savedLocationTop}>
                            <div>
                              <strong>{location.label || text("عنوان", "Address")}</strong>
                              {location.isDefault && <small>{text("العنوان الافتراضي", "Default address")}</small>}
                            </div>
                            <button type="button" className={styles.editLocationButton} onClick={() => editLocation(location)} aria-label={text("تعديل العنوان", "Edit address")}>
                              <AccountTabIcon name="edit" className={styles.editLocationIcon} />
                              <span>{text("تعديل", "Edit")}</span>
                            </button>
                          </div>
                          <span>{[location.address1, location.address2].filter(Boolean).join(", ")}</span>
                          <span>{[location.city, location.state, location.postalCode].filter(Boolean).join(" - ")}</span>
                          <span>{location.phone}</span>
                        </article>
                      ))}
                    </div>}
                    <div className={styles.locationActions}>
                      <button type="button" className={styles.addAddressButton} disabled={Array.isArray(profile?.location) && profile.location.length >= MAX_LOCATIONS && !showLocationForm} onClick={startNewLocation}>
                        {text("إضافة عنوان", "Add address")}
                      </button>
                      <span>{text(`تم حفظ ${Array.isArray(profile?.location) ? profile.location.length : 0} من 3`, `Saved ${(Array.isArray(profile?.location) ? profile.location.length : 0)} of 3`)}</span>
                    </div>
                    {showLocationForm && <form onSubmit={saveLocation} className={styles.locationForm}>
                      <div className={styles.locationFormHeader}>
                        <h4>{locationForm.id ? text("تعديل العنوان", "Edit address") : text("عنوان جديد", "New address")}</h4>
                        <button type="button" className={styles.linkButton} onClick={() => setShowLocationForm(false)}>{text("إلغاء", "Cancel")}</button>
                      </div>
                      <div className={styles.formGrid}><label>{text("اسم العنوان", "Address label")}<input value={locationForm.label} onChange={(event) => setLocationForm({ ...locationForm, label: event.target.value })} placeholder={text("مثال: المنزل", "e.g. Home")} /></label><label>{text("رقم الهاتف", "Phone number")}<input type="tel" value={locationForm.phone} onChange={(event) => setLocationForm({ ...locationForm, phone: event.target.value })} required /></label></div>
                      <label>{text("العنوان الأول", "Address line 1")}<input value={locationForm.address1} onChange={(event) => setLocationForm({ ...locationForm, address1: event.target.value })} required placeholder={text("رقم المبنى واسم الشارع", "Building number and street")} /></label>
                      <label>{text("العنوان الثاني", "Address line 2")}<input value={locationForm.address2} onChange={(event) => setLocationForm({ ...locationForm, address2: event.target.value })} placeholder={text("الشقة، الدور، العلامة المميزة", "Apartment, floor, landmark")} /></label>
                      <div className={styles.formGrid}><label>{text("المدينة", "City")}<input value={locationForm.city} onChange={(event) => setLocationForm({ ...locationForm, city: event.target.value })} required /></label><label>{text("المحافظة / المنطقة", "State / area")}<input value={locationForm.state} onChange={(event) => setLocationForm({ ...locationForm, state: event.target.value })} /></label></div>
                      <div className={styles.formGrid}><label>{text("الرمز البريدي", "Postal code")}<input value={locationForm.postalCode} onChange={(event) => setLocationForm({ ...locationForm, postalCode: event.target.value })} /></label><label>{text("ملاحظات التوصيل", "Delivery notes")}<input value={locationForm.notes} onChange={(event) => setLocationForm({ ...locationForm, notes: event.target.value })} /></label></div>
                      <label className={styles.checkbox}><input type="checkbox" checked={locationForm.isDefault} onChange={(event) => setLocationForm({ ...locationForm, isDefault: event.target.checked })} /> {text("استخدام هذا العنوان افتراضياً", "Use this as the default address")}</label>
                      <button className={styles.next} disabled={busy}>{busy ? text("جارٍ الحفظ...", "Saving...") : locationForm.id ? text("تحديث العنوان", "Update address") : text("حفظ العنوان", "Save address")}</button>
                    </form>}
                  </div>}
                </section>
              </div>
            </>
          )}

          {status && <div className={styles.status}>{status}</div>}
        </div>
      </section>

      {activationOpen && (
        <div className={styles.modalOverlay} role="presentation">
          <section
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="activation-title"
          >
            <button
              className={styles.modalClose}
              type="button"
              aria-label="إغلاق"
              onClick={closeActivationModal}
            >
              ×
            </button>

            <div className={styles.modalBrand}>
              <Image src="/assets/brand/cover-up-symbol.png" alt="Cover Up" width={50} height={50} />
              <strong>
                Cover <i>Up</i>
              </strong>
            </div>

            <div className={styles.modalContent}>
              <h2 id="activation-title">تفعيل البريد الإلكتروني</h2>
              <p>
                هذا الحساب موجود لكن البريد الإلكتروني لم يتم تفعيله بعد. أرسل رمز التفعيل إلى <b>{email}</b> ثم أدخله هنا.
              </p>

              {!activationCodeSent ? (
                <div className={styles.actions}>
                  <button className={styles.next} type="button" disabled={busy} onClick={sendActivationCode}>
                    {busy ? "جارٍ الإرسال..." : "إرسال رمز التفعيل"}
                  </button>
                </div>
              ) : (
                <form onSubmit={verifyActivationCode}>
                  <div className={styles.code}>
                    {code.map((digit, index) => (
                      <input
                        key={index}
                        ref={(element) => {
                          inputs.current[index] = element;
                        }}
                        value={digit}
                        onChange={(event) => updateCode(event.target.value, index)}
                        onKeyDown={(event) => {
                          if (event.key === "Backspace" && !digit && index) {
                            inputs.current[index - 1]?.focus();
                          }
                        }}
                        inputMode="numeric"
                        maxLength="1"
                        aria-label={`رقم التفعيل ${index + 1}`}
                      />
                    ))}
                  </div>
                  <button
                    className={styles.linkButton}
                    type="button"
                    onClick={sendActivationCode}
                    disabled={busy || resendSeconds > 0}
                  >
                    {resendLabel}
                  </button>
                  <div className={styles.actions}>
                    <button className={styles.next} disabled={busy}>
                      {busy ? "جارٍ التفعيل..." : "تفعيل الحساب"}
                    </button>
                  </div>
                </form>
              )}

              {activationStatus && <div className={styles.status}>{activationStatus}</div>}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
