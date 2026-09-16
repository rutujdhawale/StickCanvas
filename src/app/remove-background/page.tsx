import type { Metadata } from "next";
import { BackgroundRemovalApp } from "@/components/remove-background/BackgroundRemovalApp";

export const metadata: Metadata = {
  title: "Free Background Remover — Remove Image Backgrounds Online | StickerCanvas",
  description:
    "Instantly remove backgrounds from images online for free. On-device AI processing ensures high precision edges and 100% privacy with no uploads or watermarks.",
  keywords: [
    "remove background",
    "background remover",
    "free background removal",
    "transparent png maker",
    "sticker maker cutout",
    "transparent background",
  ],
  openGraph: {
    title: "Free Background Remover — Remove Image Backgrounds Online | StickerCanvas",
    description:
      "Instantly remove backgrounds from images online for free. High precision cutouts, 100% private, no signup required.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Background Remover | StickerCanvas",
    description: "Instantly remove backgrounds from photos with on-device AI. 100% private and free.",
  },
};

export default function RemoveBackgroundPage() {
  return <BackgroundRemovalApp />;
}
