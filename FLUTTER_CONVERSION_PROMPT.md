# Flutter Conversion Prompt: SplitSight & ExpenseSight

Build a Flutter mobile application (iOS + Android) that replicates the functionality of my existing React web application. The app has two main modules:

1. **SplitSight** - A Splitwise dashboard for shared expense analytics
2. **ExpenseSight** - A personal expense tracker with Firebase backend

The Flutter app must use the **same Firebase/Firestore database** as the existing web app so data syncs between platforms.

---

## Project Setup Requirements

### Flutter Configuration
- Minimum Flutter SDK: 3.16+
- Target: iOS 14+ and Android API 24+
- Use Material 3 design system with **dark theme only**
- Package name: `com.splitsight.app`

### Required Dependencies
```yaml
dependencies:
  flutter:
    sdk: flutter
  # State Management
  flutter_riverpod: ^2.4.0
  riverpod_annotation: ^2.3.0
  
  # Navigation
  go_router: ^12.0.0
  
  # Firebase
  firebase_core: ^2.24.0
  cloud_firestore: ^4.13.0
  
  # HTTP & API
  dio: ^5.4.0
  
  # UI Components
  fl_chart: ^0.65.0
  flutter_animate: ^4.3.0
  google_fonts: ^6.1.0
  
  # Utilities
  intl: ^0.18.1
  collection: ^1.18.0
  shared_preferences: ^2.2.2
  
  # Icons (Material icons are built-in, but for custom)
  lucide_icons: ^0.3.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  build_runner: ^2.4.0
  riverpod_generator: ^2.3.0
  flutter_lints: ^3.0.0
```

---

## Project Structure

```
lib/
├── main.dart
├── app.dart                    # MaterialApp with theme, router
├── core/
│   ├── theme/
│   │   ├── app_theme.dart      # Material 3 dark theme
│   │   └── colors.dart         # Color constants
│   ├── router/
│   │   └── app_router.dart     # GoRouter configuration
│   └── utils/
│       ├── currency_formatter.dart
│       ├── date_utils.dart
│       └── category_utils.dart
├── features/
│   ├── auth/
│   │   ├── presentation/
│   │   │   └── setup_screen.dart
│   │   └── data/
│   │       └── config_repository.dart
│   ├── splitsight/
│   │   ├── data/
│   │   │   ├── splitwise_api.dart
│   │   │   └── models/
│   │   └── presentation/
│   │       ├── screens/
│   │       └── widgets/
│   └── expensesight/
│       ├── data/
│       │   ├── firestore_service.dart
│       │   └── models/
│       └── presentation/
│           ├── screens/
│           └── widgets/
└── shared/
    └── widgets/
        ├── stat_card.dart
        ├── glass_card.dart
        └── bottom_nav.dart
```

---

## Theme Configuration

### Colors (Material 3 Dark Theme)
```dart
// lib/core/theme/colors.dart
import 'package:flutter/material.dart';

class AppColors {
  // Primary - Teal/Emerald
  static const primary = Color(0xFF14B8A6);      // teal-500
  static const primaryContainer = Color(0xFF0D9488); // teal-600
  static const onPrimary = Colors.white;
  
  // Secondary - Cyan
  static const secondary = Color(0xFF06B6D4);    // cyan-500
  static const secondaryContainer = Color(0xFF0891B2);
  
  // Surface colors (Stone palette)
  static const surface = Color(0xFF0C0A09);       // stone-950
  static const surfaceContainer = Color(0xFF1C1917); // stone-900
  static const surfaceContainerHigh = Color(0xFF292524); // stone-800
  static const surfaceContainerLow = Color(0xFF0A0908);
  
  // Text colors
  static const onSurface = Color(0xFFE7E5E4);     // stone-200
  static const onSurfaceVariant = Color(0xFFA8A29E); // stone-400
  static const outline = Color(0xFF44403C);        // stone-700
  
  // Semantic colors
  static const positive = Color(0xFF10B981);       // emerald-500
  static const negative = Color(0xFFEF4444);       // red-500
  static const warning = Color(0xFFF59E0B);        // amber-500
  
  // Category colors (for charts/badges)
  static const categoryColors = {
    'Groceries': Color(0xFF10B981),    // emerald
    'Transport': Color(0xFF3B82F6),    // blue
    'Food & Dining': Color(0xFFF97316), // orange
    'Rent': Color(0xFF64748B),          // slate
    'Utilities': Color(0xFFEAB308),     // yellow
    'Shopping': Color(0xFFEC4899),      // pink
    'Entertainment': Color(0xFF8B5CF6), // purple
    'Health': Color(0xFFEF4444),        // red
    'Travel': Color(0xFF06B6D4),        // cyan
    'Personal': Color(0xFF6366F1),      // indigo
    'Payments': Color(0xFF14B8A6),      // teal
    'Other': Color(0xFF78716C),         // stone
  };
}
```

