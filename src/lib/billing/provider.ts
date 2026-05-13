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

export const noopProvider: BillingProvider = {
  id: "noop",
  async createCheckout() {
    return {
      ok: false,
      reason: "not_configured",
      message:
        "O provedor de pagamento ainda não foi conectado. A entrada está temporariamente em modo silencioso.",
    };
  },
  async openBillingPortal() {
    return {
      ok: false,
      reason: "not_configured",
      message: "Portal de cobrança será disponibilizado quando o provedor for ativado.",
    };
  },
};

// Future: const stripeProvider: BillingProvider = { ... };
// Future: const pixProvider: BillingProvider = { ... };

export function getBillingProvider(): BillingProvider {
  // When STRIPE_SECRET_KEY is set, swap to stripeProvider.
  return noopProvider;
}
