import 'dotenv/config';
import { createApp } from './app.js';
import { createDatabase } from './db.js';

const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? '0.0.0.0';
const adminToken = process.env.ADMIN_API_TOKEN;

if (process.env.NODE_ENV === 'production' && !adminToken) {
  throw new Error('ADMIN_API_TOKEN é obrigatório em produção.');
}
if (!adminToken) {
  console.warn('ADMIN_API_TOKEN não definido: rotas de cadastro administrativo permanecerão desabilitadas.');
}
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT deve ser um número entre 1 e 65535.');
}

const db = createDatabase(process.env.DATABASE_PATH ?? './data/goout.sqlite');
const app = createApp({ db, adminToken });
app.listen(port, host, () => {
  console.log(`GoOut API disponível em http://${host}:${port}`);
});
