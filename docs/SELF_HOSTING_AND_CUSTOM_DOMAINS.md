# ChurchOS — Custom Subdomains & Self-Hosting Guide

ChurchOS is architected to give churches complete freedom and ownership over their digital infrastructure. Depending on your ministry's technical preferences, you can deploy in either of two ways:

1. **Option A: Custom Subdomain CNAME (White-Labeled SaaS — Zero Maintenance)**
   - Best for churches that want `https://cos.tbclekki.org` or `https://portal.tbclekki.org` fully branded with their logo and colors without having to manage servers, databases, or security patches.
2. **Option B: Dedicated Self-Hosted / On-Premise (Turnkey Docker Compose)**
   - Best for churches that require 100% data custody, dedicated PostgreSQL database instances, or deployment on private cloud infrastructure (AWS EC2, DigitalOcean, Hetzner, or internal church servers).

---

## Option A: Custom Subdomain CNAME (Recommended)

Point any subdomain on your existing church website (e.g., `cos.tbclekki.org`, `portal.tbclekki.org`, `church.mychurch.com`) directly to ChurchOS.

### Request Flow
```
Visitor browses: https://cos.tbclekki.org
      │
      ▼
DNS CNAME record points to: church-crm-backend-production.up.railway.app
      │
      ▼
ChurchOS auto-detects incoming Host header: cos.tbclekki.org
      │
      ▼
Loads The Baptizing Church's custom theme, colors, logo, and portal widgets
```

### Step 1: Register Subdomain in ChurchOS
1. Log in to your ChurchOS Admin dashboard.
2. Navigate to **Settings** > **Profile & Brand Identity**.
3. Scroll down to **Custom Subdomain & Dedicated Deployment**.
4. In the **Church Custom Subdomain** field, enter:
   `cos.tbclekki.org`
5. Click **Save Church Profile**.

### Step 2: Add DNS CNAME Record in your Domain Registrar / Cloudflare
In the DNS management panel for `tbclekki.org` (e.g. Cloudflare, cPanel, Namecheap, GoDaddy):

| Record Type | Host / Name | Target / Points To | TTL | Proxy Status |
| :--- | :--- | :--- | :--- | :--- |
| **CNAME** | `cos` | `church-crm-backend-production.up.railway.app` | Auto | DNS Only (or Proxied) |

> [!TIP]
> If you are using **Cloudflare**, you can enable the orange Cloudflare Proxy for free SSL certificate issuance and DDoS protection. Ensure your SSL mode is set to **Full** or **Full (strict)**.

### Step 3: Verification
Open your browser and navigate to:
```
https://cos.tbclekki.org
```
ChurchOS will dynamically identify your church, load your custom brand colors, logo, and public intake forms, giving your members a 100% white-labeled experience.

---

## Option B: Dedicated Self-Hosted / On-Premise Deployment

Run your own isolated, standalone instance of ChurchOS on any standard Linux server or virtual machine with Docker.

### Architecture
The turnkey Docker Compose stack orchestrates:
- **`church-crm-db`**: PostgreSQL 16 Alpine with persistent volume storage (`pgdata`).
- **`church-crm-api`**: Node.js 20 production backend with automatic database migrations on boot.
- **`church-crm-web`**: Production Nginx container serving optimized React SPA assets, proxying `/api/` to the backend, and handling client-side SPA routing.

### Prerequisites
- A virtual private server (VPS) running **Ubuntu 22.04 LTS** or **Debian 12** (AWS EC2, DigitalOcean, Linode, Hetzner, etc.)
- Recommended specs: 2 vCPU, 4GB RAM, 40GB SSD
- Docker and Docker Compose installed:
  ```bash
  curl -fsSL https://get.docker.com -o get-docker.sh
  sudo sh get-docker.sh
  sudo usermod -aG docker $USER
  ```

---

### Step-by-Step Installation

#### 1. Clone the Repository
```bash
git clone https://github.com/the-baptizing-church/church-crm.git
cd church-crm
```

#### 2. Create the Production Environment File
Copy the provided `.env.production.example` template:
```bash
cp .env.production.example .env
nano .env
```

Set the following critical environment variables:
```ini
# PostgreSQL Database Credentials
POSTGRES_DB=church_crm
POSTGRES_USER=postgres
POSTGRES_PASSWORD=CreateAStrongRandomPassword123!

# JWT Auth Secret (Generate using: openssl rand -hex 32)
JWT_SECRET=f9c2d18471e98ab45cd870192e4785b912384729182374918274918274918274

# Outbound SMTP Credentials (for Member follow-up notifications & 2FA)
SMTP_HOST=mail.tbclekki.org
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=info@tbclekki.org
SMTP_PASS=YourEmailPasswordHere
SMTP_FROM="The Baptizing Church <info@tbclekki.org>"
```

#### 3. Build & Launch Containers
```bash
docker compose up -d --build
```

Monitor container boot and database schema migrations:
```bash
docker compose logs -f api
```
You should see:
```
✅ All migrations completed successfully
⛪ ChurchOS API running on port 8080
```

#### 4. Configure Domain & Free Let's Encrypt SSL
Point an `A` record for `cos.tbclekki.org` in your DNS to your VPS IP address:

| Record Type | Host / Name | Value | TTL |
| :--- | :--- | :--- | :--- |
| **A** | `cos` | `<Your VPS Public IP>` | 300 |

Install Certbot to manage HTTPS certificates:
```bash
sudo apt update && sudo apt install -y certbot python3-certbot-nginx
```

Configure host Nginx to proxy traffic to the ChurchOS Docker container (listening on port 80):
```bash
sudo nano /etc/nginx/sites-available/church-crm
```

Add the following server block:
```nginx
server {
    server_name cos.tbclekki.org;

    location / {
        proxy_pass http://127.0.0.1:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the configuration and obtain SSL certificate:
```bash
sudo ln -s /etc/nginx/sites-available/church-crm /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d cos.tbclekki.org
```

Certbot will automatically install SSL and renew it every 90 days.

---

### Database Backups & Maintenance

#### 1. Manual Backup
```bash
docker compose exec -T db pg_dump -U postgres church_crm > backup_$(date +%F_%H%M%S).sql
```

#### 2. Automated Daily Cron Backup
Add an automated backup job at 2:00 AM every night:
```bash
crontab -e
```
Add:
```bash
0 2 * * * cd /home/ubuntu/church-crm && docker compose exec -T db pg_dump -U postgres church_crm | gzip > /home/ubuntu/backups/church_crm_$(date +\%F).sql.gz
```

#### 3. Updating ChurchOS to the Latest Release
```bash
git pull origin main
docker compose up -d --build
```
The backend automatically runs any pending database migrations upon startup with zero data loss.

---

## Summary of Options

| Feature | Option A: Subdomain CNAME | Option B: Self-Hosted Docker |
| :--- | :--- | :--- |
| **Subdomain URL** | `cos.tbclekki.org` | `cos.tbclekki.org` |
| **White-Labeling** | 100% Church Brand & Logo | 100% Church Brand & Logo |
| **Server Management** | Zero (Managed by ChurchOS) | Maintained by Church Tech Team |
| **Database Custody** | Managed Cloud DB with Backups | 100% Private Local Storage |
| **Updates** | Automatic | 1-Command (`docker compose up -d`) |
| **Setup Time** | 2 minutes (1 DNS CNAME) | 15 minutes (VPS + Docker) |
