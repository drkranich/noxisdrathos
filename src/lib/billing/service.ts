// Unified billing service. Wraps the provider abstraction and the local DB
// so the rest of the UI never touches Stripe/PIX directly.
import { supabase } from "@/integrations/supabase/client";
import { getBillingProvider, type CheckoutResult } from "./provider";
import { PLANS, type Plan } from "./plans";

export type Invoice = {
  id: string;
  amount_cents: number;
  currency: string;
  status: "pending" | "paid" | "failed" | "refunded";
  provider: string;
  hosted_invoice_url: string | null;
  pdf_url: string | null;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
};

export type Membership = {
  plan: string;
  status: "inactive" | "trialing" | "active" | "past_due" | "canceled";
  current_period_end: string | null;
  cancel_at: string | null;
};

export const BillingService = {
  plans: PLANS,
  planById: (id: Plan["id"]) => PLANS.find((p) => p.id === id),

  async startCheckout(planId: Plan["id"], opts?: { method?: "card" | "pix" }): Promise<CheckoutResult> {
    const plan = PLANS.find((p) => p.id === planId);
    if (!plan) return { ok: false, reason: "error", message: "Plano inexistente." };
    const { data: { session } } = await supabase.auth.getSession();
    return getBillingProvider().createCheckout({
      plan,
      userId: session?.user?.id,
      email: session?.user?.email,
      method: opts?.method ?? "card",
      successUrl: `${window.location.origin}/app/subscription?status=success`,
      cancelUrl: `${window.location.origin}/pricing?status=cancelled`,
    });
  },

  async openPortal(userId: string): Promise<CheckoutResult> {
    return getBillingProvider().openBillingPortal(userId);
  },

  async getMembership(userId: string): Promise<Membership | null> {
    const { data } = await supabase
      .from("memberships")
      .select("plan,status,current_period_end,cancel_at")
      .eq("user_id", userId)
      .maybeSingle();
    return (data as Membership | null) ?? null;
  },

  async listInvoices(userId: string): Promise<Invoice[]> {
    const { data } = await supabase
      .from("invoices")
      .select("id,amount_cents,currency,status,provider,hosted_invoice_url,pdf_url,period_start,period_end,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(24);
    return (data ?? []) as Invoice[];
  },
};

export function formatMoney(cents: number, currency = "BRL") {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(cents / 100);
}
