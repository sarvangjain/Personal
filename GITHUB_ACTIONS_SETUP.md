# 🚀 GitHub Actions Setup for Personal Repo

## 📁 Your Repository Structure

```
Personal/                          # GitHub repository root
├── mobile-app/                    # Flutter app subdirectory
│   ├── lib/
│   ├── android/
│   ├── ios/
│   └── pubspec.yaml
├── splitwise-dashboard/           # Web app
└── .github/
    └── workflows/
        ├── build-ios.yml          # ✅ Created
        └── build-android.yml      # ✅ Created
```

---

## ✅ What I've Set Up

I've created **2 GitHub Actions workflows** that automatically build your mobile app:

### 1. iOS IPA Builder (`.github/workflows/build-ios.yml`)
- Builds iOS app in the cloud (macOS runner)
- Creates IPA file (unsigned, for testing)
- Downloads as artifact

### 2. Android APK/AAB Builder (`.github/workflows/build-android.yml`)
- Builds Android APK (for direct install)
- Builds Android App Bundle (for Play Store)
- Downloads both as artifacts

**Both workflows are configured to work with the `mobile-app` subdirectory!**

---

## 🚀 How to Use

### Automatic Build (on every push):

```bash
cd /Users/sarvang.jain/Work/Projects/Personal

# Commit the workflow files
git add .github/
git commit -m "Add iOS and Android build workflows"

# Push to GitHub
git push
```

GitHub will **automatically build** iOS and Android apps!

---

### Manual Build (on demand):

1. Go to your GitHub repo
2. Click **Actions** tab
3. Select **"Build iOS IPA"** or **"Build Android APK"**
4. Click **"Run workflow"** button
5. Select branch (main/master)
6. Click **"Run workflow"**
7. Wait ~15 minutes
8. Download artifacts

---

## 📥 Downloading Your IPA/APK

### After Build Completes:

1. Go to **Actions** tab on GitHub
2. Click on the completed build
3. Scroll down to **Artifacts** section
4. Download:
   - `splitsight-ios-app` (iOS IPA file)
   - `splitsight-android-apk` (Android APK)
   - `splitsight-android-bundle` (Android AAB for Play Store)

---

## 🎯 What Each Build Creates

### iOS Workflow:
- **Output**: `splitsight_app.ipa`
- **Platform**: iOS 14+
- **Signing**: Unsigned (for testing only)
- **Size**: ~50-100 MB
- **Build time**: ~15 minutes

### Android Workflow:
- **Output 1**: `app-release.apk` (for direct install)
- **Output 2**: `app-release.aab` (for Play Store)
- **Platform**: Android API 24+
- **Size**: ~40-80 MB
- **Build time**: ~10 minutes

---

## ⚙️ Workflow Triggers

Both workflows run automatically on:
- ✅ Push to `main` or `master` branch
- ✅ Pull requests
- ✅ Manual trigger (Run workflow button)

---

## 🔧 Local Build Alternative

If you still want to build locally:

```bash
# One-time setup (in regular terminal):
sudo gem install cocoapods

# Then build:
cd /Users/sarvang.jain/Work/Projects/Personal/mobile-app/ios
pod install
cd ..
flutter build ios --release --no-codesign

# Create IPA:
cd build/ios/iphoneos
mkdir Payload && cp -r Runner.app Payload/
zip -r ../../../splitsight_app.ipa Payload
```

---

## 📱 Installing the IPA

### On Your iPhone:

**Method 1 - TestFlight** (if you have Apple Developer account):
- Upload IPA to App Store Connect
- Add to TestFlight
- Install via TestFlight app

**Method 2 - Third-party tools** (no developer account):
- **AltStore**: https://altstore.io/
- **Sideloadly**: https://sideloadly.io/
- Both are free and don't require jailbreak

**Method 3 - Xcode Devices**:
- Connect iPhone via USB
- Open Xcode → Window → Devices
- Drag & drop IPA

---

## 🎉 Summary

You now have **3 ways** to get your IPA:

### 1. ⭐ GitHub Actions (Easiest)
```bash
git push
# Wait 15 min
# Download IPA from GitHub Actions
```

### 2. 🌟 Codemagic
- Connect at codemagic.io
- Automatic builds

### 3. 💪 Local Build
```bash
sudo gem install cocoapods
cd mobile-app/ios && pod install
cd .. && flutter build ios --no-codesign
# Then create IPA manually
```

---

## 📝 Next Steps

1. **Commit and push** the workflow files:
   ```bash
   cd /Users/sarvang.jain/Work/Projects/Personal
   git add .github/
   git commit -m "Add CI/CD workflows for iOS and Android"
   git push
   ```

2. **Go to GitHub** → Actions tab

3. **Watch the build** happen automatically

4. **Download your IPA/APK** from artifacts

---

**Recommended**: Just push the `.github` folder and GitHub will build everything for you! No local setup needed! 🚀
