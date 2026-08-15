# CLAUDE.md — frontend-hornerito

Este archivo tiene **precedencia máxima** y sobrescribe el flujo por defecto de skills y commands genéricos (`superpowers`, `/feature-dev`): esos describen CÓMO trabaja un agente *dentro* de una capa, no habilitan trabajo inline fuera del fast path (§1). Los skills de proceso (`brainstorming`, `writing-plans`, `systematic-debugging`) **no se disparan en fast path ni en tareas triviales** — se reservan para features nuevas grandes o debugging real. No metas ceremonia en cambios chicos.

**Stack**: Angular 22 standalone (cero NgModules) + Ionic 8. Signals como state management, sin NgRx. Vitest 4 vía `@angular/build:unit-test`. Prettier sin ESLint. PWA con service worker. Deploy en Vercel.

**Proyecto**: final de grado de ingeniería, 6 integrantes. El objetivo no es satisfacer a un cliente sino **demostrar y justificar decisiones de ingeniería**. Nada de parches ni soluciones temporales salvo pedido explícito del usuario. Tampoco sobre-ingeniería: KISS y YAGNI mandan.

Este repo es el par de `../backend-hornerito`. Ambos `CLAUDE.md` usan la **misma numeración de secciones** para poder referenciarse entre sí como "backend §N" / "front §N".

---

## 1. Ruteo — una pregunta antes de tu primera acción

¿La tarea toca una **zona crítica**? → **DELEGÁ** al agente. Si no → **fast path** (editás vos).

| Zona crítica | Agente |
|---|---|
| `src/app/core/services/auth.service.ts`, sesión, token | `angular-ionic-expert` |
| `src/app/core/guards/`, `src/app/core/interceptors/` | `angular-ionic-expert` |
| `src/app/app.routes.ts`, `src/app/app.config.ts` | `angular-ionic-expert` |
| Service worker / PWA (`ngsw-config.json`, `provideServiceWorker`) | `angular-ionic-expert` |
| Cualquier cambio que toque el contrato con el backend | `contract-checker` **primero**, después `angular-ionic-expert` |
| Regla de negocio (antes de reflejarla en la UI) | `hornerito-domain-expert` |
| Docs de conocimiento (§1, último párrafo) | `docs-keeper` |
| Cierre de tarea en zona crítica o lógica no trivial | `code-reviewer` |

**Fast path — editás inline, sin delegar:** leer, explorar y responder; un componente de página que sigue el patrón existente; estilos que usan tokens y utilidades ya definidos; copy y textos; corregir un typo; un `.md` que no sea doc de conocimiento; config de una línea evidente.

**Regla de oro:** delegar protege las zonas donde un error rompe la sesión de todos los usuarios, deja la app cacheada en una versión rota o desincroniza el front del backend en silencio. Fuera de ellas la fricción no aporta seguridad — editá directo. Ante duda de si una zona es crítica, tratala como crítica. La única edición directa de zona crítica permitida es aplicar textual un parche que un agente ya te devolvió.

**Docs de conocimiento — nunca inline.** `CLAUDE.md`, `DESIGN_SYSTEM.md`, `.claude/AGENTS.md`, `.claude/agents/*.md`, `.claude/README.md` se editan **siempre** vía `docs-keeper`, aunque el cambio parezca de una línea. Es el único actor que deduplica y ubica sin repetir la misma regla en cuatro archivos.

---

## 2. Estructura (obligatoria)

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

- Componente de página nueva → `features/<feature>/pages/<nombre>/` con los 3 archivos (`.ts`, `.html`, `.scss`), templateUrl/styleUrl separados (no template inline salvo componentes de UI muy chicos, como en `shared/ui/*`).
- Componente de UI reutilizable nuevo → `shared/ui/<nombre>/`, selector `hn-<nombre>`.
- Selector de página/feature → `app-<nombre>`.
- Lógica de dominio/estado compartido → servicio en `core/services/`, inyectado con `inject()`, no en el componente.
- Nombres de archivo sin sufijo `.component`/`.page`/`.service` (ej. `comedor.ts`, no `comedor.component.ts`) — coherente con lo ya presente en el repo. La excepción histórica son los archivos de `core/guards/` e `core/interceptors/`, que sí llevan `.guard.ts` / `.interceptor.ts`: respetá lo que hay en cada carpeta.
- Toda ruta se carga con `loadComponent()` lazy. No hay imports eager de páginas en `app.routes.ts`.

