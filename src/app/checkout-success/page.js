import React, { Suspense } from "react";
import SuccessContent from "./SuccessContent";

export const metadata = {
  title: "Order Placed Successfully | Cover Up",
};

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: "center", padding: "100px", fontFamily: "var(--font-sans)" }}>Loading...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
