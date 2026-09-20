# Deployment on Proxmox (LXC)

This guide sets up Pottery Logs in an unprivileged Debian LXC container on
Proxmox VE, running as a single Node.js process behind a reverse proxy that
terminates TLS. The app uses SQLite, so there is no separate database
service to manage — the whole app is one process plus one file.

## 1. Create the LXC container

In the Proxmox web UI (or `pct create`):

- Template: Debian 12 (bookworm) standard template
- Unprivileged container: yes
- Resources: 1 vCPU / 512 MB–1 GB RAM / 4–8 GB disk is plenty for personal
  or small-group use
- Network: static IP or DHCP + a hostname you control in DNS, e.g.
  `pottery.example.com`

Start the container and open a console (`pct enter <vmid>` from the Proxmox
host, or the web console).

## 2. Install Node.js and system dependencies

```bash
apt update && apt upgrade -y
apt install -y curl git build-essential ca-certificates

# Node.js 20 LTS via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

node -v   # should print v20.x
```

Create a dedicated system user to run the app (don't run it as root):

```bash
adduser --system --group --home /opt/pottery-logs pottery
```

## 3. Get the code and install dependencies

```bash
su - pottery -s /bin/bash
cd /opt/pottery-logs
git clone <your-repo-url> .
# or: unpack a release tarball here instead of git clone

cd backend
npm ci
cd ../frontend
npm ci
```

## 4. Configure environment

```bash
cd /opt/pottery-logs/backend
cp .env.example .env
nano .env   # or vim/vi
```

Set at minimum:

- `APP_URL` — the public HTTPS URL, e.g. `https://pottery.example.com`
- `DATABASE_URL` — **use an absolute path**:
  `file:/opt/pottery-logs/backend/data/pottery.db`
  (a relative path can resolve differently for `prisma migrate` vs. the
  running server — see the comment in `.env.example`)
- `SESSION_SECRET` — generate a long random value:
  `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
- `COOKIE_SECURE=true` (requires HTTPS — see the reverse proxy step below)
- `TRUST_PROXY=1` (the app sits behind nginx/Caddy)
- `INITIAL_ADMIN_USERNAME` / `INITIAL_ADMIN_PASSWORD` — used once by the admin
  bootstrap script below, then no longer read

## 5. Build and initialize the database

Still as the `pottery` user, from `/opt/pottery-logs/backend`:

```bash
npm run build              # prisma generate + tsc
npx prisma migrate deploy  # creates the SQLite schema

cd ../frontend
npm run build               # builds the static frontend into frontend/dist
```

Create the first administrator account:

```bash
cd ../backend
npm run seed:admin
```

Sign in as that account immediately after starting the server and set up
two-factor authentication — the app requires it for admin accounts and
blocks admin API access until it's enabled (see `SECURITY.md`-level notes
in the main README).

## 6. Run as a systemd service

Exit back to root (`exit`) and create `/etc/systemd/system/pottery-logs.service`:

```ini
[Unit]
Description=Pottery Logs
After=network.target

[Service]
Type=simple
User=pottery
Group=pottery
WorkingDirectory=/opt/pottery-logs/backend
EnvironmentFile=/opt/pottery-logs/backend/.env
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=3

# Hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=/opt/pottery-logs/backend/data
ProtectHome=true

[Install]
WantedBy=multi-user.target
```

Enable and start it:

```bash
systemctl daemon-reload
systemctl enable --now pottery-logs
systemctl status pottery-logs
journalctl -u pottery-logs -f   # tail logs
```

The app listens on `127.0.0.1:3000` by default (see `PORT` in `.env`) — it
is not meant to be exposed directly to the internet.

## 7. Reverse proxy with TLS (Caddy, recommended)

Caddy gets you automatic HTTPS with essentially no config. Install it:

```bash
apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install -y caddy
```

`/etc/caddy/Caddyfile`:

```
pottery.example.com {
	reverse_proxy 127.0.0.1:3000
}
```

```bash
systemctl reload caddy
```

Caddy will automatically obtain and renew a Let's Encrypt certificate for
`pottery.example.com` (the container needs outbound HTTPS and the domain
needs to resolve to it, e.g. via a port forward on your router/firewall to
the Proxmox host, or a reverse proxy further upstream).

### Alternative: nginx + certbot

If you prefer nginx:

```bash
apt install -y nginx certbot python3-certbot-nginx
```

`/etc/nginx/sites-available/pottery-logs`:

```nginx
server {
    listen 80;
    server_name pottery.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/pottery-logs /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d pottery.example.com
```

## 8. Backups

Everything the app owns lives in one file: `backend/data/pottery.db`
(plus its `-wal`/`-shm` siblings if present). Two options, use both:

- **Proxmox snapshots**: snapshot the LXC container/its storage on a
  schedule via the Proxmox UI or `vzdump`. Simple, whole-container.
- **File-level backup**: for a live app, don't just `cp` the file while the
  server is running (SQLite may have uncommitted WAL data). Use the
  SQLite backup API instead:

  ```bash
  su - pottery -s /bin/bash -c \
    "sqlite3 /opt/pottery-logs/backend/data/pottery.db '.backup /opt/pottery-logs/backup-$(date +%F).db'"
  ```

  Copy that backup file offsite (rsync, etc.) on a cron job.

## 9. Updating the app

```bash
su - pottery -s /bin/bash
cd /opt/pottery-logs
git pull
cd backend && npm ci && npm run build && npx prisma migrate deploy
cd ../frontend && npm ci && npm run build
exit
systemctl restart pottery-logs
```

## Running on a Raspberry Pi instead

The same steps work unmodified on Raspberry Pi OS (64-bit) — Node.js 20 has
official `arm64` builds, and SQLite has no native build requirements beyond
what Prisma bundles. Give it at least a Pi 4 with 2 GB RAM for comfortable
headroom, and consider putting `data/` on the SD card's most reliable
partition (or an attached SSD) since SQLite does a fair number of small
writes.

## Firewall

Only ports 80/443 (for the reverse proxy) need to be reachable from outside
the container; the Node process itself (port 3000 by default) should stay
bound to `127.0.0.1` and never be exposed directly. If you route traffic to
the container's IP directly (no NAT), configure `nftables`/`iptables` on the
container or the Proxmox host accordingly.
