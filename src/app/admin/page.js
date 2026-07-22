"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminOrdersTab from "./AdminOrdersTab";
import chatStyles from "@/app/chat/page.module.css";
import ProductEditor from "./ProductEditor";
import CategoriesTab from "./CategoriesTab";

const ORDER_STATUSES = [
  "new",
  "pending_payment",
  "paid",
  "confirmed",
  "preparing",
  "fetching_required_items",
  "representative_on_way",
  "with_courier",
  "delivered",
  "suspended",
  "cancelled",
  "refunded",
  "payment_failed",
];

export default function AdminPage() {
  const router = useRouter();
  
  // Tabs: overview, users, products, orders, memo_chats, analytics
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  // Data states
  const [events, setEvents] = useState({
    orders: [],
    reviews: [],
    complaints: [],
    customers: [],
  });
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [memoChats, setMemoChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  
  // Search inputs
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [userSearchQuery, setUserSearchQuery] = useState("");

  // Product page states
  const [sections, setSections] = useState([]);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [productFilterSection, setProductFilterSection] = useState("");
  const [productSort, setProductSort] = useState("newest");
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [productPage, setProductPage] = useState(1);
  
  // Feedback states
  const [statusMessage, setStatusMessage] = useState("");

  // POS Form state
  const [posForm, setPosForm] = useState({
    productId: "",
    quantity: 1,
    paymentMethod: "cash",
    customerName: "",
    customerPhone: "",
  });

  // Product Form state
  const initialProductForm = {
    id: "",
    name: "",
    category: "",
    brand: "",
    product_family: "",
    compatible_models: [],
    versions: [],
    product_type: "simple",
    tags: "", 
    sku: "",
    price: "",
    stock_quantity: "",
    badge: "",
    description: "",
    colors: [],
    featured: "false",
    status: "public",
    image: "",
    images: [],
  };
  const [productForm, setProductForm] = useState(initialProductForm);
  const [imageFile, setImageFile] = useState(null);
  const [galleryFiles, setGalleryFiles] = useState([]);

  const loadCategories = async () => {
    const response = await fetch("/api/store-categories?admin=1");
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "فشل تحميل الأقسام.");
    }
    const nextCategories = Array.isArray(data.categories) ? data.categories : [];
    setCategories(nextCategories);
    setSections(nextCategories.filter((category) => category.is_active !== false).map((category) => category.name));
  };

  // Check admin session and load initial data
  const loadDashboardData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setStatusMessage("");

    try {
      // 1. Fetch store events (orders, reviews, complaints, customers)
      const eventsRes = await fetch("/api/store-events");
      if (eventsRes.status === 401) {
        // Redirect to login if unauthorized
        router.push("/account?showAdminLogin=true");
        return;
      }
      const eventsData = await eventsRes.json().catch(() => ({}));
      if (eventsRes.ok) {
        setEvents(eventsData);
      }

      // 2. Fetch products
      const prodRes = await fetch("/api/store-products");
      const prodData = await prodRes.json().catch(() => ({}));
      if (prodRes.ok && prodData.products) {
        setProducts(prodData.products);
        if (prodData.products.length > 0 && !posForm.productId) {
          setPosForm((prev) => ({ ...prev, productId: prodData.products[0].id }));
        }
      }

      // 2.5 Fetch categories managed by the dedicated admin tab
      try {
        await loadCategories();
      } catch (categoryError) {
        console.error("Error loading categories:", categoryError);
        setCategories([]);
        setSections([]);
      }

      // 3. Fetch registered profiles and roles
      const usersRes = await fetch("/api/admin/users");
      const usersData = await usersRes.json().catch(() => ({}));
      if (usersRes.ok && usersData.profiles) {
        setUsersList(usersData.profiles);
      }

      // 4. Fetch logged AI conversations (memo_chats)
      const chatsRes = await fetch("/api/admin/chats");
      const chatsData = await chatsRes.json().catch(() => ({}));
      if (chatsRes.ok && chatsData.chats) {
        setMemoChats(chatsData.chats);
      }
    } catch (err) {
      console.error("Error loading dashboard data:", err);
      setStatusMessage("فشل تحميل البيانات من الخادم.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => {
      loadDashboardData();
    }, 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    setProductPage(1);
  }, [productSearch, productFilterSection, productSort]);

  const handleSignOut = () => {
    // Delete admin cookie
    document.cookie = "coverup_admin_token=; path=/; max-age=0;";
    // Redirect to profile page
    router.push("/account");
  };

  // Update Order Status
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    setStatusMessage("جارٍ تحديث حالة الطلب...");
    try {
      const res = await fetch("/api/admin-orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status: newStatus }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to update order status");

      const shortId = orderId.startsWith("CU") ? orderId : orderId.slice(0, 8);
      if (data.email?.success) {
        setStatusMessage(`تم تحديث الطلب #${shortId} إلى: ${newStatus} وإرسال الإيميل للعميل.`);
      } else if (data.email && !data.email.success) {
        setStatusMessage(`تم تحديث الطلب #${shortId} إلى: ${newStatus} لكن الإيميل فشل: ${data.email.error || "خطأ غير معروف"}`);
      } else {
        setStatusMessage(`تم تحديث الطلب #${shortId} إلى: ${newStatus}`);
      }
      loadDashboardData(true);
    } catch (err) {
      setStatusMessage(err.message);
    }
  };

  // Toggle user role (Admin / User)
  const handleToggleUserRole = async (userId, currentRole) => {
    const nextRole = currentRole === "admin" ? "user" : "admin";
    setStatusMessage("جارٍ تحديث دور المستخدم...");
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: nextRole }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to update role");

      setStatusMessage("تم تحديث دور المستخدم بنجاح.");
      loadDashboardData(true);
    } catch (err) {
      setStatusMessage(err.message);
    }
  };

  // POS Order Submit
  const handlePosSubmit = async (e) => {
    e.preventDefault();
    setStatusMessage("جارٍ تسجيل عملية البيع الفرعية...");
    try {
      const prod = products.find((p) => p.id === posForm.productId);
      if (!prod) throw new Error("المنتج المحدد غير موجود.");

      const payload = {
        channel: "pos",
        deliveryMethod: "pickup",
        paymentMethod: posForm.paymentMethod,
        customer: {
          name: posForm.customerName.trim() || "عميل الفرع",
          phone: posForm.customerPhone.trim() || "01050310516",
        },
        items: [
          {
            id: posForm.productId,
            quantity: Number(posForm.quantity),
          },
        ],
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to submit POS order");

      setStatusMessage(`تم البيع بنجاح. رقم الفاتورة: ${String(data.order.id).startsWith("CU") ? data.order.id : String(data.order.id).slice(0, 8)}`);
      setPosForm({
        productId: products[0]?.id || "",
        quantity: 1,
        paymentMethod: "cash",
        customerName: "",
        customerPhone: "",
      });
      loadDashboardData(true);
    } catch (err) {
      setStatusMessage(err.message);
    }
  };

  // Convert File to Base64
  const fileToDataUrl = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const uploadProductImage = async (file, productName) => {
    const dataUrl = await fileToDataUrl(file);
    if (!dataUrl) return "";

    try {
      const res = await fetch("/api/storage-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "product",
          fileName: file.name || "product.png",
          productName: productName || "coverup",
          dataUrl,
        }),
      });
      const data = await res.json();
      return res.ok ? data.url : "";
    } catch {
      return "";
    }
  };

  // Product Create/Update Submit
  const handleProductSubmit = async (e) => {
    e.preventDefault();
    setStatusMessage("جارٍ حفظ المنتج...");
    try {
      if (!productForm.category || !sections.includes(productForm.category)) {
        throw new Error("اختر قسماً محفوظاً من تبويب الأقسام.");
      }

      const fileToUrlMap = {};
      let uploadedUrl = productForm.image;
      if (productForm.image) fileToUrlMap[productForm.image] = productForm.image;
      
      if (imageFile) {
        setStatusMessage("جارٍ رفع صورة المنتج الأساسية...");
        uploadedUrl = await uploadProductImage(imageFile, productForm.name);
        if (!uploadedUrl) {
          throw new Error("فشل رفع صورة المنتج الأساسية.");
        }
        fileToUrlMap[imageFile.name] = uploadedUrl;
      }

      // Upload gallery images
      let uploadedGallery = [...(productForm.images || [])];
      uploadedGallery.forEach(url => { fileToUrlMap[url] = url; });
      
      if (galleryFiles.length > 0) {
        setStatusMessage("جارٍ رفع الصور الإضافية...");
        for (const file of galleryFiles) {
          const gUrl = await uploadProductImage(file, productForm.name);
          if (gUrl) {
            uploadedGallery.push(gUrl);
            fileToUrlMap[file.name] = gUrl;
          }
        }
      }

      // Resolve color images
      const resolvedColors = (productForm.colors || []).map(c => {
        let finalImages = [];
        if (Array.isArray(c.images)) {
          finalImages = c.images.map(ref => fileToUrlMap[ref] || ref).filter(Boolean);
        } else if (c.image) {
          finalImages = [fileToUrlMap[c.image] || c.image].filter(Boolean);
        }
        return { ...c, image: finalImages[0] || null, images: finalImages };
      });

      // Convert comma-separated tags to array if it's a string
      let parsedTags = productForm.tags;
      if (typeof parsedTags === "string") {
        parsedTags = parsedTags.split(",").map(t => t.trim()).filter(Boolean);
      }

      const deviceCategoryPatterns = [
        "phone cases",
        "phone covers",
        "cases",
        "covers",
        "screen protectors",
        "screen protection",
        "كفر",
        "كفرات",
        "حماية الشاشة",
        "اسكرينة",
        "سكرينة",
      ];
      const supportsDeviceVersions = deviceCategoryPatterns.some((pattern) =>
        String(productForm.category || "").trim().toLowerCase().includes(pattern),
      );
      const resolvedVersions = [];
      if (supportsDeviceVersions) {
        if (!Array.isArray(productForm.versions) || productForm.versions.length === 0) {
          throw new Error("Add at least one phone-model version before saving this product.");
        }
        setStatusMessage("جاري رفع صور إصدارات المنتج...");
        for (const version of productForm.versions) {
          let mainImageUrl = version.main_image_url || "";
          if (version._mainImageFile) {
            mainImageUrl = await uploadProductImage(version._mainImageFile, `${productForm.name}-${version.phone_model}`);
            if (!mainImageUrl) throw new Error(`Failed to upload version image for ${version.phone_model || version.version_name}.`);
          }

          const versionImages = Array.isArray(version.images) ? [...version.images] : [];
          if (Array.isArray(version._galleryFiles)) {
            for (const file of version._galleryFiles) {
              const imageUrl = await uploadProductImage(file, `${productForm.name}-${version.phone_model}`);
              if (imageUrl) versionImages.push(imageUrl);
            }
          }

          resolvedVersions.push({
            id: version.id,
            version_name: version.version_name,
            brand: version.brand,
            product_family: version.product_family,
            phone_model: version.phone_model,
            sku: version.sku,
            barcode: version.barcode,
            price: version.price,
            compare_at_price: version.compare_at_price,
            stock_quantity: version.stock_quantity,
            main_image_url: mainImageUrl,
            images: versionImages,
            status: version.status || "active",
            sort_order: version.sort_order,
          });
        }
      }

      const cleanPayload = {
        ...productForm,
        product_type: supportsDeviceVersions ? "device_versions" : "simple",
        image: uploadedUrl,
        images: uploadedGallery,
        colors: resolvedColors,
        tags: parsedTags,
        price: Number(productForm.price || 0),
        stock_quantity: Number(productForm.stock_quantity || 0),
        featured: productForm.featured === "true",
        compatible_models: Array.from(new Set([
          ...(productForm.compatible_models || []),
          ...resolvedVersions.map((version) => String(version.phone_model || "").trim()).filter(Boolean),
        ])),
        versions: supportsDeviceVersions ? resolvedVersions : [],
      };

      const res = await fetch("/api/store-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleanPayload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save product");

      setStatusMessage("تم حفظ المنتج بنجاح في قاعدة البيانات.");
      setImageFile(null);
      setGalleryFiles([]);
      setProductForm(initialProductForm);
      setActiveTab("products");
      loadDashboardData(true);
    } catch (err) {
      setStatusMessage(err.message);
    }
  };

  // Pre-fill Product Form for Edit
  const editProduct = async (product) => {
    setStatusMessage("Loading product versions...");
    let detailedProduct = product;
    try {
      const response = await fetch(`/api/store-product?id=${encodeURIComponent(product.id)}`);
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.product) detailedProduct = data.product;
    } catch {}

    setProductForm({
      id: detailedProduct.id || "",
      name: detailedProduct.name || "",
      category: detailedProduct.category || "",
      brand: detailedProduct.brand || "",
      product_family: detailedProduct.product_family || "",
      product_type: detailedProduct.product_type || "simple",
      sku: detailedProduct.sku || "",
      price: detailedProduct.price || "",
      stock_quantity: detailedProduct.stock_quantity || "0",
      badge: detailedProduct.badge || "",
      compatible_models: Array.isArray(detailedProduct.compatible_models) ? detailedProduct.compatible_models : [],
      versions: Array.isArray(detailedProduct.versions) ? detailedProduct.versions : [],
      colors: Array.isArray(detailedProduct.colors) ? detailedProduct.colors : [],
      tags: Array.isArray(detailedProduct.tags) ? detailedProduct.tags.join(", ") : "",
      description: detailedProduct.description || "",
      featured: detailedProduct.featured ? "true" : "false",
      status: detailedProduct.status || "public",
      image: detailedProduct.image || "",
      images: Array.isArray(detailedProduct.images) ? detailedProduct.images : [],
    });
    setImageFile(null);
    setGalleryFiles([]);
    setStatusMessage("");
    setActiveTab("product_editor");
  };

  const handleDeleteProduct = async (id) => {
    if (!confirm("هل أنت متأكد من رغبتك في حذف هذا المنتج نهائياً؟")) {
      return;
    }
    setStatusMessage("جارٍ حذف المنتج...");
    try {
      const res = await fetch(`/api/store-product?id=${encodeURIComponent(id)}`, {
        method: "DELETE"
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to delete product");
      
      setStatusMessage("تم حذف المنتج بنجاح.");
      // Unselect it if it was selected
      setSelectedProductIds(prev => prev.filter(x => x !== id));
      loadDashboardData(true);
    } catch (err) {
      setStatusMessage(err.message);
    }
  };

  const handleToggleSelectProduct = (id) => {
    setSelectedProductIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAllProducts = (visibleProducts) => {
    const visibleIds = visibleProducts.map(p => p.id);
    const allSelected = visibleIds.every(id => selectedProductIds.includes(id));
    if (allSelected) {
      setSelectedProductIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedProductIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleBulkDeleteProducts = async () => {
    if (selectedProductIds.length === 0) return;
    const msg = `هل أنت متأكد من رغبتك في حذف ${selectedProductIds.length} منتج نهائياً؟`;
    if (!confirm(msg)) return;

    setStatusMessage("جارٍ حذف المنتجات المحددة...");
    try {
      const res = await fetch(`/api/store-product?id=${encodeURIComponent(selectedProductIds.join(","))}`, {
        method: "DELETE"
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to delete products");

      setStatusMessage("تم حذف المنتجات بنجاح.");
      setSelectedProductIds([]);
      loadDashboardData(true);
    } catch (err) {
      setStatusMessage(err.message);
    }
  };

  // Calculate Metrics
  const ordersList = events.orders || [];
  const isFamilyRepresentativeOrder = (order) => {
    const notes = String(order.notes || "");
    return order.delivery_method === "family_representative" ||
      notes.includes("مندوب العيلة") ||
      (order.items || []).some((item) => item.source === "family_representative" || item.family_member || item.service_type);
  };
  const familyRepresentativeOrders = ordersList.filter(isFamilyRepresentativeOrder);
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayOrders = ordersList.filter((o) => String(o.created_at || "").slice(0, 10) === todayKey);
  const salesToday = todayOrders.reduce((sum, o) => sum + Number(o.grand_total || o.total || 0), 0);
  const pendingOrders = ordersList.filter((o) => ["new", "pending_payment", "confirmed", "preparing"].includes(o.status)).length;
  const newCustomersToday = usersList.filter((u) => String(u.created_at || "").slice(0, 10) === todayKey).length;

  const productCounts = {};
  ordersList.forEach((o) => (o.items || []).forEach((item) => {
    const pName = item.name || item.id;
    productCounts[pName] = (productCounts[pName] || 0) + Number(item.quantity || 1);
  }));
  const topProduct = Object.entries(productCounts).sort((a, b) => b[1] - a[1])[0];

  // Filtering
  const filteredChats = memoChats.filter((chat) => {
    const q = chatSearchQuery.toLowerCase();
    const titleMatch = String(chat.title || "").toLowerCase().includes(q);
    const summaryMatch = String(chat.summary || "").toLowerCase().includes(q);
    const emailMatch = String(chat.user?.email || "").toLowerCase().includes(q);
    return titleMatch || summaryMatch || emailMatch;
  });

  const filteredUsers = usersList.filter((user) => {
    const q = userSearchQuery.toLowerCase();
    const emailMatch = String(user.email || "").toLowerCase().includes(q);
    const nameMatch = String(user.full_name || "").toLowerCase().includes(q);
    const phoneMatch = String(user.phone || "").toLowerCase().includes(q);
    return emailMatch || nameMatch || phoneMatch;
  });

  const filteredProducts = products
    .filter(p => !productFilterSection || p.category === productFilterSection)
    .filter(p => !productSearch || p.name?.toLowerCase().includes(productSearch.toLowerCase()) || p.sku?.toLowerCase().includes(productSearch.toLowerCase()) || p.brand?.toLowerCase().includes(productSearch.toLowerCase()) || p.product_family?.toLowerCase().includes(productSearch.toLowerCase()));

  const sortedProducts = [...filteredProducts].sort((a, b) => {
     if(productSort === "price_asc") return a.price - b.price;
     if(productSort === "price_desc") return b.price - a.price;
     if(productSort === "stock_asc") return a.stock_quantity - b.stock_quantity;
     return new Date(b.created_at) - new Date(a.created_at);
  });

  const ITEMS_PER_PAGE = 30;
  const totalProductPages = Math.ceil(sortedProducts.length / ITEMS_PER_PAGE) || 1;
  const paginatedProducts = sortedProducts.slice((productPage - 1) * ITEMS_PER_PAGE, productPage * ITEMS_PER_PAGE);

  const renderPagination = (currentPage, totalPages, onPageChange) => {
    if (totalPages <= 1) return null;
    return (
      <div className="pagination-controls" style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", margin: "16px 0", direction: "ltr" }}>
        <button 
          type="button" 
          disabled={currentPage === 1} 
          onClick={() => { onPageChange(currentPage - 1); }}
          style={{ padding: "6px 12px", border: "1px solid var(--line)", background: "var(--panel)", borderRadius: "8px", color: "var(--text)", cursor: currentPage === 1 ? "not-allowed" : "pointer", opacity: currentPage === 1 ? 0.5 : 1 }}
        >
          &lt;
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
          <button
            key={pg}
            type="button"
            onClick={() => { onPageChange(pg); }}
            style={{ 
              padding: "6px 12px", 
              border: "1px solid " + (pg === currentPage ? "#0052ff" : "var(--line)"), 
              background: pg === currentPage ? "#0052ff" : "var(--panel)", 
              color: pg === currentPage ? "#fff" : "var(--text)", 
              borderRadius: "8px", 
              fontWeight: pg === currentPage ? "bold" : "normal",
              cursor: "pointer" 
            }}
          >
            {pg}
          </button>
        ))}
        <button 
          type="button" 
          disabled={currentPage === totalPages} 
          onClick={() => { onPageChange(currentPage + 1); }}
          style={{ padding: "6px 12px", border: "1px solid var(--line)", background: "var(--panel)", borderRadius: "8px", color: "var(--text)", cursor: currentPage === totalPages ? "not-allowed" : "pointer", opacity: currentPage === totalPages ? 0.5 : 1 }}
        >
          &gt;
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="admin-loading-screen">
        <div className="admin-loader"></div>
        <p>جارٍ تحميل لوحة تحكم الإدارة...</p>
        <style jsx>{`
          .admin-loading-screen {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            background: #fff;
            color: #000;
            font-family: system-ui, sans-serif;
          }
          .admin-loader {
            width: 40px;
            height: 40px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid #0052ff;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin-bottom: 16px;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="admin-layout" dir="rtl">
      
      {/* 1. Header component */}
      <header className="admin-header">
        <div className="header-left">
          <Link href="/">
            <img src="/assets/brand/cover-up-symbol.png" alt="Cover Up Logo" className="admin-logo" />
          </Link>
          <span className="admin-subtitle">لوحة تحكم الإدارة</span>
        </div>
        
        <div className="header-right">
          <button 
            type="button" 
            className="profile-btn" 
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            aria-label="Profile Menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </button>
          
          {profileDropdownOpen && (
            <div className="profile-dropdown">
              <div className="dropdown-info">
                <strong>مشرف النظام</strong>
                <small>admin@coverup.tech</small>
              </div>
              <button type="button" className="signout-btn" onClick={handleSignOut}>
                تسجيل الخروج
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="admin-body">
        
        {/* 2. Sidebar component */}
        <aside className="admin-sidebar">
          <nav className="sidebar-nav">
            <button 
              type="button" 
              className={`nav-item ${activeTab === "overview" ? "active" : ""}`}
              onClick={() => { setActiveTab("overview"); setSelectedChat(null); }}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14H5v-2h5v2zm0-4H5v-2h5v2zm0-4H5V7h5v2zm9 8h-7v-2h7v2zm0-4h-7v-2h7v2zm0-4h-7V7h7v2z"/>
              </svg>
              <span>نظرة عامة</span>
            </button>
            
            <button 
              type="button" 
              className={`nav-item ${activeTab === "users" ? "active" : ""}`}
              onClick={() => { setActiveTab("users"); setSelectedChat(null); }}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
              </svg>
              <span>المستخدمين</span>
            </button>

            <button 
              type="button" 
              className={`nav-item ${activeTab === "products" ? "active" : ""}`}
              onClick={() => { setActiveTab("products"); setSelectedChat(null); }}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-5 14H4v-4h11v4zm0-5H4V9h11v4zm5 5h-4V9h4v9z"/>
              </svg>
              <span>المنتجات</span>
            </button>

            <button
              type="button"
              className={`nav-item ${activeTab === "categories" ? "active" : ""}`}
              onClick={() => { setActiveTab("categories"); setSelectedChat(null); }}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
                <path d="M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z"/>
              </svg>
              <span>الأقسام</span>
            </button>

            <button 
              type="button" 
              className={`nav-item ${activeTab === "orders" ? "active" : ""}`}
              onClick={() => { setActiveTab("orders"); setSelectedChat(null); }}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.9 2 1.99 2 2-.9 2-2-.9-2-2-2z"/>
              </svg>
              <span>الطلبات</span>
            </button>

            <button 
              type="button" 
              className={`nav-item ${activeTab === "family_orders" ? "active" : ""}`}
              onClick={() => { setActiveTab("family_orders"); setSelectedChat(null); }}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zM8 11c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm8 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zM8 13c-2.67 0-8 1.34-8 4v2h7v-2.5c0-1.25.56-2.37 1.54-3.3C8.36 13.08 8.17 13 8 13z"/>
              </svg>
              <span>مندوب العيلة</span>
            </button>

            <button 
              type="button" 
              className={`nav-item ${activeTab === "memo_chats" ? "active" : ""}`}
              onClick={() => { setActiveTab("memo_chats"); setSelectedChat(null); }}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/>
              </svg>
              <span>محادثات Memo</span>
            </button>

            <button 
              type="button" 
              className={`nav-item ${activeTab === "analytics" ? "active" : ""}`}
              onClick={() => { setActiveTab("analytics"); setSelectedChat(null); }}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
              </svg>
              <span>التحليلات</span>
            </button>
          </nav>
          
          <div className="sidebar-footer">
            <button type="button" className="refresh-btn" onClick={() => loadDashboardData(true)} disabled={refreshing}>
              {refreshing ? "جارٍ التحديث..." : "تحديث البيانات"}
            </button>
          </div>
        </aside>

        {/* 3. Main Dashboard Panel */}
        <main className="admin-main">
          
          {statusMessage && (
            <div className="status-banner">
              <span>{statusMessage}</span>
              <button type="button" onClick={() => setStatusMessage("")}>×</button>
            </div>
          )}

          {/* ======================================================================= */}
          {/* TAB: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="tab-pane">
              <div className="pane-header">
                <h2>نظرة عامة على النشاط</h2>
                <p>متابعة المبيعات اليومية وحالة المخزون والعملاء الجدد.</p>
              </div>

              {/* Metrics grid */}
              <div className="metrics-grid">
                <div className="metric-card">
                  <span className="metric-label">مبيعات اليوم</span>
                  <strong className="metric-value">{salesToday.toLocaleString("ar-EG")} EGP</strong>
                </div>
                <div className="metric-card">
                  <span className="metric-label">الطلبات المعلقة</span>
                  <strong className="metric-value">{pendingOrders} طلب</strong>
                </div>
                <div className="metric-card">
                  <span className="metric-label">عملاء جدد اليوم</span>
                  <strong className="metric-value">{newCustomersToday} عميل</strong>
                </div>
                <div className="metric-card">
                  <span className="metric-label">المنتج الأكثر مبيعاً</span>
                  <strong className="metric-value-title" title={topProduct ? topProduct[0] : "لا يوجد"}>
                    {topProduct ? `${topProduct[0]} (${topProduct[1]} قطعة)` : "—"}
                  </strong>
                </div>
              </div>

              {/* Recent lists */}
              <div className="overview-row">
                <div className="card-panel">
                  <h3>الطلبات الأخيرة</h3>
                  <div className="panel-list">
                    {ordersList.slice(0, 5).map((order) => (
                      <div key={order.id} className="list-item-flex">
                        <div>
                          <strong>طلب #{order.id.startsWith("CU") ? order.id : order.id.slice(0, 8)}</strong>
                          <small>{order.customer?.name || "بدون اسم"} | {order.payment_method === "cash" ? "كاش" : "فيزا/محفظة"}</small>
                        </div>
                        <span className="item-price">{order.grand_total || order.total} EGP</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card-panel">
                  <h3>أحدث الشكاوى</h3>
                  <div className="panel-list">
                    {(events.complaints || []).slice(0, 5).map((comp) => (
                      <div key={comp.id} className="list-item-block">
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <strong>{comp.name} | {comp.phone}</strong>
                          <span style={{ fontSize: "11px", color: "#0052ff" }}>طلب #{comp.order_ref || "غير محدد"}</span>
                        </div>
                        <p className="complaint-msg">{comp.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================================= */}
          {/* TAB: USERS */}
          {activeTab === "users" && (
            <div className="tab-pane">
              <div className="pane-header">
                <h2>إدارة المستخدمين والأدوار</h2>
                <p>البحث في قائمة الحسابات وتعيين رتبة المدير.</p>
              </div>

              <div className="filter-bar">
                <input 
                  type="text" 
                  value={userSearchQuery} 
                  onChange={(e) => setUserSearchQuery(e.target.value)} 
                  placeholder="ابحث باسم المستخدم، البريد، أو رقم الهاتف..."
                  className="search-input"
                />
              </div>

              <div className="table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>الاسم</th>
                      <th>البريد الإلكتروني</th>
                      <th>رقم الهاتف</th>
                      <th>الدور / الرتبة</th>
                      <th>تاريخ التسجيل</th>
                      <th>الإجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: "center" }}>لا يوجد مستخدمين مطابقين للبحث.</td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => (
                        <tr key={user.id}>
                          <td><strong>{user.full_name || "—"}</strong></td>
                          <td>{user.email}</td>
                          <td>{user.phone || "—"}</td>
                          <td>
                            <span className={`role-badge ${user.roles === "admin" ? "badge-admin" : "badge-user"}`}>
                              {user.roles === "admin" ? "مدير" : "عميل"}
                            </span>
                          </td>
                          <td>{new Date(user.created_at).toLocaleDateString("ar-EG")}</td>
                          <td>
                            <button 
                              type="button" 
                              className="action-btn-link"
                              onClick={() => handleToggleUserRole(user.id, user.roles)}
                            >
                              {user.roles === "admin" ? "إلغاء صلاحية المدير" : "تعيين كمدير"}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ======================================================================= */}
          {/* TAB: PRODUCTS */}
          {activeTab === "products" && (
            <div className="tab-pane">
              <div className="pane-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h2>إدارة المنتجات والمخزون</h2>
                  <p>إضافة، تعديل، والتحكم في المنتجات وأنواعها.</p>
                </div>
                <button type="button" className="primary-black-btn" onClick={() => {
                  setProductForm(initialProductForm);
                  setImageFile(null);
                  setGalleryFiles([]);
                  setActiveTab("product_editor");
                }}>
                  + إضافة منتج جديد
                </button>
              </div>

              <div className="filter-bar" style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
                <input 
                  type="text" 
                  placeholder="بحث باسم المنتج، الماركة، الـ SKU..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  style={{ flex: 1, padding: "10px 14px", borderRadius: "12px", border: "1px solid var(--line)", background: "var(--panel)", color: "var(--text)" }}
                />
                <select value={productFilterSection} onChange={(e) => setProductFilterSection(e.target.value)} style={{ padding: "10px 14px", borderRadius: "12px", border: "1px solid var(--line)", background: "var(--panel)", color: "var(--text)" }}>
                  <option value="">كل الأقسام</option>
                  {sections.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={productSort} onChange={(e) => setProductSort(e.target.value)} style={{ padding: "10px 14px", borderRadius: "12px", border: "1px solid var(--line)", background: "var(--panel)", color: "var(--text)" }}>
                  <option value="newest">الأحدث</option>
                  <option value="price_asc">السعر (أقل)</option>
                  <option value="price_desc">السعر (أعلى)</option>
                  <option value="stock_asc">المخزون (أقل)</option>
                </select>
              </div>

              {selectedProductIds.length > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255, 77, 77, 0.08)", border: "1px solid rgba(255, 77, 77, 0.2)", padding: "12px 18px", borderRadius: "12px", marginBottom: "16px" }}>
                  <span style={{ fontWeight: "600", color: "#ff4d4d" }}>
                    تم تحديد {selectedProductIds.length} منتج
                  </span>
                  <button 
                    type="button" 
                    onClick={handleBulkDeleteProducts} 
                    style={{ padding: "8px 16px", background: "#ff4d4d", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", fontSize: "0.9rem" }}
                  >
                    حذف المنتجات المحددة
                  </button>
                </div>
              )}

              {renderPagination(productPage, totalProductPages, setProductPage)}

              <div className="card-panel">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th style={{ width: "40px", textAlign: "center" }}>
                        <input 
                          type="checkbox" 
                          checked={filteredProducts.length > 0 && filteredProducts.every(p => selectedProductIds.includes(p.id))} 
                          onChange={() => handleToggleSelectAllProducts(filteredProducts)}
                          style={{ cursor: "pointer", width: "16px", height: "16px" }}
                        />
                      </th>
                      <th>صورة</th>
                      <th>الاسم / القسم</th>
                      <th>الماركة / الموديل</th>
                      <th>الحالة</th>
                      <th>السعر</th>
                      <th>المخزون</th>
                      <th>إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedProducts.map((prod) => (
                      <tr key={prod.id}>
                        <td style={{ textAlign: "center" }}>
                          <input 
                            type="checkbox" 
                            checked={selectedProductIds.includes(prod.id)} 
                            onChange={() => handleToggleSelectProduct(prod.id)}
                            style={{ cursor: "pointer", width: "16px", height: "16px" }}
                          />
                        </td>
                        <td>
                          <img src={prod.image || "/assets/brand/cover-up-symbol.png"} alt="" style={{ width: "40px", height: "40px", objectFit: "contain", borderRadius: "6px", background: "#fff", border: "1px solid var(--line)" }} />
                        </td>
                        <td>
                          <div style={{ fontWeight: "600", fontSize: "0.9rem" }}>{prod.name}</div>
                          <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{prod.category}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: "600", fontSize: "0.88rem" }}>{prod.brand || "—"}</div>
                          <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{prod.product_family || "—"}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--muted)", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={Array.isArray(prod.compatible_models) ? prod.compatible_models.join(", ") : ""}>
                            {Array.isArray(prod.compatible_models) ? prod.compatible_models.join(", ") : "—"}
                          </div>
                        </td>
                        <td>
                          <span style={{ 
                            padding: "4px 8px", 
                            borderRadius: "12px", 
                            fontSize: "0.78rem", 
                            fontWeight: "bold",
                            background: prod.status === "public" ? "rgba(76, 175, 80, 0.1)" : prod.status === "hidden" ? "rgba(255, 152, 0, 0.1)" : "rgba(244, 67, 54, 0.1)",
                            color: prod.status === "public" ? "#4caf50" : prod.status === "hidden" ? "#ff9800" : "#f44336",
                            display: "inline-block"
                          }}>
                            {prod.status === "public" ? "عام" : prod.status === "hidden" ? "مخفي" : "غير متوفر"}
                          </span>
                        </td>
                        <td>{prod.price} EGP</td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <button type="button" onClick={() => {
                               const newQ = Math.max(0, (prod.stock_quantity || 0) - 1);
                               setProducts(products.map(p => p.id === prod.id ? {...p, stock_quantity: newQ} : p));
                               fetch("/api/store-product", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({...prod, stock_quantity: newQ}) });
                            }} style={{ width: "24px", height: "24px", display: "grid", placeItems: "center", cursor: "pointer", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--panel)", color: "var(--text)" }}>-</button>
                            <span style={{ minWidth: "20px", textAlign: "center" }}>{prod.stock_quantity || 0}</span>
                            <button type="button" onClick={() => {
                               const newQ = (prod.stock_quantity || 0) + 1;
                               setProducts(products.map(p => p.id === prod.id ? {...p, stock_quantity: newQ} : p));
                               fetch("/api/store-product", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({...prod, stock_quantity: newQ}) });
                            }} style={{ width: "24px", height: "24px", display: "grid", placeItems: "center", cursor: "pointer", borderRadius: "6px", border: "1px solid var(--line)", background: "var(--panel)", color: "var(--text)" }}>+</button>
                          </div>
                        </td>
                        <td>
                          <button type="button" className="action-btn-link" onClick={() => editProduct(prod)}>تعديل</button>
                          <button type="button" className="action-btn-link" onClick={() => handleDeleteProduct(prod.id)} style={{ color: "#ff4d4d", marginRight: "8px" }}>حذف</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {renderPagination(productPage, totalProductPages, setProductPage)}

            </div>
          )}

          {activeTab === "categories" && (
            <CategoriesTab
              categories={categories}
              onSaved={loadCategories}
              setStatusMessage={setStatusMessage}
            />
          )}

          {activeTab === "product_editor" && (
            <div className="tab-pane">
              <ProductEditor 
                form={productForm} 
                setForm={setProductForm} 
                imageFile={imageFile} 
                setImageFile={setImageFile}
                galleryFiles={galleryFiles}
                setGalleryFiles={setGalleryFiles}
                sections={sections}
                onSubmit={handleProductSubmit}
                onDelete={async (id) => {
                  await handleDeleteProduct(id);
                  setActiveTab("products");
                }}
                onClose={() => setActiveTab("products")}
              />
            </div>
          )}

          {/* ======================================================================= */}
          {/* TAB: ORDERS */}
          {activeTab === "orders" && (
            <AdminOrdersTab
              ordersList={ordersList}
              onUpdateOrder={handleUpdateOrderStatus}
              ORDER_STATUSES={ORDER_STATUSES}
              onRefresh={() => loadDashboardData(true)}
            />
          )}

          {activeTab === "family_orders" && (
            <AdminOrdersTab
              title="طلبات مندوب العيلة"
              description="مراجعة طلبات العيلة بكل أفرادها وموبايلاتهم والخدمات المطلوبة لكل شخص."
              ordersList={familyRepresentativeOrders}
              onUpdateOrder={handleUpdateOrderStatus}
              ORDER_STATUSES={ORDER_STATUSES}
              onRefresh={() => loadDashboardData(true)}
            />
          )}

          {/* ======================================================================= */}
          {/* TAB: MEMO CHATS */}
          {activeTab === "memo_chats" && (
            <div className="tab-pane">
              <div className="pane-header">
                <h2>محادثات Memo AI</h2>
                <p>مراقبة وتحليل المحادثات الدائرة بين العملاء ومساعد الذكاء الاصطناعي ميمو.</p>
              </div>

              <div className="filter-bar">
                <input 
                  type="text" 
                  value={chatSearchQuery} 
                  onChange={(e) => setChatSearchQuery(e.target.value)} 
                  placeholder="البحث بالبريد، الكود، عنوان المحادثة أو الملخص..."
                  className="search-input"
                />
              </div>

              <div className="chats-split-layout">
                {/* Chats Cards List */}
                <div className="chats-cards-sidebar">
                  {filteredChats.length === 0 ? (
                    <p style={{ textAlign: "center", padding: "20px", color: "#666", fontSize: "13px" }}>
                      لا توجد محادثات مطابقة لخيارات البحث.
                    </p>
                  ) : (
                    filteredChats.map((chat) => (
                      <button 
                        key={chat.id}
                        type="button"
                        className={`chat-card-item ${selectedChat?.id === chat.id ? "selected" : ""}`}
                        onClick={() => setSelectedChat(chat)}
                      >
                        <div className="chat-card-header">
                          <strong>{chat.title || "محادثة جديدة"}</strong>
                          <small>{new Date(chat.created_at).toLocaleDateString("ar-EG")}</small>
                        </div>
                        {chat.summary && <p className="chat-card-summary">{chat.summary}</p>}
                        <div className="chat-card-user">
                          <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                          </svg>
                          <span>{chat.user?.email || "unknown@user.com"}</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>

                {/* Read-Only Chat Viewer */}
                <div className="chat-viewer-pane">
                  {selectedChat ? (
                    <div className="viewer-container">
                      <div className="viewer-header">
                        <div className="viewer-user-profile">
                          <div className="viewer-avatar">U</div>
                          <div>
                            <h4>{selectedChat.user?.full_name || "عميل CoverUp"}</h4>
                            <small>{selectedChat.user?.email}</small>
                          </div>
                        </div>
                        
                        <div className="viewer-chat-details">
                          <strong>{selectedChat.title}</strong>
                        </div>
                      </div>

                      {/* Chat Messages Log */}
                      <div className="viewer-messages-body" style={{ backgroundColor: "var(--bg)", padding: "10px 0" }}>
                        <div className={chatStyles.messagesGpt} style={{ height: "auto", overflow: "visible" }}>
                          {Array.isArray(selectedChat.messages) && selectedChat.messages.map((msg, idx) => (
                            <div key={idx} style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%", marginBottom: "16px" }}>
                              <div className={msg.role === 'user' ? chatStyles.msgRowUser : chatStyles.msgRowAi}>
                                <div className={chatStyles.avatarGpt}>
                                  {msg.role === 'user' ? 'U' : (
                                    <img src="/assets/brand/cover-up-symbol.png" alt="Memo" style={{width: '24px', height: '24px', objectFit: 'contain'}} />
                                  )}
                                </div>
                                <div className={chatStyles.msgBubbleGpt} style={{ cursor: "default" }}>
                                  {msg.content}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Read-Only Warning Indicator */}
                      <div className="viewer-footer-readonly">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style={{ color: "#0052ff" }}>
                          <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                        </svg>
                        <span>وضع القراءة فقط للمشرفين — لا يمكنك إرسال رسائل أو تعديل المحادثة.</span>
                      </div>
                    </div>
                  ) : (
                    <div className="viewer-placeholder">
                      <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor" style={{ opacity: 0.15 }}>
                        <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/>
                      </svg>
                      <p>اختر محادثة من القائمة لعرض تفاصيلها وسجل الرسائل المتبادلة.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================================= */}
          {/* TAB: ANALYTICS */}
          {activeTab === "analytics" && (
            <div className="tab-pane">
              <div className="pane-header">
                <h2>التحليلات والإحصائيات العامة</h2>
                <p>ملخص فوري لأداء المبيعات، ومعدلات التسجيل وتوزيع طلبات الفرع والموقع.</p>
              </div>

              <div className="metrics-grid">
                <div className="metric-card">
                  <span className="metric-label">إجمالي الطلبات المستلمة</span>
                  <strong className="metric-value">{ordersList.length} طلب</strong>
                </div>
                <div className="metric-card">
                  <span className="metric-label">طلبات الفرع (POS)</span>
                  <strong className="metric-value">
                    {ordersList.filter(o => o.channel === "pos").length} طلب
                  </strong>
                </div>
                <div className="metric-card">
                  <span className="metric-label">طلبات الموقع الإلكتروني</span>
                  <strong className="metric-value">
                    {ordersList.filter(o => o.channel !== "pos").length} طلب
                  </strong>
                </div>
                <div className="metric-card">
                  <span className="metric-label">معدل البيع النقدي (الكاش)</span>
                  <strong className="metric-value">
                    {ordersList.filter(o => o.payment_method === "cash").length} طلب
                  </strong>
                </div>
              </div>

              <div className="card-panel" style={{ marginTop: "24px" }}>
                <h3>توزيع الطلبات بحسب المدن</h3>
                <div className="table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>المدينة / المحافظة</th>
                        <th>عدد الطلبات</th>
                        <th>النسبة المئوية</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const cities = {};
                        ordersList.forEach(o => {
                          const city = o.customer?.city || "استلام الفرع";
                          cities[city] = (cities[city] || 0) + 1;
                        });
                        const sorted = Object.entries(cities).sort((a,b) => b[1]-a[1]);
                        
                        if (sorted.length === 0) {
                          return <tr><td colSpan="3" style={{ textAlign: "center" }}>لا تتوفر بيانات.</td></tr>;
                        }
                        
                        return sorted.map(([city, count]) => {
                          const percentage = ((count / ordersList.length) * 100).toFixed(1);
                          return (
                            <tr key={city}>
                              <td>{city}</td>
                              <td>{count} طلب</td>
                              <td><strong>{percentage}%</strong></td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      <style jsx global>{`
        /* Minimal White, Blue, and Black color palette styles */
        .admin-layout {
          display: flex;
          flex-direction: column;
          height: 100vh;
          background-color: #ffffff;
          color: #000000;
          font-family: 'Almarai', system-ui, -apple-system, sans-serif;
          overflow: hidden;
        }

        /* 1. Header Styles */
        .admin-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 24px;
          background: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          height: 60px;
          box-sizing: border-box;
          z-index: 10;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .admin-logo {
          height: 36px;
          display: block;
        }

        .admin-subtitle {
          font-size: 13px;
          font-weight: 700;
          color: #64748b;
          border-right: 1px solid #cbd5e1;
          padding-right: 12px;
        }

        .header-right {
          position: relative;
        }

        .profile-btn {
          background: transparent;
          border: none;
          color: #000000;
          cursor: pointer;
          padding: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: background 0.15s ease;
        }

        .profile-btn:hover {
          background: #f1f5f9;
        }

        .profile-dropdown {
          position: absolute;
          left: 0;
          top: 42px;
          width: 220px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          padding: 8px;
          z-index: 100;
          display: flex;
          flex-direction: column;
        }

        .dropdown-info {
          display: flex;
          flex-direction: column;
          padding: 10px 12px;
          border-bottom: 1px solid #f1f5f9;
          margin-bottom: 6px;
        }

        .dropdown-info strong {
          font-size: 14px;
          color: #000000;
        }

        .dropdown-info small {
          font-size: 11px;
          color: #64748b;
        }

        .signout-btn {
          background: #000000;
          color: #ffffff;
          border: none;
          padding: 10px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          text-align: center;
          transition: background 0.15s ease;
        }

        .signout-btn:hover {
          background: #0052ff;
        }

        /* 2. Admin Body & Sidebar */
        .admin-body {
          display: flex;
          flex: 1;
          overflow: hidden;
        }

        .admin-sidebar {
          width: 240px;
          background: #ffffff;
          border-left: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 16px 0;
          box-sizing: border-box;
          flex-shrink: 0;
        }

        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 0 12px;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: transparent;
          border: none;
          color: #475569;
          font-size: 14px;
          font-weight: 600;
          border-radius: 8px;
          cursor: pointer;
          text-align: right;
          width: 100%;
          font-family: inherit;
          transition: all 0.15s ease;
        }

        .nav-item:hover {
          background: #f1f5f9;
          color: #000000;
        }

        .nav-item.active {
          background: #f1f5f9;
          color: #0052ff;
        }

        .sidebar-footer {
          padding: 0 16px;
        }

        .refresh-btn {
          width: 100%;
          padding: 10px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          color: #000000;
          font-size: 13px;
          font-weight: 700;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .refresh-btn:hover {
          background: #000000;
          color: #ffffff;
          border-color: #000000;
        }

        /* 3. Main Dashboard View */
        .admin-main {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
          box-sizing: border-box;
          background-color: #fafafa;
        }

        .status-banner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 20px;
          background: #0052ff;
          color: #ffffff;
          border-radius: 8px;
          margin-bottom: 24px;
          font-size: 14px;
          font-weight: 600;
        }

        .status-banner button {
          background: transparent;
          border: none;
          color: #ffffff;
          font-size: 18px;
          cursor: pointer;
        }

        .tab-pane {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .pane-header h2 {
          margin: 0 0 4px 0;
          font-size: 20px;
          font-weight: 800;
          color: #000000;
        }

        .pane-header p {
          margin: 0;
          font-size: 13px;
          color: #64748b;
        }

        /* Metrics grid */
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
        }

        .metric-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          padding: 24px;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .metric-label {
          font-size: 12px;
          color: #64748b;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .metric-value {
          font-size: 24px;
          font-weight: 800;
          color: #000000;
        }

        .metric-value-title {
          font-size: 15px;
          font-weight: 700;
          color: #0052ff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-top: 4px;
        }

        .overview-row {
          display: flex;
          gap: 24px;
          flex-wrap: wrap;
        }

        .card-panel {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 20px;
          flex: 1;
          min-width: 300px;
          box-sizing: border-box;
        }

        .card-panel h3 {
          margin: 0 0 16px 0;
          font-size: 16px;
          font-weight: 800;
          color: #000000;
          border-bottom: 1px solid #f1f5f9;
          padding-bottom: 10px;
        }

        .panel-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .list-item-flex {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 10px;
          border-bottom: 1px solid #f8fafc;
        }

        .list-item-flex div {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .list-item-flex strong {
          font-size: 13px;
          color: #000000;
        }

        .list-item-flex small {
          font-size: 11px;
          color: #64748b;
        }

        .item-price {
          font-size: 13px;
          font-weight: 700;
          color: #0052ff;
        }

        .list-item-block {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 10px;
          background: #f8fafc;
          border-radius: 8px;
        }

        .list-item-block strong {
          font-size: 13px;
        }

        .complaint-msg {
          margin: 0;
          font-size: 12px;
          color: #334155;
          line-height: 1.4;
        }

        /* Filter Bar & Search */
        .filter-bar {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 12px;
        }

        .search-input {
          width: 100%;
          padding: 10px 14px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          background: #ffffff;
          color: #000000;
          outline: none;
          font-size: 13px;
          font-family: inherit;
          box-sizing: border-box;
        }

        .search-input:focus {
          border-color: #0052ff;
        }

        /* Tables */
        .table-wrapper {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
        }

        .admin-table {
          width: 100%;
          border-collapse: collapse;
          text-align: right;
          font-size: 13px;
        }

        .admin-table th {
          background: #f8fafc;
          color: #64748b;
          font-weight: 700;
          padding: 14px 16px;
          border-bottom: 1px solid #e2e8f0;
        }

        .admin-table td {
          padding: 14px 16px;
          border-bottom: 1px solid #f1f5f9;
          color: #090d16;
        }

        .admin-table tr:last-child td {
          border-bottom: none;
        }

        .role-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
        }

        .badge-admin {
          background: rgba(0, 82, 255, 0.1);
          color: #0052ff;
        }

        .badge-user {
          background: #f1f5f9;
          color: #475569;
        }

        .action-btn-link {
          background: transparent;
          border: none;
          color: #0052ff;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          padding: 0;
          font-family: inherit;
          text-decoration: underline;
        }

        .action-btn-link:hover {
          color: #000000;
        }

        /* Forms (Product / POS) */
        .pos-form, .product-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .pos-form label, .product-form label {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 12px;
          font-weight: 700;
          color: #475569;
        }

        .pos-form input, .pos-form select,
        .product-form input, .product-form select, .product-form textarea {
          padding: 10px 12px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          background: #ffffff;
          color: #000000;
          font-family: inherit;
          outline: none;
          font-size: 13px;
        }

        .pos-form input:focus, .pos-form select:focus,
        .product-form input:focus, .product-form select:focus, .product-form textarea:focus {
          border-color: #0052ff;
        }

        .primary-black-btn {
          background: #000000;
          color: #ffffff;
          border: none;
          padding: 12px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          font-family: inherit;
          transition: background 0.15s ease;
        }

        .primary-black-btn:hover {
          background: #0052ff;
        }

        .cancel-form-btn {
          background: #f1f5f9;
          color: #475569;
          border: none;
          padding: 12px 18px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          font-family: inherit;
        }

        /* Products list in inventory */
        .products-inventory-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 400px;
          overflow-y: auto;
          padding-left: 6px;
        }

        .inventory-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px;
          border-bottom: 1px solid #f1f5f9;
        }

        .inventory-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .inventory-img {
          width: 36px;
          height: 36px;
          object-fit: cover;
          border-radius: 6px;
          background: #ffffff;
          border: 1px solid #cbd5e1;
        }

        .inventory-info div {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .inventory-info strong {
          font-size: 13px;
          color: #000;
        }

        .inventory-info small {
          font-size: 11px;
          color: #64748b;
        }

        .inventory-actions {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .stock-level-label {
          font-size: 12px;
          font-weight: 700;
          color: #000000;
        }

        .stock-level-label.low-stock {
          color: #ff3333;
        }

        .edit-btn-inline {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          color: #000000;
          padding: 6px 12px;
          font-size: 11px;
          font-weight: 700;
          border-radius: 6px;
          cursor: pointer;
          font-family: inherit;
        }

        .edit-btn-inline:hover {
          background: #000;
          color: #fff;
          border-color: #000;
        }

        /* Order items list card */
        .order-item-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px;
        }

        .order-card-main {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }

        .order-card-main div {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .order-details-line {
          font-size: 12px;
          color: #475569;
        }

        .order-card-financial {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 8px;
        }

        .order-card-financial strong {
          font-size: 16px;
          color: #0052ff;
        }

        .status-update-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .status-update-row select {
          padding: 4px;
          font-size: 11px;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          outline: none;
          color: #000;
        }

        .order-status-badge {
          display: inline-block;
          font-size: 10px;
          font-weight: 700;
          padding: 3px 6px;
          border-radius: 4px;
          text-transform: uppercase;
        }

        .status-new { background: rgba(0,82,255,0.08); color: #0052ff; }
        .status-paid, .status-delivered { background: #f0fdf4; color: #16a34a; }
        .status-cancelled { background: #fef2f2; color: #dc2626; }

        /* Chats Split Layout (GPT side-by-side) */
        .chats-split-layout {
          display: flex;
          height: 60vh;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
          background: #ffffff;
        }

        .chats-cards-sidebar {
          width: 320px;
          border-left: 1px solid #e2e8f0;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
        }

        .chat-card-item {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 16px;
          border: none;
          border-bottom: 1px solid #f1f5f9;
          background: transparent;
          cursor: pointer;
          text-align: right;
          width: 100%;
          font-family: inherit;
          transition: background 0.15s ease;
        }

        .chat-card-item:hover {
          background: #f8fafc;
        }

        .chat-card-item.selected {
          background: #f1f5f9;
          border-right: 3px solid #0052ff;
        }

        .chat-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .chat-card-header strong {
          font-size: 13px;
          color: #000;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .chat-card-header small {
          font-size: 10px;
          color: #64748b;
        }

        .chat-card-summary {
          margin: 0;
          font-size: 11px;
          color: #475569;
          display: -webkit-box;
          WebkitLineClamp: 2;
          WebkitBoxOrient: vertical;
          overflow: hidden;
          line-height: 1.3;
        }

        .chat-card-user {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: #64748b;
          margin-top: 4px;
        }

        /* Read only Chat Viewer */
        .chat-viewer-pane {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: #fafafa;
          height: 100%;
        }

        .viewer-container {
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .viewer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 20px;
          background: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          height: 52px;
          box-sizing: border-box;
        }

        .viewer-user-profile {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .viewer-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #0052ff;
          color: #ffffff;
          display: grid;
          place-items: center;
          font-size: 11px;
          font-weight: 700;
        }

        .viewer-user-profile h4 {
          margin: 0;
          font-size: 13px;
        }

        .viewer-user-profile small {
          font-size: 10px;
          color: #64748b;
        }

        .viewer-chat-details strong {
          font-size: 13px;
          color: #000;
        }

        .viewer-messages-body {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .viewer-msg-row {
          display: flex;
          gap: 10px;
          max-width: 80%;
        }

        .msg-user {
          align-self: flex-start;
          flex-direction: row;
        }

        .msg-ai {
          align-self: flex-end;
          flex-direction: row-reverse;
        }

        .viewer-msg-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          font-size: 11px;
          font-weight: 800;
          flex-shrink: 0;
        }

        .msg-user .viewer-msg-avatar {
          background: #f1f5f9;
          color: #000;
          border: 1px solid #cbd5e1;
        }

        .msg-ai .viewer-msg-avatar {
          background: #0052ff;
          color: #ffffff;
        }

        .viewer-msg-bubble {
          padding: 10px 14px;
          border-radius: 12px;
          font-size: 13px;
          line-height: 1.4;
          white-space: pre-wrap;
        }

        .msg-user .viewer-msg-bubble {
          background: #ffffff;
          color: #000000;
          border: 1px solid #cbd5e1;
        }

        .msg-ai .viewer-msg-bubble {
          background: #0052ff;
          color: #ffffff;
        }

        .viewer-footer-readonly {
          background: #ffffff;
          border-top: 1px solid #e2e8f0;
          padding: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 11px;
          font-weight: 700;
          color: #64748b;
        }

        .viewer-placeholder {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #64748b;
          gap: 12px;
          font-size: 13px;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .admin-sidebar {
            width: 70px;
          }
          .nav-item span, .sidebar-footer button {
            display: none;
          }
          .admin-subtitle {
            display: none;
          }
        }
      `}</style>

    </div>
  );
}
