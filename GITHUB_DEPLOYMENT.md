# GitHub Actions Deployment Guide

## Overview

This guide explains how to set up automated deployment to Hostinger VPS using GitHub Actions.

## Features

- ✅ Auto-deploy on push to `main` branch
- ✅ Manual trigger from GitHub UI
- ✅ All environment variables configured as secrets
- ✅ Docker Compose deployment with all 11 services

## Setup Instructions

### 1. Configure GitHub Secrets

Go to your GitHub repository:
**Settings → Secrets and variables → Actions → New repository secret**

Add the following **Secrets** (these are sensitive and encrypted):

| Secret Name | Value | Where to Get It |
|-------------|-------|-----------------|
| `HOSTINGER_API_KEY` | Your Hostinger API key | Hostinger dashboard |
| `DB_DATABASE` | `advatens` | Your database name |
| `DB_USERNAME` | `root` | Your database username |
| `DB_PASSWORD` | `your-strong-password` | **Change from default!** |
| `INFLUXDB_TOKEN` | Generate new token | InfluxDB UI or use default |
| `INFLUXDB_ADMIN_PASSWORD` | `your-strong-password` | **Change from default!** |
| `CLERK_SECRET_KEY` | `sk_live_...` | https://dashboard.clerk.com (PRODUCTION keys!) |
| `VITE_CLERK_PUBLISHABLE_KEY` | `pk_live_...` | https://dashboard.clerk.com (PRODUCTION keys!) |
| `CHIRPSTACK_API_TOKEN` | Generate from ChirpStack | ChirpStack UI → API Keys |
| `CHIRPSTACK_APPLICATION_ID` | UUID from ChirpStack | ChirpStack UI → Applications |
| `CHIRPSTACK_DEVICE_PROFILE_ID` | UUID from ChirpStack | ChirpStack UI → Device Profiles |
| `GRAFANA_ADMIN_PASSWORD` | `your-strong-password` | **Change from default!** |

### 2. Configure GitHub Variables

Go to your GitHub repository:
**Settings → Secrets and variables → Actions → Variables tab → New repository variable**

Add the following **Variables** (these are non-sensitive):

| Variable Name | Value | Description |
|---------------|-------|-------------|
| `HOSTINGER_VM_ID` | Your VM ID | From Hostinger dashboard |
| `VITE_API_BASE_URL` | `https://api.yourdomain.com` | Your production API URL |

## Important: Production vs Development Values

### Development (.env file)
```bash
DB_PASSWORD=password1234
CLERK_SECRET_KEY=sk_test_...
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_API_BASE_URL=http://localhost:8888
```

### Production (GitHub Secrets)
```bash
DB_PASSWORD=<strong-random-password>
CLERK_SECRET_KEY=sk_live_...
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
VITE_API_BASE_URL=https://api.yourdomain.com
```

**⚠️ NEVER use test/development credentials in production!**

## How to Deploy

### Automatic Deployment

Simply push to the `main` branch:

```bash
git add .
git commit -m "Your commit message"
git push origin main
```

The deployment will start automatically.

### Manual Deployment

1. Go to your GitHub repository
2. Click **Actions** tab
3. Click **Deploy to Hostinger** workflow
4. Click **Run workflow** button (top right)
5. Select branch: `main`
6. Click **Run workflow**

## Workflow File Location

`.github/workflows/deploy.yml`

## Environment Variables Flow

```
GitHub Secrets/Variables
         ↓
  GitHub Actions Runner
         ↓
    Hostinger VPS
         ↓
   docker-compose.yml
         ↓
  Container Environment
```

## Security Best Practices

### ✅ DO:
- Use GitHub Secrets for ALL sensitive data
- Use strong, unique passwords for production
- Use Clerk LIVE keys (not test keys)
- Generate new tokens for production
- Rotate secrets regularly
- Use GitHub Variables for non-sensitive config

### ❌ DON'T:
- Commit `.env` file to Git (already in `.gitignore`)
- Use development credentials in production
- Share secrets via email or chat
- Hardcode secrets in workflow files
- Reuse passwords across services

## Monitoring Deployments

### View Deployment Status

1. Go to **Actions** tab in GitHub
2. Click on the latest workflow run
3. See real-time logs

### Common Issues

#### Issue: Deployment fails with "secret not found"

**Solution**: Check that all required secrets are set in GitHub Settings → Secrets

#### Issue: Services fail to start on Hostinger

**Solution**:
1. SSH into your Hostinger VPS
2. Check logs: `docker-compose logs`
3. Verify environment variables: `docker-compose config`

#### Issue: Frontend can't connect to API

