# Hornerito — Branding & Design System

Referencia para mantener consistencia visual. Fuente de verdad: `src/theme/_tokens.scss`
(tokens CSS), `src/theme/_buttons.scss` (botones) y `src/styles.scss` (utilidades globales).

## Branding

- **Concepto**: inspirado en el hornero (Furnarius rufus) — ave de barro, cálida, hogareña.
- **Paleta**: escala tonal "canela" (crema → terracota → tierra), acento celeste pampa (`--hn-accent`).
  - Primario / CTA: `--hn-primary` (#c1783a), hover/strong: `--hn-primary-strong` (#a04e22).
  - Nunca usar hex hardcodeado para colores de marca/roles — siempre el token.
- **Tipografía**:
  - Títulos/headings: `--hn-font-head` (Bitter, serif) — usar clase utilitaria `.hn-head`.
  - Cuerpo/UI: `--hn-font-body` (Plus Jakarta Sans) — heredado por `body`, no reasignar.
- **Tono visual**: cálido, redondeado, sin bordes duros. Todo radio sale de `--hn-radius-*`
  (sm 10px, md 14px, lg 18px, xl 22px, pill 999px). No usar valores de radio arbitrarios.
- **Sombras**: usar `--hn-shadow-card` / `--hn-shadow-cta` / `--hn-shadow-fab` / `--hn-shadow-frame`
  según el elemento (card, CTA primario, FAB, marco de app) en vez de definir `box-shadow` a mano.
- **Modo**: solo claro. El tema Ionic (`src/theme/variables.css`) está atado a los tokens
  Hornerito — no importar la paleta oscura de Ionic.

## Tokens (`--hn-*`)

Categorías disponibles en `_tokens.scss`, todas variables CSS en `:root`:

| Categoría | Prefijo | Ejemplos |
|---|---|---|
| Marca / escala canela | `--hn-canela-*` | `--hn-canela-400` (primario base) |
| Roles | `--hn-primary`, `--hn-accent` | CTA, acento secundario |
| Superficies | `--hn-surface`, `--hn-card`, `--hn-input-bg` | fondos de sheet/card/input |
| Texto | `--hn-ink`, `--hn-text`, `--hn-muted` | jerarquía tipográfica |
| Bordes | `--hn-border`, `--hn-border-soft`, `--hn-border-line` | de más a menos marcado |
| Estados | `--hn-success-*`, `--hn-warning-*`, `--hn-danger-*` | siempre ink/bg/border juntos |
| Categorías insumos | `--hn-cat-*` | color por categoría de insumo/donación |
| Tipografía | `--hn-font-head`, `--hn-font-body` | |
| Radios | `--hn-radius-*` | |
| Sombras | `--hn-shadow-*` | |

Regla: si necesitás un color/radio/sombra nuevo, agregá un token en `_tokens.scss` (no un
valor suelto en el componente), salvo casos claramente puntuales (ej. colores de `STATUS`
por-instancia en `comedor.ts`, que son datos de dominio, no de marca).

## Utilidades globales (`src/styles.scss`)

Clases ya resueltas, usar antes de reescribir CSS:

- `.hn-head` — tipografía de heading (familia + peso + color).
- `.hn-label`, `.hn-input`, `.hn-textarea`, `.hn-select`, `.hn-field-error` — formularios.
- `.hn-card` — card estándar (fondo, borde, radio, sombra).
- `.hn-fill` — contenedor flex que ocupa el alto disponible con scroll interno.
- `.hn-scroll` — oculta scrollbar manteniendo scroll.
- Animaciones compartidas: `@keyframes hn-sheet`, `@keyframes hn-fade`.

## Botones (`.hn-btn`)

Base `.hn-btn` + un modificador de variante, nunca estilos de botón inline:

`--primary` (CTA principal) · `--strong` (FAB/acento) · `--outline` (secundario en fondo crema)
· `--white` (secundario sobre blanco) · `--danger` (peligro sólido) · `--danger-soft` (peligro suave)
· `--icon` (ícono cuadrado neutro). Modificador de layout: `--block` (100% ancho).

## Componentes compartidos (`src/app/shared/ui/*`)

Antes de construir un elemento de UI nuevo, revisar si ya existe: `badge`, `bottom-nav`,
`bottom-sheet`, `progress-bar`, `toast`, `top-bar`. Estos son los bloques de bajo nivel del
design system — cualquier patrón repetido (sheet/modal, badge de estado, barra de progreso)
se agrega ahí, no duplicado por feature.

`hn-bottom-sheet` es el ejemplo de referencia para responsive: mobile = sheet nativo
(slide-up, handle), desktop (`min-width: 768px`) = modal centrado. Cualquier overlay nuevo
debe seguir el mismo patrón en vez de quedar mobile-only.

## Iconografía

Emoji Unicode directos en template (`🍲`, `⏳`, `✓`, `✕`, `🗑️`), no librería de íconos. Mantener
esa convención para nueva UI salvo que el equipo decida migrar explícitamente.
