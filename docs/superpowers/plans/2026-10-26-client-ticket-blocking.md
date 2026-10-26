# Bloqueio de abertura de tickets por cliente — Implementation Plan

> **For agentic workers:** implementação nesta sessão com testes antes das regras de produção.

**Goal:** permitir que um administrador bloqueie manualmente um cliente de abrir novos tickets até clicar em “Desbloquear cliente”.

**Architecture:** acrescentar uma flag administrativa em `profiles`, impedir a criação no servidor e em trigger PostgreSQL, e refletir o estado no portal e na área de clientes. O bloqueio vale para novos tickets do cliente e não altera tickets existentes nem o bloqueio individual já implementado.

**Tech Stack:** Next.js App Router, React, TypeScript, Supabase Auth/Postgres, Node test runner e PGlite.

**Spec:** requisito confirmado nesta conversa: bloqueio manual pelo dono/admin; liberar somente por “Desbloquear cliente”; “Finalizado” é o único status considerado resolvido para orientar o dono.

## Global Constraints

- O bloqueio do cliente é independente do `tickets.is_blocked`.
- Cliente bloqueado continua acessando tickets existentes.
- Criação direta via Data API deve falhar, mesmo que a UI seja contornada.
- O cliente não pode alterar a flag nem promover seu perfil.
- Admin continua podendo criar/editar tickets conforme as permissões atuais.

## Review Focus

- Tentativa de inserir ticket por aba antiga ou chamada direta quando o perfil está bloqueado.
- Cliente alterando a própria flag ou papel para contornar a regra.
- Bloqueio sem ticket anterior e bloqueio com último ticket não finalizado/finalizado.
- Desbloqueio manual após o ticket atingir `finalizado`.
- Tickets e conversas existentes permanecem acessíveis.

### Task 1: Banco e ação administrativa

**Files:**
- Modify: `supabase/migrations/202610260002_client_ticket_blocking.sql`
- Modify: `src/app/actions/ticket-actions.ts`
- Test: `tests/client-ticket-blocking.test.cjs`

- [x] Escrever testes PGlite para flag padrão, inserção bloqueada, inserção desbloqueada, admin permitido, alteração de flag somente por admin e desbloqueio manual.
- [x] Rodar os testes e observar RED antes da migração/ação.
- [x] Criar coluna `profiles.is_ticket_creation_blocked` default `false`, trigger de proteção da flag e trigger `tickets` que rejeite inserção de cliente bloqueado.
- [x] Implementar `setCustomerTicketCreationBlocked(customerId: string, blocked: boolean)` com autenticação admin, atualização confirmada e revalidação das telas.
- [x] Rodar os testes e observar GREEN.

### Task 2: Portal do cliente

**Files:**
- Modify: `src/app/portal/dashboard/page.tsx`
- Modify: `src/app/portal/tickets/new/page.tsx`
- Modify: `src/app/portal/layout.tsx`
- Test: `tests/client-ticket-blocking-ui.test.cjs`

- [x] Testar que cliente bloqueado não recebe ação funcional de novo ticket e vê uma mensagem clara.
- [x] Buscar a flag no dashboard e na página de abertura; esconder/desabilitar os atalhos e impedir submissão antes do upload.
- [x] Tratar erro de trigger para uma aba antiga com mensagem de bloqueio e refresh.
- [x] Testar que cliente desbloqueado continua abrindo ticket.

### Task 3: Administração de clientes

**Files:**
- Modify: `src/app/admin/customers/page.tsx`
- Modify: `src/components/admin/customers-data-table.tsx`
- Create: `src/components/admin/customer-ticket-block-button.tsx`
- Test: `tests/client-ticket-blocking-ui.test.cjs`

- [x] Exibir estado bloqueado e status do último ticket, usando `finalizado` como resolvido.
- [x] Adicionar confirmação “Bloquear cliente”/“Desbloquear cliente” e conectar à ação administrativa.
- [x] Revalidar a lista após a mudança.
- [x] Rodar TypeScript, testes, lint dos arquivos alterados e build com variáveis Supabase de compilação.

## Decisions

- O bloqueio é manual e permanece ativo após o último ticket ficar `finalizado`; o admin decide quando liberar.
- O usuário esclareceu que os status não precisam controlar a regra; o bloqueio permanece até o clique manual em “Desbloquear cliente”.
- Resultado: 54 testes passando, TypeScript sem erros e build de produção concluído.
- Migração `202610260002_client_ticket_blocking.sql` aplicada no Supabase; verificação confirmou a coluna, 2 triggers e 107 clientes desbloqueados.
- Revisão independente: sem bloqueadores críticos/importantes; melhorias menores de foco da aba e ordem da mensagem de bloqueio incorporadas.
