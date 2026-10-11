import 'dart:async';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/station.dart';
import '../services/location_service.dart';
import '../services/static_stations.dart';
import '../theme/app_theme.dart';
import '../widgets/station_picker_modal.dart';
import 'fares_screen.dart';
import 'map_screen.dart';
import 'trip_planner_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentNavIndex = 0;
  bool _isLocating = false;
  StationDistance? _nearest;
  List<StationDistance> _nearbyList = [];
  Timer? _clockTimer;
  String _currentTimeString = '';

  @override
  void initState() {
    super.initState();
    _updateClock();
    _clockTimer = Timer.periodic(const Duration(seconds: 1), (_) => _updateClock());
    _loadInitialLocation();
  }

  @override
  void dispose() {
    _clockTimer?.cancel();
    super.dispose();
  }

  void _updateClock() {
    final now = DateTime.now();
    final fmt = DateFormat('HH:mm:ss');
    setState(() {
      _currentTimeString = fmt.format(now);
    });
  }

  Future<void> _loadInitialLocation() async {
    setState(() => _isLocating = true);

    // ค่าเริ่มต้นหากยังไม่ได้พิกัด GPS (E4 อโศก)
    final fallbackStation = kStaticStations.firstWhere(
      (s) => s.stationKey == 'E4',
      orElse: () => kStaticStations.first,
    );

    setState(() {
      _nearest = StationDistance(station: fallbackStation, distanceKm: 0.5);
      _nearbyList = [
        _nearest!,
        StationDistance(
          station: kStaticStations.firstWhere((s) => s.stationKey == 'E5', orElse: () => kStaticStations[1]),
          distanceKm: 1.2,
        ),
        StationDistance(
          station: kStaticStations.firstWhere((s) => s.stationKey == 'E3', orElse: () => kStaticStations[2]),
          distanceKm: 0.9,
        ),
      ];
    });

    // ดึงพิกัดจริง
    try {
      final pos = await LocationService.getCurrentLocation();
      if (pos != null && mounted) {
        final ranked = LocationService.findNearestStations(
          userLat: pos.latitude,
          userLon: pos.longitude,
          allStations: kStaticStations,
          limit: 3,
        );

        if (ranked.isNotEmpty) {
          setState(() {
            _nearest = ranked.first;
            _nearbyList = ranked;
          });
        }
      }
    } catch (_) {}

    if (mounted) setState(() => _isLocating = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.darkBg,
      body: IndexedStack(
        index: _currentNavIndex,
        children: [
          _buildHomeContent(),
          const MapScreen(),
          const TripPlannerScreen(),
          const FaresScreen(),
        ],
      ),
      bottomNavigationBar: _buildBottomNav(),
    );
  }

  Widget _buildHomeContent() {
    return SafeArea(
      top: false,
      child: Column(
        children: [
          _buildStickyHeader(),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              children: [
                _buildNearestStationCard(),
                const SizedBox(height: 14),
                _buildTripPlannerBanner(),
                const SizedBox(height: 14),
                _buildLineChips(),
                const SizedBox(height: 24),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStickyHeader() {
    return Container(
      padding: EdgeInsets.only(
        top: MediaQuery.of(context).padding.top + 8,
        left: 16,
        right: 16,
        bottom: 10,
      ),
      decoration: BoxDecoration(
        color: AppTheme.darkHeader,
        border: const Border(
          bottom: BorderSide(color: Color(0x22FFFFFF), width: 1),
        ),
        boxShadow: const [
          BoxShadow(
            color: Colors.black26,
            offset: Offset(0, 4),
            blurRadius: 10,
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: const Color(0xFF10213A),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: Colors.white24, width: 1.5),
                ),
                child: const Center(
                  child: Text('🚇', style: TextStyle(fontSize: 20)),
                ),
              ),
              const SizedBox(width: 10),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Text(
                        'BKK SKYTRAINs',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                          letterSpacing: -0.2,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                        decoration: BoxDecoration(
                          color: const Color(0x3322C55E),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: AppTheme.accentGreen.withValues(alpha: 0.5)),
                        ),
                        child: const Row(
                          children: [
                            CircleAvatar(radius: 3, backgroundColor: AppTheme.accentGreen),
                            SizedBox(width: 4),
                            Text(
                              'LIVE',
                              style: TextStyle(
                                color: Color(0xFF6EE7B7),
                                fontSize: 8.5,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const Text(
                    'สถานะรถไฟฟ้า BTS/MRT ณ ขณะนี้',
                    style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10),
                  ),
                ],
              ),
            ],
          ),
          Text(
            _currentTimeString,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 13.5,
              fontWeight: FontWeight.w800,
              fontFeatures: [FontFeature.tabularFigures()],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNearestStationCard() {
    final current = _nearest;
    if (current == null) {
      return const Center(child: CircularProgressIndicator());
    }

    final station = current.station;
    final lineColor = AppTheme.parseHexColor(station.lineColor);

    return Container(
      decoration: BoxDecoration(
        color: AppTheme.darkCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.darkCardBorder),
        boxShadow: const [
          BoxShadow(
            color: Colors.black38,
            offset: Offset(0, 4),
            blurRadius: 12,
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Bar
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Row(
                  children: [
                    Text('📍', style: TextStyle(fontSize: 14)),
                    SizedBox(width: 6),
                    Text(
                      'สถานีใกล้คุณที่สุด',
                      style: TextStyle(
                        color: Color(0xFF94A3B8),
                        fontSize: 12.5,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                InkWell(
                  onTap: _isLocating ? null : _loadInitialLocation,
                  borderRadius: BorderRadius.circular(20),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.white10,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Colors.white12),
                    ),
                    child: Row(
                      children: [
                        _isLocating
                            ? const SizedBox(
                                width: 12,
                                height: 12,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                              )
                            : const Text('🧭', style: TextStyle(fontSize: 12)),
                        const SizedBox(width: 4),
                        const Text(
                          'หาใหม่',
                          style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1, color: AppTheme.darkCardBorder),

          // Station Hero
          InkWell(
            onTap: () async {
              final st = await StationPickerModal.show(
                context,
                title: 'เลือกสถานี',
                initialSelectedKey: station.stationKey,
              );
              if (st != null) {
                setState(() {
                  _nearest = StationDistance(station: st, distanceKm: 0.0);
                });
              }
            },
            borderRadius: BorderRadius.circular(12),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: lineColor,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    station.stationKey,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        station.nameTH,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 17,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        station.nameEN,
                        style: const TextStyle(
                          color: Color(0xFF94A3B8),
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      current.formattedDistance,
                      style: const TextStyle(
                        color: AppTheme.accentGreen,
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const Text(
                      'จากตำแหน่งคุณ',
                      style: TextStyle(color: Color(0xFF64748B), fontSize: 10),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),

          // Platforms Side-by-Side (2 Columns)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: Row(
              children: [
                Expanded(
                  child: _buildPlatformBox(
                    platNumber: 1,
                    direction: 'ไปทาง เคหะฯ',
                    minutes: 5,
                    isArriving: true,
                    nextMins: [10, 17],
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _buildPlatformBox(
                    platNumber: 2,
                    direction: 'ไปทาง คูคต',
                    minutes: 3,
                    isArriving: false,
                    nextMins: [9, 14],
                  ),
                ),
              ],
            ),
          ),

          // Alternate Nearby Stations
          if (_nearbyList.length > 1)
            Padding(
              padding: const EdgeInsets.all(16),
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: _nearbyList.map((item) {
                    final isSel = item.station.stationKey == station.stationKey;
                    final itemColor = AppTheme.parseHexColor(item.station.lineColor);
                    return Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: InkWell(
                        onTap: () => setState(() => _nearest = item),
                        borderRadius: BorderRadius.circular(20),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                          decoration: BoxDecoration(
                            color: isSel ? itemColor.withValues(alpha: 0.2) : Colors.white.withValues(alpha: 0.05),
                            borderRadius: BorderRadius.circular(20),
                              border: Border.all(
                                color: isSel ? AppTheme.accentGreen : Colors.white12,
                                width: 2,
                              ),
                          ),
                          child: Row(
                            children: [
                              CircleAvatar(radius: 4, backgroundColor: itemColor),
                              const SizedBox(width: 6),
                              Text(
                                '${item.station.stationKey} ${item.station.nameTH}',
                                style: TextStyle(
                                  color: isSel ? Colors.white : const Color(0xFFCBD5E1),
                                  fontSize: 11,
                                  fontWeight: isSel ? FontWeight.bold : FontWeight.normal,
                                ),
                              ),
                              const SizedBox(width: 4),
                              Text(
                                item.formattedDistance,
                                style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildPlatformBox({
    required int platNumber,
    required String direction,
    required int minutes,
    required bool isArriving,
    required List<int> nextMins,
  }) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.darkCardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                decoration: BoxDecoration(
                  color: AppTheme.btsGreen,
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  '$platNumber',
                  style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                ),
              ),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  direction,
                  style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10.5, fontWeight: FontWeight.bold),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                isArriving ? 'กำลังเข้า' : '$minutes นาที',
                style: TextStyle(
                  color: isArriving ? const Color(0xFFF87171) : AppTheme.accentGreen,
                  fontSize: 16,
                  fontWeight: FontWeight.w900,
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: nextMins.map((m) => Text(
                  '$m นาที',
                  style: const TextStyle(color: Color(0xFF64748B), fontSize: 9.5),
                )).toList(),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildTripPlannerBanner() {
    return InkWell(
      onTap: () => setState(() => _currentNavIndex = 2),
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [
              AppTheme.mrtBlue.withValues(alpha: 0.12),
              AppTheme.accentGreen.withValues(alpha: 0.12),
            ],
          ),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppTheme.mrtBlue.withValues(alpha: 0.25)),
        ),
        child: const Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                Text('🧭', style: TextStyle(fontSize: 22)),
                SizedBox(width: 10),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'วางแผนการเดินทาง & เช็คค่าโดยสาร',
                      style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                    ),
                    Text(
                      'ค้นหาเส้นทาง คำนวณเวลา และราคาข้าม 10 สาย',
                      style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10.5),
                    ),
                  ],
                ),
              ],
            ),
            Icon(Icons.arrow_forward_ios, size: 14, color: Colors.white54),
          ],
        ),
      ),
    );
  }

  Widget _buildLineChips() {
    final lines = [
      {'name': 'สุขุมวิท', 'color': AppTheme.btsGreen},
      {'name': 'สีลม', 'color': AppTheme.silomTeal},
      {'name': 'สีทอง', 'color': AppTheme.goldLine},
      {'name': 'สีเหลือง', 'color': AppTheme.yellowLine},
      {'name': 'สีชมพู', 'color': AppTheme.pinkLine},
      {'name': 'สีน้ำเงิน', 'color': AppTheme.mrtBlue},
      {'name': 'สีม่วง', 'color': AppTheme.mrtPurple},
      {'name': 'สายสีแดงเข้ม', 'color': AppTheme.srtDarkRed},
      {'name': 'สายสีแดงอ่อน', 'color': AppTheme.srtLightRed},
      {'name': 'แอร์พอร์ตลิงก์', 'color': AppTheme.arlRed},
    ];

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: lines.map((l) {
          final col = l['color'] as Color;
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: ActionChip(
              onPressed: () async {
                final st = await StationPickerModal.show(
                  context,
                  title: 'เลือกสถานีสาย${l['name']}',
                );
                if (st != null) {
                  setState(() {
                    _nearest = StationDistance(station: st, distanceKm: 0.0);
                  });
                }
              },
              backgroundColor: col.withValues(alpha: 0.15),
              side: BorderSide(color: col.withValues(alpha: 0.4)),
              label: Text(
                l['name'] as String,
                style: TextStyle(color: col, fontSize: 11.5, fontWeight: FontWeight.bold),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildBottomNav() {
    return NavigationBar(
      selectedIndex: _currentNavIndex,
      backgroundColor: AppTheme.darkHeader,
      indicatorColor: AppTheme.accentGreen.withValues(alpha: 0.2),
      onDestinationSelected: (idx) => setState(() => _currentNavIndex = idx),
      destinations: const [
        NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home, color: AppTheme.accentGreen), label: 'หน้าแรก'),
        NavigationDestination(icon: Icon(Icons.map_outlined), selectedIcon: Icon(Icons.map, color: AppTheme.accentGreen), label: 'แผนที่'),
        NavigationDestination(icon: Icon(Icons.route_outlined), selectedIcon: Icon(Icons.route, color: AppTheme.accentGreen), label: 'วางแผน'),
        NavigationDestination(icon: Icon(Icons.credit_card_outlined), selectedIcon: Icon(Icons.credit_card, color: AppTheme.accentGreen), label: 'ค่าโดยสาร'),
      ],
    );
  }
}
