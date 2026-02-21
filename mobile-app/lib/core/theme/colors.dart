import 'package:flutter/material.dart';

class AppColors {
  AppColors._();

  static const primary = Color(0xFF14B8A6);
  static const primaryContainer = Color(0xFF0D9488);
  static const onPrimary = Colors.white;
  
  static const secondary = Color(0xFF06B6D4);
  static const secondaryContainer = Color(0xFF0891B2);
  
  static const surface = Color(0xFF0C0A09);
  static const surfaceContainer = Color(0xFF1C1917);
  static const surfaceContainerHigh = Color(0xFF292524);
  static const surfaceContainerLow = Color(0xFF0A0908);
  
  static const onSurface = Color(0xFFE7E5E4);
  static const onSurfaceVariant = Color(0xFFA8A29E);
  static const outline = Color(0xFF44403C);
  
  static const positive = Color(0xFF10B981);
  static const negative = Color(0xFFEF4444);
  static const warning = Color(0xFFF59E0B);
  
  static const Map<String, Color> categoryColors = {
    'Groceries': Color(0xFF10B981),
    'Transport': Color(0xFF3B82F6),
    'Food & Dining': Color(0xFFF97316),
    'Rent': Color(0xFF64748B),
    'Utilities': Color(0xFFEAB308),
    'Shopping': Color(0xFFEC4899),
    'Entertainment': Color(0xFF8B5CF6),
    'Health': Color(0xFFEF4444),
    'Travel': Color(0xFF06B6D4),
    'Personal': Color(0xFF6366F1),
    'Payments': Color(0xFF14B8A6),
    'Other': Color(0xFF78716C),
  };
  
  static Color getCategoryColor(String category) {
    return categoryColors[category] ?? categoryColors['Other']!;
  }
}
