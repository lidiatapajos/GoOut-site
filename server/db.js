import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { GOOUT_DEMO_EVENTS } from '../js/events.js';

const createSchema = (db) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      subtitle TEXT NOT NULL,
      category TEXT NOT NULL,
      date TEXT NOT NULL,
      location TEXT NOT NULL,
      neighborhood TEXT NOT NULL,
      price REAL NOT NULL,
      distance REAL NOT NULL,
      company_json TEXT NOT NULL,
      age INTEGER NOT NULL,
      description TEXT NOT NULL,
      image TEXT NOT NULL,
      colors_json TEXT NOT NULL,
      accent TEXT NOT NULL,
      featured INTEGER NOT NULL DEFAULT 0,
      is_demo INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS favorites (
      client_id TEXT NOT NULL,
      event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (client_id, event_id)
    );

    CREATE TABLE IF NOT EXISTS system_metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS events_date_idx ON events(date);
    CREATE INDEX IF NOT EXISTS favorites_client_idx ON favorites(client_id);
  `);
};

const seedDemoEvents = (db) => {
  const seeded = db.prepare('SELECT 1 FROM system_metadata WHERE key = ?').get('demo_events_seeded');
  if (seeded) return;

  const insert = db.prepare(`
    INSERT INTO events (
      id, title, subtitle, category, date, location, neighborhood, price,
      distance, company_json, age, description, image, colors_json, accent,
      featured, is_demo
    ) VALUES (
      @id, @title, @subtitle, @category, @date, @location, @neighborhood,
      @price, @distance, @company_json, @age, @description, @image,
      @colors_json, @accent, @featured, 1
    )
  `);
  const seed = db.transaction((events) => {
    for (const event of events) {
      insert.run({
        ...event,
        company_json: JSON.stringify(event.company),
        colors_json: JSON.stringify(event.colors),
        featured: Number(Boolean(event.featured))
      });
    }
    db.prepare('INSERT INTO system_metadata (key, value) VALUES (?, ?)')
      .run('demo_events_seeded', new Date().toISOString());
  });
  seed(GOOUT_DEMO_EVENTS);
};

export function createDatabase(databasePath = './data/goout.sqlite') {
  if (databasePath !== ':memory:') {
    const absolutePath = path.resolve(databasePath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    databasePath = absolutePath;
  }

  const db = new Database(databasePath);
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  if (databasePath !== ':memory:') db.pragma('journal_mode = WAL');
  createSchema(db);
  seedDemoEvents(db);
  return db;
}

export function mapEvent(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    category: row.category,
    date: row.date,
    location: row.location,
    neighborhood: row.neighborhood,
    price: row.price,
    distance: row.distance,
    company: JSON.parse(row.company_json),
    age: row.age,
    description: row.description,
    image: row.image,
    colors: JSON.parse(row.colors_json),
    accent: row.accent,
    featured: Boolean(row.featured),
    is_demo: Boolean(row.is_demo)
  };
}
