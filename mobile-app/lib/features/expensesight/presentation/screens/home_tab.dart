import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/colors.dart';
import '../../../../core/providers/expensesight_providers.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../../core/utils/date_utils.dart';
import '../../../../shared/widgets/stat_card.dart';
import '../../../../shared/widgets/loading_indicator.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../widgets/add_expense_modal.dart';
import '../widgets/spending_heatmap.dart';

class HomeTab extends ConsumerWidget {
  const HomeTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final expensesAsync = ref.watch(expensesProvider);
    final billsAsync = ref.watch(billsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('ExpenseSight'),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings_outlined),
            onPressed: () {},
          ),
        ],
      ),
      body: expensesAsync.when(
        data: (expenses) {
          final now = DateTime.now();
          final thisMonthExpenses = expenses.where((e) {
            return !e.cancelled &&
                !e.isRefund &&
                AppDateUtils.isThisMonth(e.date);
          }).toList();

          final thisMonthTotal = thisMonthExpenses.fold<double>(
            0.0,
            (double sum, e) => sum + e.amount,
          );

          final daysInMonth = DateTime(now.year, now.month + 1, 0).day;
          final dailyAverage = now.day > 0 ? thisMonthTotal / now.day : 0.0;

          final last7DaysExpenses = expenses.where((e) {
            try {
              final expenseDate = DateTime.parse(e.date);
              final diff = now.difference(expenseDate).inDays;
              return diff >= 0 && diff < 7 && !e.cancelled && !e.isRefund;
            } catch (_) {
              return false;
            }
          }).toList();

          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(expensesProvider);
              ref.invalidate(billsProvider);
            },
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Text(
                  'Overview',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: StatCard(
                        title: 'This Month',
                        value: CurrencyFormatter.formatCurrency(thisMonthTotal),
                        subtitle: AppDateUtils.getCurrentMonth(),
                        icon: Icons.calendar_month,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: StatCard(
                        title: 'Daily Avg',
                        value: CurrencyFormatter.formatCurrency(dailyAverage),
                        subtitle: 'Last ${now.day} days',
                        icon: Icons.show_chart,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                SpendingHeatmap(expenses: expenses),
                const SizedBox(height: 24),
                billsAsync.when(
                  data: (bills) {
                    final upcomingBills = bills
                        .where((b) => !b.isOverdue && b.isActive)
                        .take(3)
                        .toList();

                    if (upcomingBills.isEmpty) {
                      return const SizedBox.shrink();
                    }

                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Upcoming Bills',
                              style: Theme.of(context)
                                  .textTheme
                                  .titleMedium
                                  ?.copyWith(
                                    fontWeight: FontWeight.w600,
                                  ),
                            ),
                            TextButton(
                              onPressed: () {},
                              child: const Text('View All'),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        ...upcomingBills.map((bill) => Card(
                              margin: const EdgeInsets.only(bottom: 8),
                              child: ListTile(
                                leading: CircleAvatar(
                                  backgroundColor:
                                      AppColors.primary.withOpacity(0.1),
                                  child: Icon(
                                    Icons.receipt,
                                    color: AppColors.primary,
                                  ),
                                ),
                                title: Text(bill.name),
                                subtitle: Text(
                                  'Due: ${AppDateUtils.formatDate(bill.nextDueDate)}',
                                ),
                                trailing: Text(
                                  CurrencyFormatter.formatCurrency(bill.amount),
                                  style: TextStyle(
                                    fontWeight: FontWeight.w600,
                                    fontSize: 16,
                                    color: AppColors.onSurface,
                                  ),
                                ),
                              ),
                            )),
                        const SizedBox(height: 24),
                      ],
                    );
                  },
                  loading: () => const SizedBox.shrink(),
                  error: (_, __) => const SizedBox.shrink(),
                ),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Recent Expenses',
                      style:
                          Theme.of(context).textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.w600,
                              ),
                    ),
                    TextButton(
                      onPressed: () {},
                      child: const Text('View All'),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                if (last7DaysExpenses.isEmpty)
                  const EmptyState(
                    icon: Icons.receipt_long,
                    title: 'No recent expenses',
                    subtitle: 'Start tracking by adding your first expense',
                  )
                else
                  ...last7DaysExpenses.take(5).map((expense) => Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: ListTile(
                          leading: CircleAvatar(
                            backgroundColor: AppColors.getCategoryColor(expense.category)
                                .withOpacity(0.2),
                            child: Icon(
                              Icons.shopping_bag,
                              color: AppColors.getCategoryColor(expense.category),
                              size: 20,
                            ),
                          ),
                          title: Text(expense.description),
                          subtitle: Text(
                            '${expense.category} • ${AppDateUtils.formatRelativeDate(expense.date)}',
                          ),
                          trailing: Text(
                            CurrencyFormatter.formatCurrency(expense.amount),
                            style: TextStyle(
                              fontWeight: FontWeight.w600,
                              fontSize: 16,
                              color: AppColors.onSurface,
                            ),
                          ),
                        ),
                      )),
              ],
            ),
          );
        },
        loading: () => const LoadingIndicator(message: 'Loading expenses...'),
        error: (error, stack) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 64, color: Colors.red),
              const SizedBox(height: 16),
              Text('Error: $error'),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => ref.invalidate(expensesProvider),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          showModalBottomSheet(
            context: context,
            isScrollControlled: true,
            backgroundColor: AppColors.surfaceContainer,
            shape: const RoundedRectangleBorder(
              borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
            ),
            builder: (context) => const AddExpenseModal(),
          );
        },
        child: const Icon(Icons.add),
      ),
    );
  }
}
