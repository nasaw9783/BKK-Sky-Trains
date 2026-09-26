import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class FaresScreen extends StatelessWidget {
  const FaresScreen({super.key});

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
                    // Flat Fare Policy Banner (20 Baht Policy)
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [
                            const Color(0xFFC21E25).withValues(alpha: 0.25),
                            const Color(0xFF8A2C9B).withValues(alpha: 0.25),
                          ],
                        ),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFFC21E25).withValues(alpha: 0.5)),
                      ),
                      child: const Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text('🎟️', style: TextStyle(fontSize: 22)),
                              SizedBox(width: 8),
                              Text(
                                'นโยบายค่าโดยสาร 20 บาทตลอดสาย',
                                style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold),
                              ),
                            ],
                          ),
                          SizedBox(height: 6),
                          Text(
                            'ใช้ได้กับ รถไฟฟ้าสายสีม่วง (MRT คลองบางไผ่ - เตาปูน) และ รถไฟฟ้าชานเมืองสายสีแดง (SRT ตลิ่งชัน - รังสิต)',
                            style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Fare rates per line
                    _buildFareCard(
                      'รถไฟฟ้า BTS สายสุขุมวิท & สีลม',
                      '17 - 62 บาท',
                      'คำนวณตามระยะทาง (ส่วนต่อขยาย 15 บาท)',
                      AppTheme.btsGreen,
                    ),
                    const SizedBox(height: 12),
                    _buildFareCard(
                      'รถไฟฟ้า BTS สายสีทอง',
                      '16 บาท',
                      'อัตราคงที่ตลอดสาย (กรุงธนบุรี - คลองสาน)',
                      AppTheme.goldLine,
                    ),
                    const SizedBox(height: 12),
                    _buildFareCard(
                      'รถไฟฟ้า MRT สายสีน้ำเงิน',
                      '17 - 45 บาท',
                      'อัตราค่าโดยสารตามระยะทาง (สูงสุด 45 บาท)',
                      AppTheme.mrtBlue,
                    ),
                    const SizedBox(height: 12),
                    _buildFareCard(
                      'รถไฟฟ้าโมโนเรล สายสีเหลือง & ชมพู',
                      '15 - 45 บาท',
                      'คำนวณตามระยะทาง (ลาดพร้าว - สำโรง / แคราย - มีนบุรี)',
                      AppTheme.yellowLine,
                    ),
                    const SizedBox(height: 12),
                    _buildFareCard(
                      'รถไฟฟ้าแอร์พอร์ต เรล ลิงก์ (ARL)',
                      '15 - 45 บาท',
                      'พญาไท - สุวรรณภูมิ (8 สถานี)',
                      AppTheme.arlRed,
                    ),
                    const SizedBox(height: 20),

                    // Card Types
                    const Text(
                      '💳 บัตรที่รองรับการเดินทาง',
                      style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 10),
                    _buildCardTypeItem('บัตร Rabbit', 'ใช้ได้กับ BTS สายสุขุมวิท, สีลม, สีทอง, BRT และสายสีเหลือง/ชมพู'),
                    _buildCardTypeItem('บัตร EMV Contactless', 'บัตรเครดิต/เดบิต Visa / Mastercard แตะเข้า MRT และสายสีแดงได้ทันที'),
                    _buildCardTypeItem('เหรียญโดยสาร (Token / QR Ticket)', 'ซื้อได้ที่ตู้จำหน่ายตั๋วอัตโนมัติทุกสถานี'),
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
          Icon(Icons.credit_card, color: AppTheme.accentGreen, size: 24),
          SizedBox(width: 10),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'อัตราค่าโดยสาร & บัตรเดินทาง',
                style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
              ),
              Text(
                'ตารางค่าโดยสารรถไฟฟ้าทุกสายและนโยบาย 20 บาท',
                style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildFareCard(String title, String price, String desc, Color col) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.darkCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.darkCardBorder),
      ),
      child: Row(
        children: [
          Container(width: 4, height: 42, decoration: BoxDecoration(color: col, borderRadius: BorderRadius.circular(2))),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(color: Colors.white, fontSize: 13.5, fontWeight: FontWeight.bold)),
                const SizedBox(height: 2),
                Text(desc, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: col.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: col.withValues(alpha: 0.4)),
            ),
            child: Text(
              price,
              style: TextStyle(color: col, fontSize: 13, fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCardTypeItem(String name, String desc) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppTheme.darkCard,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: Colors.white12),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Icon(Icons.check_circle, color: AppTheme.accentGreen, size: 16),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(name, style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 2),
                  Text(desc, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11.5)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
