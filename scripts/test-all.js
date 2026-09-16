// Comprehensive End-to-End Test Suite for StickerCanvas Features
// Tests Dodo Payments endpoints, Image Proxy security, and Currency Conversion

const BASE_URL = "http://localhost:3000";

async function runTests() {
  console.log("=== Starting Comprehensive StickerCanvas Test Suite ===\n");
  let passed = 0;
  let failed = 0;

  function assert(condition, name, details = "") {
    if (condition) {
      console.log(`✓ PASS: ${name}`);
      passed++;
    } else {
      console.error(`✗ FAIL: ${name} ${details}`);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // Test 1: Dodo Checkout API
  // -------------------------------------------------------------
  console.log("\n--- Testing /api/dodo/checkout ---");
  for (const tier of ["single_sheet", "sheet_pack", "pro_creator"]) {
    try {
      const res = await fetch(`${BASE_URL}/api/dodo/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier,
          customerEmail: "tester@example.com",
          customerName: "Test User",
          sheetMetadata: { paperFormat: "a4", orientation: "portrait", stickerCount: 6 },
        }),
      });
      const data = await res.json();
      assert(res.status === 200, `Checkout for ${tier} returns 200`);
      assert(Boolean(data.checkoutUrl), `Checkout for ${tier} returns checkoutUrl`);
      assert(data.simulated === true, `Checkout for ${tier} is simulated in dev`);
      assert(Boolean(data.paymentId), `Checkout for ${tier} returns paymentId`);
    } catch (err) {
      assert(false, `Checkout for ${tier}`, err.message);
    }
  }

  // Invalid tier test
  try {
    const res = await fetch(`${BASE_URL}/api/dodo/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier: "invalid_super_tier" }),
    });
    assert(res.status === 400, "Checkout with invalid tier returns 400 Bad Request");
  } catch (err) {
    assert(false, "Invalid tier checkout", err.message);
  }

  // -------------------------------------------------------------
  // Test 2: Dodo Restore API
  // -------------------------------------------------------------
  console.log("\n--- Testing /api/dodo/restore ---");
  try {
    const res = await fetch(`${BASE_URL}/api/dodo/restore`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId: "mock_dodo_987654321", tier: "sheet_pack" }),
    });
    const data = await res.json();
    assert(res.status === 200, "Restore returns 200 OK");
    assert(data.hasAccess === true, "Restore returns hasAccess: true for mock payment");
    assert(data.credits === 5, "Restore returns 5 credits for sheet_pack");
    assert(Boolean(data.token), "Restore returns entitlement token");
  } catch (err) {
    assert(false, "Restore test", err.message);
  }

  // Restore without payment ID or email (should be rejected with 400 Bad Request)
  try {
    const res = await fetch(`${BASE_URL}/api/dodo/restore`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    assert(res.status === 400, "Restore with empty payload returns 400 Bad Request");
    assert(Boolean(data.error), "Restore with empty payload returns descriptive error message");
  } catch (err) {
    assert(false, "Restore empty test", err.message);
  }

  // -------------------------------------------------------------
  // Test 3: Dodo Webhook API
  // -------------------------------------------------------------
  console.log("\n--- Testing /api/dodo/webhook ---");
  try {
    const res = await fetch(`${BASE_URL}/api/dodo/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_type: "payment.succeeded",
        data: {
          payment_id: "test_pay_12345",
          status: "succeeded",
          metadata: { tier: "single_sheet" },
          customer: { email: "customer@stickercanvas.art" },
        },
      }),
    });
    const data = await res.json();
    assert(res.status === 200, "Webhook payment.succeeded returns 200");
    assert(data.received === true, "Webhook returns received: true");
  } catch (err) {
    assert(false, "Webhook test", err.message);
  }

  try {
    const res = await fetch(`${BASE_URL}/api/dodo/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_type: "subscription.active",
        data: {
          subscription_id: "sub_12345",
          status: "active",
          customer: { email: "pro@stickercanvas.art" },
        },
      }),
    });
    assert(res.status === 200, "Webhook subscription.active returns 200");
  } catch (err) {
    assert(false, "Webhook subscription test", err.message);
  }

  // Malformed webhook test
  try {
    const res = await fetch(`${BASE_URL}/api/dodo/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not a json string at all {{{",
    });
    assert(res.status === 400, "Malformed webhook JSON returns 400 Bad Request");
  } catch (err) {
    assert(false, "Malformed webhook test", err.message);
  }

  // -------------------------------------------------------------
  // Test 4: Image Proxy Security & SSRF Protection
  // -------------------------------------------------------------
  console.log("\n--- Testing /api/proxy-image SSRF Protection ---");
  const blockedUrls = [
    "http://127.0.0.1:3000",
    "http://localhost:3000",
    "http://169.254.169.254/latest/meta-data/",
    "http://192.168.1.1",
    "http://10.0.0.1",
    "ftp://example.com/image.png",
  ];

  for (const url of blockedUrls) {
    try {
      const res = await fetch(`${BASE_URL}/api/proxy-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      assert(
        res.status === 400 || res.status === 403,
        `SSRF Protection blocks: ${url} (status: ${res.status})`
      );
    } catch (err) {
      assert(false, `SSRF test for ${url}`, err.message);
    }
  }

  // Valid image proxy test
  try {
    const res = await fetch(`${BASE_URL}/api/proxy-image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png" }),
    });
    const data = await res.json();
    assert(res.status === 200, "Valid image proxy returns 200 OK");
    assert(Boolean(data.dataUrl), "Valid image proxy returns dataUrl");
    assert(data.dataUrl.startsWith("data:image/png;base64,"), "dataUrl has correct MIME type");
  } catch (err) {
    assert(false, "Valid image proxy test", err.message);
  }

  // -------------------------------------------------------------
  // Test 5: Standalone Background Removal Route Accessibility
  // -------------------------------------------------------------
  console.log("\n--- Testing Route Accessibility ---");
  try {
    const res = await fetch(`${BASE_URL}/remove-background`);
    assert(res.status === 200, "/remove-background route returns 200 OK");
    const html = await res.text();
    assert(html.includes("StickerCanvas"), "/remove-background contains brand mark");
  } catch (err) {
    assert(false, "/remove-background route test", err.message);
  }

  // -------------------------------------------------------------
  // Test 6: Feedback API
  // -------------------------------------------------------------
  console.log("\n--- Testing /api/feedback ---");
  try {
    const res = await fetch(`${BASE_URL}/api/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: "bug",
        message: "E2E automated test bug report",
        email: "test@example.com",
      }),
    });
    const data = await res.json();
    assert(res.status === 200, "Feedback submission returns 200 OK");
    assert(data.success === true, "Feedback API reports success");
  } catch (err) {
    assert(false, "/api/feedback test", err.message);
  }

  // Empty feedback should fail validation
  try {
    const res = await fetch(`${BASE_URL}/api/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: "bug", message: "" }),
    });
    assert(res.status === 400, "Empty feedback message returns 400 Bad Request");
  } catch (err) {
    assert(false, "Feedback validation test", err.message);
  }

  // -------------------------------------------------------------
  // Test 7: SEO Sitemap & Robots
  // -------------------------------------------------------------
  console.log("\n--- Testing SEO Endpoints ---");
  try {
    const res = await fetch(`${BASE_URL}/sitemap.xml`);
    assert(res.status === 200, "/sitemap.xml returns 200 OK");
    const xml = await res.text();
    assert(xml.includes("<loc>https://stickercanvas.art"), "Sitemap includes base URL");
    assert(xml.includes("/remove-background"), "Sitemap includes /remove-background");
  } catch (err) {
    assert(false, "/sitemap.xml test", err.message);
  }

  try {
    const res = await fetch(`${BASE_URL}/robots.txt`);
    assert(res.status === 200, "/robots.txt returns 200 OK");
    const txt = await res.text();
    assert(txt.includes("User-Agent: *"), "robots.txt includes User-Agent wildcard");
    assert(txt.includes("sitemap.xml"), "robots.txt points to sitemap.xml");
  } catch (err) {
    assert(false, "/robots.txt test", err.message);
  }

  console.log(`\n=== Test Suite Complete: ${passed} Passed, ${failed} Failed ===`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Fatal test failure:", err);
  process.exit(1);
});
