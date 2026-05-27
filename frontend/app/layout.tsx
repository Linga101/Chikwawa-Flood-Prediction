import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/lib/ThemeContext";
import { AuthProvider } from "@/lib/AuthContext";

export const metadata: Metadata = {
  title: "Chikwawa Flood Risk Dashboard",
  description: "Real-time flood risk prediction and monitoring system for Chikwawa District, Malawi.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
