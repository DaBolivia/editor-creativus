import { NextResponse } from "next/server";

const BACKEND_BASE_URL =
  "https://producao-arquivos-production-8a4d.up.railway.app";

const STORAGE_BASE_URL =
  "https://storage.googleapis.com/shopee-pedidos-backend.firebasestorage.app/master_formats";

const MAX_SKUS_PER_REQUEST = 20;
const BACKEND_TIMEOUT_MS = 10_000;
const STORAGE_TIMEOUT_MS = 7_000;

export const dynamic = "force-dynamic";

type LoadedFormat = {
  success: true;
  sku: string;
  svgData: string;
};

type FailedFormat = {
  success: false;
  sku: string;
  error: string;
};

type FormatResult = LoadedFormat | FailedFormat;

type BackendPayload = {
  success?: boolean;
  svgData?: string;
  message?: string;
  error?: string;
};

function normalizeSku(value: unknown): string {
  return String(value || "").trim().toUpperCase();
}

function isValidSku(value: string): boolean {
  return /^[A-Z0-9]+(?:-[A-Z0-9]+){2,}$/.test(value);
}

function isSvg(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /<svg[\s>]/i.test(value) &&
    /<\/svg>/i.test(value)
  );
}

async function fetchWithTimeout(
  url: string,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "application/json, image/svg+xml, text/plain;q=0.9, */*;q=0.8",
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function tryBackend(sku: string): Promise<string> {
  const response = await fetchWithTimeout(
    `${BACKEND_BASE_URL}/api/get-format?sku=${encodeURIComponent(sku)}`,
    BACKEND_TIMEOUT_MS,
  );

  const rawText = await response.text();
  let payload: BackendPayload = {};

  try {
    payload = JSON.parse(rawText) as BackendPayload;
  } catch {
    throw new Error(
      rawText || `O backend respondeu com HTTP ${response.status} sem JSON.`,
    );
  }

  if (!response.ok || payload.success !== true) {
    throw new Error(
      payload.message ||
        payload.error ||
        `O backend respondeu com HTTP ${response.status}.`,
    );
  }

  if (!isSvg(payload.svgData)) {
    throw new Error("O backend não retornou um SVG válido.");
  }

  return payload.svgData;
}

async function tryPublicStorage(sku: string): Promise<string> {
  const response = await fetchWithTimeout(
    `${STORAGE_BASE_URL}/${encodeURIComponent(sku)}.svg`,
    STORAGE_TIMEOUT_MS,
  );

  if (!response.ok) {
    throw new Error(`Storage respondeu com HTTP ${response.status}.`);
  }

  const svg = await response.text();

  if (!isSvg(svg)) {
    throw new Error("O arquivo encontrado no Storage não é um SVG válido.");
  }

  return svg;
}

async function loadFormat(sku: string): Promise<FormatResult> {
  try {
    const svgData = await tryBackend(sku);
    return { success: true, sku, svgData };
  } catch (backendError) {
    try {
      const svgData = await tryPublicStorage(sku);
      return { success: true, sku, svgData };
    } catch (storageError) {
      const backendMessage =
        backendError instanceof Error ? backendError.message : "erro desconhecido";
      const storageMessage =
        storageError instanceof Error ? storageError.message : "erro desconhecido";

      return {
        success: false,
        sku,
        error: `Backend: ${backendMessage} Storage: ${storageMessage}`,
      };
    }
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { skus?: unknown };
    const rawSkus = Array.isArray(body.skus) ? body.skus : [];
    const skus = [...new Set(rawSkus.map(normalizeSku).filter(Boolean))];

    if (skus.length === 0) {
      return NextResponse.json(
        { success: false, error: "Envie ao menos um SKU." },
        { status: 400 },
      );
    }

    if (skus.length > MAX_SKUS_PER_REQUEST) {
      return NextResponse.json(
        {
          success: false,
          error: `Envie no máximo ${MAX_SKUS_PER_REQUEST} SKUs por chamada.`,
        },
        { status: 400 },
      );
    }

    const invalidSku = skus.find((sku) => !isValidSku(sku));
    if (invalidSku) {
      return NextResponse.json(
        { success: false, error: `SKU inválido: ${invalidSku}` },
        { status: 400 },
      );
    }

    const data = await Promise.all(skus.map(loadFormat));

    return NextResponse.json(
      { success: true, data },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro inesperado ao carregar formatos.",
      },
      { status: 500 },
    );
  }
}
