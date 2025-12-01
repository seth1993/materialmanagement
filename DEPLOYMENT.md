# Deployment Guide

This document provides comprehensive instructions for deploying the Material Management System to various environments.

## Table of Contents

1. [Environment Configuration](#environment-configuration)
2. [GitHub Actions CI/CD](#github-actions-cicd)
3. [Firebase Hosting](#firebase-hosting)
4. [Docker Deployment](#docker-deployment)
5. [Alternative Platforms](#alternative-platforms)
6. [Security Considerations](#security-considerations)
7. [Monitoring and Maintenance](#monitoring-and-maintenance)

## Environment Configuration

### Required Environment Variables

All deployment methods require the following Firebase configuration variables:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### Setting Up Environment Variables

#### Local Development
1. Copy the example file: `cp .env.local.example .env.local`
2. Edit `.env.local` with your Firebase configuration
3. Never commit `.env.local` to version control

#### GitHub Actions
Add the following secrets in your GitHub repository settings (`Settings > Secrets and variables > Actions`):

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `FIREBASE_SERVICE_ACCOUNT` (JSON service account key)
- `FIREBASE_TOKEN` (Firebase CLI token)
- `FIREBASE_PROJECT_ID` (Your Firebase project ID)

## GitHub Actions CI/CD

### Automated Workflows

The project includes three GitHub Actions workflows:

#### 1. CI Pipeline (`.github/workflows/ci.yml`)
- **Triggers**: Push/PR to `main` or `develop` branches
- **Actions**:
  - Runs on Node.js 18.x and 20.x
  - Installs dependencies
  - Runs linting and type checking
  - Builds the application
  - Performs security audit

#### 2. Deployment Pipeline (`.github/workflows/deploy.yml`)
- **Triggers**: 
  - Automatic: Push to `main` branch
  - Manual: Workflow dispatch with environment selection
- **Actions**:
  - Builds the application
  - Deploys to Firebase Hosting
  - Deploys Firestore rules

#### 3. Security Checks (`.github/workflows/security.yml`)
- **Triggers**: 
  - Push/PR to `main` or `develop` branches
  - Daily scheduled run at 2 AM UTC
- **Actions**:
  - Runs npm audit
  - Performs CodeQL analysis
  - Runs Trivy vulnerability scanner

### Manual Deployment

To manually trigger a deployment:

1. Go to your repository on GitHub
2. Click on "Actions" tab
3. Select "Deploy to Firebase" workflow
4. Click "Run workflow"
5. Select the environment (production/staging)
6. Click "Run workflow"

## Firebase Hosting

### Automatic Deployment

Pushes to the `main` branch automatically deploy to production.

### Manual Deployment

#### Prerequisites
```bash
npm install -g firebase-tools
firebase login
```

#### Deploy to Production
```bash
npm run firebase:deploy
```

#### Deploy to Staging
```bash
npm run firebase:deploy:staging
```

### Firebase Configuration

Ensure your `firebase.json` is properly configured:

```json
{
  "hosting": {
    "public": "out",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  },
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  }
}
```

## Docker Deployment

### Production Deployment

#### Build and Run
```bash
# Build the image
docker build -t materialmanagement .

# Run the container
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key \
  -e NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain \
  -e NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id \
  -e NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket \
  -e NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id \
  -e NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id \
  materialmanagement
```

#### Using Docker Compose
```bash
# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your configuration

# Start production container
docker-compose up app
```

### Development with Docker

```bash
# Start development container
docker-compose up app-dev

# Access at http://localhost:3001
```

### Container Registry Deployment

#### Push to Docker Hub
```bash
docker tag materialmanagement your-username/materialmanagement:latest
docker push your-username/materialmanagement:latest
```

#### Deploy to Cloud Platforms
- **Google Cloud Run**: Use the built Docker image
- **AWS ECS**: Deploy using the Docker image
- **Azure Container Instances**: Use the Docker image

## Alternative Platforms

### Vercel

1. **Connect Repository**:
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository

2. **Configure Environment Variables**:
   - Add all Firebase environment variables in Vercel dashboard
   - Go to Project Settings > Environment Variables

3. **Deploy**:
   - Automatic deployment on every push to main
   - Manual deployment via Vercel dashboard

### Netlify

1. **Connect Repository**:
   - Go to [Netlify Dashboard](https://app.netlify.com/)
   - Click "New site from Git"
   - Connect your GitHub repository

2. **Build Settings**:
   - Build command: `npm run build`
   - Publish directory: `out`

3. **Environment Variables**:
   - Go to Site Settings > Environment Variables
   - Add all Firebase configuration variables

### AWS Amplify

1. **Connect Repository**:
   - Go to AWS Amplify Console
   - Click "New app" > "Host web app"
   - Connect your GitHub repository

2. **Build Settings**:
   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - npm ci
       build:
         commands:
           - npm run build
     artifacts:
       baseDirectory: out
       files:
         - '**/*'
   ```

3. **Environment Variables**:
   - Add Firebase configuration in Amplify console

## Security Considerations

### Environment Variables
- Never commit sensitive environment variables to version control
- Use platform-specific secret management systems
- Rotate Firebase API keys regularly

### Firebase Security Rules
Ensure proper Firestore security rules are in place:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /materials/{document} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
  }
}
```

### HTTPS and Security Headers
- Always use HTTPS in production
- Configure security headers in your hosting platform
- Enable Firebase App Check for additional security

## Monitoring and Maintenance

### Health Checks
- Monitor application uptime
- Set up alerts for deployment failures
- Monitor Firebase usage and quotas

### Performance Monitoring
- Use Firebase Performance Monitoring
- Monitor Core Web Vitals
- Set up error tracking with Firebase Crashlytics

### Regular Maintenance
- Keep dependencies updated
- Monitor security vulnerabilities
- Review and update Firebase security rules
- Backup Firestore data regularly

### Troubleshooting

#### Common Issues

1. **Build Failures**:
   - Check environment variables are set correctly
   - Verify Node.js version compatibility
   - Check for TypeScript errors

2. **Deployment Failures**:
   - Verify Firebase project configuration
   - Check service account permissions
   - Ensure Firebase CLI is authenticated

3. **Runtime Errors**:
   - Check Firebase configuration
   - Verify Firestore security rules
   - Monitor browser console for errors

#### Getting Help

- Check GitHub Actions logs for CI/CD issues
- Review Firebase console for hosting and database issues
- Use browser developer tools for client-side debugging
- Check platform-specific documentation for deployment issues
