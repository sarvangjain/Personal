import 'package:shared_preferences/shared_preferences.dart';

class StorageMigration {
  static Future<void> migrateToStringTypes() async {
    final prefs = await SharedPreferences.getInstance();
    
    try {
      final userId = prefs.get('user_id');
      if (userId != null && userId is! String) {
        await prefs.remove('user_id');
        await prefs.setString('user_id', userId.toString());
      }
    } catch (e) {
      await prefs.remove('user_id');
    }
    
    try {
      final apiKey = prefs.get('splitwise_api_key');
      if (apiKey != null && apiKey is! String) {
        await prefs.remove('splitwise_api_key');
        await prefs.setString('splitwise_api_key', apiKey.toString());
      }
    } catch (e) {
      await prefs.remove('splitwise_api_key');
    }
  }

  static Future<void> clearAllData() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
  }
  
  static Future<void> forceReset() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
    await prefs.setString('user_id', '51468619');
    await prefs.setString('splitwise_api_key', 'dYnGcaddzTAkSFBEvgMwvW3lDjn8q5uyxDou49e6');
    await prefs.setBool('has_completed_setup', true);
  }
}
