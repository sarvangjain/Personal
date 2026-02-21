import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../shared/widgets/bottom_nav.dart';

class ExpenseSightShell extends StatefulWidget {
  final Widget child;

  const ExpenseSightShell({super.key, required this.child});

  @override
  State<ExpenseSightShell> createState() => _ExpenseSightShellState();
}

class _ExpenseSightShellState extends State<ExpenseSightShell> {
  int _currentIndex = 0;

  final List<BottomNavItem> _navItems = const [
    BottomNavItem(
      icon: Icons.home_outlined,
      selectedIcon: Icons.home,
      label: 'Home',
      route: '/expensesight',
    ),
    BottomNavItem(
      icon: Icons.receipt_long_outlined,
      selectedIcon: Icons.receipt_long,
      label: 'Activity',
      route: '/expensesight/activity',
    ),
    BottomNavItem(
      icon: Icons.account_balance_wallet_outlined,
      selectedIcon: Icons.account_balance_wallet,
      label: 'Wealth',
      route: '/expensesight/wealth',
    ),
    BottomNavItem(
      icon: Icons.calendar_today_outlined,
      selectedIcon: Icons.calendar_today,
      label: 'Bills',
      route: '/expensesight/bills',
    ),
    BottomNavItem(
      icon: Icons.insights_outlined,
      selectedIcon: Icons.insights,
      label: 'Insights',
      route: '/expensesight/insights',
    ),
  ];

  void _onNavTap(int index) {
    setState(() => _currentIndex = index);
    context.go(_navItems[index].route);
  }

  @override
  Widget build(BuildContext context) {
    final currentPath = GoRouterState.of(context).uri.path;
    final currentIndex = _navItems.indexWhere((item) => item.route == currentPath);
    if (currentIndex != -1 && currentIndex != _currentIndex) {
      _currentIndex = currentIndex;
    }

    return Scaffold(
      body: widget.child,
      bottomNavigationBar: CustomBottomNav(
        currentIndex: _currentIndex,
        items: _navItems,
        onTap: _onNavTap,
      ),
    );
  }
}
