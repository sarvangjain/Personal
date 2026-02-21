import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/colors.dart';
import '../../../../core/providers/expensesight_providers.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../../core/utils/date_utils.dart';
import '../../../../core/utils/category_utils.dart';
import '../../../../shared/widgets/loading_indicator.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../data/models/expense.dart';
import '../widgets/add_expense_modal.dart';

enum DateFilter { allTime, thisMonth, lastMonth, last7Days, last30Days }

class ActivityTab extends ConsumerStatefulWidget {
  const ActivityTab({super.key});

  @override
  ConsumerState<ActivityTab> createState() => _ActivityTabState();
}

class _ActivityTabState extends ConsumerState<ActivityTab> {
  String _searchQuery = '';
  DateFilter _selectedDateFilter = DateFilter.allTime;
  String? _selectedCategory;

  List<Expense> _filterExpenses(List<Expense> expenses) {
    var filtered = expenses.where((e) => !e.cancelled).toList();

    if (_searchQuery.isNotEmpty) {
      filtered = filtered.where((e) {
        final query = _searchQuery.toLowerCase();
        return e.description.toLowerCase().contains(query) ||
            e.category.toLowerCase().contains(query) ||
            e.tags.any((tag) => tag.toLowerCase().contains(query));
      }).toList();
    }

    if (_selectedCategory != null) {
      filtered = filtered.where((e) => e.category == _selectedCategory).toList();
    }

    final now = DateTime.now();
    switch (_selectedDateFilter) {
      case DateFilter.thisMonth:
        filtered = filtered.where((e) => AppDateUtils.isThisMonth(e.date)).toList();
        break;
      case DateFilter.lastMonth:
        final lastMonth = DateTime(now.year, now.month - 1);
        filtered = filtered.where((e) {
          try {
            final date = DateTime.parse(e.date);
            return date.year == lastMonth.year && date.month == lastMonth.month;
          } catch (_) {
            return false;
          }
        }).toList();
        break;
      case DateFilter.last7Days:
        filtered = filtered.where((e) {
          try {
            final date = DateTime.parse(e.date);
            return now.difference(date).inDays < 7;
          } catch (_) {
            return false;
          }
        }).toList();
        break;
      case DateFilter.last30Days:
        filtered = filtered.where((e) {
          try {
            final date = DateTime.parse(e.date);
            return now.difference(date).inDays < 30;
          } catch (_) {
            return false;
          }
        }).toList();
        break;
      case DateFilter.allTime:
        break;
    }

    return filtered;
  }

