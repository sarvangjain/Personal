import 'package:cloud_firestore/cloud_firestore.dart';
import '../../../../core/utils/type_converters.dart';

class Investment {
  final String id;
  final String name;
  final String type;
  final String? symbol;
  final double units;
  final double avgBuyPrice;
  final double currentPrice;
  final double currentValue;
  final double totalInvested;
  final double unrealizedGain;
  final double gainPercent;
  final String lastUpdated;
  final String? notes;
  final bool isActive;
  final Timestamp? createdAt;
  final Timestamp? updatedAt;

  Investment({
    required this.id,
    required this.name,
    required this.type,
    this.symbol,
    required this.units,
    required this.avgBuyPrice,
    required this.currentPrice,
    required this.lastUpdated,
    this.notes,
    this.isActive = true,
    this.createdAt,
    this.updatedAt,
  })  : currentValue = units * currentPrice,
        totalInvested = units * avgBuyPrice,
        unrealizedGain = (units * currentPrice) - (units * avgBuyPrice),
        gainPercent = avgBuyPrice > 0
            ? (((units * currentPrice) - (units * avgBuyPrice)) /
                    (units * avgBuyPrice)) *
                100
            : 0;

  factory Investment.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return Investment(
      id: doc.id,
      name: TypeConverters.toStringOrEmpty(data['name']),
      type: TypeConverters.toStringOrEmpty(data['type']) == '' 
          ? 'other' 
          : TypeConverters.toStringOrEmpty(data['type']),
      symbol: TypeConverters.toStringOrNull(data['symbol']),
      units: TypeConverters.toDouble(data['units']),
      avgBuyPrice: TypeConverters.toDouble(data['avgBuyPrice']),
      currentPrice: TypeConverters.toDouble(data['currentPrice']),
      lastUpdated: TypeConverters.toStringOrEmpty(data['lastUpdated']),
      notes: TypeConverters.toStringOrNull(data['notes']),
      isActive: TypeConverters.toBool(data['isActive']),
      createdAt: data['createdAt'] as Timestamp?,
      updatedAt: data['updatedAt'] as Timestamp?,
    );
  }

  Map<String, dynamic> toFirestore() => {
        'id': id,
        'name': name,
        'type': type,
        'symbol': symbol,
        'units': units,
        'avgBuyPrice': avgBuyPrice,
        'currentPrice': currentPrice,
        'currentValue': currentValue,
        'totalInvested': totalInvested,
        'unrealizedGain': unrealizedGain,
        'gainPercent': gainPercent,
        'lastUpdated': lastUpdated,
        'notes': notes,
        'isActive': isActive,
        'createdAt': createdAt ?? FieldValue.serverTimestamp(),
        'updatedAt': FieldValue.serverTimestamp(),
      };

  Investment copyWith({
    String? id,
    String? name,
    String? type,
    String? symbol,
    double? units,
    double? avgBuyPrice,
    double? currentPrice,
    String? lastUpdated,
    String? notes,
    bool? isActive,
    Timestamp? createdAt,
    Timestamp? updatedAt,
  }) {
    return Investment(
      id: id ?? this.id,
      name: name ?? this.name,
      type: type ?? this.type,
      symbol: symbol ?? this.symbol,
      units: units ?? this.units,
      avgBuyPrice: avgBuyPrice ?? this.avgBuyPrice,
      currentPrice: currentPrice ?? this.currentPrice,
      lastUpdated: lastUpdated ?? this.lastUpdated,
      notes: notes ?? this.notes,
      isActive: isActive ?? this.isActive,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}

class InvestmentType {
  static const stock = 'stock';
  static const mutualFund = 'mutual_fund';
  static const fd = 'fd';
  static const ppf = 'ppf';
  static const nps = 'nps';
  static const crypto = 'crypto';
  static const gold = 'gold';
  static const realEstate = 'real_estate';
  static const epf = 'epf';
  static const bonds = 'bonds';
  static const other = 'other';

  static const List<String> all = [
    stock,
    mutualFund,
    fd,
    ppf,
    nps,
    crypto,
    gold,
    realEstate,
    epf,
    bonds,
    other,
  ];

  static String getDisplayName(String type) {
    switch (type) {
      case stock:
        return 'Stock';
      case mutualFund:
        return 'Mutual Fund';
      case fd:
        return 'Fixed Deposit';
      case ppf:
        return 'PPF';
      case nps:
        return 'NPS';
      case crypto:
        return 'Cryptocurrency';
      case gold:
        return 'Gold';
      case realEstate:
        return 'Real Estate';
      case epf:
        return 'EPF';
      case bonds:
        return 'Bonds';
      default:
        return 'Other';
    }
  }
}
