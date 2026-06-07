import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "DevHire AI — Autonomous Recruitment Agent",
  description: "AI-powered technical recruitment platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#13131f",
              color: "#eeeef5",
              border: "1px solid #2a2a40",
              fontFamily: "sans-serif",
              fontSize: "13px",
            },
            success: { iconTheme: { primary: "#26d97f", secondary: "#13131f" } },
            error:   { iconTheme: { primary: "#ff5c5c", secondary: "#13131f" } },
          }}
        />
        {children}
      </body>
    </html>
  );
}