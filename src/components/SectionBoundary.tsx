import { Component, type ReactNode } from "react";

type Props = { children: ReactNode; label?: string; fallback?: ReactNode };
type State = { error: Error | null };

export class SectionBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error(`[boundary${this.props.label ? `:${this.props.label}` : ""}]`, error);
    }
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    if (this.props.fallback) return this.props.fallback;
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          interferência localizada
        </p>
        <h2 className="font-display mt-4 text-xl">esta seção não pôde ser exibida</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          o restante da plataforma continua disponível.
        </p>
        <button
          onClick={this.reset}
          className="mt-6 font-mono text-[11px] uppercase tracking-[0.3em] underline-offset-8 hover:underline"
        >
          tentar novamente
        </button>
      </div>
    );
  }
}
