# Vem na Festa

Plataforma para criar o convite digital de uma festa (casamento ou aniversário), enviar um link pessoal a cada grupo de convidados e acompanhar as confirmações de presença. O anfitrião também gerencia lista de presentes, recados e lembranças. Endereço: vemnafesta.com.

## Como funciona

Cada evento tem o próprio endereço:

- `nome.vemnafesta.com`: convite do evento. Sem o código do convite (`?c=...`) o link não mostra data, horário, local nem presentes.
- `nome.vemnafesta.com/presentes`: lista de presentes.
- `nome.vemnafesta.com/admin`: painel do anfitrião.
- `nome.vemnafesta.com/preview` (ou `/teste`): o convite como o convidado vê, para o anfitrião conferir. Só mostra tudo a quem está logado no painel.
- `vemnafesta.com/admin`: painel geral da plataforma.
- `vemnafesta.com/entrar/...`: primeiro acesso do anfitrião e login com Google.

Fora de vemnafesta.com (testes locais, workers.dev) o evento fica em `/e/nome/`.

## Tecnologia

- Front-end em HTML, CSS e JavaScript puros, sem framework e sem etapa de build.
- Servidor: Cloudflare Workers com Pages Functions (pasta `functions/`).
- Banco de dados: Cloudflare D1 (`schema.sql`; as migrações automáticas ficam em `functions/_migracoes.js`).
- Fotos e vídeos: Cloudflare R2.

## Pastas principais

- `index.html`: o convite do convidado (modelo único para todos os eventos).
- `admin/index.html`: os painéis do anfitrião e da plataforma.
- `presentes/`, `landing/`, `entrar/`: lista de presentes, página inicial e entrada.
- `functions/`: rotas da API e roteamento por endereço (`_middleware.js`, `_enderecos.js`).
- `formas.js`, `fontes.js`, `compartilhar.js`, `datas.js`, `ancoras.js`, `html-seguro.js`, `rotas.js`: partes compartilhadas.
- `ferramentas/montar-site.mjs`: monta a pasta pública `.public` com só o que pode ser publicado.
- `schema.sql`, `seed-conteudo.sql`, `seed.sql`: banco e dados de exemplo.
- `design/capturas/`: capturas das telas para consulta de design.
- `ROADMAP.md`: ideias para depois.

## Rodar no computador

Precisa de Node.js. Com um banco local novo:

```
npx wrangler@4 d1 execute DB --local --persist-to .wrangler/state --file=schema.sql
npx wrangler@4 d1 execute DB --local --persist-to .wrangler/state --file=seed-conteudo.sql
npx wrangler@4 d1 execute DB --local --persist-to .wrangler/state --file=seed.sql
npx wrangler@4 pages dev . --port 8799 --persist-to .wrangler/state --binding ADMIN_USER=admin --binding ADMIN_PASSWORD=troque-esta-senha
```

Depois abra `http://localhost:8799/e/casamento/` (convite) e `http://localhost:8799/admin/` (painel geral, com o usuário e a senha acima).

## Publicar

O deploy usa o Workers Builds, ligado a este repositório, com o comando `npx wrangler deploy -c wrangler.workers.jsonc`. O arquivo `wrangler.workers.jsonc` já inclui a etapa que gera as rotas e monta `.public`. O `wrangler.toml` é do Pages antigo.

Variáveis configuradas no Worker (os valores não ficam no repositório): `ADMIN_USER`, `ADMIN_PASSWORD`, `ADMIN_EMAILS` e `GOOGLE_CLIENT_ID`.

## Acesso e privacidade

- Painel do anfitrião: usuário e senha ou login com Google, por convite de uso único.
- Dados, fotos e a lista de convidados são de cada evento e não ficam visíveis a quem abre o link sem código.
- Não guarde senhas nem chaves no repositório. O arquivo `.dev.vars` (usado só localmente) fica fora do Git.
