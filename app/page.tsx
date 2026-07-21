import Link from "next/link";
import { Brand } from "@/components/Brand";
import { CrochetVisual } from "@/components/CrochetVisual";

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="m5 12 4 4L19 6" />
  </svg>
);

export default function Home() {
  return (
    <main className="home-page">
      <header className="site-header">
        <div className="container site-header__inner">
          <Brand />
          <a className="header-link" href="#afinidade">
            Encontrar meu aplique
          </a>
        </div>
      </header>

      <section className="home-hero">
        <div className="home-hero__orb home-hero__orb--one" />
        <div className="home-hero__orb home-hero__orb--two" />

        <div className="container home-hero__grid">
          <div className="home-hero__content">
            <span className="eyebrow">Sua marca em cada detalhe</span>
            <h1>
              Apliques que transformam o seu trabalho em uma marca
              <em> inesquecível.</em>
            </h1>
            <p>
              Crie uma apresentação mais profissional, valorize suas peças e
              faça seus clientes lembrarem de quem produziu cada detalhe.
            </p>

            <div className="hero-actions">
              <a className="button button--primary" href="#afinidade">
                Escolher minha categoria
                <span aria-hidden="true">→</span>
              </a>
              <span className="hero-actions__note">
                Personalizado para o seu negócio
              </span>
            </div>

            <div className="home-hero__trust">
              <span>
                <CheckIcon /> Acrílico de alta qualidade
              </span>
              <span>
                <CheckIcon /> Produção personalizada
              </span>
              <span>
                <CheckIcon /> Envio para todo o Brasil
              </span>
            </div>
          </div>

          <CrochetVisual />
        </div>
      </section>

      <section className="affinity-section section" id="afinidade">
        <div className="container">
          <div className="section-heading section-heading--center">
            <span className="eyebrow">Vamos começar</span>
            <h2>Qual é a afinidade dos seus apliques?</h2>
            <p>
              Escolha o tipo de produto que você cria para conhecer as opções
              pensadas especialmente para o seu trabalho.
            </p>
          </div>

          <div className="affinity-grid affinity-grid--single">
            <Link
              className="affinity-card affinity-card--featured"
              href="/apliques-croche-personalizados"
            >
              <div className="affinity-card__visual">
                <CrochetVisual compact />
              </div>
              <div className="affinity-card__content">
                <div className="affinity-card__topline">
                  <span>Disponível agora</span>
                  <small>Mais procurado</small>
                </div>
                <h3>Crochê</h3>
                <p>
                  Apliques delicados e personalizados para bolsas, peças de
                  decoração, amigurumis, roupas e presentes artesanais.
                </p>
                <strong className="affinity-card__cta">
                  Ver apliques para crochê <span aria-hidden="true">→</span>
                </strong>
              </div>
            </Link>
          </div>

          <p className="affinity-section__coming-soon">
            Novas categorias serão adicionadas em breve.
          </p>
        </div>
      </section>

      <section className="brand-promise section">
        <div className="container brand-promise__grid">
          <div>
            <span className="eyebrow">Mais do que um detalhe</span>
            <h2>Seu produto merece carregar o valor da sua marca.</h2>
          </div>
          <div className="brand-promise__points">
            <article>
              <span>01</span>
              <div>
                <h3>Apresentação profissional</h3>
                <p>Um acabamento que aumenta a percepção de valor da peça.</p>
              </div>
            </article>
            <article>
              <span>02</span>
              <div>
                <h3>Identidade memorável</h3>
                <p>Seu nome acompanha o produto e continua sendo lembrado.</p>
              </div>
            </article>
            <article>
              <span>03</span>
              <div>
                <h3>Feito para você</h3>
                <p>Formato, cor e gravação pensados para combinar com sua marca.</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="container site-footer__inner">
          <Brand light />
          <p>Detalhes personalizados para marcas feitas com carinho.</p>
        </div>
      </footer>
    </main>
  );
}
