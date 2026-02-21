# 📱 Complete IPA Build Instructions

## ✅ Your iOS Project is Now Ready!

I've set up all the necessary files. Here's what you need to do:

---

## 🚀 Option 1: Build IPA Locally (Complete Control)

### Step 1: Install CocoaPods

**Open a new terminal** and run:

```bash
sudo gem install cocoapods
```

Enter your Mac password when prompted.

---

### Step 2: Install iOS Dependencies

```bash
cd /Users/sarvang.jain/Work/Projects/Personal/mobile-app/ios
pod install
```

You should see output like:
```
Analyzing dependencies
Downloading dependencies
Installing Firebase...
Pod installation complete!
```

---

### Step 3: Build the IPA

```bash
cd /Users/sarvang.jain/Work/Projects/Personal/mobile-app

# Build IPA
flutter build ipa --release
```

**If you get signing errors**, use:
```bash
flutter build ios --release --no-codesign
```

Then manually create IPA:
```bash
cd build/ios/iphoneos
mkdir Payload
cp -r Runner.app Payload/
zip -r ../../../splitsight_app.ipa Payload
rm -rf Payload
cd ../../..
```

**Your IPA will be at**: `splitsight_app.ipa` in the root folder

---

## 🚀 Option 2: Cloud Build (NO Local Setup Needed!)

### Using Codemagic (Recommended - Completely Free)

**No CocoaPods, No Xcode, No local build!**

#### Step 1: Push to GitHub (if not already done)

```bash
cd /Users/sarvang.jain/Work/Projects/Personal/mobile-app

# If not a git repo yet:
git init
git add .
git commit -m "Flutter mobile app"
git branch -M main

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

#### Step 2: Build on Codemagic

1. Go to **https://codemagic.io**
2. Click **"Sign up with GitHub"**
3. Click **"Add application"**
4. Select your repository
5. Choose **"Flutter App"**
6. Click **"Start your first build"**
7. Wait ~15 minutes
8. **Download IPA** from build artifacts

**That's it!** No local Xcode or CocoaPods needed.

---

## 🚀 Option 3: GitHub Actions (Automated)

I can create a GitHub Actions workflow that builds IPA automatically on every push.

Create this file: `.github/workflows/build-ios.yml`

```yaml
name: Build iOS IPA

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  build-ios:
    runs-on: macos-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Flutter
        uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.24.0'
          channel: 'stable'
      
      - name: Get dependencies
        run: flutter pub get
      
      - name: Install CocoaPods
        run: |
          cd ios
          pod install
          cd ..
      
      - name: Build iOS
        run: flutter build ios --release --no-codesign
      
      - name: Create IPA
        run: |
          cd build/ios/iphoneos
          mkdir Payload
          cp -r Runner.app Payload/
          zip -r ../../../splitsight_app.ipa Payload
          cd ../../..
      
      - name: Upload IPA
        uses: actions/upload-artifact@v3
        with:
          name: ios-ipa
          path: splitsight_app.ipa
```

**How it works**:
1. Commit and push this file
2. GitHub automatically builds
3. Download IPA from Actions → Artifacts

---

## 🎯 My Recommendation

### For Quickest IPA (Choose One):

**1. Cloud Build - Codemagic** (⭐ Recommended)
- Zero local setup
- Free
- Professional builds
- Time: 20 min total (15 min build)

**2. Local Build** (If you want control)
- Install CocoaPods (1 min)
- Run pod install (2 min)
- Run flutter build (10 min)
- Time: 15 min total

**3. GitHub Actions**
- Automated on every push
- Free for public repos
- Time: 15 min per build

---

## 📝 Quick Commands Summary

### Local Build:
```bash
# Step 1 (run in regular terminal, one-time):
sudo gem install cocoapods

# Step 2:
cd /Users/sarvang.jain/Work/Projects/Personal/mobile-app/ios
pod install
cd ..

# Step 3:
flutter build ios --release --no-codesign

# Step 4 (create IPA):
cd build/ios/iphoneos
mkdir Payload
cp -r Runner.app Payload/
zip -r ../../../splitsight_app.ipa Payload
```

**Result**: `splitsight_app.ipa` in project root

---

## 🔧 Troubleshooting

### "pod: command not found"
```bash
sudo gem install cocoapods
```

### "CocoaPods not installed"
```bash
# Install with Homebrew instead:
brew install cocoapods
```

### "Permission denied"
```bash
# Fix permissions:
sudo chown -R $(whoami) /Library/Ruby/Gems/
```

### "No provisioning profile"
- Use `--no-codesign` flag
- Or add Apple Developer account in Xcode

---

## 🎁 Bonus: Install IPA on iPhone

### Method 1: TestFlight (if you have Apple Developer account)
1. Upload IPA to App Store Connect
2. Add to TestFlight
3. Install via TestFlight app on iPhone

### Method 2: Xcode Devices Window
1. Connect iPhone
2. Open Xcode → Window → Devices & Simulators
3. Drag & drop IPA

### Method 3: Third-party Tools
- **AltStore** (free, no jailbreak)
- **Sideloadly** (free)
- **iOS App Signer** (re-sign IPA)

---

## ⏱️ Time Comparison

| Method | Setup Time | Build Time | Total |
|--------|-----------|------------|-------|
| Codemagic | 5 min | 15 min | **20 min** ⭐ |
| Local Build | 5 min | 10 min | **15 min** |
| GitHub Actions | 10 min | 15 min | **25 min** |
| Xcode GUI | 10 min | 15 min | **25 min** |

---

## 🎯 Next Steps

**Choose your method**:

1. **Want it FAST with ZERO local setup?** → Use **Codemagic**
2. **Want local control?** → Install CocoaPods and build locally
3. **Want automation?** → Set up GitHub Actions

**I recommend Codemagic** - push to GitHub, connect Codemagic, download IPA. Done!

---

Want me to help you set up any of these methods? Let me know! 🚀
