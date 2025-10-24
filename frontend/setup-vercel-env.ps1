# Vercel Environment Variables Setup Script
# Run this script from the frontend directory

Write-Host "Setting up Vercel Environment Variables..." -ForegroundColor Green
Write-Host "Make sure you're in the frontend directory and logged into Vercel CLI" -ForegroundColor Yellow

# Check if we're in the right directory
if (!(Test-Path "package.json")) {
    Write-Host "Error: package.json not found. Make sure you're in the frontend directory." -ForegroundColor Red
    exit 1
}

# Check if vercel CLI is installed
try {
    vercel --version | Out-Null
} catch {
    Write-Host "Error: Vercel CLI not found. Install it with: npm i -g vercel" -ForegroundColor Red
    exit 1
}

Write-Host "`nAdding Firebase Configuration Variables..." -ForegroundColor Blue

# Firebase Public Variables
Write-Host "Adding NEXT_PUBLIC_FIREBASE_API_KEY..."
echo "AIzaSyDLRuts4gBq72Q7ZbdQVmu_U2HOmz1TNBk" | vercel env add NEXT_PUBLIC_FIREBASE_API_KEY production

Write-Host "Adding NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN..."
echo "connect-38fe1.firebaseapp.com" | vercel env add NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN production

Write-Host "Adding NEXT_PUBLIC_FIREBASE_PROJECT_ID..."
echo "connect-38fe1" | vercel env add NEXT_PUBLIC_FIREBASE_PROJECT_ID production

Write-Host "Adding NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET..."
echo "connect-38fe1.appspot.com" | vercel env add NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET production

Write-Host "Adding NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID..."
echo "680572399322" | vercel env add NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID production

Write-Host "Adding NEXT_PUBLIC_FIREBASE_APP_ID..."
echo "1:680572399322:web:e4c00f4417410f367fffe3" | vercel env add NEXT_PUBLIC_FIREBASE_APP_ID production

Write-Host "Adding NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID..."
echo "G-ZMNV6D3YZC" | vercel env add NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID production

# Environment Variables
Write-Host "Adding NODE_ENV..."
echo "production" | vercel env add NODE_ENV production

Write-Host "Adding NEXT_PUBLIC_APP_ENV..."
echo "production" | vercel env add NEXT_PUBLIC_APP_ENV production

Write-Host "`n✅ Public environment variables added successfully!" -ForegroundColor Green

Write-Host "`n⚠️  IMPORTANT: You still need to add Firebase Admin SDK credentials manually:" -ForegroundColor Yellow
Write-Host "1. Go to Firebase Console > Project Settings > Service Accounts" -ForegroundColor White
Write-Host "2. Generate new private key and download the JSON file" -ForegroundColor White
Write-Host "3. Run these commands manually:" -ForegroundColor White
Write-Host "   vercel env add FIREBASE_PRIVATE_KEY production" -ForegroundColor Cyan
Write-Host "   vercel env add FIREBASE_CLIENT_EMAIL production" -ForegroundColor Cyan

Write-Host "`n🚀 After adding admin credentials, deploy with:" -ForegroundColor Green
Write-Host "   vercel --prod" -ForegroundColor Cyan

Write-Host "`n📋 To verify all environment variables:" -ForegroundColor Blue
Write-Host "   vercel env ls" -ForegroundColor Cyan