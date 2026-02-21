import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:go_router/go_router.dart';
import '../../features/auth/presentation/setup_screen.dart';
import '../../features/auth/presentation/setup_screen_web.dart';
import '../../features/expensesight/presentation/screens/home_tab.dart';
import '../../features/expensesight/presentation/screens/activity_tab.dart';
import '../../features/expensesight/presentation/screens/wealth_tab.dart';
import '../../features/expensesight/presentation/screens/bills_tab.dart';
import '../../features/expensesight/presentation/screens/insights_tab.dart';
import '../../features/expensesight/presentation/screens/expensesight_shell.dart';

final router = GoRouter(
  initialLocation: kIsWeb ? '/expensesight' : '/setup',
  routes: [
    GoRoute(
      path: '/setup',
      builder: (context, state) => kIsWeb ? const SetupScreenWeb() : const SetupScreen(),
    ),
    ShellRoute(
      builder: (context, state, child) => ExpenseSightShell(child: child),
      routes: [
        GoRoute(
          path: '/expensesight',
          builder: (context, state) => const HomeTab(),
        ),
        GoRoute(
          path: '/expensesight/activity',
          builder: (context, state) => const ActivityTab(),
        ),
        GoRoute(
          path: '/expensesight/wealth',
          builder: (context, state) => const WealthTab(),
        ),
        GoRoute(
          path: '/expensesight/bills',
          builder: (context, state) => const BillsTab(),
        ),
        GoRoute(
          path: '/expensesight/insights',
          builder: (context, state) => const InsightsTab(),
        ),
      ],
    ),
  ],
);
