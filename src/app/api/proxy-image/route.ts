import { NextRequest, NextResponse } from "next/server";
import dns from "dns/promises";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_SIZE_BYTES = 15 * 1024 * 1024; // 15MB
const TIMEOUT_MS = 8000; // 8 seconds

const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/avif",
]);

/**
 * Checks whether an IP address belongs to private/internal/local networks (anti-SSRF)
 */
function isPrivateIp(ip: string): boolean {
  // IPv4 checks
  if (ip.includes(".")) {
    const parts = ip.split(".").map((p) => parseInt(p, 10));
    if (parts.length !== 4 || parts.some(isNaN)) return true;

    // 127.0.0.0/8 (Loopback)
    if (parts[0] === 127) return true;
    // 10.0.0.0/8 (Private)
    if (parts[0] === 10) return true;
    // 172.16.0.0/12 (Private)
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    // 192.168.0.0/16 (Private)
    if (parts[0] === 192 && parts[1] === 168) return true;
    // 169.254.0.0/16 (Link-local / Cloud Metadata 169.254.169.254)
    if (parts[0] === 169 && parts[1] === 254) return true;
    // 0.0.0.0/8
    if (parts[0] === 0) return true;
  }

  // IPv6 checks
  if (ip.includes(":")) {
    const norm = ip.toLowerCase();
    if (norm === "::1" || norm === "::" || norm.startsWith("fc") || norm.startsWith("fd") || norm.startsWith("fe80")) {
      return true;
    }
  }

  return false;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawUrl = body?.url?.trim();

    if (!rawUrl) {
      return NextResponse.json({ error: "Missing image URL" }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(rawUrl);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format. Please provide a valid web address." },
        { status: 400 }
      );
    }

    // Protocol check
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return NextResponse.json(
        { error: "Unsupported protocol. Only HTTP and HTTPS image URLs are supported." },
        { status: 400 }
      );
    }

    const hostname = parsedUrl.hostname.toLowerCase();

    // Localhost / private hostname checks
    if (
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal")
    ) {
      return NextResponse.json(
        { error: "Access to private or local network addresses is forbidden." },
        { status: 403 }
      );
    }

    // DNS resolution & IP check (Anti-SSRF)
    try {
      const lookupResult = await dns.lookup(hostname);
      if (isPrivateIp(lookupResult.address)) {
        return NextResponse.json(
          { error: "Access to internal or cloud metadata addresses is forbidden." },
          { status: 403 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: "Could not resolve domain name. Check the link and try again." },
        { status: 400 }
      );
    }

    // Fetch image with strict timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(parsedUrl.toString(), {
        signal: controller.signal,
        headers: {
          "User-Agent": "StickerCanvas-ImageFetcher/1.0",
          Accept: "image/png,image/jpeg,image/webp,image/*;q=0.8",
        },
      });
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === "AbortError") {
        return NextResponse.json(
          { error: "Image download timed out (exceeded 8 seconds)." },
          { status: 504 }
        );
      }
      return NextResponse.json(
        { error: "Couldn't reach the image server. The host may be offline or blocking access." },
        { status: 502 }
      );
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: `Image server returned error status (${response.status})` },
        { status: response.status >= 400 && response.status < 500 ? 400 : 502 }
      );
    }

    // Validate MIME type
    const rawContentType = response.headers.get("content-type") || "";
    const cleanContentType = rawContentType.split(";")[0].trim().toLowerCase();

    if (!ALLOWED_MIME_TYPES.has(cleanContentType)) {
      return NextResponse.json(
        {
          error: `URL does not link to a supported image format. (Received: ${cleanContentType || "unknown"})`,
        },
        { status: 400 }
      );
    }

    // Validate Content-Length header if present
    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Image file is too large (maximum 15MB allowed)." },
        { status: 413 }
      );
    }

    // Stream and buffer with hard byte limit protection
    const reader = response.body?.getReader();
    if (!reader) {
      return NextResponse.json({ error: "Empty image response body." }, { status: 400 });
    }

    const chunks: Uint8Array[] = [];
    let receivedBytes = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        receivedBytes += value.length;
        if (receivedBytes > MAX_SIZE_BYTES) {
          reader.cancel();
          return NextResponse.json(
            { error: "Image file exceeds the 15MB size limit." },
            { status: 413 }
          );
        }
        chunks.push(value);
      }
    }

    // Concatenate chunks
    const totalBuffer = new Uint8Array(receivedBytes);
    let offset = 0;
    for (const chunk of chunks) {
      totalBuffer.set(chunk, offset);
      offset += chunk.length;
    }

    const base64Data = Buffer.from(totalBuffer).toString("base64");
    const dataUrl = `data:${cleanContentType};base64,${base64Data}`;

    return NextResponse.json({
      success: true,
      dataUrl,
      contentType: cleanContentType,
      sizeBytes: receivedBytes,
    });
  } catch (err: unknown) {
    console.error("[Proxy Image Error]", err);
    const errMsg = err instanceof Error ? err.message : "Failed to process image";
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
