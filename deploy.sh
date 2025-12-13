#!/bin/bash

# Deployment script for Collaborative Lists to unRAID
# Usage: ./deploy.sh

set -e  # Exit on error

UNRAID_IP="192.168.1.166"
UNRAID_USER="root"
UNRAID_PATH="/mnt/user/appdata"
IMAGE_NAME="collaborative-lists"
CONTAINER_NAME="collaborative-lists"
PORT="3000"

echo "=========================================="
echo "Deploying Collaborative Lists to unRAID"
echo "=========================================="

# Check if .env.docker exists
if [ ! -f .env.docker ]; then
    echo "❌ Error: .env.docker file not found!"
    echo "Please copy .env.docker.example to .env.docker and configure it."
    exit 1
fi

# Check if Firebase credentials are configured
if grep -q "your-api-key-here" .env.docker; then
    echo "⚠️  Warning: .env.docker contains placeholder values!"
    echo "Please configure your Firebase credentials in .env.docker"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
echo "📦 Building Docker image..."
docker-compose build

echo ""
echo "💾 Saving image to file..."
docker save ${IMAGE_NAME}:latest | gzip > ${IMAGE_NAME}.tar.gz

echo ""
echo "📤 Transferring to unRAID (${UNRAID_IP})..."
scp ${IMAGE_NAME}.tar.gz ${UNRAID_USER}@${UNRAID_IP}:${UNRAID_PATH}/

echo ""
echo "🚀 Deploying on unRAID..."
ssh ${UNRAID_USER}@${UNRAID_IP} << EOF
    echo "Stopping existing container..."
    docker stop ${CONTAINER_NAME} 2>/dev/null || true
    docker rm ${CONTAINER_NAME} 2>/dev/null || true

    echo "Loading new image..."
    docker load < ${UNRAID_PATH}/${IMAGE_NAME}.tar.gz

    echo "Starting new container..."
    docker run -d \
      --name ${CONTAINER_NAME} \
      --restart unless-stopped \
      -p ${PORT}:${PORT} \
      ${IMAGE_NAME}:latest

    echo ""
    echo "Container status:"
    docker ps | grep ${CONTAINER_NAME}

    echo ""
    echo "Cleaning up image file..."
    rm ${UNRAID_PATH}/${IMAGE_NAME}.tar.gz
EOF

echo ""
echo "🧹 Cleaning up local image file..."
rm ${IMAGE_NAME}.tar.gz

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Configure Cloudflare Tunnel to point listy.blk-cat.com → localhost:${PORT}"
echo "2. Add listy.blk-cat.com to Firebase authorized domains"
echo "3. Visit https://listy.blk-cat.com to test"
echo ""
echo "To view logs: ssh ${UNRAID_USER}@${UNRAID_IP} 'docker logs -f ${CONTAINER_NAME}'"
