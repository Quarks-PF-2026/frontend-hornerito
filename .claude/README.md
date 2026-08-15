# `.claude/` — cómo trabajamos con Claude Code en el frontend

Onboarding para los integrantes del equipo. Si es tu primera sesión en este repo, leé esto y después `CLAUDE.md`.

## Qué hay acá

```
.claude/
  AGENTS.md        roster de los 5 agentes, workflows y gates
  README.md        este archivo
  agents/          un .md por agente: su prompt, su lane y su formato de salida
  settings.json    permisos del repo (versionado, igual para todos)
```

Y en la raíz del repo:

- **`CLAUDE.md`** — la guía que Claude lee en cada sesión. Diez secciones numeradas, con la **misma numeración** que el `CLAUDE.md` de `../backend-hornerito`, para que los dos repos se puedan referenciar como "§N".
- **`DESIGN_SYSTEM.md`** — tokens, utilidades globales, botones, componentes de `shared/ui/`, iconografía. Fuente de verdad del diseño.

## Los 5 agentes

| Agente | Para qué |
|---|---|
| `angular-ionic-expert` | Escribe el código: páginas, componentes, servicios, rutas, guards |
| `contract-checker` | Verifica que lo que el front consume y lo que el back expone sean la misma cosa |
| `code-reviewer` | Revisa el diff antes de cerrar la tarea |
| `hornerito-domain-expert` | Dice qué pide el negocio, antes de reflejarlo en la UI |
| `docs-keeper` | Único que edita `CLAUDE.md`, `DESIGN_SYSTEM.md` y `.claude/**` |

Detalle de cuándo usar cada uno, en qué orden y qué gate tiene que pasar: `AGENTS.md`.

## Cómo se invoca un agente

En la práctica, **no hace falta invocarlos a mano**. Cada agente tiene en su `description` un "Use PROACTIVELY … Do NOT use …" que le dice a Claude cuándo corresponde; el thread principal delega solo según la tabla de ruteo de `CLAUDE.md` §1.

Si querés forzarlo, alcanza con pedirlo en lenguaje natural: *"pasale esto al `code-reviewer`"*, *"corré el `contract-checker` sobre el endpoint de donaciones"*. Claude usa la tool `Agent` con ese `subagent_type`.

Para ver o cambiar el prompt de un agente, editá su `.md` en `agents/` — pero eso lo hace `docs-keeper`, no vos a mano en medio de una sesión.

## Qué es el fast path

No todo se delega. **Fast path** son los cambios que el thread principal hace inline, sin agente: copy y textos, un estilo que ya usa tokens existentes, un componente de página que sigue el patrón de al lado, un typo, una config de una línea.

**Zona crítica** es lo contrario, y ahí sí se delega siempre: `auth.service.ts`, `core/guards/`, `core/interceptors/`, `app.routes.ts`, `app.config.ts`, el service worker, y cualquier cosa que toque el contrato con el backend. La lista completa está en `CLAUDE.md` §1.

La idea es que la ceremonia proteja donde un error rompe la sesión de todos o desincroniza el front del backend en silencio, y que no moleste en el resto.

## Dónde está la doc de conocimiento

| Qué buscás | Dónde está |
|---|---|
| Cómo se trabaja en el front | `CLAUDE.md` (este repo) |
| Tokens, utilidades, componentes de UI | `DESIGN_SYSTEM.md` (este repo) |
| Reglas de negocio de Hornerito | `../backend-hornerito/DOMAIN.md` |
| Estado del proyecto, pendientes, deuda | `../backend-hornerito/PROYECTO.md` |
| ADRs y diagramas | `../lab-hornerito/` |
| Cómo se trabaja en el back | `../backend-hornerito/CLAUDE.md` |

Los tres repos se leen entre sí, pero **desde esta sesión solo se escribe en este repo**. Lo que haya que cambiar en el backend o en el lab se hace desde su propia sesión.

## El ciclo ATDD se corre desde el backend

El nivel de aceptación vive entero en `../backend-hornerito/test/acceptance/`, en Gherkin español, y se dispara con `/us QK-NN` **en la sesión del backend**. El front no duplica escenarios de user story: se prueban una sola vez, contra la API.

Acá los tests son 17, de servicios, con Vitest: `npm run test`. El gate de la tarea es `npm run build` en verde. Detalle en `CLAUDE.md` §7.

## Por qué este repo no tiene hooks

El backend tiene tres hooks: uno que refresca el grafo de `codebase-memory` al arrancar la sesión, uno que **bloquea correr la suite de tests en el thread principal** salvo con un token (`HN_TEST_GATE`), y uno que recuerda al cerrar qué zonas críticas se tocaron.

Acá no pusimos ninguno, a propósito:

- **El gate de tests no tiene sentido.** Existe en el backend porque son 154 tests entre tres niveles, con una base de datos efímera, y volcar ese output en el thread principal quema contexto para nada. Acá la suite son 17 tests de servicios que corren en segundos y el gate real es `npm run build`. Poner un hook para eso sería fricción sin beneficio.
- **El recordatorio de zonas críticas** cubre en el backend el riesgo de filtrar datos entre organizaciones. Acá la lista de zonas críticas es corta y ya está en `CLAUDE.md` §1 y en el ruteo de los agentes.

Si en algún momento la suite del front crece a un nivel de componentes o e2e que tarde minutos, el hook de gate pasa a tener sentido y se agrega. Hoy no.

## `settings.local.json`

`settings.json` está versionado: son los permisos del proyecto, iguales para los 6. Si querés permisos personales (por ejemplo, permitir un comando tuyo sin que te pregunte), creá `.claude/settings.local.json`; está en `.gitignore` y no se comparte.
