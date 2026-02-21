import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/colors.dart';
import '../../../core/providers/config_providers.dart';

class SetupScreen extends ConsumerStatefulWidget {
  const SetupScreen({super.key});

  @override
  ConsumerState<SetupScreen> createState() => _SetupScreenState();
}

class _SetupScreenState extends ConsumerState<SetupScreen> {
  final _apiKeyController = TextEditingController();
  final _userIdController = TextEditingController();
  bool _isLoading = false;

  @override
  void dispose() {
    _apiKeyController.dispose();
    _userIdController.dispose();
    super.dispose();
  }

  Future<void> _saveAndContinue() async {
    if (_apiKeyController.text.isEmpty || _userIdController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please fill in all fields')),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      final repository = ref.read(configRepositoryProvider);
      await repository.saveSplitwiseApiKey(_apiKeyController.text.trim());
      await repository.saveUserId(_userIdController.text.trim());
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
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Spacer(),
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
                'Let\'s set up your account to get started',
                style: TextStyle(
                  color: AppColors.onSurfaceVariant,
                  fontSize: 16,
                ),
              ),
              const SizedBox(height: 48),
              TextField(
                controller: _userIdController,
                decoration: const InputDecoration(
                  labelText: 'User ID',
                  hintText: 'Enter your user ID for Firebase',
                  prefixIcon: Icon(Icons.person_outline),
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _apiKeyController,
                decoration: const InputDecoration(
                  labelText: 'Splitwise API Key',
                  hintText: 'Enter your Splitwise API key',
                  prefixIcon: Icon(Icons.key),
                ),
                obscureText: true,
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
                          'Continue',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                ),
              ),
              const Spacer(flex: 2),
            ],
          ),
        ),
      ),
    );
  }
}
