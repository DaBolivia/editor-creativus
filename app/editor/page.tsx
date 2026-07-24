"use client";

import { CrochetFormatSelector } from "@/components/CrochetFormatSelector";
import { useEffect, useRef } from "react";

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

export default function EditorIsolado() {
  const contentRef = useRef<HTMLDivElement>(null);
  const lastHeight = useRef<number>(0);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const sendHeight = () => {
      if (contentRef.current) {
        // getBoundingClientRect é a medição mais precisa que o navegador pode fornecer
        const height = contentRef.current.getBoundingClientRect().height;
        
        if (Math.abs(height - lastHeight.current) > 5) {
          lastHeight.current = height;
          window.parent.postMessage({ type: 'resize', height: height }, '*');
        }
      }
    };

    // Dá um tempo maior no carregamento inicial
    setTimeout(sendHeight, 300);

    const observer = new ResizeObserver(() => {
      // DEBOUNCE: Cancela a medição anterior e espera 150ms. 
      // Isso ignora os milissegundos em que a imagem ainda está gigante.
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        sendHeight();
      }, 150);
    });
    
    if (contentRef.current) {
      observer.observe(contentRef.current);
    }

    return () => {
      observer.disconnect();
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <main style={{ backgroundColor: "#F6EBEA" }}>
      {/* O height: "fit-content" força a caixa a abraçar o conteúdo bem apertado */}
      <div ref={contentRef} style={{ height: "fit-content", overflow: "hidden" }}>
        <CrochetFormatSelector formats={crochetFormats} materialColor="DOU" />
      </div>
    </main>
  );
}