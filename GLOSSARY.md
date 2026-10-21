# Contexto: Tirador de Pedidos do NEO (MAAT)

Vocabulário do domínio do portal MAAT, que registra e acompanha demandas operacionais. Este glossário descreve **o que os termos significam** — não onde eles ficam no código, nem como são implementados.

**Regra de leitura:** quando um termo aparece aqui em itálico, ele é o termo canônico do domínio. Os sinônimos listados em *Evitar* não devem ser usados em documentos, conversas de produto, nomes de campo, coluna, constraint ou chave de permissão. Os identificadores técnicos seguem a convenção de nomenclatura em inglês do modelo de dados: são convenção, não vocabulário.

## Solicitação e acompanhamento

**Solicitação**:
O registro submetido por um solicitante para atender uma necessidade operacional, com protocolo próprio e ciclo de vida definido por status.
_Evitar_: pedido, demanda, requisição, ticket, chamado.

**Protocolo**:
Identificador público, curto e não enumerável que permite ao solicitante acompanhar uma solicitação sem expor sua identidade interna.
_Evitar_: código, referência, número do pedido, id público.

**Solicitante**:
Pessoa que registra uma solicitação e acompanha seu andamento. Pode atuar de forma anônima ou autenticada.
_Evitar_: cliente, usuário externo, requisitante.

**Anexo**:
Arquivo enviado junto da solicitação, vinculado a ela e disponível para consulta do time interno.
_Evitar_: documento, upload, arquivo.

**Fila**:
Conjunto ordenado de solicitações em aberto, com critérios de ordenação e métricas de acompanhamento.
_Evitar_: lista, backlog, caixa de entrada.

**Status**:
Etapa do ciclo de vida de uma solicitação, com visibilidade definida (pública, interna ou restrita). Quando a triagem encerra, o Status em que a solicitação é deixada é o Veredito.
_Evitar_: estado, fase, situação.

**Categoria**:
Classificação de uma solicitação, administrável e ordenável, usada para organizar a fila.
_Evitar_: tipo, assunto, label, tema.

**Prioridade**:
Faixa de criticidade atribuída a uma solicitação — Baixa, Média, Alta ou Crítica.
_Evitar_: gravidade, urgência, severidade.

**Classificação**:
Atributo que situa a solicitação no fluxo: Status, Prioridade e Categoria. São atributos da solicitação, nunca perguntas do formulário.
_Evitar_: tipo, rótulo, tag.

## Análise e priorização

**Triagem**:
Avaliação inicial que verifica a aderência da solicitação ao escopo e define o caminho de tratamento.
_Evitar_: análise inicial, filtro, qualificação.

**Veredito**:
Desfecho da triagem: o Status em que a triagem deixa a solicitação. Não há lista fixa de vereditos — os Status que podem encerrar uma triagem são os que o Administrador configura para isso.
_Evitar_: resultado da triagem, decisão, status da triagem.

**Mapeamento**:
Sessão de levantamento com as áreas envolvidas na solução, com participantes, responsável designado e registro próprio.
_Evitar_: reunião, call, workshop, análise de viabilidade.

**Análise de viabilidade**:
Etapa em que se avalia a possibilidade técnica e operacional de atender a solicitação já mapeada.
_Evitar_: estudo, benchmarking, viabilidade.

**Priorização**:
Cálculo da prioridade de uma solicitação a partir de critérios ponderados.
_Evitar_: pontuação (é o resultado da priorização), ranking, ordenação.

**Critério**:
Quesito ponderado usado no cálculo da priorização, com peso ajustável.
_Evitar_: requisito, atributo, métrica.

## Formulário

**Chave promovida**:
Chave do payload que sai do formulário e ganha coluna própria, tipada e indexada na entidade. Deixa de ser pergunta e passa a ser atributo.
_Evitar_: coluna promovida, campo promovido, chave especial.

**Formulário**:
Definição de o que uma solicitação pede, composta por blocos e campos. É administrável, e a versão semeada descreve o formulário de abertura de solicitação.
_Evitar_: formulário do legado, intake, requerimento.

**Bloco**:
Seção de um formulário, que agrupa campos sob um mesmo assunto — identificação, demanda, operacional, complementar.
_Evitar_: seção, passo, etapa.

**Campo**:
Pergunta de um bloco de formulário, com tipo, obrigatoriedade e limites. O valor preenchido é a resposta.
_Evitar_: campo do banco, coluna, atributo, input.

## Colaboração

**Pendência**:
Item que impede o avanço de uma solicitação e exige ação do solicitante ou do time. Pode pedir a correção de um campo ou apenas registrar uma observação.
_Evitar_: tarefa, item, bug, recado.

**Nota interna**:
Registro de comunicação interna sobre uma solicitação, visível apenas para o time e integrado à linha do tempo.
_Evitar_: comentário, mensagem, observação (reservado a pendência).

**Linha do tempo**:
Sequência unificada dos acontecimentos de uma solicitação: a auditoria e as notas internas.
_Evitar_: histórico, feed, atividade.

**Auditoria**:
Registro imutável do que foi criado ou alterado no sistema, com autor, momento e valor anterior e novo.
_Evitar_: log, histórico, trilha de mudanças.

**Tentativa**:
Registro imutável de uma ação que foi recusada — por falta de permissão ou por regra de negócio. Preservado mesmo quando a ação não aconteceu. A *recusa* é o ato; a *tentativa* é o registro dele.
_Evitar_: erro, negação, log.

## Acesso

**Perfil**:
Conjunto fixo de permissões atribuído a um usuário. São cinco: *Solicitante*, *Analista*, *Gestor*, *Administrador* e *Admin Root*. O *Solicitante* descreve um ator externo e não ocupa a hierarquia interna.
_Evitar_: papel, cargo, função, role.

**Admin Root**:
Perfil raiz do sistema, com todas as permissões e capacidade de gerir os demais *Administradores*. Existe no seed e nunca é criado por auto-registro.
_Evitar_: super-admin, root, administrador mestre.

**Responsável**:
Pessoa designada para conduzir a triagem ou o mapeamento de uma solicitação.
_Evitar_: analista (é o perfil, não o vínculo), dono, responsável técnico.

**Modo de acesso**:
Configuração que determina se a abertura de solicitação exige autenticação ou está liberada ao público.
_Evitar_: modo de portal, visibilidade, tipo de acesso.

**Aparência**:
Conjunto de cores e estilos que o portal apresenta. Há mais de uma; duas são vigentes ao mesmo tempo, uma para o slot claro e outra para o slot escuro, e o solicitante escolhe entre as oferecidas.
_Evitar_: tema, theme, skin, paleta.