### Theme Data
```dart
// lib/core/theme/app_theme.dart
ThemeData get darkTheme => ThemeData(
  useMaterial3: true,
  brightness: Brightness.dark,
  colorScheme: ColorScheme.dark(
    primary: AppColors.primary,
    secondary: AppColors.secondary,
    surface: AppColors.surface,
    // ... complete color scheme
  ),
  scaffoldBackgroundColor: AppColors.surface,
  cardTheme: CardTheme(
    color: AppColors.surfaceContainer,
    elevation: 0,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(16),
      side: BorderSide(color: AppColors.outline.withOpacity(0.5)),
    ),
  ),
  textTheme: GoogleFonts.plusJakartaSansTextTheme().apply(
    bodyColor: AppColors.onSurface,
    displayColor: AppColors.onSurface,
  ),
);
```

---

## Firebase/Firestore Data Models

The app connects to an EXISTING Firestore database. Here are the exact collection paths and document structures:

### Collection Structure
```
expenseSight/                              # Root collection
  └── {userId}/                            # User document (string ID)
      ├── expenses/                        # Sub-collection
      ├── settings/budget                  # Budget settings document
      ├── settings/notifications           # Notification settings
      ├── tags/                            # Custom tags sub-collection
      ├── goals/                           # Savings goals sub-collection
      │   └── {goalId}/contributions/      # Nested contributions
      ├── bills/                           # Recurring bills
      ├── income/                          # Income entries
      └── investments/                     # Investment holdings
          └── {investmentId}/transactions/ # Nested transactions
```

### Dart Models

```dart
// lib/features/expensesight/data/models/expense.dart
import 'package:cloud_firestore/cloud_firestore.dart';

class Expense {
  final String id;
  final String description;
  final double amount;
  final String category;
  final String date;           // "YYYY-MM-DD" format
  final bool isRefund;
  final bool isPending;
  final bool cancelled;
  final List<String> tags;
  final String? userId;
  final Timestamp? createdAt;
  final Timestamp? updatedAt;

  Expense({
    required this.id,
    required this.description,
    required this.amount,
    required this.category,
    required this.date,
    this.isRefund = false,
    this.isPending = false,
    this.cancelled = false,
    this.tags = const [],
    this.userId,
    this.createdAt,
    this.updatedAt,
  });

  factory Expense.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return Expense(
      id: doc.id,
      description: data['description'] ?? '',
      amount: (data['amount'] ?? 0).toDouble(),
      category: data['category'] ?? 'Other',
      date: data['date'] ?? '',
      isRefund: data['isRefund'] ?? false,
      isPending: data['isPending'] ?? false,
      cancelled: data['cancelled'] ?? false,
      tags: List<String>.from(data['tags'] ?? []),
      userId: data['userId'],
      createdAt: data['createdAt'],
      updatedAt: data['updatedAt'],
    );
  }

  Map<String, dynamic> toFirestore() => {
    'id': id,
    'description': description,
    'amount': amount,
    'category': category,
    'date': date,
    'isRefund': isRefund,
    'isPending': isPending,
    'cancelled': cancelled,
    'tags': tags,
    'userId': userId,
    'createdAt': createdAt ?? FieldValue.serverTimestamp(),
    'updatedAt': FieldValue.serverTimestamp(),
  };
}
```

