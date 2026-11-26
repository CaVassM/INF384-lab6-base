# Implementation Plan: POST /habilitados

## Overview

Implementar `POST /habilitados` con sus validaciones de seguridad y los gates de calidad y seguridad en CI. El orden está pensado para dejar evidencia: primero se agregan los gates con el repo aún sin corregir (run rojo), luego se corrige cada hallazgo (run verde), después se escriben los tests antes de la implementación (tests en rojo) y por último se implementa. Cada tarea termina con commit y push.

## Tasks

- [x] 1. Agregar los gates de SCA y detección de secretos a `.github/workflows/ci.yml`
  - Disparadores: `push` a `main`, `pull_request` a `main` y `schedule` semanal (`cron: '0 9 * * 1'`) bajo `on:`.
  - Agregar `permissions: contents: read` a nivel de workflow.
  - Separar en tres jobs independientes, para que un fallo no oculte a los otros:
    - `test`: el job actual (`npm ci`, `npm test`), con `if: github.event_name != 'schedule'`.
    - `sca`: checkout, setup-node, `npm audit --audit-level=high`. Corre también en `schedule`. Bloquea.
    - `secretos`: checkout con `fetch-depth: 0`, instalar gitleaks con versión fija y ejecutar `gitleaks git --redact --verbose .`. Con `if: github.event_name != 'schedule'`. Bloquea.
  - Instalación de gitleaks: descargar el binario de la página de releases con versión fija y verificar el `sha256` con un valor escrito en el `ci.yml`. No usar `gitleaks-action` (por defecto escanea solo los commits del push o PR). Verificar la versión y el hash a mano en https://github.com/gitleaks/gitleaks/releases; no inventarlos.
  - NO corregir todavía `lodash` ni `config/ejemplo.env`: el objetivo es ver los gates en rojo.
  - **Evidencia:** guardar el link del run en rojo de `sca` (lodash) y de `secretos` (clave en el historial).
  - _Requisitos: gates SCA y gitleaks (design.md § Quality y security gates)_

- [x] 2. Agregar el umbral de cobertura
  - En `jest.config.js` agregar `coverageThreshold: { global: { lines: 80 } }`; `collectCoverageFrom` ya excluye `src/server.js`.
  - En el job `test` de `ci.yml` cambiar `npm test` por `npm test -- --coverage`.
  - Antes de subir, ejecutar `npm test -- --coverage` y anotar el porcentaje.
  - **Evidencia:** si el run sale en rojo por cobertura, guardar el link. Si ya cumple 80 %, probar el gate con un commit temporal que suba el umbral a 100, guardar el link del run rojo y revertir ese commit.
  - _Requisitos: 5.1_

- [x] 3. Corregir la vulnerabilidad de `lodash`
  - En `package.json` cambiar `lodash` de `4.17.20` a `4.18.1` y ejecutar `npm install` para actualizar `package-lock.json`.
  - Verificar con `npm audit --audit-level=high` que no quedan vulnerabilidades altas ni críticas.
  - **Evidencia:** guardar el link del run en que `sca` pasa a verde.
  - _Requisitos: gate SCA (design.md § Quality y security gates)_

- [x] 4. Corregir el secreto en el repositorio
  - [x] 4.1 Reemplazar el valor de `CATALOGO_API_KEY` en `config/ejemplo.env` por el placeholder `YOUR_API_KEY_HERE`.
  - [x] 4.2 Ejecutar gitleaks en local (`gitleaks git --redact -v .`) y copiar, tal como lo imprime, el campo `Fingerprint` del hallazgo del commit `7506fec`. Tiene la forma `<sha completo>:config/ejemplo.env:<regla>:<línea>`.
  - [x] 4.3 Crear `.gitleaksignore` en la raíz con ese fingerprint y, en la línea anterior, un comentario con la razón: clave de ejemplo del laboratorio, sustituida por placeholder. Si la clave fuera real, debe revocarse; no escribir que fue rotada si no se hizo.
  - Si gitleaks no detecta la clave con sus reglas por defecto, no crear `.gitleaksignore` y documentarlo en `TRAZABILIDAD.md`.
  - **Evidencia:** guardar el link del run en que `secretos` pasa a verde.
  - _Requisitos: gate gitleaks (design.md § Quality y security gates)_

