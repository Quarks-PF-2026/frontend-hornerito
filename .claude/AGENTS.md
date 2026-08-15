# AGENTS.md — roster, workflows y gates (frontend)

Reglas de trabajo y ruteo: `CLAUDE.md` §1. Acá va solo lo que no cabe ahí: quién es quién, en qué orden se encadenan, y qué tiene que pasar para avanzar de un paso al siguiente.

El roster del backend es otro y vive en `../backend-hornerito/.claude/AGENTS.md`. Dos agentes existen en los dos repos con el mismo nombre (`contract-checker`, `docs-keeper`, `code-reviewer`, `hornerito-domain-expert`): son variantes adaptadas, no copias. Cada sesión usa la del repo en el que está.

## Roster

| Agente | Modelo | Lane | Escribe |
|---|---|---|---|
| `angular-ionic-expert` | sonnet | Implementación de UI, servicios, rutas, guards | `src/**`, `public/**` |
| `contract-checker` | sonnet | Contrato frontend ↔ backend | nada (read-only, cross-repo) |
| `code-reviewer` | sonnet | Gate de cierre | nada (read-only) |
| `hornerito-domain-expert` | opus | Reglas de negocio. Gate **previo** | nada (variante lite, sin `Edit`) |
| `docs-keeper` | sonnet | Capa de conocimiento del front | `CLAUDE.md`, `DESIGN_SYSTEM.md`, `.claude/**` |

**Disciplina de lane**: cada agente edita solo su área. `angular-ionic-expert` hereda todas las tools — su disciplina está en el system prompt, no en el campo `tools`. Los read-only sí la tienen restringida.

**Los agentes nunca se llaman entre sí.** Todo handoff vuelve al thread principal, que decide el siguiente paso. Es hub-and-spoke, no una cadena: así se puede cortar, reordenar o preguntarle al usuario en cualquier punto.

**Nada de este repo edita `../backend-hornerito` ni `../lab-hornerito`.** Se leen, no se escriben. Lo que haya que cambiar allá se flaggea y se hace desde la otra sesión.

## Workflows

Notación: `→` secuencial, `∥` paralelo.

- **Cambio de UI** (pantalla nueva, componente, estilo con lógica):
  `angular-ionic-expert` → `code-reviewer` **si toca zona crítica** (CLAUDE.md §1). Si es una página que sigue el patrón existente, cierra con el build en verde y listo.

- **Cambio que consume un endpoint nuevo o modificado**:
  `contract-checker` **primero** → `angular-ionic-expert` → `code-reviewer`. El orden importa: implementar antes de verificar el contrato es adivinar la forma de la respuesta.

- **Cambio que refleja una regla de negocio en la UI** (qué se muestra, qué se habilita, qué transición se ofrece):
  `hornerito-domain-expert` → `angular-ionic-expert`. Si el ruling es `necesita-confirmación-del-usuario`, se para y se pregunta.

- **Bug de UI**:
  `angular-ionic-expert` lo arregla. Si el bug es que el front y el back no coinciden, `contract-checker` primero para saber de qué lado está la falla.

- **Se descubrió una convención o un anti-patrón reusable**:
  `docs-keeper`, siempre. Nunca inline (CLAUDE.md §1).

## Gates

| Gate | Cuándo | Criterio para avanzar |
|---|---|---|
| **Dominio** (previo) | Antes de reflejar una regla de negocio en la UI | `VEREDICTO: consistente`. Si `[VIOLA REGLA]` no se implementa. Si `[NO CONFIRMADO]`, se escala al usuario: el default es **preguntar, no ejecutar** |
| **Contrato** (previo) | Endpoint nuevo, renombrado o con forma cambiada | `CONTRACT REPORT` sin `[DIVERGENCE]` |
| **Build** | Al cerrar cualquier tarea que toque `src/` | `npm run build` en verde. No delegable: lo corre el agente que implementó |
| **Review** | Zona crítica o lógica no trivial | `SUMMARY: ship`. Copy, un `.md` o un ajuste de estilo trivial **no lo disparan** |
| **Documentación** | Cualquier cambio en la capa de conocimiento | Pasa por `docs-keeper`, que verifica que no exista ya en otro archivo — de este repo o del backend |
| **Design system** | Cambio en `DESIGN_SYSTEM.md` o en los tokens `--hn-*` | OK explícito del equipo. Está en `ask` en `settings.json` a propósito |
| **Humano** | commit, push, PR, `npm install` | OK explícito del usuario (CLAUDE.md §10) |

## Lo que no hay acá

**No hay agente orquestador.** El orquestador es el thread principal. Delegar la orquestación a un subagente agregaría un salto de contexto sin ganar nada: el subagente tendría que recibir todo el estado de la conversación, y el usuario perdería la posibilidad de intervenir entre pasos. Lo que sí se hace es restringir al thread principal por permisos (`settings.json`): no commitea sin que se lo pidan, no instala paquetes sin preguntar, no edita `DESIGN_SYSTEM.md` sin OK.

**No hay agente de aceptación.** El nivel de aceptación (ATDD) vive **entero en el backend**, en `../backend-hornerito/test/acceptance/`, y lo maneja el `atdd-author` de esa sesión. El front no duplica escenarios de user story (CLAUDE.md §7): un escenario se prueba una sola vez, contra la API. Acá se prueba que el servicio arma bien la request y mapea bien la respuesta.

**No hay hooks.** El gate de tests y el recordatorio de zonas críticas son del backend, donde la suite es cara. Acá el gate es el build y corre en segundos. El porqué está en `.claude/README.md`.
