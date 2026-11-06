# GoOut ✳

Protótipo web de recomendação e descoberta de rolês, feito com **HTML, CSS, JavaScript puro e Bootstrap 5**. Identidade visual inspirada em cartazes de festivais: **azul royal + vermelho**, com amarelo, rosa, lilás e verde.

> **Aviso:** todos os eventos, datas, preços, imagens associadas e distâncias apresentados são **fictícios e ilustrativos**. Este protótipo não é uma agenda de eventos reais nem disponibiliza reservas/ingressos.

## Como abrir

### Jeito mais simples (sem instalar nada)

1. Descompacte `GoOut-site.zip`.
2. Abra a pasta no VS Code.
3. Dê dois cliques em `index.html` (ou abra com a extensão **Live Server**).

> Para carregar as fontes, Bootstrap e fotos ilustrativas hospedadas externamente, use conexão com a internet. A página tem estilos próprios e planos de fundo de reserva caso algum recurso externo não carregue.

### Com Vite (opcional)

```bash
npm install
npm run dev
```

Abra o endereço local mostrado no terminal, normalmente `http://localhost:5173`.

Para gerar a versão de produção: `npm run build`.

## Estrutura

```text
GoOut-site/
├── index.html           # Estrutura e telas/modais da aplicação
├── css/
│   └── styles.css       # Visual, paleta, animações e responsividade
├── js/
│   ├── events.js        # Catálogo de 14 eventos FICTÍCIOS
│   └── app.js           # Filtros, pesquisa, favoritos, modais e perfil
├── assets/
│   └── favicon.svg      # Ícone do site
├── package.json         # Scripts opcionais do Vite
├── .gitignore
└── README.md
```

## O que já funciona

- Pesquisa por nome, local, bairro, descrição ou categoria.
- Categorias deslizantes; filtros por orçamento, distância ilustrativa, companhia e dia da semana.
- Ordenação por relevância, data, preço ou distância.
- Favoritos persistidos no `localStorage` do navegador.
- Detalhes dos eventos, botão de compartilhar e ação **Me surpreenda**.
- Perfil demonstrativo (apelido e companhia preferida), salvo só no navegador.
- Layout responsivo com menu inferior no celular e navegação superior em telas maiores.
- Modal de detalhes e estados de resultados vazios.

## Observações técnicas

**Escopo:** front-end demonstrativo. Não há autenticação real, API, banco de dados, mapas, geolocalização, compra de ingresso ou algoritmo treinado. Os filtros são regras em JavaScript sobre um catálogo pequeno. É um ponto de partida para evoluir para a arquitetura em camadas do projeto (front-end → API REST → serviços de recomendação → banco relacional).

**Privacidade:** apenas apelido, preferência de companhia e IDs de favoritos são armazenados no `localStorage` do dispositivo. Nenhum dado é enviado para servidores próprios. Recursos externos (Bootstrap CDN, Google Fonts e imagens Unsplash) são carregados no navegador.

**Onde editar:** cores/layout em `css/styles.css`, eventos em `js/events.js`, comportamentos em `js/app.js` e conteúdo estrutural em `index.html`.

**Próximos passos:** conectar uma API REST; persistir usuários e eventos no banco; substituir dados de demonstração por eventos validados e atuais; configurar autenticação; tratar recomendação por similaridade ou agrupamento conforme o estudo CRISP-DM.

---

Projeto acadêmico GoOut • 2026
