#!/bin/bash

# Firebase Hosting Deployment Script
echo "🚀 Starting Firebase Hosting deployment..."

# Check if environment is configured
if [ ! -f ".env" ] && [ -z "$FIREBASE_API_KEY" ]; then
    echo "❌ Error: No environment configuration found!"
    echo "📝 Please set up your environment:"
    echo "   1. Copy .env.example to .env: cp .env.example .env"
    echo "   2. Edit .env with your Firebase credentials"
    echo "   3. Or set environment variables directly"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build configuration from environment variables
echo "🔧 Building configuration..."
npm run build

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found!"
    echo "📦 Please install it first:"
    echo "   npm install -g firebase-tools"
    exit 1
fi

# Check if there's an active project, if not try to set one
if ! firebase use > /dev/null 2>&1; then
    echo "⚠️  No active Firebase project detected."
    echo "🔍 Available projects:"
    firebase projects:list
    echo ""
    echo "💡 Please set an active project first:"
    echo "   firebase use YOUR_PROJECT_ID"
    exit 1
fi

# Display current project
CURRENT_PROJECT=$(firebase use)
echo "📋 Using Firebase project: $CURRENT_PROJECT"

# Deploy to Firebase Hosting
echo "🔥 Deploying to Firebase Hosting..."
firebase deploy --only hosting

if [ $? -eq 0 ]; then
    echo "✅ Deployment successful!"
    echo "🌐 Your app is now live!"
    echo ""
    echo "📱 Access your app at:"
    PROJECT_ID=$(echo $CURRENT_PROJECT | grep -o 'connect-[a-zA-Z0-9]*' || echo "YOUR_PROJECT_ID")
    echo "   - https://$PROJECT_ID.web.app"
    echo "   - https://$PROJECT_ID.firebaseapp.com"
    echo ""
    echo "🔧 To add a custom domain, visit the Firebase Console"
else
    echo "❌ Deployment failed!"
    echo "💡 Troubleshooting tips:"
    echo "   - Check your internet connection"
    echo "   - Try: firebase login --reauth"
    echo "   - Verify project permissions in Firebase Console"
fi 