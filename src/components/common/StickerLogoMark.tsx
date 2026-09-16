import React from "react";

interface StickerLogoMarkProps {
  size?: number;
  className?: string;
}

/**
 * StickerLogoMark - The signature 3-layer stacked sticker card mark.
 * Layer 1: Back-left white card with crisp dark ink outline
 * Layer 2: Middle card with crisp dark ink outline
 * Layer 3: Foreground solid tomato-orange (#FF5A36) vinyl card
 */
export const StickerLogoMark: React.FC<StickerLogoMarkProps> = ({
  size = 20,
  className = "",
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`flex-shrink-0 select-none ${className}`}
      aria-label="StickerCanvas logo mark"
    >
      {/* Layer 1: Back Card (White fill, dark border) */}
      <rect
        x="2.5"
        y="2.5"
        width="13"
        height="14"
        rx="3"
        fill="#FFFFFF"
        stroke="#171717"
        strokeWidth="1.8"
      />

      {/* Layer 2: Middle Card (White fill, dark border) */}
      <rect
        x="7"
        y="7"
        width="13"
        height="14"
        rx="3"
        fill="#FFFFFF"
        stroke="#171717"
        strokeWidth="1.8"
      />

      {/* Layer 3: Foreground Solid Orange-Red Card */}
      <rect
        x="11.5"
        y="11.5"
        width="13.5"
        height="14"
        rx="3.2"
        fill="#FF5A36"
      />
    </svg>
  );
};
