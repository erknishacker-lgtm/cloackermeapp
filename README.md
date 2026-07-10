# MyCloaker Anti-Bot Router

Painel + backend para criar links protegidos por regras anti-bot legítimas. O app registra acessos, calcula risco server-side e redireciona visitantes aprovados para a URL principal ou tráfego suspeito para a URL fallback.

## Arquitetura

```text
src/
  server/
    app.js                 # composição Express
    index.js               # bootstrap + persistência
    config.js
    security.js            # motor de decisão (puro / testável)
    store/createStore.js   # store em memória + JSON opcional
    routes/                # campaigns, domains, blocked-ips, stats, events, redirect, settings
    utils/                 # slug, domain, ip, campaign
  ui/
    App.jsx                # shell do painel
    api/client.js
    components/
    pages/
    hooks/useDashboardData.js
    styles.css
```

## Deploy no EasyPanel

1. Suba o código para um repositório Git (GitHub/GitLab).
2. No EasyPanel: **Create Service → App**.
3. Conecte o repositório. Deixe o **Dockerfile** (já incluso na raiz).
4. **Port:** `3000`
5. **Domains:** adicione `go.seudominio.com` (ou o domínio do cloaker) e ative HTTPS.
6. **Mounts / Volumes:**
   - Type: `Volume`
   - Mount Path: `/app/data`
   - Name: `mycloaker-data`
7. **Environment:**

```env
NODE_ENV=production
HOST=0.0.0.0
PORT=3000
SEED_DEMO=false
ALLOW_SIMULATE=false
PERSIST=true
DATA_DIR=/app/data
DATA_FILE=/app/data/store.json
ADMIN_TOKEN=troque-por-uma-senha-forte
```

8. Deploy. Abra o domínio → tela de login → cole o mesmo `ADMIN_TOKEN`.
9. Crie a campanha. Link público: `https://go.seudominio.com/r/seu-slug`

Cloudflare (opcional, recomendado): proxy laranja no DNS para ganhar `cf-ipcountry` e WAF.

## Rodar localmente

```bash
npm install
```

Terminal 1 — backend:

```bash
npm run server
```

Terminal 2 — painel (Vite):

```bash
npm run dev
```

Painel: `http://127.0.0.1:5173`  
API/redirect: `http://127.0.0.1:8787`

Produção (API + UI buildada no mesmo processo):

```bash
npm run build
npm start
```

## Persistência

Por padrão o backend grava em `data/store.json` (campanhas, eventos, domínios, IPs bloqueados, settings).

- `PERSIST=false` — só memória (útil em testes)
- `DATA_FILE=/caminho/store.json` — arquivo customizado
- `SEED_DEMO=false` — não cria campanha demo

## Endpoints

| Método | Path | Descrição |
|--------|------|-----------|
| GET | `/health` | Status |
| GET/POST | `/api/campaigns` | Listar / criar |
| GET/PATCH/DELETE | `/api/campaigns/:id` | Detalhe / editar / pausar / apagar |
| GET | `/api/events` | Últimos acessos (`?limit=&decision=&slug=`) |
| GET | `/api/stats` | Métricas + top países/IPs/motivos |
| GET/POST | `/api/domains` | Domínios |
| PATCH/DELETE | `/api/domains/:id` | Editar / apagar domínio custom |
| GET/POST | `/api/blocked-ips` | Bloqueios manuais |
| DELETE | `/api/blocked-ips/:ip` | Remover bloqueio |
| GET/PATCH | `/api/settings` | Preferências do painel |
| GET | `/r/:slug` | Link público protegido |

## Testes

```bash
npm test
curl -I "http://127.0.0.1:8787/r/demo?simulate=human"
curl -I "http://127.0.0.1:8787/r/demo?simulate=bot"
```

`simulate` só funciona com `ALLOW_SIMULATE=true` ou fora de `NODE_ENV=production` (e se settings.allowSimulate estiver ativo).

## Regras de proteção

- User-Agent de automação / headers incompletos
- Rate limit por IP (por campanha)
- Países e ASNs bloqueados por campanha
- ASN de datacenter/ads review bloqueado globalmente
- Bloqueio manual de IP
- Auto-ban: 3 fallbacks em 15 min → ban 15 min; 10 em 24h → ban 7 dias
- Modos: server-side, fallback agressivo, somente logs

## DNS e deploy

```text
go.seudominio.com
  -> Cloudflare DNS/WAF (recomendado)
  -> Backend MyCloaker
  -> /r/:slug
  -> URL principal ou fallback
```

Headers úteis atrás da Cloudflare:

- `cf-connecting-ip`
- `cf-ipcountry`
- `cf-asn` ou `x-asn` (se configurado no proxy)

Para proteger de verdade a página principal, a URL real **não** deve ficar aberta:

- proxy reverso pelo backend
- token temporário assinado
- allowlist de origem no servidor da página real

## Escopo de segurança

Este projeto bloqueia ou desvia automações suspeitas, scrapers, scanners e excesso de acessos. **Não** use para mostrar conteúdo diferente a revisores de plataformas publicitárias de forma enganosa.