```dart
// lib/features/expensesight/data/models/budget_settings.dart
class BudgetSettings {
  final double monthlyBudget;
  final Map<String, double> categoryBudgets;
  final Timestamp? updatedAt;

  BudgetSettings({
    this.monthlyBudget = 0,
    this.categoryBudgets = const {},
    this.updatedAt,
  });

  factory BudgetSettings.fromFirestore(Map<String, dynamic> data) {
    return BudgetSettings(
      monthlyBudget: (data['monthlyBudget'] ?? 0).toDouble(),
      categoryBudgets: Map<String, double>.from(
        (data['categoryBudgets'] ?? {}).map(
          (k, v) => MapEntry(k, (v ?? 0).toDouble()),
        ),
      ),
      updatedAt: data['updatedAt'],
    );
  }
}
```

```dart
// lib/features/expensesight/data/models/income.dart
class Income {
  final String id;
  final String date;
  final double amount;
  final String source;
  final String category;  // salary, freelance, bonus, gift, interest, dividend, refund, rental, other
  final bool isRecurring;
  final String? notes;
  final List<String> tags;
  final Timestamp? createdAt;
  final Timestamp? updatedAt;

  // ... constructor, fromFirestore, toFirestore
}
```

```dart
// lib/features/expensesight/data/models/investment.dart
class Investment {
  final String id;
  final String name;
  final String type;  // stock, mutual_fund, fd, ppf, nps, crypto, gold, real_estate, epf, bonds, other
  final String? symbol;
  final double units;
  final double avgBuyPrice;
  final double currentPrice;
  final double currentValue;      // Computed: units * currentPrice
  final double totalInvested;     // Computed: units * avgBuyPrice
  final double unrealizedGain;    // Computed: currentValue - totalInvested
  final double gainPercent;
  final String lastUpdated;
  final String? notes;
  final bool isActive;
  final Timestamp? createdAt;
  final Timestamp? updatedAt;

  // ... constructor, fromFirestore, toFirestore
}
```

```dart
// lib/features/expensesight/data/models/goal.dart
class SavingsGoal {
  final String id;
  final String name;
  final double targetAmount;
  final double currentAmount;
  final String? deadline;          // "YYYY-MM-DD"
  final String icon;               // plane, car, home, gift, graduation-cap, heart, smartphone, laptop, piggy-bank, umbrella, briefcase, star
  final String color;              // teal, cyan, emerald, blue, purple, pink, amber, orange, red, indigo, rose, lime
  final int autoAllocatePercent;   // 0 = manual only, >0 = auto from income
  final List<String> linkedIncomeCategories;  // salary, freelance, bonus
  final int priority;              // 1 (highest) to 5 (lowest)
  final String trackingType;       // "savings"
  final bool isActive;
  final Timestamp? createdAt;
  final Timestamp? updatedAt;

  // ... constructor, fromFirestore, toFirestore
}
```

```dart
// lib/features/expensesight/data/models/bill.dart
class Bill {
  final String id;
  final String name;
  final double amount;
  final String category;
  final int dueDay;                // 1-31
  final String frequency;          // monthly, quarterly, yearly, once
  final bool isAutoPay;
  final List<int> reminderDays;    // e.g., [1, 3] for 1 and 3 days before
  final String? lastPaidDate;
  final String nextDueDate;
  final bool isActive;
  final Timestamp? createdAt;
  final Timestamp? updatedAt;

  // ... constructor, fromFirestore, toFirestore
}
```

---

## Splitwise API Integration

### API Client
The app makes direct calls to Splitwise API (no proxy needed for mobile).

