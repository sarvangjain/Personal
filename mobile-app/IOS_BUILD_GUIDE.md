# 📱 iOS Build Guide - Create IPA File

## Prerequisites

### Required:
1. **macOS** - You have this ✅
2. **Xcode** - Install from App Store (free)
3. **Apple Developer Account** - Free for testing, $99/year for distribution
4. **CocoaPods** - For iOS dependencies

---

## 🚀 Quick Build Methods

### Method 1: Build for Testing (No Apple Developer Account Needed)

For testing on your own device or simulator:

```bash
cd /Users/sarvang.jain/Work/Projects/Personal/mobile-app

# Build for iOS
flutter build ios --release

# Or build and run directly
flutter run --release
```

**Note**: This creates a `.app` file, not an IPA. For IPA, continue to Method 2 or 3.

---

### Method 2: Create IPA for Personal Testing (Free Apple ID)

#### Step 1: Install Xcode
```bash
# Check if Xcode is installed
xcode-select --version

# If not installed, download from App Store
# Then run:
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -license accept
```

#### Step 2: Install CocoaPods
```bash
sudo gem install cocoapods
```

#### Step 3: Setup iOS Project
```bash
cd /Users/sarvang.jain/Work/Projects/Personal/mobile-app

# Install iOS dependencies
cd ios
pod install
cd ..
```

#### Step 4: Open in Xcode
```bash
open ios/Runner.xcworkspace
```

#### Step 5: Configure Signing in Xcode
1. In Xcode, select **Runner** in the left sidebar
2. Go to **Signing & Capabilities** tab
3. Select your Team (use your Apple ID)
4. Xcode will automatically create a provisioning profile
5. Make sure Bundle Identifier is: `com.splitsight.app`

#### Step 6: Build Archive
In Xcode:
1. Select **Product** → **Destination** → **Any iOS Device (arm64)**
2. Select **Product** → **Archive**
3. Wait for build to complete (~5-10 minutes first time)
4. When done, the **Organizer** window opens

#### Step 7: Export IPA
In the Organizer window:
1. Select your archive
2. Click **Distribute App**
3. Choose **Development** (for testing)
4. Click **Next** → **Next**
5. Choose where to save the IPA file

**Result**: You'll get a `.ipa` file you can install on test devices!

---

### Method 3: Build IPA via Command Line (Advanced)

#### Step 1: Build Archive
```bash
cd /Users/sarvang.jain/Work/Projects/Personal/mobile-app

flutter build ios --release

# Then build archive with xcodebuild
cd ios
xcodebuild -workspace Runner.xcworkspace \
  -scheme Runner \
  -sdk iphoneos \
  -configuration Release \
  archive -archivePath build/Runner.xcarchive
```

#### Step 2: Export IPA
```bash
# Create ExportOptions.plist
cat > ExportOptions.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>development</string>
    <key>teamID</key>
    <string>YOUR_TEAM_ID</string>
</dict>
</plist>
EOF

# Export IPA
xcodebuild -exportArchive \
  -archivePath build/Runner.xcarchive \
  -exportPath build \
  -exportOptionsPlist ExportOptions.plist
```

**Result**: IPA file will be in `ios/build/Runner.ipa`

---

### Method 4: Build for App Store Distribution (Requires $99/year Account)

#### Step 1: Join Apple Developer Program
1. Go to https://developer.apple.com/programs/
2. Enroll ($99/year)
3. Wait for approval (~24-48 hours)

#### Step 2: Create App in App Store Connect
1. Go to https://appstoreconnect.apple.com/
2. Click **My Apps** → **+** → **New App**
3. Fill in details:
   - Name: `SplitSight & ExpenseSight`
   - Bundle ID: `com.splitsight.app`
   - SKU: `splitsight-app`

#### Step 3: Build for Release
```bash
cd /Users/sarvang.jain/Work/Projects/Personal/mobile-app

flutter build ios --release

# Open in Xcode
open ios/Runner.xcworkspace
```

#### Step 4: Archive and Upload
In Xcode:
1. **Product** → **Destination** → **Any iOS Device**
2. **Product** → **Archive**
3. When done, click **Distribute App**
4. Choose **App Store Connect**
5. Click **Upload**
6. Wait for upload to complete

#### Step 5: Submit for Review
1. Go to App Store Connect
2. Fill in app details, screenshots, description
3. Submit for review
4. Wait for approval (~1-3 days)

---

## 🎯 Recommended Approach for You

### For Testing Only (Start Here):

**Option A - Simulator** (Easiest, No IPA needed):
```bash
cd /Users/sarvang.jain/Work/Projects/Personal/mobile-app
open -a Simulator
flutter run --release
```

