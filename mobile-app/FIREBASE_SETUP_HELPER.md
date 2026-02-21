# Firebase Setup Helper

## 🔥 Your Web App Already Has Firebase Configured!

I found your Firebase configuration in the web app at:
`/Users/sarvang.jain/Work/Projects/Personal/splitwise-dashboard/src/firebase/config.js`

---

## 📋 Step-by-Step Setup

### Step 1: Get Your Firebase Config Values

Your web app reads Firebase config from environment variables in `.env`:

```bash
# Check your current Firebase config
cd /Users/sarvang.jain/Work/Projects/Personal/splitwise-dashboard
cat .env.local
```

Look for these variables:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

**Note**: If these are not filled in `.env.local`, you need to get them from Firebase Console.

---

### Step 2: Get Firebase Config from Firebase Console

If your `.env.local` doesn't have actual values (just placeholders):

1. Go to https://console.firebase.google.com/
2. Select your project (or the project name from your web app)
3. Click the ⚙️ (Settings) icon > Project settings
4. Scroll down to "Your apps"
5. You should see a **Web app** already registered
6. Copy the config values shown there

---

### Step 3: Update Flutter App's Firebase Configuration

Once you have the values, update this file:
`/Users/sarvang.jain/Work/Projects/Personal/mobile-app/lib/firebase_options.dart`

Replace the placeholder values:

```dart
class DefaultFirebaseOptions {
  // ... existing code ...

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'YOUR_API_KEY_HERE',              // From VITE_FIREBASE_API_KEY
    appId: 'YOUR_APP_ID_HERE',                // From VITE_FIREBASE_APP_ID
    messagingSenderId: 'YOUR_SENDER_ID',      // From VITE_FIREBASE_MESSAGING_SENDER_ID
    projectId: 'YOUR_PROJECT_ID',             // From VITE_FIREBASE_PROJECT_ID
    storageBucket: 'YOUR_BUCKET_NAME',        // From VITE_FIREBASE_STORAGE_BUCKET
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'YOUR_API_KEY_HERE',              // From VITE_FIREBASE_API_KEY
    appId: 'YOUR_IOS_APP_ID_HERE',            // See note below
    messagingSenderId: 'YOUR_SENDER_ID',      // From VITE_FIREBASE_MESSAGING_SENDER_ID
    projectId: 'YOUR_PROJECT_ID',             // From VITE_FIREBASE_PROJECT_ID
    storageBucket: 'YOUR_BUCKET_NAME',        // From VITE_FIREBASE_STORAGE_BUCKET
    iosBundleId: 'com.splitsight.app',
  );
}
```

**Important**: 
- Android and iOS can share most values (apiKey, projectId, etc.)
- The `appId` might be different for iOS (you may need to register an iOS app in Firebase Console)

---

### Step 4: Register iOS & Android Apps (If Needed)

If you haven't registered mobile apps in Firebase:

#### For Android:
1. Go to Firebase Console > Project Settings > General
2. Under "Your apps", click "Add app" > Android
3. Package name: `com.splitsight.app`
4. Download `google-services.json`
5. Place it in: `/Users/sarvang.jain/Work/Projects/Personal/mobile-app/android/app/google-services.json`

#### For iOS:
1. Go to Firebase Console > Project Settings > General
2. Under "Your apps", click "Add app" > iOS
3. Bundle ID: `com.splitsight.app`
4. Download `GoogleService-Info.plist`
5. Place it in: `/Users/sarvang.jain/Work/Projects/Personal/mobile-app/ios/Runner/GoogleService-Info.plist`

---

### Step 5: Add Google Services Plugin to Android

Update `/Users/sarvang.jain/Work/Projects/Personal/mobile-app/android/app/build.gradle`:

```gradle
plugins {
    id "com.android.application"
    id "kotlin-android"
    id "dev.flutter.flutter-gradle-plugin"
    id 'com.google.gms.google-services'  // ADD THIS LINE
}
```

Update `/Users/sarvang.jain/Work/Projects/Personal/mobile-app/android/build.gradle`:

```gradle
buildscript {
    ext.kotlin_version = '1.7.10'
    repositories {
        google()
        mavenCentral()
    }

    dependencies {
        classpath 'com.android.tools.build:gradle:7.3.0'
        classpath "org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlin_version"
        classpath 'com.google.gms:google-services:4.4.0'  // ADD THIS LINE
    }
}
```

---

## 🚀 Quick Setup Script

Here's a quick way to check and copy your Firebase config:

```bash
# 1. Check your web app's Firebase config
cd /Users/sarvang.jain/Work/Projects/Personal/splitwise-dashboard
echo "=== Your Firebase Config ==="
grep FIREBASE .env.local

# 2. If values are set, you can use them directly!
# Just copy them to the Flutter app's firebase_options.dart
```

---

## ✅ Verification

After setup, verify everything works:

```bash
cd /Users/sarvang.jain/Work/Projects/Personal/mobile-app
flutter pub get
flutter run
```

The app should:
1. Launch without Firebase errors
2. Connect to the same Firestore database as your web app
3. Show the same data (expenses, bills, etc.)

---

## 🔐 Important Notes

### Security
- The **same Firebase project** can be used for web and mobile
- All apps (web, Android, iOS) share the **same Firestore database**
- Data will sync automatically between platforms
- Make sure Firestore security rules allow your userId

### Firestore Rules
Your web app likely has rules like:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /expenseSight/{userId}/{document=**} {
      allow read, write: if true; // Or your custom auth logic
    }
  }
}
```

The mobile app will use the **same rules**.

---

## 🎯 Expected Result

Once configured, both apps will:
- ✅ Share the same Firebase project
- ✅ Access the same Firestore database
- ✅ Show synchronized data
- ✅ Update in real-time across platforms

---

## 🆘 Troubleshooting

### "Firebase not configured"
- Check that all values in `firebase_options.dart` are filled (no "YOUR_" placeholders)
- Verify the values match your Firebase Console

### "Permission denied"
- Check Firestore security rules
- Make sure the userId in the mobile app matches the web app

### "App not found"
- Register Android/iOS apps in Firebase Console
- Download and place `google-services.json` / `GoogleService-Info.plist`

---

## 📝 Next Steps

1. Get Firebase config from `.env.local` or Firebase Console
2. Update `firebase_options.dart` with actual values
3. Add `google-services.json` and `GoogleService-Info.plist`
4. Add Google Services plugin to Android
5. Run `flutter pub get`
6. Test the app!

**Your web app and mobile app will share the same Firebase database!** 🎉
