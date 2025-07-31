# Kutubooks Deployment Guide

## Three-Lab Container Setup Deployment

This guide covers deploying Kutubooks on the three-lab container setup with Web01, Web02, and Lb01.

### Prerequisites
- Docker installed on all three machines
- Docker Hub account
- Access to Web01, Web02, and Lb01 machines

### Step 1: Build and Push to Docker Hub

1. **Login to Docker Hub:**
   ```bash
   docker login
   ```

2. **Build and push the image:**
   ```bash
   cd kutubooks-backend
   docker build -t yourusername/kutubooks:latest .
   docker push yourusername/kutubooks:latest
   ```

### Step 2: Deploy on Web01 and Web02

Run these commands on both Web01 and Web02:

```bash
# Pull the image
docker pull yourusername/kutubooks:latest

# Stop any existing container
docker stop kutubooks 2>/dev/null || true
docker rm kutubooks 2>/dev/null || true

# Run the container
docker run -d \
  --name kutubooks \
  -p 8080:8080 \
  -e JWT_SECRET=kutubooks_jwt_secret_2025 \
  -e JWT_EXPIRES_IN=24h \
  --restart unless-stopped \
  yourusername/kutubooks:latest
```

### Step 3: Configure Load Balancer (Lb01)

1. **Install Nginx (if not already installed):**
   ```bash
   sudo apt update
   sudo apt install nginx -y
   ```

2. **Copy the nginx.conf to Lb01:**
   ```bash
   sudo cp nginx.conf /etc/nginx/sites-available/kutubooks
   sudo ln -s /etc/nginx/sites-available/kutubooks /etc/nginx/sites-enabled/
   sudo rm /etc/nginx/sites-enabled/default
   ```

3. **Test and restart Nginx:**
   ```bash
   sudo nginx -t
   sudo systemctl restart nginx
   sudo systemctl enable nginx
   ```

### Step 4: Verify Deployment

1. **Check individual instances:**
   - Web01: `http://web01:8080`
   - Web02: `http://web02:8080`

2. **Check load balancer:**
   - Load Balancer: `http://lb01`

3. **Test load balancing:**
   ```bash
   # Multiple requests should distribute between web01 and web02
   curl -I http://lb01
   ```

### Troubleshooting

1. **Check container logs:**
   ```bash
   docker logs kutubooks
   ```

2. **Check Nginx logs:**
   ```bash
   sudo tail -f /var/log/nginx/error.log
   sudo tail -f /var/log/nginx/access.log
   ```

3. **Verify container is running:**
   ```bash
   docker ps
   ```

### Environment Variables

- `PORT`: Application port (default: 8080)
- `JWT_SECRET`: Secret key for JWT tokens
- `JWT_EXPIRES_IN`: Token expiration time (default: 24h)

### Health Check

The application includes a health check endpoint at `/health` that returns "healthy" status.

### Database

The application uses SQLite database which is created automatically on first run. Data persists within the container.