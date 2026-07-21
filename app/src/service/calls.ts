export const PUBLIC_SVG_EDITOR_URL =
  "https://merry-bublanina-04dad8.netlify.app/svg-editor";

export const PUBLIC_SVG_EDITOR_ORIGIN =
  "https://merry-bublanina-04dad8.netlify.app";

const FORMATS_PROXY_URL = "/api/creativus/formats";
const ADJUST_LOGO_PROXY_URL = "/api/creativus/adjust-logo";
const FORMATS_REQUEST_TIMEOUT_MS = 22_000;
const LOGO_REQUEST_TIMEOUT_MS = 120_000;

export const SVG_EDITOR_MESSAGE_TYPES = {
  READY: "CREATIVUS_SVG_EDITOR_READY",
  LOAD: "CREATIVUS_SVG_EDITOR_LOAD",
  REQUEST_EXPORT: "CREATIVUS_SVG_EDITOR_REQUEST_EXPORT",
  EXPORT: "CREATIVUS_SVG_EDITOR_EXPORT",
  PREVIEW_READY: "CREATIVUS_SVG_EDITOR_PREVIEW_READY",
  ERROR: "CREATIVUS_SVG_EDITOR_ERROR",
} as const;

export type AcrylicMaterialColor = "DOU" | "ROS" | "PRA" | "";

export type LoadedFormat = {
  success: true;
  sku: string;
  svgData: string;
};

export type FailedFormat = {
  success: false;
  sku: string;
  error: string;
};

export type FormatLoadResult = LoadedFormat | FailedFormat;

export type AdjustedLogoResult = {
  success: true;
  sku: string;
  finalSvg: string;
  rawLogoSvg?: string;
};

type FormatsProxyResponse = {
  success?: boolean;
  data?: FormatLoadResult[];
  message?: string;
  error?: string;
};

type AdjustLogoProxyResponse = {
  success?: boolean;
  sku?: string;
  finalSvg?: string;
  rawLogoSvg?: string;
  message?: string;
  error?: string;
};

type EditorWindow = Pick<Window, "postMessage">;

export type PublicSvgEditorMessage = {
  type?: string;
  svg?: string;
  message?: string;
  requestId?: string | null;
  accepts?: string[];
  returns?: string;
  fonts?: string[];
  previewKind?: "logo" | "text" | "format" | string;
};

export type PublicSvgEditorLoadOptions = {
  materialColor?: AcrylicMaterialColor;
  readOnly?: boolean;
  presentationMode?: boolean;
  autoText?: string;
  autoTextFont?: string;
  autoApplyText?: boolean;
  previewKind?: "logo" | "text" | "format";
  requestId?: string;
};

function normalizeSku(sku: string): string {
  return String(sku || "").trim().toUpperCase();
}

function isSvg(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /<svg[\s>]/i.test(value) &&
    /<\/svg>/i.test(value)
  );
}

function createRequestController(
  timeoutMs: number,
  externalSignal?: AbortSignal,
) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(new Error("Tempo limite excedido.")),
    timeoutMs,
  );

  const abortFromExternalSignal = () => controller.abort(externalSignal?.reason);

  if (externalSignal) {
    if (externalSignal.aborted) {
      abortFromExternalSignal();
    } else {
      externalSignal.addEventListener("abort", abortFromExternalSignal, {
        once: true,
      });
    }
  }

  return {
    signal: controller.signal,
    dispose() {
      clearTimeout(timeout);
      externalSignal?.removeEventListener("abort", abortFromExternalSignal);
    },
  };
}

/**
 * Busca somente os SKUs recebidos pela página.
 * A chamada externa fica protegida por uma Route Handler do próprio Next.
 */
export async function getFormatsBySkus(
  skus: readonly string[],
  signal?: AbortSignal,
): Promise<FormatLoadResult[]> {
  const normalizedSkus = skus.map(normalizeSku).filter(Boolean);

  if (normalizedSkus.length === 0) return [];

  const requestController = createRequestController(
    FORMATS_REQUEST_TIMEOUT_MS,
    signal,
  );

  try {
    const response = await fetch(FORMATS_PROXY_URL, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ skus: normalizedSkus }),
      signal: requestController.signal,
    });

    const rawText = await response.text();
    let payload: FormatsProxyResponse = {};

    try {
      payload = JSON.parse(rawText) as FormatsProxyResponse;
    } catch {
      throw new Error(
        rawText || `A landing respondeu com HTTP ${response.status} sem JSON.`,
      );
    }

    if (!response.ok || payload.success !== true || !Array.isArray(payload.data)) {
      throw new Error(
        payload.error ||
          payload.message ||
          `Não foi possível carregar os formatos. HTTP ${response.status}.`,
      );
    }

    const resultBySku = new Map(
      payload.data.map((result) => [normalizeSku(result.sku), result]),
    );

    return normalizedSkus.map(
      (sku): FormatLoadResult =>
        resultBySku.get(sku) || {
          success: false,
          sku,
          error: "A resposta não trouxe este formato.",
        },
    );
  } catch (error) {
    if (signal?.aborted) throw error;

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(
        "A busca dos formatos excedeu o tempo limite. Verifique o backend e tente novamente.",
      );
    }

    throw error;
  } finally {
    requestController.dispose();
  }
}

