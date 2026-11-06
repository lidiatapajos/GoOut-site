import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { mapEvent } from './db.js';
import { validateEvent } from './validation.js';

const clientIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const eventValues = (event) => ({
  title: event.title.trim(),
  subtitle: event.subtitle.trim(),
  category: event.category,
  date: event.date,
  location: event.location.trim(),
  neighborhood: event.neighborhood.trim(),
  price: event.price,
  distance: event.distance,
  company_json: JSON.stringify([...new Set(event.company)]),
  age: event.age,
  description: event.description.trim(),
  image: event.image,
  colors_json: JSON.stringify(event.colors),
  accent: event.accent,
  featured: Number(event.featured)
});

const requireAdmin = (adminToken) => (req, res, next) => {
  if (!adminToken) {
    return res.status(503).json({ error: 'Cadastro administrativo desabilitado. Configure ADMIN_API_TOKEN no servidor.' });
  }

  const provided = req.get('x-admin-token') ?? '';
  const expectedBuffer = Buffer.from(adminToken);
  const providedBuffer = Buffer.from(provided);
  if (expectedBuffer.length !== providedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, providedBuffer)) {
    return res.status(401).json({ error: 'Token administrativo inválido ou ausente.' });
  }
  next();
};

export function createApp({ db, adminToken = process.env.ADMIN_API_TOKEN, distDir = path.resolve('dist') }) {
  const app = express();
  const adminOnly = requireAdmin(adminToken);

  app.disable('x-powered-by');
  app.use(express.json({ limit: '32kb' }));

  app.get('/api/health', (_req, res) => {
    db.prepare('SELECT 1').get();
    res.json({ status: 'ok', database: 'sqlite', eventSource: 'curated-sqlite' });
  });

  app.get('/api/events', (_req, res) => {
    const rows = db.prepare('SELECT * FROM events ORDER BY featured DESC, date ASC').all();
    res.json({ events: rows.map(mapEvent) });
  });

  app.get('/api/events/:id', (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: 'ID de evento inválido.' });
    const event = mapEvent(db.prepare('SELECT * FROM events WHERE id = ?').get(id));
    if (!event) return res.status(404).json({ error: 'Evento não encontrado.' });
    res.json({ event });
  });

  app.get('/api/favorites/:clientId', (req, res) => {
    const { clientId } = req.params;
    if (!clientIdPattern.test(clientId)) return res.status(400).json({ error: 'Identificador de navegador inválido.' });
    const eventIds = db.prepare('SELECT event_id FROM favorites WHERE client_id = ? ORDER BY created_at DESC')
      .all(clientId)
      .map(({ event_id: eventId }) => eventId);
    res.json({ eventIds });
  });

  app.post('/api/favorites', (req, res) => {
    const { clientId, eventId } = req.body ?? {};
    if (typeof clientId !== 'string' || !clientIdPattern.test(clientId)) {
      return res.status(400).json({ error: 'Identificador de navegador inválido.' });
    }
    if (!Number.isSafeInteger(eventId) || eventId < 1) return res.status(400).json({ error: 'ID de evento inválido.' });
    const exists = db.prepare('SELECT 1 FROM events WHERE id = ?').get(eventId);
    if (!exists) return res.status(404).json({ error: 'Evento não encontrado.' });
    db.prepare('INSERT OR IGNORE INTO favorites (client_id, event_id) VALUES (?, ?)').run(clientId, eventId);
    res.status(204).end();
  });

  app.delete('/api/favorites/:clientId/:eventId', (req, res) => {
    const { clientId } = req.params;
    const eventId = Number(req.params.eventId);
    if (!clientIdPattern.test(clientId)) return res.status(400).json({ error: 'Identificador de navegador inválido.' });
    if (!Number.isSafeInteger(eventId) || eventId < 1) return res.status(400).json({ error: 'ID de evento inválido.' });
    db.prepare('DELETE FROM favorites WHERE client_id = ? AND event_id = ?').run(clientId, eventId);
    res.status(204).end();
  });

  app.post('/api/admin/events', adminOnly, (req, res) => {
    const validationError = validateEvent(req.body);
    if (validationError) return res.status(400).json({ error: validationError });

    const values = eventValues(req.body);
    const result = db.prepare(`
      INSERT INTO events (
        title, subtitle, category, date, location, neighborhood, price, distance,
        company_json, age, description, image, colors_json, accent, featured, is_demo
      ) VALUES (
        @title, @subtitle, @category, @date, @location, @neighborhood, @price,
        @distance, @company_json, @age, @description, @image, @colors_json,
        @accent, @featured, 0
      )
    `).run(values);
    const event = mapEvent(db.prepare('SELECT * FROM events WHERE id = ?').get(result.lastInsertRowid));
    res.status(201).json({ event });
  });

  app.put('/api/admin/events/:id', adminOnly, (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: 'ID de evento inválido.' });
    const validationError = validateEvent(req.body);
    if (validationError) return res.status(400).json({ error: validationError });

    const values = eventValues(req.body);
    const result = db.prepare(`
      UPDATE events SET
        title = @title, subtitle = @subtitle, category = @category, date = @date,
        location = @location, neighborhood = @neighborhood, price = @price,
        distance = @distance, company_json = @company_json, age = @age,
        description = @description, image = @image, colors_json = @colors_json,
        accent = @accent, featured = @featured, is_demo = 0,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = @id
    `).run({ ...values, id });
    if (!result.changes) return res.status(404).json({ error: 'Evento não encontrado.' });
    const event = mapEvent(db.prepare('SELECT * FROM events WHERE id = ?').get(id));
    res.json({ event });
  });

  app.delete('/api/admin/events/:id', adminOnly, (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: 'ID de evento inválido.' });
    const result = db.prepare('DELETE FROM events WHERE id = ?').run(id);
    if (!result.changes) return res.status(404).json({ error: 'Evento não encontrado.' });
    res.status(204).end();
  });

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Rota da API não encontrada.' }));

  if (fs.existsSync(distDir)) app.use(express.static(distDir, { index: false }));
  app.use((req, res, next) => {
    if (req.method === 'GET' && req.accepts('html') && !req.path.startsWith('/api/') && fs.existsSync(path.join(distDir, 'index.html'))) {
      return res.sendFile(path.join(distDir, 'index.html'));
    }
    next();
  });
  app.use((_req, res) => res.status(404).json({ error: 'Recurso não encontrado.' }));
  app.use((error, _req, res, _next) => {
    const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 600 ? error.status : 500;
    if (status >= 500) console.error(error);
    const message = status >= 500 ? 'Erro interno do servidor.' : error.message;
    res.status(status).json({ error: message });
  });

  return app;
}
