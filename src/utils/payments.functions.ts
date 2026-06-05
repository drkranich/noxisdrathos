import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { type StripeEnv, createStripeClient } from "@/lib/stripe.server";

async function resolveOrCreateCustomer(
  stripe: ReturnType<typeof createStripeClient>,
  options: { email?: string; userId?: string },
): Promise<string> {
  if (options.userId && !/^[a-zA-Z0-9_-]+$/.test(options.userId)) {
    throw new Error("Invalid userId");
  }
  if (options.userId) {
    const found = await stripe.customers.search({
      query: `metadata['userId']:'${options.userId}'`,
      limit: 1,
    });
    if (found.data.length) return found.data[0].id;
  }
  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    if (existing.data.length) {
      const customer = existing.data[0];
      if (options.userId && customer.metadata?.userId !== options.userId) {
        await stripe.customers.update(customer.id, {
          metadata: { ...customer.metadata, userId: options.userId },
        });
      }
      return customer.id;
    }
  }
  const created = await stripe.customers.create({
    ...(options.email && { email: options.email }),
    ...(options.userId && { metadata: { userId: options.userId } }),
  });
  return created.id;
}

export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: {
    priceId: string;
    quantity?: number;
    returnUrl: string;
    environment: StripeEnv;
  }) => {
    if (!/^[a-zA-Z0-9_-]+$/.test(data.priceId)) throw new Error("Invalid priceId");
    if (typeof data.returnUrl !== "string") throw new Error("Invalid returnUrl");
    try {
      const u = new URL(data.returnUrl);
      if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("bad");
    } catch {
      throw new Error("Invalid returnUrl");
    }
    return data;
  })
  .handler(async ({ data, context }) => {
    const stripe = createStripeClient(data.environment);
    const userId = context.userId;
    const customerEmail = (context.claims?.email as string | undefined) ?? undefined;

    const prices = await stripe.prices.list({ lookup_keys: [data.priceId] });
    if (!prices.data.length) throw new Error("Price not found");
    const stripePrice = prices.data[0];
    const isRecurring = stripePrice.type === "recurring";

    // PIX só está disponível em BRL — verificamos a moeda do price
    const isBrl = stripePrice.currency === "brl";

    const customerId = await resolveOrCreateCustomer(stripe, {
      email: customerEmail,
      userId,
    });

    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: stripePrice.id, quantity: data.quantity || 1 }],
      mode: isRecurring ? "subscription" : "payment",

      // Aceita cartão + PIX quando a moeda for BRL.
      // Para planos mensais, Stripe gera um novo código PIX a cada fatura
      // e notifica o assinante por e-mail — padrão no mercado brasileiro.
      payment_method_types: isBrl ? ["card", "pix"] : ["card"],

      // PIX expira em 24h — padrão máximo permitido pelo Banco Central
      ...(isBrl && {
        payment_method_options: {
          pix: { expires_after_seconds: 86400 },
        },
      }),

      success_url: data.returnUrl,
      cancel_url: data.returnUrl.replace("{CHECKOUT_SESSION_ID}", "cancelled"),
      customer: customerId,
      metadata: { userId },
      ...(isRecurring && { subscription_data: { metadata: { userId } } }),
    });

    return session.url;
  });

export const createPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { returnUrl?: string; environment: StripeEnv }) => {
    if (data.returnUrl !== undefined) {
      if (typeof data.returnUrl !== "string") throw new Error("Invalid returnUrl");
      try {
        const u = new URL(data.returnUrl);
        const allowedOrigin = typeof window !== "undefined" ? window.location.origin : "https://cipher-scribe-labs.lovable.app";
        if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("bad protocol");
        const originOk = allowedOrigin ? u.origin === allowedOrigin : true;
        if (!originOk) throw new Error("returnUrl must point to the same origin");
      } catch (e: unknown) {
        if (e instanceof Error && e.message.startsWith("returnUrl")) throw e;
        throw new Error("Invalid returnUrl");
      }
    }
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: sub, error: subError } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .eq("environment", data.environment)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (subError || !sub?.stripe_customer_id) throw new Error("No subscription found");

    const stripe = createStripeClient(data.environment);
    const portal = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      ...(data.returnUrl && { return_url: data.returnUrl }),
    });
    return portal.url;
  });
