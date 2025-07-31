# Kutubooks - African Cultural Storytelling Platform

A web application for preserving and sharing African cultural stories, proverbs, and folktales with translation capabilities.
this is the link to youtube video explaining how application works anf how it is functioning and also its purpose.
https://youtu.be/EglitUXcrEA

## Features

- **Story Management**: Create, read, update, delete stories
- **User Authentication**: JWT-based login/registration system
- **Translation**: Translate stories using MyMemory API
- **Social Features**: Like and comment on stories
- **File Upload**: Support for .txt and .pdf files
- **Search**: Find stories by keywords
- **Responsive Design**: Mobile-friendly interface

## APIs Used

- **MyMemory Translation API**: https://mymemory.translated.net/
  - Used for translating stories between languages (English, Kinyarwanda, French)
  - No API key required
  - Rate limit: 1000 requests/day

## Local Development

### Prerequisites
- Node.js 18+
- npm

### Installation
```bash
cd kutubooks-backend
npm install
node index.js
```

Access at: http://localhost:3000

## Docker Deployment
### Quick Deployment Scripts
**Windows:**
```cmd
deploy.bat michelleanyika
```

### Manual Three-Lab Setup Deployment

#### 1. Build and Push to Docker Hub
```bash
cd kutubooks-backend
docker build -t michelleanyika/kutubooks:latest .
docker login
docker push michelleanyika/kutubooks:latest
```

#### 2. Deploy on Web01 and Web02
```bash
# Pull and run on both servers
docker pull michelleanyika/kutubooks:latest
docker stop kutubooks 2>/dev/null || true
docker rm kutubooks 2>/dev/null || true
docker run -d --name kutubooks -p 8080:8080 
```

#### 3. Configure Nginx Load Balancer (Lb01)
```bash
# Install nginx
sudo apt update && sudo apt install nginx -y

# Copy configuration
sudo cp nginx.conf /etc/nginx/sites-available/kutubooks
sudo ln -s /etc/nginx/sites-available/kutubooks /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Test and restart
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

#### 4. Access Points
- **Load Balancer:** http://lb01
- **Web01 Direct:** http://web01:8080
- **Web02 Direct:** http://web02:8080

### Testing Load Balancer
```bash
# Test multiple requests to see distribution
for i in {1..10}; do curl -s http://lb01 | grep -o "Server.*"; done
```

## Security Features

- JWT authentication for protected routes but restricted to some parts.
- User ownership verification for CRUD operations
- Input validation and sanitization
- Environment variables for sensitive data

## Technology Stack

- **Backend**: Node.js, Express.js, SQLite
- **Frontend**: HTML5, CSS3, JavaScript
- **Authentication**: JWT
- **Translation**: MyMemory API
- **File Processing**: PDF.js for PDF text extraction

## Credits

- MyMemory Translation API by Translated
- PDF.js by Mozilla
- SQLite Database Engine
