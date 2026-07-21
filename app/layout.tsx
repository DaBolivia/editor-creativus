import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.creativusapliques.com.br"),
  title: {
    default: "Creativus Apliques Personalizados",
    template: "%s | Creativus Apliques",
  },
  description:
    "Apliques personalizados em acrílico para valorizar produtos artesanais, fortalecer sua marca e deixar cada peça inesquecível.",
  openGraph: {
    title: "Creativus Apliques Personalizados",
    description:
      "Apliques personalizados em acrílico para transformar produtos artesanais em marcas memoráveis.",
    type: "website",
    locale: "pt_BR",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