```dart
// lib/features/splitsight/data/splitwise_api.dart
import 'package:dio/dio.dart';

class SplitwiseApi {
  static const _baseUrl = 'https://secure.splitwise.com/api/v3.0';
  
  final Dio _dio;
  final String apiKey;

  SplitwiseApi({required this.apiKey}) : _dio = Dio(BaseOptions(
    baseUrl: _baseUrl,
    headers: {'Authorization': 'Bearer $apiKey'},
  ));

  // GET /get_current_user
  Future<Map<String, dynamic>> getCurrentUser() async {
    final response = await _dio.get('/get_current_user');
    return response.data['user'];
  }

  // GET /get_groups
  Future<List<dynamic>> getGroups() async {
    final response = await _dio.get('/get_groups');
    return response.data['groups'] ?? [];
  }

  // GET /get_group/{id}
  Future<Map<String, dynamic>> getGroup(int id) async {
    final response = await _dio.get('/get_group/$id');
    return response.data['group'];
  }

  // GET /get_friends
  Future<List<dynamic>> getFriends() async {
    final response = await _dio.get('/get_friends');
    return response.data['friends'] ?? [];
  }

  // GET /get_expenses with pagination
  Future<List<dynamic>> getExpenses({
    int? groupId,
    int? friendId,
    int limit = 100,
    int offset = 0,
    String? datedAfter,
    String? datedBefore,
  }) async {
    final params = <String, dynamic>{
      'limit': limit,
      'offset': offset,
    };
    if (groupId != null) params['group_id'] = groupId;
    if (friendId != null) params['friend_id'] = friendId;
    if (datedAfter != null) params['dated_after'] = datedAfter;
    if (datedBefore != null) params['dated_before'] = datedBefore;

    final response = await _dio.get('/get_expenses', queryParameters: params);
    return response.data['expenses'] ?? [];
  }

  // Fetch all expenses for a group (paginated)
  Future<List<dynamic>> getAllExpensesForGroup(int groupId) async {
    List<dynamic> allExpenses = [];
    int offset = 0;
    const limit = 100;
    
    while (true) {
      final expenses = await getExpenses(groupId: groupId, limit: limit, offset: offset);
      allExpenses.addAll(expenses);
      if (expenses.length < limit || offset > 5000) break;
      offset += limit;
    }
    
    // Filter out deleted and payment entries
    return allExpenses.where((e) => 
      e['deleted_at'] == null && e['payment'] != true
    ).toList();
  }

  // GET /get_categories
  Future<List<dynamic>> getCategories() async {
    final response = await _dio.get('/get_categories');
    return response.data['categories'] ?? [];
  }

  // POST /create_expense (equal split)
  Future<Map<String, dynamic>> createExpenseEqualSplit({
    required int groupId,
    required double cost,
    required String description,
    String currencyCode = 'INR',
    String? date,
    String? details,
    int? categoryId,
  }) async {
    final response = await _dio.post(
      '/create_expense',
      data: {
        'cost': cost.toString(),
        'description': description,
        'group_id': groupId,
        'currency_code': currencyCode,
        'split_equally': true,
        if (date != null) 'date': date,
        if (details != null) 'details': details,
        if (categoryId != null) 'category_id': categoryId,
      },
      options: Options(contentType: Headers.formUrlEncodedContentType),
    );
    
    if (response.data['errors'] != null && 
        (response.data['errors'] as Map).isNotEmpty) {
      throw Exception(response.data['errors'].values.expand((e) => e).join(', '));
    }
    return response.data['expenses']?[0] ?? response.data;
  }
}
```

---

## Feature Specifications

### Module 1: SplitSight (Splitwise Dashboard)

#### Screens to Implement:

1. **Setup Screen** (`/setup`)
   - Text field for Splitwise API key
   - "Connect" button to validate and save
   - Store API key in SharedPreferences

2. **Dashboard/Overview** (`/splitsight`)
   - Net balance card (total you owe vs owed to you)
   - Recent activity list (last 10 expenses)
   - Quick stats: groups count, friends count
   - Floating action button to add expense

