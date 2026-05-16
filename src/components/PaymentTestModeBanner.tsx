const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN;

export function PaymentTestModeBanner() {
  if (!clientToken?.startsWith("pk_test_")) return null;

  return (
    <div className="w-full bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 text-center text-xs font-mono uppercase tracking-[0.25em] text-amber-700 dark:text-amber-300">
      pagamentos em modo de teste ·{" "}
      <a
        href="https://docs.lovable.dev/features/payments#test-and-live-environments"
        target="_blank"
        rel="noopener noreferrer"
        className="underline font-medium"
      >
        saiba mais
      </a>
    </div>
  );
}
