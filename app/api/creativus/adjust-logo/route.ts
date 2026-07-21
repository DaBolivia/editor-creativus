import { NextResponse } from "next/server";

const BACKEND_URL =
  "https://producao-arquivos-production-8a4d.up.railway.app/api/vectorize-logo-adjusted";

const MAX_LOGO_SIZE_BYTES = 15 * 1024 * 1024;
const BACKEND_TIMEOUT_MS = 110_000;

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type BackendPayload = {
  success?: boolean;
  finalSvg?: string;
  rawLogoSvg?: string;
  message?: string;
  error?: string;
};

function normalizeSku(value: FormDataEntryValue | null): string {
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

function isAcceptedLogo(file: File): boolean {
  const type = String(file.type || "").toLowerCase();
  const name = file.name.toLowerCase();

  return (
    type.startsWith("image/") ||
    type === "image/svg+xml" ||
    /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(name)
  );
}

export async function POST(request: Request) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), BACKEND_TIMEOUT_MS);

  try {
    const incoming = await request.formData();
    const logoEntry = incoming.get("logo");
    const sku = normalizeSku(incoming.get("sku"));
    const prompt = String(incoming.get("prompt") || "").trim();

    if (!sku || !isValidSku(sku)) {
      return NextResponse.json(
        { success: false, error: "Selecione um SKU válido." },
        { status: 400 },
      );
    }

    if (!(logoEntry instanceof File) || logoEntry.size <= 0) {
      return NextResponse.json(
        { success: false, error: "Envie uma logo válida no campo logo." },
        { status: 400 },
      );
    }

    if (!isAcceptedLogo(logoEntry)) {
      return NextResponse.json(
        {
          success: false,
          error: "Formato não aceito. Envie PNG, JPG, WEBP ou SVG.",
        },
        { status: 415 },
      );
    }

    if (logoEntry.size > MAX_LOGO_SIZE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: "A logo deve ter no máximo 15 MB.",
        },
        { status: 413 },
      );
    }

    const upstreamForm = new FormData();
    upstreamForm.append("logo", logoEntry, logoEntry.name);
    upstreamForm.append("sku", sku);

    const isVectorized =
      logoEntry.type.toLowerCase() === "image/svg+xml" ||
      logoEntry.name.toLowerCase().endsWith(".svg");

    upstreamForm.append("isLogoVectorized", isVectorized ? "true" : "false");
    if (prompt) upstreamForm.append("prompt", prompt);

    const response = await fetch(BACKEND_URL, {
      method: "POST",
      cache: "no-store",
      body: upstreamForm,
      signal: controller.signal,
    });

    const rawText = await response.text();
    let payload: BackendPayload = {};

    try {
      payload = JSON.parse(rawText) as BackendPayload;
    } catch {
      return NextResponse.json(
        {
          success: false,
          error:
            rawText ||
            `O backend respondeu com HTTP ${response.status} sem JSON.`,
        },
        { status: response.ok ? 502 : response.status },
      );
    }

    if (!response.ok || payload.success !== true) {
      return NextResponse.json(
        {
          success: false,
          error:
            payload.error ||
            payload.message ||
            `O backend respondeu com HTTP ${response.status}.`,
        },
        { status: response.status || 502 },
      );
    }

    if (!isSvg(payload.finalSvg)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "A logo foi processada, mas não foi possível encaixá-la na área útil deste formato. Confira se o SVG mestre possui a linha roxa #A8518A.",
          rawLogoSvg: isSvg(payload.rawLogoSvg) ? payload.rawLogoSvg : undefined,
        },
        { status: 422 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        sku,
        finalSvg: payload.finalSvg,
        ...(isSvg(payload.rawLogoSvg)
          ? { rawLogoSvg: payload.rawLogoSvg }
          : {}),
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return NextResponse.json(
        {
          success: false,
          error:
            "O processamento da logo excedeu o tempo limite. Tente novamente com uma imagem mais nítida ou com um SVG.",
        },
        { status: 504 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro inesperado ao processar a logo.",
      },
      { status: 500 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
