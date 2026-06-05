import { createFileRoute } from "@tanstack/react-router";
import { PublicShell, PageHeader } from "@/components/site/PublicShell";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de Uso — Observatório" },
      { name: "description", content: "Termos e condições de uso da plataforma Observatório." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TermosPage,
});

const ULTIMA_ATUALIZACAO = "5 de junho de 2026";

const SECOES = [
  {
    titulo: "1. Aceitação",
    corpo: `Ao criar uma conta ou acessar qualquer conteúdo da plataforma Observatório, você declara ter lido, compreendido e concordado integralmente com estes Termos de Uso. Se não concordar com alguma disposição, não utilize a plataforma.

Estes Termos são celebrados entre você e a Noxis Drathos, operadora da plataforma Observatório. Eles regem o uso de todos os serviços, conteúdos e funcionalidades disponibilizados.`,
  },
  {
    titulo: "2. Descrição do serviço",
    corpo: `O Observatório é uma plataforma editorial privada que oferece acesso a pesquisas, briefings, vídeos, PDFs e análises sobre economia descentralizada, inteligência artificial, automação e ativos digitais.

O serviço é disponibilizado mediante assinatura paga, em diferentes planos com benefícios distintos. O Observatório não é um curso, consultoria de investimentos, assessoria financeira ou fundo de qualquer natureza. O conteúdo publicado tem caráter exclusivamente informativo e editorial.

Nada publicado na plataforma constitui recomendação de investimento, aconselhamento jurídico ou financeiro. Decisões tomadas com base no conteúdo do Observatório são de responsabilidade exclusiva do assinante.`,
  },
  {
    titulo: "3. Elegibilidade",
    corpo: `Para utilizar a plataforma, você deve:

• Ter no mínimo 18 anos de idade.
• Ser capaz de celebrar contratos válidos conforme a lei brasileira.
• Fornecer informações verdadeiras, precisas e atualizadas no cadastro.
• Não utilizar a plataforma em violação a qualquer lei aplicável.

O cadastro por menores de 18 anos é expressamente proibido. Contas identificadas como de menores serão encerradas imediatamente.`,
  },
  {
    titulo: "4. Conta e segurança",
    corpo: `Você é responsável por:

• Manter a confidencialidade de suas credenciais de acesso.
• Todas as atividades realizadas com sua conta.
• Notificar imediatamente o Observatório em caso de uso não autorizado da sua conta via privado@observatorio.

É proibido compartilhar suas credenciais de acesso com terceiros. A plataforma possui sistemas de detecção de acesso simultâneo de múltiplos dispositivos. O compartilhamento indevido pode resultar em suspensão ou encerramento da conta sem reembolso.`,
  },
  {
    titulo: "5. Assinatura e pagamento",
    corpo: `O acesso à plataforma é condicionado ao pagamento de assinatura nos planos disponíveis:

• Círculo: R$ 97/mês
• Cofre: R$ 297/mês
• Conselho: R$ 1.490/ano

Os valores são cobrados automaticamente no período contratado via Stripe, processador de pagamentos certificado PCI-DSS. Ao fornecer os dados de pagamento, você autoriza cobranças recorrentes até o cancelamento da assinatura.

Os preços podem ser ajustados com aviso prévio de 30 dias por e-mail. Assinantes existentes mantêm o preço vigente até o fim do período pago.`,
  },
  {
    titulo: "6. Cancelamento e reembolso",
    corpo: `Você pode cancelar sua assinatura a qualquer momento através da área do assinante ou por e-mail em privado@observatorio.

Janela de cancelamento com reembolso integral: 30 dias corridos a partir da data da contratação ou renovação, sem necessidade de justificativa ("janela silenciosa"). Após esse prazo, não há reembolso proporcional por período não utilizado.

O cancelamento encerra o acesso ao término do período já pago. Dados são mantidos por até 90 dias após o cancelamento para fins de suporte, conforme a Política de Privacidade.`,
  },
  {
    titulo: "7. Conteúdo e propriedade intelectual",
    corpo: `Todo o conteúdo disponibilizado na plataforma — incluindo textos, análises, vídeos, PDFs, briefings, dados e design — é propriedade exclusiva da Noxis Drathos ou licenciado por terceiros, protegido pelas leis de direito autoral (Lei 9.610/1998) e direitos conexos.

É expressamente proibido:

• Reproduzir, distribuir, publicar ou compartilhar qualquer conteúdo da plataforma, total ou parcialmente, sem autorização prévia por escrito.
• Utilizar conteúdo para fins comerciais, incluindo revenda ou redistribuição.
• Remover marcas d'água, metadados ou identificadores de autoria.
• Utilizar mecanismos automatizados (bots, scrapers) para coletar conteúdo.

O uso indevido poderá resultar em encerramento imediato da conta e medidas legais cabíveis.`,
  },
  {
    titulo: "8. Conduta do usuário",
    corpo: `Ao utilizar a plataforma, você se compromete a não:

• Violar qualquer lei federal, estadual ou municipal aplicável.
• Tentar obter acesso não autorizado a sistemas, contas ou dados.
• Interferir no funcionamento da plataforma ou de sua infraestrutura.
• Publicar, transmitir ou compartilhar conteúdo ilegal, difamatório, obsceno ou que viole direitos de terceiros na comunidade da plataforma.
• Criar contas múltiplas para contornar suspensões ou restrições.

Violações poderão resultar em suspensão ou encerramento da conta, sem reembolso.`,
  },
  {
    titulo: "9. Disponibilidade e alterações",
    corpo: `O Observatório empenha-se em manter a plataforma disponível de forma contínua, mas não garante disponibilidade ininterrupta. Manutenções programadas serão comunicadas com antecedência sempre que possível.

Reservamo-nos o direito de modificar, suspender ou encerrar funcionalidades da plataforma a qualquer momento, com aviso prévio razoável. Alterações que impactem materialmente o serviço contratado serão comunicadas com no mínimo 30 dias de antecedência.`,
  },
  {
    titulo: "10. Limitação de responsabilidade",
    corpo: `Na extensão máxima permitida pela lei, a Noxis Drathos não se responsabiliza por:

• Decisões financeiras, de investimento ou de negócio tomadas com base no conteúdo da plataforma.
• Perdas ou danos indiretos, incidentais ou consequenciais decorrentes do uso ou impossibilidade de uso da plataforma.
• Conteúdo de terceiros eventualmente referenciado ou vinculado.
• Interrupções de serviço causadas por falhas de infraestrutura de terceiros (AWS, Stripe, provedores de internet).

O conteúdo do Observatório não constitui aconselhamento profissional de qualquer natureza.`,
  },
  {
    titulo: "11. Modificações nos Termos",
    corpo: `Podemos revisar estes Termos periodicamente. Alterações substanciais serão comunicadas por e-mail com no mínimo 15 dias de antecedência. O uso continuado da plataforma após o período de aviso constitui aceitação dos novos termos.

Se não concordar com as alterações, você poderá cancelar sua assinatura antes da data de vigência dos novos termos e receberá reembolso proporcional pelo período não utilizado.`,
  },
  {
    titulo: "12. Lei aplicável e foro",
    corpo: `Estes Termos são regidos pelas leis da República Federativa do Brasil. Para resolução de conflitos, fica eleito o foro da comarca de domicílio do assinante, conforme art. 101, I do Código de Defesa do Consumidor (Lei 8.078/1990), sem prejuízo da competência de juizados especiais cíveis.

Antes de qualquer medida judicial, as partes comprometem-se a buscar solução amigável em até 30 dias a partir da notificação formal do conflito.`,
  },
  {
    titulo: "13. Contato",
    corpo: `Para dúvidas, reclamações ou exercício de direitos relacionados a estes Termos, entre em contato via: privado@observatorio.

Para questões de proteção de dados, consulte nossa Política de Privacidade.`,
  },
];

function TermosPage() {
  return (
    <PublicShell>
      <PageHeader
        eyebrow="documento legal"
        title="Termos de Uso."
        lead={`Última atualização: ${ULTIMA_ATUALIZACAO}. Ao utilizar a plataforma Observatório, você concorda com estes termos. Leia com atenção antes de se cadastrar.`}
      />

      <section className="mx-auto max-w-3xl px-6 md:px-10 pb-32 space-y-12">
        {SECOES.map((s) => (
          <div key={s.titulo} className="border-t border-border pt-10">
            <h2 className="font-display text-2xl mb-5">{s.titulo}</h2>
            <div className="text-muted-foreground leading-relaxed text-sm space-y-3">
              {s.corpo.split("\n\n").map((paragrafo, i) => (
                <p key={i} className="whitespace-pre-line">
                  {paragrafo}
                </p>
              ))}
            </div>
          </div>
        ))}
      </section>
    </PublicShell>
  );
}