/**
 * Envia a logo escolhida para o proxy da landing. O proxy encaminha a imagem
 * ao endpoint /api/vectorize-logo-adjusted, que vetoriza e encaixa no SKU.
 */
export async function getAdjustedLogoForFormat(input: {
  logo: File;
  sku: string;
  prompt?: string;
  signal?: AbortSignal;
}): Promise<AdjustedLogoResult> {
  const sku = normalizeSku(input.sku);

  if (!sku) throw new Error("Selecione um formato antes de enviar a logo.");
  if (!(input.logo instanceof File) || input.logo.size <= 0) {
    throw new Error("Selecione um arquivo de logo válido.");
  }

  const requestController = createRequestController(
    LOGO_REQUEST_TIMEOUT_MS,
    input.signal,
  );

  const form = new FormData();
  form.append("logo", input.logo, input.logo.name);
  form.append("sku", sku);
  if (input.prompt?.trim()) form.append("prompt", input.prompt.trim());

  try {
    const response = await fetch(ADJUST_LOGO_PROXY_URL, {
      method: "POST",
      cache: "no-store",
      body: form,
      signal: requestController.signal,
    });

    const rawText = await response.text();
    let payload: AdjustLogoProxyResponse = {};

    try {
      payload = JSON.parse(rawText) as AdjustLogoProxyResponse;
    } catch {
      throw new Error(
        rawText || `A landing respondeu com HTTP ${response.status} sem JSON.`,
      );
    }

    if (!response.ok || payload.success !== true) {
      throw new Error(
        payload.error ||
          payload.message ||
          `Não foi possível ajustar a logo. HTTP ${response.status}.`,
      );
    }

    if (!isSvg(payload.finalSvg)) {
      throw new Error(
        "O backend processou a logo, mas não retornou a composição ajustada no formato.",
      );
    }

    return {
      success: true,
      sku: normalizeSku(payload.sku || sku),
      finalSvg: payload.finalSvg,
      ...(isSvg(payload.rawLogoSvg) ? { rawLogoSvg: payload.rawLogoSvg } : {}),
    };
  } catch (error) {
    if (input.signal?.aborted) throw error;

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(
        "O processamento da logo excedeu o tempo limite. Tente novamente com uma imagem mais nítida ou um arquivo SVG.",
      );
    }

    throw error;
  } finally {
    requestController.dispose();
  }
}

export function buildPublicSvgEditorUrl(
  targetOrigin: string,
  materialColor: AcrylicMaterialColor = "DOU",
): string {
  const url = new URL(PUBLIC_SVG_EDITOR_URL);
  url.searchParams.set("targetOrigin", targetOrigin);

  if (materialColor) url.searchParams.set("materialColor", materialColor);

  return url.toString();
}

export function loadSvgInPublicEditor(
  editorWindow: EditorWindow,
  svg: string,
  materialOrOptions: AcrylicMaterialColor | PublicSvgEditorLoadOptions = "DOU",
): void {
  if (!isSvg(svg)) {
    throw new Error("Não é possível abrir a visualização sem um SVG válido.");
  }

  const options: PublicSvgEditorLoadOptions =
    typeof materialOrOptions === "string"
      ? { materialColor: materialOrOptions }
      : materialOrOptions;

  editorWindow.postMessage(
    {
      type: SVG_EDITOR_MESSAGE_TYPES.LOAD,
      svg,
      materialColor: options.materialColor || "DOU",
      readOnly: options.readOnly === true,
      presentationMode: options.presentationMode === true,
      autoText: options.autoText || "",
      autoTextFont: options.autoTextFont || "",
      autoApplyText: options.autoApplyText === true,
      previewKind: options.previewKind || "format",
      requestId: options.requestId || null,
    },
    PUBLIC_SVG_EDITOR_ORIGIN,
  );
}

export function requestSvgFromPublicEditor(
  editorWindow: EditorWindow,
  requestId = `creativus-export-${Date.now()}`,
): string {
  editorWindow.postMessage(
    {
      type: SVG_EDITOR_MESSAGE_TYPES.REQUEST_EXPORT,
      requestId,
    },
    PUBLIC_SVG_EDITOR_ORIGIN,
  );

  return requestId;
}

export function isMessageFromPublicSvgEditor(event: MessageEvent): boolean {
  return event.origin === PUBLIC_SVG_EDITOR_ORIGIN;
}

export function subscribeToPublicSvgEditorMessages(
  handler: (
    data: PublicSvgEditorMessage,
    event: MessageEvent<PublicSvgEditorMessage>,
  ) => void,
  getExpectedSource?: () => MessageEventSource | null,
): () => void {
  const listener = (event: MessageEvent<PublicSvgEditorMessage>) => {
    if (!isMessageFromPublicSvgEditor(event)) return;

    const expectedSource = getExpectedSource?.();
    if (expectedSource && event.source !== expectedSource) return;

    handler(event.data || {}, event);
  };

  window.addEventListener("message", listener);
  return () => window.removeEventListener("message", listener);
}
