# Prompt para o Claude Design: dois design systems do Vem na Festa

Cole o texto abaixo no Claude Design. Ele tem acesso de leitura ao repositório `rphaleixo/confirmacaocasamento`.

---

Você vai criar dois design systems separados para o Vem na Festa (vemnafesta.com), uma plataforma em que o anfitrião de um casamento ou aniversário cria o convite digital, envia um link pessoal a cada grupo de convidados pelo WhatsApp e acompanha as confirmações de presença. O convidado usa quase sempre o celular. O anfitrião não é técnico e usa celular e computador. O idioma é português do Brasil.

## 1. A decisão central: dois design systems, não um

Sistema A, "Marca e plataforma": tudo o que é do Vem na Festa. Página inicial, páginas institucionais, entrada e login, painel do anfitrião, painel geral da plataforma, diálogos, avisos, e-mails e telas de sistema. Segue o manual da marca.

Sistema B, "Convites": os módulos que compõem o convite que o convidado abre. Quem decide a cara é o anfitrião, escolhendo cores, fontes, divisórias e escala. O sistema precisa funcionar bem com qualquer combinação, e não tem a identidade visual do Vem na Festa.

A fronteira entre os dois é regra de projeto:
- A e B não compartilham tokens de cor nem de fonte. Prefixos diferentes: `--vnf-` para A e `--ev-` para B.
- A única presença da marca dentro do convite é o selo "Feito com Vem na Festa" no rodapé, obrigatório e clicável (leva a vemnafesta.com). Ele precisa de uma versão que fique legível sobre qualquer paleta de convite.
- O painel mostra prévias do convite (Sistema B) dentro de uma moldura do Sistema A. Desenhe essa fronteira.
- Os dois seguem as mesmas regras de acessibilidade e de escrita (seção 4).

## 2. Ordem de trabalho

1. Brandbook do Vem na Festa (se eu já tiver enviado o manual da marca, use-o e só complete o que faltar): nome e grafia "Vem na Festa", conceito, tom de voz, logotipo e símbolo (principal, horizontal, monocromático, sobre fundo claro e escuro, área de proteção, tamanho mínimo, usos incorretos), paleta com contraste verificado, tipografia, iconografia, aplicações (página inicial, miniatura de WhatsApp de 1200x630, e-mail, favicon).
2. Design system A.
3. Design system B.
4. Telas do Sistema A redesenhadas e as novas (seção 3).

Entregue o Sistema A inteiro antes de começar o B. Se algo estiver ambíguo, liste as dúvidas no início da resposta e siga com a hipótese mais razoável, dizendo qual foi.

## 3. Telas

### 3.1 Existem hoje no Sistema A (arquivo no repositório)

- Página inicial provisória: `landing/index.html` (só um título, uma frase e um botão "Ver um exemplo").
- Entrar: convite de acesso do anfitrião e login com Google: `entrar/index.html`.
- Login dos painéis: `admin/index.html` (bloco `#login`).
- Painel geral da plataforma: Visão geral, Eventos, Anfitriões, Templates: `admin/index.html`.
- Novo evento, em 4 passos, e editar evento: `admin/index.html`.
- Painel do anfitrião: Painel, Respostas, Importar lista, Mover convidado, Mesclar grupos, Removidos recentemente, Conteúdo, Cores, Tipografia, Formas e estilo, Ordem dos módulos, Presentes, Lembranças, Recados: `admin/index.html`.
- Assistente de preparo do convite, Publicar, Save the Date: `admin/index.html`.
- Diálogos: novo grupo, adicionar e editar convidado, fila de envio pelo WhatsApp, convite de acesso, contas Google, confirmações de ação perigosa, seletor de cor.
- Moldura do painel (barra superior, navegação por áreas, cabeçalho de página, faixa de teste do preview).
- Página "Em breve" (o convidado vê enquanto o convite não está publicado): `functions/_embreve.js`. Moldura do Sistema A, conteúdo com a cor do evento.
- Telas de sistema: "Atualizando o sistema" e "Algo deu errado": `functions/_middleware.js`.

