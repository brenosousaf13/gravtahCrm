# Bloqueio de tickets no CRM Gravtah

## Como o CRM funciona

O projeto usa Next.js 16 com App Router, React 19, TypeScript e Tailwind 4. Os componentes de interface usam Radix UI e Lucide. Os formulários usam React Hook Form e Zod.

O Supabase concentra autenticação, persistência, arquivos e eventos em tempo real:

| Estrutura | Uso observado no código |
| --- | --- |
| `profiles` | Nome, e-mail, documento, telefone e papel `admin`/`cliente` |
| `tickets` | Dono do atendimento (`user_id`), número, produto, marca/modelo, relato, lote/fabricação, status, solução, datas e indicador de mensagem não lida |
| `ticket_messages` | Ticket, remetente, conteúdo e data da conversa |
| `ticket_attachments` | Ticket, caminho e tipo do arquivo |
| `notifications` | Avisos por usuário e ticket, com estado de leitura |
| Storage `warranty-files` | Evidências e notas anexadas ao atendimento |

O portal (`src/app/portal`) permite abrir tickets de garantia, acompanhar conversas, gerenciar anexos, consultar finalizados e editar o perfil. A abertura exige anexos e dados de lote/fabricação para determinadas marcas.

A área administrativa (`src/app/admin`) oferece indicadores e gráficos, listagem com filtros/busca/paginação, atendimento, edição de dados, gestão de clientes e exportação CSV com links para os anexos.

O login e a recuperação de senha usam Supabase Auth. O middleware renova a sessão e redireciona usuários sem login. As páginas de detalhes buscam mensagens no servidor; a ação `sendMessage` registra a mensagem e atualiza o indicador de não lido. Ao responder, o administrador pode mover determinados status ativos para `aguardando_resposta`. O sino acompanha notificações por Realtime.

As permissões originais do banco, funções de recuperação administrativa de senha e geração de notificações são externas ao repositório. Não é possível inferir seus detalhes só pelo frontend. As novas proteções complementam as políticas existentes.

## Comportamento implementado

- O administrador encontra o cadeado na listagem e o botão **Bloquear ticket** nos detalhes. A confirmação explica o efeito; o mesmo controle permite desbloquear.
- O bloqueio se aplica somente ao ticket selecionado, conforme confirmado pelo usuário. O cliente continua usando outros tickets e abrindo novos atendimentos.
- A flag `tickets.is_blocked` é independente do status e da solução. Bloquear não finaliza, arquiva nem apaga o atendimento.
- O cliente continua lendo o histórico e acessando anexos existentes. O envio de mensagens e a inclusão, remoção e substituição de anexos ficam bloqueados.
- O administrador pode continuar atendendo e gerenciando anexos enquanto o ticket está bloqueado.
- Listas e detalhes exibem **Bloqueado**. Detalhes abertos atualizam por Realtime e ao retomar o foco da janela.

## Proteção em camadas

1. A interface do cliente retira o campo de envio e os controles de anexos.
2. A ação do servidor verifica sessão, papel, propriedade do ticket e bloqueio antes de inserir a mensagem. Somente um administrador pode mudar o bloqueio; uma atualização sem ticket afetado gera erro.
3. Triggers do Postgres impedem alteração da flag por clientes, mudanças de função para contornar a autorização e escritas em mensagens/anexos de tickets bloqueados. Verificam o ticket antigo e o novo em movimentações de registros.
4. Políticas restritivas do Storage impedem alterações nos arquivos, mesmo quando a chamada ignora a interface ou é feita sem sessão. As políticas existentes permanecem válidas e continuam responsáveis pelos acessos usuais.
5. As verificações do banco usam locks compartilhados no ticket para serializar interações com o bloqueio. Uma interação já confirmada antes do bloqueio pode aparecer no histórico; novas interações após sua confirmação são rejeitadas.

## Ativação no projeto Supabase

As migrações foram aplicadas no Supabase do projeto CRM Gravata e verificadas em consulta somente leitura. Em outro ambiente, aplique-as seguindo a ordem abaixo antes de publicar.

### Bloqueio de abertura por cliente

