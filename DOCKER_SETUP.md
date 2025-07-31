# Docker Installation and Setup

## Windows

### Download Docker Desktop
1. Go to https://www.docker.com/products/docker-desktop/
2. Click "Download for Windows"
3. Run the installer
4. Restart computer when prompted

### Verify Installation
```cmd
docker --version
docker run hello-world
```

## Ubuntu/Linux

### Install Docker
```bash
sudo apt update
sudo apt install docker.io -y
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
```

### Log out and back in, then verify
```bash
docker --version
docker run hello-world
```

## Docker Hub Account

1. Go to https://hub.docker.com/
2. Sign up for free account
3. Login from terminal:
```bash
docker login
```

## Deploy Kutubooks

### Build and Push
```bash
cd kutubooks-backend
docker build -t yourusername/kutubooks:latest .
docker push yourusername/kutubooks:latest
```

### Run on Web01/Web02
```bash
docker pull yourusername/kutubooks:latest
docker run -d --name kutubooks -p 8080:8080 \
  -e JWT_SECRET=kutubooks_secret_2025 \
  yourusername/kutubooks:latest
```