**Antes de crear** un componente, servicio o util nuevo: buscá si ya existe algo similar en `shared/` o `core/` y extendelo o reusalo en vez de duplicar.

**No introducir una librería de UI, iconos o CSS** (Tailwind, Material, Font Awesome, etc.) sin acuerdo explícito del equipo — el design system actual es CSS custom + tokens + emoji como iconografía. Lo mismo vale para una librería de state management: los signals alcanzan (§5).

---

## 3. Convenciones de componente

- `ChangeDetectionStrategy.OnPush` **siempre**.
- Signals: `input()`, `output()`, `computed()`, `signal()`. **Nunca** `@Input()`/`@Output()` como decoradores ni `EventEmitter` manual.
- DI con `inject()` en el cuerpo de la clase, no constructor injection.
- Standalone por defecto (no declarar `standalone: true` explícito si ya es el default de la versión de Angular en uso; revisar cómo están los componentes existentes antes de asumir).
- Estado de UI derivado con `computed()`, no recalculado en el template. Una llamada a método dentro de una interpolación se re-evalúa en cada ciclo de detección: si el valor deriva de signals, va en un `computed()`.
- **Idioma**: código e identificadores en inglés; textos visibles al usuario, comentarios y valores de negocio en español. Los nombres de ruta y de carpeta de feature están en español (`necesidades`, `donaciones`) porque son vocabulario del dominio — mantenelo.
- **Comentarios**: explican el *porqué* y el trade-off, no el qué. Buenos ejemplos en `src/app/core/services/auth.service.ts` (por qué el rol es solo para el menú) y en `src/app/core/services/auth.service.spec.ts` (por qué se limpia `localStorage`). Sostené ese nivel.
- Formato: Prettier (`.prettierrc`). **No hay ESLint en este repo** — no inventes reglas de lint ni sugieras correr `npm run lint`, no existe.
- `tsconfig.json` **no tiene `"strict": true`**. Es deuda conocida: no te apoyes en el compilador para atrapar `null`/`undefined`, chequealos vos.

---

## 4. Design system

**Fuente de verdad: `DESIGN_SYSTEM.md` en la raíz.** Leelo antes de escribir CSS o markup nuevo. Ahí viven los tokens `--hn-*`, las utilidades globales, los modificadores de `.hn-btn`, el inventario de `shared/ui/*` y la iconografía. Acá no se duplican.

Las cinco reglas duras, resumidas en una línea cada una — el detalle está en `DESIGN_SYSTEM.md`:

1. **Nunca hardcodear color/radio/sombra de marca.** Usar los tokens `--hn-*` de `src/theme/_tokens.scss`. Si falta un token, agregarlo ahí, no un valor suelto en el componente.
2. **Reusar utilidades globales antes de escribir CSS nuevo**: `.hn-head`, `.hn-label`, `.hn-input`/`.hn-textarea`/`.hn-select`, `.hn-card`, `.hn-btn` + modificador (`--primary`, `--outline`, `--white`, `--danger`, `--danger-soft`, `--icon`, `--block`), `.hn-fill`, `.hn-scroll`.
3. **Revisar `shared/ui/*` antes de construir un elemento de UI nuevo** (badge, bottom-sheet, bottom-nav, image-upload, map-picker, progress-bar, toast, top-bar). Un patrón repetido va ahí, no duplicado por feature.
4. **Overlays (sheet/modal/drawer) deben ser responsive** siguiendo el patrón de `hn-bottom-sheet`: mobile = comportamiento nativo actual, desktop (`min-width: 768px`) = presentación tipo modal centrado. No dejar componentes nuevos mobile-only si se muestran también en desktop.
5. **Tipografía**: headings con `--hn-font-head` (clase `.hn-head`), cuerpo con `--hn-font-body` (heredado, no reasignar por componente).

`DESIGN_SYSTEM.md` se cambia **con acuerdo del equipo**, no por iniciativa de un agente: `settings.json` lo pone en `ask` a propósito.

**Deuda conocida:** hay colores hardcodeados en `needs.service.ts` (`barColor`, `badgeBg`, `badgeInk`) y en `shared/ui/badge`. Están fuera de tokens. No los repliques en código nuevo; si tocás esos archivos, es buena oportunidad para migrarlos a tokens.

