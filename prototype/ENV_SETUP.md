# Environment Variable Setup Guide

## Overview

This project now uses environment variables to securely manage Firebase configuration. This approach:

- ✅ Keeps sensitive data out of version control
- ✅ Works seamlessly in local development and production
- ✅ Follows security best practices
- ✅ Supports multiple environments (dev, staging, prod)

## Quick Setup

### 1. Copy the Example Environment File

```bash
cp .env.example .env
```

### 2. Get Your Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project (or create a new one)
3. Go to **Project Settings** → **General** tab
4. Scroll down to **Your apps** section
5. Click on your web app (or add one if needed)
6. Copy the `firebaseConfig` values

### 3. Fill in Your .env File

Edit the `.env` file with your actual Firebase values:

```env
FIREBASE_API_KEY=AIzaSyD...
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:web:abc123def456
FIREBASE_MEASUREMENT_ID=G-ABC123DEF4
```

### 4. Install Dependencies and Build

```bash
npm install
npm run build
```

## Available Scripts

| Command                | Description                                         |
| ---------------------- | --------------------------------------------------- |
| `npm run build`        | Generate Firebase config from environment variables |
| `npm run dev`          | Build config and start local development server     |
| `npm run validate-env` | Check if all required environment variables are set |
| `npm run deploy`       | Build and deploy to Firebase Hosting                |
| `npm run serve`        | Serve the app locally (requires prior build)        |

## Development Workflow

### Local Development

```bash
# One-time setup
cp .env.example .env
# Edit .env with your Firebase credentials
npm install

# Daily development
npm run dev  # Builds config and starts local server
```

### Deployment

```bash
npm run deploy  # Builds and deploys automatically
# OR use the existing deploy script
./deploy.sh
```

## Production Setup

### Environment Variables in Hosting Platforms

#### Firebase Hosting

Environment variables are automatically loaded from your `.env` file during build.

#### Vercel

Set environment variables in your Vercel dashboard:

```
FIREBASE_API_KEY=your_value
FIREBASE_AUTH_DOMAIN=your_value
# ... etc
```

#### Netlify

Set environment variables in your Netlify dashboard under Site Settings → Environment Variables.

#### GitHub Actions

Add secrets to your repository settings:

```yaml
# .github/workflows/deploy.yml
env:
  FIREBASE_API_KEY: ${{ secrets.FIREBASE_API_KEY }}
  FIREBASE_AUTH_DOMAIN: ${{ secrets.FIREBASE_AUTH_DOMAIN }}
  # ... etc
```

## Security Best Practices

### ✅ Do:

- Keep your `.env` file local and never commit it
- Use different Firebase projects for dev/staging/prod
- Set `NODE_ENV` appropriately for each environment
- Regularly rotate your API keys

### ❌ Don't:

- Commit `.env` files to version control
- Share environment files via email or chat
- Use production credentials in development
- Hard-code sensitive values anywhere

## Troubleshooting

### "Missing required environment variables"

- Check that your `.env` file exists and has all required values
- Ensure there are no typos in variable names
- Run `npm run validate-env` to check

### "Firebase configuration is not set"

- Make sure you ran `npm run build` before serving
- Check that `public/config.js` was generated
- Verify your Firebase project settings

### "Connection to game lost"

- Verify your Firebase project ID is correct
- Check that Firestore is enabled in your Firebase project
- Ensure your Firebase rules allow read/write access

### Local Development Not Working

```bash
# Clean rebuild
rm -rf node_modules public/config.js
npm install
npm run build
npm run serve
```

## File Structure

```
├── .env.example          # Template for environment variables
├── .env                  # Your local environment variables (not committed)
├── build-config.js       # Script to generate Firebase config
├── package.json          # Dependencies and scripts
├── public/
│   ├── config.js         # Auto-generated Firebase config
│   └── index.html        # Main application
└── deploy.sh             # Deployment script
```

## Migration Notes

If you're upgrading from the old config system:

1. Your old `config.js` file has been removed
2. The new system auto-generates `public/config.js` from environment variables
3. No changes needed to your HTML - it still imports from `./config.js`
4. The deployment process now includes a build step

## Support

If you encounter issues:

1. Check this guide first
2. Run `npm run validate-env` to verify setup
3. Check the console for specific error messages
4. Ensure your Firebase project is configured correctly
