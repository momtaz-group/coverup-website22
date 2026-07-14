"use client";

import React from "react";

export default function DigitalBlueLoading() {
  return (
    <div className="loader-overlay">
      <svg className="loader-spinner" viewBox="0 0 50 50">
        <circle
          cx="25"
          cy="25"
          r="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>

      <style jsx>{`
        .loader-overlay {
          position: fixed;
          inset: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 9999999;
          background: var(--bg, #000);
        }

        .loader-spinner {
          width: 36px;
          height: 36px;
          color: #0052ff;
          animation: rotate 0.9s linear infinite;
        }

        .loader-spinner circle {
          stroke-dasharray: 90, 150;
          stroke-dashoffset: -35;
          animation: dash 1.4s ease-in-out infinite;
        }

        @keyframes rotate {
          100% { transform: rotate(360deg); }
        }

        @keyframes dash {
          0% {
            stroke-dasharray: 1, 200;
            stroke-dashoffset: 0;
          }
          50% {
            stroke-dasharray: 90, 200;
            stroke-dashoffset: -35;
          }
          100% {
            stroke-dasharray: 90, 200;
            stroke-dashoffset: -124;
          }
        }
      `}</style>
    </div>
  );
}
