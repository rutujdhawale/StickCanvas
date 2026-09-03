import { Asset } from "@/types/editor";

export interface PresetSticker {
  id: string;
  name: string;
  emoji: string;
  category: "cuties" | "stationery" | "food" | "cool" | "nature";
}

export const PRESET_STICKERS: PresetSticker[] = [
  // Cuties
  { id: "sticker_cat", name: "Orange Cat", emoji: "🐱", category: "cuties" },
  { id: "sticker_dog", name: "Puppy", emoji: "🐶", category: "cuties" },
  { id: "sticker_bunny", name: "Bunny", emoji: "🐰", category: "cuties" },
  { id: "sticker_bear", name: "Teddy", emoji: "🧸", category: "cuties" },
  { id: "sticker_frog", name: "Happy Frog", emoji: "🐸", category: "cuties" },
  { id: "sticker_chick", name: "Baby Chick", emoji: "🐥", category: "cuties" },
  { id: "sticker_fox", name: "Little Fox", emoji: "🦊", category: "cuties" },
  { id: "sticker_ghost", name: "Cute Ghost", emoji: "👻", category: "cuties" },

  // Stationery & Desk
  { id: "sticker_sparkle", name: "Sparkle Star", emoji: "⭐", category: "stationery" },
  { id: "sticker_heart", name: "Heart Stamp", emoji: "💖", category: "stationery" },
  { id: "sticker_flower", name: "Cherry Blossom", emoji: "🌸", category: "stationery" },
  { id: "sticker_memo", name: "Sticky Memo", emoji: "📝", category: "stationery" },
  { id: "sticker_tape", name: "Washi Tape", emoji: "🩹", category: "stationery" },
  { id: "sticker_pin", name: "Push Pin", emoji: "📌", category: "stationery" },
  { id: "sticker_scissors", name: "Scissors", emoji: "✂️", category: "stationery" },
  { id: "sticker_palette", name: "Paint Palette", emoji: "🎨", category: "stationery" },

  // Food & Cafe
  { id: "sticker_strawberry", name: "Strawberry", emoji: "🍓", category: "food" },
  { id: "sticker_coffee", name: "Matcha Latte", emoji: "☕", category: "food" },
  { id: "sticker_onigiri", name: "Onigiri", emoji: "🍙", category: "food" },
  { id: "sticker_croissant", name: "Croissant", emoji: "🥐", category: "food" },
  { id: "sticker_donut", name: "Sprinkle Donut", emoji: "🍩", category: "food" },
  { id: "sticker_ramen", name: "Hot Ramen", emoji: "🍜", category: "food" },
  { id: "sticker_boba", name: "Boba Milk Tea", emoji: "🧋", category: "food" },
  { id: "sticker_pizza", name: "Pizza Slice", emoji: "🍕", category: "food" },

  // Cool & Internet
  { id: "sticker_headphones", name: "Studio Cans", emoji: "🎧", category: "cool" },
  { id: "sticker_camera", name: "Film Camera", emoji: "📷", category: "cool" },
  { id: "sticker_gameboy", name: "Arcade Pad", emoji: "🎮", category: "cool" },
  { id: "sticker_sunglasses", name: "Sunnies", emoji: "🕶️", category: "cool" },
  { id: "sticker_fire", name: "Hot Fire", emoji: "🔥", category: "cool" },
  { id: "sticker_alien", name: "Space Alien", emoji: "👽", category: "cool" },
  { id: "sticker_lightning", name: "Bolt", emoji: "⚡", category: "cool" },
  { id: "sticker_rainbow", name: "Rainbow", emoji: "🌈", category: "cool" },

  // Nature
  { id: "sticker_clover", name: "Four Leaf", emoji: "🍀", category: "nature" },
  { id: "sticker_mushroom", name: "Red Shroom", emoji: "🍄", category: "nature" },
  { id: "sticker_sunflower", name: "Sunflower", emoji: "🌻", category: "nature" },
  { id: "sticker_moon", name: "Crescent Moon", emoji: "🌙", category: "nature" },
  { id: "sticker_cloud", name: "Fluffy Cloud", emoji: "☁️", category: "nature" },
  { id: "sticker_planet", name: "Saturn", emoji: "🪐", category: "nature" },
];

// Helper to render an emoji with a subtle physical die-cut sticker look (crisp white contour / shadow)
export function renderEmojiToDataUrl(emoji: string, size = 256): string {
  if (typeof document === "undefined") return "";

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.clearRect(0, 0, size, size);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${Math.floor(size * 0.72)}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;

  // Draw emoji cleanly
  ctx.fillText(emoji, size / 2, size / 2 + size * 0.04);

  return canvas.toDataURL("image/png");
}

let cachedAssets: Asset[] | null = null;

export function getDefaultAssets(): Asset[] {
  if (cachedAssets) return cachedAssets;

  cachedAssets = PRESET_STICKERS.map((s) => {
    const dataUrl = renderEmojiToDataUrl(s.emoji, 256);
    return {
      id: s.id,
      name: s.name,
      src: dataUrl,
      thumbnailSrc: dataUrl,
      originalWidth: 256,
      originalHeight: 256,
      type: "emoji",
    };
  });

  return cachedAssets;
}
