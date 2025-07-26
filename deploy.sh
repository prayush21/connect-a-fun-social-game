#!/bin/bash

# Firebase Hosting Deployment Script
echo "🚀 Starting Firebase Hosting deployment..."

# Check if config.js exists
if [ ! -f "config.js" ]; then
    echo "❌ Error: config.js not found!"
    echo "📝 Please copy config.example.js to config.js and add your Firebase credentials:"
    echo "   cp config.example.js config.js"
    echo "   # Then edit config.js with your Firebase project details"
    exit 1
fi

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