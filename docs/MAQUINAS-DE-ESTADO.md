# Máquinas de estado do Vem na Festa

Este documento lista os "estados" que o sistema tem (o que o convidado, o anfitrião ou um grupo pode estar sendo em cada momento), o que faz cada um mudar para outro e onde a regra mora no código. Serve para quem mexe no código e para agentes de IA: antes de mudar um comportamento, confira aqui se ele faz parte de uma sequência de estados.

Como ler: cada máquina tem os estados, as transições (o que acontece e o que muda), onde está a regra e o que já foi testado.

## Regras de convivência

- Cada regra mora em um só lugar. A situação de um grupo mora em `situacao.js`; o painel e o servidor só chamam essa regra. Não copie a regra em outro arquivo.
- Todo estado tem um nome. Se um comportamento novo precisar de "mais um estado", acrescente-o na tabela da máquina correspondente e no teste.
- Uma resposta de convidado só é gravada por `gravarResposta()` (functions/_lib.js), que mantém `resposta` e `confirmado` iguais.
- Depois de mudar algo que a situação do grupo lê (respostas, abertura do link, data de confirmação, pessoas do grupo), chame `recalcularStatusGrupo()`.

## Inventário

Classificação: manter (já está claro e correto), explicitar (regra existia espalhada; agora tem nome e lugar), simplificar, corrigir (tinha defeito; corrigido neste trabalho).
Profundidade: "lida" quer dizer que o código da máquina foi lido por inteiro; "parcial" quer dizer que só os pontos de entrada e saída foram lidos.

| # | Máquina | Estados | Classificação | Profundidade |
| --- | --- | --- | --- | --- |
| 1 | Situação do grupo | vazio, naoaberto, aberto, confirmado, parcial, duvida, naovao | corrigir e explicitar | lida |
| 2 | Resposta da pessoa | sem resposta, sim, não sei, não | explicitar | lida |
| 3 | Abertura do convite | não aberto, aberto (por grupo e, no link individual, por pessoa) | manter | lida |
| 4 | Prazo de confirmação | aberto, encerrado (sem prazo: sempre aberto) | manter | lida |
| 5 | Publicação do convite | em breve, publicado | manter e corrigir (clique duplo) | lida |
| 6 | Acesso ao conteúdo do convite | restrito, completo | manter | lida |
| 7 | Entrada no painel (sessão) | saída, entrando, conectado, sessão terminada | manter | parcial |
| 8 | Navegação do painel e alterações não salvas | sem pendência, com pendência, perguntando | corrigir | lida |
| 9 | Formulário com barra de salvar | limpo, sujo, salvando, guardado neste aparelho (sem internet), erro | corrigir | lida |
| 10 | Caixa de edição no convite | fechada, aberta limpa, aberta suja, salvando | corrigir | parcial |
| 11 | Fila offline do painel e rascunhos locais | vazia, pendente, enviando | manter | lida |
| 12 | Presente da lista | livre, escolhido (com chave de desfazer) | manter | lida |
| 13 | Fluxo de confirmação do convidado | carregando, sem código, erro, encerrado, formulário, conferindo, enviando, enviado | manter | lida |
| 14 | Recado | pendente, aprovado, excluído | manter | parcial |
| 15 | Removidos recentemente | ativo, na lixeira (30 dias), restaurado, apagado de vez | manter | lida |
| 16 | Preparação e assistente do convite | checklist por tarefa (pendente, feita), assistente visto ou não | manter | parcial |
| 17 | Fila de envio por WhatsApp (botão "Enviar em fila") | fases: config, envio, fim, fechada; cada item: pendente, enviado, pulado | corrigir | lida |
| 18 | Lembranças (situação por pessoa e lembrança) | automática, planejada, separada, entregue, não recebe (e "fora do critério", derivada) | corrigir | lida |
| 19 | Criação de evento e acesso do anfitrião | convite de acesso: pendente, usado, vencido; código de troca: criado, usado, vencido; acesso do evento: sem acesso, com senha, com Google | corrigir | lida (exceto a conferência do token do Google) |

### 1. Situação do grupo

Fonte única: `situacao.js` (`situacaoGrupo`). O servidor guarda uma cópia em `grupos.status_confirmacao`; o painel sempre recalcula.

| De | Evento | Para |
| --- | --- | --- |
| vazio | alguém é adicionado ao grupo | naoaberto |
| naoaberto | link do grupo (ou de uma pessoa) é aberto | aberto |
| naoaberto ou aberto | convidado envia respostas, ou anfitrião marca uma resposta | confirmado, parcial, duvida ou naovao (conforme as respostas) |
| confirmado, parcial, duvida, naovao | respostas mudam | qualquer um dos quatro |
| confirmado, parcial, duvida, naovao | anfitrião limpa todas as respostas | aberto (se o link foi aberto) ou naoaberto |
| qualquer um | a última pessoa do grupo é removida | grupo removido (vai para "Removidos recentemente") |

