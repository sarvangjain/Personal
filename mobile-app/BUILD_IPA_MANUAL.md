# 🛠️ Manual Steps to Build IPA

Since CocoaPods requires sudo and iOS setup needs some manual steps, here's what you need to do:

## 📋 Step-by-Step Instructions

### Step 1: Install CocoaPods (One-time setup)

Run this in your **regular terminal** (not through the IDE):

```bash
sudo gem install cocoapods
```

Enter your macOS password when prompted.

---

### Step 2: Install iOS Dependencies

```bash
cd /Users/sarvang.jain/Work/Projects/Personal/mobile-app/ios
pod install
cd ..
```

**This creates**: `ios/Pods/` directory and `Runner.xcworkspace`

---

### Step 3: Build IPA

Now you can build the IPA:

```bash
cd /Users/sarvang.jain/Work/Projects/Personal/mobile-app

# Method A: Build IPA (requires signing)
flutter build ipa --release

# Method B: Build without signing (for testing)
flutter build ios --release --no-codesign
```

---

## 🎯 Alternative: Use Cloud Build (No Local Setup)

### Codemagic (Recommended - Zero Setup on Your Mac)

**No CocoaPods, No Xcode, No local build needed!**

#### Setup:
1. **Push your code to GitHub**:
   ```bash
   cd /Users/sarvang.jain/Work/Projects/Personal/mobile-app
   git init
   git add .
   git commit -m "Initial Flutter app"
   git branch -M main
   git remote add origin YOUR_GITHUB_REPO_URL
   git push -u origin main
   ```

2. **Go to https://codemagic.io**
3. **Sign up** with GitHub
4. **Add app** → Select your repository
5. **Configure workflow**:
   - Select "Flutter App"
   - Enable iOS build
   - Add Apple Developer credentials (if you have them)
6. **Start build**
7. **Download IPA** from dashboard (~15 minutes)

**No local setup required!** Everything builds in the cloud.

---

### GitHub Actions (Alternative Cloud Build)

Create `.github/workflows/build-ios.yml`:

```yaml
name: Build iOS IPA

on:
  workflow_dispatch:  # Manual trigger

jobs:
  build:
    runs-on: macos-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Flutter
        uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.24.0'
          channel: 'stable'
      
      - name: Install dependencies
        run: flutter pub get
      
      - name: Install CocoaPods
        run: |
          cd ios
          pod install
          cd ..
      
      - name: Build iOS (no codesign)
        run: flutter build ios --release --no-codesign
      
      - name: Create IPA manually
        run: |
          cd build/ios/iphoneos
          mkdir Payload
          cp -r Runner.app Payload/
          zip -r ../../../app.ipa Payload
          cd ../../..
      
      - name: Upload IPA
        uses: actions/upload-artifact@v3
        with:
          name: ios-ipa
          path: app.ipa
```

**How to use**:
1. Commit this file
2. Push to GitHub
3. Go to GitHub → Actions → Run workflow
4. Download IPA from artifacts

---

## 🎯 Quick Summary

### For Local Build:
```bash
# You MUST run these commands manually in terminal:
sudo gem install cocoapods
cd /Users/sarvang.jain/Work/Projects/Personal/mobile-app/ios
pod install
cd ..
flutter build ipa --release
```

### For Cloud Build (No local setup):
1. Use **Codemagic** or **GitHub Actions**
2. Push code to GitHub
3. Build happens in cloud
4. Download IPA

---

## 💡 What I Recommend

**Option 1** (Easiest): Use **Codemagic**
- No local setup
- Free for open source
- Professional builds
- Takes 15 minutes total

**Option 2** (If you have time): Manual local build
- Run the commands above in terminal
- Install CocoaPods (one-time)
- Then `flutter build ipa`

**Option 3** (For quick testing): Skip IPA entirely
- Use iOS Simulator: `flutter run --release`
- Or continue using web version

---

**Which method would you prefer?** Let me know and I can help you set it up! 🚀
