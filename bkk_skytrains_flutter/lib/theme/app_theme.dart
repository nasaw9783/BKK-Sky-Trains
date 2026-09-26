import 'package:flutter/material.dart';

class AppTheme {
  static const Color darkBg = Color(0xFF090D16);
  static const Color darkCard = Color(0xFF131B2E);
  static const Color darkCardBorder = Color(0xFF1E293B);
  static const Color darkHeader = Color(0xFF10213A);
  
  static const Color accentGreen = Color(0xFF22C55E);
  static const Color btsGreen = Color(0xFF7AB420);
  static const Color silomTeal = Color(0xFF00807D);
  static const Color goldLine = Color(0xFFC9A038);
  static const Color yellowLine = Color(0xFFFFD100);
  static const Color pinkLine = Color(0xFFEC4899);
  static const Color mrtBlue = Color(0xFF1F8FDF);
  static const Color mrtPurple = Color(0xFF8A2C9B);
  static const Color srtRed = Color(0xFFC21E25);
  static const Color arlRed = Color(0xFFA11B22);

  static Color parseHexColor(String hex) {
    hex = hex.replaceAll('#', '');
    if (hex.length == 6) hex = 'FF$hex';
    return Color(int.parse(hex, radix: 16));
  }

  static ThemeData get darkTheme {
    return ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: darkBg,
      cardColor: darkCard,
      colorScheme: const ColorScheme.dark(
        primary: accentGreen,
        surface: darkCard,
      ),
      fontFamily: 'Sarabun',
      appBarTheme: const AppBarTheme(
        backgroundColor: darkHeader,
        elevation: 0,
      ),
    );
  }
}
