import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SelfReg AI",
  description: "Web prototype for adolescent self-regulation support and teacher dashboard. Bilingual (RU/EN). BYOK AI provider architecture."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Note: html lang defaults to "ru" (app default). Client components switch UI via ?lang=en.
  // Full dynamic <html lang> would require middleware or root client wrapper — out of scope for this prototype.
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
