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

    final WebViewController controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFF10213A))
      ..clearCache()
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
            _requestNativeLocation();
          },
          onWebResourceError: (error) {
            debugPrint('Web resource error: ${error.description}');
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
        if (action == 'getLocation') {
          _requestNativeLocation();
        }
      }
    } catch (e) {
      debugPrint('[JSBridge] Error handling message: $e');
      _requestNativeLocation();
    }
  }

  Future<void> _requestNativeLocation() async {
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

      Position? position;
      try {
        position = await Geolocator.getLastKnownPosition();
        if (position != null) {
          debugPrint('Last known location found: ${position.latitude}, ${position.longitude}');
          _controller.runJavaScript(
            "if (window.App && App.onNativeLocationSuccess) { App.onNativeLocationSuccess(${position.latitude}, ${position.longitude}, ${position.accuracy}); }",
          );
        }
      } catch (e) {
        debugPrint('getLastKnownPosition error: $e');
      }

      try {
        final LocationSettings locationSettings;
        if (defaultTargetPlatform == TargetPlatform.android) {
          locationSettings = AndroidSettings(
            accuracy: LocationAccuracy.high,
            forceLocationManager: true,
            timeLimit: const Duration(seconds: 4),
          );
        } else {
          locationSettings = const LocationSettings(
            accuracy: LocationAccuracy.high,
            timeLimit: Duration(seconds: 4),
          );
        }
        final livePos = await Geolocator.getCurrentPosition(locationSettings: locationSettings);
        position = livePos;
        debugPrint('Fresh native location obtained: ${position.latitude}, ${position.longitude}');
        _controller.runJavaScript(
          "if (window.App && App.onNativeLocationSuccess) { App.onNativeLocationSuccess(${position.latitude}, ${position.longitude}, ${position.accuracy}); }",
        );
      } catch (e) {
        debugPrint('Live fix timeout/error: $e');
        if (position == null) {
          _controller.runJavaScript(
            "if (window.App && App.onNativeLocationError) { App.onNativeLocationError('$e'); }",
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
