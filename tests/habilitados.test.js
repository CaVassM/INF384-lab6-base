/**
 * Tests for POST /habilitados — T1.1 to T1.7 (Requisito 1)
 *
 * NOTE: The route has NOT been implemented yet.
 * All tests in this file are expected to fail until task 7 is complete.
 */

const request = require('supertest');
const path = require('path');
const app = require('../src/app');

// Load the catalogue independently to compute expected values in tests.
const { courses: CATALOGO } = require(path.join(__dirname, '..', 'data', 'cursos.json'));

/**
 * Compute the set of enabled courses for a given aprobados array,
 * using the same algorithm described in design.md, without calling the API.
 *
 * @param {string[]} aprobados
 * @returns {{ id:string, name:string, credits:number, cycle:number|null, type:string }[]}
 */
function calcularHabilitadosEsperados(aprobados) {
  const aprobadosSet = new Set(aprobados);
  return CATALOGO
    .filter(
      (c) =>
        !aprobadosSet.has(c.id) &&
        c.prerequisites.every((p) => aprobadosSet.has(p)),
    )
    .map(({ id, name, credits, cycle, type }) => ({ id, name, credits, cycle, type }));
}

/** Extracts the sorted array of ids from a list of course objects. */
function idsOrdenados(cursos) {
  return cursos.map((c) => c.id).sort();
}

// ---------------------------------------------------------------------------
// T1.1 — aprobados: [] → 200 with exactly the courses whose prerequisites is []
// ---------------------------------------------------------------------------
describe('T1.1 — POST /habilitados con aprobados vacío', () => {
  test('responde 200', async () => {
    const res = await request(app)
      .post('/habilitados')
      .set('Content-Type', 'application/json')
      .send({ aprobados: [] });

    expect(res.status).toBe(200);
  });

  test('el body es un arreglo', async () => {
    const res = await request(app)
      .post('/habilitados')
      .set('Content-Type', 'application/json')
      .send({ aprobados: [] });

    expect(Array.isArray(res.body)).toBe(true);
  });

  test('contiene exactamente los cursos con prerequisites vacío', async () => {
    const res = await request(app)
      .post('/habilitados')
      .set('Content-Type', 'application/json')
      .send({ aprobados: [] });

    const esperados = CATALOGO
      .filter((c) => c.prerequisites.length === 0)
      .map((c) => c.id)
      .sort();

    expect(idsOrdenados(res.body)).toEqual(esperados);
  });
});

// ---------------------------------------------------------------------------
// T1.2 — Each element has exactly five fields: id, name, credits, cycle, type
// ---------------------------------------------------------------------------
describe('T1.2 — Campos de cada elemento de la respuesta', () => {
  const CAMPOS_ESPERADOS = new Set(['id', 'name', 'credits', 'cycle', 'type']);

  test('cada objeto tiene exactamente los cinco campos requeridos', async () => {
    const res = await request(app)
      .post('/habilitados')
      .set('Content-Type', 'application/json')
      .send({ aprobados: [] });

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);

    for (const curso of res.body) {
      const campos = new Set(Object.keys(curso));
      expect(campos).toEqual(CAMPOS_ESPERADOS);
    }
  });

  test('no contiene el campo prerequisites', async () => {
    const res = await request(app)
      .post('/habilitados')
      .set('Content-Type', 'application/json')
      .send({ aprobados: [] });

    for (const curso of res.body) {
      expect(curso).not.toHaveProperty('prerequisites');
    }
  });
});

// ---------------------------------------------------------------------------
// T1.3 — 1INF30 incluido cuando prereqs satisfechos, excluido si falta alguno
// ---------------------------------------------------------------------------
describe('T1.3 — Inclusión/exclusión según prerequisitos', () => {
  test('1INF30 está en la respuesta cuando aprobados contiene ["1INF25"]', async () => {
    const res = await request(app)
      .post('/habilitados')
      .set('Content-Type', 'application/json')
      .send({ aprobados: ['1INF25'] });

    expect(res.status).toBe(200);
    const ids = res.body.map((c) => c.id);
    expect(ids).toContain('1INF30');
  });

  test('1INF30 NO está en la respuesta cuando aprobados es []', async () => {
    const res = await request(app)
      .post('/habilitados')
      .set('Content-Type', 'application/json')
      .send({ aprobados: [] });

    expect(res.status).toBe(200);
    const ids = res.body.map((c) => c.id);
    expect(ids).not.toContain('1INF30');
  });
});

