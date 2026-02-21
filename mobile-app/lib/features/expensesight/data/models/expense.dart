import 'package:cloud_firestore/cloud_firestore.dart';
import '../../../../core/utils/type_converters.dart';

class Expense {
  final String id;
  final String description;
  final double amount;
  final String category;
  final String date;
  final bool isRefund;
  final bool isPending;
  final bool cancelled;
  final List<String> tags;
  final String? userId;
  final Timestamp? createdAt;
  final Timestamp? updatedAt;

  Expense({
    required this.id,
    required this.description,
    required this.amount,
    required this.category,
    required this.date,
    this.isRefund = false,
    this.isPending = false,
    this.cancelled = false,
    this.tags = const [],
    this.userId,
    this.createdAt,
    this.updatedAt,
  });

  factory Expense.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return Expense(
      id: doc.id,
      description: TypeConverters.toStringOrEmpty(data['description']),
      amount: TypeConverters.toDouble(data['amount']),
      category: TypeConverters.toStringOrEmpty(data['category']) == '' 
          ? 'Other' 
          : TypeConverters.toStringOrEmpty(data['category']),
      date: TypeConverters.toStringOrEmpty(data['date']),
      isRefund: TypeConverters.toBool(data['isRefund']),
      isPending: TypeConverters.toBool(data['isPending']),
      cancelled: TypeConverters.toBool(data['cancelled']),
      tags: (data['tags'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      userId: TypeConverters.toStringOrNull(data['userId']),
      createdAt: data['createdAt'] as Timestamp?,
      updatedAt: data['updatedAt'] as Timestamp?,
    );
  }

  Map<String, dynamic> toFirestore() => {
        'id': id,
        'description': description,
        'amount': amount,
        'category': category,
        'date': date,
        'isRefund': isRefund,
        'isPending': isPending,
        'cancelled': cancelled,
        'tags': tags,
        'userId': userId,
        'createdAt': createdAt ?? FieldValue.serverTimestamp(),
        'updatedAt': FieldValue.serverTimestamp(),
      };

  Expense copyWith({
    String? id,
    String? description,
    double? amount,
    String? category,
    String? date,
    bool? isRefund,
    bool? isPending,
    bool? cancelled,
    List<String>? tags,
    String? userId,
    Timestamp? createdAt,
    Timestamp? updatedAt,
  }) {
    return Expense(
      id: id ?? this.id,
      description: description ?? this.description,
      amount: amount ?? this.amount,
      category: category ?? this.category,
      date: date ?? this.date,
      isRefund: isRefund ?? this.isRefund,
      isPending: isPending ?? this.isPending,
      cancelled: cancelled ?? this.cancelled,
      tags: tags ?? this.tags,
      userId: userId ?? this.userId,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
