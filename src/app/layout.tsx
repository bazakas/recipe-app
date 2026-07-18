import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "Recipe Book",
  description:
    "Save recipes from any link, scale them up or down, and convert to grams.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read the saved theme from a cookie so the correct theme is rendered on the
  // server — no inline script, no flash, no hydration mismatch. When absent,
  // the CSS prefers-color-scheme media query decides.
  const theme = (await cookies()).get("theme")?.value;
  const dataTheme = theme === "dark" || theme === "light" ? theme : undefined;

  return (
    <html lang="en" className="h-full" data-theme={dataTheme}>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
