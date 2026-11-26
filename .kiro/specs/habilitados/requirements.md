# Requirements Document

## Introduction

La API Malla INF necesita un endpoint que indique a un alumno qué cursos puede matricular a continuación, dado el conjunto de cursos que ya ha aprobado. `POST /habilitados` acepta la lista de códigos de cursos aprobados y devuelve todos los cursos del catálogo cuyos prerequisitos están completamente satisfechos por esa lista, excluyendo los cursos ya aprobados. Los cursos sin prerequisitos siempre son elegibles. Todos los datos de cursos se leen desde `data/cursos.json` a través de `src/data/repositorio.js`.

## Glossary

- **API**: La aplicación Express definida en `src/app.js`.
- **Repositorio**: El módulo de acceso a datos en `src/data/repositorio.js`, que expone `listar()`, `listarPorCiclo(n)` y `obtener(codigo)`.
- **Curso**: Objeto del catálogo con campos `id`, `name`, `credits`, `cycle`, `type` y `prerequisites`.
- **Curso_Habilitado**: Curso que no está en `aprobados` y cuyos todos los códigos de prerequisito aparecen en `aprobados`.
- **aprobados**: El arreglo JSON de cadenas de códigos de curso enviado por el cliente en el body de la solicitud.

## Requirements

### Requisito 1: Calcular cursos habilitados

**Historia de usuario:** Como alumno, quiero enviar los cursos que he aprobado y recibir la lista de cursos que puedo llevar, para planificar mi matrícula.

#### Acceptance Criteria

1.1 CUANDO se reciba `POST /habilitados` con body válido `{"aprobados": [...]}`, EL API DEBE responder 200 con un arreglo JSON de objetos Curso_Habilitado, cada uno con los campos `id`, `name`, `credits`, `cycle` y `type`.

1.2 CUANDO se reciba `POST /habilitados` y un Curso del catálogo tiene el arreglo `prerequisites` vacío y su `id` no está en `aprobados`, EL API DEBE incluir ese Curso en el arreglo de respuesta.

1.3 CUANDO se reciba `POST /habilitados` y un Curso tiene `prerequisites` no vacío y todos sus códigos de prerequisito están en `aprobados` y el `id` del Curso no está en `aprobados`, EL API DEBE incluir ese Curso en el arreglo de respuesta.

1.4 CUANDO se reciba `POST /habilitados` y el `id` de un Curso aparece en `aprobados`, EL API DEBE excluir ese Curso del arreglo de respuesta independientemente de sus prerequisitos.

1.5 CUANDO se reciba `POST /habilitados` con `{"aprobados": ["1INF25","1INF27","1INF49"]}`, EL API DEBE devolver un arreglo con exactamente 27 cursos, incluyendo `1INF29`, `1INF30`, `1INF31` e `1INF32`.

### Requisito 2: Validación de entrada

**Historia de usuario:** Como alumno, quiero que la API rechace solicitudes malformadas de inmediato, para recibir un error claro en lugar de resultados incorrectos.

#### Acceptance Criteria

2.1 SI el cuerpo no es JSON válido, ENTONCES EL API DEBE responder 400 con `{"error": "body inválido"}`.

2.2 SI el encabezado Content-Type no es application/json, ENTONCES EL API DEBE responder 415 con `{"error": "content-type debe ser application/json"}`.

2.3 SI el body no contiene el campo `aprobados`, ENTONCES EL API DEBE responder 400 con `{"error": "aprobados es requerido"}`.

2.4 SI `aprobados` no es un arreglo, ENTONCES EL API DEBE responder 400 con `{"error": "aprobados debe ser un arreglo"}`.

2.5 SI algún elemento de `aprobados` no es una cadena, ENTONCES EL API DEBE responder 400 con `{"error": "aprobados debe contener solo cadenas"}`.

2.6 SI algún elemento de `aprobados` no cumple el patrón `^[A-Z0-9]{5,6}$`, ENTONCES EL API DEBE responder 400 con `{"error": "aprobados contiene códigos con formato inválido"}`, y el cuerpo de la respuesta NO DEBE contener el valor enviado.

### Requisito 3: Límite de tamaño de entrada (seguridad — prevención de DoS)

**Historia de usuario:** Como operador del sistema, quiero que el endpoint rechace entradas sobredimensionadas de inmediato, para que un payload grande no agote los recursos del servidor.

#### Acceptance Criteria
3.1 SI el cuerpo de la solicitud supera 4 KB, ENTONCES EL API DEBE responder 413 con
{"error": "solicitud demasiado grande"} en 1 s o menos.

### Requisito 4: Manejo seguro de errores (seguridad — integridad de respuestas de error)

**Historia de usuario:** Como operador del sistema, quiero que las respuestas de error no contengan detalles internos del servidor, para que rutas de archivo y stack traces no queden expuestos al cliente.

#### Acceptance Criteria

4.1 SI ocurre un error no controlado al procesar POST /habilitados, ENTONCES EL API DEBE responder 500 con {"error": "error interno"}.
4.2 CUANDO EL API responda 500, el cuerpo NO DEBE contener "stack", " at ", ".js" ni una ruta de archivo.

### Requisito 5: Cobertura de código

**Historia de usuario:** Como desarrollador, quiero que las pruebas automatizadas cubran al menos el 80 % de las líneas de src/, para que, para que las regresiones sean detectadas por el pipeline de CI.

#### Acceptance Criteria

5.1 SI la cobertura de líneas de `src/` (excluyendo `src/server.js`) es menor a 80 %, ENTONCES EL
pipeline de CI DEBE terminar con código de salida distinto de 0.