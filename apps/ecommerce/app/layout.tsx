import { Geist_Mono, Inter, Playfair_Display } from "next/font/google";

import "@workspace/ui/globals.css";
import { cn } from "@workspace/ui/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
});

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata = {
  description: "Multi-tenant e-commerce storefront — powered by CRM public API",
  title: "E-Commerce Store",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className={cn(
        "antialiased",
        fontMono.variable,
        playfair.variable,
        "font-sans",
        inter.variable
      )}
      lang="tr"
      suppressHydrationWarning
    >
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