Ordem da regra para quem respondeu: confirmado (todos vão), naovao (ninguém vai e ninguém está em dúvida), duvida (ninguém vai, há "não sei"), parcial (alguns vão). "Respondeu" quer dizer: o grupo tem data de confirmação ou alguma pessoa tem resposta.

Textos guardados no banco (vocabulário antigo, mantido): Pendente, Aguardando resposta, Confirmado, Parcial (x/y), Em dúvida, Não vão.

Defeitos que existiam e foram corrigidos:

- Quando o anfitrião limpava todas as respostas, a data de confirmação ficava e o painel mostrava o grupo como "Não vão".
- Grupo em que todos responderam "não" era guardado como "Aguardando resposta"; um "não sei" e um "não" também.
- Abrir o link não atualizava o texto guardado do grupo.
- A planilha (CSV) dizia "Parcial (1/2)" enquanto o painel dizia "Parcial: 1 de 2".

### 2. Resposta da pessoa

`resposta` é null, `sim`, `nao_sei` ou `nao`. `confirmado` (0 ou 1) é uma cópia derivada de `resposta === 'sim'`, mantida porque as contagens antigas ainda a leem. Quem grava é `gravarResposta()`. O convidado envia pelo `/api/rsvp` (só dentro do prazo); o anfitrião corrige pelo `/api/admin/confirmar` (a qualquer momento, inclusive limpando).

Regras de gravação:

- Envio do convidado: todas as pessoas do envio mais a data de confirmação e o nome e telefone do responsável são gravados juntos (uma só gravação); ou tudo muda ou nada muda.
- Correção do anfitrião: o nome do responsável informado pelo convidado é preservado. A marca "Confirmado manualmente pelos noivos" só entra quando o grupo não tinha responsável.
- Limpar respostas: se o grupo ficou sem nenhuma resposta, a data de confirmação é apagada (e a marca manual, se era ela o responsável).

### 3 e 4. Abertura e prazo

- Abertura: o primeiro acesso ao link marca `status_abertura = 'Aberto'` no grupo e, no link individual, `aberto_em` na pessoa. Não volta atrás.
- Prazo: vem de `hero.prazo_iso` no conteúdo. Passou do prazo, o servidor recusa novas respostas e o convite mostra as respostas em modo leitura com o botão "Pedir alteração". Sem prazo definido, as respostas ficam sempre abertas. O anfitrião pode corrigir depois do prazo.

### 5. Publicação do convite

`eventos.publicado`: em breve (0) ou publicado (1). Em breve, o convidado vê uma página neutra; o anfitrião vê o convite real com o token do rascunho. Publicar faz dois passos repetíveis (grava o conteúdo escolhido e depois muda a publicação); se o segundo falhar, o anfitrião tenta de novo. O botão "Publicar agora" ignora cliques repetidos. Enquanto a situação não foi carregada, o painel assume "publicado" (o lado seguro: não mostra um aviso falso de rascunho).

### 6. Acesso ao conteúdo do convite

Completo (data, horário, local, presentes) quando: o código do link é válido, ou o anfitrião está logado, ou o link traz o token do rascunho, ou o evento é aberto. Caso contrário, restrito. No Save the Date, data e horário continuam públicos. Regra em `functions/_acesso.js`.

### 7. Entrada no painel

Três jeitos de entrar: senha do administrador geral, senha do evento, ou Google (sessão de 30 dias). A sessão termina de duas formas: o servidor devolve 401 e o painel volta à tela de entrada com o aviso "entre de novo para continuar de onde parou" (o painel fica escondido, não destruído; esse ponto não foi testado); ou a pessoa sai. Regras em `functions/_lib.js` (`identificarAdmin`) e `functions/_sessao.js`. Leitura parcial: o fluxo de entrar com Google e os convites de acesso não foram lidos linha a linha.

### 8. Navegação e alterações não salvas