A migração `supabase/migrations/202610260002_client_ticket_blocking.sql` acrescenta `profiles.is_ticket_creation_blocked`. O administrador pode ativar o bloqueio em **Clientes → Bloquear cliente** e liberar manualmente em **Desbloquear cliente**. A flag não depende do status do último ticket e não altera tickets existentes.

O cliente bloqueado não vê os atalhos para abrir tickets e recebe uma mensagem explicativa. A página de abertura também é protegida no servidor. Uma aba antiga ou uma chamada direta ao Supabase recebe erro no trigger antes de criar a linha.

Execute primeiro `202610260001_ticket_blocking.sql` (caso ainda não tenha executado) e depois `202610260002_client_ticket_blocking.sql`. A segunda migração é reaplicável.

1. Em um ambiente de homologação do projeto, abra o SQL Editor do Supabase.
2. Execute o arquivo `supabase/migrations/202610260001_ticket_blocking.sql` com o papel administrativo do banco. A migração é transacional e pode ser reaplicada.
3. Confirme a coluna:

```sql
select id, ticket_number, status, is_blocked
from public.tickets
limit 10;
```

4. Verifique se `tickets` e `ticket_messages` estão habilitadas para Postgres Changes na publicação `supabase_realtime`. A ausência desses eventos afeta a atualização imediata da tela; a proteção de escrita no banco continua valendo.
5. Configure um `.env.local` ignorado pelo Git com os valores do projeto:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA-CHAVE-PUBLICA
```

6. Execute `npm ci`, `npm test` e `npm run dev`. Publique o código somente depois de aplicar a migração.

Não é necessária uma chave `service_role` para esta funcionalidade. As ações usam a sessão autenticada do usuário. As políticas originais devem continuar limitando cada cliente aos próprios tickets/perfil.

Os caminhos atuais são `<pasta-do-usuário-ou-admin>/<uuid-do-ticket>/<arquivo>`. Novos uploads com caminhos fora desse padrão são rejeitados para clientes. Objetos antigos continuam legíveis; caminhos legados fora do padrão precisam de normalização pelo administrador para voltarem a ser alteráveis pelo cliente.

## Validação funcional em homologação

Use duas sessões distintas, uma administrativa e uma do cliente:

1. Abra o mesmo ticket nas duas sessões e envie uma mensagem como cliente.
2. Bloqueie pelo administrador. Confirme o indicador na lista/detalhes e o aviso no portal.
3. Tente enviar por uma aba antiga e alterar anexos por chamada direta. Confirme rejeição sem novas mensagens ou arquivos modificados.
4. Confira se o cliente consegue ler o histórico e abrir os anexos existentes.
5. Envie uma resposta e um anexo como administrador.
6. Abra outro ticket e crie um atendimento novo como cliente: ambos devem funcionar.
7. Desbloqueie e confirme que mensagens/anexos voltam a funcionar, com status e solução preservados.

## Testes locais

`npm test` executa testes reais da migração em Postgres embarcado (PGlite), verificações das ações do servidor com a conexão Supabase simulada e renderização dos componentes reais do chat. O banco de teste contém um esquema mínimo baseado nas tabelas usadas pelo código; não substitui a homologação com o esquema real.

Também foram executados TypeScript, lint dos arquivos alterados e o detector de UI. O lint geral já tinha 26 erros antes desta alteração, em outros pontos do projeto.

Resultado local: **31 testes passando**, TypeScript sem erros e lint dos arquivos alterados sem erros (4 avisos preexistentes). O detector de UI não apontou problemas. A revisão independente não encontrou bloqueadores restantes.

O build completo passou usando URL e chave fictícias do Supabase apenas no processo de compilação. Esses valores não configuram uma execução funcional. Sem as variáveis, o código compila, mas a geração de páginas falha ao criar o cliente Supabase. A integração com o projeto real, os eventos entre sessões e a aplicação da migração continuam pendentes de homologação.

Referências técnicas: [RLS do Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security), [controle de acesso do Storage](https://supabase.com/docs/guides/storage/security/access-control) e [locks do PostgreSQL](https://www.postgresql.org/docs/17/explicit-locking.html).
