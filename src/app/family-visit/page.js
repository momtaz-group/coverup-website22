"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { supabase } from "@/utils/supabase";
import { createFamilyMember, deleteFamilyMember, loadFamilyMembers, updateFamilyMember } from "@/utils/familyMembers";
import { createUserPhone, deleteUserPhone, loadUserPhones, updateUserPhone } from "@/utils/userPhones";
import styles from "./page.module.css";

const phoneModels = [
  { brand: "Apple", name: "iPhone 16 Pro", design: "pro" },
  { brand: "Apple", name: "iPhone 16", design: "dual" },
  { brand: "Apple", name: "iPhone 15 Pro Max", design: "pro" },
  { brand: "Samsung", name: "Galaxy S25 Ultra", design: "ultra" },
  { brand: "Samsung", name: "Galaxy S25", design: "triple" },
  { brand: "Samsung", name: "Galaxy A56 5G", design: "triple" },
  { brand: "Infinix", name: "Note 50 Pro", design: "triple" },
  { brand: "Infinix", name: "Hot 50", design: "dual" },
  { brand: "OPPO", name: "Reno13 Pro", design: "triple" },
  { brand: "OPPO", name: "A5 Pro", design: "dual" },
];

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

const serviceOptions = [
  { value: "cover", labelAr: "كفر", labelEn: "Case", detailAr: "حماية وشكل مناسب", detailEn: "Protection with the right look" },
  { value: "screen_protector", labelAr: "اسكرينة", labelEn: "Screen protector", detailAr: "زجاج أو خصوصية", detailEn: "Glass or privacy protection" },
  { value: "charger", labelAr: "شاحن", labelEn: "Charger", detailAr: "قدرة آمنة ومتوافقة", detailEn: "Safe compatible power" },
  { value: "cable", labelAr: "كابل", labelEn: "Cable", detailAr: "الوصلة والطول المناسبان", detailEn: "Right connector and length" },
  { value: "power_bank", labelAr: "Power bank", labelEn: "Power bank", detailAr: "سعة وسرعة شحن", detailEn: "Capacity and charging speed" },
  { value: "accessory", labelAr: "إكسسوار", labelEn: "Accessory", detailAr: "أي احتياج إضافي", detailEn: "Any extra requirement" },
];

const fallbackProducts = [
  { id: "carbon-slide-camera-case", name: "كفر Carbon Slide Camera", name_en: "Carbon Slide Camera Case", category_en: "Cases", price: 449, image: "/assets/products/carbon-slide-camera-case.jpeg", compatible_models: ["iPhone 15 Pro Max", "Samsung S24 Ultra"] },
  { id: "samsung-clear-shockproof-case", name: "كفر Samsung Clear Shockproof", name_en: "Samsung Clear Shockproof Case", category_en: "Cases", price: 299, image: "/assets/products/samsung-clear-shockproof-case.jpeg", compatible_models: ["Samsung S24 Ultra", "Samsung S23 Ultra"] },
  { id: "tempered-glass-screen-protector", name: "اسكرينة Tempered Glass", name_en: "Tempered Glass Screen Protector", category_en: "Screen Protection", price: 199, image: "/assets/products/tempered-glass-screen-protector.jpeg", compatible_models: ["iPhone 15 Pro Max", "Samsung S24 Ultra"] },
  { id: "privacy-screen-protector", name: "اسكرينة Privacy", name_en: "Privacy Screen Protector", category_en: "Screen Protection", price: 299, image: "/assets/products/privacy-screen-protector.jpeg", compatible_models: ["iPhone 15 Pro Max", "Samsung S24 Ultra"] },
];

const stepLabels = {
  ar: ["بيانات التواصل", "أفراد العيلة", "الخدمات", "العنوان", "طريقة الدفع", "المراجعة"],
  en: ["Contact details", "Family members", "Services", "Address", "Payment method", "Review"],
};

const starterMembers = [
  { relationship: "me", labelAr: "أنا", labelEn: "Me" },
  { relationship: "father", labelAr: "بابا", labelEn: "Dad" },
  { relationship: "mother", labelAr: "ماما", labelEn: "Mom" },
  { relationship: "wife", labelAr: "زوجتي", labelEn: "Wife" },
  { relationship: "sister", labelAr: "أختي", labelEn: "Sister" },
  { relationship: "brother", labelAr: "أخويا", labelEn: "Brother" },
  { relationship: "friend", labelAr: "صديقي", labelEn: "Friend" },
];

const avatarImages = {
  me: "/assets/family-members/avatar-me-crown-v4.png",
  father: "/assets/family-members/avatar-father-v4.png",
  grandfather: "/assets/family-members/avatar-father-v4.png",
  husband: "/assets/family-members/avatar-father-v4.png",
  mother: "/assets/family-members/avatar-mother-v4.png",
  grandmother: "/assets/family-members/avatar-mother-v4.png",
  wife: "/assets/family-members/avatar-wife-v4.png",
  sister: "/assets/family-members/avatar-sister-v4.png",
  daughter: "/assets/family-members/avatar-sister-v4.png",
  brother: "/assets/family-members/avatar-brother-v4.png",
  son: "/assets/family-members/avatar-brother-v4.png",
  friend: "/assets/family-members/avatar-friend-v4.png",
  other: "/assets/family-members/avatar-other-v4.png",
};

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

function relationshipLabel(value, locale = "ar") {
  const option = relationshipOptions.find((entry) => entry.value === value);
  return locale === "ar" ? option?.labelAr || "فرد آخر" : option?.labelEn || "Other";
}

function avatarKeyForRelationship(value) {
  return relationshipAvatarKeys[value] || "other";
}

function avatarSrcForRelationship(value, avatarKey = "") {
  const key = avatarKey || avatarKeyForRelationship(value);
  return avatarImages[key] || avatarImages.other;
}

function safeProductImage(product) {
  const value = String(product?.image || "").trim();
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/")) return value;
  return fallbackProducts.find((item) => item.id === product?.id)?.image || "/assets/products/tempered-glass-screen-protector.jpeg";
}

function serviceLabel(value, locale = "ar") {
  const service = serviceOptions.find((entry) => entry.value === value);
  return locale === "ar" ? service?.labelAr || "غير محدد" : service?.labelEn || "Not selected";
}

function productMatchesService(product, service) {
  const text = `${product.category_en || ""} ${product.category || ""} ${product.name_en || ""} ${product.name || ""}`.toLowerCase();
  const words = {
    cover: ["case", "cover", "كفر"],
    screen_protector: ["screen", "protector", "glass", "اسكرينة", "زجاج"],
    charger: ["charger", "adapter", "شاحن"],
    cable: ["cable", "usb", "lightning", "كابل"],
    power_bank: ["power bank", "powerbank", "باور بانك"],
  };
  if (service === "accessory") return true;
  return (words[service] || []).some((word) => text.includes(word));
}

function productMatchesPhone(product, phone) {
  if (!phone || !Array.isArray(product.compatible_models) || product.compatible_models.length === 0) return true;
  const model = String(phone.model || "").toLowerCase();
  return product.compatible_models.some((candidate) => {
    const normalized = String(candidate || "").toLowerCase();
    return normalized === model || normalized.includes(model) || model.includes(normalized);
  });
}

