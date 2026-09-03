import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    // 1. If Discord/Slack Webhook is configured in environment variables:
    // (You can create a free Discord webhook in 10 seconds to get pinged on your phone!)
    const discordWebhook = process.env.DISCORD_WEBHOOK_URL;
    if (discordWebhook) {
      await fetch(discordWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `🎨 **New StickerCanvas Subscriber!**\nEmail: \`${email}\`\nTime: ${new Date().toUTCString()}`,
        }),
      }).catch((e) => console.warn("Discord webhook notification failed:", e));
    }

    // 2. If Web3Forms Access Key is configured (delivers straight to your Gmail/inbox free):
    const web3formsKey = process.env.WEB3FORMS_ACCESS_KEY;
    if (web3formsKey) {
      await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_key: web3formsKey,
          subject: "🎨 New StickerCanvas Subscriber",
          from_name: "StickerCanvas Notifications",
          email: email,
          message: `Someone joined the StickerCanvas updates list:\n\nEmail: ${email}\nDate: ${new Date().toISOString()}`,
        }),
      }).catch((e) => console.warn("Web3Forms delivery failed:", e));
    }

    // 3. If Formspree is configured:
    const formspreeId = process.env.FORMSPREE_FORM_ID;
    if (formspreeId) {
      await fetch(`https://formspree.io/f/${formspreeId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email,
          source: "StickerCanvas Landing Page",
        }),
      }).catch((e) => console.warn("Formspree delivery failed:", e));
    }

    return NextResponse.json({ success: true, message: "Subscribed successfully" });
  } catch (error) {
    console.error("Subscription error:", error);
    return NextResponse.json({ error: "Failed to process subscription" }, { status: 500 });
  }
}