// ---------------------------------------------------------------------------
// T1.4 — A course in aprobados does NOT appear in the response
// ---------------------------------------------------------------------------
describe('T1.4 — Curso aprobado no aparece en la respuesta', () => {
  test('1INF25 no está en la respuesta aunque tenga prerequisitos satisfechos (prerequisites vacío)', async () => {
    const res = await request(app)
      .post('/habilitados')
      .set('Content-Type', 'application/json')
      .send({ aprobados: ['1INF25'] });

    expect(res.status).toBe(200);
    const ids = res.body.map((c) => c.id);
    expect(ids).not.toContain('1INF25');
  });

  test('ningún código de aprobados aparece en la respuesta', async () => {
    const aprobados = ['1INF25', '1INF27', '1INF49'];

    const res = await request(app)
      .post('/habilitados')
      .set('Content-Type', 'application/json')
      .send({ aprobados });

    expect(res.status).toBe(200);
    const idsRespuesta = new Set(res.body.map((c) => c.id));
    for (const id of aprobados) {
      expect(idsRespuesta.has(id)).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// T1.5 — ["1INF25","1INF27","1INF49"] → exactly 27 courses including specific ones
// ---------------------------------------------------------------------------
describe('T1.5 — Conjunto específico de aprobados', () => {
  const APROBADOS = ['1INF25', '1INF27', '1INF49'];
  const ESPERADOS_INCLUIDOS = ['1INF29', '1INF30', '1INF31', '1INF32'];

  test('devuelve exactamente 27 cursos', async () => {
    const res = await request(app)
      .post('/habilitados')
      .set('Content-Type', 'application/json')
      .send({ aprobados: APROBADOS });

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(27);
  });

  test.each(ESPERADOS_INCLUIDOS)(
    'incluye %s en la respuesta',
    async (id) => {
      const res = await request(app)
        .post('/habilitados')
        .set('Content-Type', 'application/json')
        .send({ aprobados: APROBADOS });

      expect(res.status).toBe(200);
      expect(res.body.map((c) => c.id)).toContain(id);
    },
  );
});

// ---------------------------------------------------------------------------
// T1.6 — Several fixed sets computed programmatically, all-approved → []
// ---------------------------------------------------------------------------
describe('T1.6 — Conjuntos fijos comparados con cálculo independiente', () => {
  // Case 1: empty aprobados
  test('aprobados vacío coincide con cálculo independiente', async () => {
    const aprobados = [];
    const esperados = calcularHabilitadosEsperados(aprobados);

    const res = await request(app)
      .post('/habilitados')
      .set('Content-Type', 'application/json')
      .send({ aprobados });

    expect(res.status).toBe(200);
    expect(idsOrdenados(res.body)).toEqual(idsOrdenados(esperados));
  });

  // Case 2: all cycle-5 course IDs
  test('todos los cursos del ciclo 5 aprobados coincide con cálculo independiente', async () => {
    const aprobados = CATALOGO.filter((c) => c.cycle === 5).map((c) => c.id);
    const esperados = calcularHabilitadosEsperados(aprobados);

    const res = await request(app)
      .post('/habilitados')
      .set('Content-Type', 'application/json')
      .send({ aprobados });

    expect(res.status).toBe(200);
    expect(idsOrdenados(res.body)).toEqual(idsOrdenados(esperados));
  });

  // Case 3: all course IDs in the catalogue → response must be []
  test('todos los cursos aprobados devuelve arreglo vacío', async () => {
    const aprobados = CATALOGO.map((c) => c.id);
    const esperados = calcularHabilitadosEsperados(aprobados);

    expect(esperados).toHaveLength(0); // sanity-check on the helper itself

    const res = await request(app)
      .post('/habilitados')
      .set('Content-Type', 'application/json')
      .send({ aprobados });

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// T1.7 — Duplicates and well-formed unknown codes do not cause errors or change results
// ---------------------------------------------------------------------------
describe('T1.7 — Duplicados y códigos inexistentes bien formados', () => {
  test('duplicados en aprobados no producen error', async () => {
    const res = await request(app)
      .post('/habilitados')
      .set('Content-Type', 'application/json')
      .send({ aprobados: ['1INF25', '1INF25', '1INF25'] });

    expect(res.status).toBe(200);
  });

  test('duplicados no cambian el resultado respecto al conjunto deduplicado', async () => {
    const [resDup, resSin] = await Promise.all([
      request(app)
        .post('/habilitados')
        .set('Content-Type', 'application/json')
        .send({ aprobados: ['1INF25', '1INF25', '1INF27', '1INF27'] }),
      request(app)
        .post('/habilitados')
        .set('Content-Type', 'application/json')
        .send({ aprobados: ['1INF25', '1INF27'] }),
    ]);

    expect(resDup.status).toBe(200);
    expect(resSin.status).toBe(200);
    expect(idsOrdenados(resDup.body)).toEqual(idsOrdenados(resSin.body));
  });

  test('código inexistente bien formado (ZZZ999) no produce error', async () => {
    const res = await request(app)
      .post('/habilitados')
      .set('Content-Type', 'application/json')
      .send({ aprobados: ['ZZZ999'] });

    expect(res.status).toBe(200);
  });

  test('código inexistente no cambia el resultado vs el conjunto sin él', async () => {
    const base = ['1INF25'];
    const [resConDesconocido, resSin] = await Promise.all([
      request(app)
        .post('/habilitados')
        .set('Content-Type', 'application/json')
        .send({ aprobados: [...base, 'ZZZ999'] }),
      request(app)
        .post('/habilitados')
        .set('Content-Type', 'application/json')
        .send({ aprobados: base }),
    ]);

    expect(resConDesconocido.status).toBe(200);
    expect(resSin.status).toBe(200);
    expect(idsOrdenados(resConDesconocido.body)).toEqual(idsOrdenados(resSin.body));
  });

  test('duplicados y códigos inexistentes combinados no producen error', async () => {
    const res = await request(app)
      .post('/habilitados')
      .set('Content-Type', 'application/json')
      .send({ aprobados: ['1INF25', '1INF25', 'ZZZ999', 'AAA111'] });

    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Requisito 2 — Input validation for POST /habilitados (T2.1 – T2.7)
// NOTE: T2.2–T2.7 will fail until the route is implemented (task 7).
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// T2.1 — Broken JSON body → 400 { error: 'body inválido' }
// ---------------------------------------------------------------------------
describe('T2.1 — JSON inválido en el body', () => {
  test('body roto devuelve 400 con error body inválido', async () => {
    const res = await request(app)
      .post('/habilitados')
      .set('Content-Type', 'application/json')
      .send('{"aprobados":');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'body inválido' });
  });
});

// ---------------------------------------------------------------------------
// T2.2 — Wrong Content-Type → 415 { error: 'content-type debe ser application/json' }
// ---------------------------------------------------------------------------
describe('T2.2 — Content-Type incorrecto', () => {
  test('text/plain devuelve 415', async () => {
    const res = await request(app)
      .post('/habilitados')
      .set('Content-Type', 'text/plain')
      .send('{"aprobados":[]}');

    expect(res.status).toBe(415);
    expect(res.body).toEqual({ error: 'content-type debe ser application/json' });
  });
});

// ---------------------------------------------------------------------------
// T2.3 — Missing aprobados field → 400 { error: 'aprobados es requerido' }
// ---------------------------------------------------------------------------
describe('T2.3 — Campo aprobados ausente', () => {
  test('body sin campo aprobados devuelve 400', async () => {
    const res = await request(app)
      .post('/habilitados')
      .set('Content-Type', 'application/json')
      .send({ otro: [] });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'aprobados es requerido' });
  });
});

// ---------------------------------------------------------------------------
// T2.4 — aprobados is not an array → 400 { error: 'aprobados debe ser un arreglo' }
// ---------------------------------------------------------------------------
describe('T2.4 — aprobados no es un arreglo', () => {
  test('aprobados como string devuelve 400', async () => {
    const res = await request(app)
      .post('/habilitados')
      .set('Content-Type', 'application/json')
      .send({ aprobados: '1INF25' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'aprobados debe ser un arreglo' });
  });

  test('aprobados como null devuelve 400', async () => {
    const res = await request(app)
      .post('/habilitados')
      .set('Content-Type', 'application/json')
      .send({ aprobados: null });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'aprobados debe ser un arreglo' });
  });

  test('aprobados como objeto devuelve 400', async () => {
    const res = await request(app)
      .post('/habilitados')
      .set('Content-Type', 'application/json')
      .send({ aprobados: {} });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'aprobados debe ser un arreglo' });
  });
});

// ---------------------------------------------------------------------------
// T2.5 — aprobados contains non-string elements → 400 { error: 'aprobados debe contener solo cadenas' }
// ---------------------------------------------------------------------------
describe('T2.5 — aprobados contiene elementos que no son cadenas', () => {
  test('elemento número devuelve 400', async () => {
    const res = await request(app)
      .post('/habilitados')
      .set('Content-Type', 'application/json')
      .send({ aprobados: [123] });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'aprobados debe contener solo cadenas' });
  });

  test('elemento null devuelve 400', async () => {
    const res = await request(app)
      .post('/habilitados')
      .set('Content-Type', 'application/json')
      .send({ aprobados: [null] });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'aprobados debe contener solo cadenas' });
  });

  test('elemento booleano devuelve 400', async () => {
    const res = await request(app)
      .post('/habilitados')
      .set('Content-Type', 'application/json')
      .send({ aprobados: [true] });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'aprobados debe contener solo cadenas' });
  });

  test('elemento objeto devuelve 400', async () => {
    const res = await request(app)
      .post('/habilitados')
      .set('Content-Type', 'application/json')
      .send({ aprobados: [{}] });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'aprobados debe contener solo cadenas' });
  });
});

