import 'package:flutter/material.dart';
import '../../../../core/theme/colors.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../data/models/expense.dart';

class SpendingHeatmap extends StatelessWidget {
  final List<Expense> expenses;

  const SpendingHeatmap({super.key, required this.expenses});

  @override
  Widget build(BuildContext context) {
    final dayTotals = <String, double>{};
    
    for (final expense in expenses) {
      if (!expense.cancelled && !expense.isRefund) {
        dayTotals[expense.date] = (dayTotals[expense.date] ?? 0) + expense.amount;
      }
    }

    final sortedDays = dayTotals.entries.toList()
      ..sort((a, b) => a.key.compareTo(b.key));

    if (sortedDays.isEmpty) {
      return const SizedBox.shrink();
    }

    final maxAmount = dayTotals.values.reduce((a, b) => a > b ? a : b);
    final last30Days = sortedDays.length > 30 
        ? sortedDays.sublist(sortedDays.length - 30) 
        : sortedDays;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Spending Heatmap',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                ),
                Text(
                  'Last ${last30Days.length} days',
                  style: TextStyle(
                    color: AppColors.onSurfaceVariant,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            SizedBox(
              height: 100,
              child: GridView.builder(
                scrollDirection: Axis.horizontal,
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 7,
                  mainAxisSpacing: 4,
                  crossAxisSpacing: 4,
                ),
                itemCount: last30Days.length,
                itemBuilder: (context, index) {
                  final entry = last30Days[index];
                  final intensity = entry.value / maxAmount;
                  
                  return Tooltip(
                    message: '${entry.key}\n${CurrencyFormatter.formatCurrency(entry.value)}',
                    child: Container(
                      decoration: BoxDecoration(
                        color: _getHeatmapColor(intensity),
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Low',
                  style: TextStyle(
                    color: AppColors.onSurfaceVariant,
                    fontSize: 10,
                  ),
                ),
                Row(
                  children: List.generate(5, (index) {
                    return Container(
                      width: 12,
                      height: 12,
                      margin: const EdgeInsets.only(left: 4),
                      decoration: BoxDecoration(
                        color: _getHeatmapColor((index + 1) / 5),
                        borderRadius: BorderRadius.circular(2),
                      ),
                    );
                  }),
                ),
                Text(
                  'High',
                  style: TextStyle(
                    color: AppColors.onSurfaceVariant,
                    fontSize: 10,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Color _getHeatmapColor(double intensity) {
    if (intensity < 0.2) {
      return AppColors.surfaceContainerHigh;
    } else if (intensity < 0.4) {
      return AppColors.primary.withOpacity(0.3);
    } else if (intensity < 0.6) {
      return AppColors.primary.withOpacity(0.5);
    } else if (intensity < 0.8) {
      return AppColors.primary.withOpacity(0.7);
    } else {
      return AppColors.primary;
    }
  }
}
