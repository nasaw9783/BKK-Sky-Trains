import 'dart:io' show Platform;
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:home_widget/home_widget.dart';

/// Service managing:
/// 1. Home Screen Widget (Android AppWidget & iOS WidgetKit)
/// 2. Lock Screen Persistent Notification (Android)
/// 3. Lock Screen Live Activities / WidgetKit (iOS 16.1+)
class LiveTransitService {
  static final LiveTransitService _instance = LiveTransitService._internal();
  factory LiveTransitService() => _instance;
  LiveTransitService._internal();

  static const String appGroupId = 'group.com.bkkskytrains.app';
  static const MethodChannel _notificationChannel =
      MethodChannel('com.bkkskytrains.app/persistent_notification');

  bool _initialized = false;

  Future<void> _ensureInitialized() async {
    if (_initialized) return;
    try {
      if (!kIsWeb && Platform.isIOS) {
        await HomeWidget.setAppGroupId(appGroupId);
      }
      _initialized = true;
    } catch (e) {
      debugPrint('[LiveTransitService] Init error: $e');
    }
  }

  /// Update live transit data across Lock Screen and Home Screen widgets
  Future<void> updateLiveTransit({
    required String stationKey,
    required String stationName,
    required String distanceText,
    required String lineColor,
    required String plat1Dest,
    required String plat1Time,
    required String plat2Dest,
    required String plat2Time,
  }) async {
    try {
      await _ensureInitialized();

      // 1. Save data for Home Screen Widget & iOS WidgetKit
      await HomeWidget.saveWidgetData<String>('station_key', stationKey);
      await HomeWidget.saveWidgetData<String>('station_name', stationName);
      await HomeWidget.saveWidgetData<String>('distance', distanceText);
      await HomeWidget.saveWidgetData<String>('line_color', lineColor);
      await HomeWidget.saveWidgetData<String>('plat1_dest', plat1Dest);
      await HomeWidget.saveWidgetData<String>('plat1_time', plat1Time);
      await HomeWidget.saveWidgetData<String>('plat2_dest', plat2Dest);
      await HomeWidget.saveWidgetData<String>('plat2_time', plat2Time);

      // 2. Trigger Widget UI refresh on Home Screen
      await HomeWidget.updateWidget(
        name: 'StationWidgetProvider',
        androidName: 'StationWidgetProvider',
        iOSName: 'StationWidget',
      );

      // 3. Android: Update Persistent Lock Screen Notification
      if (!kIsWeb && Platform.isAndroid) {
        await _notificationChannel.invokeMethod(
          'showPersistentLockScreenNotification',
          <String, dynamic>{
            'stationKey': stationKey,
            'stationName': stationName,
            'distanceText': distanceText,
            'plat1Text': plat1Dest,
            'plat1Time': plat1Time,
            'plat2Text': plat2Dest,
            'plat2Time': plat2Time,
          },
        );
      }

      // 4. iOS: Native Lock Screen Live Activities / WidgetKit notification channel
      if (!kIsWeb && Platform.isIOS) {
        try {
          await _notificationChannel.invokeMethod(
            'updateLiveActivity',
            <String, dynamic>{
              'stationKey': stationKey,
              'stationName': stationName,
              'distanceText': distanceText,
              'plat1Text': plat1Dest,
              'plat1Time': plat1Time,
              'plat2Text': plat2Dest,
              'plat2Time': plat2Time,
            },
          );
        } catch (_) {}
      }
    } catch (e) {
      debugPrint('[LiveTransitService] Error updating live transit: $e');
    }
  }

  /// Cancel and dismiss persistent lock screen notification / live activity
  Future<void> cancelLiveTransit() async {
    try {
      if (!kIsWeb && Platform.isAndroid) {
        await _notificationChannel.invokeMethod('cancelPersistentNotification');
      }
      if (!kIsWeb && Platform.isIOS) {
        try {
          await _notificationChannel.invokeMethod('cancelLiveActivity');
        } catch (_) {}
      }
    } catch (e) {
      debugPrint('[LiveTransitService] Error cancelling live transit: $e');
    }
  }
}
