import type { Metadata } from "next";
import { Inter, Caveat } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
});

const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-handwriting",
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://stickercanvas.art"),
  title: {
    default: "StickerCanvas — Free AI Background Remover & Vinyl Sticker Studio",
    template: "%s | StickerCanvas",
  },
  description:
    "Free on-device AI background remover, die-cut vinyl sticker generator, and 300 DPI production print sheet layout engine. 100% private, runs entirely in your browser.",
  keywords: [
    "background remover",
    "remove background free",
    "free background removal online",
    "ai background remover",
    "remove image background without upload",
    "vinyl sticker maker",
    "die cut sticker generator",
    "300 dpi print sheets",
    "cricut sticker maker",
    "silhouette cutting files",
    "transparent png maker",
    "cutout sticker maker",
    "photo cutout online",
  ],
  authors: [{ name: "StickerCanvas Studio" }],
  creator: "StickerCanvas",
  publisher: "StickerCanvas",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: "StickerCanvas — Free AI Background Remover & Sticker Studio",
    description:
      "Remove backgrounds instantly with on-device AI, add vinyl die-cut borders, and export 300 DPI production print sheets. Zero server uploads.",
    url: "https://stickercanvas.art",
    siteName: "StickerCanvas",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "StickerCanvas Studio — Free AI Background Remover & Vinyl Sticker Generator",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "StickerCanvas — Free AI Background Remover & Sticker Studio",
    description:
      "Instant on-device background removal, die-cut vinyl borders, and 300 DPI production print sheets for Cricut & Silhouette. 100% private.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

const jsonLdSchema = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "StickerCanvas",
  url: "https://stickercanvas.art",
  description:
    "Free on-device AI background remover, die-cut vinyl sticker generator, and 300 DPI production print sheet layout engine.",
  applicationCategory: "DesignApplication",
  operatingSystem: "All (Browser-based)",
  browserRequirements: "Requires WebAssembly and WebGPU/WebGL support",
  offers: [
    {
      "@type": "Offer",
      name: "Free On-Device Background Removal & Studio Editor",
      price: "0",
      priceCurrency: "USD",
    },
    {
      "@type": "Offer",
      name: "300 DPI Production Print Sheet Unlock",
      price: "1.99",
      priceCurrency: "USD",
    },
  ],
  featureList: [
    "Instant on-device AI background removal with zero cloud upload",
    "Die-cut vinyl contour border generator with customizable offset and shadows",
    "300 DPI high-density print sheets for Silhouette and Cricut cutters",
    "Hardware-accelerated 60-120 FPS WebGL scene graph",
    "Mobile touch studio with gesture navigation and camera capture",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSchema) }}
        />
      </head>
      <body className={`${inter.variable} ${caveat.variable} font-sans antialiased text-[#171717] bg-[#F7F6F2]`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
