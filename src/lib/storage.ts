/**
 * Persistent Storage for StickerCanvas
 * Uses IndexedDB (with localStorage fallback) so large custom photos and
 * canvas sticker layouts persist seamlessly across page reloads without quota limits.
 */

import { DocumentState, Asset } from "@/types/editor";

const DB_NAME = "stickercanvas_db";
const DB_VERSION = 1;
const STORE_NAME = "project_store";
const PROJECT_KEY = "active_project";
const LOCAL_STORAGE_FALLBACK_KEY = "stickercanvas_backup";

// Open or initialize IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB not available"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export interface StoredArtwork {
  document: DocumentState;
  assets: Asset[];
  savedAt: number;
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Debounced save to prevent writing to disk during rapid mouse drag / resize events.
 */
export function saveArtworkDebounced(
  document: DocumentState,
  assets: Asset[],
  delayMs = 500
): void {
  if (debounceTimer) clearTimeout(debounceTimer);

  debounceTimer = setTimeout(() => {
    saveArtwork(document, assets).catch((err) => {
      console.warn("Auto-save failed, trying localStorage fallback:", err);
    });
  }, delayMs);
}

/**
 * Fast synchronous cache for instant restoration on page reload
 */
export function getFastCachedDocument(): DocumentState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("stickercanvas_fast_doc");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.objects) {
        return parsed as DocumentState;
      }
    }
  } catch {
    // Ignore error
  }
  return null;
}

export function getFastCachedAssets(): Asset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("stickercanvas_fast_assets");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed as Asset[];
      }
    }
  } catch {
    // Ignore error
  }
  return [];
}

/**
 * Immediate save to IndexedDB with localStorage fallback
 */
export async function saveArtwork(
  document: DocumentState,
  assets: Asset[]
): Promise<void> {
  // 1. Immediately write lightweight sync snapshot for instant reload
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("stickercanvas_fast_doc", JSON.stringify(document));
      if (assets.length > 0) {
        localStorage.setItem("stickercanvas_fast_assets", JSON.stringify(assets));
      }
    } catch {
      // Ignore quota error for sync snapshot
    }
  }

  const payload: StoredArtwork = {
    document,
    assets,
    savedAt: Date.now(),
  };

  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(payload, PROJECT_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Fallback to localStorage (stripping overly large assets if quota is exceeded)
    try {
      const json = JSON.stringify(payload);
      localStorage.setItem(LOCAL_STORAGE_FALLBACK_KEY, json);
    } catch {
      // If local storage is full, save document layout only
      try {
        const lightweight = { ...payload, assets: [] };
        localStorage.setItem(LOCAL_STORAGE_FALLBACK_KEY, JSON.stringify(lightweight));
      } catch (e) {
        console.error("Storage completely full", e);
      }
    }
  }
}

/**
 * Load saved artwork from IndexedDB or localStorage
 */
export async function loadArtwork(): Promise<StoredArtwork | null> {
  try {
    const db = await openDB();
    const data = await new Promise<StoredArtwork | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(PROJECT_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
    if (data && data.document) {
      return data;
    }
  } catch {
    // Attempt localStorage fallback
  }

  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const item = localStorage.getItem(LOCAL_STORAGE_FALLBACK_KEY);
      if (item) {
        const parsed = JSON.parse(item);
        if (parsed && parsed.document) {
          return parsed as StoredArtwork;
        }
      }
    } catch {
      // Return null on corrupt data
    }
  }

  return null;
}

/**
 * Clear stored project (Start new artwork)
 */
export async function clearArtwork(): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(PROJECT_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Ignore
  }

  if (typeof window !== "undefined" && window.localStorage) {
    try {
      localStorage.removeItem(LOCAL_STORAGE_FALLBACK_KEY);
      localStorage.removeItem("stickercanvas_fast_doc");
      localStorage.removeItem("stickercanvas_fast_assets");
    } catch {
      // Ignore
    }
  }
}
