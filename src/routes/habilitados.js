'use strict';

const express = require('express');
const repositorio = require('../data/repositorio');

const router = express.Router();

// ---------------------------------------------------------------------------
// 7.1 — validarAprobados(body)
// Validates in the exact order specified by the design. Returns:
//   { ok: true, aprobados }  on success
//   { ok: false, status, error }  on first validation failure
// The 413 (body too large) and 400 (broken JSON) are produced by
// express.json and the global errorHandler; they are NOT replicated here.
// ---------------------------------------------------------------------------
function validarAprobados(body) {
  if (!Object.prototype.hasOwnProperty.call(body, 'aprobados')) {
    return { ok: false, status: 400, error: 'aprobados es requerido' };
  }

  const { aprobados } = body;

  if (!Array.isArray(aprobados)) {
    return { ok: false, status: 400, error: 'aprobados debe ser un arreglo' };
  }

  if (aprobados.some((el) => typeof el !== 'string')) {
    return { ok: false, status: 400, error: 'aprobados debe contener solo cadenas' };
  }

  const FORMATO = /^[A-Z0-9]{6}$/;
  if (aprobados.some((el) => !FORMATO.test(el))) {
    // Do NOT include the received value in the error message (Req. 2.6)
    return { ok: false, status: 400, error: 'aprobados contiene códigos con formato inválido' };
  }

  return { ok: true, aprobados };
}

// ---------------------------------------------------------------------------
// 7.2 — calcularHabilitados(aprobadosSet, todos)
// Returns all courses that are:
//   (a) not already in aprobadosSet, and
//   (b) have every prerequisite satisfied by aprobadosSet.
// Courses with an empty prerequisites array always satisfy condition (b)
// because [].every() returns true.
// Only the five fields id/name/credits/cycle/type are projected.
// ---------------------------------------------------------------------------
function calcularHabilitados(aprobadosSet, todos) {
  return todos
    .filter(
      (c) =>
        !aprobadosSet.has(c.id) &&
        c.prerequisites.every((p) => aprobadosSet.has(p)),
    )
    .map((c) => ({
      id: c.id,
      name: c.name,
      credits: c.credits,
      cycle: c.cycle,
      type: c.type,
    }));
}

// ---------------------------------------------------------------------------
// 7.3 — POST / handler
// Order of checks (see design.md validation table):
//   1. Content-Type check → 415
//   2. validarAprobados → 400
//   3. calcularHabilitados → 200
//   Any unhandled exception propagates to the global errorHandler → 500
// ---------------------------------------------------------------------------
router.post('/', (req, res, next) => {
  try {
    // Validation 3 in design.md: Content-Type must be application/json.
    // express.json only parses when CT is JSON; for other CTs req.body is {}.
    if (!req.is('application/json')) {
      return res.status(415).json({ error: 'content-type debe ser application/json' });
    }

    const validacion = validarAprobados(req.body);
    if (!validacion.ok) {
      return res.status(validacion.status).json({ error: validacion.error });
    }

    const aprobadosSet = new Set(validacion.aprobados);
    // Keep the call as repositorio.listar() (not destructured) so that
    // jest.spyOn(repositorio, 'listar') in test T4.1 intercepts it correctly.
    const habilitados = calcularHabilitados(aprobadosSet, repositorio.listar());

    return res.status(200).json(habilitados);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
