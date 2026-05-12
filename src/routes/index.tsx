import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/")({
  component: Index,
});

function useTime() {
  const [t, setT] = useState("");
  useEffect(() => {
    const fmt = () => {
      const d = new Date();
      const utc = d.toISOString().slice(11, 19);
      setT(`${utc} UTC`);
    };
    fmt();
    const id = setInterval(fmt, 1000);
    return () => clearInterval(id);
  }, []);
  return t;
}

function Nav() {
  return (
    <header className="fixed top-0 z-50 w-full">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-5 md:px-10">
        <a href="#" className="flex items-center gap-2.5">
          <span className="neon-dot animate-blink" />
          <span className="font-mono text-[11px] uppercase tracking-[0.32em]">observatório</span>
        </a>
        <nav className="hidden items-center gap-10 md:flex">
          {["sinais", "ecossistema", "leituras", "faq"].map((s) => (
            <a key={s} href={`#${s}`} className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground transition-colors hover:text-foreground">
              {s}
            </a>
          ))}
        </nav>
        <a href="#acesso" className="group relative font-mono text-[11px] uppercase tracking-[0.3em]">
          <span className="border-b border-foreground/40 pb-1 transition-colors group-hover:border-[var(--neon)]">solicitar acesso</span>
        </a>
      </div>
      <div className="hairline mx-6 md:mx-10" />
    </header>
  );
}

