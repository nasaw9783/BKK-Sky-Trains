import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';
import 'package:webview_flutter_wkwebview/webview_flutter_wkwebview.dart';

class BkkWebViewScreen extends StatefulWidget {
  const BkkWebViewScreen({super.key});

  @override
  State<BkkWebViewScreen> createState() => _BkkWebViewScreenState();
}

class _BkkWebViewScreenState extends State<BkkWebViewScreen> {
  late final WebViewController _controller;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();

    // Clear legacy geofence settings permanently
    SharedPreferences.getInstance().then((prefs) {
      prefs.remove('bkk_native_geofence_enabled');
      prefs.remove('bkk_native_geofence_radius');
    }).catchError((_) {});

    // Watchdog to guarantee loading indicator is dismissed if onPageFinished stalls
    Future.delayed(const Duration(seconds: 4), () {
      if (mounted && _isLoading) {
        setState(() => _isLoading = false);
      }
    });

    late final WebViewController controller;
    controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFF10213A))
      ..setOnConsoleMessage((JavaScriptConsoleMessage message) {
        debugPrint('[JS ${message.level.name}] ${message.message}');
      })
      ..addJavaScriptChannel(
        'FlutterLocation',
        onMessageReceived: (JavaScriptMessage message) {
          _handleLocationMessage(message.message);
        },
      )
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (url) {
            if (mounted) setState(() => _isLoading = true);
          },
          onPageFinished: (url) {
            if (mounted) setState(() => _isLoading = false);
            _injectBridgeHelpers();
            _requestNativeLocation(interactive: false);
          },
          onWebResourceError: (error) {
            debugPrint('Web resource error: ${error.description} (code: ${error.errorCode})');
            if (error.isForMainFrame ?? false) {
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
    const bridgeScript = '''
      window.isFlutterApp = true;
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

      // If user pressed "Relocate" (interactive == true), NEVER use stale cached lastKnownPosition.
      // For initial background launch (interactive == false), only use if fresh (< 5 mins) and accurate (<= 100m).
      if (!interactive) {
        try {
          final lastKnown = await Geolocator.getLastKnownPosition();
          if (lastKnown != null) {
            final age = DateTime.now().difference(lastKnown.timestamp);
            if (age < const Duration(minutes: 5) && lastKnown.accuracy <= 100) {
              debugPrint('Fresh last known location used (${age.inSeconds}s old): ${lastKnown.latitude}, ${lastKnown.longitude}');
              _controller.runJavaScript(
                "if (window.App && App.onNativeLocationSuccess) { App.onNativeLocationSuccess(${lastKnown.latitude}, ${lastKnown.longitude}, ${lastKnown.accuracy}); }",
              );
            } else {
              debugPrint('Stale last known location discarded (${age.inMinutes}m old, acc: ${lastKnown.accuracy}m)');
            }
          }
        } catch (e) {
          debugPrint('getLastKnownPosition check error: $e');
        }
      }

      // Request fresh live GPS fix with adequate satellite lock window (14 seconds)
      try {
        final LocationSettings locationSettings;
        if (defaultTargetPlatform == TargetPlatform.android) {
          locationSettings = AndroidSettings(
            accuracy: LocationAccuracy.high,
            forceLocationManager: false,
            timeLimit: const Duration(seconds: 14),
          );
        } else {
          locationSettings = const LocationSettings(
            accuracy: LocationAccuracy.high,
            timeLimit: Duration(seconds: 14),
          );
        }
        final livePos = await Geolocator.getCurrentPosition(locationSettings: locationSettings);
        debugPrint('Fresh native GPS location obtained: ${livePos.latitude}, ${livePos.longitude}, acc: ${livePos.accuracy}');
        _controller.runJavaScript(
          "if (window.App && App.onNativeLocationSuccess) { App.onNativeLocationSuccess(${livePos.latitude}, ${livePos.longitude}, ${livePos.accuracy}); }",
        );
      } catch (e) {
        debugPrint('High accuracy fix failed ($e), falling back to balanced/network accuracy...');
        try {
          final fallbackSettings = const LocationSettings(
            accuracy: LocationAccuracy.medium,
            timeLimit: Duration(seconds: 8),
          );
          final fallbackPos = await Geolocator.getCurrentPosition(locationSettings: fallbackSettings);
          debugPrint('Fallback balanced location obtained: ${fallbackPos.latitude}, ${fallbackPos.longitude}, acc: ${fallbackPos.accuracy}');
          _controller.runJavaScript(
            "if (window.App && App.onNativeLocationSuccess) { App.onNativeLocationSuccess(${fallbackPos.latitude}, ${fallbackPos.longitude}, ${fallbackPos.accuracy}); }",
          );
        } catch (e2) {
          debugPrint('Balanced fix failed ($e2)');
          _controller.runJavaScript(
            "if (window.App && App.onNativeLocationError) { App.onNativeLocationError('gps_timeout'); }",
          );
        }
      }
    } catch (e) {
      debugPrint('Geolocator outer failed: $e');
      _controller.runJavaScript(
        "if (window.App && App.onNativeLocationError) { App.onNativeLocationError('$e'); }",
      );
    }
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
          child: Stack(
            children: [
              WebViewWidget(controller: _controller),
              if (_isLoading)
                const Center(
                  child: CircularProgressIndicator(color: Color(0xFF22C55E)),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
