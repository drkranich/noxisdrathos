import { QueryClient } from "@tanstack/react-query";
import { createRouter, Link, useRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

function DefaultErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  if (import.meta.env.DEV) console.error("[router] route error:", error);
  const router = useRouter();
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">interferência</p>
        <h2 className="font-display mt-4 text-2xl">esta seção falhou ao carregar</h2>
        <p className="mt-3 text-sm text-muted-foreground">o restante da plataforma permanece estável.</p>
        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="font-mono text-[11px] uppercase tracking-[0.3em] underline-offset-8 hover:underline"
          >
            tentar novamente
          </button>
          <Link to="/" className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground">
            ir para início
          </Link>
        </div>
      </div>
    </div>
  );
}

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: 2,
        retryDelay: (i) => Math.min(8000, 500 * 2 ** i),
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
      mutations: { retry: 0 },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: DefaultErrorComponent,
  });

  return router;
};
