import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/colors.dart';
import '../../../core/providers/config_providers.dart';

class SetupScreenWeb extends ConsumerStatefulWidget {
  const SetupScreenWeb({super.key});

  @override
  ConsumerState<SetupScreenWeb> createState() => _SetupScreenWebState();
}

class _SetupScreenWebState extends ConsumerState<SetupScreenWeb> {
  final String _userId = '51468619';
  final String _apiKey = 'dYnGcaddzTAkSFBEvgMwvW3lDjn8q5uyxDou49e6';
  bool _isLoading = false;

  Future<void> _saveAndContinue() async {
    if (_userId.isEmpty || _apiKey.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please fill in all fields')),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      final repository = ref.read(configRepositoryProvider);
      await repository.saveSplitwiseApiKey(_apiKey.trim());
      await repository.saveUserId(_userId.trim());
      await repository.setHasCompletedSetup(true);

      if (mounted) {
        context.go('/expensesight');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 500),
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(
                    Icons.account_balance_wallet_rounded,
                    size: 64,
                    color: AppColors.primary,
                  ),
                  const SizedBox(height: 24),
                  Text(
                    'Welcome to\nSplitSight & ExpenseSight',
                    style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                          color: AppColors.onSurface,
                        ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Configuration (pre-filled for testing)',
                    style: TextStyle(
                      color: AppColors.onSurfaceVariant,
                      fontSize: 16,
                    ),
                  ),
                  const SizedBox(height: 48),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'User ID',
                            style: TextStyle(
                              color: AppColors.onSurfaceVariant,
                              fontSize: 12,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            _userId,
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 16),
                          Text(
                            'Splitwise API Key',
                            style: TextStyle(
                              color: AppColors.onSurfaceVariant,
                              fontSize: 12,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '${_apiKey.substring(0, 20)}...',
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 32),
                  SizedBox(
                    width: double.infinity,
                    height: 56,
                    child: ElevatedButton(
                      onPressed: _isLoading ? null : _saveAndContinue,
                      child: _isLoading
                          ? const CircularProgressIndicator()
                          : const Text(
                              'Continue to App',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Center(
                    child: Text(
                      'Pre-configured for web testing',
                      style: TextStyle(
                        color: AppColors.onSurfaceVariant,
                        fontSize: 12,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
