import 'package:cloud_firestore/cloud_firestore.dart';
import '../../../../core/utils/type_converters.dart';

class Income {
  final String id;
  final String date;
  final double amount;
  final String source;
  final String category;
  final bool isRecurring;
  final String? notes;
  final List<String> tags;
  final Timestamp? createdAt;
  final Timestamp? updatedAt;

  Income({
    required this.id,
    required this.date,
    required this.amount,
    required this.source,
    required this.category,
    this.isRecurring = false,
    this.notes,
    this.tags = const [],
    this.createdAt,
    this.updatedAt,
  });

  factory Income.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return Income(
      id: doc.id,
      date: TypeConverters.toStringOrEmpty(data['date']),
      amount: TypeConverters.toDouble(data['amount']),
      source: TypeConverters.toStringOrEmpty(data['source']),
      category: TypeConverters.toStringOrEmpty(data['category']) == '' 
          ? 'other' 
          : TypeConverters.toStringOrEmpty(data['category']),
      isRecurring: TypeConverters.toBool(data['isRecurring']),
      notes: TypeConverters.toStringOrNull(data['notes']),
      tags: (data['tags'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      createdAt: data['createdAt'] as Timestamp?,
      updatedAt: data['updatedAt'] as Timestamp?,
    );
  }

  Map<String, dynamic> toFirestore() => {
        'id': id,
        'date': date,
        'amount': amount,
        'source': source,
        'category': category,
        'isRecurring': isRecurring,
        'notes': notes,
        'tags': tags,
        'createdAt': createdAt ?? FieldValue.serverTimestamp(),
        'updatedAt': FieldValue.serverTimestamp(),
      };

  Income copyWith({
    String? id,
    String? date,
    double? amount,
    String? source,
    String? category,
    bool? isRecurring,
    String? notes,
    List<String>? tags,
    Timestamp? createdAt,
    Timestamp? updatedAt,
  }) {
    return Income(
      id: id ?? this.id,
      date: date ?? this.date,
      amount: amount ?? this.amount,
      source: source ?? this.source,
      category: category ?? this.category,
      isRecurring: isRecurring ?? this.isRecurring,
      notes: notes ?? this.notes,
      tags: tags ?? this.tags,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}

class IncomeCategory {
  static const salary = 'salary';
  static const freelance = 'freelance';
  static const bonus = 'bonus';
  static const gift = 'gift';
  static const interest = 'interest';
  static const dividend = 'dividend';
  static const refund = 'refund';
  static const rental = 'rental';
  static const other = 'other';

  static const List<String> all = [
    salary,
    freelance,
    bonus,
    gift,
    interest,
    dividend,
    refund,
    rental,
    other,
  ];

  static String getDisplayName(String category) {
    switch (category) {
      case salary:
        return 'Salary';
      case freelance:
        return 'Freelance';
      case bonus:
        return 'Bonus';
      case gift:
        return 'Gift';
      case interest:
        return 'Interest';
      case dividend:
        return 'Dividend';
      case refund:
        return 'Refund';
      case rental:
        return 'Rental';
      default:
        return 'Other';
    }
  }
}
