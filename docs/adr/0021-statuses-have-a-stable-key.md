---
status: aceito
---

# Os status do ciclo têm chave estável

O ciclo de vida é um **catálogo administrável**: o Administrador cria, renomeia, desativa e reordena status, e o `statuses` é uma tabela de referência — `id` uuid, `order_number`, `name`, e os predicados `is_public`, `is_active`, `is_core`, `is_restricted`, `is_terminal`, mais os modos `triage_mode` e `mapping_mode`.

Faltava uma coisa: **um endereço estável para o status**. O legado resolvia isso por id numérico, com uma lista de sete status de núcleo (`CORE_STATUS_IDS = [1, 3, 4, 6, 7, 16, 17]`) que o portal-config protegia — o schema proibia renomear, rebaixar ou desativar um deles, e alterar seus modos ou predicados. Com o id uuid, essa proteção perdeu a âncora: `is_core` virou uma flag que qualquer linha podia receber, sem nada que a fizesse valer.

O código também precisa de endereços próprios. Três regras do produto dependem de falar de um status específico — a solicitação nasce no status inicial, a pendência leva a solicitação para o status de espera, e o triage conclui num conjunto de status elegíveis. Nome não serve: nome é rótulo, e o Administrador o edita.

Decidimos que **`statuses` ganha `key`**: texto, NOT NULL, UNIQUE, com vocabulário do código. O seed do ciclo de referência traz as dezessete chaves — `solicitacao_enviada`, `aguardando_triagem`, `em_triagem`, `pendente_de_informacoes`, `aguardando_mapeamento`, `mapeamento_agendado`, `em_mapeamento`, `em_analise_de_viabilidade`, `elegivel`, `nao_elegivel`, `priorizado`, `backlog`, `direcionada_para_outra_area`, `em_desenvolvimento`, `em_homologacao`, `concluido`, `cancelado`.

E que **o código referencia status por `key`** — nunca por `id`, nunca por `name`. `name` é o rótulo que o solicitante vê; `key` é o endereço.

Com isso, os **sete status de núcleo** voltam a ser protegidos: são os com `is_core = true`, a `key` deles é reservada, e nem o nome, nem `is_public`, `is_terminal`, `is_restricted`, `triage_mode` ou `mapping_mode` podem mudar — nem a linha pode ser desativada.

## Alternativas consideradas

- **Continuar por id.** Descartado: o id uuid não sobrevive a um seed ou a uma carga de dados; e a proteção do núcleo precisa de um endereço que o Administrador não controla.
- **Proteger o núcleo pelo `name`.** Descartado: o `name` é o rótulo que o Administrador edita, e a proteção justamente é impedir essa edição. Seria um nome que não pode mudar, com um rótulo que pode — o inverso do que a coluna é.
- **Não proteger o núcleo.** O `is_core` não tem consumidor de leitura em lugar nenhum, nem no legado; a única coisa que ele fazia era bloquear a edição. Abandonar a proteção tiraria o `is_core` sem custo — mas o produto contava com não poder desmontar as etapas vitais do ciclo.

## Consequências

- `statuses` ganha `key`; a § 2.7 do modelo de dados passa a dizer que `statuses` usa `id`, `order_number` e `key`.
- As três regras que dependem de um endereço estável ficam escritas: a solicitação nasce em `solicitacao_enviada`, a pendência move a solicitação para `pendente_de_informacoes` e a devolve para `em_triagem`, e o código resolve o status de saída da triagem pelo predicado (`ativo`, não restrito, `triage_mode = conclusion_only`).
- O `key` é o vocabulário do código, e não da tabela: quem escreve o seed é quem decide quais status existem.
- O `name` continua único, e continua sendo o rótulo.
