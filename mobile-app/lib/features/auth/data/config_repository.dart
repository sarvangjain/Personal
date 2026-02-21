import 'package:shared_preferences/shared_preferences.dart';

class ConfigRepository {
  static const _splitwiseApiKeyKey = 'splitwise_api_key';
  static const _userIdKey = 'user_id';
  static const _hasCompletedSetupKey = 'has_completed_setup';

  Future<void> saveSplitwiseApiKey(String apiKey) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_splitwiseApiKeyKey);
    await prefs.setString(_splitwiseApiKeyKey, apiKey);
  }

  Future<String?> getSplitwiseApiKey() async {
    final prefs = await SharedPreferences.getInstance();
    final value = prefs.get(_splitwiseApiKeyKey);
    if (value == null) return null;
    if (value is int) {
      await prefs.remove(_splitwiseApiKeyKey);
      await prefs.setString(_splitwiseApiKeyKey, value.toString());
      return value.toString();
    }
    return value.toString();
  }

  Future<void> saveUserId(String userId) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_userIdKey);
    await prefs.setString(_userIdKey, userId);
  }

  Future<String?> getUserId() async {
    final prefs = await SharedPreferences.getInstance();
    final value = prefs.get(_userIdKey);
    if (value == null) return null;
    if (value is int) {
      await prefs.remove(_userIdKey);
      await prefs.setString(_userIdKey, value.toString());
      return value.toString();
    }
    return value.toString();
  }

  Future<void> setHasCompletedSetup(bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_hasCompletedSetupKey, value);
  }

  Future<bool> hasCompletedSetup() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_hasCompletedSetupKey) ?? false;
  }

  Future<void> clearAll() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
  }
}
