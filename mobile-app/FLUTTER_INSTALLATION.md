# 🛠️ Flutter Installation Guide for macOS

## Current Issue
You're getting `zsh: command not found: flutter` because Flutter is not installed on your system.

---

## 🚀 Quick Installation (Recommended)

### Option 1: Install with Homebrew (Easiest)

If you have Homebrew installed:

```bash
# Install Flutter
brew install --cask flutter

# Verify installation
flutter --version

# Run Flutter doctor to check setup
flutter doctor
```

**Installation time**: ~5-10 minutes

---

### Option 2: Manual Installation

If you don't have Homebrew or prefer manual installation:

#### Step 1: Download Flutter
```bash
cd ~
curl -O https://storage.googleapis.com/flutter_infra_release/releases/stable/macos/flutter_macos_arm64_3.24.0-stable.zip

# Or for Intel Mac:
# curl -O https://storage.googleapis.com/flutter_infra_release/releases/stable/macos/flutter_macos_3.24.0-stable.zip
```

#### Step 2: Extract
```bash
unzip flutter_macos_*.zip
rm flutter_macos_*.zip  # Clean up zip file
```

#### Step 3: Add to PATH
```bash
# Add Flutter to your PATH permanently
echo 'export PATH="$HOME/flutter/bin:$PATH"' >> ~/.zshrc

# Reload your shell configuration
source ~/.zshrc
```

#### Step 4: Verify Installation
```bash
flutter --version
flutter doctor
```

---

## 📋 After Installation

### Run Flutter Doctor
This checks your setup and tells you what's missing:

```bash
flutter doctor
```

You'll likely see output like:
```
Doctor summary (to see all details, run flutter doctor -v):
[✓] Flutter (Channel stable, 3.24.0, on macOS 14.x)
[✗] Android toolchain - Android SDK not found
[✗] Xcode - Xcode not installed
[!] Chrome - install Chrome for web development
```

**Don't worry!** You don't need everything for basic testing.

---

## 🎯 What You Need for Your App

### For iOS Development (Optional)
If you want to run on iOS simulator:

```bash
# Install Xcode from App Store
# Then accept license
sudo xcodebuild -license accept

# Install CocoaPods
sudo gem install cocoapods
```

### For Android Development (Optional)
If you want to run on Android:

1. Download **Android Studio**: https://developer.android.com/studio
2. Install Android SDK through Android Studio
3. Run `flutter doctor --android-licenses` and accept all

### For Testing (Easy Way)
Use the **web version** - requires only Chrome:

```bash
# Run on Chrome (no iOS/Android setup needed!)
flutter run -d chrome
```

---

## ⚡ Quick Test (Without iOS/Android Setup)

Once Flutter is installed, you can test your app immediately on web:

```bash
cd /Users/sarvang.jain/Work/Projects/Personal/mobile-app

# Install dependencies
flutter pub get

# Run on Chrome
flutter run -d chrome
```

**Note**: The web version will work, but the app is optimized for mobile. Some mobile-specific features might not work perfectly on web.

---

## 🔧 Troubleshooting

### "flutter: command not found" after installation

1. **Check installation location**:
   ```bash
   ls ~/flutter/bin/flutter
   ```

2. **Manually add to PATH**:
   ```bash
   export PATH="$HOME/flutter/bin:$PATH"
   source ~/.zshrc
   ```

3. **Verify PATH**:
   ```bash
   echo $PATH | grep flutter
   ```

### "Permission denied" errors
```bash
# Fix permissions
chmod -R 755 ~/flutter
```

### Flutter doctor shows warnings
Most warnings can be ignored initially. Key requirements:
- ✅ Flutter SDK installed
- ✅ Dart installed (comes with Flutter)
- For mobile: Either Xcode (iOS) or Android Studio (Android)
- For web: Chrome browser

---

## 🎯 Recommended Next Steps

### 1. Install Flutter (Choose one):
- **Easy**: `brew install --cask flutter` (if you have Homebrew)
- **Manual**: Download and extract as shown above

### 2. Install Dependencies:
```bash
cd /Users/sarvang.jain/Work/Projects/Personal/mobile-app
flutter pub get
```

### 3. Choose Your Testing Method:

**Option A - Web (Quickest)**
```bash
flutter run -d chrome
```

**Option B - iOS Simulator** (requires Xcode)
```bash
open -a Simulator
flutter run
```

**Option C - Android Emulator** (requires Android Studio)
```bash
flutter emulators --launch <emulator_id>
flutter run
```

---

## 📱 Alternative: Use FlutterFlow or Online IDE

If you want to see the app without installing Flutter:

1. **FlutterFlow**: Visual Flutter builder (can import your code)
2. **DartPad**: Online Dart/Flutter editor (https://dartpad.dev)
3. **GitHub Codespaces**: Run Flutter in the cloud

---

## ✅ Minimal Setup for Quick Testing

If you just want to see the app quickly:

```bash
# 1. Install Flutter (choose easiest method for you)
brew install --cask flutter

# 2. Go to project
cd /Users/sarvang.jain/Work/Projects/Personal/mobile-app

# 3. Get dependencies
flutter pub get

# 4. Run on web (no extra setup needed!)
flutter run -d chrome
```

**Total time**: ~10-15 minutes including download

---

## 🆘 Need Help?

### Check Flutter Installation
```bash
which flutter
flutter --version
flutter doctor -v
```

### Common Issues
- **PATH not set**: Add Flutter to `~/.zshrc`
- **Old Flutter version**: Run `flutter upgrade`
- **Android licenses**: Run `flutter doctor --android-licenses`
- **Xcode issues**: Open Xcode once to complete setup

---

## 📚 Official Resources

- **Flutter Installation**: https://docs.flutter.dev/get-started/install/macos
- **Flutter Doctor**: https://docs.flutter.dev/get-started/install/macos#run-flutter-doctor
- **VS Code Setup**: https://docs.flutter.dev/get-started/editor?tab=vscode

---

**Let me know which installation method you'd prefer, and I can provide more specific guidance!** 🚀
