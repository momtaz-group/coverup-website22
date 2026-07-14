"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

const CartContext = createContext();

function productSnapshot(product) {
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    price: Number(product.price || 0),
    image: product.image || "",
    stock_quantity: Number(product.stock_quantity || 0),
    is_in_stock: product.is_in_stock !== false,
    selectedColor: product.selectedColor || null,
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
    const cartKey = color ? `${product.id}::${color.hex}` : product.id;

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

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartCount,
      }}
    >
      {children}
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
