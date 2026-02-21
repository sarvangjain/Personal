import 'package:cloud_firestore/cloud_firestore.dart';
import '../../../../core/utils/type_converters.dart';

class SavingsGoal {
  final String id;
  final String name;
  final double targetAmount;
  final double currentAmount;
  final String? deadline;
  final String icon;
  final String color;
  final int autoAllocatePercent;
  final List<String> linkedIncomeCategories;
  final int priority;
  final String trackingType;
  final bool isActive;
  final Timestamp? createdAt;
  final Timestamp? updatedAt;

  SavingsGoal({
    required this.id,
    required this.name,
    required this.targetAmount,
    this.currentAmount = 0,
    this.deadline,
    this.icon = 'piggy-bank',
    this.color = 'teal',
    this.autoAllocatePercent = 0,
    this.linkedIncomeCategories = const [],
    this.priority = 3,
    this.trackingType = 'savings',
    this.isActive = true,
    this.createdAt,
    this.updatedAt,
  });

  factory SavingsGoal.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return SavingsGoal(
      id: doc.id,
      name: TypeConverters.toStringOrEmpty(data['name']),
      targetAmount: TypeConverters.toDouble(data['targetAmount']),
      currentAmount: TypeConverters.toDouble(data['currentAmount']),
      deadline: TypeConverters.toStringOrNull(data['deadline']),
      icon: TypeConverters.toStringOrEmpty(data['icon']) == '' 
          ? 'piggy-bank' 
          : TypeConverters.toStringOrEmpty(data['icon']),
      color: TypeConverters.toStringOrEmpty(data['color']) == '' 
          ? 'teal' 
          : TypeConverters.toStringOrEmpty(data['color']),
      autoAllocatePercent: TypeConverters.toInt(data['autoAllocatePercent']),
      linkedIncomeCategories:
          (data['linkedIncomeCategories'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      priority: TypeConverters.toInt(data['priority']) == 0 ? 3 : TypeConverters.toInt(data['priority']),
      trackingType: TypeConverters.toStringOrEmpty(data['trackingType']) == '' 
          ? 'savings' 
          : TypeConverters.toStringOrEmpty(data['trackingType']),
      isActive: TypeConverters.toBool(data['isActive']),
      createdAt: data['createdAt'] as Timestamp?,
      updatedAt: data['updatedAt'] as Timestamp?,
    );
  }

  Map<String, dynamic> toFirestore() => {
        'id': id,
        'name': name,
        'targetAmount': targetAmount,
        'currentAmount': currentAmount,
        'deadline': deadline,
        'icon': icon,
        'color': color,
        'autoAllocatePercent': autoAllocatePercent,
        'linkedIncomeCategories': linkedIncomeCategories,
        'priority': priority,
        'trackingType': trackingType,
        'isActive': isActive,
        'createdAt': createdAt ?? FieldValue.serverTimestamp(),
        'updatedAt': FieldValue.serverTimestamp(),
      };

  double get progress => targetAmount > 0 ? currentAmount / targetAmount : 0;

  bool get isCompleted => currentAmount >= targetAmount;

  SavingsGoal copyWith({
    String? id,
    String? name,
    double? targetAmount,
    double? currentAmount,
    String? deadline,
    String? icon,
    String? color,
    int? autoAllocatePercent,
    List<String>? linkedIncomeCategories,
    int? priority,
    String? trackingType,
    bool? isActive,
    Timestamp? createdAt,
    Timestamp? updatedAt,
  }) {
    return SavingsGoal(
      id: id ?? this.id,
      name: name ?? this.name,
      targetAmount: targetAmount ?? this.targetAmount,
      currentAmount: currentAmount ?? this.currentAmount,
      deadline: deadline ?? this.deadline,
      icon: icon ?? this.icon,
      color: color ?? this.color,
      autoAllocatePercent: autoAllocatePercent ?? this.autoAllocatePercent,
      linkedIncomeCategories:
          linkedIncomeCategories ?? this.linkedIncomeCategories,
      priority: priority ?? this.priority,
      trackingType: trackingType ?? this.trackingType,
      isActive: isActive ?? this.isActive,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}

class GoalIcon {
  static const plane = 'plane';
  static const car = 'car';
  static const home = 'home';
  static const gift = 'gift';
  static const graduationCap = 'graduation-cap';
  static const heart = 'heart';
  static const smartphone = 'smartphone';
  static const laptop = 'laptop';
  static const piggyBank = 'piggy-bank';
  static const umbrella = 'umbrella';
  static const briefcase = 'briefcase';
  static const star = 'star';

  static const List<String> all = [
    plane,
    car,
    home,
    gift,
    graduationCap,
    heart,
    smartphone,
    laptop,
    piggyBank,
    umbrella,
    briefcase,
    star,
  ];
}

class GoalColor {
  static const teal = 'teal';
  static const cyan = 'cyan';
  static const emerald = 'emerald';
  static const blue = 'blue';
  static const purple = 'purple';
  static const pink = 'pink';
  static const amber = 'amber';
  static const orange = 'orange';
  static const red = 'red';
  static const indigo = 'indigo';
  static const rose = 'rose';
  static const lime = 'lime';

  static const List<String> all = [
    teal,
    cyan,
    emerald,
    blue,
    purple,
    pink,
    amber,
    orange,
    red,
    indigo,
    rose,
    lime,
  ];
}
