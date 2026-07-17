# Master Production Deployment Plan (AI-Actionable Prompt)

> **Instructions for the AI**: Read this deployment plan carefully. It contains complete, production-grade instructions, code blocks, configuration files, and terminal commands to deploy this Node.js + Express + TypeScript backend. Implement the architecture selected by the user (Option A or Option B).

---

## 🎯 Target Goal

Configure, deploy, and scale the application on an **Ubuntu VPS** with automatic self-healing recovery, persistent error logs, public URL access (with SSL/HTTPS), and automated CI/CD deployments.

---

## 📋 Pre-requisites & Specifications

* **Runtime**: Node.js v20 (defined in `Dockerfile` at root)
* **Framework**: Express.js with TypeScript
* **Database**: PostgreSQL (Prisma Client)
* **Caching/Queue**: Redis (ioredis)
* **Application Port**: `3000` (internal container port)

---

## 🚀 Option A: The Coolify Way (Recommended)

Coolify is an open-source alternative to Heroku that manages Docker containers, Traefik reverse-proxy, and Let's Encrypt SSL certificates automatically.

### 1. Public URL & Domain Setup Options

Choose one of the three options below to configure public URL access:

| Option | Setup | Protocol | SSL / HTTPS Support | Domain Required | Cost |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Custom Domain** | Point DNS A-Record to server IP | **HTTPS** | **Yes (Automatic via Let's Encrypt)** | Yes | Cost of domain |
| **2. Wildcard Domain** | Use Coolify system wildcard | **HTTPS** | **Yes (Automatic via Let's Encrypt)** | No (uses Coolify's) | Free |
| **3. Server IP** | Direct IP + Port mapping | **HTTP** | **No** (unless manually proxied) | No | Free |

* **Custom Domain Configuration**: Add an `A` Record in your registrar pointing `api.yourdomain.com` to `<YOUR_SERVER_IP>`, then enter `https://api.yourdomain.com` in Coolify.
* **Wildcard Domain Configuration**: Tick **"Use system wildcard domain"** in the app settings in Coolify.
* **Server IP Configuration**: Enter `http://<YOUR_SERVER_IP>:3000` in the **Domains** field, and configure **Port Mapping** under network settings to map Host Port `3000` to Container Port `3000`.

---

### 2. Environment Variables Configuration

Set up the following environment variables inside the Coolify application settings:

| Key | Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enables production mode optimizations |
| `PORT` | `3000` | Port served by the container |
| `SKIP_DOCKER_CHECK` | `true` | **CRITICAL**: Bypasses the local development docker daemon checks |
| `DATABASE_URL` | `postgresql://<user>:<pass>@<host>:5432/enterprise_db?schema=public` | Production Postgres connection string |
| `REDIS_URL` | `redis://<host>:6379` | Production Redis URL |
| `JWT_ACCESS_SECRET` | `<secure-string>` | JWT signing secret |
| `JWT_REFRESH_SECRET` | `<secure-string>` | JWT refresh signing secret |
| `JWT_ACCESS_EXPIRATION` | `15m` | Token expiry time |
| `JWT_REFRESH_EXPIRATION` | `7d` | Refresh token expiry time |

---

### 3. Self-Healing Health Check Configuration

To enable automatic container recovery if the Node process hangs:

1. Navigate to the **Health Checks** tab in the Coolify App Dashboard.
2. Apply the following settings:
   * **Test Method / Type**: HTTP check
   * **Path**: `/api/v1/health/live`
   * **Port**: `3000`
   * **Interval**: `10s` (seconds between checks)
   * **Timeout**: `5s`
   * **Retries (Max Failures)**: `3` (automatically restarts container if 3 consecutive checks fail)

---

### 4. Storage Volume Mount (Persistent Error Logs)

By default, Docker container files are lost when the app crashes or restarts. To keep error logs safe:

1. Go to the **Storage** tab in Coolify.
2. Click **Add Volume** and enter:
   * **Destination path (inside container)**: `/usr/src/app/logs`
   * **Source path (host path on Ubuntu)**: `/var/lib/docker/volumes/api-logs`
3. Save configuration. This mounts the container directory `/usr/src/app/logs` (where `logs/error.log` is written) directly to the host Ubuntu disk.

---

### 5. Automated CI/CD Pipeline (GitHub Webhooks)

Set up automated Git-push deployments:

1. Connect Coolify to your GitHub repository in the **Sources** tab.
2. Under application settings, toggle **Automatic Deployments** to **On**.
3. Copy the generated Webhook URL and Secret.
4. Go to your GitHub repository -> **Settings** -> **Webhooks** -> **Add Webhook**.
5. Paste the **Payload URL** and **Secret**, set Content Type to `application/json`, select **Just the push event**, and save.
6. **Result**: Every `git push origin main` will trigger Coolify to pull the latest changes, build the image, and hot-reload your app.

---

### 6. SSH Support & Maintenance (Prisma Migrations in Docker)

To run migrations or seeders inside the running Coolify container:

1. SSH into the server: `ssh <user>@<YOUR_SERVER_IP>`
2. Open a shell in the running container:

   ```bash
   docker exec -it $(docker ps -q --filter name=enterprise-backend) sh
   ```

3. Run database migrations and seeders:

   ```bash
   npx prisma migrate deploy --schema=src/database/prisma/schema.prisma
   npm run prisma:seed
   ```

---

## 🛠️ Option B: The Bare-Metal Way (Nginx + PM2)

If you prefer to deploy directly on Ubuntu without containers, follow this bare-metal guide.

### 1. Install System Packages

SSH into your Ubuntu server and run:

```bash
# Update Ubuntu package lists
sudo apt update && sudo apt upgrade -y

# Install Node.js v20 (NodeSource distribution)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 Process Manager globally
sudo npm install pm2 -g

# Install Nginx
sudo apt install nginx -y
```

---

### 2. Code Setup & Build

```bash
# Navigate to web root and clone your repository
cd /var/www
git clone <your-repository-url> backend
cd backend

# Install dependencies and compile TS to production JS
npm install
npm run build
```

---

### 3. Create PM2 Configuration (Cluster Mode Load Balancing)

Create a file named `ecosystem.config.js` at the root of the project `/var/www/backend/ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'enterprise-backend',
      script: './dist/server.js',
      instances: 'max',            // Auto-scale: Runs 1 process per CPU core
      exec_mode: 'cluster',         // Enables cluster mode (PM2 built-in load balancer)
      watch: false,
      max_memory_restart: '1G',    // Auto-recovers if container leaks memory
      autorestart: true,           // Auto-restarts on crash
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        SKIP_DOCKER_CHECK: 'true'
      }
    }
  ]
};
```

* **Launch the cluster**:

  ```bash
  pm2 start ecosystem.config.js
  ```

* **Ensure auto-start on server reboot**:

  ```bash
  pm2 startup
  # Run the command generated by the output of the above command
  pm2 save
  ```

---

### 4. Configure Nginx as a Reverse Proxy

1. Create a server block configuration:

   ```bash
   sudo nano /etc/nginx/sites-available/api.yourdomain.com
   ```

2. Paste the following configuration (routes external requests to PM2 on port `3000`):

   ```nginx
   server {
       listen 80;
       server_name api.yourdomain.com; # Or use server IP if no domain

       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

3. Enable configuration and reload Nginx:

   ```bash
   sudo ln -s /etc/nginx/sites-available/api.yourdomain.com /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

---

### 5. Configure Let's Encrypt SSL/HTTPS (Certbot)

If using a custom domain, secure your traffic with HTTPS:

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d api.yourdomain.com
```

---

### 6. Log Rotation for PM2

To prevent PM2 log files from consuming all server disk space:

```bash
pm2 install pm2-logrotate
```

This automatically rotates, compresses, and deletes old PM2 logs.
