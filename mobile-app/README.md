# SplitSight & ExpenseSight Mobile App

A comprehensive Flutter mobile application combining two powerful financial tracking modules:

## Features

### 🔀 SplitSight
- Splitwise dashboard for shared expense analytics
- Real-time balance tracking
- Group and friend management
- Smart settle-up suggestions

### 💰 ExpenseSight
- Personal expense tracking with Firebase backend
- Income and investment management
- Savings goals with auto-allocation
- Bill reminders and budget tracking
- Rich analytics and insights

## Tech Stack

- **Framework**: Flutter 3.16+
- **State Management**: Riverpod
- **Navigation**: GoRouter
- **Backend**: Firebase/Firestore
- **API Integration**: Splitwise API via Dio
- **Charts**: fl_chart
- **Theme**: Material 3 Dark Mode

## Getting Started

1. Install dependencies:
```bash
flutter pub get
```

2. Generate code (for Riverpod):
```bash
flutter pub run build_runner build --delete-conflicting-outputs
```

3. Configure Firebase:
   - Add `google-services.json` to `android/app/`
   - Add `GoogleService-Info.plist` to `ios/Runner/`

4. Run the app:
```bash
flutter run
```

## Configuration

- Add your Splitwise API key in the Setup screen
- Firebase will sync automatically with the existing web app database

## Project Structure

```
lib/
├── main.dart
├── app.dart
├── core/
│   ├── theme/
│   ├── router/
│   └── utils/
├── features/
│   ├── auth/
│   ├── splitsight/
│   └── expensesight/
└── shared/
    └── widgets/
```
