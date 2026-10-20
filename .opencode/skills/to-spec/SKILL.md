---
name: to-spec
description: "Turn the current conversation into a spec and publish it to the project issue tracker: no interview, just synthesis of what you've already discussed."
disable-model-invocation: true
---

Output language: Portuguese.

This skill takes the current conversation context and codebase understanding and produces a spec. Do NOT interview the user; just synthesize what you already know.

The issue tracker and triage label vocabulary should have been provided to you. If not, tell the user to run `/setup-matt-pocock-skills`.

## Process

1. Explore the repo to understand the current state of the codebase, if you haven't already. Use the project's domain glossary vocabulary throughout the spec, and respect any ADRs in the area you're touching.

2. Sketch out the seams at which you're going to test the feature. Existing seams should be preferred to new ones. Use the highest seam possible. If new seams are needed, propose them at the highest point you can. The fewer seams across the codebase, the better - the ideal number is one.

Check with the user that these seams match their expectations.

3. Write the spec using the template below, then publish it to the project issue tracker. Apply the `ready-for-agent` triage label - no need for additional triage.

<spec-template>

## Declaração do problema

O problema que o usuário enfrenta, do ponto de vista do usuário.

## Solução

A solução para o problema, do ponto de vista do usuário.

## Histórias de usuário

Uma lista LONGA e numerada de histórias de usuário. Cada história deve seguir o formato:

1. Como um <ator>, quero <funcionalidade>, para que <benefício>

<user-story-example>
1. Como um cliente de banco móvel, quero ver o saldo das minhas contas, para tomar decisões mais informadas sobre meus gastos
</user-story-example>

Essa lista de histórias de usuário deve ser extremamente extensa e cobrir todos os aspectos da funcionalidade.

## Decisões de implementação

Uma lista das decisões de implementação tomadas. Pode incluir:

- Os módulos que serão criados/modificados
- As interfaces desses módulos que serão modificadas
- Esclarecimentos técnicos do desenvolvedor
- Decisões arquiteturais
- Mudanças de schema
- Contratos de API
- Interações específicas

NÃO inclua caminhos de arquivos específicos nem trechos de código. Eles podem ficar desatualizados muito rapidamente.

Exceção: se um protótipo produziu um trecho que codifica uma decisão com mais precisão do que a prosa consegue (máquina de estados, reducer, schema, formato de tipo), inclua-o na decisão relevante e note brevemente que veio de um protótipo. Corte para as partes ricas em decisão, não uma demo funcional, apenas os trechos importantes.

## Decisões de teste

Uma lista das decisões de teste tomadas. Inclua:

- Uma descrição do que faz um bom teste (testar apenas comportamento externo, não detalhes de implementação)
- Quais módulos serão testados
- Precedentes para os testes (ou seja, tipos semelhantes de testes na base de código)

## Fora de escopo

Uma descrição das coisas que estão fora do escopo desta spec.

## Notas adicionais

Quaisquer notas adicionais sobre a funcionalidade.

</spec-template>
