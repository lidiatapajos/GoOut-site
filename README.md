# GoOut

Aplicação web para descobrir e organizar eventos em Belém. A primeira versão de backend usa **Node.js + Express** e **SQLite**. O catálogo inicial contém exemplos fictícios identificados na interface; eventos reais precisam ser cadastrados e conferidos pela equipe GoOut.

## Requisitos

- Node.js 20.19+ (ou 22.12+) e npm.
- Para gravar eventos reais no catálogo, configure um token administrativo no servidor.

## Desenvolvimento local

```bash
npm install
cp .env.example .env
```

Gere um segredo aleatório e substitua `ADMIN_API_TOKEN` no `.env`:

```bash
openssl rand -hex 32
```

Inicie API e front-end juntos:

```bash
npm run dev
```

Abra `http://localhost:5173`. O Vite encaminha `/api` para o Express em `http://localhost:3001`. A base SQLite é criada automaticamente em `data/goout.sqlite`.

Outros comandos:

```bash
npm test          # testes da API e do SQLite
npm run build     # gera o front-end de produção em dist/
npm start         # API + arquivos de dist/ em um único servidor
```

`npm start` usa `PORT` (padrão `3001`), `HOST` (padrão `0.0.0.0`), `DATABASE_PATH` e `ADMIN_API_TOKEN` do ambiente. Em produção, `ADMIN_API_TOKEN` é obrigatório. Use um volume persistente para o arquivo SQLite; o sistema de arquivos efêmero de algumas hospedagens apaga o banco ao reiniciar/reimplantar.

## API

- `GET /api/health` — estado da API e do banco.
- `GET /api/events` — lista eventos.
- `GET /api/events/:id` — detalhe de um evento.
- `GET /api/favorites/:clientId` — favoritos do navegador.
- `POST /api/favorites` — salva `{ "clientId": "<UUID>", "eventId": 1 }`.
- `DELETE /api/favorites/:clientId/:eventId` — remove favorito.
- `POST /api/admin/events` — cadastra evento.
- `PUT /api/admin/events/:id` — atualiza evento completo.
- `DELETE /api/admin/events/:id` — remove evento.

As rotas `/api/admin/*` exigem o cabeçalho `X-Admin-Token`, configurado somente no servidor. Não coloque esse token no front-end. Exemplo de cadastro:

```bash
curl -X POST http://localhost:3001/api/admin/events \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: SEU_TOKEN_LOCAL" \
  -d '{
    "title": "Evento de exemplo",
    "subtitle": "Uma descrição curta",
    "category": "musica",
    "date": "2027-02-20T19:00:00-03:00",
    "location": "Local do evento",
    "neighborhood": "Centro",
    "price": 25,
    "distance": 2.5,
    "company": ["amigos", "sozinho"],
    "age": 0,
    "description": "Descrição e informações conferidas com a organização.",
    "image": "https://example.com/evento.jpg",
    "colors": ["#2449f5", "#ef3f47"],
    "accent": "blue",
    "featured": false
  }'
```

As categorias aceitas são `musica`, `gastronomia`, `arte`, `cinema`, `natureza`, `esporte` e `tecnologia`; as opções de companhia são `sozinho`, `amigos` e `casal`. A API valida os campos e aceita apenas URLs de imagem HTTPS.

## Dados e limitações

- O banco é inicializado com 14 eventos de demonstração fictícios. Eles são marcados com `is_demo` e nunca devem ser apresentados como agenda real.
- Eventos cadastrados pela administração ficam no SQLite. A API não tem painel administrativo: use as rotas protegidas com ferramenta local como `curl`.
- Favoritos ficam no SQLite associados a um UUID aleatório armazenado no navegador. Não há conta, autenticação de usuário, sincronização entre dispositivos ou recuperação de favoritos.
- Apelido e preferência de companhia do perfil continuam no `localStorage`.
- A integração de busca pública da Eventbrite não faz parte desta versão; a referência pública atual não oferece um endpoint documentado de descoberta por cidade.
- Distâncias continuam informadas manualmente, sem geolocalização ou cálculo de rota. O GoOut não vende ingressos.
- Bootstrap, fontes e imagens ilustrativas são carregados de serviços externos e exigem internet.

Antes de divulgar eventos, confirme organizador, data, horário, local, faixa etária, preço, disponibilidade e permissão para uso das imagens. A remoção de registros de demonstração é feita pela rota administrativa `DELETE /api/admin/events/:id`; os exemplos não são recriados após a primeira inicialização do banco.

## Estrutura

```text
index.html
css/                    estilos da interface
js/app.js               interface e chamadas à API
js/events.js            categorias e dados de demonstração
server/app.js           rotas REST, validação e arquivos estáticos
server/db.js            esquema e inicialização SQLite
server/validation.js    validação de eventos
server/app.test.js      testes de integração
```
