# Trazabilidad

Los runs fallidos y corregidos se muestran en las pestañas *Checks* de los pull requests. Los PR 2, 3 y 4 son solo de evidencia (borradores, no se mergean) y apuntan a commits concretos del historial; el PR 1 es el cambio final.

| PR | Commit evaluado | Qué demuestra |
| --- | --- | --- |
| [PR 1](https://github.com/CaVassM/INF384-lab6-base/pull/1/checks) | `branch-camilo` (HEAD) | Estado final: tests, cobertura, SCA y secretos en verde |
| [PR 2](https://github.com/CaVassM/INF384-lab6-base/pull/2/checks) | `dba8414` | Gates recién agregados con `lodash 4.17.20` y la clave en el repo: `sca` y `secretos` en rojo |
| [PR 3](https://github.com/CaVassM/INF384-lab6-base/pull/3/checks) | `7f2b4c4` | `lodash` corregido y clave sustituida (`sca` y `secretos` en verde) y tests de `/habilitados` escritos sin implementar (`test` en rojo) |
| [PR 4](https://github.com/CaVassM/INF384-lab6-base/pull/4/checks) | `evidencia/cobertura-rojo` | Umbral de cobertura subido temporalmente a 100 para mostrar que el gate bloquea |

## Requisito → gate → evidencia

| Requisito | Gate (herramienta y umbral) | Bloquea / avisa | Etapa | Run fallido | Run corregido |
| --- | --- | --- | --- | --- | --- |
| Hallazgo 1 · Req. 3.1: SI el cuerpo supera 4 KB, responder 413 en 1 s o menos | Tests T3.1 y T3.2 (5 000 códigos) en el job `test` (`jest`) | Bloquea | Pull request y main | [PR 3](https://github.com/CaVassM/INF384-lab6-base/pull/3/checks): T3.1 y T3.2 fallan con la ruta sin implementar | [PR 1](https://github.com/CaVassM/INF384-lab6-base/pull/1/checks) |
| Hallazgo 2 · Req. 2.6: SI un código no cumple `^[A-Z0-9]{6}$`, responder 400 sin repetir el valor | Test T2.7 (`1INF30<script>`) y T2.6 en el job `test` | Bloquea | Pull request y main | [PR 3](https://github.com/CaVassM/INF384-lab6-base/pull/3/checks): T2.6 y T2.7 fallan | [PR 1](https://github.com/CaVassM/INF384-lab6-base/pull/1/checks) |
| Hallazgo 2 · Req. 4.1 y 4.2: SI hay un error no controlado, responder 500 `error interno` sin stack ni rutas | Tests T4.1 y T4.2 (error simulado con la ruta `C:\apps\malla\src\...`) en el job `test` | Bloquea | Pull request y main | [PR 3](https://github.com/CaVassM/INF384-lab6-base/pull/3/checks): T4.1 y T4.2 fallan | [PR 1](https://github.com/CaVassM/INF384-lab6-base/pull/1/checks) |
| Hallazgo 3 · Req. 2.4: SI `aprobados` no es un arreglo, responder 400 | Test T2.4 (`{"aprobados": "1INF25"}`) en el job `test` | Bloquea | Pull request y main | [PR 3](https://github.com/CaVassM/INF384-lab6-base/pull/3/checks): T2.4 falla | [PR 1](https://github.com/CaVassM/INF384-lab6-base/pull/1/checks) |
| Req. 5.1: SI la cobertura de líneas de `src/` es menor a 80 %, el pipeline debe fallar | `jest --coverage` con `coverageThreshold` global de 80 % en líneas, en el job `test` | Bloquea | Pull request y main | [PR 4](https://github.com/CaVassM/INF384-lab6-base/pull/4/checks): umbral temporal de 100 % hace fallar el job | [PR 1](https://github.com/CaVassM/INF384-lab6-base/pull/1/checks): 81,81 % de líneas |
| Política de TI: sin dependencias de severidad alta o crítica | Job `sca`: `npm audit --audit-level=high` (incluye devDependencies) | Bloquea | Pull request, main y cron semanal | [PR 2](https://github.com/CaVassM/INF384-lab6-base/pull/2/checks): `lodash 4.17.20` (1 vulnerabilidad alta) | [PR 3](https://github.com/CaVassM/INF384-lab6-base/pull/3/checks) y [PR 1](https://github.com/CaVassM/INF384-lab6-base/pull/1/checks): `lodash 4.18.1`, 0 vulnerabilidades |
| Política de TI: ningún secreto en el repositorio | Job `secretos`: gitleaks 8.30.1 (versión y sha256 fijos), `gitleaks git` sobre el historial completo (`fetch-depth: 0`) | Bloquea | Pull request y main | [PR 2](https://github.com/CaVassM/INF384-lab6-base/pull/2/checks): `CATALOGO_API_KEY` en `config/ejemplo.env` (regla `generic-api-key`) | [PR 3](https://github.com/CaVassM/INF384-lab6-base/pull/3/checks) y [PR 1](https://github.com/CaVassM/INF384-lab6-base/pull/1/checks): valor sustituido por placeholder y fingerprint registrado en `.gitleaksignore` |

### Notas sobre la evidencia

- **Tests que fallan antes de la corrección:** T3.1, T3.2, T2.4, T2.6, T2.7, T4.1 y T4.2 (en `tests/habilitados.test.js`, commit `7f2b4c4`). Pasan a verde con la implementación de la ruta y del `errorHandler`.
- **Cobertura:** el gate no falla de forma natural (el proyecto cumple 81,81 %), por eso el run fallido se provocó con un umbral temporal de 100 % en una rama de evidencia que no se mergea.
- **Secreto:** `config/ejemplo.env` contenía una clave de ejemplo del laboratorio (commit `7506fec`). Como el escaneo recorre todo el historial, la detección persiste después de sustituir el valor; por eso su fingerprint está en `.gitleaksignore` con la razón. La clave **no fue rotada**: es un valor de ejemplo sin sistema real asociado. Si alguna vez hubiera sido real, debe revocarse.
- **Modo de escaneo:** se eligió el historial completo con el binario de gitleaks porque `gitleaks-action` por defecto solo revisa los commits del push o PR y no habría visto el secreto ya presente en `main`.

## Cambios a la propuesta de Kiro

| Documento | Qué propuso Kiro | Qué cambiaste | Por qué |
| --- | --- | --- | --- |
| `requirements.md` | El Requisito 2 solo validaba que los elementos de `aprobados` fueran cadenas (2.4). No había ningún criterio para el hallazgo 2 (`1INF30<script>`); el Requisito 4 solo cubría el 500 sin stack trace | Agregué el criterio 2.6: SI un elemento no cumple el patrón de código (`^[A-Z0-9]{6}$`, los 87 códigos del catálogo tienen 6 caracteres), responder 400 sin repetir el valor recibido | El 500 del hallazgo 2 nacía de aceptar un código con formato inválido; sin este criterio el hallazgo quedaba sin requisito ni test (`<script>` es una cadena y pasaba 2.4) |
| `requirements.md` | Req. 5.1: "el ejecutor de pruebas DEBE reportar una cobertura de líneas del 80 % o más para todos los archivos agregados o modificados" | Lo reescribí como: SI la cobertura de líneas de `src/` (sin `server.js`) es menor a 80 %, el pipeline de CI DEBE terminar con código de salida distinto de 0 | El gate de Jest mide el global y no distingue archivos nuevos; además el criterio original no decía que el pipeline fallara, que es lo que la política de TI exige |
| `design.md` | Gate de secretos con `gitleaks/gitleaks-action@v2` y manejo del 415 desde `express.json`; además `fast-check` como dependencia nueva para 5 property tests | Usé el binario de gitleaks con versión y sha256 fijos sobre el historial completo, comprobé el 415 en la ruta con `req.is('application/json')` y mapeé `entity.parse.failed` a 400 en el `errorHandler`; quité `fast-check` | La acción escanea solo los commits del push o PR y no vería el secreto ya presente en `main`; `express.json` no lanza 415 (solo omite el parseo); el steering prohíbe dependencias nuevas sin necesidad y los property tests repetían los tests de ejemplo |
| `tasks.md` | Tests después de la implementación y gates al final, después de corregir `lodash` y la clave | Los gates se agregan primero (run rojo), luego se corrigen, y los tests se escriben antes de implementar | Así cada requisito no funcional tiene un run fallido y uno corregido; con el orden original nunca se habría visto un run rojo |
