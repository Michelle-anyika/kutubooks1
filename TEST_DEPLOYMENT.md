# Test Deployment Guide

## Issues Found & Fixed

### 1. Port Mismatch
- **Problem**: Frontend hardcoded `localhost:3000`, Docker uses port 8080
- **Fix**: Updated all frontend files to use relative URLs

### 2. Database Sync
- **Problem**: Each container has separate SQLite database
- **Solution**: Use shared volume or external database

## Testing Steps

### Test Individual Containers
```bash
# Web01
curl http://web01:8080/health
curl http://web01:8080/stories

# Web02  
curl http://web02:8080/health
curl http://web02:8080/stories
```

### Test Load Balancer
```bash
# Multiple requests should distribute
for i in {1..10}; do
  curl -s http://lb01/health
done
```

### Test Full Application
1. **Register**: POST to `/register`
2. **Login**: POST to `/login` 
3. **Create Story**: POST to `/stories`
4. **View Stories**: GET `/stories`

## Common Issues

### Container Won't Start
```bash
docker logs kutubooks
```

### Database Issues
```bash
# Check if DB file exists
docker exec kutubooks ls -la kutubooks.db
```

### Load Balancer Issues
```bash
# Check nginx status
sudo systemctl status nginx
sudo nginx -t
```

## Quick Fix Commands

### Restart Container
```bash
docker restart kutubooks
```

### Update Image
```bash
docker pull yourusername/kutubooks:latest
docker stop kutubooks && docker rm kutubooks
docker run -d --name kutubooks -p 8080:8080 yourusername/kutubooks:latest
```