# Setup Instructions

This Flutter app is ready for development! Follow these steps to get started:

## Prerequisites

1. Install Flutter SDK (3.16 or higher)
   ```bash
   flutter doctor
   ```

2. Install dependencies
   ```bash
   flutter pub get
   ```

## Firebase Configuration

### Important: You need to configure Firebase before running the app

1. **Create a Firebase project** at https://console.firebase.google.com

2. **For Android:**
   - Download `google-services.json` from Firebase Console
   - Place it in `android/app/google-services.json`
   - Update `android/app/build.gradle` to add the Google services plugin:
     ```gradle
     plugins {
         // ... existing plugins
         id 'com.google.gms.google-services'
     }
     ```
   - Update `android/build.gradle` to add the classpath:
     ```gradle
     dependencies {
         // ... existing dependencies
         classpath 'com.google.gms:google-services:4.4.0'
     }
     ```

3. **For iOS:**
   - Download `GoogleService-Info.plist` from Firebase Console
   - Place it in `ios/Runner/GoogleService-Info.plist`

4. **Update Firebase Options:**
   - Edit `lib/firebase_options.dart` and replace the placeholder values with your actual Firebase project configuration

5. **Enable Firestore:**
   - Go to Firebase Console > Firestore Database
   - Create database in production mode
   - Set up security rules

## Generate Riverpod Code

Run the build runner to generate Riverpod providers:

```bash
flutter pub run build_runner build --delete-conflicting-outputs
```

## Running the App

### iOS
```bash
flutter run -d ios
```

### Android
```bash
flutter run -d android
```

## First-Time Setup

1. When you first launch the app, you'll see the Setup screen
2. Enter your **User ID** for Firebase (this will be used as the document ID in Firestore)
3. Enter your **Splitwise API Key** (get this from https://secure.splitwise.com/apps)
4. Click "Continue"

## Firestore Structure

The app expects this Firestore structure:

```
expenseSight/
  └── {userId}/
      ├── expenses/
      ├── income/
      ├── investments/
      ├── goals/
      ├── bills/
      └── settings/
          └── budget
```

## Development Notes

- The app uses **Riverpod** for state management
- **GoRouter** for navigation
- **fl_chart** for visualizations
- **Material 3** dark theme only

## Troubleshooting

### "firebase_core not found"
Run `flutter pub get` and restart your IDE

### "google-services.json not found"
Make sure you've added the Firebase configuration files as described above

### Build errors
```bash
flutter clean
flutter pub get
flutter pub run build_runner build --delete-conflicting-outputs
```

## Next Steps

After setup:
1. The app will sync with your existing Firebase/Firestore database
2. Add expenses, income, investments, and goals
3. Track bills and budgets
4. View insights and analytics

Enjoy using SplitSight & ExpenseSight! 🎉
