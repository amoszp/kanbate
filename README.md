# KANBATE 🐈✔

A self-hosted, cyberpunk-styled **Kanban PWA** built to run locally on your
**OpenMediaVault (OMV) NAS** behind Docker Compose.

The app is a tortoiseshell cat with a checkmark. It runs completely on your LAN —
no cloud, no telemetry. Your data lives in a SQLite file on the NAS.

![stack](https://img.shields.io/badge/frontend-React_%2B_Vite_%2B_Tailwind-00f0ff)
![stack](https://img.shields.io/badge/backend-Express_%2B_SQLite-ff2a6d)
![stack](https://img.shields.io/badge/deploy-GHCR_%2B_Docker_Compose-ccff00)

---

## ✨ Features

- **Dashboard** — every project is a board; cards show live task counts and **unread badges**.
- **Global Quick-Add Bar** — type a task, pick the target project, hit enter. It lands in that project's **Backlog** instantly and lights up its unread badge.
- **4 canonical columns** — `Backlog` → `To Do` → `In Progress` → `Resolved`.
- **Drag & drop** between columns **and** a touch-friendly **«Move to»** dropdown on every card.
- **Full CRUD** — projects, tasks, and custom **Priority** / **AI Tool** tags (Claude, ChatGPT, Gemini, Local LLM, …).
- **History Archive** per project — resolved tasks are auto-archived.
- **In-App Automation Engine** (PWA/iPhone friendly — no push services needed):
  - Resolved tasks left alone **> 48 h** → automatically moved to the **History Archive**.
  - In-Progress tasks idle **> 24 h** → high-visibility cyberpunk **work reminder** toast (dismissible, remembered).
  - Checks run on app load **and** whenever the app regains focus (iOS throttles background timers, so this is the reliable pattern).
- **PWA** — installable on iPhone (Add to Home Screen) and Android with `manifest.json`, service worker, and Apple touch icons.
- **Data persistence** — SQLite database in `./data/kanbate.db` on the host, mounted as a Docker volume so updates never lose data.

---

## 📁 Project layout

```
Kanbate/
├── client/                 # React + Vite + TypeScript + Tailwind PWA
│   ├── public/             # manifest.json, service worker, icons
│   └── src/                # components, hooks, API layer
├── server/                 # Express + better-sqlite3 API
│   ├── routes/             # projects, tasks, tags, categories, history, dashboard, automation
│   ├── db.js               # SQLite schema + v1→v2 migration (data/kanbate.db)
│   ├── seed.js             # default tag blocks: Priority & AI Tool
│   └── middleware.js       # async error handling (JSON errors)
├── data/                   # SQLite volume (mounted into the container)
├── .github/workflows/      # auto-build & push image to GHCR
├── Dockerfile              # multi-stage, minimal (~node:22-alpine)
└── docker-compose.yml
```

---

## 🚀 Setup on OpenMediaVault (Docker Compose)

Kanbate runs as a **single container** via Docker Compose. Its **SQLite database is hosted on your NAS** in a
host folder (`./data/kanbate.db`) that is bind-mounted into the container, so your data survives container updates,
reboots, and even full image swaps.

### 0. Requirements on the NAS

- **OpenMediaVault** 6 or 7 (any current release).
- **Docker** and **Docker Compose** (Compose v2, the `docker compose` command) — install via the
  **omv-extras** plugin (Compose tab) or the **Docker Compose** plugin from the OMV web UI.
- A **shared folder / data volume** on your pool for Kanbate's persistent data.

### 1. Prepare a shared folder for the database

Through the **OMV web UI → Storage → Shared Folders** (or over SSH, if you prefer plain directories):

1. Create a shared folder named `kanbate` on one of your drives/mounts. Note its **path** — for example
   `/srv/dev-disk-by-id-.../kanbate` (OMV resolves the actual disk path).
2. Make sure the folder is mounted/accessible to the OS (Enable + apply). The folder will be the host-side
   location of your SQLite database.

### 2. Install & enable the Docker Compose plugin (OMV UI)

1. `System → Plugins` → install **openmediavault-compose** (and **openmediavault-omvextrasorg** first if not present).
2. `Services → Compose` → **Files**. Add a new Compose file; give it a name like `kanbate`.
3. You'll paste the `docker-compose.yml` contents there (step 5). Keep this screen open.

### 3. Over SSH: create the folder + `.env`

Open a terminal and SSH into your NAS (`ssh user@omv-ip`), then create the app folder that matches the
**mount point** you'll use in the compose file. Using `/srv/kanbate` as the host path (replace with the shared
folder path if you prefer that instead):

```bash
mkdir -p /srv/kanbate/data
cd /srv/kanbate
echo 'KANBATE_PORT=3000' > .env     # 3000 by default; OMV UI owns port 80
echo 'TZ=Europe/Berlin' >> .env     # your timezone
```

> The `./data` directory **is** your database host folder. Compose will map `./data` into the container at `/data`.

### 4. Copy the `docker-compose.yml` to the NAS

Either clone the repo on the NAS, or copy just the compose file from your workstation:

```bash
# Option A: clone straight onto the NAS
git clone https://github.com/<your-user>/<repo>.git /srv/kanbate

# Option B: copy the file over SSH from your PC
scp docker-compose.yml user@omv-ip:/srv/kanbate/
```

The compose file (reference):

```yaml
services:
  kanbate:
    build: .
    image: ghcr.io/${GITHUB_REPOSITORY_OWNER:-your-github-user}/kanbate:${KANBATE_TAG:-latest}
    container_name: kanbate
    restart: unless-stopped
    ports:
      - "${KANBATE_PORT:-3000}:3000"   # host port 3000 -> container 3000
    environment:
      - TZ=${TZ:-Europe/Berlin}
    volumes:
      - ./data:/data                    # <-- host folder = the hosted SQLite database
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://127.0.0.1:3000/api/health"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 10s
```

### 5. Start it

If you used the **OMV Compose plugin UI**:

1. Paste the compose file into the `kanbate` file, then **Save**.
2. Click **Pull image** (or **Up** — it builds locally if `build: .` is present and no image exists yet).
3. Watch the **Logs** tab; you should see `[kanbate] database ready (...)`. The container will be created with
   the host folder `./data` mounted as `/data`, and the SQLite DB created there on first boot.

Or via **SSH**:

```bash
cd /srv/kanbate
docker compose up -d            # pulls the GHCR image (or builds locally)
docker compose ps               # STATUS should be "Up (healthy)"
docker compose logs -f kanbate  # watch it boot
```

### 6. Fix host permissions (important)

The container runs as an **unprivileged user (uid 1000)**. For it to create/write the SQLite database, the host
`./data` folder must be writable by uid 1000. On OMV the folder is often owned by root, so do this once over SSH:

```bash
sudo chown -R 1000:1000 /srv/kanbate/data
```

> If you ever see `permission denied` or the container crash-loops at startup in the logs, re-run the `chown`.

### 7. Open the app

- Browse to **`http://<omv-ip>:3000`** (use your NAS IP, e.g. `http://192.168.1.50:3000`).
- The API health check is at **`http://<omv-ip>:3000/api/health`** → returns `{"ok":true,...}`.
- On first boot Kanbate seeds the two default **tag blocks**: `Priority` and `AI Tool`.

### 8. Install the PWA on your phone

- **iPhone/iPad:** open the URL in Safari → **Share → Add to Home Screen** → Kanbate launches full-screen.
- **Android:** open in Chrome → menu → **Add to Home screen** (or **Install app**).

---

### 🔄 Updating Kanbate on the NAS

A new build is pushed to **GitHub Container Registry (GHCR)** automatically on every push to `main`. To update:

```bash
cd /srv/kanbate
docker compose pull      # fetch the latest GHCR image
docker compose up -d     # recreate the container (no data loss)
```

Your **SQLite database is untouched**: it lives in `./data/` on the NAS, outside the container, and is
re-mounted on the next run.

> **Backup tip:** backing up Kanbate is just copying one file — `./data/kanbate.db` (plus its
> `-wal` / `-shm` sidecars if present). Copy those while the container is stopped for a consistent snapshot.

---

## 🧑‍💻 Local development & testing

Run Kanbate on your PC for development and to test changes before deploying. No Docker is required for the
dev loop — both the API and the web app run directly with Node.

### Requirements (local)

| Tool | Version | Notes |
|------|---------|-------|
| **Node.js** | **≥ 20** | `node -v`. Required by both client and server. |
| **npm** | ≥ 10 | Ships with Node 20+. `npm -v`. |
| **git** | any | Only if you cloned the repo. |
| **Docker** (optional) | any | Only needed to test the containerized build. |

> On Windows, use PowerShell or WSL2. On macOS/Linux, any shell works. The SQLite library
> (`better-sqlite3`) ships prebuilt binaries for the common platforms, so `npm install` normally needs **no
> compiler toolchain**. If your platform has no prebuild, you'll need a C++ toolchain + Python for the native build.

### 1. Install dependencies

```bash
cd client && npm install     # React + Vite + Tailwind PWA
cd ../server && npm install  # Express + better-sqlite3 API
```

### 2. Run the backend (API only, port 3000)

```bash
cd server
npm start
# or, with auto-reload on save:
npm run dev
```

You should see `[kanbate] database ready (...)` and `[kanbate] API + PWA listening on http://0.0.0.0:3000`.
The SQLite database is created at `server/../data/kanbate.db` (the `data/` folder at the project root).

> To use a different database location, set `KANBATE_DATA_DIR` before starting, e.g.
> `KANBATE_DATA_DIR=/tmp/kanbate-data npm start`.

### 3. Run the frontend dev server (port 5173)

In a **second terminal**:

```bash
cd client
npm run dev
```

Open **`http://localhost:5173`**. Vite proxies `/api/*` to `http://localhost:3000`, so the UI talks to your
running backend automatically with hot-reload.

> The frontend **requires the backend to be running** (step 2). If you only start the client, the app will show
> a "Connection error" screen with a Retry button.

### 4. Quick API test (no browser needed)

With the backend running, verify endpoints:

```bash
curl http://localhost:3000/api/health            # {"ok":true,...}
curl http://localhost:3000/api/projects          # [] (empty on fresh install)
curl -X POST http://localhost:3000/api/projects \
     -H 'Content-Type: application/json' \
     -d '{"name":"Test project"}'                # creates a project
curl http://localhost:3000/api/categories        # seeded blocks: Priority, AI Tool
```

### 5. Build the production client (optional)

```bash
cd client
npm run build        # type-checks + emits client/dist (served statically by the API)
```

### 6. Test the Docker build locally (optional)

To reproduce the exact NAS image on your machine (this is what the CI does on each push):

```bash
docker build -t kanbate:test .
docker run --rm -d --name kanbate-test \
  -p 3000:3000 \
  -e KANBATE_DATA_DIR=/data \
  -v "$(pwd)/data:/data" \
  kanbate:test
docker logs -f kanbate-test        # confirm "database ready"
```

The multi-stage Dockerfile builds the client, installs only production server deps, and runs as a non-root
user on `node:22-alpine`. On first boot it auto-creates the database and seeds the default tag blocks.

### 7. Test automation rules (reference values)

| Rule | Threshold | Action |
|------|-----------|--------|
| Resolved → History Archive | **> 48 h** in Resolved | Task migrated to the project's History Archive |
| In Progress reminder | **> 24 h** in In Progress | High-visibility reminder toast (dismissible) |

Both checks are client-driven: on app load and on focus/`visibilitychange` the client calls
`POST /api/automation/run`, which performs the archive migration and returns stale In-Progress tasks. To test
the *archive* flow locally, set a task's status to Resolved and backdate `moved_to_resolved_at` in the DB (or
edit the thresholds in `server/routes/automation.js`), then reload the app.

### Troubleshooting (local)

- **`npm install` fails on better-sqlite3** — you're on a platform without a prebuilt binary. Install a C++
  toolchain + Python, or use WSL2 / Docker.
- **Blank page / "Connection error"** — the backend isn't running. Start `npm start` in `server/` first.
- **Port 3000 already in use** — set `PORT` before starting, e.g. `PORT=3001 npm start` (and update the Vite
  proxy target in `client/vite.config.ts` if you change the API port).

---

## 🐳 Build & deploy pipeline

- `Dockerfile` — multi-stage: builds the client, installs only production server deps, runs as a non-root user on `node:22-alpine` (minimal image).
- `docker-compose.yml` — maps `${KANBATE_PORT:-3000}:3000`, mounts `./data` as `/data`, healthcheck included.
- `.github/workflows/deploy.yml` — on every push to `main`: builds for `linux/amd64` **and** `linux/arm64`, then pushes `ghcr.io/<your-user>/<repo>:latest` to GHCR.

The GHCR image name is `ghcr.io/<github-user>/<repo>`. If you want the compose file to pull *your* registry image instead of building, edit the `image:` line in `docker-compose.yml` to your full GHCR image name.

---

## 🛟 Troubleshooting on the NAS

- **Blank page / “Connection error”** — confirm the API is reachable: `curl http://omv-ip:3000/api/health`. Check `docker compose logs kanbate`.
- **Port conflict** — OMV’s web UI owns port 80 by default; set `KANBATE_PORT` to something else in `.env`.
- **Data gone after update?** — the `./data` folder must stay in the same directory as your `docker-compose.yml`. That folder is your database.
- **Permission denied / app can't start** — the container's user (uid 1000) can't write to `./data` on the host. Fix: `chown -R 1000:1000 /srv/kanbate/data`.
- **Better-sqlite3 build errors** — you’re on `node:22-alpine` with prebuilt musl binaries; if an exotic platform fails, run `docker compose build --no-cache` to force a rebuild.

---

Licensed for personal/homelab use. Built with 🖤 by the cat.
