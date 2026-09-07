/**
 * Cloudflare Pages Worker for charting.snabbb.com.
 * Proxies wallet requests through the current origin so browsers do not need
 * cross-origin access to app.snabbb.com. All other requests use Pages assets.
 */

const WALLET_UPSTREAM_URL = "https://app.snabbb.com/api/wallet";

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

async function proxyWalletRequest(request) {
  if (request.method !== "GET") {
    return json({ ok: false, error: "Method not allowed" }, 405);
  }

  const incomingUrl = new URL(request.url);
  if (!incomingUrl.searchParams.get("email")?.trim()) {
    return json({ ok: false, error: "Email is required" }, 400);
  }

  const upstreamUrl = new URL(WALLET_UPSTREAM_URL);
  incomingUrl.searchParams.forEach((value, key) => upstreamUrl.searchParams.set(key, value));

  const headers = new Headers({ Accept: "application/json" });
  const cookie = request.headers.get("Cookie");
  if (cookie) headers.set("Cookie", cookie);

  try {
    const upstream = await fetch(upstreamUrl.toString(), {
      method: "GET",
      headers,
      redirect: "manual",
    });
    const responseHeaders = new Headers(upstream.headers);
    responseHeaders.set("Cache-Control", "no-store");
    responseHeaders.set("Content-Type", upstream.headers.get("Content-Type") || "application/json");
    responseHeaders.delete("Access-Control-Allow-Origin");
    responseHeaders.delete("Access-Control-Allow-Credentials");
    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Wallet proxy failed", error);
    return json({ ok: false, error: "Unable to load balance" }, 502);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/wallet") return proxyWalletRequest(request);
    return env.ASSETS.fetch(request);
  },
};