### 3.2 Existem hoje no Sistema B

Convite completo em `index.html` (modelo único para todos os eventos). Módulos, na ordem padrão, que o anfitrião liga, desliga e reordena:
- Capa (7 modelos de posição dos textos, imagem ou vídeo, nomes, data, horário, botão e prazo).
- Contagem regressiva (9 estilos).
- Chamada para presentes.
- Linha do tempo.
- Padrinhos e madrinhas.
- Pais e daminhas.
- Localização.
- Galeria.
- Confirmação de presença (por pessoa: Vai, Não sei, Não vai).
- Presentes.
- Recados.
- Rodapé, barra fixa e menu de navegação opcional.

Páginas do convite: lista de presentes (`presentes/index.html`) e a faixa do modo teste (`/preview`).

Estados do convite que precisam de desenho: link sem código (sem data, local nem presentes), link com código, prazo encerrado (quem respondeu vê as respostas sem poder mudar; quem não respondeu vê uma mensagem), depois do evento, evento aberto (sem confirmação), Save the Date (só a capa).

Também são do Sistema B: as 18 divisórias entre módulos (`formas.js`), as 57 fontes (`fontes.js`), os 6 temas prontos e a imagem de compartilhamento do WhatsApp em 4 estilos (`compartilhar.js`).

### 3.3 Não existem, mas são fundamentais (Sistema A)

Verifiquei no repositório que nenhuma delas existe hoje.
1. Página inicial de verdade: proposta de valor, como funciona em poucos passos, exemplos de convites (hoje só o botão "Ver um exemplo"), perguntas frequentes e chamada para criar o convite. Mobile primeiro.
2. Galeria de modelos e exemplos: os temas prontos vistos em convites reais, para casamento e aniversário.
3. Planos e preços, ou a explicação de como o produto é oferecido. Se isso ainda não está decidido, desenhe a estrutura com dados de exemplo e marque como hipótese.
4. Criar conta e criar o primeiro evento sozinho. Hoje só o administrador da plataforma cria evento (`functions/api/admin/eventos.js` linha 6).
5. Entrar para quem não sabe o endereço do evento: um login geral do anfitrião. Hoje o login depende de abrir `nome.vemnafesta.com/admin` ou um convite de acesso.
6. Recuperar acesso. Hoje existe só um texto no login ("Peça um novo acesso a quem criou o seu evento").
7. Termos de uso e política de privacidade. O produto guarda nomes e telefones de convidados.
8. Ajuda e contato.
9. Página 404 e "evento não encontrado". Hoje é um texto simples (`functions/e/[[path]].js` linha 13).
10. E-mails: não achei envio de e-mail no projeto. Desenhe o modelo base para os que vão existir (convite de acesso do anfitrião, boas-vindas).

Fora do escopo (não desenhe): mesas do jantar, orçamento da festa e portaria no dia da festa (`ROADMAP.md`).

## 4. Regras fixas

Escrita e tom:
- Português simples, caloroso, sem jargão. Evite negrito no corpo do texto; negrito só em títulos.
- Sem emoji na interface. Emoji só na microcopy de agradecimento ao convidado ("Presença confirmada! Obrigado") e em texto escrito pelo anfitrião.
- Botões de limpar dizem "Limpar". A lixeira chama-se "Removidos recentemente".

Cor e legibilidade:
- Nunca use bordô ou vinho como cor de texto. No Sistema B, quando a cor primária do anfitrião for escura ou de baixo contraste, o texto usa a cor de texto do tema, nunca a primária.
- Contraste mínimo AA em todo texto e componente. Dourado em texto pequeno sobre claro não passa e precisa de versão escurecida.
- Alvo de toque de pelo menos 44px no celular. Foco visível. Respeitar "reduzir movimento". Nada que se mova sozinho sem opção de pausar (a galeria hoje falha nisso).

