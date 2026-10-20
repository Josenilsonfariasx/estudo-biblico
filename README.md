# Lâmpada — Diário Bíblico

App web pessoal (PWA) para acompanhar um plano de estudo bíblico pelo celular, com ou sem internet.
Next.js + Prisma + PostgreSQL, publicado com Docker no Easypanel.

## O que o app faz

- **Hoje:** próxima leitura de cada trilha (marcar como lido com um toque), "Começar encontro"
  (trilha principal → trilha paralela), versículo da semana, estudos seguidos (a sequência aguenta pausas de até 3 dias), semanas seguidas e calendário
  com os dias estudados. Toque num dia para ver o que foi lido.
- **Plano:** trilhas e fases com progresso; capítulos com checkbox; tudo editável
  (trilhas, fases e blocos de livros/capítulos). O plano padrão é carregado sozinho na primeira vez.
- **Capítulo:** página na Bíblia física, marcar/desmarcar como lido, anotação com salvamento automático,
  "semente para mensagem".
- **Revisão semanal:** anotações da semana, marcar sementes, versículo da semana e reflexão.
- **Sementes:** busca nas sementes e "Virar mensagem"; mensagens com as 7 partes e status
  (rascunho, pronta, pregada).
- **Mais:** perfil com nome e foto, estatísticas, histórico, preferência de início da semana,
  backup (exportar JSON/Markdown, importar JSON), status da sincronização e sair.

## Como funciona o modo offline

- Os dados ficam no próprio aparelho (IndexedDB) e as telas leem dali, então tudo funciona sem internet.
- Cada alteração é marcada como pendente e enviada ao servidor quando houver conexão
  (ao abrir o app, ao voltar a internet, a cada minuto e logo após editar).
- Em conflito entre aparelhos, vale a última edição.
- O service worker (`/sw.js`, só no build de produção) guarda as telas para abrir sem internet.
- O primeiro login precisa de internet. Sair apaga os dados do aparelho; eles continuam no servidor.

## Ambientes

| Ambiente | Comando | Endereço | Banco |
| --- | --- | --- | --- |
| Dev (Docker) | `npm run docker:dev` | http://localhost:3000 | Postgres do compose (porta 5432) |
| Prod local | `npm run docker:prod` | http://localhost:3001 | `DATABASE_URL` de `.env.docker-prod` |
| Produção | deploy no Easypanel | seu domínio | `DATABASE_URL` definida no painel |

### Dev

```bash
npm run docker:dev        # sobe Postgres + Next com hot reload (Ctrl+C para parar)
npm run docker:dev:down   # derruba (os dados do banco ficam no volume)
```

O código é montado no container, então salvar um arquivo atualiza a tela na hora.
Ao adicionar uma dependência no `package.json`, reinicie o container do app (ele roda `npm install` ao iniciar).
Para testar no celular na mesma rede Wi-Fi, acesse `http://IP-DO-PC:3000`.
Banco para DBeaver: `localhost:5432`, usuário/senha/banco `lampada`.
Login do app em dev: definido no `.env` (gere com `npm run auth:setup -- <usuario> <senha>`).

O modo offline (service worker) só funciona no build de produção: teste com o **Prod local**.

Também dá para subir só o banco (`npm run docker:db`) e rodar `npm run dev` direto no WSL, usando o `.env` (copie de `.env.example`).

### Prod local

Testa a mesma imagem que vai para o Easypanel antes de publicar:

```bash
cp .env.docker-prod.example .env.docker-prod   # aponta para o Postgres do dev; preencha o login
npm run docker:prod
```

## Publicar no Easypanel

1. Crie um serviço **Postgres** (ou use um banco externo) e copie a connection string.
2. Crie um serviço **App** apontando para este repositório, com build por **Dockerfile**.
3. Em *Environment*, defina `DATABASE_URL` e as variáveis de login, geradas com
   `npm run auth:setup -- <usuario> <senha>` (gera `AUTH_USERNAME`, `AUTH_PASSWORD_HASH` e `AUTH_SECRET`).
   Para trocar a senha depois, gere de novo e atualize as três variáveis.
4. Em *Domains*, aponte o domínio para a porta **3000** (HTTPS é obrigatório para instalar o PWA e para o modo offline).
5. Faça o deploy. As migrations do banco rodam sozinhas a cada início do container,
   e o plano padrão é criado no primeiro acesso.

Verificação: `https://seu-dominio/api/health` deve responder `{"ok":true,"db":true}`.

## Instalar no celular

- **Android (Chrome):** menu ⋮ → *Instalar app*.
- **iPhone (Safari):** compartilhar → *Adicionar à Tela de Início*.

## Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run auth:setup -- <usuario> <senha>` | Gera as variáveis de login |
| `npm run db:migrate` | Cria uma nova migration após mudar `prisma/schema.prisma` |
| `npm run db:deploy` | Aplica as migrations pendentes |
| `npm run icons` | Regera os ícones PNG do app |
| `npm run docker:dev` / `docker:prod` | Ambientes Docker (veja acima) |

## Estrutura

- `src/app/(app)/` — telas (Hoje, Plano, Fase, Capítulo, Revisão, Sementes, Mensagem, Mais, Histórico)
- `src/app/api/` — login/logout, sincronização e health check
- `src/app/sw.js/` — service worker do modo offline
- `src/lib/local-db.ts` — banco local (Dexie/IndexedDB)
- `src/lib/sync-client.ts` e `src/app/api/sync/` — sincronização aparelho ⇄ servidor
- `src/lib/store.ts` — gravações feitas pelas telas
- `src/lib/plan-seed.ts` — plano de estudos padrão
- `prisma/schema.prisma` — banco do servidor
