# DROPZONE — plataforma de campeonatos de Free Fire

Marketplace e sistema de gestão de campeonatos: jogadores encontram torneios e montam squads, organizadores criam e
conduzem campeonatos (inscrições, salas, resultados, classificação), e a administração modera tudo.

> Nome, textos e links ficam em `src/config/site.ts`; cores em `src/app/globals.css` (`--primary` é o roxo de preenchimento e `--primary-text` o lilás para texto sobre o preto).

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 16 (App Router, Server Components, Server Actions), React 19, TypeScript, Tailwind CSS 4, shadcn/ui (Base UI), Lucide |
| Backend | Supabase: Auth, PostgreSQL (RLS + funções), Storage, Realtime |
| Testes | Vitest + PGlite (Postgres embutido — testa migrations, RLS e regras sem Docker) |
| Deploy | Vercel + Supabase |

## Arquitetura em uma página

- **O banco é a fonte da verdade das regras.** Toda ação sensível é uma função `SECURITY DEFINER` no Postgres que
  revalida permissões (`register_team`, `publish_match_results`, `save_match_results`, `finalize_tournament`,
  `admin_*`…). As Server Actions (`src/lib/actions/*`) só validam a entrada com Zod e chamam essas funções.
- **RLS em todas as tabelas**, privilégios por coluna (o usuário não consegue sequer enviar `status`, `payments_enabled`,
  `total_points` etc.). Ver `supabase/migrations/20261114000004_security.sql`.
- **Pontuação calculada no banco** por trigger (`match_results_compute`); a classificação vem de
  `get_tournament_standings` com desempate configurável. `src/lib/scoring.ts` é a mesma regra em TS para a prévia
  ao vivo do organizador — um teste garante que as duas implementações dão o mesmo resultado.
- **Credenciais de sala** ficam em `match_rooms`, legíveis só por quem passa em `can_view_room()` (organizador, ou
  equipe autorizada pelo público-alvo, após publicação e após `opens_at`). O status "sala publicada" é exposto sem
  credenciais por `match_room_status()`.
- **Auditoria**: `audit_logs` (somente leitura para clientes) registra ações importantes, inclusive qualquer alteração
  de resultado já publicado e toda mudança de configuração.
- **Pagamentos**: só estrutura (`payments`, `payment_events`, `refunds`, `src/lib/payments`). Desativados por padrão;
  nenhum cartão é armazenado; status só muda por `record_payment_status`, que sempre grava evento.

```
src/
  app/
    (site)/        páginas públicas: landing, campeonatos, rankings, equipes, perfis, como funciona, planos
    (auth)/        entrar, cadastro, recuperar/redefinir senha
    (app)/         área autenticada: painel do jogador, organizador, admin
    auth/confirm   callback de email (confirmação/recuperação)
    onboarding/
  components/      ui (shadcn), shared, layout, tournament, organizer, app
  lib/             actions (server actions), auth, queries, scoring, validation, payments, supabase
  config/site.ts   identidade e textos
  proxy.ts         renova a sessão e redireciona rotas protegidas
supabase/
  migrations/      schema, funções, estatísticas, segurança
  seed.sql         dados de DEMONSTRAÇÃO
tests/             unitários + banco (PGlite)
scripts/grant-admin.mjs
```

## Rodando localmente

Pré-requisitos: Node 20+ e Docker (para o Supabase local).

```bash
npm install
npx supabase start          # sobe Postgres/Auth/Storage locais, aplica migrations e seed
cp .env.example .env.local  # cole a "anon key" e a "service_role key" exibidas pelo comando acima
npm run dev                 # http://localhost:3000
```

Emails locais (confirmação de cadastro, recuperação de senha) aparecem no Mailpit: http://127.0.0.1:54324.

### Contas de demonstração

O seed cria dados **fictícios** (marcados como `is_demo` e com selo "Demo" na interface). Os logins e a senha estão
no cabeçalho de `supabase/seed.sql`:

- organizador da "Arena Demo" — gerencia o campeonato em andamento (lançar resultados das quedas 3 e 4, publicar sala…);
- jogador capitão do "Demo Squad" — pronto para se inscrever na "Liga Noturna Demo #12" e com um convite pendente.

Inclui um campeonato completo com **24 squads e 4 quedas** ("Copa DROPZONE Demo — Final da Temporada"), um em
andamento, um com inscrições abertas, um patrocinado com aprovação manual, um duo e um antigo (para rankings por período).