Interface:
- Ícones em SVG de traço, 24px, `currentColor`.
- Cabeçalho de página único e igual em todas as telas do painel.
- A paleta do evento fica sempre em acesso rápido nos seletores de cor.
- Status de convidados (decisão já tomada): 6 situações de grupo (Confirmado, Parcial, Em dúvida, Não vão, Abriu sem resposta, Não abriu) e 4 de pessoa (Vai, Não sei, Não vai, Sem resposta), cada uma com cor própria.
- O convite tem coluna única de até 460px e é pensado primeiro para celular.

Implementação (como vou receber):
- HTML, CSS e JavaScript puros. Sem framework, sem Tailwind, sem etapa de build. Só Google Fonts como recurso externo.
- Tudo abre direto no navegador, sem servidor.
- Nomes de classe em kebab-case, em português ou neutros.
- O painel já usa as bibliotecas Cropper.js e Sortable.js; convivam com elas, não adicionem outras.

## 5. O que quero receber, por sistema

Duas pastas separadas: `design/marca/` (Sistema A) e `design/convites/` (Sistema B).

Em cada uma:
- `tokens.css`: cor, tipografia, espaçamento, raio, sombra, borda, foco, movimento e camadas. Prefixo `--vnf-` em A e `--ev-` em B.
- `componentes.css` e, se precisar de comportamento, `componentes.js`.
- Um catálogo HTML vivo (`design-system.html`), com cada componente em todos os estados (normal, foco, desativado, carregando, erro) e as regras de uso.
- Para o Sistema A: o brandbook (`brandbook.html`), `logo/` com todos os SVGs, `icones/` e os HTMLs das telas, usando só os arquivos acima.
- Para o Sistema B: o catálogo dos 12 módulos funcionando com pelo menos 4 paletas muito diferentes (clara, escura, saturada, de baixo contraste), a regra de adaptação quando a paleta do anfitrião falha no contraste, e os estados do convite (seção 3.2).
- `IMPLEMENTACAO.md` por sistema, com: de-para dos tokens novos para os atuais, ordem de migração (tokens, componentes, telas), componentes que dependem de JavaScript, risco de quebra visual por tela e lista de conferência por tela.

Mapa dos tokens atuais, para a migração não quebrar nada:
- Convite (Sistema B): `--wine`, `--wine-soft`, `--gold`, `--blush`, `--ink` e as derivadas em `index.html`. Os nomes são herança de um tema antigo; mantenha o de-para.
- Painel (Sistema A): `--navy`, `--navy-2`, `--bg`, `--surface`, `--ink`, `--line`, `--ok`, `--warn`, `--info`, `--err` em `admin/index.html`.

## 6. Como usar o repositório

Use o repositório como fonte de verdade do que existe hoje: leia, meça, extraia valores reais e cite arquivo e linha ao afirmar algo. Se o código contradisser este texto, vale o código e você me avisa no início da resposta.

Faça:
- Trabalhe só em leitura: sem commit, sem push, sem pull request, sem criar branch.
- Comece por `index.html` (convite), `admin/index.html` (painéis), `formas.js`, `fontes.js`, `compartilhar.js`, `landing/index.html`, `entrar/index.html`, `presentes/index.html` e `functions/_embreve.js`.
- Olhe as capturas em `design/capturas/` (leia o `LEIA-ME.md` de lá) e o `README.md`.

Não faça:
- Não altere nenhum arquivo do repositório.
- Não leia nem copie segredos (senhas, chaves, variáveis de ambiente).
- Não copie código de `functions/` nem de `schema.sql` para os entregáveis; servidor e banco de dados não fazem parte do design.
- Não mude IDs, atributos `data-` nem nomes de campos que o JavaScript usa. Se o redesenho exigir mudar algum, liste no `IMPLEMENTACAO.md` e não considere feito.
- Não trate o repositório como projeto novo. O trabalho é a camada visual por cima do que existe.
