import 'package:cloud_firestore/cloud_firestore.dart';
import '../../../../core/utils/type_converters.dart';

class BudgetSettings {
  final double monthlyBudget;
  final Map<String, double> categoryBudgets;
  final Timestamp? updatedAt;

  BudgetSettings({
    this.monthlyBudget = 0,
    this.categoryBudgets = const {},
    this.updatedAt,
  });

  factory BudgetSettings.fromFirestore(Map<String, dynamic> data) {
    return BudgetSettings(
      monthlyBudget: TypeConverters.toDouble(data['monthlyBudget']),
      categoryBudgets: (data['categoryBudgets'] as Map<dynamic, dynamic>?)?.map(
        (k, v) => MapEntry(k.toString(), TypeConverters.toDouble(v)),
      ) ?? {},
      updatedAt: data['updatedAt'] as Timestamp?,
    );
  }

  Map<String, dynamic> toFirestore() => {
        'monthlyBudget': monthlyBudget,
        'categoryBudgets': categoryBudgets,
        'updatedAt': FieldValue.serverTimestamp(),
      };

  BudgetSettings copyWith({
    double? monthlyBudget,
    Map<String, double>? categoryBudgets,
    Timestamp? updatedAt,
  }) {
    return BudgetSettings(
      monthlyBudget: monthlyBudget ?? this.monthlyBudget,
      categoryBudgets: categoryBudgets ?? this.categoryBudgets,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