// ---------------------------------------------------------------------------
// T2.6 — aprobados contains strings with invalid format → 400 { error: 'aprobados contiene códigos con formato inválido' }
// ---------------------------------------------------------------------------
describe('T2.6 — aprobados contiene códigos con formato inválido', () => {
  test('código en minúsculas devuelve 400', async () => {
    const res = await request(app)
      .post('/habilitados')
      .set('Content-Type', 'application/json')
      .send({ aprobados: ['minusc'] });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'aprobados contiene códigos con formato inválido' });
  });

  test('código demasiado corto (1INF2) devuelve 400', async () => {
    const res = await request(app)
      .post('/habilitados')
      .set('Content-Type', 'application/json')
      .send({ aprobados: ['1INF2'] });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'aprobados contiene códigos con formato inválido' });
  });
});

// ---------------------------------------------------------------------------
// T2.7 — XSS attempt in code → 400, response body must not contain 'script' or '<'
// ---------------------------------------------------------------------------
describe('T2.7 — Intento de XSS en aprobados', () => {
  test('código con script tag devuelve 400', async () => {
    const res = await request(app)
      .post('/habilitados')
      .set('Content-Type', 'application/json')
      .send({ aprobados: ['1INF30<script>'] });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'aprobados contiene códigos con formato inválido' });
  });

  test('el body de la respuesta no refleja la entrada maliciosa', async () => {
    const res = await request(app)
      .post('/habilitados')
      .set('Content-Type', 'application/json')
      .send({ aprobados: ['1INF30<script>'] });

    const bodyStr = JSON.stringify(res.body);
    expect(bodyStr).not.toContain('script');
    expect(bodyStr).not.toContain('<');
  });
});

