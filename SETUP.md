# Setup Guide - Listy

This guide covers everything you need to get Listy running locally and deployed to your unRAID server behind a Cloudflare Tunnel.

## Table of Contents

1. [Firebase Project Setup](#1-firebase-project-setup)
2. [Local Development Setup](#2-local-development-setup)
3. [Environment Variables](#3-environment-variables)
4. [Firebase Security Rules](#4-firebase-security-rules)
5. [Docker Deployment on unRAID](#5-docker-deployment-on-unraid)
6. [Cloudflare Tunnel Configuration](#6-cloudflare-tunnel-configuration)
7. [Git Workflow](#7-git-workflow)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Firebase Project Setup

### Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" (or "Add project")
3. Enter a project name (e.g., "collaborative-lists-prod")
4. Disable Google Analytics (optional, not needed for this app)
5. Click "Create project"

### Enable Authentication

1. In your Firebase project, go to **Build → Authentication**
2. Click "Get started"
3. Go to the **Sign-in method** tab
4. Enable **Google** provider:
   - Click on "Google"
   - Toggle "Enable"
   - Set a public-facing name for your app
   - Select a support email
   - Click "Save"
5. Enable **Anonymous** authentication:
   - Click on "Anonymous"
   - Toggle "Enable"
   - Click "Save"

### Set Up Firestore Database

1. Go to **Build → Firestore Database**
2. Click "Create database"
3. Choose **Start in production mode** (we'll add rules later)
4. Select a location closest to your users
5. Click "Enable"

### Add Authorized Domains

1. Go to **Build → Authentication → Settings**
2. Click the **Authorized domains** tab
3. Add your domains:
   - `localhost` (for local development)
   - Your Cloudflare Tunnel domain (e.g., `lists.yourdomain.com`)

### Get Firebase Configuration

1. Go to **Project settings** (gear icon near "Project Overview")
2. Scroll down to "Your apps"
3. Click the web icon (`</>`) to add a web app
4. Register your app with a nickname (e.g., "Collaborative Lists Web")
5. Copy the configuration object - you'll need these values:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

---

## 2. Local Development Setup

### Prerequisites

- Node.js 18+ (recommend 20 LTS)
- npm or yarn
- Git

### Installation

```bash
# Clone the repository (or navigate to your project folder)
cd collaborative-lists

# Install dependencies
npm install

# Copy the example environment file
cp .env.local.example .env.local

# Edit .env.local with your Firebase config (see section 3)
```

### Running the Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000` with hot reload enabled.

### Building for Production (Local Test)

```bash
npm run build
npm start
```

---

## 3. Environment Variables

Create a `.env.local` file in the project root with these variables:

```env
# Firebase Configuration
# Get these from Firebase Console → Project Settings → Your Apps
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

# App URL (used for share links)
# Local development:
NEXT_PUBLIC_APP_URL=http://localhost:3000
# Production (your Cloudflare Tunnel domain):
# NEXT_PUBLIC_APP_URL=https://lists.yourdomain.com
```

**Important Notes:**

- All `NEXT_PUBLIC_*` variables are embedded in the client bundle at build time
- Never commit `.env.local` to version control
- For Docker builds, these are passed as build arguments

---

## 4. Firebase Security Rules

### Deploy Security Rules

1. Install Firebase CLI:

```bash
npm install -g firebase-tools
```

2. Login to Firebase:

```bash
firebase login
```

3. Initialize Firebase in your project:

```bash
firebase init firestore
```

Select your project and accept defaults for rules file location.

4. Copy the rules from `firestore.rules` to your Firebase project, or deploy directly:

```bash
firebase deploy --only firestore:rules
```

### Testing Rules

You can test rules in the Firebase Console:

1. Go to **Firestore Database → Rules**
2. Click "Rules Playground"
3. Test various scenarios (create list, claim item, etc.)

---

## 5. Docker Deployment on unRAID

### Option A: Build Locally and Transfer

On your development machine:

```bash
# Build the Docker image with your environment variables
docker build \
  --build-arg NEXT_PUBLIC_FIREBASE_API_KEY="your_api_key" \
  --build-arg NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com" \
  --build-arg NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id" \
  --build-arg NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-project.appspot.com" \
  --build-arg NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="123456789" \
  --build-arg NEXT_PUBLIC_FIREBASE_APP_ID="1:123456789:web:abc123" \
  --build-arg NEXT_PUBLIC_APP_URL="https://lists.yourdomain.com" \
  -t collaborative-lists:latest .

# Save the image to a file
docker save collaborative-lists:latest | gzip > collaborative-lists.tar.gz

# Transfer to unRAID (via scp, SMB, etc.)
scp collaborative-lists.tar.gz root@unraid:/mnt/user/appdata/
```

On unRAID:

```bash
# Load the image
docker load < /mnt/user/appdata/collaborative-lists.tar.gz
```

### Option B: Build on unRAID

Transfer the source code to unRAID and build there:

```bash
cd /mnt/user/appdata/collaborative-lists

docker build \
  --build-arg NEXT_PUBLIC_FIREBASE_API_KEY="your_api_key" \
  --build-arg NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com" \
  --build-arg NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id" \
  --build-arg NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-project.appspot.com" \
  --build-arg NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="123456789" \
  --build-arg NEXT_PUBLIC_FIREBASE_APP_ID="1:123456789:web:abc123" \
  --build-arg NEXT_PUBLIC_APP_URL="https://lists.yourdomain.com" \
  -t collaborative-lists:latest .
```

### Running the Container on unRAID

#### Using Docker CLI

```bash
docker run -d \
  --name collaborative-lists \
  --restart unless-stopped \
  -p 3000:3000 \
  collaborative-lists:latest
```

#### Using unRAID Docker GUI

1. Go to **Docker** tab in unRAID
2. Click **Add Container**
3. Fill in:
   - **Name:** collaborative-lists
   - **Repository:** collaborative-lists:latest
   - **Network Type:** Bridge
   - **Port Mapping:** Container Port: 3000 → Host Port: 3000 (or another available port)
4. Click **Apply**

#### Using Docker Compose

Create `/mnt/user/appdata/collaborative-lists/docker-compose.yml`:

```yaml
version: '3.8'

services:
  collaborative-lists:
    image: collaborative-lists:latest
    container_name: collaborative-lists
    restart: unless-stopped
    ports:
      - "3000:3000"
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/"]
      interval: 30s
      timeout: 3s
      retries: 3
```

Run with:

```bash
docker-compose up -d
```

#### Using the Automated Deployment Script (Recommended)

The easiest way to deploy is using the included `deploy.sh` script:

**Prerequisites:**
1. Configure `.env.docker` with your Firebase credentials
2. Ensure SSH access to unRAID (192.168.1.166)

**Deploy:**
```bash
./deploy.sh
```

This script will:
- Build the Docker image with production settings
- Transfer it to your unRAID server
- Stop the old container and start the new one
- Clean up temporary files

---

## 6. Cloudflare Tunnel Configuration

Since you're already using Cloudflare Tunnels, you just need to add a public hostname for this app.

### Add the Hostname

1. Go to [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/)
2. Navigate to **Networks → Tunnels**
3. Select your existing tunnel
4. Click **Configure**
5. Go to the **Public Hostname** tab
6. Click **Add a public hostname**
7. Configure:
   - **Subdomain:** `listy`
   - **Domain:** `blk-cat.com`
   - **Type:** HTTP
   - **URL:** `192.168.1.166:3000`

### Additional Settings (Optional)

Under the hostname settings, you might want to:

- Enable **HTTP/2**
- Keep **TLS** settings at default (Cloudflare handles SSL)
- Enable **Browser Integrity Check** for added security

### Verify

After saving, your app should be accessible at `https://listy.blk-cat.com`

---

## 7. Git Workflow

### Initial Repository Setup

```bash
# Initialize git repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: Collaborative Lists app"
```

### Create GitHub Repository

1. Go to [GitHub](https://github.com) and create a new repository
2. Don't initialize with README (you already have files)
3. Copy the repository URL

```bash
# Add remote origin
git remote add origin https://github.com/yourusername/collaborative-lists.git

# Push to GitHub
git push -u origin main
```

### Daily Workflow

```bash
# Check status of changes
git status

# Stage changes
git add .

# Or stage specific files
git add src/components/MyComponent.tsx

# Commit with descriptive message
git commit -m "Add feature: Item quantity support"

# Push to GitHub
git push
```

### Branching Strategy (Simple)

For personal projects, a simple workflow:

```bash
# Create a feature branch
git checkout -b feature/add-notifications

# Make changes and commit
git add .
git commit -m "Add push notification support"

# Merge back to main
git checkout main
git merge feature/add-notifications

# Delete the feature branch
git branch -d feature/add-notifications

# Push to GitHub
git push
```

### .gitignore

The project includes a `.gitignore` that excludes:

- `node_modules/`
- `.next/`
- `.env.local` and other env files
- Build outputs

---

## 8. Troubleshooting

### Common Issues

#### "Firebase App not initialized"

- Check that all `NEXT_PUBLIC_FIREBASE_*` environment variables are set
- For Docker, ensure build args were passed during image build

#### Google Sign-In Not Working

- Verify your domain is in Firebase Auth authorized domains
- Check browser console for specific OAuth errors
- Ensure popup blockers aren't interfering

#### Real-time Updates Not Working

- Firestore rules might be blocking reads
- Check browser console for permission errors
- WebSocket connections through Cloudflare should work by default

#### Docker Container Won't Start

- Check logs: `docker logs collaborative-lists`
- Verify port 3000 isn't already in use
- Ensure the image was built with all required build args

#### Cloudflare Tunnel Connection Issues

- Verify the tunnel is running: `cloudflared tunnel info <tunnel-name>`
- Check that the public hostname points to the correct local port
- Review Cloudflare Zero Trust logs for errors

### Getting Help

- Check Firebase documentation: https://firebase.google.com/docs
- Next.js docs: https://nextjs.org/docs
- Cloudflare Tunnel docs: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/

---

## Quick Reference

### Development Commands

```bash
npm run dev      # Start development server with hot reload
npm run build    # Build for production
npm start        # Start production server
npm run lint     # Run ESLint
```

### Docker Commands

```bash
docker build -t collaborative-lists .   # Build image
docker run -p 3000:3000 collaborative-lists   # Run container
docker logs collaborative-lists         # View logs
docker stop collaborative-lists         # Stop container
docker rm collaborative-lists           # Remove container
```

### Firebase CLI Commands

```bash
firebase login                          # Authenticate
firebase projects:list                  # List projects
firebase deploy --only firestore:rules  # Deploy rules
```
