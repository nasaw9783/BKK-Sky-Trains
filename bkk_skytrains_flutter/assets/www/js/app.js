'use strict';

        /* ================= CONFIG ================= */
        const REMOTE_API = 'https://bkkskytrain.online/api/bts-proxy';
        const LOCAL_ORIGIN = 'http://localhost:3000';
        // ตรวจสอบว่าโฮสต์ปัจจุบันมี local backend proxy จริงหรือไม่ (bkkskytrain.online หรือ Node บนพอร์ต 3000)
        // สำหรับทุกกรณีอื่น (WebView, file://, localhost พอร์ตอื่นๆ, GitHub Pages ฯลฯ) ชี้ตรงไปยัง REMOTE_API ทันที 0ms
        const hasLocalProxyHost = Boolean(
            (typeof location !== 'undefined') &&
            ((location.hostname === 'bkkskytrain.online' || location.hostname.endsWith('.bkkskytrain.online')) ||
             ((location.hostname === 'localhost' || location.hostname === '127.0.0.1') && location.port === '3000'))
        );

        let activeProxyBase = hasLocalProxyHost ? '/api/bts-proxy' : REMOTE_API;

        const proxyUrl = (endpoint, params = {}) => {
            const q = new URLSearchParams({ endpoint, ...params });
            return `${activeProxyBase}?${q.toString()}`;
        };
        const STATION_LIST_URL = (langParam = 'en') => proxyUrl('station-list', { lang: langParam });
        const TTA_URL = () => proxyUrl('tta');
        const JOURNEY_URL = (pLang) => proxyUrl('journey', { lang: pLang || 'th' });
        const TRAFFIC_URL = () => proxyUrl('traffic');
        const TRAFFIC_REFRESH_MS = 180000;  // สถานะเดินรถทุก 3 นาที
        const REFRESH_MS = 20000;       // refresh ข้อมูลขบวนรถทุก 20 วิ
        const TICK_MS = 1000;           // นับถอยหลังทุก 1 วิ
        const CACHE_KEY = 'bts_stations_v1';
        const CACHE_TTL = 24 * 3600 * 1000;
        const SIAM_KEY = 'CEN';
        // สถานีสำรองเมื่อระบุตำแหน่งผู้ใช้ไม่ได้ (ปฏิเสธสิทธิ์ / รอนาน / อยู่นอกพื้นที่)
        const FALLBACK_STATION_KEY = 'E4';   // อโศก
        const FALLBACK_AFTER_MS = 5000;      // รอตำแหน่งนานสุด 5 วิ ก่อนแสดงสถานีสำรอง
        const FALLBACK_MAX_KM = 120;         // ขยายขอบเขตตรวจจับสถานีใกล้เคียงครอบคลุมปริมณฑล (กทม. และจังหวัดใกล้เคียง)
        const YELLOW_MAP_SRC = 'เส้นทางและอัตราค่าโดยสาร_files/yellow-map.jpg';
        const GOLD_LINE_ID = 3;
        const MRT_BLUE_FARE_CHANGE_AT = new Date('2026-07-03T00:00:00+07:00').getTime();
        const MRT_LINE_IDS = { BLUE: 101, PURPLE: 102, RED: 103, ARL: 104 };
        const MRT_COLORS = { BLUE: '#1f8fdf', PURPLE: '#8a2c9b', RED: '#c21e25', ARL: '#a11b22' };

        const MRT_STATIC_DB = {
            lines: [
                {
                    LineId: MRT_LINE_IDS.BLUE,
                    LineName_TH: 'สีน้ำเงิน',
                    LineName_EN: 'Blue',
                    LineColor: MRT_COLORS.BLUE,
                    StaticJourney: true,
                    StationList: [
                        ['BL38', 'หลักสอง', 'Lak Song', 13.711001198810953, 100.41000622699018],
                        ['BL37', 'บางแค', 'Bang Khae', 13.711914228144721, 100.4223660833503],
                        ['BL36', 'ภาษีเจริญ', 'Phasi Charoen', 13.712854501431428, 100.43423020268325],
                        ['BL35', 'เพชรเกษม 48', 'Phetkasem 48', 13.715643495852428, 100.4456227504867],
                        ['BL34', 'บางหว้า', 'Bang Wa', 13.72055298366182, 100.4571986292217],
                        ['BL33', 'บางไผ่', 'Bang Phai', 13.724698796949715, 100.46523911123427],
                        ['BL01', 'ท่าพระ', 'Tha Phra', 13.729722983478364, 100.4742004448221],
                        ['BL32', 'อิสรภาพ', 'Itsaraphap', 13.738504180650656, 100.48521267453896],
                        ['BL31', 'สนามไชย', 'Sanam Chai', 13.743994752016738, 100.49463428542543],
                        ['BL30', 'สามยอด', 'Sam Yot', 13.74740455656763, 100.50221957251883],
                        ['BL29', 'วัดมังกร', 'Wat Mangkon', 13.742024992821095, 100.5103155216548],
                        ['BL28', 'หัวลำโพง', 'Hua Lamphong', 13.73795663824731, 100.51724195465331],
                        ['BL27', 'สามย่าน', 'Sam Yan', 13.732394461214282, 100.53006029424373],
                        ['BL26', 'สีลม', 'Si Lom', 13.72942224492929, 100.5365605650866],
                        ['BL25', 'ลุมพินี', 'Lumphini', 13.725956809558339, 100.54570153577502],
                        ['BL24', 'คลองเตย', 'Khlong Toei', 13.722395580602603, 100.55387331403622],
                        ['BL23', 'ศูนย์การประชุมฯ', 'Queen Sirikit Centre', 13.723279398983436, 100.56007280181026],
                        ['BL22', 'สุขุมวิท', 'Sukhumvit', 13.738691046347832, 100.56146787755216],
                        ['BL21', 'เพชรบุรี', 'Phetchaburi', 13.748825116832812, 100.56310018888564],
                        ['BL20', 'พระราม 9', 'Phra Ram 9', 13.757999460399486, 100.56557848128595],
                        ['BL19', 'ศูนย์วัฒนธรรมฯ', 'Thailand Cultural Centre', 13.766315395938772, 100.57026601277938],
                        ['BL18', 'ห้วยขวาง', 'Huai Khwang', 13.778609281339378, 100.57361365746218],
                        ['BL17', 'สุทธิสาร', 'Sutthisan', 13.789831735021023, 100.57420948068481],
                        ['BL16', 'รัชดาภิเษก', 'Ratchadaphisek', 13.799301877960573, 100.57458106133231],
                        ['BL15', 'ลาดพร้าว', 'Lat Phrao', 13.806191889809645, 100.57357769072922],
                        ['BL14', 'พหลโยธิน', 'Phahon Yothin', 13.814375402613187, 100.56012460981002],
                        ['BL13', 'สวนจตุจักร', 'Chatuchak Park', 13.802634201491806, 100.5537895043331],
                        ['BL12', 'กำแพงเพชร', 'Kamphaeng Phet', 13.798164065798893, 100.547558649226],
                        ['BL11', 'บางซื่อ', 'Bang Sue', 13.803108363849914, 100.53916200662879],
                        ['BL10', 'เตาปูน', 'Tao Poon', 13.806251181026438, 100.53080430385421],
                        ['BL09', 'บางโพ', 'Bang Pho', 13.806461962608697, 100.52105553737543],
                        ['BL08', 'บางอ้อ', 'Bang O', 13.798857016282433, 100.50970221583698],
                        ['BL07', 'บางพลัด', 'Bang Phlat', 13.79255760462822, 100.50497773662762],
                        ['BL06', 'สิรินธร', 'Sirindhorn', 13.78413719659457, 100.49348463563705],
                        ['BL05', 'บางยี่ขัน', 'Bang Yi Khan', 13.777546963728195, 100.48526026973762],
                        ['BL04', 'บางขุนนนท์', 'Bang Khun Non', 13.763217324890144, 100.47327103704303],
                        ['BL03', 'ไฟฉาย', 'Fai Chai', 13.755142104744786, 100.46921446440986],
                        ['BL02', 'จรัญฯ 13', 'Charan 13', 13.739730055636807, 100.47075309559493],
                        ['BL01', 'ท่าพระ', 'Tha Phra', 13.729722983478364, 100.4742004448221]
                    ].map(([key, th, en, lat, lon]) => ({
                        StationKey: key,
                        StationNameTH: th,
                        StationNameEN: en,
                        StationLineId: MRT_LINE_IDS.BLUE,
                        StationLineColor: MRT_COLORS.BLUE,
                        StaticJourney: true,
                        Latitude: lat,
                        Longitude: lon
                    }))
                },
                {
                    LineId: MRT_LINE_IDS.PURPLE,
                    LineName_TH: 'สีม่วง',
                    LineName_EN: 'Purple',
                    LineColor: MRT_COLORS.PURPLE,
                    StaticJourney: true,
                    StationList: [
                        ['PP01', 'คลองบางไผ่', 'Khlong Bang Phai', 13.892301215199893, 100.4082347399549],
                        ['PP02', 'ตลาดบางใหญ่', 'Talad Bang Yai', 13.881082250349912, 100.40923523317544],
                        ['PP03', 'สามแยกบางใหญ่', 'Sam Yaek Bang Yai', 13.87462472389865, 100.41944534729097],
                        ['PP04', 'บางพลู', 'Bang Phlu', 13.875642736582137, 100.43393467813281],
                        ['PP05', 'บางรักใหญ่', 'Bang Rak Yai', 13.876635219137386, 100.44490849168169],
                        ['PP06', 'บางรักน้อยท่าอิฐ', 'Bang Rak Noi Tha It', 13.87470819378764, 100.45617889945063],
                        ['PP07', 'ไทรม้า', 'Sai Ma', 13.870583974257402, 100.46666689202357],
                        ['PP08', 'สะพานพระนั่งเกล้า', 'Phra Nang Klao Bridge', 13.870393427500014, 100.48042898374244],
                        ['PP09', 'แยกนนทบุรี 1', 'Yaek Nonthaburi 1', 13.865970975316161, 100.49480464423618],
                        ['PP10', 'บางกระสอ', 'Bang Krasor', 13.861881047056444, 100.50427735276402],
                        ['PP11', 'ศูนย์ราชการนนทบุรี', 'Nonthaburi Civic Center', 13.8601467410472, 100.51324506138889],
                        ['PP12', 'กระทรวงสาธารณสุข', 'Ministry of Public Health', 13.848715431241638, 100.51478807121238],
                        ['PP13', 'แยกติวานนท์', 'Yaek Tiwanon', 13.839570244672485, 100.51495046448692],
                        ['PP14', 'วงศ์สว่าง', 'Wong Sawang', 13.830364589458032, 100.52665114443678],
                        ['PP15', 'บางซ่อน', 'Bang Son', 13.820669937306441, 100.53270727007772],
                        ['PP16', 'เตาปูน', 'Tao Poon', 13.806490974183996, 100.53068271245338]
                    ].map(([key, th, en, lat, lon]) => ({
                        StationKey: key,
                        StationNameTH: th,
                        StationNameEN: en,
                        StationLineId: MRT_LINE_IDS.PURPLE,
                        StationLineColor: MRT_COLORS.PURPLE,
                        StaticJourney: true,
                        Latitude: lat,
                        Longitude: lon
                    }))
                },
                {
                    LineId: MRT_LINE_IDS.RED,
                    LineName_TH: 'สีแดง',
                    LineName_EN: 'Red',
                    LineColor: MRT_COLORS.RED,
                    StaticJourney: true,
                    StationList: [
                        ['RW04', 'ตลิ่งชัน', 'Taling Chan', 13.7893, 100.4393],
                        ['RW03', 'บางบำหรุ', 'Bang Bamru', 13.7918, 100.4776],
                        ['RW02', 'บางซ่อน', 'Bang Son', 13.8221, 100.5342],
                        ['RN01', 'กรุงเทพ อภิวัฒน์', 'Krung Thep Aphiwat', 13.805, 100.54166667],
                        ['RN02', 'จตุจักร', 'Chatuchak', 13.824, 100.549],
                        ['RN03', 'วัดเสมียนนารี', 'Wat Samian Nari', 13.8415, 100.5574],
                        ['RN04', 'บางเขน', 'Bang Khen', 13.8493, 100.5618],
                        ['RN05', 'ทุ่งสองห้อง', 'Thung Song Hong', 13.8601, 100.5674],
                        ['RN06', 'หลักสี่', 'Lak Si', 13.884348, 100.580793],
                        ['RN07', 'การเคหะ', 'Kan Kheha', 13.89866, 100.58887],
                        ['RN08', 'ดอนเมือง', 'Don Mueang', 13.919727, 100.601072],
                        ['RN09', 'หลักหก', 'Lak Hok', 13.966212, 100.603526],
                        ['RN10', 'รังสิต', 'Rangsit', 13.9905, 100.6022]
                    ].map(([key, th, en, lat, lon]) => ({
                        StationKey: key,
                        StationNameTH: th,
                        StationNameEN: en,
                        StationLineId: MRT_LINE_IDS.RED,
                        StationLineColor: MRT_COLORS.RED,
                        StaticJourney: true,
                        Latitude: lat,
                        Longitude: lon
                    }))
                },
                {
                    LineId: MRT_LINE_IDS.ARL,
                    LineName_TH: 'แอร์พอร์ต ลิงก์',
                    LineName_EN: 'Airport Link',
                    LineColor: MRT_COLORS.ARL,
                    StaticJourney: true,
                    StationList: [
                        ['A8', 'พญาไท', 'Phaya Thai', 13.75676690283936, 100.53484178279176],
                        ['A7', 'ราชปรารภ', 'Ratchaprarop', 13.755199349761293, 100.54212229725891],
                        ['A6', 'มักกะสัน', 'Makkasan', 13.751188237864156, 100.56075394308388],
                        ['A5', 'รามคำแหง', 'Ramkhamhaeng', 13.743032742356274, 100.60015057327637],
                        ['A4', 'หัวหมาก', 'Hua Mak', 13.73803476768113, 100.64517337833085],
                        ['A3', 'บ้านทับช้าง', 'Ban Thap Chang', 13.732814119012762, 100.69131829068533],
                        ['A2', 'ลาดกระบัง', 'Lat Krabang', 13.727821743748192, 100.74736600578052],
                        ['A1', 'สุวรรณภูมิ', 'Suvarnabhumi', 13.698430460292863, 100.75222224366766]
                    ].map(([key, th, en, lat, lon]) => ({
                        StationKey: key,
                        StationNameTH: th,
                        StationNameEN: en,
                        StationLineId: MRT_LINE_IDS.ARL,
                        StationLineColor: MRT_COLORS.ARL,
                        StaticJourney: true,
                        Latitude: lat,
                        Longitude: lon
                    }))
                }
            ],
            transfers: [
                ['BL10', 'PP16', 4],
                ['BL13', 'N8', 6],
                ['BL14', 'N9', 7],
                ['BL15', 'YL01', 5],
                ['BL22', 'E4', 5],
                ['BL26', 'S2', 5],
                ['BL34', 'S12', 5],
                ['PP11', 'PK01', 5],
                ['RN01', 'BL11', 4],
                ['RW02', 'PP15', 4],
                ['RN06', 'PK14', 5],
                ['A8', 'N2', 3],
                ['A6', 'BL21', 5],
                ['A4', 'YL11', 5]
            ]
        };
        const MRT_LINE_BY_ID = Object.fromEntries(MRT_STATIC_DB.lines.map(l => [l.LineId, l]));
        const MRT_STATION_BY_KEY = {};
        for (const line of MRT_STATIC_DB.lines) {
            for (const st of line.StationList) {
                if (!MRT_STATION_BY_KEY[st.StationKey]) MRT_STATION_BY_KEY[st.StationKey] = st;
            }
        }
        const MRT_BLUE_FARES_OLD = [0, 17, 20, 22, 25, 27, 30, 32, 35, 37, 40, 42, 45];
        const MRT_BLUE_FARES_NEW = [0, 17, 20, 22, 25, 27, 29, 32, 34, 37, 39, 42, 44];
        const MRT_PURPLE_FARES = [0, 17, 20, 23, 25, 27, 30, 33, 36, 38, 40, 42, 42];

        /* ---- MRT Static Frequency Data (จากตารางเวลาทางการ) ---- */
        // สถานี outer ที่ความถี่ต่ำกว่าช่วง AM peak (07:00-09:00)
        const MRT_BLUE_OUTER_KEYS = new Set(['BL02', 'BL03', 'BL04', 'BL05', 'BL06', 'BL07', 'BL08', 'BL36', 'BL37', 'BL38']);

        // [startHH, startMM, endHH, endMM, freqLabel, freqMinutes]
        const MRT_BLUE_FREQ = {
            weekday: [
                [5, 30, 7, 0, '5.00', 5],
                [7, 0, 9, 0, '3.29', 3.5],  // main segment — outer จะ override เป็น 6.58
                [9, 0, 16, 30, '6.40', 6.67],
                [16, 30, 17, 30, '5.00', 5],
                [17, 30, 19, 30, '3.50', 3.83],
                [19, 30, 21, 0, '5.20', 5.33],
                [21, 0, 24, 0, '7.15', 7.25]
            ],
            weekdayPeakOuter: '6.58',  // BL02-BL08, BL36-BL38 ช่วง 07:00-09:00
            weekdayPeakOuterMin: 7,
            weekend: [
                [6, 0, 24, 0, '8.00', 8]
            ]
        };

        const MRT_PURPLE_FREQ = {
            weekday: [
                [5, 30, 6, 30, '7.12', 7.2],
                [6, 30, 9, 0, '4.50', 4.83],
                [9, 0, 9, 30, '6.25', 6.42],
                [9, 30, 17, 0, '8.30', 8.5],
                [17, 0, 19, 30, '4.50', 4.83],
                [19, 30, 21, 0, '6.25', 6.42],
                [21, 0, 24, 0, '9.30', 9.5]
            ],
            weekend: [
                [6, 0, 24, 0, '9.30', 9.5]
            ]
        };

        const GOLD_FREQ = {
            weekday: [
                [6, 0, 7, 0, '15.00', 15],
                [7, 0, 16, 0, '10.00', 10],
                [16, 0, 21, 0, '8.00', 8],
                [21, 0, 22, 0, '10.00', 10],
                [22, 0, 24, 0, '15.00', 15]
            ],
            weekend: [
                [6, 0, 10, 0, '15.00', 15],
                [10, 0, 15, 0, '10.00', 10],
                [15, 0, 22, 0, '8.00', 8],
                [22, 0, 23, 0, '10.00', 10],
                [23, 0, 24, 0, '15.00', 15]
            ]
        };

        const MONORAIL_FREQ = {
            weekday: [
                [6, 0, 7, 0, '10.00', 10],
                [7, 0, 9, 0, '5.00', 5],
                [9, 0, 17, 0, '10.00', 10],
                [17, 0, 20, 0, '5.00', 5],
                [20, 0, 24, 0, '10.00', 10]
            ],
            weekend: [
                [6, 0, 24, 0, '10.00', 10]
            ]
        };

        /* ---- BTS Green Line Service Intervals (ป้ายทางการ มีผล 1 ม.ค. 2569) ----
           รูปแบบ [startHH, startMM, endHH, endMM, freqLabel]  (freqLabel = นาที:วินาที)
           สายสุขุมวิทช่วง peak มี 2 ค่า: * หมอชิต–สำโรง  ** สำโรง–เคหะฯ และ หมอชิต–คูคต */
        const BTS_SUKHUMVIT_FREQ = {
            weekday: [
                [6, 0, 7, 0, '5.00'],
                [7, 0, 9, 0, '2.30* / 5.00**'],
                [9, 0, 9, 30, '5.00'],
                [9, 30, 16, 0, '6.30'],
                [16, 0, 17, 0, '5.00'],
                [17, 0, 20, 0, '2.30* / 5.00**'],
                [20, 0, 21, 0, '5.00'],
                [21, 0, 22, 0, '6.00'],
                [22, 0, 24, 0, '8.00']
            ],
            weekend: [
                [6, 0, 8, 0, '7.00'],
                [8, 0, 11, 0, '5.55'],
                [11, 0, 21, 0, '4.30* / 6.00**'],
                [21, 0, 22, 0, '7.00'],
                [22, 0, 24, 0, '8.00']
            ]
        };

        const BTS_SILOM_FREQ = {
            weekday: [
                [6, 0, 7, 0, '6.00'],
                [7, 0, 9, 0, '3.45'],
                [9, 0, 17, 0, '6.00'],
                [17, 0, 20, 0, '3.45'],
                [20, 0, 22, 0, '6.00'],
                [22, 0, 24, 0, '8.00']
            ],
            weekend: [
                [6, 0, 9, 0, '7.00'],
                [9, 0, 21, 0, '6.00'],
                [21, 0, 22, 0, '7.00'],
                [22, 0, 24, 0, '8.00']
            ]
        };

        function getBtsFreqData(lineId) {
            if (lineId === 1) return BTS_SUKHUMVIT_FREQ;
            if (lineId === 2) return BTS_SILOM_FREQ;
            return null;
        }

        function getMrtFreqData(lineId) {
            if (isGoldLineId(lineId)) return GOLD_FREQ;
            if (lineId === MRT_LINE_IDS.BLUE) return MRT_BLUE_FREQ;
            if (lineId === MRT_LINE_IDS.PURPLE) return MRT_PURPLE_FREQ;
            if (lineId === 4 || lineId === 5) return MONORAIL_FREQ;
            return null;
        }

        function timeToMinutes(h, m) { return h * 60 + m; }

        function isWeekend() {
            const d = new Date().getDay();
            return d === 0 || d === 6;
        }

        function getCurrentMrtFreq(lineId, stationKey) {
            if (lineId === MRT_LINE_IDS.ARL) {
                const now = new Date();
                const nowMin = timeToMinutes(now.getHours(), now.getMinutes());
                const we = isWeekend();
                if (nowMin < timeToMinutes(5, 30) || nowMin >= timeToMinutes(24, 0)) return null;
                if (we) {
                    return { label: '12.00–15.00', minutes: 13.5 };
                } else {
                    const isPeak = (nowMin >= timeToMinutes(6, 0) && nowMin < timeToMinutes(9, 0)) ||
                        (nowMin >= timeToMinutes(16, 30) && nowMin < timeToMinutes(20, 0));
                    return isPeak ? { label: '9.00', minutes: 9 } : { label: '10.00–12.00', minutes: 11 };
                }
            }
            if (lineId === MRT_LINE_IDS.RED) {
                const now = new Date();
                const nowMin = timeToMinutes(now.getHours(), now.getMinutes());
                const we = isWeekend();
                if (nowMin < timeToMinutes(5, 0) || nowMin >= timeToMinutes(24, 0)) return null;
                const isWest = stationKey && stationKey.startsWith('RW');
                const isPeak = !we && ((nowMin >= timeToMinutes(7, 0) && nowMin < timeToMinutes(9, 30)) ||
                    (nowMin >= timeToMinutes(17, 0) && nowMin < timeToMinutes(19, 30)));
                if (isWest) {
                    return isPeak ? { label: '20.00', minutes: 20 } : { label: '30.00', minutes: 30 };
                } else {
                    return isPeak ? { label: '10.00', minutes: 10 } : { label: '20.00', minutes: 20 };
                }
            }
            if (lineId === 1 || lineId === 2) {
                const data = getBtsFreqData(lineId);
                if (!data) return null;
                const now = new Date();
                const nowMin = timeToMinutes(now.getHours(), now.getMinutes());
                const schedule = isWeekend() ? data.weekend : data.weekday;
                for (const row of schedule) {
                    const start = timeToMinutes(row[0], row[1]);
                    const end = timeToMinutes(row[2], row[3]);
                    if (nowMin >= start && nowMin < end) {
                        return { label: row[4], minutes: 5 };
                    }
                }
                return null;
            }
            const data = getMrtFreqData(lineId);
            if (!data) return null;
            const now = new Date();
            const nowMin = timeToMinutes(now.getHours(), now.getMinutes());
            const schedule = isWeekend() ? data.weekend : data.weekday;
            for (const row of schedule) {
                const start = timeToMinutes(row[0], row[1]);
                const end = timeToMinutes(row[2], row[3]);
                if (nowMin >= start && nowMin < end) {
                    // Blue line AM peak outer override
                    if (lineId === MRT_LINE_IDS.BLUE && !isWeekend()
                        && row[0] === 7 && row[2] === 9
                        && stationKey && MRT_BLUE_OUTER_KEYS.has(stationKey)) {
                        return { label: data.weekdayPeakOuter, minutes: data.weekdayPeakOuterMin };
                    }
                    return { label: row[4], minutes: row[5] };
                }
            }
            return null; // นอกเวลาให้บริการ
        }

        function getMrtFreqTable(lineId, stationKey) {
            if (lineId === MRT_LINE_IDS.ARL) {
                const now = new Date();
                const nowMin = timeToMinutes(now.getHours(), now.getMinutes());
                const we = isWeekend();
                const buildArl = (isWeekendTable) => {
                    if (isWeekendTable) {
                        const isCurrent = we && nowMin >= timeToMinutes(5, 30) && nowMin < timeToMinutes(24, 0);
                        return [{ timeStr: '05:30–00:00', freqLabel: '12.00–15.00', isCurrent }];
                    } else {
                        const ranges = [
                            [5, 30, 6, 0, '10.00–12.00'],
                            [6, 0, 9, 0, '9.00'],
                            [9, 0, 16, 30, '10.00–12.00'],
                            [16, 30, 20, 0, '9.00'],
                            [20, 0, 24, 0, '10.00–12.00']
                        ];
                        return ranges.map(([sh, sm, eh, em, label]) => {
                            const start = timeToMinutes(sh, sm);
                            const end = timeToMinutes(eh, em);
                            const isCurrent = !we && nowMin >= start && nowMin < end;
                            const shStr = String(sh).padStart(2, '0') + ':' + String(sm).padStart(2, '0');
                            const ehStr = String(eh === 24 ? '00' : eh).padStart(2, '0') + ':' + String(em).padStart(2, '0');
                            return { timeStr: `${shStr}–${ehStr}`, freqLabel: label, isCurrent };
                        });
                    }
                };
                return {
                    weekday: buildArl(false),
                    weekend: buildArl(true),
                    isBlueOuter: false
                };
            }
            if (lineId === MRT_LINE_IDS.RED) {
                const now = new Date();
                const nowMin = timeToMinutes(now.getHours(), now.getMinutes());
                const we = isWeekend();
                const isWest = stationKey && stationKey.startsWith('RW');
                const buildRed = (isWeekendTable) => {
                    const peakLabel = isWest ? '20.00' : '10.00';
                    const offPeakLabel = isWest ? '30.00' : '20.00';
                    if (isWeekendTable) {
                        const isCurrent = we && nowMin >= timeToMinutes(5, 0) && nowMin < timeToMinutes(24, 0);
                        return [{ timeStr: '05:00–00:00', freqLabel: offPeakLabel, isCurrent }];
                    } else {
                        const ranges = [
                            [5, 0, 7, 0, offPeakLabel],
                            [7, 0, 9, 30, peakLabel],
                            [9, 30, 17, 0, offPeakLabel],
                            [17, 0, 19, 30, peakLabel],
                            [19, 30, 24, 0, offPeakLabel]
                        ];
                        return ranges.map(([sh, sm, eh, em, label]) => {
                            const start = timeToMinutes(sh, sm);
                            const end = timeToMinutes(eh, em);
                            const isCurrent = !we && nowMin >= start && nowMin < end;
                            const shStr = String(sh).padStart(2, '0') + ':' + String(sm).padStart(2, '0');
                            const ehStr = String(eh === 24 ? '00' : eh).padStart(2, '0') + ':' + String(em).padStart(2, '0');
                            return { timeStr: `${shStr}–${ehStr}`, freqLabel: label, isCurrent };
                        });
                    }
                };
                return {
                    weekday: buildRed(false),
                    weekend: buildRed(true),
                    isBlueOuter: false
                };
            }
            const data = getMrtFreqData(lineId);
            if (!data) return { weekday: [], weekend: [], isBlueOuter: false };
            const now = new Date();
            const nowMin = timeToMinutes(now.getHours(), now.getMinutes());
            const we = isWeekend();
            const build = (schedule, isActive) => schedule.map(row => {
                const start = timeToMinutes(row[0], row[1]);
                const end = timeToMinutes(row[2], row[3]);
                const isCurrent = isActive && nowMin >= start && nowMin < end;
                let freqLabel = row[4];
                // Blue line AM peak outer
                if (lineId === MRT_LINE_IDS.BLUE && !we && isActive
                    && row[0] === 7 && row[2] === 9
                    && stationKey && MRT_BLUE_OUTER_KEYS.has(stationKey)) {
                    freqLabel = data.weekdayPeakOuter;
                }
                const sh = String(row[0]).padStart(2, '0'), sm = String(row[1]).padStart(2, '0');
                const eh = String(row[2] === 24 ? '00' : row[2]).padStart(2, '0'), em = String(row[3]).padStart(2, '0');
                const timeStr = `${sh}:${sm}–${eh === '00' && row[2] === 24 ? '00' : eh}:${em}`;
                return { timeStr, freqLabel, isCurrent };
            });
            return {
                weekday: build(data.weekday, !we),
                weekend: build(data.weekend, we),
                isBlueOuter: lineId === MRT_LINE_IDS.BLUE && !!stationKey && MRT_BLUE_OUTER_KEYS.has(stationKey)
            };
        }

        const SERVER_PUBLIC_PEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA8zsT7DJXT2PGXFYp56Wy
wZiROQMLii+oyko8rGrW3+TlSq7VuuJfsBffMoypk/MTkBC3zCww3/1Sgt2LTF1q
xNExEXeKekS/JzyfKQ2f8YNAfdw60PMX6STQt7RQQwvM/MHMOIFp5hQnl8TQoc2w
z3G4o5jrXMFDMALbN3l2iAQCWUEFY9YJJFYIHrnQds62P6iIoCujMgC0hTbafnjw
32tTIh8j1+rJ8pTz3PzAqnVhThTISHIGAXsmn8FyAcO6ebBiKkQKQ+BNRVJbZTS/
Xud2jDkJg+22IHgOZyuQ85VNSnvBWm6PM0LXL1GiMHdBbqqUryyUImkSmB7q6YKC
gQIDAQAB
-----END PUBLIC KEY-----`;

        /* ================= I18N (สลับภาษาได้ทั้งเว็บ — แสดงทีละภาษาเพื่อประหยัดพื้นที่) ================= */
        let lang = localStorage.getItem('bts_lang') || 'th';

        const I18N = {
            th: {
                appName: 'BKK SKYTRAINs',
                sub: 'สถานะรถไฟฟ้า BTS ณ ขณะนี้',
                affiliation: 'ไม่เกี่ยวข้องกับทาง BTS/MRT/SRT/ARL',
                nearestTitle: 'สถานีใกล้คุณที่สุด',
                nearestExitTitle: 'ทางออกใกล้คุณที่สุด',
                relocate: 'หาตำแหน่งปัจจุบัน',
                findNearest: 'ค้นหาสถานีใกล้ฉัน',
                findNearestExit: 'ระบุทางออกที่คุณยืนอยู่ด้วย GPS',
                locating: 'กำลังหาตำแหน่งของคุณ…',
                fromYou: 'จากตำแหน่งคุณ',
                atStation: 'อยู่ที่สถานี',
                currentLocation: 'ตำแหน่งปัจจุบัน',
                lastLocation: 'ตำแหน่งที่บันทึกไว้',
                confirmHere: 'ฉันอยู่ที่สถานีนี้ (ยืนยันพิกัด)',
                searchPh: 'ค้นหาสถานี เช่น สยาม, N8, Mo Chit…',
                notFound: q => `ไม่พบสถานี “${q}”`,
                nearYou: 'ใกล้คุณ',
                crowded: 'หนาแน่น',
                interchange: 'เปลี่ยนสาย · 4 ชานชาลา',
                fourPlat: '4 ชานชาลา',
                line: n => `สาย${n}`,
                connLine: n => `⇄ สาย${n}`,
                connTitle: k => `เชื่อมต่อสถานี ${k}`,
                updated: t => `อัปเดต ${t} น.`,
                refresh: '↻ รีเฟรช',
                retry: 'ลองใหม่',
                loadStationsFail: 'โหลดรายชื่อสถานีไม่สำเร็จ — ตรวจสอบอินเทอร์เน็ต',
                loadingTrains: 'กำลังโหลดข้อมูลขบวนรถ…',
                noTrainData: '🚫 ไม่มีข้อมูลขบวนรถในขณะนี้',
                offHours: 'อาจอยู่นอกเวลาให้บริการ',
                noTrains: 'ไม่มีขบวนรถ',
                platformTo: p => `ชานชาลา ${p} · ไปทาง`,
                platformTrainTo: (p, no) => `ชานชาลา ${p} · ขบวน ${no} ไป`,
                train: no => `ขบวน ${no}`,
                arrived: 'กำลังเข้า',
                minUnit: ' นาที',
                mUnit: ' ม.', kmUnit: ' กม.',
                routeTitle: '🗺️ ตำแหน่งขบวนรถ',
                routeLine: n => ` · สาย${n}`,
                loadingRoute: 'กำลังโหลดตำแหน่งขบวน…',
                trafficHead: '⚠️ ประกาศการเดินรถ',
                trafficBad: names => `การเดินรถ ${names} อาจไม่ปกติ`,
                geoUnsupported: 'เบราว์เซอร์ไม่รองรับการระบุตำแหน่ง',
                geoDenied: 'ไม่ได้รับอนุญาตให้ใช้ตำแหน่ง — เปิดสิทธิ์ Location ให้เว็บนี้แล้วลองใหม่',
                geoFail: 'หาตำแหน่งไม่สำเร็จ ลองใหม่อีกครั้ง',
                connectFail: s => `เชื่อมต่อไม่สำเร็จ (HTTP ${s})`,
                footer: 'ข้อมูลเรียลไทม์จากระบบ BTS (EBM) · รีเฟรชอัตโนมัติทุก 20 วินาที<br>Unofficial app — เวลาโดยประมาณ โปรดเผื่อเวลาเดินทาง',
                langBtn: 'EN',
                clockLocale: 'th-TH',
                lines: { 1: 'สุขุมวิท', 2: 'สีลม', 3: 'สีทอง', 4: 'สีเหลือง', 5: 'สีชมพู', 101: 'สีน้ำเงิน', 102: 'สีม่วง', 103: 'สีแดง', 104: 'แอร์พอร์ต ลิงก์' },
                timetableBadge: 'ตามตารางเวลา',
                timetableSchedule: 'ดูตารางความถี่การเดินรถทางการ',
                mrtFreqTitle: 'ความถี่ขบวนรถ',
                mrtFreqNow: f => `ขบวนมาทุก ~${String(f || '').replace(/^~/, '')} นาที`,
                mrtFreqNote: 'ข้อมูลจากตารางเวลาปกติ (ไม่ใช่ real-time)',
                mrtWeekday: 'วันจันทร์–ศุกร์',
                mrtWeekend: 'วันเสาร์–อาทิตย์ / วันหยุด',
                mrtOutOfService: 'นอกเวลาให้บริการ',
                mrtTimeRange: 'ช่วงเวลา',
                mrtFreqCol: 'ความถี่',
                mrtSegmentNote: '* ช่วง 07:00–09:00 สถานีนี้อยู่ในเส้นทาง {seg}',
                btsFreqHead: '🚆 ความถี่การเดินรถ (ตารางปกติ)',
                btsSegNote: '* หมอชิต–สำโรง · ** สำโรง–เคหะฯ และ หมอชิต–คูคต',
                btsFreqUnit: 'หน่วย นาที:วินาที',
                btsFreqEffective: 'มีผลตั้งแต่ 1 ม.ค. 2569',
                jTitle: 'ค้นหาเส้นทาง',
                jHint: 'จาก → ถึง · เวลา + ค่าโดยสาร',
                jFrom: 'จาก',
                jTo: 'ถึง',
                jSelect: 'แตะเพื่อเลือกสถานี',
                jUseNearest: '📍 ใช้สถานีใกล้ฉัน',
                jRoute: n => `เส้นทางที่ ${n}`,
                jRecommended: 'แนะนำ/เร็วที่สุด',
                jCheapest: 'ประหยัดที่สุด',
                jMin: m => `${m} นาที`,
                jStations: n => `${n} สถานี`,
                jTransfer: '🚶 เปลี่ยนสาย',
                jFareTypes: 'อัตราค่าโดยสาร',
                jStaticFare: 'ค่าโดยสารรวม',
                jLiveFare: 'ค่าโดยสาร BTS',
                jMrtBlueFare: 'ค่าโดยสาร MRT สายสีน้ำเงิน',
                jMrtPurpleFare: 'ค่าโดยสาร MRT สายสีม่วง',
                jSrtRedFare: 'ค่าโดยสาร SRT สายสีแดง',
                jArlFare: 'ค่าโดยสาร ARL',
                jMap: 'ดูแผนที่เส้นทาง',
                jFail: 'ค้นหาเส้นทางไม่สำเร็จ ลองใหม่อีกครั้ง',
                jSearching: 'กำลังค้นหาเส้นทาง…',
                homeJourneyTitle: 'วางแผนการเดินทาง & เช็คค่าโดยสาร',
                homeJourneySub: 'ค้นหาเส้นทาง คำนวณเวลา และราคาข้าม 10 สาย',
                homeJourneyBtn: 'เปิด ➔',
                navHome: 'หน้าแรก',
                navMap: 'แผนที่',
                navPlanner: 'วางแผน',
                navExits: 'ทางออก',
                navFares: 'ค่าโดยสาร',
                navTimetables: 'เวลาเดินรถ',
                faresTitle: 'อัตราค่าโดยสารรถไฟฟ้าตามสาย',
                timetablesTitle: 'ตารางเวลาเดินรถ & ความถี่ตามสาย',
                mapTitle: '🗺️ ผังโครงข่ายรถไฟฟ้า 10 สาย',
                mapZoomIn: '➕ ขยาย',
                mapZoomOut: '➖ ย่อ',
                mapReset: '⤢ กลาง',
                mapHint: '💡 <b>วิธีใช้งาน:</b> แตะที่จุดสถานีใดๆ บนแผนผังเพื่อเลือกเป็น <b>สถานีต้นทาง</b>, <b>สถานีปลายทาง</b>, หรือดู <b>ข้อมูลทางออก</b> ได้ทันที',
                sheetOrigin: 'ตั้งเป็นสถานีต้นทาง (Set Origin)',
                sheetOriginSub: 'คำนวณเส้นทางจากสถานีนี้',
                sheetDest: 'ตั้งเป็นสถานีปลายทาง (Set Destination)',
                sheetDestSub: 'ค้นหาเส้นทางไปยังสถานีนี้ทันที',
                sheetExits: 'ดูข้อมูลทางออกและสิ่งอำนวยความสะดวก (Exit Info)',
                sheetExitsSub: 'ทางออก 1, 2, 3, Skywalk, ลิฟต์คนพิการ',
                sheetLive: 'ดูเวลารถไฟฟ้าขบวนถัดไปสด (Live Arrival)',
                sheetLiveSub: 'เวลานับถอยหลังจริงจากชานชาลา',
                plannerHubTitle: '🌟 สถานีชุมทางยอดนิยม (แตะเพื่อเลือกด่วน)',
                exitCardTitle: '🚪 ข้อมูลทางออกสถานี & สิ่งอำนวยความสะดวก',
                exitCardSub: 'เลือกสายและสถานี เพื่อตรวจสอบตำแหน่งทางออก สกายวอล์ก ลิฟต์คนพิการ และสถานที่ใกล้เคียง',
                exitSearchPh: 'ค้นหาชื่อสถานี หรือรหัส เช่น สยาม, CEN, ศรีด่าน...',
                popupTitle: 'ตรวจพบสถานีใกล้ตัวคุณ',
                popupSub: 'เวลาขบวนรถและชานชาลาแบบเรียลไทม์',
                popupDist: 'จากตำแหน่งคุณ',
                popupPlatTitle: '🚆 ชานชาลา & เวลาเดินรถ',
                popupPlatSub: 'กำลังเข้า / นับถอยหลังสด',
                popupAction: 'ดูรายละเอียดสถานี & ทางออกเต็มจอ',
                popupDismiss: 'รับทราบ',
            },
            en: {
                appName: 'BKK SKYTRAINs',
                sub: 'Real-time BTS trains status',
                affiliation: 'Not affiliated with BTS/MRT/SRT/ARL.',
                nearestTitle: 'Nearest station',
                nearestExitTitle: 'Nearest Exit to You',
                relocate: 'Current Location',
                findNearest: 'Find my nearest station',
                findNearestExit: 'Find your nearest exit by GPS',
                locating: 'Locating you…',
                fromYou: 'from your location',
                atStation: 'At Station',
                currentLocation: 'Current Location',
                lastLocation: 'Saved Location',
                confirmHere: "I'm at this station (Confirm)",
                searchPh: 'Search station e.g. Siam, N8, Mo Chit…',
                notFound: q => `No station found for “${q}”`,
                nearYou: 'Nearest',
                crowded: 'Crowded',
                interchange: 'Interchange · 4 platforms',
                fourPlat: '4 platforms',
                line: n => `${n} Line`,
                connLine: n => `⇄ ${n} Line`,
                connTitle: k => `Connects to ${k}`,
                updated: t => `Updated ${t}`,
                refresh: '↻ Refresh',
                retry: 'Retry',
                loadStationsFail: 'Could not load stations — check your connection',
                loadingTrains: 'Loading trains…',
                noTrainData: '🚫 No train data right now',
                offHours: 'Possibly outside service hours',
                noTrains: 'No trains',
                platformTo: p => `Platform ${p} · To`,
                platformTrainTo: (p, no) => `Platform ${p} · Train ${no} to`,
                train: no => `Train ${no}`,
                arrived: 'Arriving',
                minUnit: ' min',
                mUnit: ' m', kmUnit: ' km',
                routeTitle: '🗺️ Train positions',
                routeLine: n => ` · ${n} Line`,
                loadingRoute: 'Loading train positions…',
                trafficHead: '⚠️ Service alerts',
                trafficBad: names => `${names} service may be disrupted`,
                geoUnsupported: 'This browser does not support geolocation',
                geoDenied: 'Location permission denied — allow Location for this site and retry',
                geoFail: 'Could not get your location, please retry',
                connectFail: s => `Connection failed (HTTP ${s})`,
                footer: 'Real-time data from the BTS (EBM) system · Auto-refresh every 20 s<br>Unofficial app — times are estimates, please allow extra travel time',
                langBtn: 'ไทย',
                clockLocale: 'en-GB',
                lines: { 1: 'Sukhumvit', 2: 'Silom', 3: 'Gold', 4: 'Yellow', 5: 'Pink', 101: 'Blue', 102: 'Purple', 103: 'Red', 104: 'Airport Link' },
                timetableBadge: 'Timetable',
                timetableSchedule: 'View Official Frequency Schedule',
                mrtFreqTitle: 'Train frequency',
                mrtFreqNow: f => `Every ~${String(f || '').replace(/^~/, '')} min`,
                mrtFreqNote: 'Based on regular timetable (not real-time)',
                mrtWeekday: 'Weekday',
                mrtWeekend: 'Weekend / Holiday',
                mrtOutOfService: 'Out of service',
                mrtTimeRange: 'Time',
                mrtFreqCol: 'Frequency',
                mrtSegmentNote: '* During 07:00–09:00 this station is on the {seg} route',
                btsFreqHead: '🚆 Service intervals (regular timetable)',
                btsSegNote: '* Mo Chit–Samrong · ** Samrong–Kheha & Mo Chit–Khu Khot',
                btsFreqUnit: 'Unit min:sec',
                btsFreqEffective: 'Effective 1 Jan 2026',
                jTitle: 'Plan a journey',
                jHint: 'From → To · time + fare',
                jFrom: 'From',
                jTo: 'To',
                jSelect: 'Tap to select a station',
                jUseNearest: '📍 Use my nearest station',
                jRoute: n => `Route ${n}`,
                jRecommended: 'Recommended/Fastest',
                jCheapest: 'Cheapest',
                jMin: m => `${m} min`,
                jStations: n => `${n} stations`,
                jTransfer: '🚶 Transfer',
                jFareTypes: 'Fares',
                jStaticFare: 'Total fare',
                jLiveFare: 'BTS fare',
                jMrtBlueFare: 'MRT Blue Line fare',
                jMrtPurpleFare: 'MRT Purple Line fare',
                jSrtRedFare: 'SRT Red Line fare',
                jArlFare: 'ARL fare',
                jMap: 'View route map',
                jFail: 'Could not find a route, please retry',
                jSearching: 'Finding routes…',
                homeJourneyTitle: 'Journey Planner & Fare Guide',
                homeJourneySub: 'Find routes, estimate travel time & fares across 10 lines',
                homeJourneyBtn: 'Open ➔',
                navHome: 'Home',
                navMap: 'Map',
                navPlanner: 'Plan',
                navExits: 'Exits',
                navFares: 'Fares',
                navTimetables: 'Timetable',
                faresTitle: 'Transit Fares & Pricing by Line',
                timetablesTitle: 'Train Timetables & Frequency by Line',
                mapTitle: '🗺️ 10 Transit Lines Network Map',
                mapZoomIn: '➕ Zoom In',
                mapZoomOut: '➖ Zoom Out',
                mapReset: '⤢ Reset',
                mapHint: '💡 <b>How to use:</b> Tap any station on the schematic map to set as <b>Origin</b>, <b>Destination</b>, or view <b>Exit Directory</b>.',
                sheetOrigin: 'Set as Origin Station',
                sheetOriginSub: 'Plan journey starting from this station',
                sheetDest: 'Set as Destination',
                sheetDestSub: 'Find routes arriving at this station',
                sheetExits: 'Station Exits & Facilities',
                sheetExitsSub: 'Exits, Skywalks, Priority Elevators',
                sheetLive: 'Live Train Arrivals',
                sheetLiveSub: 'Real-time platform countdowns',
                plannerHubTitle: '🌟 Popular Hub Stations (Quick Select)',
                exitCardTitle: '🚪 Station Exits & Facilities',
                exitCardSub: 'Select line and station to check exits, skywalks, priority elevators, and nearby landmarks',
                exitSearchPh: 'Search station e.g. Siam, CEN, Si Dan...',
                popupTitle: 'Nearest Station Detected',
                popupSub: 'Real-time trains & platform status',
                popupDist: 'from your location',
                popupPlatTitle: '🚆 Platforms & Live Trains',
                popupPlatSub: 'Arriving / Live countdown',
                popupAction: 'View Full Station & Exit Details',
                popupDismiss: 'Got it',
            }
        };

        function T(key, ...args) {
            const v = (I18N[lang] && I18N[lang][key]) ?? I18N.th[key] ?? key;
            return typeof v === 'function' ? v(...args) : v;
        }

        // ชื่อสถานีตามภาษาที่เลือก (EN ไม่มีข้อมูล → ใช้ไทยแทน)
        function stName(s) {
            if (!s) return '';
            const en = s.StationNameEN || s.StationName_EN || '';
            const th = s.StationNameTH || s.StationName_TH || s.StationName || '';
            return lang === 'en' ? (en || th) : (th || en);
        }

        // ข้อความจาก API รูปแบบ "เคหะฯ | Kheha" → เลือกฝั่งตามภาษา (ไม่มีฝั่ง EN → ใช้ไทย)
        function destName(raw) {
            const parts = String(raw || '').split('|').map(x => x.trim()).filter(Boolean);
            return lang === 'en' ? (parts[1] || parts[0] || '') : (parts[0] || '');
        }

        // ชื่อย่อสำหรับพื้นที่แคบ (ป้ายปลายทางบนขบวน, หัวการ์ดชานชาลา, ป้ายสถานีบน route map)
        const DEST_ABBR = {
            th: {
                'มหาวิทยาลัยเกษตรศาสตร์': 'ม.เกษตรฯ',
                'สนามกีฬาแห่งชาติ': 'สนามกีฬาฯ',
                'โรงพยาบาลภูมิพลอดุลยเดช': 'รพ.ภูมิพลฯ',
                'พิพิธภัณฑ์กองทัพอากาศ': 'พิพิธภัณฑ์ ทอ.',
                'วัดพระศรีมหาธาตุ': 'วัดพระศรีฯ',
                'ห้าแยกลาดพร้าว': 'ห้าแยกฯ',
                'ศูนย์ราชการนนทบุรี': 'ศูนย์ราชการฯ',
            },
            en: {
                'Kasetsart University': 'Kasetsart U.',
                'National Stadium': 'Nat. Stadium',
                'Royal Thai Air Force Museum': 'RTAF Museum',
                'Bhumibol Adulyadej Hospital': 'Bhumibol Hosp.',
                'Wat Phra Si Mahathat': 'Wat Phra Si',
                'Nonthaburi Civic Center': 'Nonthaburi CC',
            }
        };
        function shortDest(name) {
            if (!name) return '';
            const clean = String(name).replace(/\s*\([^)]*\)/g, '').trim();
            return (DEST_ABBR[lang] || {})[clean] || (DEST_ABBR[lang] || {})[name] || clean;
        }

        /* ================= CRYPTO (AES-GCM + RSA, ใช้เมื่อ proxy ต้องการ Authkey) ================= */
        function bufToB64(buf) {
            const bytes = new Uint8Array(buf);
            let bin = '';
            for (let i = 0; i < bytes.length; i += 0x8000)
                bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
            return btoa(bin);
        }

        async function encryptBody(payload) {
            const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt']);
            const rawKey = await crypto.subtle.exportKey('raw', key);
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv },
                key, new TextEncoder().encode(JSON.stringify(payload)));
            const combined = new Uint8Array(iv.length + cipher.byteLength);
            combined.set(iv, 0);
            combined.set(new Uint8Array(cipher), iv.length);
            const rsa = new JSEncrypt();
            rsa.setPublicKey(SERVER_PUBLIC_PEM);
            const authKey = rsa.encrypt(JSON.stringify({ key: bufToB64(rawKey), iv: bufToB64(iv) }));
            if (!authKey) throw new Error('RSA encryption failed');
            return { authKey, bodyBase64: bufToB64(combined.buffer) };
        }

        /* ================= API ================= */
        // TTA runs only through our proxy. The client still encrypts the payload
        // and sends Authkey, matching the proxy version that is known to work.
        const TTA_MODES = ['encrypted'];
        let ttaMode = 'encrypted';

        async function postJSON(url, body, headers, timeoutMs = 6000) {
            // หาก URL เป็น local proxy ให้ใช้ timeout สั้นพิเศษ 1,500ms เพื่อ failover ไปยัง REMOTE_API ทันที ไม่รอค้าง
            const isLocalProxy = typeof url === 'string' && (
                (!url.startsWith('http://') && !url.startsWith('https://')) ||
                (!url.startsWith(REMOTE_API) && (url.includes('localhost') || url.includes('127.0.0.1')))
            );
            const effectiveTimeout = isLocalProxy ? Math.min(timeoutMs, 1800) : timeoutMs;

            const doFetch = async (targetUrl, tMs) => {
                const ctrl = new AbortController();
                const timer = setTimeout(() => ctrl.abort(), tMs);
                try {
                    const res = await fetch(targetUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', ...headers },
                        body: body == null ? undefined : JSON.stringify(body),
                        signal: ctrl.signal
                    });
                    let data = null;
                    try { data = await res.json(); } catch (e) { /* non-JSON */ }
                    return { status: res.status, data };
                } finally {
                    clearTimeout(timer);
                }
            };

            const switchPermanentlyToRemote = () => {
                if (activeProxyBase !== REMOTE_API) {
                    activeProxyBase = REMOTE_API;
                    console.info('⚡ BKK Transit: Switched to REMOTE_API permanently for faster response');
                }
            };

            try {
                const res = await doFetch(url, effectiveTimeout);
                // หากต่อ local proxy ได้ 404 หรือ 502 ให้ failover ไปยัง REMOTE_API ทันที และจำค่าไว้ถาวร
                if ((res.status === 404 || res.status === 502) && !url.startsWith(REMOTE_API)) {
                    switchPermanentlyToRemote();
                    const fallbackUrl = url.replace(/^(?:https?:\/\/[^\/]+)?\/api\/bts-proxy/, REMOTE_API);
                    if (fallbackUrl !== url) {
                        return await doFetch(fallbackUrl, timeoutMs);
                    }
                }
                return res;
            } catch (err) {
                // หาก network ต่อ local proxy ไม่ได้ ให้ลอง REMOTE_API อัตโนมัติ
                if (!url.startsWith(REMOTE_API)) {
                    switchPermanentlyToRemote();
                    const fallbackUrl = url.replace(/^(?:https?:\/\/[^\/]+)?\/api\/bts-proxy/, REMOTE_API);
                    if (fallbackUrl !== url) {
                        try {
                            return await doFetch(fallbackUrl, timeoutMs);
                        } catch (e2) {
                            throw err;
                        }
                    }
                }
                throw err;
            }
        }

        function rememberTtaMode(mode) {
            ttaMode = 'encrypted';
            if (localStorage.getItem('bts_tta_mode') !== 'encrypted')
                localStorage.setItem('bts_tta_mode', 'encrypted');
        }

        async function attemptTTA(mode, payload) {
            const { authKey, bodyBase64 } = await encryptBody(payload);
            return postJSON(TTA_URL(), { data: bodyBase64, lang: 'th' }, { 'Authkey': authKey }, 5000);
        }

        async function fetchArrivals(station) {
            const payload = { StationId: station.StationId, StationKey: station.StationKey };
            const order = [ttaMode, ...TTA_MODES.filter(m => m !== ttaMode)];
            let lastErr = null;
            for (const mode of order) {
                let res;
                try { res = await attemptTTA(mode, payload); }
                catch (e) { lastErr = e; continue; }   // ช่องทางนี้ล่ม/CORS → ลองช่องทางถัดไป
                if (res.status === 200 && res.data?.ErrMessage === 'Success') {
                    rememberTtaMode(mode);
                    return res.data.data; // { StationName_TH, StationKey, time, platform_list: [...] }
                }
                // ได้คำตอบจริงจาก API แต่ไม่ Success (เช่น "this Line is unavailable")
                // = ช่องทางใช้ได้ ไม่ต้องลองช่องทางอื่นให้เสียเวลา
                if (res.status === 200 && res.data && res.data.ErrCode !== undefined) {
                    rememberTtaMode(mode);
                    throw new Error(res.data.ErrMessage || 'API error');
                }
                lastErr = new Error(T('connectFail', res.status));
            }
            throw lastErr || new Error(T('connectFail', '?'));
        }

        // เส้นทาง from→to: คืน data.RoutesMap = [{RoutesJorney, TotalTime, TotalKm,
        // Count_Station, Count_InterChange, FareRate_Total, FareRateInfo, ...}, ...]
        async function fetchJourney(originKey, destKey) {
            const res = await postJSON(JOURNEY_URL(lang), {
                Origin: originKey, Destination: destKey,
                Origin_Location: 0, Destination_Location: 0
            }, {}, 7000);
            if (res.status !== 200 || res.data?.ErrMessage !== 'Success' || !res.data.data)
                throw new Error(T('jFail'));
            return res.data.data;
        }

        async function fetchTraffic() {
            const res = await postJSON(TRAFFIC_URL(), {}, {}, 5000);
            if (res.status === 200 && res.data?.IsSuccess) return res.data;
            throw new Error('traffic unavailable');
        }

                const FALLBACK_STATION_LIST = [{"LineId":1,"LineName_TH":"สายสุขุมวิท","LineName_EN":"Sukhumvit Line","LineColor":"#7AB420","StationList":[{"StationId":79,"StationName":"คูคต | Khu Khot","StationNameTH":"คูคต","StationNameEN":"Khu Khot","StationKey":"N24","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.93234,"Longitude":100.6466,"PinmapX":"3250","PinmapY":"249","IsCrowded":false,"Orderlist":24},{"StationId":78,"StationName":"แยก คปอ. | Yaek Kor Por Aor","StationNameTH":"แยก คปอ.","StationNameEN":"Yaek Kor Por Aor","StationKey":"N23","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.92498,"Longitude":100.6259,"PinmapX":"3068","PinmapY":"255","IsCrowded":false,"Orderlist":23},{"StationId":77,"StationName":"พิพิธภัณฑ์กองทัพอากาศ | Royal Thai Air Force Museum","StationNameTH":"พิพิธภัณฑ์กองทัพอากาศ","StationNameEN":"Royal Thai Air Force Museum","StationKey":"N22","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.91795,"Longitude":100.6217,"PinmapX":"2873","PinmapY":"341","IsCrowded":false,"Orderlist":22},{"StationId":76,"StationName":"โรงพยาบาลภูมิพลอดุลยเดช | Bhumibol Adulyadej Hospital","StationNameTH":"โรงพยาบาลภูมิพลอดุลยเดช","StationNameEN":"Bhumibol Adulyadej Hospital","StationKey":"N21","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.91072,"Longitude":100.6174,"PinmapX":"2792","PinmapY":"424","IsCrowded":false,"Orderlist":21},{"StationId":75,"StationName":"สะพานใหม่ | Saphan Mai","StationNameTH":"สะพานใหม่","StationNameEN":"Saphan Mai","StationKey":"N20","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.8966,"Longitude":100.6091,"PinmapX":"2714","PinmapY":"503","IsCrowded":false,"Orderlist":20},{"StationId":74,"StationName":"สายหยุด | Sai Yud","StationNameTH":"สายหยุด","StationNameEN":"Sai Yud","StationKey":"N19","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.88844,"Longitude":100.6043,"PinmapX":"2638","PinmapY":"584","IsCrowded":false,"Orderlist":19},{"StationId":73,"StationName":"พหลโยธิน 59 | Phahon Yothin 59","StationNameTH":"พหลโยธิน 59","StationNameEN":"Phahon Yothin 59","StationKey":"N18","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.88245,"Longitude":100.6008,"PinmapX":"2554","PinmapY":"663","IsCrowded":false,"Orderlist":18},{"StationId":69,"StationName":"วัดพระศรีมหาธาตุ | Wat Phra Sri Mahathat","StationNameTH":"วัดพระศรีมหาธาตุ","StationNameEN":"Wat Phra Sri Mahathat","StationKey":"N17","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.87529,"Longitude":100.5968,"PinmapX":"2463","PinmapY":"795","IsCrowded":false,"Orderlist":17},{"StationId":68,"StationName":"กรมทหารราบที่ 11 | 11th Infantry Regiment","StationNameTH":"กรมทหารราบที่ 11","StationNameEN":"11th Infantry Regiment","StationKey":"N16","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.86753,"Longitude":100.5919,"PinmapX":"2469","PinmapY":"917","IsCrowded":false,"Orderlist":16},{"StationId":67,"StationName":"บางบัว | Bang Bua","StationNameTH":"บางบัว","StationNameEN":"Bang Bua","StationKey":"N15","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.85599,"Longitude":100.5852,"PinmapX":"2461","PinmapY":"1043","IsCrowded":false,"Orderlist":15},{"StationId":66,"StationName":"กรมป่าไม้ | Royal Forest Department","StationNameTH":"กรมป่าไม้","StationNameEN":"Royal Forest Department","StationKey":"N14","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.85026,"Longitude":100.5818,"PinmapX":"2464","PinmapY":"1164","IsCrowded":false,"Orderlist":14},{"StationId":62,"StationName":"มหาวิทยาลัยเกษตรศาสตร์ | Kasetsart University","StationNameTH":"มหาวิทยาลัยเกษตรศาสตร์","StationNameEN":"Kasetsart University","StationKey":"N13","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.84207,"Longitude":100.577,"PinmapX":"2464","PinmapY":"1271","IsCrowded":false,"Orderlist":13},{"StationId":61,"StationName":"เสนานิคม | Sena Nikhom","StationNameTH":"เสนานิคม","StationNameEN":"Sena Nikhom","StationKey":"N12","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.83661,"Longitude":100.5738,"PinmapX":"2463","PinmapY":"1406","IsCrowded":false,"Orderlist":12},{"StationId":60,"StationName":"รัชโยธิน | Ratchayothin","StationNameTH":"รัชโยธิน","StationNameEN":"Ratchayothin","StationKey":"N11","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.82968,"Longitude":100.5697,"PinmapX":"2464","PinmapY":"1524","IsCrowded":false,"Orderlist":11},{"StationId":59,"StationName":"พหลโยธิน 24 | Phahon Yothin 24","StationNameTH":"พหลโยธิน 24","StationNameEN":"Phahon Yothin 24","StationKey":"N10","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.82385,"Longitude":100.5664,"PinmapX":"2469","PinmapY":"1646","IsCrowded":false,"Orderlist":10},{"StationId":54,"StationName":"ห้าแยกลาดพร้าว | Ha Yaek Lat Phrao","StationNameTH":"ห้าแยกลาดพร้าว","StationNameEN":"Ha Yaek Lat Phrao","StationKey":"N9","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.81723,"Longitude":100.5623,"PinmapX":"2464","PinmapY":"1791","IsCrowded":false,"Orderlist":9},{"StationId":1,"StationName":"หมอชิต | Mo Chit","StationNameTH":"หมอชิต","StationNameEN":"Mo Chit","StationKey":"N8","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.80265,"Longitude":100.5538,"PinmapX":"2468","PinmapY":"1930","IsCrowded":false,"Orderlist":8},{"StationId":2,"StationName":"สะพานควาย | Saphan Khwai","StationNameTH":"สะพานควาย","StationNameEN":"Saphan Khwai","StationKey":"N7","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.79383,"Longitude":100.5497,"PinmapX":"2461","PinmapY":"2032","IsCrowded":false,"Orderlist":7},{"StationId":3,"StationName":"อารีย์ | Ari","StationNameTH":"อารีย์","StationNameEN":"Ari","StationKey":"N5","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.77979,"Longitude":100.5447,"PinmapX":"2463","PinmapY":"2213","IsCrowded":true,"Orderlist":5},{"StationId":4,"StationName":"สนามเป้า | Sanam Pao","StationNameTH":"สนามเป้า","StationNameEN":"Sanam Pao","StationKey":"N4","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.77264,"Longitude":100.5421,"PinmapX":"2464","PinmapY":"2312","IsCrowded":true,"Orderlist":4},{"StationId":5,"StationName":"อนุสาวรีย์ชัยสมรภูมิ | Victory Monument","StationNameTH":"อนุสาวรีย์ชัยสมรภูมิ","StationNameEN":"Victory Monument","StationKey":"N3","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.76279,"Longitude":100.5371,"PinmapX":"2466","PinmapY":"2399","IsCrowded":false,"Orderlist":3},{"StationId":6,"StationName":"พญาไท | Phaya Thai","StationNameTH":"พญาไท","StationNameEN":"Phaya Thai","StationKey":"N2","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.75682,"Longitude":100.5338,"PinmapX":"2462","PinmapY":"2501","IsCrowded":false,"Orderlist":2},{"StationId":7,"StationName":"ราชเทวี | Ratchathewi","StationNameTH":"ราชเทวี","StationNameEN":"Ratchathewi","StationKey":"N1","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.75193,"Longitude":100.5315,"PinmapX":"2465","PinmapY":"2693","IsCrowded":false,"Orderlist":1},{"StationId":8,"StationName":"สยาม | Siam","StationNameTH":"สยาม","StationNameEN":"Siam","StationKey":"CEN","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.74556,"Longitude":100.5346,"PinmapX":"2506","PinmapY":"2878","IsCrowded":true,"Orderlist":0},{"StationId":9,"StationName":"ชิดลม | Chit Lom","StationNameTH":"ชิดลม","StationNameEN":"Chit Lom","StationKey":"E1","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.74409,"Longitude":100.543,"PinmapX":"2647","PinmapY":"2866","IsCrowded":false,"Orderlist":1},{"StationId":10,"StationName":"เพลินจิต | Phloen Chit","StationNameTH":"เพลินจิต","StationNameEN":"Phloen Chit","StationKey":"E2","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.74306,"Longitude":100.5488,"PinmapX":"2784","PinmapY":"2870","IsCrowded":false,"Orderlist":2},{"StationId":11,"StationName":"นานา | Nana","StationNameTH":"นานา","StationNameEN":"Nana","StationKey":"E3","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.74051,"Longitude":100.5554,"PinmapX":"2926","PinmapY":"2866","IsCrowded":false,"Orderlist":3},{"StationId":12,"StationName":"อโศก | Asok","StationNameTH":"อโศก","StationNameEN":"Asok","StationKey":"E4","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.737,"Longitude":100.5604,"PinmapX":"3067","PinmapY":"2869","IsCrowded":false,"Orderlist":4},{"StationId":13,"StationName":"พร้อมพงษ์ | Phrom Phong","StationNameTH":"พร้อมพงษ์","StationNameEN":"Phrom Phong","StationKey":"E5","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.73043,"Longitude":100.5697,"PinmapX":"3193","PinmapY":"2868","IsCrowded":false,"Orderlist":5},{"StationId":14,"StationName":"ทองหล่อ | Thong Lo","StationNameTH":"ทองหล่อ","StationNameEN":"Thong Lo","StationKey":"E6","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.72424,"Longitude":100.5785,"PinmapX":"3308","PinmapY":"2935","IsCrowded":false,"Orderlist":6},{"StationId":15,"StationName":"เอกมัย | Ekkamai","StationNameTH":"เอกมัย","StationNameEN":"Ekkamai","StationKey":"E7","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.71944,"Longitude":100.5853,"PinmapX":"3388","PinmapY":"3019","IsCrowded":false,"Orderlist":7},{"StationId":16,"StationName":"พระโขนง | Phra Khanong","StationNameTH":"พระโขนง","StationNameEN":"Phra Khanong","StationKey":"E8","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.71518,"Longitude":100.5913,"PinmapX":"3472","PinmapY":"3095","IsCrowded":false,"Orderlist":8},{"StationId":17,"StationName":"อ่อนนุช | On Nut","StationNameTH":"อ่อนนุช","StationNameEN":"On Nut","StationKey":"E9","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.70555,"Longitude":100.6011,"PinmapX":"3554","PinmapY":"3179","IsCrowded":false,"Orderlist":9},{"StationId":18,"StationName":"บางจาก | Bang Chak","StationNameTH":"บางจาก","StationNameEN":"Bang Chak","StationKey":"E10","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.69655,"Longitude":100.6055,"PinmapX":"3636","PinmapY":"3262","IsCrowded":false,"Orderlist":10},{"StationId":19,"StationName":"ปุณณวิถี | Punnawithi","StationNameTH":"ปุณณวิถี","StationNameEN":"Punnawithi","StationKey":"E11","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.6893,"Longitude":100.609,"PinmapX":"3677","PinmapY":"3363","IsCrowded":false,"Orderlist":11},{"StationId":20,"StationName":"อุดมสุข | Udom Suk","StationNameTH":"อุดมสุข","StationNameEN":"Udom Suk","StationKey":"E12","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.67993,"Longitude":100.6096,"PinmapX":"3675","PinmapY":"3483","IsCrowded":false,"Orderlist":12},{"StationId":21,"StationName":"บางนา | Bang Na","StationNameTH":"บางนา","StationNameEN":"Bang Na","StationKey":"E13","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.66812,"Longitude":100.6046,"PinmapX":"3675","PinmapY":"3603","IsCrowded":false,"Orderlist":13},{"StationId":22,"StationName":"แบริ่ง | Bearing","StationNameTH":"แบริ่ง","StationNameEN":"Bearing","StationKey":"E14","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.66117,"Longitude":100.6019,"PinmapX":"3676","PinmapY":"3730","IsCrowded":false,"Orderlist":14},{"StationId":23,"StationName":"สำโรง | Samrong","StationNameTH":"สำโรง","StationNameEN":"Samrong","StationKey":"E15","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.64619,"Longitude":100.5957,"PinmapX":"3679","PinmapY":"3850","IsCrowded":false,"Orderlist":15},{"StationId":46,"StationName":"ปู่เจ้า | Pu Chao","StationNameTH":"ปู่เจ้า","StationNameEN":"Pu Chao","StationKey":"E16","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.63725,"Longitude":100.592,"PinmapX":"3679","PinmapY":"3965","IsCrowded":false,"Orderlist":16},{"StationId":47,"StationName":"ช้างเอราวัณ | Chang Erawan","StationNameTH":"ช้างเอราวัณ","StationNameEN":"Chang Erawan","StationKey":"E17","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.62145,"Longitude":100.5901,"PinmapX":"3675","PinmapY":"4080","IsCrowded":false,"Orderlist":17},{"StationId":48,"StationName":"โรงเรียนนายเรือ | Royal Thai Naval Academy","StationNameTH":"โรงเรียนนายเรือ","StationNameEN":"Royal Thai Naval Academy","StationKey":"E18","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.60855,"Longitude":100.5948,"PinmapX":"3676","PinmapY":"4195","IsCrowded":false,"Orderlist":18},{"StationId":49,"StationName":"ปากน้ำ | Pak Nam","StationNameTH":"ปากน้ำ","StationNameEN":"Pak Nam","StationKey":"E19","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.60207,"Longitude":100.5971,"PinmapX":"3674","PinmapY":"4312","IsCrowded":false,"Orderlist":19},{"StationId":50,"StationName":"ศรีนครินทร์ | Srinagarindra","StationNameTH":"ศรีนครินทร์","StationNameEN":"Srinagarindra","StationKey":"E20","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.59208,"Longitude":100.6089,"PinmapX":"3676","PinmapY":"4426","IsCrowded":false,"Orderlist":20},{"StationId":51,"StationName":"แพรกษา | Phraek Sa","StationNameTH":"แพรกษา","StationNameEN":"Phraek Sa","StationKey":"E21","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.58432,"Longitude":100.608,"PinmapX":"3674","PinmapY":"4541","IsCrowded":false,"Orderlist":21},{"StationId":52,"StationName":"สายลวด | Sai Luat","StationNameTH":"สายลวด","StationNameEN":"Sai Luat","StationKey":"E22","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.57778,"Longitude":100.6054,"PinmapX":"3674","PinmapY":"4655","IsCrowded":false,"Orderlist":22},{"StationId":53,"StationName":"เคหะฯ | Kheha","StationNameTH":"เคหะฯ","StationNameEN":"Kheha","StationKey":"E23","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.56765,"Longitude":100.6077,"PinmapX":"3790","PinmapY":"4771","IsCrowded":false,"Orderlist":23}]},{"LineId":2,"LineName_TH":"สายสีลม","LineName_EN":"Silom Line","LineColor":"#00807D","StationList":[{"StationId":26,"StationName":"สนามกีฬาแห่งชาติ | National Stadium","StationNameTH":"สนามกีฬาแห่งชาติ","StationNameEN":"National Stadium","StationKey":"W1","StationLineId":2,"StationLineName":"สายสีลม | Silom Line","LineNameTH":"สายสีลม","LineNameEN":"Silom Line","StationLineColor":"#00807D","Latitude":13.74649,"Longitude":100.5294,"PinmapX":"2317","PinmapY":"2886","IsCrowded":false,"Orderlist":1},{"StationId":27,"StationName":"สยาม | Siam","StationNameTH":"สยาม","StationNameEN":"Siam","StationKey":"CEN","StationLineId":2,"StationLineName":"สายสีลม | Silom Line","LineNameTH":"สายสีลม","LineNameEN":"Silom Line","StationLineColor":"#00807D","Latitude":13.74552,"Longitude":100.5346,"PinmapX":"","PinmapY":"","IsCrowded":false,"Orderlist":0},{"StationId":28,"StationName":"ราชดำริ | Ratchadamri","StationNameTH":"ราชดำริ","StationNameEN":"Ratchadamri","StationKey":"S1","StationLineId":2,"StationLineName":"สายสีลม | Silom Line","LineNameTH":"สายสีลม","LineNameEN":"Silom Line","StationLineColor":"#00807D","Latitude":13.73947,"Longitude":100.5395,"PinmapX":"2545","PinmapY":"3007","IsCrowded":false,"Orderlist":1},{"StationId":29,"StationName":"ศาลาแดง | Sala Daeng","StationNameTH":"ศาลาแดง","StationNameEN":"Sala Daeng","StationKey":"S2","StationLineId":2,"StationLineName":"สายสีลม | Silom Line","LineNameTH":"สายสีลม","LineNameEN":"Silom Line","StationLineColor":"#00807D","Latitude":13.72855,"Longitude":100.5343,"PinmapX":"2547","PinmapY":"3127","IsCrowded":false,"Orderlist":2},{"StationId":30,"StationName":"ช่องนนทรี | Chong Nonsi","StationNameTH":"ช่องนนทรี","StationNameEN":"Chong Nonsi","StationKey":"S3","StationLineId":2,"StationLineName":"สายสีลม | Silom Line","LineNameTH":"สายสีลม","LineNameEN":"Silom Line","StationLineColor":"#00807D","Latitude":13.72373,"Longitude":100.5294,"PinmapX":"2544","PinmapY":"3294","IsCrowded":false,"Orderlist":3},{"StationId":80,"StationName":"เซนต์หลุยส์ | Saint Louis","StationNameTH":"เซนต์หลุยส์","StationNameEN":"Saint Louis","StationKey":"S4","StationLineId":2,"StationLineName":"สายสีลม | Silom Line","LineNameTH":"สายสีลม","LineNameEN":"Silom Line","StationLineColor":"#00807D","Latitude":13.72107,"Longitude":100.527,"PinmapX":"2522","PinmapY":"3443","IsCrowded":false,"Orderlist":4},{"StationId":31,"StationName":"สุรศักดิ์ | Surasak","StationNameTH":"สุรศักดิ์","StationNameEN":"Surasak","StationKey":"S5","StationLineId":2,"StationLineName":"สายสีลม | Silom Line","LineNameTH":"สายสีลม","LineNameEN":"Silom Line","StationLineColor":"#00807D","Latitude":13.71931,"Longitude":100.5216,"PinmapX":"2447","PinmapY":"3510","IsCrowded":false,"Orderlist":5},{"StationId":32,"StationName":"สะพานตากสิน | Saphan Taksin","StationNameTH":"สะพานตากสิน","StationNameEN":"Saphan Taksin","StationKey":"S6","StationLineId":2,"StationLineName":"สายสีลม | Silom Line","LineNameTH":"สายสีลม","LineNameEN":"Silom Line","StationLineColor":"#00807D","Latitude":13.7188,"Longitude":100.5141,"PinmapX":"2384","PinmapY":"3578","IsCrowded":false,"Orderlist":6},{"StationId":33,"StationName":"กรุงธนบุรี | Krung Thon Buri","StationNameTH":"กรุงธนบุรี","StationNameEN":"Krung Thon Buri","StationKey":"S7","StationLineId":2,"StationLineName":"สายสีลม | Silom Line","LineNameTH":"สายสีลม","LineNameEN":"Silom Line","StationLineColor":"#00807D","Latitude":13.72088,"Longitude":100.5028,"PinmapX":"2190","PinmapY":"3651","IsCrowded":false,"Orderlist":7},{"StationId":34,"StationName":"วงเวียนใหญ่ | Wongwian Yai","StationNameTH":"วงเวียนใหญ่","StationNameEN":"Wongwian Yai","StationKey":"S8","StationLineId":2,"StationLineName":"สายสีลม | Silom Line","LineNameTH":"สายสีลม","LineNameEN":"Silom Line","StationLineColor":"#00807D","Latitude":13.72115,"Longitude":100.4953,"PinmapX":"1966","PinmapY":"3646","IsCrowded":false,"Orderlist":8},{"StationId":35,"StationName":"โพธิ์นิมิตร | Pho Nimit","StationNameTH":"โพธิ์นิมิตร","StationNameEN":"Pho Nimit","StationKey":"S9","StationLineId":2,"StationLineName":"สายสีลม | Silom Line","LineNameTH":"สายสีลม","LineNameEN":"Silom Line","StationLineColor":"#00807D","Latitude":13.71922,"Longitude":100.4859,"PinmapX":"1744","PinmapY":"3649","IsCrowded":false,"Orderlist":9},{"StationId":36,"StationName":"ตลาดพลู | Talat Phlu","StationNameTH":"ตลาดพลู","StationNameEN":"Talat Phlu","StationKey":"S10","StationLineId":2,"StationLineName":"สายสีลม | Silom Line","LineNameTH":"สายสีลม","LineNameEN":"Silom Line","StationLineColor":"#00807D","Latitude":13.71422,"Longitude":100.4767,"PinmapX":"1519","PinmapY":"3647","IsCrowded":false,"Orderlist":10},{"StationId":37,"StationName":"วุฒากาศ | Wutthakat","StationNameTH":"วุฒากาศ","StationNameEN":"Wutthakat","StationKey":"S11","StationLineId":2,"StationLineName":"สายสีลม | Silom Line","LineNameTH":"สายสีลม","LineNameEN":"Silom Line","StationLineColor":"#00807D","Latitude":13.71297,"Longitude":100.4689,"PinmapX":"1279","PinmapY":"3537","IsCrowded":false,"Orderlist":11},{"StationId":38,"StationName":"บางหว้า | Bang Wa","StationNameTH":"บางหว้า","StationNameEN":"Bang Wa","StationKey":"S12","StationLineId":2,"StationLineName":"สายสีลม | Silom Line","LineNameTH":"สายสีลม","LineNameEN":"Silom Line","StationLineColor":"#00807D","Latitude":13.7207,"Longitude":100.4578,"PinmapX":"1100","PinmapY":"3358","IsCrowded":false,"Orderlist":12}]},{"LineId":3,"LineName_TH":"สายสีทอง","LineName_EN":"Gold Line","LineColor":"#a88b34","StationList":[{"StationId":70,"StationName":"กรุงธนบุรี | Krung Thon Buri","StationNameTH":"กรุงธนบุรี","StationNameEN":"Krung Thon Buri","StationKey":"G1","StationLineId":3,"StationLineName":"สายสีทอง | Gold Line","LineNameTH":"สายสีทอง","LineNameEN":"Gold Line","StationLineColor":"#a88b34","Latitude":13.72127,"Longitude":100.5037,"PinmapX":"2188","PinmapY":"3582","IsCrowded":false,"Orderlist":1},{"StationId":71,"StationName":"เจริญนคร | Charoen Nakhon","StationNameTH":"เจริญนคร","StationNameEN":"Charoen Nakhon","StationKey":"G2","StationLineId":3,"StationLineName":"สายสีทอง | Gold Line","LineNameTH":"สายสีทอง","LineNameEN":"Gold Line","StationLineColor":"#a88b34","Latitude":13.72783,"Longitude":100.5093,"PinmapX":"2121","PinmapY":"3459","IsCrowded":false,"Orderlist":2},{"StationId":72,"StationName":"คลองสาน | Khlong San","StationNameTH":"คลองสาน","StationNameEN":"Khlong San","StationKey":"G3","StationLineId":3,"StationLineName":"สายสีทอง | Gold Line","LineNameTH":"สายสีทอง","LineNameEN":"Gold Line","StationLineColor":"#a88b34","Latitude":13.7317,"Longitude":100.5078,"PinmapX":"1991","PinmapY":"3385","IsCrowded":false,"Orderlist":3}]},{"LineId":4,"LineName_TH":"สายสีเหลือง","LineName_EN":"Yellow Line","LineColor":"#FAD53D","StationList":[{"StationId":81,"StationName":"ลาดพร้าว | Lat Phrao","StationNameTH":"ลาดพร้าว","StationNameEN":"Lat Phrao","StationKey":"YL01","StationLineId":4,"StationLineName":"สายสีเหลือง | Yellow Line","LineNameTH":"สายสีเหลือง","LineNameEN":"Yellow Line","StationLineColor":"#FAD53D","Latitude":13.80701,"Longitude":100.5749,"PinmapX":"2695","PinmapY":"1745","IsCrowded":false,"Orderlist":1},{"StationId":82,"StationName":"ภาวนา | Phawana","StationNameTH":"ภาวนา","StationNameEN":"Phawana","StationKey":"YL02","StationLineId":4,"StationLineName":"สายสีเหลือง | Yellow Line","LineNameTH":"สายสีเหลือง","LineNameEN":"Yellow Line","StationLineColor":"#FAD53D","Latitude":13.80016,"Longitude":100.5842,"PinmapX":"2876","PinmapY":"1742","IsCrowded":false,"Orderlist":2},{"StationId":83,"StationName":"โชคชัย 4 | Chok Chai 4","StationNameTH":"โชคชัย 4","StationNameEN":"Chok Chai 4","StationKey":"YL03","StationLineId":4,"StationLineName":"สายสีเหลือง | Yellow Line","LineNameTH":"สายสีเหลือง","LineNameEN":"Yellow Line","StationLineColor":"#FAD53D","Latitude":13.79442,"Longitude":100.5945,"PinmapX":"3079","PinmapY":"1741","IsCrowded":false,"Orderlist":3},{"StationId":84,"StationName":"ลาดพร้าว 71 | Lat Phrao 71","StationNameTH":"ลาดพร้าว 71","StationNameEN":"Lat Phrao 71","StationKey":"YL04","StationLineId":4,"StationLineName":"สายสีเหลือง | Yellow Line","LineNameTH":"สายสีเหลือง","LineNameEN":"Yellow Line","StationLineColor":"#FAD53D","Latitude":13.78708,"Longitude":100.6076,"PinmapX":"3276","PinmapY":"1744","IsCrowded":false,"Orderlist":4},{"StationId":85,"StationName":"ลาดพร้าว 83 | Lat Phrao 83","StationNameTH":"ลาดพร้าว 83","StationNameEN":"Lat Phrao 83","StationKey":"YL05","StationLineId":4,"StationLineName":"สายสีเหลือง | Yellow Line","LineNameTH":"สายสีเหลือง","LineNameEN":"Yellow Line","StationLineColor":"#FAD53D","Latitude":13.78367,"Longitude":100.6137,"PinmapX":"3480","PinmapY":"1744","IsCrowded":false,"Orderlist":5},{"StationId":87,"StationName":"มหาดไทย | Mahat Thai","StationNameTH":"มหาดไทย","StationNameEN":"Mahat Thai","StationKey":"YL06","StationLineId":4,"StationLineName":"สายสีเหลือง | Yellow Line","LineNameTH":"สายสีเหลือง","LineNameEN":"Yellow Line","StationLineColor":"#FAD53D","Latitude":13.77833,"Longitude":100.6233,"PinmapX":"3638","PinmapY":"1784","IsCrowded":false,"Orderlist":6},{"StationId":86,"StationName":"ลาดพร้าว 101 | Lat Phrao 101","StationNameTH":"ลาดพร้าว 101","StationNameEN":"Lat Phrao 101","StationKey":"YL07","StationLineId":4,"StationLineName":"สายสีเหลือง | Yellow Line","LineNameTH":"สายสีเหลือง","LineNameEN":"Yellow Line","StationLineColor":"#FAD53D","Latitude":13.77461,"Longitude":100.6299,"PinmapX":"3757","PinmapY":"1900","IsCrowded":false,"Orderlist":7},{"StationId":88,"StationName":"บางกะปิ | Bang Kapi","StationNameTH":"บางกะปิ","StationNameEN":"Bang Kapi","StationKey":"YL08","StationLineId":4,"StationLineName":"สายสีเหลือง | Yellow Line","LineNameTH":"สายสีเหลือง","LineNameEN":"Yellow Line","StationLineColor":"#FAD53D","Latitude":13.76906,"Longitude":100.6398,"PinmapX":"3876","PinmapY":"2014","IsCrowded":false,"Orderlist":8},{"StationId":89,"StationName":"แยกลำสาลี | Yaek Lam Sali","StationNameTH":"แยกลำสาลี","StationNameEN":"Yaek Lam Sali","StationKey":"YL09","StationLineId":4,"StationLineName":"สายสีเหลือง | Yellow Line","LineNameTH":"สายสีเหลือง","LineNameEN":"Yellow Line","StationLineColor":"#FAD53D","Latitude":13.76173,"Longitude":100.6455,"PinmapX":"3992","PinmapY":"2131","IsCrowded":false,"Orderlist":9},{"StationId":90,"StationName":"ศรีกรีฑา | Si Kritha","StationNameTH":"ศรีกรีฑา","StationNameEN":"Si Kritha","StationKey":"YL10","StationLineId":4,"StationLineName":"สายสีเหลือง | Yellow Line","LineNameTH":"สายสีเหลือง","LineNameEN":"Yellow Line","StationLineColor":"#FAD53D","Latitude":13.75037,"Longitude":100.6448,"PinmapX":"4105","PinmapY":"2298","IsCrowded":false,"Orderlist":10},{"StationId":91,"StationName":"หัวหมาก | Hua Mak","StationNameTH":"หัวหมาก","StationNameEN":"Hua Mak","StationKey":"YL11","StationLineId":4,"StationLineName":"สายสีเหลือง | Yellow Line","LineNameTH":"สายสีเหลือง","LineNameEN":"Yellow Line","StationLineColor":"#FAD53D","Latitude":13.73605,"Longitude":100.6411,"PinmapX":"4106","PinmapY":"2559","IsCrowded":false,"Orderlist":11},{"StationId":92,"StationName":"กลันตัน | Kalantan","StationNameTH":"กลันตัน","StationNameEN":"Kalantan","StationKey":"YL12","StationLineId":4,"StationLineName":"สายสีเหลือง | Yellow Line","LineNameTH":"สายสีเหลือง","LineNameEN":"Yellow Line","StationLineColor":"#FAD53D","Latitude":13.72531,"Longitude":100.6418,"PinmapX":"4103","PinmapY":"2692","IsCrowded":false,"Orderlist":12},{"StationId":93,"StationName":"ศรีนุช | Si Nut","StationNameTH":"ศรีนุช","StationNameEN":"Si Nut","StationKey":"YL13","StationLineId":4,"StationLineName":"สายสีเหลือง | Yellow Line","LineNameTH":"สายสีเหลือง","LineNameEN":"Yellow Line","StationLineColor":"#FAD53D","Latitude":13.71101,"Longitude":100.6442,"PinmapX":"4104","PinmapY":"2824","IsCrowded":false,"Orderlist":13},{"StationId":94,"StationName":"ศรีนครินทร์ 38 | Srinagarindra 38","StationNameTH":"ศรีนครินทร์ 38","StationNameEN":"Srinagarindra 38","StationKey":"YL14","StationLineId":4,"StationLineName":"สายสีเหลือง | Yellow Line","LineNameTH":"สายสีเหลือง","LineNameEN":"Yellow Line","StationLineColor":"#FAD53D","Latitude":13.701,"Longitude":100.6465,"PinmapX":"4101","PinmapY":"2959","IsCrowded":false,"Orderlist":14},{"StationId":95,"StationName":"สวนหลวง ร.9 | Suan Luang Rama IX","StationNameTH":"สวนหลวง ร.9","StationNameEN":"Suan Luang Rama IX","StationKey":"YL15","StationLineId":4,"StationLineName":"สายสีเหลือง | Yellow Line","LineNameTH":"สายสีเหลือง","LineNameEN":"Yellow Line","StationLineColor":"#FAD53D","Latitude":13.69073,"Longitude":100.6471,"PinmapX":"4103","PinmapY":"3092","IsCrowded":false,"Orderlist":15},{"StationId":96,"StationName":"ศรีอุดม | Si Udom","StationNameTH":"ศรีอุดม","StationNameEN":"Si Udom","StationKey":"YL16","StationLineId":4,"StationLineName":"สายสีเหลือง | Yellow Line","LineNameTH":"สายสีเหลือง","LineNameEN":"Yellow Line","StationLineColor":"#FAD53D","Latitude":13.67659,"Longitude":100.6462,"PinmapX":"4104","PinmapY":"3225","IsCrowded":false,"Orderlist":16},{"StationId":97,"StationName":"ศรีเอี่ยม | Si lam","StationNameTH":"ศรีเอี่ยม","StationNameEN":"Si lam","StationKey":"YL17","StationLineId":4,"StationLineName":"สายสีเหลือง | Yellow Line","LineNameTH":"สายสีเหลือง","LineNameEN":"Yellow Line","StationLineColor":"#FAD53D","Latitude":13.66769,"Longitude":100.6451,"PinmapX":"4104","PinmapY":"3361","IsCrowded":false,"Orderlist":17},{"StationId":98,"StationName":"ศรีลาซาล | Si La Salle","StationNameTH":"ศรีลาซาล","StationNameEN":"Si La Salle","StationKey":"YL18","StationLineId":4,"StationLineName":"สายสีเหลือง | Yellow Line","LineNameTH":"สายสีเหลือง","LineNameEN":"Yellow Line","StationLineColor":"#FAD53D","Latitude":13.65502,"Longitude":100.6421,"PinmapX":"4103","PinmapY":"3492","IsCrowded":false,"Orderlist":18},{"StationId":99,"StationName":"ศรีแบริ่ง | Si Bearing","StationNameTH":"ศรีแบริ่ง","StationNameEN":"Si Bearing","StationKey":"YL19","StationLineId":4,"StationLineName":"สายสีเหลือง | Yellow Line","LineNameTH":"สายสีเหลือง","LineNameEN":"Yellow Line","StationLineColor":"#FAD53D","Latitude":13.64346,"Longitude":100.6362,"PinmapX":"4104","PinmapY":"3626","IsCrowded":false,"Orderlist":19},{"StationId":100,"StationName":"ศรีด่าน | Si Dan","StationNameTH":"ศรีด่าน","StationNameEN":"Si Dan","StationKey":"YL20","StationLineId":4,"StationLineName":"สายสีเหลือง | Yellow Line","LineNameTH":"สายสีเหลือง","LineNameEN":"Yellow Line","StationLineColor":"#FAD53D","Latitude":13.63313,"Longitude":100.6301,"PinmapX":"4101","PinmapY":"3759","IsCrowded":false,"Orderlist":20},{"StationId":101,"StationName":"ศรีเทพา | Si Thepha","StationNameTH":"ศรีเทพา","StationNameEN":"Si Thepha","StationKey":"YL21","StationLineId":4,"StationLineName":"สายสีเหลือง | Yellow Line","LineNameTH":"สายสีเหลือง","LineNameEN":"Yellow Line","StationLineColor":"#FAD53D","Latitude":13.62997,"Longitude":100.6227,"PinmapX":"3982","PinmapY":"3847","IsCrowded":false,"Orderlist":21},{"StationId":102,"StationName":"ทิพวัล | Thipphawan","StationNameTH":"ทิพวัล","StationNameEN":"Thipphawan","StationKey":"YL22","StationLineId":4,"StationLineName":"สายสีเหลือง | Yellow Line","LineNameTH":"สายสีเหลือง","LineNameEN":"Yellow Line","StationLineColor":"#FAD53D","Latitude":13.63679,"Longitude":100.6099,"PinmapX":"3863","PinmapY":"3850","IsCrowded":false,"Orderlist":22},{"StationId":103,"StationName":"สำโรง | Samrong","StationNameTH":"สำโรง","StationNameEN":"Samrong","StationKey":"YL23","StationLineId":4,"StationLineName":"สายสีเหลือง | Yellow Line","LineNameTH":"สายสีเหลือง","LineNameEN":"Yellow Line","StationLineColor":"#FAD53D","Latitude":13.64506,"Longitude":100.5966,"PinmapX":"3743","PinmapY":"3850","IsCrowded":false,"Orderlist":23}]},{"LineId":5,"LineName_TH":"สายสีชมพู","LineName_EN":"Pink Line","LineColor":"#D76886","StationList":[{"StationId":134,"StationName":"ศูนย์ราชการนนทบุรี | Nonthaburi Civic Center","StationNameTH":"ศูนย์ราชการนนทบุรี","StationNameEN":"Nonthaburi Civic Center","StationKey":"PK01","StationLineId":5,"StationLineName":"สายสีชมพู | Pink Line","LineNameTH":"สายสีชมพู","LineNameEN":"Pink Line","StationLineColor":"#D76886","Latitude":13.85967,"Longitude":100.5182,"PinmapX":"1345","PinmapY":"1277","IsCrowded":false,"Orderlist":1},{"StationId":135,"StationName":"แคราย | Khae Rai","StationNameTH":"แคราย","StationNameEN":"Khae Rai","StationKey":"PK02","StationLineId":5,"StationLineName":"สายสีชมพู | Pink Line","LineNameTH":"สายสีชมพู","LineNameEN":"Pink Line","StationLineColor":"#D76886","Latitude":13.86271,"Longitude":100.5206,"PinmapX":"1266","PinmapY":"1212","IsCrowded":false,"Orderlist":2},{"StationId":136,"StationName":"สนามบินน้ำ | Sanambin Nam","StationNameTH":"สนามบินน้ำ","StationNameEN":"Sanambin Nam","StationKey":"PK03","StationLineId":5,"StationLineName":"สายสีชมพู | Pink Line","LineNameTH":"สายสีชมพู","LineNameEN":"Pink Line","StationLineColor":"#D76886","Latitude":13.8742,"Longitude":100.5163,"PinmapX":"1179","PinmapY":"1127","IsCrowded":false,"Orderlist":3},{"StationId":137,"StationName":"สามัคคี | Samakkhi","StationNameTH":"สามัคคี","StationNameEN":"Samakkhi","StationKey":"PK04","StationLineId":5,"StationLineName":"สายสีชมพู | Pink Line","LineNameTH":"สายสีชมพู","LineNameEN":"Pink Line","StationLineColor":"#D76886","Latitude":13.88935,"Longitude":100.5105,"PinmapX":"1103","PinmapY":"1047","IsCrowded":false,"Orderlist":4},{"StationId":138,"StationName":"กรมชลประทาน | Royal Irrigation Department","StationNameTH":"กรมชลประทาน","StationNameEN":"Royal Irrigation Department","StationKey":"PK05","StationLineId":5,"StationLineName":"สายสีชมพู | Pink Line","LineNameTH":"สายสีชมพู","LineNameEN":"Pink Line","StationLineColor":"#D76886","Latitude":13.89863,"Longitude":100.507,"PinmapX":"1063","PinmapY":"942","IsCrowded":false,"Orderlist":5},{"StationId":139,"StationName":"แยกปากเกร็ด | Yaek Pak Kret","StationNameTH":"แยกปากเกร็ด","StationNameEN":"Yaek Pak Kret","StationKey":"PK06","StationLineId":5,"StationLineName":"สายสีชมพู | Pink Line","LineNameTH":"สายสีชมพู","LineNameEN":"Pink Line","StationLineColor":"#D76886","Latitude":13.9063,"Longitude":100.5054,"PinmapX":"1058","PinmapY":"827","IsCrowded":false,"Orderlist":6},{"StationId":140,"StationName":"เลี่ยงเมืองปากเกร็ด | Pak Kret Bypass","StationNameTH":"เลี่ยงเมืองปากเกร็ด","StationNameEN":"Pak Kret Bypass","StationKey":"PK07","StationLineId":5,"StationLineName":"สายสีชมพู | Pink Line","LineNameTH":"สายสีชมพู","LineNameEN":"Pink Line","StationLineColor":"#D76886","Latitude":13.90648,"Longitude":100.5156,"PinmapX":"1188","PinmapY":"784","IsCrowded":false,"Orderlist":7},{"StationId":141,"StationName":"แจ้งวัฒนะ-ปากเกร็ด 28 | Chaeng Watthana-Pak Kret 28","StationNameTH":"แจ้งวัฒนะ-ปากเกร็ด 28","StationNameEN":"Chaeng Watthana-Pak Kret 28","StationKey":"PK08","StationLineId":5,"StationLineName":"สายสีชมพู | Pink Line","LineNameTH":"สายสีชมพู","LineNameEN":"Pink Line","StationLineColor":"#D76886","Latitude":13.90417,"Longitude":100.5292,"PinmapX":"1321","PinmapY":"784","IsCrowded":false,"Orderlist":8},{"StationId":142,"StationName":"ศรีรัช | Si Rat","StationNameTH":"ศรีรัช","StationNameEN":"Si Rat","StationKey":"PK09","StationLineId":5,"StationLineName":"สายสีชมพู | Pink Line","LineNameTH":"สายสีชมพู","LineNameEN":"Pink Line","StationLineColor":"#D76886","Latitude":13.90056,"Longitude":100.54,"PinmapX":"1454","PinmapY":"790","IsCrowded":false,"Orderlist":9},{"StationId":143,"StationName":"เมืองทองธานี | Muang Thong Thani","StationNameTH":"เมืองทองธานี","StationNameEN":"Muang Thong Thani","StationKey":"PK10","StationLineId":5,"StationLineName":"สายสีชมพู | Pink Line","LineNameTH":"สายสีชมพู","LineNameEN":"Pink Line","StationLineColor":"#D76886","Latitude":13.89739,"Longitude":100.5484,"PinmapX":"1582","PinmapY":"787","IsCrowded":false,"Orderlist":10},{"StationId":144,"StationName":"แจ้งวัฒนะ 14 | Chaeng Watthana 14","StationNameTH":"แจ้งวัฒนะ 14","StationNameEN":"Chaeng Watthana 14","StationKey":"PK11","StationLineId":5,"StationLineName":"สายสีชมพู | Pink Line","LineNameTH":"สายสีชมพู","LineNameEN":"Pink Line","StationLineColor":"#D76886","Latitude":13.89328,"Longitude":100.5601,"PinmapX":"1715","PinmapY":"785","IsCrowded":false,"Orderlist":11},{"StationId":145,"StationName":"ศูนย์ราชการเฉลิมพระเกียรติ | Government Complex","StationNameTH":"ศูนย์ราชการเฉลิมพระเกียรติ","StationNameEN":"Government Complex","StationKey":"PK12","StationLineId":5,"StationLineName":"สายสีชมพู | Pink Line","LineNameTH":"สายสีชมพู","LineNameEN":"Pink Line","StationLineColor":"#D76886","Latitude":13.89073,"Longitude":100.5673,"PinmapX":"1844","PinmapY":"788","IsCrowded":false,"Orderlist":12},{"StationId":146,"StationName":"โทรคมนาคมแห่งชาติ | National Telecom","StationNameTH":"โทรคมนาคมแห่งชาติ","StationNameEN":"National Telecom","StationKey":"PK13","StationLineId":5,"StationLineName":"สายสีชมพู | Pink Line","LineNameTH":"สายสีชมพู","LineNameEN":"Pink Line","StationLineColor":"#D76886","Latitude":13.88756,"Longitude":100.5757,"PinmapX":"1971","PinmapY":"789","IsCrowded":false,"Orderlist":13},{"StationId":147,"StationName":"หลักสี่ | Lak Si","StationNameTH":"หลักสี่","StationNameEN":"Lak Si","StationKey":"PK14","StationLineId":5,"StationLineName":"สายสีชมพู | Pink Line","LineNameTH":"สายสีชมพู","LineNameEN":"Pink Line","StationLineColor":"#D76886","Latitude":13.88411,"Longitude":100.5826,"PinmapX":"2179","PinmapY":"790","IsCrowded":false,"Orderlist":14},{"StationId":148,"StationName":"ราชภัฏพระนคร | Rajabhat Phranakhon","StationNameTH":"ราชภัฏพระนคร","StationNameEN":"Rajabhat Phranakhon","StationKey":"PK15","StationLineId":5,"StationLineName":"สายสีชมพู | Pink Line","LineNameTH":"สายสีชมพู","LineNameEN":"Pink Line","StationLineColor":"#D76886","Latitude":13.88002,"Longitude":100.5892,"PinmapX":"2314","PinmapY":"790","IsCrowded":false,"Orderlist":15},{"StationId":149,"StationName":"วัดพระศรีมหาธาตุ | Wat Phra Sri Mahathat","StationNameTH":"วัดพระศรีมหาธาตุ","StationNameEN":"Wat Phra Sri Mahathat","StationKey":"PK16","StationLineId":5,"StationLineName":"สายสีชมพู | Pink Line","LineNameTH":"สายสีชมพู","LineNameEN":"Pink Line","StationLineColor":"#D76886","Latitude":13.87442,"Longitude":100.5968,"PinmapX":"2527","PinmapY":"785","IsCrowded":false,"Orderlist":16},{"StationId":150,"StationName":"รามอินทรา 3 | Ram Inthra 3","StationNameTH":"รามอินทรา 3","StationNameEN":"Ram Inthra 3","StationKey":"PK17","StationLineId":5,"StationLineName":"สายสีชมพู | Pink Line","LineNameTH":"สายสีชมพู","LineNameEN":"Pink Line","StationLineColor":"#D76886","Latitude":13.87094,"Longitude":100.6026,"PinmapX":"2705","PinmapY":"792","IsCrowded":false,"Orderlist":17},{"StationId":151,"StationName":"ลาดปลาเค้า | Lat Pla Khao","StationNameTH":"ลาดปลาเค้า","StationNameEN":"Lat Pla Khao","StationKey":"PK18","StationLineId":5,"StationLineName":"สายสีชมพู | Pink Line","LineNameTH":"สายสีชมพู","LineNameEN":"Pink Line","StationLineColor":"#D76886","Latitude":13.86278,"Longitude":100.6178,"PinmapX":"2879","PinmapY":"789","IsCrowded":false,"Orderlist":18},{"StationId":152,"StationName":"รามอินทรา กม.4 | Ram Inthra Kor Mor 4","StationNameTH":"รามอินทรา กม.4","StationNameEN":"Ram Inthra Kor Mor 4","StationKey":"PK19","StationLineId":5,"StationLineName":"สายสีชมพู | Pink Line","LineNameTH":"สายสีชมพู","LineNameEN":"Pink Line","StationLineColor":"#D76886","Latitude":13.85829,"Longitude":100.6261,"PinmapX":"3053","PinmapY":"787","IsCrowded":false,"Orderlist":19},{"StationId":153,"StationName":"มัยลาภ | Maiyalap","StationNameTH":"มัยลาภ","StationNameEN":"Maiyalap","StationKey":"PK20","StationLineId":5,"StationLineName":"สายสีชมพู | Pink Line","LineNameTH":"สายสีชมพู","LineNameEN":"Pink Line","StationLineColor":"#D76886","Latitude":13.85501,"Longitude":100.6322,"PinmapX":"3224","PinmapY":"788","IsCrowded":false,"Orderlist":20},{"StationId":154,"StationName":"วัชรพล | Vacharaphol","StationNameTH":"วัชรพล","StationNameEN":"Vacharaphol","StationKey":"PK21","StationLineId":5,"StationLineName":"สายสีชมพู | Pink Line","LineNameTH":"สายสีชมพู","LineNameEN":"Pink Line","StationLineColor":"#D76886","Latitude":13.84922,"Longitude":100.6429,"PinmapX":"3408","PinmapY":"787","IsCrowded":false,"Orderlist":21},{"StationId":155,"StationName":"รามอินทรา กม.6 | Ram Inthra Kor Mor 6","StationNameTH":"รามอินทรา กม.6","StationNameEN":"Ram Inthra Kor Mor 6","StationKey":"PK22","StationLineId":5,"StationLineName":"สายสีชมพู | Pink Line","LineNameTH":"สายสีชมพู","LineNameEN":"Pink Line","StationLineColor":"#D76886","Latitude":13.84523,"Longitude":100.6502,"PinmapX":"3579","PinmapY":"791","IsCrowded":false,"Orderlist":22},{"StationId":156,"StationName":"คู้บอน | Khu Bon","StationNameTH":"คู้บอน","StationNameEN":"Khu Bon","StationKey":"PK23","StationLineId":5,"StationLineName":"สายสีชมพู | Pink Line","LineNameTH":"สายสีชมพู","LineNameEN":"Pink Line","StationLineColor":"#D76886","Latitude":13.84059,"Longitude":100.6588,"PinmapX":"3754","PinmapY":"786","IsCrowded":false,"Orderlist":23},{"StationId":157,"StationName":"รามอินทรา กม.9 | Ram Inthra Kor Mor 9","StationNameTH":"รามอินทรา กม.9","StationNameEN":"Ram Inthra Kor Mor 9","StationKey":"PK24","StationLineId":5,"StationLineName":"สายสีชมพู | Pink Line","LineNameTH":"สายสีชมพู","LineNameEN":"Pink Line","StationLineColor":"#D76886","Latitude":13.83383,"Longitude":100.6675,"PinmapX":"3928","PinmapY":"788","IsCrowded":false,"Orderlist":24},{"StationId":158,"StationName":"วงแหวนรามอินทรา | Outer Ring Road-Ram Inthra","StationNameTH":"วงแหวนรามอินทรา","StationNameEN":"Outer Ring Road-Ram Inthra","StationKey":"PK25","StationLineId":5,"StationLineName":"สายสีชมพู | Pink Line","LineNameTH":"สายสีชมพู","LineNameEN":"Pink Line","StationLineColor":"#D76886","Latitude":13.82449,"Longitude":100.6771,"PinmapX":"4073","PinmapY":"874","IsCrowded":false,"Orderlist":25},{"StationId":159,"StationName":"นพรัตน์ | Nopparat","StationNameTH":"นพรัตน์","StationNameEN":"Nopparat","StationKey":"PK26","StationLineId":5,"StationLineName":"สายสีชมพู | Pink Line","LineNameTH":"สายสีชมพู","LineNameEN":"Pink Line","StationLineColor":"#D76886","Latitude":13.81658,"Longitude":100.6856,"PinmapX":"4185","PinmapY":"989","IsCrowded":false,"Orderlist":26},{"StationId":160,"StationName":"บางชัน | Bang Chan","StationNameTH":"บางชัน","StationNameEN":"Bang Chan","StationKey":"PK27","StationLineId":5,"StationLineName":"สายสีชมพู | Pink Line","LineNameTH":"สายสีชมพู","LineNameEN":"Pink Line","StationLineColor":"#D76886","Latitude":13.81272,"Longitude":100.7028,"PinmapX":"4296","PinmapY":"1107","IsCrowded":false,"Orderlist":27},{"StationId":161,"StationName":"เศรษฐบุตรบำเพ็ญ | Setthabutbamphen","StationNameTH":"เศรษฐบุตรบำเพ็ญ","StationNameEN":"Setthabutbamphen","StationKey":"PK28","StationLineId":5,"StationLineName":"สายสีชมพู | Pink Line","LineNameTH":"สายสีชมพู","LineNameEN":"Pink Line","StationLineColor":"#D76886","Latitude":13.81272,"Longitude":100.7124,"PinmapX":"4405","PinmapY":"1214","IsCrowded":false,"Orderlist":28},{"StationId":162,"StationName":"ตลาดมีนบุรี | Min Buri Market","StationNameTH":"ตลาดมีนบุรี","StationNameEN":"Min Buri Market","StationKey":"PK29","StationLineId":5,"StationLineName":"สายสีชมพู | Pink Line","LineNameTH":"สายสีชมพู","LineNameEN":"Pink Line","StationLineColor":"#D76886","Latitude":13.81255,"Longitude":100.7257,"PinmapX":"4522","PinmapY":"1323","IsCrowded":false,"Orderlist":29},{"StationId":163,"StationName":"มีนบุรี | Min Buri","StationNameTH":"มีนบุรี","StationNameEN":"Min Buri","StationKey":"PK30","StationLineId":5,"StationLineName":"สายสีชมพู | Pink Line","LineNameTH":"สายสีชมพู","LineNameEN":"Pink Line","StationLineColor":"#D76886","Latitude":13.80842,"Longitude":100.7326,"PinmapX":"4629","PinmapY":"1435","IsCrowded":false,"Orderlist":30},{"StationId":164,"StationName":"อิมแพ็ค เมืองทองธานี | Impact Muang Thong Thani","StationNameTH":"อิมแพ็ค เมืองทองธานี","StationNameEN":"Impact Muang Thong Thani","StationKey":"MT01","StationLineId":5,"StationLineName":"สายสีชมพู | Pink Line","LineNameTH":"สายสีชมพู","LineNameEN":"Pink Line","StationLineColor":"#D76886","Latitude":13.94048,"Longitude":100.5413,"PinmapX":"1529","PinmapY":"584","IsCrowded":false,"Orderlist":31},{"StationId":165,"StationName":"ทะเลสาบเมืองทองธานี | Lake Muang Thong Thani","StationNameTH":"ทะเลสาบเมืองทองธานี","StationNameEN":"Lake Muang Thong Thani","StationKey":"MT02","StationLineId":5,"StationLineName":"สายสีชมพู | Pink Line","LineNameTH":"สายสีชมพู","LineNameEN":"Pink Line","StationLineColor":"#D76886","Latitude":13.92075,"Longitude":100.543,"PinmapX":"1531","PinmapY":"425","IsCrowded":false,"Orderlist":32}]}];

        async function fetchStationList() {
            // cache 24 ชม. หรือ fallback ในเครื่อง — เปิดแอปขึ้นทันที 0ms แล้วค่อย refresh เบื้องหลัง
            const cached = (() => {
                try {
                    const c = JSON.parse(localStorage.getItem(CACHE_KEY));
                    if (c && Date.now() - c.at < CACHE_TTL && Array.isArray(c.data)) return c.data;
                } catch (e) { }
                if (typeof FALLBACK_STATION_LIST !== 'undefined' && Array.isArray(FALLBACK_STATION_LIST)) {
                    return FALLBACK_STATION_LIST;
                }
                return null;
            })();
            if (cached) {
                refreshStationListInBackground();
                return cached;
            }
            try {
                const res = await postJSON(STATION_LIST_URL('en'), null, {}, 5000);
                if (res.status === 200 && res.data?.ErrMessage === 'Success' && Array.isArray(res.data.data)) {
                    localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data: res.data.data }));
                    return res.data.data;
                }
            } catch (e) {
                console.warn('Network station-list failed, using FALLBACK_STATION_LIST', e);
            }
            if (typeof FALLBACK_STATION_LIST !== 'undefined' && Array.isArray(FALLBACK_STATION_LIST)) {
                return FALLBACK_STATION_LIST;
            }
            throw new Error(T('loadStationsFail'));
        }

        async function refreshStationListInBackground() {
            try {
                const res = await postJSON(STATION_LIST_URL('en'), null, {}, 5000);
                if (res.status === 200 && res.data?.ErrMessage === 'Success') {
                    localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data: res.data.data }));
                    applyCrowdedUpdate(res.data.data);
                }
            } catch (e) { }
        }

        // IsCrowded เปลี่ยนตามเวลาจริง แต่รายชื่อสถานี cache 24 ชม. —
        // เมื่อ refresh เบื้องหลังได้ข้อมูลใหม่ ให้ merge สถานะแน่นเข้า state แล้ววาดใหม่
        function applyCrowdedUpdate(freshLines) {
            if (!Array.isArray(freshLines) || !App.lines?.length) return;
            const fresh = new Map();
            for (const l of freshLines)
                for (const s of (l.StationList || []))
                    fresh.set(`${l.LineId}|${s.StationKey}`, s.IsCrowded === true);
            let changed = false;
            for (const l of App.lines)
                for (const s of l.StationList) {
                    const v = fresh.get(`${l.LineId}|${s.StationKey}`);
                    if (v !== undefined && (s.IsCrowded === true) !== v) {
                        s.IsCrowded = v;
                        changed = true;
                    }
                }
            if (changed) {
                App.renderNearest();
                App.renderStrip();
            }
        }

        /* ================= GEO ================= */
        function haversineKm(lat1, lon1, lat2, lon2) {
            const R = 6371, d2r = Math.PI / 180;
            const dLat = (lat2 - lat1) * d2r, dLon = (lon2 - lon1) * d2r;
            const a = Math.sin(dLat / 2) ** 2 +
                Math.cos(lat1 * d2r) * Math.cos(lat2 * d2r) * Math.sin(dLon / 2) ** 2;
            return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        }

        function fmtDist(km) {
            if (km == null) return '';
            if (km <= 0.12) return T('atStation');
            return km < 1 ? Math.round(km * 1000) + T('mUnit') : km.toFixed(1) + T('kmUnit');
        }

        async function fetchIpLocation(timeoutMs = 2500) {
            if (typeof fetch !== 'function') throw new Error('fetch not available');
            const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
            const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
            try {
                const res = await fetch('https://ipwho.is/', {
                    signal: controller ? controller.signal : undefined,
                    cache: 'no-cache'
                });
                if (!res.ok) throw new Error('HTTP ' + res.status);
                const data = await res.json();
                if (data && data.success && data.latitude && data.longitude) {
                    return { lat: data.latitude, lon: data.longitude };
                }
                throw new Error('Invalid IP geo payload');
            } finally {
                if (timer) clearTimeout(timer);
            }
        }

        function isMrtLineId(id) {
            return id === MRT_LINE_IDS.BLUE || id === MRT_LINE_IDS.PURPLE || id === MRT_LINE_IDS.RED || id === MRT_LINE_IDS.ARL;
        }

        function isGoldLineId(id) {
            return Number(id) === GOLD_LINE_ID;
        }

        function isMrtStationKey(key) {
            return !!MRT_STATION_BY_KEY[key] || key.startsWith('RN') || key.startsWith('RW') || key.startsWith('A');
        }

        function usesStaticTimetable(station) {
            return !!station && (station.StaticJourney === true || isMrtStationKey(station.StationKey) || isGoldLineId(station.StationLineId));
        }

        const SRT_RED_STATION_INDEX = {
            'RW04': 0, 'RW03': 1, 'RW02': 2, 'RN01': 3,
            'RN02': 4, 'RN03': 5, 'RN04': 6, 'RN05': 7,
            'RN06': 8, 'RN07': 9, 'RN08': 10, 'RN09': 11,
            'RN10': 12
        };

        function srtRedFareExact(startKey, endKey) {
            const idx1 = SRT_RED_STATION_INDEX[startKey];
            const idx2 = SRT_RED_STATION_INDEX[endKey];
            if (idx1 == null || idx2 == null) return 0;
            const matrix = [
                [0, 12, 18, 29, 35, 38, 41, 42, 42, 42, 42, 42, 42],
                [12, 0, 12, 23, 29, 32, 35, 37, 39, 42, 42, 42, 42],
                [18, 12, 0, 12, 18, 22, 25, 26, 29, 33, 36, 39, 42],
                [29, 23, 12, 0, 12, 16, 19, 20, 23, 27, 30, 33, 42],
                [35, 29, 18, 12, 0, 12, 15, 17, 19, 23, 26, 29, 38],
                [38, 32, 22, 16, 12, 0, 12, 14, 16, 20, 23, 26, 35],
                [41, 35, 25, 19, 15, 12, 0, 12, 14, 19, 22, 25, 34],
                [42, 37, 26, 20, 17, 14, 12, 0, 12, 17, 20, 23, 32],
                [42, 39, 29, 23, 19, 16, 14, 12, 0, 12, 15, 18, 27],
                [42, 42, 33, 27, 23, 20, 19, 17, 12, 0, 12, 15, 24],
                [42, 42, 36, 30, 26, 23, 22, 20, 15, 12, 0, 12, 21],
                [42, 42, 39, 33, 29, 26, 25, 23, 18, 15, 12, 0, 12],
                [42, 42, 42, 42, 38, 35, 34, 32, 27, 24, 21, 12, 0]
            ];
            return matrix[idx1][idx2];
        }

        const ARL_STATION_INDEX = {
            'A8': 0, 'A7': 1, 'A6': 2, 'A5': 3,
            'A4': 4, 'A3': 5, 'A2': 6, 'A1': 7
        };

        function arlFareExact(startKey, endKey) {
            const idx1 = ARL_STATION_INDEX[startKey];
            const idx2 = ARL_STATION_INDEX[endKey];
            if (idx1 == null || idx2 == null) return 0;
            if (idx1 === idx2) return 0;
            const d = Math.abs(idx1 - idx2);
            return Math.min(45, 15 + (d - 1) * 5);
        }

        function allJourneyLines() {
            const appLines = (typeof App !== 'undefined' && App.lines && App.lines.length)
                ? App.lines
                : (typeof FALLBACK_STATION_LIST !== 'undefined' ? FALLBACK_STATION_LIST : []);
            return [...appLines, ...MRT_STATIC_DB.lines];
        }

        function journeyLineById(id) {
            return App.lineById[id] || MRT_LINE_BY_ID[id] || null;
        }

        function allJourneyStations() {
            const seen = new Set();
            return allJourneyLines().flatMap(l => l.StationList)
                .filter(s => !seen.has(s.StationKey) && seen.add(s.StationKey));
        }

        function journeyStationByKey(key) {
            return App.findStation(key) || MRT_STATION_BY_KEY[key] || null;
        }

        function mrtBlueFare(stops, at = Date.now()) {
            const table = at >= MRT_BLUE_FARE_CHANGE_AT ? MRT_BLUE_FARES_NEW : MRT_BLUE_FARES_OLD;
            return table[Math.min(Math.max(0, stops), table.length - 1)];
        }

        function mrtPurpleFare(stops) {
            return MRT_PURPLE_FARES[Math.min(Math.max(0, stops), MRT_PURPLE_FARES.length - 1)];
        }

        function firstLineEntry(key) {
            return (App.keyLines[key] || [])[0] || null;
        }

        const SRT_RED_TRAVEL_TIMES = {
            'RW04|RW03': 5, 'RW03|RW04': 5,
            'RW03|RW02': 7, 'RW02|RW03': 7,
            'RW02|RN01': 4, 'RN01|RW02': 4,
            'RN01|RN02': 3, 'RN02|RN01': 3,
            'RN02|RN03': 2, 'RN03|RN02': 2,
            'RN03|RN04': 2, 'RN04|RN03': 2,
            'RN04|RN05': 2, 'RN05|RN04': 2,
            'RN05|RN06': 3, 'RN06|RN05': 3,
            'RN06|RN07': 2, 'RN07|RN06': 2,
            'RN07|RN08': 2, 'RN08|RN07': 2,
            'RN08|RN09': 4, 'RN09|RN08': 4,
            'RN09|RN10': 3, 'RN10|RN09': 3
        };

        function buildJourneyGraph() {
            const nodes = new Map();
            const graph = new Map();
            const ensure = (st) => {
                if (!st || !st.StationKey) return;
                if (!nodes.has(st.StationKey)) nodes.set(st.StationKey, st);
                if (!graph.has(st.StationKey)) graph.set(st.StationKey, []);
            };
            const addEdge = (a, b, edge) => {
                if (!a || !b || a === b) return;
                if (!nodes.has(a) || !nodes.has(b)) return;
                graph.get(a).push({ to: b, ...edge });
                graph.get(b).push({ to: a, ...edge });
            };

            for (const line of allJourneyLines()) {
                for (const st of line.StationList) ensure(st);
                for (let i = 1; i < line.StationList.length; i++) {
                    const a = line.StationList[i - 1].StationKey;
                    const b = line.StationList[i].StationKey;
                    let w = isMrtLineId(line.LineId) ? 2.2 : 2;
                    if (line.LineId === MRT_LINE_IDS.RED) {
                        w = SRT_RED_TRAVEL_TIMES[`${a}|${b}`] || 2;
                    }
                    addEdge(a, b, {
                        type: 'rail',
                        lineId: line.LineId,
                        color: line.LineColor,
                        weight: w,
                    });
                }
            }

            for (const [a, b, minutes] of MRT_STATIC_DB.transfers) {
                addEdge(a, b, { type: 'transfer', lineId: null, color: '#94a3b8', weight: minutes || 5 });
            }
            return { nodes, graph };
        }

        function shortestJourneyPath(originKey, destKey, mode = 'time') {
            const { nodes, graph } = buildJourneyGraph();
            if (!nodes.has(originKey) || !nodes.has(destKey)) return null;
            const dist = new Map([...nodes.keys()].map(k => [k, Infinity]));
            const prev = new Map();
            const open = new Set(nodes.keys());
            dist.set(originKey, 0);
            while (open.size) {
                let cur = null, best = Infinity;
                for (const k of open) {
                    const d = dist.get(k);
                    if (d < best) { best = d; cur = k; }
                }
                if (!cur || cur === destKey) break;
                open.delete(cur);
                for (const e of graph.get(cur) || []) {
                    if (!open.has(e.to)) continue;
                    let weight = e.weight;
                    if (mode === 'fare' && e.type === 'transfer') {
                        const isTaoPoon = (cur === 'BL10' && e.to === 'PP16') || (cur === 'PP16' && e.to === 'BL10');
                        if (!isTaoPoon) {
                            // เพิ่ม Penalty 25 นาทีสำหรับเปลี่ยนระบบเพื่อจูงใจให้ Dijkstra หาเส้นทางเครือข่ายเดิม ซึ่งถูกกว่า
                            weight += 25;
                        }
                    }
                    const nd = dist.get(cur) + weight;
                    if (nd < dist.get(e.to)) {
                        dist.set(e.to, nd);
                        prev.set(e.to, { key: cur, edge: e });
                    }
                }
            }
            if (dist.get(destKey) === Infinity) return null;
            const keys = [destKey], edges = [];
            let cur = destKey;
            while (cur !== originKey) {
                const p = prev.get(cur);
                if (!p) return null;
                keys.unshift(p.key);
                edges.unshift(p.edge);
                cur = p.key;
            }
            // คืนเวลารวมที่แท้จริง โดยไม่รวม Penalty
            const realMinutes = edges.reduce((sum, e) => sum + e.weight, 0);
            return { keys, edges, nodes, minutes: realMinutes };
        }

        function lineForPathStep(path, i) {
            const prevEdge = path.edges[i - 1];
            const nextEdge = path.edges[i];
            const edge = (prevEdge && prevEdge.type === 'rail') ? prevEdge
                : (nextEdge && nextEdge.type === 'rail') ? nextEdge : null;
            return edge?.lineId || firstLineEntry(path.keys[i])?.lineId || null;
        }

        async function liveSegmentFare(startKey, endKey) {
            if (!startKey || !endKey || startKey === endKey) return 0;
            try {
                const data = await fetchJourney(startKey, endKey);
                const rm = data?.RoutesMap?.[0];
                const fare = Number(rm?.FareRate_Total);
                return Number.isFinite(fare) ? fare : 0;
            } catch (e) {
                return 0;
            }
        }

        async function calculatePathFare(path) {
            const fareRows = [];
            let totalFare = 0;
            let segment = null;

            const closeSegment = async () => {
                if (!segment || segment.stops <= 0) { segment = null; return; }
                let fare = 0, labelTh = '', labelEn = '';
                if (segment.kind === 'blue') {
                    fare = mrtBlueFare(segment.stops);
                    labelTh = `${I18N.th.jMrtBlueFare} (${segment.stops} สถานี)`;
                    labelEn = `${I18N.en.jMrtBlueFare} (${segment.stops} stations)`;
                } else if (segment.kind === 'purple') {
                    fare = mrtPurpleFare(segment.stops);
                    labelTh = `${I18N.th.jMrtPurpleFare} (${segment.stops} สถานี)`;
                    labelEn = `${I18N.en.jMrtPurpleFare} (${segment.stops} stations)`;
                } else if (segment.kind === 'red') {
                    fare = srtRedFareExact(segment.start, segment.end);
                    labelTh = `${I18N.th.jSrtRedFare} (${segment.stops} สถานี)`;
                    labelEn = `${I18N.en.jSrtRedFare} (${segment.stops} stations)`;
                } else if (segment.kind === 'arl') {
                    fare = arlFareExact(segment.start, segment.end);
                    labelTh = `${I18N.th.jArlFare} (${segment.stops} สถานี)`;
                    labelEn = `${I18N.en.jArlFare} (${segment.stops} stations)`;
                } else {
                    fare = await liveSegmentFare(segment.start, segment.end);
                    labelTh = I18N.th.jLiveFare;
                    labelEn = I18N.en.jLiveFare;
                }
                totalFare += fare;
                fareRows.push({
                    FareDetail: labelTh,
                    FareDetail_ENG: labelEn,
                    FarePrice: fare || '-'
                });
                segment = null;
            };

            for (let i = 0; i < path.edges.length; i++) {
                const e = path.edges[i];
                if (e.type === 'transfer') {
                    await closeSegment();
                    continue;
                }
                const kind = e.lineId === MRT_LINE_IDS.BLUE ? 'blue'
                    : e.lineId === MRT_LINE_IDS.PURPLE ? 'purple'
                        : e.lineId === MRT_LINE_IDS.RED ? 'red'
                            : e.lineId === MRT_LINE_IDS.ARL ? 'arl' : 'live';
                if (!segment || segment.kind !== kind) {
                    await closeSegment();
                    segment = { kind, start: path.keys[i], end: path.keys[i + 1], stops: 1 };
                } else {
                    segment.end = path.keys[i + 1];
                    segment.stops++;
                }
            }
            await closeSegment();

            return { totalFare, fareRows };
        }

        async function buildHybridJourney(originKey, destKey) {
            // 1. ค้นหาแบบเร็วที่สุด (time)
            const pathTime = shortestJourneyPath(originKey, destKey, 'time');
            if (!pathTime) throw new Error(T('jFail'));

            // 2. ค้นหาแบบถูกที่สุด (fare - โดยใส่ Penalty ตอนเปลี่ยนถ่ายสายต่างเครือข่าย)
            const pathFare = shortestJourneyPath(originKey, destKey, 'fare');

            // คำนวณค่าโดยสารของแต่ละเส้นทาง
            const detailTime = await calculatePathFare(pathTime);
            let detailFare = null;
            if (pathFare) {
                const isDifferent = pathTime.keys.join(',') !== pathFare.keys.join(',');
                if (isDifferent) {
                    detailFare = await calculatePathFare(pathFare);
                }
            }

            const routes = [];
            const buildRouteMapObject = (path, detail, labelTag) => {
                const steps = path.keys.map((key, i) => {
                    const st = path.nodes.get(key);
                    const mins = Math.round(path.edges.slice(0, i).reduce((sum, e) => sum + e.weight, 0));
                    return {
                        StationCode: key,
                        Title: `${st.StationNameTH || stName(st)}|${st.StationNameEN || stName(st)}`,
                        TimeRoute: i ? T('jMin', mins) : '',
                        LineId: lineForPathStep(path, i)
                    };
                });

                // นับจำนวนสถานีรถไฟฟ้าจริง (ไม่รวม transfer)
                const railCount = path.edges.filter(e => e.type === 'rail').length;

                // นับ interchanges (การเดินเปลี่ยนสาย + การเปลี่ยนสีสาย)
                let interchanges = path.edges.filter(e => e.type === 'transfer').length;
                let lastLine = null;
                for (let i = 0; i < path.edges.length; i++) {
                    const e = path.edges[i];
                    if (e.type === 'transfer') continue;
                    if (lastLine != null && lastLine !== e.lineId) interchanges++;
                    lastLine = e.lineId;
                }

                return {
                    RoutesJorney: steps,
                    TotalTime: Math.max(1, Math.round(path.minutes)),
                    TotalKm: '-',
                    Count_Station: railCount,
                    Count_InterChange: interchanges,
                    FareRate_Total: detail.totalFare || '-',
                    StaticMapSrc: YELLOW_MAP_SRC,
                    LabelTag: labelTag,
                    FareRateInfo: [{
                        FareRate_List: [
                            { FareDetail: I18N.th.jStaticFare, FareDetail_ENG: I18N.en.jStaticFare, FarePrice: detail.totalFare || '-' },
                            ...detail.fareRows
                        ]
                    }]
                };
            };

            routes.push(buildRouteMapObject(pathTime, detailTime, T('jRecommended')));

            // หากเส้นทางประหยัดที่สุดแตกต่าง และถูกกว่าแบบเร็วที่สุดจริง ให้แสดงเพิ่มเป็นทางเลือก
            if (detailFare && detailFare.totalFare < detailTime.totalFare) {
                routes.push(buildRouteMapObject(pathFare, detailFare, T('jCheapest')));
            }

            return {
                RoutesMap: routes
            };
        }

        
        /* ================= STATION EXITS DIRECTORY (THE SKYTRAINs) ================= */
        const STATION_EXITS_DB = {
            'CEN': [
                { exit: 1, facilities: ['skywalk', 'elevator'], landmarks_th: 'สยามเซ็นเตอร์ (ชั้น M), สยามดิสคัฟเวอรี, สยามพารากอน (ทางเชื่อม)', landmarks_en: 'Siam Center (M Floor), Siam Discovery, Siam Paragon Link' },
                { exit: 2, facilities: ['escalator'], landmarks_th: 'สยามสแควร์ ซอย 7, ลาน Centerpoint of Siam Square, ดิจิทัลเกตเวย์', landmarks_en: 'Siam Square Soi 7, Centerpoint of Siam Square' },
                { exit: 3, facilities: ['skywalk', 'elevator', 'escalator'], landmarks_th: 'สยามพารากอน (ทางเชื่อมชั้น M สู่ห้างโดยตรง), พารากอนฮอลล์', landmarks_en: 'Siam Paragon (Direct M Floor Link), Royal Paragon Hall' },
                { exit: 4, facilities: ['skywalk', 'escalator'], landmarks_th: 'สยามสแควร์วัน (ทางเชื่อมสกายวอล์ก), คณะเภสัชศาสตร์ จุฬาฯ', landmarks_en: 'Siam Square One (Direct Skywalk Link), Chulalongkorn University' },
                { exit: 5, facilities: ['skywalk'], landmarks_th: 'สกายวอล์กราชประสงค์ ไปยัง เซ็นทรัลเวิลด์, เกสรวิลเลจ, ศาลท้าวมหาพรหม', landmarks_en: 'Ratchaprasong Skywalk to CentralWorld, Gaysorn Village, Erawan Shrine' },
                { exit: 6, facilities: ['skywalk'], landmarks_th: 'สกายวอล์กแยกปทุมวัน ไปยัง เอ็มบีเค เซ็นเตอร์ (MBK), หอศิลปวัฒนธรรมฯ (BACC)', landmarks_en: 'Pathumwan Skywalk to MBK Center, BACC Art Centre' }
            ],
            'E4': [
                { exit: 1, facilities: ['skywalk', 'elevator'], landmarks_th: 'ซอยสุขุมวิท 19, เทอร์มินอล 21 (ทางเชื่อมชั้น M), โรบินสัน สุขุมวิท', landmarks_en: 'Soi Sukhumvit 19, Terminal 21 (M Floor), Robinson Sukhumvit' },
                { exit: 2, facilities: ['escalator'], landmarks_th: 'ซอยสุขุมวิท 12, โคเรียนทาวน์, โรงแรมเชอราตัน แกรนด์ สุขุมวิท', landmarks_en: 'Soi Sukhumvit 12, Korean Town, Sheraton Grande Sukhumvit' },
                { exit: 3, facilities: ['skywalk', 'elevator', 'escalator'], landmarks_th: 'เชื่อมต่อ MRT สุขุมวิท (สายสีน้ำเงิน BL22), อาคารอินเตอร์เชนจ์ 21', landmarks_en: 'Connecting to MRT Sukhumvit (BL22), Interchange 21 Tower' },
                { exit: 4, facilities: ['escalator'], landmarks_th: 'ซอยสุขุมวิท 14, ซอยสุขุมวิท 16, อาคารจัสมิน ซิตี้', landmarks_en: 'Soi Sukhumvit 14, Soi Sukhumvit 16, Jasmine City' },
                { exit: 5, facilities: ['skywalk'], landmarks_th: 'สกายวอล์กเชื่อมอาคารอินเตอร์เชนจ์ 21 และเทอร์มินอล 21', landmarks_en: 'Skywalk connecting Interchange 21 & Terminal 21' },
                { exit: 6, facilities: ['skywalk'], landmarks_th: 'สกายวอล์กเชื่อมอาคารไทมส์สแควร์ (Times Square)', landmarks_en: 'Skywalk connecting Times Square Building' }
            ],
            'N8': [
                { exit: 1, facilities: ['skywalk', 'elevator'], landmarks_th: 'สวนจตุจักร, ทางเชื่อม MRT สวนจตุจักร (BL13) ทางออก 1', landmarks_en: 'Chatuchak Park, Connecting to MRT Chatuchak Park (BL13) Exit 1' },
                { exit: 2, facilities: ['escalator'], landmarks_th: 'ลานจอดรถ บีทีเอส, ศูนย์ซ่อมบำรุง, ตลาดนัดจตุจักร', landmarks_en: 'BTS Parking lot, BTS Depot, Chatuchak Weekend Market' },
                { exit: 3, facilities: ['skywalk', 'elevator', 'escalator'], landmarks_th: 'ป้ายรถเมล์เชื่อมต่อสนามบินดอนเมือง (รถเมล์ A1, A2), MRT ทางออก 2', landmarks_en: 'Bus stop to Don Mueang Airport (A1/A2), MRT Exit 2' },
                { exit: 4, facilities: ['escalator'], landmarks_th: 'เจเจ มอลล์, กรมการขนส่งทางบก, ตลาดนัดจตุจักร ประตู 3', landmarks_en: 'JJ Mall, Department of Land Transport, Chatuchak Gate 3' }
            ],
            'N2': [
                { exit: 1, facilities: ['escalator'], landmarks_th: 'อาคารพญาไทพลาซ่า, ถนนพญาไท มุ่งหน้าอนุสาวรีย์ชัยฯ', landmarks_en: 'Phaya Thai Plaza, Phaya Thai Rd Northbound' },
                { exit: 2, facilities: ['elevator'], landmarks_th: 'ที่ทำการไปรษณีย์ราชเทวี, โรงพยาบาลพญาไท 1, รร.สันติราษฎร์วิทยาลัย', landmarks_en: 'Post Office, Phaya Thai 1 Hospital, Santirat School' },
                { exit: 3, facilities: ['escalator'], landmarks_th: 'อาคาร ซี.พี. ทาวเวอร์ 3 (พญาไท), ถนนศรีอยุธยา', landmarks_en: 'CP Tower 3, Sri Ayutthaya Road' },
                { exit: 4, facilities: ['escalator'], landmarks_th: 'สถานีตำรวจนครบาลพญาไท', landmarks_en: 'Phaya Thai Police Station' },
                { exit: 5, facilities: ['skywalk', 'elevator', 'escalator'], landmarks_th: 'เชื่อมต่อ แอร์พอร์ต เรล ลิงก์ พญาไท (A8) ทางเชื่อมสกายวอล์กโดยตรง', landmarks_en: 'Direct Skywalk Connection to Airport Rail Link Phaya Thai (A8)' }
            ],
            'S2': [
                { exit: 1, facilities: ['skywalk', 'elevator'], landmarks_th: 'สีลมคอมเพล็กซ์ (ทางเชื่อมชั้น 2 สู่ห้าง), ธนาคารกรุงเทพ สำนักงานใหญ่', landmarks_en: 'Silom Complex (Direct 2nd Fl Link), Bangkok Bank Head Office' },
                { exit: 2, facilities: ['escalator'], landmarks_th: 'ซอยพัฒน์พงศ์, อาคาร ซี.พี. ทาวเวอร์ (สีลม), สกายวอล์กสีลม', landmarks_en: 'Soi Patpong, CP Tower Silom, Silom Skywalk' },
                { exit: 3, facilities: ['skywalk', 'elevator'], landmarks_th: 'เชื่อมต่อ MRT สีลม (สายสีน้ำเงิน BL26), โรงพยาบาลจุฬาลงกรณ์, ถนนพระราม 4', landmarks_en: 'Connecting to MRT Si Lom (BL26), King Chulalongkorn Hospital, Rama IV Rd' },
                { exit: 4, facilities: ['escalator'], landmarks_th: 'อาคารธนิยะพลาซ่า (Thaniya Plaza), ซอยธนิยะ (ย่านญี่ปุ่น)', landmarks_en: 'Thaniya Plaza, Soi Thaniya (Japanese Quarter)' }
            ],
            'S7': [
                { exit: 1, facilities: ['escalator'], landmarks_th: 'ซอยกรุงธนบุรี 4, คอนโด Q House Sathon', landmarks_en: 'Krung Thon Buri Soi 4, Q House Sathon' },
                { exit: 2, facilities: ['elevator'], landmarks_th: 'อาคารสินสาธร ทาวเวอร์ (Sin Sathon Tower), ถนนกรุงธนบุรี มุ่งหน้าสะพานสาทร', landmarks_en: 'Sin Sathon Tower, Krung Thon Buri Rd' },
                { exit: 3, facilities: ['skywalk', 'elevator', 'escalator'], landmarks_th: 'เชื่อมต่อ รถไฟฟ้าสายสีทอง สถานีกรุงธนบุรี (G1) ทางเชื่อมสกายวอล์ก', landmarks_en: 'Direct Skywalk to BTS Gold Line Krung Thon Buri (G1)' },
                { exit: 4, facilities: ['escalator'], landmarks_th: 'ไอดีโอ สาทร-วงเวียนใหญ่, ป้ายรถประจำทาง', landmarks_en: 'IDEO Sathorn-Wongwian Yai, Bus Stop' }
            ],
            'G2': [
                { exit: 1, facilities: ['skywalk', 'elevator', 'escalator'], landmarks_th: 'ไอคอนสยาม (ICONSIAM - ทางเชื่อมสกายวอล์กเข้าห้าง), อาคาร ICS, รร.มิลเลนเนียม ฮิลตัน', landmarks_en: 'ICONSIAM (Direct Skywalk Link), ICS Building, Millennium Hilton Bangkok' },
                { exit: 2, facilities: ['elevator'], landmarks_th: 'ถนนเจริญนคร, สำนักงานเขตคลองสาน, โรงพยาบาลตากสิน', landmarks_en: 'Charoen Nakhon Rd, Khlong San District Office, Taksin Hospital' },
                { exit: 3, facilities: ['skywalk'], landmarks_th: 'ท่าเรือไอคอนสยาม (ท่าเรือข้ามฟากแม่น้ำเจ้าพระยา & เรือด่วนเจ้าพระยา)', landmarks_en: 'ICONSIAM Pier (Chao Phraya Express & Shuttle Boats)' }
            ],
            'YL01': [
                { exit: 1, facilities: ['skywalk', 'elevator'], landmarks_th: 'เชื่อมต่อ MRT สายสีน้ำเงิน สถานีลาดพร้าว (BL15), อาคารจอดแล้วจร (Park & Ride 9 ชั้น)', landmarks_en: 'Connecting to MRT Blue Line Lat Phrao (BL15), 9-Storey Park & Ride Building' },
                { exit: 2, facilities: ['escalator'], landmarks_th: 'ซอยลาดพร้าว 23, ซอยลาดพร้าว 25', landmarks_en: 'Soi Lat Phrao 23, Soi Lat Phrao 25' },
                { exit: 3, facilities: ['escalator'], landmarks_th: 'ซอยลาดพร้าว 26, ซอยลาดพร้าว 28', landmarks_en: 'Soi Lat Phrao 26, Soi Lat Phrao 28' },
                { exit: 4, facilities: ['elevator'], landmarks_th: 'ถนนรัชดาภิเษก, ศาลอาญา, ศาลแพ่ง, กรมส่งเสริมการค้าระหว่างประเทศ', landmarks_en: 'Ratchadaphisek Rd, Criminal Court, Civil Court' }
            ],
            'YL20': [
                { exit: 1, facilities: ['escalator'], landmarks_th: 'ซอยด่านสำโรง (สุขุมวิท 113), บิ๊กซี ศรีนครินทร์ (Big C)', landmarks_en: 'Soi Dan Samrong (Sukhumvit 113), Big C Srinagarindra' },
                { exit: 2, facilities: ['elevator'], landmarks_th: 'แม็คโคร ศรีนครินทร์ (Makro), แจส เออเบิร์น ศรีนครินทร์ (JAS Urban Srinakarin)', landmarks_en: 'Makro Srinagarindra, Jas Urban Srinakarin Shopping Mall' },
                { exit: 3, facilities: ['escalator'], landmarks_th: 'ถนนศรีนครินทร์ ฝั่งขาเข้า มุ่งหน้าถนนบางนา-ตราด / เทพารักษ์', landmarks_en: 'Srinagarindra Road (Inbound to Bang Na)' },
                { exit: 4, facilities: ['elevator'], landmarks_th: 'ถนนศรีนครินทร์ ฝั่งขาออก ซอยศรีด่าน 16, โชว์รูมรถยนต์', landmarks_en: 'Srinagarindra Road (Outbound), Soi Si Dan 16' }
            ],
            'YL23': [
                { exit: 1, facilities: ['skywalk', 'elevator', 'escalator'], landmarks_th: 'เชื่อมต่อ รถไฟฟ้าบีทีเอส สายสุขุมวิท สถานีสำโรง (E23) ทางเชื่อมสกายวอล์กโดยตรง', landmarks_en: 'Direct Skywalk Link to BTS Sukhumvit Line Samrong (E23)' },
                { exit: 2, facilities: ['escalator'], landmarks_th: 'ตลาดสำโรง, ตลาดเอี่ยมเจริญ, ถนนเทพารักษ์ ขาออก', landmarks_en: 'Samrong Market, Theparak Road Outbound' },
                { exit: 3, facilities: ['skywalk', 'elevator'], landmarks_th: 'อิมพีเรียล เวิลด์ สำโรง (ทางเชื่อมสกายวอล์กเข้าห้าง), รพ.สำโรงการแพทย์', landmarks_en: 'Imperial World Samrong (Direct Skywalk Link), Samrong General Hospital' },
                { exit: 4, facilities: ['elevator'], landmarks_th: 'ถนนสุขุมวิท มุ่งหน้าปากน้ำ / สมุทรปราการ', landmarks_en: 'Sukhumvit Road Southbound to Pak Nam' }
            ],
            'PK01': [
                { exit: 1, facilities: ['skywalk', 'elevator', 'escalator'], landmarks_th: 'เชื่อมต่อ MRT รถไฟฟ้าสายสีม่วง สถานีศูนย์ราชการนนทบุรี (PP11) สกายวอล์กโดยตรง', landmarks_en: 'Direct Skywalk Link to MRT Purple Line Nonthaburi Civic Center (PP11)' },
                { exit: 2, facilities: ['elevator'], landmarks_th: 'ศูนย์ราชการจังหวัดนนทบุรี, อุทยานมกุฏรมยสราญ, สภ.เมืองนนทบุรี', landmarks_en: 'Nonthaburi Civic Center, City Hall, Makut Rommayasaran Park' },
                { exit: 3, facilities: ['escalator'], landmarks_th: 'ถนนรัตนาธิเบศร์ ฝั่งขาเข้า มุ่งหน้าแคราย / แยกพงษ์เพชร', landmarks_en: 'Rattanathibet Road Inbound to Khae Rai' },
                { exit: 4, facilities: ['skywalk'], landmarks_th: 'เอสพลานาด ซีนีเพล็กซ์ งามวงศ์วาน-แคราย, โลตัส รัตนาธิเบศร์', landmarks_en: 'Esplanade Cineplex Ngamwongwan-Khae Rai, Lotus\'s Rattanathibet' }
            ],
            'BL11': [
                { exit: 1, facilities: ['skywalk', 'elevator', 'escalator'], landmarks_th: 'เชื่อมต่อ สถานีกลางกรุงเทพอภิวัฒน์ (รถไฟชานเมืองสายสีแดง & รถไฟทางไกล)', landmarks_en: 'Connecting to Krung Thep Aphiwat Central Terminal (SRT Red Line & Intercity)' },
                { exit: 2, facilities: ['elevator'], landmarks_th: 'สำนักงานใหญ่ปูนซิเมนต์ไทย (SCG สำนักงานใหญ่), ถนนเทอดดำริ', landmarks_en: 'SCG Head Office (Cementhai), Thoed Damri Road' },
                { exit: 3, facilities: ['escalator'], landmarks_th: 'สถานีรถไฟชุมทางบางซื่อ (อาคารสถานีเดิม)', landmarks_en: 'Old Bang Sue Junction Railway Station' }
            ],
            'A1': [
                { exit: 1, facilities: ['elevator', 'escalator', 'skywalk'], landmarks_th: 'อาคารผู้โดยสารท่าอากาศยานสุวรรณภูมิ (ชั้น B เชื่อมตรงเข้าสู่เทอร์มินอล)', landmarks_en: 'Suvarnabhumi Airport Terminal (Level B direct terminal entrance)' },
                { exit: 2, facilities: ['elevator', 'skywalk'], landmarks_th: 'โรงแรมโนโวเทล สุวรรณภูมิ แอร์พอร์ต (ทางเดินใต้ดินเชื่อมโรงแรม)', landmarks_en: 'Novotel Suvarnabhumi Airport Hotel (Direct underground walkway)' }
            ]
        };

        
        /* คำนวณพิกัดทางออกของสถานีเพื่อคำนวณระยะห่างแบบเรียลไทม์ */
        function getExitCoordinates(station, exNum, totalExits = 4) {
            const lat = station.Latitude;
            const lon = station.Longitude;
            if (!lat || !lon) return null;

            const isOdd = (exNum % 2 !== 0);
            const endPosition = Math.ceil(exNum / 2);
            const alongOffsetMeters = (endPosition === 1 ? -45 : endPosition === 2 ? 45 : (endPosition - 2) * 60 + 45);
            const acrossOffsetMeters = isOdd ? 25 : -25;

            const dLat = (acrossOffsetMeters / 111111) + (alongOffsetMeters * 0.4 / 111111);
            const dLon = (alongOffsetMeters * 0.9 / 108000) - (acrossOffsetMeters * 0.3 / 108000);

            return { lat: lat + dLat, lon: lon + dLon };
        }

        function getStationExits(station) {
            if (!station) return [];
            if (STATION_EXITS_DB[station.StationKey]) {
                return STATION_EXITS_DB[station.StationKey];
            }
            const nameTh = station.StationName_TH || station.StationName_th || station.StationName_EN || '';
            const nameEn = station.StationName_EN || station.StationName_en || '';
            return [
                {
                    exit: 1,
                    facilities: ['elevator', 'escalator'],
                    landmarks_th: `ถนนฝั่งเลขคี่ ขาเข้าเมือง, ป้ายหยุดรถโดยสารประจำทาง ${nameTh}, วินมอเตอร์ไซค์รับจ้าง`,
                    landmarks_en: `Odd soi side, Inbound Avenue, Local Bus stop, Motorbike Taxi`
                },
                {
                    exit: 2,
                    facilities: ['escalator'],
                    landmarks_th: `ถนนฝั่งเลขคู่ ขาออกเมือง, ย่านชุมชนและอาคารพาณิชย์ ${nameTh}, ร้านค้าสะดวกซื้อ`,
                    landmarks_en: `Even soi side, Outbound Avenue, Local Community & Commercial Area`
                },
                {
                    exit: 3,
                    facilities: ['skywalk'],
                    landmarks_th: `สะพานลอยคนข้าม (Skywalk), ทางเชื่อมข้ามแยก, อาคารที่พักอาศัย`,
                    landmarks_en: `Pedestrian Overpass / Skywalk, Residential Area`
                },
                {
                    exit: 4,
                    facilities: ['elevator'],
                    landmarks_th: `จุดจอดรับ-ส่ง รถแท็กซี่สาธารณะ, ลิฟต์คนพิการและผู้สูงอายุ`,
                    landmarks_en: `Taxi Stand, Priority Elevator for Accessibility`
                }
            ];
        }

        /* ================= TRANSIT LINES CATALOG & DETAILED TABLES ================= */
        const TRANSIT_LINES_CATALOG = [
            {
                id: 0,
                nameTH: 'ทั้งหมด',
                nameEN: 'All Lines',
                color: '#64748B',
                operatorTH: 'โครงข่ายรถไฟฟ้า 10 สาย กทม. และปริมณฑล',
                operatorEN: '10 Transit Lines Network in Bangkok',
                terminusTH: 'ทุกเส้นทางครอบคลุมทั้งระบบ',
                terminusEN: 'Comprehensive Network Coverage',
                minFare: 12,
                maxFare: 62,
                pricingModelTH: 'ขึ้นกับแต่ละสาย (ตามระยะทาง / นโยบาย 20 บาท)',
                pricingModelEN: 'Line-dependent (Distance / 20 Baht Flat Cap)',
                ticketsTH: 'EMV Contactless, Rabbit, Token, Smart Pass',
                ticketsEN: 'EMV Contactless, Rabbit, Token, Smart Pass',
                firstTrainTH: '05:00 - 06:00 น.',
                firstTrainEN: '05:00 - 06:00',
                lastTrainTH: '23:30 - 00:30 น.',
                lastTrainEN: '23:30 - 00:30',
                peakFreqTH: '2.30 - 5.00 นาที',
                peakFreqEN: '2.30 - 5.00 min',
                offPeakFreqTH: '5.00 - 15.00 นาที',
                offPeakFreqEN: '5.00 - 15.00 min'
            },
            {
                id: 1,
                nameTH: 'BTS สายสุขุมวิท',
                nameEN: 'BTS Sukhumvit Line',
                color: '#7AB420',
                operatorTH: 'BTSC (ระบบรถไฟฟ้าบีทีเอส)',
                operatorEN: 'BTSC (Bangkok Mass Transit System)',
                terminusTH: 'คูคต ↔ เคหะฯ (47 สถานี)',
                terminusEN: 'Khu Khot ↔ Kheha (47 Stations)',
                minFare: 17,
                maxFare: 62,
                pricingModelTH: 'ตามจำนวนสถานี (สัมปทานหลัก ฿17-฿47 + ส่วนต่อขยาย +฿15)',
                pricingModelEN: 'By stations (Core ฿17-฿47 + Extensions +฿15)',
                ticketsTH: 'บัตร Rabbit, บัตรเที่ยวเดียว, One-Day Pass (฿150)',
                ticketsEN: 'Rabbit Card, Single Journey Ticket, One-Day Pass (฿150)',
                firstTrainTH: '05:15 - 05:30 น.',
                firstTrainEN: '05:15 - 05:30',
                lastTrainTH: '24:00 - 00:30 น.',
                lastTrainEN: '24:00 - 00:30',
                peakFreqTH: '2.30 - 3.50 นาที',
                peakFreqEN: '2.30 - 3.50 min',
                offPeakFreqTH: '5.00 - 8.00 นาที',
                offPeakFreqEN: '5.00 - 8.00 min',
                dir1: { toTH: 'คูคต (Khu Khot)', toEN: 'Khu Khot', first: '05:15', last: '23:30' },
                dir2: { toTH: 'เคหะฯ (Kheha)', toEN: 'Kheha', first: '05:15', last: '23:30' }
            },
            {
                id: 2,
                nameTH: 'BTS สายสีลม',
                nameEN: 'BTS Silom Line',
                color: '#00807D',
                operatorTH: 'BTSC (ระบบรถไฟฟ้าบีทีเอส)',
                operatorEN: 'BTSC (Bangkok Mass Transit System)',
                terminusTH: 'สนามกีฬาแห่งชาติ ↔ บางหว้า (14 สถานี)',
                terminusEN: 'National Stadium ↔ Bang Wa (14 Stations)',
                minFare: 17,
                maxFare: 62,
                pricingModelTH: 'ตามจำนวนสถานี (สัมปทานหลัก ฿17-฿47 + ส่วนต่อขยาย +฿15)',
                pricingModelEN: 'By stations (Core ฿17-฿47 + Extensions +฿15)',
                ticketsTH: 'บัตร Rabbit, บัตรเที่ยวเดียว, One-Day Pass (฿150)',
                ticketsEN: 'Rabbit Card, Single Journey Ticket, One-Day Pass (฿150)',
                firstTrainTH: '05:30 น.',
                firstTrainEN: '05:30',
                lastTrainTH: '24:00 น.',
                lastTrainEN: '24:00',
                peakFreqTH: '3.45 นาที',
                peakFreqEN: '3.45 min',
                offPeakFreqTH: '6.00 - 8.00 นาที',
                offPeakFreqEN: '6.00 - 8.00 min',
                dir1: { toTH: 'สนามกีฬาแห่งชาติ (National Stadium)', toEN: 'National Stadium', first: '05:30', last: '24:00' },
                dir2: { toTH: 'บางหว้า (Bang Wa)', toEN: 'Bang Wa', first: '05:30', last: '24:00' }
            },
            {
                id: 3,
                nameTH: 'สายสีทอง',
                nameEN: 'Gold Line (APM)',
                color: '#C9A038',
                operatorTH: 'กรุงเทพธนาคม (KT) / BTSC',
                operatorEN: 'Krungthep Thanakom / BTSC',
                terminusTH: 'กรุงธนบุรี ↔ คลองสาน (3 สถานี)',
                terminusEN: 'Krung Thon Buri ↔ Khlong San (3 Stations)',
                minFare: 16,
                maxFare: 16,
                pricingModelTH: 'ราคาเดียว 16 บาท ตลอดสาย (Flat Rate ฿16)',
                pricingModelEN: 'Flat Rate ฿16 regardless of distance',
                ticketsTH: 'บัตร Rabbit, บัตรโดยสารเที่ยวเดียว',
                ticketsEN: 'Rabbit Card, Single Journey Ticket',
                firstTrainTH: '06:00 น.',
                firstTrainEN: '06:00',
                lastTrainTH: '24:00 น.',
                lastTrainEN: '24:00',
                peakFreqTH: '8.00 นาที',
                peakFreqEN: '8.00 min',
                offPeakFreqTH: '10.00 - 15.00 นาที',
                offPeakFreqEN: '10.00 - 15.00 min',
                dir1: { toTH: 'กรุงธนบุรี (Krung Thon Buri)', toEN: 'Krung Thon Buri', first: '06:00', last: '24:00' },
                dir2: { toTH: 'คลองสาน (Khlong San)', toEN: 'Khlong San', first: '06:00', last: '24:00' }
            },
            {
                id: 4,
                nameTH: 'MRT สายสีเหลือง',
                nameEN: 'MRT Yellow Line',
                color: '#FFD100',
                operatorTH: 'EBM (Eastern Bangkok Monorail)',
                operatorEN: 'EBM (Eastern Bangkok Monorail)',
                terminusTH: 'ลาดพร้าว ↔ สำโรง (23 สถานี)',
                terminusEN: 'Lat Phrao ↔ Samrong (23 Stations)',
                minFare: 15,
                maxFare: 45,
                pricingModelTH: 'คำนวณตามระยะทาง (฿15 - ฿45)',
                pricingModelEN: 'Distance-based tariff (฿15 - ฿45)',
                ticketsTH: 'บัตร Rabbit, บัตร EMV Contactless, บัตรเที่ยวเดียว',
                ticketsEN: 'Rabbit Card, EMV Contactless, Single Journey Ticket',
                firstTrainTH: '06:00 น.',
                firstTrainEN: '06:00',
                lastTrainTH: '24:00 น.',
                lastTrainEN: '24:00',
                peakFreqTH: '5.00 นาที',
                peakFreqEN: '5.00 min',
                offPeakFreqTH: '10.00 นาที',
                offPeakFreqEN: '10.00 min',
                dir1: { toTH: 'ลาดพร้าว (Lat Phrao)', toEN: 'Lat Phrao', first: '06:00', last: '24:00' },
                dir2: { toTH: 'สำโรง (Samrong)', toEN: 'Samrong', first: '06:00', last: '24:00' }
            },
            {
                id: 5,
                nameTH: 'MRT สายสีชมพู',
                nameEN: 'MRT Pink Line',
                color: '#EC4899',
                operatorTH: 'NBM (Northern Bangkok Monorail)',
                operatorEN: 'NBM (Northern Bangkok Monorail)',
                terminusTH: 'ศูนย์ราชการนนทบุรี ↔ มีนบุรี (30 สถานี)',
                terminusEN: 'Nonthaburi Civic Center ↔ Min Buri (30 Stations)',
                minFare: 15,
                maxFare: 45,
                pricingModelTH: 'คำนวณตามระยะทาง (฿15 - ฿45)',
                pricingModelEN: 'Distance-based tariff (฿15 - ฿45)',
                ticketsTH: 'บัตร Rabbit, บัตร EMV Contactless, บัตรเที่ยวเดียว',
                ticketsEN: 'Rabbit Card, EMV Contactless, Single Journey Ticket',
                firstTrainTH: '06:00 น.',
                firstTrainEN: '06:00',
                lastTrainTH: '24:00 น.',
                lastTrainEN: '24:00',
                peakFreqTH: '5.00 นาที',
                peakFreqEN: '5.00 min',
                offPeakFreqTH: '10.00 นาที',
                offPeakFreqEN: '10.00 min',
                dir1: { toTH: 'ศูนย์ราชการนนทบุรี (Nonthaburi Civic Center)', toEN: 'Nonthaburi Civic Center', first: '06:00', last: '24:00' },
                dir2: { toTH: 'มีนบุรี (Min Buri)', toEN: 'Min Buri', first: '06:00', last: '24:00' }
            },
            {
                id: 101,
                nameTH: 'MRT สายสีน้ำเงิน',
                nameEN: 'MRT Blue Line',
                color: '#0284C7',
                operatorTH: 'BEM (Bangkok Expressway and Metro) / รฟม.',
                operatorEN: 'BEM / MRTA (Mass Rapid Transit Authority)',
                terminusTH: 'ท่าพระ ↔ หลักสอง (สายวงกลม, 38 สถานี)',
                terminusEN: 'Tha Phra ↔ Lak Song (Loop Line, 38 Stations)',
                minFare: 17,
                maxFare: 43,
                pricingModelTH: 'คำนวณตามจำนวนสถานี (฿17 - ฿43)',
                pricingModelEN: 'Calculated by stations (฿17 - ฿43)',
                ticketsTH: 'เหรียญโดยสาร (Token), บัตร MRT, บัตร EMV Contactless',
                ticketsEN: 'Single Journey Token, MRT Card, EMV Contactless',
                firstTrainTH: '06:00 น. (วันหยุด 06:00 น.)',
                firstTrainEN: '06:00 (Holidays 06:00)',
                lastTrainTH: '23:30 - 24:00 น.',
                lastTrainEN: '23:30 - 24:00',
                peakFreqTH: '3.30 - 4.00 นาที',
                peakFreqEN: '3.30 - 4.00 min',
                offPeakFreqTH: '5.00 - 8.00 นาที',
                offPeakFreqEN: '5.00 - 8.00 min',
                dir1: { toTH: 'ท่าพระ (ผ่านบางซื่อ)', toEN: 'Tha Phra (via Bang Sue)', first: '05:30', last: '23:30' },
                dir2: { toTH: 'หลักสอง (ผ่านหัวลำโพง)', toEN: 'Lak Song (via Hua Lamphong)', first: '05:30', last: '23:30' }
            },
            {
                id: 102,
                nameTH: 'MRT สายสีม่วง',
                nameEN: 'MRT Purple Line',
                color: '#8A2C9B',
                operatorTH: 'BEM / รฟม.',
                operatorEN: 'BEM / MRTA',
                terminusTH: 'คลองบางไผ่ ↔ เตาปูน (16 สถานี)',
                terminusEN: 'Khlong Bang Phai ↔ Tao Poon (16 Stations)',
                minFare: 14,
                maxFare: 20,
                pricingModelTH: '🌟 นโยบาย 20 บาทตลอดสาย (สูงสุดไม่เกิน ฿20)',
                pricingModelEN: '🌟 Flat 20 Baht Policy (Capped at ฿20 max)',
                ticketsTH: 'เหรียญโดยสาร (Token), บัตร MRT Plus, บัตร EMV Contactless',
                ticketsEN: 'Single Journey Token, MRT Plus Card, EMV Contactless',
                firstTrainTH: '05:30 น. (วันหยุด 06:00 น.)',
                firstTrainEN: '05:30 (Holidays 06:00)',
                lastTrainTH: '23:30 - 24:00 น.',
                lastTrainEN: '23:30 - 24:00',
                peakFreqTH: '4.30 - 6.00 นาที',
                peakFreqEN: '4.30 - 6.00 min',
                offPeakFreqTH: '7.00 - 9.00 นาที',
                offPeakFreqEN: '7.00 - 9.00 min',
                dir1: { toTH: 'เตาปูน (Tao Poon)', toEN: 'Tao Poon', first: '05:30', last: '23:25' },
                dir2: { toTH: 'คลองบางไผ่ (Khlong Bang Phai)', toEN: 'Khlong Bang Phai', first: '06:00', last: '23:55' }
            },
            {
                id: 103,
                nameTH: 'SRT สายสีแดง',
                nameEN: 'SRT Red Line',
                color: '#DC2626',
                operatorTH: 'SRTET (รถไฟฟ้า ร.ฟ.ท.)',
                operatorEN: 'SRTET (State Railway of Thailand Electrified Train)',
                terminusTH: 'กรุงเทพอภิวัฒน์ ↔ รังสิต / ตลิ่งชัน (14 สถานี)',
                terminusEN: 'Krung Thep Aphiwat ↔ Rangsit / Taling Chan (14 Stations)',
                minFare: 12,
                maxFare: 20,
                pricingModelTH: '🌟 นโยบาย 20 บาทตลอดสาย (สูงสุดไม่เกิน ฿20)',
                pricingModelEN: '🌟 Flat 20 Baht Policy (Capped at ฿20 max)',
                ticketsTH: 'เหรียญโดยสาร (Token), บัตร SRTET, บัตร EMV Contactless',
                ticketsEN: 'Single Journey Token, SRTET Card, EMV Contactless',
                firstTrainTH: '05:00 น.',
                firstTrainEN: '05:00',
                lastTrainTH: '24:00 น.',
                lastTrainEN: '24:00',
                peakFreqTH: '10.00 นาที (สายเหนือ) / 20.00 นาที (สายตะวันตก)',
                peakFreqEN: '10.00 min (North) / 20.00 min (West)',
                offPeakFreqTH: '20.00 นาที (สายเหนือ) / 30.00 นาที (สายตะวันตก)',
                offPeakFreqEN: '20.00 min (North) / 30.00 min (West)',
                dir1: { toTH: 'รังสิต (สายเหนือ)', toEN: 'Rangsit (North Line)', first: '05:00', last: '24:00' },
                dir2: { toTH: 'ตลิ่งชัน (สายตะวันตก)', toEN: 'Taling Chan (West Line)', first: '05:00', last: '24:00' }
            },
            {
                id: 104,
                nameTH: 'แอร์พอร์ต ลิงก์',
                nameEN: 'Airport Rail Link (ARL)',
                color: '#8A1538',
                operatorTH: 'รถไฟฟ้า ร.ฟ.ท. (เอเชีย เอรา วัน)',
                operatorEN: 'SRT Electrified Train (Asia Era One)',
                terminusTH: 'พญาไท ↔ สุวรรณภูมิ (8 สถานี)',
                terminusEN: 'Phaya Thai ↔ Suvarnabhumi (8 Stations)',
                minFare: 15,
                maxFare: 45,
                pricingModelTH: 'คำนวณตามระยะทาง (฿15 - ฿45)',
                pricingModelEN: 'Distance-based tariff (฿15 - ฿45)',
                ticketsTH: 'เหรียญโดยสาร (Smart Token), บัตร Smart Pass ARL',
                ticketsEN: 'Smart Token, ARL Smart Pass Card',
                firstTrainTH: '05:30 น.',
                firstTrainEN: '05:30',
                lastTrainTH: '24:00 น.',
                lastTrainEN: '24:00',
                peakFreqTH: '9.00 นาที',
                peakFreqEN: '9.00 min',
                offPeakFreqTH: '10.00 - 15.00 นาที',
                offPeakFreqEN: '10.00 - 15.00 min',
                dir1: { toTH: 'สุวรรณภูมิ (Suvarnabhumi Airport)', toEN: 'Suvarnabhumi Airport', first: '05:30', last: '24:00' },
                dir2: { toTH: 'พญาไท (Phaya Thai)', toEN: 'Phaya Thai', first: '05:30', last: '24:00' }
            }
        ];

        const BTS_STATION_FARES = [
            { stnTH: '1 สถานี', stnEN: '1 Station', adult: 17, student: 12, senior: 9 },
            { stnTH: '2 สถานี', stnEN: '2 Stations', adult: 25, student: 18, senior: 13 },
            { stnTH: '3 สถานี', stnEN: '3 Stations', adult: 28, student: 20, senior: 14 },
            { stnTH: '4 สถานี', stnEN: '4 Stations', adult: 32, student: 23, senior: 16 },
            { stnTH: '5 สถานี', stnEN: '5 Stations', adult: 35, student: 25, senior: 18 },
            { stnTH: '6 สถานี', stnEN: '6 Stations', adult: 40, student: 28, senior: 20 },
            { stnTH: '7 สถานี', stnEN: '7 Stations', adult: 43, student: 30, senior: 22 },
            { stnTH: '8 สถานีขึ้นไป', stnEN: '8+ Stations', adult: 47, student: 33, senior: 24 },
            { stnTH: 'ส่วนต่อขยาย (Extensions)', stnEN: 'Extensions', adult: '+15', student: '+15', senior: '+8' }
        ];

        const MRT_BLUE_FARES = [
            { stnTH: '1 สถานี', stnEN: '1 Station', adult: 17, student: 15, senior: 9 },
            { stnTH: '2 - 3 สถานี', stnEN: '2 - 3 Stations', adult: '20 - 23', student: '18 - 21', senior: '10 - 12' },
            { stnTH: '4 - 6 สถานี', stnEN: '4 - 6 Stations', adult: '26 - 31', student: '23 - 28', senior: '13 - 16' },
            { stnTH: '7 - 9 สถานี', stnEN: '7 - 9 Stations', adult: '33 - 38', student: '30 - 34', senior: '17 - 19' },
            { stnTH: '10 - 12 สถานีขึ้นไป', stnEN: '10 - 12+ Stations', adult: '41 - 43', student: '37 - 39', senior: '21 - 22' }
        ];

        const MONORAIL_FARES = [
            { stnTH: '1 สถานี', stnEN: '1 Station', price: '฿15 - ฿18' },
            { stnTH: '2 - 4 สถานี', stnEN: '2 - 4 Stations', price: '฿21 - ฿28' },
            { stnTH: '5 - 8 สถานี', stnEN: '5 - 8 Stations', price: '฿31 - ฿37' },
            { stnTH: '9 สถานีขึ้นไป', stnEN: '9+ Stations', price: '฿40 - ฿45' }
        ];

        const ARL_STATION_FARES = [
            { code: 'A8', th: 'พญาไท', en: 'Phaya Thai', price: '-' },
            { code: 'A7', th: 'ราชปรารภ', en: 'Ratchaprarop', price: '฿15' },
            { code: 'A6', th: 'มักกะสัน (เชื่อม MRT เพชรบุรี)', en: 'Makkasan (MRT Phetchaburi)', price: '฿20' },
            { code: 'A5', th: 'รามคำแหง', en: 'Ramkhamhaeng', price: '฿25' },
            { code: 'A4', th: 'หัวหมาก (เชื่อม MRT สีเหลือง)', en: 'Hua Mak (MRT Yellow)', price: '฿30' },
            { code: 'A3', th: 'บ้านทับช้าง', en: 'Ban Thap Chang', price: '฿35' },
            { code: 'A2', th: 'ลาดกระบัง', en: 'Lat Krabang', price: '฿40' },
            { code: 'A1', th: 'สุวรรณภูมิ (สนามบิน)', en: 'Suvarnabhumi Airport', price: '฿45' }
        ];

        function renderLineFilterBar(activeLineId, onClickHandlerName) {
            return `<div class="line-filter-bar">
                ${TRANSIT_LINES_CATALOG.map(l => {
                    const isActive = l.id === activeLineId;
                    const name = lang === 'en' ? l.nameEN : l.nameTH;
                    const activeStyle = isActive
                        ? `background:${l.color};color:#ffffff;border-color:${l.color};font-weight:700;box-shadow:0 3px 10px ${l.color}55;`
                        : '';
                    return `<button type="button" class="line-filter-pill ${isActive ? 'active' : ''}"
                        style="${activeStyle}"
                        onclick="App.${onClickHandlerName}(${l.id})">
                        ${getLineIconSvg(l.id, isActive, 15)}
                        <span>${esc(name)}</span>
                    </button>`;
                }).join('')}
            </div>`;
        }

        function getLineScheduleTables(lineId) {
            const we = isWeekend();
            if (lineId === 1 || lineId === 2) {
                const data = getBtsFreqData(lineId);
                if (!data) return null;
                return {
                    weekday: buildBtsFreqRows(data.weekday, !we),
                    weekend: buildBtsFreqRows(data.weekend, we),
                    note: lineId === 1 ? (lang === 'en' ? '* Mo Chit–Samrong · ** Samrong–Kheha and Mo Chit–Khu Khot' : '* หมอชิต–สำโรง · ** สำโรง–เคหะฯ และ หมอชิต–คูคต') : ''
                };
            }
            const t = getMrtFreqTable(lineId);
            if (!t) return null;
            let note = '';
            if (lineId === 103) {
                note = lang === 'en' ? '* North line (Rangsit) 10-20 min · West line (Taling Chan) 20-30 min' : '* สายธานีรัถยา (รังสิต) ทุก 10-20 นาที · สายนครวิถี (ตลิ่งชัน) ทุก 20-30 นาที';
            } else if (lineId === 101) {
                note = lang === 'en' ? '* Inner Circle (Bang Sue ↔ Tha Phra) / Outer Loop' : '* ช่วง 07:00–09:00 ช่วงบางซื่อ–ท่าพระ–หลักสอง ความถี่ตามตารางทางการ';
            }
            return {
                weekday: t.weekday || [],
                weekend: t.weekend || [],
                note
            };
        }

        function renderFrequencyTablesHtml(sched) {
            if (!sched || (!sched.weekday.length && !sched.weekend.length)) return '';
            const tbl = rows => `<table class="mrt-freq-table">
                <thead><tr><th>${lang === 'en' ? 'Time Window' : 'ช่วงเวลา'}</th><th>${lang === 'en' ? 'Frequency' : 'ความถี่'}</th></tr></thead>
                <tbody>${rows.map(r => {
                    const lbl = String(r.freqLabel || '').startsWith('~') ? r.freqLabel : `~${r.freqLabel}`;
                    return `<tr class="${r.isCurrent ? 'now' : ''}">
                        <td>${esc(r.timeStr)}</td><td>${esc(lbl)} ${T('minUnit').trim()}</td></tr>`;
                }).join('')}</tbody>
            </table>`;

            return `
                <div style="margin-top:10px">
                    <div style="font-weight:700;font-size:13px;color:var(--ink);margin:0 0 8px;display:flex;align-items:center;gap:6px">
                        <span>🗓️ ${lang === 'en' ? 'Monday - Friday (Weekday)' : 'วันจันทร์ – ศุกร์ (วันธรรมดา)'}</span>
                        ${!isWeekend() ? '<span style="font-size:10px;background:#22c55e22;color:#16a34a;font-weight:800;padding:2px 6px;border-radius:6px">วันนี้ (Today)</span>' : ''}
                    </div>
                    ${tbl(sched.weekday)}
                </div>
                <div style="margin-top:14px">
                    <div style="font-weight:700;font-size:13px;color:var(--ink);margin:0 0 8px;display:flex;align-items:center;gap:6px">
                        <span>🗓️ ${lang === 'en' ? 'Saturday - Sunday & Public Holidays' : 'วันเสาร์ – อาทิตย์ และวันหยุดนักขัตฤกษ์'}</span>
                        ${isWeekend() ? '<span style="font-size:10px;background:#22c55e22;color:#16a34a;font-weight:800;padding:2px 6px;border-radius:6px">วันนี้ (Today)</span>' : ''}
                    </div>
                    ${tbl(sched.weekend)}
                </div>
                ${sched.note ? `<div class="mrt-freq-note" style="margin-top:10px;text-align:left;">${esc(sched.note)}</div>` : ''}
            `;
        }

        function parseStationCodeAndName(text) {
            if (!text) return { name: '', code: '' };
            const match = String(text).match(/^(.*?)\s*\((.*?)\)$/);
            if (match) {
                return { name: match[1].trim(), code: match[2].trim() };
            }
            return { name: String(text).trim(), code: '' };
        }

        function getLineStationsList(lineId) {
            if (!lineId) return [];
            if ([1, 2, 3, 4, 5].includes(lineId)) {
                return (App.stations || []).filter(s => s.StationLineId === lineId);
            }
            const mrtLine = (MRT_STATIC_DB.lines || []).find(l => l.LineId === lineId);
            return mrtLine ? mrtLine.StationList : [];
        }

        /* ================= APP ================= */
        const App = {
            lines: [],            // [{LineId, LineName_TH/EN, LineColor, StationList}]
            uniqueStations: [],   // dedupe ด้วย StationKey (สยามอยู่ 2 สาย) สำหรับหาสถานีใกล้สุด
            lineById: {},
            userPos: null,
            nearest: null,        // {station, km}
            nearestList: [],      // 3 สถานีใกล้สุดให้สลับดูเร็ว ๆ
            pinnedKey: null,      // สถานีที่ user เลือกดูในการ์ดบน (default = ใกล้สุด)
            activeLine: 1,
            userPickedLineManually: false, // ผู้ใช้เคยกดเลือกสายด้วยตนเองหรือไม่
            lastSyncedStationKey: null,    // สถานีล่าสุดที่ทำการซิงค์แท็บสายอัตโนมัติ
            expandedKey: null,    // สถานีที่กางดูใน strip
            arrivals: {},         // StationKey -> {fetchedAt, time, platforms, error, loading}
            selTrain: {},         // "StationKey|platform" -> {idx, trainNo} ขบวนที่ user เลือกตามปลายทาง
            routes: {},           // StationKey -> {loading, ready, blocks: [...]} ตำแหน่งขบวนรอบสถานี
            connections: {},      // StationKey -> [{key, lineId, color}] สถานีเชื่อมต่อต่างสาย (ระยะ < 350 ม.)
            etaMem: {},           // "StationKey|platform|trainNo" -> {base, at} เวลาเลขล่าสุด (กันเวลาวูบเป็น --)
            traffic: null,        // สถานะการเดินรถจาก btsapp1 {at, updated, lines, alerts}
            keyLines: {},         // StationKey -> [{lineId, color}] ทุกสายที่ผ่านสถานีนั้น
            journey: { open: false, from: null, to: null, loading: false, error: null, result: null, picking: null, pickerLine: 1, openRoute: 0 },
            locating: false,
            locError: null,
            refreshTimer: null,
            fallbackTimer: null,  // ตัวจับเวลา 10 วิ ก่อนใช้สถานีสำรอง (อโศก)


            /* ---------- THE SKYTRAINs: View Navigation ---------- */
            currentView: 'home',
            selectedMapStationKey: 'CEN',
            selectedExitKey: 'CEN',
            mapZoom: 1.0,
            faresActiveLine: 0,
            timetablesActiveLine: 0,

            switchView(viewName) {
                const validViews = ['home', 'map', 'planner', 'exits', 'fares', 'timetables'];
                if (!validViews.includes(viewName)) viewName = 'home';
                this.currentView = viewName;

                // Update bottom tabs and ensure nav is revealed
                const nav = document.querySelector('.bottom-nav');
                if (nav) nav.classList.remove('nav-hidden');
                document.querySelectorAll('.bottom-nav .nav-tab').forEach(tab => {
                    tab.classList.toggle('active', tab.id === 'tab-' + viewName);
                });

                // Toggle app views
                document.querySelectorAll('.app-view').forEach(view => {
                    view.classList.toggle('active', view.id === 'view' + viewName.charAt(0).toUpperCase() + viewName.slice(1));
                });

                // Trigger view specific rendering
                if (viewName === 'home') {
                    this.scrollActiveTabIntoView();
                } else if (viewName === 'map') {
                    this.renderInteractiveMap();
                } else if (viewName === 'exits') {
                    const fallback = this.pinnedStation()?.StationKey || this.nearest?.station?.StationKey || 'CEN';
                    this.renderExitsView(this.selectedExitKey || fallback);
                } else if (viewName === 'planner') {
                    this.journey.open = true;
                    this.renderJourney();
                } else if (viewName === 'fares') {
                    this.renderFaresView();
                } else if (viewName === 'timetables') {
                    this.renderTimetablesView();
                }

                window.scrollTo({ top: 0, behavior: 'smooth' });
            },

            setFaresLine(lineId) {
                this.faresActiveLine = Number(lineId) || 0;
                this.renderFaresView();
            },

            setTimetablesLine(lineId) {
                this.timetablesActiveLine = Number(lineId) || 0;
                this.renderTimetablesView();
            },

            toggleTimetableStations() {
                const el = document.getElementById('stnListBody');
                const chev = document.getElementById('stnListChev');
                if (!el) return;
                const isHidden = el.style.display === 'none';
                el.style.display = isHidden ? 'block' : 'none';
                if (chev) chev.textContent = isHidden ? '▲' : '▼';
            },

            /* ---------- THE SKYTRAINs: Passenger Crowdedness Gauge ---------- */
            getCrowdLevel(station) {
                if (station && station.IsCrowded === true) {
                    return {
                        level: 'high',
                        percent: 86,
                        badge: lang === 'th' ? 'หนาแน่นมาก' : 'Very Crowded',
                        color: '#ef4444',
                        icon: '🔴',
                        advice: lang === 'th' ? 'ผู้โดยสารหนาแน่น อาจต้องรอขบวนถัดไป 1-2 ขบวน' : 'High passenger volume. Expect a 1-2 train wait.'
                    };
                }
                const now = new Date();
                const day = now.getDay();
                const isWeekend = (day === 0 || day === 6);
                const hour = now.getHours();
                const min = now.getMinutes();
                const timeVal = hour + min / 60;

                const isInterchange = station && (
                    station.StationKey === 'CEN' || station.StationKey === 'E4' || station.StationKey === 'N8' ||
                    station.StationKey === 'S2' || station.StationKey === 'BL11' || station.StationKey === 'BL22' ||
                    station.StationKey === 'YL01' || station.StationKey === 'YL23' || (this.connections[station.StationKey] || []).length > 0
                );

                let percent = 30;
                let level = 'low';

                if (!isWeekend) {
                    if (timeVal >= 7.25 && timeVal <= 9.25) {
                        percent = isInterchange ? 88 : 75;
                        level = 'high';
                    } else if (timeVal >= 17.0 && timeVal <= 19.75) {
                        percent = isInterchange ? 90 : 78;
                        level = 'high';
                    } else if ((timeVal >= 6.75 && timeVal < 7.25) || (timeVal > 9.25 && timeVal <= 10.5) ||
                             (timeVal >= 16.5 && timeVal < 17.0) || (timeVal > 19.75 && timeVal <= 20.5)) {
                        percent = isInterchange ? 64 : 52;
                        level = 'moderate';
                    } else if (timeVal < 5.5 || timeVal > 24) {
                        percent = 12;
                        level = 'low';
                    } else {
                        percent = isInterchange ? 46 : 34;
                        level = isInterchange ? 'moderate' : 'low';
                    }
                } else {
                    if (timeVal >= 12.0 && timeVal <= 19.0) {
                        percent = isInterchange ? 66 : 42;
                        level = isInterchange ? 'moderate' : 'low';
                    } else {
                        percent = 26;
                        level = 'low';
                    }
                }

                if (level === 'high') {
                    return {
                        level: 'high',
                        percent,
                        badge: lang === 'th' ? 'หนาแน่น' : 'Crowded',
                        color: '#ef4444',
                        icon: '🔴',
                        advice: lang === 'th' ? 'ผู้โดยสารหนาแน่น อาจต้องรอขบวนถัดไป 1-2 ขบวน' : 'High passenger volume. Possible 1-2 train wait.'
                    };
                } else if (level === 'moderate') {
                    return {
                        level: 'moderate',
                        percent,
                        badge: lang === 'th' ? 'ปานกลาง' : 'Moderate',
                        color: '#f59e0b',
                        icon: '🟡',
                        advice: lang === 'th' ? 'มีผู้โดยสารพอสมควร ยืนหรือนั่งได้สะดวก' : 'Moderate crowding. Seating or standing available.'
                    };
                } else {
                    return {
                        level: 'low',
                        percent,
                        badge: lang === 'th' ? 'คนน้อย / เดินทางสะดวก' : 'Low / Comfortable',
                        color: '#10b981',
                        icon: '🟢',
                        advice: lang === 'th' ? 'ผู้โดยสารน้อย มีที่นั่งว่าง เดินทางสะดวกสบาย' : 'Low passenger volume. Plenty of seats available.'
                    };
                }
            },

            renderCrowdGauge(station) {
                if (!station) return '';
                const g = this.getCrowdLevel(station);
                const title = lang === 'th' ? 'ความหนาแน่นผู้โดยสาร' : 'Passenger Density';
                return `
                    <div class="crowd-gauge-card">
                        <div class="crowd-header">
                            <span class="crowd-title">👥 ${title}</span>
                            <span class="crowd-pill" style="background:${g.color}22;color:${g.color};border:1px solid ${g.color}55">
                                ${g.icon} ${g.badge} (${g.percent}%)
                            </span>
                        </div>
                        <div class="crowd-track">
                            <div class="crowd-bar" style="width:${g.percent}%;background:${g.color}"></div>
                        </div>
                        <div class="crowd-advice">${g.advice}</div>
                    </div>`;
            },

            /* ---------- THE SKYTRAINs: Station Exits Directory ---------- */
            exitFilterLine: 0, // 0 = ทุกสาย (All lines)
            exitDropdownOpen: false,
            exitSearchQuery: '',

            toggleExitDropdown() {
                this.exitDropdownOpen = !this.exitDropdownOpen;
                const panel = document.getElementById('exitDropdownPanel');
                const trigger = document.getElementById('exitDropdownTrigger');
                if (panel) panel.hidden = !this.exitDropdownOpen;
                if (trigger) trigger.classList.toggle('open', this.exitDropdownOpen);
                if (this.exitDropdownOpen) {
                    setTimeout(() => document.getElementById('exitSearchBox')?.focus(), 50);
                }
            },

            closeExitDropdown() {
                this.exitDropdownOpen = false;
                const panel = document.getElementById('exitDropdownPanel');
                const trigger = document.getElementById('exitDropdownTrigger');
                if (panel) panel.hidden = true;
                if (trigger) trigger.classList.remove('open');
            },

            onExitSearchInput(query) {
                this.exitSearchQuery = (query || '').trim().toLowerCase();
                this.renderFramedLines();
            },

            filterExitLine(lineId) {
                this.exitFilterLine = lineId;
                const allLines = [...this.lines, ...MRT_STATIC_DB.lines];
                if (lineId !== 0) {
                    const line = allLines.find(l => l.LineId === lineId);
                    if (line && line.StationList && line.StationList.length) {
                        const onLine = line.StationList.some(s => s.StationKey === this.selectedExitKey);
                        if (!onLine) {
                            this.selectedExitKey = line.StationList[0].StationKey;
                        }
                    }
                }
                this.renderExitsView(this.selectedExitKey);
            },

            userHasPickedExitStation: false,

            selectExitStation(key) {
                this.userHasPickedExitStation = true;
                this.selectedExitKey = key;
                const s = this.findStation(key);
                if (s && this.exitFilterLine !== 0 && s.StationLineId !== this.exitFilterLine) {
                    this.exitFilterLine = s.StationLineId;
                }
                this.closeExitDropdown();
                this.renderExitsView(key);
            },

            renderFramedLines() {
                const container = document.getElementById('exitFramedLinesContainer');
                if (!container) return;

                const allLines = [...this.lines, ...MRT_STATIC_DB.lines];
                const linesToShow = (this.exitFilterLine === 0)
                    ? allLines
                    : allLines.filter(l => l.LineId === this.exitFilterLine);

                const q = this.exitSearchQuery;
                const curKey = this.selectedExitKey || 'CEN';

                let html = '';
                let totalMatching = 0;

                for (const line of linesToShow) {
                    let stations = line.StationList || [];
                    if (q) {
                        stations = stations.filter(s => {
                            const nameTh = (stName(s) || '').toLowerCase();
                            const nameEn = (s.StationName_EN || s.StationNameEN || '').toLowerCase();
                            const key = (s.StationKey || '').toLowerCase();
                            return nameTh.includes(q) || nameEn.includes(q) || key.includes(q);
                        });
                    }

                    if (stations.length === 0) continue;
                    totalMatching += stations.length;

                    const color = line.LineColor || '#7AB420';
                    const groupLabel = getLineOptLabel(line);
                    const isBright = isBrightColor(color);
                    const codeTextColor = isBright ? '#0f172a' : '#ffffff';

                    const stationChips = stations.map(s => {
                        const isSelected = s.StationKey === curKey;
                        const name = stName(s);
                        return `
                            <button type="button" class="station-picker-chip ${isSelected ? 'selected' : ''}"
                                onclick="App.selectExitStation('${esc(s.StationKey)}')">
                                <span class="chip-code" style="background:${color};color:${codeTextColor}">${esc(s.StationKey)}</span>
                                <span class="chip-name" title="${esc(name)}">${esc(name)}</span>
                            </button>`;
                    }).join('');

                    html += `
                        <div class="line-frame-box" style="border-color:${color}; background:${color}08;">
                            <div class="line-frame-head">
                                <div class="line-frame-title">
                                    ${getLineIconSvg(line.LineId, false, 18)}
                                    <span>${esc(groupLabel)}</span>
                                </div>
                                <span class="line-frame-count" style="background:${color}22; color:${isBright ? '#ca8a04' : color}; border:1px solid ${color}44;">
                                    ${stations.length} ${lang === 'th' ? 'สถานี' : 'stations'}
                                </span>
                            </div>
                            <div class="line-stations-grid">
                                ${stationChips}
                            </div>
                        </div>`;
                }

                if (totalMatching === 0) {
                    html = `<div style="text-align:center; padding:24px 12px; color:var(--muted); font-size:13px;">
                        🔍 ${lang === 'th' ? `ไม่พบสถานีที่ตรงกับคำค้นหา "${esc(q)}"` : `No stations found matching "${esc(q)}"`}
                    </div>`;
                }

                container.innerHTML = html;
            },

            locateExitGps(interactive) {
                const eb = document.getElementById('exitRelocateBtn');
                if (eb) {
                    eb.disabled = true;
                    eb.innerHTML = `<span class="spin dark sm"></span> ${T('relocate')}`;
                }
                const body = document.getElementById('nearestExitBody');
                if (body && !this.userPos) {
                    body.innerHTML = `<button class="btn btn-big" disabled><span class="spin"></span> ${T('locating')}</button>`;
                }
                this.locate(interactive);
            },

            locateExit(interactive) {
                this.locateExitGps(interactive);
            },

            scrollToExit(exitNum, stationKey) {
                if (stationKey && stationKey !== this.selectedExitKey) {
                    this.selectExitStation(stationKey);
                }
                setTimeout(() => {
                    const el = document.getElementById('exit-card-' + exitNum);
                    if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        el.classList.add('flash-highlight');
                        setTimeout(() => el.classList.remove('flash-highlight'), 1600);
                    }
                }, 100);
            },

            renderNearestExit() {
                const el = document.getElementById('nearestExitBody');
                if (!el) return;

                if (this.locating && !this.userPos) {
                    el.innerHTML = `<button class="btn btn-big" disabled><span class="spin"></span> ${T('locating')}</button>`;
                    return;
                }

                if (!this.userPos) {
                    el.innerHTML =
                        (this.locError ? `<div class="err-box" style="margin:0 0 10px">${this.locError}</div>` : '') +
                        `<button class="btn btn-big" onclick="App.locateExitGps(true)">📍 ${lang === 'th' ? 'ระบุทางออกที่คุณยืนอยู่ด้วย GPS' : 'Find your nearest exit by GPS'}</button>`;
                    return;
                }

                // Station where user is closest to
                const nearestSt = this.nearest?.station || this.pinnedStation() || this.findStation(this.selectedExitKey) || this.uniqueStations[0];
                if (!nearestSt) return;

                const s = nearestSt;
                const exits = getStationExits(s);
                if (!exits || !exits.length) {
                    el.innerHTML = `<div class="empty-note">${lang === 'th' ? 'ไม่มีข้อมูลทางออก' : 'No exit data'}</div>`;
                    return;
                }

                const exitsWithDist = exits.map(ex => {
                    const coord = getExitCoordinates(s, ex.exit, exits.length);
                    const dM = coord
                        ? haversineKm(this.userPos.lat, this.userPos.lon, coord.lat, coord.lon) * 1000
                        : Infinity;
                    return {
                        ...ex,
                        meters: Math.round(dM)
                    };
                }).sort((a, b) => a.meters - b.meters);

                const nearestExit = exitsWithDist[0];
                const isAtStation = this.userPos?.calibrated || nearestExit.meters <= 450;
                const distText = nearestExit.meters < 1000
                    ? `${nearestExit.meters} ${lang === 'th' ? 'เมตร' : 'm'}`
                    : `${(nearestExit.meters / 1000).toFixed(1)} ${lang === 'th' ? 'กม.' : 'km'}`;

                const color = s.StationLineColor || '#7AB420';
                const allLines = [...this.lines, ...MRT_STATIC_DB.lines];
                const lineObj = this.lineById[s.StationLineId] || allLines.find(l => l.LineId === s.StationLineId);
                const lineLabel = lineObj ? (lang === 'en' ? (lineObj.LineName_EN || lineObj.LineName_TH) : (lineObj.LineName_TH || '')) : '';

                const headline = isAtStation
                    ? (lang === 'th' ? `คุณยืนอยู่บริเวณ <b>ทางออก ${nearestExit.exit}</b>` : `You are standing near <b>Exit ${nearestExit.exit}</b>`)
                    : (lang === 'th' ? `ทางออกที่ใกล้จุดที่คุณอยู่ที่สุดคือ <b>ทางออก ${nearestExit.exit}</b>` : `Closest exit from your location is <b>Exit ${nearestExit.exit}</b>`);

                const statusBadge = isAtStation
                    ? `<span class="badge near-b" style="font-size:10px">📍 ${lang === 'th' ? 'จุดที่คุณยืนอยู่' : 'Your Location'}</span>`
                    : `<span class="badge" style="background:#e0f2fe;color:#0369a1;font-size:10px">${lang === 'th' ? 'สถานีใกล้คุณ' : 'Nearest Station'}</span>`;

                const lm = lang === 'th' ? nearestExit.landmarks_th : (nearestExit.landmarks_en || nearestExit.landmarks_th);

                const facilityBadges = (nearestExit.facilities || []).map(f => {
                    if (f === 'skywalk') return `<span class="facility-chip skywalk">🚶‍♂️ ${lang === 'th' ? 'Skywalk ทางเชื่อม' : 'Skywalk Link'}</span>`;
                    if (f === 'elevator') return `<span class="facility-chip elevator">🛗 ${lang === 'th' ? 'ลิฟต์คนพิการ/ผู้สูงอายุ' : 'Priority Elevator'}</span>`;
                    if (f === 'escalator') return `<span class="facility-chip">🪜 ${lang === 'th' ? 'บันไดเลื่อน' : 'Escalator'}</span>`;
                    return '';
                }).join('');

                const altChips = exitsWithDist.map(ex => {
                    const isSelected = ex.exit === nearestExit.exit;
                    const dStr = ex.meters < 1000 ? `~${ex.meters} ${lang === 'th' ? 'ม.' : 'm'}` : `~${(ex.meters / 1000).toFixed(1)} ${lang === 'th' ? 'กม.' : 'km'}`;
                    return `
                        <button type="button" class="alt-chip ${isSelected ? 'on' : ''}" onclick="App.scrollToExit(${ex.exit}, '${esc(s.StationKey)}')">
                            <span class="dot" style="background:${isSelected ? '#16a34a' : '#94a3b8'}"></span>
                            <span>${lang === 'th' ? 'ทางออก' : 'Exit'} ${ex.exit}</span>
                            <span class="km">${dStr}</span>
                        </button>`;
                }).join('');

                const isCurrentDirectoryStation = this.selectedExitKey === s.StationKey;
                const calibrateExitBtn = (!this.userPos?.calibrated && nearestExit.meters > 120 && nearestExit.meters <= 800)
                    ? `<button class="btn btn-ghost" style="padding:3px 8px;font-size:11px;color:var(--primary,#0284c7);border:1px dashed var(--primary,#0284c7);border-radius:8px;margin-left:auto" onclick="App.calibrateToStation('${esc(s.StationKey)}')">📍 ${lang === 'th' ? 'ฉันอยู่ที่สถานีนี้' : "I'm at this station"}</button>`
                    : '';
                const viewDirectoryBtn = !isCurrentDirectoryStation
                    ? `<button class="btn btn-ghost view-dir-btn" style="padding:3px 8px;font-size:11px;margin-left:${calibrateExitBtn ? '6px' : 'auto'}" onclick="App.selectExitStation('${esc(s.StationKey)}')">${lang === 'th' ? '📂 เปิดไดเรกทอรีสถานีนี้ ➔' : '📂 View Station Exits ➔'}</button>`
                    : '';

                el.innerHTML = `
                    ${this.locError ? `<div class="err-box" style="margin:0 0 10px">${this.locError}</div>` : ''}
                    <div class="current-exit-hero">
                        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;padding-bottom:8px;border-bottom:1px dashed var(--line);flex-wrap:wrap">
                            <span class="st-key" style="background:${color};font-size:12px;padding:3px 8px">${esc(s.StationKey)}</span>
                            <div>
                                <span style="font-weight:700;font-size:14px;color:var(--ink)">${esc(stName(s))}</span>
                                <span style="font-size:11px;color:var(--muted);margin-left:6px">${esc(lineLabel)}</span>
                            </div>
                            ${statusBadge}
                            ${calibrateExitBtn}
                            ${viewDirectoryBtn}
                        </div>
                        <div class="box-content">
                            <div class="exit-circle-lg">
                                <span class="sub">EXIT</span>
                                <span class="num">${nearestExit.exit}</span>
                            </div>
                            <div class="box-details">
                                <div class="headline">${headline}</div>
                                <div class="dist-tag">📏 ${lang === 'th' ? 'ระยะห่างประมาณ' : 'Approx.'} <b>${distText}</b> ${lang === 'th' ? 'จากจุดที่คุณยืน' : 'from your location'}</div>
                                <div class="landmark-tag">🚪 ${esc(lm)}</div>
                            </div>
                        </div>
                        ${facilityBadges ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px">${facilityBadges}</div>` : ''}
                        <div style="margin-top:12px;padding-top:10px;border-top:1px dashed var(--line)">
                            <div style="font-size:11.5px;color:var(--muted);margin-bottom:6px;font-weight:600">
                                ${lang === 'th' ? 'ทางออกทั้งหมดของสถานีนี้ (แตะเพื่อดูรายละเอียด):' : 'All exits of this station (tap to jump to details):'}
                            </div>
                            <div class="alt-row">${altChips}</div>
                        </div>
                    </div>`;
            },

            renderExitsView(selectedKey) {
                const heroEl = document.getElementById('exitStationHero');
                const listEl = document.getElementById('exitListContainer');
                const selectEl = document.getElementById('exitStationSelect');
                const lineTabsEl = document.getElementById('exitLineTabs');
                const trigBadge = document.getElementById('triggerStationBadge');
                const trigName = document.getElementById('triggerStationName');
                const trigLine = document.getElementById('triggerLineName');

                if (!heroEl || !listEl) return;

                const allLines = [...this.lines, ...MRT_STATIC_DB.lines];
                if (!allLines.length) return;

                const curKey = selectedKey || this.selectedExitKey || this.pinnedStation()?.StationKey || 'CEN';
                this.selectedExitKey = curKey;

                // 1. Line Filter Tabs (ทุกสาย, สุขุมวิท, สีลม, สีทอง, สีน้ำเงิน, สีม่วง, สีเหลือง, สีชมพู, สีแดง, ARL)
                if (lineTabsEl) {
                    const isAll = this.exitFilterLine === 0;
                    lineTabsEl.innerHTML = `
                        <button class="tab ${isAll ? 'on' : ''}" style="${isAll ? 'background:var(--primary,#0284c7);color:#fff;' : ''}" onclick="App.filterExitLine(0)">
                            ${getLineIconSvg(0, isAll, 17)}
                            <span>${lang === 'th' ? 'ทุกสาย' : 'All Lines'}</span>
                        </button>` + allLines.map(l => {
                        const on = l.LineId === this.exitFilterLine;
                        return `<button class="tab ${on ? 'on' : ''}" style="${on ? 'background:' + l.LineColor + ';color:#fff;' : ''}" onclick="App.filterExitLine(${l.LineId})">
                            ${getLineIconSvg(l.LineId, on, 17)}
                            <span>${esc(shortLineName(l))}</span></button>`;
                    }).join('');
                }

                // 2. Update Framed Lines in the Custom Dropdown Panel
                this.renderFramedLines();

                // 3. Keep hidden native select in sync for any tests/integrations
                if (selectEl) {
                    const linesToShow = (this.exitFilterLine === 0)
                        ? allLines
                        : allLines.filter(l => l.LineId === this.exitFilterLine);

                    selectEl.innerHTML = linesToShow.map(line => {
                        const options = (line.StationList || []).map(s => {
                            const name = stName(s);
                            const en = s.StationName_EN || s.StationNameEN || '';
                            const isSelected = s.StationKey === curKey;
                            return `<option value="${esc(s.StationKey)}"${isSelected ? ' selected' : ''}>${esc(s.StationKey)} - ${esc(name)}${en ? ' (' + esc(en) + ')' : ''}</option>`;
                        }).join('');
                        return `<optgroup label="${esc(line.LineName_TH)}">${options}</optgroup>`;
                    }).join('');
                    selectEl.value = curKey;
                }

                // 4. Update the Trigger button UI
                const s = this.findStation(curKey) || (allLines[0].StationList && allLines[0].StationList[0]);
                if (!s) return;
                const color = s.StationLineColor || '#7AB420';
                const lineObj = this.lineById[s.StationLineId] || allLines.find(l => l.LineId === s.StationLineId);
                const lineLabel = lineObj ? (lang === 'en' ? (lineObj.LineName_EN || lineObj.LineName_TH) : `${lineObj.LineName_TH} (${lineObj.LineName_EN || ''})`) : '';

                if (trigBadge) {
                    trigBadge.textContent = s.StationKey;
                    trigBadge.style.background = color;
                }
                if (trigName) trigName.textContent = stName(s);
                if (trigLine) trigLine.textContent = lineLabel;

                // 5. Calculate Real-Time Nearest Exit for this selected station
                const exits = getStationExits(s);
                let nearestExitInfo = null;

                if (this.userPos && s.Latitude && s.Longitude) {
                    let minMeters = Infinity;
                    for (const ex of exits) {
                        const exitCoord = getExitCoordinates(s, ex.exit, exits.length);
                        if (exitCoord) {
                            const dM = haversineKm(this.userPos.lat, this.userPos.lon, exitCoord.lat, exitCoord.lon) * 1000;
                            if (dM < minMeters) {
                                minMeters = dM;
                                nearestExitInfo = {
                                    exit: ex.exit,
                                    meters: Math.round(dM),
                                    landmarks: lang === 'th' ? ex.landmarks_th : (ex.landmarks_en || ex.landmarks_th)
                                };
                            }
                        }
                    }
                }

                // 6. Update Nearest Exit Hero Card at the top of View 4
                this.renderNearestExit();

                // 7. Render Station Hero
                const exitHint = nearestExitInfo ? `
                    <div class="dist-chip">
                        <div class="v">${lang === 'th' ? 'ทางออก' : 'Exit'} ${nearestExitInfo.exit}</div>
                        <div class="l">${lang === 'th' ? 'ใกล้ทิศทางคุณ' : 'Nearest'} (~${nearestExitInfo.meters < 1000 ? nearestExitInfo.meters + ' ' + (lang === 'th' ? 'ม.' : 'm') : (nearestExitInfo.meters/1000).toFixed(1) + ' ' + (lang === 'th' ? 'กม.' : 'km')})</div>
                    </div>` : '';

                heroEl.innerHTML = `
                    <div class="station-hero" style="margin-bottom:12px">
                        <div class="key-badge" style="background:${color}">${esc(s.StationKey)}</div>
                        <div class="names">
                            <div class="th">${esc(stName(s))}</div>
                            <div class="en">${esc(s.StationName_EN || s.StationNameEN || '')} ${connBadges(s.StationKey, s.StationLineId)}</div>
                        </div>
                        ${exitHint}
                    </div>`;

                // 8. Render Exit Directory List
                listEl.innerHTML = exits.map(ex => {
                    const isNearest = nearestExitInfo && nearestExitInfo.exit === ex.exit;
                    const badges = (ex.facilities || []).map(f => {
                        if (f === 'skywalk') return `<span class="facility-chip skywalk">🚶‍♂️ ${lang === 'th' ? 'Skywalk ทางเชื่อม' : 'Skywalk Link'}</span>`;
                        if (f === 'elevator') return `<span class="facility-chip elevator">🛗 ${lang === 'th' ? 'ลิฟต์คนพิการ/ผู้สูงอายุ' : 'Priority Elevator'}</span>`;
                        if (f === 'escalator') return `<span class="facility-chip">🪜 ${lang === 'th' ? 'บันไดเลื่อน' : 'Escalator'}</span>`;
                        return '';
                    }).join('');

                    const nearestBadge = isNearest
                        ? `<span class="facility-chip nearest-live-chip">📍 ${lang === 'th' ? 'คุณยืนอยู่ใกล้ทางออกนี้' : 'You are near this exit'} (${nearestExitInfo.meters < 1000 ? '~' + nearestExitInfo.meters + ' ' + (lang === 'th' ? 'ม.' : 'm') : (nearestExitInfo.meters / 1000).toFixed(1) + ' ' + (lang === 'th' ? 'กม.' : 'km')})</span>`
                        : '';

                    const lm = lang === 'th' ? ex.landmarks_th : (ex.landmarks_en || ex.landmarks_th);
                    return `
                        <div class="exit-item ${isNearest ? 'nearest-exit-active' : ''}" id="exit-card-${ex.exit}">
                            <div class="exit-badge-num" style="${isNearest ? 'background:linear-gradient(135deg,#16a34a,#15803d);' : ''}">
                                <span class="lbl">EXIT</span>
                                <span>${ex.exit}</span>
                            </div>
                            <div class="exit-content">
                                <div class="exit-facilities">${nearestBadge}${badges}</div>
                                <div class="exit-landmarks">📍 ${esc(lm)}</div>
                            </div>
                        </div>`;
                }).join('');
            },

            /* ---------- THE SKYTRAINs: Interactive Transit Network Map ---------- */
            zoomMap(factor) {
                this.mapZoom = Math.min(2.5, Math.max(0.6, (this.mapZoom || 1.0) * factor));
                const svg = document.querySelector('#networkMapContainer svg');
                if (svg) svg.style.transform = `scale(${this.mapZoom})`;
            },

            resetMapZoom() {
                this.mapZoom = 1.0;
                const svg = document.querySelector('#networkMapContainer svg');
                if (svg) {
                    svg.style.transform = 'scale(1)';
                    const vp = document.getElementById('mapViewport');
                    if (vp) {
                        vp.scrollLeft = 140;
                        vp.scrollTop = 120;
                    }
                }
            },

            renderInteractiveMap(force = false) {
                const container = document.getElementById('networkMapContainer');
                if (!container) return;
                if (!force && container.innerHTML.trim() !== '') return;

                const mapLbl = (code, th, en, icon = '') => {
                    const s = this.findStation(code);
                    const prefix = icon ? (icon + ' ') : '';
                    if (s) {
                        return `${prefix}${code} ${stName(s)}`;
                    }
                    return `${prefix}${code} ${lang === 'en' ? (en || th) : (th || en)}`;
                };

                // Build rich SVG network schematic
                const svg = `
                    <svg viewBox="0 0 1020 740" style="transform-origin:0 0;transition:transform .2s ease;">
                        <defs>
                            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                                <feGaussianBlur stdDeviation="3" result="blur" />
                                <feComposite in="SourceGraphic" in2="blur" operator="over" />
                            </filter>
                        </defs>

                        <!-- Background River (Chao Phraya) -->
                        <path d="M 230,0 C 240,150 180,320 220,430 C 250,510 270,600 240,740" fill="none" stroke="#38bdf8" stroke-width="26" stroke-linecap="round" opacity="0.32" />
                        <text x="250" y="700" fill="#0284c7" font-size="12" font-weight="700" opacity="0.6">${lang === 'th' ? 'แม่น้ำเจ้าพระยา (Chao Phraya River)' : 'Chao Phraya River'}</text>

                        <!-- BTS Sukhumvit Line (Green) -->
                        <path d="M 280,30 L 280,270 L 340,340 L 460,340 L 530,370 L 610,430 L 730,550 L 780,670" fill="none" stroke="#7AB420" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" />
                        
                        <!-- BTS Silom Line (Teal) -->
                        <path d="M 230,340 L 340,340 L 340,430 L 310,480 L 240,530 L 190,530 L 120,530" fill="none" stroke="#00807D" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" />

                        <!-- BTS Gold Line (Gold) -->
                        <path d="M 240,530 L 265,510 L 290,490" fill="none" stroke="#B89D18" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />

                        <!-- MRT Blue Line (Loop & Spur) -->
                        <path d="M 60,530 L 120,530 L 160,470 L 210,420 L 280,420 L 340,430 L 460,340 L 460,200 L 460,140 L 280,180 L 200,180 L 160,240 L 160,470" fill="none" stroke="#1f8fdf" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" />

                        <!-- MRT Purple Line -->
                        <path d="M 60,70 L 110,120 L 160,180 L 200,180" fill="none" stroke="#8a2c9b" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />

                        <!-- MRT Yellow Monorail -->
                        <path d="M 460,140 L 640,180 L 660,290 L 700,470 L 730,550" fill="none" stroke="#F5C242" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />

                        <!-- MRT Pink Monorail -->
                        <path d="M 110,120 L 220,70 L 360,70 L 680,70" fill="none" stroke="#F2779A" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />

                        <!-- Airport Rail Link -->
                        <path d="M 280,280 L 460,300 L 660,290 L 880,310" fill="none" stroke="#a11b22" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />

                        <!-- SRT Red Line -->
                        <path d="M 170,30 L 200,180 L 200,240" fill="none" stroke="#c21e25" stroke-width="5" stroke-dasharray="8,5" stroke-linecap="round" stroke-linejoin="round" />

                        <!-- STATIONS (Nodes & Labels) -->
                        <!-- SIAM INTERCHANGE (CEN) -->
                        <g onclick="App.onMapStationClick('CEN')">
                            <circle cx="340" cy="340" r="10" fill="#fff" stroke="#10213a" stroke-width="4" class="map-node" />
                            <circle cx="340" cy="340" r="5" fill="#7AB420" />
                            <text x="354" y="344" class="map-label" font-size="12" font-weight="800">${mapLbl('CEN', 'สยาม (Siam)', 'Siam')}</text>
                        </g>

                        <!-- ASOK / SUKHUMVIT (E4 / BL22) -->
                        <g onclick="App.onMapStationClick('E4')">
                            <circle cx="460" cy="340" r="9" fill="#fff" stroke="#7AB420" stroke-width="4" class="map-node" />
                            <text x="472" y="336" class="map-label" font-size="11" font-weight="700">${mapLbl('E4', 'อโศก (Asok)', 'Asok')}</text>
                        </g>

                        <!-- MO CHIT / CHATUCHAK (N8 / BL13) -->
                        <g onclick="App.onMapStationClick('N8')">
                            <circle cx="280" cy="180" r="9" fill="#fff" stroke="#7AB420" stroke-width="4" class="map-node" />
                            <text x="292" y="176" class="map-label" font-size="11" font-weight="700">${mapLbl('N8', 'หมอชิต (Mo Chit)', 'Mo Chit')}</text>
                        </g>

                        <!-- PHAYA THAI / ARL (N2 / A8) -->
                        <g onclick="App.onMapStationClick('N2')">
                            <circle cx="280" cy="280" r="8" fill="#fff" stroke="#a11b22" stroke-width="3.5" class="map-node" />
                            <text x="292" y="278" class="map-label">${mapLbl('N2', 'พญาไท (Phaya Thai)', 'Phaya Thai')}</text>
                        </g>

                        <!-- SALA DAENG / SI LOM (S2 / BL26) -->
                        <g onclick="App.onMapStationClick('S2')">
                            <circle cx="340" cy="430" r="8" fill="#fff" stroke="#00807D" stroke-width="3.5" class="map-node" />
                            <text x="352" y="434" class="map-label">${mapLbl('S2', 'ศาลาแดง (Sala Daeng)', 'Sala Daeng')}</text>
                        </g>

                        <!-- KRUNG THON BURI (S7 / G1) -->
                        <g onclick="App.onMapStationClick('S7')">
                            <circle cx="240" cy="530" r="8" fill="#fff" stroke="#B89D18" stroke-width="3.5" class="map-node" />
                            <text x="210" y="555" class="map-label">${mapLbl('S7', 'กรุงธนบุรี', 'Krung Thon Buri')}</text>
                        </g>

                        <!-- CHAROEN NAKHON / ICONSIAM (G2) -->
                        <g onclick="App.onMapStationClick('G2')">
                            <circle cx="265" cy="510" r="7" fill="#fff" stroke="#B89D18" stroke-width="3" class="map-node" />
                            <text x="280" y="515" class="map-label">${mapLbl('G2', 'เจริญนคร (ICONSIAM)', 'Charoen Nakhon (ICONSIAM)')}</text>
                        </g>

                        <!-- BANG WA (S12 / BL34) -->
                        <g onclick="App.onMapStationClick('S12')">
                            <circle cx="120" cy="530" r="8" fill="#fff" stroke="#00807D" stroke-width="3.5" class="map-node" />
                            <text x="80" y="555" class="map-label">${mapLbl('S12', 'บางหว้า (Bang Wa)', 'Bang Wa')}</text>
                        </g>

                        <!-- BANG SUE / CENTRAL TERMINAL (BL11) -->
                        <g onclick="App.onMapStationClick('BL11')">
                            <circle cx="200" cy="180" r="8" fill="#fff" stroke="#c21e25" stroke-width="3.5" class="map-node" />
                            <text x="140" y="165" class="map-label">${mapLbl('BL11', 'บางซื่อ (Bang Sue)', 'Bang Sue')}</text>
                        </g>

                        <!-- TAO POON (BL10 / PP16) -->
                        <g onclick="App.onMapStationClick('BL10')">
                            <circle cx="160" cy="240" r="7" fill="#fff" stroke="#8a2c9b" stroke-width="3" class="map-node" />
                            <text x="96" y="240" class="map-label">${mapLbl('PP16', 'เตาปูน', 'Tao Poon')}</text>
                        </g>

                        <!-- LAT PHRAO (BL15 / YL01) -->
                        <g onclick="App.onMapStationClick('YL01')">
                            <circle cx="460" cy="140" r="8" fill="#fff" stroke="#F5C242" stroke-width="3.5" class="map-node" />
                            <text x="474" y="136" class="map-label">${mapLbl('YL01', 'ลาดพร้าว (Lat Phrao)', 'Lat Phrao')}</text>
                        </g>

                        <!-- SI DAN (YL20) -->
                        <g onclick="App.onMapStationClick('YL20')">
                            <circle cx="700" cy="470" r="7" fill="#fff" stroke="#F5C242" stroke-width="3.5" class="map-node" />
                            <text x="712" y="474" class="map-label">${mapLbl('YL20', 'ศรีด่าน (Si Dan)', 'Si Dan')}</text>
                        </g>

                        <!-- SAMRONG (YL23 / E23) -->
                        <g onclick="App.onMapStationClick('YL23')">
                            <circle cx="730" cy="550" r="8" fill="#fff" stroke="#7AB420" stroke-width="3.5" class="map-node" />
                            <text x="744" y="554" class="map-label">${mapLbl('YL23', 'สำโรง (Samrong)', 'Samrong')}</text>
                        </g>

                        <!-- NONTHABURI CIVIC CENTER (PK01 / PP11) -->
                        <g onclick="App.onMapStationClick('PK01')">
                            <circle cx="110" cy="120" r="8" fill="#fff" stroke="#F2779A" stroke-width="3.5" class="map-node" />
                            <text x="18" y="110" class="map-label">${mapLbl('PK01', 'ศูนย์ราชการนนท์', 'Nonthaburi CC')}</text>
                        </g>

                        <!-- SUVARNABHUMI AIRPORT (A1) -->
                        <g onclick="App.onMapStationClick('A1')">
                            <circle cx="880" cy="310" r="8" fill="#fff" stroke="#a11b22" stroke-width="3.5" class="map-node" />
                            <text x="800" y="335" class="map-label">${mapLbl('A1', 'สุวรรณภูมิ (Suvarnabhumi)', 'Suvarnabhumi Airport', '✈️')}</text>
                        </g>

                        <!-- KHU KHOT (N24) -->
                        <g onclick="App.onMapStationClick('N24')">
                            <circle cx="280" cy="30" r="6" fill="#7AB420" class="map-node" />
                            <text x="292" y="34" class="map-label">${mapLbl('N24', 'คูคต (Khu Khot)', 'Khu Khot')}</text>
                        </g>

                        <!-- RANGSIT (RN10) -->
                        <g onclick="App.onMapStationClick('RN10')">
                            <circle cx="170" cy="30" r="6" fill="#c21e25" class="map-node" />
                            <text x="110" y="34" class="map-label">${mapLbl('RN10', 'รังสิต', 'Rangsit')}</text>
                        </g>

                        <!-- LAK SONG (BL38) -->
                        <g onclick="App.onMapStationClick('BL38')">
                            <circle cx="60" cy="530" r="6" fill="#1f8fdf" class="map-node" />
                            <text x="10" y="555" class="map-label">${mapLbl('BL38', 'หลักสอง', 'Lak Song')}</text>
                        </g>

                        <!-- Map Legend Box -->
                        <g transform="translate(20, 595)">
                            <rect width="215" height="120" rx="8" fill="rgba(255,255,255,0.92)" stroke="#cbd5e1" stroke-width="1" />
                            <text x="10" y="18" font-size="10" font-weight="700" fill="#0f172a">${lang === 'th' ? 'สัญลักษณ์สายรถไฟฟ้า' : 'Transit Lines Legend'}</text>
                            
                            <!-- Column 1 -->
                            <line x1="12" y1="34" x2="28" y2="34" stroke="#7AB420" stroke-width="3.5" stroke-linecap="round"/>
                            <text x="33" y="37.5" font-size="8.5" fill="#334155">${lang === 'th' ? 'สายสุขุมวิท' : 'Sukhumvit Line'}</text>

                            <line x1="12" y1="52" x2="28" y2="52" stroke="#00807D" stroke-width="3.5" stroke-linecap="round"/>
                            <text x="33" y="55.5" font-size="8.5" fill="#334155">${lang === 'th' ? 'สายสีลม' : 'Silom Line'}</text>

                            <line x1="12" y1="70" x2="28" y2="70" stroke="#B89D18" stroke-width="3.5" stroke-linecap="round"/>
                            <text x="33" y="73.5" font-size="8.5" fill="#334155">${lang === 'th' ? 'สายสีทอง' : 'Gold Line'}</text>

                            <line x1="12" y1="88" x2="28" y2="88" stroke="#1f8fdf" stroke-width="3.5" stroke-linecap="round"/>
                            <text x="33" y="91.5" font-size="8.5" fill="#334155">${lang === 'th' ? 'สายสีน้ำเงิน' : 'Blue Line'}</text>

                            <line x1="12" y1="106" x2="28" y2="106" stroke="#8a2c9b" stroke-width="3.5" stroke-linecap="round"/>
                            <text x="33" y="109.5" font-size="8.5" fill="#334155">${lang === 'th' ? 'สายสีม่วง' : 'Purple Line'}</text>

                            <!-- Column 2 -->
                            <line x1="114" y1="34" x2="130" y2="34" stroke="#F5C242" stroke-width="3.5" stroke-linecap="round"/>
                            <text x="135" y="37.5" font-size="8.5" fill="#334155">${lang === 'th' ? 'สายสีเหลือง' : 'Yellow Line'}</text>

                            <line x1="114" y1="52" x2="130" y2="52" stroke="#F2779A" stroke-width="3.5" stroke-linecap="round"/>
                            <text x="135" y="55.5" font-size="8.5" fill="#334155">${lang === 'th' ? 'สายสีชมพู' : 'Pink Line'}</text>

                            <line x1="114" y1="70" x2="130" y2="70" stroke="#c21e25" stroke-width="3.5" stroke-dasharray="4,2" stroke-linecap="round"/>
                            <text x="135" y="73.5" font-size="8.5" fill="#334155">${lang === 'th' ? 'รถไฟสายสีแดง' : 'SRT Red Line'}</text>

                            <line x1="114" y1="88" x2="130" y2="88" stroke="#a11b22" stroke-width="3.5" stroke-linecap="round"/>
                            <text x="135" y="91.5" font-size="8.5" fill="#334155">${lang === 'th' ? 'แอร์พอร์ต ลิงก์' : 'Airport Rail Link'}</text>
                        </g>
                    </svg>`;

                container.innerHTML = svg;
                if (!force) {
                    const vp = document.getElementById('mapViewport');
                    if (vp) {
                        vp.scrollLeft = 140;
                        vp.scrollTop = 120;
                    }
                }
            },

            /* ---------- THE SKYTRAINs: Tap-to-Route Floating Action Sheet ---------- */
            onMapStationClick(stationKey) {
                this.selectedMapStationKey = stationKey;
                this.activeMapStationKey = stationKey;
                const s = this.findStation(stationKey);
                if (!s) return;

                const color = s.StationLineColor || '#7AB420';
                const infoEl = document.getElementById('sheetStationInfo');
                if (infoEl) {
                    const enName = s.StationName_EN || s.StationNameEN || '';
                    infoEl.innerHTML = `
                        <div class="sheet-badge" style="background:${color}">${esc(s.StationKey)}</div>
                        <div class="sheet-names">
                            <div class="th-name">${esc(stName(s))}</div>
                            <div class="en-name">${esc(enName)} ${connBadges(s.StationKey, s.StationLineId)}</div>
                        </div>`;
                }

                const sheet = document.getElementById('mapActionSheet');
                const backdrop = document.getElementById('mapActionSheetBackdrop');
                if (sheet) sheet.hidden = false;
                if (backdrop) backdrop.hidden = false;
            },

            closeMapActionSheet() {
                const sheet = document.getElementById('mapActionSheet');
                const backdrop = document.getElementById('mapActionSheetBackdrop');
                if (sheet) sheet.hidden = true;
                if (backdrop) backdrop.hidden = true;
            },

            setOriginFromActionSheet() {
                const key = this.selectedMapStationKey;
                this.journey.from = key;
                this.closeMapActionSheet();
                this.switchView('planner');
                this.renderJourney();
                if (this.journey.from && this.journey.to) this.findRoute();
            },

            setDestinationFromActionSheet() {
                const key = this.selectedMapStationKey;
                this.journey.to = key;
                this.closeMapActionSheet();
                this.switchView('planner');
                this.renderJourney();
                if (this.journey.from && this.journey.to) this.findRoute();
            },

            viewExitsFromActionSheet() {
                const key = this.selectedMapStationKey;
                this.closeMapActionSheet();
                this.switchView('exits');
                this.selectExitStation(key);
            },

            viewLiveFromActionSheet() {
                const key = this.selectedMapStationKey;
                this.closeMapActionSheet();
                this.switchView('home');
                const s = this.findStation(key);
                if (s) {
                    this.setLine(s.StationLineId);
                    this.expandedKey = key;
                    this.renderStrip();
                    this.loadArrivals(s);
                    setTimeout(() => {
                        document.querySelector(`[id^="row-${CSS.escape(key)}-"]`)
                            ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 100);
                }
            },

            quickSelectHub(key) {
                if (!this.journey.from) {
                    this.journey.from = key;
                } else if (!this.journey.to && this.journey.from !== key) {
                    this.journey.to = key;
                } else {
                    this.journey.from = key;
                }
                this.renderJourney();
                if (this.journey.from && this.journey.to) this.findRoute();
            },

            /* ---------- THE SKYTRAINs: Fares View (อัตราค่าโดยสารตามสาย) ---------- */
            renderFaresView() {
                const el = document.getElementById('faresViewContent');
                if (!el) return;

                const isEn = lang === 'en';
                const activeId = this.faresActiveLine || 0;
                const activeLine = TRANSIT_LINES_CATALOG.find(l => l.id === activeId) || TRANSIT_LINES_CATALOG[0];

                let bodyHtml = '';

                if (activeId === 0) {
                    // ทั้งหมด (All Lines Overview)
                    bodyHtml = `
                        <!-- 20 Baht Flat Fare Policy Banner -->
                        <div class="info-card" style="background:linear-gradient(135deg,#dc26260d,#ef444415);border-color:#ef444444">
                            <span class="fare-badge-20">${isEn ? '20 Baht Flat Fare Policy' : 'นโยบาย 20 บาทตลอดสาย'}</span>
                            <h3 style="color:#b91c1c;display:flex;align-items:center;gap:8px">
                                <span style="display:inline-flex;gap:4px;align-items:center">${getLineIconSvg(102, false, 20)} ${getLineIconSvg(103, false, 20)}</span>
                                <span>${isEn ? 'Flat 20 Baht Fare (EMV Contactless)' : 'รถไฟฟ้า 20 บาทตลอดสาย (EMV Contactless)'}</span>
                            </h3>
                            <div style="font-size:12.5px;color:var(--ink);line-height:1.6">
                                ${isEn ? 'Passengers paying with <b>EMV Contactless</b> credit/debit cards pay a maximum fare of <b>฿20</b>:' : 'ผู้โดยสารที่แตะจ่ายด้วยบัตรเครดิต/เดบิต <b>EMV Contactless</b> เดินทางด้วยค่าโดยสารสูงสุดไม่เกิน <b>20 บาท</b>:'}
                                <ul style="margin:8px 0 8px 6px;padding-left:14px;list-style:none">
                                    <li style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                                        ${getLineIconSvg(102, false, 18)}
                                        <span><b>${isEn ? 'MRT Purple Line:' : 'สายสีม่วง (MRT Purple Line):'}</b> ${isEn ? 'Khlong Bang Phai ↔ Tao Poon (Max ฿20)' : 'คลองบางไผ่ ↔ เตาปูน (สูงสุด 20 บาท)'}</span>
                                    </li>
                                    <li style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                                        ${getLineIconSvg(103, false, 18)}
                                        <span><b>${isEn ? 'SRT Red Line:' : 'สายสีแดง (SRT Red Line):'}</b> ${isEn ? 'Krung Thep Aphiwat ↔ Rangsit / Taling Chan (Max ฿20)' : 'กรุงเทพอภิวัฒน์ ↔ รังสิต / ตลิ่งชัน (สูงสุด 20 บาท)'}</span>
                                    </li>
                                    <li style="display:flex;align-items:center;gap:8px">
                                        <span style="display:inline-flex;align-items:center;gap:3px">${getLineIconSvg(102, false, 15)}⇄${getLineIconSvg(103, false, 15)}</span>
                                        <span><b>${isEn ? 'Cross-line Transfer (Purple ⇄ Red):' : 'เชื่อมต่อข้ามสายสีม่วงและสายสีแดง:'}</b> ${isEn ? 'Max ฿20 combined (transfer at Bang Sue station within 30 mins)' : 'สูงสุดรวม 20 บาท (แตะเปลี่ยนขบวนที่สถานีบางซื่อภายใน 30 นาที)'}</span>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <!-- All Lines Comparison Table -->
                        <div class="info-card">
                            <h3 style="display:flex;align-items:center;gap:8px">
                                <span>💳</span>
                                <span>${isEn ? 'Fare Comparison across 10 Lines' : 'เปรียบเทียบอัตราค่าโดยสารทั้ง 10 สาย'}</span>
                            </h3>
                            <div style="font-size:12px;color:var(--muted);margin-bottom:8px">
                                ${isEn ? 'Tap any line below or use the pills above to view detailed fare structure' : 'แตะที่สายรถไฟฟ้าหรือแถบด้านบนเพื่อดูตารางราคาแบบละเอียด'}
                            </div>
                            <div class="fare-table-wrap">
                                <table class="fare-grid-table">
                                    <thead>
                                        <tr>
                                            <th>${isEn ? 'Line' : 'สายรถไฟฟ้า'}</th>
                                            <th>${isEn ? 'Min - Max' : 'อัตราเริ่มต้น - สูงสุด'}</th>
                                            <th>${isEn ? 'Pricing Model' : 'รูปแบบราคา'}</th>
                                            <th>${isEn ? 'Cards / Tickets' : 'บัตรโดยสาร'}</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${TRANSIT_LINES_CATALOG.filter(l => l.id !== 0).map(l => `
                                            <tr style="cursor:pointer;" onclick="App.setFaresLine(${l.id})">
                                                <td style="white-space:nowrap;">
                                                    <span style="display:inline-flex;align-items:center;gap:6px;white-space:nowrap;">
                                                        ${getLineIconSvg(l.id, false, 16)}
                                                        <b>${esc(isEn ? l.nameEN : l.nameTH)}</b>
                                                    </span>
                                                </td>
                                                <td style="white-space:nowrap;"><b style="color:${l.color}">฿${l.minFare} - ฿${l.maxFare}</b></td>
                                                <td style="white-space:nowrap;">${esc(isEn ? l.pricingModelEN : l.pricingModelTH)}</td>
                                                <td style="white-space:nowrap;font-size:11.5px;color:var(--muted)">${esc(isEn ? l.ticketsEN : l.ticketsTH)}</td>
                                                <td style="white-space:nowrap;">
                                                    <button type="button" class="btn btn-ghost" style="padding:4px 8px;font-size:11px;white-space:nowrap;" onclick="event.stopPropagation();App.setFaresLine(${l.id})">
                                                        ${isEn ? 'Details' : 'ดูราคา'} ➔
                                                    </button>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- Payment & Card Guide -->
                        <div class="info-card">
                            <h3>🎟️ ${isEn ? 'Tickets & Payment Methods Guide' : 'คู่มือประเภทบัตรและวิธีการชำระค่าโดยสาร'}</h3>
                            <div style="font-size:12.5px;color:var(--ink);line-height:1.6">
                                <div style="margin-bottom:10px">
                                    <b style="color:var(--sky)">💳 บัตร EMV Contactless (Visa / Mastercard)</b>:
                                    ${isEn ? 'Tap to pay at MRT Blue, Purple, Yellow, Pink lines, and SRT Red Line. Enjoy transfer fee waivers between connecting lines within 30 minutes.' : 'แตะจ่ายได้ทันทีผ่านประตูอัตโนมัติของ MRT สายสีน้ำเงิน, สายสีม่วง, สายสีเหลือง, สายสีชมพู และ SRT สายสีแดง พร้อมสิทธิ์ยกเว้นค่าแรกเข้าเมื่อแตะเปลี่ยนสายภายใน 30 นาที'}
                                </div>
                                <div style="margin-bottom:10px">
                                    <b style="color:#f59e0b">🐇 บัตรแรบบิท (Rabbit Card)</b>:
                                    ${isEn ? 'Accepted on BTS Sukhumvit, Silom, Gold lines, and MRT Yellow, Pink lines. Stored-value and 30-day passes available.' : 'บัตรแตะเดินทางยอดนิยม ใช้ได้กับ BTS สายสุขุมวิท, สายสีลม, สายสีทอง, MRT สายสีเหลือง และสายสีชมพู รองรับทั้งการเติมเงินและแพ็กเกจเที่ยวเดินทาง 30 วัน'}
                                </div>
                                <div>
                                    <b style="color:var(--muted)">🪙 เหรียญ / ตั๋วเที่ยวเดียว (Single Journey Token & Card)</b>:
                                    ${isEn ? 'Available at automatic ticket vending machines and ticket offices at every station across all networks.' : 'หยอดเหรียญหรือสแกน QR Code ซื้อได้ที่ตู้จำหน่ายตั๋วอัตโนมัติและเคาน์เตอร์ทุกสถานี'}
                                </div>
                            </div>
                        </div>
                    `;
                } else {
                    // ข้อมูลเฉพาะสาย (Specific Line View)
                    const lineName = isEn ? activeLine.nameEN : activeLine.nameTH;
                    const terminus = isEn ? activeLine.terminusEN : activeLine.terminusTH;
                    const operator = isEn ? activeLine.operatorEN : activeLine.operatorTH;

                    // ส่วนเฉพาะของแต่ละสาย
                    let specificContent = '';

                    if (activeId === 1 || activeId === 2) {
                        // BTS Sukhumvit or Silom
                        specificContent = `
                            <div class="info-card">
                                <h3>📊 ${isEn ? 'Station Count Fare Structure' : 'ตารางอัตราค่าโดยสารตามจำนวนสถานี'}</h3>
                                <div style="font-size:12px;color:var(--muted);margin-bottom:8px">
                                    ${isEn ? 'Standard concession fare calculated by number of stations traveled' : 'คำนวณตามจำนวนสถานีในเส้นทางสัมปทานหลัก'}
                                </div>
                                <div class="fare-table-wrap">
                                    <table class="fare-grid-table compact-table">
                                        <thead>
                                            <tr>
                                                <th style="white-space:nowrap;">${isEn ? 'Stations' : 'จำนวนสถานี'}</th>
                                                <th style="white-space:nowrap;">${isEn ? 'Adult' : 'บุคคลทั่วไป'}</th>
                                                <th style="white-space:nowrap;">${isEn ? 'Student' : 'นักเรียน/นักศึกษา'}</th>
                                                <th style="white-space:nowrap;">${isEn ? 'Senior' : 'ผู้สูงอายุ'}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${BTS_STATION_FARES.map(r => `
                                                <tr>
                                                    <td style="white-space:nowrap;"><b>${esc(isEn ? r.stnEN : r.stnTH)}</b></td>
                                                    <td style="white-space:nowrap;color:${activeLine.color}"><b>฿${r.adult}</b></td>
                                                    <td style="white-space:nowrap;">฿${r.student}</td>
                                                    <td style="white-space:nowrap;">฿${r.senior}</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                                <div style="font-size:12px;color:var(--muted);margin-top:8px;line-height:1.5;">
                                    💡 <b>${isEn ? 'Extension Fee Rule:' : 'เงื่อนไขส่วนต่อขยาย:'}</b>
                                    ${activeId === 1
                                        ? (isEn ? 'Traveling into extension sections (Mo Chit–Khu Khot or On Nut–Kheha) adds ฿15 (Senior ฿8). Maximum fare is capped at ฿62.' : 'การเดินทางเข้าสู่ส่วนต่อขยาย (หมอชิต–คูคต หรือ อ่อนนุช–เคหะฯ) คิดค่าโดยสารเพิ่ม 15 บาท (ผู้สูงอายุ 8 บาท) รวมค่าโดยสารสูงสุดไม่เกิน 62 บาท')
                                        : (isEn ? 'Traveling into extension section (Krung Thon Buri–Bang Wa) adds ฿15 (Senior ฿8). Maximum fare is capped at ฿62.' : 'การเดินทางเข้าสู่ส่วนต่อขยาย (กรุงธนบุรี–บางหว้า) คิดค่าโดยสารเพิ่ม 15 บาท (ผู้สูงอายุ 8 บาท) รวมค่าโดยสารสูงสุดไม่เกิน 62 บาท')
                                    }
                                </div>
                            </div>
                        `;
                    } else if (activeId === 3) {
                        // Gold Line
                        specificContent = `
                            <div class="info-card" style="background:linear-gradient(135deg,#c9a03810,#c9a03820);border-color:#c9a03855">
                                <span class="fare-badge-20" style="background:#C9A038">฿16 ${isEn ? 'Flat Rate' : 'ราคาเดียวตลอดสาย'}</span>
                                <h3 style="color:#a17c24">
                                    <span>${isEn ? 'Flat 16 Baht Fare' : 'อัตราค่าโดยสาร 16 บาท ตลอดสาย'}</span>
                                </h3>
                                <div style="font-size:12.5px;color:var(--ink);line-height:1.6">
                                    ${isEn
                                        ? 'The Gold Line operates under a single flat fare of <b>฿16</b> regardless of distance across all 3 stations (Krung Thon Buri ↔ Charoen Nakhon ↔ Khlong San).'
                                        : 'รถไฟฟ้าสายสีทองคิดค่าโดยสารอัตราเดียว <b>16 บาท</b> ตลอดสายครอบคลุมทั้ง 3 สถานี (กรุงธนบุรี ↔ เจริญนคร (ไอคอนสยาม) ↔ คลองสาน) เดินทาง 1 สถานี หรือจนสุดสายราคาเท่ากัน'
                                    }
                                </div>
                            </div>
                        `;
                    } else if (activeId === 4 || activeId === 5) {
                        // Yellow / Pink Line Monorails
                        specificContent = `
                            <div class="info-card">
                                <h3>📊 ${isEn ? 'Distance-Based Fare Tiers' : 'ตารางอัตราค่าโดยสารตามระยะทาง'}</h3>
                                <div style="font-size:12px;color:var(--muted);margin-bottom:8px">
                                    ${isEn ? 'Distance-based tariff structure starting at ฿15 up to ฿45' : 'อัตราค่าโดยสารตามระยะทางเริ่มต้น 15 บาท ถึงสูงสุด 45 บาท'}
                                </div>
                                <div class="fare-table-wrap">
                                    <table class="fare-grid-table compact-table">
                                        <thead>
                                            <tr>
                                                <th style="white-space:nowrap;">${isEn ? 'Distance Traveled' : 'ระยะทาง / สถานีที่เดินทาง'}</th>
                                                <th style="white-space:nowrap;">${isEn ? 'Fare Rate' : 'อัตราค่าโดยสาร'}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${MONORAIL_FARES.map(r => `
                                                <tr>
                                                    <td style="white-space:nowrap;"><b>${esc(isEn ? r.stnEN : r.stnTH)}</b></td>
                                                    <td style="white-space:nowrap;color:${activeLine.color}"><b>${r.price}</b></td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                                <div style="font-size:12px;color:var(--muted);margin-top:8px;line-height:1.5;">
                                    💡 <b>${isEn ? 'EMV Transfer Waiver:' : 'สิทธิประโยชน์การเปลี่ยนสาย (EMV):'}</b>
                                    ${isEn
                                        ? 'When transferring with connecting MRT or SRT lines via the same EMV Contactless card within 30 minutes, the second entry fee is waived automatically.'
                                        : 'เมื่อเดินทางเปลี่ยนสายไปยังระบบรถไฟฟ้าที่เชื่อมต่อกัน (เช่น สายสีน้ำเงิน, สายสีม่วง, สายสีแดง, ARL) ด้วยบัตร EMV ใบเดิมภายใน 30 นาที จะได้รับยกเว้นค่าแรกเข้าของสายที่สองทันที'
                                    }
                                </div>
                            </div>
                        `;
                    } else if (activeId === 101) {
                        // MRT Blue Line
                        specificContent = `
                            <div class="info-card">
                                <h3>📊 ${isEn ? 'Station Count Fare Structure' : 'ตารางอัตราค่าโดยสารตามจำนวนสถานี'}</h3>
                                <div class="fare-table-wrap">
                                    <table class="fare-grid-table compact-table">
                                        <thead>
                                            <tr>
                                                <th style="white-space:nowrap;">${isEn ? 'Stations' : 'จำนวนสถานี'}</th>
                                                <th style="white-space:nowrap;">${isEn ? 'Adult' : 'บุคคลทั่วไป'}</th>
                                                <th style="white-space:nowrap;">${isEn ? 'Student (-10%)' : 'นักเรียน/นักศึกษา (-10%)'}</th>
                                                <th style="white-space:nowrap;">${isEn ? 'Children/Senior (-50%)' : 'เด็ก/ผู้สูงอายุ (-50%)'}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${MRT_BLUE_FARES.map(r => `
                                                <tr>
                                                    <td style="white-space:nowrap;"><b>${esc(isEn ? r.stnEN : r.stnTH)}</b></td>
                                                    <td style="white-space:nowrap;color:${activeLine.color}"><b>฿${r.adult}</b></td>
                                                    <td style="white-space:nowrap;">฿${r.student}</td>
                                                    <td style="white-space:nowrap;">฿${r.senior}</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                                <div style="font-size:12px;color:var(--muted);margin-top:8px;line-height:1.5;">
                                    💡 <b>${isEn ? 'Loop Calculation Principle:' : 'หลักการคำนวณราคาเส้นทางวงกลม:'}</b>
                                    ${isEn
                                        ? 'For round trips or connecting via Tha Phra junction, the fare is always charged based on the shortest geometric distance between origin and destination.'
                                        : 'สำหรับการเดินทางในสายวงกลมหรือผ่านสถานีชุมทางท่าพระ ระบบจะคำนวณและคิดค่าโดยสารตามเส้นทางที่สั้นที่สุดเสมอ แม้ผู้โดยสารจะเลือกเดินทางผ่านทางที่ยาวกว่า'
                                    }
                                </div>
                            </div>
                        `;
                    } else if (activeId === 102 || activeId === 103) {
                        // MRT Purple or SRT Red Line
                        specificContent = `
                            <div class="info-card" style="background:linear-gradient(135deg,#dc26260d,#ef444415);border-color:#ef444444">
                                <span class="fare-badge-20">${isEn ? '20 Baht Flat Fare Policy' : 'นโยบาย 20 บาทตลอดสาย'}</span>
                                <h3 style="color:#b91c1c">
                                    <span>${isEn ? 'Government 20 Baht Maximum Cap' : 'มาตรการค่าโดยสารสูงสุด 20 บาท'}</span>
                                </h3>
                                <div style="font-size:12.5px;color:var(--ink);line-height:1.6">
                                    ${isEn
                                        ? `Passengers pay a maximum of <b>฿20</b> for any distance traveled on this line. When transferring between <b>MRT Purple Line ⇄ SRT Red Line</b> at Bang Sue / Bang Son within 30 minutes via the same EMV Contactless card, the total combined fare is capped at only <b>฿20</b>!`
                                        : `ผู้โดยสารเดินทางด้วยค่าโดยสารสูงสุด <b>ไม่เกิน 20 บาท</b> ตลอดสาย (ราคาปกติตามระยะทางคือ ฿${activeLine.minFare} - ฿20 หากคำนวณเกิน 20 บาทจะคิดเพียง 20 บาท) และเมื่อแตะเปลี่ยนขบวนระหว่าง <b>สายสีม่วง ⇄ สายสีแดง</b> ที่สถานีบางซื่อ/บางซ่อน ภายใน 30 นาทีด้วยบัตร EMV ใบเดิม รวมค่าเดินทางทั้ง 2 สายสูงสุดไม่เกิน <b>20 บาท</b> เช่นกัน`
                                    }
                                </div>
                            </div>
                        `;
                    } else if (activeId === 104) {
                        // ARL
                        specificContent = `
                            <div class="info-card">
                                <h3>📊 ${isEn ? 'Airport Rail Link Station Fare Matrix' : 'อัตราค่าโดยสารสถานี แอร์พอร์ต เรล ลิงก์ (จากพญาไท)'}</h3>
                                <div class="fare-table-wrap">
                                    <table class="fare-grid-table compact-table">
                                        <thead>
                                            <tr>
                                                <th style="white-space:nowrap;">${isEn ? 'Station' : 'สถานี'}</th>
                                                <th style="white-space:nowrap;">${isEn ? 'From Phaya Thai (A8)' : 'ราคาจากพญาไท (A8)'}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${ARL_STATION_FARES.map(r => `
                                                <tr>
                                                    <td style="white-space:nowrap;">
                                                        <span class="stn-code-badge" style="background:${activeLine.color};margin-right:6px;">${r.code}</span>
                                                        <b>${esc(isEn ? r.en : r.th)}</b>
                                                    </td>
                                                    <td style="white-space:nowrap;color:${activeLine.color}"><b>${r.price}</b></td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                                <div style="font-size:12px;color:var(--muted);margin-top:8px;">
                                    ✈️ ${isEn ? 'Express travel from downtown (Phaya Thai) direct to Suvarnabhumi Airport in just 26 minutes for only ฿45.' : 'เดินทางจากใจกลางเมือง (พญาไท) ตรงสู่สนามบินสุวรรณภูมิ รวดเร็วเพียง 26 นาที ในราคา 45 บาท'}
                                </div>
                            </div>
                        `;
                    }

                    bodyHtml = `
                        <!-- Line Hero Card -->
                        <div class="line-hero-card" style="border-left:5px solid ${activeLine.color}">
                            <div class="line-hero-header" style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
                                <div style="display:flex;align-items:center;gap:10px;min-width:0;">
                                    ${getLineIconSvg(activeLine.id, false, 28)}
                                    <div style="min-width:0;">
                                        <div style="font-size:16.5px;font-weight:800;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(lineName)}</div>
                                        <div style="font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(operator)} · ${esc(terminus)}</div>
                                    </div>
                                </div>
                                <button type="button" class="btn btn-ghost" style="padding:5px 10px;font-size:11.5px;margin-left:auto;white-space:nowrap;flex-shrink:0;" onclick="App.setFaresLine(0)">
                                    ${isEn ? 'View All Lines' : 'ดูทุกสาย'} ↺
                                </button>
                            </div>

                            <div class="line-metrics-grid">
                                <div class="line-metric-box">
                                    <div class="label">${isEn ? 'Starting Fare' : 'ราคาเริ่มต้น'}</div>
                                    <div class="val" style="color:${activeLine.color}">฿${activeLine.minFare}</div>
                                </div>
                                <div class="line-metric-box">
                                    <div class="label">${isEn ? 'Maximum Fare' : 'ราคาสูงสุด'}</div>
                                    <div class="val" style="color:${activeLine.color}">฿${activeLine.maxFare}</div>
                                </div>
                                <div class="line-metric-box full-col">
                                    <div class="label">${isEn ? 'Pricing Basis' : 'การคำนวณราคา'}</div>
                                    <div class="val">${esc(isEn ? activeLine.pricingModelEN : activeLine.pricingModelTH)}</div>
                                </div>
                                <div class="line-metric-box full-col">
                                    <div class="label">${isEn ? 'Tickets & Cards' : 'บัตรโดยสารที่รองรับ'}</div>
                                    <div class="val" style="color:var(--muted);">${esc(isEn ? activeLine.ticketsEN : activeLine.ticketsTH)}</div>
                                </div>
                            </div>
                        </div>

                        ${specificContent}

                        <!-- Action Button to Switch to Timetables of this Line -->
                        <div style="text-align:center;margin:16px 0 6px;">
                            <button type="button" class="btn btn-primary" style="background:${activeLine.color};border-color:${activeLine.color};box-shadow:0 4px 14px ${activeLine.color}40;display:inline-flex;align-items:center;gap:8px;white-space:nowrap;padding:11px 22px;max-width:100%;"
                                onclick="App.switchView('timetables');App.setTimetablesLine(${activeLine.id})">
                                <span>⏰ ${isEn ? 'View Timetables of This Line' : 'ดูเวลาเดินรถ & ความถี่สายนี้'}</span>
                                <span>➔</span>
                            </button>
                        </div>
                    `;
                }

                el.innerHTML = `
                    <div style="margin-bottom:12px;">
                        <h2 style="font-size:18px;font-weight:800;color:var(--ink);margin:0 0 4px;display:flex;align-items:center;gap:8px;">
                            <span>💰</span>
                            <span>${T('faresTitle')}</span>
                        </h2>
                        <div style="font-size:12px;color:var(--muted)">
                            ${isEn ? 'Select a transit line below to view fare rates, pricing models, and payment methods' : 'เลือกสายรถไฟฟ้าด้านล่าง เพื่อดูอัตราค่าโดยสาร โครงสร้างราคา และบัตรโดยสารที่รองรับ'}
                        </div>
                    </div>
                    ${renderLineFilterBar(activeId, 'setFaresLine')}
                    ${bodyHtml}
                `;
            },

            /* ---------- THE SKYTRAINs: Timetables View (เวลาเดินรถ & ความถี่ตามสาย) ---------- */
            renderTimetablesView() {
                const el = document.getElementById('timetablesViewContent');
                if (!el) return;

                const isEn = lang === 'en';
                const activeId = this.timetablesActiveLine || 0;
                const activeLine = TRANSIT_LINES_CATALOG.find(l => l.id === activeId) || TRANSIT_LINES_CATALOG[0];

                let bodyHtml = '';

                if (activeId === 0) {
                    // ทั้งหมด (All Lines Timetables Overview)
                    bodyHtml = `
                        <!-- All Lines Timetable Summary Table -->
                        <div class="info-card">
                            <h3 style="display:flex;align-items:center;gap:8px">
                                <span>⏰</span>
                                <span>${isEn ? 'First & Last Train Timetables across 10 Lines' : 'ตารางเวลาเดินรถขบวนแรกและขบวนสุดท้าย 10 สาย'}</span>
                            </h3>
                            <div style="font-size:12px;color:var(--muted);margin-bottom:8px">
                                ${isEn ? 'Tap any line below or use the pills above to view official frequency schedule table' : 'แตะที่สายรถไฟฟ้าหรือแถบด้านบนเพื่อดูตารางความถี่การเดินรถแบบละเอียด'}
                            </div>
                            <div class="fare-table-wrap">
                                <table class="fare-grid-table">
                                    <thead>
                                        <tr>
                                            <th>${isEn ? 'Line' : 'สายรถไฟฟ้า'}</th>
                                            <th>${isEn ? 'First Train' : 'ขบวนแรก'}</th>
                                            <th>${isEn ? 'Last Train' : 'ขบวนสุดท้าย'}</th>
                                            <th>${isEn ? 'Peak Frequency' : 'ความถี่ช่วงเร่งด่วน'}</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${TRANSIT_LINES_CATALOG.filter(l => l.id !== 0).map(l => `
                                            <tr style="cursor:pointer;" onclick="App.setTimetablesLine(${l.id})">
                                                <td style="white-space:nowrap;">
                                                    <span style="display:inline-flex;align-items:center;gap:6px;white-space:nowrap;">
                                                        ${getLineIconSvg(l.id, false, 16)}
                                                        <b>${esc(isEn ? l.nameEN : l.nameTH)}</b>
                                                    </span>
                                                </td>
                                                <td style="white-space:nowrap;"><b>${esc(isEn ? l.firstTrainEN : l.firstTrainTH)}</b></td>
                                                <td style="white-space:nowrap;"><b>${esc(isEn ? l.lastTrainEN : l.lastTrainTH)}</b></td>
                                                <td style="white-space:nowrap;color:${l.color}"><b>${esc(isEn ? l.peakFreqEN : l.peakFreqTH)}</b></td>
                                                <td style="white-space:nowrap;">
                                                    <button type="button" class="btn btn-ghost" style="padding:4px 8px;font-size:11px;white-space:nowrap;" onclick="event.stopPropagation();App.setTimetablesLine(${l.id})">
                                                        ${isEn ? 'Timetable' : 'ดูตาราง'} ➔
                                                    </button>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- General Operating Tips -->
                        <div class="info-card">
                            <h3>ℹ️ ${isEn ? 'Bangkok Transit Operating Guidelines' : 'ข้อแนะนำเวลาการให้บริการและการเดินทาง'}</h3>
                            <div style="font-size:12.5px;color:var(--ink);line-height:1.6">
                                <ul style="margin:0;padding-left:16px;">
                                    <li style="margin-bottom:6px">
                                        <b>${isEn ? 'Morning Services:' : 'เวลาเปิดให้บริการตอนเช้า:'}</b>
                                        ${isEn ? 'SRT Red Line starts earliest at 05:00, BTS at 05:15-05:30, ARL at 05:30, and MRT lines at 05:30-06:00.' : 'SRT สายสีแดงเปิดให้บริการเร็วที่สุดตั้งแต่ 05:00 น., BTS เริ่ม 05:15–05:30 น., ARL เริ่ม 05:30 น. และ MRT สายต่างๆ เริ่ม 05:30–06:00 น.'}
                                    </li>
                                    <li style="margin-bottom:6px">
                                        <b>${isEn ? 'Night Closing:' : 'เวลาปิดให้บริการตอนกลางคืน:'}</b>
                                        ${isEn ? 'All transit lines close between 24:00 (Midnight) and 00:30.' : 'ทุกสายสิ้นสุดการให้บริการประมาณ 24:00 น. (เที่ยงคืน) ถึง 00:30 น.'}
                                    </li>
                                    <li>
                                        <b>${isEn ? 'Connecting Trains:' : 'คำแนะนำสำหรับผู้โดยสารที่ต้องเปลี่ยนสาย:'}</b>
                                        ${isEn ? 'For late night journeys requiring interchanges, plan to reach transfer stations before 23:30 to avoid missing the final train.' : 'ในเที่ยวเดินทางรอบดึกที่ต้องเปลี่ยนสาย ควรเดินทางถึงสถานีเปลี่ยนสายก่อน 23:30 น. เพื่อให้ทันขบวนสุดท้ายของอีกสาย'}
                                    </li>
                                </ul>
                            </div>
                        </div>
                    `;
                } else {
                    // ข้อมูลเวลาเดินรถเฉพาะสาย (Specific Line Timetable)
                    const lineName = isEn ? activeLine.nameEN : activeLine.nameTH;
                    const operator = isEn ? activeLine.operatorEN : activeLine.operatorTH;

                    // Parse terminus with compact station badges
                    const tRaw = isEn ? activeLine.terminusEN : activeLine.terminusTH;
                    const tParts = tRaw.split('–').map(s => s.trim());
                    let terminusHtml = '';
                    if (tParts.length === 2) {
                        const t1 = parseStationCodeAndName(tParts[0]);
                        const t2 = parseStationCodeAndName(tParts[1]);
                        terminusHtml = `
                            <span style="display:inline-flex;align-items:center;gap:4px;vertical-align:middle;">
                                ${t1.code ? `<span class="stn-code-badge" style="background:${activeLine.color}">${esc(t1.code)}</span>` : ''}
                                <span>${esc(t1.name)}</span>
                                <span style="color:var(--muted)">⇄</span>
                                ${t2.code ? `<span class="stn-code-badge" style="background:${activeLine.color}">${esc(t2.code)}</span>` : ''}
                                <span>${esc(t2.name)}</span>
                            </span>
                        `;
                    } else {
                        terminusHtml = esc(tRaw);
                    }

                    // Parse terminal directions with compact station badges
                    const d1 = parseStationCodeAndName(isEn ? activeLine.dir1.toEN || activeLine.dir1.toTH : activeLine.dir1.toTH);
                    const d2 = parseStationCodeAndName(isEn ? activeLine.dir2.toEN || activeLine.dir2.toTH : activeLine.dir2.toTH);

                    // คำนวณความถี่สด
                    const liveFreq = getCurrentMrtFreq(activeLine.id);
                    let liveFreqHtml = '';
                    if (liveFreq) {
                        const cleanLabel = String(liveFreq.label || '').replace(/^~/, '');
                        liveFreqHtml = `
                            <div style="display:inline-flex;align-items:center;gap:6px;background:#22c55e18;color:#16a34a;padding:5px 12px;border-radius:20px;font-size:12px;font-weight:700;white-space:nowrap;">
                                <span class="live-dot" style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#16a34a;animation:pulse 1.5s infinite;"></span>
                                <span>${isEn ? `Current Headway: ~${cleanLabel} min` : `ความถี่ขณะนี้: รถมาทุก ~${cleanLabel} นาที`}</span>
                            </div>
                        `;
                    } else {
                        liveFreqHtml = `
                            <div style="display:inline-flex;align-items:center;gap:6px;background:var(--line);color:var(--muted);padding:5px 12px;border-radius:20px;font-size:12px;font-weight:600;white-space:nowrap;">
                                <span>⚪ ${isEn ? 'Currently Out of Service Hours' : 'ขณะนี้นอกเวลาให้บริการ'}</span>
                            </div>
                        `;
                    }

                    // ขบวนแรก-สุดท้ายแยกทิศทาง พร้อมป้ายรหัสสถานีขนาดกะทัดรัด
                    const dirCards = `
                        <div class="dir-timetables-grid">
                            <div class="dir-time-card">
                                <div class="dir-title">
                                    <span style="font-size:11.5px;color:var(--muted);">${isEn ? 'Towards' : 'ทิศทางมุ่งหน้า'}</span>
                                    ${d1.code ? `<span class="stn-code-badge" style="background:${activeLine.color}">${esc(d1.code)}</span>` : ''}
                                    <b style="color:var(--ink);">${esc(d1.name)}</b>
                                </div>
                                <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:13px;white-space:nowrap;">
                                    <div style="white-space:nowrap;"><span style="font-size:11px;color:var(--muted)">${isEn ? 'First Train:' : 'ขบวนแรก:'}</span> <b style="color:${activeLine.color}">${activeLine.dir1.first} น.</b></div>
                                    <div style="white-space:nowrap;"><span style="font-size:11px;color:var(--muted)">${isEn ? 'Last Train:' : 'ขบวนสุดท้าย:'}</span> <b>${activeLine.dir1.last} น.</b></div>
                                </div>
                            </div>
                            <div class="dir-time-card">
                                <div class="dir-title">
                                    <span style="font-size:11.5px;color:var(--muted);">${isEn ? 'Towards' : 'ทิศทางมุ่งหน้า'}</span>
                                    ${d2.code ? `<span class="stn-code-badge" style="background:${activeLine.color}">${esc(d2.code)}</span>` : ''}
                                    <b style="color:var(--ink);">${esc(d2.name)}</b>
                                </div>
                                <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:13px;white-space:nowrap;">
                                    <div style="white-space:nowrap;"><span style="font-size:11px;color:var(--muted)">${isEn ? 'First Train:' : 'ขบวนแรก:'}</span> <b style="color:${activeLine.color}">${activeLine.dir2.first} น.</b></div>
                                    <div style="white-space:nowrap;"><span style="font-size:11px;color:var(--muted)">${isEn ? 'Last Train:' : 'ขบวนสุดท้าย:'}</span> <b>${activeLine.dir2.last} น.</b></div>
                                </div>
                            </div>
                        </div>
                    `;

                    // ตารางความถี่ทางการ
                    const sched = getLineScheduleTables(activeLine.id);
                    const schedTablesHtml = renderFrequencyTablesHtml(sched);

                    // รายชื่อสถานีประจำสายพร้อมป้ายรหัสสถานีขนาดกะทัดรัด
                    const lineStations = getLineStationsList(activeLine.id);
                    let stnDirectoryHtml = '';
                    if (lineStations && lineStations.length > 0) {
                        stnDirectoryHtml = `
                            <div class="info-card">
                                <div style="display:flex;align-items:center;justify-content:space-between;cursor:pointer;" onclick="App.toggleTimetableStations()">
                                    <h3 style="margin:0;display:flex;align-items:center;gap:8px;">
                                        <span>🚉</span>
                                        <span>${isEn ? `Stations on Line (${lineStations.length})` : `รายชื่อสถานี & รหัสสถานีในสายนี้ (${lineStations.length} สถานี)`}</span>
                                    </h3>
                                    <span id="stnListChev" style="font-size:12px;color:var(--muted);transition:transform .2s ease;">▼</span>
                                </div>
                                <div id="stnListBody" style="display:none;margin-top:10px;">
                                    <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(140px, 1fr));gap:6px;">
                                        ${lineStations.map(s => {
                                            const sKey = s.StationKey;
                                            const sTh = s.StationNameTH || (s.StationName ? s.StationName.split('|')[0].trim() : '');
                                            const sEn = s.StationNameEN || s.StationName_EN || '';
                                            return `
                                                <div style="display:flex;align-items:center;gap:6px;background:var(--bg-subtle);padding:6px 8px;border-radius:6px;border:1px solid var(--line);white-space:nowrap;overflow:hidden;">
                                                    <span class="stn-code-badge" style="background:${activeLine.color}">${esc(sKey)}</span>
                                                    <div style="overflow:hidden;text-overflow:ellipsis;min-width:0;">
                                                        <div style="font-size:12px;font-weight:700;color:var(--ink);overflow:hidden;text-overflow:ellipsis;">${esc(isEn ? sEn || sTh : sTh)}</div>
                                                    </div>
                                                </div>
                                            `;
                                        }).join('')}
                                    </div>
                                </div>
                            </div>
                        `;
                    }

                    bodyHtml = `
                        <!-- Line Hero Card -->
                        <div class="line-hero-card" style="border-left:5px solid ${activeLine.color}">
                            <div class="line-hero-header" style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
                                <div style="display:flex;align-items:center;gap:10px;min-width:0;">
                                    ${getLineIconSvg(activeLine.id, false, 28)}
                                    <div style="min-width:0;">
                                        <div style="font-size:16.5px;font-weight:800;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(lineName)}</div>
                                        <div style="font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(operator)} · ${terminusHtml}</div>
                                    </div>
                                </div>
                                <button type="button" class="btn btn-ghost" style="padding:5px 10px;font-size:11.5px;margin-left:auto;white-space:nowrap;flex-shrink:0;" onclick="App.setTimetablesLine(0)">
                                    ${isEn ? 'View All Lines' : 'ดูทุกสาย'} ↺
                                </button>
                            </div>

                            <div style="margin:8px 0 12px;">
                                ${liveFreqHtml}
                            </div>

                            <div class="line-metrics-grid">
                                <div class="line-metric-box">
                                    <div class="label" style="white-space:nowrap;">${isEn ? 'First Train Service' : 'เวลาขบวนแรก'}</div>
                                    <div class="val" style="color:${activeLine.color};white-space:nowrap;">${esc(isEn ? activeLine.firstTrainEN : activeLine.firstTrainTH)}</div>
                                </div>
                                <div class="line-metric-box">
                                    <div class="label" style="white-space:nowrap;">${isEn ? 'Last Train Service' : 'เวลาขบวนสุดท้าย'}</div>
                                    <div class="val" style="white-space:nowrap;">${esc(isEn ? activeLine.lastTrainEN : activeLine.lastTrainTH)}</div>
                                </div>
                                <div class="line-metric-box">
                                    <div class="label" style="white-space:nowrap;">${isEn ? 'Peak Hour Headway' : 'ความถี่ช่วงเร่งด่วน'}</div>
                                    <div class="val" style="font-size:13px;color:${activeLine.color};white-space:nowrap;">${esc(isEn ? activeLine.peakFreqEN : activeLine.peakFreqTH)}</div>
                                </div>
                                <div class="line-metric-box">
                                    <div class="label" style="white-space:nowrap;">${isEn ? 'Off-Peak Headway' : 'ความถี่ช่วงปกติ'}</div>
                                    <div class="val" style="font-size:13px;white-space:nowrap;">${esc(isEn ? activeLine.offPeakFreqEN : activeLine.offPeakFreqTH)}</div>
                                </div>
                            </div>
                        </div>

                        <!-- Terminal Directions Timetable -->
                        <div class="info-card">
                            <h3>🧭 ${isEn ? 'First & Last Train by Terminal Direction' : 'เวลาขบวนแรกและขบวนสุดท้ายแยกตามทิศทาง'}</h3>
                            ${dirCards}
                        </div>

                        <!-- Official Frequency Schedule Tables -->
                        <div class="info-card">
                            <h3>🗓️ ${isEn ? 'Official Headway Frequency Schedule' : 'ตารางความถี่การเดินรถอย่างเป็นทางการ'}</h3>
                            <div style="font-size:12px;color:var(--muted);margin-bottom:6px">
                                ${isEn ? 'Row highlighted in green indicates current operational time slot' : 'แถบสีเขียวแสดงช่วงเวลาเดินรถที่กำลังให้บริการอยู่ ณ ขณะนี้'}
                            </div>
                            ${schedTablesHtml}
                        </div>

                        ${stnDirectoryHtml}

                        <!-- Action Button to Switch to Fares of this Line -->
                        <div style="text-align:center;margin:16px 0 6px;">
                            <button type="button" class="btn btn-primary" style="background:${activeLine.color};border-color:${activeLine.color};box-shadow:0 4px 14px ${activeLine.color}40;display:inline-flex;align-items:center;gap:8px;white-space:nowrap;padding:11px 22px;max-width:100%;"
                                onclick="App.switchView('fares');App.setFaresLine(${activeLine.id})">
                                <span>💳 ${isEn ? 'Check Fares of This Line' : 'เช็คอัตราค่าโดยสารสายนี้'}</span>
                                <span>➔</span>
                            </button>
                        </div>
                    `;
                }

                el.innerHTML = `
                    <div style="margin-bottom:12px;">
                        <h2 style="font-size:18px;font-weight:800;color:var(--ink);margin:0 0 4px;display:flex;align-items:center;gap:8px;">
                            <span>⏰</span>
                            <span>${T('timetablesTitle')}</span>
                        </h2>
                        <div style="font-size:12px;color:var(--muted)">
                            ${isEn ? 'Select a transit line below to view first & last trains and official frequency schedules' : 'เลือกสายรถไฟฟ้าด้านล่าง เพื่อดูเวลาขบวนแรก ขบวนสุดท้าย และตารางความถี่การเดินรถ'}
                        </div>
                    </div>
                    ${renderLineFilterBar(activeId, 'setTimetablesLine')}
                    ${bodyHtml}
                `;
            },



            /* ---------- theme (dark mode) ---------- */
            setTheme(t) {
                const cur = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
                const next = t || (cur === 'dark' ? 'light' : 'dark');
                document.documentElement.classList.toggle('dark', next === 'dark');
                try { localStorage.setItem('bts_theme', next); } catch (e) { }
                this.updateThemeBtn();
            },

            updateThemeBtn() {
                const b = document.getElementById('themeBtn');
                if (b) b.textContent = document.documentElement.classList.contains('dark') ? '☀️' : '🌙';
            },

            /* ---------- language ---------- */
            setLang(l) {
                lang = l || (lang === 'th' ? 'en' : 'th');
                localStorage.setItem('bts_lang', lang);
                this.applyStaticLang();
                this.renderTabs();
                this.renderNearest();
                this.renderNearestExit();
                this.renderStrip();
                this.renderTraffic();
                this.renderJourney();
                this.renderInteractiveMap(true);
                this.renderFaresView();
                this.renderTimetablesView();
                this.renderQuickHubChips();
                this.renderExitsView(this.selectedExitKey);
                if (this.journey.picking) this.renderPicker();
            },

            // ข้อความ static นอก render functions (header / search / footer / ปุ่ม)
            applyStaticLang() {
                if (document.documentElement) document.documentElement.lang = lang;
                const set = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
                const setAttr = (id, attr, val) => { const el = document.getElementById(id); if (el) el.setAttribute(attr, val); };

                // Header & Brand
                set('appTitle', T('appName'));
                set('subTitle', T('sub'));
                set('affiliationNote', T('affiliation'));
                set('langBtn', T('langBtn'));

                // Home view
                set('nearestTitle', T('nearestTitle'));
                set('relocateBtn', '🧭 ' + T('relocate'));
                set('homePlannerTitle', T('homeJourneyTitle'));
                set('homePlannerSub', T('homeJourneySub'));
                set('homePlannerBtn', T('homeJourneyBtn'));

                const si = document.getElementById('searchInput');
                if (si) si.placeholder = T('searchPh');

                // Map view
                set('mapTitle', T('mapTitle'));
                set('mapZoomInBtn', T('mapZoomIn'));
                set('mapZoomOutBtn', T('mapZoomOut'));
                set('mapResetBtn', T('mapReset'));
                set('mapHintCard', T('mapHint'));

                // Map action sheet
                set('sheetOriginTitle', T('sheetOrigin'));
                set('sheetOriginSub', T('sheetOriginSub'));
                set('sheetDestTitle', T('sheetDest'));
                set('sheetDestSub', T('sheetDestSub'));
                set('sheetExitsTitle', T('sheetExits'));
                set('sheetExitsSub', T('sheetExitsSub'));
                set('sheetLiveTitle', T('sheetLive'));
                set('sheetLiveSub', T('sheetLiveSub'));

                // Planner view
                set('plannerHubTitle', T('plannerHubTitle'));

                // Exits view
                set('nearestExitTitle', T('nearestExitTitle') || (lang === 'th' ? 'ทางออกใกล้คุณที่สุด' : 'Nearest Exit to You'));
                set('exitRelocateBtn', '🧭 ' + T('relocate'));
                set('exitCardTitle', T('exitCardTitle'));
                set('exitCardSub', T('exitCardSub'));
                const esb = document.getElementById('exitSearchBox');
                if (esb) esb.placeholder = T('exitSearchPh');

                // Bottom Nav Dock
                set('navLblHome', T('navHome'));
                set('navLblMap', T('navMap'));
                set('navLblPlanner', T('navPlanner'));
                set('navLblFares', T('navFares'));
                set('navLblTimetables', T('navTimetables'));
                setAttr('tab-home', 'aria-label', T('navHome'));
                setAttr('tab-map', 'aria-label', T('navMap'));
                setAttr('tab-planner', 'aria-label', T('navPlanner'));
                setAttr('tab-fares', 'aria-label', T('navFares'));
                setAttr('tab-timetables', 'aria-label', T('navTimetables'));

                // Nearest Station Popup Modal
                set('nearestPopupTitle', T('popupTitle'));
                set('nearestPopupSub', T('popupSub'));
                set('nearestPopupDistLbl', T('popupDist'));
                set('nearestPopupPlatTitle', T('popupPlatTitle'));
                set('nearestPopupPlatSub', T('popupPlatSub'));
                set('nearestPopupActionLbl', T('popupAction'));
                set('nearestPopupDismissLbl', T('popupDismiss'));

                // Footer
                set('footerNote', T('footer'));
            },

            async init() {
                this.applyStaticLang();
                this.updateThemeBtn();   // ธีมถูกตั้งไว้แล้วจากสคริปต์ใน <head> — ปรับไอคอนปุ่มให้ตรง
                this.startClock();
                try {
                    localStorage.removeItem('bkk_geofence_enabled');
                    localStorage.removeItem('bkk_geofence_radius');
                } catch (e) {}
                if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.addEventListener('message', (event) => {
                        if (event.data && event.data.action === 'openStation' && event.data.stationKey) {
                            this.handleNotificationOpen(event.data.stationKey);
                        }
                    });
                }
                document.getElementById('searchInput').addEventListener('input', () => this.renderStrip());
                document.addEventListener('visibilitychange', () => {
                    if (!document.hidden) this.refreshAll();
                });
                document.addEventListener('click', (e) => {
                    const container = document.getElementById('exitDropdownContainer');
                    if (container && !container.contains(e.target) && this.exitDropdownOpen) {
                        this.closeExitDropdown();
                    }
                });
                try {
                    this.lines = await fetchStationList();
                } catch (e) {
                    document.getElementById('strip').innerHTML =
                        `<div class="err-box" style="margin:14px">${T('loadStationsFail')}
                         <button class="btn btn-ghost" onclick="location.reload()">${T('retry')}</button></div>`;
                    return;
                }
                const allLines = [...this.lines, ...MRT_STATIC_DB.lines];
                this.lineById = Object.fromEntries(allLines.map(l => [l.LineId, l]));
                const seen = new Set();
                this.uniqueStations = allLines.flatMap(l => l.StationList)
                    .filter(s => s.Latitude && s.Longitude && !seen.has(s.StationKey) && seen.add(s.StationKey));
                this.keyLines = {};
                for (const l of this.lines)
                    for (const s of l.StationList)
                        (this.keyLines[s.StationKey] ??= []).push({ lineId: l.LineId, color: l.LineColor });
                for (const l of MRT_STATIC_DB.lines)
                    for (const s of l.StationList)
                        (this.keyLines[s.StationKey] ??= []).push({ lineId: l.LineId, color: l.LineColor });
                this.buildConnections();
                this.applyUrl();      // deep link: เปิดสาย/สถานี/เส้นทางตาม hash ที่แชร์มา
                this.renderJourney();
                this.renderTabs();
                this.renderExitsView();
                this.renderInteractiveMap();
                this.renderFaresView();
                this.renderTimetablesView();
                this.renderStrip();
                const initialView = new URLSearchParams(location.search).get('view');
                if (initialView) this.switchView(initialView);
                if (window.addEventListener) window.addEventListener('hashchange', () => this.onHashChange());
                if (this.expandedKey) {
                    const deepSt = this.findStation(this.expandedKey);
                    if (deepSt) this.loadArrivals(deepSt);
                    requestAnimationFrame(() => {
                        document.querySelector(`[id^="row-${CSS.escape(this.expandedKey)}-"]`)
                            ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    });
                }
                if (this.journey.from && this.journey.to) this.findRoute();

                // โหลดพิกัด/สถานีล่าสุดที่เคยบันทึกไว้ (เปิดแอปปุ๊บเจอทันที 0 วินาที ไม่ต้องรอ GPS)
                const saved = this.loadSavedPosition();
                if (saved) {
                    this.userPos = { lat: saved.lat, lon: saved.lon, calibrated: saved.calibrated };
                    this.computeNearest();
                    if (saved.stationKey && this.findStation(saved.stationKey)) {
                        this.pinnedKey = saved.stationKey;
                        this.selectedExitKey = saved.stationKey;
                        const savedSt = this.findStation(saved.stationKey);
                        if (savedSt) {
                            this.syncLineToStation(savedSt, true);
                            this.loadArrivals(savedSt);
                        }
                        this.renderNearest();
                        this.renderNearestExit();
                    }
                }

                // แสดงสถานีสำรองทันทีหากยังไม่มีข้อมูลที่บันทึกไว้ (UI พร้อมใช้งานทันที 0ms)
                if (!saved) {
                    this.useFallbackStation();
                }

                // เรียกค้นหาสถานีใกล้คุณที่สุด (GPS) ทันทีเสมอ ทั้งบน Web Browser และ Android APK
                this.locate(false);

                this.loadTraffic();   // สถานะการเดินรถ (ฟีเจอร์เสริม — พังก็ไม่กระทบส่วนอื่น)
                this.initScrollNav(); // ซ่อนปุ่มนำทางเมื่อเลื่อนขึ้น / แสดงเมื่อเลื่อนลง

                // จัดการวงจรชีวิตแอป: ตรวจจับเมื่อพับหรือเปิดแอปกลับมา (Folded / Background / Resume)
                document.addEventListener('visibilitychange', () => {
                    if (document.hidden) {
                        this.onAppPaused();
                    } else {
                        this.onAppResume();
                    }
                });
                window.addEventListener('focus', () => {
                    this.onAppResume();
                });

                this.refreshTimer = setInterval(() => this.refreshAll(), REFRESH_MS);
                setInterval(() => this.loadTraffic(), TRAFFIC_REFRESH_MS);
                setInterval(() => this.tickCountdowns(), TICK_MS);
            },

            triggerReload() {
                if (this._isReloading) return;
                this._isReloading = true;
                const topBar = document.getElementById('pullToRefreshBar');
                if (topBar) {
                    topBar.classList.add('visible', 'refreshing');
                    const t = topBar.querySelector('.pull-refresh-text');
                    if (t) t.textContent = lang === 'en' ? '🔄 Reloading...' : '🔄 กำลังรีโหลดหน้าเว็บ...';
                }
                if (navigator.vibrate) try { navigator.vibrate(25); } catch(e) {}
                setTimeout(() => {
                    window.location.reload();
                }, 220);
            },

            initScrollNav() {
                // 1. Dynamic Auto-Hide Bottom Navigation on Scroll ("เลื่อนขึ้นซ่อน เลื่อนลงแสดง")
                let lastScrollY = window.pageYOffset || document.documentElement.scrollTop;
                let scrollTicking = false;
                const nav = document.querySelector('.bottom-nav');

                window.addEventListener('scroll', () => {
                    if (!scrollTicking) {
                        window.requestAnimationFrame(() => {
                            const currentScrollY = window.pageYOffset || document.documentElement.scrollTop;
                            const diff = currentScrollY - lastScrollY;

                            // หากอยู่ใกล้ด้านบนสุด ให้แสดงแถบนำทางเสมอ
                            if (currentScrollY <= 24) {
                                nav?.classList.remove('nav-hidden');
                            } else if (diff > 8) {
                                // นิ้วปัดขึ้น / เนื้อหาเลื่อนลง ("เลื่อนหน้าจอขึ้น" -> ซ่อนปุ่มนำทางเพื่อขยายพื้นที่ดูข้อมูล)
                                nav?.classList.add('nav-hidden');
                            } else if (diff < -8) {
                                // นิ้วปัดลง / เนื้อหาเลื่อนขึ้น ("เลื่อนหน้าจอลง" -> แสดงปุ่มนำทางปกติ)
                                nav?.classList.remove('nav-hidden');
                            }

                            lastScrollY = Math.max(0, currentScrollY);
                            scrollTicking = false;
                        });
                        scrollTicking = true;
                    }
                }, { passive: true });

                // 2. Touch Pull-To-Refresh at Top
                let startY = 0;
                let pullDistance = 0;
                let isPullingTop = false;
                const topIndicator = document.getElementById('pullToRefreshBar');

                window.addEventListener('touchstart', (e) => {
                    if (e.touches.length !== 1) return;
                    startY = e.touches[0].clientY;
                    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
                    isPullingTop = (scrollY <= 2);
                    pullDistance = 0;
                }, { passive: true });

                window.addEventListener('touchmove', (e) => {
                    if (!isPullingTop) return;
                    const currentY = e.touches[0].clientY;
                    const dy = currentY - startY;

                    if (isPullingTop && dy > 0) {
                        // ดึงหน้าจอลงมาจากด้านบนสุด
                        pullDistance = Math.min(100, dy * 0.45);
                        if (topIndicator) {
                            topIndicator.style.transform = `translateY(${pullDistance}px)`;
                            topIndicator.classList.add('visible');
                            const icon = topIndicator.querySelector('.pull-refresh-icon');
                            const text = topIndicator.querySelector('.pull-refresh-text');
                            if (icon) icon.style.transform = `rotate(${pullDistance * 4}deg)`;
                            if (text) text.textContent = pullDistance >= 45 ? (lang === 'en' ? 'Release to reload...' : 'ปล่อยเพื่อรีโหลดหน้าเว็บ...') : (lang === 'en' ? 'Pull down to reload' : 'เลื่อนลงเพื่อรีโหลด');
                        }
                    }
                }, { passive: true });

                window.addEventListener('touchend', () => {
                    if (isPullingTop && pullDistance >= 45) {
                        if (topIndicator) {
                            topIndicator.classList.add('refreshing');
                            const text = topIndicator.querySelector('.pull-refresh-text');
                            if (text) text.textContent = lang === 'en' ? '🔄 Reloading...' : '🔄 กำลังรีโหลดหน้าเว็บ...';
                        }
                        this.triggerReload();
                    } else {
                        if (topIndicator) {
                            topIndicator.style.transform = '';
                            topIndicator.classList.remove('visible');
                        }
                    }
                    isPullingTop = false;
                    pullDistance = 0;
                }, { passive: true });
            },

            /* ---------- clock ---------- */
            startClock() {
                const f = () => {
                    const n = new Date(), loc = T('clockLocale');
                    document.getElementById('clockT').textContent =
                        n.toLocaleTimeString(loc, { hour12: false });
                    document.getElementById('clockD').textContent =
                        n.toLocaleDateString(loc, { weekday: 'short', day: 'numeric', month: 'short' });
                };
                f();
                setInterval(f, 1000);
            },

            /* ---------- connections (สถานีต่างสายที่อยู่ใกล้กัน = จุดเชื่อมต่อ) ---------- */
            buildConnections() {
                this.connections = {};
                const flat = [];
                for (const l of this.lines)
                    for (const s of l.StationList)
                        if (s.Latitude && s.Longitude) flat.push({ s, l });
                for (let i = 0; i < flat.length; i++) {
                    for (let j = i + 1; j < flat.length; j++) {
                        const a = flat[i], b = flat[j];
                        // สถานี key เดียวกันคนละสาย (สยาม CEN อยู่ทั้งสุขุมวิท+สีลม) ก็คือจุดเปลี่ยนสาย
                        if (a.l.LineId === b.l.LineId) continue;
                        if (haversineKm(a.s.Latitude, a.s.Longitude, b.s.Latitude, b.s.Longitude) > 0.35) continue;
                        (this.connections[a.s.StationKey] ??= [])
                            .push({ key: b.s.StationKey, lineId: b.l.LineId, color: b.l.LineColor });
                        (this.connections[b.s.StationKey] ??= [])
                            .push({ key: a.s.StationKey, lineId: a.l.LineId, color: a.l.LineColor });
                    }
                }

                // ดึงข้อมูลเชื่อมต่อเปลี่ยนสายของ MRT จากตาราง transfers
                for (const [keyA, keyB] of MRT_STATIC_DB.transfers) {
                    const linesA = this.keyLines[keyA] || [];
                    const linesB = this.keyLines[keyB] || [];
                    for (const la of linesA) {
                        for (const lb of linesB) {
                            if (la.lineId === lb.lineId) continue;
                            if (!(this.connections[keyA] || []).some(c => c.key === keyB && c.lineId === lb.lineId)) {
                                (this.connections[keyA] ??= []).push({ key: keyB, lineId: lb.lineId, color: lb.color });
                            }
                            if (!(this.connections[keyB] || []).some(c => c.key === keyA && c.lineId === la.lineId)) {
                                (this.connections[keyB] ??= []).push({ key: keyA, lineId: la.lineId, color: la.color });
                            }
                        }
                    }
                }
            },

            // กดป้ายเชื่อมต่อ → กระโดดไปสถานีนั้นบนอีกสาย
            jumpTo(key, lineId) {
                document.getElementById('searchInput').value = '';
                this.userPickedLineManually = true;
                this.activeLine = lineId;
                this.expandedKey = key;
                this.renderTabs();
                this.renderStrip();
                this.syncUrl();
                this.scrollActiveTabIntoView();
                const station = this.findStation(key);
                if (station) {
                    this.loadArrivals(station);
                }
                requestAnimationFrame(() => {
                    document.querySelector(`[id^="row-${CSS.escape(key)}-"]`)
                        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                });
            },

            /* ---------- deep link (จำ state ใน URL hash) ----------
               รูปแบบ: #line=2&st=S2&from=CEN&to=E4
               - line = สายที่เลือก (ละไว้ถ้าเป็นสายแรก), st = สถานีที่กางอยู่
               - from/to = ต้นทาง/ปลายทางของ journey planner (เฉพาะตอนกางอยู่)
               ใช้ replaceState ไม่ดันเข้า history — ปุ่ม back ยังออกจากเว็บได้ตามปกติ */
            syncUrl() {
                try {
                    const p = new URLSearchParams();
                    if (this.activeLine !== 1) p.set('line', this.activeLine);
                    if (this.expandedKey) p.set('st', this.expandedKey);
                    const j = this.journey;
                    if (j.open && j.from) p.set('from', j.from);
                    if (j.open && j.to) p.set('to', j.to);
                    const h = p.toString();
                    history.replaceState(null, '',
                        h ? '#' + h : (location.pathname || '/') + (location.search || ''));
                } catch (e) { /* เบราว์เซอร์ไม่ให้แก้ URL (เช่นใน sandbox) — ข้ามไป */ }
            },

            // อ่าน state จาก hash กลับเข้าแอป (ตอนเปิดลิงก์ที่แชร์มา / กด refresh / แก้ hash เอง)
            // ตรวจทุกค่าก่อนใช้ — ลิงก์พิมพ์ผิดจะถูกเมินเฉย ๆ ไม่พังหน้า
            applyUrl() {
                const p = new URLSearchParams((location.hash || '').slice(1));
                const line = parseInt(p.get('line'), 10);
                if (line && journeyLineById(line)) {
                    this.activeLine = line;
                    this.userPickedLineManually = true;
                }
                const st = p.get('st');
                if (st && this.findStation(st)) {
                    // สถานีไม่อยู่ในสายที่เลือก → สลับไปสายแรกของสถานีนั้น
                    const stLines = (this.keyLines[st] || []).map(x => x.lineId);
                    if (stLines.length && !stLines.includes(this.activeLine)) this.activeLine = stLines[0];
                    this.expandedKey = st;
                    this.userPickedLineManually = true;
                }
                const from = p.get('from'), to = p.get('to');
                if (from && journeyStationByKey(from)) { this.journey.from = from; this.journey.open = true; }
                if (to && journeyStationByKey(to)) { this.journey.to = to; this.journey.open = true; }
            },

            // hash เปลี่ยนหลังโหลด (ผู้ใช้แก้ URL / กดลิงก์ใน docs) → ปรับ state แล้ววาดใหม่
            onHashChange() {
                this.applyUrl();
                this.renderTabs();
                this.renderStrip();
                this.renderJourney();
                const st = this.expandedKey && this.findStation(this.expandedKey);
                if (st) this.loadArrivals(st);
                if (this.journey.from && this.journey.to && !this.journey.result) this.findRoute();
            },

            /* ---------- journey planner (from → to) ---------- */
            toggleJourney() {
                const j = this.journey;
                j.open = !j.open;
                // เปิดครั้งแรก: เติม "จาก" ด้วยสถานีใกล้สุดให้เลย
                if (j.open && !j.from && this.nearest) j.from = this.nearest.station.StationKey;
                this.renderJourney();
                this.syncUrl();
            },

            swapJourney() {
                const j = this.journey;
                [j.from, j.to] = [j.to, j.from];
                j.result = null;
                this.renderJourney();
                this.syncUrl();
                if (j.from && j.to) this.findRoute();
            },

            openPicker(which) {
                const j = this.journey;
                j.picking = which;
                const selectedKey = which === 'from' ? j.from : j.to;
                const selectedLines = (this.keyLines[selectedKey] || []).map(x => x.lineId);
                if (selectedLines.length) {
                    j.pickerLine = selectedLines.includes(this.activeLine) ? this.activeLine : selectedLines[0];
                } else {
                    j.pickerLine = 0;
                }
                this.renderPicker();
                const el = document.getElementById('pickerOverlay');
                if (el) el.hidden = false;
                if (document.body) document.body.style.overflow = 'hidden';
                setTimeout(() => document.getElementById('pickerSearch')?.focus(), 60);
            },

            closePicker() {
                this.journey.picking = null;
                const el = document.getElementById('pickerOverlay');
                if (el) { el.hidden = true; el.innerHTML = ''; }
                if (document.body) document.body.style.overflow = '';
            },

            pickJourneyStation(key) {
                const j = this.journey;
                if (j.picking === 'from') j.from = key;
                else if (j.picking === 'to') j.to = key;
                this.closePicker();
                j.result = null;
                j.error = null;
                this.renderJourney();
                this.syncUrl();
                if (j.from && j.to) this.findRoute();   // เลือกครบ = ค้นหาให้เลย ไม่ต้องกดเพิ่ม
            },

            async findRoute() {
                const j = this.journey;
                if (!j.from || !j.to || j.loading) return;
                j.loading = true;
                j.error = null;
                this.renderJourney();
                try {
                    j.result = (isMrtStationKey(j.from) || isMrtStationKey(j.to))
                        ? await buildHybridJourney(j.from, j.to)
                        : await fetchJourney(j.from, j.to);
                    j.openRoute = 0;
                } catch (e) {
                    j.result = null;
                    j.error = (e.message && e.message !== 'Failed to fetch') ? e.message : T('jFail');
                }
                j.loading = false;
                this.renderJourney();
            },

            toggleRoute(i) {
                this.journey.openRoute = this.journey.openRoute === i ? -1 : i;
                this.renderJourney();
            },

            renderJourney() {
                const el = document.getElementById('journeyCard');
                if (!el || !this.lines.length) return;
                const j = this.journey;
                const field = (which, key) => {
                    const st = key ? this.findStation(key) : null;
                    const val = st
                        ? `<span class="val"><span class="st-key" style="background:${st.StationLineColor}">${esc(st.StationKey)}</span><span class="nm">${esc(stName(st))}</span></span>`
                        : `<span class="val ph">${T('jSelect')}</span>`;
                    return `<button class="j-field" onclick="App.openPicker('${which}')">
                        <span class="lbl">${T(which === 'from' ? 'jFrom' : 'jTo')}</span>${val}</button>`;
                };
                el.innerHTML = `
                    <button class="j-toggle" onclick="App.toggleJourney()">🧭 ${T('jTitle')}
                        <span class="hint">${T('jHint')}</span><span class="chev">${j.open ? '▲' : '▼'}</span></button>
                    ${j.open ? `
                    <div class="j-body">
                        <div class="j-fields">
                            ${field('from', j.from)}
                            <button class="j-swap" onclick="App.swapJourney()" title="swap">⇅</button>
                            ${field('to', j.to)}
                        </div>
                        ${j.loading ? `<div class="empty-note"><span class="spin dark"></span> ${T('jSearching')}</div>` : ''}
                        ${j.error ? `<div class="err-box">${esc(j.error)}
                            <button class="btn btn-ghost" onclick="App.findRoute()">${T('retry')}</button></div>` : ''}
                        ${j.result ? (j.result.RoutesMap || []).map((rm, i) => renderJourneyRoute(rm, i, j.openRoute === i)).join('') : ''}
                    </div>` : ''}`;
                this.renderQuickHubChips();
            },

            renderQuickHubChips() {
                const el = document.getElementById('quickHubChips');
                if (!el) return;
                const hubs = [
                    { key: 'CEN', lineId: 1, nameTh: 'CEN สยาม', nameEn: 'CEN Siam' },
                    { key: 'E4', lineId: 1, nameTh: 'E4 อโศก', nameEn: 'E4 Asok' },
                    { key: 'N8', lineId: 1, nameTh: 'N8 หมอชิต', nameEn: 'N8 Mo Chit' },
                    { key: 'S2', lineId: 2, nameTh: 'S2 ศาลาแดง', nameEn: 'S2 Sala Daeng' },
                    { key: 'N2', lineId: 1, nameTh: 'N2 พญาไท (ARL)', nameEn: 'N2 Phaya Thai (ARL)' },
                    { key: 'BL11', lineId: 101, nameTh: 'BL11 บางซื่อ', nameEn: 'BL11 Bang Sue' },
                    { key: 'BL15', lineId: 101, nameTh: 'BL15 ลาดพร้าว', nameEn: 'BL15 Lat Phrao' },
                    { key: 'YL23', lineId: 4, nameTh: 'YL23 สำโรง', nameEn: 'YL23 Samrong' },
                    { key: 'A1', lineId: 104, nameTh: 'A1 สุวรรณภูมิ (ARL)', nameEn: 'A1 Suvarnabhumi (ARL)' }
                ];
                el.innerHTML = hubs.map(h => {
                    const s = this.findStation(h.key);
                    const label = s ? `${h.key} ${stName(s)}` : (lang === 'en' ? h.nameEn : h.nameTh);
                    const isFrom = this.journey.from === h.key;
                    const isTo = this.journey.to === h.key;
                    const isSel = isFrom || isTo;
                    const tag = isFrom ? ` (${lang === 'th' ? 'ต้นทาง' : 'From'})` : isTo ? ` (${lang === 'th' ? 'ปลายทาง' : 'To'})` : '';
                    return `<button class="alt-chip ${isSel ? 'on' : ''}" onclick="App.quickSelectHub('${h.key}')">
                        ${getLineIconSvg(h.lineId, isSel, 15)}
                        <span>${esc(label)}${tag}</span>
                    </button>`;
                }).join('');
            },

            renderPicker() {
                const el = document.getElementById('pickerOverlay');
                if (!el) return;
                el.innerHTML = `
                    <div class="picker-bg" onclick="App.closePicker()"></div>
                    <div class="picker">
                        <div class="picker-head">
                            <div style="display:flex;gap:8px;align-items:center;">
                                <input id="pickerSearch" type="search" placeholder="${T('searchPh')}" autocomplete="off" style="flex:1;">
                                <button class="btn btn-ghost" onclick="App.closePicker()" aria-label="Close">✕</button>
                            </div>
                        </div>
                        <div class="tabs picker-tabs" id="pickerTabs"></div>
                        ${this.nearest ? `<div style="padding:2px 14px 6px;"><button class="alt-chip" style="align-self:flex-start;"
                            onclick="App.pickJourneyStation('${esc(this.nearest.station.StationKey)}')">
                            ${T('jUseNearest')} · <b>${esc(this.nearest.station.StationKey)}</b> ${esc(stName(this.nearest.station))}</button></div>` : ''}
                        <div class="picker-list" id="pickerList"></div>
                    </div>`;
                this.renderPickerTabs();
                document.getElementById('pickerSearch').addEventListener('input', () => this.renderPickerList());
                this.renderPickerList();
            },

            renderPickerTabs() {
                const el = document.getElementById('pickerTabs');
                if (!el) return;
                const isAll = this.journey.pickerLine === 0;
                el.innerHTML = `
                    <button class="tab ${isAll ? 'on' : ''}" style="${isAll ? 'background:var(--primary,#0284c7);color:#fff;' : ''}"
                        aria-pressed="${isAll ? 'true' : 'false'}" onclick="App.setPickerLine(0)">
                        ${getLineIconSvg(0, isAll, 18)}
                        <span>${lang === 'th' ? 'ทุกสาย' : 'All Lines'}</span>
                    </button>` + allJourneyLines().map(l => {
                    const on = l.LineId === this.journey.pickerLine;
                    const st = this.traffic?.lines?.find(x => x.LineId === l.LineId);
                    const warn = st && st.TrafficStatus !== 1 ? ' ⚠️' : '';
                    const textColor = on ? (isBrightColor(l.LineColor) ? '#0f172a' : '#fff') : '';
                    return `<button class="tab ${on ? 'on' : ''}" style="${on ? 'background:' + l.LineColor + ';color:' + textColor + ';' : ''}"
                        aria-pressed="${on ? 'true' : 'false'}" onclick="App.setPickerLine(${l.LineId})">
                        ${getLineIconSvg(l.LineId, on, 18)}
                        <span>${esc(shortLineName(l))}${warn}</span></button>`;
                }).join('');
            },

            setPickerLine(id) {
                this.journey.pickerLine = id;
                this.renderPickerTabs();
                this.renderPickerList();
            },

            renderPickerList() {
                const listEl = document.getElementById('pickerList');
                if (!listEl) return;
                const q = (document.getElementById('pickerSearch')?.value || '').trim().toLowerCase();
                const curPickerLine = this.journey.pickerLine;
                const allLines = allJourneyLines();

                // Determine lines to show based on tab filter & search
                let linesToShow;
                if (q) {
                    if (curPickerLine && curPickerLine !== 0) {
                        const activeLineList = allLines.filter(l => l.LineId === curPickerLine);
                        const hasMatchOnActive = activeLineList.some(l => (l.StationList || []).some(s => {
                            const nameTh = (stName(s) || s.StationNameTH || '').toLowerCase();
                            const nameEn = (s.StationName_EN || s.StationNameEN || '').toLowerCase();
                            const key = (s.StationKey || '').toLowerCase();
                            return nameTh.includes(q) || nameEn.includes(q) || key.includes(q);
                        }));
                        linesToShow = hasMatchOnActive ? activeLineList : allLines;
                    } else {
                        linesToShow = allLines;
                    }
                } else {
                    linesToShow = (curPickerLine && curPickerLine !== 0)
                        ? allLines.filter(l => l.LineId === curPickerLine)
                        : allLines;
                }

                const selectedKey = this.journey.picking === 'from' ? this.journey.from : this.journey.to;
                let html = '';
                let totalMatching = 0;

                for (const line of linesToShow) {
                    let stations = line.StationList || [];
                    const seen = new Set();
                    stations = stations.filter(s => (s.StaticJourney || (s.Latitude && s.Longitude) || s.StationKey) && !seen.has(s.StationKey) && seen.add(s.StationKey));

                    if (q) {
                        stations = stations.filter(s => {
                            const nameTh = (stName(s) || s.StationNameTH || '').toLowerCase();
                            const nameEn = (s.StationName_EN || s.StationNameEN || '').toLowerCase();
                            const key = (s.StationKey || '').toLowerCase();
                            return nameTh.includes(q) || nameEn.includes(q) || key.includes(q);
                        });
                    }

                    if (stations.length === 0) continue;
                    totalMatching += stations.length;

                    const color = line.LineColor || '#7AB420';
                    const groupLabel = getLineOptLabel(line);
                    const isBright = isBrightColor(color);
                    const codeTextColor = isBright ? '#0f172a' : '#ffffff';

                    const stationChips = stations.map(s => {
                        const isSelected = s.StationKey === selectedKey;
                        const name = stName(s);
                        return `
                            <button type="button" class="station-picker-chip ${isSelected ? 'selected' : ''}"
                                onclick="App.pickJourneyStation('${esc(s.StationKey)}')">
                                <span class="chip-code" style="background:${color};color:${codeTextColor}">${esc(s.StationKey)}</span>
                                <span class="chip-name" title="${esc(name)}">${esc(name)}</span>
                            </button>`;
                    }).join('');

                    html += `
                        <div class="line-frame-box" style="border-color:${color}; background:${color}08;">
                            <div class="line-frame-head">
                                <div class="line-frame-title">
                                    ${getLineIconSvg(line.LineId, false, 18)}
                                    <span>${esc(groupLabel)}</span>
                                </div>
                                <span class="line-frame-count" style="background:${color}22; color:${isBright ? '#ca8a04' : color}; border:1px solid ${color}44;">
                                    ${stations.length} ${lang === 'th' ? 'สถานี' : 'stations'}
                                </span>
                            </div>
                            <div class="line-stations-grid">
                                ${stationChips}
                            </div>
                        </div>`;
                }

                if (totalMatching === 0) {
                    html = `<div style="text-align:center; padding:32px 14px; color:var(--muted); font-size:13px;">
                        🔍 ${T('notFound', esc(q))}
                    </div>`;
                }

                listEl.innerHTML = html;

                if (selectedKey && !q) {
                    setTimeout(() => {
                        const selEl = listEl.querySelector('.station-picker-chip.selected');
                        if (selEl) {
                            selEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        }
                    }, 100);
                }
            },

            /* ---------- เลือกขบวนเพื่อดูปลายทางของขบวนนั้น ---------- */
            selectTrain(stationKey, platform, idx, trainNo) {
                const k = stationKey + '|' + platform;
                const cur = this.selTrain[k];
                if (cur && cur.idx === idx && cur.trainNo === trainNo) delete this.selTrain[k]; // กดซ้ำ = ยกเลิก
                else this.selTrain[k] = { idx, trainNo };
                this.renderArrivalTargets(stationKey);
            },

            /* ---------- location / nearest ---------- */
            saveUserPosition(pos, stationKey, isCalibrated = false) {
                try {
                    localStorage.setItem('bts_user_pos', JSON.stringify({
                        lat: pos.lat,
                        lon: pos.lon,
                        accuracy: pos.accuracy || null,
                        stationKey: stationKey || (this.nearest?.station?.StationKey) || null,
                        calibrated: !!isCalibrated,
                        timestamp: Date.now()
                    }));
                } catch (e) {}
            },

            loadSavedPosition() {
                try {
                    const raw = localStorage.getItem('bts_user_pos');
                    if (!raw) return null;
                    const data = JSON.parse(raw);
                    // Valid for up to 24 hours if calibrated, or 2 hours if normal GPS fix
                    const maxAge = data.calibrated ? (24 * 3600 * 1000) : (2 * 3600 * 1000);
                    if (Date.now() - data.timestamp < maxAge && data.lat && data.lon) {
                        return data;
                    }
                } catch (e) {}
                return null;
            },

            calibrateToStation(key) {
                const s = this.findStation(key);
                if (!s || !s.Latitude || !s.Longitude) return;
                this.userPos = { lat: s.Latitude, lon: s.Longitude, calibrated: true };
                this.pinnedKey = s.StationKey;
                this.selectedExitKey = s.StationKey;
                this.saveUserPosition(this.userPos, s.StationKey, true);
                this.syncLineToStation(s, true);
                this.computeNearest();
                this.renderNearest();
                this.renderNearestExit();
                this.renderStrip();
                const pinned = this.pinnedStation();
                if (pinned) this.loadArrivals(pinned);
                if (this.currentView === 'exits') this.renderExitsView(this.selectedExitKey);
            },

            onNativeLocationSuccess(lat, lon, accuracy) {
                clearTimeout(this.fallbackTimer);
                this.locating = false;
                this.locError = null;
                this.userPos = { lat, lon, accuracy: accuracy || 10, calibrated: false };
                this.saveUserPosition(this.userPos, null, false);
                this.computeNearest();
                this.renderNearest();
                this.renderNearestExit();
                this.renderStrip();
                this.updateRelocateBtn();
                this.renderExitsView(this.selectedExitKey);
            },

            onNativeLocationError(reason) {
                clearTimeout(this.fallbackTimer);
                this.locating = false;
                this.updateRelocateBtn();
                if (!this.userPos && typeof fetch === 'function') {
                    fetchIpLocation(2500)
                        .then(coords => {
                            this.userPos = { lat: coords.lat, lon: coords.lon, accuracy: 2000, calibrated: false };
                            this.saveUserPosition(this.userPos, null, false);
                            this.computeNearest();
                            this.locError = null;
                            this.renderNearest();
                        })
                        .catch(() => {
                            this.locError = T('geoFail');
                            this.renderNearest();
                            if (!this.nearest) this.useFallbackStation();
                        });
                    return;
                }
                this.locError = T('geoFail');
                this.renderNearest();
                if (!this.nearest) this.useFallbackStation();
            },

            locate(interactive) {
                if (interactive) {
                    this.userPickedLineManually = false;
                    this.lastSyncedStationKey = null;
                }
                if (window.FlutterLocation && typeof window.FlutterLocation.postMessage === 'function') {
                    this.locating = true;
                    this.locError = null;
                    this.renderNearest();
                    this.updateRelocateBtn();
                    window.FlutterLocation.postMessage(JSON.stringify({ action: 'getLocation', interactive: !!interactive }));
                    return;
                }

                if (!navigator.geolocation) {
                    this.locError = T('geoUnsupported');
                    this.renderNearest();
                    if (!this.nearest) this.useFallbackStation();
                    return;
                }
                this.locating = true;
                this.locError = null;
                this.renderNearest();
                this.updateRelocateBtn();

                clearTimeout(this.fallbackTimer);
                if (this.gpsWatchId != null) {
                    try { navigator.geolocation.clearWatch(this.gpsWatchId); } catch(e){}
                    this.gpsWatchId = null;
                }

                if (!this.nearest) {
                    this.fallbackTimer = setTimeout(() => this.useFallbackStation(), FALLBACK_AFTER_MS);
                }

                let bestAccuracy = Infinity;
                let fixCount = 0;

                const onPositionSuccess = (pos) => {
                    clearTimeout(this.fallbackTimer);
                    fixCount++;
                    const acc = pos.coords.accuracy || 999;
                    const lat = pos.coords.latitude;
                    const lon = pos.coords.longitude;

                    if (acc <= bestAccuracy || fixCount === 1) {
                        bestAccuracy = acc;
                        this.userPos = { lat, lon, accuracy: acc, calibrated: false };
                        this.saveUserPosition(this.userPos, null, false);
                        this.computeNearest();
                    }

                    if (acc <= 50 || fixCount >= 3) {
                        this.locating = false;
                        this.updateRelocateBtn();
                        if (this.gpsWatchId != null) {
                            try { navigator.geolocation.clearWatch(this.gpsWatchId); } catch(e){}
                            this.gpsWatchId = null;
                        }
                    }
                };

                const handleFinalError = (err) => {
                    clearTimeout(this.fallbackTimer);
                    this.locating = false;
                    this.updateRelocateBtn();
                    if (this.gpsWatchId != null) {
                        try { navigator.geolocation.clearWatch(this.gpsWatchId); } catch(e){}
                        this.gpsWatchId = null;
                    }

                    // หากระบุตำแหน่งผ่าน GPS ไม่ได้ (เช่น อยู่บน PC ที่ไม่มี GPS) ให้ลองสำรองด้วย IP Geolocation แบบมี timeout รวดเร็ว
                    if (!this.userPos && typeof fetch === 'function') {
                        fetchIpLocation(2500)
                            .then(coords => {
                                this.userPos = { lat: coords.lat, lon: coords.lon, accuracy: 2000, calibrated: false };
                                this.saveUserPosition(this.userPos, null, false);
                                this.computeNearest();
                                this.locError = null;
                                this.renderNearest();
                            })
                            .catch(() => {
                                if (interactive || (err && err.code !== err.PERMISSION_DENIED)) {
                                    this.locError = (err && err.code === err.PERMISSION_DENIED)
                                        ? T('geoDenied') : T('geoFail');
                                }
                                this.renderNearest();
                                if (!this.nearest) this.useFallbackStation();
                            });
                        return;
                    }

                    if (interactive || (err && err.code !== err.PERMISSION_DENIED)) {
                        this.locError = (err && err.code === err.PERMISSION_DENIED)
                            ? T('geoDenied') : T('geoFail');
                    }
                    this.renderNearest();
                    if (!this.nearest) this.useFallbackStation();
                };

                const onPositionError = (err) => {
                    // หากโหมดแม่นยำสูง (High Accuracy) ล้มเหลวหรือหมดเวลา ให้สลับลอง Low Accuracy (Cellular/Wi-Fi) ทันที
                    if (err && (err.code === err.TIMEOUT || err.code === err.POSITION_UNAVAILABLE)) {
                        try {
                            navigator.geolocation.getCurrentPosition(
                                onPositionSuccess,
                                (err2) => handleFinalError(err2),
                                { enableHighAccuracy: false, maximumAge: 60000, timeout: 5000 }
                            );
                            return;
                        } catch(e) {}
                    }
                    handleFinalError(err);
                };

                try {
                    this.gpsWatchId = navigator.geolocation.watchPosition(
                        onPositionSuccess,
                        (err) => {
                            if (fixCount === 0) onPositionError(err);
                        },
                        { enableHighAccuracy: true, maximumAge: 30000, timeout: 6000 }
                    );

                    // Timeout ปลอดภัย 6.5 วินาที ไม่ปล่อยให้ค้างนาน
                    setTimeout(() => {
                        if (this.gpsWatchId != null) {
                            try { navigator.geolocation.clearWatch(this.gpsWatchId); } catch(e){}
                            this.gpsWatchId = null;
                            if (fixCount === 0) {
                                // ถ้า watchPosition ยังไม่ได้ผลใน 6.5 วิ ให้ลอง getCurrentPosition low-accuracy
                                try {
                                    navigator.geolocation.getCurrentPosition(
                                        onPositionSuccess,
                                        (err3) => handleFinalError(err3),
                                        { enableHighAccuracy: false, maximumAge: 60000, timeout: 4000 }
                                    );
                                } catch(e) {
                                    handleFinalError({ code: 3 });
                                }
                            } else {
                                this.locating = false;
                                this.updateRelocateBtn();
                            }
                        }
                    }, 6500);
                } catch (e) {
                    navigator.geolocation.getCurrentPosition(
                        onPositionSuccess,
                        onPositionError,
                        { enableHighAccuracy: false, maximumAge: 60000, timeout: 5000 }
                    );
                }
            },

            // แจ้งเตือนข้อความแบบ Toast
            showToast(msg) {
                const el = document.getElementById('appToast');
                if (!el) return;
                el.textContent = msg;
                el.style.display = 'block';
                requestAnimationFrame(() => el.classList.add('visible'));
                clearTimeout(this._toastTimer);
                this._toastTimer = setTimeout(() => {
                    el.classList.remove('visible');
                    setTimeout(() => { if (!el.classList.contains('visible')) el.style.display = 'none'; }, 260);
                }, 2600);
            },

            handleNotificationOpen(stationKey) {
                if (!stationKey) return;
                const s = this.findStation(stationKey);
                if (s) {
                    this.pinnedKey = s.StationKey;
                    this.selectedExitKey = s.StationKey;
                    this.syncLineToStation(s, true);
                    this.switchView('home');
                    this.renderNearest();
                    this.renderNearestExit();
                    this.renderStrip();
                    this.loadArrivals(s, true);
                    requestAnimationFrame(() => {
                        const el = document.getElementById('nearestCard');
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    });
                }
            },

            // แสดงสถานีเริ่มต้นเมื่อยังระบุตำแหน่งไม่ได้ (ไม่ทับสถานีจริงที่เคยหาเจอ)
            useFallbackStation() {
                if (this.nearest && this.nearest.km != null) return;
                const s = this.findStation(FALLBACK_STATION_KEY);
                if (!s) return;
                this.nearest = { station: s, km: null };
                this.nearestList = [this.nearest];
                this.pinnedKey = s.StationKey;
                this.syncLineToStation(s);
                this.renderNearest();
                this.renderStrip();
                this.loadArrivals(s);
            },

            // ปุ่ม "หาใหม่" บนหัวการ์ด: แสดง spin เล็ก ๆ ระหว่างหาตำแหน่ง + กันกดซ้ำ
            updateRelocateBtn() {
                const b = document.getElementById('relocateBtn');
                if (!b) return;
                b.disabled = this.locating;
                b.innerHTML = this.locating
                    ? `<span class="spin dark sm"></span> ${T('relocate')}`
                    : '🧭 ' + T('relocate');
                const eb = document.getElementById('exitRelocateBtn');
                if (eb) {
                    eb.disabled = this.locating;
                    eb.innerHTML = this.locating
                        ? `<span class="spin dark sm"></span> ${T('relocate')}`
                        : '🧭 ' + T('relocate');
                }
            },

            computeNearest() {
                if (!this.userPos) return;
                const ranked = this.uniqueStations
                    .map(s => {
                        let km = haversineKm(this.userPos.lat, this.userPos.lon, s.Latitude, s.Longitude);
                        if (this.userPos.calibrated && s.StationKey === this.pinnedKey) {
                            km = 0;
                        }
                        return { station: s, km };
                    })
                    .sort((a, b) => {
                        const distDiff = a.km - b.km;
                        if (Math.abs(distDiff) < 0.2) {
                            const aHasApi = !usesStaticTimetable(a.station);
                            const bHasApi = !usesStaticTimetable(b.station);
                            if (aHasApi !== bHasApi) {
                                return aHasApi ? -1 : 1;
                            }
                        }
                        return distDiff;
                    });
                // ตำแหน่งอยู่ไกลเครือข่ายผิดปกติ (ต่างจังหวัด/GPS เพี้ยน) → ใช้สถานีสำรองแทน
                if (!ranked.length || ranked[0].km > FALLBACK_MAX_KM) {
                    this.useFallbackStation();
                    return;
                }
                this.nearest = ranked[0];
                this.nearestList = ranked.slice(0, 3);
                if (!this.pinnedKey || !this.nearestList.some(r => r.station.StationKey === this.pinnedKey))
                    this.pinnedKey = this.nearest.station.StationKey;
                if (!this.userHasPickedExitStation && this.nearest) {
                    this.selectedExitKey = this.nearest.station.StationKey;
                }
                const pinned = this.pinnedStation();
                this.syncLineToStation(pinned);
                this.renderNearest();
                this.renderNearestExit();
                this.renderStrip();
                this.renderTraffic();
                if (pinned) this.loadArrivals(pinned);
                if (this.currentView === 'exits') this.renderExitsView(this.selectedExitKey);

                // แจ้งเตือน Popup และ Notification ทันทีเมื่อพบสถานีใกล้ฉัน
                if (this.nearest && this.nearest.km != null) {
                    this.triggerNearestStationAlert(this.nearest);
                }
            },

            onAppPaused() {
                this.isAppFolded = true;
                this.foldedAt = Date.now();
            },

            onAppResume() {
                this.isAppFolded = false;
                this.onAppForegrounded();
            },

            onAppForegrounded() {
                // เมื่อเปิดหรือพับแอปกลับมา: หากมีสถานีใกล้ฉันที่ตรวจพบ ให้แสดง Popup สถานี/แพลตฟอร์ม/เวลา ทันที
                if (this.pendingFoldedAlert) {
                    const { station } = this.pendingFoldedAlert;
                    this.pendingFoldedAlert = null;
                    this.showNearestPopupFor(station);
                    return;
                }
                if (this.nearest && this.nearest.km != null && this.nearest.km <= 2.5) {
                    const modal = document.getElementById('nearestStationPopup');
                    if (!modal || modal.style.display === 'none') {
                        this.showNearestPopupFor(this.nearest.station);
                    }
                }
            },

            getPlatformsSummaryText(station, arr) {
                if (!station) return '';
                if (!arr || !arr.platforms || !arr.platforms.length) {
                    if (usesStaticTimetable(station)) {
                        const curFreq = getCurrentMrtFreq(station.StationLineId, station.StationKey);
                        if (curFreq) {
                            const cleanFreq = String(curFreq.label || '').replace(/^~/, '');
                            return `🚇 ${T('mrtFreqNow', cleanFreq)}`;
                        }
                        return `🚇 ${T('mrtOutOfService')}`;
                    }
                    return lang === 'en' ? '🚆 Loading live trains...' : '🚆 กำลังโหลดเวลาเดินรถสด...';
                }
                const plats = visiblePlatformsForStation(station, arr.platforms);
                const lines = plats.map(p => {
                    const isTerminating = p.isDropOffOnly || p.DestinationStation_key === station.StationKey;
                    const dest = isTerminating ? (lang === 'en' ? 'Drop-off only' : 'ส่งผู้โดยสารเท่านั้น') : shortDest(destName(p.DestinationStation));
                    const trains = displayTrains(station.StationKey, p.platform, p.train_list, arr.fetchedAt);
                    let timeStr = '';
                    if (trains.length) {
                        const eta = bestEta(station.StationKey, p.platform, trains[0], arr.fetchedAt);
                        if (trains[0].status === 'arriving') {
                            timeStr = T('arrived');
                        } else if (eta) {
                            const m = Math.round(eta.base - (Date.now() - eta.at) / 60000);
                            timeStr = m <= 0 ? T('arrived') : `${m} ${lang === 'en' ? 'min' : 'นาที'}`;
                        }
                    } else if (isTerminating) {
                        timeStr = lang === 'en' ? 'No boarding train' : 'ขบวนไม่รับผู้โดยสาร';
                    }
                    return `${lang === 'en' ? 'Platform' : 'ชานชาลา'} ${p.platform}: ${lang === 'en' ? 'To ' : 'ไป'}${dest} ${timeStr ? `(${timeStr})` : ''}`.trim();
                });
                return lines.join(' | ');
            },

            triggerNearestStationAlert(nearestItem) {
                if (!nearestItem || !nearestItem.station) return;
                const s = nearestItem.station;
                const key = s.StationKey;
                const km = nearestItem.km;

                // เกิน 3.0 กม. ไม่ถือว่าใกล้สถานี
                if (km > 3.0) return;

                const isStationChanged = (this.lastAlertStationKey !== key);
                const isFirstOpenAlert = !this.hasShownPopupOnOpen;

                // ถ้าไม่ใช่เปิดครั้งแรก และไม่ใช่สถานีเปลี่ยน และแอปไม่ได้กำลังพับอยู่
                if (!isStationChanged && !isFirstOpenAlert && !this.isAppFolded) {
                    this.updatePopupDistance(s);
                    return;
                }

                this.hasShownPopupOnOpen = true;
                this.lastAlertStationKey = key;
                try { localStorage.setItem('bkk_last_nearest_key', key); } catch(e){}

                // 1. สั่นเตือน haptic feedback
                if (navigator.vibrate) {
                    try { navigator.vibrate([120, 60, 120]); } catch(e){}
                }

                // 2. คำนวณข้อความระยะทาง (ใช้ฟังก์ชันเดียวกันกับการ์ดสถานีใกล้สุด 100%)
                const distText = fmtDist(km);
                const stNameTH = s.StationNameTH || s.StationName || key;

                // 3. เตรียมข้อมูลชานชาลาและเวลาเดินรถ
                if (!this.arrivals[key]) {
                    this.loadArrivals(s);
                }
                const platSummary = this.getPlatformsSummaryText(s, this.arrivals[key]);

                // 4. จัดการ Popup:
                // เมื่อปิดหรือพับแอพไว้ เก็บสถานะไว้เพื่อให้แสดง Popup ทันทีที่เปิดกลับมา
                if (this.isAppFolded) {
                    this.pendingFoldedAlert = { station: s };
                } else {
                    // หากเปิดอยู่ แสดง Popup แจ้งเตือนสถานี/แพลตฟอร์ม/เวลา ทันที
                    this.showNearestPopupFor(s);
                }

                // 5. แจ้งเตือน Web Notification พร้อม ข้อมูลสถานี / แพลตฟอร์ม / เวลา
                if (typeof Notification !== 'undefined') {
                    if (Notification.permission === 'granted') {
                        const notifTitle = lang === 'en'
                            ? `📍 Nearest Station: ${s.StationKey} ${stName(s)} (${distText})`
                            : `📍 สถานีใกล้คุณ: ${s.StationKey} ${stName(s)} (${distText})`;
                        const notifBody = platSummary || (lang === 'en' ? `${distText} away · Tap to view timetable & platforms` : `ห่าง ${distText} · แตะเพื่อดูเวลาขบวนรถและชานชาลา`);
                        try {
                            new Notification(notifTitle, {
                                body: notifBody,
                                icon: 'icon-192.png',
                                badge: 'icon-192.png',
                                tag: 'nearest-station'
                            });
                        } catch(e){}
                    } else if (Notification.permission === 'default') {
                        try { Notification.requestPermission(); } catch(e){}
                    }
                }

                // 6. แจ้งเตือน Native Android Notification พร้อม ข้อมูลสถานี / แพลตฟอร์ม / เวลา
                if (window.AndroidBridge && window.AndroidBridge.showNotification) {
                    try {
                        const notifTitle = lang === 'en'
                            ? `📍 Nearest Station: ${s.StationKey} ${stName(s)} (${distText})`
                            : `📍 สถานีใกล้คุณ: ${s.StationKey} ${stName(s)} (${distText})`;
                        const androidBody = platSummary || (lang === 'en' ? `${distText} away · View timetable & platforms` : `ห่าง ${distText} · ดูเวลาเดินรถและชานชาลา`);
                        window.AndroidBridge.showNotification(
                            notifTitle,
                            androidBody,
                            key
                        );
                    } catch(e){}
                }
            },

            showNearestPopupFor(station) {
                const modal = document.getElementById('nearestStationPopup');
                if (!modal || !station) return;
                this.popupStation = station;

                const badge = document.getElementById('nearestPopupLineBadge');
                const nameTH = document.getElementById('nearestPopupNameTH');
                const nameEN = document.getElementById('nearestPopupNameEN');
                const platContainer = document.getElementById('nearestPopupPlatforms');

                const color = station.StationLineColor || '#7AB420';
                const isBright = color === '#FFD100' || color === '#F5C242';
                if (badge) {
                    badge.style.background = color;
                    badge.style.color = isBright ? '#0f172a' : '#ffffff';
                    badge.textContent = station.StationKey || '';
                }
                if (nameTH) nameTH.textContent = stName(station);
                if (nameEN) nameEN.textContent = lang === 'en' ? (station.StationNameTH || station.StationName_TH || '') : (station.StationNameEN || station.StationName_EN || '');

                this.updatePopupDistance(station);

                // เรนเดอร์ชานชาลา & เวลาเดินรถสด แบบเดียวกันกับที่แสดงตรงสถานีใกล้คุณที่สุด ทันที!
                if (platContainer) {
                    const arr = this.arrivals[station.StationKey];
                    if (arr && arr.platforms && arr.platforms.length) {
                        platContainer.innerHTML = renderPlatformSection(station, arr);
                    } else {
                        platContainer.innerHTML = `<div class="empty-note" style="padding:14px"><span class="spin dark"></span><br>${T('loadingTrains')}</div>`;
                        this.loadArrivals(station, true).then(() => {
                            const freshArr = this.arrivals[station.StationKey];
                            const curPlat = document.getElementById('nearestPopupPlatforms');
                            if (curPlat && this.popupStation?.StationKey === station.StationKey) {
                                curPlat.innerHTML = renderPlatformSection(station, freshArr);
                            }
                        });
                    }
                }

                modal.style.display = 'flex';
            },

            updatePopupDistance(station) {
                const targetStation = station || this.popupStation || this.pinnedStation();
                if (!targetStation) return;
                const distEl = document.getElementById('nearestPopupDistance');
                const distLbl = document.getElementById('nearestPopupDistLbl');
                if (!distEl && !distLbl) return;

                const pin = this.nearestList.find(r => r.station.StationKey === targetStation.StationKey)
                    || (this.nearest?.station?.StationKey === targetStation.StationKey ? this.nearest : null);
                const km = pin ? pin.km : ((this.userPos && targetStation.Latitude && targetStation.Longitude)
                    ? haversineKm(this.userPos.lat, this.userPos.lon, targetStation.Latitude, targetStation.Longitude)
                    : null);

                const isAtStation = km != null && km <= 0.12;
                if (distEl) {
                    distEl.textContent = km != null
                        ? (isAtStation ? `📍 ${T('atStation')}` : fmtDist(km))
                        : (lang === 'en' ? 'Near you' : 'ใกล้คุณ');
                }
                if (distLbl) {
                    distLbl.textContent = isAtStation ? T('currentLocation') : T('fromYou');
                }
            },

            closeNearestPopup() {
                const modal = document.getElementById('nearestStationPopup');
                if (modal) {
                    modal.style.display = 'none';
                }
            },

            selectNearestFromPopup() {
                this.closeNearestPopup();
                const st = this.popupStation || (this.nearest && this.nearest.station) || this.pinnedStation();
                if (st) {
                    this.pinnedKey = st.StationKey;
                    this.syncLineToStation(st, true);
                    this.switchView('home');
                    this.loadArrivals(st, true);
                    const hero = document.querySelector('.station-hero') || document.getElementById('nearestPlatforms');
                    if (hero) hero.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            },

            handleNotificationOpen(stationKey) {
                const s = this.findStation(stationKey);
                if (s) {
                    this.pinnedKey = s.StationKey;
                    this.syncLineToStation(s, true);
                    this.switchView('home');
                    this.loadArrivals(s, true);
                    this.showNearestPopupFor(s);
                }
            },

            pinnedStation() {
                const hit = this.nearestList.find(r => r.station.StationKey === this.pinnedKey);
                return hit ? hit.station : (this.nearest && this.nearest.station);
            },

            pinStation(key) {
                this.pinnedKey = key;
                this.renderNearest();
                this.renderTraffic();
                const pinned = this.pinnedStation();
                if (pinned) {
                    this.syncLineToStation(pinned, true);
                    this.updatePopupDistance(pinned);
                }
                this.renderStrip();
                if (pinned) this.loadArrivals(pinned);
            },

            /* ---------- arrivals ---------- */
            async loadArrivals(station, force) {
                if (!station) return;
                const key = station.StationKey;
                const cur = this.arrivals[key];
                if (usesStaticTimetable(station)) {
                    const data = generateTimetableArrivals(station);
                    if (data) {
                        this.storeArrivals(key, data);
                        if ((this.pinnedStation()?.StationKey === key || this.expandedKey === key)
                            && this.arrivals[key].platforms.length)
                            this.loadRoute(station);
                    } else {
                        this.arrivals[key] = { ...(cur || {}), loading: false, error: null, fetchedAt: Date.now(), time: null, platforms: [] };
                    }
                    this.renderArrivalTargets(key);
                    return;
                }
                if (cur?.loading) return;
                if (!force && cur && Date.now() - cur.fetchedAt < 8000 && !cur.error) {
                    this.renderArrivalTargets(key);
                    return;
                }
                this.arrivals[key] = { ...(cur || {}), loading: true };
                this.renderArrivalTargets(key);
                try {
                    const data = await fetchArrivals(station);
                    this.storeArrivals(key, data);
                    // โหลดตำแหน่งขบวนรอบสถานี (route map) เฉพาะสถานีที่กำลังแสดงอยู่
                    if ((this.pinnedStation()?.StationKey === key || this.expandedKey === key)
                        && this.arrivals[key].platforms.length)
                        this.loadRoute(station);
                } catch (e) {
                    this.arrivals[key] = {
                        ...(cur || {}), loading: false,
                        error: e.message || T('connectFail', '?')
                    };
                }
                this.renderArrivalTargets(key);
            },

            // เก็บผล TTA + จำเวลาเลขล่าสุดของทุกขบวนไว้ — เมื่อรอบถัดไป API ตอบ "--"
            // จะได้แสดงเวลานับถอยหลังจากค่าเดิมแทน ไม่ให้ตัวเลขวูบหายจนผู้ใช้งง
            storeArrivals(key, data) {
                const fetchedAt = data.fetchedAt || Date.now();
                for (const p of data.platform_list || []) {
                    for (const t of p.train_list || []) {
                        if (t.time_come !== '--' && t.time_come_double != null)
                            this.etaMem[key + '|' + p.platform + '|' + t.trainNo] =
                                { base: t.time_come_double, at: fetchedAt };
                    }
                }
                for (const k in this.etaMem)
                    if (fetchedAt - this.etaMem[k].at > 1800000) delete this.etaMem[k];
                this.arrivals[key] = {
                    loading: false, error: null, fetchedAt,
                    isTimetable: !!data.isTimetable,
                    time: data.time, platforms: data.platform_list || []
                };
            },

            // ดึงเวลารถของสถานีอื่นแบบเงียบ ๆ (ใช้กับสถานีข้างเคียงของ route map)
            async ensureArrivals(station) {
                if (usesStaticTimetable(station)) {
                    const k = station.StationKey;
                    if (!this.arrivals[k] || !this.arrivals[k].platforms || !this.arrivals[k].platforms.length) {
                        const data = generateTimetableArrivals(station);
                        if (data) this.storeArrivals(k, data);
                    }
                    return (this.arrivals[k] && this.arrivals[k].platforms) || [];
                }
                const k = station.StationKey, cur = this.arrivals[k];
                if (cur && !cur.loading && !cur.error && Date.now() - cur.fetchedAt < 10000)
                    return cur.platforms || [];
                try {
                    const d = await fetchArrivals(station);
                    this.storeArrivals(k, d);
                    return this.arrivals[k].platforms;
                } catch (e) {
                    return (cur && cur.platforms) || [];
                }
            },

            /* ---------- สถานะการเดินรถ (btsapp1 TrafficInfoV2) ---------- */
            async loadTraffic() {
                try {
                    const d = await fetchTraffic();
                    this.traffic = {
                        at: Date.now(), updated: d.TrafficInfoTime,
                        lines: d.MainLineStatus || [], alerts: d.TrafficAlerList || []
                    };
                } catch (e) { /* ฟีเจอร์เสริม — เงียบไว้ */ }
                this.renderTraffic();
                this.renderTabs();
            },

            renderTraffic() {
                // Widget removed per user request
            },

            // โหลดข้อมูลสถานีข้างเคียง (prev/next ของทุกสายที่ผ่านสถานีนี้) เพื่อวาดตำแหน่งขบวน
            // เก็บข้อมูลเดิมไว้จนกว่าชุดใหม่จะพร้อม (atomic swap) — ขบวนบน map จะไม่กระพริบหาย
            async loadRoute(station) {
                const key = station.StationKey;
                if (this.routes[key]?.loading) return;
                this.routes[key] = { ...(this.routes[key] || {}), loading: true };
                const blocks = [];
                const allLines = this.getAllLines();
                for (const line of allLines) {
                    const list = line.StationList;
                    const idx = list.findIndex(s => s.StationKey === key);
                    if (idx < 0) continue;
                    const prev = idx > 0 ? list[idx - 1] : null;
                    const next = idx < list.length - 1 ? list[idx + 1] : null;
                    const adj = {};
                    await Promise.all([prev, next].filter(Boolean).map(async s => {
                        adj[s.StationKey] = await this.ensureArrivals(s);
                    }));
                    blocks.push({ lineId: line.LineId, color: line.LineColor, list, idx, prev, next, adj });
                }
                this.routes[key] = { loading: false, ready: true, at: Date.now(), blocks };
                this.renderArrivalTargets(key);
            },

            refreshAll() {
                const p = this.pinnedStation();
                if (p) this.loadArrivals(p, true);
                if (this.expandedKey && this.expandedKey !== p?.StationKey) {
                    const st = this.findStation(this.expandedKey);
                    if (st) this.loadArrivals(st, true);
                }
            },

            getAllLines() {
                const appLines = (this.lines && this.lines.length)
                    ? this.lines
                    : (typeof FALLBACK_STATION_LIST !== 'undefined' ? FALLBACK_STATION_LIST : []);
                return [...appLines, ...MRT_STATIC_DB.lines];
            },

            findStation(key) {
                for (const l of this.getAllLines()) {
                    const s = l.StationList.find(x => x.StationKey === key);
                    if (s) return s;
                }
                return MRT_STATION_BY_KEY[key] || null;
            },

            renderArrivalTargets(key) {
                if (this.pinnedStation()?.StationKey === key) {
                    this.renderNearest();
                    this.renderTraffic();
                }
                if (this.expandedKey === key) this.renderStrip();
                if (this.popupStation?.StationKey === key) {
                    const platContainer = document.getElementById('nearestPopupPlatforms');
                    if (platContainer) {
                        const s = this.popupStation;
                        platContainer.innerHTML = renderPlatformSection(s, this.arrivals[key]);
                    }
                }
            },

            /* ---------- countdown tick (อัปเดตตัวเลขโดยไม่ re-render ทั้งหน้า) ---------- */
            tickCountdowns() {
                document.querySelectorAll('[data-eta-base]').forEach(el => {
                    const base = parseFloat(el.dataset.etaBase);
                    const at = parseInt(el.dataset.etaAt, 10);
                    if (isNaN(base) || isNaN(at)) return;
                    const { text, now } = etaText(base - (Date.now() - at) / 60000, el.dataset.etaApprox === '1');
                    el.innerHTML = text;
                    el.classList.toggle('now', now);
                    const btn = el.closest('.train');
                    if (btn) btn.classList.toggle('is-arriving', now);
                });
            },

            /* ---------- render: nearest card ---------- */
            renderNearest() {
                const el = document.getElementById('nearestBody');
                if (this.locating && !this.nearest) {
                    el.innerHTML = `<button class="btn btn-big" disabled><span class="spin"></span> ${T('locating')}</button>`;
                    return;
                }
                if (!this.nearest) {
                    el.innerHTML =
                        (this.locError ? `<div class="err-box" style="margin:0 0 10px">${this.locError}</div>` : '') +
                        `<button class="btn btn-big" onclick="App.locate(true)">📍 ${T('findNearest')}</button>`;
                    return;
                }
                const pin = this.nearestList.find(r => r.station.StationKey === this.pinnedKey) || this.nearest;
                const s = pin.station;
                const color = s.StationLineColor || '#7AB420';
                const arr = this.arrivals[s.StationKey];
                const staticTime = usesStaticTimetable(s);

                const chips = this.nearestList.map(r => {
                    const isSel = r.station.StationKey === this.pinnedKey;
                    const lineId = r.station.StationLineId || 1;
                    return `<button class="alt-chip ${isSel ? 'on' : ''}"
                        onclick="App.pinStation('${r.station.StationKey}')">
                        ${getLineIconSvg(lineId, isSel, 15)}
                        <span><b>${esc(r.station.StationKey)}</b> ${esc(stName(r.station))}</span> <span class="km">${fmtDist(r.km)}</span></button>`;
                }).join('');

                const crowded = s.IsCrowded === true;
                // ยังไม่รู้ตำแหน่งจริง (km == null) — แสดงปุ่มค้นหาสถานีใกล้ฉัน
                const isFallback = pin.km == null;
                const isAtStation = pin.km != null && pin.km <= 0.12;

                const fallbackBtn = !isFallback ? '' : (this.locating
                    ? `<button class="btn btn-big" style="margin-bottom:10px" disabled><span class="spin"></span> ${T('locating')}</button>`
                    : `<button class="btn btn-big" style="margin-bottom:10px" onclick="App.locate(true)">📍 ${T('findNearest')}</button>`);

                const distChip = isFallback
                    ? `<div class="dist-chip" onclick="App.locate(true)" style="cursor:pointer;" title="${T('findNearest')}">
                        <div class="v" style="color:var(--muted)">-- km</div>
                        <div class="l">${T('fromYou')}</div>
                       </div>`
                    : (isAtStation
                        ? `<div class="dist-chip at-station" style="background:rgba(16,185,129,0.12);border:1px solid #10b981"><div class="v" style="color:#10b981;font-weight:700">📍 ${T('atStation')}</div><div class="l" style="color:var(--text-sub,#64748b)">${T('currentLocation')}</div></div>`
                        : `<div class="dist-chip"><div class="v">${fmtDist(pin.km)}</div><div class="l">${T('fromYou')}</div></div>`);

                el.innerHTML = `
                    ${this.locError ? `<div class="err-box" style="margin:0 0 10px">${this.locError}</div>` : ''}
                    ${fallbackBtn}
                    <div class="station-hero${crowded ? ' crowded' : ''}">
                        <div class="key-badge" style="background:${color}">${esc(s.StationKey)}</div>
                        <div class="names">
                            <div class="th">${esc(stName(s))}${crowded ? ` <span class="badge crowd-b">${T('crowded')}</span>` : ''}</div>
                            ${(s.StationKey === SIAM_KEY || (App.connections[s.StationKey] || []).length)
                        ? `<div class="en">${s.StationKey === SIAM_KEY ? `<span class="badge inter-b">${T('interchange')}</span>` : ''}${connBadges(s.StationKey, s.StationLineId)}</div>` : ''}
                        </div>
                        ${distChip}
                    </div>
                    ${this.renderCrowdGauge(s)}
                    <div class="alt-row">${chips}</div>
                    ${renderPlatformSection(s, arr)}
                    ${renderRouteSection(s)}`;
                this.updatePopupDistance(s);
            },

            /* ---------- render: line tabs ---------- */
            renderTabs() {
                if (!this.lines.length) return;
                const allLines = [...this.lines, ...MRT_STATIC_DB.lines];
                document.getElementById('lineTabs').innerHTML = allLines.map(l => {
                    const on = l.LineId === this.activeLine;
                    const st = this.traffic?.lines?.find(x => x.LineId === l.LineId);
                    const warn = st && st.TrafficStatus !== 1 ? ' ⚠️' : '';
                    return `<button class="tab ${on ? 'on' : ''}" style="${on ? 'background:' + l.LineColor : ''}"
                        onclick="App.setLine(${l.LineId})">
                        ${getLineIconSvg(l.LineId, on, 18)}
                        <span>${esc(shortLineName(l))}${warn}</span></button>`;
                }).join('');
            },

            setLine(id) {
                this.userPickedLineManually = true;
                this.activeLine = id;
                this.expandedKey = null;
                this.renderTabs();
                this.renderStrip();
                this.syncUrl();
                this.scrollActiveTabIntoView();
            },

            scrollActiveTabIntoView(smooth = true) {
                requestAnimationFrame(() => {
                    const tabsEl = document.getElementById('lineTabs');
                    const activeTab = tabsEl ? tabsEl.querySelector('.tab.on') : null;
                    if (tabsEl && activeTab && tabsEl.clientWidth > 0) {
                        const tabLeft = activeTab.offsetLeft;
                        const tabWidth = activeTab.offsetWidth;
                        const containerWidth = tabsEl.clientWidth;
                        const scrollTarget = tabLeft - (containerWidth / 2) + (tabWidth / 2);
                        tabsEl.scrollTo({
                            left: Math.max(0, scrollTarget),
                            behavior: smooth ? 'smooth' : 'auto'
                        });
                    }
                });
            },

            syncLineToStation(station, force = false) {
                if (!station || !station.StationLineId) return;
                const stationKey = station.StationKey;
                const lineId = station.StationLineId;

                // หากผู้ใช้จงใจเลือกสายด้วยตนเองไปแล้ว และสถานีที่ตรวจจับยังคงเป็นสถานีเดิม ไม่สลับสายกลับไปกวนใจ
                if (!force && this.userPickedLineManually && this.lastSyncedStationKey === stationKey) {
                    return;
                }

                this.lastSyncedStationKey = stationKey;
                if (force) {
                    this.userPickedLineManually = false;
                }

                if (this.activeLine !== lineId) {
                    this.activeLine = lineId;
                    this.renderTabs();
                    this.renderStrip();
                    this.syncUrl();
                }
                this.scrollActiveTabIntoView();
            },

            /* ---------- render: strip (line map) ---------- */
            renderStrip() {
                const el = document.getElementById('strip');
                if (!this.lines.length) return;
                const q = document.getElementById('searchInput').value.trim().toLowerCase();
                const isMrtLine = isMrtLineId(this.activeLine);

                let stations, lineColor;
                if (q) {
                    // ค้นหารวม BTS + MRT แต่กรองเฉพาะสายที่เลือก (activeLine)
                    const seen = new Set();
                    const allSt = [
                        ...this.lines.flatMap(l => l.StationList),
                        ...MRT_STATIC_DB.lines.flatMap(l => l.StationList)
                    ];
                    stations = allSt.filter(s => {
                        const hay = `${s.StationNameTH} ${s.StationNameEN || ''} ${s.StationKey}`.toLowerCase();
                        const belongsToActive = (this.keyLines[s.StationKey] || []).some(kl => kl.lineId === this.activeLine);
                        return hay.includes(q) && belongsToActive && !seen.has(s.StationKey) && seen.add(s.StationKey);
                    });
                    lineColor = isMrtLine ? MRT_LINE_BY_ID[this.activeLine]?.LineColor : this.lineById[this.activeLine]?.LineColor;
                    if (!stations.length) {
                        el.innerHTML = `<div class="empty-note" style="padding:24px">${T('notFound', esc(q))}</div>`;
                        return;
                    }
                } else if (isMrtLine) {
                    const mrtLine = MRT_LINE_BY_ID[this.activeLine];
                    // dedupe (BL01 ท่าพระ ปรากฏ 2 ครั้งในวงวน)
                    const seen = new Set();
                    stations = mrtLine ? mrtLine.StationList.filter(s => !seen.has(s.StationKey) && seen.add(s.StationKey)) : [];
                    lineColor = mrtLine?.LineColor;
                } else {
                    const line = this.lineById[this.activeLine];
                    stations = line ? line.StationList : [];
                    lineColor = line?.LineColor;
                }

                el.innerHTML = stations.map(s => {
                    const staticTime = usesStaticTimetable(s);
                    const color = lineColor || s.StationLineColor;
                    // สถานีสำรอง (km == null) ไม่ใช่ "ใกล้คุณ" จริง — ไม่ติด badge/วงแหวน
                    const isNear = this.nearest && this.nearest.km != null
                        && s.StationKey === this.nearest.station.StationKey;
                    const isSiam = s.StationKey === SIAM_KEY;
                    const open = this.expandedKey === s.StationKey;
                    const km = (this.userPos && s.Latitude && s.Longitude)
                        ? haversineKm(this.userPos.lat, this.userPos.lon, s.Latitude, s.Longitude) : null;
                    const arr = open ? this.arrivals[s.StationKey] : null;
                    // IsCrowded มีเฉพาะสายจาก StationList API — สาย MRT static ไม่มีฟิลด์นี้
                    const crowded = s.IsCrowded === true;
                    return `
                    <div class="st-row${crowded ? ' crowded' : ''}" id="row-${esc(s.StationKey)}-${s.StationLineId}">
                        <div class="st-rail">
                            <div class="track" style="background:${color}${q ? '22' : ''}"></div>
                            <div class="node ${isSiam ? 'inter' : ''} ${isNear ? 'near' : ''}" style="border-color:${color}"></div>
                        </div>
                        <div class="st-main">
                            <button class="st-btn" onclick="App.toggleStation('${esc(s.StationKey)}')">
                                <span class="st-key" style="background:${color}">${esc(s.StationKey)}</span>
                                <div class="names">
                                    <div class="th">${esc(stName(s))}
                                        ${crowded ? `<span class="badge crowd-b">${T('crowded')}</span>` : ''}
                                        ${isNear ? `<span class="badge near-b">${T('nearYou')}</span>` : ''}
                                        ${isSiam ? `<span class="badge inter-b">${T('fourPlat')}</span>` : ''}
                                        ${connBadges(s.StationKey, s.StationLineId)}
                                    </div>
                                </div>
                                ${km != null ? `<span class="st-dist">${fmtDist(km)}</span>` : ''}
                            </button>
                            ${open ? `<div class="st-expand">
                                    <div class="x-head">
                                        <span class="updated">${arr?.time ? T('updated', esc(arr.time.split(' ')[1] || arr.time)) : ''}</span>
                                        <button class="btn btn-ghost" onclick="App.loadArrivals(App.findStation('${esc(s.StationKey)}'), true)">${T('refresh')}</button>
                                    </div>
                                    ${renderPlatformSection(s, arr)}
                                    ${renderRouteSection(s)}
                                </div>` : ''}
                        </div>
                    </div>`;
                }).join('');
            },

            toggleStation(key) {
                if (this.expandedKey === key) {
                    this.expandedKey = null;
                    this.renderStrip();
                    this.syncUrl();
                    return;
                }
                this.expandedKey = key;
                this.renderStrip();
                this.syncUrl();
                const station = this.findStation(key);
                if (station) {
                    this.loadArrivals(station);
                }
                // เลื่อนให้เห็นการ์ดที่เพิ่งกาง
                requestAnimationFrame(() => {
                    document.querySelector(`[id^="row-${CSS.escape(key)}-"]`)
                        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                });
            }
        };

        /* ================= TIMETABLE ARRIVALS GENERATOR ================= */
        function generateTimetableArrivals(station) {
            if (!station) return null;
            const lineId = station.StationLineId;
            const key = station.StationKey;
            const freq = getCurrentMrtFreq(lineId, key);
            if (!freq) {
                // นอกเวลาให้บริการ (เช่น 01:00–05:00)
                return {
                    isTimetable: true,
                    time: null,
                    fetchedAt: Date.now(),
                    platform_list: []
                };
            }

            const interval = Number(freq.minutes) || 10;
            const now = new Date();
            const nowSec = (now.getHours() * 3600) + (now.getMinutes() * 60) + now.getSeconds() + (now.getMilliseconds() / 1000);
            const nowMin = nowSec / 60;
            const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

            // Helper ดึงชื่อสถานีปลายทางแบบ 2 ภาษา (ไทย | อังกฤษ) เพื่อให้ destName แยกภาษาได้อัตโนมัติ
            const getDestPair = (destKey, fallbackTh, fallbackEn) => {
                const s = App.findStation(destKey);
                if (!s) return `${fallbackTh} | ${fallbackEn}`;
                const th = s.StationNameTH || s.StationName || fallbackTh;
                const en = s.StationNameEN || fallbackEn;
                return `${th} | ${en}`;
            };

            // Helper สร้าง 3 ขบวนสำหรับแต่ละชานชาลา พร้อมความต่อเนื่องของรหัสขบวน
            const makeTrains = (platform, destStr, destKey, offset, isTerminating) => {
                if (isTerminating) return [];
                const cycle = Math.floor((nowMin - offset) / interval);
                const trains = [];
                for (let i = 1; i <= 3; i++) {
                    const K = cycle + i;
                    const trainArrivalMin = (K * interval) + offset;
                    const eta = trainArrivalMin - nowMin;
                    const isArriving = eta <= 0.35;
                    const m = Math.max(0, eta);
                    const trainSeq = ((K % 50) + 50) % 50 + 1;
                    const trainNo = `${lineId}-${platform}-${trainSeq}`;
                    trains.push({
                        trainNo,
                        status: isArriving ? 'arriving' : 'pending',
                        station: destStr,
                        station_key: destKey,
                        time_come: isArriving ? '0' : String(Math.round(m)),
                        time_come_double: m
                    });
                }
                return trains;
            };

            const color = station.StationLineColor || LINE_BRAND_COLORS[lineId] || '#64748B';
            const platforms = [];

            // 1. สายสีทอง (LineId: 3) — G1 (กรุงธนบุรี) <-> G3 (คลองสาน)
            if (isGoldLineId(lineId)) {
                const orderMap = { 'G1': 0, 'G2': 1, 'G3': 2 };
                const idx = orderMap[key] != null ? orderMap[key] : 1;
                const travelPerStation = 1.8;

                // Platform 1: ไปคลองสาน (G3)
                const isTerm1 = (key === 'G3');
                const offset1 = idx * travelPerStation;
                const dest1 = getDestPair('G3', 'คลองสาน', 'Khlong San');
                platforms.push({
                    platform: 1,
                    LineId: lineId,
                    LineColor: color,
                    DestinationStation: dest1,
                    DestinationStation_key: 'G3',
                    isDropOffOnly: isTerm1,
                    train_list: makeTrains(1, dest1, 'G3', offset1, isTerm1)
                });

                // Platform 2: ไปกรุงธนบุรี (G1)
                const isTerm2 = (key === 'G1');
                const offset2 = (2 - idx) * travelPerStation + (interval * 0.5);
                const dest2 = getDestPair('G1', 'กรุงธนบุรี', 'Krung Thon Buri');
                platforms.push({
                    platform: 2,
                    LineId: lineId,
                    LineColor: color,
                    DestinationStation: dest2,
                    DestinationStation_key: 'G1',
                    isDropOffOnly: isTerm2,
                    train_list: makeTrains(2, dest2, 'G1', offset2, isTerm2)
                });
            }

            // 2. สายสีม่วง (LineId: 102) — PP01 (คลองบางไผ่) <-> PP16 (เตาปูน)
            else if (lineId === MRT_LINE_IDS.PURPLE) {
                const num = parseInt(key.replace(/\D/g, ''), 10) || 1;
                const idx = Math.max(0, Math.min(15, num - 1));
                const travelPerStation = 2.1;

                // Platform 1: ไปเตาปูน (PP16)
                const isTerm1 = (key === 'PP16');
                const offset1 = idx * travelPerStation;
                const dest1 = getDestPair('PP16', 'เตาปูน', 'Tao Poon');
                platforms.push({
                    platform: 1,
                    LineId: lineId,
                    LineColor: color,
                    DestinationStation: dest1,
                    DestinationStation_key: 'PP16',
                    isDropOffOnly: isTerm1,
                    train_list: makeTrains(1, dest1, 'PP16', offset1, isTerm1)
                });

                // Platform 2: ไปคลองบางไผ่ (PP01)
                const isTerm2 = (key === 'PP01');
                const offset2 = (15 - idx) * travelPerStation + (interval * 0.5);
                const dest2 = getDestPair('PP01', 'คลองบางไผ่', 'Khlong Bang Phai');
                platforms.push({
                    platform: 2,
                    LineId: lineId,
                    LineColor: color,
                    DestinationStation: dest2,
                    DestinationStation_key: 'PP01',
                    isDropOffOnly: isTerm2,
                    train_list: makeTrains(2, dest2, 'PP01', offset2, isTerm2)
                });
            }

            // 3. แอร์พอร์ต ลิงก์ (LineId: 104) — A8 (พญาไท) <-> A1 (สุวรรณภูมิ)
            else if (lineId === MRT_LINE_IDS.ARL) {
                const num = parseInt(key.replace(/\D/g, ''), 10) || 8;
                const idx = Math.max(0, Math.min(7, 8 - num));
                const travelPerStation = 3.2;

                // Platform 1: ไปสุวรรณภูมิ (A1)
                const isTerm1 = (key === 'A1');
                const offset1 = idx * travelPerStation;
                const dest1 = getDestPair('A1', 'สุวรรณภูมิ', 'Suvarnabhumi');
                platforms.push({
                    platform: 1,
                    LineId: lineId,
                    LineColor: color,
                    DestinationStation: dest1,
                    DestinationStation_key: 'A1',
                    isDropOffOnly: isTerm1,
                    train_list: makeTrains(1, dest1, 'A1', offset1, isTerm1)
                });

                // Platform 2: ไปพญาไท (A8)
                const isTerm2 = (key === 'A8');
                const offset2 = (7 - idx) * travelPerStation + (interval * 0.5);
                const dest2 = getDestPair('A8', 'พญาไท', 'Phaya Thai');
                platforms.push({
                    platform: 2,
                    LineId: lineId,
                    LineColor: color,
                    DestinationStation: dest2,
                    DestinationStation_key: 'A8',
                    isDropOffOnly: isTerm2,
                    train_list: makeTrains(2, dest2, 'A8', offset2, isTerm2)
                });
            }

            // 4. สายสีแดง (LineId: 103) — North (RN01..RN10) & West (RW04..RW02, RN01)
            else if (lineId === MRT_LINE_IDS.RED) {
                const isWest = key.startsWith('RW');
                const travelPerStation = 2.4;

                if (key === 'RN01') {
                    // ชุมทางกลางกรุงเทพอภิวัฒน์: Plat 1 -> รังสิต (RN10), Plat 2 -> ตลิ่งชัน (RW04)
                    const dest1 = getDestPair('RN10', 'รังสิต', 'Rangsit');
                    const dest2 = getDestPair('RW04', 'ตลิ่งชัน', 'Taling Chan');
                    platforms.push({
                        platform: 1,
                        LineId: lineId,
                        LineColor: color,
                        DestinationStation: dest1,
                        DestinationStation_key: 'RN10',
                        isDropOffOnly: false,
                        train_list: makeTrains(1, dest1, 'RN10', 0, false)
                    });
                    platforms.push({
                        platform: 2,
                        LineId: lineId,
                        LineColor: color,
                        DestinationStation: dest2,
                        DestinationStation_key: 'RW04',
                        isDropOffOnly: false,
                        train_list: makeTrains(2, dest2, 'RW04', interval * 0.5, false)
                    });
                } else if (isWest) {
                    // สายสีแดงฝั่งตะวันตก (RW02..RW04)
                    const orderWest = { 'RW04': 0, 'RW03': 1, 'RW02': 2 };
                    const idx = orderWest[key] != null ? orderWest[key] : 1;
                    const dest1 = getDestPair('RW04', 'ตลิ่งชัน', 'Taling Chan');
                    const dest2 = getDestPair('RN01', 'กรุงเทพ อภิวัฒน์', 'Krung Thep Aphiwat');
                    const isTerm1 = (key === 'RW04');

                    platforms.push({
                        platform: 1,
                        LineId: lineId,
                        LineColor: color,
                        DestinationStation: dest1,
                        DestinationStation_key: 'RW04',
                        isDropOffOnly: isTerm1,
                        train_list: makeTrains(1, dest1, 'RW04', (2 - idx) * travelPerStation, isTerm1)
                    });
                    platforms.push({
                        platform: 2,
                        LineId: lineId,
                        LineColor: color,
                        DestinationStation: dest2,
                        DestinationStation_key: 'RN01',
                        isDropOffOnly: false,
                        train_list: makeTrains(2, dest2, 'RN01', idx * travelPerStation + (interval * 0.5), false)
                    });
                } else {
                    // สายสีแดงฝั่งเหนือ (RN02..RN10)
                    const num = parseInt(key.replace(/\D/g, ''), 10) || 1;
                    const idx = Math.max(0, Math.min(9, num - 1));
                    const isTerm1 = (key === 'RN10');
                    const dest1 = getDestPair('RN10', 'รังสิต', 'Rangsit');
                    const dest2 = getDestPair('RN01', 'กรุงเทพ อภิวัฒน์', 'Krung Thep Aphiwat');

                    platforms.push({
                        platform: 1,
                        LineId: lineId,
                        LineColor: color,
                        DestinationStation: dest1,
                        DestinationStation_key: 'RN10',
                        isDropOffOnly: isTerm1,
                        train_list: makeTrains(1, dest1, 'RN10', idx * travelPerStation, isTerm1)
                    });
                    platforms.push({
                        platform: 2,
                        LineId: lineId,
                        LineColor: color,
                        DestinationStation: dest2,
                        DestinationStation_key: 'RN01',
                        isDropOffOnly: false,
                        train_list: makeTrains(2, dest2, 'RN01', (9 - idx) * travelPerStation + (interval * 0.5), false)
                    });
                }
            }

            // 5. สายสีน้ำเงิน (LineId: 101) — BL01..BL38
            else {
                const blueLine = MRT_STATIC_DB.lines.find(l => l.LineId === MRT_LINE_IDS.BLUE);
                const list = blueLine?.StationList || [];
                const idx = Math.max(0, list.findIndex(s => s.StationKey === key));
                const travelPerStation = 2.0;

                const isTerm1 = (key === 'BL38');
                const dest1 = getDestPair('BL38', 'หลักสอง', 'Lak Song');
                const dest2 = getDestPair('BL01', 'ท่าพระ', 'Tha Phra');

                platforms.push({
                    platform: 1,
                    LineId: lineId,
                    LineColor: color,
                    DestinationStation: dest1,
                    DestinationStation_key: 'BL38',
                    isDropOffOnly: isTerm1,
                    train_list: makeTrains(1, dest1, 'BL38', idx * travelPerStation, isTerm1)
                });
                platforms.push({
                    platform: 2,
                    LineId: lineId,
                    LineColor: color,
                    DestinationStation: dest2,
                    DestinationStation_key: 'BL01',
                    isDropOffOnly: false,
                    train_list: makeTrains(2, dest2, 'BL01', (Math.max(0, list.length - 1 - idx)) * travelPerStation + (interval * 0.5), false)
                });
            }

            return {
                isTimetable: true,
                time: timeStr,
                fetchedAt: Date.now(),
                platform_list: platforms
            };
        }

        /* ================= MRT FREQUENCY RENDER ================= */
        function renderMrtFrequency(station) {
            const key = station.StationKey;
            const lineId = station.StationLineId;
            const color = station.StationLineColor || LINE_BRAND_COLORS[lineId] || MRT_COLORS.BLUE;
            const freq = getCurrentMrtFreq(lineId, key);
            const table = getMrtFreqTable(lineId, key);

            // Hero: แสดงความถี่ปัจจุบัน
            let heroHtml;
            if (freq) {
                const cleanFreq = String(freq.label || '').replace(/^~/, '');
                heroHtml = `<div class="mrt-freq-hero">
                    <div class="big" style="color:${color}">🚇 ${T('mrtFreqNow', cleanFreq)}</div>
                    <div class="sub">${T('mrtFreqTitle')}</div>
                </div>`;
            } else {
                heroHtml = `<div class="mrt-freq-hero">
                    <div class="big" style="color:var(--muted)">🚇 ${T('mrtOutOfService')}</div>
                    <div class="sub">${T('mrtFreqTitle')}</div>
                </div>`;
            }

            // สร้างตาราง
            const buildTable = (rows) => {
                if (!rows.length) return '';
                return `<table class="mrt-freq-table">
                    <thead><tr><th>${T('mrtTimeRange')}</th><th>${T('mrtFreqCol')}</th></tr></thead>
                    <tbody>${rows.map(r => {
                        const lbl = String(r.freqLabel || '').startsWith('~') ? r.freqLabel : `~${r.freqLabel}`;
                        return `<tr class="${r.isCurrent ? 'now' : ''}">
                            <td>${esc(r.timeStr)}</td><td>${esc(lbl)} ${T('minUnit').trim()}</td>
                        </tr>`;
                    }).join('')}</tbody>
                </table>`;
            };

            // segment note สำหรับ Blue outer stations
            let segNote = '';
            if (table.isBlueOuter) {
                const segName = lang === 'en'
                    ? (key.startsWith('BL3') || key === 'BL38' ? 'Phetkasem 48–Lak Song' : 'Tha Phra–Bang Pho')
                    : (key.startsWith('BL3') || key === 'BL38' ? 'เพชรเกษม 48–หลักสอง' : 'ท่าพระ–บางโพ');
                segNote = `<div class="mrt-freq-note">${T('mrtSegmentNote').replace('{seg}', segName)}</div>`;
            }

            return `<div class="mrt-freq">
                ${heroHtml}
                <div class="mrt-freq-daytype">🗓️ ${T('mrtWeekday')}</div>
                ${buildTable(table.weekday)}
                <div class="mrt-freq-daytype">🗓️ ${T('mrtWeekend')}</div>
                ${buildTable(table.weekend)}
                ${segNote}
                <div class="mrt-freq-note">${T('mrtFreqNote')}</div>
            </div>`;
        }

        /* ===== BTS Green Line frequency table (แสดงตอนไม่มีรถวิ่ง เช่น กลางคืน) ===== */
        function buildBtsFreqRows(schedule, isActive) {
            const now = new Date();
            const nowMin = timeToMinutes(now.getHours(), now.getMinutes());
            return schedule.map(row => {
                const start = timeToMinutes(row[0], row[1]);
                const end = timeToMinutes(row[2], row[3]);
                const isCurrent = isActive && nowMin >= start && nowMin < end;
                const sh = String(row[0]).padStart(2, '0'), sm = String(row[1]).padStart(2, '0');
                const eh = String(row[2] === 24 ? 0 : row[2]).padStart(2, '0'), em = String(row[3]).padStart(2, '0');
                return { timeStr: `${sh}:${sm}–${eh === '00' && row[2] === 24 ? '00' : eh}:${em}`, freqLabel: row[4], isCurrent };
            });
        }

        function renderBtsFrequency(station) {
            // หาสายสีเขียวที่จะแสดงตาราง (สยามมี 2 สาย — ใช้สายที่กำลังดูอยู่)
            const ids = [];
            if (App.activeLine === 1 || App.activeLine === 2) ids.push(App.activeLine);
            if ((station.StationLineId === 1 || station.StationLineId === 2)
                && !ids.includes(station.StationLineId)) ids.push(station.StationLineId);
            if (!ids.length) return '';
            const we = isWeekend();
            const tbl = rows => `<table class="mrt-freq-table">
                <thead><tr><th>${T('mrtTimeRange')}</th><th>${T('mrtFreqCol')}</th></tr></thead>
                <tbody>${rows.map(r => {
                    const lbl = String(r.freqLabel || '').startsWith('~') ? r.freqLabel : `~${r.freqLabel}`;
                    return `<tr class="${r.isCurrent ? 'now' : ''}">
                        <td>${esc(r.timeStr)}</td><td>${esc(lbl)} ${T('minUnit').trim()}</td></tr>`;
                }).join('')}</tbody>
            </table>`;
            return ids.map(lineId => {
                const data = getBtsFreqData(lineId);
                if (!data) return '';
                const line = App.lineById[lineId];
                const color = line?.LineColor || '#7AB420';
                const lineName = line ? shortLineName(line) : '';
                const freq = getCurrentMrtFreq(lineId, station.StationKey);
                let heroHtml;
                if (freq) {
                    const cleanFreq = String(freq.label || '').replace(/^~/, '');
                    heroHtml = `<div class="mrt-freq-hero">
                        <div class="big" style="color:${color}">🚇 ${T('mrtFreqNow', cleanFreq)}</div>
                        <div class="sub">${T('mrtFreqTitle')} · ${esc(lineName)}</div>
                    </div>`;
                } else {
                    heroHtml = `<div class="mrt-freq-hero">
                        <div class="big" style="color:var(--muted)">🚇 ${T('mrtOutOfService')}</div>
                        <div class="sub">${T('mrtFreqTitle')} · ${esc(lineName)}</div>
                    </div>`;
                }
                return `<div class="mrt-freq">
                    ${heroHtml}
                    <div class="mrt-freq-daytype">🗓️ ${T('mrtWeekday')}</div>
                    ${tbl(buildBtsFreqRows(data.weekday, !we))}
                    <div class="mrt-freq-daytype">🗓️ ${T('mrtWeekend')}</div>
                    ${tbl(buildBtsFreqRows(data.weekend, we))}
                    ${lineId === 1 ? `<div class="mrt-freq-note">${T('btsSegNote')}</div>` : ''}
                    <div class="mrt-freq-note">${T('mrtFreqNote')}</div>
                </div>`;
            }).join('');
        }

        /* ================= SHARED RENDER HELPERS ================= */
        const LINE_BRAND_COLORS = {
            1: '#7AB420',    // Sukhumvit (Green)
            2: '#00807D',    // Silom (Teal)
            3: '#C9A038',    // Gold (APM)
            4: '#FFD100',    // Yellow (Monorail)
            5: '#EC4899',    // Pink (Monorail)
            101: '#0284C7',  // Blue (MRT Subway)
            102: '#8A2C9B',  // Purple (MRT Elevated)
            103: '#DC2626',  // Red (SRT Commuter)
            104: '#8A1538',  // ARL (Airport Express)
            0: '#64748B'     // All lines
        };

        function getLineIconSvg(lineId, active = false, size = 18) {
            const id = Number(lineId) || 0;
            const color = LINE_BRAND_COLORS[id] || '#64748B';
            const isYellow = id === 4;
            const c = active ? '#ffffff' : color;
            const filter = (active && isYellow) ? 'filter: drop-shadow(0 1px 2px rgba(0,0,0,0.6));' : '';

            let inner = '';

            if (id === 1 || id === 2) {
                // BTS Skytrain: Elevated Viaduct + Heavy Rail EMU with aerodynamic windshield
                inner = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M2 21h20M6 21v-3M18 21v-3" stroke-width="2"/>
                    <rect x="4" y="3" width="16" height="15" rx="3.5" fill="${c}" fill-opacity="0.22"/>
                    <path d="M6 7.5h12c0 2.2-1 4.5-6 4.5s-6-2.3-6-4.5z" fill="${c}"/>
                    <circle cx="7.5" cy="15" r="1.3" fill="${c}"/>
                    <circle cx="16.5" cy="15" r="1.3" fill="${c}"/>
                    <line x1="9" y1="5.2" x2="15" y2="5.2" stroke-width="1.6"/>
                </svg>`;
            } else if (id === 3) {
                // Gold Line: APM People Mover - Compact driverless shuttle, big panoramic glass, rubber tyre guide rail
                inner = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <line x1="3" y1="21" x2="21" y2="21" stroke-width="2"/>
                    <rect x="9.5" y="18" width="5" height="3" rx="0.5" fill="${c}"/>
                    <rect x="4.5" y="3.5" width="15" height="14.5" rx="5" fill="${c}" fill-opacity="0.22"/>
                    <rect x="6.5" y="6" width="11" height="7.5" rx="3" fill="${c}"/>
                    <circle cx="7.5" cy="15.5" r="1.3" fill="${c}"/>
                    <circle cx="16.5" cy="15.5" r="1.3" fill="${c}"/>
                </svg>`;
            } else if (id === 4 || id === 5) {
                // Yellow & Pink Lines: Straddle Monorail (Body straddling central concrete beam)
                inner = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <line x1="12" y1="18" x2="12" y2="22" stroke-width="3"/>
                    <rect x="9" y="14" width="6" height="5" rx="0.5" fill="${c}" fill-opacity="0.4"/>
                    <path d="M5 16V9c0-4 3.2-6 7-6s7 2 7 6v7c0 1-.8 1.5-2 1.5h-2c-.8 0-1-.5-1.2-1.2l-.6-2.3h-2.4l-.6 2.3c-.2.7-.4 1.2-1.2 1.2H7c-1.2 0-2-.5-2-1.5z" fill="${c}" fill-opacity="0.22"/>
                    <path d="M7 8c1.2-2.5 2.8-3.5 5-3.5s3.8 1 5 3.5v3.5H7V8z" fill="${c}"/>
                    <circle cx="7.5" cy="14" r="1.1" fill="${c}"/>
                    <circle cx="16.5" cy="14" r="1.1" fill="${c}"/>
                </svg>`;
            } else if (id === 101) {
                // MRT Blue Line: Bangkok Subway & Metro (Underground tunnel arch + Metro train)
                inner = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M2.5 20V11a9.5 9.5 0 0 1 19 0v9" stroke-width="1.6" opacity="0.6"/>
                    <line x1="2" y1="20" x2="22" y2="20" stroke-width="2"/>
                    <rect x="5.5" y="6" width="13" height="12" rx="3" fill="${c}" fill-opacity="0.22"/>
                    <rect x="7.2" y="8" width="9.6" height="4.8" rx="1.5" fill="${c}"/>
                    <line x1="7.5" y1="15" x2="9.5" y2="15" stroke-width="2"/>
                    <line x1="14.5" y1="15" x2="16.5" y2="15" stroke-width="2"/>
                </svg>`;
            } else if (id === 102) {
                // MRT Purple Line: Elevated Heavy Rail Metro (J-TREC Sustina EMU)
                inner = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <line x1="2" y1="20" x2="22" y2="20" stroke-width="2"/>
                    <path d="M6 20l-2 3M18 20l2 3" stroke-width="1.8"/>
                    <rect x="5" y="5.5" width="14" height="13" rx="2.5" fill="${c}" fill-opacity="0.22"/>
                    <path d="M8.5 3h7v2.5h-7z" fill="${c}"/>
                    <path d="M7 8h10v4.5H7z" rx="1" fill="${c}"/>
                    <circle cx="8" cy="15" r="1.3" fill="${c}"/>
                    <circle cx="16" cy="15" r="1.3" fill="${c}"/>
                    <line x1="10.5" y1="15" x2="13.5" y2="15" stroke-width="1.5"/>
                </svg>`;
            } else if (id === 103) {
                // SRT Red Line: State Railway Commuter EMU (Hitachi) with overhead Catenary Pantograph
                inner = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M12 2l-3.5 3.5h7L12 2m0 3.5v2" stroke-width="1.5"/>
                    <path d="M5 7.5h14c1 0 1.5.5 1.5 1.8v7.4c0 1-.5 1.5-1.5 1.5H5c-1 0-1.5-.5-1.5-1.5V9.3c0-1.3.5-1.8 1.5-1.8z" fill="${c}" fill-opacity="0.22"/>
                    <rect x="6.5" y="9.5" width="11" height="4" rx="1" fill="${c}"/>
                    <circle cx="8" cy="15.2" r="1.3" fill="${c}"/>
                    <circle cx="16" cy="15.2" r="1.3" fill="${c}"/>
                    <line x1="2" y1="21" x2="22" y2="21" stroke-width="2"/>
                    <line x1="6" y1="18.2" x2="18" y2="18.2" stroke-width="1.5" opacity="0.6"/>
                </svg>`;
            } else if (id === 104) {
                // Airport Rail Link: Airport Express Bullet Train with Airplane ✈️
                inner = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M4 16.5V9.5c0-4 3.5-6.5 8-6.5s8 2.5 8 6.5v7c0 1-.8 1.5-1.8 1.5H5.8C4.8 18 4 17.5 4 16.5z" fill="${c}" fill-opacity="0.22"/>
                    <path d="M6.5 9c1-2.5 2.5-3.5 5.5-3.5s4.5 1 5.5 3.5v2.8H6.5V9z" fill="${c}"/>
                    <path d="M12 11.8l1.6 2.6h2.2l-2.4 1.4 1 2.8-2.4-1.4-2.4 1.4 1-2.8-2.4-1.4h2.2z" fill="${c}" stroke-width="0.5"/>
                    <line x1="2" y1="21" x2="22" y2="21" stroke-width="2"/>
                </svg>`;
            } else {
                // All Lines (Line 0): Transit Network Hub
                inner = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <circle cx="6" cy="6" r="2.8" fill="${c}"/>
                    <circle cx="18" cy="6" r="2.8" fill="${c}"/>
                    <circle cx="12" cy="18" r="2.8" fill="${c}"/>
                    <path d="M8.8 6h6.4M7.4 8.4l3.2 7.2M16.6 8.4l-3.2 7.2" stroke-width="2"/>
                </svg>`;
            }

            return `<span class="line-icon-wrap" style="width:${size}px;height:${size}px;${filter}">${inner}</span>`;
        }

        function esc(s) {
            return String(s ?? '').replace(/[&<>"']/g, c =>
                ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
        }

        function shortLineName(l) {
            const map = T('lines');
            return map[l.LineId]
                || (lang === 'en' ? (l.LineName_EN || l.LineName_TH) : (l.LineName_TH || l.LineName_EN));
        }

        function isBrightColor(col) {
            if (!col) return false;
            if (col === '#FFD100' || col === '#F5C242' || col === '#EAB308' || col === '#F1A80A') return true;
            const c = String(col).replace('#', '');
            if (c.length === 6) {
                const r = parseInt(c.slice(0, 2), 16);
                const g = parseInt(c.slice(2, 4), 16);
                const b = parseInt(c.slice(4, 6), 16);
                return (r * 299 + g * 587 + b * 114) / 1000 > 175;
            }
            return false;
        }

        function getLineOptLabel(l) {
            if (!l) return '';
            const th = l.LineName_TH || l.LineNameTH || '';
            const en = l.LineName_EN || l.LineNameEN || '';
            if (lang === 'en') {
                return en || th;
            }
            const name = th.startsWith('สาย') ? th : ('สาย' + th);
            return en ? `${name} (${en})` : name;
        }

        // คืน {text, now} สำหรับ ETA (นาทีคงเหลือ ณ ตอนนี้) — approx = ค่าจากความจำ ใส่ ~ นำหน้า
        function etaText(mins, approx) {
            if (isNaN(mins)) return { text: '<small>--</small>', now: false };
            if (mins <= 0.5) return { text: T('arrived'), now: true };
            return { text: (approx ? '~' : '') + Math.round(mins) + `<small>${T('minUnit')}</small>`, now: false };
        }

        // เวลา "ที่ดีที่สุดที่รู้" ของขบวน: ใช้ค่าจาก API ถ้ามี — ถ้าตอบ "--" ใช้ค่าเลขรอบก่อน
        // จาก etaMem (นับถอยหลังต่อเนื่อง) จนกว่าจะได้เลขใหม่ ผู้ใช้จะไม่เห็นเวลาวูบหาย
        function bestEta(stationKey, platform, t, fetchedAt) {
            if (t.time_come !== '--' && t.time_come_double != null)
                return { base: t.time_come_double, at: fetchedAt, approx: false };
            const m = App.etaMem[stationKey + '|' + platform + '|' + t.trainNo];
            if (m && (m.base - (Date.now() - m.at) / 60000) > -0.5)
                return { base: m.base, at: m.at, approx: true };
            return null;
        }

        // กรองขบวนที่แสดงได้ของชานชาลา (จัดการขบวนที่ API ตอบ time_come = "--"):
        // - "--" และไม่มีความจำ (เช่นเพิ่งเปิดเว็บครั้งแรก) → ตัดทิ้ง ขบวนถัดไปเลื่อนขึ้นมาแทน
        // - "--" มีความจำ แต่มีขบวนอื่นที่เวลาจริง "น้อยกว่า" ค่าที่จำไว้ → ขบวนนี้ออกไปแล้ว
        //   (ขบวนหลังแซงขบวนหน้าไม่ได้บนรางเดียวกัน) ความจำเก่าเกินจริง ตัดทิ้งเช่นกัน
        // ผลคือบางชานชาลาอาจแสดงแค่ 1-2 ขบวน — ดีกว่าโชว์กล่อง "--" ที่ไม่บอกอะไร
        function displayTrains(stationKey, platform, list, fetchedAt) {
            const out = [];
            for (const t of list || []) {
                if (t.status !== 'pending') { out.push(t); continue; }   // มาแล้ว/จอดอยู่ — แสดงเสมอ
                if (t.time_come !== '--' && t.time_come_double != null) { out.push(t); continue; }
                const eta = bestEta(stationKey, platform, t, fetchedAt);
                if (!eta) continue;
                const remaining = eta.base - (Date.now() - eta.at) / 60000;
                const overtaken = (list || []).some(o => o !== t
                    && o.time_come !== '--' && o.time_come_double != null
                    && (o.time_come_double - (Date.now() - fetchedAt) / 60000) < remaining);
                if (overtaken) continue;
                out.push(t);
            }
            return out.slice(0, 3);
        }

        function terminalSideForLine(stationKey, lineId) {
            const line = App.lineById[lineId];
            const list = line?.StationList || [];
            const idx = list.findIndex(s => s.StationKey === stationKey);
            if (idx < 0 || list.length < 2) return null;
            if (idx === 0) return 'start';
            if (idx === list.length - 1) return 'end';
            return null;
        }

        function ensureTwoPlatformsForTerminal(station, platforms) {
            const result = [...(platforms || [])];
            const lineIds = [...new Set(result.map(p => p.LineId))];
            if (!lineIds.length && station.StationLineId) {
                lineIds.push(station.StationLineId);
            }

            for (const lid of lineIds) {
                const line = App.lineById[lid];
                if (!line || !line.StationList || line.StationList.length < 2) continue;
                const list = line.StationList;
                const idx = list.findIndex(s => s.StationKey === station.StationKey);
                if (idx < 0) continue;

                const linePlats = result.filter(p => p.LineId === lid);
                const hasPlat1 = linePlats.some(p => String(p.platform) === '1');
                const hasPlat2 = linePlats.some(p => String(p.platform) === '2');

                const isTerminalStart = (idx === 0);
                const isTerminalEnd = (idx === list.length - 1);

                if (hasPlat1 && !hasPlat2) {
                    const endStation = list[list.length - 1];
                    const startStation = list[0];
                    const isDropOff = isTerminalStart;
                    const destName = isDropOff
                        ? (station.StationNameTH || station.StationName || 'สิ้นสุดปลายทาง')
                        : (isTerminalEnd ? (startStation.StationNameTH || startStation.StationName) : (endStation.StationNameTH || endStation.StationName));
                    result.push({
                        platform: 2,
                        LineId: lid,
                        LineColor: line.LineColor,
                        DestinationStation: destName,
                        DestinationStation_key: isDropOff ? station.StationKey : (isTerminalEnd ? startStation.StationKey : endStation.StationKey),
                        isDropOffOnly: isDropOff,
                        train_list: []
                    });
                } else if (!hasPlat1 && hasPlat2) {
                    const startStation = list[0];
                    const endStation = list[list.length - 1];
                    const isDropOff = isTerminalEnd;
                    const destName = isDropOff
                        ? (station.StationNameTH || station.StationName || 'สิ้นสุดปลายทาง')
                        : (isTerminalStart ? (endStation.StationNameTH || endStation.StationName) : (startStation.StationNameTH || startStation.StationName));
                    result.unshift({
                        platform: 1,
                        LineId: lid,
                        LineColor: line.LineColor,
                        DestinationStation: destName,
                        DestinationStation_key: isDropOff ? station.StationKey : (isTerminalStart ? endStation.StationKey : startStation.StationKey),
                        isDropOffOnly: isDropOff,
                        train_list: []
                    });
                }
            }

            result.sort((a, b) => {
                if (a.LineId !== b.LineId) return a.LineId - b.LineId;
                return (parseInt(a.platform, 10) || 0) - (parseInt(b.platform, 10) || 0);
            });
            return result;
        }

        function visiblePlatformsForStation(station, platforms) {
            return ensureTwoPlatformsForTerminal(station, platforms || []);
        }

        // error จาก TTA ที่แปลว่า "นอกเวลาให้บริการ" ไม่ใช่เน็ตล่ม — ช่วงกลางคืน (เช่น 1–5 am)
        // API จะตอบทำนอง "this Line is unavailable" หรืออยู่ในช่วงที่ไม่มีรถวิ่งจริง ๆ
        function isOffServiceError(msg) {
            const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
            const inOffWindow = nowMin >= 60 && nowMin < 300; // 01:00–05:00
            // อย่าตีความว่า network error หรือ Failed to fetch คือนอกเวลาให้บริการ
            const isNetErr = /failed to fetch|network|connectfail|abort|timeout/i.test(msg || '');
            if (isNetErr) return false;
            return inOffWindow
                || /unavailable|out of service|no\s*service|not\s*available|ไม่ให้บริการ|ปิดให้บริการ|หมดเวลา/i.test(msg || '');
        }

        // แสดงชานชาลาทั้งหมดของสถานี — จัดกลุ่มตามสาย (สยามมี 2 สาย × 2 ชานชาลา = 4)
        function renderPlatformSection(station, arr) {
            if (!arr || (arr.loading && !arr.platforms))
                return `<div class="empty-note"><span class="spin dark"></span><br>${T('loadingTrains')}</div>`;
            // นอกเวลาให้บริการ → แสดงตารางความถี่ปกติแทนกล่อง error
            const offHoursNote = `<div class="empty-note">${T('noTrainData')}<br><small>${T('offHours')}</small></div>`
                + (usesStaticTimetable(station) ? renderMrtFrequency(station) : renderBtsFrequency(station));
            if (arr.error && !arr.platforms)
                return isOffServiceError(arr.error)
                    ? offHoursNote
                    : `<div class="err-box">${esc(arr.error)}
                    <button class="btn btn-ghost" onclick="App.loadArrivals(App.findStation('${esc(station.StationKey)}'), true)">${T('retry')}</button></div>`;
            const platforms = visiblePlatformsForStation(station, arr.platforms || []);
            if (!platforms.length)
                return offHoursNote;

            // จัดกลุ่มชานชาลาตาม LineId (สถานีทั่วไป = กลุ่มเดียว, สยาม = 2 กลุ่ม)
            const groups = [];
            for (const p of platforms) {
                let g = groups.find(x => x.lineId === p.LineId);
                if (!g) {
                    g = { lineId: p.LineId, color: p.LineColor, list: [] };
                    groups.push(g);
                }
                g.list.push(p);
            }
            const multiLine = groups.length > 1;

            const platHtml = groups.map(g => {
                const line = App.lineById[g.lineId];
                const head = multiLine ? `
                    <div class="line-group-head" style="color:${g.color};display:flex;align-items:center;gap:6px;">
                        ${getLineIconSvg(g.lineId, false, 18)}
                        <span class="bar" style="background:${g.color}"></span>
                        ${T('line', esc(line ? shortLineName(line) : g.lineId))}</div>` : '';
                const cards = g.list.map(p => renderPlatform(p, arr.fetchedAt, station.StationKey)).join('');
                return `<div class="line-group">${head}<div class="plat-grid">${cards}</div></div>`;
            }).join('');

            return platHtml;
        }

        function renderPlatform(p, fetchedAt, stationKey) {
            // กรองขบวน "--" ที่ไม่มีข้อมูลพอจะแสดงออกก่อน (ดู displayTrains) — เหลือสูงสุด 3 ขบวน
            const trains = displayTrains(stationKey, p.platform, p.train_list, fetchedAt);
            // ขบวนที่ user เลือกไว้ (แตะขบวนเพื่อดูปลายทางของขบวนนั้น) — ตรวจ trainNo กันข้อมูล refresh แล้วลำดับเลื่อน
            const sel = App.selTrain[stationKey + '|' + p.platform];
            const selIdx = (sel && trains[sel.idx]?.trainNo === sel.trainNo) ? sel.idx : -1;
            const selT = selIdx >= 0 ? trains[selIdx] : null;
            const isTerminating = p.isDropOffOnly || p.DestinationStation_key === stationKey;
            const rawDest = (selT && selT.station) || p.DestinationStation;
            const dest = isTerminating ? (lang === 'en' ? 'Drop-off only' : 'ส่งผู้โดยสารเท่านั้น') : shortDest(destName(rawDest));
            const destLabel = isTerminating ? (lang === 'en' ? `Platform ${esc(p.platform)} · Terminus` : `ชานชาลา ${esc(p.platform)} · สิ้นสุดสาย`) : T('platformTo', esc(p.platform));
            const isBrightLine = p.LineColor === '#FFD100' || p.LineColor === '#F5C242' || p.LineId === 4;
            const platTextColor = isBrightLine ? '#0f172a' : '#ffffff';
            const trainTextColor = isBrightLine ? '#ca8a04' : p.LineColor;
            const isEvenPlat = false;

            const trainBtn = (t, i) => {
                const eta = bestEta(stationKey, p.platform, t, fetchedAt);
                const init = t.status === 'arriving'
                    ? { text: T('arrived'), now: true }
                    : eta ? etaText(eta.base - (Date.now() - eta.at) / 60000, eta.approx) : etaText(NaN);
                // ขบวนนี้ปลายทางต่างจากปลายทางหลักของชานชาลา → ติดป้ายบอก
                const diffDest = t.station_key && p.DestinationStation_key
                    && t.station_key !== p.DestinationStation_key;
                const destTag = diffDest
                    ? `<span class="t-dest">→ ${esc(shortDest(destName(t.station)))}</span>` : '';
                const sizeClass = i === 0 ? 'first' : i === 1 ? 'second' : 'third';
                return `<button class="train ${sizeClass} ${i === selIdx ? 'sel' : ''} ${init.now ? 'is-arriving' : ''}" style="color:${trainTextColor}"
                    onclick="App.selectTrain('${esc(stationKey)}','${esc(p.platform)}',${i},'${esc(t.trainNo)}')">
                    <span class="no">${destTag}</span>
                    <span class="eta ${init.now ? 'now' : ''}"
                        ${eta && t.status !== 'arriving' ? `data-eta-base="${eta.base}" data-eta-at="${eta.at}" data-eta-approx="${eta.approx ? '1' : ''}"` : ''}
                        >${init.text}</span></button>`;
            };

            let rows;
            if (trains.length) {
                const restHtml = trains.slice(1).map((t, j) => trainBtn(t, j + 1)).join('');
                rows = trainBtn(trains[0], 0) + (restHtml ? `<div class="train-rest">${restHtml}</div>` : '');
            } else if (isTerminating) {
                rows = `<div class="dropoff-note" style="padding:4px 6px;text-align:center;background:rgba(255,255,255,0.02);border-radius:10px;border:1px dashed rgba(148,163,184,0.2);min-height:48px;">
                    <div style="font-size:14px;line-height:1;margin-bottom:2px;">🏁</div>
                    <div style="font-weight:700;font-size:11px;line-height:1.2;color:var(--ink);">${lang === 'en' ? 'Drop-off only' : 'ส่งผู้โดยสารเท่านั้น'}</div>
                    <div style="font-size:9px;line-height:1.1;color:var(--muted);margin-top:1px;">${lang === 'en' ? 'No boarding train' : 'ขบวนไม่รับผู้โดยสาร'}</div>
                </div>`;
            } else {
                rows = `<div class="empty-note" style="padding:6px">${T('noTrains')}</div>`;
            }

            return `
                <div class="plat ${isEvenPlat ? 'mirror' : ''}">
                    <div class="plat-head">
                        <span class="plat-no" style="background:${p.LineColor};color:${platTextColor}">${esc(p.platform)}</span>
                        <div class="plat-dest"><div class="l">${destLabel}</div>
                            <div class="v">${esc(dest)}</div></div>
                    </div>
                    <div class="trains">${rows}</div>
                </div>`;
        }

        // ป้าย "เชื่อมต่อสาย X" สำหรับสถานีเปลี่ยนสาย — กดเพื่อกระโดดไปสายนั้น
        // ctxLineId = สายที่กำลังแสดงอยู่ จะไม่โชว์ป้ายของสายตัวเอง (สยามดูจากสุขุมวิท → เห็น ⇄ สายสีลม)
        function connBadges(stationKey, ctxLineId) {
            return (App.connections[stationKey] || [])
                .filter(c => c.lineId !== ctxLineId)
                .map(c => {
                    const line = App.lineById[c.lineId] || MRT_LINE_BY_ID[c.lineId];
                    return ` <span class="badge conn-b" style="color:${c.color};background:${c.color}1f;display:inline-flex;align-items:center;gap:4px;"
                    onclick="event.stopPropagation();App.jumpTo('${esc(c.key)}',${c.lineId})"
                    title="${T('connTitle', esc(c.key))}">${getLineIconSvg(c.lineId, false, 14)} <span>${T('connLine', esc(line ? shortLineName(line) : ''))}</span></span>`;
                }).join('');
        }

        /* ================= JOURNEY (from → to) ================= */
        function renderJourneyRoute(rm, i, open) {
            const steps = rm.RoutesJorney || [];
            if (!steps.length) return '';

            // 1. ไล่สีตามสายอย่างต่อเนื่องสำหรับทุกสถานี
            let prevLine = null, prevColor = '#94a3b8';
            const picks = [];
            steps.forEach((st, k) => {
                const entries = App.keyLines[st.StationCode] || [];
                let pick = entries.find(e => e.lineId === st.LineId)
                    || entries.find(e => e.lineId === prevLine);
                if (!pick) {
                    const nextLines = (App.keyLines[steps[k + 1]?.StationCode] || []).map(e => e.lineId);
                    // สถานีที่ไม่อยู่ใน StationList (เช่น ยังไม่เปิดบริการ) → ถือว่าอยู่สายเดิมต่อเนื่อง
                    pick = entries.find(e => nextLines.includes(e.lineId)) || entries[0]
                        || { lineId: prevLine, color: prevColor };
                }
                picks.push(pick);
                prevLine = pick.lineId;
                prevColor = pick.color;
            });

            // 2. สร้างแถวสถานีและเส้นรางเชื่อมโยง (พร้อมจุดเปลี่ยนสาย)
            const rows = [];
            steps.forEach((st, k) => {
                const pick = picks[k];
                const prevPick = k > 0 ? picks[k - 1] : null;
                const nextPick = k < steps.length - 1 ? picks[k + 1] : null;

                const hasTransferBefore = prevPick && pick.lineId !== prevPick.lineId;
                const hasTransferAfter = nextPick && pick.lineId !== nextPick.lineId;

                if (hasTransferBefore) {
                    rows.push(`<div class="j-transfer">${T('jTransfer')}</div>`);
                }

                const isFirst = k === 0;
                const isLast = k === steps.length - 1;
                const isEnd = isFirst || isLast;

                const stepClasses = [
                    'j-step',
                    isFirst ? 'first' : '',
                    isLast ? 'last' : '',
                    isEnd ? 'end' : '',
                    hasTransferBefore ? 'post-transfer' : '',
                    hasTransferAfter ? 'pre-transfer' : ''
                ].filter(Boolean).join(' ');

                rows.push(`<div class="${stepClasses}" style="color:${pick.color}">
                    <span class="ndw"><span class="nd"></span></span>
                    <span class="nm" style="color:var(--ink)"><span style="color:${pick.color};font-size:10.5px;font-weight:800;margin-right:4px">${esc(st.StationCode)}</span>${esc(shortDest(destName(st.Title)))}</span>
                    <span class="tm">${esc(st.TimeRoute || '')}</span></div>`);
            });

            // FareRateInfo เป็น array ที่มีสมาชิกเดียว
            const fi = Array.isArray(rm.FareRateInfo) ? rm.FareRateInfo[0] : rm.FareRateInfo;
            const fares = (fi?.FareRate_List || []).map(f =>
                `<div class="j-fare-row"><span>${esc(lang === 'en' ? (f.FareDetail_ENG || f.FareDetail) : f.FareDetail)}</span>
                 <b>฿${esc(f.FarePrice)}</b></div>`).join('');

            const badgeLabel = rm.LabelTag || (i === 0 ? T('jRecommended') : '');
            return `<div class="j-route ${open ? 'open' : ''}">
                <button class="j-route-head" onclick="App.toggleRoute(${i})">
                    <span class="rname">${T('jRoute', i + 1)}</span>
                    ${badgeLabel ? `<span class="j-badge">${esc(badgeLabel)}</span>` : ''}
                    <span class="j-fare">฿${esc(rm.FareRate_Total ?? '-')}</span>
                    <span class="j-sum">⏱ <b>${T('jMin', rm.TotalTime || '?')}</b> · ${T('jStations', rm.Count_Station ?? steps.length)}
                        · ${rm.TotalKm || '?'} ${T('kmUnit').trim()}${rm.Count_InterChange ? ' · ' + T('jTransfer').replace('🚶 ', '') + ' ×' + rm.Count_InterChange : ''}</span>
                </button>
                ${open ? `<div class="j-steps">${rows.join('')}</div>
                ${fares ? `<div class="j-fares"><div class="ft">${T('jFareTypes')}</div>${fares}</div>` : ''}
                ${rm.StaticMapSrc ? `<a class="j-map-link" href="${esc(rm.StaticMapSrc)}" target="_blank" rel="noopener">🗺️ ${T('jMap')}</a>` : ''}` : ''}
            </div>`;
        }

        /* ================= ROUTE MAP (ตำแหน่งขบวนรถรอบสถานี) ================= */
        function renderRouteSection(station) {
            const arr = App.arrivals[station.StationKey];
            if (!arr || !arr.platforms || !arr.platforms.length) return '';
            const rt = App.routes[station.StationKey];
            if (!rt || !rt.ready)
                return `<div class="route-box"><div class="route-title">${T('routeTitle')}</div>
                    <div class="empty-note" style="padding:8px"><span class="spin dark"></span> ${T('loadingRoute')}</div></div>`;
            return rt.blocks.map(b => renderRouteBlock(station, b, arr)).join('');
        }

        function renderRouteBlock(station, block, arr) {
            const { list, idx, prev, next, adj, color } = block;
            const plats = visiblePlatformsForStation(
                station,
                arr.platforms.filter(p => p.LineId === block.lineId)
            );
            if (!plats.length) return '';

            const isTerminalStart = !prev && !!next;
            const isTerminalEnd = !!prev && !next;
            if (isTerminalStart || isTerminalEnd) {
                const tChip = (e, at) => `<span class="rt-chip ${at ? 'at' : ''}" style="border-color:${color};color:${color}">
                        <i>${at ? '0' : (e.approx ? '~' : '') + Math.max(0, Math.round(e.m))}m</i></span>`;
                const tSlot = (e) => e ? tChip(e, e.at) : '';
                const tMid = (st, l, r, cur) => `<div class="rt-mid">
                    ${l ? `<span class="tl l" style="background:${color}"></span>` : ''}
                    ${r ? `<span class="tl r" style="background:${color}"></span>` : ''}
                    ${st ? `<span class="nd ${cur ? 'cur near' : ''}" style="${cur ? '' : 'border-color:' + color}"></span>
                    <span class="lbl"><b style="${cur ? 'color:' + color : ''}">${esc(st.StationKey)}</b><i>${esc(shortDest(stName(st)))}</i></span>` : ''}
                </div>`;
                const trains = [];
                for (const p of plats) {
                    for (const t of displayTrains(station.StationKey, p.platform, p.train_list, arr.fetchedAt)) {
                        if (t.status !== 'pending') {
                            trains.push({ t, m: 0, approx: false, at: true });
                            continue;
                        }
                        const eta = bestEta(station.StationKey, p.platform, t, arr.fetchedAt);
                        if (!eta) continue;
                        const m = eta.base - (Date.now() - eta.at) / 60000;
                        if (m < -1 || m > 200) continue;
                        trains.push({ t, m, approx: eta.approx, at: m <= 0.5 });
                    }
                }
                trains.sort((a, b) => a.m - b.m);
                const closest = trains.slice(0, 3);
                const lineName = App.lineById[block.lineId] ? shortLineName(App.lineById[block.lineId]) : '';
                const terminalMid = isTerminalStart
                    ? `${tMid(null)}
                    ${tMid(null)}
                    ${tMid(null)}
                    ${tMid(station, false, true, true)}
                    ${tMid(null, true, true)}
                    ${tMid(next, true, false)}
                    ${tMid(null)}`
                    : `${tMid(null)}
                    ${tMid(prev, false, true)}
                    ${tMid(null, true, true)}
                    ${tMid(station, true, false, true)}
                    ${tMid(null)}
                    ${tMid(null)}
                    ${tMid(null)}`;
                const terminalLanes = isTerminalStart
                    ? `<div class="rt-lane rail je">${tSlot(closest[2])}</div>
                    <div class="rt-lane rail je">${tSlot(closest[1])}</div>
                    <div class="rt-lane rail je">${tSlot(closest[0])}</div>
                    <div class="rt-lane rail"></div>
                    <div class="rt-lane rail arrow-lane"><span class="rt-arrow">→</span></div>
                    <div class="rt-lane rail"></div>
                    <div class="rt-lane rail"></div>`
                    : `<div class="rt-lane rail"></div>
                    <div class="rt-lane rail"></div>
                    <div class="rt-lane rail arrow-lane"><span class="rt-arrow">←</span></div>
                    <div class="rt-lane rail"></div>
                    <div class="rt-lane rail jc">${tSlot(closest[0])}</div>
                    <div class="rt-lane rail">${tSlot(closest[1])}</div>
                    <div class="rt-lane rail">${tSlot(closest[2])}</div>`;

                return `<div class="route-box">
                    <div class="route-title" style="display:flex;align-items:center;gap:6px;">
                        ${getLineIconSvg(block.lineId, false, 16)}
                        <span class="bar" style="background:${color}"></span>
                        ${T('routeTitle')}${lineName ? T('routeLine', esc(lineName)) : ''}</div>
                    <div class="rt-grid" style="--rt-color:${color}">
                        ${terminalLanes}
                        ${terminalMid}
                        <div class="rt-lane"></div>
                        <div class="rt-lane"></div>
                        <div class="rt-lane"></div>
                        <div class="rt-lane"></div>
                        <div class="rt-lane"></div>
                        <div class="rt-lane"></div>
                        <div class="rt-lane"></div>
                    </div>
                </div>`;
            }

            // ทิศทางของแต่ละชานชาลา = ขบวนวิ่งมาจากเพื่อนบ้านฝั่งไหน
            // ปลายทางอยู่ "ก่อนหน้า" สถานีนี้ในรายการ → ขบวนวิ่งจากท้ายรายการมา = มาจากฝั่ง next
            const fromOf = (p) => {
                const dIdx = list.findIndex(s => s.StationKey === (p.DestinationStation_key || ''));
                let from = (dIdx >= 0 && dIdx < idx) ? 'next' : (dIdx > idx) ? 'prev' : (prev ? 'prev' : 'next');
                // สถานีปลายทางของสาย: ฝั่งที่คำนวณได้ไม่มีเพื่อนบ้านจริง → ขบวนวิ่งมาจากฝั่งที่มีรางเท่านั้น
                if (from === 'prev' && !prev) from = 'next';
                if (from === 'next' && !next) from = 'prev';
                return from;
            };

            // ขบวน "ไกล" = ยังโผล่อยู่ในรายการของสถานีเพื่อนบ้านฝั่งเดียวกัน (ยังมาไม่ถึงเพื่อนบ้าน)
            const isFar = (t, p, from) => {
                const nb = from === 'next' ? next : prev;
                if (!nb) return false;
                const aps = adj[nb.StationKey] || [];
                const ap = aps.find(x => x.DestinationStation_key === p.DestinationStation_key)
                    || aps.find(x => x.platform === p.platform);
                if (!ap) return false;
                return (ap.train_list || []).some(at =>
                    at.station !== at.station_key && at.trainNo === t.trainNo);
            };

            const Z = { prev: { at: [], near: [], far: [] }, next: { at: [], near: [], far: [] } };
            for (const p of plats) {
                const from = fromOf(p);
                for (const t of displayTrains(station.StationKey, p.platform, p.train_list, arr.fetchedAt)) {
                    if (t.status !== 'pending') { Z[from].at.push({ t, m: 0 }); continue; }
                    // ใช้เวลาเลขล่าสุดที่รู้ (รวมค่าจำจากรอบก่อนเมื่อ API ตอบ --)
                    // ขบวนที่ไม่รู้เวลาเลย → ไม่วาดบน map (ตำแหน่งระบุไม่ได้)
                    const eta = bestEta(station.StationKey, p.platform, t, arr.fetchedAt);
                    if (!eta) continue;
                    const m = eta.base - (Date.now() - eta.at) / 60000;
                    if (m < -1 || m > 200) continue;
                    (isFar(t, p, from) ? Z[from].far : Z[from].near)
                        .push({ t, m, approx: eta.approx });
                }
            }
            const asc = (a, b) => a.m - b.m;
            const desc = (a, b) => b.m - a.m;
            Z.next.near.sort(asc); Z.next.far.sort(asc);
            Z.prev.near.sort(desc); Z.prev.far.sort(desc);

            const chip = (e, at) => `<span class="rt-chip ${at ? 'at' : ''}" style="border-color:${color};color:${color}">
                <i>${at ? '0' : (e.approx ? '~' : '') + Math.max(0, Math.round(e.m))}m</i></span>`;
            const chips = (arr2, at) => arr2.map(e => chip(e, at)).join('');

            // แถวกลาง: ราง + จุดสถานี (เส้นครึ่งซ้าย/ขวาตามว่ามีเพื่อนบ้านฝั่งนั้นไหม)
            const mid = (st, l, r, cur) => `<div class="rt-mid">
                ${l ? `<span class="tl l" style="background:${color}"></span>` : ''}
                ${r ? `<span class="tl r" style="background:${color}"></span>` : ''}
                ${st ? `<span class="nd ${cur ? 'cur near' : ''}" style="${cur ? '' : 'border-color:' + color}"></span>
                <span class="lbl"><b style="${cur ? 'color:' + color : ''}">${esc(st.StationKey)}</b><i>${esc(shortDest(stName(st)))}</i></span>` : ''}
            </div>`;

            const hasNextSide = Z.next.at.length + Z.next.near.length + Z.next.far.length > 0;
            const hasPrevSide = Z.prev.at.length + Z.prev.near.length + Z.prev.far.length > 0;
            const lineName = App.lineById[block.lineId] ? shortLineName(App.lineById[block.lineId]) : '';

            return `<div class="route-box">
                <div class="route-title" style="display:flex;align-items:center;gap:6px;">
                    ${getLineIconSvg(block.lineId, false, 16)}
                    <span class="bar" style="background:${color}"></span>
                    ${T('routeTitle')}${lineName ? T('routeLine', esc(lineName)) : ''}</div>
                <div class="rt-grid" style="--rt-color:${color}">
                    <!-- บน: ขบวนที่มาจากฝั่ง prev (วิ่ง → ไปทางเลขสถานีมากขึ้น) -->
                    <div class="rt-lane rail je">${chips(Z.prev.far)}</div>
                    <div class="rt-lane rail"></div>
                    <div class="rt-lane rail je">${chips(Z.prev.near)}</div>
                    <div class="rt-lane rail jc">${chips(Z.prev.at, true)}</div>
                    <div class="rt-lane rail arrow-lane">${hasPrevSide ? '<span class="rt-arrow">→</span>' : ''}</div>
                    <div class="rt-lane rail"></div>
                    <div class="rt-lane rail"></div>
                    <!-- กลาง: ราง + สถานี -->
                    ${mid(null)}
                    ${mid(prev, false, !!prev)}
                    ${mid(null, !!prev, !!prev)}
                    ${mid(station, !!prev, !!next, true)}
                    ${mid(null, !!next, !!next)}
                    ${mid(next, !!next, false)}
                    ${mid(null)}
                    <!-- ล่าง: ขบวนที่มาจากฝั่ง next (วิ่ง ← ไปทางเลขสถานีน้อยลง) -->
                    <div class="rt-lane rail"></div>
                    <div class="rt-lane rail"></div>
                    <div class="rt-lane rail arrow-lane">${hasNextSide ? '<span class="rt-arrow">←</span>' : ''}</div>
                    <div class="rt-lane rail jc">${chips(Z.next.at, true)}</div>
                    <div class="rt-lane rail">${chips(Z.next.near)}</div>
                    <div class="rt-lane rail"></div>
                    <div class="rt-lane rail">${chips(Z.next.far)}</div>
                </div>
            </div>`;
        }

        /* ================= START ================= */
        window.App = App;
        window.__test = { bestEta, etaText, shortDest, mrtBlueFare, buildHybridJourney, displayTrains, generateTimetableArrivals, renderPlatformSection, renderRouteSection, TRANSIT_LINES_CATALOG, getLineScheduleTables };   // hook สำหรับ test-app.mjs
        App.init();
    