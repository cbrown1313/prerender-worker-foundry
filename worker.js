import puppeteer from "@cloudflare/puppeteer";

// Toggle debug headers on/off (set true for testing, false for production)
const DEBUG_HEADERS = true;

const BOT_UA = [
  // Search engines
  /Googlebot/i,
  /Google-InspectionTool/i,
  /Bingbot/i,
  /MicrosoftPreview/i,

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

  //Additional - prerender
  /googlebot/i,
  /yahoo! slurp/i,
  /bingbot/i,
  /yandex/i,
  /baiduspider/i,
  /facebookexternalhit/i,
  /twitterbot/i,
  /rogerbot/i,
  /linkedinbot/i,
  /embedly/i,
  /quora link preview/i,
  /showyoubot/i,
  /outbrain/i,
  /pinterest/i,
  /developers.google.com/i,
  /slackbot/i,
  /vkshare/i,
  /w3c_validator/i,
  /redditbot/i,
  /applebot/i,
  /whatsapp/i,
  /flipboard/i,
  /tumblr/i,
  /bitlybot/i,
  /skypeuripreview/i,
  /nuzzel/i,
  /discordbot/i,
  /google page speed/i,
  /qwantify/i,
  /pinterestbot/i,
  /bitrix link preview/i,
  /xing-contenttabreceiver/i,
  /chrome-lighthouse/i,
  /telegrambot/i,
  /integration-test/i, // Integration testing
  /google-inspectiontool/i,
  /googlemessages/i,

  //DJ List
  /facebookexternalhit/i,
/twitterbot/i,
/linkedinbot/i,
/googlebot/i,
/googlebot-image/i,
/googlebot-video/i,
/googlebot-news/i,
/google-inspectiontool/i,
/adsbot-google/i,
/mediapartners-google/i,
/storebot-google/i,
/bingbot/i,
/bingpreview/i,
/adidxbot/i,
/msnbot/i,
/applebot/i,
/duckduckbot/i,
/duckduckgo-favicons-bot/i,
/slurp/i,
/baiduspider/i,
/yandexbot/i,
/naverbot/i,
/yeti/i,
/petalbot/i,
/seznambot/i,
/exabot/i,
/sogou/i,
/ahrefsbot/i,
/semrushbot/i,
/mj12bot/i,
/dotbot/i,
/seobilitybot/i,
/siteauditbot/i,
/screamingfrog/i,
/screaming frog/i,
/ubersuggestbot/i,
/neilpatelbot/i,
/npbot/i,
/rogerbot/i,
/blexbot/i,
/sistrix/i,
/linkdexbot/i,
/onpagebot/i,
/datajellybot/i,
/datajellybotest/i,
/datajellytestbot/i,
/gptbot/i,
/chatgpt/i,
/chatgpt-user/i,
/oai-searchbot; openai-searchbot/i,
/openai/i,
/aiclient/i,
/claudebot/i,
/claude-web; claude-web/i,
/anthropic-ai/i,
/perplexitybot; pplxbot/i,
/perplexity-user/i,
/cohere-ai/i,
/ccbot/i,
/ai2bot/i,
/diffbot/i,
/duckassistbot/i,
/youbot/i,
/phindbot/i,
/kagi-ai/i,
/timpibot/i,
/mistralai-user/i,
/google-extended/i,
/googleother/i,
/googleagent-mariner/i,
/gemini/i,
/google-ai/i,
/gemini-deep-research/i,
/meta-externalagent/i,
/applebot-extended/i,
/amazonbot/i,
/bytespider/i,
/Unclassified/i,
/NotABot/i,
/Unknown/i,
/HeadlessChrome/i,
/node-fetch/i,
/Mozilla/i,
/Privacy/i,
/Let's Encrypt validation server/i,
/DigiCert DCV Bot/i,
/CensysInspect/i,
/UptimeRobot/i,
/Sansec Security Monitor/i,
/CMS-Checker/i,
/socketburst/i,
/Python/i,
/CCBot/i,
/FeedBurner/i,
/Pinterestbot/i,
/Discordbot/i,
/archive.org_bot; archive.org_bot; Wayback Machine Live Record/i,
/OhDear.app/i,
/NetcraftSurveyAgent/i,
/AliyunSecBot/i,
/ZoominfoBot/i,
/DataForSeoBot/i,
/SERankingBacklinksBot/i,
/Barkrowler/i,
/AwarioBot/i,
/AwarioSmartBot/i,
/Embedly/i,
/HubSpot Crawler/i,
/Pro Sitemaps Generator; pro-sitemaps.com/i,
/XML Sitemaps Generator; www.xml-sitemaps.com/i,
/ips-agent/i,
/CT-Monitor/i,
/RecordedFuture/i,
/Cloudinary/i,
/Wget/i,
/undici/i,
/PhantomJS/i,
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