**Option B - TestFlight** (For real device testing):
1. Use **Method 2** above (free Apple ID)
2. Or use **Method 4** if you have paid developer account
3. Upload to TestFlight
4. Install via TestFlight app on iPhone

**Option C - Direct Install** (Ad-hoc):
1. Build IPA with **Method 2**
2. Use tools like:
   - **Xcode Devices & Simulators** window
   - **Apple Configurator** 
   - **AltStore** (jailbreak-free)

---

## 📦 Quick Setup Script

Here's a script to automate the iOS setup:

```bash
#!/bin/bash
cd /Users/sarvang.jain/Work/Projects/Personal/mobile-app

echo "Installing CocoaPods..."
sudo gem install cocoapods

echo "Installing iOS dependencies..."
cd ios
pod install
cd ..

echo "Opening in Xcode..."
open ios/Runner.xcworkspace

echo "Next steps:"
echo "1. Sign in with your Apple ID in Xcode (Preferences > Accounts)"
echo "2. Select Runner > Signing & Capabilities"
echo "3. Choose your Team"
echo "4. Product > Archive"
echo "5. Distribute App > Development"
```

---

## 🔧 Troubleshooting

### "No such module 'Firebase'"
```bash
cd ios
pod install
pod update
cd ..
```

### "Code signing error"
- Add your Apple ID in Xcode → Preferences → Accounts
- Select your team in Signing & Capabilities
- Change Bundle ID if needed

### "Build failed"
```bash
# Clean and rebuild
flutter clean
cd ios
pod deintegrate
pod install
cd ..
flutter build ios
```

### "No provisioning profile"
- Xcode will auto-create one with your Apple ID
- Or manually create at https://developer.apple.com/

---

## 📋 IPA File Locations

After building, find your IPA at:

**Method 2 (Xcode Export)**:
- Wherever you chose to save during export

**Method 3 (Command line)**:
- `mobile-app/ios/build/Runner.ipa`

**Method 4 (App Store)**:
- Uploaded directly to App Store Connect

---

## 🎯 Step-by-Step for First-Time iOS Build

### 1. Install Xcode (If not installed)
- App Store → Search "Xcode" → Install (12GB+)
- Wait ~1-2 hours for download/install

### 2. Setup Project
```bash
cd /Users/sarvang.jain/Work/Projects/Personal/mobile-app

# Install CocoaPods
sudo gem install cocoapods

# Install iOS dependencies
cd ios && pod install && cd ..
```

### 3. Configure in Xcode
```bash
open ios/Runner.xcworkspace
```

In Xcode:
- Sign in with Apple ID (Xcode → Preferences → Accounts)
- Select **Runner** target
- Go to **Signing & Capabilities**
- Check "Automatically manage signing"
- Select your Team

### 4. Build Archive
- Product → Destination → Any iOS Device (arm64)
- Product → Archive
- Wait for build (~5-10 min first time)

### 5. Export IPA
- In Organizer window that appears
- Click "Distribute App"
- Select "Development"
- Save the IPA file

---

## 🎁 Alternative: Use Codemagic / Firebase App Distribution

### Codemagic (Free CI/CD):
1. Connect your GitHub repo
2. Configure build settings
3. Automatic IPA generation on push
4. Free for open source

### Firebase App Distribution:
1. Build IPA locally
2. Upload to Firebase
3. Share download link with testers
4. No App Store needed for testing

---

## 💡 Quick Testing Without IPA

For immediate testing, just use:

```bash
# iOS Simulator (no IPA needed)
open -a Simulator
cd /Users/sarvang.jain/Work/Projects/Personal/mobile-app
flutter run

# Or for better performance
flutter run --release
```

---

## ⏱️ Time Estimates

| Task | Time Required |
|------|---------------|
| Install Xcode | 1-2 hours |
| Setup CocoaPods | 5 minutes |
| First iOS build | 10-15 minutes |
| Create IPA | 2-3 minutes |
| Upload to TestFlight | 5-10 minutes |
| App Store submission | 1-3 days review |

---

## 🎯 Recommended Path

**For quick testing**: Use iOS Simulator (no IPA needed)

**For device testing**: 
1. Build with Xcode (Method 2)
2. Install via Xcode Devices window
3. Or upload to TestFlight

**For distribution**:
1. Get Apple Developer account ($99/year)
2. Use Method 4 (App Store)
3. Or use TestFlight for beta testing

---

**Want me to help you with the Xcode setup? Let me know where you're stuck!** 🚀
