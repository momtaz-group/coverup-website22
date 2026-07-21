"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import AccountTabIcon from "@/components/AccountTabIcon";
import { useLanguage } from "@/context/LanguageContext";
import { useLoading } from "@/context/LoadingContext";
import { supabase } from "@/utils/supabase";
import { createFamilyMember, deleteFamilyMember, loadFamilyMembers, updateFamilyMember } from "@/utils/familyMembers";
import { createUserPhone, deleteUserPhone, loadUserPhones, updateUserPhone } from "@/utils/userPhones";
import styles from "./page.module.css";

const CODE_LENGTH = 6;
const emptyCode = () => Array(CODE_LENGTH).fill("");
const MAX_LOCATIONS = 3;

const relationshipOptions = [
  { value: "me", labelAr: "أنا", labelEn: "Me" },
  { value: "father", labelAr: "الأب", labelEn: "Father" },
  { value: "mother", labelAr: "الأم", labelEn: "Mother" },
  { value: "wife", labelAr: "الزوجة", labelEn: "Wife" },
  { value: "husband", labelAr: "الزوج", labelEn: "Husband" },
  { value: "son", labelAr: "الابن", labelEn: "Son" },
  { value: "daughter", labelAr: "الابنة", labelEn: "Daughter" },
  { value: "sister", labelAr: "الأخت", labelEn: "Sister" },
  { value: "brother", labelAr: "الأخ", labelEn: "Brother" },
  { value: "grandfather", labelAr: "الجد", labelEn: "Grandfather" },
  { value: "grandmother", labelAr: "الجدة", labelEn: "Grandmother" },
  { value: "friend", labelAr: "صديق", labelEn: "Friend" },
  { value: "other", labelAr: "فرد آخر", labelEn: "Other" },
];

const relationshipAvatarKeys = {
  me: "me",
  father: "father",
  grandfather: "father",
  husband: "father",
  mother: "mother",
  grandmother: "mother",
  wife: "wife",
  sister: "sister",
  daughter: "sister",
  brother: "brother",
  son: "brother",
  friend: "friend",
  other: "other",
};

const avatarImages = {
  me: "/assets/family-members/avatar-me-crown-v4.png",
  father: "/assets/family-members/avatar-father-v4.png",
  mother: "/assets/family-members/avatar-mother-v4.png",
  wife: "/assets/family-members/avatar-wife-v4.png",
  sister: "/assets/family-members/avatar-sister-v4.png",
  brother: "/assets/family-members/avatar-brother-v4.png",
  friend: "/assets/family-members/avatar-friend-v4.png",
  other: "/assets/family-members/avatar-other-v4.png",
};

function avatarKeyForRelationship(value) {
  return relationshipAvatarKeys[value] || "other";
}

function relationshipLabel(value, locale = "ar") {
  const option = relationshipOptions.find((entry) => entry.value === value) || relationshipOptions.at(-1);
  return locale === "ar" ? option.labelAr : option.labelEn;
}

function memberAvatarSrc(member) {
  const key = member?.avatar_key || avatarKeyForRelationship(member?.relationship);
  return avatarImages[key] || avatarImages.other;
}

function AdminLoginTabComponent({ locale, text }) {
  const { setLoading } = useLoading();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "فشل تسجيل دخول المشرف.");
      }
      setLoading(false);
      window.location.href = "/admin";
    } catch (err) {
      setLoading(false);
      setErrorMsg(err.message);
    }
  };

  return (
    <form onSubmit={handleLogin} style={{ display: 'grid', gap: '16px' }}>
      <h3 style={{ margin: 0, fontSize: '18px' }}>
        {locale === "ar" ? "تسجيل دخول لوحة الإدارة" : "Administrator Dashboard Login"}
      </h3>
      <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>
        {locale === "ar" 
          ? "الرجاء إدخال اسم المستخدم وكلمة مرور المشرف الخاصة بالموقع." 
          : "Please enter the admin username and password for this site."}
      </p>

      {errorMsg && (
        <div style={{ color: '#ff4d4d', padding: '10px', borderRadius: '8px', background: 'rgba(255, 77, 77, 0.1)', fontSize: '14px' }}>
          {errorMsg}
        </div>
      )}

      <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', fontWeight: 'bold', color: 'var(--muted)' }}>
        {locale === "ar" ? "اسم المستخدم" : "Username"}
        <input 
          type="text" 
          value={username} 
          onChange={(e) => setUsername(e.target.value)} 
          required 
          style={{ padding: '12px', borderRadius: '10px', border: 'none', background: 'var(--panel)', outline: 'none', textAlign: 'start', fontSize: '15px', color: 'var(--text)', borderBottom: '2px solid var(--line)' }} 
        />
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', fontWeight: 'bold', color: 'var(--muted)' }}>
        {locale === "ar" ? "كلمة المرور" : "Password"}
        <input 
          type="password" 
          autoComplete="current-password"
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          required 
          style={{ padding: '12px', borderRadius: '10px', border: 'none', background: 'var(--panel)', outline: 'none', textAlign: 'start', fontSize: '15px', color: 'var(--text)', borderBottom: '2px solid var(--line)' }} 
        />
      </label>

      <button type="submit" style={{ background: '#0070f3', color: '#fff', border: 'none', padding: '14px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', marginTop: '8px' }}>
        {locale === "ar" ? "تسجيل الدخول" : "Login"}
      </button>
    </form>
  );
}

