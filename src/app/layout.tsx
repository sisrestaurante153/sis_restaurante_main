import type { Metadata } from "next";
import "./globals.css";
import { ThemeRegistry } from "@/theme/theme-registry";

export const metadata: Metadata = {
  title: "SIS Restaurante",
  description: "Sistema web de engenharia de produtos para restaurante."
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  );
}
