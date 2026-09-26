class JourneyStep {
  final String stationCode;
  final String nameTH;
  final String nameEN;
  final String lineName;
  final String lineColor;
  final String travelType; // 'Origin', 'Bypass', 'InterChange', 'Destination'
  final String time;
  final String timeRoute;

  const JourneyStep({
    required this.stationCode,
    required this.nameTH,
    required this.nameEN,
    required this.lineName,
    required this.lineColor,
    required this.travelType,
    required this.time,
    required this.timeRoute,
  });

  factory JourneyStep.fromJson(Map<String, dynamic> json) {
    final st = json['Station'] as Map<String, dynamic>?;
    final nameTH = st?['StationNameTH'] ?? json['Title'] ?? '';
    final nameEN = st?['StationNameEN'] ?? '';
    final code = json['StationCode'] ?? st?['StationKey'] ?? '';
    final color = json['BTSLineColor'] ?? st?['StationLineColor'] ?? '#7AB420';
    final lineName = st?['LineNameTH'] ?? json['BTSLine'] ?? '';
    final travel = json['BTSTravel'] ?? '';

    return JourneyStep(
      stationCode: code.toString(),
      nameTH: nameTH.toString(),
      nameEN: nameEN.toString(),
      lineName: lineName.toString(),
      lineColor: color.toString(),
      travelType: travel.toString(),
      time: (json['Time'] ?? '').toString(),
      timeRoute: (json['TimeRoute'] ?? '').toString(),
    );
  }
}

class JourneyRoute {
  final int totalTime;
  final double totalKm;
  final int countStation;
  final int countInterchange;
  final double fareRateTotal;
  final List<JourneyStep> steps;

  const JourneyRoute({
    required this.totalTime,
    required this.totalKm,
    required this.countStation,
    required this.countInterchange,
    required this.fareRateTotal,
    required this.steps,
  });

  factory JourneyRoute.fromJson(Map<String, dynamic> json) {
    final rawSteps = json['RoutesJorney'] as List<dynamic>? ?? [];
    final steps = rawSteps
        .map((s) => JourneyStep.fromJson(s as Map<String, dynamic>))
        .toList();

    return JourneyRoute(
      totalTime: (json['TotalTime'] is num) ? (json['TotalTime'] as num).toInt() : int.tryParse('${json['TotalTime']}') ?? 0,
      totalKm: (json['TotalKm'] is num) ? (json['TotalKm'] as num).toDouble() : double.tryParse('${json['TotalKm']}') ?? 0.0,
      countStation: (json['Count_Station'] is num) ? (json['Count_Station'] as num).toInt() : int.tryParse('${json['Count_Station']}') ?? 0,
      countInterchange: (json['Count_InterChange'] is num) ? (json['Count_InterChange'] as num).toInt() : int.tryParse('${json['Count_InterChange']}') ?? 0,
      fareRateTotal: (json['FareRate_Total'] is num) ? (json['FareRate_Total'] as num).toDouble() : double.tryParse('${json['FareRate_Total']}') ?? 0.0,
      steps: steps,
    );
  }
}
