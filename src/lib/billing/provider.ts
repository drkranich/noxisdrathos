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

// Stripe provider — usa createCheckoutSession server fn diretamente
const stripeProvider: BillingProvider = {
  id: "stripe",
  async createCheckout(input) {
    try {
      if (!input.plan.stripePriceId) {
        return { ok: false, reason: "not_configured", message: "Price ID não configurado para este plano." };
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
      if (!url) return { ok: false, reason: "error", message: "Sessão de checkout não retornou URL." };
      return { ok: true, url: url as string };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Erro ao criar sessão de checkout.";
      return { ok: false, reason: "error", message };
    }
  },
  async openBillingPortal(userId) {
    try {
      const { createPortalSession } = await import("@/utils/payments.functions");
      const { getStripeEnvironment } = await import("@/lib/stripe");
      const url = await createPortalSession({
        data: {
          returnUrl: `${window.location.origin}/app/subscription`,
          environment: getStripeEnvironment(),
        },
      });
      if (!url) return { ok: false, reason: "error", message: "Portal não retornou URL." };
      return { ok: true, url: url as string };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Erro ao abrir portal.";
      return { ok: false, reason: "error", message };
    }
  },
};

export const noopProvider: BillingProvider = {
  id: "noop",
  async createCheckout() {
    return { ok: false, reason: "not_configured", message: "Provedor de pagamento não configurado." };
  },
  async openBillingPortal() {
    return { ok: false, reason: "not_configured", message: "Portal não disponível." };
  },
};

export function getBillingProvider(): BillingProvider {
  // Sempre usa Stripe — STRIPE_SECRET_KEY está configurado
  return stripeProvider;
}
