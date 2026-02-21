import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/colors.dart';
import '../../../../core/providers/expensesight_providers.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../../shared/widgets/stat_card.dart';
import '../../../../shared/widgets/loading_indicator.dart';
import '../../../../shared/widgets/empty_state.dart';

class WealthTab extends ConsumerWidget {
  const WealthTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final incomeAsync = ref.watch(incomeProvider);
    final investmentsAsync = ref.watch(investmentsProvider);
    final goalsAsync = ref.watch(goalsProvider);

    return DefaultTabController(
      length: 4,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Wealth'),
          bottom: const TabBar(
            isScrollable: true,
            tabs: [
              Tab(text: 'Overview'),
              Tab(text: 'Income'),
              Tab(text: 'Investments'),
              Tab(text: 'Savings'),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            _buildOverviewTab(
                context, ref, incomeAsync, investmentsAsync, goalsAsync),
            _buildIncomeTab(context, ref, incomeAsync),
            _buildInvestmentsTab(context, ref, investmentsAsync),
            _buildSavingsTab(context, ref, goalsAsync),
          ],
        ),
      ),
    );
  }

  Widget _buildOverviewTab(
    BuildContext context,
    WidgetRef ref,
    AsyncValue incomeAsync,
    AsyncValue investmentsAsync,
    AsyncValue goalsAsync,
  ) {
    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(incomeProvider);
        ref.invalidate(investmentsProvider);
        ref.invalidate(goalsProvider);
      },
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          investmentsAsync.when(
            data: (investments) {
              final totalValue = investments.fold<double>(
                0.0,
                (double sum, inv) => sum + inv.currentValue,
              );
              final totalInvested = investments.fold<double>(
                0.0,
                (double sum, inv) => sum + inv.totalInvested,
              );
              final totalGain = totalValue - totalInvested;

              return Column(
                children: [
                  StatCard(
                    title: 'Portfolio Value',
                    value: CurrencyFormatter.formatCurrency(totalValue),
                    subtitle:
                        '${totalGain >= 0 ? '+' : ''}${CurrencyFormatter.formatCurrency(totalGain)} (${totalInvested > 0 ? (totalGain / totalInvested * 100).toStringAsFixed(1) : 0}%)',
                    icon: Icons.trending_up,
                    color: totalGain >= 0 ? AppColors.positive : AppColors.negative,
                  ),
                  const SizedBox(height: 16),
                ],
              );
            },
            loading: () => const LoadingIndicator(),
            error: (_, __) => const SizedBox.shrink(),
          ),
          incomeAsync.when(
            data: (income) {
              final thisMonthIncome = income.where((i) {
                final date = DateTime.tryParse(i.date);
                if (date == null) return false;
                final now = DateTime.now();
                return date.year == now.year && date.month == now.month;
              }).fold<double>(0.0, (double sum, i) => sum + i.amount);

              return Row(
                children: [
                  Expanded(
                    child: StatCard(
                      title: 'Monthly Income',
                      value: CurrencyFormatter.formatCurrency(thisMonthIncome),
                      icon: Icons.attach_money,
                      color: AppColors.positive,
                    ),
                  ),
                ],
              );
            },
            loading: () => const SizedBox.shrink(),
            error: (_, __) => const SizedBox.shrink(),
          ),
          const SizedBox(height: 24),
          Text(
            'Quick Actions',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () {},
                  icon: const Icon(Icons.add),
                  label: const Text('Add Income'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () {},
                  icon: const Icon(Icons.add),
                  label: const Text('Add Investment'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildIncomeTab(
      BuildContext context, WidgetRef ref, AsyncValue incomeAsync) {
    return incomeAsync.when(
      data: (income) {
        if (income.isEmpty) {
          return const EmptyState(
            icon: Icons.attach_money,
            title: 'No income recorded',
            subtitle: 'Start tracking your income sources',
          );
        }

        return RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(incomeProvider);
          },
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: income.length,
            itemBuilder: (context, index) {
              final item = income[index];
              return Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: AppColors.positive.withOpacity(0.2),
                    child: Icon(Icons.arrow_downward, color: AppColors.positive),
                  ),
                  title: Text(item.source),
                  subtitle: Text('${item.category} • ${item.date}'),
                  trailing: Text(
                    CurrencyFormatter.formatCurrency(item.amount),
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 16,
                      color: AppColors.positive,
                    ),
                  ),
                ),
              );
            },
          ),
        );
      },
      loading: () => const LoadingIndicator(message: 'Loading income...'),
      error: (error, stack) => Center(child: Text('Error: $error')),
    );
  }

  Widget _buildInvestmentsTab(
      BuildContext context, WidgetRef ref, AsyncValue investmentsAsync) {
    return investmentsAsync.when(
      data: (investments) {
        if (investments.isEmpty) {
          return const EmptyState(
            icon: Icons.show_chart,
            title: 'No investments',
            subtitle: 'Start building your investment portfolio',
          );
        }

        return RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(investmentsProvider);
          },
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: investments.length,
            itemBuilder: (context, index) {
              final investment = investments[index];
              final isGain = investment.unrealizedGain >= 0;

              return Card(
                margin: const EdgeInsets.only(bottom: 12),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  investment.name,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w600,
                                    fontSize: 16,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  investment.type,
                                  style: TextStyle(
                                    color: AppColors.onSurfaceVariant,
                                    fontSize: 12,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(
                                CurrencyFormatter.formatCurrency(
                                    investment.currentValue),
                                style: const TextStyle(
                                  fontWeight: FontWeight.w700,
                                  fontSize: 18,
                                ),
                              ),
                              Text(
                                '${isGain ? '+' : ''}${CurrencyFormatter.formatCurrency(investment.unrealizedGain)}',
                                style: TextStyle(
                                  color: isGain
                                      ? AppColors.positive
                                      : AppColors.negative,
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        );
      },
      loading: () =>
          const LoadingIndicator(message: 'Loading investments...'),
      error: (error, stack) => Center(child: Text('Error: $error')),
    );
  }

  Widget _buildSavingsTab(
      BuildContext context, WidgetRef ref, AsyncValue goalsAsync) {
    return goalsAsync.when(
      data: (goals) {
        if (goals.isEmpty) {
          return const EmptyState(
            icon: Icons.savings_outlined,
            title: 'No savings goals',
            subtitle: 'Create your first savings goal',
          );
        }

        return RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(goalsProvider);
          },
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: goals.length,
            itemBuilder: (context, index) {
              final goal = goals[index];
              final progress = goal.progress.clamp(0.0, 1.0);

              return Card(
                margin: const EdgeInsets.only(bottom: 12),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            goal.name,
                            style: const TextStyle(
                              fontWeight: FontWeight.w600,
                              fontSize: 16,
                            ),
                          ),
                          Text(
                            '${(progress * 100).toStringAsFixed(0)}%',
                            style: TextStyle(
                              color: AppColors.primary,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      LinearProgressIndicator(
                        value: progress,
                        backgroundColor: AppColors.surfaceContainerHigh,
                        color: AppColors.primary,
                      ),
                      const SizedBox(height: 12),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            CurrencyFormatter.formatCurrency(
                                goal.currentAmount),
                            style: TextStyle(
                              color: AppColors.onSurfaceVariant,
                              fontSize: 14,
                            ),
                          ),
                          Text(
                            'Target: ${CurrencyFormatter.formatCurrency(goal.targetAmount)}',
                            style: TextStyle(
                              color: AppColors.onSurfaceVariant,
                              fontSize: 14,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        );
      },
      loading: () => const LoadingIndicator(message: 'Loading goals...'),
      error: (error, stack) => Center(child: Text('Error: $error')),
    );
  }
}
