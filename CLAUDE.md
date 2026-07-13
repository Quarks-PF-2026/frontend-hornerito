# Hornerito Frontend — guía para Claude

Angular 22 standalone + Ionic 8. Sin NgModules.

## Estructura (obligatoria)

Seguir la estructura existente, no inventar una nueva:

```
src/app/
  core/           servicios de app-wide, guards, interceptors, modelos (models/), utilidades
  features/<feature>/pages/<page>/  páginas ruteadas: <page>.ts + .html + .scss
  shared/
    ui/<component>/    componentes de presentación reutilizables (design system)
    directives/
    pipes/
```

- Componente de página nueva → `features/<feature>/pages/<nombre>/` con los 3 archivos
  (`.ts`, `.html`, `.scss`), templateUrl/styleUrl separados (no template inline salvo
  componentes de UI muy chicos, como en `shared/ui/*`).
- Componente de UI reutilizable nuevo → `shared/ui/<nombre>/`, selector `hn-<nombre>`.
- Selector de página/feature → `app-<nombre>`.
- Lógica de dominio/estado compartido → servicio en `core/services/`, inyectado con `inject()`,
  no en el componente.
- Nombres de archivo sin sufijo `.component`/`.page`/`.service` (ej. `comedor.ts`, no
  `comedor.component.ts`) — coherente con lo ya presente en el repo.

## Convenciones de componente

- `ChangeDetectionStrategy.OnPush` siempre.
- Signals: `input()`, `output()`, `computed()`, `signal()` — no `@Input()`/`@Output()`
  decorators, no `EventEmitter` manual.
- DI con `inject()` en el cuerpo de la clase, no constructor injection.
- Standalone por defecto (no declarar `standalone: true` explícito si ya es el default de
  la versión de Angular en uso; revisar cómo están los componentes existentes antes de asumir).
- Estado de UI derivado con `computed()`, no recalculado en el template.

## Design system (obligatorio)

Ver `DESIGN_SYSTEM.md` en la raíz del frontend antes de escribir CSS o markup nuevo. Reglas
duras:

1. **Nunca hardcodear color/radio/sombra de marca.** Usar los tokens `--hn-*` de
   `src/theme/_tokens.scss`. Si falta un token, agregarlo ahí, no un valor suelto en el
   componente.
2. **Reusar utilidades globales antes de escribir CSS nuevo**: `.hn-head`, `.hn-label`,
   `.hn-input`/`.hn-textarea`/`.hn-select`, `.hn-card`, `.hn-btn` + modificador (`--primary`,
   `--outline`, `--white`, `--danger`, `--danger-soft`, `--icon`, `--block`), `.hn-fill`,
   `.hn-scroll`.
3. **Revisar `shared/ui/*` antes de construir un elemento de UI nuevo** (badge, bottom-sheet,
   bottom-nav, progress-bar, toast, top-bar). Un patrón repetido va ahí, no duplicado por
   feature.
4. **Overlays (sheet/modal/drawer) deben ser responsive** siguiendo el patrón de
   `hn-bottom-sheet`: mobile = comportamiento nativo actual, desktop (`min-width: 768px`) =
   presentación tipo modal centrado. No dejar componentes nuevos mobile-only si se muestran
   también en desktop.
5. Tipografía: headings con `--hn-font-head` (clase `.hn-head`), cuerpo con `--hn-font-body`
   (heredado, no reasignar por componente).

## Al agregar código

- Antes de crear un componente, service o util nuevo: buscar si ya existe algo similar en
  `shared/` o `core/` y extenderlo/reusarlo en vez de duplicar.
- No introducir una librería de UI, iconos o CSS (Tailwind, Material, Font Awesome, etc.)
  sin acuerdo explícito — el design system actual es CSS custom + tokens + emoji como
  iconografía.
