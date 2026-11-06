<h1 align="center">GoOut</h1>
<p align="center"><strong>Ficar em casa? Nem pensar.</strong></p>
<p align="center">Encontre seu próximo rolê em Belém, do seu jeito.</p>

<p align="center">
  <code>JavaScript</code> · <code>Bootstrap</code> · <code>Vite</code> · <code>Node.js</code> · <code>Express</code> · <code>SQLite</code>
</p>

<p align="center">
  <a href="https://gooout.netlify.app/">Conheça o GoOut</a> ·
  <a href="#como-rodar">Como rodar</a> ·
  <a href="docs/GUIA-DO-PROJETO.md">Documentação</a>
</p>

---

## A ideia

Você quer sair, mas não sabe pra onde. Ou encontra um evento legal, só que ele fica longe demais ou passa do orçamento. O GoOut reúne opções de lazer para facilitar essa escolha.

O projeto permite explorar eventos em Belém, combinar filtros e guardar os favoritos. A interface usa JavaScript puro e conversa com uma API em Express, que armazena eventos e favoritos em SQLite.

## O que você encontra

- **Busca de eventos** por nome, local, bairro, descrição ou categoria.
- **Filtros combinados** de categoria, orçamento, distância, companhia e período da semana.
- **Ordenação** por relevância, data, preço ou distância. A relevância prioriza os eventos marcados como destaque.
- **Detalhes do rolê**, com horário, local, valor, idade mínima e companhia sugerida.
- **Favoritos** para guardar ideias e consultar depois.
- **Compartilhamento** das informações de um evento.
- **Me surpreenda**, que sorteia uma opção entre os resultados dos filtros atuais.
- **Perfil** com apelido e preferência de companhia.

A navegação se adapta à tela: menu superior no computador e menu inferior no celular.

## Como rodar

### Requisitos

- **Node.js 22.12 ou superior**, com npm. O projeto também aceita a série Node.js 20 a partir da versão 20.19.
- Git, caso opte por clonar o repositório.
- Internet para instalar as dependências e carregar Bootstrap, fontes e imagens externas.

### Instalação

```bash
git clone https://github.com/lidiatapajos/GoOut-site.git
cd GoOut-site
npm ci
npm run dev
```

Abra **http://localhost:5173**, ou o endereço informado pelo Vite no terminal.

O comando inicia o front-end e a API juntos. O Vite encaminha as chamadas de `/api` para o Express na porta **3001**, e o banco é criado automaticamente em `data/goout.sqlite`.

Para explorar o catálogo e usar favoritos localmente, não é necessário configurar um token administrativo. Para encerrar, pressione `Ctrl+C` no terminal.

> Abra o projeto pelo servidor de desenvolvimento. A versão atual depende da API para carregar eventos e salvar favoritos; abrir apenas `index.html` não inicia essa integração.

### Comandos disponíveis

| Comando | Para que serve |
| --- | --- |
| `npm run dev` | Inicia API e front-end juntos, com acompanhamento das alterações. |
| `npm run dev:api` | Inicia somente a API. |
| `npm run dev:web` | Inicia somente o Vite; a API deve estar em execução separadamente. |
| `npm run build` | Gera o front-end de produção em `dist/`. |
| `npm run preview` | Abre a prévia estática da build; não inicia a API. |
| `npm start` | Inicia o Express e serve `dist/`, caso a build já exista. |
| `npm test` | Executa os testes automatizados do projeto. |

## Como o projeto está organizado

| Caminho | Conteúdo |
| --- | --- |
| `index.html` | Estrutura da página, filtros e diálogos. |
| `css/styles.css` | Identidade visual, componentes e responsividade. |
| `js/app.js` | Interações, filtros, favoritos, perfil e chamadas à API. |
| `js/events.js` | Categorias e dados usados na inicialização do catálogo demonstrativo. |
| `assets/` | Recursos visuais locais, como o favicon. |
| `server/index.js` | Inicialização do servidor e do banco. |
| `server/app.js` | Rotas da API e entrega dos arquivos de produção. |
| `server/db.js` | Estrutura e persistência do SQLite. |
| `server/validation.js` | Validação dos dados de eventos. |
| `server/app.test.js` | Testes da API e do banco. |
| `docs/GUIA-DO-PROJETO.md` | Guia visual, componentes e fluxo de navegação. |
| `vite.config.js` | Proxy da API durante o desenvolvimento. |
| `netlify.toml` | Build e encaminhamento da API na hospedagem. |

`data/` é criada para armazenar o banco local. `dist/` é gerada pelo build; as alterações da interface são feitas nos arquivos de origem.

## Identidade visual

O visual combina cartazes de festival, fotos em colagem, tipografia grande e cartões com bordas e sombras marcadas.

| Cor | Hexadecimal | Papel |
| --- | --- | --- |
| Azul royal | `#2449F5` | Cor principal e destaques. |
| Vermelho | `#EF3F47` | Chamadas e elementos de apoio. |
| Amarelo | `#FFE55C` | Botões e acentos. |
| Rosa | `#FFAACB` | Blocos e decoração. |
| Lilás | `#C9B1FF` | Contrastes visuais. |
| Verde-lima | `#D1F66C` | Tags e acentos. |
| Creme | `#FAF7EE` | Fundo da página. |
| Escuro | `#161522` | Textos, bordas e sombras. |

As fontes são **DM Sans** e **Space Grotesk**. A paleta, os componentes e o fluxo estão descritos no [guia do projeto](docs/GUIA-DO-PROJETO.md).

## Dados e integração

Os eventos vêm de `GET /api/events`. Os favoritos ficam no SQLite, associados a um identificador aleatório salvo no navegador. O apelido e a preferência de companhia permanecem no `localStorage`.

O banco começa com exemplos fictícios identificados na interface. A administração pode cadastrar, atualizar e remover eventos pelas rotas `/api/admin/events`, protegidas pelo cabeçalho `X-Admin-Token`. Para habilitá-las, configure `ADMIN_API_TOKEN` somente no ambiente do servidor.

O projeto ainda não possui contas de usuário, sincronização de favoritos entre dispositivos, geolocalização ou recomendação por inteligência artificial. As distâncias são informadas no cadastro, e o GoOut não vende ingressos.

## Publicação

A configuração do Netlify executa `npm run build`, publica `dist/` e encaminha `/api/*` para a API no Render, em `https://goout-site.onrender.com`.

No servidor, `PORT` define a porta, `DATABASE_PATH` define o caminho do SQLite e `ADMIN_API_TOKEN` é obrigatório quando `NODE_ENV=production`. O arquivo do banco precisa de armazenamento persistente para conservar eventos e favoritos após reinícios e novas publicações.

---

<p align="center"><strong>Menos indecisão. Mais histórias pra contar.</strong></p>
<p align="center"><sub>Projeto acadêmico em desenvolvimento · Bootstrap · Google Fonts · Imagens ilustrativas do Unsplash</sub></p>
