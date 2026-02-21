import 'package:flutter/material.dart';
import '../theme/colors.dart';

enum ExpenseCategory {
  groceries('Groceries', Color(0xFF10B981), [
    'grocery',
    'zepto',
    'blinkit',
    'bigbasket',
    'vegetables',
    'milk'
  ]),
  transport('Transport', Color(0xFF3B82F6), [
    'cab',
    'uber',
    'ola',
    'auto',
    'metro',
    'petrol',
    'fuel'
  ]),
  foodDining('Food & Dining', Color(0xFFF97316), [
    'zomato',
    'swiggy',
    'restaurant',
    'dinner',
    'lunch',
    'cafe'
  ]),
  rent('Rent', Color(0xFF64748B), ['rent', 'house rent', 'apartment']),
  utilities('Utilities', Color(0xFFEAB308), [
    'wifi',
    'electricity',
    'water',
    'gas',
    'bill',
    'recharge'
  ]),
  shopping('Shopping', Color(0xFFEC4899), [
    'amazon',
    'flipkart',
    'myntra',
    'clothes',
    'electronics'
  ]),
  entertainment('Entertainment', Color(0xFF8B5CF6), [
    'movie',
    'netflix',
    'spotify',
    'subscription',
    'game'
  ]),
  health('Health', Color(0xFFEF4444), [
    'medicine',
    'doctor',
    'hospital',
    'gym',
    'pharmacy'
  ]),
  travel('Travel', Color(0xFF06B6D4), [
    'hotel',
    'trip',
    'vacation',
    'booking',
    'flight'
  ]),
  personal('Personal', Color(0xFF6366F1), [
    'haircut',
    'salon',
    'spa',
    'grooming'
  ]),
  payments('Payments', Color(0xFF14B8A6), [
    'paid back',
    'refund',
    'cashback',
    'transfer'
  ]),
  other('Other', Color(0xFF78716C), []);

  final String label;
  final Color color;
  final List<String> keywords;

  const ExpenseCategory(this.label, this.color, this.keywords);

  static ExpenseCategory fromDescription(String description) {
    final lower = description.toLowerCase();
    for (final category in values) {
      for (final keyword in category.keywords) {
        if (lower.contains(keyword)) return category;
      }
    }
    return other;
  }

  static ExpenseCategory fromString(String categoryStr) {
    return values.firstWhere(
      (cat) => cat.label == categoryStr,
      orElse: () => other,
    );
  }

  static List<String> get allLabels => values.map((e) => e.label).toList();
}
