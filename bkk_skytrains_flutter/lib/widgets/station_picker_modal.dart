import 'package:flutter/material.dart';
import '../models/station.dart';
import '../services/static_stations.dart';
import '../theme/app_theme.dart';

class StationPickerModal extends StatefulWidget {
  final String title;
  final String? initialSelectedKey;

  const StationPickerModal({
    super.key,
    required this.title,
    this.initialSelectedKey,
  });

  static Future<Station?> show(BuildContext context, {
    required String title,
    String? initialSelectedKey,
  }) {
    return showModalBottomSheet<Station>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => StationPickerModal(
        title: title,
        initialSelectedKey: initialSelectedKey,
      ),
    );
  }

  @override
  State<StationPickerModal> createState() => _StationPickerModalState();
}

class _StationPickerModalState extends State<StationPickerModal> {
  final TextEditingController _searchCtrl = TextEditingController();
  String _filter = '';
  int? _selectedLineId;

  @override
  Widget build(BuildContext context) {
    final allStations = StaticStations.allStations;
    final lines = [
      {'id': null, 'name': 'ทั้งหมด', 'color': Colors.grey},
      {'id': 1, 'name': 'สุขุมวิท', 'color': AppTheme.btsGreen},
      {'id': 2, 'name': 'สีลม', 'color': AppTheme.silomTeal},
      {'id': 3, 'name': 'สีทอง', 'color': AppTheme.goldLine},
      {'id': 4, 'name': 'สีเหลือง', 'color': AppTheme.yellowLine},
      {'id': 5, 'name': 'สีชมพู', 'color': AppTheme.pinkLine},
      {'id': 101, 'name': 'สีน้ำเงิน', 'color': AppTheme.mrtBlue},
      {'id': 102, 'name': 'สีม่วง', 'color': AppTheme.mrtPurple},
      {'id': 103, 'name': 'สายสีแดง', 'color': AppTheme.srtRed},
      {'id': 104, 'name': 'แอร์พอร์ตลิงก์', 'color': AppTheme.arlRed},
    ];

    final filtered = allStations.where((s) {
      if (_selectedLineId != null && s.lineId != _selectedLineId) {
        return false;
      }
      if (_filter.isEmpty) return true;
      final query = _filter.toLowerCase().trim();
      return s.nameTH.toLowerCase().contains(query) ||
          s.nameEN.toLowerCase().contains(query) ||
          s.stationKey.toLowerCase().contains(query);
    }).toList();

    return Container(
      height: MediaQuery.of(context).size.height * 0.85,
      decoration: const BoxDecoration(
        color: AppTheme.darkCard,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        children: [
          // Header handle
          Container(
            margin: const EdgeInsets.only(top: 10, bottom: 8),
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: Colors.white24,
              borderRadius: BorderRadius.circular(2),
            ),
          ),

          // Title & Close button
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  widget.title,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 17,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close, color: Colors.white70),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),

          // Search field
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: TextField(
              controller: _searchCtrl,
              onChanged: (val) => setState(() => _filter = val),
              style: const TextStyle(color: Colors.white, fontSize: 14),
              decoration: InputDecoration(
                hintText: 'ค้นหาชื่อสถานี หรือรหัส (เช่น สยาม, E4, Asok)',
                hintStyle: const TextStyle(color: Colors.white38, fontSize: 13),
                prefixIcon: const Icon(Icons.search, color: Colors.white54, size: 20),
                suffixIcon: _filter.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, color: Colors.white54, size: 18),
                        onPressed: () {
                          _searchCtrl.clear();
                          setState(() => _filter = '');
                        },
                      )
                    : null,
                filled: true,
                fillColor: const Color(0xFF1E293B),
                contentPadding: const EdgeInsets.symmetric(vertical: 10),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
          ),

          // Line filters
          Container(
            height: 44,
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: lines.length,
              itemBuilder: (ctx, i) {
                final l = lines[i];
                final isSel = _selectedLineId == l['id'];
                final col = l['color'] as Color;
                return Padding(
                  padding: const EdgeInsets.only(right: 6),
                  child: FilterChip(
                    label: Text(
                      l['name'] as String,
                      style: TextStyle(
                        color: isSel ? Colors.white : Colors.white70,
                        fontSize: 11.5,
                        fontWeight: isSel ? FontWeight.bold : FontWeight.normal,
                      ),
                    ),
                    selected: isSel,
                    onSelected: (_) => setState(() => _selectedLineId = l['id'] as int?),
                    backgroundColor: const Color(0xFF1E293B),
                    selectedColor: col.withValues(alpha: 0.4),
                    checkmarkColor: Colors.white,
                    side: BorderSide(color: isSel ? col : Colors.transparent),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                );
              },
            ),
          ),

          const Divider(color: Colors.white12, height: 1),

          // Station list
          Expanded(
            child: filtered.isEmpty
                ? const Center(
                    child: Text('ไม่พบสถานีที่ค้นหา', style: TextStyle(color: Colors.white54)),
                  )
                : ListView.builder(
                    itemCount: filtered.length,
                    itemBuilder: (ctx, i) {
                      final st = filtered[i];
                      final isCurrent = st.stationKey == widget.initialSelectedKey;
                      final col = AppTheme.parseHexColor(st.lineColor);

                      return ListTile(
                        onTap: () => Navigator.pop(context, st),
                        tileColor: isCurrent ? col.withValues(alpha: 0.15) : null,
                        leading: Container(
                          width: 44,
                          height: 30,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            color: col,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            st.stationKey,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        title: Text(
                          st.nameTH,
                          style: TextStyle(
                            color: isCurrent ? Colors.white : const Color(0xFFF1F5F9),
                            fontSize: 14.5,
                            fontWeight: isCurrent ? FontWeight.bold : FontWeight.w500,
                          ),
                        ),
                        subtitle: Text(
                          '${st.nameEN} • ${st.lineNameTH}',
                          style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11.5),
                        ),
                        trailing: isCurrent
                            ? const Icon(Icons.check_circle, color: AppTheme.accentGreen, size: 20)
                            : const Icon(Icons.arrow_forward_ios, color: Colors.white24, size: 14),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
