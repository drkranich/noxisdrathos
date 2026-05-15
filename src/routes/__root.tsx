import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { AuthProvider } from "@/lib/auth";
import { RouteTransition } from "@/components/RouteTransition";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">Signal lost</p>
        <h1 className="font-display mt-6 text-7xl">404</h1>
        <p className="mt-4 text-sm text-muted-foreground">A página que procura não existe neste plano.</p>
        <Link to="/" className="mt-8 inline-block font-mono text-xs uppercase tracking-[0.3em] text-foreground underline-offset-8 hover:underline">
          ← retornar
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">Interferência detectada</p>
        <h1 className="font-display mt-6 text-3xl">algo se interpôs</h1>
        <p className="mt-4 text-sm text-muted-foreground">Tente novamente em instantes.</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-8 font-mono text-xs uppercase tracking-[0.3em] underline-offset-8 hover:underline"
        >
          recalibrar
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "OBSERVATÓRIO — Inteligência para a nova economia" },
      { name: "description", content: "Um observatório privado sobre economia descentralizada, IA, automação e ativos digitais. Sinais para quem antecipa o futuro." },
      { name: "author", content: "Observatório" },
      { property: "og:title", content: "OBSERVATÓRIO — Inteligência para a nova economia" },
      { property: "og:description", content: "Um observatório privado sobre economia descentralizada, IA, automação e ativos digitais. Sinais para quem antecipa o futuro." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "OBSERVATÓRIO — Inteligência para a nova economia" },
      { name: "twitter:description", content: "Um observatório privado sobre economia descentralizada, IA, automação e ativos digitais. Sinais para quem antecipa o futuro." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/715cd1c4-748b-4b89-a151-bcc064a5d449/id-preview-c5e1d8de--64e3ebc6-0ca6-453f-a426-40b1cdbe5229.lovable.app-1778620239809.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/715cd1c4-748b-4b89-a151-bcc064a5d449/id-preview-c5e1d8de--64e3ebc6-0ca6-453f-a426-40b1cdbe5229.lovable.app-1778620239809.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <head><HeadContent /></head>
      <body className="grain">{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouteTransition>
          <Outlet />
        </RouteTransition>
      </AuthProvider>
    </QueryClientProvider>
  );
}