3. **Activity Screen** (`/splitsight/activity`)
   - Paginated expense list
   - Filter by date range
   - Search by description
   - Group expenses by month

4. **Groups Screen** (`/splitsight/groups`)
   - List of all groups with balances
   - Tap to open group detail
   - **Group Detail**: member balances, category breakdown, top expenses

5. **Friends/Balances Screen** (`/splitsight/friends`)
   - List of friends with balance indicators
   - Positive (green) = they owe you
   - Negative (red) = you owe them
   - Visual bar chart of balances

6. **Settle Up Screen** (`/splitsight/settle`)
   - Smart suggestions for settling debts
   - Show who to pay and how much

7. **Add Expense Modal**
   - Group selector dropdown
   - Amount input with currency
   - Description field
   - Date picker
   - Equal split toggle
   - Submit to Splitwise API

### Module 2: ExpenseSight (Personal Tracker)

#### Bottom Navigation Tabs:

1. **Home Tab** (`/expensesight`)
   - Stat cards: This Month total, Daily Average, Total (with refunds excluded)
   - 7-day spending sparkline chart
   - Upcoming bills section (next 3)
   - Recent expenses (last 5)
   - Quick "Add Expense" button

2. **Activity Tab** (`/expensesight/activity`)
   - Full expense list grouped by date (Today, Yesterday, This Week, Older)
   - Search bar (searches description, category, tags)
   - Filter chips: All Time, This Month, Last Month, 7 Days, 30 Days
   - Category quick-filter horizontal scroll
   - Swipe-to-delete with undo snackbar
   - Tap to edit expense

3. **Wealth Tab** (`/expensesight/wealth`) - Sub-navigation with 4 sections:
   
   a. **Overview Sub-tab**
      - Net worth card (investments + savings)
      - Monthly income stat
      - Portfolio value with gain/loss indicator
      - Wealth distribution pie chart
      - Quick action buttons
   
   b. **Income Sub-tab**
      - Add income button
      - Summary cards: Total Income, Average per entry
      - Date filter pills
      - Income list with edit/delete
      - **Add Income Modal**: amount, source, category selector, date, recurring toggle
      - **Auto-allocation modal**: After adding income, suggest allocations to savings goals
   
   c. **Investments Sub-tab**
      - Portfolio summary card (total value, gain/loss %)
      - Asset allocation pie chart
      - Holdings list as expandable cards:
        - Name, type, units, current value
        - Unrealized gain/loss
        - Expand to show: avg buy price, invested amount, update price button, transaction history
      - **Add Investment Modal**: name, type, symbol, units, buy price, current price
      - **Update Price Modal**: quick price update
      - **Transaction History Modal**: list of buy/sell transactions
   
   d. **Savings Sub-tab**
      - Overall progress bar (total saved / total target)
      - Goal cards with:
        - Icon, name, progress bar
        - Current amount / Target amount
        - Quick-add buttons (+₹1K, +₹5K, +₹10K, Custom)
        - Auto-allocation badge if enabled
        - Expand for: contribution history, edit, delete
      - **Create Goal Modal**: name, target, deadline, icon picker, color picker, auto-allocation settings

4. **Bills Tab** (`/expensesight/bills`)
   - Segmented view: List / Calendar
   - List grouped by: Overdue, Due Today, Upcoming, Later
   - Bill cards with: name, amount, due date, auto-pay indicator
   - Mark as paid action
   - **Add/Edit Bill Modal**: name, amount, category, due day, frequency, auto-pay, reminders

5. **Insights Tab** (`/expensesight/insights`)
   - Time filter: All, 30 Days, 90 Days, 6 Months
   - 6-month trend area chart
   - Category breakdown pie chart with legend
   - Day-of-week spending bar chart
   - Top 5 expenses list
   - Month-over-month comparison card

