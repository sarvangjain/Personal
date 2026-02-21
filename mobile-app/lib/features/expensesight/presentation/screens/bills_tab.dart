import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/colors.dart';
import '../../../../core/providers/expensesight_providers.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../../core/utils/date_utils.dart';
import '../../../../shared/widgets/loading_indicator.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../data/models/bill.dart';

class BillsTab extends ConsumerWidget {
  const BillsTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final billsAsync = ref.watch(billsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Bills'),
        actions: [
          IconButton(
            icon: const Icon(Icons.calendar_view_month),
            onPressed: () {},
          ),
        ],
      ),
      body: billsAsync.when(
        data: (bills) {
          if (bills.isEmpty) {
            return const EmptyState(
              icon: Icons.receipt_long_outlined,
              title: 'No bills',
              subtitle: 'Add your recurring bills to track them',
            );
          }

          final overdueBills =
              bills.where((b) => b.isOverdue && b.isActive).toList();
          final dueTodayBills =
              bills.where((b) => b.isDueToday && b.isActive).toList();
          final upcomingBills = bills
              .where((b) => !b.isOverdue && !b.isDueToday && b.isActive)
              .toList();

          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(billsProvider);
            },
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (overdueBills.isNotEmpty) ...[
                  _buildSectionHeader('Overdue', AppColors.negative),
                  ...overdueBills.map((bill) => _buildBillCard(bill, true)),
                  const SizedBox(height: 16),
                ],
                if (dueTodayBills.isNotEmpty) ...[
                  _buildSectionHeader('Due Today', AppColors.warning),
                  ...dueTodayBills.map((bill) => _buildBillCard(bill, false)),
                  const SizedBox(height: 16),
                ],
                if (upcomingBills.isNotEmpty) ...[
                  _buildSectionHeader('Upcoming', AppColors.onSurfaceVariant),
                  ...upcomingBills.map((bill) => _buildBillCard(bill, false)),
                ],
              ],
            ),
          );
        },
        loading: () => const LoadingIndicator(message: 'Loading bills...'),
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
      floatingActionButton: FloatingActionButton(
        onPressed: () {},
        child: const Icon(Icons.add),
      ),
    );
  }

  Widget _buildSectionHeader(String title, Color color) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Container(
            width: 4,
            height: 20,
            decoration: BoxDecoration(
              color: color,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(width: 8),
          Text(
            title,
            style: TextStyle(
              color: color,
              fontSize: 14,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBillCard(Bill bill, bool isOverdue) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: isOverdue
              ? AppColors.negative.withOpacity(0.2)
              : AppColors.primary.withOpacity(0.2),
          child: Icon(
            Icons.receipt,
            color: isOverdue ? AppColors.negative : AppColors.primary,
          ),
        ),
        title: Text(bill.name),
        subtitle: Text(
          'Due: ${AppDateUtils.formatDate(bill.nextDueDate)}${bill.isAutoPay ? ' • Auto-pay' : ''}',
        ),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              CurrencyFormatter.formatCurrency(bill.amount),
              style: TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 16,
                color: isOverdue ? AppColors.negative : AppColors.onSurface,
              ),
            ),
            if (isOverdue)
              Text(
                'OVERDUE',
                style: TextStyle(
                  fontSize: 10,
                  color: AppColors.negative,
                  fontWeight: FontWeight.w600,
                ),
              ),
          ],
        ),
      ),
    );
  }
}