---

## 5. Estado y datos — el patrón signal store

No hay NgRx ni ninguna librería de estado, y no se va a agregar. El estado compartido vive en servicios `providedIn: 'root'` con este patrón, del que `src/app/core/services/needs.service.ts` es el **ejemplo canónico**:

- Un `signal()` **privado** con el estado crudo: `private readonly _needs = signal<Need[]>([])`.
- Su lectura pública **readonly**: `readonly needs = this._needs.asReadonly()`. Nadie de afuera escribe el signal.
- Los derivados con `computed()`: `views`, `openViews`. Toda transformación para la vista se calcula acá, no en el componente ni en el template.
- Los métodos HTTP devuelven el `Observable` y actualizan el signal en un `tap()`. El componente se suscribe para saber cuándo terminó; el estado ya se actualizó solo.
- `find(id)` y helpers de lectura sincrónica leen del signal, no re-piden al backend.

**Todo servicio nuevo sigue este patrón.** Si tu servicio no tiene estado que sobreviva a un componente (por ejemplo `geocoding.service.ts`), puede ser un wrapper HTTP puro sin signals — pero si guarda algo, lo guarda así.

Los componentes **no** guardan estado de dominio en propiedades comunes: o es un signal local de UI, o vive en el servicio.

---

## 6. Contrato con el backend

- **Base URL por environment**: `src/environments/environment.development.ts` apunta a `http://localhost:3000`; `environment.ts` (producción) apunta a `/api`. Los servicios leen `environment.apiUrl`, nunca una URL literal.
- **El rewrite lo hace Vercel**: `vercel.json` mapea `/api/(.*)` a `https://backend-hornerito.onrender.com/$1`. Ojo: el rewrite **saca** el prefijo `/api`, así que el path que ve el backend es el mismo que en desarrollo.
- **Auth**: `src/app/core/interceptors/auth.interceptor.ts` agrega `Authorization: Bearer <token>` a **toda** request si hay `accessToken` en `localStorage`. No armes headers de auth a mano en un servicio. Si un endpoint tiene que salir sin token, es una excepción que hay que resolver en el interceptor, no salteándolo.
- **El front no manda `organizationId` en ningún lado.** El backend lo resuelve del JWT (backend §6). Si un endpoint nuevo te pide mandarlo en el body, en la URL o en un query param, **no lo implementes**: es una divergencia de diseño, expone la unidad de aislamiento como parámetro del cliente. Reportalo y escalá.
- **La API se tipa a mano** en `src/app/core/models/`. No hay OpenAPI ni tipos generados: un rename en un DTO del backend no rompe ninguna compilación acá, rompe en runtime y en silencio. Por eso **todo cambio de contrato pasa por `contract-checker` antes de escribir el servicio**.

**Deuda conocida — inconsistencia real:** el `nginx.conf` que usa el `Dockerfile` **no** proxya `/api` (solo sirve estáticos con fallback a `index.html`). Un despliegue por Docker con `environment.ts` de producción apuntando a `/api` devolvería `index.html` en vez de la respuesta del backend. Hoy no molesta porque el deploy real es Vercel, pero el Dockerfile queda como una configuración que no funciona. Si alguien va a usarlo, hay que agregar un `location /api/` con `proxy_pass`.

---

## 7. Testing

- Vitest 4 corriendo a través del builder `@angular/build:unit-test`. Comando: `npm run test`. En CI y en cualquier entorno sin TTY el watch se apaga solo; para forzarlo, `npm run test -- --watch=false`.
- Los specs viven al lado de lo que prueban (`*.spec.ts`). Hoy son 3 archivos y 17 tests, **todos de servicios: cero tests de componentes**.
- Patrón fijo para un servicio HTTP, tal como está en `src/app/core/services/auth.service.spec.ts`:

```ts
TestBed.configureTestingModule({
  providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
});
service = TestBed.inject(MiServicio);
httpMock = TestBed.inject(HttpTestingController);
// ...
afterEach(() => httpMock.verify());
```

  `httpMock.verify()` en el `afterEach` no es opcional: es lo que detecta una request de más o una que nunca se hizo. Si el servicio lee `localStorage` al construirse, limpialo en el `beforeEach`.

