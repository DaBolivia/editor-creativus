const formats = [
  {
    name: "Redondo",
    description: "Delicado e versátil",
    shape: "format-card__shape--round",
  },
  {
    name: "Oval",
    description: "Elegante e orgânico",
    shape: "format-card__shape--oval",
  },
  {
    name: "Retangular",
    description: "Mais espaço para sua marca",
    shape: "format-card__shape--rectangle",
  },
];

export function FormatSelectorPreview() {
  return (
    <section className="format-section section" id="escolher-formato">
      <div className="container format-section__grid">
        <div className="format-section__copy">
          <span className="eyebrow eyebrow--light">Próxima etapa</span>
          <h2>Agora, escolha o formato que combina com a sua marca</h2>
          <p>
            Esta área já está preparada visualmente. Na próxima implementação,
            cada opção poderá abrir tamanhos, cores, furos e personalização.
          </p>
          <div className="format-section__status">
            <span aria-hidden="true">✓</span>
            Estrutura pronta para receber o configurador
          </div>
        </div>

        <div className="format-selector" aria-label="Prévia das opções de formato">
          <div className="format-selector__heading">
            <div>
              <small>Etapa 1 de 4</small>
              <strong>Qual formato você prefere?</strong>
            </div>
            <span>Em breve</span>
          </div>

          <div className="format-selector__options">
            {formats.map((format) => (
              <div className="format-card" key={format.name}>
                <div className={`format-card__shape ${format.shape}`}>
                  <span />
                </div>
                <strong>{format.name}</strong>
                <small>{format.description}</small>
              </div>
            ))}
          </div>

          <button className="format-selector__button" type="button" disabled>
            Continuar personalização
          </button>
          <p className="format-selector__note">
            A seleção será ativada na próxima etapa do projeto.
          </p>
        </div>
      </div>
    </section>
  );
}
