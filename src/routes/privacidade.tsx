import { createFileRoute } from "@tanstack/react-router";
import { PublicShell, PageHeader } from "@/components/site/PublicShell";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — Observatório" },
      { name: "description", content: "Como o Observatório coleta, usa e protege seus dados pessoais, conforme a Lei Geral de Proteção de Dados (LGPD)." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PrivacidadePage,
});

const ULTIMA_ATUALIZACAO = "5 de junho de 2026";

const SECOES = [
  {
    titulo: "1. Quem somos",
    corpo: `O Observatório é uma plataforma editorial privada operada por Noxis Drathos. Somos o controlador dos seus dados pessoais para os fins descritos nesta Política. Para contato relacionado a privacidade e proteção de dados, utilize: privado@observatorio.`,
  },
  {
    titulo: "2. Dados que coletamos",
    corpo: `Coletamos os seguintes dados pessoais ao criar sua conta e usar a plataforma:

• Identificação: nome completo e endereço de e-mail.
• Autenticação: senha (armazenada em formato hash — nunca em texto puro).
• Canal de contato opcional: usuário no Telegram ou número no Signal, apenas se você escolher fornecê-los.
• Dados de uso: páginas acessadas, conteúdo consumido, progresso de leitura/vídeo e interações com a plataforma.
• Dados de pagamento: processados diretamente pela Stripe. Não armazenamos número de cartão, CVV ou dados bancários — apenas o identificador de assinatura e o status do pagamento.
• Dados técnicos: endereço IP (para detecção de uso compartilhado indevido de conta), tipo de dispositivo e sistema operacional.`,
  },
  {
    titulo: "3. Finalidades e bases legais",
    corpo: `Cada atividade de tratamento possui uma base legal específica conforme o art. 7º da LGPD:

• Criação e manutenção da sua conta → Execução de contrato (art. 7º, V).
• Processamento do pagamento e controle de acesso → Execução de contrato (art. 7º, V).
• Entrega de conteúdo e personalização da experiência → Execução de contrato e legítimo interesse (art. 7º, V e IX).
• Envio de comunicações sobre sua assinatura (cobranças, renovações, alertas) → Execução de contrato (art. 7º, V).
• Envio de comunicações editoriais e boletins privados → Legítimo interesse editorial (art. 7º, IX). Você pode cancelar a qualquer momento.
• Segurança, detecção de fraudes e integridade da plataforma → Legítimo interesse e cumprimento de obrigação legal (art. 7º, IX e II).
• Cumprimento de obrigações fiscais e regulatórias → Obrigação legal (art. 7º, II).`,
  },
  {
    titulo: "4. Compartilhamento de dados",
    corpo: `Não vendemos, alugamos ou comercializamos seus dados pessoais. Compartilhamos dados apenas nas seguintes situações, e somente na extensão necessária:

• Stripe: processador de pagamentos. Sujeito à política de privacidade da Stripe.
• Supabase: provedor de infraestrutura de banco de dados e autenticação, hospedado em servidores nos Estados Unidos (região us-east-1) com garantias contratuais de segurança.
• Resend ou provedor equivalente de e-mail transacional: apenas endereço de e-mail e conteúdo da mensagem, para entrega de comunicações.
• Autoridades competentes: quando exigido por lei, ordem judicial ou processo legal aplicável.`,
  },
  {
    titulo: "5. Transferência internacional",
    corpo: `Seus dados são processados em servidores nos Estados Unidos. Esta transferência é realizada com base em cláusulas contratuais padrão e nas salvaguardas adequadas previstas no art. 33 da LGPD, tendo em vista que os provedores utilizados adotam mecanismos de proteção equivalentes ou superiores ao exigido pela legislação brasileira.`,
  },
  {
    titulo: "6. Retenção de dados",
    corpo: `Mantemos seus dados pelo tempo necessário às finalidades para as quais foram coletados:

• Conta ativa: enquanto sua assinatura estiver ativa.
• Após cancelamento: até 90 dias, para fins de suporte e resolução de disputas.
• Dados fiscais e de faturamento: pelo prazo legal obrigatório (mínimo de 5 anos, conforme legislação tributária brasileira).
• Logs de segurança: 12 meses.

Você pode solicitar a exclusão antecipada dos seus dados a qualquer momento (ver seção 8).`,
  },
  {
    titulo: "7. Segurança",
    corpo: `Adotamos medidas técnicas e organizacionais para proteger seus dados, incluindo:

• Criptografia em repouso e em trânsito (TLS 1.2+).
• Senhas armazenadas em hash com bcrypt.
• Row-Level Security (RLS) no banco de dados — cada usuário acessa apenas seus próprios dados.
• Controles de acesso por função e detecção de acesso simultâneo indevido.
• Auditorias internas periódicas de segurança.

Nenhum sistema é 100% seguro. Em caso de incidente que possa afetar seus direitos, notificaremos a ANPD e os titulares impactados conforme os prazos previstos em lei.`,
  },
  {
    titulo: "8. Seus direitos (art. 18 LGPD)",
    corpo: `Como titular de dados pessoais, você tem os seguintes direitos, exercíveis a qualquer momento via e-mail para privado@observatorio:

I. Confirmação de que seus dados são tratados.
II. Acesso aos seus dados pessoais.
III. Correção de dados incompletos, inexatos ou desatualizados.
IV. Anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade com a LGPD.
V. Portabilidade dos seus dados para outro provedor.
VI. Eliminação dos dados tratados com base em consentimento, ressalvadas as hipóteses legais de retenção.
VII. Informação sobre compartilhamento com terceiros.
VIII. Revogação do consentimento, quando aplicável.
IX. Revisão de decisões automatizadas que afetem seus interesses.

Responderemos às solicitações em até 15 dias úteis.`,
  },
  {
    titulo: "9. Cookies e rastreamento",
    corpo: `Utilizamos cookies estritamente necessários para autenticação e funcionamento da plataforma. Não utilizamos cookies de rastreamento publicitário ou pixels de terceiros para fins de marketing. Dados de uso são coletados internamente para melhorar a experiência editorial — nunca vendidos ou compartilhados com plataformas de anúncios.`,
  },
  {
    titulo: "10. Crianças e adolescentes",
    corpo: `Esta plataforma não se destina a menores de 18 anos. Não coletamos intencionalmente dados de crianças ou adolescentes. Se identificarmos que um usuário é menor de 18 anos, a conta será encerrada e os dados, excluídos.`,
  },
  {
    titulo: "11. Alterações nesta Política",
    corpo: `Podemos atualizar esta Política periodicamente. Alterações relevantes serão comunicadas por e-mail com no mínimo 15 dias de antecedência. A data da última atualização é indicada no início deste documento. O uso continuado da plataforma após o período de aviso constitui aceite das alterações.`,
  },
  {
    titulo: "12. Contato e DPO",
    corpo: `Para exercer seus direitos, esclarecer dúvidas ou registrar reclamações sobre o tratamento dos seus dados, entre em contato pelo e-mail: privado@observatorio.

Caso não receba resposta satisfatória em 15 dias úteis, você tem o direito de apresentar reclamação à Autoridade Nacional de Proteção de Dados (ANPD) através do portal gov.br/anpd.`,
  },
];

function PrivacidadePage() {
  return (
    <PublicShell>
      <PageHeader
        eyebrow="documento legal"
        title="Política de Privacidade."
        lead={`Última atualização: ${ULTIMA_ATUALIZACAO}. Aplicável à plataforma Observatório, operada pela Noxis Drathos. Em conformidade com a Lei Geral de Proteção de Dados — Lei 13.709/2018.`}
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
