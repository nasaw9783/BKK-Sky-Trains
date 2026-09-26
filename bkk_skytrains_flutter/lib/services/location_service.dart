import 'package:geolocator/geolocator.dart';
import '../models/station.dart';
import 'static_stations.dart';

class LocationService {
  static Future<bool> checkPermission() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
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

  static Future<Position?> getCurrentLocation() async {
    try {
      final hasPerm = await checkPermission();
      if (!hasPerm) return null;

      // 1. ลองดึงตำแหน่งล่าสุดที่มีในแคชเพื่อความเร็ว
      Position? lastKnown = await Geolocator.getLastKnownPosition();
      if (lastKnown != null) {
        return lastKnown;
      }

      // 2. ดึงพิกัดปัจจุบันสด
      return await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.medium,
          timeLimit: Duration(seconds: 8),
        ),
      );
    } catch (e) {
      return null;
    }
  }

  static List<StationDistance> findNearestStations({
    required double userLat,
    required double userLon,
    required List<Station> allStations,
    int limit = 3,
  }) {
    final list = allStations.map((station) {
      final distanceInMeters = Geolocator.distanceBetween(
        userLat,
        userLon,
        station.latitude,
        station.longitude,
      );
      return StationDistance(
        station: station,
        distanceKm: distanceInMeters / 1000.0,
      );
    }).toList();

    list.sort((a, b) => a.distanceKm.compareTo(b.distanceKm));
    return list.take(limit).toList();
  }

  static Future<StationDistance?> findNearestStation() async {
    final pos = await getCurrentLocation();
    if (pos == null) return null;
    final nearest = findNearestStations(
      userLat: pos.latitude,
      userLon: pos.longitude,
      allStations: StaticStations.allStations,
      limit: 1,
    );
    return nearest.isNotEmpty ? nearest.first : null;
  }
}