6. **Budget Tab** (accessible from drawer/menu)
   - Budget setup wizard (if not configured):
     - Step 1: Set total monthly budget
     - Step 2: Allocate to categories (sliders)
   - Budget dashboard:
     - Circular progress gauge (spent/budget)
     - Daily/Weekly allowance cards
     - Category budget list with progress bars
     - Needs vs Wants breakdown (50/30/20 rule visualization)
     - Spending pace chart (actual vs ideal line)

7. **Labs Tab** (accessible from drawer)
   - Year in Review stats
   - Spending streaks
   - Data management (clear all data)

---

## Expense Categories

Implement these 12 categories with their colors:

```dart
enum ExpenseCategory {
  groceries('Groceries', Color(0xFF10B981), ['grocery', 'zepto', 'blinkit', 'bigbasket', 'vegetables', 'milk']),
  transport('Transport', Color(0xFF3B82F6), ['cab', 'uber', 'ola', 'auto', 'metro', 'petrol', 'fuel']),
  foodDining('Food & Dining', Color(0xFFF97316), ['zomato', 'swiggy', 'restaurant', 'dinner', 'lunch', 'cafe']),
  rent('Rent', Color(0xFF64748B), ['rent', 'house rent', 'apartment']),
  utilities('Utilities', Color(0xFFEAB308), ['wifi', 'electricity', 'water', 'gas', 'bill', 'recharge']),
  shopping('Shopping', Color(0xFFEC4899), ['amazon', 'flipkart', 'myntra', 'clothes', 'electronics']),
  entertainment('Entertainment', Color(0xFF8B5CF6), ['movie', 'netflix', 'spotify', 'subscription', 'game']),
  health('Health', Color(0xFFEF4444), ['medicine', 'doctor', 'hospital', 'gym', 'pharmacy']),
  travel('Travel', Color(0xFF06B6D4), ['hotel', 'trip', 'vacation', 'booking', 'flight']),
  personal('Personal', Color(0xFF6366F1), ['haircut', 'salon', 'spa', 'grooming']),
  payments('Payments', Color(0xFF14B8A6), ['paid back', 'refund', 'cashback', 'transfer']),
  other('Other', Color(0xFF78716C), []);

  final String label;
  final Color color;
  final List<String> keywords;
  
  const ExpenseCategory(this.label, this.color, this.keywords);
  
  static ExpenseCategory fromDescription(String description) {
    final lower = description.toLowerCase();
    for (final category in values) {
      for (final keyword in category.keywords) {
        if (lower.contains(keyword)) return category;
      }
    }
    return other;
  }
}
```

---

## Navigation Structure

```dart
// lib/core/router/app_router.dart
final router = GoRouter(
  initialLocation: '/setup',
  routes: [
    GoRoute(path: '/setup', builder: (_, __) => const SetupScreen()),
    
    // SplitSight routes
    ShellRoute(
      builder: (_, __, child) => SplitSightShell(child: child),
      routes: [
        GoRoute(path: '/splitsight', builder: (_, __) => const OverviewScreen()),
        GoRoute(path: '/splitsight/activity', builder: (_, __) => const ActivityScreen()),
        GoRoute(path: '/splitsight/groups', builder: (_, __) => const GroupsScreen()),
        GoRoute(path: '/splitsight/groups/:id', builder: (_, state) => GroupDetailScreen(id: state.pathParameters['id']!)),
        GoRoute(path: '/splitsight/friends', builder: (_, __) => const FriendsScreen()),
        GoRoute(path: '/splitsight/settle', builder: (_, __) => const SettleUpScreen()),
      ],
    ),
    
    // ExpenseSight routes (bottom nav shell)
    ShellRoute(
      builder: (_, __, child) => ExpenseSightShell(child: child),
      routes: [
        GoRoute(path: '/expensesight', builder: (_, __) => const HomeTab()),
        GoRoute(path: '/expensesight/activity', builder: (_, __) => const ActivityTab()),
        GoRoute(path: '/expensesight/wealth', builder: (_, __) => const WealthTab()),
        GoRoute(path: '/expensesight/bills', builder: (_, __) => const BillsTab()),
        GoRoute(path: '/expensesight/insights', builder: (_, __) => const InsightsTab()),
      ],
    ),
  ],
);
```

