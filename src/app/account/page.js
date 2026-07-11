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
  const [step, setStep] = useState("loading");
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
    recipientName: "",
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
      if (active) {
        if (user) {
          setStep("signed-in");
          loadProfile();
        } else {
          setStep("email");
        }
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
      setLocationForm({ id: "", recipientName: "", label: "", address1: "", address2: "", city: "", state: "", postalCode: "", phone: "", notes: "", isDefault: false });
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
    "loading": "جارٍ التحميل...",
  }[step];

  const resendLabel = resendSeconds > 0
    ? `إعادة الإرسال بعد ${resendSeconds} ثانية`
    : "إعادة إرسال الرمز";

  if (step === "loading") {
    return (
      <main className={styles.page} style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
        <p style={{ color: 'var(--muted)' }}>{text("جارٍ التحميل...", "Loading...")}</p>
      </main>
    );
  }

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
            <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto', background: 'var(--panel)', padding: '32px', borderRadius: '24px', border: '1px solid var(--line)', boxShadow: '0 8px 32px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--line)', paddingBottom: '24px', marginBottom: '24px' }}>
                <div>
                  <h2 style={{ margin: '0 0 4px', fontSize: '24px', color: 'var(--text)' }}>{profile?.name || text("حسابي", "My account")}</h2>
                  <p style={{ margin: 0, color: 'var(--muted)', fontSize: '14px' }}>{profile?.email || email}</p>
                </div>
                <button type="button" onClick={() => supabase.auth.signOut().then(() => { setStatus(""); setStep("email"); })} style={{ background: 'rgba(255, 77, 77, 0.1)', color: '#ff4d4d', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}>
                  {text("تسجيل الخروج", "Sign out")}
                </button>
              </div>

              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '200px', flex: 1 }}>
                  {profileTabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setProfileTab(tab.id)}
                      style={{ 
                        display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderRadius: '12px', border: 'none', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'start',
                        background: profileTab === tab.id ? '#0070f3' : 'var(--input-bg)',
                        color: profileTab === tab.id ? '#fff' : 'var(--text)',
                        boxShadow: profileTab === tab.id ? '0 4px 12px rgba(0, 112, 243, 0.3)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <strong style={{ fontSize: '15px' }}>{tab.label}</strong>
                        <small style={{ color: profileTab === tab.id ? 'rgba(255,255,255,0.8)' : 'var(--muted)', marginTop: '2px', fontSize: '12px' }}>{tab.description}</small>
                      </div>
                    </button>
                  ))}
                </nav>

                <div style={{ flex: 3, minWidth: '280px', background: 'var(--input-bg)', borderRadius: '16px', padding: '24px', border: '1px solid var(--line)' }}>
                  {profileTab === "name" && (
                    <form onSubmit={saveName} style={{ display: 'grid', gap: '16px' }}>
                      <h3 style={{ margin: 0, fontSize: '18px' }}>{text("تحديث الاسم", "Update Name")}</h3>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', fontWeight: 'bold', color: 'var(--muted)' }}>
                        {text("الاسم", "Name")}
                        <input value={profileName} onChange={(e) => setProfileName(e.target.value)} required style={{ padding: '12px', borderRadius: '10px', border: 'none', background: 'var(--panel)', outline: 'none', textAlign: 'start', fontSize: '15px', color: 'var(--text)', borderBottom: '2px solid var(--line)' }} />
                      </label>
                      <button disabled={busy} style={{ background: '#0070f3', color: '#fff', border: 'none', padding: '14px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', marginTop: '8px' }}>
                        {busy ? text("جارٍ الحفظ...", "Saving...") : text("حفظ التغييرات", "Save changes")}
                      </button>
                    </form>
                  )}

                  {profileTab === "email" && (
                    <div style={{ display: 'grid', gap: '16px' }}>
                      <h3 style={{ margin: 0, fontSize: '18px' }}>{text("البريد الإلكتروني", "Email")}</h3>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', fontWeight: 'bold', color: 'var(--muted)' }}>
                        {text("البريد الحالي", "Current Email")}
                        <input value={profile?.email || email} readOnly type="email" style={{ padding: '12px', borderRadius: '10px', border: 'none', background: 'var(--panel)', outline: 'none', textAlign: 'start', fontSize: '15px', color: 'var(--text)', opacity: 0.7 }} />
                      </label>
                    </div>
                  )}

                  {profileTab === "password" && (
                    <form onSubmit={savePassword} style={{ display: 'grid', gap: '16px' }}>
                      <h3 style={{ margin: 0, fontSize: '18px' }}>{text("تحديث كلمة المرور", "Update Password")}</h3>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', fontWeight: 'bold', color: 'var(--muted)' }}>
                        {text("كلمة المرور الحالية", "Current Password")}
                        <input type="password" autoComplete="current-password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} required style={{ padding: '12px', borderRadius: '10px', border: 'none', background: 'var(--panel)', outline: 'none', textAlign: 'start', fontSize: '15px', color: 'var(--text)', borderBottom: '2px solid var(--line)' }} />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', fontWeight: 'bold', color: 'var(--muted)' }}>
                        {text("كلمة المرور الجديدة", "New Password")}
                        <input type="password" minLength="8" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required style={{ padding: '12px', borderRadius: '10px', border: 'none', background: 'var(--panel)', outline: 'none', textAlign: 'start', fontSize: '15px', color: 'var(--text)', borderBottom: '2px solid var(--line)' }} />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', fontWeight: 'bold', color: 'var(--muted)' }}>
                        {text("تأكيد كلمة المرور", "Confirm Password")}
                        <input type="password" minLength="8" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required style={{ padding: '12px', borderRadius: '10px', border: 'none', background: 'var(--panel)', outline: 'none', textAlign: 'start', fontSize: '15px', color: 'var(--text)', borderBottom: '2px solid var(--line)' }} />
                      </label>
                      <button disabled={busy} style={{ background: '#0070f3', color: '#fff', border: 'none', padding: '14px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', marginTop: '8px' }}>
                        {busy ? text("جارٍ الحفظ...", "Saving...") : text("تحديث كلمة المرور", "Update password")}
                      </button>
                    </form>
                  )}

                  {profileTab === "location" && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ margin: 0, fontSize: '18px' }}>{text("عناوين التوصيل", "Delivery Addresses")}</h3>
                        <button type="button" disabled={Array.isArray(profile?.location) && profile.location.length >= MAX_LOCATIONS && !showLocationForm} onClick={startNewLocation} style={{ background: 'none', border: 'none', color: '#0070f3', fontWeight: 'bold', cursor: 'pointer' }}>
                          {text("+ إضافة عنوان", "+ Add address")}
                        </button>
                      </div>

                      {Array.isArray(profile?.location) && profile.location.length > 0 && !showLocationForm && (
                        <div style={{ display: 'grid', gap: '12px' }}>
                          {profile.location.map((location) => (
                            <article key={location.id} style={{ background: 'var(--panel)', border: location.isDefault ? '2px solid #0070f3' : '1px solid var(--line)', borderRadius: '12px', padding: '16px', position: 'relative' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                <div>
                                  <strong style={{ fontSize: '16px', color: location.isDefault ? '#0070f3' : 'var(--text)' }}>{location.label || text("عنوان", "Address")}</strong>
                                  {location.isDefault && <span style={{ marginLeft: '8px', marginRight: '8px', background: 'rgba(0,112,243,0.1)', color: '#0070f3', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>{text("أساسي", "Default")}</span>}
                                </div>
                                <button type="button" onClick={() => editLocation(location)} style={{ background: 'var(--input-bg)', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', color: 'var(--text)' }}>
                                  {text("تعديل", "Edit")}
                                </button>
                              </div>
                              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--muted)' }}>{[location.address1, location.address2].filter(Boolean).join(", ")}</p>
                              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--muted)' }}>{[location.city, location.state].filter(Boolean).join(" - ")}</p>
                              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--muted)' }}>{location.phone}</p>
                            </article>
                          ))}
                        </div>
                      )}

                      {showLocationForm && (
                        <form onSubmit={saveLocation} style={{ display: 'grid', gap: '16px', background: 'var(--panel)', padding: '24px', borderRadius: '16px', border: '1px solid var(--line)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <h4 style={{ margin: 0, fontSize: '16px' }}>{locationForm.id ? text("تعديل العنوان", "Edit address") : text("عنوان جديد", "New address")}</h4>
                            <button type="button" onClick={() => setShowLocationForm(false)} style={{ background: 'none', border: 'none', fontSize: '14px', color: 'var(--muted)', cursor: 'pointer' }}>{text("إلغاء", "Cancel")}</button>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', fontWeight: 'bold', color: 'var(--muted)' }}>{text("الاسم الشخصي", "Recipient Name")}
                              <input value={locationForm.recipientName || ""} onChange={(e) => setLocationForm({ ...locationForm, recipientName: e.target.value })} placeholder={text("اسم المستلم", "Full Name")} required style={{ padding: '12px', borderRadius: '10px', border: 'none', background: 'var(--input-bg)', outline: 'none', textAlign: 'start', fontSize: '14px', color: 'var(--text)' }} />
                            </label>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', fontWeight: 'bold', color: 'var(--muted)' }}>{text("اسم العنوان", "Address label")}
                              <input value={locationForm.label} onChange={(e) => setLocationForm({ ...locationForm, label: e.target.value })} placeholder={text("مثال: المنزل", "e.g. Home")} required style={{ padding: '12px', borderRadius: '10px', border: 'none', background: 'var(--input-bg)', outline: 'none', textAlign: 'start', fontSize: '14px', color: 'var(--text)' }} />
                            </label>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', fontWeight: 'bold', color: 'var(--muted)' }}>{text("رقم الهاتف", "Phone number")}
                              <input type="tel" value={locationForm.phone} onChange={(e) => setLocationForm({ ...locationForm, phone: e.target.value })} required style={{ padding: '12px', borderRadius: '10px', border: 'none', background: 'var(--input-bg)', outline: 'none', textAlign: 'start', fontSize: '14px', color: 'var(--text)' }} />
                            </label>
                          </div>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', fontWeight: 'bold', color: 'var(--muted)' }}>{text("العنوان الأول", "Address line 1")}
                            <input value={locationForm.address1} onChange={(e) => setLocationForm({ ...locationForm, address1: e.target.value })} required placeholder={text("رقم المبنى والشارع", "Building and street")} style={{ padding: '12px', borderRadius: '10px', border: 'none', background: 'var(--input-bg)', outline: 'none', textAlign: 'start', fontSize: '14px', color: 'var(--text)' }} />
                          </label>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', fontWeight: 'bold', color: 'var(--muted)' }}>{text("العنوان الثاني", "Address line 2")}
                            <input value={locationForm.address2} onChange={(e) => setLocationForm({ ...locationForm, address2: e.target.value })} placeholder={text("شقة، دور...", "Apt, floor...")} style={{ padding: '12px', borderRadius: '10px', border: 'none', background: 'var(--input-bg)', outline: 'none', textAlign: 'start', fontSize: '14px', color: 'var(--text)' }} />
                          </label>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', fontWeight: 'bold', color: 'var(--muted)' }}>{text("المدينة", "City")}
                              <input value={locationForm.city} onChange={(e) => setLocationForm({ ...locationForm, city: e.target.value })} required style={{ padding: '12px', borderRadius: '10px', border: 'none', background: 'var(--input-bg)', outline: 'none', textAlign: 'start', fontSize: '14px', color: 'var(--text)' }} />
                            </label>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', fontWeight: 'bold', color: 'var(--muted)' }}>{text("المحافظة", "State")}
                              <select value={locationForm.state} onChange={(e) => setLocationForm({...locationForm, state: e.target.value}) } style={{ padding: '12px', borderRadius: '10px', border: 'none', background: 'var(--input-bg)', outline: 'none', textAlign: 'start', fontSize: '14px', color: 'var(--text)', cursor: 'pointer' }}>

                      <option value="">{text("اختر المحافظة", "Select Governorate")}</option>
                      <option value="القاهرة">القاهرة (Cairo)</option>
                      <option value="الجيزة">الجيزة (Giza)</option>
                      <option value="الإسكندرية">الإسكندرية (Alexandria)</option>
                      <option value="الدقهلية">الدقهلية (Dakahlia)</option>
                      <option value="الشرقية">الشرقية (Al Sharqia)</option>
                      <option value="المنوفية">المنوفية (Monufia)</option>
                      <option value="القليوبية">القليوبية (Qalyubia)</option>
                      <option value="البحيرة">البحيرة (Beheira)</option>
                      <option value="الغربية">الغربية (Gharbia)</option>
                      <option value="بورسعيد">بورسعيد (Port Said)</option>
                      <option value="دمياط">دمياط (Damietta)</option>
                      <option value="الإسماعيلية">الإسماعيلية (Ismailia)</option>
                      <option value="السويس">السويس (Suez)</option>
                      <option value="كفر الشيخ">كفر الشيخ (Kafr El Sheikh)</option>
                      <option value="الفيوم">الفيوم (Faiyum)</option>
                      <option value="بني سويف">بني سويف (Beni Suef)</option>
                      <option value="مطروح">مطروح (Matrouh)</option>
                      <option value="شمال سيناء">شمال سيناء (North Sinai)</option>
                      <option value="جنوب سيناء">جنوب سيناء (South Sinai)</option>
                      <option value="المنيا">المنيا (Minya)</option>
                      <option value="أسيوط">أسيوط (Asyut)</option>
                      <option value="سوهاج">سوهاج (Sohag)</option>
                      <option value="قنا">قنا (Qena)</option>
                      <option value="البحر الأحمر">البحر الأحمر (Red Sea)</option>
                      <option value="الأقصر">الأقصر (Luxor)</option>
                      <option value="أسوان">أسوان (Aswan)</option>
                      <option value="الوادي الجديد">الوادي الجديد (New Valley)</option>

                              </select>
                            </label>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', fontWeight: 'bold', color: 'var(--muted)' }}>{text("الرمز البريدي", "Postal Code")}
                              <input value={locationForm.postalCode || ""} onChange={(e) => setLocationForm({ ...locationForm, postalCode: e.target.value })} style={{ padding: '12px', borderRadius: '10px', border: 'none', background: 'var(--input-bg)', outline: 'none', textAlign: 'start', fontSize: '14px', color: 'var(--text)' }} />
                            </label>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', fontWeight: 'bold', color: 'var(--muted)' }}>{text("ملاحظات التوصيل", "Delivery Notes")}
                              <input value={locationForm.notes || ""} onChange={(e) => setLocationForm({ ...locationForm, notes: e.target.value })} style={{ padding: '12px', borderRadius: '10px', border: 'none', background: 'var(--input-bg)', outline: 'none', textAlign: 'start', fontSize: '14px', color: 'var(--text)' }} />
                            </label>
                          </div>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer', marginTop: '8px' }}>
                            <input type="checkbox" checked={locationForm.isDefault} onChange={(e) => setLocationForm({ ...locationForm, isDefault: e.target.checked })} style={{ width: '18px', height: '18px', accentColor: '#0070f3' }} /> 
                            {text("استخدام كعنوان أساسي", "Set as default")}
                          </label>
                          <button disabled={busy} style={{ background: '#0070f3', color: '#fff', border: 'none', padding: '14px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', marginTop: '8px' }}>
                            {busy ? text("جارٍ الحفظ...", "Saving...") : locationForm.id ? text("تحديث", "Update") : text("حفظ", "Save")}
                          </button>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
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
