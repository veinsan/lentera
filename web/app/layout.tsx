import type { Metadata, Viewport } from "next";
import { Google_Sans_Code, Google_Sans_Flex } from "next/font/google";
import { LiquidLens } from "@/components/brand/liquid-lens";
import { Providers } from "@/components/providers";
import "./globals.css";

// Google Sans Flex carries display and UI (optical size, width, and roundness axes); Google Sans Code carries IDs.
const sansFlex = Google_Sans_Flex({ variable: "--font-gsf", subsets: ["latin"], axes: ["opsz", "wdth", "ROND"] });
const sansCode = Google_Sans_Code({ variable: "--font-gsc", subsets: ["latin"] });

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://lentera-khaki.vercel.app";
const DESCRIPTION =
  "Lentera mengubah prediksi risiko minggu ke-4 menjadi rencana kontak yang menjawab siapa yang dihubungi lebih dulu, tindakan apa yang diambil, dan berapa mahasiswa berisiko yang terjangkau dengan jam konselor yang ada.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "Lentera: intervensi mahasiswa berisiko di minggu ke-4", template: "%s | Lentera" },
  description: DESCRIPTION,
  openGraph: { type: "website", locale: "id_ID", siteName: "Lentera", description: DESCRIPTION },
  twitter: { card: "summary_large_image", description: DESCRIPTION },
};

export const viewport: Viewport = { themeColor: "#081634", colorScheme: "light" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${sansFlex.variable} ${sansCode.variable} h-full antialiased`}>
      <body>
        <LiquidLens />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
