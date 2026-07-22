"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

const CartContext = createContext();

function productSnapshot(product) {
  const version = product.selectedVersion || null;
  return {
    id: product.id,
    name: version?.version_name || product.name,
    category: product.category,
    price: Number(version?.price ?? product.price ?? 0),
    image: version?.main_image_url || product.image || "",
    stock_quantity: Number(version?.stock_quantity ?? product.stock_quantity ?? 0),
    is_in_stock: version ? (version.status === "active" && Number(version.stock_quantity || 0) > 0) : product.is_in_stock !== false,
    selectedColor: product.selectedColor || null,
    selectedVersion: version,
    product_version_id: version?.id || product.product_version_id || null,
    phone_model: version?.phone_model || product.phone_model || "",
    sku: version?.sku || product.sku || "",
  };
}

export function CartProvider({ children }) {
  const [cart, setCart] = useState({});

  useEffect(() => {
    try {
      const savedCart = localStorage.getItem("coverup-cart-v2");
      if (savedCart) {
        setCart(JSON.parse(savedCart));
      }
    } catch (e) {
      console.error("Failed to load cart", e);
    }
  }, []);

  const saveCartState = (nextCart) => {
    setCart(nextCart);
    localStorage.setItem("coverup-cart-v2", JSON.stringify(nextCart));
    
    // Maintain legacy compatibility mapping (id -> quantity)
    const legacyCompat = Object.fromEntries(
      Object.entries(nextCart).map(([id, item]) => [id, item.quantity])
    );
    localStorage.setItem("coverup-cart", JSON.stringify(legacyCompat));
  };

  const addToCart = (product) => {
    if (product.is_in_stock === false) {
      return;
    }

    const color = product.selectedColor || null;
    const version = product.selectedVersion || null;
    const cartKey = version?.id
      ? `${product.id}::version::${version.id}${color ? `::${color.hex}` : ""}`
      : color
        ? `${product.id}::${color.hex}`
        : product.id;

    const nextCart = { ...cart };
    const current = nextCart[cartKey] || { quantity: 0, snapshot: productSnapshot(product) };
    current.quantity += 1;
    current.snapshot = productSnapshot(product);
    nextCart[cartKey] = current;
    saveCartState(nextCart);
  };

  const removeFromCart = (productId) => {
    const nextCart = { ...cart };
    delete nextCart[productId];
    saveCartState(nextCart);
  };

  const updateQuantity = (productId, quantity) => {
    const nextCart = { ...cart };
    if (quantity <= 0) {
      delete nextCart[productId];
    } else if (nextCart[productId]) {
      nextCart[productId].quantity = quantity;
    }
    saveCartState(nextCart);
  };

  const clearCart = () => {
    saveCartState({});
  };

  const cartCount = Object.values(cart).reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  const [toastMessage, setToastMessage] = useState("");
  const [showToastObj, setShowToastObj] = useState(false);

  const showToast = (message) => {
    setToastMessage(message);
    setShowToastObj(true);
    setTimeout(() => {
      setShowToastObj(false);
    }, 3000);
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartCount,
        showToast,
      }}
    >
      {children}
      {/* Global Toast Notification */}
      {showToastObj && (
        <div style={{
          position: "fixed",
          bottom: "32px",
          right: "32px",
          background: "#0f172a",
          color: "#fff",
          padding: "16px 24px",
          borderRadius: "12px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          zIndex: 9999,
          fontFamily: "system-ui, -apple-system, sans-serif",
          animation: "slideUp 0.3s ease forwards"
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <span style={{ fontSize: "14px", fontWeight: "bold" }}>{toastMessage}</span>
          <style jsx>{`
            @keyframes slideUp {
              from { opacity: 0; transform: translateY(20px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
        </div>
      )}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
