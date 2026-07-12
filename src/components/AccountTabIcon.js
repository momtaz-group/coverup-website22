"use client";

export default function AccountTabIcon({ name, className }) {
  const commonProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.9",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
  };

  switch (name) {
    case "name":
      return (
        <svg {...commonProps} className={className}>
          <path d="M20 21v-1.5a4.5 4.5 0 0 0-4.5-4.5h-7A4.5 4.5 0 0 0 4 19.5V21" />
          <circle cx="12" cy="7.5" r="4" />
        </svg>
      );
    case "email":
      return (
        <svg {...commonProps} className={className}>
          <rect x="3" y="5" width="18" height="14" rx="2.5" />
          <path d="m5 7 7 5 7-5" />
        </svg>
      );
    case "password":
      return (
        <svg {...commonProps} className={className}>
          <rect x="4" y="11" width="16" height="10" rx="2.5" />
          <path d="M8 11V8a4 4 0 1 1 8 0v3" />
          <circle cx="12" cy="16" r="1.2" />
        </svg>
      );
    case "location":
      return (
        <svg {...commonProps} className={className}>
          <path d="M12 21s6-4.8 6-10a6 6 0 1 0-12 0c0 5.2 6 10 6 10Z" />
          <circle cx="12" cy="11" r="2.3" />
        </svg>
      );
    case "edit":
      return (
        <svg {...commonProps} className={className}>
          <path d="M12 20h9" />
          <path d="m16.5 3.5 4 4L8 20H4v-4z" />
        </svg>
      );
    case "signout":
      return (
        <svg {...commonProps} className={className}>
          <path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" />
          <path d="M16 17l5-5-5-5" />
          <path d="M21 12H9" />
        </svg>
      );
    case "favorites":
      return (
        <svg {...commonProps} className={className}>
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      );
    default:
      return null;
  }
}