**Solution**: Check that `VITE_API_BASE_URL` variable points to your production domain (with https://)

## Hostinger VPS Setup

Before deploying, ensure your Hostinger VPS has:

### 1. Docker Installed

```bash
# SSH into your VPS
ssh user@your-vps-ip

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. Firewall Rules

Open required ports:

```bash
# ChirpStack UI
sudo ufw allow 8080/tcp

# Frontend
sudo ufw allow 3000/tcp

# Grafana
sudo ufw allow 3001/tcp

# LoRaWAN Gateway (UDP)
sudo ufw allow 1700/udp

# MQTT
sudo ufw allow 1883/tcp

# Enable firewall
sudo ufw enable
```

### 3. Domain Setup (Optional)

If using a custom domain:

1. Point your domain's A record to your VPS IP
2. Set up nginx reverse proxy or Caddy for SSL
3. Update `VITE_API_BASE_URL` to your domain

Example nginx config:
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:8888;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Testing After Deployment

### 1. Check Services

```bash
# SSH to VPS
ssh user@your-vps-ip

# Check running containers
docker-compose ps

# Should show all 11 services as "Up"
```

### 2. Test API

```bash
curl http://your-vps-ip:8888/orchards
# or
curl https://api.yourdomain.com/orchards
```

### 3. Test Frontend

Open browser: `http://your-vps-ip:3000` or `https://yourdomain.com`

### 4. Test ChirpStack

Open browser: `http://your-vps-ip:8080`

## Rollback Strategy

If a deployment fails:

### Option 1: Revert Git Commit

```bash
git revert HEAD
git push origin main
```

This triggers a new deployment with the previous code.

### Option 2: Manual Rollback on VPS

```bash
# SSH to VPS
ssh user@your-vps-ip

# Go to project directory
cd /path/to/advatens

# Checkout previous commit
git checkout HEAD~1

# Rebuild and restart
docker-compose down
docker-compose up -d --build
```

## Environment Variables Reference

### Required Secrets (12)

1. `HOSTINGER_API_KEY` - Hostinger authentication
2. `DB_DATABASE` - PostgreSQL database name
3. `DB_USERNAME` - PostgreSQL username
4. `DB_PASSWORD` - PostgreSQL password
5. `INFLUXDB_TOKEN` - InfluxDB API token
6. `INFLUXDB_ADMIN_PASSWORD` - InfluxDB admin password
7. `CLERK_SECRET_KEY` - Clerk server-side key
8. `VITE_CLERK_PUBLISHABLE_KEY` - Clerk client-side key
9. `CHIRPSTACK_API_TOKEN` - ChirpStack API token
10. `CHIRPSTACK_APPLICATION_ID` - ChirpStack application UUID
11. `CHIRPSTACK_DEVICE_PROFILE_ID` - ChirpStack device profile UUID
12. `GRAFANA_ADMIN_PASSWORD` - Grafana admin password

### Required Variables (2)

1. `HOSTINGER_VM_ID` - Your Hostinger virtual machine ID
2. `VITE_API_BASE_URL` - Production API URL

## Workflow Triggers

The workflow runs on:

1. **Push to `main`**: Automatic deployment
   ```bash
   git push origin main
   ```

2. **Manual trigger**: From GitHub UI
   - Go to Actions → Deploy to Hostinger → Run workflow

## Troubleshooting

### Check Workflow Logs

1. GitHub → Actions → Latest workflow run
2. Expand each step to see detailed logs
3. Look for error messages

### Check Container Logs on VPS

```bash
# All services
docker-compose logs

# Specific service
docker-compose logs server
docker-compose logs chirpstack
docker-compose logs frontend
```

### Verify Environment Variables

```bash
# On VPS
docker-compose config | grep -A 50 "environment:"
```

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "secret not found" | Missing GitHub secret | Add secret in Settings |
| "connection refused" | Service not ready | Check `depends_on` in docker-compose |
| "unauthorized" | Wrong Clerk keys | Use production keys (pk_live/sk_live) |
| "database error" | Wrong DB credentials | Check DB_* secrets |

## Next Steps After Setup

1. ✅ Add all secrets to GitHub
2. ✅ Add variables to GitHub
3. ✅ Push to `main` branch
4. ✅ Monitor deployment in Actions tab
5. ✅ Test all services on VPS
6. ✅ Set up SSL with Let's Encrypt (optional)
7. ✅ Configure domain (optional)
8. ✅ Set up monitoring (Grafana dashboards)

## Support

If you encounter issues:

1. Check GitHub Actions logs
2. Check VPS container logs
3. Verify all secrets are set
4. Ensure VPS has Docker installed
5. Check firewall rules

---

**Status**: Ready to deploy! 🚀

Once all secrets and variables are configured, your deployment pipeline is fully automated.