**El nivel de aceptación (ATDD) vive en el backend**, en `../backend-hornerito/test/acceptance/`. El front **no duplica escenarios de user story**: un escenario que dice "el coordinador registra una donación" se prueba una sola vez, contra la API, del lado del backend. Acá se prueba que el servicio arma bien la request y mapea bien la respuesta — nada más.

**En esta iteración el front no suma tests nuevos.** Es una deuda consciente (cero cobertura de componentes, y `strict` apagado), registrada en `PROYECTO.md` del backend. No la resuelvas por iniciativa propia: si un cambio te parece que la necesita, decilo y que el usuario decida.

---

## 8. Explorar sin quemar tokens

Para localizar o entender código: MCP `codebase-memory` **primero** (`search_graph`, `trace_path`, `get_code_snippet`, `search_code`, `get_architecture`, `query_graph`). Read/Grep/Glob **solo** para el archivo puntual que vas a editar o para config no-código.

**No uses los agentes `Explore` / `general-purpose` ni Read/Grep masivo para "mapear el proyecto".** El grafo ya lo tiene.

Otras palancas: `code-reviewer` y `hornerito-domain-expert` son de invocación **selectiva**, no de cada tarea (§10). Todo agente tiene un cap de output en su prompt: respetalo, no narres lo que leíste.

MCP relevantes acá: `codebase-memory` (código). El MCP **`primeng` no aplica a este proyecto**: no usamos PrimeNG ni ninguna librería de componentes, el design system es CSS custom + tokens (§4). No cargues sus tools. Notion, Microsoft 365 y Azure DevOps están conectados a nivel global pero tampoco se usan acá.

---

## 9. Reglas de negocio — el front no las define

**La fuente de verdad del negocio es `../backend-hornerito/DOMAIN.md`.** No vive acá y no se edita desde acá. Antes de reflejar una regla en la UI (qué se muestra, qué se habilita, qué transición se ofrece), consultá `hornerito-domain-expert`. **No deduzcas reglas leyendo el código del front**: la UI puede estar mostrando mal el requisito.

`DOMAIN.md` marca con `[NO CONFIRMADO]` toda regla que todavía no validó el equipo. Si tu tarea depende de una, **no la asumas**: escalá al usuario. El default ante conflicto es preguntar, no ejecutar.

**El front no es una capa de autorización.** Los guards (`auth.guard.ts`, `role.guard.ts`) y los `computed()` de permisos de `auth.service.ts` existen **solo para armar el menú y evitar pantallas vacías**: el backend revalida todo en cada request (invariante 6 de `DOMAIN.md` §10 — el token no es la fuente de verdad del rol). Ese comentario ya está escrito en `auth.service.ts`; no lo contradigas. Si una regla de negocio solo se cumple porque el front la impide, la regla **no está implementada**.

Las decisiones arquitectónicas y los ADR se documentan en `../lab-hornerito/` desde la sesión del backend (backend §7). Desde acá no se escriben.

---

## 10. Git flow y cierre de tarea

Integración `develop`, release `main`.

- **Nunca** merge, rebase ni cherry-pick entre ramas sin instrucción explícita. Al cerrar una tarea: "branch listo", punto. No ofrezcas merge.
- Se commitea **cuando el usuario lo pide**, nunca por iniciativa propia. Lo mismo para push y PR.
- Commits en Conventional Commits, en español, con el ticket al final: `feat(necesidades): permitir cerrar una necesidad a mano (QK-31)`.
- Sin `Co-Authored-By` ni firma de Claude.

Cierre de tarea:

1. `npm run build` en verde. Es el gate del front: si no compila, la tarea no está.
2. ¿Zona crítica o lógica no trivial? → `code-reviewer`. Un cambio de copy, un ajuste de estilo o un `.md` **no lo disparan**.
3. ¿El cambio tocó un endpoint? → `contract-checker`, si no lo corriste antes.
4. ¿Se descubrió una convención o un anti-patrón reusable? → `docs-keeper`.
5. Reportá qué quedó hecho y qué no. Si el build falla, decilo con el output. Si salteaste un paso, decilo.
6. El commit lo pide el usuario.

`CLAUDE.md` no almacena listas de tareas ni estado del proyecto — eso va en `PROYECTO.md` del backend, que es el único de los dos repos que lo tiene.
