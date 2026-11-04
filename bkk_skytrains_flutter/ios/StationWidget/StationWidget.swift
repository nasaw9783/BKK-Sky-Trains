import WidgetKit
import SwiftUI

// MARK: - Color Extension for Hex Support
extension Color {
    init(hex: String) {
        let cleanHex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: cleanHex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch cleanHex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 16, 185, 129)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

// MARK: - Timeline Entry
struct StationWidgetEntry: TimelineEntry {
    let date: Date
    let stationKey: String
    let stationName: String
    let distance: String
    let lineColor: String
    let plat1Dest: String
    let plat1Time: String
    let plat2Dest: String
    let plat2Time: String
    let isDetected: Bool
}

// MARK: - Timeline Provider
struct StationTimelineProvider: TimelineProvider {
    private let appGroupId = "group.com.bkkskytrains.app"

    func placeholder(in context: Context) -> StationWidgetEntry {
        StationWidgetEntry(
            date: Date(),
            stationKey: "CEN",
            stationName: "สยาม (Siam)",
            distance: "120 ม.",
            lineColor: "#7AB420",
            plat1Dest: "➔ คูคต",
            plat1Time: "2 นาที",
            plat2Dest: "➔ เคหะฯ",
            plat2Time: "4 นาที",
            isDetected: true
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (StationWidgetEntry) -> Void) {
        completion(readSharedEntry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<StationWidgetEntry>) -> Void) {
        let entry = readSharedEntry()
        // Refresh every 15 minutes or when triggered by HomeWidget.updateWidget
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date()) ?? Date().addingTimeInterval(900)
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }

    private func readSharedEntry() -> StationWidgetEntry {
        let sharedDefaults = UserDefaults(suiteName: appGroupId)
        let key = sharedDefaults?.string(forKey: "station_key") ?? ""
        let name = sharedDefaults?.string(forKey: "station_name") ?? ""
        let dist = sharedDefaults?.string(forKey: "distance") ?? ""
        let col = sharedDefaults?.string(forKey: "line_color") ?? "#7AB420"
        let p1Dest = sharedDefaults?.string(forKey: "plat1_dest") ?? ""
        let p1Time = sharedDefaults?.string(forKey: "plat1_time") ?? ""
        let p2Dest = sharedDefaults?.string(forKey: "plat2_dest") ?? ""
        let p2Time = sharedDefaults?.string(forKey: "plat2_time") ?? ""

        if key.isEmpty {
            return StationWidgetEntry(
                date: Date(),
                stationKey: "CEN",
                stationName: "สยาม (BTS)",
                distance: "ใกล้ที่สุด",
                lineColor: "#7AB420",
                plat1Dest: "➔ คูคต",
                plat1Time: "2 นาที",
                plat2Dest: "➔ เคหะฯ",
                plat2Time: "4 นาที",
                isDetected: false
            )
        }

        return StationWidgetEntry(
            date: Date(),
            stationKey: key,
            stationName: name.isEmpty ? key : name,
            distance: dist,
            lineColor: col,
            plat1Dest: p1Dest,
            plat1Time: p1Time,
            plat2Dest: p2Dest,
            plat2Time: p2Time,
            isDetected: true
        )
    }
}

// MARK: - Lock Screen: Accessory Rectangular View (ใต้ตัวเลขนาฬิกา iPhone)
struct StationAccessoryRectangularView: View {
    let entry: StationWidgetEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            HStack(spacing: 5) {
                Text(entry.stationKey)
                    .font(.system(size: 9.5, weight: .black, design: .monospaced))
                    .padding(.horizontal, 4)
                    .padding(.vertical, 1)
                    .background(Color(hex: entry.lineColor))
                    .foregroundColor(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 3))

                Text(entry.stationName)
                    .font(.system(size: 11.5, weight: .bold))
                    .foregroundColor(.primary)
                    .lineLimit(1)

                Spacer()

                if !entry.distance.isEmpty {
                    Text(entry.distance)
                        .font(.system(size: 9, weight: .semibold))
                        .foregroundColor(.secondary)
                }
            }

