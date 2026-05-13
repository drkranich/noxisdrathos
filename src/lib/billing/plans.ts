// Plan catalog — single source of truth for pricing UI and future Stripe sync.
// When a payment provider is connected, map `id` → provider price id here.

export type Plan = {
  id: "circle" | "vault" | "council";
  tag: string;
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  featured?: boolean;
  // populated when provider is connected
  stripePriceId?: string;
  pixEnabled?: boolean;
};

export const PLANS: Plan[] = [
  {
    id: "circle",
    tag: "plano · 01",
    name: "Círculo",
    price: "R$ 97",
    period: "/mês",
    description: "Acesso à biblioteca pública estendida e aos briefings semanais.",
    features: [
      "Briefings semanais",
      "Biblioteca pública estendida",
      "Comunidade silenciosa",
    ],
    cta: "entrar no círculo",
  },
  {
    id: "vault",
    tag: "plano · 02 · recomendado",
    name: "Cofre",
    price: "R$ 297",
    period: "/mês",
    description: "Acesso integral ao acervo privado: PDFs, vídeos e leituras restritas.",
    features: [
      "Tudo do Círculo",
      "Biblioteca privada completa",
      "Vídeos e PDFs protegidos",
      "Coleções curadas",
      "Continuar de onde parou",
    ],
    cta: "abrir o cofre",
    featured: true,
  },
  {
    id: "council",
    tag: "plano · 03",
    name: "Conselho",
    price: "R$ 1.490",
    period: "/ano",
    description: "Acesso anual com prioridade e participação em sessões privadas.",
    features: [
      "Tudo do Cofre",
      "Sessões trimestrais privadas",
      "Acesso antecipado a edições",
      "Janela direta com a curadoria",
    ],
    cta: "candidatar-se",
  },
];
