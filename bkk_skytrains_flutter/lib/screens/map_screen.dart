import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class MapScreen extends StatelessWidget {
  const MapScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.darkBg,
      body: SafeArea(
        child: Column(
          children: [
            _buildStickyHeader(),
            Expanded(
              child: Center(
                child: InteractiveViewer(
                  minScale: 0.5,
                  maxScale: 4.0,
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Container(
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        color: AppTheme.darkCard,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppTheme.darkCardBorder),
                      ),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.map_outlined, size: 64, color: AppTheme.mrtBlue),
                          const SizedBox(height: 16),
                          const Text(
                            'แผนที่โครงข่ายระบบรถไฟฟ้ากรุงเทพฯ',
                            style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            'BTS สุขุมวิท • สีลม • สีทอง • MRT น้ำเงิน • ม่วง • เหลือง • ชมพู • สายสีแดง • ARL',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                          ),
                          const SizedBox(height: 24),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            alignment: WrapAlignment.center,
                            children: [
                              _buildLegendBadge('สุขุมวิท', AppTheme.btsGreen),
                              _buildLegendBadge('สีลม', AppTheme.silomTeal),
                              _buildLegendBadge('สีทอง', AppTheme.goldLine),
                              _buildLegendBadge('สีเหลือง', AppTheme.yellowLine),
                              _buildLegendBadge('สีชมพู', AppTheme.pinkLine),
                              _buildLegendBadge('สีน้ำเงิน', AppTheme.mrtBlue),
                              _buildLegendBadge('สีม่วง', AppTheme.mrtPurple),
                              _buildLegendBadge('สายสีแดง', AppTheme.srtRed),
                              _buildLegendBadge('แอร์พอร์ตลิงก์', AppTheme.arlRed),
                            ],
                          ),
                          const SizedBox(height: 20),
                          const Text(
                            '🔍 ใช้นิ้วซูมเข้า-ออก เพื่อขยายดูรายละเอียดสถานี',
                            style: TextStyle(color: Colors.white54, fontSize: 11),
                          ),
                        ],
                      ),
                    ),
                  ),
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
          Icon(Icons.map, color: AppTheme.mrtBlue, size: 24),
          SizedBox(width: 10),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'แผนที่ระบบรถไฟฟ้า',
                style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
              ),
              Text(
                'โครงข่ายและจุดเชื่อมต่อทุกสาย (Interchange)',
                style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildLegendBadge(String name, Color col) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: col.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: col.withValues(alpha: 0.5)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          CircleAvatar(radius: 4, backgroundColor: col),
          const SizedBox(width: 6),
          Text(name, style: TextStyle(color: col, fontSize: 11, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}
