"use client";

import { useEffect } from "react";
import { unlockIOSMedia } from "@/utils/ios-media";

const INTERACTION_EVENTS = ["pointerdown", "touchstart", "mousedown", "keydown"];

export default function IOSMediaUnlocker() {
  useEffect(() => {
    const handleFirstInteraction = () => {
      unlockIOSMedia();
      INTERACTION_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, handleFirstInteraction);
      });
    };

    INTERACTION_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, handleFirstInteraction, { passive: true, once: true });
    });

    return () => {
      INTERACTION_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, handleFirstInteraction);
      });
    };
  }, []);

  return null;
}
