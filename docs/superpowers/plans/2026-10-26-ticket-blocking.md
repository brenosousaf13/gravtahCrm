# Bloqueio de tickets — implementação

> Execução nesta sessão, com testes antes das regras de produção e revisão final.

**Goal:** permitir ao administrador bloquear somente um ticket, impedindo novas interações do cliente nesse atendimento.

**Architecture:** Next.js App Router com Supabase Auth, Postgres e Storage. Acrescentar `tickets.is_blocked` separado do status. Validar o envio no servidor e impor as regras no banco, inclusive para chamadas diretas e abas antigas. Preservar histórico, outros tickets e criação de novos atendimentos.

**Tech Stack:** Next.js 16, React 19, TypeScript, Supabase, Node test runner, PGlite para testes de Postgres.

## Estrutura analisada

- `src/app`: autenticação, recuperação de senha, portal do cliente e painel administrativo.
- `src/lib/supabase`: clientes com sessão no navegador/servidor e atualização de cookies no middleware.
- `src/app/actions/ticket-actions.ts`: envio de mensagens e atualização administrativa de status.
- `src/components/ticket`: conversa usada pelas duas áreas, detalhes do cliente, anexos e seletor de status.
- `src/components/admin`: listagem, busca, filtros, paginação, edição de clientes/tickets, gráficos e exportação CSV.
- `profiles`: cadastro e papel `admin`/`cliente`; `tickets`: atendimento de garantia, produto, rastreabilidade, status, solução e flag de não lido.
- `ticket_messages`, `ticket_attachments`, `notifications` e bucket `warranty-files`: conversa, evidências e avisos.
- Existe um chat legado em `src/components/ticket-chat.tsx`, atualmente sem importadores. Ele também deve usar a ação protegida.
- O repositório não contém o esquema inicial, políticas RLS, triggers existentes ou `.env.local`. O código depende de estruturas configuradas externamente no Supabase.

## Decisões de implementação

- Escopo confirmado pelo usuário: somente o ticket selecionado.
- Bloqueio independente do status e reversível pelo administrador.
- Cliente vê histórico e anexos existentes, mas não envia mensagens nem adiciona, remove ou substitui anexos enquanto bloqueado.
- Administrador continua operando o atendimento e pode desbloqueá-lo.
- Proteger `is_blocked` contra escrita por clientes e proteger o papel do perfil contra autopromoção, pois a autorização depende dele.
- Migração aditiva: preservar políticas existentes e acrescentar restrições para o Storage.
- Aplicar a migração no projeto real antes de publicar o código. Sem conexão local, documentar a ativação pendente.

## Review Focus

- Cliente tentando se desbloquear ou se promover a administrador por chamada direta.
- Envio/alteração de mensagens e anexos em uma aba que já estava aberta.
- Caminhos de arquivos renomeados, anexos antigos e outros tickets do mesmo cliente.
- Erros de autorização, ticket inexistente e zero linhas afetadas sem sucesso falso.
- Preservação do status, histórico, operações administrativas e retorno após desbloqueio.

## Task 1: Banco e regressões

- [x] Criar testes reais de SQL com schema mínimo equivalente às tabelas usadas pelo código.
- [x] Observar falha sem migração.
- [x] Criar `supabase/migrations/202610260001_ticket_blocking.sql`: flag, autorização de bloqueio, proteção de papel, triggers de mensagens/anexos e políticas restritivas de Storage.
- [x] Rodar testes de bloqueio, desbloqueio, bypass, histórico e isolamento.

## Task 2: Servidor e interface

- [x] Testar rejeição de envio para cliente bloqueado, cliente alheio e usuário sem sessão.
- [x] Implementar `setTicketBlocked(ticketId: string, blocked: boolean)` com verificação administrativa e atualização confirmada.
- [x] Verificar ticket antes de inserir mensagens e preservar regras atuais de status/não lido.
- [x] Adicionar ação administrativa confirmada, indicação visual nas listas/detalhes e aviso com conversa em leitura para o cliente.
- [x] Atualizar detalhes abertos por Realtime e ao retomar o foco; proteger também a rota de envio do chat legado.

## Task 3: Verificação e entrega

- [x] Rodar `npm test`, TypeScript e lint dos arquivos alterados; comparar lint geral com a base.
- [x] Conferir build e documentar limites por falta de ambiente Supabase.
- [x] Revisar diff e executar detector de UI uma vez.
- [x] Documentar estrutura, variáveis necessárias, migração e roteiro de validação em `docs/ticket-blocking.md`.

## Progresso

- Base: branch `feat/ticket-blocking`, dependências instaladas; sem suíte anterior de testes.
- Ruling: manter a implementação na pasta solicitada, em branch local, sem criar outro checkout.
- Banco e ações: RED observado antes da implementação; cenário anônimo de Storage reproduzido em RED e corrigido com políticas restritivas também para chamadas sem sessão.
- Resultado final: 31 testes passando; `npx tsc --noEmit` passa; lint dos arquivos alterados com 0 erros e 4 avisos preexistentes; detector de UI sem achados; `git diff --check` passa.
- Build completo passa com URL/chave Supabase fictícias somente no processo. Sem variáveis locais, o build compila o código e falha na geração das páginas, como esperado da configuração ausente. A execução integrada ainda não foi validada contra Supabase real.
- Revisão independente: sem bloqueadores críticos/importantes restantes. Pré-requisitos externos: políticas RLS originais, autenticação/provisionamento, publicação Realtime e teste entre sessões reais.
- Nenhuma migração foi aplicada em banco remoto e nenhuma alteração foi publicada.
