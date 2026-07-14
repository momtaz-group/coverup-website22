"use client";

import React from "react";
import { useLoading } from "@/context/LoadingContext";
import DigitalBlueLoading from "./DigitalBlueLoading";

export default function GlobalLoader() {
  const { loading } = useLoading();
  
  if (!loading) return null;
  
  return <DigitalBlueLoading />;
}
