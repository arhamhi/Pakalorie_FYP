# Pakalorie API VPS Deploy

This deploys only the FastAPI app tier. Do not create a new Postgres container and do not run the seed during normal deploys. The live DB already exists on the VPS as `pakalorie-postgres`, is migrated, is seeded with 160 rows, and is bound only to `127.0.0.1:5432`.

## Target

- VPS: `root@179.61.246.154`
- Host: `srv987636.hstgr.cloud`
- API host used by the prod compose: `api.srv987636.hstgr.cloud`
- Existing proxy: `root-traefik-1`, using Docker labels, network `root_default`, TLS resolver `mytlschallenge`
- Existing DB: `pakalorie-postgres`, network `pakalorie_net`, database `pakalorie`, user `pakalorie`

Confirm the API host before relying on certificate issuance:

```sh
nslookup api.srv987636.hstgr.cloud
```

It should resolve to `179.61.246.154`. If Arham chooses a different API subdomain, change the `traefik.http.routers.pakalorie.rule` label in `backend/docker-compose.prod.yml` before deploying.

## 1. Inspect The VPS

SSH into the box:

```sh
ssh root@179.61.246.154
```

Confirm the existing containers and networks are still present:

```sh
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
docker network inspect root_default >/dev/null
docker network inspect pakalorie_net >/dev/null
docker exec pakalorie-postgres printenv POSTGRES_PASSWORD
```

Do not paste the password into chat or commit it. Use it only in the on-box `backend/.env`.

## 2. Put The Repo On The VPS

Use the existing private GitHub repo access, or copy the repo by another secure method:

```sh
mkdir -p /opt
git clone https://github.com/arhamhi/Pakalorie_FYP.git /opt/pakalorie-fyp
cd /opt/pakalorie-fyp/backend
```

For redeploys, update the existing checkout instead:

```sh
cd /opt/pakalorie-fyp
git pull --ff-only
cd backend
```

## 3. Create The On-Box Env File

Create `backend/.env` on the VPS. Keep permissions tight:

```sh
cd /opt/pakalorie-fyp/backend
umask 077
nano .env
```

Template:

```dotenv
DATABASE_URL=postgresql+asyncpg://pakalorie:<POSTGRES_PASSWORD>@pakalorie-postgres:5432/pakalorie
GEMINI_API_KEY=<SERVER_SIDE_GEMINI_API_KEY>
GEMINI_MODEL=gemini-3-flash-preview
GEMINI_API_URL=https://generativelanguage.googleapis.com/v1beta
CORS_ORIGINS=https://*.expo.dev,exp://*,http://localhost:8081,http://localhost:19006
```

Notes:

- `DATABASE_URL` must use `pakalorie-postgres:5432`, not `localhost`.
- Use the actual Postgres password from `docker exec pakalorie-postgres printenv POSTGRES_PASSWORD`.
- Use a server-side Gemini key. Do not commit it and do not put it in Expo client code.
- Do not run `python -m scripts.seed_foods` during normal deploy. The DB is already seeded.

## 4. Deploy The API

From `backend/`:

```sh
docker compose -f docker-compose.prod.yml up -d --build
```

The container starts by running:

```sh
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

`alembic upgrade head` is idempotent. The compose file does not publish an API host port; Traefik routes to port `8000` over `root_default`.

## 5. Verify

Check the container and logs:

```sh
docker compose -f docker-compose.prod.yml ps
docker logs --tail 100 pakalorie-api
docker inspect --format "{{json .State.Health}}" pakalorie-api
```

Check the app from inside the container:

```sh
docker exec pakalorie-api python -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:8000/healthz', timeout=5).read().decode())"
```

Check HTTPS from outside the VPS:

```sh
curl -i https://api.srv987636.hstgr.cloud/healthz
```

Expected response:

```json
{"status":"ok"}
```

Confirm Traefik and n8n are still healthy:

```sh
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
curl -I https://n8n.srv987636.hstgr.cloud
```

From a machine outside the VPS, confirm Postgres is not public:

```sh
nc -vz 179.61.246.154 5432
```

The Postgres check should fail or time out. A successful public connection on port `5432` is a security issue.

## 6. Redeploy

Normal code update:

```sh
cd /opt/pakalorie-fyp
git pull --ff-only
cd backend
docker compose -f docker-compose.prod.yml up -d --build
docker logs --tail 100 pakalorie-api
curl -i https://api.srv987636.hstgr.cloud/healthz
```

Restart without rebuilding:

```sh
cd /opt/pakalorie-fyp/backend
docker compose -f docker-compose.prod.yml restart api
```

Stop only the API container:

```sh
cd /opt/pakalorie-fyp/backend
docker compose -f docker-compose.prod.yml down
```

This prod compose file does not own the Postgres container or volume, so `down` should not remove the live DB.

## Troubleshooting

- `network root_default declared as external, but could not be found`: Traefik is not on the expected Docker network. Inspect `docker inspect root-traefik-1` and update `docker-compose.prod.yml` only after confirming the actual network.
- `network pakalorie_net declared as external, but could not be found`: the live DB network is missing. Do not create a new DB blindly; recover the existing DB state first.
- HTTPS 404 from Traefik: the host rule probably does not match the request host, or Traefik did not pick up labels. Check `docker logs root-traefik-1 --tail 100`.
- TLS certificate failure: confirm DNS points at `179.61.246.154` and that the host is not behind a proxy that blocks TLS-ALPN-01.
- DB connection failure from the API: re-check `DATABASE_URL`, especially the password and the internal host `pakalorie-postgres`.

## Acceptance Checklist

- `curl https://api.srv987636.hstgr.cloud/healthz` returns HTTP 200 from outside the VPS.
- `pakalorie-api` is healthy and has no published host port.
- `pakalorie-api` is attached to `root_default` and `pakalorie_net`.
- `pakalorie-postgres` remains bound only to `127.0.0.1:5432`.
- `root-n8n-1` and `root-traefik-1` remain healthy.
- Claude can use `https://api.srv987636.hstgr.cloud` as the mobile API base URL after Arham confirms the subdomain.