function FavoritesTabComponent({ locale, text }) {
  const [favProducts, setFavProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const loadFavorites = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setErr(locale === "ar" ? "يرجى تسجيل الدخول أولاً." : "Please sign in first.");
        setLoading(false);
        return;
      }
      const res = await fetch("/api/favorites", {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Failed to load favorites");
      }
      setFavProducts(data.products || []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  const handleRemove = async (productId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`/api/favorites?productId=${encodeURIComponent(productId)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      if (res.ok) {
        setFavProducts(prev => prev.filter(p => p.id !== productId));
        try {
          const saved = localStorage.getItem("coverup-wishlist");
          if (saved) {
            const parsed = JSON.parse(saved);
            const next = parsed.filter(id => id !== productId);
            localStorage.setItem("coverup-wishlist", JSON.stringify(next));
          }
        } catch {}
      }
    } catch {}
  };

  if (loading) {
    return <p style={{ fontSize: '15px', color: 'var(--muted)', textAlign: 'start' }}>{locale === "ar" ? "جارٍ التحميل..." : "Loading..."}</p>;
  }

  if (err) {
    return <p style={{ color: "#ff4d4d", textAlign: 'start' }}>{err}</p>;
  }

  if (favProducts.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "32px 0" }}>
        <p style={{ color: "var(--muted)", fontSize: "15px", marginBottom: "16px" }}>
          {locale === "ar" ? "قائمة المفضلة فارغة حالياً." : "Your favorites list is currently empty."}
        </p>
        <Link 
          href="/products" 
          style={{ display: "inline-block", background: "#0070f3", color: "#fff", padding: "10px 20px", borderRadius: "10px", textDecoration: "none", fontWeight: "bold", fontSize: "14px" }}
        >
          {locale === "ar" ? "تصفح المنتجات" : "Browse Products"}
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '100%', overflow: 'hidden' }}>
      <h3 style={{ margin: "0 0 20px", fontSize: "18px", textAlign: 'start' }}>{locale === "ar" ? "المنتجات المفضلة" : "My Favorites"}</h3>
      <div style={{ display: "flex", gap: "20px", overflowX: "auto", paddingBottom: "16px", scrollbarWidth: "thin", WebkitOverflowScrolling: "touch" }}>
        {favProducts.map(p => {
          const pName = locale === "en" && p.name_en ? p.name_en : p.name;
          const pCat = locale === "en" && p.category_en ? p.category_en : p.category;
          return (
            <article key={p.id} style={{ flexShrink: 0, width: "180px", background: 'var(--panel)', borderRadius: '16px', border: '1px solid var(--line)', padding: '16px', position: 'relative', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button 
                type="button" 
                onClick={() => handleRemove(p.id)}
                style={{ position: 'absolute', top: '12px', left: locale === 'ar' ? '12px' : 'auto', right: locale === 'en' ? '12px' : 'auto', background: 'rgba(255, 77, 77, 0.1)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2 }}
                title={locale === "ar" ? "حذف من المفضلة" : "Remove from favorites"}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#ff4d4d" stroke="#ff4d4d" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
              </button>
              <Link href={`/product?id=${p.id}`} style={{ display: 'block', height: '140px', borderRadius: '10px', overflow: 'hidden', background: 'var(--input-bg)' }}>
                <img src={p.image} alt={pName} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </Link>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'start' }}>
                <span style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase' }}>{pCat}</span>
                <h4 style={{ fontSize: '13px', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.4 }}>
                  <Link href={`/product?id=${p.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>{pName}</Link>
                </h4>
              </div>
              <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#0070f3', textAlign: 'start' }}>
                {new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", { style: "currency", currency: "EGP", maximumFractionDigits: 0 }).format(p.price)}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

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
  const [accountPhones, setAccountPhones] = useState([]);
  const [accountMembers, setAccountMembers] = useState([]);
  const [phoneForm, setPhoneForm] = useState({ id: "", phone_name: "", brand: "", model: "", design_key: "triple" });
  const [memberForm, setMemberForm] = useState({ id: "", display_name: "", relationship: "me", phone_id: "" });
  const [showPhoneForm, setShowPhoneForm] = useState(false);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
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
    { id: "family", label: text("أفراد العيلة", "Family members"), description: text("الأشخاص المرتبطين بموبايلاتهم", "People linked to saved phones"), icon: "name" },
    { id: "phones", label: text("الموبايلات", "Phones"), description: text("كل الأجهزة المحفوظة في الحساب", "Saved account devices"), icon: "password" },
    { id: "favorites", label: text("المفضلة", "My Favorites"), description: text("المنتجات التي نالت إعجابك", "Products you liked"), icon: "favorites" },
  ];

  if (profile?.roles === "admin") {
    profileTabs.push({
      id: "admin_login",
      label: text("دخول المشرف", "Admin Login"),
      description: text("لوحة تحكم الإدارة", "Administrator dashboard"),
      icon: "password"
    });
  }

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
      Promise.all([loadUserPhones().catch(() => []), loadFamilyMembers().catch(() => [])]).then(([phones, members]) => {
        if (!active) return;
        setAccountPhones(phones);
        setAccountMembers(members);
      });
      if (data.setupRequired) {
        setStatus(data.message || (locale === "ar" ? "جدول profiles غير موجود في Supabase بعد." : "The profiles table is not set up in Supabase yet."));
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (active) {
        if (session?.user) {
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
      } else if (event === "SIGNED_OUT") {
        setProfile(null);
        setProfileName("");
        setStatus("");
        setStep("email");
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [locale]);

  useEffect(() => {
    if (typeof window !== "undefined" && profile?.roles === "admin") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("showAdminLogin") === "true") {
        setProfileTab("admin_login");
      }
    }
  }, [profile]);

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

  const handleSignOut = async () => {
    setBusy(true);
    await supabase.auth.signOut();
    setBusy(false);
    setProfile(null);
    setProfileName("");
    setEmail("");
    setPassword("");
    setStatus("");
    setStep("email");
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
      fetch("/api/auth/password-changed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: profile?.email || email }),
      }).catch(() => {});
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

  const startNewPhone = () => {
    setPhoneForm({ id: "", phone_name: "", brand: "", model: "", design_key: "triple" });
    setShowPhoneForm(true);
    setProfileTab("phones");
  };

  const editPhone = (phone) => {
    setPhoneForm({ id: phone.id, phone_name: phone.phone_name || "", brand: phone.brand || "", model: phone.model || "", design_key: phone.design_key || "triple" });
    setShowPhoneForm(true);
    setProfileTab("phones");
  };

  const savePhone = async (event) => {
    event.preventDefault();
    if (!phoneForm.phone_name.trim() || !phoneForm.brand.trim() || !phoneForm.model.trim()) return setStatus(text("أكمل بيانات الموبايل.", "Complete phone details."));
    setBusy(true); setStatus("");
    try {
      const saved = phoneForm.id ? await updateUserPhone(phoneForm) : await createUserPhone(phoneForm);
      setAccountPhones((current) => phoneForm.id ? current.map((phone) => phone.id === saved.id ? saved : phone) : [saved, ...current]);
      setPhoneForm({ id: "", phone_name: "", brand: "", model: "", design_key: "triple" });
      setShowPhoneForm(false);
      setStatus(text("تم حفظ الموبايل.", "Phone saved."));
    } catch (error) { setStatus(error.message); }
    finally { setBusy(false); }
  };

  const removePhone = async (phone) => {
    setConfirmAction({ type: "phone", item: phone });
  };

  const performRemovePhone = async (phone) => {
    setBusy(true); setStatus("");
    try {
      await deleteUserPhone(phone.id);
      setAccountPhones((current) => current.filter((item) => item.id !== phone.id));
      setAccountMembers((current) => current.map((member) => member.phone_id === phone.id ? { ...member, phone_id: null, phone: null } : member));
      setConfirmAction(null);
      setStatus(text("تم حذف الموبايل.", "Phone deleted."));
    } catch (error) { setStatus(error.message); }
    finally { setBusy(false); }
  };

  const startNewMember = () => {
    setMemberForm({ id: "", display_name: "", relationship: "me", phone_id: "" });
    setShowMemberForm(true);
    setProfileTab("family");
  };

  const editMember = (member) => {
    setMemberForm({ id: member.id, display_name: member.display_name || "", relationship: member.relationship || "other", phone_id: member.phone_id || member.phone?.id || "" });
    setShowMemberForm(true);
    setProfileTab("family");
  };

  const saveMember = async (event) => {
    event.preventDefault();
    if (!memberForm.display_name.trim() || !memberForm.phone_id) return setStatus(text("أكمل اسم الفرد والموبايل المرتبط.", "Complete member name and linked phone."));
    setBusy(true); setStatus("");
    try {
      const payload = { ...memberForm, avatar_key: avatarKeyForRelationship(memberForm.relationship) };
      const saved = memberForm.id ? await updateFamilyMember(payload) : await createFamilyMember(payload);
      setAccountMembers((current) => memberForm.id ? current.map((member) => member.id === saved.id ? saved : member) : [saved, ...current]);
      setMemberForm({ id: "", display_name: "", relationship: "me", phone_id: "" });
      setShowMemberForm(false);
      setStatus(text("تم حفظ فرد العيلة.", "Family member saved."));
    } catch (error) { setStatus(error.message); }
    finally { setBusy(false); }
  };

  const removeMember = async (member) => {
    setConfirmAction({ type: "member", item: member });
  };

  const performRemoveMember = async (member) => {
    setBusy(true); setStatus("");
    try {
      await deleteFamilyMember(member.id);
      setAccountMembers((current) => current.filter((item) => item.id !== member.id));
      setConfirmAction(null);
      setStatus(text("تم حذف فرد العيلة.", "Family member deleted."));
    } catch (error) { setStatus(error.message); }
    finally { setBusy(false); }
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

    let signInResult;
    try {
      signInResult = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
    } catch (networkErr) {
      setBusy(false);
      setStatus(locale === "ar"
        ? "تعذر الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى."
        : "Could not connect to the server. Please check your internet and try again.");
      return;
    }
    setBusy(false);

    const { error } = signInResult;

    if (error) {
      if (error.status === 500 || error.message?.includes("500")) {
        setStatus(locale === "ar"
          ? "خادم المصادقة غير متاح حالياً. يرجى المحاولة بعد قليل."
          : "Authentication server is temporarily unavailable. Please try again shortly.");
        return;
      }

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

    fetch("/api/auth/welcome", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
    }).catch(() => {});

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

    fetch("/api/auth/welcome", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
    }).catch(() => {});

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
    fetch("/api/auth/password-changed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email }),
    }).catch(() => {});
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
    email: text("تسجيل الدخول", "Sign In"),
    password: text("أهلاً بعودتك", "Welcome Back"),
    name: text("إنشاء حساب", "Create Account"),
    "signup-email": text("البريد الإلكتروني", "Email Address"),
    "signup-password": text("كلمة المرور", "Password"),
    verify: text("تأكيد البريد", "Verify Email"),
    "forgot-email": text("استعادة كلمة المرور", "Restore Password"),
    "forgot-verify": text("رمز التحقق للاستعادة", "Verification Code"),
    "reset-password": text("كلمة المرور الجديدة", "New Password"),
    "signed-in": text("تم تسجيل الدخول", "Signed In"),
    "loading": text("جارٍ التحميل...", "Loading..."),
  }[step];

  const resendLabel = resendSeconds > 0
    ? text(`إعادة الإرسال بعد ${resendSeconds} ثانية`, `Resend in ${resendSeconds}s`)
    : text("إعادة إرسال الرمز", "Resend code");

  if (step === "loading") {
    return (
      <main className={styles.page} style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
        <p style={{ color: 'var(--muted)' }}>{text("جارٍ التحميل...", "Loading...")}</p>
      </main>
    );
  }

  return (
    <main className={`${styles.page} ${isSignedInView ? styles.pageProfile : ""}`} dir={locale === "ar" ? "rtl" : "ltr"}>
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
              <p>{text("استخدم حساب Cover Up للمتابعة وحفظ أجهزتك وطلباتك.", "Use your Cover Up account to continue and save your devices and orders.")}</p>
              <form onSubmit={handleEmailNext}>
                <input
                  type="email"
                  placeholder={text("البريد الإلكتروني", "Email address")}
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
                  {text("إنشاء حساب جديد", "Create new account")}
                </button>
                <button
                  className={styles.linkButton}
                  type="button"
                  onClick={startForgotPassword}
                >
                  {text("نسيت كلمة المرور؟", "Forgot password?")}
                </button>
                <div className={styles.actions}>
                  <button className={styles.next} disabled={busy}>
                    {busy ? text("جارٍ التحقق...", "Checking...") : text("التالي", "Next")}
                  </button>
                </div>
              </form>
            </>
          )}

          {step === "password" && (
            <>
              <p>{text("أدخل كلمة المرور الخاصة بهذا البريد.", "Enter the password for this email address.")}</p>
              <form onSubmit={signIn}>
                <input
                  type="password"
                  autoComplete="current-password"
                  placeholder={text("كلمة المرور", "Password")}
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
                  {text("نسيت كلمة المرور؟", "Forgot password?")}
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
                    {text("رجوع", "Back")}
                  </button>
                  <button className={styles.next} disabled={busy}>
                    {busy ? text("جارٍ الدخول...", "Signing in...") : text("تسجيل الدخول", "Sign in")}
                  </button>
                </div>
              </form>
            </>
          )}

          {step === "name" && (
            <>
              <p>{text("الخطوة الأولى: اكتب الاسم الكامل.", "Step one: enter your full name.")}</p>
              <input
                placeholder={text("الاسم الكامل", "Full name")}
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
                  {text("رجوع", "Back")}
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
                  {text("التالي", "Next")}
                </button>
              </div>
            </>
          )}

          {step === "signup-email" && (
            <>
              <p>{text("الخطوة الثانية: أضف بريدك الإلكتروني.", "Step two: add your email address.")}</p>
              <input
                type="email"
                placeholder={text("البريد الإلكتروني", "Email address")}
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
                  {text("رجوع", "Back")}
                </button>
                <button
                  className={styles.next}
                  type="button"
                  disabled={busy || !email.trim()}
                  onClick={handleSignupEmailNext}
                >
                  {busy ? text("جارٍ التحقق...", "Checking...") : text("التالي", "Next")}
                </button>
              </div>
            </>
          )}

          {step === "signup-password" && (
            <>
              <p>{text("الخطوة الثالثة: أنشئ كلمة مرور من 8 أحرف على الأقل.", "Step three: create a password with at least 8 characters.")}</p>
              <input
                type="password"
                autoComplete="new-password"
                placeholder={text("كلمة المرور", "Password")}
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
                  {text("رجوع", "Back")}
                </button>
                <button
                  className={styles.next}
                  type="button"
                  disabled={busy || password.length < 8}
                  onClick={signUp}
                >
                  {busy ? text("جارٍ الإنشاء...", "Creating...") : text("إنشاء الحساب", "Create account")}
                </button>
              </div>
            </>
          )}

          {step === "verify" && (
            <>
              <p>
                {text(`أدخل رمز التحقق المكون من ${CODE_LENGTH} أرقام المرسل إلى`, `Enter the ${CODE_LENGTH}-digit verification code sent to`)} <b>{email}</b>.
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
                      aria-label={text(`الرقم ${index + 1}`, `Digit ${index + 1}`)}
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
                    {text("رجوع", "Back")}
                  </button>
                  <button className={styles.next} disabled={busy}>
                    {busy ? text("جارٍ التأكيد...", "Verifying...") : text("تأكيد", "Verify")}
                  </button>
                </div>
              </form>
            </>
          )}

          {step === "forgot-email" && (
            <>
              <p>{text("أدخل بريدك الإلكتروني لإرسال رمز إعادة تعيين كلمة المرور.", "Enter your email to receive a password reset code.")}</p>
              <form onSubmit={sendForgotCode}>
                <input
                  type="email"
                  placeholder={text("البريد الإلكتروني", "Email address")}
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
                    {text("رجوع", "Back")}
                  </button>
                  <button className={styles.next} disabled={busy}>
                    {busy ? text("جارٍ الإرسال...", "Sending...") : text("إرسال الرمز", "Send code")}
                  </button>
                </div>
              </form>
            </>
          )}

          {step === "forgot-verify" && (
            <>
              <p>
                {text(`أدخل رمز التحقق المكون من ${CODE_LENGTH} أرقام المرسل إلى`, `Enter the ${CODE_LENGTH}-digit code sent to`)} <b>{email}</b> {text("لاستعادة كلمة المرور.", "to reset your password.")}
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
                      aria-label={text(`الرقم ${index + 1}`, `Digit ${index + 1}`)}
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
                    {text("رجوع", "Back")}
                  </button>
                  <button className={styles.next} disabled={busy}>
                    {busy ? text("جارٍ التحقق...", "Verifying...") : text("تأكيد", "Verify")}
                  </button>
                </div>
              </form>
            </>
          )}

          {step === "reset-password" && (
            <>
              <p>{text("أدخل كلمة المرور الجديدة لحسابك (8 أحرف على الأقل).", "Enter your new account password, at least 8 characters.")}</p>
              <form onSubmit={saveNewPassword}>
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder={text("كلمة المرور الجديدة", "New password")}
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
                    {busy ? text("جارٍ الحفظ...", "Saving...") : text("حفظ كلمة المرور", "Save password")}
                  </button>
                </div>
              </form>
            </>
          )}

          {step === "signed-in" && (
            <div className={styles.profileDashboard}>
              <div className={styles.profileHeader}>
                <div className={styles.profileIdentity}>
                  <p className={styles.profileEyebrow}>{text("إعدادات الحساب", "Account settings")}</p>
                  <h2>{profile?.name || text("حسابي", "My account")}</h2>
                  <span>{profile?.email || email}</span>
                  <small>
                    {text(
                      "تحكم في بياناتك، عناوينك، موبايلاتك، وأفراد العيلة من مكان واحد.",
                      "Manage your details, addresses, phones, and family members from one place."
                    )}
                  </small>
                </div>
                <button type="button" className={styles.signOutButton} onClick={handleSignOut} disabled={busy}>
                  <AccountTabIcon name="signout" className={styles.signOutIcon} />
                  {text("تسجيل الخروج", "Sign out")}
                </button>
              </div>

              <div className={styles.profileLayout}>
                <nav className={styles.profileTabs} aria-label={text("أقسام الحساب", "Account sections")}>
                  {profileTabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      className={profileTab === tab.id ? styles.activeTab : ""}
                      onClick={() => setProfileTab(tab.id)}
                      aria-current={profileTab === tab.id ? "page" : undefined}
                    >
                      <span className={styles.tabIconWrap}>
                        <AccountTabIcon name={tab.icon} className={styles.tabIcon} />
                      </span>
                      <div className={styles.tabText}>
                        <strong>{tab.label}</strong>
                        <small>{tab.description}</small>
                      </div>
                    </button>
                  ))}
                </nav>

                <div className={styles.profilePanel}>
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

                  {profileTab === "family" && (
                    <div style={{ display: 'grid', gap: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '18px' }}>{text("أفراد العيلة", "Family members")}</h3>
                          <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: '13px' }}>{text("اربط كل فرد بموبايله عشان مندوب العيلة يرشح المناسب.", "Link each person to their phone for better recommendations.")}</p>
                        </div>
                        <button type="button" onClick={startNewMember} style={{ border: '1px solid #155BD0', background: '#155BD0', color: '#fff', borderRadius: '21px', padding: '10px 14px', fontWeight: 800, cursor: 'pointer' }}>{text("إضافة فرد", "Add member")}</button>
                      </div>
                      {showMemberForm && (
                        <form onSubmit={saveMember} style={{ display: 'grid', gap: '12px', background: 'var(--panel)', padding: '16px', borderRadius: '21px', border: '1px solid var(--line)' }}>
                          <h4 style={{ margin: 0 }}>{memberForm.id ? text("تعديل فرد", "Edit member") : text("فرد جديد", "New member")}</h4>
                          <input value={memberForm.display_name} onChange={(e) => setMemberForm({ ...memberForm, display_name: e.target.value })} placeholder={text("اسم الفرد", "Member name")} style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--input-bg)', color: 'var(--text)' }} />
                          <select value={memberForm.relationship} onChange={(e) => setMemberForm({ ...memberForm, relationship: e.target.value })} style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--input-bg)', color: 'var(--text)' }}>
                            {relationshipOptions.map((option) => <option key={option.value} value={option.value}>{locale === "ar" ? option.labelAr : option.labelEn}</option>)}
                          </select>
                          <select value={memberForm.phone_id} onChange={(e) => setMemberForm({ ...memberForm, phone_id: e.target.value })} style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--input-bg)', color: 'var(--text)' }}>
                            <option value="">{text("اختار موبايل", "Select phone")}</option>
                            {accountPhones.map((phone) => <option key={phone.id} value={phone.id}>{phone.phone_name} - {phone.brand} {phone.model}</option>)}
                          </select>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                            <button type="button" onClick={() => setShowMemberForm(false)} style={{ border: '1px solid var(--line)', background: 'var(--panel)', borderRadius: '12px', padding: '10px 14px', color: 'var(--text)', cursor: 'pointer' }}>{text("إلغاء", "Cancel")}</button>
                            <button disabled={busy} style={{ border: 0, background: '#155BD0', color: '#fff', borderRadius: '12px', padding: '10px 14px', fontWeight: 800, cursor: 'pointer' }}>{busy ? text("جارٍ الحفظ...", "Saving...") : text("حفظ", "Save")}</button>
                          </div>
                        </form>
                      )}
                      <div style={{ display: 'grid', gap: '10px' }}>
                        {accountMembers.map((member) => (
                          <article key={member.id} style={{ display: 'grid', gridTemplateColumns: '54px minmax(0,1fr) auto', gap: '12px', alignItems: 'center', border: '1px solid var(--line)', background: 'var(--panel)', borderRadius: '21px', padding: '12px' }}>
                            <span style={{ position: 'relative', width: '54px', height: '54px', borderRadius: '18px', overflow: 'hidden', background: '#fff', border: '1px solid var(--line)' }}>
                              <Image src={memberAvatarSrc(member)} alt={member.display_name} fill sizes="54px" style={{ objectFit: 'contain', padding: '2px' }} />
                            </span>
                            <div style={{ minWidth: 0 }}>
                              <strong style={{ display: 'block' }}>{member.display_name}</strong>
                              <small style={{ color: 'var(--muted)' }}>{relationshipLabel(member.relationship, locale)} · {member.phone?.phone_name || text("بدون موبايل", "No phone")} {member.phone?.model ? `· ${member.phone.model}` : ""}</small>
                            </div>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              <button type="button" onClick={() => editMember(member)} style={{ border: '1px solid var(--line)', background: 'var(--input-bg)', borderRadius: '12px', padding: '8px 10px', color: 'var(--text)', cursor: 'pointer' }}>{text("تعديل", "Edit")}</button>
                              <button type="button" onClick={() => removeMember(member)} style={{ border: '1px solid rgba(197,45,69,.28)', background: 'rgba(197,45,69,.08)', color: '#c52d45', borderRadius: '12px', padding: '8px 10px', cursor: 'pointer' }}>{text("حذف", "Delete")}</button>
                            </div>
                          </article>
                        ))}
                        {!accountMembers.length && <p style={{ color: 'var(--muted)', margin: 0 }}>{text("لا يوجد أفراد محفوظين بعد.", "No saved family members yet.")}</p>}
                      </div>
                    </div>
                  )}

                  {profileTab === "phones" && (
                    <div style={{ display: 'grid', gap: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '18px' }}>{text("الموبايلات", "Phones")}</h3>
                          <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: '13px' }}>{text("الأجهزة المحفوظة لكل الحساب والعيلة.", "Saved devices for the account and family.")}</p>
                        </div>
                        <button type="button" onClick={startNewPhone} style={{ border: '1px solid #155BD0', background: '#155BD0', color: '#fff', borderRadius: '21px', padding: '10px 14px', fontWeight: 800, cursor: 'pointer' }}>{text("إضافة موبايل", "Add phone")}</button>
                      </div>
                      {showPhoneForm && (
                        <form onSubmit={savePhone} style={{ display: 'grid', gap: '12px', background: 'var(--panel)', padding: '16px', borderRadius: '21px', border: '1px solid var(--line)' }}>
                          <h4 style={{ margin: 0 }}>{phoneForm.id ? text("تعديل موبايل", "Edit phone") : text("موبايل جديد", "New phone")}</h4>
                          <input value={phoneForm.phone_name} onChange={(e) => setPhoneForm({ ...phoneForm, phone_name: e.target.value })} placeholder={text("اسم الموبايل", "Phone name")} style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--input-bg)', color: 'var(--text)' }} />
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <input value={phoneForm.brand} onChange={(e) => setPhoneForm({ ...phoneForm, brand: e.target.value })} placeholder={text("الماركة", "Brand")} style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--input-bg)', color: 'var(--text)' }} />
                            <input value={phoneForm.model} onChange={(e) => setPhoneForm({ ...phoneForm, model: e.target.value })} placeholder={text("الموديل", "Model")} style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--input-bg)', color: 'var(--text)' }} />
                          </div>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                            <button type="button" onClick={() => setShowPhoneForm(false)} style={{ border: '1px solid var(--line)', background: 'var(--panel)', borderRadius: '12px', padding: '10px 14px', color: 'var(--text)', cursor: 'pointer' }}>{text("إلغاء", "Cancel")}</button>
                            <button disabled={busy} style={{ border: 0, background: '#155BD0', color: '#fff', borderRadius: '12px', padding: '10px 14px', fontWeight: 800, cursor: 'pointer' }}>{busy ? text("جارٍ الحفظ...", "Saving...") : text("حفظ", "Save")}</button>
                          </div>
                        </form>
                      )}
                      <div style={{ display: 'grid', gap: '10px' }}>
                        {accountPhones.map((phone) => (
                          <article key={phone.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: '12px', alignItems: 'center', border: '1px solid var(--line)', background: 'var(--panel)', borderRadius: '21px', padding: '14px' }}>
                            <div><strong>{phone.phone_name}</strong><p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: '13px' }}>{phone.brand} · {phone.model}</p></div>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              <button type="button" onClick={() => editPhone(phone)} style={{ border: '1px solid var(--line)', background: 'var(--input-bg)', borderRadius: '12px', padding: '8px 10px', color: 'var(--text)', cursor: 'pointer' }}>{text("تعديل", "Edit")}</button>
                              <button type="button" onClick={() => removePhone(phone)} style={{ border: '1px solid rgba(197,45,69,.28)', background: 'rgba(197,45,69,.08)', color: '#c52d45', borderRadius: '12px', padding: '8px 10px', cursor: 'pointer' }}>{text("حذف", "Delete")}</button>
                            </div>
                          </article>
                        ))}
                        {!accountPhones.length && <p style={{ color: 'var(--muted)', margin: 0 }}>{text("لا توجد موبايلات محفوظة بعد.", "No saved phones yet.")}</p>}
                      </div>
                    </div>
                  )}

                  {profileTab === "favorites" && (
                    <FavoritesTabComponent locale={locale} text={text} />
                  )}

                  {profileTab === "admin_login" && (
                    <AdminLoginTabComponent locale={locale} text={text} />
                  )}
                </div>
              </div>
            </div>
          )}
          {status && <div className={styles.status}>{status}</div>}
        </div>
      </section>

      {confirmAction && (
        <div className={styles.modalOverlay} role="presentation" onMouseDown={() => !busy && setConfirmAction(null)}>
          <section
            className={styles.modal}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="account-delete-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2 id="account-delete-title">
                {confirmAction.type === "phone" ? text("حذف الموبايل؟", "Delete phone?") : text("حذف فرد العيلة؟", "Delete family member?")}
              </h2>
              <button type="button" onClick={() => setConfirmAction(null)} disabled={busy} aria-label={text("إغلاق", "Close")}>×</button>
            </div>
            <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7 }}>
              {confirmAction.type === "phone"
                ? text("سيتم حذف الموبايل من حسابك، وأي فرد مرتبط به سيظهر بدون موبايل.", "This phone will be removed from your account, and linked family members will no longer have a phone.")
                : text("سيتم حذف فرد العيلة من حسابك ولن يظهر في اختيار مندوب العيلة.", "This family member will be removed from your account and from Family Representative selection.")}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px', flexWrap: 'wrap' }}>
              <button type="button" disabled={busy} onClick={() => setConfirmAction(null)} style={{ border: '1px solid var(--line)', background: 'var(--panel)', color: 'var(--text)', borderRadius: '12px', padding: '12px 16px', fontWeight: 800, cursor: 'pointer' }}>{text("إلغاء", "Cancel")}</button>
              <button
                type="button"
                disabled={busy}
                onClick={() => confirmAction.type === "phone" ? performRemovePhone(confirmAction.item) : performRemoveMember(confirmAction.item)}
                style={{ border: '1px solid rgba(197,45,69,.28)', background: '#c52d45', color: '#fff', borderRadius: '12px', padding: '12px 16px', fontWeight: 900, cursor: 'pointer' }}
              >
                {busy ? text("جارٍ الحذف...", "Deleting...") : text("حذف", "Delete")}
              </button>
            </div>
          </section>
        </div>
      )}

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
