import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/Brand";
import { CrochetVisual } from "@/components/CrochetVisual";
import { CrochetFormatSelector } from "@/components/CrochetFormatSelector";

export const metadata: Metadata = {
  title: "Apliques de Acrílico Personalizados para Crochê",
  description:
    "Apliques personalizados em acrílico para crochê. Valorize bolsas, amigurumis, roupas e peças artesanais com a identidade da sua marca.",
};

const benefits = [
  {
    icon: "✦",
    title: "Mais valor percebido",
    text: "O acabamento da sua peça fica mais profissional e pronto para encantar já no primeiro olhar.",
  },
  {
    icon: "◎",
    title: "Sua marca sempre presente",
    text: "O cliente leva o seu nome junto com a peça e sabe exatamente onde comprar novamente.",
  },
  {
    icon: "♡",
    title: "Combina com o artesanal",
    text: "Cores e formatos delicados que complementam o crochê sem tirar o protagonismo do seu trabalho.",
  },
  {
    icon: "◇",
    title: "Personalização de verdade",
    text: "Use nome, símbolo, frase ou identidade visual para criar um aplique com a cara do seu ateliê.",
  },
];

const uses = [
  { label: "Bolsas", modifier: "use-card__tag--bag" },
  { label: "Amigurumis", modifier: "use-card__tag--round" },
  { label: "Roupas", modifier: "use-card__tag--slim" },
  { label: "Decoração", modifier: "use-card__tag--arch" },
];

const steps = [
  {
    number: "01",
    title: "Escolha o formato",
    text: "Encontre o modelo que mais combina com a identidade das suas peças.",
  },
  {
    number: "02",
    title: "Escolha como personalizar",
    text: "Envie sua logo ou crie uma escrita escolhendo a fonte desejada.",
  },
  {
    number: "03",
    title: "Gere a visualização",
    text: "A logo ou a escrita é ajustada automaticamente dentro do formato.",
  },
  {
    number: "04",
    title: "Confira o resultado",
    text: "Veja o aplique dourado antes de avançarmos para as próximas etapas.",
  },
];

const faqs = [
  {
    question: "Posso colocar o nome do meu ateliê?",
    answer:
      "Sim. O aplique pode receber o nome do ateliê, uma frase, um símbolo ou a sua logo, de acordo com o espaço disponível no formato escolhido.",
  },
  {
    question: "Os apliques servem somente para bolsas?",
    answer:
      "Não. Eles podem ser utilizados em bolsas, amigurumis, roupas, peças decorativas, presentes e diversos produtos artesanais de crochê.",
  },
  {
    question: "Consigo escolher a cor do acrílico?",
    answer:
      "Sim. A etapa de configuração será preparada para apresentar as cores disponíveis e ajudar você a escolher a opção que mais combina com sua marca.",
  },
  {
    question: "Como os apliques são fixados?",
    answer:
      "A fixação depende do modelo escolhido. Os formatos podem receber furos para costura e serão apresentados com as opções adequadas durante a personalização.",
  },
];

const crochetFormats = [
  {
    sku: "REDO-2020-2FH",
    title: "Redondo 20 × 20 mm",
    description: "Formato compacto e delicado, com dois furos para costura.",
  },
  {
    sku: "PLAC-3010-2FH",
    title: "Plaquinha 30 × 10 mm",
    description: "Modelo discreto para nomes curtos e assinaturas minimalistas.",
  },
  {
    sku: "PLAC-4020-2FH",
    title: "Plaquinha 40 × 20 mm",
    description: "Mais espaço para nome, símbolo e detalhes da sua identidade.",
  },
  {
    sku: "URSI-2020-2FS",
    title: "Ursinho 20 × 20 mm",
    description: "Uma opção afetiva para amigurumis e peças infantis.",
  },
  {
    sku: "BORB-2020-2FS",
    title: "Borboleta 20 × 20 mm",
    description: "Formato leve e decorativo para criações delicadas.",
  },
  {
    sku: "PLAC-4010-2FH",
    title: "Plaquinha 40 × 10 mm",
    description: "Modelo horizontal clássico para destacar o nome do ateliê.",
  },
] as const;

