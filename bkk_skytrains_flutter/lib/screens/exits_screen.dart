import 'package:flutter/material.dart';
import '../models/station.dart';
import '../services/static_stations.dart';
import '../theme/app_theme.dart';
import '../widgets/station_picker_modal.dart';

class ExitsScreen extends StatefulWidget {
  const ExitsScreen({super.key});

  @override
  State<ExitsScreen> createState() => _ExitsScreenState();
}

class _ExitsScreenState extends State<ExitsScreen> {
  Station _currentStation = StaticStations.findByKey('E4') ?? StaticStations.allStations.first;

  @override
  Widget build(BuildContext context) {
    final col = AppTheme.parseHexColor(_currentStation.lineColor);

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
                    // Station Selector Card
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
                          const Text('เลือกสถานีเพื่อดูทางออกและสิ่งอำนวยความสะดวก', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11.5)),
                          const SizedBox(height: 10),
                          InkWell(
                            onTap: () async {
                              final st = await StationPickerModal.show(
                                context,
                                title: 'เลือกสถานี',
                                initialSelectedKey: _currentStation.stationKey,
                              );
                              if (st != null) {
                                setState(() => _currentStation = st);
                              }
                            },
                            borderRadius: BorderRadius.circular(10),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                              decoration: BoxDecoration(
                                color: const Color(0xFF1E293B),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: col.withValues(alpha: 0.5)),
                              ),
                              child: Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: col,
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      _currentStation.stationKey,
                                      style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                                    ),
                                  ),
                                  const SizedBox(width: 10),
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        _currentStation.nameTH,
                                        style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold),
                                      ),
                                      Text(
                                        '${_currentStation.nameEN} • ${_currentStation.lineNameTH}',
                                        style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                                      ),
                                    ],
                                  ),
                                  const Spacer(),
                                  const Icon(Icons.arrow_drop_down, color: Colors.white70),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Exits Info List
                    _buildExitCard(1, 'ทางออก 1', 'เชื่อมต่อสกายวอล์ก, อาคารสำนักงาน, โรงแรม', Icons.door_front_door_outlined),
                    const SizedBox(height: 10),
                    _buildExitCard(2, 'ทางออก 2', 'บันไดเลื่อนขึ้น-ลง, ป้ายรถประจำทาง, จุดจอดรถแท็กซี่', Icons.escalator),
                    const SizedBox(height: 10),
                    _buildExitCard(3, 'ทางออก 3', 'จุดเชื่อมต่อ MRT สายสีน้ำเงิน, ลิฟต์สำหรับคนพิการและผู้สูงอายุ ♿', Icons.accessible_forward),
                    const SizedBox(height: 10),
                    _buildExitCard(4, 'ทางออก 4', 'ศูนย์การค้า, ถนนใหญ่, ทางลาดสำหรับวีลแชร์', Icons.shopping_bag_outlined),
                    const SizedBox(height: 16),

                    // Facilities Card
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppTheme.darkCard,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppTheme.darkCardBorder),
                      ),
                      child: const Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(Icons.info_outline, color: AppTheme.accentGreen, size: 18),
                              SizedBox(width: 8),
                              Text(
                                'สิ่งอำนวยความสะดวกในสถานี',
                                style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
                              ),
                            ],
                          ),
                          SizedBox(height: 12),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceAround,
                            children: [
                              _FacilityIcon(Icons.wc, 'ห้องน้ำ'),
                              _FacilityIcon(Icons.accessible, 'ลิฟต์ ♿'),
                              _FacilityIcon(Icons.local_atm, 'ตู้ ATM'),
                              _FacilityIcon(Icons.medical_services_outlined, 'ปฐมพยาบาล'),
                            ],
                          ),
                        ],
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
          Icon(Icons.exit_to_app, color: AppTheme.accentGreen, size: 24),
          SizedBox(width: 10),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'ทางออก & สิ่งอำนวยความสะดวก',
                style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
              ),
              Text(
                'ข้อมูลประตูทางออก ลิฟต์ และจุดเชื่อมต่อรถโดยสาร',
                style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildExitCard(int num, String title, String desc, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.darkCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.darkCardBorder),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 36,
            height: 36,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.white12),
            ),
            child: Icon(icon, color: AppTheme.accentGreen, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 2),
                Text(
                  desc,
                  style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _FacilityIcon extends StatelessWidget {
  final IconData icon;
  final String label;

  const _FacilityIcon(this.icon, this.label);

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: const Color(0xFF1E293B),
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white12),
          ),
          child: Icon(icon, color: Colors.white70, size: 20),
        ),
        const SizedBox(height: 6),
        Text(label, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
      ],
    );
  }
}