  @override
  Widget build(BuildContext context) {
    final expensesAsync = ref.watch(expensesProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Activity'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.invalidate(expensesProvider),
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                TextField(
                  decoration: InputDecoration(
                    hintText: 'Search expenses...',
                    prefixIcon: const Icon(Icons.search),
                    suffixIcon: _searchQuery.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear),
                            onPressed: () => setState(() => _searchQuery = ''),
                          )
                        : null,
                  ),
                  onChanged: (value) => setState(() => _searchQuery = value),
                ),
                const SizedBox(height: 12),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildFilterChip('All Time', DateFilter.allTime),
                      const SizedBox(width: 8),
                      _buildFilterChip('This Month', DateFilter.thisMonth),
                      const SizedBox(width: 8),
                      _buildFilterChip('Last Month', DateFilter.lastMonth),
                      const SizedBox(width: 8),
                      _buildFilterChip('Last 7 Days', DateFilter.last7Days),
                      const SizedBox(width: 8),
                      _buildFilterChip('Last 30 Days', DateFilter.last30Days),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildCategoryChip('All', null),
                      const SizedBox(width: 8),
                      ...ExpenseCategory.allLabels.map((category) => Padding(
                            padding: const EdgeInsets.only(right: 8),
                            child: _buildCategoryChip(category, category),
                          )),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: expensesAsync.when(
              data: (expenses) {
                final filteredExpenses = _filterExpenses(expenses);

                if (filteredExpenses.isEmpty) {
                  return EmptyState(
                    icon: Icons.receipt_long_outlined,
                    title: _searchQuery.isNotEmpty
                        ? 'No expenses found'
                        : 'No expenses yet',
                    subtitle: _searchQuery.isNotEmpty
                        ? 'Try adjusting your filters'
                        : 'Start tracking by adding your first expense',
                  );
                }

                final groupedExpenses = <String, List<Expense>>{};
                for (final expense in filteredExpenses) {
                  final key = AppDateUtils.formatRelativeDate(expense.date);
                  groupedExpenses.putIfAbsent(key, () => []);
                  groupedExpenses[key]!.add(expense);
                }

                return RefreshIndicator(
                  onRefresh: () async {
                    ref.invalidate(expensesProvider);
                  },
                  child: ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: groupedExpenses.length,
                    itemBuilder: (context, index) {
                      final dateKey = groupedExpenses.keys.elementAt(index);
                      final dayExpenses = groupedExpenses[dateKey]!;

                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Padding(
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            child: Text(
                              dateKey,
                              style: TextStyle(
                                color: AppColors.onSurfaceVariant,
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                          ...dayExpenses.map((expense) => _buildExpenseCard(expense)),
                        ],
                      );
                    },
                  ),
                );
              },
              loading: () => const LoadingIndicator(message: 'Loading activity...'),
              error: (error, stack) => Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.error_outline, size: 64, color: Colors.red),
                    const SizedBox(height: 16),
                    Text('Error: $error'),
                  ],
                ),
              ),
            ),
          ),
        ],
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

  Widget _buildFilterChip(String label, DateFilter filter) {
    final isSelected = _selectedDateFilter == filter;
    return FilterChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (selected) {
        setState(() => _selectedDateFilter = filter);
      },
      backgroundColor: AppColors.surfaceContainer,
      selectedColor: AppColors.primary.withOpacity(0.2),
      checkmarkColor: AppColors.primary,
      labelStyle: TextStyle(
        color: isSelected ? AppColors.primary : AppColors.onSurface,
        fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
      ),
      side: BorderSide(
        color: isSelected ? AppColors.primary : AppColors.outline,
      ),
    );
  }

  Widget _buildCategoryChip(String label, String? category) {
    final isSelected = _selectedCategory == category;
    return FilterChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (selected) {
        setState(() => _selectedCategory = selected ? category : null);
      },
      backgroundColor: category != null
          ? AppColors.getCategoryColor(category).withOpacity(0.1)
          : AppColors.surfaceContainer,
      selectedColor: category != null
          ? AppColors.getCategoryColor(category).withOpacity(0.3)
          : AppColors.primary.withOpacity(0.2),
      checkmarkColor:
          category != null ? AppColors.getCategoryColor(category) : AppColors.primary,
      labelStyle: TextStyle(
        color: isSelected
            ? (category != null ? AppColors.getCategoryColor(category) : AppColors.primary)
            : AppColors.onSurface,
        fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
      ),
      side: BorderSide(
        color: isSelected
            ? (category != null ? AppColors.getCategoryColor(category) : AppColors.primary)
            : AppColors.outline,
      ),
    );
  }

  Widget _buildExpenseCard(Expense expense) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Dismissible(
        key: Key(expense.id),
        background: Container(
          decoration: BoxDecoration(
            color: AppColors.negative,
            borderRadius: BorderRadius.circular(16),
          ),
          alignment: Alignment.centerRight,
          padding: const EdgeInsets.only(right: 20),
          child: const Icon(
            Icons.delete,
            color: Colors.white,
          ),
        ),
        direction: DismissDirection.endToStart,
        confirmDismiss: (direction) async {
          return await showDialog<bool>(
            context: context,
            builder: (context) => AlertDialog(
              title: const Text('Delete Expense'),
              content: Text('Delete "${expense.description}"?'),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(context).pop(false),
                  child: const Text('Cancel'),
                ),
                TextButton(
                  onPressed: () => Navigator.of(context).pop(true),
                  child: const Text('Delete'),
                ),
              ],
            ),
          );
        },
        onDismissed: (direction) async {
          final userId = await ref.read(userIdProvider.future) as String?;
          if (userId != null) {
            await ref.read(expenseSightServiceProvider).deleteExpense(userId, expense.id);
            ref.invalidate(expensesProvider);
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Deleted ${expense.description}'),
                  action: SnackBarAction(
                    label: 'Undo',
                    onPressed: () {},
                  ),
                ),
              );
            }
          }
        },
        child: ListTile(
          leading: CircleAvatar(
            backgroundColor: AppColors.getCategoryColor(expense.category).withOpacity(0.2),
            child: Icon(
              Icons.shopping_bag,
              color: AppColors.getCategoryColor(expense.category),
              size: 20,
            ),
          ),
          title: Text(expense.description),
          subtitle: Text(expense.category),
          trailing: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                CurrencyFormatter.formatCurrency(expense.amount),
                style: TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 16,
                  color: expense.isRefund ? AppColors.positive : AppColors.onSurface,
                ),
              ),
              if (expense.isPending)
                Text(
                  'Pending',
                  style: TextStyle(
                    fontSize: 12,
                    color: AppColors.warning,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
