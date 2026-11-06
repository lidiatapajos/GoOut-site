import { GOOUT_CATEGORIES } from '../js/events.js';

const categoryIds = new Set(GOOUT_CATEGORIES.filter(({ id }) => id !== 'todos').map(({ id }) => id));
const companyOptions = new Set(['sozinho', 'amigos', 'casal']);
const accents = new Set(['pink', 'green', 'blue']);
const fields = new Set([
  'title', 'subtitle', 'category', 'date', 'location', 'neighborhood',
  'price', 'distance', 'company', 'age', 'description', 'image',
  'colors', 'accent', 'featured'
]);

const text = (value, maxLength) =>
  typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maxLength;

export function validateEvent(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return 'O corpo deve ser um objeto JSON.';
  }

  const unknownFields = Object.keys(input).filter((key) => !fields.has(key));
  if (unknownFields.length) return `Campo(s) não permitido(s): ${unknownFields.join(', ')}.`;

  if (!text(input.title, 120)) return 'title deve ter entre 1 e 120 caracteres.';
  if (!text(input.subtitle, 160)) return 'subtitle deve ter entre 1 e 160 caracteres.';
  if (!categoryIds.has(input.category)) return 'category não é uma categoria válida.';
  if (!text(input.date, 40) || Number.isNaN(Date.parse(input.date))) return 'date deve ser uma data válida em formato ISO.';
  if (!text(input.location, 160)) return 'location deve ter entre 1 e 160 caracteres.';
  if (!text(input.neighborhood, 120)) return 'neighborhood deve ter entre 1 e 120 caracteres.';
  if (!Number.isFinite(input.price) || input.price < 0 || input.price > 1000000) return 'price deve ser um número entre 0 e 1000000.';
  if (!Number.isFinite(input.distance) || input.distance < 0 || input.distance > 10000) return 'distance deve ser um número entre 0 e 10000.';
  if (!Array.isArray(input.company) || !input.company.length || input.company.some((item) => !companyOptions.has(item))) {
    return 'company deve conter uma ou mais opções válidas.';
  }
  if (!Number.isInteger(input.age) || input.age < 0 || input.age > 120) return 'age deve ser um número inteiro entre 0 e 120.';
  if (!text(input.description, 2000)) return 'description deve ter entre 1 e 2000 caracteres.';

  let image;
  try {
    image = new URL(input.image);
  } catch {
    return 'image deve ser uma URL válida HTTPS.';
  }
  if (image.protocol !== 'https:') return 'image deve ser uma URL HTTPS.';

  if (!Array.isArray(input.colors) || input.colors.length !== 2 || input.colors.some((color) => typeof color !== 'string' || !/^#[0-9a-f]{6}$/i.test(color))) {
    return 'colors deve conter duas cores hexadecimais.';
  }
  if (!accents.has(input.accent)) return 'accent não é válido.';
  if (typeof input.featured !== 'boolean') return 'featured deve ser booleano.';
  return null;
}
