import "./globals.css";
import { LanguageProvider } from "@/context/LanguageContext";
import { CartProvider } from "@/context/CartContext";
import { ThemeProvider } from "@/context/ThemeContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import IOSMediaUnlocker from "@/components/IOSMediaUnlocker";

export const metadata = {
  title: "Cover Up",
  description: "حساب Cover Up: تسجيل دخول، إنشاء حساب، ومتابعة الطلبات والصيانة.",
  icons: {
    icon: "/assets/brand/cover-up-symbol.png",
    shortcut: "/assets/brand/cover-up-symbol.png",
    apple: "/assets/brand/cover-up-symbol.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <title>Cover Up</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="icon" href="/assets/brand/cover-up-symbol.png" type="image/png" />
        <link rel="shortcut icon" href="/assets/brand/cover-up-symbol.png" type="image/png" />
        <link rel="apple-touch-icon" href="/assets/brand/cover-up-symbol.png" />
      </head>
      <body>
        <ThemeProvider>
          <LanguageProvider>
            <CartProvider>
              <IOSMediaUnlocker />
              <Header />
              {children}
              <Footer />
            </CartProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
