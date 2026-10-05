# Ubuntu deployment with Docker Compose and a domain

Use `compose.production.yml` by itself, not merged with the development `docker-compose.yml`. It provides Caddy HTTPS, the frontend/API, PostgreSQL, Redis, a cleanup worker and private MinIO storage. Real SMTP replaces the development email catcher. Node.js, PostgreSQL and Chromium are installed inside containers; you do not install them on the host.

This configuration has been statically reviewed, but Docker is unavailable on the development machine. Run the validation and acceptance checks below on your Ubuntu server before inviting users.

## 1. Collect the deployment details

Use a fresh Ubuntu 24.04 LTS server with a public IPv4 address, a sudo-capable SSH account and access to the domain's DNS. A starting configuration for small usage is 2 vCPU, 4 GB RAM and 40 GB disk; capacity depends on concurrent PDF exports, stored files and build memory.

Prepare these details:

| Detail | Example / purpose |
| --- | --- |
| SSH account and server IP | `ubuntu@YOUR_SERVER_IP` |
| Canonical hostname | `resume.yourdomain.com` |
| Certificate contact email | `admin@yourdomain.com` |
| SMTP host, port, username, password | Your transactional email provider's settings |
| Verified sender | `hello@yourdomain.com` |
| AI provider key/model | Optional, enables AI features |
| Google OAuth client credentials | Optional, enables Google sign-in |

Use one canonical hostname. The production Compose file derives `APP_URL=https://DOMAIN` automatically. Database, Redis, storage endpoints and Chromium paths are configured internally.

## 2. Configure domain DNS

At your DNS provider create an **A record** with name `resume` and value your server's public IPv4 address. For the root domain, use name `@` instead and set `DOMAIN` to the root domain. Leave AAAA absent unless this server has working public IPv6. If using Cloudflare, start with DNS-only while obtaining and checking origin HTTPS.

On the server:

```bash
dig +short A resume.yourdomain.com
```

It must resolve to the server IP before starting Caddy. Ports 80 and 443 must be reachable for certificate issuance and web access. Caddy obtains and renews certificates automatically.

## 3. Install host utilities and Docker

Connect using SSH:

```bash
ssh ubuntu@YOUR_SERVER_IP
sudo apt update
sudo apt upgrade -y
sudo apt install -y ca-certificates curl git openssl ufw dnsutils nano
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

sudo tee /etc/apt/sources.list.d/docker.sources >/dev/null <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
sudo docker run --rm hello-world
sudo docker compose version
```

These instructions assume a fresh server without conflicting Docker packages. For an existing installation follow Docker's official Ubuntu installation guide before replacing packages. No host Node.js/npm installation is necessary.

## 4. Open the necessary ports

In the cloud provider firewall/security group allow TCP 22 from your administration IP, TCP 80 and 443 publicly, and optionally UDP 443 for HTTP/3. Use your actual SSH port if different. Do not expose 4000, 5432, 6379, 8080, 9000 or 9001.

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 443/udp
sudo ufw enable
sudo ufw status
```

Allow the SSH port before enabling UFW. Docker-published ports can bypass UFW rules, so this Compose file publishes only Caddy's ports. Confirm no existing host web server uses ports 80/443:

```bash
sudo ss -lntp | grep -E ':(80|443)\b'
```

Resolve existing port use before starting Caddy.

## 5. Upload the project

From Windows PowerShell, archive the project source without secrets, development data or dependencies:

```powershell
cd "C:\Users\PRANAV\Documents\PROJECTS DEVOPS\ASTRA PROJECT\resumeforge"
tar.exe -czf ..\resumeforge-deploy.tar.gz --exclude=node_modules --exclude=.data --exclude=dist --exclude=.git --exclude=.env --exclude=.env.production --exclude=test-results --exclude=playwright-report --exclude=coverage .
scp ..\resumeforge-deploy.tar.gz ubuntu@YOUR_SERVER_IP:/home/ubuntu/
```

On Ubuntu:

```bash
sudo mkdir -p /opt/resumeforge
sudo chown "$USER":"$(id -gn)" /opt/resumeforge
tar -xzf ~/resumeforge-deploy.tar.gz -C /opt/resumeforge
cd /opt/resumeforge
```

If you already maintain a Git repository, cloning it into `/opt/resumeforge` is another option. The current local folder has no Git remote configured. Local PGlite development data is not migrated by this deployment; production starts with a new PostgreSQL database.

## 6. Create the production environment

```bash
cp .env.production.example .env.production
chmod 600 .env.production
openssl rand -hex 32
openssl rand -hex 32
openssl rand -hex 32
nano .env.production
```

Use the three independent generated values for `SESSION_SECRET`, `POSTGRES_PASSWORD` and `STORAGE_SECRET_KEY`. Use hexadecimal for the PostgreSQL password so it is safe in the generated database URL. Set:

```dotenv
DOMAIN=resume.yourdomain.com
ACME_EMAIL=admin@yourdomain.com
SESSION_SECRET=YOUR_FIRST_GENERATED_VALUE
POSTGRES_PASSWORD=YOUR_SECOND_GENERATED_VALUE
STORAGE_ACCESS_KEY=resumeforge-storage
STORAGE_SECRET_KEY=YOUR_THIRD_GENERATED_VALUE
SMTP_HOST=YOUR_PROVIDER_SMTP_HOST
SMTP_PORT=587
SMTP_USER='YOUR_PROVIDER_USERNAME'
SMTP_PASSWORD='YOUR_PROVIDER_PASSWORD'
EMAIL_FROM='ResumeForge <hello@yourdomain.com>'
AI_API_KEY=
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4.1-mini
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

