# Creativus — arquivos da landing page

Este pacote foi feito para um projeto criado com:

```bash
npx create-next-app@latest .
```

Configuração esperada:

- Next.js com App Router
- TypeScript
- pasta `app`
- alias padrão `@/*`

## Como aplicar

1. Feche o servidor local com `Ctrl + C`, caso ele esteja aberto.
2. Extraia o ZIP.
3. Copie as pastas `app` e `components` para a raiz do seu projeto.
4. Quando o Windows perguntar, confirme a substituição dos arquivos existentes.
5. Execute:

```bash
npm run dev
```

6. Abra:

```text
http://localhost:3000
```

A landing de crochê estará em:

```text
http://localhost:3000/apliques-croche-personalizados
```

## Arquivos modificados

- `app/layout.tsx`
- `app/page.tsx`
- `app/globals.css`

## Arquivos criados

- `app/apliques-croche-personalizados/page.tsx`
- `components/Brand.tsx`
- `components/CrochetVisual.tsx`
- `components/FormatSelectorPreview.tsx`

## Observações

- Não é necessário instalar nenhuma biblioteca extra.
- A seção “Escolher formato” é apenas uma prévia visual e está desativada de propósito.
- O domínio presente em `metadataBase` dentro de `app/layout.tsx` é provisório. Troque pelo domínio real quando publicar.
- Os desenhos dos apliques foram feitos diretamente com CSS e SVG. Depois, podem ser substituídos por fotos reais dos seus produtos.
