"use client";

import Image from "next/image";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  type SyntheticEvent,
} from "react";
import {
  SVG_EDITOR_MESSAGE_TYPES,
  buildPublicSvgEditorUrl,
  getAdjustedLogoForFormat,
  getFormatsBySkus,
  loadSvgInPublicEditor,
  subscribeToPublicSvgEditorMessages,
  type AcrylicMaterialColor,
  type FormatLoadResult,
  type PublicSvgEditorMessage,
} from "../app/src/service/calls";
import styles from "./CrochetFormatSelector.module.css";

export type CrochetFormatOption = {
  sku: string;
  title: string;
  description: string;
};

type CrochetFormatSelectorProps = {
  formats: readonly CrochetFormatOption[];
  materialColor?: AcrylicMaterialColor;
};

type LoadedCard = CrochetFormatOption & FormatLoadResult;
type PersonalizationMode = "logo" | "text" | null;
type PreviewKind = "logo" | "text";

type PreviewRequest = {
  id: string;
  kind: PreviewKind;
  svg: string;
  autoText?: string;
  autoTextFont?: string;
};

const MAX_LOGO_SIZE_BYTES = 15 * 1024 * 1024;
// A escrita pública agora passa pelo mesmo motor completo do editor: fonte real,
// conversão em curvas soldadas e validação contra o contorno roxo. O primeiro uso
// pode incluir o carregamento do motor de curvas, portanto recebe um limite próprio.
const LOGO_PREVIEW_TIMEOUT_MS = 18_000;
const TEXT_PREVIEW_TIMEOUT_MS = 45_000;

function findClassesUsingColor(svg: string, hex: string): string[] {
  const cleanHex = hex.replace("#", "");
  const regex = new RegExp(
    `\\.([a-zA-Z0-9_-]+)\\s*\\{[^}]*#${cleanHex}[^}]*\\}`,
    "gi",
  );
  const classes = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = regex.exec(svg)) !== null) {
    if (match[1]) classes.add(`.${match[1]}`);
  }

  return [...classes];
}

function buildColorSelectors(svg: string, hex: string): string {
  const cleanHex = hex.replace("#", "");
  const upper = cleanHex.toUpperCase();
  const lower = cleanHex.toLowerCase();
  const r = Number.parseInt(cleanHex.slice(0, 2), 16);
  const g = Number.parseInt(cleanHex.slice(2, 4), 16);
  const b = Number.parseInt(cleanHex.slice(4, 6), 16);

  return [
    `[stroke="#${upper}"]`,
    `[fill="#${upper}"]`,
    `[style*="#${upper}"]`,
    `[stroke="#${lower}"]`,
    `[fill="#${lower}"]`,
    `[style*="#${lower}"]`,
    `[stroke="rgb(${r}, ${g}, ${b})"]`,
    `[fill="rgb(${r}, ${g}, ${b})"]`,
    `[style*="rgb(${r}, ${g}, ${b})"]`,
    `[stroke="rgb(${r},${g},${b})"]`,
    `[fill="rgb(${r},${g},${b})"]`,
    `[style*="rgb(${r},${g},${b})"]`,
    ...findClassesUsingColor(svg, hex),
  ].join(",");
}

function applyMaterialToPreview(
  svg: string,
  materialColor: AcrylicMaterialColor,
): string {
  if (!svg || materialColor !== "DOU") return svg;

  const cleanSvg = svg
    .replace(/<\?xml[^>]*\?>/gi, "")
    .replace(/<!DOCTYPE[\s\S]*?>/gi, "")
    .trim();

  const gradientId = "creativus-preview-gold";
  const blueSelectors = buildColorSelectors(cleanSvg, "#3E4095");
  const blackSelectors = buildColorSelectors(cleanSvg, "#373435");
  const yellowSelectors = buildColorSelectors(cleanSvg, "#FFF212");

  const materialMarkup = `
    <defs>
      <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#7a4b08" />
        <stop offset="18%" stop-color="#f5d77d" />
        <stop offset="40%" stop-color="#a86f13" />
        <stop offset="62%" stop-color="#fff0aa" />
        <stop offset="82%" stop-color="#bd8120" />
        <stop offset="100%" stop-color="#6b3f05" />
      </linearGradient>
    </defs>
    <style>
      ${blueSelectors} {
        display: inline !important;
        fill: url(#${gradientId}) !important;
        stroke: rgba(73, 45, 4, 0.45) !important;
        stroke-width: 1px !important;
        filter: drop-shadow(2px 3px 3px rgba(54, 31, 0, 0.28));
      }
      ${blackSelectors}, ${yellowSelectors} {
        display: none !important;
      }
    </style>
  `;

  return cleanSvg.replace(/<svg\b([^>]*)>/i, `<svg$1>${materialMarkup}`);
}

