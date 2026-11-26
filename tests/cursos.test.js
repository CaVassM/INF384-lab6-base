const request = require('supertest');
const app = require('../src/app');

describe('GET /cursos', () => {
  // Requisito 1.1 – devuelve todos los cursos con los campos del contrato
  test('1.1 responde 200 con todos los cursos (87)', async () => {
    const res = await request(app).get('/cursos');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(87);
  });

  test('1.1 cada curso contiene id, name, credits, cycle y type', async () => {
    const res = await request(app).get('/cursos');

    for (const curso of res.body) {
      expect(curso).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          name: expect.any(String),
          credits: expect.any(Number),
          type: expect.stringMatching(/^(obligatorio|electivo)$/),
        }),
      );
      // cycle puede ser número o null (electivos)
      expect(curso).toHaveProperty('cycle');
    }
  });

  // Requisito 1.2 – filtro por ciclo válido
  test('1.2 ?ciclo=6 devuelve solo los cursos del ciclo 6', async () => {
    const res = await request(app).get('/cursos?ciclo=6');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body.every((c) => c.cycle === 6)).toBe(true);
  });

  test('1.2 ?ciclo=5 devuelve solo los cursos del ciclo 5', async () => {
    const res = await request(app).get('/cursos?ciclo=5');

    expect(res.status).toBe(200);
    expect(res.body.every((c) => c.cycle === 5)).toBe(true);
  });

  test('1.2 ?ciclo=10 devuelve solo los cursos del ciclo 10', async () => {
    const res = await request(app).get('/cursos?ciclo=10');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
    expect(res.body.every((c) => c.cycle === 10)).toBe(true);
  });

  // Requisito 1.3 – ciclo inválido → 400
  test('1.3 ?ciclo=4 responde 400 (fuera de rango)', async () => {
    const res = await request(app).get('/cursos?ciclo=4');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'ciclo debe ser un entero entre 5 y 10' });
  });

  test('1.3 ?ciclo=11 responde 400 (fuera de rango)', async () => {
    const res = await request(app).get('/cursos?ciclo=11');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'ciclo debe ser un entero entre 5 y 10' });
  });

  test('1.3 ?ciclo=abc responde 400 (no es entero)', async () => {
    const res = await request(app).get('/cursos?ciclo=abc');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'ciclo debe ser un entero entre 5 y 10' });
  });

  test('1.3 ?ciclo=5.5 responde 400 (no es entero)', async () => {
    const res = await request(app).get('/cursos?ciclo=5.5');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'ciclo debe ser un entero entre 5 y 10' });
  });
});

describe('GET /cursos/:codigo', () => {
  // Requisito 2.1 – devuelve el curso con sus requisitos resueltos
  test('2.1 responde 200 con el curso y sus requisitos (id y name)', async () => {
    // 1INF30 "Programación 3" tiene prerequisito 1INF25 "Programación 2"
    const res = await request(app).get('/cursos/1INF30');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: '1INF30',
      name: 'Programación 3',
      credits: 5,
      cycle: 6,
      type: 'obligatorio',
    });
    expect(Array.isArray(res.body.prerequisites)).toBe(true);
    expect(res.body.prerequisites).toHaveLength(1);
    expect(res.body.prerequisites[0]).toEqual({ id: '1INF25', name: 'Programación 2' });
  });

  test('2.1 curso sin requisitos devuelve prerequisites vacío', async () => {
    // 1GES92 "Taller de Habilidades Interpersonales" no tiene requisitos
    const res = await request(app).get('/cursos/1GES92');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: '1GES92' });
    expect(res.body.prerequisites).toEqual([]);
  });

  // Requisito 2.2 – código inexistente → 404
  test('2.2 código inexistente responde 404', async () => {
    const res = await request(app).get('/cursos/NOEXISTE');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'curso no encontrado' });
  });
});

describe('Middleware de manejo de errores (Requisito 3.2)', () => {
  // Usamos una app mínima para garantizar que la ruta error va ANTES del handler
  let testApp;
  beforeAll(() => {
    const express = require('express');
    const { errorHandler } = require('../src/app');
    testApp = express();
    testApp.get('/test-error', (req, res, next) => {
      next(new Error('fallo inesperado'));
    });
    testApp.use(errorHandler);
  });

  test('3.2 error no controlado responde 500 con {"error":"error interno"}', async () => {
    const res = await request(testApp).get('/test-error');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'error interno' });
  });

  test('3.2 la respuesta no expone stack trace ni rutas de archivo', async () => {
    const res = await request(testApp).get('/test-error');

    const body = JSON.stringify(res.body);
    expect(body).not.toMatch(/Error:/);
    expect(body).not.toMatch(/at\s+\w/);           // stack frames
    expect(body).not.toMatch(/[A-Za-z]:[/\\]/);    // rutas de archivo Windows
    expect(body).not.toMatch(/\/[a-z]+\//);         // rutas de archivo Unix
  });
});