- [x] 5. Escribir `tests/habilitados.test.js` antes de implementar (deben fallar)
  - Los tests usan supertest sobre `src/app.js`. Comparar la respuesta por conjunto de `id`, no por orden.
  - [x] 5.1 Requisito 1 (T1.1 a T1.7)
    - T1.1: `aprobados: []` → 200 con exactamente los cursos con `prerequisites: []`.
    - T1.2: cada elemento tiene solo `id`, `name`, `credits`, `cycle`, `type`.
    - T1.3: `1INF30` incluido con `["1INF25"]` y excluido si falta `1INF25`.
    - T1.4: un código que está en `aprobados` no aparece en la respuesta.
    - T1.5: `["1INF25","1INF27","1INF49"]` → exactamente 27 cursos, incluidos `1INF29`, `1INF30`, `1INF31`, `1INF32`.
    - T1.6: conjuntos fijos (vacío, todo el ciclo 5, todos los cursos) coinciden con un cálculo independiente hecho en el test; con todos aprobados la respuesta es `[]`.
    - T1.7: duplicados y códigos bien formados inexistentes (por ejemplo `"ZZZ999"`) no producen error ni cambian el resultado.
    - _Requisitos: 1.1, 1.2, 1.3, 1.4, 1.5_
  - [x] 5.2 Requisito 2 (T2.1 a T2.7)
    - T2.1: JSON roto con Content-Type JSON → 400 `body inválido`.
    - T2.2: Content-Type `text/plain` → 415.
    - T2.3: `{"otro": []}` → 400 `aprobados es requerido`.
    - T2.4: `{"aprobados": "1INF25"}` → 400 `aprobados debe ser un arreglo`; también `null` y `{}`.
    - T2.5: `{"aprobados": [123]}` → 400 `aprobados debe contener solo cadenas`; también `null`, booleano y objeto.
    - T2.6: `["minusc"]` y `["1INF2"]` → 400 formato inválido.
    - T2.7: `["1INF30<script>"]` → 400 formato inválido y el cuerpo de la respuesta no contiene `script` ni `<`.
    - _Requisitos: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_
  - [x] 5.3 Requisito 3 (T3.1 a T3.3)
    - T3.1: cuerpo mayor a 4 096 bytes, por ejemplo `JSON.stringify({ aprobados: [], relleno: 'x'.repeat(4097) })` → 413 `solicitud demasiado grande` en 1 s o menos.
    - T3.2: `aprobados` con 5 000 códigos válidos, por ejemplo `Array.from({ length: 5000 }, (_, i) => 'A' + String(i).padStart(4, '0'))` → 413 en 1 s o menos.
    - T3.3: cuerpo válido de unos 100 códigos (menos de 4 KB) → 200.
    - _Requisitos: 3.1_
  - [x] 5.4 Requisito 4 (T4.1 a T4.3)
    - T4.1: `jest.spyOn(repositorio, 'listar')` lanzando un error → 500 `{"error":"error interno"}`.
    - T4.2: el error simulado usa el mensaje `C:\apps\malla\src\data\repositorio.js` y un stack; el cuerpo de la respuesta no contiene `stack`, ` at `, `.js` ni `C:\`.
    - T4.3: JSON roto y cuerpo grande no producen 500.
    - _Requisitos: 4.1, 4.2_
  - **Evidencia:** confirmar que los tests fallan (la ruta aún no existe), subir el commit y guardar el link del run en rojo.

- [x] 6. Configurar el límite de tamaño y el manejo de errores en `src/app.js`
  - Reemplazar `app.use(express.json())` por `app.use(express.json({ limit: '4kb' }))`.
  - Extender el `errorHandler` global para traducir `err.type`:
    - `entity.too.large` → 413 `{ error: 'solicitud demasiado grande' }`
    - `entity.parse.failed` → 400 `{ error: 'body inválido' }`
    - cualquier otro error → 500 `{ error: 'error interno' }`
  - Agregar `if (res.headersSent) return next(err)` al inicio y `console.error(err)` solo antes de la respuesta 500. Nunca devolver `err.message` ni `err.stack`.
  - No montar todavía el router de `/habilitados` (se hace en la tarea 7.3).
  - Ejecutar `npm test`: los tests de T2.1, T3.x y T4.3 pasan; los demás siguen en rojo.
  - _Requisitos: 2.1, 3.1, 4.1, 4.2_

- [ ] 7. Implementar `src/routes/habilitados.js`
  - [ ] 7.1 Crear el router Express y `validarAprobados(body)`
    - `validarAprobados(body)` solo recibe el body y devuelve `{ ok: true, aprobados }` o `{ ok: false, status, error }`. Valida, en este orden:
      1. `aprobados` ausente → 400 `aprobados es requerido`
      2. `aprobados` no es arreglo (incluye `null`) → 400 `aprobados debe ser un arreglo`
      3. algún elemento no es string → 400 `aprobados debe contener solo cadenas`
      4. algún elemento no cumple `/^[A-Z0-9]{5,6}$/` → 400 `aprobados contiene códigos con formato inválido`, sin incluir el valor recibido.
    - El 413 y el 400 por JSON inválido los produce `express.json` y el `errorHandler`; no se repiten aquí.
    - _Requisitos: 2.3, 2.4, 2.5, 2.6_
  - [ ] 7.2 Implementar `calcularHabilitados(aprobadosSet, todos)`
    ```js
    return todos
      .filter(c => !aprobadosSet.has(c.id) && c.prerequisites.every(p => aprobadosSet.has(p)))
      .map(c => ({ id: c.id, name: c.name, credits: c.credits, cycle: c.cycle, type: c.type }));
    ```
    - _Requisitos: 1.1, 1.2, 1.3, 1.4, 1.5_
  - [ ] 7.3 Conectar el handler `POST /` y montar el router en `src/app.js`
    - Primero comprobar `req.is('application/json')`; si no se cumple → 415 `content-type debe ser application/json`.
    - Luego `validarAprobados(req.body)`; si falla, responder `res.status(status).json({ error })`.
    - Construir `new Set(aprobados)`, llamar a `calcularHabilitados(set, repositorio.listar())` y responder 200.
    - Importar con `const repositorio = require('../data/repositorio')` y llamar a `repositorio.listar()` (no desestructurar `listar`), para que `jest.spyOn` del test T4.1 funcione.
    - Envolver en `try/catch` y pasar el error a `next(err)`.
    - Montar `app.use('/habilitados', require('./routes/habilitados'))` en `src/app.js`, antes del `errorHandler`.
    - _Requisitos: 1.1, 1.2, 1.3, 1.4, 1.5, 2.2, 4.1, 4.2_
  - **Evidencia:** subir y guardar el link del run en que los tests de la tarea 5 pasan a verde.

- [ ] 8. Punto de control de cobertura
  - Ejecutar `npm test -- --coverage` y confirmar que las líneas de `src/` están en 80 % o más y que `GET /health`, `GET /cursos` y `GET /cursos/:codigo` siguen funcionando.
  - Si `src/util/formato.js` deja la cobertura global por debajo de 80 %, crear `tests/formato.test.js` con tests de sus funciones puras, sin lógica nueva, en lugar de excluir el archivo.
  - _Requisitos: 5.1_

- [ ] 9. Completar `TRAZABILIDAD.md` (pendiente: se redacta aparte, con los links de los runs)
  - Una fila por requisito no funcional (hallazgos 1 a 3, cobertura, SCA, secretos), con gate o test, bloquea o avisa, etapa y links al run fallido y al corregido.
  - Los dos cambios a la propuesta de Kiro.
  - No ejecutar esta tarea con Kiro.
  - _Requisitos: 5.1, gates de CI_

## Notes

- El orden de las tareas es deliberado y no debe alterarse: primero los gates en rojo (tareas 1 y 2), luego sus correcciones (3 y 4), luego los tests en rojo (5) y por último la implementación (6 y 7). Así cada requisito no funcional queda con un run fallido y uno corregido.
- Cada tarea termina con commit y push. Los runs de CI se generan desde un pull request hacia `main`; guardar el link de cada run rojo y verde para `TRAZABILIDAD.md`.
- El 413 (cuerpo mayor a 4 KB) y el 400 por JSON inválido los produce `express.json({ limit: '4kb' })` y los traduce el `errorHandler`; no se duplican en `src/routes/habilitados.js`.
- La ruta debe llamar a `repositorio.listar()` sobre el módulo, sin desestructurar `listar`, para que `jest.spyOn` funcione en el test T4.1.
- En T1.6 el resultado esperado se calcula de forma independiente en el propio test (no se escribe la lista completa a mano) y se compara por conjunto de `id`, sin depender del orden.
- La tarea 9 se redacta aparte con los links de los runs; no se ejecuta con Kiro.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2"] },
    { "id": 2, "tasks": ["3"] },
    { "id": 3, "tasks": ["4.1"] },
    { "id": 4, "tasks": ["4.2"] },
    { "id": 5, "tasks": ["4.3"] },
    { "id": 6, "tasks": ["5.1"] },
    { "id": 7, "tasks": ["5.2"] },
    { "id": 8, "tasks": ["5.3"] },
    { "id": 9, "tasks": ["5.4"] },
    { "id": 10, "tasks": ["6"] },
    { "id": 11, "tasks": ["7.1"] },
    { "id": 12, "tasks": ["7.2"] },
    { "id": 13, "tasks": ["7.3"] },
    { "id": 14, "tasks": ["8"] },
    { "id": 15, "tasks": ["9"] }
  ]
}
```