function createSvgPreviewUrl(
  svg: string,
  materialColor: AcrylicMaterialColor,
): string {
  const previewSvg = applyMaterialToPreview(svg, materialColor);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(previewSvg)}`;
}

function formatFileSize(size: number): string {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function normalizeFonts(fonts: unknown): string[] {
  if (!Array.isArray(fonts)) return [];

  return [...new Set(fonts.map((font) => String(font || "").trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export function CrochetFormatSelector({
  formats,
  materialColor = "DOU",
}: CrochetFormatSelectorProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const customizerRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const lastSentPreviewIdRef = useRef<string | null>(null);

  const [results, setResults] = useState<FormatLoadResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedSku, setSelectedSku] = useState<string | null>(null);
  const [personalizationMode, setPersonalizationMode] =
    useState<PersonalizationMode>(null);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPrompt, setLogoPrompt] = useState("");
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);

  const [textValue, setTextValue] = useState("");
  const [availableFonts, setAvailableFonts] = useState<string[]>([]);
  const [selectedFont, setSelectedFont] = useState("");

  const [editorUrl, setEditorUrl] = useState("");
  const [editorReady, setEditorReady] = useState(false);
  const [editorStatus, setEditorStatus] = useState("");
  const [previewRequest, setPreviewRequest] = useState<PreviewRequest | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [personalizationError, setPersonalizationError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const formatKey = useMemo(
    () => formats.map((format) => format.sku).join("|"),
    [formats],
  );

  const cards = useMemo<LoadedCard[]>(
    () =>
      formats.map((format, index) => ({
        ...format,
        ...(results[index] || {
          success: false,
          sku: format.sku,
          error: "Formato ainda não carregado.",
        }),
      })),
    [formats, results],
  );

  const selectedFormat = useMemo(
    () =>
      cards.find(
        (format): format is LoadedCard & { success: true; svgData: string } =>
          format.sku === selectedSku && format.success,
      ) || null,
    [cards, selectedSku],
  );

  const fontOptions = availableFonts;

  useEffect(() => {
    setEditorUrl(buildPublicSvgEditorUrl(window.location.origin, materialColor));
  }, [materialColor]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadFormats() {
      setIsLoading(true);
      setLoadError("");

      try {
        const loaded = await getFormatsBySkus(
          formats.map((format) => format.sku),
          controller.signal,
        );

        if (!controller.signal.aborted) {
          setResults(loaded);

          if (loaded.every((result) => !result.success)) {
            setLoadError(
              "Nenhum dos formatos solicitados foi encontrado no backend.",
            );
          }
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Não foi possível carregar os formatos.",
          );
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    void loadFormats();

    return () => controller.abort();
  }, [formatKey, reloadKey]);

  useEffect(() => {
    return subscribeToPublicSvgEditorMessages(
      (data: PublicSvgEditorMessage) => {
        if (data.type === SVG_EDITOR_MESSAGE_TYPES.READY) {
          const receivedFonts = normalizeFonts(data.fonts);
          setEditorReady(true);
          setAvailableFonts(receivedFonts);
          setSelectedFont((current) => {
            if (current && receivedFonts.includes(current)) return current;
            return receivedFonts[0] || "";
          });
          setEditorStatus("Visualizador carregado e pronto.");
          return;
        }

        if (data.type === SVG_EDITOR_MESSAGE_TYPES.PREVIEW_READY) {
          if (data.requestId && data.requestId !== previewRequest?.id) return;
          setIsGeneratingPreview(false);
          setEditorStatus(
            data.previewKind === "text"
              ? "Sua escrita foi centralizada e ajustada automaticamente."
              : "Sua logo foi ajustada ao formato selecionado.",
          );
          return;
        }

        if (data.type === SVG_EDITOR_MESSAGE_TYPES.ERROR) {
          setIsGeneratingPreview(false);
          setPersonalizationError(
            data.message || "O visualizador informou um erro.",
          );
        }
      },
      () => iframeRef.current?.contentWindow || null,
    );
  }, [previewRequest?.id]);

  useEffect(() => {
    if (!isGeneratingPreview || !previewRequest) return;

    const timeoutMs = previewRequest.kind === "text"
      ? TEXT_PREVIEW_TIMEOUT_MS
      : LOGO_PREVIEW_TIMEOUT_MS;

    const timeout = window.setTimeout(() => {
      setIsGeneratingPreview(false);
      setPersonalizationError(
        "A visualização demorou mais do que o esperado. Recarregue a prévia e tente novamente.",
      );
      setEditorStatus("Não foi possível concluir a visualização automaticamente.");
    }, timeoutMs);

    return () => window.clearTimeout(timeout);
  }, [isGeneratingPreview, previewRequest]);

  useEffect(() => {
    const editorWindow = iframeRef.current?.contentWindow;
    if (!editorReady || !editorWindow || !previewRequest) return;
    if (lastSentPreviewIdRef.current === previewRequest.id) return;

    let firstFrame = 0;
    let secondFrame = 0;

    firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        try {
          loadSvgInPublicEditor(editorWindow, previewRequest.svg, {
            materialColor,
            readOnly: true,
            presentationMode: true,
            autoText: previewRequest.autoText,
            autoTextFont: previewRequest.autoTextFont,
            autoApplyText: previewRequest.kind === "text",
            previewKind: previewRequest.kind,
            requestId: previewRequest.id,
          });
          lastSentPreviewIdRef.current = previewRequest.id;
        } catch (error) {
          setIsGeneratingPreview(false);
          setPersonalizationError(
            error instanceof Error
              ? error.message
              : "Não foi possível enviar a visualização ao editor.",
          );
        }
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [editorReady, materialColor, previewRequest]);

  function resetPersonalization() {
    setPersonalizationMode(null);
    setLogoFile(null);
    setLogoPrompt("");
    setTextValue("");
    setPreviewRequest(null);
    setShowPreview(false);
    setIsGeneratingPreview(false);
    setPersonalizationError("");
    setEditorStatus(editorReady ? "Visualizador carregado e pronto." : "");
    lastSentPreviewIdRef.current = null;
  }

  function selectFormat(format: LoadedCard) {
    if (!format.success) return;

    setSelectedSku(format.sku);
    resetPersonalization();

    window.requestAnimationFrame(() => {
      customizerRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  function closeCustomizer() {
    setSelectedSku(null);
    resetPersonalization();
    setEditorReady(false);
    setAvailableFonts([]);
    setSelectedFont("");
  }

  function choosePersonalizationMode(mode: Exclude<PersonalizationMode, null>) {
    setPersonalizationMode(mode);
    setPersonalizationError("");
    setShowPreview(false);
    setPreviewRequest(null);
    setIsGeneratingPreview(false);
    lastSentPreviewIdRef.current = null;
  }

  function validateLogoFile(file: File): string | null {
    const accepted =
      file.type.startsWith("image/") ||
      /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(file.name);

    if (!accepted) return "Envie uma imagem PNG, JPG, WEBP ou SVG.";
    if (file.size <= 0) return "O arquivo selecionado está vazio.";
    if (file.size > MAX_LOGO_SIZE_BYTES) return "A logo deve ter no máximo 15 MB.";
    return null;
  }

  function setValidatedLogo(file: File | null) {
    if (!file) return;

    const error = validateLogoFile(file);
    if (error) {
      setLogoFile(null);
      setPersonalizationError(error);
      return;
    }

    setLogoFile(file);
    setPersonalizationError("");
  }

  function handleLogoInput(event: ChangeEvent<HTMLInputElement>) {
    setValidatedLogo(event.target.files?.[0] || null);
    event.target.value = "";
  }

  function handleLogoDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDraggingLogo(false);
    setValidatedLogo(event.dataTransfer.files?.[0] || null);
  }

  async function generateLogoPreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedFormat) {
      setPersonalizationError("Selecione um formato primeiro.");
      return;
    }

    if (!logoFile) {
      setPersonalizationError("Selecione sua logo antes de gerar a visualização.");
      return;
    }

    setIsGeneratingPreview(true);
    setPersonalizationError("");
    setEditorStatus("Vetorizando e encaixando sua logo no formato...");

    try {
      const result = await getAdjustedLogoForFormat({
        logo: logoFile,
        sku: selectedFormat.sku,
        prompt: logoPrompt,
      });

      const request: PreviewRequest = {
        id: `logo-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        kind: "logo",
        svg: result.finalSvg,
      };

      lastSentPreviewIdRef.current = null;
      setShowPreview(true);
      setPreviewRequest(request);

      window.requestAnimationFrame(() => {
        previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (error) {
      setIsGeneratingPreview(false);
      setPersonalizationError(
        error instanceof Error
          ? error.message
          : "Não foi possível gerar a visualização da logo.",
      );
    }
  }

  function generateTextPreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedFormat) {
      setPersonalizationError("Selecione um formato primeiro.");
      return;
    }

    const cleanText = textValue.replace(/\r/g, "").trim();
    if (!cleanText) {
      setPersonalizationError("Digite a escrita que deseja no aplique.");
      return;
    }

    if (!editorReady || !selectedFont) {
      setPersonalizationError(
        "As fontes ainda estão carregando. Aguarde alguns segundos e tente novamente.",
      );
      return;
    }

    const request: PreviewRequest = {
      id: `text-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      kind: "text",
      svg: selectedFormat.svgData,
      autoText: cleanText,
      autoTextFont: selectedFont,
    };

    setPersonalizationError("");
    setIsGeneratingPreview(true);
    setEditorStatus("Centralizando e ajustando sua escrita automaticamente...");
    lastSentPreviewIdRef.current = null;
    setShowPreview(true);
    setPreviewRequest(request);

    window.requestAnimationFrame(() => {
      previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function handlePreviewError(event: SyntheticEvent<HTMLImageElement>) {
    event.currentTarget.style.display = "none";
    const fallback = event.currentTarget.nextElementSibling as HTMLElement | null;
    if (fallback) fallback.hidden = false;
  }

  return (
    <section className={styles.section} id="escolher-formato">
      <div className="container">
        <div className={styles.heading}>
          <div>
            <span className="eyebrow eyebrow--light">Etapa 1</span>
            <h2>Escolha o formato que combina com a sua marca</h2>
          </div>
          <p>
            Depois da escolha, você poderá enviar sua logo ou criar uma escrita
            personalizada. Por enquanto, o resultado será apenas visualizado.
          </p>
        </div>

        {loadError ? (
          <div className={styles.generalError}>
            <span>{loadError}</span>
            <button type="button" onClick={() => setReloadKey((value) => value + 1)}>
              Tentar novamente
            </button>
          </div>
        ) : null}

        <div className={styles.grid} aria-busy={isLoading}>
          {isLoading
            ? formats.map((format) => (
                <div className={styles.skeleton} key={format.sku}>
                  <span />
                  <strong />
                  <small />
                </div>
              ))
            : cards.map((format) => {
                const isSelected = format.sku === selectedSku;

                return (
                  <button
                    className={`${styles.card} ${
                      isSelected ? styles.cardSelected : ""
                    } ${!format.success ? styles.cardError : ""}`}
                    disabled={!format.success}
                    key={format.sku}
                    onClick={() => selectFormat(format)}
                    type="button"
                  >
                    <div className={styles.preview}>
                      {format.success ? (
                        <>
                          <Image
                            alt={`Prévia do formato ${format.title}`}
                            height={180}
                            onError={handlePreviewError}
                            src={createSvgPreviewUrl(format.svgData, materialColor)}
                            unoptimized
                            width={220}
                          />
                          <span className={styles.previewFallback} hidden>
                            Prévia indisponível
                          </span>
                        </>
                      ) : (
                        <span className={styles.previewFallback}>
                          Formato indisponível
                        </span>
                      )}
                    </div>

                    <div className={styles.cardContent}>
                      <span className={styles.sku}>{format.sku}</span>
                      <strong>{format.title}</strong>
                      <small>
                        {format.success ? format.description : format.error}
                      </small>
                    </div>

                    <span className={styles.cardAction}>
                      {isSelected ? "Formato selecionado" : "Escolher este formato"}
                      <span aria-hidden="true">→</span>
                    </span>
                  </button>
                );
              })}
        </div>

        {selectedFormat ? (
          <div className={styles.customizer} ref={customizerRef}>
            <header className={styles.customizerHeader}>
              <div>
                <span>Formato escolhido</span>
                <h3>{selectedFormat.title}</h3>
                <p>{selectedFormat.sku} · acrílico dourado</p>
              </div>
              <button onClick={closeCustomizer} type="button">
                Trocar formato
              </button>
            </header>

            <div className={styles.steps} aria-label="Etapas da personalização">
              <div className={styles.stepComplete}>
                <span>1</span>
                <strong>Formato</strong>
                <small>Concluído</small>
              </div>
              <div className={personalizationMode ? styles.stepComplete : styles.stepActive}>
                <span>2</span>
                <strong>Personalização</strong>
                <small>{personalizationMode ? "Escolhida" : "Agora"}</small>
              </div>
              <div className={showPreview ? styles.stepComplete : ""}>
                <span>3</span>
                <strong>Visualização</strong>
                <small>{showPreview ? "Gerada" : "Próxima"}</small>
              </div>
            </div>

            <div className={styles.customizerIntro}>
              <span className={styles.customizerKicker}>Etapa 2</span>
              <h3>Como você deseja personalizar?</h3>
              <p>
                Escolha uma opção. Você poderá trocar antes de finalizar esta
                visualização.
              </p>
            </div>

            <div className={styles.methodGrid}>
              <button
                className={`${styles.methodCard} ${
                  personalizationMode === "logo" ? styles.methodCardActive : ""
                }`}
                onClick={() => choosePersonalizationMode("logo")}
                type="button"
              >
                <span className={styles.methodIcon} aria-hidden="true">▧</span>
                <div>
                  <strong>Enviar minha logo</strong>
                  <small>
                    Envie PNG, JPG, WEBP ou SVG. O backend vetoriza e encaixa
                    automaticamente no formato.
                  </small>
                </div>
                <span className={styles.methodArrow} aria-hidden="true">→</span>
              </button>

              <button
                className={`${styles.methodCard} ${
                  personalizationMode === "text" ? styles.methodCardActive : ""
                }`}
                onClick={() => choosePersonalizationMode("text")}
                type="button"
              >
                <span className={styles.methodIcon} aria-hidden="true">Aa</span>
                <div>
                  <strong>Criar uma escrita</strong>
                  <small>
                    Digite o nome ou frase, escolha uma fonte e veja o texto
                    centralizado no espaço disponível.
                  </small>
                </div>
                <span className={styles.methodArrow} aria-hidden="true">→</span>
              </button>
            </div>

            {personalizationMode === "logo" ? (
              <form className={styles.formCard} onSubmit={generateLogoPreview}>
                <div className={styles.formHeading}>
                  <span>Opção escolhida</span>
                  <h4>Enviar sua logo</h4>
                  <p>
                    Logos nítidas e com bom contraste produzem um resultado melhor.
                    Arquivos SVG são usados diretamente, sem vetorização por IA.
                  </p>
                </div>

                <label
                  className={`${styles.uploadBox} ${
                    isDraggingLogo ? styles.uploadBoxDragging : ""
                  }`}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    setIsDraggingLogo(true);
                  }}
                  onDragLeave={(event) => {
                    event.preventDefault();
                    setIsDraggingLogo(false);
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={handleLogoDrop}
                >
                  <input
                    accept="image/png,image/jpeg,image/webp,image/svg+xml,.svg"
                    onChange={handleLogoInput}
                    type="file"
                  />
                  <span className={styles.uploadIcon} aria-hidden="true">↑</span>
                  {logoFile ? (
                    <div className={styles.fileSelected}>
                      <strong>{logoFile.name}</strong>
                      <small>{formatFileSize(logoFile.size)}</small>
                    </div>
                  ) : (
                    <div>
                      <strong>Clique ou arraste sua logo aqui</strong>
                      <small>PNG, JPG, WEBP ou SVG · máximo de 15 MB</small>
                    </div>
                  )}
                </label>

                <label className={styles.field}>
                  <span>Observação para a vetorização <small>(opcional)</small></span>
                  <input
                    maxLength={180}
                    onChange={(event) => setLogoPrompt(event.target.value)}
                    placeholder="Ex.: manter somente o símbolo e engrossar letras finas"
                    type="text"
                    value={logoPrompt}
                  />
                </label>

                <button
                  className={styles.generateButton}
                  disabled={!logoFile || isGeneratingPreview}
                  type="submit"
                >
                  {isGeneratingPreview ? "Preparando sua logo..." : "Gerar visualização da logo"}
                  <span aria-hidden="true">→</span>
                </button>
              </form>
            ) : null}

            {personalizationMode === "text" ? (
              <form className={styles.formCard} onSubmit={generateTextPreview}>
                <div className={styles.formHeading}>
                  <span>Opção escolhida</span>
                  <h4>Criar uma escrita</h4>
                  <p>
                    O editor transforma o texto em curvas, centraliza e amplia
                    automaticamente até o limite seguro do formato.
                  </p>
                </div>

                <label className={styles.field}>
                  <span>O que deseja escrever?</span>
                  <textarea
                    maxLength={90}
                    onChange={(event) => setTextValue(event.target.value)}
                    placeholder="Ex.: Ateliê da Ana"
                    rows={3}
                    value={textValue}
                  />
                  <small>{textValue.length}/90 caracteres · quebras de linha são permitidas</small>
                </label>

                <label className={styles.field}>
                  <span>Escolha a fonte</span>
                  <select
                    disabled={!editorReady}
                    onChange={(event) => setSelectedFont(event.target.value)}
                    style={{ fontFamily: selectedFont || undefined }}
                    value={selectedFont}
                  >
                    {!editorReady ? <option>Carregando fontes...</option> : null}
                    {editorReady && fontOptions.length === 0 ? (
                      <option value="">Nenhuma fonte disponível</option>
                    ) : null}
                    {editorReady
                      ? fontOptions.map((font) => (
                          <option key={font} style={{ fontFamily: font }} value={font}>
                            {font}
                          </option>
                        ))
                      : null}
                  </select>
                </label>

                <div className={styles.textSample}>
                  <span>Prévia da fonte</span>
                  <strong style={{ fontFamily: selectedFont || undefined }}>
                    {textValue.trim() || "Sua marca aqui"}
                  </strong>
                  <small>
                    Esta amostra mostra apenas a fonte. O encaixe verdadeiro aparece
                    na visualização do aplique.
                  </small>
                </div>

                <button
                  className={styles.generateButton}
                  disabled={
                    !textValue.trim() ||
                    !editorReady ||
                    !selectedFont ||
                    isGeneratingPreview
                  }
                  type="submit"
                >
                  {isGeneratingPreview
                    ? "Ajustando sua escrita..."
                    : "Gerar visualização da escrita"}
                  <span aria-hidden="true">→</span>
                </button>
              </form>
            ) : null}

            {personalizationError ? (
              <div className={styles.personalizationError} role="alert">
                <strong>Não foi possível continuar</strong>
                <span>{personalizationError}</span>
              </div>
            ) : null}

            <div
              className={`${styles.previewArea} ${
                showPreview ? styles.previewAreaVisible : styles.previewAreaHidden
              }`}
              ref={previewRef}
            >
              {showPreview ? (
                <div className={styles.previewHeader}>
                  <div>
                    <span>Etapa 3 · somente visualização</span>
                    <h3>Veja como seu aplique está ficando</h3>
                    <p>
                      Nenhuma edição, salvamento ou pedido é realizado nesta etapa.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowPreview(false);
                      setPreviewRequest(null);
                      setIsGeneratingPreview(false);
                      lastSentPreviewIdRef.current = null;
                    }}
                    type="button"
                  >
                    Alterar personalização
                  </button>
                </div>
              ) : null}

              {showPreview && editorStatus ? (
                <div className={styles.editorStatus} role="status">
                  <span className={styles.statusDot} />
                  {editorStatus}
                </div>
              ) : null}

              {editorUrl ? (
                <iframe
                  allow="clipboard-read; clipboard-write"
                  className={`${styles.editorFrame} ${
                    showPreview ? "" : styles.editorFrameHidden
                  }`}
                  ref={iframeRef}
                  src={editorUrl}
                  title={`Visualização do formato ${selectedFormat.title}`}
                />
              ) : (
                <div className={styles.editorLoading}>Preparando o visualizador...</div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