export default function CrochetLandingPage() {
  return (
    <main className="crochet-page">
      <header className="crochet-header">
        <div className="container crochet-header__inner">
          <Brand />
          <nav className="crochet-nav" aria-label="Navegação principal">
            <a href="#beneficios">Benefícios</a>
            <a href="#como-funciona">Como funciona</a>
            <a href="#duvidas">Dúvidas</a>
          </nav>
          <a className="button button--small button--outline" href="#escolher-formato">
            Ver formatos
          </a>
        </div>
      </header>

      <section className="crochet-hero">
        <div className="crochet-hero__pattern" />
        <div className="container crochet-hero__grid">
          <div className="crochet-hero__content">
            <Link className="back-link" href="/">
              <span aria-hidden="true">←</span> Todas as categorias
            </Link>
            <span className="eyebrow">Apliques para crochê</span>
            <h1>
              Seu crochê já é único.
              <em> A sua marca também precisa ser.</em>
            </h1>
            <p>
              Transforme cada peça em uma experiência mais profissional com
              apliques de acrílico personalizados, delicados e feitos para
              combinar com o seu trabalho artesanal.
            </p>

            <div className="hero-actions">
              <a className="button button--primary" href="#escolher-formato">
                Ver formatos disponíveis
                <span aria-hidden="true">→</span>
              </a>
              <a className="text-link" href="#aplicacoes">
                Ver possibilidades
              </a>
            </div>

            <div className="crochet-hero__microproof">
              <div className="microproof__avatars" aria-hidden="true">
                <span>C</span>
                <span>A</span>
                <span>♡</span>
              </div>
              <p>
                <strong>Feito para artesãs</strong>
                <small>que querem valorizar cada detalhe</small>
              </p>
            </div>
          </div>

          <CrochetVisual />
        </div>
      </section>

      <section className="proof-bar">
        <div className="container proof-bar__grid">
          <div>
            <strong>Acrílico premium</strong>
            <span>Acabamento limpo e marcante</span>
          </div>
          <div>
            <strong>Personalização exclusiva</strong>
            <span>Com a identidade do seu ateliê</span>
          </div>
          <div>
            <strong>Aplicação versátil</strong>
            <span>Para diferentes peças de crochê</span>
          </div>
          <div>
            <strong>Envio nacional</strong>
            <span>Para todo o Brasil</span>
          </div>
        </div>
      </section>

      <section className="validation-section section">
        <div className="container validation-section__grid">
          <div className="validation-section__visual">
            <div className="before-after before-after--before">
              <span>Sem aplique</span>
              <div className="crochet-piece">
                <div className="crochet-piece__handle" />
                <div className="crochet-piece__body" />
              </div>
              <small>Uma peça bonita, mas sem identificação.</small>
            </div>
            <div className="before-after before-after--after">
              <span>Com sua marca</span>
              <div className="crochet-piece">
                <div className="crochet-piece__handle" />
                <div className="crochet-piece__body">
                  <div className="crochet-piece__tag">Ateliê</div>
                </div>
              </div>
              <small>Mais valor, lembrança e profissionalismo.</small>
            </div>
          </div>

          <div className="validation-section__content">
            <span className="eyebrow">O detalhe que muda tudo</span>
            <h2>Você dedica horas à peça. Não deixe sua marca de fora.</h2>
            <p>
              Uma peça artesanal carrega técnica, cuidado e personalidade. O
              aplique personalizado finaliza esse trabalho mostrando, de forma
              elegante, quem criou tudo aquilo.
            </p>
            <ul className="check-list">
              <li>
                <span>✓</span> Deixa o produto com aparência mais profissional
              </li>
              <li>
                <span>✓</span> Ajuda o cliente a lembrar e indicar o seu ateliê
              </li>
              <li>
                <span>✓</span> Reforça o valor de uma peça verdadeiramente artesanal
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="uses-section section" id="aplicacoes">
        <div className="container">
          <div className="section-heading section-heading--split">
            <div>
              <span className="eyebrow">Uma marca, muitas possibilidades</span>
              <h2>Feito para acompanhar diferentes criações</h2>
            </div>
            <p>
              O formato certo complementa sua peça e cria uma assinatura visual
              consistente em toda a sua coleção.
            </p>
          </div>

          <div className="uses-grid">
            {uses.map((use) => (
              <article className="use-card" key={use.label}>
                <div className="use-card__scene">
                  <div className={`use-card__tag ${use.modifier}`}>
                    <span />
                    <strong>Creativus</strong>
                  </div>
                </div>
                <h3>{use.label}</h3>
                <p>Aplique sua identidade sem perder a delicadeza da peça.</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="benefits-section section" id="beneficios">
        <div className="container benefits-section__grid">
          <div className="benefits-section__intro">
            <span className="eyebrow eyebrow--light">Por que personalizar?</span>
            <h2>Pequeno no tamanho. Gigante para a sua marca.</h2>
            <p>
              O aplique une acabamento, identidade e lembrança em um único
              detalhe — sem competir com a beleza do seu crochê.
            </p>
            <a className="button button--light" href="#escolher-formato">
              Começar minha personalização
              <span aria-hidden="true">→</span>
            </a>
          </div>

          <div className="benefits-grid">
            {benefits.map((benefit) => (
              <article className="benefit-card" key={benefit.title}>
                <span className="benefit-card__icon">{benefit.icon}</span>
                <h3>{benefit.title}</h3>
                <p>{benefit.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="process-section section" id="como-funciona">
        <div className="container">
          <div className="section-heading section-heading--center">
            <span className="eyebrow">Simples do começo ao fim</span>
            <h2>Crie seu aplique em quatro etapas</h2>
            <p>
              Uma experiência guiada para você tomar cada decisão com clareza.
            </p>
          </div>

          <div className="process-grid">
            {steps.map((step, index) => (
              <article className="process-card" key={step.number}>
                <span className="process-card__number">{step.number}</span>
                <div className="process-card__connector" aria-hidden="true">
                  {index < steps.length - 1 ? "→" : "✓"}
                </div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <CrochetFormatSelector formats={crochetFormats} materialColor="DOU" />

      <section className="faq-section section" id="duvidas">
        <div className="container faq-section__grid">
          <div className="faq-section__intro">
            <span className="eyebrow">Dúvidas frequentes</span>
            <h2>Tudo o que você precisa saber antes de começar</h2>
            <p>
              Após escolher um formato, você pode enviar sua logo ou criar uma
              escrita com fonte escolhida e conferir o resultado nesta página.
            </p>
          </div>

          <div className="faq-list">
            {faqs.map((faq) => (
              <details key={faq.question}>
                <summary>
                  {faq.question}
                  <span aria-hidden="true">+</span>
                </summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="final-cta">
        <div className="container final-cta__content">
          <span className="eyebrow eyebrow--light">Seu trabalho merece assinatura</span>
          <h2>Pronta para transformar suas peças em uma marca reconhecida?</h2>
          <p>
            Comece escolhendo o formato que mais combina com o seu ateliê.
          </p>
          <a className="button button--light" href="#escolher-formato">
            Ver formatos disponíveis
            <span aria-hidden="true">→</span>
          </a>
        </div>
      </section>

      <footer className="site-footer site-footer--crochet">
        <div className="container site-footer__inner">
          <Brand light />
          <p>Apliques personalizados para valorizar o que você faz com amor.</p>
          <Link href="/">Voltar ao início</Link>
        </div>
      </footer>
    </main>
  );
}
