// Modular payment provider abstraction.
// Today: noop (no live billing wired). Tomorrow: Stripe / PIX implementations
// can be plugged in without changing call sites.

import type { Plan } from "./plans";

export type CheckoutInput = {
  plan: Plan;
  userId?: string;
  email?: string;
  successUrl: string;
  cancelUrl: string;
  method?: "card" | "pix";
};

export type CheckoutResult =
  | { ok: true; url: string }
  | { ok: false; reason: "not_configured" | "unsupported_method" | "error"; message: string };

export type BillingProvider = {
  id: "stripe" | "pix" | "noop";
  createCheckout: (input: CheckoutInput) => Promise<CheckoutResult>;
  openBillingPortal: (userId: string) => Promise<CheckoutResult>;
};

const stripeProvider: BillingProvider = {
  id: "stripe",
  async createCheckout(input) {
    try {
      if (!input.plan.stripePriceId) {
        return { ok: false, reason: "not_configured", message: "Price ID não configurado." };
      }
      const { createCheckoutSession } = await import("@/utils/payments.functions");
      const { getStripeEnvironment } = await import("@/lib/stripe");
      const url = await createCheckoutSession({
        data: {
          priceId: input.plan.stripePriceId,
          returnUrl: input.successUrl,
          environment: getStripeEnvironment(),
        },
      });
      if (!url) return { ok: false, reason: "error", message: "Checkout não retornou URL." };
      return { ok: true, url: url as string };
    } catch (e: unknown) {
      return { ok: false, reason: "error", message: e instanceof Error ? e.message : "Erro no checkout." };
    }
  },
  async openBillingPortal(_userId) {
    try {
      const { createPortalSession } = await import("@/utils/payments.functions");
      const { getStripeEnvironment } = await import("@/lib/stripe");
      const url = await createPortalSession({
        data: { returnUrl: `${window.location.origin}/app/subscription`, environment: getStripeEnvironment() },
      });
      if (!url) return { ok: false, reason: "error", message: "Portal não retornou URL." };
      return { ok: true, url: url as string };
    } catch (e: unknown) {
      return { ok: false, reason: "error", message: e instanceof Error ? e.message : "Erro no portal." };
    }
  },
};

export const noopProvider: BillingProvider = {
  id: "noop",
  async createCheckout() { return { ok: false, reason: "not_configured", message: "Não configurado." }; },
  async openBillingPortal() { return { ok: false, reason: "not_configured", message: "Não disponível." }; },
};

export function getBillingProvider(): BillingProvider {
  return stripeProvider;
}
