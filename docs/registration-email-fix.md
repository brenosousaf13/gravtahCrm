# Cadastro e confirmação de e-mail — 17/11/2026

## Causa verificada

O Supabase do projeto CRM Gravata usa o serviço padrão de e-mail. O próprio painel informa que esse serviço não é destinado a produção. O limite documentado atualmente é de 2 e-mails por hora por projeto, compartilhado pelos endpoints de envio do Auth. Excluir usuários de Authentication/profiles não reinicia essa quota.

O banco possui um trigger `on_auth_user_created` que já cria `public.profiles` com nome, documento e telefone dos metadados do cadastro. Não há constraint de unicidade de documento em `profiles`; a identidade de login é o e-mail no Supabase Auth.

## Correção no aplicativo

- O cadastro pede o e-mail duas vezes e compara os endereços após remover espaços externos e normalizar letras maiúsculas.
- Depois do cadastro sem sessão, mostra o endereço de destino e as opções de reenviar a confirmação ou corrigir/refazer o cadastro com o endereço correto. A senha é limpa da memória do formulário após sucesso.
- Reenviar usa `auth.resend({ type: 'signup' })`, sem recriar o usuário. Corrigir/refazer com outro endereço segue o cadastro normal e mantém o registro antigo sem confirmação; não transfere acesso a contas ou tickets.
- Cadastro, reenvio e recuperação compartilham uma pausa local de 60 segundos entre envios. O servidor continua responsável pelos limites efetivos do projeto. O navegador guarda apenas o horário da próxima tentativa, sem e-mail, CPF ou senha.
- Falhas de limite, confirmação pendente e provedor indisponível são exibidas em português, sem alegar que uma conta foi criada quando o Auth devolveu erro.
- Removida a tentativa de atualizar `profiles` sem sessão; o trigger de cadastro continua responsável por criar o perfil.
- Login e cadastro incluem acesso à nova tela `/auth/confirm-email` para solicitar novamente o link.
- O callback distingue sucesso de erro/expiração; falhas levam à tela de reenvio com orientação para tentar login se o link já tiver confirmado o e-mail.

## Configuração necessária no Supabase

Não há migração SQL nesta alteração. Manter a confirmação de e-mail habilitada.

1. Configurar um serviço SMTP próprio em **Authentication → Emails → SMTP Settings**. O usuário informou que a Gravtah ainda não tem esse serviço. Criar/verificar o remetente em um provedor SMTP e informar host, porta, usuário, senha e endereço do remetente diretamente no Supabase.
2. Em **Authentication → URL Configuration → Redirect URLs**, autorizar os dois endereços exatos:
   - `https://crm.gravtah.com.br/auth/callback?next=/portal/dashboard`
   - `https://crm.gravtah.com.br/auth/callback?next=/reset-password`
   - Os dois retornos já foram salvos e verificados no painel em 17/11/2026, com autorização do usuário.
3. Depois de configurar o SMTP, conferir os limites do provedor e de **Authentication → Rate Limits** e validar a entrega usando uma caixa de teste autorizada pelo dono.

Não apagar usuários/tickets para reenviar uma confirmação nem marcar e-mails arbitrários como confirmados. Contas já criadas com endereço errado podem permanecer sem confirmação; o cliente pode refazer o cadastro com o endereço correto. Se for necessário alterar uma identidade existente, usar os controles administrativos do Supabase/Auth, preservando o usuário e seus vínculos.

## Verificação

- Testes de schema, chamadas reais do módulo de cadastro com a fronteira Auth simulada, reenvio, callback, pausa entre tentativas e renderização de componentes.
- 70 testes passaram; TypeScript, lint dos arquivos alterados e build passaram. Build local usa valores fictícios de Supabase apenas para compilação.
- Verificação visual local confirmou a rejeição de e-mails divergentes antes de qualquer envio. A entrega de e-mails reais depende da configuração SMTP e não foi simulada como sucesso.

Fontes: [SMTP no Supabase](https://supabase.com/docs/guides/auth/auth-smtp), [limites do Auth](https://supabase.com/docs/guides/auth/rate-limits), [reenvio de confirmação](https://supabase.com/docs/reference/javascript/auth-resend).