function DeviceSketch({ design = "triple" }) {
  const count = design === "dual" ? 2 : design === "ultra" ? 4 : 3;
  return (
    <svg className={styles.sketch} viewBox="0 0 160 230" aria-hidden="true">
      <rect x="35" y="5" width="90" height="220" rx="19" fill="none" stroke="currentColor" strokeWidth="3" />
      <rect x="45" y="18" width="37" height={design === "ultra" ? 84 : 62} rx="10" fill="currentColor" />
      {Array.from({ length: count }).map((_, index) => (
        <circle key={index} cx={design === "ultra" ? 64 : index % 2 ? 69 : 58} cy={design === "ultra" ? 33 + index * 19 : 32 + Math.floor(index / 2) * 25} r="7" fill="white" stroke="currentColor" strokeWidth="2" />
      ))}
      <path d="M72 203h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function MemberAvatar({ relationship = "other", avatarKey = "", label = "", size = "medium" }) {
  return (
    <span className={`${styles.memberAvatar} ${styles[`avatar_${size}`]}`}>
      <Image
        src={avatarSrcForRelationship(relationship, avatarKey)}
        alt={label || relationshipLabel(relationship)}
        fill
        sizes={size === "tiny" ? "40px" : size === "small" ? "48px" : "64px"}
        className={styles.avatarImage}
      />
    </span>
  );
}

export default function FamilyVisitPage() {
  const router = useRouter();
  const { locale } = useLanguage();
  const ar = locale === "ar";
  const text = (arabic, english) => (ar ? arabic : english);
  const steps = stepLabels[locale] || stepLabels.ar;
  const [activeStep, setActiveStep] = useState(0);
  const [user, setUser] = useState(null);
  const [phones, setPhones] = useState([]);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [products, setProducts] = useState(fallbackProducts);
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [memberServices, setMemberServices] = useState({});
  const [memberPickerOpen, setMemberPickerOpen] = useState(false);
  const [phoneModal, setPhoneModal] = useState(false);
  const [memberModal, setMemberModal] = useState(false);
  const [phoneSearch, setPhoneSearch] = useState("");
  const [phoneName, setPhoneName] = useState("");
  const [memberName, setMemberName] = useState("");
  const [memberRelationship, setMemberRelationship] = useState("me");
  const [memberPhoneId, setMemberPhoneId] = useState("");
  const [selectedModel, setSelectedModel] = useState(null);
  const [customPhone, setCustomPhone] = useState(false);
  const [customBrand, setCustomBrand] = useState("");
  const [customModel, setCustomModel] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);
  const [savingMember, setSavingMember] = useState(false);
  const [returnToMemberModal, setReturnToMemberModal] = useState(false);
  const [returnToMemberPicker, setReturnToMemberPicker] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [memberMenuOpen, setMemberMenuOpen] = useState("");
  const [memberToDelete, setMemberToDelete] = useState(null);
  const [deletingMember, setDeletingMember] = useState(false);
  const [editingPhone, setEditingPhone] = useState(null);
  const [phoneToDelete, setPhoneToDelete] = useState(null);
  const [deletingPhone, setDeletingPhone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [profileData, setProfileData] = useState({ name: "", email: "" });
  const [savedLocations, setSavedLocations] = useState([]);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addressBusy, setAddressBusy] = useState(false);
  const [addressForm, setAddressForm] = useState({
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
  const [form, setForm] = useState({ clientName: "", clientPhone: "", clientEmail: "", selectedLocationId: "", locationLink: "", notes: "", paymentMethod: "cash" });

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const currentUser = session?.user || null;
      if (!active) return;
      setUser(currentUser);
      if (currentUser) {
        try {
          const profileRequest = session?.access_token
            ? fetch("/api/profile", { headers: { Authorization: `Bearer ${session.access_token}` } }).then((response) => response.json()).catch(() => ({}))
            : Promise.resolve({});
          const [phoneData, memberData, profileResponse] = await Promise.all([loadUserPhones(), loadFamilyMembers().catch(() => []), profileRequest]);
          if (active) {
            const profile = profileResponse.profile || {};
            const locations = Array.isArray(profile.location) ? profile.location : [];
            const selectedLocation = locations.find((item) => item.isDefault) || locations[0];
            setPhones(phoneData);
            setFamilyMembers(memberData);
            setSavedLocations(locations);
            setProfileData({ name: profile.name || "", email: profile.email || currentUser.email || "" });
            setForm((current) => ({
              ...current,
              clientName: current.clientName || profile.name || "",
              clientPhone: current.clientPhone || selectedLocation?.phone || profile.phone || "",
              clientEmail: current.clientEmail || profile.email || currentUser.email || "",
              selectedLocationId: current.selectedLocationId || selectedLocation?.id || "",
            }));
          }
        } catch {}
      }
    });

    fetch("/api/store-products")
      .then((response) => response.json())
      .then((data) => {
        if (active && data.configured && data.products?.length) setProducts(data.products);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  const selectedMembers = selectedMemberIds.map((id) => familyMembers.find((member) => member.id === id)).filter(Boolean);
  const matchingModels = phoneModels.filter((phone) => `${phone.brand} ${phone.name}`.toLowerCase().includes(phoneSearch.toLowerCase()));
  const getMemberPhone = (member) => phones.find((phone) => phone.id === member?.phone_id) || member?.phone || null;
  const getSelection = (memberId) => memberServices[memberId] || { service: "", productId: "", autoChoose: false };
  const getSuggestedProducts = (member) => {
    const selection = getSelection(member.id);
    const phone = getMemberPhone(member);
    return products.filter((product) => productMatchesService(product, selection.service) && productMatchesPhone(product, phone)).slice(0, 4);
  };
  const selectedLocation = savedLocations.find((location) => location.id === form.selectedLocationId);
  const formatAddress = (location) => [location?.address1, location?.address2, location?.city, location?.state].filter(Boolean).join(", ");
  const isCairoAddress = (location) => {
    const text = `${location?.city || ""} ${location?.state || ""} ${location?.address1 || ""}`.toLowerCase();
    return text.includes("cairo") || text.includes("القاهرة");
  };
  const representativeFee = selectedLocation ? (isCairoAddress(selectedLocation) ? 120 : 150) : 150;
  const formatMoney = (amount) => `${Number(amount || 0).toLocaleString(ar ? "ar-EG" : "en-US")} EGP`;
  const resolveOrderProduct = (member) => {
    const selection = getSelection(member.id);
    if (selection.productId) return products.find((item) => item.id === selection.productId);
    if (selection.autoChoose) return getSuggestedProducts(member)[0] || null;
    return null;
  };
  const selectedProductLines = selectedMembers.map((member) => {
    const selection = getSelection(member.id);
    const product = resolveOrderProduct(member);
    return { member, selection, product, price: Number(product?.price || 0) };
  });
  const productsSubtotal = selectedProductLines.reduce((sum, line) => sum + line.price, 0);
  const reviewTotal = productsSubtotal + representativeFee;

  const updateField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const saveNewAddress = async (event) => {
    event.preventDefault();
    setNotice("");
    setAddressBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error(text("سجّل الدخول الأول علشان نحفظ العنوان في حسابك.", "Sign in first so we can save the address to your account."));

      const newLocation = { id: crypto.randomUUID(), ...addressForm };
      const updatedLocations = [
        ...savedLocations.map((location) => addressForm.isDefault ? { ...location, isDefault: false } : location),
        newLocation,
      ];

      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ location: updatedLocations }),
      });
      if (!response.ok) throw new Error(text("فشل حفظ العنوان. جرّب مرة تانية.", "Could not save the address. Please try again."));

      setSavedLocations(updatedLocations);
      setForm((current) => ({
        ...current,
        selectedLocationId: newLocation.id,
        clientPhone: current.clientPhone || newLocation.phone || "",
      }));
      setShowAddressModal(false);
      setAddressForm({ recipientName: "", label: "", address1: "", address2: "", city: "", state: "", postalCode: "", phone: "", notes: "", isDefault: true });
    } catch (error) {
      setNotice(error.message);
    } finally {
      setAddressBusy(false);
    }
  };

  const toggleMember = (member) => {
    const selected = selectedMemberIds.includes(member.id);
    setSelectedMemberIds((current) => selected ? current.filter((id) => id !== member.id) : [...current, member.id]);
    if (!selected) {
      setMemberServices((current) => ({ ...current, [member.id]: current[member.id] || { service: "", productId: "", autoChoose: false } }));
    }
    setNotice("");
  };

  const removeMember = (memberId) => {
    setSelectedMemberIds((current) => current.filter((id) => id !== memberId));
    setNotice("");
  };

  const setMemberService = (memberId, service) => {
    setMemberServices((current) => ({ ...current, [memberId]: { service, productId: "", autoChoose: false } }));
    setNotice("");
  };

  const setMemberProduct = (memberId, productId) => {
    setMemberServices((current) => ({ ...current, [memberId]: { ...getSelection(memberId), productId, autoChoose: false } }));
    setNotice("");
  };

  const letCoverUpChoose = (memberId) => {
    setMemberServices((current) => ({ ...current, [memberId]: { ...getSelection(memberId), productId: "", autoChoose: true } }));
    setNotice("");
  };

  const openNewPhoneModal = ({ returnToMember = false, returnToPicker = false } = {}) => {
    setReturnToMemberModal(returnToMember);
    setReturnToMemberPicker(returnToPicker);
    setEditingPhone(null);
    setPhoneName("");
    setSelectedModel(null);
    setCustomPhone(false);
    setCustomBrand("");
    setCustomModel("");
    setPhoneSearch("");
    setPhoneModal(true);
  };

  const openEditPhone = (phone) => {
    setMemberPickerOpen(false);
    setReturnToMemberModal(false);
    setReturnToMemberPicker(true);
    setEditingPhone(phone);
    setPhoneName(phone.phone_name || "");
    setSelectedModel(null);
    setCustomPhone(true);
    setCustomBrand(phone.brand || "");
    setCustomModel(phone.model || "");
    setPhoneSearch("");
    setPhoneModal(true);
  };

  const openNewMemberModal = (relationship = "me", suggestedName = "") => {
    setMemberPickerOpen(false);
    setEditingMember(null);
    setMemberName(suggestedName);
    setMemberRelationship(relationship);
    setMemberPhoneId("");
    setMemberModal(true);
    setNotice("");
  };

  const openEditMember = (member) => {
    setMemberMenuOpen("");
    setMemberPickerOpen(false);
    setEditingMember(member);
    setMemberName(member.display_name || "");
    setMemberRelationship(member.relationship || "other");
    setMemberPhoneId(member.phone_id || member.phone?.id || "");
    setMemberModal(true);
    setNotice("");
  };

  const openPhoneForMember = () => {
    setMemberModal(false);
    openNewPhoneModal({ returnToMember: true });
  };

  const closePhoneModal = () => {
    setPhoneModal(false);
    if (returnToMemberModal) setMemberModal(true);
    if (returnToMemberPicker) setMemberPickerOpen(true);
    setReturnToMemberModal(false);
    setReturnToMemberPicker(false);
  };

  const saveFamilyMember = async (event) => {
    event.preventDefault();
    setNotice("");
    if (!user) return setNotice(text("سجّل الدخول أولاً حتى نقدر نحفظ أفراد العيلة.", "Sign in first so we can save family members."));
    if (!memberName.trim()) return setNotice(text("اكتب اسم فرد العيلة.", "Enter the family member name."));
    if (!memberPhoneId) return setNotice(text("اختار موبايل للفرد أو أضف موبايل جديد.", "Choose a phone for this member or add a new one."));

    setSavingMember(true);
    try {
      const payload = { id: editingMember?.id, display_name: memberName.trim(), relationship: memberRelationship, avatar_key: avatarKeyForRelationship(memberRelationship), phone_id: memberPhoneId };
      const member = editingMember ? await updateFamilyMember(payload) : await createFamilyMember(payload);
      setFamilyMembers((current) => editingMember ? current.map((item) => item.id === member.id ? member : item) : [member, ...current]);
      setSelectedMemberIds((current) => current.includes(member.id) ? current : [...current, member.id]);
      setMemberServices((current) => ({ ...current, [member.id]: current[member.id] || { service: "", productId: "", autoChoose: false } }));
      setMemberModal(false);
      setMemberPickerOpen(true);
      setMemberName("");
      setMemberRelationship("me");
      setMemberPhoneId("");
      setEditingMember(null);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setSavingMember(false);
    }
  };

  const confirmDeleteMember = async () => {
    if (!memberToDelete) return;
    setNotice("");
    setDeletingMember(true);
    try {
      await deleteFamilyMember(memberToDelete.id);
      setFamilyMembers((current) => current.filter((member) => member.id !== memberToDelete.id));
      setSelectedMemberIds((current) => current.filter((id) => id !== memberToDelete.id));
      setMemberServices((current) => {
        const next = { ...current };
        delete next[memberToDelete.id];
        return next;
      });
      setMemberToDelete(null);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setDeletingMember(false);
    }
  };

  const savePhone = async (event) => {
    event.preventDefault();
    setNotice("");
    if (!user) return setNotice(text("سجّل الدخول أولاً حتى نقدر نحفظ الموبايل.", "Sign in first so we can save the phone."));
    const model = customPhone ? { brand: customBrand.trim(), name: customModel.trim(), design: "triple" } : selectedModel;
    if (!phoneName.trim() || !model?.brand || !model?.name) return setNotice(text("اكتب اسم الموبايل واختر الموديل.", "Enter a phone name and choose the model."));

    setSavingPhone(true);
    try {
      const payload = { id: editingPhone?.id, phone_name: phoneName.trim(), brand: model.brand, model: model.name, design_key: model.design };
      const data = editingPhone ? await updateUserPhone(payload) : await createUserPhone(payload);
      setPhones((current) => editingPhone ? current.map((item) => item.id === data.id ? data : item) : [data, ...current]);
      setPhoneModal(false);
      if (returnToMemberModal) {
        setMemberPhoneId(data.id);
        setMemberModal(true);
      } else if (returnToMemberPicker) {
        setMemberPickerOpen(true);
      }
      setPhoneName("");
      setSelectedModel(null);
      setCustomPhone(false);
      setCustomBrand("");
      setCustomModel("");
      setEditingPhone(null);
      setReturnToMemberModal(false);
      setReturnToMemberPicker(false);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setSavingPhone(false);
    }
  };

  const confirmDeletePhone = async () => {
    if (!phoneToDelete) return;
    setNotice("");
    setDeletingPhone(true);
    try {
      await deleteUserPhone(phoneToDelete.id);
      setPhones((current) => current.filter((item) => item.id !== phoneToDelete.id));
      setFamilyMembers((current) => current.map((member) => member.phone_id === phoneToDelete.id ? { ...member, phone_id: null, phone: null } : member));
      setPhoneToDelete(null);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setDeletingPhone(false);
    }
  };

  const servicesComplete = selectedMembers.length > 0 && selectedMembers.every((member) => {
    const selection = getSelection(member.id);
    return selection.service && (selection.autoChoose || selection.productId);
  });

  const canOpenStep = (index) => {
    if (index <= activeStep) return true;
    if (index === 1) return Boolean(form.clientName.trim() && form.clientPhone.trim());
    if (index === 2) return Boolean(form.clientName.trim() && form.clientPhone.trim() && selectedMembers.length && selectedMembers.every(getMemberPhone));
    if (index === 3) return Boolean(servicesComplete);
    if (index === 4) return Boolean(servicesComplete && selectedLocation);
    if (index === 5) return Boolean(servicesComplete && selectedLocation && form.paymentMethod);
    return false;
  };

  const goNext = () => {
    if (canOpenStep(activeStep + 1)) {
      setActiveStep((current) => Math.min(current + 1, steps.length - 1));
      setNotice("");
    } else if (activeStep === 1 && selectedMembers.some((member) => !getMemberPhone(member))) {
      setNotice(text("كل فرد مختار لازم يكون مرتبط بموبايل قبل اختيار الخدمة.", "Every selected member must be linked to a phone before choosing services."));
    } else {
      setNotice(text("أكمل بيانات هذه الخطوة أولاً.", "Complete this step first."));
    }
  };

  const submitRequest = async () => {
    setNotice("");
    if (!user) return setNotice(text("سجّل الدخول أولاً حتى يتم حفظ طلب مندوب العيلة.", "Sign in first so we can save the Family Representative order."));
    if (!selectedMembers.length || !servicesComplete || !selectedLocation || !form.paymentMethod) return setNotice(text("راجع أفراد العيلة والخدمات والعنوان وطريقة الدفع قبل الإرسال.", "Review members, services, address, and payment method before submitting."));
    const missingProductLine = selectedProductLines.find((line) => !line.product);
    if (missingProductLine) return setNotice(text(`محتاجين منتج متوافق لـ ${missingProductLine.member.display_name}. اختار منتج أو غيّر نوع الخدمة.`, `We need a compatible product for ${missingProductLine.member.display_name}. Choose a product or change the service.`));

    const orderItems = selectedProductLines.map(({ member, selection, product }) => {
      const phone = getMemberPhone(member);
      return {
        id: product.id,
        quantity: 1,
        family_member: {
          id: member.id,
          name: member.display_name,
          relationship: member.relationship,
        },
        phone: {
          id: phone.id,
          label: phone.phone_name,
          brand: phone.brand,
          model: phone.model,
        },
        service_type: selection.service,
        service_label: serviceLabel(selection.service, locale),
        auto_choose: Boolean(selection.autoChoose),
        representative_note: selection.autoChoose
          ? text("Cover Up يحدد أفضل اختيار متوافق بعد مراجعة الموديل والمخزون.", "Cover Up will choose the best compatible option after checking the model and stock.")
          : "",
      };
    });

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error(text("جلسة الدخول انتهت. سجّل الدخول مرة تانية لإرسال الطلب.", "Your session expired. Sign in again to submit the order."));

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          channel: "website",
          customer: {
            name: form.clientName.trim() || profileData.name,
            phone: form.clientPhone.trim() || selectedLocation.phone || "",
            email: form.clientEmail.trim() || profileData.email || user.email || "",
            city: selectedLocation.city || selectedLocation.state || "",
            address: formatAddress(selectedLocation),
            locationLink: form.locationLink.trim(),
          },
          notes: [
            text("نوع الطلب: مندوب العيلة", "Order type: Family Representative"),
            `${text("أفراد الطلب", "Order members")}: ${selectedMembers.map((member) => member.display_name).join(ar ? "، " : ", ")}`,
            form.notes.trim(),
          ].filter(Boolean).join(" | "),
          deliveryMethod: "family_representative",
          familyRepresentativeFee: representativeFee,
          paymentMethod: form.paymentMethod,
          items: orderItems,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || text("فشل إنشاء طلب مندوب العيلة.", "Could not create the Family Representative order."));

      if (form.paymentMethod === "online") {
        router.push(`/checkout-payment?orderId=${data.order.id}`);
      } else {
        router.push(`/checkout-success?orderId=${data.order.id}`);
      }
    } catch (error) {
      setNotice(error.message);
      setSubmitting(false);
    }
  };

  return (
    <main className={styles.page} dir={ar ? "rtl" : "ltr"}>
      <section className={styles.hero} aria-labelledby="family-page-title">
        <Image src="/assets/family-representative-hero.png" alt={text("مندوب العيلة يدير موبايلات الأسرة بمساعدة MEMO", "Family Representative managing the family's phones with MEMO")} fill priority sizes="100vw" className={styles.heroImage} />
        <div className={styles.heroShade} />
        <div className={styles.heroContent}>
          <p className={styles.kicker}>Family Representative</p>
          <h1 id="family-page-title">{text("مندوب العيلة", "Family Representative")}</h1>
          <p>{text("اختار أفراد العيلة، اربط كل شخص بموبايله، وجهّز احتياجاتهم في طلب واحد منظم.", "Choose family members, link each person to their phone, and prepare everything in one organized order.")}</p>
          <a className={styles.heroAction} href="#family-dashboard">{text("ابدأ تجهيز العيلة", "Start preparing the family")}</a>
        </div>
        <div className={styles.heroRoster} aria-hidden="true">
          {["father", "mother", "me", "wife", "brother", "friend"].map((relationship) => (
            <MemberAvatar key={relationship} relationship={relationship} size="small" />
          ))}
        </div>
      </section>

      <section id="family-dashboard" className={styles.appSection} aria-labelledby="dashboard-title">
        <header className={styles.appHeader}>
          <div>
            <p className={styles.kicker}>{text("لوحة العيلة", "Family dashboard")}</p>
            <h2 id="dashboard-title">{text("طلب واحد. كل الموبايلات.", "One order. Every phone.")}</h2>
            <p>{text("أضف أكثر من فرد وحدد لكل واحد الخدمة والمنتج المناسب، أو اترك الاختيار لفريق Cover Up.", "Add multiple members, choose the right service and product for each one, or let Cover Up pick the best match.")}</p>
          </div>
          <div className={styles.liveStatus}><span /> {text("MEMO جاهز للمطابقة", "MEMO is ready to match")}</div>
        </header>

        <div className={styles.dashboard}>
          <aside className={styles.sidebar}>
            <div className={styles.memoCard}>
              <Image src="/assets/memo-profile-96.webp" alt="MEMO" width={56} height={56} />
              <div><strong>MEMO AI</strong><span>{text("مساعد العيلة الذكي", "Smart family assistant")}</span></div>
            </div>

            <nav className={styles.steps} aria-label={text("خطوات طلب مندوب العيلة", "Family Representative order steps")}>
              {steps.map((step, index) => (
                <button key={step} className={index === activeStep ? styles.activeStep : index < activeStep ? styles.completeStep : ""} type="button" onClick={() => canOpenStep(index) && setActiveStep(index)}>
                  <span>{index < activeStep ? "✓" : index + 1}</span>{step}
                </button>
              ))}
            </nav>

            <div className={styles.familySummary}>
              <span>{text("الطلب الحالي", "Current order")}</span>
              <strong>{selectedMembers.length} {text("أفراد", "members")}</strong>
              <small>{selectedMembers.filter((member) => getSelection(member.id).service).length} {text("خدمات محددة", "services selected")}</small>
            </div>
          </aside>

          <div className={styles.composer}>
            <header className={styles.stepHeader}>
              <span>{text("الخطوة", "Step")} {activeStep + 1} {text("من", "of")} {steps.length}</span>
              <h2>{steps[activeStep]}</h2>
            </header>

            {activeStep === 0 && (
              <div className={styles.stepContent}>
                <p className={styles.stepLead}>{text("البيانات اللي هنتواصل عليها لتأكيد الزيارة.", "The details we will use to confirm the visit.")}</p>
                <div className={styles.fieldGrid}>
                  <label>{text("اسم العميل", "Customer name")}<input value={form.clientName} onChange={(event) => updateField("clientName", event.target.value)} placeholder={text("مثال: أحمد محمد", "e.g. Ahmed Mohamed")} autoComplete="name" /></label>
                  <label>{text("رقم الموبايل", "Mobile number")}<input value={form.clientPhone} onChange={(event) => updateField("clientPhone", event.target.value)} placeholder="010..." inputMode="tel" autoComplete="tel" /></label>
                  <label className={styles.fullField}>{text("البريد الإلكتروني", "Email")}<input value={form.clientEmail} onChange={(event) => updateField("clientEmail", event.target.value)} placeholder="name@example.com" inputMode="email" autoComplete="email" /></label>
                </div>
                {!user && <Link className={styles.loginNotice} href="/account">{text("سجّل الدخول لحفظ العيلة والموبايلات وإرسال الطلب", "Sign in to save family members, phones, and submit the order")}</Link>}
              </div>
            )}

            {activeStep === 1 && (
              <div className={styles.stepContent}>
                <p className={styles.stepLead}>{text("اختار كل الأشخاص اللي محتاجين خدمة في الزيارة دي.", "Choose everyone who needs a service in this visit.")}</p>
                <button className={styles.memberPickerTrigger} type="button" onClick={() => setMemberPickerOpen(true)}>
                  <span className={styles.avatarStack}>
                    {selectedMembers.slice(0, 4).map((member) => <MemberAvatar key={member.id} relationship={member.relationship} avatarKey={member.avatar_key} label={member.display_name} size="tiny" />)}
                  </span>
                  <span><strong>{selectedMembers.length ? `${selectedMembers.length} ${text("أفراد مختارين", "selected members")}` : text("اختار أفراد العيلة", "Choose family members")}</strong><small>{text("افتح مكتبة العيلة وحدد أكثر من شخص", "Open the family library and select more than one person")}</small></span>
                  <b>{text("اختيار", "Choose")}</b>
                </button>

                <div className={styles.selectedMemberGrid}>
                  {selectedMembers.map((member) => {
                    const phone = getMemberPhone(member);
                    return (
                      <article key={member.id} className={styles.selectedMemberCard}>
                        <MemberAvatar relationship={member.relationship} avatarKey={member.avatar_key} label={member.display_name} />
                        <div><strong>{member.display_name}</strong><span>{relationshipLabel(member.relationship, locale)}</span><small>{phone ? `${phone.phone_name} · ${phone.model}` : text("لا يوجد موبايل مرتبط", "No linked phone")}</small></div>
                        <button type="button" onClick={() => removeMember(member.id)} aria-label={text(`إزالة ${member.display_name} من الطلب`, `Remove ${member.display_name} from order`)}>×</button>
                      </article>
                    );
                  })}
                  {!selectedMembers.length && <div className={styles.emptyState}><strong>{text("لسه ما اخترتش حد", "No one selected yet")}</strong><span>{text("اختار فرد أو أكثر علشان نجهز كل موبايل لوحده.", "Choose one or more members so each phone can be prepared separately.")}</span></div>}
                </div>
              </div>
            )}

            {activeStep === 2 && (
              <div className={styles.serviceStack}>
                {selectedMembers.map((member) => {
                  const phone = getMemberPhone(member);
                  const selection = getSelection(member.id);
                  const suggestedProducts = getSuggestedProducts(member);
                  return (
                    <section key={member.id} className={styles.memberService} aria-labelledby={`service-${member.id}`}>
                      <header className={styles.memberServiceHeader}>
                        <MemberAvatar relationship={member.relationship} avatarKey={member.avatar_key} label={member.display_name} />
                        <div><h3 id={`service-${member.id}`}>{member.display_name}</h3><p>{phone?.phone_name} · {phone?.brand} {phone?.model}</p></div>
                      </header>

                      <div className={styles.serviceChoices} role="radiogroup" aria-label={text(`الخدمة المطلوبة لـ ${member.display_name}`, `Required service for ${member.display_name}`)}>
                        {serviceOptions.map((service) => (
                          <button key={service.value} className={selection.service === service.value ? styles.selectedChoice : ""} type="button" role="radio" aria-checked={selection.service === service.value} onClick={() => setMemberService(member.id, service.value)}>
                            <strong>{ar ? service.labelAr : service.labelEn}</strong><small>{ar ? service.detailAr : service.detailEn}</small>
                          </button>
                        ))}
                      </div>

                      {selection.service && (
                        <div className={styles.recommendations}>
                          <div className={styles.recommendationTitle}><div><span>{text("ترشيحات متوافقة", "Compatible recommendations")}</span><h4>{text(`اختار منتج لـ ${phone?.phone_name}`, `Choose a product for ${phone?.phone_name}`)}</h4></div><small>{suggestedProducts.length} {text("منتجات من المتجر", "store products")}</small></div>
                          <button className={`${styles.smartChoice} ${selection.autoChoose ? styles.selectedSmartChoice : ""}`} type="button" onClick={() => letCoverUpChoose(member.id)}>
                            <span className={styles.smartMark}>
                              <Image src="/assets/memo-profile-96.webp" alt="MEMO" width={56} height={56} />
                            </span>
                            <span><strong>{text("خلّي Cover Up يختار الأنسب", "Let Cover Up choose the best match")}</strong><small>{text("هنراجع موديل الموبايل والمخزون ونبعت مع المندوب أفضل اختيار متوافق من حيث الجودة والسعر. هنتواصل معاك قبل التأكيد لو فيه فرق سعر.", "We will review the phone model and stock, then send the best compatible option with the representative. We will contact you before confirmation if the price changes.")}</small></span>
                            <b>{selection.autoChoose ? text("تم الاختيار", "Selected") : text("اختيار", "Choose")}</b>
                          </button>

                          <div className={styles.productGrid}>
                            {suggestedProducts.map((product) => (
                              <button key={product.id} className={selection.productId === product.id ? styles.selectedProduct : ""} type="button" onClick={() => setMemberProduct(member.id, product.id)}>
                                <Image src={safeProductImage(product)} alt={product.name_en || product.name} width={240} height={240} />
                                <span>{product.name_en || product.name}</span>
                                <strong>{product.price} EGP</strong>
                              </button>
                            ))}
                            {!suggestedProducts.length && <div className={styles.noProducts}><strong>{text("مفيش منتج ظاهر للموديل ده حالياً", "No visible product for this model yet")}</strong><span>{text("اختار “خلّي Cover Up يختار الأنسب” وإحنا هنراجع المخزون والتوافق قبل الزيارة.", "Choose “Let Cover Up choose” and we will review stock and compatibility before the visit.")}</span></div>}
                          </div>
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            )}

            {activeStep === 3 && (
              <div className={styles.stepContent}>
                <p className={styles.stepLead}>{text("اختار عنوان محفوظ من حسابك أو أضف عنوان جديد بنفس طريقة السلة.", "Choose a saved address from your account or add a new one just like checkout.")}</p>
                <div className={styles.addressGrid}>
                  {savedLocations.map((location) => (
                    <button key={location.id} className={form.selectedLocationId === location.id ? styles.selectedAddress : ""} type="button" onClick={() => {
                      setForm((current) => ({
                        ...current,
                        selectedLocationId: location.id,
                        clientPhone: current.clientPhone || location.phone || "",
                      }));
                    }}>
                      <span>{location.label || text("عنوان محفوظ", "Saved address")}</span>
                      <strong>{location.recipientName || form.clientName || text("مستلم الطلب", "Order recipient")}</strong>
                      <small>{formatAddress(location)}</small>
                      <b>{isCairoAddress(location) ? text("رسوم المندوب 120 EGP", "Representative fee 120 EGP") : text("رسوم المندوب 150 EGP", "Representative fee 150 EGP")}</b>
                    </button>
                  ))}
                  {!savedLocations.length && (
                    <div className={styles.emptyState}>
                      <strong>{text("لا توجد عناوين محفوظة", "No saved addresses")}</strong>
                      <span>{text("أضف عنوان جديد وسنحفظه في نفس عناوين الحساب المستخدمة في السلة.", "Add a new address and we will save it to the same account addresses used in checkout.")}</span>
                    </div>
                  )}
                </div>
                <button className={styles.secondaryButton} type="button" onClick={() => setShowAddressModal(true)}>{text("إضافة عنوان جديد", "Add new address")}</button>
                <div className={styles.fieldGrid}>
                  <label className={styles.fullField}>{text("لينك اللوكيشن", "Location link")}<input value={form.locationLink} onChange={(event) => updateField("locationLink", event.target.value)} placeholder="https://maps.google.com/..." inputMode="url" /></label>
                  <label className={styles.fullField}>{text("ملاحظات", "Notes")}<textarea value={form.notes} onChange={(event) => updateField("notes", event.target.value)} placeholder={text("ميعاد مناسب أو علامة مميزة للمكان", "Preferred time or a location landmark")} rows="4" /></label>
                </div>
              </div>
            )}

            {activeStep === 4 && (
              <div className={styles.stepContent}>
                <p className={styles.stepLead}>{text("اختار طريقة الدفع كما في السلة. الدفع الإلكتروني يكمل على نفس صفحة الدفع برقم الطلب.", "Choose the payment method like checkout. Online payment continues to the same payment page using the order number.")}</p>
                <div className={styles.paymentChoices} role="radiogroup" aria-label={text("طريقة الدفع", "Payment method")}>
                  <button className={form.paymentMethod === "cash" ? styles.selectedPayment : ""} type="button" role="radio" aria-checked={form.paymentMethod === "cash"} onClick={() => updateField("paymentMethod", "cash")}>
                    <span>{text("كاش", "Cash")}</span>
                    <strong>{text("الدفع عند الاستلام", "Cash on delivery")}</strong>
                    <small>{text("هندفع للمناديب بعد مراجعة الطلب وتأكيد الزيارة.", "Pay the representative after order review and visit confirmation.")}</small>
                  </button>
                  <button className={form.paymentMethod === "online" ? styles.selectedPayment : ""} type="button" role="radio" aria-checked={form.paymentMethod === "online"} onClick={() => updateField("paymentMethod", "online")}>
                    <span>Online</span>
                    <strong>{text("دفع إلكتروني", "Online payment")}</strong>
                    <small>{text("بعد إنشاء الطلب ستظهر نفس صفحة الدفع وإثبات التحويل المستخدمة في السلة.", "After creating the order, the same payment proof gateway used in checkout will open.")}</small>
                  </button>
                </div>
              </div>
            )}

            {activeStep === 5 && (
              <div className={styles.review}>
                <div className={styles.reviewContact}>
                  <span>{text("التواصل", "Contact")}</span>
                  <strong>{form.clientName}</strong>
                  <small>{form.clientPhone}</small>
                  <p>{formatAddress(selectedLocation)}</p>
                  <div className={styles.priceBreakdown}>
                    <div><span>{text("المنتجات المختارة", "Selected products")}</span><strong>{formatMoney(productsSubtotal)}</strong></div>
                    <div><span>{text("رسوم مندوب العيلة", "Representative fee")}</span><strong>{formatMoney(representativeFee)}</strong></div>
                    <div><span>{text("الإجمالي", "Total")}</span><strong>{formatMoney(reviewTotal)}</strong></div>
                  </div>
                  <small>{text("طريقة الدفع", "Payment method")}: {form.paymentMethod === "online" ? text("دفع إلكتروني", "Online payment") : text("كاش عند الاستلام", "Cash on delivery")}</small>
                </div>
                <div className={styles.reviewMembers}>
                  {selectedMembers.map((member) => {
                    const phone = getMemberPhone(member);
                    const selection = getSelection(member.id);
                    const product = resolveOrderProduct(member);
                    return (
                      <article key={member.id}>
                        <MemberAvatar relationship={member.relationship} avatarKey={member.avatar_key} label={member.display_name} />
                        <div><strong>{member.display_name}</strong><span>{phone?.phone_name} · {phone?.model}</span><small>{serviceLabel(selection.service, locale)} · {selection.autoChoose ? `${text("Cover Up يختار الأنسب", "Cover Up chooses best match")} (${product?.name_en || product?.name || text("قيد التحديد", "To be confirmed")})` : product?.name_en || product?.name}</small></div>
                      </article>
                    );
                  })}
                </div>
              </div>
            )}

            {notice && <p className={`${styles.notice} ${notice.startsWith("تم ") ? styles.successNotice : ""}`} role="status">{notice}</p>}

            <div className={styles.actions}>
              <button className={styles.backButton} type="button" disabled={activeStep === 0} onClick={() => { setActiveStep((current) => Math.max(current - 1, 0)); setNotice(""); }}>{text("رجوع", "Back")}</button>
              {activeStep < steps.length - 1 ? <button className={styles.primaryButton} type="button" onClick={goNext}>{text("التالي", "Next")}</button> : <button className={styles.primaryButton} type="button" disabled={submitting} onClick={submitRequest}>{submitting ? text("جارٍ الإرسال...", "Submitting...") : `${text("إرسال", "Submit")} ${selectedMembers.length} ${text("طلبات", "requests")}`}</button>}
            </div>
          </div>
        </div>
      </section>

      {showAddressModal && (
        <div className={styles.overlay} onMouseDown={() => !addressBusy && setShowAddressModal(false)}>
          <form className={`${styles.modal} ${styles.addressModal}`} onSubmit={saveNewAddress} onMouseDown={(event) => event.stopPropagation()}>
            <div className={styles.modalTop}>
              <div><p className={styles.kicker}>{text("عنوان الحساب", "Account address")}</p><h2>{text("إضافة عنوان جديد", "Add new address")}</h2><span>{text("سيتم حفظه في نفس عناوين البروفايل المستخدمة في السلة.", "It will be saved to the same profile addresses used in checkout.")}</span></div>
              <button type="button" onClick={() => setShowAddressModal(false)} disabled={addressBusy} aria-label={text("إغلاق", "Close")}>×</button>
            </div>

            <div className={styles.fieldGrid}>
              <label>{text("اسم المستلم", "Recipient name")}<input value={addressForm.recipientName} onChange={(event) => setAddressForm({ ...addressForm, recipientName: event.target.value })} placeholder={text("اسم المستلم", "Recipient name")} required /></label>
              <label>{text("اسم العنوان", "Address label")}<input value={addressForm.label} onChange={(event) => setAddressForm({ ...addressForm, label: event.target.value })} placeholder={text("المنزل، الشغل...", "Home, work...")} required /></label>
              <label>{text("رقم الهاتف", "Phone number")}<input type="tel" value={addressForm.phone} onChange={(event) => setAddressForm({ ...addressForm, phone: event.target.value })} inputMode="tel" required /></label>
              <label>{text("المدينة", "City")}<input value={addressForm.city} onChange={(event) => setAddressForm({ ...addressForm, city: event.target.value })} required /></label>
              <label className={styles.fullField}>{text("العنوان الأول", "Address line 1")}<input value={addressForm.address1} onChange={(event) => setAddressForm({ ...addressForm, address1: event.target.value })} placeholder={text("رقم المبنى والشارع", "Building and street")} required /></label>
              <label className={styles.fullField}>{text("العنوان الثاني", "Address line 2")}<input value={addressForm.address2} onChange={(event) => setAddressForm({ ...addressForm, address2: event.target.value })} placeholder={text("الشقة، الدور، علامة مميزة", "Apartment, floor, landmark")} /></label>
              <label>{text("المحافظة", "Governorate")}<select value={addressForm.state} onChange={(event) => setAddressForm({ ...addressForm, state: event.target.value })} required>
                <option value="">{text("اختر المحافظة", "Select governorate")}</option>
                <option value="القاهرة">القاهرة (Cairo)</option>
                <option value="الجيزة">الجيزة (Giza)</option>
                <option value="الإسكندرية">الإسكندرية (Alexandria)</option>
                <option value="الدقهلية">الدقهلية (Dakahlia)</option>
                <option value="الشرقية">الشرقية (Al Sharqia)</option>
                <option value="القليوبية">القليوبية (Qalyubia)</option>
                <option value="الغربية">الغربية (Gharbia)</option>
                <option value="المنوفية">المنوفية (Monufia)</option>
                <option value="البحيرة">البحيرة (Beheira)</option>
                <option value="بورسعيد">بورسعيد (Port Said)</option>
                <option value="دمياط">دمياط (Damietta)</option>
                <option value="الإسماعيلية">الإسماعيلية (Ismailia)</option>
                <option value="السويس">السويس (Suez)</option>
                <option value="باقي المحافظات">{text("باقي المحافظات", "Other governorates")}</option>
              </select></label>
              <label>{text("الرمز البريدي", "Postal code")}<input value={addressForm.postalCode} onChange={(event) => setAddressForm({ ...addressForm, postalCode: event.target.value })} /></label>
              <label className={styles.fullField}>{text("ملاحظات التوصيل", "Delivery notes")}<textarea value={addressForm.notes} onChange={(event) => setAddressForm({ ...addressForm, notes: event.target.value })} rows="3" /></label>
            </div>

            <label className={styles.checkboxLine}>
              <input type="checkbox" checked={addressForm.isDefault} onChange={(event) => setAddressForm({ ...addressForm, isDefault: event.target.checked })} />
              {text("استخدام كعنوان أساسي", "Set as default address")}
            </label>

            {notice && <p className={styles.notice}>{notice}</p>}
            <button className={styles.primaryButton} type="submit" disabled={addressBusy}>{addressBusy ? text("جارٍ حفظ العنوان...", "Saving address...") : text("حفظ واستخدام العنوان", "Save and use address")}</button>
          </form>
        </div>
      )}

      {memberPickerOpen && (
        <div className={styles.overlay} onMouseDown={() => setMemberPickerOpen(false)}>
          <section className={`${styles.modal} ${styles.memberPickerModal}`} role="dialog" aria-modal="true" aria-labelledby="member-picker-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className={styles.modalTop}><div><p className={styles.kicker}>{text("مكتبة العيلة", "Family library")}</p><h2 id="member-picker-title">{text("اختار أفراد الطلب", "Choose order members")}</h2><span>{text("ممكن تختار أكثر من فرد في نفس الزيارة.", "You can choose more than one member in the same visit.")}</span></div><button type="button" onClick={() => setMemberPickerOpen(false)} aria-label={text("إغلاق", "Close")}>×</button></div>
            <div className={styles.memberGrid}>
              {familyMembers.map((member) => {
                const phone = getMemberPhone(member);
                const selected = selectedMemberIds.includes(member.id);
                return (
                  <article key={member.id} className={`${styles.memberTile} ${selected ? styles.selectedMember : ""}`}>
                    <button className={styles.memberTileMain} type="button" onClick={() => toggleMember(member)}>
                      <MemberAvatar relationship={member.relationship} avatarKey={member.avatar_key} label={member.display_name} />
                      <strong>{member.display_name}</strong><span>{relationshipLabel(member.relationship, locale)}</span><small>{phone ? `${phone.phone_name} · ${phone.model}` : text("بدون موبايل مرتبط", "No linked phone")}</small><b>{selected ? "✓" : "+"}</b>
                    </button>
                    <button className={styles.moreButton} type="button" aria-label={text(`خيارات ${member.display_name}`, `${member.display_name} options`)} onClick={() => setMemberMenuOpen((current) => current === member.id ? "" : member.id)}>
                      ⋯
                    </button>
                    {memberMenuOpen === member.id && (
                      <div className={styles.moreMenu}>
                        <button type="button" onClick={() => openEditMember(member)}>{text("تعديل الفرد", "Edit member")}</button>
                        <button type="button" onClick={() => { setMemberMenuOpen(""); setMemberToDelete(member); }}>{text("حذف الفرد", "Delete member")}</button>
                      </div>
                    )}
                  </article>
                );
              })}
              {!familyMembers.length && starterMembers.map((starter) => (
                <button key={starter.relationship} className={styles.starterMember} type="button" onClick={() => openNewMemberModal(starter.relationship, ar ? starter.labelAr : starter.labelEn)}>
                  <MemberAvatar relationship={starter.relationship} label={ar ? starter.labelAr : starter.labelEn} />
                  <strong>{ar ? starter.labelAr : starter.labelEn}</strong>
                  <span>{relationshipLabel(starter.relationship, locale)}</span>
                  <small>{text("إضافة وربط موبايل", "Add and link a phone")}</small>
                  <b>+</b>
                </button>
              ))}
            </div>

            <div className={styles.pickerActions}><button className={styles.secondaryButton} type="button" onClick={() => openNewMemberModal()}>{text("إضافة فرد جديد", "Add new member")}</button><button className={styles.primaryButton} type="button" onClick={() => setMemberPickerOpen(false)}>{text("تم الاختيار", "Done")} ({selectedMemberIds.length})</button></div>

            <div className={styles.deviceLibrary}>
              <header><div><span>{text("الموبايلات المحفوظة", "Saved phones")}</span><strong>{phones.length} {text("أجهزة", "devices")}</strong></div><button type="button" onClick={() => { setMemberPickerOpen(false); openNewPhoneModal({ returnToPicker: true }); }}>{text("إضافة موبايل", "Add phone")}</button></header>
              <div>
                {phones.map((phone) => (
                  <article key={phone.id}><DeviceSketch design={phone.design_key} /><div><strong>{phone.phone_name}</strong><span>{phone.brand} · {phone.model}</span></div><button type="button" onClick={() => openEditPhone(phone)}>{text("تعديل", "Edit")}</button><button className={styles.deleteTextButton} type="button" onClick={() => setPhoneToDelete(phone)}>{text("حذف", "Delete")}</button></article>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}

      {memberModal && (
        <div className={styles.overlay} onMouseDown={() => !savingMember && setMemberModal(false)}>
          <form className={styles.modal} onSubmit={saveFamilyMember} onMouseDown={(event) => event.stopPropagation()}>
            <div className={styles.modalTop}><div><p className={styles.kicker}>{text("فرد العيلة", "Family member")}</p><h2>{editingMember ? text("تعديل فرد العيلة", "Edit family member") : text("إضافة فرد للعيلة", "Add family member")}</h2></div><button type="button" onClick={() => setMemberModal(false)} disabled={savingMember} aria-label={text("إغلاق", "Close")}>×</button></div>
            <label>{text("اسم الفرد", "Member name")}<input value={memberName} onChange={(event) => setMemberName(event.target.value)} placeholder={text("مثال: ماما، عمر، سارة", "e.g. Mom, Omar, Sara")} autoFocus /></label>
            <label>{text("صلة القرابة", "Relationship")}<select value={memberRelationship} onChange={(event) => setMemberRelationship(event.target.value)}>{relationshipOptions.map((option) => <option key={option.value} value={option.value}>{ar ? option.labelAr : option.labelEn}</option>)}</select></label>
            <label>{text("الموبايل المرتبط", "Linked phone")}<select value={memberPhoneId} onChange={(event) => setMemberPhoneId(event.target.value)}><option value="">{text("اختار موبايل محفوظ", "Choose a saved phone")}</option>{phones.map((phone) => <option key={phone.id} value={phone.id}>{phone.phone_name} - {phone.brand} {phone.model}</option>)}</select></label>
            <button className={styles.linkPhoneButton} type="button" onClick={openPhoneForMember}>{text("إضافة موبايل جديد وربطه بالفرد", "Add a new phone and link it to this member")}</button>
            {notice && <p className={styles.notice}>{notice}</p>}
            <button className={styles.primaryButton} type="submit" disabled={savingMember}>{savingMember ? text("جارٍ الحفظ...", "Saving...") : editingMember ? text("تحديث فرد العيلة", "Update family member") : text("حفظ فرد العيلة", "Save family member")}</button>
          </form>
        </div>
      )}

      {phoneModal && (
        <div className={styles.overlay} onMouseDown={closePhoneModal}>
          <form className={styles.modal} onSubmit={savePhone} onMouseDown={(event) => event.stopPropagation()}>
            <div className={styles.modalTop}><div><p className={styles.kicker}>{text("جهاز العيلة", "Family device")}</p><h2>{editingPhone ? text("تعديل الموبايل", "Edit phone") : text("إضافة موبايل", "Add phone")}</h2></div><button type="button" onClick={closePhoneModal} aria-label={text("إغلاق", "Close")}>×</button></div>
            <label>{text("اسم لهذا الموبايل", "Name this phone")}<input value={phoneName} onChange={(event) => setPhoneName(event.target.value)} placeholder={text("مثال: موبايل ماما", "e.g. Mom's phone")} autoFocus /></label>
            <div className={styles.choiceTabs}><button className={!customPhone ? styles.activeChoice : ""} type="button" onClick={() => setCustomPhone(false)}>{text("ابحث عن موديل", "Search model")}</button><button className={customPhone ? styles.activeChoice : ""} type="button" onClick={() => setCustomPhone(true)}>{text("موديل مخصص", "Custom model")}</button></div>
            {customPhone ? <div className={styles.fieldGrid}><label>{text("الماركة", "Brand")}<input value={customBrand} onChange={(event) => setCustomBrand(event.target.value)} placeholder="Xiaomi" /></label><label>{text("الموديل", "Model")}<input value={customModel} onChange={(event) => setCustomModel(event.target.value)} placeholder="Redmi Note 13" /></label></div> : <><label>{text("ابحث عن الموديل", "Search for model")}<input value={phoneSearch} onChange={(event) => setPhoneSearch(event.target.value)} placeholder="iPhone, Galaxy, OPPO" /></label><div className={styles.modelList}>{matchingModels.map((model) => <button className={selectedModel?.name === model.name ? styles.selectedModel : ""} key={model.name} type="button" onClick={() => setSelectedModel(model)}><span>{model.brand}</span><strong>{model.name}</strong></button>)}</div></>}
            {(selectedModel || customPhone) && <div className={styles.preview}><DeviceSketch design={customPhone ? "triple" : selectedModel.design} /><span>{customPhone ? customModel || text("موديل مخصص", "Custom model") : selectedModel.name}</span></div>}
            {notice && <p className={styles.notice}>{notice}</p>}
            <button className={styles.primaryButton} type="submit" disabled={savingPhone}>{savingPhone ? text("جارٍ الحفظ...", "Saving...") : editingPhone ? text("تحديث الموبايل", "Update phone") : text("حفظ الموبايل", "Save phone")}</button>
          </form>
        </div>
      )}

      {phoneToDelete && (
        <div className={styles.overlay} onMouseDown={() => !deletingPhone && setPhoneToDelete(null)}>
          <section className={`${styles.modal} ${styles.alertDialog}`} onMouseDown={(event) => event.stopPropagation()} role="alertdialog" aria-modal="true" aria-labelledby="delete-family-phone-title">
            <div className={styles.alertIcon}>!</div>
            <div><p className={styles.kicker}>{text("حذف الموبايل", "Delete phone")}</p><h2 id="delete-family-phone-title">{text(`تحذف ${phoneToDelete.phone_name}؟`, `Delete ${phoneToDelete.phone_name}?`)}</h2><p>{text("الموبايل هيتشال من مكتبة العيلة، وأي فرد مرتبط بيه هيحتاج موبايل جديد قبل طلب خدمة.", "This phone will be removed from the family library. Any linked member will need a new phone before requesting a service.")}</p></div>
            {notice && <p className={styles.notice}>{notice}</p>}
            <div className={styles.dialogActions}><button className={styles.secondaryButton} type="button" disabled={deletingPhone} onClick={() => setPhoneToDelete(null)}>{text("إلغاء", "Cancel")}</button><button className={styles.dangerButton} type="button" disabled={deletingPhone} onClick={confirmDeletePhone}>{deletingPhone ? text("جارٍ الحذف...", "Deleting...") : text("حذف الموبايل", "Delete phone")}</button></div>
          </section>
        </div>
      )}

      {memberToDelete && (
        <div className={styles.overlay} onMouseDown={() => !deletingMember && setMemberToDelete(null)}>
          <section className={`${styles.modal} ${styles.alertDialog}`} onMouseDown={(event) => event.stopPropagation()} role="alertdialog" aria-modal="true" aria-labelledby="delete-family-member-title">
            <div className={styles.alertIcon}>!</div>
            <div><p className={styles.kicker}>{text("حذف فرد العيلة", "Delete family member")}</p><h2 id="delete-family-member-title">{text(`تحذف ${memberToDelete.display_name}؟`, `Delete ${memberToDelete.display_name}?`)}</h2><p>{text("الفرد هيتشال من مكتبة العيلة ومن الطلب الحالي، لكن الموبايل المحفوظ نفسه هيفضل موجود.", "This member will be removed from the family library and current order, but the saved phone itself will remain.")}</p></div>
            {notice && <p className={styles.notice}>{notice}</p>}
            <div className={styles.dialogActions}><button className={styles.secondaryButton} type="button" disabled={deletingMember} onClick={() => setMemberToDelete(null)}>{text("إلغاء", "Cancel")}</button><button className={styles.dangerButton} type="button" disabled={deletingMember} onClick={confirmDeleteMember}>{deletingMember ? text("جارٍ الحذف...", "Deleting...") : text("حذف الفرد", "Delete member")}</button></div>
          </section>
        </div>
      )}
    </main>
  );
}
