---
status: aceito
---

# Autorização por perfil fixo, com costura para RBAC configurável

A documentação de produto descreve **cinco** perfis — Solicitante, Analista, Gestor, Administrador e Admin Root —, enquanto os contratos de API publicados e o backend legado usam quatro. O legado também duplica a mesma lógica de autorização em seis arquivos (`isAdminOrAssignee` aparece em dois serviços, `canAssignRequest` em outro), e a regra "Administrador não gerencia outro Administrador" está hardcoded em um serviço.

Decidimos que a autorização é uma **matriz de permissões escrita em código**, exposta pela interface `AuthorizationService` (`can` e `assert`), com **cinco perfis**: `Admin Root`, `Administrador`, `Gestor` e `Analista` formam a hierarquia interna, e `Solicitante` descreve o ator externo — é um perfil, mas não ocupa a hierarquia. O `Admin Root` tem todas as permissões, pode gerenciar Administradores e existe apenas no seed — nunca há auto-registro. A verificação fina fica no serviço, em um lugar só por domínio; o nível de rota continua sendo um gate grosso por perfil.

## Alternativas consideradas

- **RBAC configurável desde já.** Tabelas `profiles`, `permissions` e `profile_permissions`, interface de administração e migração do perfil atual. Entrega o que o produto pede, mas é um segundo produto — e o modelo de permissões ainda não foi validado com o time.
- **Manter as verificações espalhadas como no legado.** É o caminho mais curto e o que produz a divergência atual: a mesma regra corrigida em um arquivo e esquecida em outro.

## Consequências

- Adicionar permissão é uma linha na matriz mais o ponto de verificação no serviço.
- A porta `AuthorizationService` é a costura: quando o RBAC configurável entrar, ele substitui a matriz por um adapter de banco e **nenhum domínio muda**.
- Os contratos publicados no repositório de documentação precisam ser atualizados de quatro para cinco perfis.
- O `Admin Root` precisa de uma regra própria em qualquer tela de gestão de usuários: a capacidade de gerir Administradores não pode ser dada a si mesmo.
