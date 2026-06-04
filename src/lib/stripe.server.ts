import Stripe from "stripe";

export type StripeEnv = "sandbox" | "live";

function getSecretKey(env: StripeEnv): string {
  if (env === "sandbox") {
    const key = process.env.STRIPE_SANDBOX_API_KEY || process.env.STRIPE_TEST_SECRET_KEY;
    if (key) return key;
  }
  const liveKey =
    process.env.STRIPE_SECRET_KEY ||
    process.env.STRIPE_LIVE_API_KEY;
  if (!liveKey) throw new Error("Stripe secret key not configured.");
  return liveKey;
}

export function createStripeClient(env: StripeEnv): Stripe {
  return new Stripe(getSecretKey(env), { apiVersion: "2023-10-16" });
}

export async function verifyWebhook(req: Request, env: StripeEnv) {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();
  const secret = process.env.STRIPE_WEBHOOK_SECRET || "";
  if (!signature || !body) throw new Error("Missing signature or body");
  let timestamp: string | undefined;
  const v1Signatures: string[] = [];
  for (const part of signature.split(",")) {
    const [key, value] = part.split("=", 2);
    if (key === "t") timestamp = value;
    if (key === "v1") v1Signatures.push(value);
  }
  if (!timestamp || v1Signatures.length === 0) throw new Error("Invalid signature format");
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (age > 300) throw new Error("Webhook timestamp too old");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signed = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${body}`));
  const expected = Buffer.from(new Uint8Array(signed)).toString("hex");
  if (!v1Signatures.includes(expected)) throw new Error("Invalid webhook signature");
  return JSON.parse(body);
}
