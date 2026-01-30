import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Kofler ToolBox - Professionelle Holz- und Bau-Rechner",
  description: "Online-Tools für Holz- und Baugewerbe: Sparrenlängen-Rechner, Festmeter-Rechner, Kegelstumpf-Abwicklung und mehr.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="antialiased min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
