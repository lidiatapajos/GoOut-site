import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './app.js';
import { createDatabase } from './db.js';

const clientId = 'c8c0c61e-35a5-4e8f-a864-57a8dbb542ce';
const adminToken = 'test-admin-token';

async function setup(t) {
  const db = createDatabase(':memory:');
  const server = createApp({ db, adminToken }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => {
      db.close();
      if (error) reject(error);
      else resolve();
    });
  }));
  return `http://127.0.0.1:${server.address().port}`;
}

function eventInput(overrides = {}) {
  return {
    title: 'Evento de teste',
    subtitle: 'Descrição curta',
    category: 'musica',
    date: '2027-02-20T19:00:00-03:00',
    location: 'Teatro de teste',
    neighborhood: 'Centro',
    price: 25,
    distance: 2.5,
    company: ['amigos', 'sozinho'],
    age: 0,
    description: 'Um evento cadastrado por teste automatizado.',
    image: 'https://example.com/event.jpg',
    colors: ['#2449f5', '#ef3f47'],
    accent: 'blue',
    featured: false,
    ...overrides
  };
}

test('health endpoint reports SQLite readiness', async (t) => {
  const baseUrl = await setup(t);
  const response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    status: 'ok',
    database: 'sqlite',
    eventSource: 'curated-sqlite'
  });
});

test('events endpoint returns the demo seed marked as fictional', async (t) => {
  const baseUrl = await setup(t);
  const response = await fetch(`${baseUrl}/api/events`);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.events.length, 14);
  assert.equal(body.events.every((event) => event.is_demo), true);
});

test('favorites are validated and persisted per browser identifier', async (t) => {
  const baseUrl = await setup(t);
  const invalid = await fetch(`${baseUrl}/api/favorites/not-a-uuid`);
  assert.equal(invalid.status, 400);

  const add = await fetch(`${baseUrl}/api/favorites`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, eventId: 1 })
  });
  assert.equal(add.status, 204);

  const list = await fetch(`${baseUrl}/api/favorites/${clientId}`);
  assert.deepEqual((await list.json()).eventIds, [1]);

  const remove = await fetch(`${baseUrl}/api/favorites/${clientId}/1`, { method: 'DELETE' });
  assert.equal(remove.status, 204);
  const emptyList = await fetch(`${baseUrl}/api/favorites/${clientId}`);
  assert.deepEqual((await emptyList.json()).eventIds, []);
});

test('event administration requires a token and validates create, update and delete', async (t) => {
  const baseUrl = await setup(t);
  const missingToken = await fetch(`${baseUrl}/api/admin/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(eventInput())
  });
  assert.equal(missingToken.status, 401);

  const headers = { 'Content-Type': 'application/json', 'X-Admin-Token': adminToken };
  const invalidEvent = await fetch(`${baseUrl}/api/admin/events`, {
    method: 'POST',
    headers,
    body: JSON.stringify(eventInput({ image: 'javascript:alert(1)' }))
  });
  assert.equal(invalidEvent.status, 400);

  const create = await fetch(`${baseUrl}/api/admin/events`, {
    method: 'POST',
    headers,
    body: JSON.stringify(eventInput())
  });
  assert.equal(create.status, 201);
  const { event } = await create.json();
  assert.equal(event.is_demo, false);

  const update = await fetch(`${baseUrl}/api/admin/events/${event.id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(eventInput({ title: 'Evento atualizado' }))
  });
  assert.equal(update.status, 200);
  assert.equal((await update.json()).event.title, 'Evento atualizado');

  const remove = await fetch(`${baseUrl}/api/admin/events/${event.id}`, {
    method: 'DELETE',
    headers
  });
  assert.equal(remove.status, 204);
  const missing = await fetch(`${baseUrl}/api/events/${event.id}`);
  assert.equal(missing.status, 404);
});