---

## Key Implementation Notes

### 1. Firestore Service Pattern
```dart
class ExpenseSightService {
  final FirebaseFirestore _db = FirebaseFirestore.instance;
  
  CollectionReference _expensesCollection(String userId) =>
    _db.collection('expenseSight').doc(userId).collection('expenses');
  
  // Cache recently fetched data in memory
  final Map<String, dynamic> _cache = {};
  
  Future<List<Expense>> getExpenses(String userId, {bool useCache = true}) async {
    final cacheKey = 'expenses_$userId';
    if (useCache && _cache.containsKey(cacheKey)) {
      return _cache[cacheKey] as List<Expense>;
    }
    
    final snapshot = await _expensesCollection(userId).get();
    final expenses = snapshot.docs.map((d) => Expense.fromFirestore(d)).toList();
    expenses.sort((a, b) => b.date.compareTo(a.date));
    
    _cache[cacheKey] = expenses;
    return expenses;
  }
  
  void invalidateCache(String userId) {
    _cache.removeWhere((key, _) => key.contains(userId));
  }
}
```

### 2. Currency Formatting (Indian Rupees)
```dart
String formatCurrency(double amount, {String currency = 'INR'}) {
  final format = NumberFormat.currency(
    locale: 'en_IN',
    symbol: '₹',
    decimalDigits: 0,
  );
  return format.format(amount);
}

String formatCompact(double amount) {
  if (amount >= 10000000) return '${(amount / 10000000).toStringAsFixed(1)}Cr';
  if (amount >= 100000) return '${(amount / 100000).toStringAsFixed(1)}L';
  if (amount >= 1000) return '${(amount / 1000).toStringAsFixed(1)}K';
  return amount.toStringAsFixed(0);
}
```

### 3. State Management with Riverpod
```dart
// Example: Expenses provider
@riverpod
class ExpensesNotifier extends _$ExpensesNotifier {
  @override
  Future<List<Expense>> build() async {
    final userId = ref.watch(userIdProvider);
    if (userId == null) return [];
    return ref.read(expenseSightServiceProvider).getExpenses(userId);
  }
  
  Future<void> addExpense(Expense expense) async {
    final userId = ref.read(userIdProvider);
    if (userId == null) return;
    
    await ref.read(expenseSightServiceProvider).addExpense(userId, expense);
    ref.invalidateSelf();
  }
}
```

### 4. Charts with fl_chart
Use fl_chart for all visualizations:
- `PieChart` for category breakdown and asset allocation
- `LineChart` for spending trends
- `BarChart` for day-of-week analysis
- Match the dark theme styling

### 5. Form Validation
- Amount fields: positive numbers only
- Date fields: use Flutter's date picker
- Required field indicators
- Error messages below fields

### 6. Error Handling
- Wrap API calls in try-catch
- Show snackbars for errors
- Retry buttons for failed loads
- Offline state detection

---

## Deliverables

Create a fully functional Flutter application with:

1. All screens and features listed above
2. Firebase integration using the existing database structure
3. Splitwise API integration with direct calls
4. Material 3 dark theme matching the color scheme
5. Smooth animations and transitions
6. Proper error handling and loading states
7. Local caching for performance
8. Pull-to-refresh on list screens

The app should feel native on both iOS and Android while maintaining feature parity with the web application.

---

## Testing Checklist

Before delivery, verify:
- [ ] Splitwise API connection works
- [ ] Expenses CRUD operations work with Firestore
- [ ] Income tracking with auto-allocation
- [ ] Investment portfolio calculations
- [ ] Savings goals with contributions
- [ ] Bills with reminders
- [ ] Budget tracking
- [ ] Charts render correctly
- [ ] Navigation between all screens
- [ ] Data persists across app restarts
- [ ] Handles offline gracefully