// ---------------------------------------------------------------------------
// Requisito 3 — Request size limits for POST /habilitados (T3.1 – T3.3)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// T3.1 — Body larger than 4 096 bytes → 413 { error: 'solicitud demasiado grande' }
// ---------------------------------------------------------------------------
describe('T3.1 — Body mayor a 4096 bytes devuelve 413', () => {
  test(
    'body con relleno >4096 bytes devuelve 413 con error solicitud demasiado grande en ≤1000 ms',
    async () => {
      const body = JSON.stringify({ aprobados: [], relleno: 'x'.repeat(4097) });

      const start = Date.now();
      const res = await request(app)
        .post('/habilitados')
        .set('Content-Type', 'application/json')
        .send(body);
      const elapsed = Date.now() - start;

      expect(res.status).toBe(413);
      expect(res.body).toEqual({ error: 'solicitud demasiado grande' });
      expect(elapsed).toBeLessThanOrEqual(1000);
    },
    5000,
  );
});

// ---------------------------------------------------------------------------
// T3.2 — aprobados with 5 000 codes (body >> 4 KB) → 413
// ---------------------------------------------------------------------------
describe('T3.2 — aprobados con 5 000 códigos devuelve 413', () => {
  test(
    '5000 códigos válidos superan 4 KB y devuelven 413 en ≤1000 ms',
    async () => {
      const aprobados = Array.from({ length: 5000 }, (_, i) => 'A' + String(i).padStart(4, '0'));
      const body = JSON.stringify({ aprobados });

      const start = Date.now();
      const res = await request(app)
        .post('/habilitados')
        .set('Content-Type', 'application/json')
        .send(body);
      const elapsed = Date.now() - start;

      expect(res.status).toBe(413);
      expect(res.body).toEqual({ error: 'solicitud demasiado grande' });
      expect(elapsed).toBeLessThanOrEqual(1000);
    },
    5000,
  );
});

