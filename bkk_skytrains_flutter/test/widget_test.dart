// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:flutter_test/flutter_test.dart';
import 'package:bkk_skytrains_flutter/services/static_stations.dart';
import 'package:bkk_skytrains_flutter/theme/app_theme.dart';

void main() {
  test('Static stations DB and AppTheme load properly', () {
    expect(kStaticStations.isNotEmpty, true);
    final asok = kStaticStations.any((s) => s.stationKey == 'E4');
    expect(asok, true);
    expect(AppTheme.darkTheme.brightness, equals(AppTheme.darkTheme.colorScheme.brightness));
  });
}