function Hero() {
  const t = useTime();
  return (
    <section className="relative overflow-hidden pt-32 md:pt-40">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
          <span>edição 014 / volume privado</span>
          <span className="hidden md:inline">{t}</span>
        </div>

        <div className="mt-16 grid grid-cols-12 gap-6">
          <div className="col-span-12 md:col-span-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
              <span className="neon-dot mr-2 inline-block align-middle" />
              transmissão ativa
            </p>
          </div>
          <h1 className="col-span-12 font-display text-balance text-[14vw] leading-[0.92] md:col-span-10 md:text-[7.5vw]">
            A nova economia<br />
            <span className="text-muted-foreground">não pede</span><br />
            permissão.
          </h1>
        </div>

        <div className="mt-20 grid grid-cols-12 gap-6 border-t border-border pt-8">
          <p className="col-span-12 max-w-xl text-balance text-base leading-relaxed text-muted-foreground md:col-span-5 md:col-start-3">
            Um observatório privado sobre economia descentralizada, inteligência artificial, automação e ativos digitais — para quem percebe que o sistema antigo já está sendo substituído.
          </p>
          <div className="col-span-12 flex flex-col items-start gap-6 md:col-span-4 md:col-start-9">
            <a href="#acesso" className="group inline-flex items-center gap-3">
              <span className="font-mono text-[11px] uppercase tracking-[0.3em]">entrar no círculo</span>
              <span className="h-px w-16 bg-foreground transition-all group-hover:w-24 group-hover:bg-[var(--neon)]" />
            </a>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              acesso por convite — vagas limitadas
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Marquee() {
  const items = [
    "DESCENTRALIZAÇÃO", "IA AUTÔNOMA", "ATIVOS DIGITAIS", "AUTOMAÇÃO", "SOBERANIA", "INTELIGÊNCIA ALTERNATIVA", "REDES PRIVADAS", "LIBERDADE DIGITAL",
  ];
  return (
    <div className="relative mt-32 overflow-hidden border-y border-border py-6">
      <div className="flex w-max animate-marquee gap-16 font-mono text-[11px] uppercase tracking-[0.4em] text-muted-foreground">
        {[...items, ...items, ...items].map((it, i) => (
          <span key={i} className="flex items-center gap-16">
            {it}
            <span className="neon-dot" />
          </span>
        ))}
      </div>
    </div>
  );
}

function Happening() {
  const items = [
    { n: "01", t: "Capital migra do físico ao digital", b: "Ativos digitais não são mais experimentos. São posições estratégicas em portfólios soberanos." },
    { n: "02", t: "IA reescreve o trabalho", b: "Modelos autônomos absorvem funções inteiras. A vantagem está em quem orquestra — não em quem executa." },
    { n: "03", t: "Estados perdem o monopólio", b: "Moedas, identidades e contratos passam a existir fora de instituições centrais." },
    { n: "04", t: "Sobrevivência exige novas leituras", b: "Quem opera com mapas antigos toma decisões obsoletas. O terreno mudou." },
  ];
  return (
    <section id="sinais" className="relative py-32 md:py-44">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <div className="grid grid-cols-12 gap-6">
          <p className="col-span-12 font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground md:col-span-2">
            ▸ o que está acontecendo
          </p>
          <h2 className="col-span-12 font-display text-balance text-5xl leading-[1] md:col-span-10 md:text-7xl">
            Quatro deslocamentos silenciosos<br />
            <span className="text-muted-foreground">redesenhando o terreno.</span>
          </h2>
        </div>

        <div className="mt-24 grid grid-cols-1 gap-px bg-border md:grid-cols-2">
          {items.map((it) => (
            <div key={it.n} className="group bg-background p-10 transition-colors hover:bg-card md:p-14">
              <div className="flex items-start justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{it.n}</span>
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 transition-all group-hover:bg-[var(--neon)] group-hover:shadow-[0_0_12px_var(--neon)]" />
              </div>
              <h3 className="mt-12 font-display text-3xl leading-tight md:text-4xl">{it.t}</h3>
              <p className="mt-6 max-w-md text-sm leading-relaxed text-muted-foreground">{it.b}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Signals() {
  const data = [
    { k: "Capital tokenizado em circulação", v: "≈ 4.7T", d: "estimativa global, 2025" },
    { k: "Funções absorvidas por IA generativa", v: "37%", d: "operações de conhecimento" },
    { k: "Carteiras autônomas ativas", v: "112M+", d: "fora do sistema bancário tradicional" },
    { k: "Crescimento de redes privadas", v: "+218%", d: "em 36 meses" },
  ];
  return (
    <section id="ecossistema" className="relative border-t border-border py-32 md:py-44">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <div className="grid grid-cols-12 gap-6">
          <p className="col-span-12 font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground md:col-span-2">
            ▸ sinais
          </p>
          <div className="col-span-12 md:col-span-10">
            <h2 className="font-display text-balance text-5xl leading-[1] md:text-7xl">
              Indicadores que <span className="text-muted-foreground">o noticiário</span> ainda não nomeia.
            </h2>
          </div>
        </div>

        <div className="mt-24 grid grid-cols-1 border-t border-border md:grid-cols-4">
          {data.map((d, i) => (
            <div key={d.k} className={`flex flex-col gap-6 border-border py-10 md:border-r md:py-12 ${i === data.length - 1 ? "md:border-r-0" : ""} ${i !== 0 ? "border-t md:border-t-0" : ""} md:px-8`}>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{d.k}</p>
              <p className="font-display text-5xl md:text-6xl">{d.v}</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{d.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Ecosystem() {
  return (
    <section id="leituras" className="relative border-t border-border py-32 md:py-44">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <div className="grid grid-cols-12 gap-6">
          <p className="col-span-12 font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground md:col-span-2">
            ▸ ecossistema privado
          </p>
          <div className="col-span-12 md:col-span-10">
            <h2 className="font-display text-balance text-5xl leading-[1] md:text-7xl">
              Não é audiência.<br />
              <span className="text-muted-foreground">É uma rede de leitores</span><br />
              em movimento.
            </h2>
          </div>
        </div>

        <div className="mt-24 grid grid-cols-12 gap-6">
          <div className="col-span-12 md:col-span-5 md:col-start-3">
            <p className="text-base leading-relaxed text-muted-foreground">
              O Observatório é um espaço discreto onde operadores, fundadores, pesquisadores e curiosos compartilham leituras antes que se tornem consenso. Sem palco, sem performance — apenas sinal.
            </p>
          </div>
          <ul className="col-span-12 space-y-px md:col-span-4 md:col-start-9">
            {[
              "boletins privados quinzenais",
              "dossiês sobre ativos emergentes",
              "encontros fechados, sob convite",
              "biblioteca de mapas mentais",
              "acesso ao terminal de sinais",
            ].map((it) => (
              <li key={it} className="flex items-center justify-between border-b border-border py-4 font-mono text-[11px] uppercase tracking-[0.28em]">
                <span>{it}</span>
                <span className="text-muted-foreground">↗</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section id="acesso" className="relative border-t border-border py-32 md:py-48">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <div className="grid grid-cols-12 gap-6">
          <p className="col-span-12 font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground md:col-span-2">
            ▸ solicitação
          </p>
          <div className="col-span-12 md:col-span-10">
            <h2 className="font-display text-balance text-6xl leading-[0.95] md:text-[8vw]">
              Acessar o<br />
              <span className="italic text-muted-foreground">observatório.</span>
            </h2>
          </div>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); }}
          className="mt-20 grid grid-cols-12 gap-6"
        >
          <div className="col-span-12 md:col-span-6 md:col-start-3">
            <label className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              endereço de contato
            </label>
            <div className="mt-3 flex items-center gap-4 border-b border-border pb-3 focus-within:border-[var(--neon)]">
              <input
                type="email"
                required
                placeholder="você@dominio.com"
                className="w-full bg-transparent font-display text-2xl outline-none placeholder:text-muted-foreground/40 md:text-3xl"
              />
              <button type="submit" className="group flex shrink-0 items-center gap-2 font-mono text-[11px] uppercase tracking-[0.3em]">
                continuar
                <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
              </button>
            </div>
            <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              avaliação de candidatura em até 72h. nenhuma comunicação pública.
            </p>
          </div>
        </form>
      </div>
    </section>
  );
}

function FAQItem({ q, a, i }: { q: string; a: string; i: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border">
      <button onClick={() => setOpen(!open)} className="flex w-full items-start justify-between gap-8 py-8 text-left">
        <div className="flex items-start gap-6 md:gap-10">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{i}</span>
          <span className="font-display text-2xl md:text-3xl">{q}</span>
        </div>
        <span className={`mt-2 font-mono text-xl transition-transform ${open ? "rotate-45" : ""}`}>+</span>
      </button>
      <div className={`grid transition-all duration-500 ${open ? "grid-rows-[1fr] pb-10" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <p className="max-w-2xl pl-0 text-sm leading-relaxed text-muted-foreground md:pl-24">{a}</p>
        </div>
      </div>
    </div>
  );
}

function FAQ() {
  const qs = [
    { q: "O que é exatamente o Observatório?", a: "Um espaço editorial e analítico privado. Não é curso, não é mentoria, não é fundo. É inteligência aplicada sobre os deslocamentos da nova economia." },
    { q: "Como funciona o acesso?", a: "Por solicitação. Cada candidatura é avaliada individualmente. Buscamos coerência de propósito, não volume." },
    { q: "Existe alguma promessa financeira?", a: "Nenhuma. Compartilhamos sinais, leituras e mapas. Decisões e resultados pertencem a cada leitor." },
    { q: "Há um custo associado?", a: "Sim. O acesso é privado e contributivo. Os valores são apresentados após a aprovação da candidatura." },
    { q: "Posso cancelar quando quiser?", a: "Sim. A entrada e a saída são livres. O que se mantém é a confidencialidade do que circula." },
  ];
  return (
    <section id="faq" className="relative border-t border-border py-32 md:py-44">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <div className="grid grid-cols-12 gap-6">
          <p className="col-span-12 font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground md:col-span-2">
            ▸ esclarecimentos
          </p>
          <h2 className="col-span-12 font-display text-5xl leading-[1] md:col-span-10 md:text-7xl">
            Perguntas <span className="text-muted-foreground">essenciais.</span>
          </h2>
        </div>
        <div className="mt-20 grid grid-cols-12">
          <div className="col-span-12 md:col-span-10 md:col-start-2">
            {qs.map((q, idx) => (
              <FAQItem key={q.q} q={q.q} a={q.a} i={String(idx + 1).padStart(2, "0")} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="relative border-t border-border pb-10 pt-24">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 md:col-span-5">
            <div className="flex items-center gap-2.5">
              <span className="neon-dot" />
              <span className="font-mono text-[11px] uppercase tracking-[0.32em]">observatório</span>
            </div>
            <p className="mt-8 max-w-md font-display text-3xl leading-tight text-muted-foreground md:text-4xl">
              Um arquivo vivo sobre o futuro que já começou.
            </p>
          </div>

          <div className="col-span-6 md:col-span-2 md:col-start-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">índice</p>
            <ul className="mt-6 space-y-3 font-mono text-[11px] uppercase tracking-[0.28em]">
              <li><a href="#sinais" className="hover:text-[var(--neon)]">sinais</a></li>
              <li><a href="#ecossistema" className="hover:text-[var(--neon)]">ecossistema</a></li>
              <li><a href="#leituras" className="hover:text-[var(--neon)]">leituras</a></li>
              <li><a href="#faq" className="hover:text-[var(--neon)]">faq</a></li>
            </ul>
          </div>
          <div className="col-span-6 md:col-span-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">contato</p>
            <ul className="mt-6 space-y-3 font-mono text-[11px] uppercase tracking-[0.28em]">
              <li>privado@observatorio</li>
              <li>somente convidados</li>
            </ul>
          </div>
        </div>

        <div className="mt-24 flex flex-col items-start justify-between gap-6 border-t border-border pt-8 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground md:flex-row md:items-center">
          <span>© {new Date().getFullYear()} observatório · todos os direitos reservados</span>
          <div className="flex items-center gap-2">
            <span className="neon-dot animate-blink" />
            <span>transmissão ativa</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function Index() {
  return (
    <main className="relative">
      <Nav />
      <Hero />
      <Marquee />
      <Happening />
      <Signals />
      <Ecosystem />
      <CTA />
      <FAQ />
      <Footer />
    </main>
  );
}
