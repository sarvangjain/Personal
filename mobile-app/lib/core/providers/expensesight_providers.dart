import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../features/expensesight/data/firestore_service.dart';
import '../../features/expensesight/data/models/expense.dart';
import '../../features/expensesight/data/models/income.dart';
import '../../features/expensesight/data/models/investment.dart';
import '../../features/expensesight/data/models/goal.dart';
import '../../features/expensesight/data/models/bill.dart';
import '../../features/expensesight/data/models/budget_settings.dart';
import 'config_providers.dart';

final expenseSightServiceProvider = Provider<ExpenseSightService>((ref) {
  return ExpenseSightService();
});

final expensesProvider = FutureProvider<List<Expense>>((ref) async {
  final userId = await ref.watch(userIdProvider.future);
  if (userId == null) return [];

  final service = ref.watch(expenseSightServiceProvider);
  return service.getExpenses(userId);
});

final incomeProvider = FutureProvider<List<Income>>((ref) async {
  final userId = await ref.watch(userIdProvider.future);
  if (userId == null) return [];

  final service = ref.watch(expenseSightServiceProvider);
  return service.getIncome(userId);
});

final investmentsProvider = FutureProvider<List<Investment>>((ref) async {
  final userId = await ref.watch(userIdProvider.future);
  if (userId == null) return [];

  final service = ref.watch(expenseSightServiceProvider);
  return service.getInvestments(userId);
});

final goalsProvider = FutureProvider<List<SavingsGoal>>((ref) async {
  final userId = await ref.watch(userIdProvider.future);
  if (userId == null) return [];

  final service = ref.watch(expenseSightServiceProvider);
  return service.getGoals(userId);
});

final billsProvider = FutureProvider<List<Bill>>((ref) async {
  final userId = await ref.watch(userIdProvider.future);
  if (userId == null) return [];

  final service = ref.watch(expenseSightServiceProvider);
  return service.getBills(userId);
});

final budgetSettingsProvider = FutureProvider<BudgetSettings?>((ref) async {
  final userId = await ref.watch(userIdProvider.future);
  if (userId == null) return null;

  final service = ref.watch(expenseSightServiceProvider);
  return service.getBudgetSettings(userId);
});