`DOMAIN` must have no protocol, port or path. Use single quotes around passwords containing `$` or `#` to prevent Compose interpolation; escape an embedded single quote as `\'`. Keep this file private. Production cookies are Secure by default; the production file explicitly keeps the local HTTP exception disabled.

## 7. Set up real email and optional services

Verify your sender/domain with your email provider and add its exact SPF/DKIM records. Add a DMARC policy appropriate for your domain. Use the provider's SMTP settings; 587 uses STARTTLS and 465 uses implicit TLS in this app. Production verification and reset emails must reach real inboxes. Do not use Mailpit for public production.

For AI, set the server-side provider key and a model available to your account. Editing, matching and manual career tools work without AI. For Google sign-in create a Web application OAuth client with authorized origin `https://resume.yourdomain.com` and exact redirect URI `https://resume.yourdomain.com/api/auth/google/callback`; set both Google credentials and configure the consent screen for your intended users.

MinIO is included and creates the private `resumeforge` bucket automatically. It needs no public DNS record. Uploaded images are served through the authenticated/public application API. PostgreSQL and Redis also require no separate host install or public port.

## 8. Validate, build and start

In `/opt/resumeforge`, define a helper to always select the correct configuration:

```bash
dc() { sudo docker compose --env-file .env.production -f compose.production.yml "$@"; }
dc config --quiet
dc pull caddy postgres redis minio storage-init
dc build
dc up -d --wait
dc ps -a
dc logs --tail=100 backend worker caddy
```

Repeat the `dc()` definition after opening a new SSH shell. Configuration validation must succeed before building. Initial builds may take several minutes. `storage-init` exiting successfully is expected; the other services should remain running. The backend creates its schema automatically on startup. Do not run the development seed on production.

`dc config` without `--quiet` prints resolved secrets; avoid sharing that output. Caddy certificate state, PostgreSQL, Redis and file storage persist in named Docker volumes.

## 9. Check the domain and application

```bash
curl -I http://resume.yourdomain.com
curl -I https://resume.yourdomain.com
curl -fsS https://resume.yourdomain.com/api/health
```

Expect HTTP to redirect to HTTPS, a valid certificate and health JSON `{"status":"ok"}`. Then use the browser to register a fresh user, receive/complete verification, log out/in, create/edit/reload a resume, export a PDF, upload a profile photo and test password recovery. Test AI/Google if enabled. The health endpoint alone does not exercise these integrations.

## 10. Back up and update

Protect an off-server copy of `.env.production`. Back up PostgreSQL and uploaded object storage, and test restoration. A local PostgreSQL dump:

```bash
mkdir -p backups
chmod 700 backups
dc exec -T postgres pg_dump -U resumeforge -d resumeforge -Fc > "backups/resumeforge-$(date +%F-%H%M).dump"
```

This dump does not include uploaded images. Back up MinIO's `resumeforge_object-data` volume with coordinated server snapshots or MinIO client exports. Keep copies away from the same server. Include certificate state if using full-server backups.

After transferring an updated source archive, retain `.env.production` and volumes, take a backup and run:

```bash
dc build
dc up -d --wait
```

To stop without deleting data use `dc down`. Do not use `down -v` or `docker volume prune` on this deployment; those can delete persistent data. Changing `POSTGRES_PASSWORD` only in the environment does not rotate a password in an already initialized database.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Certificate/HTTPS failure | A/AAAA DNS, public ports 80/443, port conflicts and `dc logs caddy` |
| 502 response | `dc ps -a` and `dc logs backend frontend` |
| Login does not persist | Canonical domain, HTTPS, browser cookies and no HTTP cookie workaround |
| Email never arrives | SMTP credentials, sender verification, SPF/DKIM and provider delivery logs |
| PDF export fails | Backend logs, free memory and Chromium executable inside the backend |
| Photo upload fails | `dc logs minio storage-init` and storage credentials |
| Image pull fails | Server Internet access and registry availability for the image tag |

References: [Docker installation on Ubuntu](https://docs.docker.com/engine/install/ubuntu/), [Compose environment files](https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/), [Docker firewall behavior](https://docs.docker.com/engine/network/packet-filtering-firewalls/), [Caddy automatic HTTPS](https://caddyserver.com/docs/automatic-https).
