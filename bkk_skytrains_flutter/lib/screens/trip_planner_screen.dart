import 'package:flutter/material.dart';
import '../models/journey.dart';
import '../models/station.dart';
import '../services/api_service.dart';
import '../services/location_service.dart';
import '../services/static_stations.dart';
import '../theme/app_theme.dart';
import '../widgets/station_picker_modal.dart';

class TripPlannerScreen extends StatefulWidget {
  final Station? initialOrigin;
  final Station? initialDestination;

  const TripPlannerScreen({
    super.key,
    this.initialOrigin,
    this.initialDestination,
  });

  @override
  State<TripPlannerScreen> createState() => _TripPlannerScreenState();
}

class _TripPlannerScreenState extends State<TripPlannerScreen> {
  Station? _origin;
  Station? _destination;
  bool _isLoading = false;
  String? _errorMessage;
  List<JourneyRoute> _routes = [];
  int _selectedRouteIndex = 0;

  @override
  void initState() {
    super.initState();
    _origin = widget.initialOrigin ?? StaticStations.findByKey('E4'); // Asok
    _destination = widget.initialDestination ?? StaticStations.findByKey('CEN'); // Siam
    _calculateRoute();
  }

  Future<void> _calculateRoute() async {
    if (_origin == null || _destination == null) return;
    if (_origin!.stationKey == _destination!.stationKey) {
      setState(() {
        _errorMessage = 'สถานีต้นทางและปลายทางต้องไม่เป็นสถานีเดียวกัน';
        _routes = [];
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final routes = await ApiService.fetchJourney(
        originKey: _origin!.stationKey,
        destKey: _destination!.stationKey,
      );
      if (mounted) {
        setState(() {
          _routes = routes;
          _selectedRouteIndex = 0;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString().replaceAll('Exception: ', '');
          _routes = [];
          _isLoading = false;
        });
      }
    }
  }

  void _swapStations() {
    setState(() {
      final tmp = _origin;
      _origin = _destination;
      _destination = tmp;
    });
    _calculateRoute();
  }

  Future<void> _useNearestStation() async {
    final nearest = await LocationService.findNearestStation();
    if (nearest != null && mounted) {
      setState(() => _origin = nearest.station);
      _calculateRoute();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.darkBg,
      body: SafeArea(
        child: Column(
          children: [
            _buildStickyHeader(),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _buildInputCard(),
                    const SizedBox(height: 16),
                    if (_isLoading)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 40),
                        child: Center(
                          child: Column(
                            children: [
                              CircularProgressIndicator(color: AppTheme.accentGreen),
                              SizedBox(height: 12),
                              Text(
                                'กำลังคำนวณเส้นทางและค่าโดยสาร...',
                                style: TextStyle(color: Colors.white70, fontSize: 13),
                              ),
                            ],
                          ),
                        ),
                      )
                    else if (_errorMessage != null)
                      _buildErrorCard()
                    else if (_routes.isNotEmpty)
                      _buildRouteResults()
                    else
                      const Center(
                        child: Text(
                          'เลือกสถานีต้นทางและปลายทางเพื่อดูเส้นทาง',
                          style: TextStyle(color: Colors.white54),
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStickyHeader() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: const BoxDecoration(
        color: AppTheme.darkHeader,
        border: Border(bottom: BorderSide(color: AppTheme.darkCardBorder)),
      ),
      child: const Row(
        children: [
          Icon(Icons.route, color: AppTheme.accentGreen, size: 24),
          SizedBox(width: 10),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'วางแผนการเดินทาง',
                style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
              ),
              Text(
                'คำนวณเวลา ค่าโดยสาร และจุดเปลี่ยนสาย',
                style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildInputCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.darkCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.darkCardBorder),
      ),
      child: Column(
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Expanded(
                child: Column(
                  children: [
                    _buildStationSelector(
                      label: 'สถานีต้นทาง',
                      icon: Icons.trip_origin,
                      iconColor: AppTheme.accentGreen,
                      station: _origin,
                      onTap: () async {
                        final st = await StationPickerModal.show(
                          context,
                          title: 'เลือกสถานีต้นทาง',
                          initialSelectedKey: _origin?.stationKey,
                        );
                        if (st != null) {
                          setState(() => _origin = st);
                          _calculateRoute();
                        }
                      },
                    ),
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 4),
                      child: Divider(color: Colors.white12, height: 1),
                    ),
                    _buildStationSelector(
                      label: 'สถานีปลายทาง',
                      icon: Icons.location_on,
                      iconColor: const Color(0xFFEF4444),
                      station: _destination,
                      onTap: () async {
                        final st = await StationPickerModal.show(
                          context,
                          title: 'เลือกสถานีปลายทาง',
                          initialSelectedKey: _destination?.stationKey,
                        );
                        if (st != null) {
                          setState(() => _destination = st);
                          _calculateRoute();
                        }
                      },
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              // Swap button
              InkWell(
                onTap: _swapStations,
                borderRadius: BorderRadius.circular(30),
                child: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E293B),
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white12),
                  ),
                  child: const Icon(Icons.swap_vert, color: Colors.white, size: 22),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // Action Buttons
          Row(
            children: [
              OutlinedButton.icon(
                onPressed: _useNearestStation,
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.white70,
                  side: const BorderSide(color: Colors.white24),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                ),
                icon: const Icon(Icons.my_location, size: 14, color: AppTheme.accentGreen),
                label: const Text('สถานีใกล้ฉัน', style: TextStyle(fontSize: 12)),
              ),
              const Spacer(),
              ElevatedButton.icon(
                onPressed: _calculateRoute,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.accentGreen,
                  foregroundColor: Colors.black,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                ),
                icon: const Icon(Icons.search, size: 16, color: Colors.black),
                label: const Text('ค้นหาเส้นทาง', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStationSelector({
    required String label,
    required IconData icon,
    required Color iconColor,
    required Station? station,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Row(
          children: [
            Icon(icon, color: iconColor, size: 18),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10.5)),
                  const SizedBox(height: 2),
                  if (station != null)
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppTheme.parseHexColor(station.lineColor),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            station.stationKey,
                            style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Flexible(
                          child: Text(
                            station.nameTH,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(color: Colors.white, fontSize: 14.5, fontWeight: FontWeight.w600),
                          ),
                        ),
                        const SizedBox(width: 4),
                        Flexible(
                          child: Text(
                            '(${station.nameEN})',
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                          ),
                        ),
                      ],
                    )
                  else
                    const Text('แตะเพื่อเลือกสถานี', style: TextStyle(color: Colors.white38, fontSize: 14)),
                ],
              ),
            ),
            const Icon(Icons.arrow_forward_ios, color: Colors.white24, size: 13),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0x33EF4444),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFEF4444).withValues(alpha: 0.5)),
      ),
      child: Row(
        children: [
          const Icon(Icons.error_outline, color: Color(0xFFF87171)),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              _errorMessage ?? 'เกิดข้อผิดพลาด',
              style: const TextStyle(color: Colors.white, fontSize: 13),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRouteResults() {
    final route = _routes[_selectedRouteIndex];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Summary Cards
        Row(
          children: [
            _buildStatCard('เวลาเดินทาง', '${route.totalTime}', 'นาที', const Color(0xFF38BDF8), Icons.access_time),
            const SizedBox(width: 8),
            _buildStatCard('ค่าโดยสาร', route.fareRateTotal.toStringAsFixed(0), 'บาท', AppTheme.accentGreen, Icons.payments_outlined),
            const SizedBox(width: 8),
            _buildStatCard('จำนวนสถานี', '${route.countStation}', 'สถานี', const Color(0xFFA78BFA), Icons.train_outlined),
            const SizedBox(width: 8),
            _buildStatCard('เปลี่ยนสาย', '${route.countInterchange}', 'ครั้ง', const Color(0xFFFBBF24), Icons.alt_route),
          ],
        ),
        const SizedBox(height: 16),

        // Route Steps Card
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppTheme.darkCard,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppTheme.darkCardBorder),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(Icons.directions_subway, color: AppTheme.accentGreen, size: 18),
                  SizedBox(width: 8),
                  Text(
                    'รายละเอียดการเดินทาง',
                    style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: route.steps.length,
                itemBuilder: (ctx, i) {
                  final step = route.steps[i];
                  final isFirst = i == 0;
                  final isLast = i == route.steps.length - 1;
                  final isInterchange = step.travelType == 'InterChange';
                  final col = AppTheme.parseHexColor(step.lineColor);

                  return Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Step Indicator Timeline
                      Column(
                        children: [
                          Container(
                            width: 14,
                            height: 14,
                            decoration: BoxDecoration(
                              color: isFirst || isLast ? col : Colors.transparent,
                              shape: BoxShape.circle,
                              border: Border.all(color: col, width: 3),
                            ),
                          ),
                          if (!isLast)
                            Container(
                              width: 3,
                              height: 38,
                              color: col,
                            ),
                        ],
                      ),
                      const SizedBox(width: 12),

                      // Station & Step Detail
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                                    decoration: BoxDecoration(
                                      color: col,
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: Text(
                                      step.stationCode,
                                      style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Text(
                                    step.nameTH,
                                    style: TextStyle(
                                      color: isFirst || isLast || isInterchange ? Colors.white : const Color(0xFFCBD5E1),
                                      fontSize: 13.5,
                                      fontWeight: isFirst || isLast || isInterchange ? FontWeight.bold : FontWeight.normal,
                                    ),
                                  ),
                                  const SizedBox(width: 4),
                                  Text(
                                    step.nameEN,
                                    style: const TextStyle(color: Color(0xFF64748B), fontSize: 11),
                                  ),
                                  const Spacer(),
                                  if (step.timeRoute.isNotEmpty)
                                    Text(
                                      step.timeRoute,
                                      style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                                    ),
                                ],
                              ),
                              if (isInterchange)
                                Container(
                                  margin: const EdgeInsets.only(top: 6),
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: const Color(0x33FBBF24),
                                    borderRadius: BorderRadius.circular(6),
                                    border: Border.all(color: const Color(0xFFFBBF24).withValues(alpha: 0.5)),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      const Icon(Icons.alt_route, color: Color(0xFFFBBF24), size: 12),
                                      const SizedBox(width: 6),
                                      Text(
                                        'จุดเปลี่ยนสายที่สถานี ${step.nameTH} (${step.lineName})',
                                        style: const TextStyle(color: Color(0xFFFDE68A), fontSize: 11),
                                      ),
                                    ],
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  );
                },
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildStatCard(String label, String value, String unit, Color color, IconData icon) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
        decoration: BoxDecoration(
          color: AppTheme.darkCard,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppTheme.darkCardBorder),
        ),
        child: Column(
          children: [
            Icon(icon, size: 18, color: color),
            const SizedBox(height: 4),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              children: [
                Text(
                  value,
                  style: TextStyle(color: color, fontSize: 17, fontWeight: FontWeight.bold),
                ),
                const SizedBox(width: 2),
                Text(
                  unit,
                  style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 9.5),
                ),
              ],
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: const TextStyle(color: Color(0xFF64748B), fontSize: 9.5),
            ),
          ],
        ),
      ),
    );
  }
}
