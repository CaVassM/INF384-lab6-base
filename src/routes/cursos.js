const { Router } = require('express');
const repositorio = require('../data/repositorio');

const router = Router();

// GET /cursos  o  GET /cursos?ciclo=N
router.get('/', (req, res) => {
  const { ciclo } = req.query;

  if (ciclo !== undefined) {
    const n = Number(ciclo);
    if (!Number.isInteger(n) || n < 5 || n > 10) {
      return res.status(400).json({ error: 'ciclo debe ser un entero entre 5 y 10' });
    }
    const cursos = repositorio.listarPorCiclo(n).map(formatear);
    return res.json(cursos);
  }

  return res.json(repositorio.listar().map(formatear));
});

// GET /cursos/:codigo
router.get('/:codigo', (req, res) => {
  const curso = repositorio.obtener(req.params.codigo);
  if (!curso) {
    return res.status(404).json({ error: 'curso no encontrado' });
  }
  const prerequisites = curso.prerequisites.map((id) => {
    const req2 = repositorio.obtener(id);
    return { id, name: req2 ? req2.name : id };
  });
  return res.json({ ...formatear(curso), prerequisites });
});

function formatear({ id, name, credits, cycle, type }) {
  return { id, name, credits, cycle, type };
}

module.exports = router;
