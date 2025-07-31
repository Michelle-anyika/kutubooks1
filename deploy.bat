@echo off
echo === Kutubooks Docker Deployment ===
echo.

if "%1"=="" (
    echo Usage: deploy.bat [your-dockerhub-username]
    echo Example: deploy.bat johndoe
    exit /b 1
)

set DOCKERHUB_USERNAME=%1
set IMAGE_NAME=kutubooks
set TAG=latest

echo Docker Hub Username: %DOCKERHUB_USERNAME%
echo Image: %DOCKERHUB_USERNAME%/%IMAGE_NAME%:%TAG%
echo.

echo Building Docker image...
cd kutubooks-backend
docker build -t %DOCKERHUB_USERNAME%/%IMAGE_NAME%:%TAG% .

if %ERRORLEVEL% neq 0 (
    echo Build failed!
    exit /b 1
)

echo.
echo Pushing to Docker Hub...
docker push %DOCKERHUB_USERNAME%/%IMAGE_NAME%:%TAG%

if %ERRORLEVEL% neq 0 (
    echo Push failed! Make sure you're logged in: docker login
    exit /b 1
)

echo.
echo === Deployment Commands for Lab Setup ===
echo.
echo 1. On Web01 and Web02, run:
echo    docker pull %DOCKERHUB_USERNAME%/%IMAGE_NAME%:%TAG%
echo    docker run -d --name kutubooks -p 8080:8080 ^
echo      -e JWT_SECRET=kutubooks_jwt_secret_2025 ^
echo      -e JWT_EXPIRES_IN=24h ^
echo      %DOCKERHUB_USERNAME%/%IMAGE_NAME%:%TAG%
echo.
echo 2. On Lb01, configure Nginx with the provided nginx.conf
echo    and restart nginx service
echo.
echo === Access URLs ===
echo Load Balancer: http://lb01
echo Web01 Direct: http://web01:8080
echo Web02 Direct: http://web02:8080
echo.
echo Deployment completed successfully!