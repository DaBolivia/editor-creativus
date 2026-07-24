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

  useEffect(() => {
    const sendHeight = () => {
      if (contentRef.current) {
        const height = contentRef.current.offsetHeight;
        window.parent.postMessage({ type: 'resize', height: height }, '*');
      }
    };

    setTimeout(sendHeight, 150);

    const observer = new ResizeObserver(() => {
      sendHeight();
    });
    
    if (contentRef.current) {
      observer.observe(contentRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <main style={{ backgroundColor: "#F6EBEA", overflow: "hidden" }}>
      <div ref={contentRef}>
        <CrochetFormatSelector formats={crochetFormats} materialColor="DOU" />
      </div>
    </main>
  );
}