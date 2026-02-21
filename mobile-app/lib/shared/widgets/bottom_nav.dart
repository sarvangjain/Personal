import 'package:flutter/material.dart';
import '../../core/theme/colors.dart';

class BottomNavItem {
  final IconData icon;
  final IconData selectedIcon;
  final String label;
  final String route;

  const BottomNavItem({
    required this.icon,
    required this.selectedIcon,
    required this.label,
    required this.route,
  });
}

class CustomBottomNav extends StatelessWidget {
  final int currentIndex;
  final List<BottomNavItem> items;
  final ValueChanged<int> onTap;

  const CustomBottomNav({
    super.key,
    required this.currentIndex,
    required this.items,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surfaceContainer,
        border: Border(
          top: BorderSide(
            color: AppColors.outline.withOpacity(0.5),
            width: 1,
          ),
        ),
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: List.generate(items.length, (index) {
              final item = items[index];
              final isSelected = currentIndex == index;
              return Expanded(
                child: InkWell(
                  onTap: () => onTap(index),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        isSelected ? item.selectedIcon : item.icon,
                        color:
                            isSelected ? AppColors.primary : AppColors.onSurfaceVariant,
                        size: 24,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        item.label,
                        style: TextStyle(
                          color: isSelected
                              ? AppColors.primary
                              : AppColors.onSurfaceVariant,
                          fontSize: 12,
                          fontWeight:
                              isSelected ? FontWeight.w600 : FontWeight.w400,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }),
          ),
        ),
      ),
    );
  }
}
