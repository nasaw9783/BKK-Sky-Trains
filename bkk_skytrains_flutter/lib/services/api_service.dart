import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/journey.dart';

class ApiService {
  static const String baseUrl = 'https://bkk-skytrains.vercel.app/api/bts-proxy';
  static const String backupUrl = 'https://bkkskytrain.online/api/bts-proxy';

  static Future<List<JourneyRoute>> fetchJourney({
    required String originKey,
    required String destKey,
  }) async {
    final body = jsonEncode({
      'Origin': originKey,
      'Destination': destKey,
      'Origin_Location': 0,
      'Destination_Location': 0,
    });

    for (final base in [baseUrl, backupUrl]) {
      try {
        final uri = Uri.parse('$base?endpoint=journey&lang=th');
        final res = await http.post(
          uri,
          headers: {'Content-Type': 'application/json'},
          body: body,
        ).timeout(const Duration(seconds: 12));

        if (res.statusCode == 200) {
          final json = jsonDecode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>;
          if (json['IsSuccess'] == true && json['data'] != null) {
            final data = json['data'] as Map<String, dynamic>;
            final routesMap = data['RoutesMap'] as List<dynamic>? ?? [];
            return routesMap
                .map((r) => JourneyRoute.fromJson(r as Map<String, dynamic>))
                .toList();
          }
        }
      } catch (_) {
        // try backup
      }
    }
    throw Exception('ไม่สามารถคำนวณเส้นทางได้ในขณะนี้');
  }

  static Future<Map<String, dynamic>?> fetchTraffic() async {
    for (final base in [baseUrl, backupUrl]) {
      try {
        final uri = Uri.parse('$base?endpoint=traffic');
        final res = await http.post(
          uri,
          headers: {'Content-Type': 'application/json'},
          body: '{}',
        ).timeout(const Duration(seconds: 8));

        if (res.statusCode == 200) {
          return jsonDecode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>;
        }
      } catch (_) {
        // offline / timeout
      }
    }
    return null;
  }
}
