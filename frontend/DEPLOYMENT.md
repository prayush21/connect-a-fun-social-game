# Vercel Deployment Guide for Connect Word Game

This guide provides step-by-step instructions for deploying your Next.js Connect Word Game to Vercel with Firebase integration.

## Prerequisites

1. **Firebase Project Setup**
   - Firebase project created and configured
   - Firestore Database enabled
   - Firebase Authentication enabled (for anonymous users)
   - Firebase Analytics enabled (optional)

2. **Development Tools**
   - Node.js 18+ installed
   - pnpm package manager
   - Git repository
   - Vercel account

## 🔧 Pre-Deployment Setup

### 1. Environment Variables Setup

#### Local Development (.env.local)
Create `.env.local` in the frontend directory:

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Firebase Admin SDK (Get from Firebase Console > Project Settings > Service Accounts)
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com

# Environment
NODE_ENV=development
NEXT_PUBLIC_APP_ENV=development
```

#### Firebase Admin Service Account Setup
1. Go to Firebase Console > Project Settings > Service Accounts
2. Click "Generate new private key"
3. Download the JSON file
4. Extract `private_key` and `client_email` for environment variables

### 2. Test Local Build

```bash
cd frontend
pnpm install
pnpm build
pnpm start
```

Verify the application works correctly locally before deploying.

## 🚀 Vercel Deployment

### Method 1: Vercel CLI (Recommended)

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy from Frontend Directory**
   ```bash
   cd frontend
   vercel
   ```

4. **Configure Environment Variables**
   ```bash
   # Add each environment variable
   vercel env add NEXT_PUBLIC_FIREBASE_API_KEY production
   vercel env add NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN production
   vercel env add NEXT_PUBLIC_FIREBASE_PROJECT_ID production
   vercel env add NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET production
   vercel env add NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID production
   vercel env add NEXT_PUBLIC_FIREBASE_APP_ID production
   vercel env add NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID production
   vercel env add FIREBASE_PRIVATE_KEY production
   vercel env add FIREBASE_CLIENT_EMAIL production
   vercel env add NODE_ENV production
   vercel env add NEXT_PUBLIC_APP_ENV production
   ```

5. **Deploy with Environment Variables**
   ```bash
   vercel --prod
   ```

### Method 2: Git Integration

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Setup Vercel deployment configuration"
   git push origin main
   ```

2. **Connect Repository to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Set root directory to `frontend`
   - Configure build settings (auto-detected)

3. **Configure Environment Variables in Vercel Dashboard**
   - Go to Project Settings > Environment Variables
   - Add all environment variables from your `.env.local`
   - Make sure to set them for "Production" environment

## 🔒 Environment Variables Configuration

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Web API Key | `AIzaSyD...` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain | `project.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase Project ID | `my-project-id` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase Storage Bucket | `project.appspot.com` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase Messaging Sender ID | `123456789` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase App ID | `1:123:web:abc` |
| `FIREBASE_PRIVATE_KEY` | Firebase Admin Private Key | `-----BEGIN PRIVATE KEY-----...` |
| `FIREBASE_CLIENT_EMAIL` | Firebase Admin Client Email | `firebase-adminsdk-...@project.iam.gserviceaccount.com` |

### Optional Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | Google Analytics Measurement ID |
| `NEXT_PUBLIC_VERCEL_ANALYTICS_ID` | Vercel Analytics ID |
| `SENTRY_DSN` | Sentry Error Tracking DSN |

## 🛡️ Firebase Security Rules

Update your Firestore security rules for production:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Game rooms
    match /game_rooms/{roomId} {
      allow read, write: if request.auth != null;
      allow create: if request.auth != null && 
        resource == null &&
        request.resource.data.keys().hasAll(['createdAt', 'updatedAt']);
    }
    
    // Player data
    match /players/{playerId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == playerId;
    }
  }
}
```

## 📊 Performance Monitoring

### 1. Enable Vercel Analytics
```bash
# Install Vercel Analytics
pnpm add @vercel/analytics

# Add to your app layout
import { Analytics } from '@vercel/analytics/react'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
```

### 2. Firebase Performance Monitoring
Firebase Performance is automatically enabled with the current configuration.

## 🔍 Post-Deployment Verification

### 1. Functional Testing
- [ ] Homepage loads correctly
- [ ] Firebase authentication works
- [ ] Game room creation/joining works
- [ ] Real-time game functionality works
- [ ] Audio plays correctly
- [ ] Responsive design works on mobile

### 2. Performance Testing
- [ ] Lighthouse score > 90
- [ ] Core Web Vitals pass
- [ ] Firebase connection stable
- [ ] No console errors

### 3. Security Testing
- [ ] Environment variables not exposed
- [ ] Firebase rules properly configured
- [ ] HTTPS working correctly
- [ ] Security headers present

## 🐛 Troubleshooting

### Common Issues

1. **Firebase Connection Error**
   - Verify all environment variables are set correctly
   - Check Firebase project settings
   - Ensure Firestore is enabled

2. **Build Failures**
   - Check TypeScript errors: `pnpm typecheck`
   - Verify dependencies: `pnpm install`
   - Check Next.js configuration

3. **Environment Variable Issues**
   - Ensure `NEXT_PUBLIC_` prefix for client-side variables
   - Verify no quotes in Vercel dashboard values
   - Check for escaped characters in private key

4. **Performance Issues**
   - Enable Next.js caching
   - Optimize Firebase queries
   - Use CDN for static assets

### Debug Commands

```bash
# Local debugging
pnpm dev
pnpm build
pnpm typecheck
pnpm lint

# Vercel debugging
vercel logs
vercel env ls
vercel --debug
```

## 🔄 CI/CD Setup

### GitHub Actions (Optional)
Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Vercel
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
        working-directory: ./frontend
      
      - name: Build application
        run: pnpm build
        working-directory: ./frontend
        env:
          NEXT_PUBLIC_FIREBASE_API_KEY: ${{ secrets.NEXT_PUBLIC_FIREBASE_API_KEY }}
          # ... other env vars
      
      - name: Deploy to Vercel
        run: vercel --prod --token ${{ secrets.VERCEL_TOKEN }}
        working-directory: ./frontend
```

## 📝 Maintenance

### Regular Tasks
- Monitor Firebase usage and costs
- Update dependencies monthly
- Review Vercel analytics
- Check security alerts
- Update Firebase security rules as needed

### Scaling Considerations
- Monitor concurrent users
- Optimize database queries
- Consider Firebase Functions for heavy operations
- Implement caching strategies

## 🔗 Useful Links

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Project Repository](your-repo-url)

---

## Quick Commands Reference

```bash
# Development
pnpm dev                    # Start development server
pnpm build                  # Build for production
pnpm start                  # Start production server

# Deployment
vercel                      # Deploy to preview
vercel --prod              # Deploy to production
vercel env add VAR_NAME    # Add environment variable
vercel logs                # View deployment logs

# Maintenance
pnpm update                # Update dependencies
pnpm audit                 # Security audit
vercel domains             # Manage custom domains
```