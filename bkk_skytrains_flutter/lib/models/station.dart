class Station {
  final String stationKey;
  final String nameTH;
  final String nameEN;
  final double latitude;
  final double longitude;
  final int lineId;
  final String lineColor;
  final bool isCrowded;

  const Station({
    required this.stationKey,
    required this.nameTH,
    required this.nameEN,
    required this.latitude,
    required this.longitude,
    required this.lineId,
    required this.lineColor,
    this.isCrowded = false,
  });

  String get lineNameTH {
    switch (lineId) {
      case 1:
        return 'สายสุขุมวิท';
      case 2:
        return 'สายสีลม';
      case 3:
        return 'สายสีทอง';
      case 4:
        return 'สายสีเหลือง';
      case 5:
        return 'สายสีชมพู';
      case 101:
        return 'สายสีน้ำเงิน (MRT)';
      case 102:
        return 'สายสีม่วง (MRT)';
      case 103:
        return 'สายสีแดง (SRT)';
      case 104:
        return 'แอร์พอร์ต เรล ลิงก์ (ARL)';
      default:
        return 'รถไฟฟ้า';
    }
  }

  factory Station.fromJson(Map<String, dynamic> json) {
    return Station(
      stationKey: json['StationKey'] ?? '',
      nameTH: json['StationNameTH'] ?? '',
      nameEN: json['StationNameEN'] ?? '',
      latitude: (json['Latitude'] as num?)?.toDouble() ?? 0.0,
      longitude: (json['Longitude'] as num?)?.toDouble() ?? 0.0,
      lineId: json['StationLineId'] ?? 1,
      lineColor: json['StationLineColor'] ?? '#7AB420',
      isCrowded: json['IsCrowded'] == true,
    );
  }

  Map<String, dynamic> toJson() => {
    'StationKey': stationKey,
    'StationNameTH': nameTH,
    'StationNameEN': nameEN,
    'Latitude': latitude,
    'Longitude': longitude,
    'StationLineId': lineId,
    'StationLineColor': lineColor,
    'IsCrowded': isCrowded,
  };
}

class StationDistance {
  final Station station;
  final double distanceKm;

  const StationDistance({
    required this.station,
    required this.distanceKm,
  });

  String get formattedDistance {
    if (distanceKm < 1.0) {
      final m = (distanceKm * 1000).round();
      return '$m ม.';
    }
    return '${distanceKm.toStringAsFixed(1)} กม.';
  }
}
