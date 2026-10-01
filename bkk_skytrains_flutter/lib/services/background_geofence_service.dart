import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:geolocator/geolocator.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/station.dart';
import 'static_stations.dart';

class BackgroundGeofenceService {
  static final BackgroundGeofenceService _instance = BackgroundGeofenceService._internal();
  factory BackgroundGeofenceService() => _instance;
  BackgroundGeofenceService._internal();

  final FlutterLocalNotificationsPlugin _notificationsPlugin = FlutterLocalNotificationsPlugin();
  StreamSubscription<Position>? _positionStreamSub;

  bool _isInitialized = false;
  bool _isRunning = false;
  int _geofenceRadiusMeters = 1000;
  String? _lastNotifiedStationKey;
  DateTime? _lastNotificationTime;

  Function(String stationKey)? onNotificationTapped;
  Function(double lat, double lon, double acc)? onLocationUpdated;
  Function(Station station, double distanceKm)? onGeofenceTriggered;

  bool get isRunning => _isRunning;
  int get geofenceRadiusMeters => _geofenceRadiusMeters;

  static const String _channelId = 'bkk_geofence_channel';
  static const String _channelName = 'BKK SkyTrains Geofencing';
  static const String _channelDesc = 'การแจ้งเตือนสถานีรถไฟฟ้าใกล้เคียงเบื้องหลัง';
  static const String _prefEnabledKey = 'bkk_native_geofence_enabled';
  static const String _prefRadiusKey = 'bkk_native_geofence_radius';

  Future<void> init({Function(String stationKey)? onNotificationTap}) async {
    if (_isInitialized) return;

    if (onNotificationTap != null) {
      onNotificationTapped = onNotificationTap;
    }

    const AndroidInitializationSettings androidSettings =
        AndroidInitializationSettings('@mipmap/ic_launcher');

    const DarwinInitializationSettings iosSettings = DarwinInitializationSettings(
      requestAlertPermission: false,
      requestBadgePermission: false,
      requestSoundPermission: false,
    );

    const InitializationSettings initSettings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    await _notificationsPlugin.initialize(
      settings: initSettings,
      onDidReceiveNotificationResponse: (NotificationResponse response) {
        final payload = response.payload;
        if (payload != null && payload.isNotEmpty) {
          debugPrint('[Geofence] Notification tapped with payload: $payload');
          onNotificationTapped?.call(payload);
        }
      },
    );

    final prefs = await SharedPreferences.getInstance();
    _geofenceRadiusMeters = prefs.getInt(_prefRadiusKey) ?? 1000;
    final savedEnabled = prefs.getBool(_prefEnabledKey) ?? false;

    _isInitialized = true;

    if (savedEnabled) {
      debugPrint('[Geofence] Auto-starting saved geofencing service...');
      await startGeofencing(radiusMeters: _geofenceRadiusMeters);
    }
  }