`sujo` guarda se há alteração pendente em Conteúdo, Aparência ou Ordem. Trocar de aba pelo menu pergunta "Sair sem salvar?". Corrigido: trocar de aba pelo botão Voltar do navegador (ou por link com #) também pergunta, e fechar ou recarregar a página com alteração pendente aciona o aviso do navegador.

### 9. Formulário com barra de salvar

limpo → (mexeu) → sujo → (salvar) → salvando → limpo; erro mantém sujo; sem internet guarda neste aparelho e reenvia sozinho. Corrigido: se a pessoa continua mexendo enquanto o envio está em andamento, a tela continua "não salva" para o que veio depois (antes ela mostrava "Tudo salvo" e perdia essas alterações).

### 10. Caixa de edição no convite

Os campos ficam travados enquanto o salvamento está em andamento (antes, o que fosse digitado nesse intervalo era sobrescrito pelo valor salvo).

### 11. Fila offline

Alterações sem internet ficam em `localStorage`, na ordem, e são reenviadas quando a internet volta. Uma alteração que o servidor recusa sai da fila e a pessoa é avisada. Revisada, sem mudanças.

### 12. Presente

Escolher grava a chave de desfazer no aparelho de quem escolheu; só essa chave (ou o mesmo convite) desfaz. Duas pessoas escolhendo o mesmo presente: a segunda recebe a mensagem "acabou de ser escolhido" e a tela se corrige. Várias gravações ao mesmo tempo são resolvidas por comparação do valor lido (até 5 tentativas). Risco conhecido, não corrigido: a lista só é lida quando a página abre; um presente escolhido por outra pessoa só aparece como escolhido na tentativa.

### 13. Fluxo de confirmação do convidado

carregando → (sem código | erro | prazo encerrado) ou formulário → conferindo (resumo antes de enviar) → enviando → enviado → (alterar) formulário. Funciona como descrito; revisada, sem mudanças.

### 14 a 16

Lidas só nos pontos de entrada e saída. Recado: pendente → aprovado ou excluído, só aprovados são públicos. Removidos: ficam 30 dias e podem ser restaurados (o código do grupo muda se foi tomado por outro). Preparação: o checklist é calculado a partir do conteúdo; o assistente abre uma vez por evento no primeiro acesso.

### 17. Fila de envio por WhatsApp

Fases: config → envio → fim, e "fechada" a qualquer momento. Cada item da fila: pendente → enviado (ao abrir o WhatsApp) ou pulado. "Já recebeu nas últimas 24 horas" fica guardado no aparelho e tira a pessoa da próxima fila. Corrigido: depois de abrir o WhatsApp há uma pausa de meio segundo antes de ir para o próximo; um clique duplo nesse intervalo abria a mesma pessoa duas vezes e fazia a fila pular o próximo. Agora o clique repetido (no botão principal, em Voltar, em Pular ou na lista) é ignorado durante a pausa, e fechar a janela cancela o avanço pendente.

### 18. Lembranças

Para cada par (lembrança, pessoa) existe uma linha só quando há algo marcado. Estados: automática (sem linha, ou linha sem situação: o critério da lembrança decide "vai receber" ou "fora do critério"), planejada, separada, entregue e não recebe. O critério depende da resposta da pessoa, então "vai receber" muda sozinho quando a resposta muda; uma situação marcada pelo anfitrião não muda. Voltar ao automático e limpar a informação e o comentário apaga a linha. Corrigido: a gravação lia a linha, mudava e escrevia de volta; duas alterações simultâneas na mesma pessoa (por exemplo, a situação e a informação) se sobrescreviam e uma se perdia. Agora cada campo é gravado direto no banco, só se veio no pedido.

### 19. Criação de evento e acesso do anfitrião

Acesso do evento: sem acesso → com senha e/ou com Google → sem acesso (revogar apaga senha, contas Google, sessões abertas, convites não usados e códigos de troca).

Convite de primeiro acesso: pendente → usado | vencido (7 dias). O código de troca (leva o login de vemnafesta.com para o endereço do evento) vale 2 minutos e uma vez. Corrigido: o convite era usado em dois passos (verificar, depois marcar como usado), então duas pessoas com o mesmo convite ao mesmo tempo passavam as duas e a segunda sobrescrevia a senha da primeira. Agora a ordem é validar os dados, reivindicar o convite (uma só instrução, que só vale para o primeiro pedido) e só então gravar o acesso; dados inválidos não gastam o convite. O código de troca passou a ser apagado e lido numa só instrução (RETURNING). Esse segundo ponto não foi reproduzido como defeito antes da mudança (o teste local passava), foi corrigido por construção.

Criação de evento: o endereço (slug) é único; pedidos simultâneos para o mesmo endereço recebem um deles a mensagem de endereço repetido (testado localmente, sem defeito encontrado). A API não apaga eventos (só revoga o acesso do anfitrião).

Não testado: a conferência do token do Google (precisa de uma conta e de um Client ID reais).

## Testes

Todos usam só o Node (e o Playwright, para o painel no navegador).

- `node --test testes/*.test.mjs`: regra da situação do grupo e da pessoa (sem servidor).
- `node testes/api-estados.mjs [url] [slug]`: transições de grupo e respostas pela API real (precisa do servidor local; veja o README).
- `node testes/api-acesso.mjs [url] [slug]`: convite e código de troca (inclusive usados ao mesmo tempo), revogação, criação de evento e lembranças. Cria eventos de teste, por isso só roda em localhost.
- `PLAYWRIGHT_PATH=<pasta node_modules do Playwright> node testes/painel-estados.mjs [url] [slug]`: situação no painel e no CSV, aviso de alterações não salvas, edição durante o salvamento e clique duplo em publicar e na fila de WhatsApp.

O banco local novo precisa da migração 014 já registrada (limitação conhecida do banco novo: a migração tenta criar uma coluna que o `schema.sql` já cria). O README explica como subir o servidor; se o servidor devolver erro 500 em banco novo, marque as migrações como aplicadas na tabela `_migracoes`.
