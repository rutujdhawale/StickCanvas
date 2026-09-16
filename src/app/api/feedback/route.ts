import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type = "feedback", message, email, pageUrl, userAgent } = body;

    if (!message || typeof message !== "string" || message.trim().length < 3) {
      return NextResponse.json(
        { error: "Please provide a message with at least 3 characters." },
        { status: 400 }
      );
    }

    const cleanMessage = message.trim();
    const cleanEmail = typeof email === "string" ? email.trim() : "";
    const cleanType = ["bug", "feature", "feedback"].includes(type) ? type : "feedback";
    const timestamp = new Date().toISOString();

    console.log(`[StickerCanvas Feedback] [${cleanType.toUpperCase()}] from ${cleanEmail || "anonymous"}:`, {
      message: cleanMessage,
      pageUrl: pageUrl || "unknown",
      userAgent: userAgent || "unknown",
      timestamp,
    });

    const notifications: Promise<any>[] = [];

    // 1. Dispatch to Discord Webhook (if DISCORD_WEBHOOK_URL is set in environment)
    const discordWebhook = process.env.DISCORD_WEBHOOK_URL;
    if (discordWebhook) {
      const typeIcons: Record<string, string> = {
        bug: "🐛 **BUG REPORT**",
        feature: "💡 **FEATURE REQUEST**",
        feedback: "💬 **USER FEEDBACK**",
      };
      const typeColors: Record<string, number> = {
        bug: 0xff4d4f, // Red
        feature: 0x722ed1, // Purple
        feedback: 0xff5a36, // Brand Tomato
      };

      const embed = {
        title: `${typeIcons[cleanType] || "StickerCanvas Feedback"}`,
        description: cleanMessage,
        color: typeColors[cleanType] || 0xff5a36,
        fields: [
          { name: "Sender", value: cleanEmail || "Anonymous", inline: true },
          { name: "Page", value: pageUrl || "Direct", inline: true },
          { name: "Time", value: new Date().toUTCString(), inline: false },
        ],
        footer: { text: "StickerCanvas Feedback Dispatcher" },
      };

      notifications.push(
        fetch(discordWebhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ embeds: [embed] }),
        }).catch((e) => console.warn("[Feedback] Discord webhook delivery failed:", e))
      );
    }

    // 2. Dispatch to Web3Forms (delivers directly to your email inbox for free)
    const web3formsKey = process.env.WEB3FORMS_ACCESS_KEY;
    if (web3formsKey) {
      notifications.push(
        fetch("https://api.web3forms.com/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            access_key: web3formsKey,
            subject: `[StickerCanvas ${cleanType.toUpperCase()}] from ${cleanEmail || "Visitor"}`,
            from_name: "StickerCanvas Feedback",
            email: cleanEmail || "noreply@stickercanvas.art",
            message: `Type: ${cleanType.toUpperCase()}\nPage: ${pageUrl || "Direct"}\nEmail: ${cleanEmail || "None provided"}\nTime: ${timestamp}\nUser Agent: ${userAgent || "N/A"}\n\nMessage:\n${cleanMessage}`,
          }),
        }).catch((e) => console.warn("[Feedback] Web3Forms delivery failed:", e))
      );
    }

    // 3. Dispatch to Formspree (if FORMSPREE_FORM_ID is set)
    const formspreeId = process.env.FORMSPREE_FORM_ID;
    if (formspreeId) {
      notifications.push(
        fetch(`https://formspree.io/f/${formspreeId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: cleanType,
            email: cleanEmail,
            message: cleanMessage,
            pageUrl,
          }),
        }).catch((e) => console.warn("[Feedback] Formspree delivery failed:", e))
      );
    }

    // Await all notification dispatches without blocking on failures
    if (notifications.length > 0) {
      await Promise.allSettled(notifications);
    }

    return NextResponse.json({
      success: true,
      message: "Thank you! Your feedback has been received.",
    });
  } catch (err: unknown) {
    console.error("[Feedback API Error]", err);
    const msg = err instanceof Error ? err.message : "Failed to record feedback";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
