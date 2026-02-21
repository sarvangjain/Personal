import 'package:cloud_firestore/cloud_firestore.dart';
import '../../../../core/utils/type_converters.dart';

class Bill {
  final String id;
  final String name;
  final double amount;
  final String category;
  final int dueDay;
  final String frequency;
  final bool isAutoPay;
  final List<int> reminderDays;
  final String? lastPaidDate;
  final String nextDueDate;
  final bool isActive;
  final Timestamp? createdAt;
  final Timestamp? updatedAt;

  Bill({
    required this.id,
    required this.name,
    required this.amount,
    required this.category,
    required this.dueDay,
    this.frequency = 'monthly',
    this.isAutoPay = false,
    this.reminderDays = const [],
    this.lastPaidDate,
    required this.nextDueDate,
    this.isActive = true,
    this.createdAt,
    this.updatedAt,
  });

  factory Bill.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return Bill(
      id: doc.id,
      name: TypeConverters.toStringOrEmpty(data['name']),
      amount: TypeConverters.toDouble(data['amount']),
      category: TypeConverters.toStringOrEmpty(data['category']) == '' 
          ? 'Other' 
          : TypeConverters.toStringOrEmpty(data['category']),
      dueDay: TypeConverters.toInt(data['dueDay']) == 0 ? 1 : TypeConverters.toInt(data['dueDay']),
      frequency: TypeConverters.toStringOrEmpty(data['frequency']) == '' 
          ? 'monthly' 
          : TypeConverters.toStringOrEmpty(data['frequency']),
      isAutoPay: TypeConverters.toBool(data['isAutoPay']),
      reminderDays: (data['reminderDays'] as List<dynamic>?)?.map((e) => TypeConverters.toInt(e)).toList() ?? [],
      lastPaidDate: TypeConverters.toStringOrNull(data['lastPaidDate']),
      nextDueDate: TypeConverters.toStringOrEmpty(data['nextDueDate']),
      isActive: TypeConverters.toBool(data['isActive']),
      createdAt: data['createdAt'] as Timestamp?,
      updatedAt: data['updatedAt'] as Timestamp?,
    );
  }

  Map<String, dynamic> toFirestore() => {
        'id': id,
        'name': name,
        'amount': amount,
        'category': category,
        'dueDay': dueDay,
        'frequency': frequency,
        'isAutoPay': isAutoPay,
        'reminderDays': reminderDays,
        'lastPaidDate': lastPaidDate,
        'nextDueDate': nextDueDate,
        'isActive': isActive,
        'createdAt': createdAt ?? FieldValue.serverTimestamp(),
        'updatedAt': FieldValue.serverTimestamp(),
      };

  bool get isOverdue {
    try {
      final dueDate = DateTime.parse(nextDueDate);
      final now = DateTime.now();
      return dueDate.isBefore(DateTime(now.year, now.month, now.day));
    } catch (e) {
      return false;
    }
  }

  bool get isDueToday {
    try {
      final dueDate = DateTime.parse(nextDueDate);
      final now = DateTime.now();
      return dueDate.year == now.year &&
          dueDate.month == now.month &&
          dueDate.day == now.day;
    } catch (e) {
      return false;
    }
  }

  Bill copyWith({
    String? id,
    String? name,
    double? amount,
    String? category,
    int? dueDay,
    String? frequency,
    bool? isAutoPay,
    List<int>? reminderDays,
    String? lastPaidDate,
    String? nextDueDate,
    bool? isActive,
    Timestamp? createdAt,
    Timestamp? updatedAt,
  }) {
    return Bill(
      id: id ?? this.id,
      name: name ?? this.name,
      amount: amount ?? this.amount,
      category: category ?? this.category,
      dueDay: dueDay ?? this.dueDay,
      frequency: frequency ?? this.frequency,
      isAutoPay: isAutoPay ?? this.isAutoPay,
      reminderDays: reminderDays ?? this.reminderDays,
      lastPaidDate: lastPaidDate ?? this.lastPaidDate,
      nextDueDate: nextDueDate ?? this.nextDueDate,
      isActive: isActive ?? this.isActive,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}

class BillFrequency {
  static const monthly = 'monthly';
  static const quarterly = 'quarterly';
  static const yearly = 'yearly';
  static const once = 'once';

  static const List<String> all = [monthly, quarterly, yearly, once];

  static String getDisplayName(String frequency) {
    switch (frequency) {
      case monthly:
        return 'Monthly';
      case quarterly:
        return 'Quarterly';
      case yearly:
        return 'Yearly';
      case once:
        return 'One-time';
      default:
        return frequency;
    }
  }
}
