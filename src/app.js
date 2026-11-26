const path = require('path');
const express = require('express');
const repositorio = require('./data/repositorio');

const app = express();

app.use(express.json({ limit: '4kb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', cursos: repositorio.listar().length });
});

app.use('/cursos', require('./routes/cursos'));
app.use('/habilitados', require('./routes/habilitados'));

// Middleware de manejo de errores no controlados (Requisitos 2.1, 3.1, 4.1, 4.2)
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'solicitud demasiado grande' });
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'body inválido' });
  }

  console.error(err);
  res.status(500).json({ error: 'error interno' });
}

app.use(errorHandler);

module.exports = app;
module.exports.errorHandler = errorHandler;