  Future<bool> requestPermissions() async {
    // 1. Android 13+ Notification permission
    final androidImpl = _notificationsPlugin
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
    if (androidImpl != null) {
      await androidImpl.requestNotificationsPermission();
      await androidImpl.createNotificationChannel(
        const AndroidNotificationChannel(
          _channelId,
          _channelName,
          description: _channelDesc,
          importance: Importance.max,
          enableVibration: true,
          playSound: true,
          showBadge: true,
        ),
      );
    }

    // 2. iOS Notification permission
    final iosImpl = _notificationsPlugin
        .resolvePlatformSpecificImplementation<IOSFlutterLocalNotificationsPlugin>();
    if (iosImpl != null) {
      await iosImpl.requestPermissions(alert: true, badge: true, sound: true);
    }

    // 3. Location permissions
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      debugPrint('[Geofence] Location services are disabled.');
      return false;
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        return false;
      }
    }

    if (permission == LocationPermission.deniedForever) {
      return false;
    }

    return true;
  }

  Future<bool> startGeofencing({int? radiusMeters}) async {
    if (radiusMeters != null) {
      _geofenceRadiusMeters = radiusMeters;
    }

    final hasPerm = await requestPermissions();
    if (!hasPerm) {
      debugPrint('[Geofence] Cannot start geofencing: missing permissions');
      return false;
    }

    await stopGeofencing();

    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_prefEnabledKey, true);
    await prefs.setInt(_prefRadiusKey, _geofenceRadiusMeters);

    final LocationSettings locationSettings;
    if (defaultTargetPlatform == TargetPlatform.android) {
      locationSettings = AndroidSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 30, // 30 meters threshold
        forceLocationManager: true,
        intervalDuration: const Duration(seconds: 15),
        foregroundNotificationConfig: const ForegroundNotificationConfig(
          notificationTitle: 'BKK SkyTrains Geofencing',
          notificationText: 'กำลังตรวจจับสถานีรถไฟฟ้าใกล้เคียงเบื้องหลังอัตโนมัติ',
          notificationIcon: AndroidResource(name: 'ic_launcher', defType: 'mipmap'),
          enableWakeLock: true,
        ),
      );
    } else if (defaultTargetPlatform == TargetPlatform.iOS) {
      locationSettings = AppleSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 30,
        activityType: ActivityType.fitness,
        pauseLocationUpdatesAutomatically: false,
        showBackgroundLocationIndicator: true,
      );
    } else {
      locationSettings = const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 30,
      );
    }

    try {
      _positionStreamSub = Geolocator.getPositionStream(
        locationSettings: locationSettings,
      ).listen(
        (Position position) {
          _handlePositionUpdate(position);
        },
        onError: (err) {
          debugPrint('[Geofence] Location stream error: $err');
        },
      );

      _isRunning = true;
      debugPrint('[Geofence] Background Geofencing STARTED with radius: $_geofenceRadiusMeters m');

      // Trigger initial check immediately
      final currentPos = await Geolocator.getLastKnownPosition();
      if (currentPos != null) {
        _handlePositionUpdate(currentPos);
      }

      return true;
    } catch (e) {
      debugPrint('[Geofence] Failed to start position stream: $e');
      _isRunning = false;
      return false;
    }
  }

  Future<void> stopGeofencing() async {
    await _positionStreamSub?.cancel();
    _positionStreamSub = null;
    _isRunning = false;

    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_prefEnabledKey, false);

    debugPrint('[Geofence] Background Geofencing STOPPED.');
  }

  Future<void> setRadius(int radiusMeters) async {
    _geofenceRadiusMeters = radiusMeters;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_prefRadiusKey, radiusMeters);

    if (_isRunning) {
      await startGeofencing(radiusMeters: radiusMeters);
    }
  }

  void _handlePositionUpdate(Position position) {
    onLocationUpdated?.call(position.latitude, position.longitude, position.accuracy);

    // Calculate nearest station
    Station? nearest;
    double minDistanceMeters = double.infinity;

    for (final st in kStaticStations) {
      final d = Geolocator.distanceBetween(
        position.latitude,
        position.longitude,
        st.latitude,
        st.longitude,
      );
      if (d < minDistanceMeters) {
        minDistanceMeters = d;
        nearest = st;
      }
    }

    if (nearest == null) return;

    final distKm = minDistanceMeters / 1000.0;
    final bool isInsideGeofence = minDistanceMeters <= _geofenceRadiusMeters;

    debugPrint('[Geofence] Nearest station: ${nearest.stationKey} ${nearest.nameTH}, Dist: ${minDistanceMeters.round()}m (Limit: $_geofenceRadiusMeters m)');

    if (isInsideGeofence) {
      final now = DateTime.now();
      final bool isDifferentStation = (_lastNotifiedStationKey != nearest.stationKey);
      final bool isCooldownElapsed = _lastNotificationTime == null ||
          now.difference(_lastNotificationTime!).inMinutes >= 12;

      if (isDifferentStation || isCooldownElapsed) {
        _lastNotifiedStationKey = nearest.stationKey;
        _lastNotificationTime = now;

        onGeofenceTriggered?.call(nearest, distKm);
        _sendStationNotification(nearest, minDistanceMeters);
      }
    }
  }

  Future<void> _sendStationNotification(Station station, double distanceMeters) async {
    final distText = distanceMeters < 1000
        ? '~${distanceMeters.round()} ม.'
        : '~${(distanceMeters / 1000.0).toStringAsFixed(1)} กม.';

    final title = '📍 ใกล้ถึงสถานี ${station.nameTH} (${station.stationKey}) $distText';
    final body = 'รถไฟฟ้า${station.lineNameTH} · แตะเพื่อดูเวลาขบวนรถและชานชาลา';

    await _showNotification(
      id: station.stationKey.hashCode,
      title: title,
      body: body,
      payload: station.stationKey,
    );
  }

  Future<void> sendTestNotification({String? customStationKey}) async {
    final station = kStaticStations.firstWhere(
      (s) => s.stationKey == (customStationKey ?? 'CEN'),
      orElse: () => kStaticStations.first,
    );

    const title = '🔔 ทดสอบการแจ้งเตือน BKK SkyTrains';
    final body = 'ระบบแจ้งเตือนสถานีใกล้ฉันเบื้องหลัง (Background Geofencing) พร้อมทำงานแล้ว! แม้ล็อกหน้าจอ';

    await _showNotification(
      id: 999999,
      title: title,
      body: body,
      payload: station.stationKey,
    );
  }

  Future<void> _showNotification({
    required int id,
    required String title,
    required String body,
    String? payload,
  }) async {
    const AndroidNotificationDetails androidDetails = AndroidNotificationDetails(
      _channelId,
      _channelName,
      channelDescription: _channelDesc,
      importance: Importance.max,
      priority: Priority.high,
      showWhen: true,
      enableVibration: true,
      playSound: true,
      visibility: NotificationVisibility.public, // Visible on Lock Screen
      icon: '@mipmap/ic_launcher',
    );

    const DarwinNotificationDetails iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    const NotificationDetails platformDetails = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _notificationsPlugin.show(
      id: id,
      title: title,
      body: body,
      notificationDetails: platformDetails,
      payload: payload,
    );
  }
}