            Divider()
                .opacity(0.4)

            HStack {
                Text(entry.plat1Dest.isEmpty ? "ชานชาลา 1" : entry.plat1Dest)
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(.primary)
                    .lineLimit(1)
                Spacer()
                Text(entry.plat1Time.isEmpty ? "--" : entry.plat1Time)
                    .font(.system(size: 10.5, weight: .heavy, design: .monospaced))
                    .foregroundColor(.primary)
            }

            HStack {
                Text(entry.plat2Dest.isEmpty ? "ชานชาลา 2" : entry.plat2Dest)
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(.primary)
                    .lineLimit(1)
                Spacer()
                Text(entry.plat2Time.isEmpty ? "--" : entry.plat2Time)
                    .font(.system(size: 10.5, weight: .heavy, design: .monospaced))
                    .foregroundColor(.primary)
            }
        }
        .containerBackground(for: .widget) {
            Color.clear
        }
    }
}

// MARK: - Lock Screen: Accessory Inline View (แถบข้อความเหนือนาฬิกา)
struct StationAccessoryInlineView: View {
    let entry: StationWidgetEntry

    var body: some View {
        ViewThatFits {
            Text("📍 [\(entry.stationKey)] \(entry.stationName) · \(entry.plat1Time)")
            Text("📍 \(entry.stationKey) · \(entry.plat1Time)")
        }
    }
}

// MARK: - Lock Screen: Accessory Circular View (วงกลม)
struct StationAccessoryCircularView: View {
    let entry: StationWidgetEntry

    var body: some View {
        VStack(spacing: 1) {
            Text(entry.stationKey)
                .font(.system(size: 11, weight: .black, design: .monospaced))
                .foregroundColor(Color(hex: entry.lineColor))
            Text(entry.plat1Time.isEmpty ? "สด" : entry.plat1Time)
                .font(.system(size: 9.5, weight: .bold))
                .lineLimit(1)
        }
        .containerBackground(for: .widget) {
            Color.clear
        }
    }
}

// MARK: - Home Screen: System Small View
struct StationSystemSmallView: View {
    let entry: StationWidgetEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(entry.stationKey)
                    .font(.system(size: 11, weight: .black, design: .monospaced))
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(Color(hex: entry.lineColor))
                    .foregroundColor(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 4))

                Spacer()

                if !entry.distance.isEmpty {
                    Text(entry.distance)
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(Color(hex: "#0284c7"))
                }
            }

            Text(entry.stationName)
                .font(.system(size: 14, weight: .heavy))
                .foregroundColor(.white)
                .lineLimit(1)

            Spacer()

            VStack(spacing: 4) {
                HStack {
                    Text(entry.plat1Dest.isEmpty ? "P1" : entry.plat1Dest)
                        .font(.system(size: 10, weight: .medium))
                        .foregroundColor(Color(hex: "#cbd5e1"))
                        .lineLimit(1)
                    Spacer()
                    Text(entry.plat1Time.isEmpty ? "--" : entry.plat1Time)
                        .font(.system(size: 11, weight: .black, design: .monospaced))
                        .foregroundColor(Color(hex: "#10b981"))
                }
                HStack {
                    Text(entry.plat2Dest.isEmpty ? "P2" : entry.plat2Dest)
                        .font(.system(size: 10, weight: .medium))
                        .foregroundColor(Color(hex: "#cbd5e1"))
                        .lineLimit(1)
                    Spacer()
                    Text(entry.plat2Time.isEmpty ? "--" : entry.plat2Time)
                        .font(.system(size: 11, weight: .black, design: .monospaced))
                        .foregroundColor(Color(hex: "#10b981"))
                }
            }
            .padding(6)
            .background(Color(hex: "#0f172a").opacity(0.8))
            .clipShape(RoundedRectangle(cornerRadius: 6))
        }
        .padding(12)
        .containerBackground(for: .widget) {
            Color(hex: "#1e293b")
        }
    }
}

// MARK: - Home Screen: System Medium View
struct StationSystemMediumView: View {
    let entry: StationWidgetEntry

