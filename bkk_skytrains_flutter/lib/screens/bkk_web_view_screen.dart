import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';
import 'package:webview_flutter_wkwebview/webview_flutter_wkwebview.dart';
import '../services/live_transit_service.dart';

class BkkWebViewScreen extends StatefulWidget {
  const BkkWebViewScreen({super.key});

  @override
  State<BkkWebViewScreen> createState() => _BkkWebViewScreenState();
}

class _BkkWebViewScreenState extends State<BkkWebViewScreen> {
  late final WebViewController _controller;
  StreamSubscription<Position>? _positionStreamSub;
  double? _bestAccuracy;
  DateTime? _lastDispatchedTime;
  int _mainFrameReloadCount = 0;

  @override
  void initState() {
    super.initState();

    // Clear legacy geofence settings permanently
    SharedPreferences.getInstance().then((prefs) {
      prefs.remove('bkk_native_geofence_enabled');
      prefs.remove('bkk_native_geofence_radius');
    }).catchError((_) {});

    late final WebViewController controller;
    controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFF10213A))
      ..setUserAgent(defaultTargetPlatform == TargetPlatform.android
          ? 'BKKSkyTrains/App (Android)'
          : 'BKKSkyTrains/App (iOS)')
      ..setOnConsoleMessage((JavaScriptConsoleMessage message) {
        if (kDebugMode) {
          debugPrint('[JS ${message.level.name}] ${message.message}');
        }
      })
      ..addJavaScriptChannel(
        'FlutterLocation',
        onMessageReceived: (JavaScriptMessage message) {
          _handleLocationMessage(message.message);
        },
      )
      ..addJavaScriptChannel(
        'BKKLiveBridge',
        onMessageReceived: (JavaScriptMessage message) {
          _handleLiveBridgeMessage(message.message);
        },
      )
      ..setNavigationDelegate(
        NavigationDelegate(
          onNavigationRequest: (NavigationRequest request) {
            final uri = Uri.tryParse(request.url);
            final scheme = uri?.scheme.toLowerCase() ?? '';
            final host = uri?.host.toLowerCase() ?? '';

            if (scheme == 'about' || scheme == 'data') {
              return NavigationDecision.navigate;
            }
            if (scheme == 'file' && request.url.contains('assets/www')) {
              return NavigationDecision.navigate;
            }
            if ((scheme == 'http' || scheme == 'https') &&
                (host == 'nasaw9783.github.io' ||
                 host == 'bkk-skytrains.vercel.app' ||
                 host == 'localhost' ||
                 host == '127.0.0.1' ||
                 host == 'appassets.androidplatform.net')) {
              return NavigationDecision.navigate;
            }
            if (request.url.contains('github.com')) {
              final launchUri = Uri.tryParse(request.url);
              if (launchUri != null) {
                launchUrl(launchUri, mode: LaunchMode.externalApplication);
              }
              return NavigationDecision.prevent;
            }
            debugPrint('[WebView Security] Blocked external navigation to: ${request.url}');
            return NavigationDecision.prevent;
          },
          onPageFinished: (url) {
            _mainFrameReloadCount = 0;
            _injectBridgeHelpers();
            _requestNativeLocation(interactive: false);
          },
          onWebResourceError: (error) {
            debugPrint('Web resource error: ${error.description} (code: ${error.errorCode})');
            if ((error.isForMainFrame ?? false) && _mainFrameReloadCount < 3) {
              _mainFrameReloadCount++;
              debugPrint('Retrying main frame load (attempt $_mainFrameReloadCount/3)...');
              Future.delayed(const Duration(milliseconds: 500), () {
                if (mounted) {
                  controller.loadFlutterAsset('assets/www/index.html');
                }
              });
            }
          },
        ),
      );

    if (controller.platform is AndroidWebViewController) {
      final androidController = controller.platform as AndroidWebViewController;
      androidController.setGeolocationPermissionsPromptCallbacks(
        onShowPrompt: (request) async {
          return const GeolocationPermissionsResponse(
            allow: true,
            retain: true,
          );
        },
      );
    } else if (controller.platform is WebKitWebViewController) {
      final webkitController = controller.platform as WebKitWebViewController;
      webkitController.setAllowsBackForwardNavigationGestures(true);
      webkitController.setInspectable(kDebugMode);
    }

    _controller = controller;
    _controller.loadFlutterAsset('assets/www/index.html');
  }

  void _injectBridgeHelpers() {
    final isAndroid = defaultTargetPlatform == TargetPlatform.android;
    final bridgeScript = '''
      window.isFlutterApp = true;
      window.isAndroidApp = $isAndroid;
      if (window.App && App.onNativeBridgeReady) {
        App.onNativeBridgeReady();
      }
    ''';

    _controller.runJavaScript(bridgeScript);
  }

  void _handleLocationMessage(String message) async {
    try {
      final data = jsonDecode(message);
      if (data is Map) {
        final action = data['action'];
        final isInteractive = data['interactive'] == true;
        if (action == 'getLocation') {
          _requestNativeLocation(interactive: isInteractive);
        }
      }
    } catch (e) {
      debugPrint('[JSBridge] Error handling message: $e');
      _requestNativeLocation(interactive: false);
    }
  }

  void _handleLiveBridgeMessage(String message) async {
    try {
      final dynamic data = jsonDecode(message);
      if (data is Map) {
        final action = data['action'];
        if (action == 'updateLiveStation') {
          await LiveTransitService().updateLiveTransit(
            stationKey: (data['stationKey'] ?? '').toString(),
            stationName: (data['stationName'] ?? '').toString(),
            stationNameEN: (data['stationNameEN'] ?? '').toString(),
            distanceText: (data['distanceText'] ?? '').toString(),
            lineColor: (data['lineColor'] ?? '#7AB420').toString(),
            plat1Dest: (data['plat1Dest'] ?? '').toString(),
            plat1Num: (data['plat1Num'] ?? '1').toString(),
            plat1DestName: (data['plat1DestName'] ?? '').toString(),
            plat1Time: (data['plat1Time'] ?? '').toString(),
            plat1Time2: (data['plat1Time2'] ?? '-- นาที').toString(),
            plat1Time3: (data['plat1Time3'] ?? '-- นาที').toString(),
            plat2Dest: (data['plat2Dest'] ?? '').toString(),
            plat2Num: (data['plat2Num'] ?? '2').toString(),
            plat2DestName: (data['plat2DestName'] ?? '').toString(),
            plat2Time: (data['plat2Time'] ?? '').toString(),
            plat2Time2: (data['plat2Time2'] ?? '-- นาที').toString(),
            plat2Time3: (data['plat2Time3'] ?? '-- นาที').toString(),
            statusLabel: (data['statusLabel'] ?? 'กำลังเข้า / นับถอยหลังสด').toString(),
          );
        } else if (action == 'cancelLiveStation') {
          await LiveTransitService().cancelLiveTransit();
        } else if (action == 'openExternalUrl') {
          final urlString = (data['url'] ?? '').toString();
          if (urlString.isNotEmpty) {
            final launchUri = Uri.tryParse(urlString);
            if (launchUri != null) {
              await launchUrl(launchUri, mode: LaunchMode.externalApplication);
            }
          }
        }
      }
    } catch (e) {
      debugPrint('[BKKLiveBridge] Error handling message: $e');
    }
  }

  Future<void> _requestNativeLocation({bool interactive = false}) async {
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        debugPrint('Location services are disabled.');
        _controller.runJavaScript(
          "if (window.App && App.onNativeLocationError) { App.onNativeLocationError('service_disabled'); }",
        );
        return;
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          _controller.runJavaScript(
            "if (window.App && App.onNativeLocationError) { App.onNativeLocationError('permission_denied'); }",
          );
          return;
        }
      }

      if (permission == LocationPermission.deniedForever) {
        _controller.runJavaScript(
          "if (window.App && App.onNativeLocationError) { App.onNativeLocationError('permission_denied_forever'); }",
        );
        return;
      }

      // If user pressed "Relocate" (interactive == true), reset accuracy filter
      if (interactive) {
        _bestAccuracy = null;
        _lastDispatchedTime = null;
      }

      // For initial background launch (interactive == false), only use lastKnown if fresh (< 45s) and accurate (<= 40m)
      if (!interactive) {
        try {
          final lastKnown = await Geolocator.getLastKnownPosition();
          if (lastKnown != null) {
            final age = DateTime.now().difference(lastKnown.timestamp);
            if (age < const Duration(seconds: 45) && lastKnown.accuracy <= 40) {
              debugPrint('Fresh last known location used (${age.inSeconds}s old): ${lastKnown.latitude}, ${lastKnown.longitude}');
              _bestAccuracy = lastKnown.accuracy;
              _lastDispatchedTime = DateTime.now();
              _controller.runJavaScript(
                "if (window.App && App.onNativeLocationSuccess) { App.onNativeLocationSuccess(${lastKnown.latitude}, ${lastKnown.longitude}, ${lastKnown.accuracy}); }",
              );
            } else {
              debugPrint('Stale last known location discarded (${age.inSeconds}s old, acc: ${lastKnown.accuracy}m)');
            }
          }
        } catch (e) {
          debugPrint('getLastKnownPosition check error: $e');
        }
      }

      // 1. Start continuous live GPS stream to actively refine accuracy under elevated station roofs/canopies
      await _positionStreamSub?.cancel();
      final streamSettings = defaultTargetPlatform == TargetPlatform.android
          ? AndroidSettings(
              accuracy: LocationAccuracy.best,
              distanceFilter: 2,
              forceLocationManager: false,
              intervalDuration: const Duration(seconds: 2),
            )
          : const LocationSettings(
              accuracy: LocationAccuracy.best,
              distanceFilter: 2,
            );

      _positionStreamSub = Geolocator.getPositionStream(
        locationSettings: streamSettings,
      ).listen(
        (Position livePos) {
          if (!mounted) return;
          final now = DateTime.now();
          final isBetter = _bestAccuracy == null || livePos.accuracy <= _bestAccuracy!;
          final timeElapsed = _lastDispatchedTime == null || now.difference(_lastDispatchedTime!).inMilliseconds >= 1500;

          if (isBetter || timeElapsed) {
            if (isBetter) _bestAccuracy = livePos.accuracy;
            _lastDispatchedTime = now;
            debugPrint('Native GPS stream update: ${livePos.latitude}, ${livePos.longitude}, acc: ${livePos.accuracy}');
            _controller.runJavaScript(
              "if (window.App && App.onNativeLocationSuccess) { App.onNativeLocationSuccess(${livePos.latitude}, ${livePos.longitude}, ${livePos.accuracy}); }",
            );
          }
        },
        onError: (err) {
          debugPrint('Location stream error: $err');
        },
      );

      // 2. Concurrently attempt immediate high-accuracy single fix
      try {
        final LocationSettings locationSettings;
        if (defaultTargetPlatform == TargetPlatform.android) {
          locationSettings = AndroidSettings(
            accuracy: LocationAccuracy.high,
            forceLocationManager: false,
            timeLimit: const Duration(seconds: 10),
          );
        } else {
          locationSettings = const LocationSettings(
            accuracy: LocationAccuracy.high,
            timeLimit: Duration(seconds: 10),
          );
        }
        final singlePos = await Geolocator.getCurrentPosition(locationSettings: locationSettings);
        if (!mounted) return;
        final now = DateTime.now();
        if (_bestAccuracy == null || singlePos.accuracy <= _bestAccuracy!) {
          _bestAccuracy = singlePos.accuracy;
          _lastDispatchedTime = now;
          debugPrint('Immediate native GPS location obtained: ${singlePos.latitude}, ${singlePos.longitude}, acc: ${singlePos.accuracy}');
          _controller.runJavaScript(
            "if (window.App && App.onNativeLocationSuccess) { App.onNativeLocationSuccess(${singlePos.latitude}, ${singlePos.longitude}, ${singlePos.accuracy}); }",
          );
        }
      } catch (e) {
        debugPrint('High accuracy single fix wait ($e) — continuous stream will continue refining.');
      }
    } catch (e) {
      debugPrint('Geolocator outer failed: $e');
      final safeErr = jsonEncode(e.toString());
      _controller.runJavaScript(
        "if (window.App && App.onNativeLocationError) { App.onNativeLocationError($safeErr); }",
      );
    }
  }

  @override
  void dispose() {
    _positionStreamSub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop) return;
        if (await _controller.canGoBack()) {
          await _controller.goBack();
        }
      },
      child: Scaffold(
        backgroundColor: const Color(0xFF10213A),
        body: SafeArea(
          top: true,
          bottom: false,
          child: WebViewWidget(controller: _controller),
        ),
      ),
    );
  }
}