### Primeiro administrador

Não existe cadastro público de admin. Crie a conta normalmente e então:

```bash
npm run admin:grant -- seu-email@exemplo.com
```

O script usa a `SUPABASE_SERVICE_ROLE_KEY` apenas no seu terminal. Alternativa: no SQL Editor do Supabase,
`select public.bootstrap_admin('seu-email@exemplo.com');`. Depois disso, novos admins são concedidos pelo painel
(`/admin/usuarios`), com registro em log.

## Testes

```bash
npm test          # unitários + banco (não precisa de Docker)
npm run typecheck
npm run lint
npm run build
```

`tests/db/*` sobe um Postgres em memória (PGlite) com um stub mínimo dos schemas `auth`/`storage` do Supabase,
aplica **todas as migrations e o seed** e executa as consultas com os papéis reais (`anon`/`authenticated`) e JWT
simulado. Cobre: cadastro → perfil, escalonamento de privilégios, squads/convites, regras de inscrição (capitão,
tamanho do elenco, duplicidade, jogador em dois squads, prazos, pago bloqueado), permissões de organizador, rascunho
invisível, resultados só pelo organizador e só durante o campeonato, pontos recalculados no banco, proteção das
salas (público, horário, não participantes), classificação SQL = TS, rankings só com campeonatos finalizados,
contestações, pagamentos e troca atômica de colocações.

## Migrations

| Arquivo | Conteúdo |
|---|---|
| `20261114000001_schema.sql` | Extensões, enums, todas as tabelas, índices e constraints |
| `20261114000002_functions.sql` | Helpers de permissão, triggers (perfil, slug, pontos, auditoria, notificações) e RPCs de negócio/admin |
| `20261114000003_stats.sql` | `verified_results`, rankings (squads, jogadores, organizadores), resumos e painéis |
| `20261114000004_security.sql` | Privilégios, RLS de todas as tabelas, Realtime, buckets e políticas de Storage, dados de referência (planos, conquistas, configurações) |

Aplicar em um projeto Supabase na nuvem:

```bash
npx supabase login
npx supabase link --project-ref <ref-do-projeto>
npx supabase db push        # aplica as migrations
# opcional, só em ambiente de demonstração:
psql "<connection string>" -f supabase/seed.sql
```

Tipos TypeScript completos do banco (opcional): `npm run db:types`.

## Deploy (Vercel)

1. Crie o projeto Supabase e rode `supabase db push`.
2. Em Authentication → URL Configuration: *Site URL* = sua URL de produção; adicione `https://SEU-DOMINIO/auth/confirm`
   às Redirect URLs. Mantenha "Confirm email" ligado.
3. Na Vercel, defina `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `NEXT_PUBLIC_SITE_URL`.
   **Não** coloque a service role key na Vercel — o app não precisa dela.
4. Configure um SMTP próprio no Supabase (o padrão tem limite baixo de envios).

## O que depende de credenciais / decisões externas

| Item | Situação |
|---|---|
| Supabase (Auth, banco, storage) | Necessário para rodar. Local via Docker ou projeto na nuvem. |
| SMTP de produção | Necessário para emails confiáveis em produção. |
| Pagamentos (inscrições pagas, plano Pro) | **Desativados.** Exigem validação jurídica, provedor compatível, um adaptador em `src/lib/payments` e um webhook que chame `record_payment_status` com a service role. Depois, o admin liga `payments_enabled` em `/admin/configuracoes` e aprova cada campeonato pago. |
| Notificações por email | Estrutura pronta (`notifications.emailed_at`); falta um worker (ex.: Edge Function agendada) com o provedor de email. |
| Integração com o jogo | Não existe API oficial para criar salas; o fluxo é manual pelo organizador. |
| Textos legais | `/termos` e `/privacidade` são modelos e precisam de revisão jurídica (LGPD). |

## Decisões de produto

- Visibilidade: **pública** (marketplace), **não listada** (só com link) e **privada** (inscrição com código de convite).
- Um usuário pode estar em vários squads, mas **nunca em dois squads no mesmo campeonato** (constraint no banco).
- Elenco do squad: até 6 integrantes; o regulamento define titulares (1/2/4) e reservas (0–2).
- Pontuação fica congelada após o primeiro resultado lançado, para manter a classificação coerente.
- Ao iniciar o campeonato, inscrições pendentes são recusadas automaticamente.
- Rankings oficiais usam apenas campeonatos **finalizados** e não ocultados.