    var body: some View {
        HStack(spacing: 14) {
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Text(entry.stationKey)
                        .font(.system(size: 14, weight: .black, design: .monospaced))
                        .padding(.horizontal, 7)
                        .padding(.vertical, 3)
                        .background(Color(hex: entry.lineColor))
                        .foregroundColor(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 6))

                    Text("สถานีใกล้คุณ")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(Color(hex: "#10b981"))
                }

                Text(entry.stationName)
                    .font(.system(size: 17, weight: .heavy))
                    .foregroundColor(.white)
                    .lineLimit(1)

                if !entry.distance.isEmpty {
                    Text("📍 ห่างจากตำแหน่งคุณ \(entry.distance)")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(Color(hex: "#94a3b8"))
                }

                Spacer()

                Text("Bangkok SkyTrains")
                    .font(.system(size: 9, weight: .bold))
                    .foregroundColor(Color(hex: "#64748b"))
            }

            VStack(spacing: 6) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(entry.plat1Dest.isEmpty ? "ชานชาลา 1" : entry.plat1Dest)
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(.white)
                        .lineLimit(1)
                    HStack {
                        Text("รถเข้าสถานีใน:")
                            .font(.system(size: 9.5))
                            .foregroundColor(Color(hex: "#94a3b8"))
                        Spacer()
                        Text(entry.plat1Time.isEmpty ? "--" : entry.plat1Time)
                            .font(.system(size: 13, weight: .heavy, design: .monospaced))
                            .foregroundColor(Color(hex: "#10b981"))
                    }
                }
                .padding(8)
                .background(Color(hex: "#0f172a").opacity(0.8))
                .clipShape(RoundedRectangle(cornerRadius: 8))

                VStack(alignment: .leading, spacing: 2) {
                    Text(entry.plat2Dest.isEmpty ? "ชานชาลา 2" : entry.plat2Dest)
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(.white)
                        .lineLimit(1)
                    HStack {
                        Text("รถเข้าสถานีใน:")
                            .font(.system(size: 9.5))
                            .foregroundColor(Color(hex: "#94a3b8"))
                        Spacer()
                        Text(entry.plat2Time.isEmpty ? "--" : entry.plat2Time)
                            .font(.system(size: 13, weight: .heavy, design: .monospaced))
                            .foregroundColor(Color(hex: "#10b981"))
                    }
                }
                .padding(8)
                .background(Color(hex: "#0f172a").opacity(0.8))
                .clipShape(RoundedRectangle(cornerRadius: 8))
            }
            .frame(maxWidth: .infinity)
        }
        .padding(14)
        .containerBackground(for: .widget) {
            Color(hex: "#1e293b")
        }
    }
}

// MARK: - Root Entry View
struct StationWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    var entry: StationTimelineProvider.Entry

    var body: some View {
        switch family {
        case .accessoryRectangular:
            StationAccessoryRectangularView(entry: entry)
        case .accessoryInline:
            StationAccessoryInlineView(entry: entry)
        case .accessoryCircular:
            StationAccessoryCircularView(entry: entry)
        case .systemSmall:
            StationSystemSmallView(entry: entry)
        case .systemMedium:
            StationSystemMediumView(entry: entry)
        default:
            StationAccessoryRectangularView(entry: entry)
        }
    }
}

// MARK: - Widget Definition
struct StationWidget: Widget {
    let kind: String = "StationWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: StationTimelineProvider()) { entry in
            StationWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("ตรวจพบสถานีใกล้ตัวคุณ")
        .description("แสดงสถานีรถไฟฟ้าบีทีเอส/รถไฟฟ้าสายสีต่าง ๆ ที่ใกล้คุณที่สุด พร้อมเวลานับถอยหลังรถเข้าชานชาลาแบบเรียลไทม์")
        .supportedFamilies([
            .accessoryRectangular,
            .accessoryInline,
            .accessoryCircular,
            .systemSmall,
            .systemMedium
        ])
    }
}

// MARK: - Widget Bundle
@main
struct StationWidgetBundle: WidgetBundle {
    var body: some Widget {
        StationWidget()
    }
}
