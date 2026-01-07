import puppeteer from "@cloudflare/puppeteer";

// Toggle debug headers on/off (set true for testing, false for production)
const DEBUG_HEADERS = true;

const BOT_UA = [
  // Search engines
  /Googlebot/i,
  /Google-InspectionTool/i,
  /Bingbot/i,

  // AI / LLM crawlers
  /GPTBot/i,
  /ChatGPT-User/i,
  /ClaudeBot/i,
  /Google-Extended/i,
  /PerplexityBot/i,
  /Amazonbot/i,
  /meta-externalagent/i,

  // Social previews
  /facebookexternalhit/i,
  /Twitterbot/i,
  /LinkedInBot/i,
  /Slackbot/i,
  /WhatsApp/i,

  // SEO tools
  /AhrefsBot/i,
  /SemrushBot/i,
  /MJ12bot/i,
  /Screaming Frog/i,
  /XML[- ]?Sitemaps/i,
];

const ORIGIN = "https://foundrypracticeadvisors.lovable.app";

// Paths you generally do NOT want to prerender/cache
const SKIP_PATH_PREFIXES = [
  "/api",
  "/~api",
  "/admin",
  "/wp-admin",
  "/wp-json",
];

// If you have known “always dynamic” pages, add them here
const SKIP_PATH_EXACT = new Set([
  "/logout",
  "/login",
]);

function shouldSkip(url) {
  if (SKIP_PATH_EXACT.has(url.pathname)) return true;
  return SKIP_PATH_PREFIXES.some((p) => url.pathname.startsWith(p));
}

function addDebugHeaders(res, headersObj) {
  if (!DEBUG_HEADERS) return res;
  const out = new Response(res.body, res);
  for (const [k, v] of Object.entries(headersObj)) out.headers.set(k, v);
  return out;
}

function targetUrl(url) {
  return `${ORIGIN}${url.pathname}${url.search}`;
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);


    

if (url.pathname.startsWith("/__worker_test")) {
  return new Response("Worker is running ✅", {
    status: 200,
    headers: { "content-type": "text/plain; charset=utf-8" }
  });
}

    

    // Only handle GET/HEAD. Let other methods pass through.
    if (req.method !== "GET" && req.method !== "HEAD") {
      return fetch(targetUrl(url), req);
    }

    // Avoid prerendering non-page assets and internal endpoints
    if (shouldSkip(url)) {
      return fetch(targetUrl(url), req);
    }

    const ua = req.headers.get("user-agent") || "";
    const accept = req.headers.get("accept") || "";
    const likelyHtml =
      accept.includes("text/html") ||
      accept.includes("*/*") ||
      accept === "" ||
      req.method === "HEAD";

    const isBot = BOT_UA.some((re) => re.test(ua)) && likelyHtml;

    // Humans: passthrough
    if (!isBot) {
      const normalRes = await fetch(targetUrl(url), req);
      return addDebugHeaders(normalRes, { "x-worker": "prerender-worker-foundry" });
    }

    // Bots: cache + prerender
    const cache = caches.default;

    // Cache key: URL + forced HTML accept
    const cacheKey = new Request(req.url, { headers: { Accept: "text/html" } });

    let hit = true;
    let res = await cache.match(cacheKey);

    if (!res) {
      hit = false;

      try {
        const browser = await puppeteer.launch(env.BROWSER);
        const page = await browser.newPage();

        // Use the bot UA so you see what the bot sees
        await page.setUserAgent(ua);

        // More reliable than networkidle0 for SPAs that keep connections open
        await page.goto(targetUrl(url), {
          waitUntil: "networkidle2",
          timeout: 30000,
        });

        const html = await page.content();
        await browser.close();

        res = new Response(html, {
          headers: {
            "content-type": "text/html; charset=utf-8",
            // Bot cache TTL (15 min) + allow serving stale while refreshing in background
            "cache-control": "public, max-age=900, stale-while-revalidate=86400",
          },
        });

        // Only cache successful responses
        if (res.ok) ctx.waitUntil(cache.put(cacheKey, res.clone()));
      } catch (err) {
        // Fallback: if rendering fails, send origin HTML (better than a 500)
        const fallbackRes = await fetch(targetUrl(url), req);
        return addDebugHeaders(fallbackRes, {
          "x-worker": "prerender-worker-foundry",
          "x-prerender": "0",
          "x-prerender-error": "1",
        });
      }
    }

    // Add optional debug headers
    return addDebugHeaders(res, {
      "x-worker": "prerender-worker-foundry",
      "x-prerender": "1",
      "x-prerender-cache": hit ? "HIT" : "MISS",
      "x-served-by": hit ? "cache" : "cf-browser-rendering",
    });
  },
};