// ---------------------------------------------------------------------------
// T3.3 — Valid body under 4 KB → 200
// ---------------------------------------------------------------------------
describe('T3.3 — Body válido bajo 4 KB devuelve 200', () => {
  test(
    '100 códigos bien formados (body <4 KB) devuelven 200',
    async () => {
      const aprobados = Array.from({ length: 100 }, (_, i) => 'A' + String(i).padStart(4, '0'));
      const body = JSON.stringify({ aprobados });

      // Confirm the body is actually under 4096 bytes
      expect(Buffer.byteLength(body, 'utf8')).toBeLessThan(4096);

      const res = await request(app)
        .post('/habilitados')
        .set('Content-Type', 'application/json')
        .send(body);

      expect(res.status).toBe(200);
    },
    5000,
  );
});

// ---------------------------------------------------------------------------
// Requisito 4 — Error handling for POST /habilitados (T4.1 – T4.3)
// ---------------------------------------------------------------------------
const repositorio = require('../src/data/repositorio');

afterEach(() => {
  jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// T4.1 — repositorio.listar throws → 500 { error: 'error interno' }
// ---------------------------------------------------------------------------
describe('T4.1 — Error interno devuelve 500 con mensaje genérico', () => {
  test('cuando listar lanza un error, responde 500 con { error: "error interno" }', async () => {
    jest.spyOn(repositorio, 'listar').mockImplementation(() => {
      throw new Error('unexpected failure');
    });

    const res = await request(app)
      .post('/habilitados')
      .set('Content-Type', 'application/json')
      .send({ aprobados: ['1INF25'] });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'error interno' });
  });
});

// ---------------------------------------------------------------------------
// T4.2 — Internal paths and stack traces are NOT exposed in the response
// ---------------------------------------------------------------------------
describe('T4.2 — La respuesta no expone rutas internas ni stack traces', () => {
  test('el body de la respuesta no contiene stack, " at ", ".js" ni "C:\\"', async () => {
    jest.spyOn(repositorio, 'listar').mockImplementation(() => {
      const err = new Error('C:\\apps\\malla\\src\\data\\repositorio.js');
      err.stack = `Error: C:\\apps\\malla\\src\\data\\repositorio.js\n    at Object.listar (C:\\apps\\malla\\src\\data\\repositorio.js:10:11)\n    at Layer.handle [as handle_request] (C:\\apps\\malla\\node_modules\\express\\lib\\router\\layer.js:95:5)`;
      throw err;
    });

    const res = await request(app)
      .post('/habilitados')
      .set('Content-Type', 'application/json')
      .send({ aprobados: ['1INF25'] });

    expect(res.status).toBe(500);

    const bodyStr = JSON.stringify(res.body);
    expect(bodyStr).not.toContain('stack');
    expect(bodyStr).not.toContain(' at ');
    expect(bodyStr).not.toContain('.js');
    expect(bodyStr).not.toContain('C:\\');
  });
});

// ---------------------------------------------------------------------------
// T4.3 — Broken JSON and oversized body do NOT produce 500
// ---------------------------------------------------------------------------
describe('T4.3 — JSON inválido y body sobredimensionado no producen 500', () => {
  test('body JSON roto no produce 500', async () => {
    const res = await request(app)
      .post('/habilitados')
      .set('Content-Type', 'application/json')
      .send('{"aprobados":');

    expect(res.status).not.toBe(500);
  });

  test('body mayor a 4096 bytes no produce 500', async () => {
    const body = 'x'.repeat(4097);

    const res = await request(app)
      .post('/habilitados')
      .set('Content-Type', 'application/json')
      .send(body);

    expect(res.status).not.toBe(500);
  });
});
