# Roadmap do Vem na Festa

Ideias aprovadas para depois, fora do escopo atual. Nenhuma está em desenvolvimento.

## Mesas do jantar

O anfitrião distribui grupos de convidados em mesas, com aviso quando o grupo não cabe na mesa e um contador de pessoas com lugar. Evita o improviso na hora de montar a festa e mostra quem ainda está sem mesa.

Base que já existe: grupos e seus membros (schema.sql, tabelas grupos e convidados) e a contagem de confirmados (functions/api/admin/painel.js).

## Orçamento da festa

O anfitrião acompanha o previsto, o pago e o que falta pagar por categoria, com os próximos vencimentos. Dá uma visão única do custo da festa, no mesmo lugar onde já cuida dos convidados.

Base que já existe: nada de orçamento. A meta de convidados e a ocupação contam pessoas, não dinheiro. Os presentes têm valor sugerido, mas como texto livre (admin/index.html, campo "Valor sugerido" dos itens de presente).

## Portaria no dia da festa

Marcar quem chegou, buscar por nome, funcionar sem internet e mostrar quem falta. Dá controle de entrada a quem fica na porta, mesmo com sinal ruim no salão.

Base que já existe: a aba Respostas, com busca e marcação em lote (admin/index.html, desenharRespostas; functions/api/admin/confirmar.js), e o estado "Entregue" das Lembranças. Não existe nada de registro de chegada nem de uso sem conexão.
