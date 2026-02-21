import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../features/splitsight/data/splitwise_api.dart';
import 'config_providers.dart';

final splitwiseApiProvider = Provider<SplitwiseApi?>((ref) {
  final apiKeyAsync = ref.watch(splitwiseApiKeyProvider);
  return apiKeyAsync.when(
    data: (apiKey) => apiKey != null ? SplitwiseApi(apiKey: apiKey) : null,
    loading: () => null,
    error: (_, __) => null,
  );
});

final splitwiseCurrentUserProvider = FutureProvider<Map<String, dynamic>?>((ref) async {
  final api = ref.watch(splitwiseApiProvider);
  if (api == null) return null;
  try {
    return await api.getCurrentUser();
  } catch (e) {
    return null;
  }
});

final splitwiseGroupsProvider = FutureProvider<List<dynamic>>((ref) async {
  final api = ref.watch(splitwiseApiProvider);
  if (api == null) return [];
  try {
    return await api.getGroups();
  } catch (e) {
    return [];
  }
});

final splitwiseFriendsProvider = FutureProvider<List<dynamic>>((ref) async {
  final api = ref.watch(splitwiseApiProvider);
  if (api == null) return [];
  try {
    return await api.getFriends();
  } catch (e) {
    return [];
  }
});
