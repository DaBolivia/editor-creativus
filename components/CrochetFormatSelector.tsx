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
  const containerRef = useRef<HTMLElement>(null); // REF adicionada para medir a altura

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
  const lastSentPreviewIdRef = useRef<string | null>(null);

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
            setLoadError("Nenhum dos formatos solicitados foi encontrado no backend.");
          }
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setLoadError(error instanceof Error ? error.message : "Não foi possível carregar os formatos.");
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
          setPersonalizationError(data.message || "O visualizador informou um erro.");
        }
      },
      () => iframeRef.current?.contentWindow || null,
    );
  }, [previewRequest?.id]);

  useEffect(() => {
    if (!isGeneratingPreview || !previewRequest) return;
    const timeoutMs = previewRequest.kind === "text" ? TEXT_PREVIEW_TIMEOUT_MS : LOGO_PREVIEW_TIMEOUT_MS;
    const timeout = window.setTimeout(() => {
      setIsGeneratingPreview(false);
      setPersonalizationError("A visualização demorou mais do que o esperado. Recarregue a prévia e tente novamente.");
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
            error instanceof Error ? error.message : "Não foi possível enviar a visualização ao editor.",
          );
        }
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [editorReady, materialColor, previewRequest]);

  // Mensageiro de Altura: Avisa o Elementor sempre que uma tela muda
  useEffect(() => {
    const sendHeight = () => {
      if (containerRef.current) {
        const height = containerRef.current.getBoundingClientRect().height;
        window.parent.postMessage({ type: 'resize', height: height }, '*');
      }
    };

    // Aguarda a tela renderizar e manda a altura
    const timerId = setTimeout(sendHeight, 150);
    return () => clearTimeout(timerId);
  }, [selectedSku, showPreview, personalizationMode, logoFile, isGeneratingPreview, isLoading]);

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
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Mantém no topo ao trocar de tela
  }

  function closeCustomizer() {
    setSelectedSku(null);
    resetPersonalization();
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    const accepted = file.type.startsWith("image/") || /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(file.name);
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
    if (!selectedFormat || !logoFile) {
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

      lastSentPreviewIdRef.current = null;
      setShowPreview(true);
      setPreviewRequest({
        id: `logo-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        kind: "logo",
        svg: result.finalSvg,
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      setIsGeneratingPreview(false);
      setPersonalizationError(error instanceof Error ? error.message : "Erro ao gerar logo.");
    }
  }

  function generateTextPreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedFormat) return;
    const cleanText = textValue.replace(/\r/g, "").trim();
    if (!cleanText) {
      setPersonalizationError("Digite a escrita que deseja no aplique.");
      return;
    }
    if (!editorReady || !selectedFont) {
      setPersonalizationError("As fontes ainda estão carregando. Aguarde e tente novamente.");
      return;
    }

    setPersonalizationError("");
    setIsGeneratingPreview(true);
    setEditorStatus("Centralizando e ajustando sua escrita automaticamente...");
    lastSentPreviewIdRef.current = null;
    setShowPreview(true);
    setPreviewRequest({
      id: `text-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      kind: "text",
      svg: selectedFormat.svgData,
      autoText: cleanText,
      autoTextFont: selectedFont,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handlePreviewError(event: SyntheticEvent<HTMLImageElement>) {
    event.currentTarget.style.display = "none";
    const fallback = event.currentTarget.nextElementSibling as HTMLElement | null;
    if (fallback) fallback.hidden = false;
  }

  // Estilo padronizado para os botões de voltar
  const btnVoltarStyle = {
    backgroundColor: "#933342",
    color: "#fff",
    padding: "8px 16px",
    borderRadius: "8px",
    border: "none",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: "14px"
  };

  return (
    <section 
      ref={containerRef} 
      className={styles.section} 
      id="escolher-formato" 
      style={{ padding: '45px 0 15px' }}
    >
      <div className="container">
        
        {/* TELA 1 - SELEÇÃO DE FORMATO (Fica oculta quando as outras estão ativas) */}
        <div style={{ display: (!selectedFormat && !showPreview) ? "block" : "none" }}>
          <div className={styles.heading}>
            <div>
              <span className="eyebrow eyebrow--light">Etapa 1</span>
              <h2>Escolha o formato que combina com a sua marca</h2>
            </div>
            <p>
              Depois da escolha, você poderá enviar sua logo ou criar uma escrita personalizada.
            </p>
          </div>

          {loadError && (
            <div className={styles.generalError}>
              <span>{loadError}</span>
              <button type="button" onClick={() => setReloadKey((value) => value + 1)}>
                Tentar novamente
              </button>
            </div>
          )}

          <div className={styles.grid} aria-busy={isLoading}>
            {isLoading
              ? formats.map((format) => (
                  <div className={styles.skeleton} key={format.sku}>
                    <span />
                    <strong />
                    <small />
                  </div>
                ))
              : cards.map((format) => (
                  <button
                    className={`${styles.card} ${!format.success ? styles.cardError : ""}`}
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
                        </>
                      ) : (
                        <span className={styles.previewFallback}>Formato indisponível</span>
                      )}
                    </div>
                    <div className={styles.cardContent}>
                      <span className={styles.sku}>{format.sku}</span>
                      <strong>{format.title}</strong>
                      <small>{format.success ? format.description : format.error}</small>
                    </div>
                    <span className={styles.cardAction}>
                      Escolher este formato <span aria-hidden="true">→</span>
                    </span>
                  </button>
                ))}
          </div>
        </div>

        {/* TELA 2 - CONFIGURAÇÃO DE UPLOAD/TEXTO */}
        {selectedFormat && (
          <div style={{ display: (!showPreview && selectedFormat) ? "block" : "none" }}>
            <header className={styles.customizerHeader} style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '12px', textTransform: 'uppercase', color: '#933342', fontWeight: 600 }}>Etapa 2 · Personalização</span>
                <h3 style={{ margin: '5px 0', fontSize: '24px' }}>{selectedFormat.title}</h3>
                <p style={{ margin: 0, color: '#666' }}>{selectedFormat.sku} · acrílico dourado</p>
              </div>
              <button onClick={closeCustomizer} style={btnVoltarStyle} type="button">
                ← Voltar aos modelos
              </button>
            </header>

            <div className={styles.methodGrid} style={{ marginTop: '30px' }}>
              <button
                className={`${styles.methodCard} ${personalizationMode === "logo" ? styles.methodCardActive : ""}`}
                onClick={() => choosePersonalizationMode("logo")}
                type="button"
              >
                <span className={styles.methodIcon} aria-hidden="true">▧</span>
                <div>
                  <strong>Enviar minha logo</strong>
                  <small>Envie PNG, JPG, WEBP ou SVG.</small>
                </div>
              </button>

              <button
                className={`${styles.methodCard} ${personalizationMode === "text" ? styles.methodCardActive : ""}`}
                onClick={() => choosePersonalizationMode("text")}
                type="button"
              >
                <span className={styles.methodIcon} aria-hidden="true">Aa</span>
                <div>
                  <strong>Criar uma escrita</strong>
                  <small>Digite o nome e escolha a fonte.</small>
                </div>
              </button>
            </div>

            {/* FORMULÁRIO LOGO */}
            {personalizationMode === "logo" && (
              <form className={styles.formCard} onSubmit={generateLogoPreview}>
                <div className={styles.formHeading}>
                  <h4>Enviar sua logo</h4>
                </div>
                <label className={`${styles.uploadBox} ${isDraggingLogo ? styles.uploadBoxDragging : ""}`} onDragEnter={(e) => { e.preventDefault(); setIsDraggingLogo(true); }} onDragLeave={(e) => { e.preventDefault(); setIsDraggingLogo(false); }} onDragOver={(e) => e.preventDefault()} onDrop={handleLogoDrop}>
                  <input accept="image/png,image/jpeg,image/webp,image/svg+xml,.svg" onChange={handleLogoInput} type="file" />
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
                  <input maxLength={180} onChange={(e) => setLogoPrompt(e.target.value)} type="text" value={logoPrompt} />
                </label>
                <button className={styles.generateButton} disabled={!logoFile || isGeneratingPreview} type="submit">
                  {isGeneratingPreview ? "Preparando sua logo..." : "Gerar visualização da logo"} <span aria-hidden="true">→</span>
                </button>
              </form>
            )}

            {/* FORMULÁRIO TEXTO */}
            {personalizationMode === "text" && (
              <form className={styles.formCard} onSubmit={generateTextPreview}>
                <div className={styles.formHeading}>
                  <h4>Criar uma escrita</h4>
                </div>
                <label className={styles.field}>
                  <span>O que deseja escrever?</span>
                  <textarea maxLength={90} onChange={(e) => setTextValue(e.target.value)} rows={3} value={textValue} />
                </label>
                <label className={styles.field}>
                  <span>Escolha a fonte</span>
                  <select disabled={!editorReady} onChange={(e) => setSelectedFont(e.target.value)} style={{ fontFamily: selectedFont || undefined }} value={selectedFont}>
                    {!editorReady && <option>Carregando fontes...</option>}
                    {editorReady && fontOptions.map((font) => (
                      <option key={font} style={{ fontFamily: font }} value={font}>{font}</option>
                    ))}
                  </select>
                </label>
                <button className={styles.generateButton} disabled={!textValue.trim() || !editorReady || !selectedFont || isGeneratingPreview} type="submit">
                  {isGeneratingPreview ? "Ajustando sua escrita..." : "Gerar visualização da escrita"} <span aria-hidden="true">→</span>
                </button>
              </form>
            )}

            {personalizationError && (
              <div className={styles.personalizationError} role="alert">
                <strong>Erro:</strong> <span>{personalizationError}</span>
              </div>
            )}
          </div>
        )}

        {/* TELA 3 - VISUALIZAÇÃO FINAL */}
        {selectedFormat && (
          <div style={{ display: showPreview ? "block" : "none" }}>
            <div className={styles.previewHeader} style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <span style={{ fontSize: '12px', textTransform: 'uppercase', color: '#933342', fontWeight: 600 }}>Etapa 3 · Tela de Visualização</span>
                <h3 style={{ margin: '5px 0', fontSize: '24px' }}>Veja como seu aplique ficou</h3>
              </div>
              
              <button
                onClick={() => {
                  setShowPreview(false);
                  setPreviewRequest(null);
                  setIsGeneratingPreview(false);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                type="button"
                style={btnVoltarStyle}
              >
                ← Voltar e alterar
              </button>
            </div>

            {showPreview && editorStatus && (
              <div className={styles.editorStatus} role="status">
                <span className={styles.statusDot} /> {editorStatus}
              </div>
            )}

            <div style={{ width: '100%', height: '700px', backgroundColor: '#fff', borderRadius: '12px', overflow: 'hidden' }}>
              {editorUrl ? (
                <iframe
                  allow="clipboard-read; clipboard-write"
                  className={styles.editorFrame}
                  ref={iframeRef}
                  src={editorUrl}
                  title={`Visualização do formato ${selectedFormat.title}`}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                />
              ) : (
                <div className={styles.editorLoading}>Preparando o visualizador...</div>
              )}
            </div>
          </div>
        )}

      </div>
    </section>
  );
}