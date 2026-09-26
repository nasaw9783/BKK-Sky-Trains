import 'package:flutter/material.dart';
import 'screens/bkk_web_view_screen.dart';
import 'theme/app_theme.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const BkkSkyTrainsApp());
}

class BkkSkyTrainsApp extends StatelessWidget {
  const BkkSkyTrainsApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'BKK SkyTrains',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme,
      home: const BkkWebViewScreen(),
    );
  }
}
