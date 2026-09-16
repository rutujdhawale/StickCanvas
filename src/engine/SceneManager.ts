import { Assets, Container, Sprite, Texture, FederatedPointerEvent } from "pixi.js";
import { StickerObject, Asset } from "@/types/editor";
import { createBorderedImageCanvas } from "@/lib/sticker-border";

export class SceneManager {
  private container: Container;
  private spriteMap: Map<string, Sprite> = new Map();
  private textureCache: Map<string, Texture> = new Map();
  private rawImageCache: Map<string, HTMLImageElement> = new Map();
  private onSelectCallback: (id: string, shiftKey: boolean) => void;
  private onPointerDownCallback: (id: string, e: FederatedPointerEvent) => void;

  private spriteTextureKeyMap: Map<string, string> = new Map();

  constructor(
    container: Container,
    onSelect: (id: string, shiftKey: boolean) => void,
    onPointerDown: (id: string, e: FederatedPointerEvent) => void
  ) {
    this.container = container;
    this.onSelectCallback = onSelect;
    this.onPointerDownCallback = onPointerDown;
  }

  private async getRawImage(asset: Asset): Promise<HTMLImageElement> {
    if (this.rawImageCache.has(asset.id)) {
      return this.rawImageCache.get(asset.id)!;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => resolve();
      img.src = asset.src;
    });
    this.rawImageCache.set(asset.id, img);
    return img;
  }

  public invalidateAsset(assetId: string): void {
    this.rawImageCache.delete(assetId);
    for (const key of Array.from(this.textureCache.keys())) {
      if (key.startsWith(assetId)) {
        this.textureCache.delete(key);
      }
    }
  }

  public async getTexture(asset: Asset): Promise<Texture> {
    const key = `${asset.id}_c${asset.isCutout ? 1 : 0}`;
    if (this.textureCache.has(key)) {
      return this.textureCache.get(key)!;
    }

    try {
      const texture = await Assets.load(asset.src);
      this.textureCache.set(key, texture);
      return texture;
    } catch {
      const texture = Texture.from(asset.src);
      this.textureCache.set(key, texture);
      return texture;
    }
  }

  public async getStickerTexture(asset: Asset, obj: StickerObject): Promise<Texture> {
    const bw = obj.borderWidth || 0;
    const bc = obj.borderColor || "#ffffff";
    const sh = obj.hasShadow ?? false;
    const isCutout = asset.isCutout ? 1 : 0;

    if (bw <= 0 && !sh) {
      return this.getTexture(asset);
    }

    const cacheKey = `${asset.id}_c${isCutout}_bw${bw}_bc${bc}_sh${sh ? 1 : 0}`;
    if (this.textureCache.has(cacheKey)) {
      return this.textureCache.get(cacheKey)!;
    }

    const rawImg = await this.getRawImage(asset);
    const borderedCanvas = createBorderedImageCanvas(rawImg, bw, bc, sh);
    const texture = Texture.from(borderedCanvas);
    this.textureCache.set(cacheKey, texture);
    return texture;
  }

  public async syncObjects(
    objects: StickerObject[],
    assets: Asset[]
  ): Promise<void> {
    const assetMap = new Map<string, Asset>();
    assets.forEach((a) => assetMap.set(a.id, a));

    const currentIds = new Set(objects.map((o) => o.id));

    // Remove sprites that are no longer in state
    for (const [id, sprite] of this.spriteMap.entries()) {
      if (!currentIds.has(id)) {
        this.container.removeChild(sprite);
        sprite.destroy();
        this.spriteMap.delete(id);
        this.spriteTextureKeyMap.delete(id);
      }
    }

    // Sort objects by zIndex
    const sortedObjects = [...objects].sort((a, b) => a.zIndex - b.zIndex);

    for (let i = 0; i < sortedObjects.length; i++) {
      const obj = sortedObjects[i];
      const asset = assetMap.get(obj.assetId);
      if (!asset) continue;

      const bw = obj.borderWidth || 0;
      const bc = obj.borderColor || "#ffffff";
      const sh = obj.hasShadow ?? false;
      const isCutout = asset.isCutout ? 1 : 0;
      const textureKey = `${asset.id}_c${isCutout}_bw${bw}_bc${bc}_sh${sh ? 1 : 0}`;

      let sprite = this.spriteMap.get(obj.id);

      if (!sprite || this.spriteTextureKeyMap.get(obj.id) !== textureKey) {
        const texture = await this.getStickerTexture(asset, obj);
        if (!sprite) {
          sprite = new Sprite(texture);
          sprite.anchor.set(0.5, 0.5);
          sprite.eventMode = "static";
          sprite.cursor = obj.locked ? "not-allowed" : "move";

          // Click / Drag handlers
          sprite.on("pointerdown", (e: FederatedPointerEvent) => {
            e.stopPropagation();
            const shiftKey = (e.originalEvent as unknown as MouseEvent)?.shiftKey ?? false;
            this.onSelectCallback(obj.id, shiftKey);
            this.onPointerDownCallback(obj.id, e);
          });

          this.container.addChild(sprite);
          this.spriteMap.set(obj.id, sprite);
        } else {
          sprite.texture = texture;
        }
        this.spriteTextureKeyMap.set(obj.id, textureKey);
      }

      // Update transform & visual state
      sprite.position.set(obj.x, obj.y);
      sprite.rotation = (obj.rotation * Math.PI) / 180;
      sprite.alpha = obj.opacity;
      sprite.visible = obj.visible;
      sprite.cursor = obj.locked ? "not-allowed" : "move";

      // Scale to match target width & height
      if (sprite.texture && sprite.texture.width > 0) {
        const origW = asset.originalWidth || sprite.texture.width;
        const origH = asset.originalHeight || sprite.texture.height;
        const sx = (obj.width / origW) * obj.scaleX * (obj.flipX ? -1 : 1);
        const sy = (obj.height / origH) * obj.scaleY * (obj.flipY ? -1 : 1);
        sprite.scale.set(sx, sy);
      }

      // Ensure correct z-index in container
      this.container.setChildIndex(sprite, Math.min(i, this.container.children.length - 1));
    }
  }

  public getSprite(id: string): Sprite | undefined {
    return this.spriteMap.get(id);
  }
}
