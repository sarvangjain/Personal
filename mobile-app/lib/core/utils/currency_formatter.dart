import 'package:intl/intl.dart';

class CurrencyFormatter {
  CurrencyFormatter._();

  static String formatCurrency(double amount, {String currency = 'INR'}) {
    final format = NumberFormat.currency(
      locale: 'en_IN',
      symbol: '₹',
      decimalDigits: 0,
    );
    return format.format(amount);
  }

  static String formatCompact(double amount) {
    if (amount >= 10000000) {
      return '${(amount / 10000000).toStringAsFixed(1)}Cr';
    }
    if (amount >= 100000) {
      return '${(amount / 100000).toStringAsFixed(1)}L';
    }
    if (amount >= 1000) {
      return '${(amount / 1000).toStringAsFixed(1)}K';
    }
    return amount.toStringAsFixed(0);
  }

  static String formatWithSign(double amount) {
    final formatted = formatCurrency(amount.abs());
    if (amount > 0) {
      return '+$formatted';
    } else if (amount < 0) {
      return '-$formatted';
    }
    return formatted;
  }
}
