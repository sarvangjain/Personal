import 'package:dio/dio.dart';

class SplitwiseApi {
  static const _baseUrl = 'https://secure.splitwise.com/api/v3.0';

  final Dio _dio;
  final String apiKey;

  SplitwiseApi({required this.apiKey})
      : _dio = Dio(BaseOptions(
          baseUrl: _baseUrl,
          headers: {'Authorization': 'Bearer $apiKey'},
          connectTimeout: const Duration(seconds: 30),
          receiveTimeout: const Duration(seconds: 30),
        ));

  Future<Map<String, dynamic>> getCurrentUser() async {
    try {
      final response = await _dio.get('/get_current_user');
      return response.data['user'];
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<List<dynamic>> getGroups() async {
    try {
      final response = await _dio.get('/get_groups');
      return response.data['groups'] ?? [];
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<Map<String, dynamic>> getGroup(int id) async {
    try {
      final response = await _dio.get('/get_group/$id');
      return response.data['group'];
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<List<dynamic>> getFriends() async {
    try {
      final response = await _dio.get('/get_friends');
      return response.data['friends'] ?? [];
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<List<dynamic>> getExpenses({
    int? groupId,
    int? friendId,
    int limit = 100,
    int offset = 0,
    String? datedAfter,
    String? datedBefore,
  }) async {
    try {
      final params = <String, dynamic>{
        'limit': limit,
        'offset': offset,
      };
      if (groupId != null) params['group_id'] = groupId;
      if (friendId != null) params['friend_id'] = friendId;
      if (datedAfter != null) params['dated_after'] = datedAfter;
      if (datedBefore != null) params['dated_before'] = datedBefore;

      final response = await _dio.get('/get_expenses', queryParameters: params);
      return response.data['expenses'] ?? [];
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<List<dynamic>> getAllExpensesForGroup(int groupId) async {
    List<dynamic> allExpenses = [];
    int offset = 0;
    const limit = 100;

    while (true) {
      final expenses =
          await getExpenses(groupId: groupId, limit: limit, offset: offset);
      allExpenses.addAll(expenses);
      if (expenses.length < limit || offset > 5000) break;
      offset += limit;
    }

    return allExpenses
        .where((e) => e['deleted_at'] == null && e['payment'] != true)
        .toList();
  }

  Future<List<dynamic>> getCategories() async {
    try {
      final response = await _dio.get('/get_categories');
      return response.data['categories'] ?? [];
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<Map<String, dynamic>> createExpenseEqualSplit({
    required int groupId,
    required double cost,
    required String description,
    String currencyCode = 'INR',
    String? date,
    String? details,
    int? categoryId,
  }) async {
    try {
      final response = await _dio.post(
        '/create_expense',
        data: {
          'cost': cost.toString(),
          'description': description,
          'group_id': groupId,
          'currency_code': currencyCode,
          'split_equally': true,
          if (date != null) 'date': date,
          if (details != null) 'details': details,
          if (categoryId != null) 'category_id': categoryId,
        },
        options: Options(contentType: Headers.formUrlEncodedContentType),
      );

      if (response.data['errors'] != null &&
          (response.data['errors'] as Map).isNotEmpty) {
        throw Exception(
            response.data['errors'].values.expand((e) => e).join(', '));
      }
      return response.data['expenses']?[0] ?? response.data;
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  String _handleError(DioException e) {
    if (e.response != null) {
      return 'API Error: ${e.response?.statusCode} - ${e.response?.statusMessage}';
    } else if (e.type == DioExceptionType.connectionTimeout) {
      return 'Connection timeout. Please check your internet connection.';
    } else if (e.type == DioExceptionType.receiveTimeout) {
      return 'Server took too long to respond.';
    } else {
      return 'Network error: ${e.message}';
    }
  }
}
