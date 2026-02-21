import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../features/auth/data/config_repository.dart';

final configRepositoryProvider = Provider<ConfigRepository>((ref) {
  return ConfigRepository();
});

final splitwiseApiKeyProvider = FutureProvider<String?>((ref) async {
  final repository = ref.watch(configRepositoryProvider);
  return repository.getSplitwiseApiKey();
});

final userIdProvider = FutureProvider<String?>((ref) async {
  final repository = ref.watch(configRepositoryProvider);
  return repository.getUserId();
});

final hasCompletedSetupProvider = FutureProvider<bool>((ref) async {
  final repository = ref.watch(configRepositoryProvider);
  return repository.hasCompletedSetup();
});
