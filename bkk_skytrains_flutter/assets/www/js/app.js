'use strict';

        /* ================= CONFIG ================= */
        const REMOTE_API = (typeof window !== 'undefined' && window.BKK_CONFIG && window.BKK_CONFIG.apiBase) || 'https://bkkskytrain.online/api/bts-proxy';
        // ตรวจสอบว่าโฮสต์ปัจจุบันเป็น Localhost บนพอร์ต 3000 หรือไม่ (รองรับ relative /api/bts-proxy จาก Start-BKK-Transit.ps1)
        // สำหรับกรณีอื่นทั้งหมด (Web, WebView, file://, GitHub Pages, Vercel ฯลฯ) ชี้ตรงไปยัง REMOTE_API ทันที
        const hasRelativeProxyHost = Boolean(
            (typeof location !== 'undefined') &&
            ((location.hostname === 'localhost' || location.hostname === '127.0.0.1') && location.port === '3000')
        );

        let activeProxyBase = hasRelativeProxyHost ? '/api/bts-proxy' : REMOTE_API;

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
        const FALLBACK_MAX_KM = 120;         // ขยายขอบเขตตรวจจับสถานีใกล้เคียงครอบคลุมปริมณฑล (กทม. และจังหวัดใกล้เคียง)
        const GOLD_LINE_ID = 3;
        const MRT_BLUE_FARE_CHANGE_AT = new Date('2026-07-03T00:00:00+07:00').getTime();
        const MRT_LINE_IDS = { BLUE: 101, PURPLE: 102, RED: 103, DARK_RED: 103, LIGHT_RED: 105, ARL: 104, BRT: 201, ORANGE: 106 };
        const MRT_COLORS = { BLUE: '#0284c7', PURPLE: '#8a2c9b', RED: '#b91c1c', DARK_RED: '#b91c1c', LIGHT_RED: '#f87171', ARL: '#8a1538', BRT: '#82c341', ORANGE: '#f58220' };

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
                    LineId: MRT_LINE_IDS.DARK_RED,
                    LineName_TH: 'สีแดงเข้ม',
                    LineName_EN: 'Dark Red',
                    LineColor: MRT_COLORS.DARK_RED,
                    StaticJourney: true,
                    StationList: [
                        ['RN01', 'กรุงเทพอภิวัฒน์', 'Krung Thep Aphiwat', 13.805, 100.54166667],
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
                        StationLineId: MRT_LINE_IDS.DARK_RED,
                        StationLineColor: MRT_COLORS.DARK_RED,
                        StaticJourney: true,
                        Latitude: lat,
                        Longitude: lon
                    }))
                },
                {
                    LineId: MRT_LINE_IDS.LIGHT_RED,
                    LineName_TH: 'สีแดงอ่อน',
                    LineName_EN: 'Light Red',
                    LineColor: MRT_COLORS.LIGHT_RED,
                    StaticJourney: true,
                    StationList: [
                        ['RW01', 'กรุงเทพอภิวัฒน์', 'Krung Thep Aphiwat', 13.805, 100.54166667],
                        ['RW02', 'บางซ่อน', 'Bang Son', 13.8221, 100.5342],
                        ['RW03', 'บางบำหรุ', 'Bang Bamru', 13.7918, 100.4776],
                        ['RW04', 'ตลิ่งชัน', 'Taling Chan', 13.7893, 100.4393]
                    ].map(([key, th, en, lat, lon]) => ({
                        StationKey: key,
                        StationNameTH: th,
                        StationNameEN: en,
                        StationLineId: MRT_LINE_IDS.LIGHT_RED,
                        StationLineColor: MRT_COLORS.LIGHT_RED,
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
                },
                {
                    LineId: MRT_LINE_IDS.BRT,
                    LineName_TH: 'BRT',
                    LineName_EN: 'BRT',
                    LineColor: MRT_COLORS.BRT,
                    StaticJourney: true,
                    StationList: [
                        ['B1', 'สาทร', 'Sathorn', 13.7214, 100.5300],
                        ['B2', 'อาคารสงเคราะห์', 'Akhan Songkhro', 13.7153, 100.5358],
                        ['B3', 'เทคนิคกรุงเทพ', 'Technic Krungthep', 13.7107, 100.5398],
                        ['B4', 'ถนนจันทน์', 'Thanon Chan', 13.7056, 100.5408],
                        ['B5', 'นราราม 3', 'Nararam 3', 13.6961, 100.5422],
                        ['B6', 'วัดด่าน', 'Wat Dan', 13.6828, 100.5385],
                        ['B7', 'วัดปริวาส', 'Wat Pariwat', 13.6763, 100.5308],
                        ['B8', 'วัดดอกไม้', 'Wat Dokmai', 13.6744, 100.5204],
                        ['B9', 'สะพานพระราม 9', 'Rama IX Bridge', 13.6822, 100.5097],
                        ['B10', 'เจริญราษฎร์', 'Charoen Rat', 13.6918, 100.5011],
                        ['B11', 'สะพานพระราม 3', 'Rama III Bridge', 13.7001, 100.4935],
                        ['B12', 'ราชพฤกษ์', 'Ratchaphruek', 13.7144, 100.4777]
                    ].map(([key, th, en, lat, lon]) => ({
                        StationKey: key,
                        StationNameTH: th,
                        StationNameEN: en,
                        StationLineId: MRT_LINE_IDS.BRT,
                        StationLineColor: MRT_COLORS.BRT,
                        StaticJourney: true,
                        Latitude: lat,
                        Longitude: lon
                    }))
                },
                {
                    LineId: MRT_LINE_IDS.ORANGE,
                    LineName_TH: 'สายสีส้ม (ยังไม่เปิดให้บริการ)',
                    LineName_EN: 'Orange Line (Not in Service)',
                    LineColor: MRT_COLORS.ORANGE,
                    StaticJourney: true,
                    StationList: [
                        ['OR01', 'บางขุนนนท์', 'Bang Khun Non', 13.7632, 100.4733],
                        ['OR02', 'ศิริราช', 'Siriraj', 13.7578, 100.4856],
                        ['OR03', 'สนามหลวง', 'Sanam Luang', 13.7567, 100.4944],
                        ['OR04', 'อนุสาวรีย์ประชาธิปไตย', 'Democracy Monument', 13.7565, 100.5020],
                        ['OR05', 'หลานหลวง', 'Lan Luang', 13.7563, 100.5127],
                        ['OR06', 'ยมราช', 'Yommarat', 13.7570, 100.5230],
                        ['OR07', 'ราชเทวี', 'Ratchathewi', 13.7523, 100.5315],
                        ['OR08', 'ประตูน้ำ', 'Pratu Nam', 13.7505, 100.5408],
                        ['OR09', 'ราชปรารภ', 'Ratchaprarop', 13.7552, 100.5421],
                        ['OR10', 'ดินแดง', 'Din Daeng', 13.7630, 100.5500],
                        ['OR11', 'ประชาสงเคราะห์', 'Pracha Songkhro', 13.7680, 100.5600],
                        ['OR12', 'ศูนย์วัฒนธรรมฯ', 'Thailand Cultural Centre', 13.7663, 100.5703],
                        ['OR13', 'รฟม.', 'MRTA', 13.7632, 100.5828],
                        ['OR14', 'วัดพระราม 9', 'Wat Phra Ram 9', 13.7580, 100.5960],
                        ['OR15', 'รามคำแหง 12', 'Ramkhamhaeng 12', 13.7530, 100.6080],
                        ['OR16', 'มหาวิทยาลัยรามคำแหง', 'Ramkhamhaeng University', 13.7560, 100.6190],
                        ['OR17', 'การกีฬาแห่งประเทศไทย', 'Sports Authority of Thailand', 13.7585, 100.6270],
                        ['OR18', 'รามคำแหง 34', 'Ramkhamhaeng 34', 13.7620, 100.6360],
                        ['OR19', 'แยกลำสาลี', 'Yaek Lam Sali', 13.7650, 100.6450],
                        ['OR20', 'ศรีบูรพา', 'Si Burapha', 13.7710, 100.6570],
                        ['OR21', 'คลองบ้านม้า', 'Khlong Ban Ma', 13.7770, 100.6690],
                        ['OR22', 'สัมมากร', 'Sammakon', 13.7830, 100.6810],
                        ['OR23', 'น้อมเกล้า', 'Nom Klao', 13.7890, 100.6930],
                        ['OR24', 'ราษฎร์พัฒนา', 'Rat Phatthana', 13.7950, 100.7040],
                        ['OR25', 'มีนพัฒนา', 'Min Phatthana', 13.8010, 100.7160],
                        ['OR26', 'เคหะรามคำแหง', 'Keha Ramkhamhaeng', 13.8070, 100.7280],
                        ['OR27', 'มีนบุรี', 'Min Buri', 13.8130, 100.7400],
                        ['OR28', 'แยกร่มเกล้า', 'Yaek Rom Klao', 13.8190, 100.7520]
                    ].map(([key, th, en, lat, lon]) => ({
                        StationKey: key,
                        StationNameTH: th,
                        StationNameEN: en,
                        StationLineId: MRT_LINE_IDS.ORANGE,
                        StationLineColor: MRT_COLORS.ORANGE,
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
                ['RW01', 'RN01', 1],
                ['RW01', 'BL11', 4],
                ['RW02', 'PP15', 4],
                ['RN06', 'PK14', 5],
                ['A8', 'N2', 3],
                ['A6', 'BL21', 5],
                ['A4', 'YL11', 5],
                ['B1', 'S3', 3],
                ['B12', 'S10', 4],
                ['OR01', 'BL04', 3],
                ['OR01', 'RW04', 5],
                ['OR07', 'N1', 3],
                ['OR09', 'A7', 3],
                ['OR12', 'BL19', 3],
                ['OR19', 'YL09', 4],
                ['OR27', 'PK30', 4]
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

        const BRT_FREQ = {
            weekday: [
                [6, 0, 9, 0, '5.00–7.00', 6],
                [9, 0, 16, 30, '10.00–12.00', 10],
                [16, 30, 20, 0, '5.00–7.00', 6],
                [20, 0, 24, 0, '12.00–15.00', 12]
            ],
            weekend: [
                [6, 0, 24, 0, '10.00–12.00', 10]
            ]
        };

        const MRT_ORANGE_FREQ = {
            weekday: [
                [5, 30, 7, 0, '6.00', 6],
                [7, 0, 9, 0, '3.30', 3.5],
                [9, 0, 16, 30, '6.00', 6],
                [16, 30, 20, 0, '3.30', 3.5],
                [20, 0, 24, 0, '7.00', 7]
            ],
            weekend: [
                [6, 0, 24, 0, '7.00', 7]
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
            if (lineId === MRT_LINE_IDS.BRT) return BRT_FREQ;
            if (lineId === MRT_LINE_IDS.ORANGE) return MRT_ORANGE_FREQ;
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
            if (lineId === MRT_LINE_IDS.RED || lineId === 103 || lineId === 105) {
                const now = new Date();
                const nowMin = timeToMinutes(now.getHours(), now.getMinutes());
                const we = isWeekend();
                if (nowMin < timeToMinutes(5, 0) || nowMin >= timeToMinutes(24, 0)) return null;
                const isWest = (lineId === 105) || (stationKey && stationKey.startsWith('RW'));
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
            if (lineId === MRT_LINE_IDS.RED || lineId === 103 || lineId === 105) {
                const now = new Date();
                const nowMin = timeToMinutes(now.getHours(), now.getMinutes());
                const we = isWeekend();
                const isWest = (lineId === 105) || (stationKey && stationKey.startsWith('RW'));
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

        /* ================= LINE BRAND COLORS & VEHICLE ICONS ================= */
        const LINE_BRAND_COLORS = {
            1: '#7AB420',    // Sukhumvit (Green)
            2: '#00807D',    // Silom (Teal)
            3: '#C9A038',    // Gold (APM)
            4: '#FFD100',    // Yellow (Monorail)
            5: '#EC4899',    // Pink (Monorail)
            101: '#0284C7',  // Blue (MRT Subway)
            102: '#8A2C9B',  // Purple (MRT Elevated)
            103: '#B91C1C',  // Dark Red (SRT Commuter - Dark Red / ธานีรัถยา)
            105: '#F87171',  // Light Red (SRT Commuter - Light Red / นครวิถี)
            104: '#8A1538',  // ARL (Airport Express)
            201: '#82C341',  // BRT (Bus Rapid Transit)
            106: '#F58220',  // Orange (MRT Orange Line)
            0: '#64748B'     // All lines
        };

        /* ================= MODERN VECTOR UI ICONS SYSTEM ================= */
        const UI_ICONS = {
            // 📍 Location / Station Pin
            pin: (s, c, cls) => `<svg class="ui-ic ui-ic-pin ${cls || ''}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c || '#f43f5e'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3" fill="${c || '#f43f5e'}" fill-opacity="0.2"/></svg>`,

            // 👥 Crowd Density / Passengers
            users: (s, c, cls) => `<svg class="ui-ic ui-ic-users ${cls || ''}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c || 'currentColor'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,

            // 🚆 Transit Network EMU Train
            train: (s, c, cls) => `<svg class="ui-ic ui-ic-train ${cls || ''}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c || '#10b981'}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="16" height="15" x="4" y="3" rx="3.5"/><path d="M4 10.5h16"/><path d="M12 3v7.5"/><path d="m8 18-3 3"/><path d="m16 18 3 3"/><circle cx="8" cy="14.5" r="1.2" fill="${c || '#10b981'}"/><circle cx="16" cy="14.5" r="1.2" fill="${c || '#10b981'}"/></svg>`,

            // 🔄 Real-time Auto-refresh
            refresh: (s, c, cls) => `<svg class="ui-ic ui-ic-refresh ${cls || ''}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c || '#0284c7'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>`,

            // 🧭 Compass / GPS Navigation / Relocate
            compass: (s, c, cls) => `<svg class="ui-ic ui-ic-compass ${cls || ''}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c || 'currentColor'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="${c || 'currentColor'}" fill-opacity="0.3"/></svg>`,

            // 🚪 Station Exits & Facilities
            door: (s, c, cls) => `<svg class="ui-ic ui-ic-door ${cls || ''}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c || '#8b5cf6'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 20V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14"/><path d="M2 20h20"/><circle cx="14" cy="12" r="1" fill="${c || '#8b5cf6'}"/></svg>`,

            // 🗺️ Schematic Map
            map: (s, c, cls) => `<svg class="ui-ic ui-ic-map ${cls || ''}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c || '#0284c7'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" x2="9" y1="3" y2="18"/><line x1="15" x2="15" y1="6" y2="21"/></svg>`,

            // 💡 Tips / Guide
            bulb: (s, c, cls) => `<svg class="ui-ic ui-ic-bulb ${cls || ''}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c || '#f59e0b'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>`,

            // 🌟 Star / Popular Hubs
            star: (s, c, cls) => `<svg class="ui-ic ui-ic-star ${cls || ''}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="${c || '#f59e0b'}" fill-opacity="0.25" stroke="${c || '#f59e0b'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,

            // 💳 Credit Card / EMV Contactless / Fare
            card: (s, c, cls) => `<svg class="ui-ic ui-ic-card ${cls || ''}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c || '#10b981'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/><circle cx="6" cy="15" r="1" fill="${c || '#10b981'}"/><circle cx="9" cy="15" r="1" fill="${c || '#10b981'}"/></svg>`,

            // 🎟️ Ticket
            ticket: (s, c, cls) => `<svg class="ui-ic ui-ic-ticket ${cls || ''}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c || '#f59e0b'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/></svg>`,

            // 🕒 Clock / Time Range
            clock: (s, c, cls) => `<svg class="ui-ic ui-ic-clock ${cls || ''}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c || 'currentColor'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,

            // ⏱️ Timer / Headway Frequency
            timer: (s, c, cls) => `<svg class="ui-ic ui-ic-timer ${cls || ''}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c || 'currentColor'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="10" x2="14" y1="2" y2="2"/><line x1="12" x2="12" y1="14" y2="8"/><circle cx="12" cy="14" r="8"/></svg>`,

            // 🗓️ Calendar / Operating Day Type
            calendar: (s, c, cls) => `<svg class="ui-ic ui-ic-calendar ${cls || ''}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c || 'currentColor'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>`,

            // 🏁 Destination Flag
            flag: (s, c, cls) => `<svg class="ui-ic ui-ic-flag ${cls || ''}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c || '#ef4444'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" fill="${c || '#ef4444'}" fill-opacity="0.3"/><line x1="4" x2="4" y1="22" y2="15"/></svg>`,

            // 🔍 Search
            search: (s, c, cls) => `<svg class="ui-ic ui-ic-search ${cls || ''}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c || 'currentColor'}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="21" x2="16.65" y1="21" y2="16.65"/></svg>`,

            // ✈️ Airplane (Airport Rail Link)
            plane: (s, c, cls) => `<svg class="ui-ic ui-ic-plane ${cls || ''}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="${c || '#8A1538'}" fill-opacity="0.15" stroke="${c || '#8A1538'}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3.5c-.5-.5-2.5 0-4 1.5L13.5 8.5 5.3 6.7c-.7-.1-1.3.2-1.6.8l-.5 1 5.3 3.5-3.2 3.2-2.3-.5c-.4-.1-.8.1-1 .5l-.3.6 2.8 1.8 1.8 2.8.6-.3c.4-.2.6-.6.5-1l-.5-2.3 3.2-3.2 3.5 5.3 1-.5c.6-.3.9-.9.8-1.6z"/></svg>`,

            // 📊 Bar Chart
            chart: (s, c, cls) => `<svg class="ui-ic ui-ic-chart ${cls || ''}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c || '#0284c7'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>`,

            // 🚶 Skywalk Pedestrian
            walk: (s, c, cls) => `<svg class="ui-ic ui-ic-walk ${cls || ''}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c || 'currentColor'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="13" cy="4" r="2"/><path d="m9 20 3-6-2.5-3.5L13 7l3 3.5-2 3.5 3 6"/><path d="m6 13 3-2.5"/></svg>`,

            // 🛗 Elevator
            elevator: (s, c, cls) => `<svg class="ui-ic ui-ic-elevator ${cls || ''}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c || '#8b5cf6'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="20" x="3" y="2" rx="2"/><path d="m8 8 2-2 2 2"/><path d="m8 16 2 2 2-2"/><path d="M15 7v10"/></svg>`,

            // 🪜 Escalator
            escalator: (s, c, cls) => `<svg class="ui-ic ui-ic-escalator ${cls || ''}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c || 'currentColor'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m4 19 6-6h4l6-6"/><circle cx="5" cy="15" r="1.5"/></svg>`,

            // 📏 Ruler
            ruler: (s, c, cls) => `<svg class="ui-ic ui-ic-ruler ${cls || ''}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c || '#64748b'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.4 2.4 0 0 1 0-3.4l2.6-2.6a2.4 2.4 0 0 1 3.4 0Z"/><path d="m14.5 12.5 2-2"/><path d="m11.5 9.5 2-2"/><path d="m8.5 6.5 2-2"/><path d="m17.5 15.5 2-2"/></svg>`,

            // 👵 Senior Care
            senior: (s, c, cls) => `<svg class="ui-ic ui-ic-senior ${cls || ''}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="${c || '#ec4899'}" fill-opacity="0.15" stroke="${c || '#ec4899'}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`,

            // 🎓 Student Graduation Cap
            student: (s, c, cls) => `<svg class="ui-ic ui-ic-student ${cls || ''}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c || '#3b82f6'}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`,

            // 👶 Child
            child: (s, c, cls) => `<svg class="ui-ic ui-ic-child ${cls || ''}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c || '#f59e0b'}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><circle cx="9" cy="9.5" r="1" fill="${c || '#f59e0b'}"/><circle cx="15" cy="9.5" r="1" fill="${c || '#f59e0b'}"/></svg>`,

            // 💰 Coins / Fare Price
            coins: (s, c, cls) => `<svg class="ui-ic ui-ic-coins ${cls || ''}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c || '#f59e0b'}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1.5v4"/></svg>`,

            // ⚠️ Alert / Warning
            warn: (s, c, cls) => `<svg class="ui-ic ui-ic-warn ${cls || ''}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c || '#f59e0b'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>`,

            // 🚫 No Data / Prohibited
            ban: (s, c, cls) => `<svg class="ui-ic ui-ic-ban ${cls || ''}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c || '#94a3b8'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="4.93" x2="19.07" y1="4.93" y2="19.07"/></svg>`,

            // 🌙 Dark Theme Moon
            moon: (s, c, cls) => `<svg class="ui-ic ui-ic-moon ${cls || ''}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="${c || 'currentColor'}" fill-opacity="0.15" stroke="${c || 'currentColor'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`,

            // ☀️ Light Theme Sun
            sun: (s, c, cls) => `<svg class="ui-ic ui-ic-sun ${cls || ''}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c || '#f59e0b'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`,

            // ➕ Zoom In
            zoomIn: (s, c, cls) => `<svg class="ui-ic ui-ic-zoomin ${cls || ''}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c || 'currentColor'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/><line x1="11" x2="11" y1="8" y2="14"/><line x1="8" x2="14" y1="11" y2="11"/></svg>`,

            // ➖ Zoom Out
            zoomOut: (s, c, cls) => `<svg class="ui-ic ui-ic-zoomout ${cls || ''}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c || 'currentColor'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/><line x1="8" x2="14" y1="11" y2="11"/></svg>`,

            // ⤢ Reset Zoom
            resetZoom: (s, c, cls) => `<svg class="ui-ic ui-ic-resetzoom ${cls || ''}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c || 'currentColor'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>`,

            // 💼 Briefcase
            briefcase: (s, c, cls) => `<svg class="ui-ic ui-ic-briefcase ${cls || ''}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c || 'currentColor'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`,

            // 🏖️ Beach / Umbrella
            beach: (s, c, cls) => `<svg class="ui-ic ui-ic-beach ${cls || ''}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c || 'currentColor'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2v20"/><path d="M12 2a10 10 0 0 0-10 10c3 0 5-1 8-1s5 1 8 1a10 10 0 0 0-6-10Z"/><path d="M12 18a2 2 0 1 1 0 4"/></svg>`,

            // 📋 Clipboard / List
            clipboard: (s, c, cls) => `<svg class="ui-ic ui-ic-clipboard ${cls || ''}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c || 'currentColor'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/></svg>`,

            // ✓ Checkmark (Show Both / All / Selected)
            check: (s, c, cls) => `<svg class="ui-ic ui-ic-check ${cls || ''}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c || 'currentColor'}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`,

            // ⛵ Boat / Pier
            boat: (s, c, cls) => `<svg class="ui-ic ui-ic-boat ${cls || ''}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c || '#0284c7'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.5 0 2.5 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76"/><path d="M12 2v8"/></svg>`,

            // 🚌 Bus / Terminal
            bus: (s, c, cls) => `<svg class="ui-ic ui-ic-bus ${cls || ''}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c || '#f59e0b'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 6v6"/><path d="M16 6v6"/><path d="M4 6h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-1H7v1a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z"/><circle cx="7" cy="15" r="1" fill="${c || '#f59e0b'}"/><circle cx="17" cy="15" r="1" fill="${c || '#f59e0b'}"/></svg>`,

            // 🅿️ Park & Ride
            parking: (s, c, cls) => `<svg class="ui-ic ui-ic-parking ${cls || ''}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c || '#3b82f6'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="4"/><path d="M9 17V7h4a3 3 0 0 1 0 6H9"/></svg>`
        };

        function getUiIcon(name, size = 18, color = '', extraClass = '') {
            const fn = UI_ICONS[name];
            if (!fn) return '';
            return fn(size, color, extraClass);
        }
        if (typeof window !== 'undefined') {
            window.getUiIcon = getUiIcon;
        }



        /* ================= I18N (สลับภาษาได้ทั้งเว็บ — แสดงทีละภาษาเพื่อประหยัดพื้นที่) ================= */
        let lang = localStorage.getItem('bts_lang') || 'th';

        const I18N = {
            th: {
                appName: 'BKK SKYTRAINs',
                sub: 'สถานะรถไฟฟ้า BTS / MRT / SRT / ARL ณ ขณะนี้',
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
                searchPh: 'ค้นหา รหัสสถานี หรือ ชื่อสถานี เช่น CEN , สยาม',
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
                noTrainData: `${getUiIcon('ban', 15, '#ef4444')} ไม่มีข้อมูลขบวนรถในขณะนี้`,
                offHours: 'อาจอยู่นอกเวลาให้บริการ',
                noTrains: 'ไม่มีขบวนรถ',
                platformTo: p => `ชานชาลา ${p} · ไปทาง`,
                platformTrainTo: (p, no) => `ชานชาลา ${p} · ขบวน ${no} ไป`,
                train: no => `ขบวน ${no}`,
                arrived: 'กำลังเข้า',
                minUnit: ' นาที',
                mUnit: ' ม.', kmUnit: ' กม.',
                routeTitle: `${getUiIcon('map', 15, 'currentColor')} ตำแหน่งขบวนรถ`,
                routeLine: n => ` · สาย${n}`,
                loadingRoute: 'กำลังโหลดตำแหน่งขบวน…',
                trafficHead: `${getUiIcon('warn', 15, '#f59e0b')} ประกาศการเดินรถ`,
                trafficBad: names => `การเดินรถ ${names} อาจไม่ปกติ`,
                trafficDisruptionTitle: 'ประกาศแจ้งเหตุขัดข้อง',
                trafficDialogSub: 'สถานะการเดินรถและประกาศด่วนเรียลไทม์',
                trafficNormal: 'ปกติ',
                trafficDisruption: 'ขัดข้อง',
                trafficMinorDelay: 'การเดินรถล่าช้า',
                trafficSevereDelay: 'เดินรถล่าช้ามาก/ปรับเส้นทาง',
                trafficStationClosed: 'ปิดสถานีชั่วคราว',
                trafficNewsTime: 'เวลาข่าวสาร',
                trafficDismiss: 'รับทราบ',
                trafficRefresh: 'รีเฟรชสด',
                trafficRefreshed: 'อัปเดตสถานะการเดินรถเรียบร้อย',
                trafficDetails: 'ดูประกาศ ➔',
                trafficAllNormal: 'การเดินรถทุกสายเป็นปกติ',
                trafficAllNormalDesc: 'ไม่พบรายงานขบวนรถขัดข้องหรือความล่าช้าในโครงข่ายระบบรถไฟฟ้า ณ ขณะนี้',
                trafficLineStatus: 'สถานะเส้นทางหลัก',
                moreTrafficTitle: 'สถานะการเดินรถ & ประกาศแจ้งเหตุขัดข้อง',
                moreTrafficDesc: 'ตรวจสอบสถานะการเดินรถแบบเรียลไทม์ เหตุขัดข้องทางเทคนิค และประกาศเดินรถฉุกเฉินทุกสาย',
                trafficSimulatedTag: 'โหมดทดสอบประกาศ',
                trafficSimulateBtn: 'ทดสอบจำลองเหตุขัดข้อง',
                trafficSimulateResetBtn: 'ยกเลิกการจำลองเหตุขัดข้อง',
                geoUnsupported: 'เบราว์เซอร์ไม่รองรับการระบุตำแหน่ง',
                geoDenied: 'ไม่ได้รับอนุญาตให้ใช้ตำแหน่ง — เปิดสิทธิ์ Location ให้เว็บนี้แล้วลองใหม่',
                geoFail: 'หาตำแหน่งไม่สำเร็จ ลองใหม่อีกครั้ง',
                connectFail: s => `เชื่อมต่อไม่สำเร็จ (HTTP ${s})`,
                footer: `<div class="footer-systems-title"><span class="footer-title-icon-pill" style="background:rgba(16,185,129,0.14);border:1px solid rgba(16,185,129,0.28);color:#10b981">${getUiIcon('train', 16, '#10b981')}</span> โครงข่ายระบบรถไฟฟ้า 12 สายที่เชื่อมต่อข้อมูลในระบบ</div>
<div class="footer-slider-wrapper" id="footerSliderWrapper">
    <div class="footer-slider-track" id="footerSliderTrack">
        <!-- Set 1 (12 Lines) -->
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(1)" title="BTS สายสุขุมวิท (คูคต ↔ เคหะฯ)" aria-label="BTS สายสุขุมวิท">
            <div class="footer-card-icon" style="background:rgba(122,180,32,0.12);border-color:rgba(122,180,32,0.3)">${getLineIconSvg(1, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">BTS สายสุขุมวิท</span><span class="footer-card-dot">·</span><span class="footer-card-route">คูคต ↔ เคหะฯ</span></div>
            <div class="footer-card-arrow">›</div>
        </button>
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(2)" title="BTS สายสีลม (สนามกีฬาฯ ↔ บางหว้า)" aria-label="BTS สายสีลม">
            <div class="footer-card-icon" style="background:rgba(0,128,125,0.12);border-color:rgba(0,128,125,0.3)">${getLineIconSvg(2, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">BTS สายสีลม</span><span class="footer-card-dot">·</span><span class="footer-card-route">สนามกีฬาฯ ↔ บางหว้า</span></div>
            <div class="footer-card-arrow">›</div>
        </button>
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(3)" title="APM สายสีทอง (กรุงธนบุรี ↔ คลองสาน)" aria-label="APM สายสีทอง">
            <div class="footer-card-icon" style="background:rgba(201,160,56,0.12);border-color:rgba(201,160,56,0.3)">${getLineIconSvg(3, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">APM สายสีทอง</span><span class="footer-card-dot">·</span><span class="footer-card-route">กรุงธนบุรี ↔ คลองสาน</span></div>
            <div class="footer-card-arrow">›</div>
        </button>
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(101)" title="MRT สายสีน้ำเงิน (ท่าพระ ↔ หลักสอง)" aria-label="MRT สายสีน้ำเงิน">
            <div class="footer-card-icon" style="background:rgba(2,132,199,0.12);border-color:rgba(2,132,199,0.3)">${getLineIconSvg(101, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">MRT สายสีน้ำเงิน</span><span class="footer-card-royal-tag" style="color:#0284C7;border:1px solid #0284C755;background:#0284C718;">เฉลิมรัชมงคล</span><span class="footer-card-dot">·</span><span class="footer-card-route">ท่าพระ ↔ หลักสอง</span></div>
            <div class="footer-card-arrow">›</div>
        </button>
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(102)" title="MRT สายสีม่วง (คลองบางไผ่ ↔ เตาปูน)" aria-label="MRT สายสีม่วง">
            <div class="footer-card-icon" style="background:rgba(138,44,155,0.12);border-color:rgba(138,44,155,0.3)">${getLineIconSvg(102, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">MRT สายสีม่วง</span><span class="footer-card-royal-tag" style="color:#8A2C9B;border:1px solid #8A2C9B55;background:#8A2C9B18;">ฉลองรัชธรรม</span><span class="footer-card-dot">·</span><span class="footer-card-route">คลองบางไผ่ ↔ เตาปูน</span></div>
            <div class="footer-card-arrow">›</div>
        </button>
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(4)" title="MRT สายสีเหลือง (ลาดพร้าว ↔ สำโรง)" aria-label="MRT สายสีเหลือง">
            <div class="footer-card-icon" style="background:rgba(255,209,0,0.15);border-color:rgba(255,209,0,0.35)">${getLineIconSvg(4, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">MRT สายสีเหลือง</span><span class="footer-card-royal-tag" style="color:#FFD100;border:1px solid #FFD10055;background:#FFD10018;">นัคราพิพัฒน์</span><span class="footer-card-dot">·</span><span class="footer-card-route">ลาดพร้าว ↔ สำโรง</span></div>
            <div class="footer-card-arrow">›</div>
        </button>
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(5)" title="MRT สายสีชมพู (ศูนย์ราชการฯ ↔ มีนบุรี)" aria-label="MRT สายสีชมพู">
            <div class="footer-card-icon" style="background:rgba(236,72,153,0.12);border-color:rgba(236,72,153,0.3)">${getLineIconSvg(5, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">MRT สายสีชมพู</span><span class="footer-card-royal-tag" style="color:#EC4899;border:1px solid #EC489955;background:#EC489918;">วิวัฒน์นคร</span><span class="footer-card-dot">·</span><span class="footer-card-route">ศูนย์ราชการฯ ↔ มีนบุรี</span></div>
            <div class="footer-card-arrow">›</div>
        </button>
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(103)" title="SRT สายสีแดงเข้ม (กรุงเทพอภิวัฒน์ ↔ รังสิต)" aria-label="SRT สายสีแดงเข้ม">
            <div class="footer-card-icon" style="background:rgba(185,28,28,0.12);border-color:rgba(185,28,28,0.3)">${getLineIconSvg(103, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">SRT สายสีแดงเข้ม</span><span class="footer-card-royal-tag" style="color:#B91C1C;border:1px solid #B91C1C55;background:#B91C1C18;">ธานีรัถยา</span><span class="footer-card-dot">·</span><span class="footer-card-route">กรุงเทพอภิวัฒน์ ↔ รังสิต</span></div>
            <div class="footer-card-arrow">›</div>
        </button>
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(105)" title="SRT สายสีแดงอ่อน (กรุงเทพอภิวัฒน์ ↔ ตลิ่งชัน)" aria-label="SRT สายสีแดงอ่อน">
            <div class="footer-card-icon" style="background:rgba(248,113,113,0.15);border-color:rgba(248,113,113,0.35)">${getLineIconSvg(105, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">SRT สายสีแดงอ่อน</span><span class="footer-card-royal-tag" style="color:#F87171;border:1px solid #F8717155;background:#F8717118;">นครวิถี</span><span class="footer-card-dot">·</span><span class="footer-card-route">กรุงเทพอภิวัฒน์ ↔ ตลิ่งชัน</span></div>
            <div class="footer-card-arrow">›</div>
        </button>
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(104)" title="ARL แอร์พอร์ต ลิงก์ (พญาไท ↔ สุวรรณภูมิ)" aria-label="ARL แอร์พอร์ต ลิงก์">
            <div class="footer-card-icon" style="background:rgba(138,21,56,0.12);border-color:rgba(138,21,56,0.3)">${getLineIconSvg(104, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">ARL แอร์พอร์ตลิงก์</span><span class="footer-card-dot">·</span><span class="footer-card-route">พญาไท ↔ สุวรรณภูมิ</span></div>
            <div class="footer-card-arrow">›</div>
        </button>
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(201)" title="รถโดยสารด่วนพิเศษ BRT (สาทร ↔ ราชพฤกษ์)" aria-label="รถโดยสารด่วนพิเศษ BRT">
            <div class="footer-card-icon" style="background:rgba(130,195,65,0.12);border-color:rgba(130,195,65,0.3)">${getLineIconSvg(201, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">BRT สาทร-ราชพฤกษ์</span><span class="footer-card-dot">·</span><span class="footer-card-route">สาทร ↔ ราชพฤกษ์</span></div>
            <div class="footer-card-arrow">›</div>
        </button>
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(106)" title="MRT สายสีส้ม (บางขุนนนท์ ↔ แยกร่มเกล้า) (ยังไม่เปิดให้บริการ)" aria-label="MRT สายสีส้ม (ยังไม่เปิดให้บริการ)">
            <div class="footer-card-icon" style="background:rgba(245,130,32,0.12);border-color:rgba(245,130,32,0.3)">${getLineIconSvg(106, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">MRT สายสีส้ม</span><span class="footer-card-royal-tag" style="color:#F58220;border:1px solid #F5822055;background:#F5822018;">ยังไม่เปิดให้บริการ</span><span class="footer-card-dot">·</span><span class="footer-card-route">บางขุนนนท์ ↔ แยกร่มเกล้า</span></div>
            <div class="footer-card-arrow">›</div>
        </button>

        <!-- Set 2 (12 Duplicate Lines for Seamless Infinite Loop) -->
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(1)" title="BTS สายสุขุมวิท (คูคต ↔ เคหะฯ)" aria-label="BTS สายสุขุมวิท" aria-hidden="true" tabindex="-1">
            <div class="footer-card-icon" style="background:rgba(122,180,32,0.12);border-color:rgba(122,180,32,0.3)">${getLineIconSvg(1, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">BTS สายสุขุมวิท</span><span class="footer-card-dot">·</span><span class="footer-card-route">คูคต ↔ เคหะฯ</span></div>
            <div class="footer-card-arrow">›</div>
        </button>
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(2)" title="BTS สายสีลม (สนามกีฬาฯ ↔ บางหว้า)" aria-label="BTS สายสีลม" aria-hidden="true" tabindex="-1">
            <div class="footer-card-icon" style="background:rgba(0,128,125,0.12);border-color:rgba(0,128,125,0.3)">${getLineIconSvg(2, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">BTS สายสีลม</span><span class="footer-card-dot">·</span><span class="footer-card-route">สนามกีฬาฯ ↔ บางหว้า</span></div>
            <div class="footer-card-arrow">›</div>
        </button>
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(3)" title="APM สายสีทอง (กรุงธนบุรี ↔ คลองสาน)" aria-label="APM สายสีทอง" aria-hidden="true" tabindex="-1">
            <div class="footer-card-icon" style="background:rgba(201,160,56,0.12);border-color:rgba(201,160,56,0.3)">${getLineIconSvg(3, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">APM สายสีทอง</span><span class="footer-card-dot">·</span><span class="footer-card-route">กรุงธนบุรี ↔ คลองสาน</span></div>
            <div class="footer-card-arrow">›</div>
        </button>
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(101)" title="MRT สายสีน้ำเงิน (ท่าพระ ↔ หลักสอง)" aria-label="MRT สายสีน้ำเงิน" aria-hidden="true" tabindex="-1">
            <div class="footer-card-icon" style="background:rgba(2,132,199,0.12);border-color:rgba(2,132,199,0.3)">${getLineIconSvg(101, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">MRT สายสีน้ำเงิน</span><span class="footer-card-royal-tag" style="color:#0284C7;border:1px solid #0284C755;background:#0284C718;">เฉลิมรัชมงคล</span><span class="footer-card-dot">·</span><span class="footer-card-route">ท่าพระ ↔ หลักสอง</span></div>
            <div class="footer-card-arrow">›</div>
        </button>
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(102)" title="MRT สายสีม่วง (คลองบางไผ่ ↔ เตาปูน)" aria-label="MRT สายสีม่วง" aria-hidden="true" tabindex="-1">
            <div class="footer-card-icon" style="background:rgba(138,44,155,0.12);border-color:rgba(138,44,155,0.3)">${getLineIconSvg(102, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">MRT สายสีม่วง</span><span class="footer-card-royal-tag" style="color:#8A2C9B;border:1px solid #8A2C9B55;background:#8A2C9B18;">ฉลองรัชธรรม</span><span class="footer-card-dot">·</span><span class="footer-card-route">คลองบางไผ่ ↔ เตาปูน</span></div>
            <div class="footer-card-arrow">›</div>
        </button>
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(4)" title="MRT สายสีเหลือง (ลาดพร้าว ↔ สำโรง)" aria-label="MRT สายสีเหลือง" aria-hidden="true" tabindex="-1">
            <div class="footer-card-icon" style="background:rgba(255,209,0,0.15);border-color:rgba(255,209,0,0.35)">${getLineIconSvg(4, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">MRT สายสีเหลือง</span><span class="footer-card-royal-tag" style="color:#FFD100;border:1px solid #FFD10055;background:#FFD10018;">นัคราพิพัฒน์</span><span class="footer-card-dot">·</span><span class="footer-card-route">ลาดพร้าว ↔ สำโรง</span></div>
            <div class="footer-card-arrow">›</div>
        </button>
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(5)" title="MRT สายสีชมพู (ศูนย์ราชการฯ ↔ มีนบุรี)" aria-label="MRT สายสีชมพู" aria-hidden="true" tabindex="-1">
            <div class="footer-card-icon" style="background:rgba(236,72,153,0.12);border-color:rgba(236,72,153,0.3)">${getLineIconSvg(5, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">MRT สายสีชมพู</span><span class="footer-card-royal-tag" style="color:#EC4899;border:1px solid #EC489955;background:#EC489918;">วิวัฒน์นคร</span><span class="footer-card-dot">·</span><span class="footer-card-route">ศูนย์ราชการฯ ↔ มีนบุรี</span></div>
            <div class="footer-card-arrow">›</div>
        </button>
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(103)" title="SRT สายสีแดงเข้ม (กรุงเทพอภิวัฒน์ ↔ รังสิต)" aria-label="SRT สายสีแดงเข้ม" aria-hidden="true" tabindex="-1">
            <div class="footer-card-icon" style="background:rgba(185,28,28,0.12);border-color:rgba(185,28,28,0.3)">${getLineIconSvg(103, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">SRT สายสีแดงเข้ม</span><span class="footer-card-royal-tag" style="color:#B91C1C;border:1px solid #B91C1C55;background:#B91C1C18;">ธานีรัถยา</span><span class="footer-card-dot">·</span><span class="footer-card-route">กรุงเทพอภิวัฒน์ ↔ รังสิต</span></div>
            <div class="footer-card-arrow">›</div>
        </button>
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(105)" title="SRT สายสีแดงอ่อน (กรุงเทพอภิวัฒน์ ↔ ตลิ่งชัน)" aria-label="SRT สายสีแดงอ่อน" aria-hidden="true" tabindex="-1">
            <div class="footer-card-icon" style="background:rgba(248,113,113,0.15);border-color:rgba(248,113,113,0.35)">${getLineIconSvg(105, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">SRT สายสีแดงอ่อน</span><span class="footer-card-royal-tag" style="color:#F87171;border:1px solid #F8717155;background:#F8717118;">นครวิถี</span><span class="footer-card-dot">·</span><span class="footer-card-route">กรุงเทพอภิวัฒน์ ↔ ตลิ่งชัน</span></div>
            <div class="footer-card-arrow">›</div>
        </button>
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(104)" title="ARL แอร์พอร์ต ลิงก์ (พญาไท ↔ สุวรรณภูมิ)" aria-label="ARL แอร์พอร์ต ลิงก์" aria-hidden="true" tabindex="-1">
            <div class="footer-card-icon" style="background:rgba(138,21,56,0.12);border-color:rgba(138,21,56,0.3)">${getLineIconSvg(104, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">ARL แอร์พอร์ตลิงก์</span><span class="footer-card-dot">·</span><span class="footer-card-route">พญาไท ↔ สุวรรณภูมิ</span></div>
            <div class="footer-card-arrow">›</div>
        </button>
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(201)" title="รถโดยสารด่วนพิเศษ BRT (สาทร ↔ ราชพฤกษ์)" aria-label="รถโดยสารด่วนพิเศษ BRT" aria-hidden="true" tabindex="-1">
            <div class="footer-card-icon" style="background:rgba(130,195,65,0.12);border-color:rgba(130,195,65,0.3)">${getLineIconSvg(201, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">BRT สาทร-ราชพฤกษ์</span><span class="footer-card-dot">·</span><span class="footer-card-route">สาทร ↔ ราชพฤกษ์</span></div>
            <div class="footer-card-arrow">›</div>
        </button>
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(106)" title="MRT สายสีส้ม (บางขุนนนท์ ↔ แยกร่มเกล้า) (ยังไม่เปิดให้บริการ)" aria-label="MRT สายสีส้ม (ยังไม่เปิดให้บริการ)" aria-hidden="true" tabindex="-1">
            <div class="footer-card-icon" style="background:rgba(245,130,32,0.12);border-color:rgba(245,130,32,0.3)">${getLineIconSvg(106, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">MRT สายสีส้ม</span><span class="footer-card-royal-tag" style="color:#F58220;border:1px solid #F5822055;background:#F5822018;">ยังไม่เปิดให้บริการ</span><span class="footer-card-dot">·</span><span class="footer-card-route">บางขุนนนท์ ↔ แยกร่มเกล้า</span></div>
            <div class="footer-card-arrow">›</div>
        </button>
    </div>
</div>
<div class="footer-refresh-note">
    ${getUiIcon('refresh', 14, 'var(--sky)')} ข้อมูลเรียลไทม์ · รีเฟรชอัตโนมัติทุก 20 วินาที · ครอบคลุมทั้ง 12 สายทั่วกรุงเทพฯ และปริมณฑล
</div>
<div class="footer-disclaimer-note">
    Unofficial app — พัฒนาเพื่ออำนวยความสะดวกในการเดินทาง ข้อมูลเวลาขบวนรถเป็นไปตามมาตรฐานการเดินรถ โปรดเผื่อเวลาเดินทาง
</div>`,
                langBtn: 'EN',
                clockLocale: 'th-TH',
                lines: { 1: 'สุขุมวิท', 2: 'สีลม', 3: 'สีทอง', 4: 'สีเหลือง', 5: 'สีชมพู', 101: 'สีน้ำเงิน', 102: 'สีม่วง', 103: 'สีแดงเข้ม', 105: 'สีแดงอ่อน', 104: 'แอร์พอร์ต ลิงก์', 201: 'BRT', 106: 'สีส้ม (ยังไม่เปิดให้บริการ)' },
                timetableBadge: 'ตามตารางเวลา',
                timetableSchedule: 'ดูตารางความถี่การเดินรถทางการ',
                mrtFreqTitle: 'ความถี่ขบวนรถ',
                mrtFreqNow: f => `ขบวนมาทุก ~${String(f || '').replace(/^~/, '')} นาที`,
                mrtFreqNote: 'ข้อมูลจากตารางเวลาปกติ (ไม่ใช่เวลาสดจริง)',
                mrtWeekday: 'วันจันทร์–ศุกร์',
                mrtWeekend: 'วันเสาร์–อาทิตย์ / วันหยุด',
                mrtOutOfService: 'นอกเวลาให้บริการ',
                mrtTimeRange: 'ช่วงเวลา',
                mrtFreqCol: 'ความถี่',
                mrtSegmentNote: '* ช่วง 07:00–09:00 สถานีนี้อยู่ในเส้นทาง {seg}',
                btsFreqHead: `${getUiIcon('train', 15, 'currentColor')} ความถี่การเดินรถ (ตารางปกติ)`,
                btsSegNote: '* หมอชิต–สำโรง · ** สำโรง–เคหะฯ และ หมอชิต–คูคต',
                btsFreqUnit: 'หน่วย นาที:วินาที',
                btsFreqEffective: 'มีผลตั้งแต่ 1 ม.ค. 2569',
                jTitle: 'ค้นหาเส้นทาง',
                jHint: 'จาก → ถึง · เวลา + ค่าโดยสาร',
                jFrom: 'จาก',
                jTo: 'ถึง',
                jSelect: 'แตะเพื่อเลือกสถานี',
                jUseNearest: `${getUiIcon('pin', 14, 'currentColor')} ใช้สถานีใกล้ฉัน`,
                jRoute: n => `เส้นทางที่ ${n}`,
                jRecommended: 'แนะนำ/เร็วที่สุด',
                jCheapest: 'ประหยัดที่สุด',
                jMin: m => `${m} นาที`,
                jStations: n => `${n} สถานี`,
                jTransfer: `${getUiIcon('walk', 14, 'currentColor')} เปลี่ยนสาย`,
                jFareTypes: 'อัตราค่าโดยสาร',
                jStaticFare: 'ค่าโดยสารรวม',
                jLiveFare: 'ค่าโดยสาร BTS',
                jMrtBlueFare: 'ค่าโดยสาร MRT สายสีน้ำเงิน',
                jMrtPurpleFare: 'ค่าโดยสาร MRT สายสีม่วง',
                jSrtRedFare: 'ค่าโดยสาร SRT สายสีแดง',
                jArlFare: 'ค่าโดยสาร ARL',
                jBrtFare: 'ค่าโดยสาร BRT',
                jMrtOrangeFare: 'ค่าโดยสาร MRT สายสีส้ม',
                jMap: 'ดูแผนที่เส้นทาง',
                jSameStation: 'สถานีเดียวกัน',
                jAlreadyAtStation: 'อยู่ที่สถานีปลายทางแล้ว',
                jSameStationDesc: 'สถานีต้นทางและปลายทางเป็นสถานีเดียวกัน ไม่ต้องเดินทางข้ามสถานี และไม่มีค่าโดยสาร',
                jFail: 'ค้นหาเส้นทางไม่สำเร็จ ลองใหม่อีกครั้ง',
                jSearching: 'กำลังค้นหาเส้นทาง…',
                homeJourneyTitle: 'วางแผนการเดินทาง & เช็คค่าโดยสาร',
                homeJourneySub: 'ค้นหาเส้นทาง คำนวณเวลา และราคาข้าม 12 สาย',
                homeJourneyBtn: 'เปิด ➔',
                navHome: 'หน้าแรก',
                navMap: 'แผนที่',
                navPlanner: 'วางแผน',
                navExits: 'ทางออก',
                navFares: 'ค่าโดยสาร',
                navTimetables: 'เวลาเดินรถ',
                faresTitle: 'อัตราค่าโดยสารรถไฟฟ้าตามสาย',
                timetablesTitle: 'ตารางเวลาเดินรถ & ความถี่ตามสาย',
                mapModeSchematic: 'ผังโครงข่าย 12 สาย',
                mapModeHybrid: 'Google Maps Hybrid',
                mapMyLocation: 'ตำแหน่งของฉัน',
                mapBkkCenter: 'กทม.',
                mapTitle: `${getUiIcon('map', 15, 'currentColor')} ผังโครงข่ายรถไฟฟ้า 12 สาย`,
                mapZoomIn: `${getUiIcon('zoomIn', 13, 'currentColor')} ขยาย`,
                mapZoomOut: `${getUiIcon('zoomOut', 13, 'currentColor')} ย่อ`,
                mapReset: `${getUiIcon('resetZoom', 13, 'currentColor')} กลาง`,
                mapLegendBtn: 'สัญลักษณ์',
                legTitle: 'สัญลักษณ์สายรถไฟฟ้า',
                legSukhumvit: 'สายสุขุมวิท',
                legSilom: 'สายสีลม',
                legGold: 'สายสีทอง',
                legBlue: 'สายสีน้ำเงิน | (เฉลิมรัชมงคล)',
                legPurple: 'สายสีม่วง | (ฉลองรัชธรรม)',
                legBrt: 'รถโดยสารด่วนพิเศษ BRT',
                legPink: 'สายสีชมพู | (วิวัฒน์นคร)',
                legYellow: 'สายสีเหลือง | (นัคราพิพัฒน์)',
                legDarkRed: 'สายสีแดงเข้ม | (ธานีรัถยา)',
                legLightRed: 'สายสีแดงอ่อน | (นครวิถี)',
                legArl: 'แอร์พอร์ต ลิงก์',
                legOrange: 'สายสีส้ม (ยังไม่เปิดให้บริการ)',
                legInter: 'จุดเชื่อมต่อข้ามสาย',
                legAirport: 'เชื่อมต่อท่าอากาศยาน (สนามบิน)',
                legBoat: 'ท่าเรือเชื่อมต่อ (เรือด่วน/คลอง)',
                legTrain: 'เชื่อมต่อรถไฟทางไกล',
                legBus: 'สถานีขนส่งผู้โดยสาร',
                legPark: 'อาคารจอดแล้วจร',
                legTap: 'แตะที่สถานีเพื่อเลือกเป็นจุดเริ่มต้น/ปลายทาง',
                mapHint: `<span class="map-hint-icon">${getUiIcon('bulb', 15, '#f59e0b')}</span><div class="map-hint-body"><span class="map-hint-phrase"><b>วิธีใช้งาน:</b> แตะที่จุดสถานีใดๆ บนแผนผัง</span> <span class="map-hint-phrase">เพื่อเลือกเป็น <b>สถานีต้นทาง</b>,</span> <span class="map-hint-phrase"><b>สถานีปลายทาง</b></span> <span class="map-hint-phrase">หรือดู <b>ข้อมูลทางออก</b> ได้ทันที</span></div>`,
                sheetOrigin: 'ตั้งเป็นสถานีต้นทาง',
                sheetOriginSub: 'คำนวณเส้นทางจากสถานีนี้',
                sheetDest: 'ตั้งเป็นสถานีปลายทาง',
                sheetDestSub: 'ค้นหาเส้นทางไปยังสถานีนี้ทันที',
                sheetExits: 'ดูข้อมูลทางออกและสิ่งอำนวยความสะดวก',
                sheetExitsSub: 'ทางออก 1, 2, 3, สกายวอล์ก, ลิฟต์คนพิการ',
                sheetLive: 'ดูเวลารถไฟฟ้าขบวนถัดไปสด',
                sheetLiveSub: 'เวลานับถอยหลังจริงจากชานชาลา',
                plannerHubTitle: `${getUiIcon('star', 15, '#f59e0b')} <span>สถานียอดนิยม (แตะเพื่อเลือกด่วน)</span> <span class="hub-toggle-chev" id="plannerHubChev">▲</span>`,
                exitCardTitle: `${getUiIcon('door', 15, 'currentColor')} ข้อมูลทางออกสถานี & สิ่งอำนวยความสะดวก`,
                exitCardSub: 'เลือกสายและสถานี เพื่อตรวจสอบตำแหน่งทางออก สกายวอล์ก ลิฟต์คนพิการ และสถานที่ใกล้เคียง',
                exitSearchPh: 'ค้นหาชื่อสถานี หรือรหัส เช่น สยาม, CEN, ศรีด่าน...',
                popupTitle: 'ตรวจพบสถานีใกล้ตัวคุณ',
                popupSub: 'เวลาขบวนรถและชานชาลาแบบเรียลไทม์',
                popupDist: 'จากตำแหน่งคุณ',
                popupPlatTitle: `${getUiIcon('train', 15, 'currentColor')} ชานชาลา & เวลาเดินรถ`,
                popupPlatSub: 'กำลังเข้า / นับถอยหลังสด',
                popupAction: 'ดูรายละเอียดสถานี & ทางออกเต็มจอ',
                popupDismiss: 'รับทราบ',
                navMore: 'เพิ่มเติม',
                moreNotifTitle: 'การแจ้งเตือนเบื้องหลังอัตโนมัติ',
                moreNotifDesc: 'แจ้งเตือนสถานีใกล้คุณ ขบวนรถถัดไป และเวลานับถอยหลังสดอัตโนมัติเมื่อเข้าใกล้สถานี (ขณะเปิดแอปหรือย่อหน้าจอเบื้องหลัง)',
                moreNotifActive: 'เปิดใช้งานอยู่ (ตรวจจับสถานีเบื้องหลัง)',
                moreNotifInactive: 'ปิดการทำงาน (ประหยัดพลังงาน)',
                moreLangTitle: 'ภาษา',
                moreLangDesc: 'เลือกภาษาที่ต้องการให้แสดงผลในระบบ',
                moreThemeTitle: 'ธีมการแสดงผล',
                moreThemeDesc: 'ปรับแต่งธีมสว่างหรือมืดตามสภาพแสง',
                themeDark: 'โหมดมืด',
                themeLight: 'โหมดสว่าง',
                moreClockTitle: 'รูปแบบเวลา',
                moreClockDesc: 'เลือกรูปแบบการแสดงเวลาของนาฬิกาที่แถบหัวเว็บ',
                moreClock24Lbl: '24 ชั่วโมง',
                moreClock12Lbl: '12 ชั่วโมง',
                moreDateTitle: 'รูปแบบวัน/เดือน/ปี',
                moreDateDesc: 'เลือกรูปแบบการแสดงวันที่และระบบศักราชของนาฬิกาที่แถบหัวเว็บ',
                moreDateStyleLabel: '1. รูปแบบการจัดวาง:',
                dateStyleFullDayLbl: 'วันสัปดาห์+ว/ด/ป',
                dateStyleSlashLbl: 'วัน/เดือน/ปี',
                dateStyleTextLbl: 'วัน เดือน ปี',
                dateStyleWeekdayLbl: 'วันในสัปดาห์',
                moreDateEraLabel: '2. ระบบศักราช:',
                dateEraBeLbl: 'พุทธศักราช (พ.ศ.)',
                dateEraCeLbl: 'คริสต์ศักราช (ค.ศ.)',
                moreVersionTitle: 'ข้อมูลแอปพลิเคชัน',
                moreVersionUpToDate: 'เวอร์ชันล่าสุด',
                moreVersionLabel: 'เวอร์ชัน',
                moreNetworkLabel: 'โครงข่ายรถไฟฟ้า',
                moreGatewayLabel: 'สถานะสัญญาณสด',
                moreGatewayValue: '<span class="live-status-line"><span class="live-dot-sm"></span> เชื่อมต่อ 100%</span><span class="live-status-sub">เรียลไทม์</span>',
                morePlatformLabel: 'แพลตฟอร์ม',
            },
            en: {
                appName: 'BKK SKYTRAINs',
                sub: 'Real-time BTS / MRT / SRT / ARL trains status',
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
                searchPh: 'Search station code or name e.g. CEN, Siam',
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
                noTrainData: `${getUiIcon('ban', 15, '#ef4444')} No train data right now`,
                offHours: 'Possibly outside service hours',
                noTrains: 'No trains',
                platformTo: p => `Platform ${p} · To`,
                platformTrainTo: (p, no) => `Platform ${p} · Train ${no} to`,
                train: no => `Train ${no}`,
                arrived: 'Arriving',
                minUnit: ' min',
                mUnit: ' m', kmUnit: ' km',
                routeTitle: `${getUiIcon('map', 15, 'currentColor')} Train positions`,
                routeLine: n => ` · ${n} Line`,
                loadingRoute: 'Loading train positions…',
                trafficHead: `${getUiIcon('warn', 15, '#f59e0b')} Service alerts`,
                trafficBad: names => `${names} service may be disrupted`,
                trafficDisruptionTitle: 'Service Disruption Alerts',
                trafficDialogSub: 'Real-time train operations & urgent alerts',
                trafficNormal: 'Normal',
                trafficDisruption: 'Disrupted',
                trafficMinorDelay: 'Minor Delay',
                trafficSevereDelay: 'Severe Delay / Rerouted',
                trafficStationClosed: 'Station Closed',
                trafficNewsTime: 'Alert Time',
                trafficDismiss: 'Dismiss',
                trafficRefresh: 'Refresh Live',
                trafficRefreshed: 'Transit status updated',
                trafficDetails: 'View Alert ➔',
                trafficAllNormal: 'All Lines Operating Normally',
                trafficAllNormalDesc: 'No disruptions, delays, or service incidents currently reported across the network.',
                trafficLineStatus: 'Primary Lines Status',
                moreTrafficTitle: 'Train Status & Incident Alerts',
                moreTrafficDesc: 'Check real-time network status, technical delays, and emergency transit announcements.',
                trafficSimulatedTag: 'Test Simulation',
                trafficSimulateBtn: 'Simulate Disruption Alert',
                trafficSimulateResetBtn: 'Reset Simulation',
                geoUnsupported: 'This browser does not support geolocation',
                geoDenied: 'Location permission denied — allow Location for this site and retry',
                geoFail: 'Could not get your location, please retry',
                connectFail: s => `Connection failed (HTTP ${s})`,
                footer: `<div class="footer-systems-title"><span class="footer-title-icon-pill" style="background:rgba(16,185,129,0.14);border:1px solid rgba(16,185,129,0.28);color:#10b981">${getUiIcon('train', 16, '#10b981')}</span> Connected Transit Network (All 12 Lines)</div>
<div class="footer-slider-wrapper" id="footerSliderWrapper">
    <div class="footer-slider-track" id="footerSliderTrack">
        <!-- Set 1 (12 Lines) -->
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(1)" title="BTS Sukhumvit Line (Khu Khot ↔ Kheha)" aria-label="BTS Sukhumvit Line">
            <div class="footer-card-icon" style="background:rgba(122,180,32,0.12);border-color:rgba(122,180,32,0.3)">${getLineIconSvg(1, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">BTS Sukhumvit</span><span class="footer-card-dot">·</span><span class="footer-card-route">Khu Khot ↔ Kheha</span></div>
            <div class="footer-card-arrow">›</div>
        </button>
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(2)" title="BTS Silom Line (National Stadium ↔ Bang Wa)" aria-label="BTS Silom Line">
            <div class="footer-card-icon" style="background:rgba(0,128,125,0.12);border-color:rgba(0,128,125,0.3)">${getLineIconSvg(2, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">BTS Silom</span><span class="footer-card-dot">·</span><span class="footer-card-route">National Stadium ↔ Bang Wa</span></div>
            <div class="footer-card-arrow">›</div>
        </button>
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(3)" title="APM Gold Line (Krung Thon Buri ↔ Khlong San)" aria-label="APM Gold Line">
            <div class="footer-card-icon" style="background:rgba(201,160,56,0.12);border-color:rgba(201,160,56,0.3)">${getLineIconSvg(3, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">APM Gold Line</span><span class="footer-card-dot">·</span><span class="footer-card-route">Krung Thon Buri ↔ Khlong San</span></div>
            <div class="footer-card-arrow">›</div>
        </button>
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(101)" title="MRT Blue Line (Tha Phra ↔ Lak Song)" aria-label="MRT Blue Line">
            <div class="footer-card-icon" style="background:rgba(2,132,199,0.12);border-color:rgba(2,132,199,0.3)">${getLineIconSvg(101, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">MRT Blue Line</span><span class="footer-card-dot">·</span><span class="footer-card-route">Tha Phra ↔ Lak Song</span></div>
            <div class="footer-card-arrow">›</div>
        </button>
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(102)" title="MRT Purple Line (Khlong Bang Phai ↔ Tao Poon)" aria-label="MRT Purple Line">
            <div class="footer-card-icon" style="background:rgba(138,44,155,0.12);border-color:rgba(138,44,155,0.3)">${getLineIconSvg(102, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">MRT Purple Line</span><span class="footer-card-dot">·</span><span class="footer-card-route">Khlong Bang Phai ↔ Tao Poon</span></div>
            <div class="footer-card-arrow">›</div>
        </button>
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(4)" title="MRT Yellow Line (Lat Phrao ↔ Samrong)" aria-label="MRT Yellow Line">
            <div class="footer-card-icon" style="background:rgba(255,209,0,0.15);border-color:rgba(255,209,0,0.35)">${getLineIconSvg(4, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">MRT Yellow Line</span><span class="footer-card-dot">·</span><span class="footer-card-route">Lat Phrao ↔ Samrong</span></div>
            <div class="footer-card-arrow">›</div>
        </button>
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(5)" title="MRT Pink Line (Nonthaburi Civic Center ↔ Min Buri)" aria-label="MRT Pink Line">
            <div class="footer-card-icon" style="background:rgba(236,72,153,0.12);border-color:rgba(236,72,153,0.3)">${getLineIconSvg(5, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">MRT Pink Line</span><span class="footer-card-dot">·</span><span class="footer-card-route">Nonthaburi CC ↔ Min Buri</span></div>
            <div class="footer-card-arrow">›</div>
        </button>
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(103)" title="SRT Dark Red Line (Krung Thep Aphiwat ↔ Rangsit)" aria-label="SRT Dark Red Line">
            <div class="footer-card-icon" style="background:rgba(185,28,28,0.12);border-color:rgba(185,28,28,0.3)">${getLineIconSvg(103, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">SRT Dark Red</span><span class="footer-card-dot">·</span><span class="footer-card-route">Krung Thep Aphiwat ↔ Rangsit</span></div>
            <div class="footer-card-arrow">›</div>
        </button>
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(105)" title="SRT Light Red Line (Krung Thep Aphiwat ↔ Taling Chan)" aria-label="SRT Light Red Line">
            <div class="footer-card-icon" style="background:rgba(248,113,113,0.15);border-color:rgba(248,113,113,0.35)">${getLineIconSvg(105, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">SRT Light Red</span><span class="footer-card-dot">·</span><span class="footer-card-route">Aphiwat ↔ Taling Chan</span></div>
            <div class="footer-card-arrow">›</div>
        </button>
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(104)" title="ARL Airport Rail Link (Phaya Thai ↔ Suvarnabhumi)" aria-label="ARL Airport Rail Link">
            <div class="footer-card-icon" style="background:rgba(138,21,56,0.12);border-color:rgba(138,21,56,0.3)">${getLineIconSvg(104, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">Airport Rail Link</span><span class="footer-card-dot">·</span><span class="footer-card-route">Phaya Thai ↔ Suvarnabhumi</span></div>
            <div class="footer-card-arrow">›</div>
        </button>
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(201)" title="Bangkok BRT (Sathorn ↔ Ratchapruek)" aria-label="Bangkok BRT">
            <div class="footer-card-icon" style="background:rgba(130,195,65,0.12);border-color:rgba(130,195,65,0.3)">${getLineIconSvg(201, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">Bangkok BRT</span><span class="footer-card-dot">·</span><span class="footer-card-route">Sathorn ↔ Ratchapruek</span></div>
            <div class="footer-card-arrow">›</div>
        </button>
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(106)" title="MRT Orange Line (Bang Khun Non ↔ Yaek Rom Klao) (Not in Service)" aria-label="MRT Orange Line (Not in Service)">
            <div class="footer-card-icon" style="background:rgba(245,130,32,0.12);border-color:rgba(245,130,32,0.3)">${getLineIconSvg(106, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">MRT Orange Line</span><span class="footer-card-royal-tag" style="color:#F58220;border:1px solid #F5822055;background:#F5822018;">Not in Service</span><span class="footer-card-dot">·</span><span class="footer-card-route">Bang Khun Non ↔ Yaek Rom Klao</span></div>
            <div class="footer-card-arrow">›</div>
        </button>

        <!-- Set 2 (12 Duplicate Lines for Seamless Infinite Loop) -->
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(1)" title="BTS Sukhumvit Line (Khu Khot ↔ Kheha)" aria-label="BTS Sukhumvit Line" aria-hidden="true" tabindex="-1">
            <div class="footer-card-icon" style="background:rgba(122,180,32,0.12);border-color:rgba(122,180,32,0.3)">${getLineIconSvg(1, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">BTS Sukhumvit</span><span class="footer-card-dot">·</span><span class="footer-card-route">Khu Khot ↔ Kheha</span></div>
            <div class="footer-card-arrow">›</div>
        </button>
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(2)" title="BTS Silom Line (National Stadium ↔ Bang Wa)" aria-label="BTS Silom Line" aria-hidden="true" tabindex="-1">
            <div class="footer-card-icon" style="background:rgba(0,128,125,0.12);border-color:rgba(0,128,125,0.3)">${getLineIconSvg(2, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">BTS Silom</span><span class="footer-card-dot">·</span><span class="footer-card-route">National Stadium ↔ Bang Wa</span></div>
            <div class="footer-card-arrow">›</div>
        </button>
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(3)" title="APM Gold Line (Krung Thon Buri ↔ Khlong San)" aria-label="APM Gold Line" aria-hidden="true" tabindex="-1">
            <div class="footer-card-icon" style="background:rgba(201,160,56,0.12);border-color:rgba(201,160,56,0.3)">${getLineIconSvg(3, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">APM Gold Line</span><span class="footer-card-dot">·</span><span class="footer-card-route">Krung Thon Buri ↔ Khlong San</span></div>
            <div class="footer-card-arrow">›</div>
        </button>
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(101)" title="MRT Blue Line (Tha Phra ↔ Lak Song)" aria-label="MRT Blue Line" aria-hidden="true" tabindex="-1">
            <div class="footer-card-icon" style="background:rgba(2,132,199,0.12);border-color:rgba(2,132,199,0.3)">${getLineIconSvg(101, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">MRT Blue Line</span><span class="footer-card-dot">·</span><span class="footer-card-route">Tha Phra ↔ Lak Song</span></div>
            <div class="footer-card-arrow">›</div>
        </button>
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(102)" title="MRT Purple Line (Khlong Bang Phai ↔ Tao Poon)" aria-label="MRT Purple Line" aria-hidden="true" tabindex="-1">
            <div class="footer-card-icon" style="background:rgba(138,44,155,0.12);border-color:rgba(138,44,155,0.3)">${getLineIconSvg(102, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">MRT Purple Line</span><span class="footer-card-dot">·</span><span class="footer-card-route">Khlong Bang Phai ↔ Tao Poon</span></div>
            <div class="footer-card-arrow">›</div>
        </button>
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(4)" title="MRT Yellow Line (Lat Phrao ↔ Samrong)" aria-label="MRT Yellow Line" aria-hidden="true" tabindex="-1">
            <div class="footer-card-icon" style="background:rgba(255,209,0,0.15);border-color:rgba(255,209,0,0.35)">${getLineIconSvg(4, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">MRT Yellow Line</span><span class="footer-card-dot">·</span><span class="footer-card-route">Lat Phrao ↔ Samrong</span></div>
            <div class="footer-card-arrow">›</div>
        </button>
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(5)" title="MRT Pink Line (Nonthaburi Civic Center ↔ Min Buri)" aria-label="MRT Pink Line" aria-hidden="true" tabindex="-1">
            <div class="footer-card-icon" style="background:rgba(236,72,153,0.12);border-color:rgba(236,72,153,0.3)">${getLineIconSvg(5, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">MRT Pink Line</span><span class="footer-card-dot">·</span><span class="footer-card-route">Nonthaburi CC ↔ Min Buri</span></div>
            <div class="footer-card-arrow">›</div>
        </button>
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(103)" title="SRT Dark Red Line (Krung Thep Aphiwat ↔ Rangsit)" aria-label="SRT Dark Red Line" aria-hidden="true" tabindex="-1">
            <div class="footer-card-icon" style="background:rgba(185,28,28,0.12);border-color:rgba(185,28,28,0.3)">${getLineIconSvg(103, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">SRT Dark Red</span><span class="footer-card-dot">·</span><span class="footer-card-route">Krung Thep Aphiwat ↔ Rangsit</span></div>
            <div class="footer-card-arrow">›</div>
        </button>
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(105)" title="SRT Light Red Line (Krung Thep Aphiwat ↔ Taling Chan)" aria-label="SRT Light Red Line" aria-hidden="true" tabindex="-1">
            <div class="footer-card-icon" style="background:rgba(248,113,113,0.15);border-color:rgba(248,113,113,0.35)">${getLineIconSvg(105, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">SRT Light Red</span><span class="footer-card-dot">·</span><span class="footer-card-route">Aphiwat ↔ Taling Chan</span></div>
            <div class="footer-card-arrow">›</div>
        </button>
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(104)" title="ARL Airport Rail Link (Phaya Thai ↔ Suvarnabhumi)" aria-label="ARL Airport Rail Link" aria-hidden="true" tabindex="-1">
            <div class="footer-card-icon" style="background:rgba(138,21,56,0.12);border-color:rgba(138,21,56,0.3)">${getLineIconSvg(104, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">Airport Rail Link</span><span class="footer-card-dot">·</span><span class="footer-card-route">Phaya Thai ↔ Suvarnabhumi</span></div>
            <div class="footer-card-arrow">›</div>
        </button>
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(201)" title="Bangkok BRT (Sathorn ↔ Ratchapruek)" aria-label="Bangkok BRT" aria-hidden="true" tabindex="-1">
            <div class="footer-card-icon" style="background:rgba(130,195,65,0.12);border-color:rgba(130,195,65,0.3)">${getLineIconSvg(201, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">Bangkok BRT</span><span class="footer-card-dot">·</span><span class="footer-card-route">Sathorn ↔ Ratchapruek</span></div>
            <div class="footer-card-arrow">›</div>
        </button>
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(106)" title="MRT Orange Line (Bang Khun Non ↔ Yaek Rom Klao) (Not in Service)" aria-label="MRT Orange Line (Not in Service)" aria-hidden="true" tabindex="-1">
            <div class="footer-card-icon" style="background:rgba(245,130,32,0.12);border-color:rgba(245,130,32,0.3)">${getLineIconSvg(106, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">MRT Orange Line</span><span class="footer-card-royal-tag" style="color:#F58220;border:1px solid #F5822055;background:#F5822018;">Not in Service</span><span class="footer-card-dot">·</span><span class="footer-card-route">Bang Khun Non ↔ Yaek Rom Klao</span></div>
            <div class="footer-card-arrow">›</div>
        </button>
    </div>
</div>
<div class="footer-refresh-note">
    ${getUiIcon('refresh', 14, 'var(--sky)')} Real-time data · Auto-refresh every 20 seconds · Covering all 12 transit lines across BKK & Vicinity
</div>
<div class="footer-disclaimer-note">
    Unofficial app — Built for daily commuters. Timetables & arrival estimates follow official headway schedules. Please allow extra travel time.
</div>`,
                langBtn: '中文',
                clockLocale: 'en-GB',
                lines: { 1: 'Sukhumvit', 2: 'Silom', 3: 'Gold', 4: 'Yellow', 5: 'Pink', 101: 'Blue', 102: 'Purple', 103: 'Dark Red', 105: 'Light Red', 104: 'Airport Link', 201: 'BRT', 106: 'Orange (Not in Service)' },
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
                btsFreqHead: `${getUiIcon('train', 15, 'currentColor')} Service intervals (regular timetable)`,
                btsSegNote: '* Mo Chit–Samrong · ** Samrong–Kheha & Mo Chit–Khu Khot',
                btsFreqUnit: 'Unit min:sec',
                btsFreqEffective: 'Effective 1 Jan 2026',
                jTitle: 'Plan a journey',
                jHint: 'From → To · time + fare',
                jFrom: 'From',
                jTo: 'To',
                jSelect: 'Tap to select a station',
                jUseNearest: `${getUiIcon('pin', 14, 'currentColor')} Use my nearest station`,
                jRoute: n => `Route ${n}`,
                jRecommended: 'Recommended/Fastest',
                jCheapest: 'Cheapest',
                jMin: m => `${m} min`,
                jStations: n => `${n} stations`,
                jTransfer: `${getUiIcon('walk', 14, 'currentColor')} Transfer`,
                jFareTypes: 'Fares',
                jStaticFare: 'Total fare',
                jLiveFare: 'BTS fare',
                jMrtBlueFare: 'MRT Blue Line fare',
                jMrtPurpleFare: 'MRT Purple Line fare',
                jSrtRedFare: 'SRT Red Line fare',
                jArlFare: 'ARL fare',
                jBrtFare: 'BRT fare',
                jMrtOrangeFare: 'MRT Orange Line fare',
                jMap: 'View route map',
                jSameStation: 'Same Station',
                jAlreadyAtStation: 'Already at destination',
                jSameStationDesc: 'Origin and destination are the same station. No transit or ticket required.',
                jFail: 'Could not find a route, please retry',
                jSearching: 'Finding routes…',
                homeJourneyTitle: 'Journey Planner & Fare Guide',
                homeJourneySub: 'Find routes, estimate travel time & fares across 12 lines',
                homeJourneyBtn: 'Open ➔',
                navHome: 'Home',
                navMap: 'Map',
                navPlanner: 'Plan',
                navExits: 'Exits',
                navFares: 'Fares',
                navTimetables: 'Timetable',
                faresTitle: 'Transit Fares & Pricing by Line',
                timetablesTitle: 'Train Timetables & Frequency by Line',
                mapModeSchematic: '12-Line Network',
                mapModeHybrid: 'Google Maps Hybrid',
                mapMyLocation: 'My Location',
                mapBkkCenter: 'BKK',
                mapTitle: `${getUiIcon('map', 15, 'currentColor')} 12 Transit Lines Network Map`,
                mapZoomIn: `${getUiIcon('zoomIn', 13, 'currentColor')} Zoom In`,
                mapZoomOut: `${getUiIcon('zoomOut', 13, 'currentColor')} Zoom Out`,
                mapReset: `${getUiIcon('resetZoom', 13, 'currentColor')} Reset`,
                mapLegendBtn: 'Legend',
                legTitle: 'Transit Network Legend',
                legSukhumvit: 'Sukhumvit Line',
                legSilom: 'Silom Line',
                legGold: 'Gold Line',
                legBlue: 'Blue Line (Chaloem Ratchamongkhon)',
                legPurple: 'Purple Line (Chalong Ratchatham)',
                legBrt: 'BRT Express Bus',
                legPink: 'Pink Line (Wiwat Nakhon)',
                legYellow: 'Yellow Line (Nakhara Phiphat)',
                legDarkRed: 'SRT Dark Red Line (Thani Ratthaya)',
                legLightRed: 'SRT Light Red Line (Nakhon Withi)',
                legArl: 'Airport Rail Link',
                legOrange: 'Orange Line (Not in Service)',
                legInter: 'Interchange Station',
                legAirport: 'Airport Rail Connection',
                legBoat: 'Pier Connection (Express Boat/Canal)',
                legTrain: 'Intercity Train Connection (SRT)',
                legBus: 'Bus Terminal Connection',
                legPark: 'Park & Ride',
                legTap: 'Tap station to set Origin or Destination',
                mapHint: `<span class="map-hint-icon">${getUiIcon('bulb', 15, '#f59e0b')}</span><div class="map-hint-body"><span class="map-hint-phrase"><b>How to use:</b> Tap any station on the map</span> <span class="map-hint-phrase">to set as <b>Origin</b>,</span> <span class="map-hint-phrase"><b>Destination</b></span> <span class="map-hint-phrase">or view <b>Exit Directory</b>.</span></div>`,
                sheetOrigin: 'Set as Origin Station',
                sheetOriginSub: 'Plan journey starting from this station',
                sheetDest: 'Set as Destination',
                sheetDestSub: 'Find routes arriving at this station',
                sheetExits: 'Station Exits & Facilities',
                sheetExitsSub: 'Exits, Skywalks, Priority Elevators',
                sheetLive: 'Live Train Arrivals',
                sheetLiveSub: 'Real-time platform countdowns',
                plannerHubTitle: `${getUiIcon('star', 15, '#f59e0b')} <span>Popular Stations (Quick Select)</span> <span class="hub-toggle-chev" id="plannerHubChev">▲</span>`,
                exitCardTitle: `${getUiIcon('door', 15, 'currentColor')} Station Exits & Facilities`,
                exitCardSub: 'Select line and station to check exits, skywalks, priority elevators, and nearby landmarks',
                exitSearchPh: 'Search station e.g. Siam, CEN, Si Dan...',
                popupTitle: 'Nearest Station Detected',
                popupSub: 'Real-time trains & platform status',
                popupDist: 'from your location',
                popupPlatTitle: `${getUiIcon('train', 15, 'currentColor')} Platforms & Live Trains`,
                popupPlatSub: 'Arriving / Live countdown',
                popupAction: 'View Full Station & Exit Details',
                popupDismiss: 'Got it',
                navMore: 'More',
                moreNotifTitle: 'Background Notifications',
                moreNotifDesc: 'Automatic alerts for nearest station, next train, and live countdown when near a station (while app is open or minimized).',
                moreNotifActive: 'Active (Background Geofencing On)',
                moreNotifInactive: 'Disabled (Battery Saver)',
                moreLangTitle: 'Language',
                moreLangDesc: 'Select system display language',
                moreThemeTitle: 'Display Theme',
                moreThemeDesc: 'Choose between dark mode and light mode',
                themeDark: 'Dark Mode',
                themeLight: 'Light Mode',
                moreClockTitle: 'Clock Format',
                moreClockDesc: 'Choose the time display format for the header clock',
                moreClock24Lbl: '24 Hours (24H)',
                moreClock12Lbl: '12 Hours (12H AM/PM)',
                moreDateTitle: 'Date Format',
                moreDateDesc: 'Choose the date display format and era system for the header clock',
                moreDateStyleLabel: '1. Date Layout Style:',
                dateStyleFullDayLbl: 'Weekday + D/M/Y',
                dateStyleSlashLbl: 'Day/Month/Year',
                dateStyleTextLbl: 'Day Month Year',
                dateStyleWeekdayLbl: 'Weekday Only',
                moreDateEraLabel: '2. Era System:',
                dateEraBeLbl: 'Buddhist Era (B.E.)',
                dateEraCeLbl: 'Common Era (C.E.)',
                moreVersionTitle: 'App Information',
                moreVersionUpToDate: 'Latest Release',
                moreVersionLabel: 'Version',
                moreNetworkLabel: 'Transit Network',
                moreGatewayLabel: 'Live Signal',
                moreGatewayValue: '<span class="live-status-line"><span class="live-dot-sm"></span> Connected 100%</span><span class="live-status-sub">Real-Time</span>',
                morePlatformLabel: 'Platform',
            },
            zh: {
                appName: 'BKK SKYTRAINs',
                sub: '曼谷 BTS / MRT / SRT / ARL 轨道交通实时运行状态',
                affiliation: '非 BTS/MRT/SRT/ARL 官方应用',
                nearestTitle: '离您最近的车站',
                nearestExitTitle: '离您最近的出入口',
                relocate: '重新定位',
                findNearest: '查找附近车站',
                findNearestExit: '通过 GPS 确定您所在的出入口',
                locating: '正在获取您的位置…',
                fromYou: '距您当前位置',
                atStation: '位于本站',
                currentLocation: '当前位置',
                lastLocation: '上次保存位置',
                confirmHere: '我在此站（确认位置）',
                searchPh: '搜索车站编号或站名，如 CEN、暹罗、Siam',
                notFound: q => `未找到车站 “${q}”`,
                nearYou: '附近',
                crowded: '拥挤',
                interchange: '换乘站 · 4 侧站台',
                fourPlat: '4 侧站台',
                line: n => `${n}线`,
                connLine: n => `⇄ ${n}线`,
                connTitle: k => `连接至 ${k}`,
                updated: t => `更新于 ${t}`,
                refresh: '↻ 刷新',
                retry: '重试',
                loadStationsFail: '加载车站列表失败 — 请检查网络连接',
                loadingTrains: '正在加载列车到站信息…',
                noTrainData: `${getUiIcon('ban', 15, '#ef4444')} 暂无列车数据`,
                offHours: '可能处于非营运时段',
                noTrains: '暂无列车',
                platformTo: p => `${p} 号站台 · 开往`,
                platformTrainTo: (p, no) => `${p} 号站台 · 第 ${no} 趟开往`,
                train: no => `第 ${no} 趟`,
                arrived: '即将进站',
                minUnit: ' 分钟',
                mUnit: ' 米', kmUnit: ' 公里',
                routeTitle: `${getUiIcon('map', 15, 'currentColor')} 列车实时位置`,
                routeLine: n => ` · ${n}线`,
                loadingRoute: '正在加载列车位置…',
                trafficHead: `${getUiIcon('warn', 15, '#f59e0b')} 运营公告`,
                trafficBad: names => `${names} 运行可能出现延误或异常`,
                trafficDisruptionTitle: '列车运行异常及故障公告',
                trafficDialogSub: '实时列车运行状态与紧急通告',
                trafficNormal: '正常',
                trafficDisruption: '故障',
                trafficMinorDelay: '运行轻微延误',
                trafficSevereDelay: '严重延误/调整路线',
                trafficStationClosed: '车站临时关闭',
                trafficNewsTime: '公告时间',
                trafficDismiss: '我知道了',
                trafficRefresh: '实时刷新',
                trafficRefreshed: '列车运行状态已更新',
                trafficDetails: '查看详情 ➔',
                trafficAllNormal: '全线列车运行正常',
                trafficAllNormalDesc: '目前全线轨道交通网络均畅通无阻，暂无任何故障或延误报告。',
                trafficLineStatus: '主要线路运行状态',
                moreTrafficTitle: '运行状态与故障公告',
                moreTrafficDesc: '查看全线实时运行状态、设备技术故障及突发事件应急公告。',
                trafficSimulatedTag: '模拟测试公告',
                trafficSimulateBtn: '模拟故障公告',
                trafficSimulateResetBtn: '恢复正常状态',
                geoUnsupported: '您的浏览器不支持地理位置定位',
                geoDenied: '定位权限已被拒绝 — 请允许本站使用位置权限后重试',
                geoFail: '无法获取您的位置，请重试',
                connectFail: s => `网络连接失败 (HTTP ${s})`,
                footer: `<div class="footer-systems-title"><span class="footer-title-icon-pill" style="background:rgba(16,185,129,0.14);border:1px solid rgba(16,185,129,0.28);color:#10b981">${getUiIcon('train', 16, '#10b981')}</span> 曼谷互联轨道交通网络（全部 12 条线路）</div>
<div class="footer-slider-wrapper" id="footerSliderWrapper">
    <div class="footer-slider-track" id="footerSliderTrack">
        <!-- Set 1 (12 Lines) -->
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(1)" title="BTS 素坤逸线 (库括 ↔ 凯哈)" aria-label="BTS 素坤逸线">
            <div class="footer-card-icon" style="background:rgba(122,180,32,0.12);border-color:rgba(122,180,32,0.3)">${getLineIconSvg(1, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">BTS 素坤逸线</span><span class="footer-card-dot">·</span><span class="footer-card-route">库括 ↔ 凯哈</span></div>
            <div class="footer-card-arrow">›</div>
        </button>
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(2)" title="BTS 是隆线 (国家体育场 ↔ 挽哇)" aria-label="BTS 是隆线">
            <div class="footer-card-icon" style="background:rgba(0,128,125,0.12);border-color:rgba(0,128,125,0.3)">${getLineIconSvg(2, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">BTS 是隆线</span><span class="footer-card-dot">·</span><span class="footer-card-route">国家体育场 ↔ 挽哇</span></div>
            <div class="footer-card-arrow">›</div>
        </button>
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(3)" title="APM 金线 (吞武里城 ↔ 空讪)" aria-label="APM 金线">
            <div class="footer-card-icon" style="background:rgba(201,160,56,0.12);border-color:rgba(201,160,56,0.3)">${getLineIconSvg(3, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">APM 金线</span><span class="footer-card-dot">·</span><span class="footer-card-route">吞武里城 ↔ 空讪</span></div>
            <div class="footer-card-arrow">›</div>
        </button>
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(101)" title="MRT 蓝线 (塔帕 ↔ 拉颂)" aria-label="MRT 蓝线">
            <div class="footer-card-icon" style="background:rgba(2,132,199,0.12);border-color:rgba(2,132,199,0.3)">${getLineIconSvg(101, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">MRT 蓝线</span><span class="footer-card-royal-tag" style="color:#0284C7;border:1px solid #0284C755;background:#0284C718;">差隆拉差蒙坤</span><span class="footer-card-dot">·</span><span class="footer-card-route">塔帕 ↔ 拉颂</span></div>
            <div class="footer-card-arrow">›</div>
        </button>
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(102)" title="MRT 紫线 (空邦派 ↔ 岛本)" aria-label="MRT 紫线">
            <div class="footer-card-icon" style="background:rgba(138,44,155,0.12);border-color:rgba(138,44,155,0.3)">${getLineIconSvg(102, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">MRT 紫线</span><span class="footer-card-royal-tag" style="color:#8A2C9B;border:1px solid #8A2C9B55;background:#8A2C9B18;">差隆拉差探</span><span class="footer-card-dot">·</span><span class="footer-card-route">空邦派 ↔ 岛本</span></div>
            <div class="footer-card-arrow">›</div>
        </button>
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(4)" title="MRT 黄线 (拉抛 ↔ 三隆)" aria-label="MRT 黄线">
            <div class="footer-card-icon" style="background:rgba(255,209,0,0.15);border-color:rgba(255,209,0,0.35)">${getLineIconSvg(4, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">MRT 黄线</span><span class="footer-card-royal-tag" style="color:#FFD100;border:1px solid #FFD10055;background:#FFD10018;">纳卡拉披帕</span><span class="footer-card-dot">·</span><span class="footer-card-route">拉抛 ↔ 三隆</span></div>
            <div class="footer-card-arrow">›</div>
        </button>
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(5)" title="MRT 粉红线 (暖武里政务中心 ↔ 民武里)" aria-label="MRT 粉红线">
            <div class="footer-card-icon" style="background:rgba(236,72,153,0.12);border-color:rgba(236,72,153,0.3)">${getLineIconSvg(5, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">MRT 粉红线</span><span class="footer-card-royal-tag" style="color:#EC4899;border:1px solid #EC489955;background:#EC489918;">威瓦那空</span><span class="footer-card-dot">·</span><span class="footer-card-route">暖武里政务 ↔ 民武里</span></div>
            <div class="footer-card-arrow">›</div>
        </button>
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(103)" title="SRT 暗红线 (阿披瓦中央站 ↔ 兰实)" aria-label="SRT 暗红线">
            <div class="footer-card-icon" style="background:rgba(185,28,28,0.12);border-color:rgba(185,28,28,0.3)">${getLineIconSvg(103, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">SRT 暗红线</span><span class="footer-card-royal-tag" style="color:#B91C1C;border:1px solid #B91C1C55;background:#B91C1C18;">塔尼拉塔雅</span><span class="footer-card-dot">·</span><span class="footer-card-route">阿披瓦中央站 ↔ 兰实</span></div>
            <div class="footer-card-arrow">›</div>
        </button>
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(105)" title="SRT 浅红线 (阿披瓦中央站 ↔ 大林江)" aria-label="SRT 浅红线">
            <div class="footer-card-icon" style="background:rgba(248,113,113,0.15);border-color:rgba(248,113,113,0.35)">${getLineIconSvg(105, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">SRT 浅红线</span><span class="footer-card-royal-tag" style="color:#F87171;border:1px solid #F8717155;background:#F8717118;">那空威提</span><span class="footer-card-dot">·</span><span class="footer-card-route">阿披瓦 ↔ 大林江</span></div>
            <div class="footer-card-arrow">›</div>
        </button>
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(104)" title="ARL 机场快线 (帕亚泰 ↔ 素万那普)" aria-label="ARL 机场快线">
            <div class="footer-card-icon" style="background:rgba(138,21,56,0.12);border-color:rgba(138,21,56,0.3)">${getLineIconSvg(104, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">ARL 机场快线</span><span class="footer-card-dot">·</span><span class="footer-card-route">帕亚泰 ↔ 素万那普</span></div>
            <div class="footer-card-arrow">›</div>
        </button>
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(201)" title="BRT 快捷公交 (沙吞 ↔ 拉差蓬)" aria-label="BRT 快捷公交">
            <div class="footer-card-icon" style="background:rgba(130,195,65,0.12);border-color:rgba(130,195,65,0.3)">${getLineIconSvg(201, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">BRT 快捷公交</span><span class="footer-card-dot">·</span><span class="footer-card-route">沙吞 ↔ 拉差蓬</span></div>
            <div class="footer-card-arrow">›</div>
        </button>
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(106)" title="MRT 橙线 (邦坤暖 ↔ 隆高岔路) (尚未开通)" aria-label="MRT 橙线 (尚未开通)">
            <div class="footer-card-icon" style="background:rgba(245,130,32,0.12);border-color:rgba(245,130,32,0.3)">${getLineIconSvg(106, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">MRT 橙线</span><span class="footer-card-royal-tag" style="color:#F58220;border:1px solid #F5822055;background:#F5822018;">尚未开通</span><span class="footer-card-dot">·</span><span class="footer-card-route">邦坤暖 ↔ 隆高岔路</span></div>
            <div class="footer-card-arrow">›</div>
        </button>

        <!-- Set 2 (12 Duplicate Lines for Seamless Infinite Loop) -->
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(1)" title="BTS 素坤逸线 (库括 ↔ 凯哈)" aria-label="BTS 素坤逸线" aria-hidden="true" tabindex="-1">
            <div class="footer-card-icon" style="background:rgba(122,180,32,0.12);border-color:rgba(122,180,32,0.3)">${getLineIconSvg(1, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">BTS 素坤逸线</span><span class="footer-card-dot">·</span><span class="footer-card-route">库括 ↔ 凯哈</span></div>
            <div class="footer-card-arrow">›</div>
        </button>
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(2)" title="BTS 是隆线 (国家体育场 ↔ 挽哇)" aria-label="BTS 是隆线" aria-hidden="true" tabindex="-1">
            <div class="footer-card-icon" style="background:rgba(0,128,125,0.12);border-color:rgba(0,128,125,0.3)">${getLineIconSvg(2, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">BTS 是隆线</span><span class="footer-card-dot">·</span><span class="footer-card-route">国家体育场 ↔ 挽哇</span></div>
            <div class="footer-card-arrow">›</div>
        </button>
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(3)" title="APM 金线 (吞武里城 ↔ 空讪)" aria-label="APM 金线" aria-hidden="true" tabindex="-1">
            <div class="footer-card-icon" style="background:rgba(201,160,56,0.12);border-color:rgba(201,160,56,0.3)">${getLineIconSvg(3, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">APM 金线</span><span class="footer-card-dot">·</span><span class="footer-card-route">吞武里城 ↔ 空讪</span></div>
            <div class="footer-card-arrow">›</div>
        </button>
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(101)" title="MRT 蓝线 (塔帕 ↔ 拉颂)" aria-label="MRT 蓝线" aria-hidden="true" tabindex="-1">
            <div class="footer-card-icon" style="background:rgba(2,132,199,0.12);border-color:rgba(2,132,199,0.3)">${getLineIconSvg(101, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">MRT 蓝线</span><span class="footer-card-royal-tag" style="color:#0284C7;border:1px solid #0284C755;background:#0284C718;">差隆拉差蒙坤</span><span class="footer-card-dot">·</span><span class="footer-card-route">塔帕 ↔ 拉颂</span></div>
            <div class="footer-card-arrow">›</div>
        </button>
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(102)" title="MRT 紫线 (空邦派 ↔ 岛本)" aria-label="MRT 紫线" aria-hidden="true" tabindex="-1">
            <div class="footer-card-icon" style="background:rgba(138,44,155,0.12);border-color:rgba(138,44,155,0.3)">${getLineIconSvg(102, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">MRT 紫线</span><span class="footer-card-royal-tag" style="color:#8A2C9B;border:1px solid #8A2C9B55;background:#8A2C9B18;">差隆拉差探</span><span class="footer-card-dot">·</span><span class="footer-card-route">空邦派 ↔ 岛本</span></div>
            <div class="footer-card-arrow">›</div>
        </button>
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(4)" title="MRT 黄线 (拉抛 ↔ 三隆)" aria-label="MRT 黄线" aria-hidden="true" tabindex="-1">
            <div class="footer-card-icon" style="background:rgba(255,209,0,0.15);border-color:rgba(255,209,0,0.35)">${getLineIconSvg(4, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">MRT 黄线</span><span class="footer-card-royal-tag" style="color:#FFD100;border:1px solid #FFD10055;background:#FFD10018;">纳卡拉披帕</span><span class="footer-card-dot">·</span><span class="footer-card-route">拉抛 ↔ 三隆</span></div>
            <div class="footer-card-arrow">›</div>
        </button>
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(5)" title="MRT 粉红线 (暖武里政务中心 ↔ 民武里)" aria-label="MRT 粉红线" aria-hidden="true" tabindex="-1">
            <div class="footer-card-icon" style="background:rgba(236,72,153,0.12);border-color:rgba(236,72,153,0.3)">${getLineIconSvg(5, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">MRT 粉红线</span><span class="footer-card-royal-tag" style="color:#EC4899;border:1px solid #EC489955;background:#EC489918;">威瓦那空</span><span class="footer-card-dot">·</span><span class="footer-card-route">暖武里政务 ↔ 民武里</span></div>
            <div class="footer-card-arrow">›</div>
        </button>
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(103)" title="SRT 暗红线 (阿披瓦中央站 ↔ 兰实)" aria-label="SRT 暗红线" aria-hidden="true" tabindex="-1">
            <div class="footer-card-icon" style="background:rgba(185,28,28,0.12);border-color:rgba(185,28,28,0.3)">${getLineIconSvg(103, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">SRT 暗红线</span><span class="footer-card-royal-tag" style="color:#B91C1C;border:1px solid #B91C1C55;background:#B91C1C18;">塔尼拉塔雅</span><span class="footer-card-dot">·</span><span class="footer-card-route">阿披瓦中央站 ↔ 兰实</span></div>
            <div class="footer-card-arrow">›</div>
        </button>
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(105)" title="SRT 浅红线 (阿披瓦中央站 ↔ 大林江)" aria-label="SRT 浅红线" aria-hidden="true" tabindex="-1">
            <div class="footer-card-icon" style="background:rgba(248,113,113,0.15);border-color:rgba(248,113,113,0.35)">${getLineIconSvg(105, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">SRT 浅红线</span><span class="footer-card-royal-tag" style="color:#F87171;border:1px solid #F8717155;background:#F8717118;">那空威提</span><span class="footer-card-dot">·</span><span class="footer-card-route">阿披瓦 ↔ 大林江</span></div>
            <div class="footer-card-arrow">›</div>
        </button>
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(104)" title="ARL 机场快线 (帕亚泰 ↔ 素万那普)" aria-label="ARL 机场快线" aria-hidden="true" tabindex="-1">
            <div class="footer-card-icon" style="background:rgba(138,21,56,0.12);border-color:rgba(138,21,56,0.3)">${getLineIconSvg(104, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">ARL 机场快线</span><span class="footer-card-dot">·</span><span class="footer-card-route">帕亚泰 ↔ 素万那普</span></div>
            <div class="footer-card-arrow">›</div>
        </button>
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(201)" title="BRT 快捷公交 (沙吞 ↔ 拉差蓬)" aria-label="BRT 快捷公交" aria-hidden="true" tabindex="-1">
            <div class="footer-card-icon" style="background:rgba(130,195,65,0.12);border-color:rgba(130,195,65,0.3)">${getLineIconSvg(201, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">BRT 快捷公交</span><span class="footer-card-dot">·</span><span class="footer-card-route">沙吞 ↔ 拉差蓬</span></div>
            <div class="footer-card-arrow">›</div>
        </button>
        <button type="button" class="footer-line-card" onclick="App.jumpToLine(106)" title="MRT 橙线 (邦坤暖 ↔ 隆高岔路) (尚未开通)" aria-label="MRT 橙线 (尚未开通)" aria-hidden="true" tabindex="-1">
            <div class="footer-card-icon" style="background:rgba(245,130,32,0.12);border-color:rgba(245,130,32,0.3)">${getLineIconSvg(106, false, 20)}</div>
            <div class="footer-card-info"><span class="footer-card-name">MRT 橙线</span><span class="footer-card-royal-tag" style="color:#F58220;border:1px solid #F5822055;background:#F5822018;">尚未开通</span><span class="footer-card-dot">·</span><span class="footer-card-route">邦坤暖 ↔ 隆高岔路</span></div>
            <div class="footer-card-arrow">›</div>
        </button>
    </div>
</div>
<div class="footer-refresh-note">
    ${getUiIcon('refresh', 14, 'var(--sky)')} 实时数据 · 每 20 秒自动刷新 · 覆盖曼谷及周边全部 12 条轨道交通线
</div>
<div class="footer-disclaimer-note">
    非官方应用 — 为方便日常通勤打造，列车时刻遵循官方发车间隔，请预留充足以备换乘
</div>`,
                langBtn: 'ไทย',
                clockLocale: 'zh-CN',
                lines: { 1: '素坤逸', 2: '是隆', 3: '金线', 4: '黄线', 5: '粉红', 101: '蓝线', 102: '紫线', 103: '暗红', 105: '浅红', 104: '机场快线', 201: 'BRT', 106: '橙线 (尚未开通)' },
                timetableBadge: '时刻表',
                timetableSchedule: '查看官方发车频次表',
                mrtFreqTitle: '发车间隔频次',
                mrtFreqNow: f => `约每 ~${String(f || '').replace(/^~/, '')} 分钟一趟`,
                mrtFreqNote: '基于常规运行时刻表（非实时 GPS）',
                mrtWeekday: '工作日（周一至周五）',
                mrtWeekend: '周末 / 公共假期',
                mrtOutOfService: '非营运时段',
                mrtTimeRange: '时段',
                mrtFreqCol: '发车间隔',
                mrtSegmentNote: '* 07:00–09:00 时段本站位于 {seg} 区间',
                btsFreqHead: `${getUiIcon('train', 15, 'currentColor')} 发车间隔（常规时刻表）`,
                btsSegNote: '* 莫奇–三隆 · ** 三隆–凯哈 及 莫奇–库括',
                btsFreqUnit: '单位 分:秒',
                btsFreqEffective: '自 2026 年 1 月 1 日起生效',
                jTitle: '路线规划与查询',
                jHint: '起点 → 终点 · 耗时 + 票价',
                jFrom: '起点',
                jTo: '终点',
                jSelect: '轻触选择车站',
                jUseNearest: `${getUiIcon('pin', 14, 'currentColor')} 使用离我最近的车站`,
                jRoute: n => `方案 ${n}`,
                jRecommended: '推荐 / 最快',
                jCheapest: '最优惠',
                jMin: m => `${m} 分钟`,
                jStations: n => `${n} 个车站`,
                jTransfer: `${getUiIcon('walk', 14, 'currentColor')} 换乘`,
                jFareTypes: '票价分类',
                jStaticFare: '总票价',
                jLiveFare: 'BTS 票价',
                jMrtBlueFare: 'MRT 蓝线票价',
                jMrtPurpleFare: 'MRT 紫线票价',
                jSrtRedFare: 'SRT 红线票价',
                jArlFare: 'ARL 机场快线票价',
                jBrtFare: 'BRT 票价',
                jMrtOrangeFare: 'MRT 橙线票价',
                jMap: '查看路线图',
                jSameStation: '同站',
                jAlreadyAtStation: '已在目的地车站',
                jSameStationDesc: '起点站与终点站相同，无需乘车出行，无费用。',
                jFail: '未能找到路线，请重试',
                jSearching: '正在规划路线…',
                homeJourneyTitle: '行程规划与票价查询',
                homeJourneySub: '查询跨 12 条线路换乘、行程耗时与票价',
                homeJourneyBtn: '打开 ➔',
                navHome: '首页',
                navMap: '线路图',
                navPlanner: '规划',
                navExits: '出入口',
                navFares: '票价',
                navTimetables: '时刻表',
                faresTitle: '各线轨道交通票价一览',
                timetablesTitle: '各线列车时刻与发车频次',
                mapModeSchematic: '12 线线网图',
                mapModeHybrid: 'Google Maps 混合地图',
                mapMyLocation: '我的位置',
                mapBkkCenter: '曼谷',
                mapTitle: `${getUiIcon('map', 15, 'currentColor')} 12 线轨道交通全景图`,
                mapZoomIn: `${getUiIcon('zoomIn', 13, 'currentColor')} 放大`,
                mapZoomOut: `${getUiIcon('zoomOut', 13, 'currentColor')} 缩小`,
                mapReset: `${getUiIcon('resetZoom', 13, 'currentColor')} 复位`,
                mapLegendBtn: '图例',
                legTitle: '轨道交通线路图例 (Transit Lines)',
                legSukhumvit: '素坤逸线',
                legSilom: '是隆线',
                legGold: '金线',
                legBlue: '蓝线 (差隆拉差蒙坤)',
                legPurple: '紫线 (差隆拉差探)',
                legBrt: 'BRT 快捷公交',
                legPink: '粉红线 (威瓦那空)',
                legYellow: '黄线 (纳卡拉披帕)',
                legDarkRed: '暗红线 (塔尼拉塔雅)',
                legLightRed: '浅红线 (那空威提)',
                legArl: '机场快线 (ARL)',
                legOrange: '橙线 (尚未开通)',
                legInter: '换乘站 (Interchange)',
                legAirport: '机场接驳 (Airport)',
                legBoat: '码头轮渡换乘 (Boat/Pier)',
                legTrain: '长途火车换乘 (SRT)',
                legBus: '客运巴士站 (Bus)',
                legPark: '停车换乘 (Park & Ride)',
                legTap: '轻触车站设为起点或终点',
                mapHint: `<span class="map-hint-icon">${getUiIcon('bulb', 15, '#f59e0b')}</span><div class="map-hint-body"><span class="map-hint-phrase"><b>使用提示:</b> 点击线路图上的任意车站，</span> <span class="map-hint-phrase">即可设为 <b>起点站</b>、</span> <span class="map-hint-phrase"><b>终点站</b></span> <span class="map-hint-phrase">或直接查看 <b>出入口设施</b>。</span></div>`,
                sheetOrigin: '设为起点站',
                sheetOriginSub: '以此站为出发点规划路线',
                sheetDest: '设为终点站',
                sheetDestSub: '规划前往此站的换乘方案',
                sheetExits: '查看出入口与无障碍设施',
                sheetExitsSub: '1, 2, 3 号出口、空中连廊、轮椅无障碍电梯',
                sheetLive: '查看实时列车到站',
                sheetLiveSub: '来自站台的实时到站倒计时',
                plannerHubTitle: `${getUiIcon('star', 15, '#f59e0b')} <span>热门车站（快捷选择）</span> <span class="hub-toggle-chev" id="plannerHubChev">▲</span>`,
                exitCardTitle: `${getUiIcon('door', 15, 'currentColor')} 车站出入口与无障碍便利设施`,
                exitCardSub: '选择线路和车站，查询各出入口位置、空中连廊、直梯及周边地标',
                exitSearchPh: '搜索站名或车站编号，如 暹罗、CEN、诗丹...',
                popupTitle: '检测到您附近的车站',
                popupSub: '实时到站列车与站台信息',
                popupDist: '距您当前位置',
                popupPlatTitle: `${getUiIcon('train', 15, 'currentColor')} 站台与实时列车`,
                popupPlatSub: '即将进站 / 实时倒计时',
                popupAction: '查看车站详情与全部出入口',
                popupDismiss: '知道了',
                navMore: '更多',
                moreNotifTitle: '后台自动通知',
                moreNotifDesc: '接近车站时自动接收最近车站、下一班列车及实时倒计时提醒（在应用打开或后台最小化时）。',
                moreNotifActive: '已开启（后台地理围栏检测中）',
                moreNotifInactive: '已关闭（省电模式）',
                moreLangTitle: '语言',
                moreLangDesc: '选择系统显示语言',
                moreThemeTitle: '显示主题',
                moreThemeDesc: '根据喜好选择深色模式或浅色模式',
                themeDark: '深色模式',
                themeLight: '浅色模式',
                moreClockTitle: '时间格式',
                moreClockDesc: '选择顶部时钟的时间显示格式',
                moreClock24Lbl: '24 小时制',
                moreClock12Lbl: '12 小时制',
                moreDateTitle: '日期格式',
                moreDateDesc: '选择顶部时钟的日期显示格式与纪年系统',
                moreDateStyleLabel: '1. 排版格式:',
                dateStyleFullDayLbl: '星期+日/月/年',
                dateStyleSlashLbl: '日/月/年',
                dateStyleTextLbl: '日 月 年',
                dateStyleWeekdayLbl: '仅星期',
                moreDateEraLabel: '2. 纪年系统:',
                dateEraBeLbl: '佛历 (B.E.)',
                dateEraCeLbl: '公历 (C.E.)',
                moreVersionTitle: '应用信息',
                moreVersionUpToDate: '最新版本',
                moreVersionLabel: '版本',
                moreNetworkLabel: '轨道交通网络',
                moreGatewayLabel: '实时信号状态',
                moreGatewayValue: '<span class="live-status-line"><span class="live-dot-sm"></span> 100% 实时</span><span class="live-status-sub">已连接</span>',
                morePlatformLabel: '运行平台',
            }
        };

        function T(key, ...args) {
            const v = (I18N[lang] && I18N[lang][key]) ?? I18N.th[key] ?? key;
            return typeof v === 'function' ? v(...args) : v;
        }

        // ลบวงเล็บชื่อสายส่วนเกินออกจากชื่อสถานี เช่น (Gold Line), (สายสีทอง)
        function cleanStationName(name) {
            if (!name) return '';
            return String(name).replace(/\s*[\(\[]\s*(?:Gold\s*Line|สายสีทอง)\s*[\)\]]/gi, '').trim();
        }

        // ล้างชื่อสถานีส่วนเกินในโครงสร้างข้อมูลสถานีทั้งหมด และจัดลำดับสถานีสายแยก
        function sanitizeStationData(list) {
            if (!Array.isArray(list)) return list;
            for (const item of list) {
                if (item && item.StationList && Array.isArray(item.StationList)) {
                    // สายสีชมพู (LineId 5): จัดลำดับให้ MT01 และ MT02 ต่อจาก PK10 (เมืองทองธานี)
                    if (Number(item.LineId) === 5) {
                        const pk10Idx = item.StationList.findIndex(s => s && s.StationKey === 'PK10');
                        const mt01Idx = item.StationList.findIndex(s => s && s.StationKey === 'MT01');
                        const mt02Idx = item.StationList.findIndex(s => s && s.StationKey === 'MT02');
                        if (pk10Idx >= 0 && mt01Idx >= 0 && mt02Idx >= 0 && mt01Idx !== pk10Idx + 1) {
                            const mt01 = item.StationList[mt01Idx];
                            const mt02 = item.StationList[mt02Idx];
                            const remaining = item.StationList.filter(s => s && s.StationKey !== 'MT01' && s.StationKey !== 'MT02');
                            const newPk10Idx = remaining.findIndex(s => s && s.StationKey === 'PK10');
                            remaining.splice(newPk10Idx + 1, 0, mt01, mt02);
                            item.StationList = remaining;
                        }
                    }
                    sanitizeStationData(item.StationList);
                }
                if (item && item.StationNameTH) item.StationNameTH = cleanStationName(item.StationNameTH);
                if (item && item.StationNameEN) item.StationNameEN = cleanStationName(item.StationNameEN);
                if (item && item.StationName_TH) item.StationName_TH = cleanStationName(item.StationName_TH);
                if (item && item.StationName_EN) item.StationName_EN = cleanStationName(item.StationName_EN);
                if (item && item.StationName) {
                    const parts = String(item.StationName).split('|');
                    item.StationName = parts.map(p => cleanStationName(p)).join(' | ');
                }
            }
            return list;
        }

        /* ================= CHINESE LOCALIZATION DICTIONARIES ================= */
        const LINE_NAMES_ZH = {
            1: 'BTS 素坤逸线',
            2: 'BTS 是隆线',
            3: 'APM 金线',
            4: 'MRT 黄线',
            5: 'MRT 粉红线',
            101: 'MRT 蓝线',
            102: 'MRT 紫线',
            103: 'SRTET 暗红线',
            105: 'SRTET 浅红线',
            104: 'ARL 机场快线',
            201: 'BRT 快捷公交',
            106: 'MRT 橙线'
        };

        const DEST_NAMES_ZH = {
            'คูคต': '库括', 'Khu Khot': '库括',
            'เคหะฯ': '凯哈', 'เคหะสมุทรปราการ': '凯哈', 'Kheha': '凯哈',
            'สนามกีฬาแห่งชาติ': '国家体育场', 'National Stadium': '国家体育场',
            'บางหว้า': '挽哇', 'Bang Wa': '挽哇',
            'กรุงธนบุรี': '吞武里城', 'Krung Thon Buri': '吞武里城',
            'คลองสาน': '空讪', 'Khlong San': '空讪',
            'ท่าพระ': '塔帕', 'Tha Phra': '塔帕',
            'หลักสอง': '拉颂', 'Lak Song': '拉颂',
            'คลองบางไผ่': '空邦派', 'Khlong Bang Phai': '空邦派',
            'เตาปูน': '岛本', 'Tao Poon': '岛本',
            'ลาดพร้าว': '拉抛', 'Lat Phrao': '拉抛',
            'สำโรง': '三隆', 'Samrong': '三隆',
            'ศูนย์ราชการนนทบุรี': '暖武里政务中心', 'Nonthaburi Civic Center': '暖武里政务中心',
            'มีนบุรี': '民武里', 'Min Buri': '民武里',
            'กรุงเทพอภิวัฒน์': '阿披瓦中央站', 'Krung Thep Aphiwat': '阿披瓦中央站',
            'รังสิต': '兰实', 'Rangsit': '兰实',
            'ตลิ่งชัน': '大林江', 'Taling Chan': '大林江',
            'พญาไท': '帕亚泰', 'Phaya Thai': '帕亚泰',
            'สุวรรณภูมิ': '素万那普机场', 'Suvarnabhumi': '素万那普机场',
            'สาทร': '沙吞', 'Sathorn': '沙吞',
            'ราชพฤกษ์': '拉差蓬', 'Ratchapruek': '拉差蓬',
            'บางขุนนนท์': '邦坤暖', 'Bang Khun Non': '邦坤暖',
            'แยกร่มเกล้า': '隆高岔路', 'Yaek Rom Klao': '隆高岔路',
            'เมืองทองธานี': '通城', 'Muang Thong Thani': '通城',
            'ทะเลสาบเมืองทองธานี': '通城湖', 'Lake Muang Thong Thani': '通城湖',
            'สยาม': '暹罗', 'Siam': '暹罗',
            'หมอชิต': '莫奇', 'Mo Chit': '莫奇',
            'อโศก': '阿索克', 'Asok': '阿索克',
            'ศาลาแดง': '萨拉丹', 'Sala Daeng': '萨拉丹',
            'จตุจักร': '乍都节', 'Chatuchak': '乍都节',
            'บางซื่อ': '挽赐', 'Bang Sue': '挽赐'
        };

        const STATION_NAMES_ZH = {
            // Sukhumvit (N)
            'N1': '拉差贴威', 'N2': '帕亚泰', 'N3': '胜利纪念碑', 'N4': '沙南包', 'N5': '阿里',
            'N7': '水牛桥', 'N8': '莫奇', 'N9': '五峰拉抛', 'N10': '拍凤裕庭24', 'N11': '拉差裕庭',
            'N12': '瑟那尼空', 'N13': '农业大学', 'N14': '皇家森林厅', 'N15': '挽磨', 'N16': '第十一步兵团',
            'N17': '帕喜玛哈泰寺', 'N18': '拍凤裕庭59', 'N19': '塞育', 'N20': '新桥',
            'N21': '普密蓬阿杜德医院', 'N22': '空军博物馆', 'N23': '空军防空部队路口', 'N24': '库括',

            // Center
            'CEN': '暹罗',

            // Sukhumvit (E)
            'E1': '奇隆', 'E2': '奔集', 'E3': '那那', 'E4': '阿索克', 'E5': '澎蓬',
            'E6': '通罗', 'E7': '伊卡迈', 'E8': '帕卡农', 'E9': '安努', 'E10': '挽节',
            'E11': '布纳威提', 'E12': '乌东素', 'E13': '挽那', 'E14': '轴承', 'E15': '三隆',
            'E16': '普召', 'E17': '爱侣湾三象', 'E18': '海军学院', 'E19': '北榄',
            'E20': '诗纳卡琳', 'E21': '帕沙', 'E22': '塞洛', 'E23': '凯哈',

            // Silom (W, S)
            'W1': '国家体育场',
            'S1': '拉差丹利', 'S2': '萨拉丹', 'S3': '冲暖诗', 'S4': '圣路易斯', 'S5': '苏拉萨',
            'S6': '郑皇桥', 'S7': '吞武里城', 'S8': '大罗斗圈', 'S9': '颇尼米', 'S10': '达叻普',
            'S11': '乌塔卡', 'S12': '挽哇',

            // Gold Line (G)
            'G1': '吞武里城', 'G2': '乍能纳空', 'G3': '空讪',

            // Yellow Line (YL)
            'YL01': '拉抛', 'YL02': '帕瓦纳', 'YL03': '触猜四', 'YL04': '拉抛71', 'YL05': '拉抛83',
            'YL06': '玛哈泰', 'YL07': '拉抛101', 'YL08': '邦卡比', 'YL09': '兰沙里路口', 'YL10': '诗吉利塔',
            'YL11': '华玛', 'YL12': '卡兰丹', 'YL13': '诗努', 'YL14': '诗纳卡琳38', 'YL15': '皇九世公园',
            'YL16': '诗乌东', 'YL17': '诗艳', 'YL18': '诗拉萨', 'YL19': '诗培灵', 'YL20': '诗丹',
            'YL21': '诗贴帕', 'YL22': '提帕宛', 'YL23': '三隆',

            // Pink Line (PK & MT)
            'PK01': '暖武里政务中心', 'PK02': '佳莱', 'PK03': '萨南宾南', 'PK04': '萨玛基',
            'PK05': '皇家水利厅', 'PK06': '北革路口', 'PK07': '北革绕道', 'PK08': '畅瓦塔纳-北革28',
            'PK09': '通城', 'MT01': '挑战者展馆', 'MT02': '通城湖', 'PK10': '诗叻',
            'PK11': '畅瓦塔纳14', 'PK12': '政府综合办公区', 'PK13': '国家电信', 'PK14': '叻四',
            'PK15': '拍那空皇家大学', 'PK16': '帕喜玛哈泰寺', 'PK17': '兰茵他3', 'PK18': '拉巴考',
            'PK19': '兰茵他4公里', 'PK20': '迈雅拉', 'PK21': '瓦查拉蓬', 'PK22': '兰茵他6公里',
            'PK23': '库蓬', 'PK24': '兰茵他9公里', 'PK25': '外环路-兰茵他', 'PK26': '诺帕拉',
            'PK27': '邦灿', 'PK28': '瑟塔布班彭', 'PK29': '民武里市场', 'PK30': '民武里',

            // Blue Line (BL)
            'BL01': '塔帕', 'BL02': '查兰13', 'BL03': '发柴', 'BL04': '邦坤暖', 'BL05': '邦意堪',
            'BL06': '诗琳通', 'BL07': '邦帕', 'BL08': '邦奥', 'BL09': '邦坡', 'BL10': '岛本',
            'BL11': '挽赐', 'BL12': '甘烹碧', 'BL13': '乍都节公园', 'BL14': '拍凤裕庭', 'BL15': '拉抛',
            'BL16': '拉差达披色', 'BL17': '素铁讪', 'BL18': '辉煌', 'BL19': '泰国文化中心', 'BL20': '拉玛九',
            'BL21': '碧差汶里', 'BL22': '素坤逸', 'BL23': '诗丽吉王后国家会议中心', 'BL24': '孔堤',
            'BL25': '是乐园', 'BL26': '是隆', 'BL27': '山燕', 'BL28': '华喃峰', 'BL29': '龙莲寺',
            'BL30': '三峰', 'BL31': '沙南猜', 'BL32': '伊沙拉帕', 'BL33': '邦派', 'BL34': '挽哇',
            'BL35': '碧甲盛48', 'BL36': '帕西乍能', 'BL37': '邦开', 'BL38': '拉颂',

            // Purple Line (PP)
            'PP01': '空邦派', 'PP02': '邦艾市场', 'PP03': '邦艾三岔路', 'PP04': '邦普鲁',
            'PP05': '邦拉艾', 'PP06': '邦拉诺塔伊', 'PP07': '赛马', 'PP08': '帕喃告桥',
            'PP09': '暖武里第一路口', 'PP10': '邦卡索', 'PP11': '暖武里政务中心', 'PP12': '卫生部',
            'PP13': '迪威暖路口', 'PP14': '翁沙旺', 'PP15': '邦颂', 'PP16': '岛本',

            // SRT Dark Red (RN)
            'RN01': '阿披瓦中央站', 'RN02': '乍都节', 'RN03': '萨米安纳里寺', 'RN04': '邦肯',
            'RN05': '通颂鸿', 'RN06': '叻四', 'RN07': '房屋局', 'RN08': '廊曼机场',
            'RN09': '六里', 'RN10': '兰实',

            // SRT Light Red (RW)
            'RW01': '阿披瓦中央站', 'RW02': '邦颂', 'RW03': '邦班鲁', 'RW04': '大林江',

            // ARL (A)
            'A1': '素万那普机场', 'A2': '拉卡邦', 'A3': '班塔昌', 'A4': '华玛',
            'A5': '兰甘亨', 'A6': '玛卡森', 'A7': '拉差巴罗', 'A8': '帕亚泰',

            // BRT (B)
            'B1': '沙吞', 'B2': '房屋局大厦', 'B3': '曼谷技术大学', 'B4': '禅路', 'B5': '那拉拉玛三',
            'B6': '瓦丹寺', 'B7': '帕里瓦寺', 'B8': '朵迈寺', 'B9': '拉玛九桥', 'B10': '乍能叻',
            'B11': '拉玛三桥', 'B12': '拉差蓬',

            // Orange Line (OR)
            'OR01': '邦坤暖', 'OR02': '诗里拉吉', 'OR03': '皇家田', 'OR04': '民主纪念碑',
            'OR05': '兰銮', 'OR06': '攀发', 'OR07': '水门', 'OR08': '拉差巴罗',
            'OR09': '朗南', 'OR10': '丁登', 'OR11': '普拉差颂空', 'OR12': '泰国文化中心',
            'OR13': '地铁管理局', 'OR14': '拉玛九寺', 'OR15': '兰甘亨12', 'OR16': '兰甘亨大学',
            'OR17': '泰国体育局', 'OR18': '兰甘亨34', 'OR19': '兰沙里路口', 'OR20': '诗布拉帕',
            'OR21': '空班玛', 'OR22': '萨玛功', 'OR23': '诺姆告', 'OR24': '拉帕塔纳',
            'OR25': '民帕塔纳', 'OR26': '兰甘亨房屋局', 'OR27': '民武里', 'OR28': '隆高岔路'
        };

        // ชื่อสถานีตามภาษาที่เลือก (ZH / EN / TH)
        function stName(s) {
            if (!s) return '';
            const key = s.StationKey || '';
            const en = s.StationNameEN || s.StationName_EN || '';
            const th = s.StationNameTH || s.StationName_TH || s.StationName || '';
            if (lang === 'zh') {
                if (key && STATION_NAMES_ZH[key]) return STATION_NAMES_ZH[key];
                const cleanTh = cleanStationName(th);
                if (STATION_NAMES_ZH[cleanTh]) return STATION_NAMES_ZH[cleanTh];
                const cleanEn = cleanStationName(en);
                if (STATION_NAMES_ZH[cleanEn]) return STATION_NAMES_ZH[cleanEn];
                return cleanStationName(en || th);
            }
            const raw = lang === 'en' ? (en || th) : (th || en);
            return cleanStationName(raw);
        }

        // ข้อความจาก API รูปแบบ "เคหะฯ | Kheha" → เลือกฝั่งตามภาษา (ZH / EN / TH)
        function destName(raw) {
            const parts = String(raw || '').split('|').map(x => x.trim()).filter(Boolean);
            if (lang === 'zh') {
                const thPart = parts[0] || '';
                const enPart = parts[1] || '';
                return DEST_NAMES_ZH[thPart] || DEST_NAMES_ZH[enPart] || STATION_NAMES_ZH[thPart] || STATION_NAMES_ZH[enPart] || enPart || thPart;
            }
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
            },
            zh: {
                '暖武里政务中心': '暖武里政务',
                '阿披瓦中央站': '阿披瓦',
                '素万那普机场': '素万那普',
                '普密蓬阿杜德医院': '普密蓬医院',
                '空军博物馆': '空军博览馆',
                '皇家森林厅': '森林厅'
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
            // หาก URL เป็น local proxy ให้ใช้ timeout สั้นพิเศษ 1,800ms เพื่อ failover ไปยัง REMOTE_API ทันที ไม่รอค้าง
            const isLocalProxy = typeof url === 'string' && (
                (!url.startsWith('http://') && !url.startsWith('https://')) ||
                (!url.startsWith(REMOTE_API) && !url.startsWith(BACKUP_API) && (url.includes('localhost') || url.includes('127.0.0.1')))
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
                let res = await doFetch(url, effectiveTimeout);
                // หากต่อ local proxy ได้ 404, 502, 504 ให้ failover ไปยัง REMOTE_API ทันที
                if ((res.status === 404 || res.status === 502 || res.status === 504) && !url.startsWith(REMOTE_API)) {
                    switchPermanentlyToRemote();
                    const fallbackUrl = url.replace(/^(?:https?:\/\/[^\/]+)?\/api\/bts-proxy/, REMOTE_API);
                    if (fallbackUrl !== url) {
                        res = await doFetch(fallbackUrl, timeoutMs);
                    }
                }
                return res;
            } catch (err) {
                // หาก network ต่อ local proxy ไม่ได้ ให้ลอง REMOTE_API
                if (!url.startsWith(REMOTE_API)) {
                    switchPermanentlyToRemote();
                    const fallbackUrl = url.replace(/^(?:https?:\/\/[^\/]+)?\/api\/bts-proxy/, REMOTE_API);
                    if (fallbackUrl !== url) {
                        try {
                            const res = await doFetch(fallbackUrl, timeoutMs);
                            if (res.status === 200 && res.data?.ErrMessage === 'Success') return res;
                        } catch (e2) { /* ignore */ }
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

        const _inFlightArrivals = new Map();

        async function fetchArrivals(station) {
            if (!station) throw new Error('station required');
            const key = station.StationKey;
            if (_inFlightArrivals.has(key)) {
                return _inFlightArrivals.get(key);
            }
            const promise = (async () => {
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
            })();

            _inFlightArrivals.set(key, promise);
            try {
                return await promise;
            } finally {
                _inFlightArrivals.delete(key);
            }
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

                const FALLBACK_STATION_LIST = [{"LineId":1,"LineName_TH":"สายสุขุมวิท","LineName_EN":"Sukhumvit Line","LineColor":"#7AB420","StationList":[{"StationId":79,"StationName":"คูคต | Khu Khot","StationNameTH":"คูคต","StationNameEN":"Khu Khot","StationKey":"N24","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.93234,"Longitude":100.6466,"PinmapX":"3250","PinmapY":"249","IsCrowded":false,"Orderlist":24},{"StationId":78,"StationName":"แยก คปอ. | Yaek Kor Por Aor","StationNameTH":"แยก คปอ.","StationNameEN":"Yaek Kor Por Aor","StationKey":"N23","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.92498,"Longitude":100.6259,"PinmapX":"3068","PinmapY":"255","IsCrowded":false,"Orderlist":23},{"StationId":77,"StationName":"พิพิธภัณฑ์กองทัพอากาศ | Royal Thai Air Force Museum","StationNameTH":"พิพิธภัณฑ์กองทัพอากาศ","StationNameEN":"Royal Thai Air Force Museum","StationKey":"N22","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.91795,"Longitude":100.6217,"PinmapX":"2873","PinmapY":"341","IsCrowded":false,"Orderlist":22},{"StationId":76,"StationName":"โรงพยาบาลภูมิพลอดุลยเดช | Bhumibol Adulyadej Hospital","StationNameTH":"โรงพยาบาลภูมิพลอดุลยเดช","StationNameEN":"Bhumibol Adulyadej Hospital","StationKey":"N21","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.91072,"Longitude":100.6174,"PinmapX":"2792","PinmapY":"424","IsCrowded":false,"Orderlist":21},{"StationId":75,"StationName":"สะพานใหม่ | Saphan Mai","StationNameTH":"สะพานใหม่","StationNameEN":"Saphan Mai","StationKey":"N20","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.8966,"Longitude":100.6091,"PinmapX":"2714","PinmapY":"503","IsCrowded":false,"Orderlist":20},{"StationId":74,"StationName":"สายหยุด | Sai Yud","StationNameTH":"สายหยุด","StationNameEN":"Sai Yud","StationKey":"N19","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.88844,"Longitude":100.6043,"PinmapX":"2638","PinmapY":"584","IsCrowded":false,"Orderlist":19},{"StationId":73,"StationName":"พหลโยธิน 59 | Phahon Yothin 59","StationNameTH":"พหลโยธิน 59","StationNameEN":"Phahon Yothin 59","StationKey":"N18","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.88245,"Longitude":100.6008,"PinmapX":"2554","PinmapY":"663","IsCrowded":false,"Orderlist":18},{"StationId":69,"StationName":"วัดพระศรีมหาธาตุ | Wat Phra Sri Mahathat","StationNameTH":"วัดพระศรีมหาธาตุ","StationNameEN":"Wat Phra Sri Mahathat","StationKey":"N17","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.87529,"Longitude":100.5968,"PinmapX":"2463","PinmapY":"795","IsCrowded":false,"Orderlist":17},{"StationId":68,"StationName":"กรมทหารราบที่ 11 | 11th Infantry Regiment","StationNameTH":"กรมทหารราบที่ 11","StationNameEN":"11th Infantry Regiment","StationKey":"N16","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.86753,"Longitude":100.5919,"PinmapX":"2469","PinmapY":"917","IsCrowded":false,"Orderlist":16},{"StationId":67,"StationName":"บางบัว | Bang Bua","StationNameTH":"บางบัว","StationNameEN":"Bang Bua","StationKey":"N15","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.85599,"Longitude":100.5852,"PinmapX":"2461","PinmapY":"1043","IsCrowded":false,"Orderlist":15},{"StationId":66,"StationName":"กรมป่าไม้ | Royal Forest Department","StationNameTH":"กรมป่าไม้","StationNameEN":"Royal Forest Department","StationKey":"N14","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.85026,"Longitude":100.5818,"PinmapX":"2464","PinmapY":"1164","IsCrowded":false,"Orderlist":14},{"StationId":62,"StationName":"มหาวิทยาลัยเกษตรศาสตร์ | Kasetsart University","StationNameTH":"มหาวิทยาลัยเกษตรศาสตร์","StationNameEN":"Kasetsart University","StationKey":"N13","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.84207,"Longitude":100.577,"PinmapX":"2464","PinmapY":"1271","IsCrowded":false,"Orderlist":13},{"StationId":61,"StationName":"เสนานิคม | Sena Nikhom","StationNameTH":"เสนานิคม","StationNameEN":"Sena Nikhom","StationKey":"N12","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.83661,"Longitude":100.5738,"PinmapX":"2463","PinmapY":"1406","IsCrowded":false,"Orderlist":12},{"StationId":60,"StationName":"รัชโยธิน | Ratchayothin","StationNameTH":"รัชโยธิน","StationNameEN":"Ratchayothin","StationKey":"N11","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.82968,"Longitude":100.5697,"PinmapX":"2464","PinmapY":"1524","IsCrowded":false,"Orderlist":11},{"StationId":59,"StationName":"พหลโยธิน 24 | Phahon Yothin 24","StationNameTH":"พหลโยธิน 24","StationNameEN":"Phahon Yothin 24","StationKey":"N10","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.82385,"Longitude":100.5664,"PinmapX":"2469","PinmapY":"1646","IsCrowded":false,"Orderlist":10},{"StationId":54,"StationName":"ห้าแยกลาดพร้าว | Ha Yaek Lat Phrao","StationNameTH":"ห้าแยกลาดพร้าว","StationNameEN":"Ha Yaek Lat Phrao","StationKey":"N9","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.81723,"Longitude":100.5623,"PinmapX":"2464","PinmapY":"1791","IsCrowded":false,"Orderlist":9},{"StationId":1,"StationName":"หมอชิต | Mo Chit","StationNameTH":"หมอชิต","StationNameEN":"Mo Chit","StationKey":"N8","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.80265,"Longitude":100.5538,"PinmapX":"2468","PinmapY":"1930","IsCrowded":false,"Orderlist":8},{"StationId":2,"StationName":"สะพานควาย | Saphan Khwai","StationNameTH":"สะพานควาย","StationNameEN":"Saphan Khwai","StationKey":"N7","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.79383,"Longitude":100.5497,"PinmapX":"2461","PinmapY":"2032","IsCrowded":false,"Orderlist":7},{"StationId":3,"StationName":"อารีย์ | Ari","StationNameTH":"อารีย์","StationNameEN":"Ari","StationKey":"N5","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.77979,"Longitude":100.5447,"PinmapX":"2463","PinmapY":"2213","IsCrowded":true,"Orderlist":5},{"StationId":4,"StationName":"สนามเป้า | Sanam Pao","StationNameTH":"สนามเป้า","StationNameEN":"Sanam Pao","StationKey":"N4","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.77264,"Longitude":100.5421,"PinmapX":"2464","PinmapY":"2312","IsCrowded":true,"Orderlist":4},{"StationId":5,"StationName":"อนุสาวรีย์ชัยสมรภูมิ | Victory Monument","StationNameTH":"อนุสาวรีย์ชัยสมรภูมิ","StationNameEN":"Victory Monument","StationKey":"N3","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.76279,"Longitude":100.5371,"PinmapX":"2466","PinmapY":"2399","IsCrowded":false,"Orderlist":3},{"StationId":6,"StationName":"พญาไท | Phaya Thai","StationNameTH":"พญาไท","StationNameEN":"Phaya Thai","StationKey":"N2","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.75682,"Longitude":100.5338,"PinmapX":"2462","PinmapY":"2501","IsCrowded":false,"Orderlist":2},{"StationId":7,"StationName":"ราชเทวี | Ratchathewi","StationNameTH":"ราชเทวี","StationNameEN":"Ratchathewi","StationKey":"N1","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.75193,"Longitude":100.5315,"PinmapX":"2465","PinmapY":"2693","IsCrowded":false,"Orderlist":1},{"StationId":8,"StationName":"สยาม | Siam","StationNameTH":"สยาม","StationNameEN":"Siam","StationKey":"CEN","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.74556,"Longitude":100.5346,"PinmapX":"2506","PinmapY":"2878","IsCrowded":true,"Orderlist":0},{"StationId":9,"StationName":"ชิดลม | Chit Lom","StationNameTH":"ชิดลม","StationNameEN":"Chit Lom","StationKey":"E1","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.74409,"Longitude":100.543,"PinmapX":"2647","PinmapY":"2866","IsCrowded":false,"Orderlist":1},{"StationId":10,"StationName":"เพลินจิต | Phloen Chit","StationNameTH":"เพลินจิต","StationNameEN":"Phloen Chit","StationKey":"E2","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.74306,"Longitude":100.5488,"PinmapX":"2784","PinmapY":"2870","IsCrowded":false,"Orderlist":2},{"StationId":11,"StationName":"นานา | Nana","StationNameTH":"นานา","StationNameEN":"Nana","StationKey":"E3","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.74051,"Longitude":100.5554,"PinmapX":"2926","PinmapY":"2866","IsCrowded":false,"Orderlist":3},{"StationId":12,"StationName":"อโศก | Asok","StationNameTH":"อโศก","StationNameEN":"Asok","StationKey":"E4","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.737,"Longitude":100.5604,"PinmapX":"3067","PinmapY":"2869","IsCrowded":false,"Orderlist":4},{"StationId":13,"StationName":"พร้อมพงษ์ | Phrom Phong","StationNameTH":"พร้อมพงษ์","StationNameEN":"Phrom Phong","StationKey":"E5","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.73043,"Longitude":100.5697,"PinmapX":"3193","PinmapY":"2868","IsCrowded":false,"Orderlist":5},{"StationId":14,"StationName":"ทองหล่อ | Thong Lo","StationNameTH":"ทองหล่อ","StationNameEN":"Thong Lo","StationKey":"E6","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.72424,"Longitude":100.5785,"PinmapX":"3308","PinmapY":"2935","IsCrowded":false,"Orderlist":6},{"StationId":15,"StationName":"เอกมัย | Ekkamai","StationNameTH":"เอกมัย","StationNameEN":"Ekkamai","StationKey":"E7","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.71944,"Longitude":100.5853,"PinmapX":"3388","PinmapY":"3019","IsCrowded":false,"Orderlist":7},{"StationId":16,"StationName":"พระโขนง | Phra Khanong","StationNameTH":"พระโขนง","StationNameEN":"Phra Khanong","StationKey":"E8","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.71518,"Longitude":100.5913,"PinmapX":"3472","PinmapY":"3095","IsCrowded":false,"Orderlist":8},{"StationId":17,"StationName":"อ่อนนุช | On Nut","StationNameTH":"อ่อนนุช","StationNameEN":"On Nut","StationKey":"E9","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.70555,"Longitude":100.6011,"PinmapX":"3554","PinmapY":"3179","IsCrowded":false,"Orderlist":9},{"StationId":18,"StationName":"บางจาก | Bang Chak","StationNameTH":"บางจาก","StationNameEN":"Bang Chak","StationKey":"E10","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.69655,"Longitude":100.6055,"PinmapX":"3636","PinmapY":"3262","IsCrowded":false,"Orderlist":10},{"StationId":19,"StationName":"ปุณณวิถี | Punnawithi","StationNameTH":"ปุณณวิถี","StationNameEN":"Punnawithi","StationKey":"E11","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.6893,"Longitude":100.609,"PinmapX":"3677","PinmapY":"3363","IsCrowded":false,"Orderlist":11},{"StationId":20,"StationName":"อุดมสุข | Udom Suk","StationNameTH":"อุดมสุข","StationNameEN":"Udom Suk","StationKey":"E12","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.67993,"Longitude":100.6096,"PinmapX":"3675","PinmapY":"3483","IsCrowded":false,"Orderlist":12},{"StationId":21,"StationName":"บางนา | Bang Na","StationNameTH":"บางนา","StationNameEN":"Bang Na","StationKey":"E13","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.66812,"Longitude":100.6046,"PinmapX":"3675","PinmapY":"3603","IsCrowded":false,"Orderlist":13},{"StationId":22,"StationName":"แบริ่ง | Bearing","StationNameTH":"แบริ่ง","StationNameEN":"Bearing","StationKey":"E14","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.66117,"Longitude":100.6019,"PinmapX":"3676","PinmapY":"3730","IsCrowded":false,"Orderlist":14},{"StationId":23,"StationName":"สำโรง | Samrong","StationNameTH":"สำโรง","StationNameEN":"Samrong","StationKey":"E15","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.64619,"Longitude":100.5957,"PinmapX":"3679","PinmapY":"3850","IsCrowded":false,"Orderlist":15},{"StationId":46,"StationName":"ปู่เจ้า | Pu Chao","StationNameTH":"ปู่เจ้า","StationNameEN":"Pu Chao","StationKey":"E16","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.63725,"Longitude":100.592,"PinmapX":"3679","PinmapY":"3965","IsCrowded":false,"Orderlist":16},{"StationId":47,"StationName":"ช้างเอราวัณ | Chang Erawan","StationNameTH":"ช้างเอราวัณ","StationNameEN":"Chang Erawan","StationKey":"E17","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.62145,"Longitude":100.5901,"PinmapX":"3675","PinmapY":"4080","IsCrowded":false,"Orderlist":17},{"StationId":48,"StationName":"โรงเรียนนายเรือ | Royal Thai Naval Academy","StationNameTH":"โรงเรียนนายเรือ","StationNameEN":"Royal Thai Naval Academy","StationKey":"E18","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.60855,"Longitude":100.5948,"PinmapX":"3676","PinmapY":"4195","IsCrowded":false,"Orderlist":18},{"StationId":49,"StationName":"ปากน้ำ | Pak Nam","StationNameTH":"ปากน้ำ","StationNameEN":"Pak Nam","StationKey":"E19","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.60207,"Longitude":100.5971,"PinmapX":"3674","PinmapY":"4312","IsCrowded":false,"Orderlist":19},{"StationId":50,"StationName":"ศรีนครินทร์ | Srinagarindra","StationNameTH":"ศรีนครินทร์","StationNameEN":"Srinagarindra","StationKey":"E20","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.59208,"Longitude":100.6089,"PinmapX":"3676","PinmapY":"4426","IsCrowded":false,"Orderlist":20},{"StationId":51,"StationName":"แพรกษา | Phraek Sa","StationNameTH":"แพรกษา","StationNameEN":"Phraek Sa","StationKey":"E21","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.58432,"Longitude":100.608,"PinmapX":"3674","PinmapY":"4541","IsCrowded":false,"Orderlist":21},{"StationId":52,"StationName":"สายลวด | Sai Luat","StationNameTH":"สายลวด","StationNameEN":"Sai Luat","StationKey":"E22","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.57778,"Longitude":100.6054,"PinmapX":"3674","PinmapY":"4655","IsCrowded":false,"Orderlist":22},{"StationId":53,"StationName":"เคหะฯ | Kheha","StationNameTH":"เคหะฯ","StationNameEN":"Kheha","StationKey":"E23","StationLineId":1,"StationLineName":"สายสุขุมวิท | Sukhumvit Line","LineNameTH":"สายสุขุมวิท","LineNameEN":"Sukhumvit Line","StationLineColor":"#7AB420","Latitude":13.56765,"Longitude":100.6077,"PinmapX":"3790","PinmapY":"4771","IsCrowded":false,"Orderlist":23}]},{"LineId":2,"LineName_TH":"สายสีลม","LineName_EN":"Silom Line","LineColor":"#00807D","StationList":[{"StationId":26,"StationName":"สนามกีฬาแห่งชาติ | National Stadium","StationNameTH":"สนามกีฬาแห่งชาติ","StationNameEN":"National Stadium","StationKey":"W1","StationLineId":2,"StationLineName":"สายสีลม | Silom Line","LineNameTH":"สายสีลม","LineNameEN":"Silom Line","StationLineColor":"#00807D","Latitude":13.74649,"Longitude":100.5294,"PinmapX":"2317","PinmapY":"2886","IsCrowded":false,"Orderlist":1},{"StationId":27,"StationName":"สยาม | Siam","StationNameTH":"สยาม","StationNameEN":"Siam","StationKey":"CEN","StationLineId":2,"StationLineName":"สายสีลม | Silom Line","LineNameTH":"สายสีลม","LineNameEN":"Silom Line","StationLineColor":"#00807D","Latitude":13.74552,"Longitude":100.5346,"PinmapX":"","PinmapY":"","IsCrowded":false,"Orderlist":0},{"StationId":28,"StationName":"ราชดำริ | Ratchadamri","StationNameTH":"ราชดำริ","StationNameEN":"Ratchadamri","StationKey":"S1","StationLineId":2,"StationLineName":"สายสีลม | Silom Line","LineNameTH":"สายสีลม","LineNameEN":"Silom Line","StationLineColor":"#00807D","Latitude":13.73947,"Longitude":100.5395,"PinmapX":"2545","PinmapY":"3007","IsCrowded":false,"Orderlist":1},{"StationId":29,"StationName":"ศาลาแดง | Sala Daeng","StationNameTH":"ศาลาแดง","StationNameEN":"Sala Daeng","StationKey":"S2","StationLineId":2,"StationLineName":"สายสีลม | Silom Line","LineNameTH":"สายสีลม","LineNameEN":"Silom Line","StationLineColor":"#00807D","Latitude":13.72855,"Longitude":100.5343,"PinmapX":"2547","PinmapY":"3127","IsCrowded":false,"Orderlist":2},{"StationId":30,"StationName":"ช่องนนทรี | Chong Nonsi","StationNameTH":"ช่องนนทรี","StationNameEN":"Chong Nonsi","StationKey":"S3","StationLineId":2,"StationLineName":"สายสีลม | Silom Line","LineNameTH":"สายสีลม","LineNameEN":"Silom Line","StationLineColor":"#00807D","Latitude":13.72373,"Longitude":100.5294,"PinmapX":"2544","PinmapY":"3294","IsCrowded":false,"Orderlist":3},{"StationId":80,"StationName":"เซนต์หลุยส์ | Saint Louis","StationNameTH":"เซนต์หลุยส์","StationNameEN":"Saint Louis","StationKey":"S4","StationLineId":2,"StationLineName":"สายสีลม | Silom Line","LineNameTH":"สายสีลม","LineNameEN":"Silom Line","StationLineColor":"#00807D","Latitude":13.72107,"Longitude":100.527,"PinmapX":"2522","PinmapY":"3443","IsCrowded":false,"Orderlist":4},{"StationId":31,"StationName":"สุรศักดิ์ | Surasak","StationNameTH":"สุรศักดิ์","StationNameEN":"Surasak","StationKey":"S5","StationLineId":2,"StationLineName":"สายสีลม | Silom Line","LineNameTH":"สายสีลม","LineNameEN":"Silom Line","StationLineColor":"#00807D","Latitude":13.71931,"Longitude":100.5216,"PinmapX":"2447","PinmapY":"3510","IsCrowded":false,"Orderlist":5},{"StationId":32,"StationName":"สะพานตากสิน | Saphan Taksin","StationNameTH":"สะพานตากสิน","StationNameEN":"Saphan Taksin","StationKey":"S6","StationLineId":2,"StationLineName":"สายสีลม | Silom Line","LineNameTH":"สายสีลม","LineNameEN":"Silom Line","StationLineColor":"#00807D","Latitude":13.7188,"Longitude":100.5141,"PinmapX":"2384","PinmapY":"3578","IsCrowded":false,"Orderlist":6},{"StationId":33,"StationName":"กรุงธนบุรี | Krung Thon Buri","StationNameTH":"กรุงธนบุรี","StationNameEN":"Krung Thon Buri","StationKey":"S7","StationLineId":2,"StationLineName":"สายสีลม | Silom Line","LineNameTH":"สายสีลม","LineNameEN":"Silom Line","StationLineColor":"#00807D","Latitude":13.72088,"Longitude":100.5028,"PinmapX":"2190","PinmapY":"3651","IsCrowded":false,"Orderlist":7},{"StationId":34,"StationName":"วงเวียนใหญ่ | Wongwian Yai","StationNameTH":"วงเวียนใหญ่","StationNameEN":"Wongwian Yai","StationKey":"S8","StationLineId":2,"StationLineName":"สายสีลม | Silom Line","LineNameTH":"สายสีลม","LineNameEN":"Silom Line","StationLineColor":"#00807D","Latitude":13.72115,"Longitude":100.4953,"PinmapX":"1966","PinmapY":"3646","IsCrowded":false,"Orderlist":8},{"StationId":35,"StationName":"โพธิ์นิมิตร | Pho Nimit","StationNameTH":"โพธิ์นิมิตร","StationNameEN":"Pho Nimit","StationKey":"S9","StationLineId":2,"StationLineName":"สายสีลม | Silom Line","LineNameTH":"สายสีลม","LineNameEN":"Silom Line","StationLineColor":"#00807D","Latitude":13.71922,"Longitude":100.4859,"PinmapX":"1744","PinmapY":"3649","IsCrowded":false,"Orderlist":9},{"StationId":36,"StationName":"ตลาดพลู | Talat Phlu","StationNameTH":"ตลาดพลู","StationNameEN":"Talat Phlu","StationKey":"S10","StationLineId":2,"StationLineName":"สายสีลม | Silom Line","LineNameTH":"สายสีลม","LineNameEN":"Silom Line","StationLineColor":"#00807D","Latitude":13.71422,"Longitude":100.4767,"PinmapX":"1519","PinmapY":"3647","IsCrowded":false,"Orderlist":10},{"StationId":37,"StationName":"วุฒากาศ | Wutthakat","StationNameTH":"วุฒากาศ","StationNameEN":"Wutthakat","StationKey":"S11","StationLineId":2,"StationLineName":"สายสีลม | Silom Line","LineNameTH":"สายสีลม","LineNameEN":"Silom Line","StationLineColor":"#00807D","Latitude":13.71297,"Longitude":100.4689,"PinmapX":"1279","PinmapY":"3537","IsCrowded":false,"Orderlist":11},{"StationId":38,"StationName":"บางหว้า | Bang Wa","StationNameTH":"บางหว้า","StationNameEN":"Bang Wa","StationKey":"S12","StationLineId":2,"StationLineName":"สายสีลม | Silom Line","LineNameTH":"สายสีลม","LineNameEN":"Silom Line","StationLineColor":"#00807D","Latitude":13.7207,"Longitude":100.4578,"PinmapX":"1100","PinmapY":"3358","IsCrowded":false,"Orderlist":12}]},{"LineId":3,"LineName_TH":"สายสีทอง","LineName_EN":"Gold Line","LineColor":"#a88b34","StationList":[{"StationId":70,"StationName":"กรุงธนบุรี | Krung Thon Buri","StationNameTH":"กรุงธนบุรี","StationNameEN":"Krung Thon Buri","StationKey":"G1","StationLineId":3,"StationLineName":"สายสีทอง | Gold Line","LineNameTH":"สายสีทอง","LineNameEN":"Gold Line","StationLineColor":"#a88b34","Latitude":13.72127,"Longitude":100.5037,"PinmapX":"2188","PinmapY":"3582","IsCrowded":false,"Orderlist":1},{"StationId":71,"StationName":"เจริญนคร | Charoen Nakhon","StationNameTH":"เจริญนคร","StationNameEN":"Charoen Nakhon","StationKey":"G2","StationLineId":3,"StationLineName":"สายสีทอง | Gold Line","LineNameTH":"สายสีทอง","LineNameEN":"Gold Line","StationLineColor":"#a88b34","Latitude":13.72783,"Longitude":100.5093,"PinmapX":"2121","PinmapY":"3459","IsCrowded":false,"Orderlist":2},{"StationId":72,"StationName":"คลองสาน | Khlong San","StationNameTH":"คลองสาน","StationNameEN":"Khlong San","StationKey":"G3","StationLineId":3,"StationLineName":"สายสีทอง | Gold Line","LineNameTH":"สายสีทอง","LineNameEN":"Gold Line","StationLineColor":"#a88b34","Latitude":13.7317,"Longitude":100.5078,"PinmapX":"1991","PinmapY":"3385","IsCrowded":false,"Orderlist":3}]},{"LineId":4,"LineName_TH":"สายสีเหลือง","LineName_EN":"Yellow Line","LineColor":"#FAD53D","StationList":[{"StationId":81,"StationName":"ลาดพร้าว | Lat Phrao","StationNameTH":"ลาดพร้าว","StationNameEN":"Lat Phrao","StationKey":"YL01","StationLineId":4,"StationLineName":"สายสีเหลือง | Yellow Line","LineNameTH":"สายสีเหลือง","LineNameEN":"Yellow Line","StationLineColor":"#FAD53D","Latitude":13.80701,"Longitude":100.5749,"PinmapX":"2695","PinmapY":"1745","IsCrowded":false,"Orderlist":1},{"StationId":82,"StationName":"ภาวนา | Phawana","StationNameTH":"ภาวนา","StationNameEN":"Phawana","StationKey":"YL02","StationLineId":4,"StationLineName":"สายสีเหลือง | Yellow Line","LineNameTH":"สายสีเหลือง","LineNameEN":"Yellow Line","StationLineColor":"#FAD53D","Latitude":13.80016,"Longitude":100.5842,"PinmapX":"2876","PinmapY":"1742","IsCrowded":false,"Orderlist":2},{"StationId":83,"StationName":"โชคชัย 4 | Chok Chai 4","StationNameTH":"โชคชัย 4","StationNameEN":"Chok Chai 4","StationKey":"YL03","StationLineId":4,"StationLineName":"สายสีเหลือง | Yellow Line","LineNameTH":"สายสีเหลือง","LineNameEN":"Yellow Line","StationLineColor":"#FAD53D","Latitude":13.79442,"Longitude":100.5945,"PinmapX":"3079","PinmapY":"1741","IsCrowded":false,"Orderlist":3},{"StationId":84,"StationName":"ลาดพร้าว 71 | Lat Phrao 71","StationNameTH":"ลาดพร้าว 71","StationNameEN":"Lat Phrao 71","StationKey":"YL04","StationLineId":4,"StationLineName":"สายสีเหลือง | Yellow Line","LineNameTH":"สายสีเหลือง","LineNameEN":"Yellow Line","StationLineColor":"#FAD53D","Latitude":13.78708,"Longitude":100.6076,"PinmapX":"3276","PinmapY":"1744","IsCrowded":false,"Orderlist":4},{"StationId":85,"StationName":"ลาดพร้าว 83 | Lat Phrao 83","StationNameTH":"ลาดพร้าว 83","StationNameEN":"Lat Phrao 83","StationKey":"YL05","StationLineId":4,"StationLineName":"สายสีเหลือง | Yellow Line","LineNameTH":"สายสีเหลือง","LineNameEN":"Yellow Line","StationLineColor":"#FAD53D","Latitude":13.78367,"Longitude":100.6137,"PinmapX":"3480","PinmapY":"1744","IsCrowded":false,"Orderlist":5},{"StationId":87,"StationName":"มหาดไทย | Mahat Thai","StationNameTH":"มหาดไทย","StationNameEN":"Mahat Thai","StationKey":"YL06","StationLineId":4,"StationLineName":"สายสีเหลือง | Yellow Line","LineNameTH":"สายสีเหลือง","LineNameEN":"Yellow Line","StationLineColor":"#FAD53D","Latitude":13.77833,"Longitude":100.6233,"PinmapX":"3638","PinmapY":"1784","IsCrowded":false,"Orderlist":6},{"StationId":86,"StationName":"ลาดพร้าว 101 | Lat Phrao 101","StationNameTH":"ลาดพร้าว 101","StationNameEN":"Lat Phrao 101","StationKey":"YL07","StationLineId":4,"StationLineName":"สายสีเหลือง | Yellow Line","LineNameTH":"สายสีเหลือง","LineNameEN":"Yellow Line","StationLineColor":"#FAD53D","Latitude":13.77461,"Longitude":100.6299,"PinmapX":"3757","PinmapY":"1900","IsCrowded":false,"Orderlist":7},{"StationId":88,"StationName":"บางกะปิ | Bang Kapi","StationNameTH":"บางกะปิ","StationNameEN":"Bang Kapi","StationKey":"YL08","StationLineId":4,"StationLineName":"สายสีเหลือง | Yellow Line","LineNameTH":"สายสีเหลือง","LineNameEN":"Yellow Line","StationLineColor":"#FAD53D","Latitude":13.76906,"Longitude":100.6398,"PinmapX":"3876","PinmapY":"2014","IsCrowded":false,"Orderlist":8},{"StationId":89,"StationName":"แยกลำสาลี | Yaek Lam Sali","StationNameTH":"แยกลำสาลี","StationNameEN":"Yaek Lam Sali","StationKey":"YL09","StationLineId":4,"StationLineName":"สายสีเหลือง | Yellow Line","LineNameTH":"สายสีเหลือง","LineNameEN":"Yellow Line","StationLineColor":"#FAD53D","Latitude":13.76173,"Longitude":100.6455,"PinmapX":"3992","PinmapY":"2131","IsCrowded":false,"Orderlist":9},{"StationId":90,"StationName":"ศรีกรีฑา | Si Kritha","StationNameTH":"ศรีกรีฑา","StationNameEN":"Si Kritha","StationKey":"YL10","StationLineId":4,"StationLineName":"สายสีเหลือง | Yellow Line","LineNameTH":"สายสีเหลือง","LineNameEN":"Yellow Line","StationLineColor":"#FAD53D","Latitude":13.75037,"Longitude":100.6448,"PinmapX":"4105","PinmapY":"2298","IsCrowded":false,"Orderlist":10},{"StationId":91,"StationName":"หัวหมาก | Hua Mak","StationNameTH":"หัวหมาก","StationNameEN":"Hua Mak","StationKey":"YL11","StationLineId":4,"StationLineName":"สายสีเหลือง | Yellow Line","LineNameTH":"สายสีเหลือง","LineNameEN":"Yellow Line","StationLineColor":"#FAD53D","Latitude":13.73605,"Longitude":100.6411,"PinmapX":"4106","PinmapY":"2559","IsCrowded":false,"Orderlist":11},{"StationId":92,"StationName":"กลันตัน | Kalantan","StationNameTH":"กลันตัน","StationNameEN":"Kalantan","StationKey":"YL12","StationLineId":4,"StationLineName":"สายสีเหลือง | Yellow Line","LineNameTH":"สายสีเหลือง","LineNameEN":"Yellow Line","StationLineColor":"#FAD53D","Latitude":13.72531,"Longitude":100.6418,"PinmapX":"4103","PinmapY":"2692","IsCrowded":false,"Orderlist":12},{"StationId":93,"StationName":"ศรีนุช | Si Nut","StationNameTH":"ศรีนุช","StationNameEN":"Si Nut","StationKey":"YL13","StationLineId":4,"StationLineName":"สายสีเหลือง | Yellow Line","LineNameTH":"สายสีเหลือง","LineNameEN":"Yellow Line","StationLineColor":"#FAD53D","Latitude":13.71101,"Longitude":100.6442,"PinmapX":"4104","PinmapY":"2824","IsCrowded":false,"Orderlist":13},{"StationId":94,"StationName":"ศรีนครินทร์ 38 | Srinagarindra 38","StationNameTH":"ศรีนครินทร์ 38","StationNameEN":"Srinagarindra 38","StationKey":"YL14","StationLineId":4,"StationLineName":"สายสีเหลือง | Yellow Line","LineNameTH":"สายสีเหลือง","LineNameEN":"Yellow Line","StationLineColor":"#FAD53D","Latitude":13.701,"Longitude":100.6465,"PinmapX":"4101","PinmapY":"2959","IsCrowded":false,"Orderlist":14},{"StationId":95,"StationName":"สวนหลวง ร.9 | Suan Luang Rama IX","StationNameTH":"สวนหลวง ร.9","StationNameEN":"Suan Luang Rama IX","StationKey":"YL15","StationLineId":4,"StationLineName":"สายสีเหลือง | Yellow Line","LineNameTH":"สายสีเหลือง","LineNameEN":"Yellow Line","StationLineColor":"#FAD53D","Latitude":13.69073,"Longitude":100.6471,"PinmapX":"4103","PinmapY":"3092","IsCrowded":false,"Orderlist":15},{"StationId":96,"StationName":"ศรีอุดม | Si Udom","StationNameTH":"ศรีอุดม","StationNameEN":"Si Udom","StationKey":"YL16","StationLineId":4,"StationLineName":"สายสีเหลือง | Yellow Line","LineNameTH":"สายสีเหลือง","LineNameEN":"Yellow Line","StationLineColor":"#FAD53D","Latitude":13.67659,"Longitude":100.6462,"PinmapX":"4104","PinmapY":"3225","IsCrowded":false,"Orderlist":16},{"StationId":97,"StationName":"ศรีเอี่ยม | Si lam","StationNameTH":"ศรีเอี่ยม","StationNameEN":"Si lam","StationKey":"YL17","StationLineId":4,"StationLineName":"สายสีเหลือง | Yellow Line","LineNameTH":"สายสีเหลือง","LineNameEN":"Yellow Line","StationLineColor":"#FAD53D","Latitude":13.66769,"Longitude":100.6451,"PinmapX":"4104","PinmapY":"3361","IsCrowded":false,"Orderlist":17},{"StationId":98,"StationName":"ศรีลาซาล | Si La Salle","StationNameTH":"ศรีลาซาล","StationNameEN":"Si La Salle","StationKey":"YL18","StationLineId":4,"StationLineName":"สายสีเหลือง | Yellow Line","LineNameTH":"สายสีเหลือง","LineNameEN":"Yellow Line","StationLineColor":"#FAD53D","Latitude":13.65502,"Longitude":100.6421,"PinmapX":"4103","PinmapY":"3492","IsCrowded":false,"Orderlist":18},{"StationId":99,"StationName":"ศรีแบริ่ง | Si Bearing","StationNameTH":"ศรีแบริ่ง","StationNameEN":"Si Bearing","StationKey":"YL19","StationLineId":4,"StationLineName":"สายสีเหลือง | Yellow Line","LineNameTH":"สายสีเหลือง","LineNameEN":"Yellow Line","StationLineColor":"#FAD53D","Latitude":13.64346,"Longitude":100.6362,"PinmapX":"4104","PinmapY":"3626","IsCrowded":false,"Orderlist":19},{"StationId":100,"StationName":"ศรีด่าน | Si Dan","StationNameTH":"ศรีด่าน","StationNameEN":"Si Dan","StationKey":"YL20","StationLineId":4,"StationLineName":"สายสีเหลือง | Yellow Line","LineNameTH":"สายสีเหลือง","LineNameEN":"Yellow Line","StationLineColor":"#FAD53D","Latitude":13.63313,"Longitude":100.6301,"PinmapX":"4101","PinmapY":"3759","IsCrowded":false,"Orderlist":20},{"StationId":101,"StationName":"ศรีเทพา | Si Thepha","StationNameTH":"ศรีเทพา","StationNameEN":"Si Thepha","StationKey":"YL21","StationLineId":4,"StationLineName":"สายสีเหลือง | Yellow Line","LineNameTH":"สายสีเหลือง","LineNameEN":"Yellow Line","StationLineColor":"#FAD53D","Latitude":13.62997,"Longitude":100.6227,"PinmapX":"3982","PinmapY":"3847","IsCrowded":false,"Orderlist":21},{"StationId":102,"StationName":"ทิพวัล | Thipphawan","StationNameTH":"ทิพวัล","StationNameEN":"Thipphawan","StationKey":"YL22","StationLineId":4,"StationLineName":"สายสีเหลือง | Yellow Line","LineNameTH":"สายสีเหลือง","LineNameEN":"Yellow Line","StationLineColor":"#FAD53D","Latitude":13.63679,"Longitude":100.6099,"PinmapX":"3863","PinmapY":"3850","IsCrowded":false,"Orderlist":22},{"StationId":103,"StationName":"สำโรง | Samrong","StationNameTH":"สำโรง","StationNameEN":"Samrong","StationKey":"YL23","StationLineId":4,"StationLineName":"สายสีเหลือง | Yellow Line","LineNameTH":"สายสีเหลือง","LineNameEN":"Yellow Line","StationLineColor":"#FAD53D","Latitude":13.64506,"Longitude":100.5966,"PinmapX":"3743","PinmapY":"3850","IsCrowded":false,"Orderlist":23}]},{"LineId":5,"LineName_TH":"สายสีชมพู","LineName_EN":"Pink Line","LineColor":"#D76886","StationList":[{"StationId":134,"StationName":"ศูนย์ราชการนนทบุรี | Nonthaburi Civic Center","StationNameTH":"ศูนย์ราชการนนทบุรี","StationNameEN":"Nonthaburi Civic Center","StationKey":"PK01","StationLineId":5,"StationLineName":"สายสีชมพู | Pink Line","LineNameTH":"สายสีชมพู","LineNameEN":"Pink Line","StationLineColor":"#D76886","Latitude":13.85967,"Longitude":100.5182,"PinmapX":"1345","PinmapY":"1277","IsCrowded":false,"Orderlist":1},{"StationId":135,"StationName":"แคราย | Khae Rai","StationNameTH":"แคราย","StationNameEN":"Khae Rai","StationKey":"PK02","StationLineId":5,"StationLineName":"สายสีชมพู | Pink Line","LineNameTH":"สายสีชมพู","LineNameEN":"Pink Line","StationLineColor":"#D76886","Latitude":13.86271,"Longitude":100.5206,"PinmapX":"1266","PinmapY":"1212","IsCrowded":false,"Orderlist":2},{"StationId":136,"StationName":"สนามบินน้ำ | Sanambin Nam","StationNameTH":"สนามบินน้ำ","StationNameEN":"Sanambin Nam","StationKey":"PK03","StationLineId":5,"StationLineName":"สายสีชมพู | Pink Line","LineNameTH":"สายสีชมพู","LineNameEN":"Pink Line","StationLineColor":"#D76886","Latitude":13.8742,"Longitude":100.5163,"PinmapX":"1179","PinmapY":"1127","IsCrowded":false,"Orderlist":3},{"StationId":137,"StationName":"สามัคคี | Samakkhi","StationNameTH":"สามัคคี","StationNameEN":"Samakkhi","StationKey":"PK04","StationLineId":5,"StationLineName":"สายสีชมพู | Pink Line","LineNameTH":"สายสีชมพู","LineNameEN":"Pink Line","StationLineColor":"#D76886","Latitude":13.88935,"Longitude":100.5105,"PinmapX":"1103","PinmapY":"1047","IsCrowded":false,"Orderlist":4},{"StationId":138,"StationName":"กรมชลประทาน | Royal Irrigation Department","StationNameTH":"กรมชลประทาน","StationNameEN":"Royal Irrigation Department","StationKey":"PK05","StationLineId":5,"StationLineName":"สายสีชมพู | Pink Line","LineNameTH":"สายสีชมพู","LineNameEN":"Pink Line","StationLineColor":"#D76886","Latitude":13.89863,"Longitude":100.507,"PinmapX":"1063","PinmapY":"942","IsCrowded":false,"Orderlist":5},{"StationId":139,"StationName":"แยกปากเกร็ด | Yaek Pak Kret","StationNameTH":"แยกปากเกร็ด","StationNameEN":"Yaek Pak Kret","StationKey":"PK06","StationLineId":5,"StationLineName":"สายสีชมพู | Pink Line","LineNameTH":"สายสีชมพู","LineNameEN":"Pink Line","StationLineColor":"#D76886","Latitude":13.9063,"Longitude":100.5054,"PinmapX":"1058","PinmapY":"827","IsCrowded":false,"Orderlist":6},{"StationId":140,"StationName":"เลี่ยงเมืองปากเกร็ด | Pak Kret Bypass","StationNameTH":"เลี่ยงเมืองปากเกร็ด","StationNameEN":"Pak Kret Bypass","StationKey":"PK07","StationLineId":5,"StationLineName":"สายสีชมพู | Pink Line","LineNameTH":"สายสีชมพู","LineNameEN":"Pink Line","StationLineColor":"#D76886","Latitude":13.90648,"Longitude":100.5156,"PinmapX":"1188","PinmapY":"784","IsCrowded":false,"Orderlist":7},{"StationId":141,"StationName":"แจ้งวัฒนะ-ปากเกร็ด 28 | Chaeng Watthana-Pak Kret 28","StationNameTH":"แจ้งวัฒนะ-ปากเกร็ด 28","StationNameEN":"Chaeng Watthana-Pak Kret 28","StationKey":"PK08","StationLineId":5,"StationLineName":"สายสีชมพู | Pink Line","LineNameTH":"สายสีชมพู","LineNameEN":"Pink Line","StationLineColor":"#D76886","Latitude":13.90417,"Longitude":100.5292,"PinmapX":"1321","PinmapY":"784","IsCrowded":false,"Orderlist":8},{"StationId":142,"StationName":"ศรีรัช | Si Rat","StationNameTH":"ศรีรัช","StationNameEN":"Si Rat","StationKey":"PK09","StationLineId":5,"StationLineName":"สายสีชมพู | Pink Line","LineNameTH":"สายสีชมพู","LineNameEN":"Pink Line","StationLineColor":"#D76886","Latitude":13.90056,"Longitude":100.54,"PinmapX":"1454","PinmapY":"790","IsCrowded":false,"Orderlist":9},{"StationId":143,"StationName":"เมืองทองธานี | Muang Thong Thani","StationNameTH":"เมืองทองธานี","StationNameEN":"Muang Thong Thani","StationKey":"PK10","StationLineId":5,"StationLineName":"สายสีชมพู | Pink Line","LineNameTH":"สายสีชมพู","LineNameEN":"Pink Line","StationLineColor":"#D76886","Latitude":13.89739,"Longitude":100.5484,"PinmapX":"1582","PinmapY":"787","IsCrowded":false,"Orderlist":10},{"StationId":164,"StationName":"อิมแพ็ค เมืองทองธานี | Impact Muang Thong Thani","StationNameTH":"อิมแพ็ค เมืองทองธานี","StationNameEN":"Impact Muang Thong Thani","StationKey":"MT01","StationLineId":5,"StationLineName":"สายสีชมพู | Pink Line","LineNameTH":"สายสีชมพู","LineNameEN":"Pink Line","StationLineColor":"#D76886","Latitude":13.94048,"Longitude":100.5413,"PinmapX":"1529","PinmapY":"584","IsCrowded":false,"Orderlist":31},{"StationId":165,"StationName":"ทะเลสาบเมืองทองธานี | Lake Muang Thong Thani","StationNameTH":"ทะเลสาบเมืองทองธานี","StationNameEN":"Lake Muang Thong Thani","StationKey":"MT02","StationLineId":5,"StationLineName":"สายสีชมพู | Pink Line","LineNameTH":"สายสีชมพู","LineNameEN":"Pink Line","StationLineColor":"#D76886","Latitude":13.92075,"Longitude":100.543,"PinmapX":"1531","PinmapY":"425","IsCrowded":false,"Orderlist":32},{"StationId":144,"StationName":"แจ้งวัฒนะ 14 | Chaeng Watthana 14","StationNameTH":"แจ้งวัฒนะ 14","StationNameEN":"Chaeng Watthana 14","StationKey":"PK11","StationLineId":5,"StationLineName":"สายสีชมพู | Pink Line","LineNameTH":"สายสีชมพู","LineNameEN":"Pink Line","StationLineColor":"#D76886","Latitude":13.89328,"Longitude":100.5601,"PinmapX":"1715","PinmapY":"785","IsCrowded":false,"Orderlist":11},{"StationId":145,"StationName":"ศูนย์ราชการเฉลิมพระเกียรติ | Government Complex","StationNameTH":"ศูนย์ราชการเฉลิมพระเกียรติ","StationNameEN":"Government Complex","StationKey":"PK12","StationLineId":5,"StationLineName":"สายสีชมพู | Pink Line","LineNameTH":"สายสีชมพู","LineNameEN":"Pink Line","StationLineColor":"#D76886","Latitude":13.89073,"Longitude":100.5673,"PinmapX":"1844","PinmapY":"788","IsCrowded":false,"Orderlist":12},{"StationId":146,"StationName":"โทรคมนาคมแห่งชาติ | National Telecom","StationNameTH":"โทรคมนาคมแห่งชาติ","StationNameEN":"National Telecom","StationKey":"PK13","StationLineId":5,"StationLineName":"สายสีชมพู | Pink Line","LineNameTH":"สายสีชมพู","LineNameEN":"Pink Line","StationLineColor":"#D76886","Latitude":13.88756,"Longitude":100.5757,"PinmapX":"1971","PinmapY":"789","IsCrowded":false,"Orderlist":13},{"StationId":147,"StationName":"หลักสี่ | Lak Si","StationNameTH":"หลักสี่","StationNameEN":"Lak Si","StationKey":"PK14","StationLineId":5,"StationLineName":"สายสีชมพู | Pink Line","LineNameTH":"สายสีชมพู","LineNameEN":"Pink Line","StationLineColor":"#D76886","Latitude":13.88411,"Longitude":100.5826,"PinmapX":"2179","PinmapY":"790","IsCrowded":false,"Orderlist":14},{"StationId":148,"StationName":"ราชภัฏพระนคร | Rajabhat Phranakhon","StationNameTH":"ราชภัฏพระนคร","StationNameEN":"Rajabhat Phranakhon","StationKey":"PK15","StationLineId":5,"StationLineName":"สายสีชมพู | Pink Line","LineNameTH":"สายสีชมพู","LineNameEN":"Pink Line","StationLineColor":"#D76886","Latitude":13.88002,"Longitude":100.5892,"PinmapX":"2314","PinmapY":"790","IsCrowded":false,"Orderlist":15},{"StationId":149,"StationName":"วัดพระศรีมหาธาตุ | Wat Phra Sri Mahathat","StationNameTH":"วัดพระศรีมหาธาตุ","StationNameEN":"Wat Phra Sri Mahathat","StationKey":"PK16","StationLineId":5,"StationLineName":"สายสีชมพู | Pink Line","LineNameTH":"สายสีชมพู","LineNameEN":"Pink Line","StationLineColor":"#D76886","Latitude":13.87442,"Longitude":100.5968,"PinmapX":"2527","PinmapY":"785","IsCrowded":false,"Orderlist":16},{"StationId":150,"StationName":"รามอินทรา 3 | Ram Inthra 3","StationNameTH":"รามอินทรา 3","StationNameEN":"Ram Inthra 3","StationKey":"PK17","StationLineId":5,"StationLineName":"สายสีชมพู | Pink Line","LineNameTH":"สายสีชมพู","LineNameEN":"Pink Line","StationLineColor":"#D76886","Latitude":13.87094,"Longitude":100.6026,"PinmapX":"2705","PinmapY":"792","IsCrowded":false,"Orderlist":17},{"StationId":151,"StationName":"ลาดปลาเค้า | Lat Pla Khao","StationNameTH":"ลาดปลาเค้า","StationNameEN":"Lat Pla Khao","StationKey":"PK18","StationLineId":5,"StationLineName":"สายสีชมพู | Pink Line","LineNameTH":"สายสีชมพู","LineNameEN":"Pink Line","StationLineColor":"#D76886","Latitude":13.86278,"Longitude":100.6178,"PinmapX":"2879","PinmapY":"789","IsCrowded":false,"Orderlist":18},{"StationId":152,"StationName":"รามอินทรา กม.4 | Ram Inthra Kor Mor 4","StationNameTH":"รามอินทรา กม.4","StationNameEN":"Ram Inthra Kor Mor 4","StationKey":"PK19","StationLineId":5,"StationLineName":"สายสีชมพู | Pink Line","LineNameTH":"สายสีชมพู","LineNameEN":"Pink Line","StationLineColor":"#D76886","Latitude":13.85829,"Longitude":100.6261,"PinmapX":"3053","PinmapY":"787","IsCrowded":false,"Orderlist":19},{"StationId":153,"StationName":"มัยลาภ | Maiyalap","StationNameTH":"มัยลาภ","StationNameEN":"Maiyalap","StationKey":"PK20","StationLineId":5,"StationLineName":"สายสีชมพู | Pink Line","LineNameTH":"สายสีชมพู","LineNameEN":"Pink Line","StationLineColor":"#D76886","Latitude":13.85501,"Longitude":100.6322,"PinmapX":"3224","PinmapY":"788","IsCrowded":false,"Orderlist":20},{"StationId":154,"StationName":"วัชรพล | Vacharaphol","StationNameTH":"วัชรพล","StationNameEN":"Vacharaphol","StationKey":"PK21","StationLineId":5,"StationLineName":"สายสีชมพู | Pink Line","LineNameTH":"สายสีชมพู","LineNameEN":"Pink Line","StationLineColor":"#D76886","Latitude":13.84922,"Longitude":100.6429,"PinmapX":"3408","PinmapY":"787","IsCrowded":false,"Orderlist":21},{"StationId":155,"StationName":"รามอินทรา กม.6 | Ram Inthra Kor Mor 6","StationNameTH":"รามอินทรา กม.6","StationNameEN":"Ram Inthra Kor Mor 6","StationKey":"PK22","StationLineId":5,"StationLineName":"สายสีชมพู | Pink Line","LineNameTH":"สายสีชมพู","LineNameEN":"Pink Line","StationLineColor":"#D76886","Latitude":13.84523,"Longitude":100.6502,"PinmapX":"3579","PinmapY":"791","IsCrowded":false,"Orderlist":22},{"StationId":156,"StationName":"คู้บอน | Khu Bon","StationNameTH":"คู้บอน","StationNameEN":"Khu Bon","StationKey":"PK23","StationLineId":5,"StationLineName":"สายสีชมพู | Pink Line","LineNameTH":"สายสีชมพู","LineNameEN":"Pink Line","StationLineColor":"#D76886","Latitude":13.84059,"Longitude":100.6588,"PinmapX":"3754","PinmapY":"786","IsCrowded":false,"Orderlist":23},{"StationId":157,"StationName":"รามอินทรา กม.9 | Ram Inthra Kor Mor 9","StationNameTH":"รามอินทรา กม.9","StationNameEN":"Ram Inthra Kor Mor 9","StationKey":"PK24","StationLineId":5,"StationLineName":"สายสีชมพู | Pink Line","LineNameTH":"สายสีชมพู","LineNameEN":"Pink Line","StationLineColor":"#D76886","Latitude":13.83383,"Longitude":100.6675,"PinmapX":"3928","PinmapY":"788","IsCrowded":false,"Orderlist":24},{"StationId":158,"StationName":"วงแหวนรามอินทรา | Outer Ring Road-Ram Inthra","StationNameTH":"วงแหวนรามอินทรา","StationNameEN":"Outer Ring Road-Ram Inthra","StationKey":"PK25","StationLineId":5,"StationLineName":"สายสีชมพู | Pink Line","LineNameTH":"สายสีชมพู","LineNameEN":"Pink Line","StationLineColor":"#D76886","Latitude":13.82449,"Longitude":100.6771,"PinmapX":"4073","PinmapY":"874","IsCrowded":false,"Orderlist":25},{"StationId":159,"StationName":"นพรัตน์ | Nopparat","StationNameTH":"นพรัตน์","StationNameEN":"Nopparat","StationKey":"PK26","StationLineId":5,"StationLineName":"สายสีชมพู | Pink Line","LineNameTH":"สายสีชมพู","LineNameEN":"Pink Line","StationLineColor":"#D76886","Latitude":13.81658,"Longitude":100.6856,"PinmapX":"4185","PinmapY":"989","IsCrowded":false,"Orderlist":26},{"StationId":160,"StationName":"บางชัน | Bang Chan","StationNameTH":"บางชัน","StationNameEN":"Bang Chan","StationKey":"PK27","StationLineId":5,"StationLineName":"สายสีชมพู | Pink Line","LineNameTH":"สายสีชมพู","LineNameEN":"Pink Line","StationLineColor":"#D76886","Latitude":13.81272,"Longitude":100.7028,"PinmapX":"4296","PinmapY":"1107","IsCrowded":false,"Orderlist":27},{"StationId":161,"StationName":"เศรษฐบุตรบำเพ็ญ | Setthabutbamphen","StationNameTH":"เศรษฐบุตรบำเพ็ญ","StationNameEN":"Setthabutbamphen","StationKey":"PK28","StationLineId":5,"StationLineName":"สายสีชมพู | Pink Line","LineNameTH":"สายสีชมพู","LineNameEN":"Pink Line","StationLineColor":"#D76886","Latitude":13.81272,"Longitude":100.7124,"PinmapX":"4405","PinmapY":"1214","IsCrowded":false,"Orderlist":28},{"StationId":162,"StationName":"ตลาดมีนบุรี | Min Buri Market","StationNameTH":"ตลาดมีนบุรี","StationNameEN":"Min Buri Market","StationKey":"PK29","StationLineId":5,"StationLineName":"สายสีชมพู | Pink Line","LineNameTH":"สายสีชมพู","LineNameEN":"Pink Line","StationLineColor":"#D76886","Latitude":13.81255,"Longitude":100.7257,"PinmapX":"4522","PinmapY":"1323","IsCrowded":false,"Orderlist":29},{"StationId":163,"StationName":"มีนบุรี | Min Buri","StationNameTH":"มีนบุรี","StationNameEN":"Min Buri","StationKey":"PK30","StationLineId":5,"StationLineName":"สายสีชมพู | Pink Line","LineNameTH":"สายสีชมพู","LineNameEN":"Pink Line","StationLineColor":"#D76886","Latitude":13.80842,"Longitude":100.7326,"PinmapX":"4629","PinmapY":"1435","IsCrowded":false,"Orderlist":30}]}];

        async function fetchStationList() {
            // cache 24 ชม. หรือ fallback ในเครื่อง — เปิดแอปขึ้นทันที 0ms แล้วค่อย refresh เบื้องหลัง
            const cached = (() => {
                try {
                    const c = JSON.parse(localStorage.getItem(CACHE_KEY));
                    if (c && Date.now() - c.at < CACHE_TTL && Array.isArray(c.data)) return sanitizeStationData(c.data);
                } catch (e) { }
                if (typeof FALLBACK_STATION_LIST !== 'undefined' && Array.isArray(FALLBACK_STATION_LIST)) {
                    return sanitizeStationData(FALLBACK_STATION_LIST);
                }
                return null;
            })();
            if (cached) {
                refreshStationListInBackground();
                return sanitizeStationData(cached);
            }
            try {
                const res = await postJSON(STATION_LIST_URL('en'), null, {}, 5000);
                if (res.status === 200 && res.data?.ErrMessage === 'Success' && Array.isArray(res.data.data)) {
                    const sanitized = sanitizeStationData(res.data.data);
                    localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data: sanitized }));
                    return sanitized;
                }
            } catch (e) {
                console.warn('Network station-list failed, using FALLBACK_STATION_LIST', e);
            }
            if (typeof FALLBACK_STATION_LIST !== 'undefined' && Array.isArray(FALLBACK_STATION_LIST)) {
                return sanitizeStationData(FALLBACK_STATION_LIST);
            }
            throw new Error(T('loadStationsFail'));
        }

        async function refreshStationListInBackground() {
            try {
                const res = await postJSON(STATION_LIST_URL('en'), null, {}, 5000);
                if (res.status === 200 && res.data?.ErrMessage === 'Success') {
                    const sanitized = sanitizeStationData(res.data.data);
                    localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data: sanitized }));
                    applyCrowdedUpdate(sanitized);
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

        function showToast(msg, isCustomHtml = false) {
            if (typeof App !== 'undefined' && typeof App.showToast === 'function') {
                App.showToast(msg, isCustomHtml);
            }
        }

        function showNearestStationToast(station, km, isApprox = false) {
            if (typeof App !== 'undefined' && typeof App.showNearestStationToast === 'function') {
                App.showNearestStationToast(station, km, isApprox);
            }
        }

        async function fetchIpLocation(timeoutMs = 3500) {
            if (typeof fetch !== 'function') throw new Error('fetch not available');
            const fetchWithTimeout = async (url, ms) => {
                const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
                const timer = controller ? setTimeout(() => controller.abort(), ms) : null;
                try {
                    const res = await fetch(url, { signal: controller ? controller.signal : undefined, cache: 'no-cache' });
                    if (!res.ok) throw new Error('HTTP ' + res.status);
                    return await res.json();
                } finally {
                    if (timer) clearTimeout(timer);
                }
            };

            const parseCoords = (data) => {
                if (!data) throw new Error('Empty response');
                if (data.success === false) throw new Error('API reported failure');
                const lat = Number(data.latitude ?? data.lat);
                const lon = Number(data.longitude ?? data.lon);
                if (!isFinite(lat) || !isFinite(lon) || (lat === 0 && lon === 0)) {
                    throw new Error('Invalid coordinates');
                }
                return { lat, lon };
            };

            const urls = [
                'https://ipwho.is/',
                'https://get.geojs.io/v1/ip/geo.json',
                'https://freeipapi.com/api/json',
                'https://ipapi.co/json/'
            ];

            if (typeof Promise.any === 'function') {
                return await Promise.any(urls.map(u => fetchWithTimeout(u, timeoutMs).then(parseCoords)));
            }

            for (const u of urls) {
                try {
                    return parseCoords(await fetchWithTimeout(u, timeoutMs));
                } catch (e) {}
            }

            throw new Error('All IP geolocation providers failed');
        }

        function isNativeFlutterEnvironment() {
            if (typeof window === 'undefined') return false;
            return Boolean(
                window.isFlutterApp ||
                window.FlutterLocation ||
                (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.FlutterLocation) ||
                (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.includes('BKKSkyTrains'))
            );
        }

        // ป้องกันไม่ให้ WKWebView บน iOS แสดงกล่องข้อความเตือนขอสิทธิ์ระบุตำแหน่งแบบพาธไฟล์ (/private/var/containers/...)
        if (isNativeFlutterEnvironment() && typeof navigator !== 'undefined' && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition = function() {
                if (window.FlutterLocation && typeof window.FlutterLocation.postMessage === 'function') {
                    window.FlutterLocation.postMessage(JSON.stringify({ action: 'getLocation', interactive: false }));
                }
            };
            navigator.geolocation.watchPosition = function() { return 0; };
        }

        function isMrtLineId(id) {
            return id === MRT_LINE_IDS.BLUE || id === MRT_LINE_IDS.PURPLE || id === 103 || id === 105 || id === MRT_LINE_IDS.ARL || id === MRT_LINE_IDS.BRT || id === MRT_LINE_IDS.ORANGE;
        }

        function isGoldLineId(id) {
            return Number(id) === GOLD_LINE_ID;
        }

        function isPinkLineId(id) {
            return Number(id) === 5;
        }

        function isMrtStationKey(key) {
            return !!MRT_STATION_BY_KEY[key] || key.startsWith('RN') || key.startsWith('RW') || key.startsWith('A') || key.startsWith('B') || key.startsWith('OR');
        }

        function usesStaticTimetable(station) {
            return !!station && (
                station.StaticJourney === true ||
                isMrtStationKey(station.StationKey) ||
                isGoldLineId(station.StationLineId)
            );
        }

        const SRT_RED_STATION_INDEX = {
            'RW04': 0, 'RW03': 1, 'RW02': 2, 'RN01': 3, 'RW01': 3,
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

        function mrtOrangeFare(stops) {
            return MRT_BLUE_FARES_NEW[Math.min(Math.max(0, stops), MRT_BLUE_FARES_NEW.length - 1)] || 17;
        }

        function firstLineEntry(key) {
            return (App.keyLines[key] || [])[0] || null;
        }

        const SRT_RED_TRAVEL_TIMES = {
            'RW04|RW03': 5, 'RW03|RW04': 5,
            'RW03|RW02': 7, 'RW02|RW03': 7,
            'RW02|RN01': 4, 'RN01|RW02': 4,
            'RW02|RW01': 4, 'RW01|RW02': 4,
            'RN01|RW01': 0, 'RW01|RN01': 0,
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
                if (Number(line.LineId) === 5) {
                    // สายสีชมพู: สายหลัก PK01-PK30 และสายแยกเมืองทองธานี PK10-MT01-MT02
                    const mainSts = line.StationList.filter(s => s && s.StationKey && s.StationKey.startsWith('PK'));
                    for (let i = 1; i < mainSts.length; i++) {
                        addEdge(mainSts[i - 1].StationKey, mainSts[i].StationKey, {
                            type: 'rail',
                            lineId: 5,
                            color: line.LineColor,
                            weight: 2
                        });
                    }
                    // สายแยกเมืองทองธานี: PK10 <-> MT01 <-> MT02
                    addEdge('PK10', 'MT01', { type: 'rail', lineId: 5, color: line.LineColor, weight: 2 });
                    addEdge('MT01', 'MT02', { type: 'rail', lineId: 5, color: line.LineColor, weight: 2 });
                    continue;
                }
                for (let i = 1; i < line.StationList.length; i++) {
                    const a = line.StationList[i - 1].StationKey;
                    const b = line.StationList[i].StationKey;
                    let w = isMrtLineId(line.LineId) ? 2.2 : 2;
                    if (line.LineId === 103 || line.LineId === 105 || line.LineId === MRT_LINE_IDS.RED) {
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
                } else if (segment.kind === 'orange') {
                    fare = mrtOrangeFare(segment.stops);
                    labelTh = `${I18N.th.jMrtOrangeFare} (${segment.stops} สถานี)`;
                    labelEn = `${I18N.en.jMrtOrangeFare} (${segment.stops} stations)`;
                } else if (segment.kind === 'brt') {
                    fare = 15;
                    labelTh = `${I18N.th.jBrtFare} (${segment.stops} สถานี)`;
                    labelEn = `${I18N.en.jBrtFare} (${segment.stops} stations)`;
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
                        : e.lineId === MRT_LINE_IDS.ORANGE ? 'orange'
                            : e.lineId === MRT_LINE_IDS.BRT ? 'brt'
                                : (e.lineId === 103 || e.lineId === 105 || e.lineId === MRT_LINE_IDS.RED) ? 'red'
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
            if (originKey && destKey && originKey === destKey) {
                return await buildSameStationJourney(originKey);
            }
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

        async function getSameStationFare(stationKey) {
            const st = App.findStation(stationKey);
            if (!st) return { fare: 0, lineName: '' };
            const entries = App.keyLines[st.StationKey] || [];
            const lineId = st.StationLineId || entries[0]?.lineId || 1;
            const line = App.lineById[lineId] || MRT_LINE_BY_ID[lineId];
            const lineName = line ? (lang === 'zh' ? (LINE_NAMES_ZH[lineId] || line.LineNameEN || line.LineName) : (lang === 'en' ? (line.LineNameEN || line.LineName) : (line.LineNameTH || line.LineName))) : '';

            // 1. MRT Lines
            if (lineId === MRT_LINE_IDS.BLUE) {
                return { fare: mrtBlueFare(1), lineName };
            }
            if (lineId === MRT_LINE_IDS.PURPLE) {
                return { fare: mrtPurpleFare(1), lineName };
            }
            if (lineId === MRT_LINE_IDS.RED || lineId === 103 || lineId === 105) {
                return { fare: 12, lineName };
            }
            if (lineId === MRT_LINE_IDS.ARL) {
                return { fare: 15, lineName };
            }
            if (lineId === GOLD_LINE_ID) {
                return { fare: 16, lineName };
            }
            if (lineId === 4) {
                return { fare: 15, lineName }; // สายสีเหลือง เริ่มต้น 15 บาท
            }
            if (lineId === 5) {
                return { fare: 15, lineName }; // สายสีชมพู เริ่มต้น 15 บาท
            }
            if (lineId === MRT_LINE_IDS.BRT) {
                return { fare: 15, lineName }; // BRT อัตราเดียว 15 บาท
            }
            if (lineId === MRT_LINE_IDS.ORANGE) {
                return { fare: 17, lineName }; // สายสีส้ม เริ่มต้น 17 บาท
            }

            // 2. BTS Green Lines (Sukhumvit Line 1 / Silom Line 2)
            const list = line?.StationList || [];
            const idx = list.findIndex(s => s.StationKey === stationKey);
            const neighbor = idx >= 0 ? (idx < list.length - 1 ? list[idx + 1] : (idx > 0 ? list[idx - 1] : null)) : null;
            if (neighbor) {
                try {
                    const live = await liveSegmentFare(stationKey, neighbor.StationKey);
                    if (live > 0) return { fare: live, lineName };
                } catch (_) {}
            }

            // ส่วนต่อขยาย (คูคต N9-N24, เคหะฯ E15-E23, บางหว้า S9-S12) อัตรา 15 บาท, สายหลัก 17 บาท
            const isExtension = /^(N9|N1[0-9]|N2[0-4]|E1[5-9]|E2[0-3]|S9|S1[0-2])$/.test(stationKey);
            return { fare: isExtension ? 15 : 17, lineName };
        }

        async function buildSameStationJourney(stationKey) {
            const st = App.findStation(stationKey);
            if (!st) throw new Error(T('jFail'));
            const thName = st.StationNameTH || stName(st);
            const enName = st.StationNameEN || stName(st);
            const title = `${thName}|${enName}`;
            const entries = App.keyLines[st.StationKey] || [];
            const primaryLineId = st.StationLineId || entries[0]?.lineId || 1;

            const { fare: oneStationFare, lineName } = await getSameStationFare(stationKey);

            return {
                RoutesMap: [
                    {
                        Count_Station: 1,
                        Count_InterChange: 0,
                        TotalTime: 0,
                        TotalKm: '0.0',
                        FareRate_Total: oneStationFare,
                        LabelTag: T('jSameStation'),
                        RoutesJorney: [
                            {
                                StationCode: st.StationKey,
                                Title: title,
                                TimeRoute: lang === 'zh' ? '0 分钟' : (lang === 'en' ? '0 min' : '0 นาที'),
                                LineId: primaryLineId
                            }
                        ],
                        FareRateInfo: [{
                            FareRate_List: [
                                {
                                    FareDetail: lang === 'zh'
                                        ? `同站票价 (按 1 站计费 · ${lineName || '本线路'})`
                                        : (lang === 'en'
                                            ? `Same-station fare (1-station rate · ${lineName || 'Current line'})`
                                            : `ค่าโดยสารสถานีเดียวกัน (คิดอัตรา 1 สถานี · ${lineName || 'สายนี้'})`),
                                    FareDetail_ENG: `Same-station fare (1-station rate · ${lineName || 'Current line'})`,
                                    FarePrice: oneStationFare
                                }
                            ]
                        }]
                    }
                ]
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
                nameTH: 'ทั้งหมด', nameZH: '全部线路',
                nameEN: 'All Lines',
                color: '#64748B',
                operatorTH: 'โครงข่ายรถไฟฟ้า 12 สาย กทม. และปริมณฑล',
                operatorEN: '12 Transit Lines Network in Bangkok',
                operatorZH: '曼谷及周边地区 12 条轨道交通线路网络',
                terminusTH: 'ทุกเส้นทางครอบคลุมทั้งระบบ',
                terminusEN: 'Comprehensive Network Coverage',
                terminusZH: '覆盖全网所有线路',
                minFare: 12,
                maxFare: 62,
                pricingModelTH: 'ขึ้นกับแต่ละสาย (ตามระยะทาง / นโยบาย 20 บาท)',
                pricingModelEN: 'Line-dependent (Distance / 20 Baht Flat Cap)',
                pricingModelZH: '按各线路计费标准（阶梯计费 / 20泰铢封顶）',
                ticketsTH: 'EMV Contactless, Rabbit, Token, Smart Pass',
                ticketsEN: 'EMV Contactless, Rabbit, Token, Smart Pass',
                ticketsZH: 'EMV Contactless, 兔子卡 (Rabbit), 单程票/代币, Smart Pass',
                firstTrainTH: '05:00 - 06:00 นาที',
                firstTrainEN: '05:00 - 06:00',
                firstTrainZH: '05:00 - 06:00',
                lastTrainTH: '23:30 - 00:30 นาที',
                lastTrainEN: '23:30 - 00:30',
                lastTrainZH: '23:30 - 00:30',
                peakFreqTH: '2.30 - 5.00 นาที',
                peakFreqEN: '2.30 - 5.00 min',
                peakFreqZH: '2.30 - 5.00 分钟',
                offPeakFreqTH: '5.00 - 15.00 นาที',
                offPeakFreqEN: '5.00 - 15.00 min',
                offPeakFreqZH: '5.00 - 15.00 分钟'
            },
            {
                id: 1,
                nameTH: 'BTS สายสุขุมวิท', nameZH: 'BTS 素坤逸线',
                nameEN: 'BTS Sukhumvit Line',
                color: '#7AB420',
                operatorTH: 'BTSC (ระบบรถไฟฟ้าบีทีเอส)',
                operatorEN: 'BTSC (Bangkok Mass Transit System)',
                operatorZH: 'BTSC (曼谷大众运输系统公司)',
                terminusTH: 'คูคต ↔ เคหะฯ (47 สถานี)',
                terminusEN: 'Khu Khot ↔ Kheha (47 Stations)',
                terminusZH: '库阔 ↔ 壳哈 (47 个车站)',
                minFare: 17,
                maxFare: 62,
                pricingModelTH: 'ตามจำนวนสถานี (สัมปทานหลัก ฿17-฿47 + ส่วนต่อขยาย +฿15)',
                pricingModelEN: 'By stations (Core ฿17-฿47 + Extensions +฿15)',
                pricingModelZH: '按站计费（特许核心段 ฿17-฿47 + 延伸段 +฿15）',
                ticketsTH: 'บัตร Rabbit, บัตรเที่ยวเดียว, One-Day Pass (฿150)',
                ticketsEN: 'Rabbit Card, Single Journey Ticket, One-Day Pass (฿150)',
                ticketsZH: '兔子卡 (Rabbit Card), 单程票, 一日通票 (฿150)',
                firstTrainTH: '05:15 - 05:30 นาที',
                firstTrainEN: '05:15 - 05:30',
                firstTrainZH: '05:15 - 05:30',
                lastTrainTH: '24:00 - 00:30 นาที',
                lastTrainEN: '24:00 - 00:30',
                lastTrainZH: '24:00 - 00:30',
                peakFreqTH: '2.30 - 3.50 นาที',
                peakFreqEN: '2.30 - 3.50 min',
                peakFreqZH: '2.30 - 3.50 分钟',
                offPeakFreqTH: '5.00 - 8.00 นาที',
                offPeakFreqEN: '5.00 - 8.00 min',
                offPeakFreqZH: '5.00 - 8.00 分钟',
                dir1: { code: 'N24', toTH: 'คูคต', toEN: 'Khu Khot', toZH: '库阔', first: '05:15', last: '23:30' },
                dir2: { code: 'E23', toTH: 'เคหะฯ', toEN: 'Kheha', toZH: '壳哈', first: '05:15', last: '23:30' }
            },
            {
                id: 2,
                nameTH: 'BTS สายสีลม', nameZH: 'BTS 是隆线',
                nameEN: 'BTS Silom Line',
                color: '#00807D',
                operatorTH: 'BTSC (ระบบรถไฟฟ้าบีทีเอส)',
                operatorEN: 'BTSC (Bangkok Mass Transit System)',
                operatorZH: 'BTSC (曼谷大众运输系统公司)',
                terminusTH: 'สนามกีฬาแห่งชาติ ↔ บางหว้า (14 สถานี)',
                terminusEN: 'National Stadium ↔ Bang Wa (14 Stations)',
                terminusZH: '国家体育场 ↔ 挽哇 (14 个车站)',
                minFare: 17,
                maxFare: 62,
                pricingModelTH: 'ตามจำนวนสถานี (สัมปทานหลัก ฿17-฿47 + ส่วนต่อขยาย +฿15)',
                pricingModelEN: 'By stations (Core ฿17-฿47 + Extensions +฿15)',
                pricingModelZH: '按站计费（特许核心段 ฿17-฿47 + 延伸段 +฿15）',
                ticketsTH: 'บัตร Rabbit, บัตรเที่ยวเดียว, One-Day Pass (฿150)',
                ticketsEN: 'Rabbit Card, Single Journey Ticket, One-Day Pass (฿150)',
                ticketsZH: '兔子卡 (Rabbit Card), 单程票, 一日通票 (฿150)',
                firstTrainTH: '05:30 นาที',
                firstTrainEN: '05:30',
                firstTrainZH: '05:30',
                lastTrainTH: '24:00 นาที',
                lastTrainEN: '24:00',
                lastTrainZH: '24:00',
                peakFreqTH: '3.45 นาที',
                peakFreqEN: '3.45 min',
                peakFreqZH: '3.45 分钟',
                offPeakFreqTH: '6.00 - 8.00 นาที',
                offPeakFreqEN: '6.00 - 8.00 min',
                offPeakFreqZH: '6.00 - 8.00 分钟',
                dir1: { code: 'W1', toTH: 'สนามกีฬาแห่งชาติ', toEN: 'National Stadium', toZH: '国家体育场', first: '05:30', last: '24:00' },
                dir2: { code: 'S12', toTH: 'บางหว้า', toEN: 'Bang Wa', toZH: '挽哇', first: '05:30', last: '24:00' }
            },
            {
                id: 3,
                nameTH: 'BTS สายสีทอง', nameZH: 'BTS 金线',
                nameEN: 'BTS Gold Line',
                color: '#C9A038',
                operatorTH: 'กรุงเทพธนาคม (KT) / BTSC',
                operatorEN: 'Krungthep Thanakom / BTSC',
                operatorZH: '曼谷塔纳空 (KT) / BTSC',
                terminusTH: 'กรุงธนบุรี ↔ คลองสาน (3 สถานี)',
                terminusEN: 'Krung Thon Buri ↔ Khlong San (3 Stations)',
                terminusZH: '吞武里城 ↔ 空讪 (3 个车站)',
                minFare: 16,
                maxFare: 16,
                pricingModelTH: 'ราคาเดียว 16 บาท ตลอดสาย (Flat Rate ฿16)',
                pricingModelEN: 'Flat Rate ฿16 regardless of distance',
                pricingModelZH: '全线单一票价 16 泰铢',
                ticketsTH: 'บัตร Rabbit, บัตรโดยสารเที่ยวเดียว',
                ticketsEN: 'Rabbit Card, Single Journey Ticket',
                ticketsZH: '兔子卡 (Rabbit Card), 单程票',
                firstTrainTH: '06:00 นาที',
                firstTrainEN: '06:00',
                firstTrainZH: '06:00',
                lastTrainTH: '24:00 นาที',
                lastTrainEN: '24:00',
                lastTrainZH: '24:00',
                peakFreqTH: '8.00 นาที',
                peakFreqEN: '8.00 min',
                peakFreqZH: '8.00 分钟',
                offPeakFreqTH: '10.00 - 15.00 นาที',
                offPeakFreqEN: '10.00 - 15.00 min',
                offPeakFreqZH: '10.00 - 15.00 分钟',
                dir1: { code: 'G1', toTH: 'กรุงธนบุรี', toEN: 'Krung Thon Buri', toZH: '吞武里城', first: '06:00', last: '24:00' },
                dir2: { code: 'G3', toTH: 'คลองสาน', toEN: 'Khlong San', toZH: '空讪', first: '06:00', last: '24:00' }
            },
            {
                id: 4,
                nameTH: 'MRT สายสีเหลือง | (นัคราพิพัฒน์)', nameZH: 'MRT 黄线 | (纳卡拉披帕)',
                nameEN: 'MRT Yellow Line | (Nakkhara Phiphat)',
                color: '#FFD100',
                operatorTH: 'EBM (Eastern Bangkok Monorail)',
                operatorEN: 'EBM (Eastern Bangkok Monorail)',
                operatorZH: 'EBM (曼谷东部单轨铁路)',
                terminusTH: 'ลาดพร้าว ↔ สำโรง (23 สถานี)',
                terminusEN: 'Lat Phrao ↔ Samrong (23 Stations)',
                terminusZH: '拉抛 ↔ 三隆 (23 个车站)',
                minFare: 15,
                maxFare: 45,
                pricingModelTH: 'ตามระยะทาง (บุคคล ฿15-฿45 / ผู้สูงอายุ ฿8-฿23 / นักเรียนมีเหมา ฿20)',
                pricingModelEN: 'By distance (Adult ฿15-฿45 / Senior ฿8-฿23 / Student Pass ฿20)',
                pricingModelZH: '按里程计费（成人 ฿15-฿45 / 长者 ฿8-฿23 / 学生计次 ฿20）',
                ticketsTH: 'บัตร Rabbit, บัตร EMV Contactless, บัตรเที่ยวเดียว (ผู้สูงอายุลด 50%)',
                ticketsEN: 'Rabbit Card, EMV Contactless, Single Journey (Senior 50% off)',
                ticketsZH: '兔子卡, EMV Contactless, 单程票 (长者5折)',
                firstTrainTH: '06:00 นาที',
                firstTrainEN: '06:00',
                firstTrainZH: '06:00',
                lastTrainTH: '24:00 นาที',
                lastTrainEN: '24:00',
                lastTrainZH: '24:00',
                peakFreqTH: '5.00 นาที',
                peakFreqEN: '5.00 min',
                peakFreqZH: '5.00 分钟',
                offPeakFreqTH: '10.00 นาที',
                offPeakFreqEN: '10.00 min',
                offPeakFreqZH: '10.00 分钟',
                dir1: { code: 'YL01', toTH: 'ลาดพร้าว', toEN: 'Lat Phrao', toZH: '拉抛', first: '06:00', last: '24:00' },
                dir2: { code: 'YL23', toTH: 'สำโรง', toEN: 'Samrong', toZH: '三隆', first: '06:00', last: '24:00' }
            },
            {
                id: 5,
                nameTH: 'MRT สายสีชมพู | (วิวัฒน์นคร)', nameZH: 'MRT 粉红线 | (威瓦那空)',
                nameEN: 'MRT Pink Line | (Wiwat Nakhon)',
                color: '#EC4899',
                operatorTH: 'NBM (Northern Bangkok Monorail)',
                operatorEN: 'NBM (Northern Bangkok Monorail)',
                operatorZH: 'NBM (曼谷北部单轨铁路)',
                terminusTH: 'ศูนย์ราชการนนทบุรี ↔ มีนบุรี (30 สถานี)',
                terminusEN: 'Nonthaburi Civic Center ↔ Min Buri (30 Stations)',
                terminusZH: '暖武里政务中心 ↔ 敏武里 (30 个车站)',
                minFare: 15,
                maxFare: 45,
                pricingModelTH: 'ตามระยะทาง (บุคคล ฿15-฿45 / ผู้สูงอายุ ฿8-฿23 / นักเรียนมีเหมา ฿20)',
                pricingModelEN: 'By distance (Adult ฿15-฿45 / Senior ฿8-฿23 / Student Pass ฿20)',
                pricingModelZH: '按里程计费（成人 ฿15-฿45 / 长者 ฿8-฿23 / 学生计次 ฿20）',
                ticketsTH: 'บัตร Rabbit, บัตร EMV Contactless, บัตรเที่ยวเดียว (ผู้สูงอายุลด 50%)',
                ticketsEN: 'Rabbit Card, EMV Contactless, Single Journey (Senior 50% off)',
                ticketsZH: '兔子卡, EMV Contactless, 单程票 (长者5折)',
                firstTrainTH: '06:00 นาที',
                firstTrainEN: '06:00',
                firstTrainZH: '06:00',
                lastTrainTH: '24:00 นาที',
                lastTrainEN: '24:00',
                lastTrainZH: '24:00',
                peakFreqTH: '5.00 นาที',
                peakFreqEN: '5.00 min',
                peakFreqZH: '5.00 分钟',
                offPeakFreqTH: '10.00 นาที',
                offPeakFreqEN: '10.00 min',
                offPeakFreqZH: '10.00 分钟',
                dir1: { code: 'PK01', toTH: 'ศูนย์ราชการนนทบุรี', toEN: 'Nonthaburi Civic Center', toZH: '暖武里政务中心', first: '06:00', last: '24:00' },
                dir2: { code: 'PK30', toTH: 'มีนบุรี', toEN: 'Min Buri', toZH: '敏武里', first: '06:00', last: '24:00' }
            },
            {
                id: 101,
                nameTH: 'MRT สายสีน้ำเงิน | (เฉลิมรัชมงคล)', nameZH: 'MRT 蓝线 | (差隆拉差蒙坤)',
                nameEN: 'MRT Blue Line | (Chaloem Ratchamongkhon)',
                color: '#0284C7',
                operatorTH: 'BEM (Bangkok Expressway and Metro) / รฟม.',
                operatorEN: 'BEM / MRTA (Mass Rapid Transit Authority)',
                operatorZH: 'BEM (曼谷高速与地铁) / 泰国大众捷运局 (MRTA)',
                terminusTH: 'ท่าพระ ↔ หลักสอง (สายวงกลม, 38 สถานี)',
                terminusEN: 'Tha Phra ↔ Lak Song (Loop Line, 38 Stations)',
                terminusZH: '塔帕 ↔ 叻颂 (环线, 38 个车站)',
                minFare: 17,
                maxFare: 43,
                pricingModelTH: 'คำนวณตามจำนวนสถานี (฿17 - ฿43)',
                pricingModelEN: 'Calculated by stations (฿17 - ฿43)',
                pricingModelZH: '按站数计费（฿17 - ฿43）',
                ticketsTH: 'เหรียญโดยสาร (Token), บัตร MRT, บัตร EMV Contactless',
                ticketsEN: 'Single Journey Token, MRT Card, EMV Contactless',
                ticketsZH: '单程代币 (Token), MRT卡, EMV Contactless',
                firstTrainTH: '06:00 นาที (วันหยุด 06:00 นาที)',
                firstTrainEN: '06:00 (Holidays 06:00)',
                firstTrainZH: '06:00 (节假日 06:00)',
                lastTrainTH: '23:30 - 24:00 นาที',
                lastTrainEN: '23:30 - 24:00',
                lastTrainZH: '23:30 - 24:00',
                peakFreqTH: '3.30 - 4.00 นาที',
                peakFreqEN: '3.30 - 4.00 min',
                peakFreqZH: '3.30 - 4.00 分钟',
                offPeakFreqTH: '5.00 - 8.00 นาที',
                offPeakFreqEN: '5.00 - 8.00 min',
                offPeakFreqZH: '5.00 - 8.00 分钟',
                dir1: { code: 'BL01', toTH: 'ท่าพระ (ผ่านบางซื่อ)', toEN: 'Tha Phra (via Bang Sue)', toZH: '塔帕 (途经挽赐)', first: '05:30', last: '23:30' },
                dir2: { code: 'BL38', toTH: 'หลักสอง (ผ่านหัวลำโพง)', toEN: 'Lak Song (via Hua Lamphong)', toZH: '叻颂 (途经华南蓬)', first: '05:30', last: '23:30' }
            },
            {
                id: 102,
                nameTH: 'MRT สายสีม่วง | (ฉลองรัชธรรม)', nameZH: 'MRT 紫线 | (差隆拉差探)',
                nameEN: 'MRT Purple Line | (Chalong Ratchatham)',
                color: '#8A2C9B',
                operatorTH: 'BEM / รฟม.',
                operatorEN: 'BEM / MRTA',
                operatorZH: 'BEM / 泰国大众捷运局 (MRTA)',
                terminusTH: 'คลองบางไผ่ ↔ เตาปูน (16 สถานี)',
                terminusEN: 'Khlong Bang Phai ↔ Tao Poon (16 Stations)',
                terminusZH: '曼艾空邦派 ↔ 岛本 (16 个车站)',
                minFare: 14,
                maxFare: 20,
                pricingModelTH: 'นโยบาย 20 บาทตลอดสาย (สูงสุดไม่เกิน ฿20)',
                pricingModelEN: 'Flat 20 Baht Policy (Capped at ฿20 max)',
                pricingModelZH: '全线 20 泰铢封顶（最高不超过 ฿20）',
                ticketsTH: 'เหรียญโดยสาร (Token), บัตร MRT Plus, บัตร EMV Contactless',
                ticketsEN: 'Single Journey Token, MRT Plus Card, EMV Contactless',
                ticketsZH: '单程代币 (Token), MRT Plus卡, EMV Contactless',
                firstTrainTH: '05:30 นาที (วันหยุด 06:00 นาที)',
                firstTrainEN: '05:30 (Holidays 06:00)',
                firstTrainZH: '05:30 (节假日 06:00)',
                lastTrainTH: '23:30 - 24:00 นาที',
                lastTrainEN: '23:30 - 24:00',
                lastTrainZH: '23:30 - 24:00',
                peakFreqTH: '4.30 - 6.00 นาที',
                peakFreqEN: '4.30 - 6.00 min',
                peakFreqZH: '4.30 - 6.00 分钟',
                offPeakFreqTH: '7.00 - 9.00 นาที',
                offPeakFreqEN: '7.00 - 9.00 min',
                offPeakFreqZH: '7.00 - 9.00 分钟',
                dir1: { code: 'PP16', toTH: 'เตาปูน', toEN: 'Tao Poon', toZH: '岛本', first: '05:30', last: '23:25' },
                dir2: { code: 'PP01', toTH: 'คลองบางไผ่', toEN: 'Khlong Bang Phai', toZH: '曼艾空邦派', first: '06:00', last: '23:55' }
            },
            {
                id: 103,
                nameTH: 'SRT สายสีแดงเข้ม | (ธานีรัถยา)', nameZH: 'SRT 暗红线 | (塔尼拉塔雅)',
                nameEN: 'SRT Dark Red Line | (Thani Ratthaya)',
                color: '#B91C1C',
                operatorTH: 'SRTET (รถไฟฟ้า ร.ฟ.ท.)',
                operatorEN: 'SRTET (State Railway of Thailand Electrified Train)',
                operatorZH: 'SRTET (泰国国家铁路电气化列车)',
                terminusTH: 'กรุงเทพอภิวัฒน์ ↔ รังสิต (10 สถานี)',
                terminusEN: 'Krung Thep Aphiwat ↔ Rangsit (10 Stations)',
                terminusZH: '曼谷阿披瓦中央车站 ↔ 兰实 (10 个车站)',
                minFare: 12,
                maxFare: 20,
                pricingModelTH: 'นโยบาย 20 บาทตลอดสาย (สูงสุดไม่เกิน ฿20)',
                pricingModelEN: 'Flat 20 Baht Policy (Capped at ฿20 max)',
                pricingModelZH: '全线 20 泰铢封顶（最高不超过 ฿20）',
                ticketsTH: 'เหรียญโดยสาร (Token), บัตร SRTET, บัตร EMV Contactless',
                ticketsEN: 'Single Journey Token, SRTET Card, EMV Contactless',
                ticketsZH: '单程代币 (Token), SRTET卡, EMV Contactless',
                firstTrainTH: '05:00 นาที',
                firstTrainEN: '05:00',
                firstTrainZH: '05:00',
                lastTrainTH: '24:00 นาที',
                lastTrainEN: '24:00',
                lastTrainZH: '24:00',
                peakFreqTH: '10.00 นาที',
                peakFreqEN: '10.00 min',
                peakFreqZH: '10.00 分钟',
                offPeakFreqTH: '20.00 นาที',
                offPeakFreqEN: '20.00 min',
                offPeakFreqZH: '20.00 分钟',
                dir1: { code: 'RN10', toTH: 'รังสิต', toEN: 'Rangsit', toZH: '兰实', first: '05:00', last: '24:00' },
                dir2: { code: 'RN01', toTH: 'กรุงเทพอภิวัฒน์', toEN: 'Krung Thep Aphiwat', toZH: '曼谷阿披瓦', first: '05:00', last: '24:00' }
            },
            {
                id: 105,
                nameTH: 'SRT สายสีแดงอ่อน | (นครวิถี)', nameZH: 'SRT 浅红线 | (那空威提)',
                nameEN: 'SRT Light Red Line | (Nakhon Withi)',
                color: '#F87171',
                operatorTH: 'SRTET (รถไฟฟ้า ร.ฟ.ท.)',
                operatorEN: 'SRTET (State Railway of Thailand Electrified Train)',
                operatorZH: 'SRTET (泰国国家铁路电气化列车)',
                terminusTH: 'กรุงเทพอภิวัฒน์ ↔ ตลิ่งชัน (4 สถานี)',
                terminusEN: 'Krung Thep Aphiwat ↔ Taling Chan (4 Stations)',
                terminusZH: '曼谷阿披瓦中央车站 ↔ 大铃昌 (4 个车站)',
                minFare: 12,
                maxFare: 20,
                pricingModelTH: 'นโยบาย 20 บาทตลอดสาย (สูงสุดไม่เกิน ฿20)',
                pricingModelEN: 'Flat 20 Baht Policy (Capped at ฿20 max)',
                pricingModelZH: '全线 20 泰铢封顶（最高不超过 ฿20）',
                ticketsTH: 'เหรียญโดยสาร (Token), บัตร SRTET, บัตร EMV Contactless',
                ticketsEN: 'Single Journey Token, SRTET Card, EMV Contactless',
                ticketsZH: '单程代币 (Token), SRTET卡, EMV Contactless',
                firstTrainTH: '05:00 นาที',
                firstTrainEN: '05:00',
                firstTrainZH: '05:00',
                lastTrainTH: '24:00 นาที',
                lastTrainEN: '24:00',
                lastTrainZH: '24:00',
                peakFreqTH: '20.00 นาที',
                peakFreqEN: '20.00 min',
                peakFreqZH: '20.00 分钟',
                offPeakFreqTH: '30.00 นาที',
                offPeakFreqEN: '30.00 min',
                offPeakFreqZH: '30.00 分钟',
                dir1: { code: 'RW04', toTH: 'ตลิ่งชัน', toEN: 'Taling Chan', toZH: '大铃昌', first: '05:00', last: '24:00' },
                dir2: { code: 'RW01', toTH: 'กรุงเทพอภิวัฒน์', toEN: 'Krung Thep Aphiwat', toZH: '曼谷阿披瓦', first: '05:00', last: '24:00' }
            },
            {
                id: 104,
                nameTH: 'ARL แอร์พอร์ต ลิงก์', nameZH: 'ARL 机场快线',
                nameEN: 'ARL Airport Rail Link',
                color: '#8A1538',
                operatorTH: 'รถไฟฟ้า ร.ฟ.ท. (เอเชีย เอรา วัน)',
                operatorEN: 'SRT Electrified Train (Asia Era One)',
                operatorZH: '亚洲第一快铁 (Asia Era One) / 泰国国家铁路',
                terminusTH: 'พญาไท ↔ สุวรรณภูมิ (8 สถานี)',
                terminusEN: 'Phaya Thai ↔ Suvarnabhumi (8 Stations)',
                terminusZH: '披耶泰 ↔ 素万那普机场 (8 个车站)',
                minFare: 15,
                maxFare: 45,
                pricingModelTH: 'คำนวณตามระยะทาง (฿15 - ฿45)',
                pricingModelEN: 'Distance-based tariff (฿15 - ฿45)',
                pricingModelZH: '按里程计费（฿15 - ฿45）',
                ticketsTH: 'เหรียญโดยสาร (Smart Token), บัตร Smart Pass ARL',
                ticketsEN: 'Smart Token, ARL Smart Pass Card',
                ticketsZH: '智能代币 (Smart Token), ARL Smart Pass 乘车卡',
                firstTrainTH: '05:30 นาที',
                firstTrainEN: '05:30',
                firstTrainZH: '05:30',
                lastTrainTH: '24:00 นาที',
                lastTrainEN: '24:00',
                lastTrainZH: '24:00',
                peakFreqTH: '9.00 นาที',
                peakFreqEN: '9.00 min',
                peakFreqZH: '9.00 分钟',
                offPeakFreqTH: '10.00 - 15.00 นาที',
                offPeakFreqEN: '10.00 - 15.00 min',
                offPeakFreqZH: '10.00 - 15.00 分钟',
                dir1: { code: 'A1', toTH: 'สุวรรณภูมิ', toEN: 'Suvarnabhumi Airport', toZH: '素万那普机场', first: '05:30', last: '24:00' },
                dir2: { code: 'A8', toTH: 'พญาไท', toEN: 'Phaya Thai', toZH: '披耶泰', first: '05:30', last: '24:00' }
            },
            {
                id: 201,
                nameTH: 'BRT', nameZH: 'BRT',
                nameEN: 'BRT',
                color: '#82C341',
                operatorTH: 'กทม. / ระบบรถโดยสารด่วนพิเศษ BRT',
                operatorEN: 'BMA / Bangkok BRT Express Bus',
                operatorZH: '曼谷市政府 (BMA) / BRT 快速公交',
                terminusTH: 'สาทร ↔ ราชพฤกษ์ (12 สถานี)',
                terminusEN: 'Sathorn ↔ Ratchaphruek (12 Stations)',
                terminusZH: '沙吞 ↔ 叻差普 (12 个车站)',
                minFare: 15,
                maxFare: 15,
                pricingModelTH: 'ค่าโดยสารอัตราเดียว 15 บาทตลอดสาย (ผู้สูงอายุ 8 บาท)',
                pricingModelEN: 'Flat Rate ฿15 regardless of distance (Senior ฿8)',
                pricingModelZH: '全线单一票价 15 泰铢（长者 8 泰铢）',
                ticketsTH: 'บัตร Rabbit, บัตรโดยสารเที่ยวเดียว',
                ticketsEN: 'Rabbit Card, Single Journey Ticket',
                ticketsZH: '兔子卡 (Rabbit Card), 单程票',
                firstTrainTH: '06:00 นาที',
                firstTrainEN: '06:00',
                firstTrainZH: '06:00',
                lastTrainTH: '24:00 นาที',
                lastTrainEN: '24:00',
                lastTrainZH: '24:00',
                peakFreqTH: '5.00 - 7.00 นาที',
                peakFreqEN: '5.00 - 7.00 min',
                peakFreqZH: '5.00 - 7.00 分钟',
                offPeakFreqTH: '10.00 - 15.00 นาที',
                offPeakFreqEN: '10.00 - 15.00 min',
                offPeakFreqZH: '10.00 - 15.00 分钟',
                dir1: { code: 'B12', toTH: 'ราชพฤกษ์', toEN: 'Ratchaphruek', toZH: '叻差普', first: '06:00', last: '24:00' },
                dir2: { code: 'B1', toTH: 'สาทร', toEN: 'Sathorn', toZH: '沙吞', first: '06:00', last: '24:00' }
            },
            {
                id: 106,
                nameTH: 'MRT สายสีส้ม (ยังไม่เปิดให้บริการ)', nameZH: 'MRT 橙线 (尚未开通)',
                nameEN: 'MRT Orange Line (Not in Service)',
                color: '#F58220',
                operatorTH: 'BEM / รฟม. (ยังไม่เปิดให้บริการ)',
                operatorEN: 'BEM / MRTA (Not in Service)',
                operatorZH: 'BEM / 泰国大众捷运局 (尚未开通运营)',
                terminusTH: 'บางขุนนนท์ ↔ แยกร่มเกล้า (ยังไม่เปิดให้บริการ)',
                terminusEN: 'Bang Khun Non ↔ Yaek Rom Klao (Not in Service)',
                terminusZH: '挽坤暖 ↔ 耶隆高 (尚未开通运营)',
                minFare: '-',
                maxFare: '-',
                pricingModelTH: 'ยังไม่เปิดให้บริการเดินรถแก่ประชาชน',
                pricingModelEN: 'Not yet opened for commercial service',
                pricingModelZH: '尚未向公众开放商业客运运营',
                ticketsTH: 'ยังไม่เปิดให้บริการ',
                ticketsEN: 'Not in service',
                ticketsZH: '尚未开通运营',
                firstTrainTH: 'ยังไม่เปิดให้บริการ',
                firstTrainEN: 'Not in service',
                firstTrainZH: '尚未开通运营',
                lastTrainTH: 'ยังไม่เปิดให้บริการ',
                lastTrainEN: 'Not in service',
                lastTrainZH: '尚未开通运营',
                peakFreqTH: 'ยังไม่เปิดให้บริการ',
                peakFreqEN: 'Not in service',
                peakFreqZH: '尚未开通运营',
                offPeakFreqTH: 'ยังไม่เปิดให้บริการ',
                offPeakFreqEN: 'Not in service',
                offPeakFreqZH: '尚未开通运营',
                dir1: { code: 'OR28', toTH: 'แยกร่มเกล้า (ยังไม่เปิดให้บริการ)', toEN: 'Yaek Rom Klao (Not in Service)', toZH: '耶隆高 (尚未开通)', first: '-', last: '-' },
                dir2: { code: 'OR01', toTH: 'บางขุนนนท์ (ยังไม่เปิดให้บริการ)', toEN: 'Bang Khun Non (Not in Service)', toZH: '挽坤暖 (尚未开通)', first: '-', last: '-' }
            }
        ];

        const BTS_STATION_FARES = [
            { stnTH: '1 สถานี', stnEN: '1 Station', stnZH: '1 站', adult: 17, student: 12, senior: 9 },
            { stnTH: '2 สถานี', stnEN: '2 Stations', stnZH: '2 站', adult: 25, student: 18, senior: 13 },
            { stnTH: '3 สถานี', stnEN: '3 Stations', stnZH: '3 站', adult: 28, student: 20, senior: 14 },
            { stnTH: '4 สถานี', stnEN: '4 Stations', stnZH: '4 站', adult: 32, student: 23, senior: 16 },
            { stnTH: '5 สถานี', stnEN: '5 Stations', stnZH: '5 站', adult: 35, student: 25, senior: 18 },
            { stnTH: '6 สถานี', stnEN: '6 Stations', stnZH: '6 站', adult: 40, student: 28, senior: 20 },
            { stnTH: '7 สถานี', stnEN: '7 Stations', stnZH: '7 站', adult: 43, student: 30, senior: 22 },
            { stnTH: '8 สถานีขึ้นไป', stnEN: '8+ Stations', stnZH: '8 站以上', adult: 47, student: 33, senior: 24 },
            { stnTH: 'ส่วนต่อขยาย (Extensions)', stnEN: 'Extensions', stnZH: '延伸段 (Extensions)', adult: '+15', student: '+15', senior: '+8' }
        ];

        const MRT_BLUE_FARES = [
            { stnTH: '1 สถานี', stnEN: '1 Station', stnZH: '1 站', adult: 17, student: 15, senior: 9 },
            { stnTH: '2 - 3 สถานี', stnEN: '2 - 3 Stations', stnZH: '2 - 3 站', adult: '20 - 23', student: '18 - 21', senior: '10 - 12' },
            { stnTH: '4 - 6 สถานี', stnEN: '4 - 6 Stations', stnZH: '4 - 6 站', adult: '26 - 31', student: '23 - 28', senior: '13 - 16' },
            { stnTH: '7 - 9 สถานี', stnEN: '7 - 9 Stations', stnZH: '7 - 9 站', adult: '33 - 38', student: '30 - 34', senior: '17 - 19' },
            { stnTH: '10 - 12 สถานีขึ้นไป', stnEN: '10 - 12+ Stations', stnZH: '10 - 12 站以上', adult: '41 - 43', student: '37 - 39', senior: '21 - 22' }
        ];

        const MONORAIL_FARES = [
            { stnTH: '1 สถานี', stnEN: '1 Station', stnZH: '1 站', price: '฿15 - ฿18', adult: '15 - 18', student: '15 - 18', senior: '8 - 9' },
            { stnTH: '2 - 4 สถานี', stnEN: '2 - 4 Stations', stnZH: '2 - 4 站', price: '฿21 - ฿28', adult: '21 - 28', student: '21 - 28', senior: '11 - 14' },
            { stnTH: '5 - 8 สถานี', stnEN: '5 - 8 Stations', stnZH: '5 - 8 站', price: '฿31 - ฿37', adult: '31 - 37', student: '31 - 37', senior: '16 - 19' },
            { stnTH: '9 สถานีขึ้นไป', stnEN: '9+ Stations', stnZH: '9 站以上', price: '฿40 - ฿45', adult: '40 - 45', student: '40 - 45', senior: '20 - 23' }
        ];

        const ARL_STATION_FARES = [
            { code: 'A8', th: 'พญาไท', en: 'Phaya Thai', zh: '披耶泰', price: '-' },
            { code: 'A7', th: 'ราชปรารภ', en: 'Ratchaprarop', zh: '叻猜巴罗', price: '฿15' },
            { code: 'A6', th: 'มักกะสัน (เชื่อม MRT เพชรบุรี)', en: 'Makkasan (MRT Phetchaburi)', zh: '目甲讪 (换乘 MRT 碧武里)', price: '฿20' },
            { code: 'A5', th: 'รามคำแหง', en: 'Ramkhamhaeng', zh: '兰甘亨', price: '฿25' },
            { code: 'A4', th: 'หัวหมาก (เชื่อม MRT สีเหลือง)', en: 'Hua Mak (MRT Yellow)', zh: '华目 (换乘 MRT 黄线)', price: '฿30' },
            { code: 'A3', th: 'บ้านทับช้าง', en: 'Ban Thap Chang', zh: '班塔昌', price: '฿35' },
            { code: 'A2', th: 'ลาดกระบัง', en: 'Lat Krabang', zh: '拉甲邦', price: '฿40' },
            { code: 'A1', th: 'สุวรรณภูมิ (สนามบิน)', en: 'Suvarnabhumi Airport', zh: '素万那普机场', price: '฿45' }
        ];

        function formatLineTitleWithTag(fullName, lineColor, variant = 'hero') {
            if (!fullName) return '';
            const s = String(fullName).trim();
            let mainClass = 'line-hero-main-name';
            let tagClass = 'line-hero-royal-tag';
            if (variant === 'card') {
                mainClass = 'line-card-main-name';
                tagClass = 'line-card-royal-tag';
            } else if (variant === 'frame') {
                mainClass = 'line-frame-main-name';
                tagClass = 'line-frame-royal-tag';
            }
            // 1. Check for " | (Royal Name)" or " | Royal Name"
            const pipeMatch = s.match(/^(.*?)\s*\|\s*\(?(.*?)\)?$/);
            if (pipeMatch) {
                const main = esc(pipeMatch[1].trim());
                const tag = esc(pipeMatch[2].trim());
                return `<span class="${mainClass}">${main}</span><span class="${tagClass}" style="color:${lineColor};border:1px solid ${lineColor}55;background:${lineColor}18;">${tag}</span>`;
            }
            // 2. Check for " (Note)" like Orange Line
            const parenMatch = s.match(/^(.*?)\s*\((.*?)\)$/);
            if (parenMatch) {
                const main = esc(parenMatch[1].trim());
                const tag = esc(parenMatch[2].trim());
                return `<span class="${mainClass}">${main}</span><span class="${tagClass}" style="color:${lineColor};border:1px solid ${lineColor}55;background:${lineColor}18;">${tag}</span>`;
            }
            return `<span class="${mainClass}">${esc(s)}</span>`;
        }

        function renderLineFilterBar(activeLineId, onClickHandlerName, barId = '') {
            const idAttr = barId ? `id="${barId}"` : '';
            return `<div ${idAttr} class="line-filter-bar" data-lang="${lang}">
                ${TRANSIT_LINES_CATALOG.map(l => {
                    const isActive = l.id === activeLineId;
                    const isBrt = l.id === 201;
                    const name = getLineOptLabel(l);
                    const activeStyle = isActive
                        ? (isBrt ? '' : `background:${l.color};color:#ffffff;border-color:${l.color};font-weight:700;box-shadow:0 3px 10px ${l.color}55;`)
                        : '';
                    return `<button type="button" class="line-filter-pill ${isBrt ? 'tab-brt' : ''} ${isActive ? 'active' : ''}"
                        data-line-id="${l.id}"
                        style="${activeStyle}"
                        onclick="App.${onClickHandlerName}(${l.id})">
                        <span class="pill-icon" style="display:inline-flex;align-items:center;">${getLineIconSvg(l.id, isActive, 15)}</span>
                        <span>${esc(name)}</span>
                    </button>`;
                }).join('')}
            </div>`;
        }

        function scrollContainerChildToCenter(container, child, smooth = true) {
            if (!container || !child) return;
            if (container.clientWidth <= 0) return;
            const containerRect = container.getBoundingClientRect();
            const childRect = child.getBoundingClientRect();
            if (childRect.width === 0 && child.offsetWidth === 0) return;
            const currentScroll = container.scrollLeft;
            const childContentLeft = (childRect.left - containerRect.left) + currentScroll;
            const childWidth = child.offsetWidth || childRect.width;
            const target = childContentLeft - (container.clientWidth / 2) + (childWidth / 2);
            const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);
            const clampedTarget = Math.max(0, Math.min(maxScroll, Math.round(target)));
            if (smooth && typeof container.scrollTo === 'function') {
                container.scrollTo({
                    left: clampedTarget,
                    behavior: 'smooth'
                });
            } else {
                container.scrollLeft = clampedTarget;
            }
        }

        function scrollActivePillIntoView(container, pill, smooth = true) {
            scrollContainerChildToCenter(container, pill, smooth);
        }

        function getLineScheduleTables(lineId) {
            const we = isWeekend();
            if (lineId === 1 || lineId === 2) {
                const data = getBtsFreqData(lineId);
                if (!data) return null;
                return {
                    weekday: buildBtsFreqRows(data.weekday, !we),
                    weekend: buildBtsFreqRows(data.weekend, we),
                    note: lineId === 1 ? (lang === 'zh' ? '* 莫奇–三隆 · ** 三隆–凯哈 及 莫奇–库括' : (lang === 'en' ? '* Mo Chit–Samrong · ** Samrong–Kheha and Mo Chit–Khu Khot' : '* หมอชิต–สำโรง · ** สำโรง–เคหะฯ และ หมอชิต–คูคต')) : ''
                };
            }
            const t = getMrtFreqTable(lineId);
            if (!t) return null;
            let note = '';
            if (lineId === 103) {
                note = lang === 'zh' ? '* 塔尼拉塔雅线 (兰实) 每 10-20 分钟' : (lang === 'en' ? '* Thani Ratthaya Line (Rangsit) every 10-20 min' : '* สายธานีรัถยา (รังสิต) ทุก 10-20 นาที');
            } else if (lineId === 105) {
                note = lang === 'zh' ? '* 那空威提线 (大林江) 每 20-30 分钟' : (lang === 'en' ? '* Nakhon Withi Line (Taling Chan) every 20-30 min' : '* สายนครวิถี (ตลิ่งชัน) ทุก 20-30 นาที');
            } else if (lineId === 101) {
                note = lang === 'zh' ? '* 07:00–09:00 期间挽赐–塔帕–拉颂区间按官方发车时刻运行' : (lang === 'en' ? '* Inner Circle (Bang Sue ↔ Tha Phra) / Outer Loop' : '* ช่วง 07:00–09:00 ช่วงบางซื่อ–ท่าพระ–หลักสอง ความถี่ตามตารางทางการ');
            }
            return {
                weekday: t.weekday || [],
                weekend: t.weekend || [],
                note
            };
        }

        function renderFrequencyTablesHtml(sched, activeLine, activeTab) {
            if (!sched || (!sched.weekday.length && !sched.weekend.length)) return '';
            const isEn = lang === 'en';
            const isZh = lang === 'zh';
            const we = isWeekend();
            const line = activeLine || (App && App.timetablesActiveLine ? TRANSIT_LINES_CATALOG.find(l => l.id === App.timetablesActiveLine) : null) || { color: '#16a34a', id: 1 };
            const lineColor = line.color || '#16a34a';
            const curTab = activeTab || (App && App.freqTab) || (we ? 'weekend' : 'weekday');

            const formatTimeCell = (r) => {
                const parts = String(r.timeStr || '').split('–');
                const t1 = parts[0] ? parts[0].trim() : '';
                const t2 = parts[1] ? parts[1].trim() : '';
                return `
                    <div class="freq-time-cell">
                        <span class="freq-time-range">
                            <span>${esc(t1)}</span>
                            ${t2 ? `<span style="color:var(--muted);margin:0 2px;">–</span><span>${esc(t2)}</span>` : ''}
                        </span>
                        ${r.isCurrent ? `
                            <span class="freq-live-now-tag">
                                <span class="freq-pulse-dot"></span>
                                <span>${isZh ? '当前' : (isEn ? 'NOW' : 'ขณะนี้')}</span>
                            </span>
                        ` : ''}
                    </div>
                `;
            };

            const formatFreqCell = (r) => {
                const raw = String(r.freqLabel || '').trim();
                // BTS Sukhumvit peak hours with dual segments (* and **)
                if (raw.includes('*') && raw.includes('/')) {
                    const splitted = raw.split('/').map(s => s.trim());
                    const p1 = splitted[0].replace(/\*/g, '').trim();
                    const p2 = splitted[1].replace(/\*/g, '').trim();
                    return `
                        <div class="freq-dual-box">
                            <div class="freq-dual-pill">
                                <span class="freq-dual-tag core" style="background:${lineColor}22;color:${lineColor}">
                                    ${isZh ? '核心区段 (莫奇–三隆)' : (isEn ? 'Core (Mo Chit–Samrong)' : 'สายหลัก (หมอชิต–สำโรง)')}
                                </span>
                                <span class="freq-dual-val">~${esc(p1)} <span class="freq-unit">${isZh ? '分钟' : (isEn ? 'min' : 'นาที')}</span></span>
                            </div>
                            <div class="freq-dual-pill">
                                <span class="freq-dual-tag ext">
                                    ${isZh ? '延伸区段 (库阔/壳哈)' : (isEn ? 'Ext. (Khu Khot / Kheha)' : 'ส่วนต่อขยาย (คูคต/เคหะฯ)')}
                                </span>
                                <span class="freq-dual-val">~${esc(p2)} <span class="freq-unit">${isZh ? '分钟' : (isEn ? 'min' : 'นาที')}</span></span>
                            </div>
                        </div>
                    `;
                }

                const clean = raw.replace(/^~/, '').trim();
                return `
                    <div class="freq-single-pill">
                        <span class="freq-prefix">${isZh ? '约每 ~' : (isEn ? 'Every ~' : 'ทุก ~')}</span>
                        <b style="font-size:13.5px;color:var(--ink);letter-spacing:-0.2px;">${esc(clean)}</b>
                        <span class="freq-unit">${isZh ? '分钟' : (isEn ? 'min' : 'นาที')}</span>
                    </div>
                `;
            };

            const buildTable = (rows, title, isToday) => {
                if (!rows || !rows.length) return '';
                return `
                    <div style="margin-bottom:12px;">
                        <div class="mrt-freq-daytype">
                            <span>${title}</span>
                            ${isToday ? `<span class="freq-today-badge"><span class="live-dot" style="width:6px;height:6px;margin:0 4px 0 0;display:inline-block;"></span>${isZh ? '今日' : (isEn ? 'Today' : 'วันนี้')}</span>` : ''}
                        </div>
                        <div class="mrt-freq-table-container">
                            <table class="mrt-freq-table">
                                <thead>
                                    <tr>
                                        <th>${getUiIcon('clock', 13, 'currentColor')} ${isZh ? '运营时段' : (isEn ? 'Service Hours' : 'ช่วงเวลาให้บริการ')}</th>
                                        <th>${getUiIcon('timer', 13, 'currentColor')} ${isZh ? '发车频次/间隔' : (isEn ? 'Train Frequency' : 'ความถี่ขบวนรถ')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${rows.map(r => `
                                        <tr class="${r.isCurrent ? 'now' : ''}">
                                            <td>${formatTimeCell(r)}</td>
                                            <td>${formatFreqCell(r)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
            };

            const weekdayTitle = `${getUiIcon('calendar', 14, 'currentColor')} ${isZh ? '周一至周五 (工作日)' : (isEn ? 'Monday – Friday (Weekday)' : 'วันจันทร์ – ศุกร์ (วันธรรมดา)')}`;
            const weekendTitle = `${getUiIcon('calendar', 14, 'currentColor')} ${isZh ? '周六、周日及法定节假日' : (isEn ? 'Saturday – Sunday & Public Holidays' : 'วันเสาร์ – อาทิตย์ และวันหยุดนักขัตฤกษ์')}`;

            let tablesContentHtml = '';
            if (curTab === 'weekday') {
                tablesContentHtml = buildTable(sched.weekday, weekdayTitle, !we);
            } else if (curTab === 'weekend') {
                tablesContentHtml = buildTable(sched.weekend, weekendTitle, we);
            } else {
                tablesContentHtml = `
                    ${buildTable(sched.weekday, weekdayTitle, !we)}
                    ${buildTable(sched.weekend, weekendTitle, we)}
                `;
            }

            return `
                <!-- Day Type Segmented Tab Switcher -->
                <div class="freq-tab-bar">
                    <button type="button" class="freq-tab-btn ${curTab === 'weekday' ? 'active' : ''}" onclick="App.setFreqTab('weekday')">
                        <span class="freq-tab-icon">${getUiIcon('calendar', 12, 'currentColor')}</span>
                        <span class="freq-tab-lbl">
                            <span class="lbl-full">${isZh ? '工作日 (周一至五)' : (isEn ? 'Weekday (Mon–Fri)' : 'วันธรรมดา (จ.-ศ.)')}</span>
                            <span class="lbl-short">${isZh ? '工作日' : (isEn ? 'Weekday' : 'วันธรรมดา')}</span>
                        </span>
                        ${!we ? `<span class="freq-today-badge">${isZh ? '今日' : (isEn ? 'Today' : 'วันนี้')}</span>` : ''}
                    </button>
                    <button type="button" class="freq-tab-btn ${curTab === 'weekend' ? 'active' : ''}" onclick="App.setFreqTab('weekend')">
                        <span class="freq-tab-icon">${getUiIcon('calendar', 12, 'currentColor')}</span>
                        <span class="freq-tab-lbl">
                            <span class="lbl-full">${isZh ? '周末与节假日 (周六日)' : (isEn ? 'Weekend (Sat–Sun)' : 'วันหยุด (ส.-อา.)')}</span>
                            <span class="lbl-short">${isZh ? '周末/假日' : (isEn ? 'Weekend' : 'วันหยุด')}</span>
                        </span>
                        ${we ? `<span class="freq-today-badge">${isZh ? '今日' : (isEn ? 'Today' : 'วันนี้')}</span>` : ''}
                    </button>
                    <button type="button" class="freq-tab-btn ${curTab === 'all' ? 'active' : ''}" onclick="App.setFreqTab('all')">
                        <span class="freq-tab-icon">${getUiIcon('check', 12, 'currentColor')}</span>
                        <span class="freq-tab-lbl">
                            <span class="lbl-full">${isZh ? '显示全部' : (isEn ? 'Show Both' : 'แสดงทั้งหมด')}</span>
                            <span class="lbl-short">${isZh ? '全部' : (isEn ? 'Both' : 'ทั้งหมด')}</span>
                        </span>
                    </button>
                </div>

                ${tablesContentHtml}

                ${sched.note ? `
                    <div class="mrt-freq-note-card" style="border-left:3px solid ${lineColor};">
                        <span class="note-icon">${getUiIcon('bulb', 14, '#f59e0b')}</span>
                        <div style="flex:1;min-width:0;word-break:break-word;">
                            <b style="color:var(--ink);">${isZh ? '运营备注:' : (isEn ? 'Operating Note:' : 'หมายเหตุการเดินรถ:')}</b>
                            <span style="color:var(--muted);margin-left:4px;">${esc(sched.note)}</span>
                        </div>
                    </div>
                ` : ''}
            `;
        }

        function getLineStationsList(lineId) {
            const targetId = Number(lineId);
            if (!targetId) return [];
            const all = typeof allJourneyLines === 'function' ? allJourneyLines() : [];
            const found = all.find(l => l && Number(l.LineId) === targetId);
            if (found && Array.isArray(found.StationList) && found.StationList.length > 0) {
                return found.StationList;
            }
            const appLines = (typeof App !== 'undefined' && App && Array.isArray(App.lines) && App.lines.length)
                ? App.lines
                : (typeof FALLBACK_STATION_LIST !== 'undefined' ? FALLBACK_STATION_LIST : []);
            const bts = appLines.find(l => l && Number(l.LineId) === targetId);
            if (bts && Array.isArray(bts.StationList) && bts.StationList.length > 0) {
                return bts.StationList;
            }
            const mrt = (typeof MRT_STATIC_DB !== 'undefined' && MRT_STATIC_DB.lines || []).find(l => l && Number(l.LineId) === targetId);
            if (mrt && Array.isArray(mrt.StationList)) {
                return mrt.StationList;
            }
            return [];
        }

        /* ---------- MAP STATION COORDINATES (12 LINES OVERLAY) ---------- */
        const MAP_STATION_HOTSPOTS = {
    // BTS Sukhumvit Line
    CEN: [850.39, 1020.47, 9.92], E1: [892.9, 1020.48, 8.51], E2: [926.88, 1020.48, 8.51],
    E3: [961, 1020.48, 8.51], E4: [994.99, 1020.5, 8.51], E5: [1029.7, 1020.5, 8.51],
    E6: [1068.67, 1020.5, 8.51], E7: [1102.65, 1030.24, 8.51], E8: [1126.37, 1048.83, 8.51],
    E9: [1142.37, 1074.75, 8.51], E10: [1148.04, 1105.52, 8.51], E11: [1148.04, 1139.53, 8.51],
    E12: [1148.04, 1173.55, 8.51], E13: [1148.04, 1207.57, 8.51], E14: [1148.04, 1241.58, 8.51],
    E15: [1148.04, 1275.6, 8.51], E16: [1148.04, 1307.49, 8.51], E17: [1148.04, 1339.38, 8.51],
    E18: [1148.04, 1371.27, 8.51], E19: [1148.04, 1403.16, 8.51], E20: [1148.04, 1435.05, 8.51],
    E21: [1148.04, 1466.94, 8.51], E22: [1148.04, 1498.83, 8.51], E23: [1148.04, 1530.72, 8.51],
    N1: [836.23, 958.12, 8.51], N2: [836.23, 895.75, 8.51], N3: [836.23, 864, 8.51],
    N4: [836.23, 832.25, 8.51], N5: [836.23, 800.5, 8.51], N7: [836.23, 737, 8.51],
    N8: [836.23, 708.66, 8.51], N9: [836.23, 666.66, 8.51], N10: [836.23, 623.61, 8.51],
    N11: [836.23, 585.35, 8.51], N12: [836.23, 547.88, 8.51], N13: [836.23, 510.32, 8.51],
    N14: [836.23, 475.31, 8.51], N15: [836.23, 441.3, 8.51], N16: [836.23, 407.08, 8.51],
    N17: [836.23, 368.51, 7.5], N18: [836.23, 312, 8.51], N19: [845.59, 275.8, 8.51],
    N20: [871.66, 248.03, 8.51], N21: [900, 219.69, 8.51], N22: [928.36, 191.34, 8.51],
    N23: [956.84, 163, 8.51], N24: [1006.31, 141.73, 8.51],
    // BTS Silom Line
    S1: [864.56, 1063, 8.51], S2: [864.59, 1124.74, 8.51], S3: [863.48, 1162.21, 8.51],
    S4: [851.18, 1193.88, 8.51], S5: [820.15, 1222.71, 8.51], S6: [779.63, 1233.04, 8.51],
    S7: [709.73, 1233.04, 8.51], S8: [644.88, 1233.04, 8.51], S9: [581.21, 1233.04, 8.51],
    S10: [524.39, 1233.04, 8.51], S11: [467.86, 1218.9, 8.51], S12: [434.31, 1184.9, 8.51],
    W1: [792.25, 1020.48, 8.51],
    // BTS Gold Line
    G1: [716.11, 1218.9, 8.51], G2: [711.06, 1190.61, 8.51], G3: [677.49, 1156.54, 8.51],
    // MRT Yellow Line
    YL01: [921.27, 659.74, 8.51], YL02: [977.96, 665.91, 8.51], YL03: [1034.04, 665.91, 8.51],
    YL04: [1091.35, 665.91, 8.51], YL05: [1147.41, 665.91, 8.51], YL06: [1203.78, 665.91, 8.51],
    YL07: [1261.42, 675.76, 8.51], YL08: [1295.44, 702.24, 8.51], YL09: [1318.04, 761.53, 8.51],
    YL10: [1318.12, 814.37, 8.51], YL11: [1318.12, 918.42, 8.51], YL12: [1318.12, 954.86, 8.51],
    YL13: [1318.12, 991.29, 8.51], YL14: [1318.12, 1027.73, 8.51], YL15: [1318.12, 1064.16, 8.51],
    YL16: [1318.12, 1100.6, 8.51], YL17: [1318.12, 1137.03, 8.51], YL18: [1318.12, 1173.46, 8.51],
    YL19: [1308.57, 1218.9, 8.51], YL20: [1284.1, 1251.18, 8.51], YL21: [1252.01, 1269.93, 8.51],
    YL22: [1210.4, 1275.6, 8.51], YL23: [1166.46, 1275.6, 8.51],
    // MRT Pink Line
    MT01: [524.36, 297.19, 8.51], MT02: [524.36, 269.3, 8.51], PK01: [496.06, 515.9, 8.51],
    PK02: [477.07, 491.23, 8.51], PK03: [453, 466.96, 8.51], PK04: [428.19, 442.2, 8.51],
    PK05: [411.02, 415.5, 8.51], PK06: [411.02, 383.36, 8.51], PK07: [439.07, 368.5, 8.51],
    PK08: [479.87, 368.5, 8.51], PK09: [520.37, 368.5, 8.51], PK10: [560.12, 363.34, 9],
    PK11: [601.36, 368.5, 8.51], PK12: [641.85, 368.5, 8.51], PK13: [682.35, 368.5, 8.51],
    PK14: [745.73, 368.5, 8.51], PK15: [790.87, 368.5, 8.51], PK16: [850.4, 368.51, 7.5],
    PK17: [892.77, 368.5, 8.51], PK18: [949.75, 368.5, 8.51], PK19: [1006.16, 368.5, 8.51],
    PK20: [1062.57, 368.5, 8.51], PK21: [1119.69, 368.5, 8.51], PK22: [1173.55, 368.5, 8.51],
    PK23: [1227.41, 368.5, 8.51], PK24: [1281.74, 368.5, 8.51], PK25: [1335.12, 368.5, 8.51],
    PK26: [1393.13, 386.82, 8.51], PK27: [1423.86, 417.56, 8.51], PK28: [1454.63, 448.25, 8.51],
    PK29: [1485.38, 478.94, 8.51], PK30: [1516.53, 510.24, 8.51],
    // MRT Purple Line
    PP01: [136.06, 470.59, 8.51], PP02: [136.06, 504.56, 8.51], PP03: [155.91, 538.59, 8.51],
    PP04: [197.72, 538.59, 8.51], PP05: [241.04, 538.59, 8.51], PP06: [283.46, 538.59, 8.51],
    PP07: [326.05, 538.59, 8.51], PP08: [371.34, 538.59, 8.51], PP09: [411.02, 538.59, 8.51],
    PP10: [453.25, 538.59, 8.51], PP11: [496.06, 538.59, 8.51], PP12: [545.46, 552.68, 8.51],
    PP13: [578.63, 585.8, 8.51], PP14: [605.25, 623.63, 8.51], PP15: [609.46, 680.31, 8.51],
    PP16: [616.54, 737, 7.51],
    // MRT Blue Line
    BL01: [471.78, 1129.77, 8.51], BL02: [443.26, 1088.04, 8.51], BL03: [439.34, 1028.63, 8.51],
    BL04: [439.38, 969.24, 8.51], BL05: [439.34, 909.85, 8.51], BL06: [439.34, 850.45, 8.51],
    BL07: [442.2, 800.13, 8.51], BL08: [464.25, 761.81, 8.51], BL09: [524.49, 737, 8.51],
    BL10: [602.36, 737, 7.51], BL11: [688.09, 737, 8.51], BL12: [779.55, 733.59, 8.51],
    BL13: [818.9, 708.66, 8.51], BL14: [864.56, 680, 8.51], BL15: [921.25, 677.49, 8.51],
    BL16: [970.87, 693.7, 8.51], BL17: [998.01, 725.95, 8.51], BL18: [1006.3, 765.39, 8.51],
    BL19: [1004.88, 807.99, 7.51], BL20: [1006.3, 850.25, 8.51], BL21: [1006.3, 921.26, 8.51],
    BL22: [1006.3, 1003.05, 8.51], BL23: [994.99, 1065.25, 8.51], BL24: [966.98, 1094.99, 8.51],
    BL25: [921.22, 1108.35, 8.51], BL26: [850.39, 1108.35, 8.51], BL27: [792.25, 1108.95, 8.51],
    BL28: [722.84, 1091.59, 8.51], BL29: [666.14, 1052.06, 8.51], BL30: [609.46, 1050.36, 7.51],
    BL31: [549.92, 1057.79, 8.51], BL32: [503.98, 1097.46, 8.51], BL33: [444.96, 1156.47, 8.51],
    BL34: [416.7, 1184.9, 8.51], BL35: [368.17, 1204.59, 8.51], BL36: [326.05, 1204.59, 8.51],
    BL37: [283.46, 1204.59, 8.51], BL38: [240.94, 1204.59, 8.51],
    // SRT Dark Red Line
    RN01: [724.68, 737.09, 6.5], RN02: [722.72, 651.98, 8.51], RN03: [722.72, 586, 8.51],
    RN04: [722.72, 510.32, 8.51], RN05: [722.72, 441.11, 8.51], RN06: [722.84, 368.5, 8.51],
    RN07: [722.72, 312, 8.51], RN08: [721.29, 254.94, 7.51], RN09: [722.72, 197.72, 8.51],
    RN10: [721.29, 141.73, 7.51],
    // SRT Light Red Line
    RW01: [712.64, 737.09, 6.5], RW02: [622.98, 663.53, 8.51], RW03: [374.95, 768.2, 8.51], RW04: [325.99, 849.03, 7.51],
    // Airport Rail Link
    A1: [1544.89, 961.21, 8.51], A2: [1516.54, 895.75, 8.51], A3: [1431.49, 895.75, 8.51],
    A4: [1335.12, 895.75, 8.51], A5: [1166.17, 895.75, 8.51], A6: [993.62, 895.75, 8.51],
    A7: [921.22, 895.75, 8.51], A8: [853.23, 895.75, 8.51],
    // Bangkok BRT
    B1: [882.13, 1166.13, 7.5], B2: [902.57, 1186.57, 6.0], B3: [918.13, 1202.27, 6.0],
    B4: [921.25, 1225.98, 6.0], B5: [921.2, 1255.7, 6.0], B6: [909.92, 1292.59, 6.0],
    B7: [875.76, 1326.61, 6.0], B8: [841.87, 1360.62, 6.0], B9: [779.46, 1377.63, 6.0],
    B10: [751.18, 1349.29, 6.0], B11: [734.17, 1332.28, 6.0], B12: [526.36, 1249.03, 7.5],
    // MRT Orange Line
    OR01: [424.48, 992.24, 7.5], OR02: [507.4, 992.24, 7.5], OR03: [552.53, 992.12, 7.5],
    OR04: [666.14, 992.12, 7.5], OR05: [739.84, 942.45, 7.5], OR06: [819.21, 942.45, 7.5],
    OR07: [873.07, 942.52, 7.5], OR08: [921.26, 913.02, 7.5], OR09: [921.24, 851.3, 7.5],
    OR10: [921.24, 828.22, 7.5], OR11: [949.6, 807.98, 7.5], OR12: [1004.88, 807.99, 7.5],
    OR13: [1062.99, 807.98, 7.5], OR14: [1119.68, 807.98, 7.5], OR15: [1166.16, 807.98, 7.5],
    OR16: [1219.07, 807.98, 7.5], OR17: [1261.75, 793.36, 7.5], OR18: [1286.92, 767.91, 7.5],
    OR19: [1312.57, 742.52, 7.5], OR20: [1338.08, 717.01, 7.5], OR21: [1366.1, 689.02, 7.5],
    OR22: [1392.78, 662.44, 7.5], OR23: [1420.15, 634.92, 7.5], OR24: [1446.85, 608.2, 7.5],
    OR25: [1474.01, 581.1, 7.5], OR26: [1500.44, 554.65, 7.5], OR27: [1530.7, 524.4, 7.5],
    OR28: [1561.07, 494.03, 7.5]
};

        /* ================= APP ================= */
        const App = {
            mapStationHotspots: MAP_STATION_HOTSPOTS,
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
            _simulatedDisruption: false, // จำลองเหตุขัดข้องเพื่อทดสอบประกาศ
            keyLines: {},         // StationKey -> [{lineId, color}] ทุกสายที่ผ่านสถานีนั้น
            journey: { open: false, from: null, to: null, loading: false, error: null, result: null, picking: null, pickerLine: 1, openRoute: 0 },
            locating: false,
            locError: null,
            refreshTimer: null,
            fallbackTimer: null,  // ตัวจับเวลา 10 วิ ก่อนใช้สถานีสำรอง (อโศก)


            /* ---------- THE SKYTRAINs: View Navigation & Map Modes ---------- */
            currentView: 'home',
            selectedMapStationKey: 'CEN',
            selectedExitKey: 'CEN',
            mapZoom: 1.0,
            mapMode: 'schematic', // 'schematic' | 'hybrid'
            geoMap: null,
            geoTileLayers: {},
            geoCurrentLayer: 'hybrid',
            geoStationMarkers: [],
            geoLinesGroup: null,
            geoMarkersGroup: null,
            geoUserMarker: null,
            geoAccuracyCircle: null,
            geoActiveLineFilter: 0,
            faresActiveLine: 0,
            timetablesActiveLine: 0,
            freqTab: null,

            switchView(viewName) {
                const validViews = ['home', 'map', 'planner', 'exits', 'fares', 'timetables', 'more'];
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
                    if (this.mapMode === 'hybrid') {
                        this.initGoogleHybridMap();
                        setTimeout(() => {
                            if (this.geoMap) this.geoMap.invalidateSize();
                        }, 80);
                    } else {
                        this.renderInteractiveMap();
                        this.updateMapTheme();
                        requestAnimationFrame(() => {
                            this.resetMapZoom(false);
                        });
                    }
                } else if (viewName === 'exits') {
                    const fallback = this.pinnedStation()?.StationKey || this.nearest?.station?.StationKey || 'CEN';
                    this.renderExitsView(this.selectedExitKey || fallback);
                } else if (viewName === 'planner') {
                    this.journey.open = true;
                    this.renderJourney();
                } else if (viewName === 'fares') {
                    this.renderFaresView();
                    requestAnimationFrame(() => {
                        const bar = document.getElementById('faresLineFilterBar');
                        const activePill = bar ? bar.querySelector('.line-filter-pill.active') : null;
                        if (bar && activePill) scrollActivePillIntoView(bar, activePill, false);
                    });
                } else if (viewName === 'timetables') {
                    this.renderTimetablesView();
                    requestAnimationFrame(() => {
                        const bar = document.getElementById('timetablesLineFilterBar');
                        const activePill = bar ? bar.querySelector('.line-filter-pill.active') : null;
                        if (bar && activePill) scrollActivePillIntoView(bar, activePill, false);
                    });
                } else if (viewName === 'more') {
                    this.renderMoreView();
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

            setFreqTab(tab) {
                this.freqTab = tab;
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
                        badge: lang === 'zh' ? '非常拥挤' : (lang === 'th' ? 'หนาแน่นมาก' : 'Very Crowded'),
                        color: '#ef4444',
                        advice: lang === 'zh' ? '客流量很大，可能需要多等 1-2 趟列车' : (lang === 'th' ? 'ผู้โดยสารหนาแน่น อาจต้องรอขบวนถัดไป 1-2 ขบวน' : 'High passenger volume. Expect a 1-2 train wait.')
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
                        badge: lang === 'zh' ? '拥挤' : (lang === 'th' ? 'หนาแน่น' : 'Crowded'),
                        color: '#ef4444',
                        advice: lang === 'zh' ? '客流量大，可能需要多等 1-2 趟列车' : (lang === 'th' ? 'ผู้โดยสารหนาแน่น อาจต้องรอขบวนถัดไป 1-2 ขบวน' : 'High passenger volume. Possible 1-2 train wait.')
                    };
                } else if (level === 'moderate') {
                    return {
                        level: 'moderate',
                        percent,
                        badge: lang === 'zh' ? '适中' : (lang === 'th' ? 'ปานกลาง' : 'Moderate'),
                        color: '#f59e0b',
                        advice: lang === 'zh' ? '客流适中，可舒适站立或就坐' : (lang === 'th' ? 'มีผู้โดยสารพอสมควร ยืนหรือนั่งได้สะดวก' : 'Moderate crowding. Seating or standing available.')
                    };
                } else {
                    return {
                        level: 'low',
                        percent,
                        badge: lang === 'th' ? 'คนน้อย / เดินทางสะดวก' : (lang === 'zh' ? '舒适 / 乘客较少' : 'Low / Comfortable'),
                        color: '#10b981',
                        advice: lang === 'th' ? 'ผู้โดยสารน้อย มีที่นั่งว่าง เดินทางสะดวกสบาย' : (lang === 'zh' ? '乘客较少，有空位，出行轻松舒适' : 'Low passenger volume. Plenty of seats available.')
                    };
                }
            },

            renderCrowdGauge(station) {
                if (!station) return '';
                const g = this.getCrowdLevel(station);
                const title = lang === 'zh' ? '车厢拥挤度' : (lang === 'th' ? 'ความหนาแน่นผู้โดยสาร' : 'Passenger Density');
                const statusDot = `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${g.color};box-shadow:0 0 6px ${g.color}66;margin-right:5px;vertical-align:middle;"></span>`;
                return `
                    <div class="crowd-gauge-card">
                        <div class="crowd-header">
                            <span class="crowd-title">${getUiIcon('users', 16, 'var(--primary,#0284c7)')} ${title}</span>
                            <span class="crowd-pill" style="background:${g.color}22;color:${g.color};border:1px solid ${g.color}55">
                                ${statusDot}${g.badge} (${g.percent}%)
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
                    const codeTextColor = '#ffffff';

                    const isBrt = line.LineId === 201;
                    const stationChips = stations.map(s => {
                        const isSelected = s.StationKey === curKey;
                        const name = stName(s);
                        const nameLen = name.length;
                        const sizeClass = nameLen > 20 ? 'chip-name-xxlong' : (nameLen > 15 ? 'chip-name-xlong' : (nameLen > 11 ? 'chip-name-long' : ''));
                        return `
                            <button type="button" class="station-picker-chip ${isSelected ? 'selected' : ''}"
                                onclick="App.selectExitStation('${esc(s.StationKey)}')">
                                <span class="chip-code ${isBrt ? 'chip-code-brt' : ''}" style="${isBrt ? '' : `background:${color};color:${codeTextColor}`}">${esc(s.StationKey)}</span>
                                <span class="chip-name ${sizeClass}" title="${esc(name)}">${esc(name)}</span>
                            </button>`;
                    }).join('');

                    html += `
                        <div class="line-frame-box" style="border-color:${color}; background:${color}08;">
                            <div class="line-frame-head">
                                <div class="line-frame-title">
                                    ${getLineIconSvg(line.LineId, false, 18)}
                                    ${formatLineTitleWithTag(groupLabel, color, 'frame')}
                                </div>
                                <span class="line-frame-count" style="background:${color}22; color:${isBright ? '#ca8a04' : color}; border:1px solid ${color}44;">
                                    ${stations.length} ${lang === 'zh' ? '座车站' : (lang === 'th' ? 'สถานี' : 'stations')}
                                </span>
                            </div>
                            <div class="line-stations-grid">
                                ${stationChips}
                            </div>
                        </div>`;
                }

                if (totalMatching === 0) {
                    html = `<div style="text-align:center; padding:24px 12px; color:var(--muted); font-size:13px;">
                        ${getUiIcon('search', 16, 'var(--muted)')} ${lang === 'zh' ? `未找到匹配 “${esc(q)}” 的车站` : (lang === 'th' ? `ไม่พบสถานีที่ตรงกับคำค้นหา "${esc(q)}"` : `No stations found matching "${esc(q)}"`)}
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
                    const locateExitLabel = lang === 'zh' ? '通过 GPS 查找最近的出入口' : (lang === 'th' ? 'ระบุทางออกที่คุณยืนอยู่ด้วย GPS' : 'Find your nearest exit by GPS');
                    el.innerHTML =
                        (this.locError ? `<div class="err-box" style="margin:0 0 10px">${this.locError}</div>` : '') +
                        `<button class="btn btn-big" onclick="App.locateExitGps(true)">${getUiIcon('pin', 16, '#ffffff')} ${locateExitLabel}</button>`;
                    return;
                }

                // Station where user is closest to
                const nearestSt = this.nearest?.station || this.pinnedStation() || this.findStation(this.selectedExitKey) || this.uniqueStations[0];
                if (!nearestSt) return;

                const s = nearestSt;
                const exits = getStationExits(s);
                if (!exits || !exits.length) {
                    el.innerHTML = `<div class="empty-note">${lang === 'zh' ? '暂无出入口信息' : (lang === 'th' ? 'ไม่มีข้อมูลทางออก' : 'No exit data')}</div>`;
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
                const mUnit = lang === 'zh' ? '米' : (lang === 'th' ? 'เมตร' : 'm');
                const kmUnit = lang === 'zh' ? '公里' : (lang === 'th' ? 'กม.' : 'km');
                const mUnitShort = lang === 'zh' ? '米' : (lang === 'th' ? 'ม.' : 'm');
                const kmUnitShort = lang === 'zh' ? '公里' : (lang === 'th' ? 'กม.' : 'km');

                const distText = nearestExit.meters < 1000
                    ? `${nearestExit.meters} ${mUnit}`
                    : `${(nearestExit.meters / 1000).toFixed(1)} ${kmUnit}`;

                const color = s.StationLineColor || '#7AB420';
                const allLines = [...this.lines, ...MRT_STATIC_DB.lines];
                const lineObj = this.lineById[s.StationLineId] || allLines.find(l => l.LineId === s.StationLineId);
                const lineLabel = lineObj ? (lang === 'zh' ? (LINE_NAMES_ZH[lineObj.LineId] || lineObj.LineName_EN || lineObj.LineName_TH) : (lang === 'en' ? (lineObj.LineName_EN || lineObj.LineName_TH) : (lineObj.LineName_TH || ''))) : '';

                const headline = isAtStation
                    ? (lang === 'zh' ? `您正位于 <b>出入口 ${nearestExit.exit}</b> 附近` : (lang === 'th' ? `คุณยืนอยู่บริเวณ <b>ทางออก ${nearestExit.exit}</b>` : `You are standing near <b>Exit ${nearestExit.exit}</b>`))
                    : (lang === 'zh' ? `距您当前位置最近的出入口为 <b>出入口 ${nearestExit.exit}</b>` : (lang === 'th' ? `ทางออกที่ใกล้จุดที่คุณอยู่ที่สุดคือ <b>ทางออก ${nearestExit.exit}</b>` : `Closest exit from your location is <b>Exit ${nearestExit.exit}</b>`));

                const statusBadge = isAtStation
                    ? `<span class="badge near-b" style="font-size:10px">${getUiIcon('pin', 11, '#16a34a')} ${lang === 'zh' ? '您当前所在位置' : (lang === 'th' ? 'จุดที่คุณยืนอยู่' : 'Your Location')}</span>`
                    : `<span class="badge" style="background:#e0f2fe;color:#0369a1;font-size:10px">${lang === 'zh' ? '就近车站' : (lang === 'th' ? 'สถานีใกล้คุณ' : 'Nearest Station')}</span>`;

                const lm = lang === 'zh' ? (nearestExit.landmarks_zh || nearestExit.landmarks_en || nearestExit.landmarks_th) : (lang === 'th' ? nearestExit.landmarks_th : (nearestExit.landmarks_en || nearestExit.landmarks_th));

                const facilityBadges = (nearestExit.facilities || []).map(f => {
                    if (f === 'skywalk') return `<span class="facility-chip skywalk">${getUiIcon('walk', 13, 'currentColor')} ${lang === 'zh' ? '空中连廊' : (lang === 'th' ? 'ทางเชื่อมสกายวอล์ก' : 'Skywalk Link')}</span>`;
                    if (f === 'elevator') return `<span class="facility-chip elevator">${getUiIcon('elevator', 13, 'currentColor')} ${lang === 'zh' ? '无障碍/长者专用电梯' : (lang === 'th' ? 'ลิฟต์คนพิการ/ผู้สูงอายุ' : 'Priority Elevator')}</span>`;
                    if (f === 'escalator') return `<span class="facility-chip">${getUiIcon('escalator', 13, 'currentColor')} ${lang === 'zh' ? '自动扶梯' : (lang === 'th' ? 'บันไดเลื่อน' : 'Escalator')}</span>`;
                    return '';
                }).join('');

                const exitWord = lang === 'zh' ? '出入口' : (lang === 'th' ? 'ทางออก' : 'Exit');
                const altChips = exitsWithDist.map(ex => {
                    const isSelected = ex.exit === nearestExit.exit;
                    const dStr = ex.meters < 1000 ? `~${ex.meters} ${mUnitShort}` : `~${(ex.meters / 1000).toFixed(1)} ${kmUnitShort}`;
                    return `
                        <button type="button" class="alt-chip ${isSelected ? 'on' : ''}" onclick="App.scrollToExit(${ex.exit}, '${esc(s.StationKey)}')">
                            <span class="dot" style="background:${isSelected ? '#16a34a' : '#94a3b8'}"></span>
                            <span>${exitWord} ${ex.exit}</span>
                            <span class="km">${dStr}</span>
                        </button>`;
                }).join('');

                const isCurrentDirectoryStation = this.selectedExitKey === s.StationKey;
                const calibrateExitBtn = (!this.userPos?.calibrated && nearestExit.meters > 120 && nearestExit.meters <= 800)
                    ? `<button class="btn btn-ghost" style="padding:3px 8px;font-size:11px;color:var(--primary,#0284c7);border:1px dashed var(--primary,#0284c7);border-radius:8px;margin-left:auto" onclick="App.calibrateToStation('${esc(s.StationKey)}')">${getUiIcon('pin', 12, 'currentColor')} ${lang === 'zh' ? '我在此站' : (lang === 'th' ? 'ฉันอยู่ที่สถานีนี้' : "I'm at this station")}</button>`
                    : '';
                const viewDirectoryBtn = !isCurrentDirectoryStation
                    ? `<button class="btn btn-ghost view-dir-btn" style="padding:3px 8px;font-size:11px;margin-left:${calibrateExitBtn ? '6px' : 'auto'}" onclick="App.selectExitStation('${esc(s.StationKey)}')">${getUiIcon('door', 13, 'currentColor')} ${lang === 'zh' ? '查看本站出入口名录 ➔' : (lang === 'th' ? 'เปิดไดเรกทอรีสถานีนี้ ➔' : 'View Station Exits ➔')}</button>`
                    : '';

                    const isBrt = s.StationLineId === 201;
                    el.innerHTML = `
                    ${this.locError ? `<div class="err-box" style="margin:0 0 10px">${this.locError}</div>` : ''}
                    <div class="current-exit-hero">
                        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;padding-bottom:8px;border-bottom:1px dashed var(--line);flex-wrap:wrap">
                            <span class="st-key ${isBrt ? 'st-key-brt' : ''}" style="${isBrt ? '' : 'background:' + color + ';'}font-size:12px;padding:3px 8px">${esc(s.StationKey)}</span>
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
                                <div class="dist-tag">${getUiIcon('ruler', 14, 'var(--primary,#0284c7)')} ${lang === 'zh' ? '距您所在位置约' : (lang === 'th' ? 'ระยะห่างประมาณ' : 'Approx.')} <b>${distText}</b> ${lang === 'zh' ? '' : (lang === 'th' ? 'จากจุดที่คุณยืน' : 'from your location')}</div>
                                <div class="landmark-tag">${getUiIcon('door', 14, 'var(--text-sub,#64748b)')} ${esc(lm)}</div>
                            </div>
                        </div>
                        ${facilityBadges ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px">${facilityBadges}</div>` : ''}
                        <div style="margin-top:12px;padding-top:10px;border-top:1px dashed var(--line)">
                            <div style="font-size:11.5px;color:var(--muted);margin-bottom:6px;font-weight:600">
                                ${lang === 'zh' ? '本站全部出入口 (点击查看详情):' : (lang === 'th' ? 'ทางออกทั้งหมดของสถานีนี้ (แตะเพื่อดูรายละเอียด):' : 'All exits of this station (tap to jump to details):')}
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
                    const existingTabs = lineTabsEl.querySelectorAll('.tab');
                    const totalExpected = 1 + allLines.length;

                    if (existingTabs.length === totalExpected) {
                        const allBtn = existingTabs[0];
                        allBtn.className = `tab ${isAll ? 'on' : ''}`;
                        allBtn.style.cssText = isAll ? 'background:var(--primary,#0284c7);color:#fff;' : '';
                        allBtn.innerHTML = `
                            ${getLineIconSvg(0, isAll, 17)}
                            <span>${lang === 'th' ? 'ทุกสาย' : (lang === 'zh' ? '全部线路' : 'All Lines')}</span>`;
                        allLines.forEach((l, idx) => {
                            const btn = existingTabs[idx + 1];
                            const on = l.LineId === this.exitFilterLine;
                            const isBrt = l.LineId === 201;
                            btn.className = `tab ${isBrt ? 'tab-brt' : ''} ${on ? 'on' : ''}`;
                            btn.setAttribute('data-line', l.LineId);
                            btn.style.cssText = on ? (isBrt ? '' : `background:${l.LineColor};color:#fff;`) : '';
                            btn.innerHTML = `
                                ${getLineIconSvg(l.LineId, on, 17)}
                                <span>${esc(getLineOptLabel(l))}</span>`;
                        });
                    } else {
                        lineTabsEl.innerHTML = `
                            <button class="tab ${isAll ? 'on' : ''}" style="${isAll ? 'background:var(--primary,#0284c7);color:#fff;' : ''}" onclick="App.filterExitLine(0)">
                                ${getLineIconSvg(0, isAll, 17)}
                                <span>${lang === 'th' ? 'ทุกสาย' : (lang === 'zh' ? '全部线路' : 'All Lines')}</span>
                            </button>` + allLines.map(l => {
                            const on = l.LineId === this.exitFilterLine;
                            const isBrt = l.LineId === 201;
                            const bgStyle = on ? (isBrt ? '' : `background:${l.LineColor};color:#fff;`) : '';
                            return `<button class="tab ${isBrt ? 'tab-brt' : ''} ${on ? 'on' : ''}" data-line="${l.LineId}" style="${bgStyle}" onclick="App.filterExitLine(${l.LineId})">
                                ${getLineIconSvg(l.LineId, on, 17)}
                                <span>${esc(getLineOptLabel(l))}</span></button>`;
                        }).join('');
                    }

                    const activeExitTab = lineTabsEl.querySelector('.tab.on');
                    if (activeExitTab) {
                        requestAnimationFrame(() => {
                            scrollContainerChildToCenter(lineTabsEl, activeExitTab, true);
                        });
                    }
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
                const lineLabel = lineObj ? (lang === 'zh' ? (LINE_NAMES_ZH[lineObj.LineId] || lineObj.LineName_EN || lineObj.LineName_TH) : (lang === 'en' ? (lineObj.LineName_EN || lineObj.LineName_TH) : `${lineObj.LineName_TH} (${lineObj.LineName_EN || ''})`)) : '';

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
                const mUnitEx = lang === 'zh' ? '米' : (lang === 'th' ? 'ม.' : 'm');
                const kmUnitEx = lang === 'zh' ? '公里' : (lang === 'th' ? 'กม.' : 'km');
                const exitHint = nearestExitInfo ? `
                    <div class="dist-chip">
                        <div class="v">${lang === 'zh' ? '出入口' : (lang === 'th' ? 'ทางออก' : 'Exit')} ${nearestExitInfo.exit}</div>
                        <div class="l">${lang === 'zh' ? '就近方向' : (lang === 'th' ? 'ใกล้ทิศทางคุณ' : 'Nearest')} (~${nearestExitInfo.meters < 1000 ? nearestExitInfo.meters + ' ' + mUnitEx : (nearestExitInfo.meters/1000).toFixed(1) + ' ' + kmUnitEx})</div>
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
                        if (f === 'skywalk') return `<span class="facility-chip skywalk">${getUiIcon('walk', 13, '#0284c7')} ${lang === 'zh' ? '空中连廊' : (lang === 'th' ? 'ทางเชื่อมสกายวอล์ก' : 'Skywalk Link')}</span>`;
                        if (f === 'elevator') return `<span class="facility-chip elevator">${getUiIcon('elevator', 13, '#10b981')} ${lang === 'zh' ? '无障碍/长者专用电梯' : (lang === 'th' ? 'ลิฟต์คนพิการ/ผู้สูงอายุ' : 'Priority Elevator')}</span>`;
                        if (f === 'escalator') return `<span class="facility-chip">${getUiIcon('escalator', 13, '#64748b')} ${lang === 'zh' ? '自动扶梯' : (lang === 'th' ? 'บันไดเลื่อน' : 'Escalator')}</span>`;
                        return '';
                    }).join('');

                    const nearestBadge = isNearest
                        ? `<span class="facility-chip nearest-live-chip">${getUiIcon('pin', 13, '#10b981')} ${lang === 'zh' ? '您正位于此出入口附近' : (lang === 'th' ? 'คุณยืนอยู่ใกล้ทางออกนี้' : 'You are near this exit')} (${nearestExitInfo.meters < 1000 ? '~' + nearestExitInfo.meters + ' ' + mUnitEx : (nearestExitInfo.meters / 1000).toFixed(1) + ' ' + kmUnitEx})</span>`
                        : '';

                    const lm = lang === 'zh' ? (ex.landmarks_zh || ex.landmarks_en || ex.landmarks_th) : (lang === 'th' ? ex.landmarks_th : (ex.landmarks_en || ex.landmarks_th));
                    return `
                        <div class="exit-item ${isNearest ? 'nearest-exit-active' : ''}" id="exit-card-${ex.exit}">
                            <div class="exit-badge-num" style="${isNearest ? 'background:linear-gradient(135deg,#16a34a,#15803d);' : ''}">
                                <span class="lbl">EXIT</span>
                                <span>${ex.exit}</span>
                            </div>
                            <div class="exit-content">
                                <div class="exit-facilities">${nearestBadge}${badges}</div>
                                <div class="exit-landmarks">${getUiIcon('pin', 13, 'var(--text-sub,#64748b)')} ${esc(lm)}</div>
                            </div>
                        </div>`;
                }).join('');
            },

            /* ---------- THE SKYTRAINs: Interactive Transit Network Map (Smooth GPU Camera Engine) ---------- */
            getMapMinZoom() {
                const vp = document.getElementById('mapViewport');
                if (!vp || vp.clientWidth <= 0 || vp.clientHeight <= 0) {
                    return this.mapMinZoom || 0.25;
                }
                const baseSize = 1672.44;
                const fitX = vp.clientWidth / baseSize;
                const fitY = vp.clientHeight / baseSize;
                this.mapMinZoom = Math.min(fitX, fitY);
                return this.mapMinZoom;
            },

            clampMapTransform(panX, panY, scale) {
                const vp = document.getElementById('mapViewport');
                const baseSize = 1672.44;
                const minZ = this.getMapMinZoom();
                const maxZ = 2.5;
                const s = Math.min(maxZ, Math.max(minZ, scale || minZ));

                if (!vp || vp.clientWidth <= 0 || vp.clientHeight <= 0) {
                    return { panX: 0, panY: 0, scale: s };
                }

                const vpW = vp.clientWidth;
                const vpH = vp.clientHeight;
                const scaledW = baseSize * s;
                const scaledH = baseSize * s;

                let cx, cy;
                // จัดแผนที่ให้อยู่กึ่งกลางเสมอยามเมื่อขนาดย่อเล็กสุดหรือเล็กกว่ากรอบแสดงผล
                if (scaledW <= vpW + 0.5) {
                    cx = (vpW - scaledW) * 0.5;
                } else {
                    cx = Math.min(0, Math.max(vpW - scaledW, panX));
                }

                if (scaledH <= vpH + 0.5) {
                    cy = (vpH - scaledH) * 0.5;
                } else {
                    cy = Math.min(0, Math.max(vpH - scaledH, panY));
                }

                return { panX: cx, panY: cy, scale: s };
            },

            applyMapTransformImmediate() {
                const container = document.getElementById('networkMapContainer');
                if (!container) return;
                const px = Number.isFinite(this.mapPanX) ? this.mapPanX : 0;
                const py = Number.isFinite(this.mapPanY) ? this.mapPanY : 0;
                const sc = Number.isFinite(this.mapZoom) && this.mapZoom > 0 ? this.mapZoom : this.getMapMinZoom();
                container.style.transform = `translate3d(${px.toFixed(3)}px, ${py.toFixed(3)}px, 0) scale(${sc.toFixed(5)})`;
            },

            startMapAnimationLoop() {
                if (this._mapAnimFrame) return;
                let lastTime = performance.now();

                const step = (now) => {
                    const dt = Math.min(48, Math.max(4, now - lastTime));
                    lastTime = now;

                    // Kinetic momentum gliding after touch/mouse swipe release
                    if (!this._mapIsPointerDown && (Math.abs(this.mapVelX || 0) > 0.05 || Math.abs(this.mapVelY || 0) > 0.05)) {
                        const decay = Math.pow(0.91, dt / 16.67);
                        this.mapVelX *= decay;
                        this.mapVelY *= decay;

                        const nextTargetX = (this.mapTargetPanX || 0) + this.mapVelX * (dt / 16.67);
                        const nextTargetY = (this.mapTargetPanY || 0) + this.mapVelY * (dt / 16.67);
                        const clampedMom = this.clampMapTransform(nextTargetX, nextTargetY, this.mapTargetZoom || this.mapZoom);

                        if (Math.abs(clampedMom.panX - nextTargetX) > 0.5) this.mapVelX = 0;
                        if (Math.abs(clampedMom.panY - nextTargetY) > 0.5) this.mapVelY = 0;

                        this.mapTargetPanX = clampedMom.panX;
                        this.mapTargetPanY = clampedMom.panY;
                    }

                    // Frame-rate independent smooth exponential interpolation
                    const alpha = 1 - Math.pow(0.0006, dt / 210);
                    const curZ = this.mapZoom || this.getMapMinZoom();
                    const tgtZ = this.mapTargetZoom || curZ;
                    const curX = Number.isFinite(this.mapPanX) ? this.mapPanX : 0;
                    const curY = Number.isFinite(this.mapPanY) ? this.mapPanY : 0;
                    const tgtX = Number.isFinite(this.mapTargetPanX) ? this.mapTargetPanX : curX;
                    const tgtY = Number.isFinite(this.mapTargetPanY) ? this.mapTargetPanY : curY;

                    const nextZ = curZ + (tgtZ - curZ) * alpha;
                    const nextX = curX + (tgtX - curX) * alpha;
                    const nextY = curY + (tgtY - curY) * alpha;

                    const clamped = this.clampMapTransform(nextX, nextY, nextZ);
                    this.mapZoom = clamped.scale;
                    this.mapPanX = clamped.panX;
                    this.mapPanY = clamped.panY;
                    this.applyMapTransformImmediate();

                    const zoomDiff = Math.abs(tgtZ - this.mapZoom);
                    const panDiff = Math.hypot(tgtX - this.mapPanX, tgtY - this.mapPanY);
                    const velMag = Math.hypot(this.mapVelX || 0, this.mapVelY || 0);

                    if (zoomDiff > 0.00015 || panDiff > 0.1 || velMag > 0.08) {
                        this._mapAnimFrame = requestAnimationFrame(step);
                    } else {
                        const finalClamped = this.clampMapTransform(tgtX, tgtY, tgtZ);
                        this.mapZoom = finalClamped.scale;
                        this.mapPanX = finalClamped.panX;
                        this.mapPanY = finalClamped.panY;
                        this.mapTargetZoom = finalClamped.scale;
                        this.mapTargetPanX = finalClamped.panX;
                        this.mapTargetPanY = finalClamped.panY;
                        this.mapVelX = 0;
                        this.mapVelY = 0;
                        this._mapAnimFrame = null;
                        this.applyMapTransformImmediate();
                    }
                };

                this._mapAnimFrame = requestAnimationFrame(step);
            },

            zoomMapTo(targetScale, focalX, focalY, animated = true) {
                const vp = document.getElementById('mapViewport');
                const minZ = this.getMapMinZoom();
                const maxZ = 2.5;
                const fx = (typeof focalX === 'number') ? focalX : (vp ? vp.clientWidth * 0.5 : 0);
                const fy = (typeof focalY === 'number') ? focalY : (vp ? vp.clientHeight * 0.5 : 0);

                this.mapVelX = 0;
                this.mapVelY = 0;

                const curZ = this.mapZoom || minZ;
                const curX = Number.isFinite(this.mapPanX) ? this.mapPanX : 0;
                const curY = Number.isFinite(this.mapPanY) ? this.mapPanY : 0;

                // พิกัดบนแผนผังจริงที่อยู่ใต้จุดโฟกัส (Focal Point) ณ ปัจจุบัน
                const mapX = (fx - curX) / curZ;
                const mapY = (fy - curY) / curZ;

                let nextZ = Math.min(maxZ, Math.max(minZ, targetScale));
                if (nextZ <= minZ * 1.02) nextZ = minZ;

                const rawPanX = fx - (mapX * nextZ);
                const rawPanY = fy - (mapY * nextZ);
                const clamped = this.clampMapTransform(rawPanX, rawPanY, nextZ);

                this.mapTargetZoom = clamped.scale;
                this.mapTargetPanX = clamped.panX;
                this.mapTargetPanY = clamped.panY;

                if (!animated) {
                    if (this._mapAnimFrame) {
                        cancelAnimationFrame(this._mapAnimFrame);
                        this._mapAnimFrame = null;
                    }
                    this.mapZoom = clamped.scale;
                    this.mapPanX = clamped.panX;
                    this.mapPanY = clamped.panY;
                    this.applyMapTransformImmediate();
                } else {
                    this.startMapAnimationLoop();
                }
            },

            zoomMap(factor) {
                const vp = document.getElementById('mapViewport');
                const minZ = this.getMapMinZoom();
                const baseZ = this.mapTargetZoom || this.mapZoom || minZ;
                const stepFactor = factor > 1 ? Math.max(factor, 1.32) : Math.min(factor, 0.76);
                let nextZ = baseZ * stepFactor;
                if (nextZ <= minZ * 1.04) nextZ = minZ;
                this._mapUserInteracted = (nextZ > minZ * 1.01);
                const cx = vp ? vp.clientWidth * 0.5 : 0;
                const cy = vp ? vp.clientHeight * 0.5 : 0;
                this.zoomMapTo(nextZ, cx, cy, true);
            },

            resetMapZoom(animated = true) {
                const minZ = this.getMapMinZoom();
                const clamped = this.clampMapTransform(0, 0, minZ);
                this._mapUserInteracted = false;
                this.mapVelX = 0;
                this.mapVelY = 0;
                this.mapTargetZoom = clamped.scale;
                this.mapTargetPanX = clamped.panX;
                this.mapTargetPanY = clamped.panY;

                if (!animated) {
                    if (this._mapAnimFrame) {
                        cancelAnimationFrame(this._mapAnimFrame);
                        this._mapAnimFrame = null;
                    }
                    this.mapZoom = clamped.scale;
                    this.mapPanX = clamped.panX;
                    this.mapPanY = clamped.panY;
                    this.applyMapTransformImmediate();
                } else {
                    this.startMapAnimationLoop();
                }
            },

            toggleMapLegend() {
                const sheet = document.getElementById('mapLegendSheet');
                if (sheet) {
                    const isActive = sheet.classList.toggle('active');
                    const label = isActive ? (lang === 'en' ? 'Close' : (lang === 'zh' ? '关闭图例' : 'ปิดสัญลักษณ์')) : (lang === 'en' ? 'Legend' : (lang === 'zh' ? '图例' : 'สัญลักษณ์'));
                    const btnText = document.getElementById('mapLegendBtnText');
                    if (btnText) btnText.textContent = label;
                    const geoBtnText = document.getElementById('mapGeoLegendText');
                    if (geoBtnText) geoBtnText.textContent = label;
                    return;
                }
                const el = document.getElementById('mapLegendGroup');
                if (!el) return;
                const isHidden = el.getAttribute('display') === 'none' || el.style.display === 'none';
                if (isHidden) {
                    el.removeAttribute('display');
                    el.style.display = '';
                } else {
                    el.setAttribute('display', 'none');
                    el.style.display = 'none';
                }
                const btnText = document.getElementById('mapLegendBtnText');
                if (btnText) {
                    btnText.textContent = isHidden ? (lang === 'en' ? 'Legend' : (lang === 'zh' ? '图例' : 'สัญลักษณ์')) : (lang === 'en' ? 'Show Legend' : (lang === 'zh' ? '显示图例' : 'เปิดสัญลักษณ์'));
                }
            },

            handleMapDoubleTapZoom(clientX, clientY) {
                const vp = document.getElementById('mapViewport');
                const container = document.getElementById('networkMapContainer');
                if (!vp || !container) return;

                const minZ = this.getMapMinZoom();
                const curZoom = this.mapTargetZoom || this.mapZoom || minZ;
                // สลับระดับการซูม: หากอยู่ที่มุมมองย่อสุด ให้ซูมขยายเข้าจุดที่แตะ หากซูมขยายอยู่แล้ว ให้ย่อกลับไปกึ่งกลางเล็กสุด
                const isZoomedOut = curZoom <= minZ * 1.35;
                const targetZoom = isZoomedOut ? Math.min(2.5, Math.max(0.85, minZ * 2.6)) : minZ;
                this._mapUserInteracted = isZoomedOut;

                const vpRect = vp.getBoundingClientRect();
                const tapX = clientX - vpRect.left;
                const tapY = clientY - vpRect.top;

                if (!isZoomedOut) {
                    this.resetMapZoom(true);
                } else {
                    const curX = Number.isFinite(this.mapPanX) ? this.mapPanX : 0;
                    const curY = Number.isFinite(this.mapPanY) ? this.mapPanY : 0;
                    const actualCurZ = this.mapZoom || minZ;
                    const mapX = (tapX - curX) / actualCurZ;
                    const mapY = (tapY - curY) / actualCurZ;

                    // ซูมขยายพร้อมเลื่อนจุดที่แตะสองครั้งให้อยู่กึ่งกลางหน้าจออย่างนุ่มนวล
                    const rawPanX = (vp.clientWidth * 0.5) - (mapX * targetZoom);
                    const rawPanY = (vp.clientHeight * 0.5) - (mapY * targetZoom);
                    const clamped = this.clampMapTransform(rawPanX, rawPanY, targetZoom);

                    this.mapVelX = 0;
                    this.mapVelY = 0;
                    this.mapTargetZoom = clamped.scale;
                    this.mapTargetPanX = clamped.panX;
                    this.mapTargetPanY = clamped.panY;
                    this.startMapAnimationLoop();
                }
            },

            setupMapGestureHandlers() {
                const vp = document.getElementById('mapViewport');
                if (!vp || vp._gestureInitialized) return;
                vp._gestureInitialized = true;

                // จัดกึ่งกลางและคำนวณขนาดย่อสุดอัตโนมัติเมื่อขนาดกรอบแสดงผลเปลี่ยน
                const onViewportResize = () => {
                    if (vp.clientWidth <= 0 || vp.clientHeight <= 0) return;
                    const prevMinZ = this.mapMinZoom || 0.25;
                    const newMinZ = this.getMapMinZoom();
                    if (!this._mapUserInteracted || !this.mapZoom || this.mapZoom <= prevMinZ * 1.05) {
                        this.resetMapZoom(false);
                    } else {
                        const clamped = this.clampMapTransform(this.mapPanX || 0, this.mapPanY || 0, Math.max(newMinZ, this.mapZoom));
                        this.mapZoom = this.mapTargetZoom = clamped.scale;
                        this.mapPanX = this.mapTargetPanX = clamped.panX;
                        this.mapPanY = this.mapTargetPanY = clamped.panY;
                        this.applyMapTransformImmediate();
                    }
                };

                if (typeof ResizeObserver !== 'undefined') {
                    const ro = new ResizeObserver(onViewportResize);
                    ro.observe(vp);
                }
                window.addEventListener('resize', onViewportResize);

                let isMouseDown = false;
                let mouseStartX = 0, mouseStartY = 0;
                let mouseStartPanX = 0, mouseStartPanY = 0;
                let isMouseDragging = false;
                let pointerHistory = [];

                const recordPointerSample = (x, y) => {
                    const now = performance.now();
                    pointerHistory.push({ x, y, t: now });
                    while (pointerHistory.length > 0 && now - pointerHistory[0].t > 90) {
                        pointerHistory.shift();
                    }
                };

                const applyReleaseInertia = () => {
                    const now = performance.now();
                    while (pointerHistory.length > 0 && now - pointerHistory[0].t > 90) {
                        pointerHistory.shift();
                    }
                    if (pointerHistory.length >= 2) {
                        const first = pointerHistory[0];
                        const last = pointerHistory[pointerHistory.length - 1];
                        const dt = Math.max(8, last.t - first.t);
                        const vx = ((last.x - first.x) / dt) * 16.67;
                        const vy = ((last.y - first.y) / dt) * 16.67;
                        const maxV = 42;
                        this.mapVelX = Math.max(-maxV, Math.min(maxV, vx));
                        this.mapVelY = Math.max(-maxV, Math.min(maxV, vy));
                        if (Math.hypot(this.mapVelX, this.mapVelY) > 0.8) {
                            this.startMapAnimationLoop();
                        }
                    }
                    pointerHistory = [];
                };

                // --- Mouse Pan Handler (Smooth GPU 1:1 Drag + Inertia) ---
                vp.addEventListener('mousedown', (e) => {
                    if (this.mapMode === 'hybrid') return;
                    if (e.button !== 0) return;
                    isMouseDown = true;
                    this._mapIsPointerDown = true;
                    isMouseDragging = false;
                    this.mapVelX = 0;
                    this.mapVelY = 0;
                    this.mapTargetPanX = this.mapPanX;
                    this.mapTargetPanY = this.mapPanY;
                    this.mapTargetZoom = this.mapZoom;
                    mouseStartX = e.clientX;
                    mouseStartY = e.clientY;
                    mouseStartPanX = this.mapPanX || 0;
                    mouseStartPanY = this.mapPanY || 0;
                    pointerHistory = [{ x: e.clientX, y: e.clientY, t: performance.now() }];
                    vp.style.cursor = 'grabbing';
                });

                window.addEventListener('mousemove', (e) => {
                    if (this.mapMode === 'hybrid') return;
                    if (!isMouseDown) return;
                    const dx = e.clientX - mouseStartX;
                    const dy = e.clientY - mouseStartY;
                    if (!isMouseDragging && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
                        isMouseDragging = true;
                    }
                    if (isMouseDragging) {
                        e.preventDefault();
                        recordPointerSample(e.clientX, e.clientY);
                        const clamped = this.clampMapTransform(mouseStartPanX + dx, mouseStartPanY + dy, this.mapZoom);
                        this.mapPanX = this.mapTargetPanX = clamped.panX;
                        this.mapPanY = this.mapTargetPanY = clamped.panY;
                        this.applyMapTransformImmediate();
                    }
                }, { passive: false });

                window.addEventListener('mouseup', () => {
                    if (this.mapMode === 'hybrid') return;
                    if (!isMouseDown) return;
                    isMouseDown = false;
                    this._mapIsPointerDown = false;
                    vp.style.cursor = 'grab';
                    if (isMouseDragging) {
                        vp._preventClick = true;
                        setTimeout(() => { vp._preventClick = false; }, 120);
                        applyReleaseInertia();
                    }
                    isMouseDragging = false;
                });

                // --- Desktop Mouse Double-Click Zoom ---
                vp.addEventListener('dblclick', (e) => {
                    if (this.mapMode === 'hybrid') return;
                    e.preventDefault();
                    vp._preventClick = true;
                    this.closeMapActionSheet();
                    setTimeout(() => { vp._preventClick = false; }, 320);
                    this.handleMapDoubleTapZoom(e.clientX, e.clientY);
                });

                // --- Desktop Mouse Wheel & Trackpad Smooth Zoom around Cursor ---
                vp.addEventListener('wheel', (e) => {
                    if (this.mapMode === 'hybrid') return;
                    e.preventDefault();
                    const minZ = this.getMapMinZoom();
                    const baseZ = this.mapTargetZoom || this.mapZoom || minZ;
                    const delta = e.deltaMode === 1 ? e.deltaY * 24 : (e.deltaMode === 2 ? e.deltaY * 120 : e.deltaY);
                    const factor = Math.exp(-delta * 0.0022);
                    let nextZoom = Math.min(2.5, Math.max(minZ, baseZ * factor));
                    if (nextZoom <= minZ * 1.02) nextZoom = minZ;
                    if (Math.abs(nextZoom - baseZ) < 0.0005) return;

                    this._mapUserInteracted = (nextZoom > minZ * 1.01);
                    const vpRect = vp.getBoundingClientRect();
                    const mouseX = e.clientX - vpRect.left;
                    const mouseY = e.clientY - vpRect.top;

                    this.zoomMapTo(nextZoom, mouseX, mouseY, true);
                }, { passive: false });

                // --- Touch Pan (1 finger + Inertia), Pinch-to-Zoom + Midpoint Pan (2 fingers) & Double-Tap ---
                let touchStartX = 0, touchStartY = 0;
                let touchStartPanX = 0, touchStartPanY = 0;
                let isTouchDragging = false;
                let initialDist = 0;
                let initialZoom = 1;
                let pinchMapX = 0, pinchMapY = 0;
                let lastTapTime = 0;
                let lastTapX = 0;
                let lastTapY = 0;

                vp.addEventListener('touchstart', (e) => {
                    if (this.mapMode === 'hybrid') return;
                    this._mapIsPointerDown = true;
                    this.mapVelX = 0;
                    this.mapVelY = 0;

                    if (e.touches.length === 1) {
                        isTouchDragging = false;
                        touchStartX = e.touches[0].clientX;
                        touchStartY = e.touches[0].clientY;
                        touchStartPanX = this.mapPanX || 0;
                        touchStartPanY = this.mapPanY || 0;
                        this.mapTargetPanX = touchStartPanX;
                        this.mapTargetPanY = touchStartPanY;
                        this.mapTargetZoom = this.mapZoom;
                        pointerHistory = [{ x: touchStartX, y: touchStartY, t: performance.now() }];

                        const now = Date.now();
                        if (now - lastTapTime < 320) {
                            const dist = Math.hypot(touchStartX - lastTapX, touchStartY - lastTapY);
                            if (dist < 40) {
                                vp._preventClick = true;
                                this.closeMapActionSheet();
                            }
                        }
                    } else if (e.touches.length === 2) {
                        e.preventDefault();
                        isTouchDragging = false;
                        lastTapTime = 0;
                        pointerHistory = [];

                        const x1 = e.touches[0].clientX, y1 = e.touches[0].clientY;
                        const x2 = e.touches[1].clientX, y2 = e.touches[1].clientY;
                        initialDist = Math.hypot(x2 - x1, y2 - y1);
                        initialZoom = this.mapZoom || this.getMapMinZoom();

                        const vpRect = vp.getBoundingClientRect();
                        const midX = ((x1 + x2) * 0.5) - vpRect.left;
                        const midY = ((y1 + y2) * 0.5) - vpRect.top;

                        pinchMapX = (midX - (this.mapPanX || 0)) / initialZoom;
                        pinchMapY = (midY - (this.mapPanY || 0)) / initialZoom;
                    }
                }, { passive: false });

                vp.addEventListener('touchmove', (e) => {
                    if (this.mapMode === 'hybrid') return;
                    if (e.touches.length === 1) {
                        const curX = e.touches[0].clientX;
                        const curY = e.touches[0].clientY;
                        const dx = curX - touchStartX;
                        const dy = curY - touchStartY;
                        if (!isTouchDragging && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
                            isTouchDragging = true;
                            lastTapTime = 0;
                        }
                        if (isTouchDragging) {
                            e.preventDefault();
                            recordPointerSample(curX, curY);
                            const clamped = this.clampMapTransform(touchStartPanX + dx, touchStartPanY + dy, this.mapZoom);
                            this.mapPanX = this.mapTargetPanX = clamped.panX;
                            this.mapPanY = this.mapTargetPanY = clamped.panY;
                            this.applyMapTransformImmediate();
                        }
                    } else if (e.touches.length === 2 && initialDist > 0) {
                        e.preventDefault();
                        lastTapTime = 0;
                        const x1 = e.touches[0].clientX, y1 = e.touches[0].clientY;
                        const x2 = e.touches[1].clientX, y2 = e.touches[1].clientY;
                        const currentDist = Math.hypot(x2 - x1, y2 - y1);
                        const factor = currentDist / initialDist;

                        const minZ = this.getMapMinZoom();
                        let nextScale = Math.min(2.5, Math.max(minZ, initialZoom * factor));
                        if (nextScale <= minZ * 1.01) nextScale = minZ;
                        this._mapUserInteracted = (nextScale > minZ * 1.01);

                        const vpRect = vp.getBoundingClientRect();
                        const midX = ((x1 + x2) * 0.5) - vpRect.left;
                        const midY = ((y1 + y2) * 0.5) - vpRect.top;

                        const rawPanX = midX - (pinchMapX * nextScale);
                        const rawPanY = midY - (pinchMapY * nextScale);
                        const clamped = this.clampMapTransform(rawPanX, rawPanY, nextScale);

                        this.mapZoom = this.mapTargetZoom = clamped.scale;
                        this.mapPanX = this.mapTargetPanX = clamped.panX;
                        this.mapPanY = this.mapTargetPanY = clamped.panY;
                        this.applyMapTransformImmediate();
                    }
                }, { passive: false });

                vp.addEventListener('touchend', (e) => {
                    if (this.mapMode === 'hybrid') return;
                    if (e.touches.length === 0) {
                        this._mapIsPointerDown = false;
                        if (isTouchDragging) {
                            vp._preventClick = true;
                            setTimeout(() => { vp._preventClick = false; }, 120);
                            lastTapTime = 0;
                            applyReleaseInertia();
                        } else if (e.changedTouches && e.changedTouches.length === 1) {
                            const touch = e.changedTouches[0];
                            const now = Date.now();
                            const timeDiff = now - lastTapTime;
                            const dist = Math.hypot(touch.clientX - lastTapX, touch.clientY - lastTapY);

                            if (timeDiff > 40 && timeDiff < 320 && dist < 40) {
                                e.preventDefault();
                                vp._preventClick = true;
                                this.closeMapActionSheet();
                                setTimeout(() => { vp._preventClick = false; }, 350);
                                this.handleMapDoubleTapZoom(touch.clientX, touch.clientY);
                                lastTapTime = 0;
                            } else {
                                lastTapTime = now;
                                lastTapX = touch.clientX;
                                lastTapY = touch.clientY;
                            }
                        }
                        isTouchDragging = false;
                        initialDist = 0;
                    } else if (e.touches.length === 1) {
                        touchStartX = e.touches[0].clientX;
                        touchStartY = e.touches[0].clientY;
                        touchStartPanX = this.mapPanX || 0;
                        touchStartPanY = this.mapPanY || 0;
                        pointerHistory = [{ x: touchStartX, y: touchStartY, t: performance.now() }];
                        isTouchDragging = false;
                        initialDist = 0;
                    }
                }, { passive: true });
            },

            setupMobileZoomLock() {
                // Prevent multi-touch pinch zoom everywhere except inside the interactive map viewport
                document.addEventListener('touchstart', (e) => {
                    if (e.touches.length > 1) {
                        if (!e.target.closest('#mapViewport')) {
                            e.preventDefault();
                        }
                    }
                }, { passive: false });

                document.addEventListener('touchmove', (e) => {
                    if (e.touches.length > 1) {
                        if (!e.target.closest('#mapViewport')) {
                            e.preventDefault();
                        }
                    }
                }, { passive: false });

                // Prevent Safari/iOS gesturestart outside the interactive map viewport
                document.addEventListener('gesturestart', (e) => {
                    if (!e.target.closest('#mapViewport')) {
                        e.preventDefault();
                    }
                }, { passive: false });

                // Prevent double-tap to zoom everywhere except inside the interactive map viewport
                let lastTouchEnd = 0;
                document.addEventListener('touchend', (e) => {
                    const now = Date.now();
                    if (now - lastTouchEnd <= 300) {
                        if (!e.target.closest('#mapViewport')) {
                            e.preventDefault();
                        }
                    }
                    lastTouchEnd = now;
                }, { passive: false });

                // Prevent text selection and unwanted blinking caret on non-input UI elements
                document.addEventListener('selectstart', (e) => {
                    if (!e.target.closest('input, textarea, [contenteditable="true"]')) {
                        e.preventDefault();
                    }
                });

                // Clear any inadvertent text selection or caret in non-input frames
                document.addEventListener('mousedown', (e) => {
                    if (!e.target.closest('input, textarea, [contenteditable="true"], select, button, a')) {
                        const sel = window.getSelection();
                        if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
                            sel.removeAllRanges();
                        }
                    }
                });
            },

            renderInteractiveMap(force = false) {
                const container = document.getElementById('networkMapContainer');
                if (!container) return;
                if (!force && container.innerHTML.trim() !== '') {
                    this.setupMapGestureHandlers();
                    return;
                }

                const hotspotsSvg = Object.entries(MAP_STATION_HOTSPOTS).map(([key, coords]) => {
                    const cx = coords[0];
                    const cy = coords[1];
                    const r = (coords[2] ? coords[2] + 2 : 10.5);
                    return `<circle cx="${cx}" cy="${cy}" r="${r.toFixed(2)}" class="map-station-hotspot" data-key="${key}" onclick="App.onMapStationClick('${key}')" />`;
                }).join('');

                const isDark = document.documentElement && document.documentElement.classList.contains('dark');
                const mapSvg = isDark ? 'bkk_transit_map_dark.svg' : 'bkk_transit_map.svg';

                container.innerHTML = `
                    <img src="${mapSvg}" 
                         onload="if(!App._mapUserInteracted)App.resetMapZoom(false);"
                         onerror="this.onerror=null;this.src='bkk_transit_map.jpg';" 
                         alt="ผังโครงข่ายระบบขนส่งมวลชนกรุงเทพฯ 12 สาย" 
                         id="networkMapImage" 
                         class="network-map-image" 
                         draggable="false" />
                    <svg id="networkMapInteractiveOverlay" viewBox="0 0 1672.44 1672.44" class="network-map-overlay">
                        <circle id="activeMapStationRing" cx="0" cy="0" r="14" class="map-active-ring" style="display:none;" />
                        <g id="networkMapHotspots">
                            ${hotspotsSvg}
                        </g>
                    </svg>
                `;
                this.setupMapGestureHandlers();
                requestAnimationFrame(() => {
                    this.resetMapZoom(false);
                });
            },

            updateMapTheme() {
                const mapImg = document.getElementById('networkMapImage');
                if (!mapImg) return;
                const isDark = document.documentElement && document.documentElement.classList.contains('dark');
                const targetSrc = isDark ? 'bkk_transit_map_dark.svg' : 'bkk_transit_map.svg';
                const curSrc = mapImg.getAttribute('src') || '';
                if (!curSrc.endsWith(targetSrc)) {
                    mapImg.setAttribute('src', targetSrc);
                }
            },

            /* ---------- THE SKYTRAINs: Google Maps Hybrid View & GPS Location ---------- */
            setMapMode(mode) {
                if (mode !== 'schematic' && mode !== 'hybrid') mode = 'schematic';
                this.mapMode = mode;

                const tabSchematic = document.getElementById('mapModeTabSchematic');
                const tabHybrid = document.getElementById('mapModeTabHybrid');
                const ctrlSchematic = document.getElementById('mapCtrlSchematic');
                const ctrlHybrid = document.getElementById('mapCtrlHybrid');
                const netContainer = document.getElementById('networkMapContainer');
                const geoContainer = document.getElementById('googleHybridMapContainer');

                if (tabSchematic) tabSchematic.classList.toggle('active', mode === 'schematic');
                if (tabHybrid) tabHybrid.classList.toggle('active', mode === 'hybrid');

                const vp = document.getElementById('mapViewport');
                if (vp) vp.style.touchAction = (mode === 'hybrid') ? 'auto' : 'none';
                if (mode !== 'hybrid' && this.geoWatchId) {
                    try { navigator.geolocation.clearWatch(this.geoWatchId); } catch (_) {}
                    this.geoWatchId = null;
                }

                if (ctrlSchematic) ctrlSchematic.style.display = (mode === 'schematic') ? '' : 'none';
                if (ctrlHybrid) ctrlHybrid.style.display = (mode === 'hybrid') ? '' : 'none';

                if (netContainer) netContainer.style.display = (mode === 'schematic') ? '' : 'none';
                if (geoContainer) geoContainer.style.display = (mode === 'hybrid') ? 'block' : 'none';

                if (mode === 'hybrid') {
                    this.initGoogleHybridMap();
                    setTimeout(() => {
                        if (this.geoMap) this.geoMap.invalidateSize();
                    }, 80);
                } else {
                    requestAnimationFrame(() => {
                        this.resetMapZoom(false);
                    });
                }
            },

            initGoogleHybridMap() {
                const container = document.getElementById('googleHybridMapContainer');
                if (!container || typeof L === 'undefined') return;

                if (this.geoMap) {
                    this.geoMap.invalidateSize();
                    return;
                }

                // Create Leaflet Map centered on central Bangkok
                const map = L.map('googleHybridMapContainer', {
                    zoomControl: false,
                    attributionControl: false,
                    maxZoom: 19,
                    minZoom: 9
                }).setView([13.7563, 100.5018], 12);

                this.geoMap = map;

                // Zoom control on top-right
                L.control.zoom({ position: 'topright' }).addTo(map);

                // Google Map Tile Layers (Hybrid, Roadmap, Satellite)
                this.geoTileLayers = {
                    hybrid: L.tileLayer('https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
                        subdomains: ['0', '1', '2', '3'],
                        maxZoom: 20,
                        detectRetina: true
                    }),
                    roadmap: L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
                        subdomains: ['0', '1', '2', '3'],
                        maxZoom: 20,
                        detectRetina: true
                    }),
                    satellite: L.tileLayer('https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
                        subdomains: ['0', '1', '2', '3'],
                        maxZoom: 20,
                        detectRetina: true
                    })
                };

                this.geoTileLayers.hybrid.addTo(map);
                this.geoCurrentLayer = 'hybrid';

                // Click anywhere on map to inspect nearest BTS/MRT station
                map.on('click', (e) => {
                    const lat = e.latlng.lat;
                    const lon = e.latlng.lng;
                    let nearest = null;
                    let minKm = Infinity;
                    for (const s of this.uniqueStations) {
                        if (!s.Latitude || !s.Longitude) continue;
                        const d = kmBetween(lat, lon, s.Latitude, s.Longitude);
                        if (d < minKm) {
                            minKm = d;
                            nearest = s;
                        }
                    }
                    if (nearest && minKm <= 4.0) {
                        this.showNearestStationToast(nearest, minKm, false);
                    }
                });

                // If user position already exists, place GPS marker immediately
                if (this.userPos && this.userPos.lat && this.userPos.lon) {
                    this.updateGeoUserLocation(this.userPos.lat, this.userPos.lon, this.userPos.accuracy || 30);
                } else {
                    // Try to locate user automatically
                    this.locateUserOnGeoMap(false);
                }

                // Invalidate size once rendered
                setTimeout(() => {
                    map.invalidateSize();
                }, 100);
            },

            renderGeoTransitLines() {
                if (!this.geoMap || !this.geoLinesGroup) return;
                this.geoLinesGroup.clearLayers();

                const allLines = this.getAllLines();

                allLines.forEach(l => {
                    const lineId = l.LineId;
                    const stns = l.StationList || [];
                    if (!stns.length) return;

                    const color = l.LineColor || '#7AB420';
                    const isOrange = (lineId === 106 || lineId === MRT_LINE_IDS.ORANGE);

                    // Handle Pink Line Branch (MT01-MT02 branching from PK10)
                    if (lineId === 5) {
                        const trunkStns = stns.filter(s => !['MT01', 'MT02'].includes(s.StationKey));
                        const trunkPts = trunkStns.map(s => [s.Latitude, s.Longitude]).filter(p => p[0] && p[1]);
                        if (trunkPts.length > 1) {
                            L.polyline(trunkPts, { color: '#000000', weight: 6, opacity: 0.65 }).addTo(this.geoLinesGroup);
                            L.polyline(trunkPts, { color, weight: 3.8, opacity: 0.95 }).addTo(this.geoLinesGroup);
                        }

                        // Branch from PK10 to MT01 to MT02
                        const pk10 = stns.find(s => s.StationKey === 'PK10');
                        const mt01 = stns.find(s => s.StationKey === 'MT01');
                        const mt02 = stns.find(s => s.StationKey === 'MT02');
                        if (pk10 && mt01 && mt02) {
                            const branchPts = [
                                [pk10.Latitude, pk10.Longitude],
                                [mt01.Latitude, mt01.Longitude],
                                [mt02.Latitude, mt02.Longitude]
                            ];
                            L.polyline(branchPts, { color: '#000000', weight: 5, opacity: 0.65 }).addTo(this.geoLinesGroup);
                            L.polyline(branchPts, { color, weight: 3.2, opacity: 0.95 }).addTo(this.geoLinesGroup);
                        }
                        return;
                    }

                    // Handle Blue Line Loop + Lak Song Branch
                    if (lineId === 101 || lineId === MRT_LINE_IDS.BLUE) {
                        // In MRT_STATIC_DB: 0..6 is Lak Song to Tha Phra branch, 6..38 is Tha Phra circular loop!
                        const branchPts = stns.slice(0, 7).map(s => [s.Latitude, s.Longitude]).filter(p => p[0] && p[1]);
                        const loopPts = stns.slice(6).map(s => [s.Latitude, s.Longitude]).filter(p => p[0] && p[1]);

                        if (branchPts.length > 1) {
                            L.polyline(branchPts, { color: '#000000', weight: 6, opacity: 0.65 }).addTo(this.geoLinesGroup);
                            L.polyline(branchPts, { color, weight: 3.8, opacity: 0.95 }).addTo(this.geoLinesGroup);
                        }
                        if (loopPts.length > 1) {
                            L.polyline(loopPts, { color: '#000000', weight: 6, opacity: 0.65 }).addTo(this.geoLinesGroup);
                            L.polyline(loopPts, { color, weight: 3.8, opacity: 0.95 }).addTo(this.geoLinesGroup);
                        }
                        return;
                    }

                    // Standard sequential lines
                    const pts = stns.map(s => [s.Latitude, s.Longitude]).filter(p => p[0] && p[1]);
                    if (pts.length > 1) {
                        L.polyline(pts, { color: '#000000', weight: 6, opacity: 0.65 }).addTo(this.geoLinesGroup);
                        L.polyline(pts, {
                            color,
                            weight: 3.8,
                            opacity: 0.95,
                            dashArray: isOrange ? '7, 7' : null
                        }).addTo(this.geoLinesGroup);
                    }
                });
            },

            renderGeoStationMarkers(filterLineId = 0) {
                if (!this.geoMap || !this.geoMarkersGroup) return;
                this.geoMarkersGroup.clearLayers();
                this.geoStationMarkers = [];

                const allLines = this.getAllLines();
                const seen = new Set();
                const bounds = L.latLngBounds([]);

                allLines.forEach(line => {
                    if (filterLineId !== 0 && line.LineId !== filterLineId) return;

                    const lColor = line.LineColor || '#7AB420';
                    const stns = line.StationList || [];

                    stns.forEach(s => {
                        if (!s.Latitude || !s.Longitude) return;
                        if (filterLineId === 0 && seen.has(s.StationKey)) return;
                        seen.add(s.StationKey);

                        const lat = s.Latitude;
                        const lng = s.Longitude;
                        bounds.extend([lat, lng]);

                        const isInterchange = Boolean(this.connections[s.StationKey]?.length);
                        const iconHtml = `<div class="geo-stn-marker ${isInterchange ? 'geo-stn-interchange' : ''}" style="background:${lColor}"><span>${esc(s.StationKey)}</span></div>`;

                        const customIcon = L.divIcon({
                            className: 'geo-custom-div-icon',
                            html: iconHtml,
                            iconSize: [28, 20],
                            iconAnchor: [14, 10],
                            popupAnchor: [0, -12]
                        });

                        const marker = L.marker([lat, lng], { icon: customIcon }).addTo(this.geoMarkersGroup);

                        // Popup content
                        const thName = s.StationNameTH || s.StationName_TH || (s.StationName?.split('|')[0]?.trim()) || '';
                        const enName = s.StationNameEN || s.StationName_EN || (s.StationName?.split('|')[1]?.trim()) || '';
                        const lineName = line.LineName_TH || '';

                        const popupHtml = `
                            <div class="geo-popup-card">
                                <div class="geo-popup-head">
                                    <span class="geo-popup-badge" style="background:${lColor}">${esc(s.StationKey)}</span>
                                    <div>
                                        <div class="geo-popup-title">${esc(thName)}</div>
                                        <div class="geo-popup-subtitle">${esc(enName)} · ${esc(lineName)}</div>
                                    </div>
                                </div>
                                <div class="geo-popup-actions">
                                    <button type="button" class="geo-popup-btn primary" onclick="App.openGeoStationDetail('${s.StationKey}')">เปิดข้อมูลสถานี & เวลาสด</button>
                                    <div style="display:flex;gap:4px;">
                                        <button type="button" class="geo-popup-btn" onclick="App.setOriginFromActionSheetKey('${s.StationKey}')">เป็นต้นทาง</button>
                                        <button type="button" class="geo-popup-btn" onclick="App.setDestinationFromActionSheetKey('${s.StationKey}')">เป็นปลายทาง</button>
                                    </div>
                                </div>
                            </div>
                        `;

                        marker.bindPopup(popupHtml, { maxWidth: 260 });
                        this.geoStationMarkers.push({ key: s.StationKey, lineId: line.LineId, marker, lat, lng });
                    });
                });

                if (filterLineId !== 0 && bounds.isValid()) {
                    this.geoMap.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 });
                }
            },

            openGeoStationDetail(stationKey) {
                if (this.geoMap) this.geoMap.closePopup();
                this.onMapStationClick(stationKey);
            },

            setOriginFromActionSheetKey(key) {
                if (this.geoMap) this.geoMap.closePopup();
                this.journey.from = key;
                this.switchView('planner');
                this.renderJourney();
                if (this.journey.from && this.journey.to) this.findRoute();
            },

            setDestinationFromActionSheetKey(key) {
                if (this.geoMap) this.geoMap.closePopup();
                this.journey.to = key;
                this.switchView('planner');
                this.renderJourney();
                if (this.journey.from && this.journey.to) this.findRoute();
            },

            renderGeoFilterBar() {
                const container = document.getElementById('googleHybridMapContainer');
                if (!container || document.getElementById('geoFilterBar')) return;

                const filterBar = document.createElement('div');
                filterBar.id = 'geoFilterBar';
                filterBar.className = 'geo-filter-bar';

                const lines = [
                    { id: 0, name: 'ทั้งหมด' },
                    { id: 1, name: 'สุขุมวิท' },
                    { id: 2, name: 'สีลม' },
                    { id: 101, name: 'สีน้ำเงิน' },
                    { id: 102, name: 'สีม่วง' },
                    { id: 5, name: 'สีชมพู' },
                    { id: 4, name: 'สีเหลือง' },
                    { id: 103, name: 'สีแดงเข้ม' },
                    { id: 105, name: 'สีแดงอ่อน' },
                    { id: 104, name: 'ARL' },
                    { id: 201, name: 'BRT' },
                    { id: 3, name: 'สีทอง' },
                    { id: 106, name: 'สีส้ม' }
                ];

                filterBar.innerHTML = lines.map(l => `
                    <button type="button" class="geo-filter-chip ${l.id === 0 ? 'active' : ''}" data-line="${l.id}" onclick="App.filterGeoMapLine(${l.id})">${l.name}</button>
                `).join('');

                container.appendChild(filterBar);
            },

            filterGeoMapLine(lineId) {
                this.geoActiveLineFilter = Number(lineId) || 0;
                document.querySelectorAll('.geo-filter-chip').forEach(chip => {
                    chip.classList.toggle('active', Number(chip.getAttribute('data-line')) === this.geoActiveLineFilter);
                });
                this.renderGeoStationMarkers(this.geoActiveLineFilter);
            },

            cycleGeoMapLayer() {
                if (!this.geoMap || !this.geoTileLayers) return;

                const modes = ['hybrid', 'roadmap', 'satellite'];
                const curIdx = modes.indexOf(this.geoCurrentLayer);
                const nextMode = modes[(curIdx + 1) % modes.length];

                Object.values(this.geoTileLayers).forEach(layer => {
                    if (this.geoMap.hasLayer(layer)) this.geoMap.removeLayer(layer);
                });

                if (this.geoTileLayers[nextMode]) {
                    this.geoTileLayers[nextMode].addTo(this.geoMap);
                    this.geoCurrentLayer = nextMode;
                }

                const labelEl = document.getElementById('mapGeoLayerText');
                if (labelEl) {
                    labelEl.textContent = (nextMode === 'hybrid') ? 'Hybrid' : (nextMode === 'roadmap' ? (lang === 'en' ? 'Road' : (lang === 'zh' ? '道路' : 'ถนน')) : (lang === 'en' ? 'Satellite' : (lang === 'zh' ? '卫星' : 'ดาวเทียม')));
                }
            },

            recenterGeoMap() {
                if (!this.geoMap) return;
                const bounds = L.latLngBounds([]);
                this.uniqueStations.forEach(s => {
                    if (s.Latitude && s.Longitude) bounds.extend([s.Latitude, s.Longitude]);
                });
                if (bounds.isValid()) {
                    this.geoMap.fitBounds(bounds, { padding: [25, 25], maxZoom: 14 });
                } else {
                    this.geoMap.setView([13.7563, 100.5018], 12);
                }
            },

            locateUserOnGeoMap(jumpToUser = true) {
                if (!navigator.geolocation) {
                    if (jumpToUser) this.showToast('อุปกรณ์ไม่รองรับระบบตรวจจับพิกัด GPS');
                    return;
                }

                // หากมีพิกัดตำแหน่งล่าสุดของผู้ใช้อยู่แล้ว ให้ย้ายไปทันทีทันควัน โดยไม่ต้องรอสัญญาณและไม่ต้องเลื่อน/ซูม
                if (jumpToUser && this.userPos && this.userPos.lat && this.userPos.lon && this.geoMap) {
                    const currentZoom = this.geoMap.getZoom() || 12;
                    const targetZoom = currentZoom > 16 ? currentZoom : 16;
                    this.geoMap.setView([this.userPos.lat, this.userPos.lon], targetZoom, { animate: false });
                    this.updateGeoUserLocation(this.userPos.lat, this.userPos.lon, this.userPos.accuracy || 25);
                } else if (jumpToUser) {
                    this.showToast('กำลังค้นหาพิกัดตำแหน่งปัจจุบันของคุณ (GPS)...');
                }

                navigator.geolocation.getCurrentPosition(
                    pos => {
                        const lat = pos.coords.latitude;
                        const lon = pos.coords.longitude;
                        const acc = pos.coords.accuracy || 25;

                        this.userPos = { lat, lon, accuracy: acc, at: Date.now() };
                        this.updateGeoUserLocation(lat, lon, acc);

                        // ย้ายไปยังจุดตำแหน่งของผู้ใช้ทันที (Instant jump, animate: false) ไม่เลื่อนหาและไม่ค่อยๆ ซูมเข้า
                        if (jumpToUser && this.geoMap) {
                            const curZoom = this.geoMap.getZoom() || 12;
                            const tgtZoom = curZoom > 16 ? curZoom : 16;
                            this.geoMap.setView([lat, lon], tgtZoom, { animate: false });
                        }

                        // Calculate nearest station
                        let nearest = null;
                        let minKm = Infinity;
                        for (const s of this.uniqueStations) {
                            if (!s.Latitude || !s.Longitude) continue;
                            const d = kmBetween(lat, lon, s.Latitude, s.Longitude);
                            if (d < minKm) {
                                minKm = d;
                                nearest = s;
                            }
                        }

                        if (nearest && jumpToUser) {
                            this.showNearestStationToast(nearest, minKm, false);
                        }
                    },
                    err => {
                        console.warn('Geolocation error on geo map:', err.message);
                        if (jumpToUser && (!this.userPos || !this.userPos.lat)) {
                            this.showToast('ไม่สามารถระบุพิกัด GPS ได้ โปรดอนุญาตการเข้าถึงตำแหน่ง');
                        }
                    },
                    { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
                );
            },

            updateGeoUserLocation(lat, lon, acc) {
                if (!this.geoMap) return;

                const userIconHtml = `
                    <div class="geo-user-marker">
                        <div class="geo-user-pulse"></div>
                        <div class="geo-user-dot"></div>
                    </div>
                `;

                const userIcon = L.divIcon({
                    className: 'geo-custom-user-icon',
                    html: userIconHtml,
                    iconSize: [24, 24],
                    iconAnchor: [12, 12]
                });

                if (this.geoUserMarker) {
                    this.geoUserMarker.setLatLng([lat, lon]);
                } else {
                    this.geoUserMarker = L.marker([lat, lon], { icon: userIcon, zIndexOffset: 2000 }).addTo(this.geoMap);
                    this.geoUserMarker.bindTooltip('ตำแหน่งของคุณ (GPS)', { permanent: false, direction: 'top' });
                }

                if (this.geoAccuracyCircle) {
                    this.geoAccuracyCircle.setLatLng([lat, lon]);
                    this.geoAccuracyCircle.setRadius(Math.max(15, acc));
                } else {
                    this.geoAccuracyCircle = L.circle([lat, lon], {
                        radius: Math.max(15, acc),
                        color: '#0284c7',
                        weight: 1.5,
                        fillColor: '#38bdf8',
                        fillOpacity: 0.18
                    }).addTo(this.geoMap);
                }
            },

            /* ---------- THE SKYTRAINs: Tap-to-Route Floating Action Sheet ---------- */
            onMapStationClick(stationKey) {
                const vp = document.getElementById('mapViewport');
                if (vp && (vp._preventClick || vp._justDragged)) return;
                this.selectedMapStationKey = stationKey;
                this.activeMapStationKey = stationKey;
                const s = this.findStation(stationKey);
                if (!s) return;

                const color = s.StationLineColor || '#7AB420';
                const ring = document.getElementById('activeMapStationRing');
                if (ring && typeof MAP_STATION_HOTSPOTS !== 'undefined' && MAP_STATION_HOTSPOTS[stationKey]) {
                    const coords = MAP_STATION_HOTSPOTS[stationKey];
                    const rx = coords[0];
                    const ry = coords[1];
                    const ringR = (coords[2] ? coords[2] + 4 : 14);
                    ring.setAttribute('cx', rx);
                    ring.setAttribute('cy', ry);
                    ring.setAttribute('r', ringR);
                    ring.setAttribute('stroke', color);
                    ring.style.display = 'block';
                }

                const infoEl = document.getElementById('sheetStationInfo');
                if (infoEl) {
                    const enName = s.StationName_EN || s.StationNameEN || '';
                    const isOrange = (s.StationLineId === 106 || stationKey.startsWith('OR'));
                    const statusBadge = isOrange
                        ? `<div style="display:inline-block;margin-top:4px;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;background:rgba(245,130,32,0.15);color:#ea580c;border:1px solid rgba(245,130,32,0.3);">${this.lang === 'en' ? 'Orange Line (Not in Service)' : (this.lang === 'zh' ? '橙线 (尚未开通)' : 'สายสีส้ม (ยังไม่เปิดให้บริการ)')}</div>`
                        : '';
                    infoEl.innerHTML = `
                        <div class="sheet-badge" style="background:${color}">${esc(s.StationKey)}</div>
                        <div class="sheet-names">
                            <div class="th-name">${esc(stName(s))}</div>
                            <div class="en-name">${esc(enName)} ${connBadges(s.StationKey, s.StationLineId)}</div>
                            ${statusBadge}
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
                const ring = document.getElementById('activeMapStationRing');
                if (ring) ring.style.display = 'none';
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
            renderFaresView(forceRebuild = false) {
                const el = document.getElementById('faresViewContent');
                if (!el) return;

                const isEn = lang === 'en';
                const isZh = lang === 'zh';
                const activeId = this.faresActiveLine || 0;
                const activeLine = TRANSIT_LINES_CATALOG.find(l => l.id === activeId) || TRANSIT_LINES_CATALOG[0];

                let bodyHtml = '';

                if (activeId === 0) {
                    // ทั้งหมด (All Lines Overview)
                    bodyHtml = `
                        <!-- 20 Baht Flat Fare Policy Banner -->
                        <div class="info-card" style="background:linear-gradient(135deg,#dc26260d,#ef444415);border-color:#ef444444">
                            <span class="fare-badge-20">${isZh ? '20 泰铢封顶票价政策' : (isEn ? '20 Baht Flat Fare Policy' : 'นโยบาย 20 บาทตลอดสาย')}</span>
                            <h3 style="color:#b91c1c;display:flex;align-items:center;gap:8px">
                                <span style="display:inline-flex;gap:4px;align-items:center">${getLineIconSvg(102, false, 20)} ${getLineIconSvg(103, false, 20)} ${getLineIconSvg(105, false, 20)}</span>
                                <span>${isZh ? '全线 20 泰铢封顶 (EMV Contactless)' : (isEn ? 'Flat 20 Baht Fare (EMV Contactless)' : 'รถไฟฟ้า 20 บาทตลอดสาย (EMV Contactless)')}</span>
                            </h3>
                            <div style="font-size:12.5px;color:var(--ink);line-height:1.6">
                                ${isZh ? '使用 <b>EMV Contactless</b> 信用卡/借记卡刷卡乘车，单程最高票价不超过 <b>20 泰铢</b>：' : (isEn ? 'Passengers paying with <b>EMV Contactless</b> credit/debit cards pay a maximum fare of <b>฿20</b>:' : 'ผู้โดยสารที่แตะจ่ายด้วยบัตรเครดิต/เดบิต <b>EMV Contactless</b> เดินทางด้วยค่าโดยสารสูงสุดไม่เกิน <b>20 บาท</b>:')}
                                <ul style="margin:8px 0 8px 6px;padding-left:14px;list-style:none">
                                    <li style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                                        ${getLineIconSvg(102, false, 18)}
                                        <span><b>${isZh ? 'MRT 紫线 | (差隆拉差探):' : (isEn ? 'MRT Purple Line | (Chalong Ratchatham):' : 'MRT สายสีม่วง | (ฉลองรัชธรรม):')}</b> ${isZh ? '空磅派 ↔ 岛本 (最高 20 泰铢)' : (isEn ? 'Khlong Bang Phai ↔ Tao Poon (Max ฿20)' : 'คลองบางไผ่ ↔ เตาปูน (สูงสุด 20 บาท)')}</span>
                                    </li>
                                    <li style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                                        ${getLineIconSvg(103, false, 18)}
                                        <span><b>${isZh ? 'SRT 暗红线 | (塔尼拉塔雅):' : (isEn ? 'SRT Dark Red Line | (Thani Ratthaya):' : 'SRT สายสีแดงเข้ม | (ธานีรัถยา):')}</b> ${isZh ? '曼谷阿披瓦中央车站 ↔ 兰实 (最高 20 泰铢)' : (isEn ? 'Krung Thep Aphiwat ↔ Rangsit (Max ฿20)' : 'กรุงเทพอภิวัฒน์ ↔ รังสิต (สูงสุด 20 บาท)')}</span>
                                    </li>
                                    <li style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                                        ${getLineIconSvg(105, false, 18)}
                                        <span><b>${isZh ? 'SRT 浅红线 | (那空威提):' : (isEn ? 'SRT Light Red Line | (Nakhon Withi):' : 'SRT สายสีแดงอ่อน | (นครวิถี):')}</b> ${isZh ? '曼谷阿披瓦中央车站 ↔ 达林参 (最高 20 泰铢)' : (isEn ? 'Krung Thep Aphiwat ↔ Taling Chan (Max ฿20)' : 'กรุงเทพอภิวัฒน์ ↔ ตลิ่งชัน (สูงสุด 20 บาท)')}</span>
                                    </li>
                                    <li style="display:flex;align-items:center;gap:8px">
                                        <span style="display:inline-flex;align-items:center;gap:3px">${getLineIconSvg(102, false, 15)}⇄${getLineIconSvg(103, false, 15)}/${getLineIconSvg(105, false, 15)}</span>
                                        <span><b>${isZh ? '紫线与红线换乘 (Purple ⇄ Red):' : (isEn ? 'Cross-line Transfer (Purple ⇄ Red):' : 'เชื่อมต่อข้ามสายสีม่วงและสายสีแดง:')}</b> ${isZh ? '两线合并最高不超 20 泰铢 (需在挽赐/曼颂站 30 分钟内换乘)' : (isEn ? 'Max ฿20 combined (transfer at Bang Sue / Bang Son within 30 mins)' : 'สูงสุดรวมไม่เกิน 20 บาท (แตะเปลี่ยนขบวนที่สถานีบางซื่อ/บางซ่อน ภายใน 30 นาที)')}</span>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <!-- All Lines Comparison Table -->
                        <div class="info-card">
                            <h3 style="display:flex;align-items:center;gap:8px">
                                <span>${getUiIcon('chart', 16, 'var(--primary,#0284c7)')}</span>
                                <span>${isZh ? '全曼谷 12 条轨道交通线票价速查' : (isEn ? 'All Lines Fare Rate Comparison' : 'ตารางเปรียบเทียบอัตราค่าโดยสารทั้งระบบ (12 สาย)')}</span>
                            </h3>
                            <div style="font-size:12px;color:var(--muted);margin-bottom:8px">
                                ${isZh ? '点击下方各线路的“查看详情”按钮或上方导航标签，即可查看该线路详细阶梯票价' : (isEn ? 'Tap "Details" button below or use the pills above to view detailed fare structure' : 'แตะที่ปุ่ม "ดูราคา" ของแต่ละสายหรือแถบด้านบนเพื่อดูตารางราคาแบบละเอียด')}
                            </div>
                <div class="fare-cards-list">
                                ${TRANSIT_LINES_CATALOG.filter(l => l.id !== 0).map(l => {
                                    const lineName = isZh ? (l.nameZH || l.nameEN) : (isEn ? l.nameEN : l.nameTH);
                                    const pricingModel = esc(isZh ? (l.pricingModelZH || l.pricingModelEN) : (isEn ? l.pricingModelEN : l.pricingModelTH));
                                    const tickets = esc(isZh ? (l.ticketsZH || l.ticketsEN) : (isEn ? l.ticketsEN : l.ticketsTH));
                                    const actionText = isZh ? '查看详情' : (isEn ? 'Details' : 'ดูราคา');
                                    const pricingLbl = isZh ? '计费方式' : (isEn ? 'Pricing Model' : 'รูปแบบราคา');
                                    const ticketsLbl = isZh ? '车票 / 乘车卡' : (isEn ? 'Cards / Tickets' : 'บัตรโดยสาร');
                                    const fareRateStr = (l.minFare === '-' || l.maxFare === '-')
                                        ? '-'
                                        : `฿${l.minFare} - ฿${l.maxFare}`;

                                    return `
                                        <div class="fare-line-card">
                                            <div class="fare-card-head">
                                                <div class="fare-card-title">
                                                    ${getLineIconSvg(l.id, false, 17)}
                                                    <div class="fare-card-title-wrap">${formatLineTitleWithTag(lineName, l.color, 'card')}</div>
                                                </div>
                                                <div class="fare-badge-group">
                                                    <span class="fare-rate-pill" style="color:${l.color};border:1px solid ${l.color}44;background:${l.color}18;">
                                                        ${fareRateStr}
                                                    </span>
                                                    <button type="button" class="fare-card-action" onclick="App.setFaresLine(${l.id})" aria-label="${actionText} ${esc(lineName)}">
                                                        <span>${actionText}</span> ➔
                                                    </button>
                                                </div>
                                            </div>
                                            <div class="fare-details-grid">
                                                <div class="fare-info-row">
                                                    <div class="fare-info-head">
                                                        <span class="fare-info-icon">${getUiIcon('coins', 14, '#f59e0b')}</span>
                                                        <span>${pricingLbl}</span>
                                                    </div>
                                                    <div class="fare-info-desc">
                                                        ${pricingModel}
                                                    </div>
                                                </div>
                                                <div class="fare-info-row">
                                                    <div class="fare-info-head">
                                                        <span class="fare-info-icon">${getUiIcon('card', 14, '#10b981')}</span>
                                                        <span>${ticketsLbl}</span>
                                                    </div>
                                                    <div class="fare-info-desc">
                                                        ${tickets}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>

                        <!-- Payment & Card Guide -->
                        <div class="info-card">
                            <h3>${getUiIcon('ticket', 17, '#f59e0b')} ${isZh ? '车票类型与支付方式指南' : (isEn ? 'Tickets & Payment Methods Guide' : 'คู่มือประเภทบัตรและวิธีการชำระค่าโดยสาร')}</h3>
                            <div style="font-size:12.5px;color:var(--ink);line-height:1.6">
                                <div style="margin-bottom:12px">
                                    <div style="font-weight:700;color:var(--sky);display:flex;align-items:center;gap:6px;margin-bottom:4px">${getUiIcon('card', 15, 'var(--sky)')} <span>${isZh ? 'EMV Contactless 非接触式卡 (Visa / Mastercard)' : (isEn ? 'EMV Contactless (Visa / Mastercard)' : 'บัตร EMV Contactless (Visa / Mastercard)')}</span></div>
                                    <div style="color:var(--ink);opacity:0.92;line-height:1.6;padding-left:21px">
                                        ${isZh
                                            ? '可在 MRT 蓝线、紫线、黄线、粉红线以及 SRT 红线直接刷卡进出闸机。30 分钟内在接驳线路之间换乘可自动免除第二次进站起步费。'
                                            : (isEn ? 'Tap to pay at MRT Blue, Purple, Yellow, Pink lines, and SRT Red Line. Enjoy transfer fee waivers between connecting lines within 30 minutes.' : 'แตะจ่ายได้ทันทีผ่านประตูอัตโนมัติของ MRT สายสีน้ำเงิน, สายสีม่วง, สายสีเหลือง, สายสีชมพู และ SRT สายสีแดง พร้อมสิทธิ์ยกเว้นค่าแรกเข้าเมื่อแตะเปลี่ยนสายภายใน 30 นาที')
                                        }
                                    </div>
                                </div>
                                <div style="margin-bottom:12px">
                                    <div style="font-weight:700;color:#f59e0b;display:flex;align-items:center;gap:6px;margin-bottom:4px">${getUiIcon('card', 15, '#f59e0b')} <span>${isZh ? '兔卡 (Rabbit Card)' : (isEn ? 'Rabbit Card' : 'บัตรแรบบิท (Rabbit Card)')}</span></div>
                                    <div style="color:var(--ink);opacity:0.92;line-height:1.6;padding-left:21px">
                                        ${isZh
                                            ? '曼谷通用的储值交通卡，适用于 BTS 素坤逸线、是隆线、金线以及 MRT 黄线、粉红线。支持储值扣费及 30 天计次月票套餐。'
                                            : (isEn
                                                ? 'Accepted on BTS Sukhumvit, Silom, Gold lines, and MRT Yellow, Pink lines. Stored-value and 30-day passes available.'
                                                : 'บัตรแตะเดินทางยอดนิยม ใช้ได้กับ BTS สายสุขุมวิท, สายสีลม, สายสีทอง, MRT สายสีเหลือง และสายสีชมพู รองรับทั้งการเติมเงินและแพ็กเกจเที่ยวเดินทาง 30 วัน'
                                            )
                                        }
                                    </div>
                                    <div style="margin-top:8px;padding-left:21px;display:flex;flex-direction:column;gap:8px">
                                        <div>
                                            <div style="font-weight:700;color:var(--ink);margin-bottom:2px">• ${isZh ? '长者卡 (紫色)' : (isEn ? 'Senior Card (Purple)' : 'บัตรผู้สูงอายุ (สีม่วง)')}</div>
                                            <div style="color:var(--muted);line-height:1.5;padding-left:12px">${isZh ? '泰国籍 60 岁以上长者享受 50% 半价优惠。' : (isEn ? '50% discount for Thai seniors 60+.' : 'ลด 50% สำหรับผู้สูงอายุ 60 ปีขึ้นไป')}</div>
                                        </div>
                                        <div>
                                            <div style="font-weight:700;color:var(--ink);margin-bottom:2px">• ${isZh ? '学生卡 (绿色)' : (isEn ? 'Student Card (Green)' : 'บัตรนักเรียน/นักศึกษา (สีเขียว)')}</div>
                                            <div style="color:var(--muted);line-height:1.5;padding-left:12px">
                                                ${isZh
                                                    ? '23 岁以下学生可通过 Rabbit Rewards 购买计次优惠包 (黄线/粉红线平均每次仅约 20 泰铢)。'
                                                    : (isEn ? 'Eligible for discount trip pass packages (averaging ฿20/trip on Yellow/Pink lines) via Rabbit Rewards.' : 'อายุไม่เกิน 23 ปี รับสิทธิ์ซื้อแพ็กเกจเที่ยวเดินทางเหมาเที่ยวสุดคุ้ม (สายสีเหลือง/ชมพู เฉลี่ยเริ่มต้น ฿20/เที่ยว) ผ่าน Rabbit Rewards')
                                                }
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <div style="font-weight:700;color:var(--muted);display:flex;align-items:center;gap:6px;margin-bottom:4px">${getUiIcon('coins', 15, 'var(--muted)')} <span>${isZh ? '单程票 / 代币 (Single Journey Token & Card)' : (isEn ? 'Single Journey Token & Card' : 'เหรียญ / ตั๋วเที่ยวเดียว (Single Journey Token & Card)')}</span></div>
                                    <div style="color:var(--ink);opacity:0.92;line-height:1.6;padding-left:21px">
                                        ${isZh ? '可在各线全线车站的自动售票机投币/扫码购买，或至人工票务窗口购买。' : (isEn ? 'Available at automatic ticket vending machines and ticket offices at every station across all networks.' : 'หยอดเหรียญหรือสแกน QR Code ซื้อได้ที่ตู้จำหน่ายตั๋วอัตโนมัติและเคาน์เตอร์ทุกสถานี')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                } else {
                    // ข้อมูลเฉพาะสาย (Specific Line View)
                    const lineName = isZh ? (activeLine.nameZH || activeLine.nameEN) : (isEn ? activeLine.nameEN : activeLine.nameTH);
                    const terminus = isZh ? (activeLine.terminusZH || activeLine.terminusEN) : (isEn ? activeLine.terminusEN : activeLine.terminusTH);
                    const operator = isZh ? (activeLine.operatorZH || activeLine.operatorEN) : (isEn ? activeLine.operatorEN : activeLine.operatorTH);

                    let specificContent = '';

                    if (activeId === 1 || activeId === 2) {
                        // Sukhumvit & Silom Lines
                        specificContent = `
                            <div class="info-card">
                                <h3>${getUiIcon('chart', 16, '#0284c7')} ${isZh ? '核心线路阶梯票价表 (Mo Chit - On Nut / National Stadium - Saphan Taksin)' : (isEn ? 'Core Section Station Fare Matrix' : 'ตารางอัตราค่าโดยสารเส้นทางสัมปทานหลัก (หมอชิต–อ่อนนุช / สนามกีฬาฯ–สะพานตากสิน)')}</h3>
                                <div style="font-size:12px;color:var(--muted);margin-bottom:8px">
                                    ${isZh ? '票价根据乘坐车站数量递增，1 站 ฿17 起至最高 ฿47' : (isEn ? 'Station count fare structure starting at ฿17 up to ฿47' : 'คิดตามจำนวนสถานีที่เดินทาง เริ่มต้น 17 บาท สูงสุด 47 บาท')}
                                </div>
                                <div class="fare-table-wrap">
                                    <table class="fare-grid-table compact-table">
                                        <thead>
                                            <tr>
                                                <th style="white-space:nowrap;">${isZh ? '乘坐车站数' : (isEn ? 'Stations' : 'จำนวนสถานี')}</th>
                                                <th style="white-space:nowrap;">${isZh ? '普通成人' : (isEn ? 'Adult' : 'บุคคลทั่วไป')}</th>
                                                <th style="white-space:nowrap;">${isZh ? '学生卡' : (isEn ? 'Student' : 'นักเรียน/นักศึกษา')}</th>
                                                <th style="white-space:nowrap;">${isZh ? '长者卡' : (isEn ? 'Senior' : 'ผู้สูงอายุ')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${BTS_STATION_FARES.map(r => `
                                                <tr>
                                                    <td style="white-space:nowrap;"><b>${esc(isZh ? (r.stnZH || r.stnEN) : (isEn ? r.stnEN : r.stnTH))}</b></td>
                                                    <td style="white-space:nowrap;color:${activeLine.color}"><b>฿${r.adult}</b></td>
                                                    <td style="white-space:nowrap;">฿${r.student}</td>
                                                    <td style="white-space:nowrap;">฿${r.senior}</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                                <div style="font-size:12px;color:var(--muted);margin-top:8px;line-height:1.5;">
                                    ${getUiIcon('bulb', 14, '#f59e0b')} <b>${isZh ? '延伸线计费规则:' : (isEn ? 'Extension Fee Rule:' : 'เงื่อนไขส่วนต่อขยาย:')}</b>
                                    ${activeId === 1
                                        ? (isZh
                                            ? '跨入延伸线段 (莫奇–库括 或 翁聿–凯哈) 加收 15 泰铢 (长者 8 泰铢)，全线最高票价封顶不超过 62 泰铢。'
                                            : (isEn ? 'Traveling into extension sections (Mo Chit–Khu Khot or On Nut–Kheha) adds ฿15 (Senior ฿8). Maximum fare is capped at ฿62.' : 'การเดินทางเข้าสู่ส่วนต่อขยาย (หมอชิต–คูคต หรือ อ่อนนุช–เคหะฯ) คิดค่าโดยสารเพิ่ม 15 บาท (ผู้สูงอายุ 8 บาท) รวมค่าโดยสารสูงสุดไม่เกิน 62 บาท'))
                                        : (isZh
                                            ? '跨入延伸线段 (吞武里城–曼瓦) 加收 15 泰铢 (长者 8 泰铢)，全线最高票价封顶不超过 62 泰铢。'
                                            : (isEn ? 'Traveling into extension section (Krung Thon Buri–Bang Wa) adds ฿15 (Senior ฿8). Maximum fare is capped at ฿62.' : 'การเดินทางเข้าสู่ส่วนต่อขยาย (กรุงธนบุรี–บางหว้า) คิดค่าโดยสารเพิ่ม 15 บาท (ผู้สูงอายุ 8 บาท) รวมค่าโดยสารสูงสุดไม่เกิน 62 บาท'))
                                    }
                                </div>
                            </div>
                        `;
                    } else if (activeId === 3) {
                        // Gold Line
                        specificContent = `
                            <div class="info-card" style="background:linear-gradient(135deg,#c9a03810,#c9a03820);border-color:#c9a03855">
                                <span class="fare-badge-20" style="background:#C9A038">฿16 ${isZh ? '单一票价' : (isEn ? 'Flat Rate' : 'ราคาเดียวตลอดสาย')}</span>
                                <h3 style="color:#a17c24">
                                    <span>${isZh ? '全线统一票价 16 泰铢' : (isEn ? 'Flat 16 Baht Fare' : 'อัตราค่าโดยสาร 16 บาท ตลอดสาย')}</span>
                                </h3>
                                <div style="font-size:12.5px;color:var(--ink);line-height:1.6">
                                    ${isZh
                                        ? '金色线全线 3 座车站 (吞武里城 ↔ 乍能纳空 (ICONSIAM) ↔ 空讪) 实行单一统一定价 <b>16 泰铢</b>，乘车 1 站或坐至终点站均为统一价格。'
                                        : (isEn
                                            ? 'The Gold Line operates under a single flat fare of <b>฿16</b> regardless of distance across all 3 stations (Krung Thon Buri ↔ Charoen Nakhon ↔ Khlong San).'
                                            : 'รถไฟฟ้าสายสีทองคิดค่าโดยสารอัตราเดียว <b>16 บาท</b> ตลอดสายครอบคลุมทั้ง 3 สถานี (กรุงธนบุรี ↔ เจริญนคร (ไอคอนสยาม) ↔ คลองสาน) เดินทาง 1 สถานี หรือจนสุดสายราคาเท่ากัน')
                                    }
                                </div>
                            </div>
                        `;
                    } else if (activeId === 4 || activeId === 5) {
                        // Yellow / Pink Line Monorails
                        specificContent = `
                            <div class="info-card">
                                <h3>${getUiIcon('chart', 16, '#0284c7')} ${isZh ? '按里程计费阶梯票价表' : (isEn ? 'Distance-Based Fare Tiers' : 'ตารางอัตราค่าโดยสารตามระยะทาง')}</h3>
                                <div style="font-size:12px;color:var(--muted);margin-bottom:8px">
                                    ${isZh ? '按行驶里程计价，起步 15 泰铢至最高 45 泰铢' : (isEn ? 'Distance-based tariff structure starting at ฿15 up to ฿45' : 'อัตราค่าโดยสารตามระยะทางเริ่มต้น 15 บาท ถึงสูงสุด 45 บาท')}
                                </div>
                                <div class="fare-table-wrap">
                                    <table class="fare-grid-table compact-table">
                                        <thead>
                                            <tr>
                                                <th style="white-space:nowrap;">${isZh ? '乘车站数 / 距离' : (isEn ? 'Distance Traveled' : 'ระยะทาง / สถานีที่เดินทาง')}</th>
                                                <th style="white-space:nowrap;">${isZh ? '普通成人' : (isEn ? 'Adult' : 'บุคคลทั่วไป')}</th>
                                                <th style="white-space:nowrap;">${isZh ? '学生' : (isEn ? 'Student' : 'นักเรียน/นักศึกษา')}</th>
                                                <th style="white-space:nowrap;">${isZh ? '长者 (-50%)' : (isEn ? 'Senior (-50%)' : 'ผู้สูงอายุ (-50%)')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${MONORAIL_FARES.map(r => `
                                                <tr>
                                                    <td style="white-space:nowrap;"><b>${esc(isZh ? (r.stnZH || r.stnEN) : (isEn ? r.stnEN : r.stnTH))}</b></td>
                                                    <td style="white-space:nowrap;color:${activeLine.color}"><b>฿${r.adult}</b></td>
                                                    <td style="white-space:nowrap;">฿${r.student}</td>
                                                    <td style="white-space:nowrap;color:#10b981;"><b>฿${r.senior}</b></td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                                <div style="margin-top:12px;display:flex;flex-direction:column;gap:8px;">
                                    <div style="background:rgba(255,255,255,0.03);border:1px solid var(--line);border-radius:10px;padding:9px 12px;font-size:12px;line-height:1.6;">
                                        <div style="font-weight:700;color:#10b981;display:flex;align-items:center;gap:6px;margin-bottom:2px;">
                                            <span>${getUiIcon('check', 15, '#10b981')}</span>
                                            <span>${isZh ? '长者乘车优惠 (泰国籍 60 岁以上):' : (isEn ? 'Senior Citizen Fare (Thai Seniors 60+):' : 'อัตราค่าโดยสารผู้สูงอายุ (60 ปีขึ้นไป):')}</span>
                                        </div>
                                        <div style="color:var(--ink);">
                                            ${isZh
                                                ? '泰国籍 60 岁以上长者可享受标准票价 <b>50% 半价优惠</b> (实付约 <b>฿8 - ฿23</b>)。使用 <b>兔卡长者卡 (紫色)</b> 刷卡或于车站票务处出示泰国国民身份证购买单程票均可享受。'
                                                : (isEn
                                                    ? 'Thai seniors aged 60+ receive a <b>50% discount</b> on standard fare (approx. <b>฿8 - ฿23</b>). Valid using <b>Rabbit Senior Card</b> (Purple) or by presenting Thai National ID card at the ticket office.'
                                                    : 'ผู้สูงอายุสัญชาติไทย (อายุ 60 ปีขึ้นไป) ได้รับส่วนลด <b>50%</b> จากอัตราปกติ (เหลือประมาณ <b>8 – 23 บาท</b>) เมื่อใช้ <b>บัตรแรบบิทผู้สูงอายุ (สีม่วง)</b> แตะผ่านประตู หรือแสดงบัตรประชาชนซื้อตั๋วเที่ยวเดียวที่ห้องจำหน่ายตั๋ว')
                                            }
                                        </div>
                                    </div>
                                    <div style="background:rgba(255,255,255,0.03);border:1px solid var(--line);border-radius:10px;padding:9px 12px;font-size:12px;line-height:1.6;">
                                        <div style="font-weight:700;color:var(--accent);display:flex;align-items:center;gap:6px;margin-bottom:2px;">
                                            <span>${getUiIcon('student', 15, 'var(--accent)')}</span>
                                            <span>${isZh ? '学生优惠票价与计次特惠包:' : (isEn ? 'Student Fares & Special Trip Pass:' : 'อัตราค่าโดยสารนักเรียน / นักศึกษา:')}</span>
                                        </div>
                                        <div style="color:var(--ink);">
                                            ${isZh
                                                ? '<b>单程票:</b> 按常规成人票价计费 (<b>15 – 45 泰铢</b>，单次购票无折扣)。<br><b>计次包:</b> 23 岁以下学生可通过 <b>Rabbit Rewards</b> 应用程序 (绑定绿色 Rabbit Student 卡) 或车站人工窗口购买<b>计次特惠套餐</b>，平均每次低至 <b>20 泰铢</b>。'
                                                : (isEn
                                                    ? '<b>Single Journey:</b> Charged at regular adult fare (<b>฿15 - ฿45</b>).<br><b>Discount Pass:</b> Students (under 23) can purchase special trip packages averaging <b>฿20 per trip</b> via <b>Rabbit Rewards</b> (paired with Rabbit Student Card) or at station ticket offices.'
                                                    : '<b>รายเที่ยว:</b> คิดตามอัตราค่าโดยสารปกติ (<b>15 – 45 บาท</b> ไม่มีส่วนลดเปอร์เซ็นต์รายเที่ยว)<br><b>แพ็กเกจเหมาเที่ยว:</b> นักเรียน/นักศึกษา (อายุไม่เกิน 23 ปี) สามารถซื้อ <b>"แพ็กเกจเที่ยวเดินทางเหมาเที่ยว"</b> ราคาพิเศษเฉลี่ยเริ่มต้นเพียง <b>20 บาทต่อเที่ยว</b> ผ่านแอป <b>Rabbit Rewards</b> (ผูกบัตร Rabbit Student สีเขียว) หรือห้องจำหน่ายตั๋ว')
                                            }
                                        </div>
                                    </div>
                                    <div style="background:rgba(255,255,255,0.03);border:1px solid var(--line);border-radius:10px;padding:9px 12px;font-size:12px;line-height:1.6;">
                                        <div style="font-weight:700;color:#38bdf8;display:flex;align-items:center;gap:6px;margin-bottom:2px;">
                                            <span>${getUiIcon('child', 15, '#38bdf8')}</span>
                                            <span>${isZh ? '幼童与残障人士免票政策:' : (isEn ? 'Children & Persons with Disabilities:' : 'เด็กเล็กและผู้พิการ:')}</span>
                                        </div>
                                        <div style="color:var(--ink);">
                                            ${isZh
                                                ? '身高不超过 90 厘米的儿童及残障人士 (出示残疾证) <b>免费乘车</b>。'
                                                : (isEn
                                                    ? 'Children under 90 cm in height and persons with disabilities travel <b>FREE</b>.'
                                                    : 'เด็กส่วนสูงไม่เกิน 90 ซม. และผู้พิการ (แสดงบัตรคนพิการ) เดินทาง <b>ฟรี</b>')
                                            }
                                        </div>
                                    </div>
                                    <div style="background:rgba(255,255,255,0.03);border:1px solid var(--line);border-radius:10px;padding:9px 12px;font-size:12px;line-height:1.6;">
                                        <div style="font-weight:700;color:#fbbf24;display:flex;align-items:center;gap:6px;margin-bottom:2px;">
                                            <span>${getUiIcon('bulb', 15, '#fbbf24')}</span>
                                            <span>${isZh ? '换乘优惠 (EMV Transfer Waiver):' : (isEn ? 'EMV Transfer Waiver:' : 'สิทธิประโยชน์การเปลี่ยนสาย (EMV Transfer):')}</span>
                                        </div>
                                        <div style="color:var(--ink);">
                                            ${isZh
                                                ? '在 30 分钟内使用同一张 EMV 非接触卡换乘相连的捷运系统 (如 MRT 蓝线、紫线、SRT 红线) 时，第二条线路的起步进站费 (14 – 15 泰铢) 将被自动免除。'
                                                : (isEn
                                                    ? 'When transferring with connecting MRT or SRT lines via the same EMV Contactless card within 30 minutes, the second entry fee (฿14 - ฿15) is waived automatically.'
                                                    : 'เมื่อเดินทางเปลี่ยนสายไปยังระบบรถไฟฟ้าที่เชื่อมต่อกัน (เช่น สายสีน้ำเงิน, สายสีม่วง, สายสีแดง) ด้วยบัตร EMV ใบเดิมภายใน 30 นาที จะได้รับยกเว้นค่าแรกเข้าของสายที่สองทันที (ประหยัดได้ 14 – 15 บาท)')
                                            }
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `;
                    } else if (activeId === 101) {
                        // MRT Blue Line
                        specificContent = `
                            <div class="info-card">
                                <h3>${getUiIcon('chart', 16, '#0284c7')} ${isZh ? '按乘车站数计费标准表' : (isEn ? 'Station Count Fare Structure' : 'ตารางอัตราค่าโดยสารตามจำนวนสถานี')}</h3>
                                <div class="fare-table-wrap">
                                    <table class="fare-grid-table compact-table">
                                        <thead>
                                            <tr>
                                                <th style="white-space:nowrap;">${isZh ? '乘坐车站数' : (isEn ? 'Stations' : 'จำนวนสถานี')}</th>
                                                <th style="white-space:nowrap;">${isZh ? '普通成人' : (isEn ? 'Adult' : 'บุคคลทั่วไป')}</th>
                                                <th style="white-space:nowrap;">${isZh ? '学生 (-10%)' : (isEn ? 'Student (-10%)' : 'นักเรียน/นักศึกษา (-10%)')}</th>
                                                <th style="white-space:nowrap;">${isZh ? '儿童/长者 (-50%)' : (isEn ? 'Children/Senior (-50%)' : 'เด็ก/ผู้สูงอายุ (-50%)')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${MRT_BLUE_FARES.map(r => `
                                                <tr>
                                                    <td style="white-space:nowrap;"><b>${esc(isZh ? (r.stnZH || r.stnEN) : (isEn ? r.stnEN : r.stnTH))}</b></td>
                                                    <td style="white-space:nowrap;color:${activeLine.color}"><b>฿${r.adult}</b></td>
                                                    <td style="white-space:nowrap;">฿${r.student}</td>
                                                    <td style="white-space:nowrap;">฿${r.senior}</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                                <div style="font-size:12px;color:var(--muted);margin-top:8px;line-height:1.5;">
                                    ${getUiIcon('bulb', 14, '#f59e0b')} <b>${isZh ? '环线最短路径计费原则:' : (isEn ? 'Loop Calculation Principle:' : 'หลักการคำนวณราคาเส้นทางวงกลม:')}</b>
                                    ${isZh
                                        ? '在环形线路或途经塔帕 (Tha Phra) 换乘站乘车时，系统一律按照起点与终点之间的最短路径里程计费，即便乘客实际乘坐了较长路线也不会多扣费。'
                                        : (isEn
                                            ? 'When traveling across the loop or passing Tha Phra interchange, the system always calculates and charges based on the shortest geometric route between your origin and destination stations, even if you travel via a longer path.'
                                            : 'สำหรับการเดินทางในสายวงกลมหรือผ่านสถานีชุมทางท่าพระ ระบบจะคำนวณและคิดค่าโดยสารตามเส้นทางที่สั้นที่สุดเสมอ แม้ผู้โดยสารจะเลือกเดินทางผ่านทางที่ยาวกว่า')
                                    }
                                </div>
                            </div>
                        `;
                    } else if (activeId === 102 || activeId === 103 || activeId === 105) {
                        // 20 Baht Flat Cap Lines
                        specificContent = `
                            <div class="info-card" style="background:linear-gradient(135deg,#dc262610,#ef444420);border-color:#ef444455">
                                <span class="fare-badge-20" style="background:#b91c1c">฿20 ${isZh ? '全线封顶' : (isEn ? 'Max Flat Fare' : 'สูงสุดตลอดสาย')}</span>
                                <h3 style="color:#b91c1c">
                                    <span>${isZh ? '20 泰铢全线封顶票价政策' : (isEn ? '20 Baht Flat Cap Policy' : 'นโยบาย 20 บาทตลอดสาย')}</span>
                                </h3>
                                <div style="font-size:12.5px;color:var(--ink);line-height:1.6">
                                    ${isZh
                                        ? `使用 EMV Contactless 刷卡乘车，无论乘坐多少站，单线最高仅需 <b>20 泰铢</b>！(按实际里程原价为 ฿${activeLine.minFare} - ฿20)。且在 30 分钟内于挽赐/曼颂站换乘 <b>MRT 紫线 ⇄ SRT 红线</b>，两线总费用同样封顶仅 <b>20 泰铢</b>！`
                                        : (isEn
                                            ? `Passengers pay a maximum of <b>฿20</b> for any distance traveled on this line. When transferring between <b>MRT Purple Line ⇄ SRT Red Line</b> at Bang Sue / Bang Son within 30 minutes via the same EMV Contactless card, the total combined fare is capped at only <b>฿20</b>!`
                                            : `ผู้โดยสารเดินทางด้วยค่าโดยสารสูงสุด <b>ไม่เกิน 20 บาท</b> ตลอดสาย (ราคาปกติตามระยะทางคือ ฿${activeLine.minFare} - ฿20 หากคำนวณเกิน 20 บาทจะคิดเพียง 20 บาท) และเมื่อแตะเปลี่ยนขบวนระหว่าง <b>สายสีม่วง ⇄ สายสีแดง</b> ที่สถานีบางซื่อ/บางซ่อน ภายใน 30 นาทีด้วยบัตร EMV ใบเดิม รวมค่าเดินทางทั้ง 2 สายสูงสุดไม่เกิน <b>20 บาท</b> เช่นกัน`)
                                    }
                                </div>
                            </div>
                        `;
                    } else if (activeId === 104) {
                        // ARL
                        specificContent = `
                            <div class="info-card">
                                <h3>${getUiIcon('chart', 16, '#0284c7')} ${isZh ? '机场快线各站票价表 (从披耶泰 A8 出发)' : (isEn ? 'Airport Rail Link Station Fare Matrix' : 'อัตราค่าโดยสารสถานี แอร์พอร์ต เรล ลิงก์ (จากพญาไท)')}</h3>
                                <div class="fare-table-wrap">
                                    <table class="fare-grid-table compact-table">
                                        <thead>
                                            <tr>
                                                <th style="white-space:nowrap;">${isZh ? '车站' : (isEn ? 'Station' : 'สถานี')}</th>
                                                <th style="white-space:nowrap;">${isZh ? '从披耶泰 (A8) 票价' : (isEn ? 'From Phaya Thai (A8)' : 'ราคาจากพญาไท (A8)')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${ARL_STATION_FARES.map(r => `
                                                <tr>
                                                    <td style="white-space:nowrap;">
                                                        <span class="stn-code-badge" style="background:${activeLine.color};margin-right:6px;">${r.code}</span>
                                                        <b>${esc(isZh ? (r.zh || r.en) : (isEn ? r.en : r.th))}</b>
                                                    </td>
                                                    <td style="white-space:nowrap;color:${activeLine.color}"><b>${r.price}</b></td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                                <div style="font-size:12px;color:var(--muted);margin-top:8px;">
                                    ${getUiIcon('plane', 14, '#0284c7')} ${isZh ? '从市中心 (披耶泰站) 直达素万那普机场，仅需 26 分钟，单程仅 45 泰铢。' : (isEn ? 'Express travel from downtown (Phaya Thai) direct to Suvarnabhumi Airport in just 26 minutes for only ฿45.' : 'เดินทางจากใจกลางเมือง (พญาไท) ตรงสู่สนามบินสุวรรณภูมิ รวดเร็วเพียง 26 นาที ในราคา 45 บาท')}
                                </div>
                            </div>
                        `;
                    } else if (activeId === 201) {
                        // BRT
                        specificContent = `
                            <div class="info-card" style="background:linear-gradient(135deg,#82c34110,#82c34120);border-color:#82c34155">
                                <span class="fare-badge-20" style="background:#82C341">฿15 ${isZh ? '单一票价' : (isEn ? 'Flat Rate' : 'ราคาเดียวตลอดสาย')}</span>
                                <h3 style="color:#5f9628">
                                    <span>${isZh ? '全线单一票价 15 泰铢' : (isEn ? 'Flat 15 Baht Fare' : 'อัตราค่าโดยสาร 15 บาท ตลอดสาย')}</span>
                                </h3>
                                <div style="font-size:12.5px;color:var(--ink);line-height:1.6">
                                    ${isZh
                                        ? '曼谷快捷公交 BRT 实行全线单一票价 <b>15 泰铢</b>，覆盖全部 12 座车站 (沙吞 ↔ 拉差普鲁)。泰国籍 60 岁以上长者享受优惠票价仅 <b>8 泰铢</b>。'
                                        : (isEn
                                            ? 'Bangkok BRT operates under a flat fare of <b>฿15</b> across all 12 stations (Sathorn ↔ Ratchaphruek). Thai seniors (60+) pay a discounted fare of only <b>฿8</b>.'
                                            : 'รถโดยสารด่วนพิเศษ BRT คิดค่าโดยสารอัตราเดียว <b>15 บาท</b> ตลอดสายครอบคลุมทั้ง 12 สถานี (สาทร ↔ ราชพฤกษ์) โดยผู้สูงอายุสัญชาติไทย (60 ปีขึ้นไป) ได้รับส่วนลดเหลือเพียง <b>8 บาท</b>')
                                    }
                                </div>
                            </div>
                        `;
                    } else if (activeId === 106) {
                        // MRT Orange Line
                        specificContent = `
                            <div class="info-card">
                                <h3>${getUiIcon('chart', 16, '#f58220')} ${isZh ? '按乘车站数计费标准表' : (isEn ? 'Station Count Fare Structure' : 'ตารางอัตราค่าโดยสารตามจำนวนสถานี')}</h3>
                                <div class="fare-table-wrap">
                                    <table class="fare-grid-table compact-table">
                                        <thead>
                                            <tr>
                                                <th style="white-space:nowrap;">${isZh ? '乘坐车站数' : (isEn ? 'Stations' : 'จำนวนสถานี')}</th>
                                                <th style="white-space:nowrap;">${isZh ? '普通成人' : (isEn ? 'Adult' : 'บุคคลทั่วไป')}</th>
                                                <th style="white-space:nowrap;">${isZh ? '学生 (-10%)' : (isEn ? 'Student (-10%)' : 'นักเรียน/นักศึกษา (-10%)')}</th>
                                                <th style="white-space:nowrap;">${isZh ? '儿童/长者 (-50%)' : (isEn ? 'Children/Senior (-50%)' : 'เด็ก/ผู้สูงอายุ (-50%)')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${MRT_BLUE_FARES.map(r => `
                                                <tr>
                                                    <td style="white-space:nowrap;"><b>${esc(isZh ? (r.stnZH || r.stnEN) : (isEn ? r.stnEN : r.stnTH))}</b></td>
                                                    <td style="white-space:nowrap;color:${activeLine.color}"><b>฿${r.adult}</b></td>
                                                    <td style="white-space:nowrap;">฿${r.student}</td>
                                                    <td style="white-space:nowrap;">฿${r.senior}</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                                <div style="font-size:12px;color:var(--muted);margin-top:8px;line-height:1.5;">
                                    ${getUiIcon('bulb', 14, '#f59e0b')} <b>${isZh ? '泰国大众捷运局 (MRTA) 标准计费结构:' : (isEn ? 'Standard MRT Tariff:' : 'โครงสร้างราคามาตรฐาน รฟม.:')}</b>
                                    ${isZh
                                        ? '按照乘车里程计费，起步 17 泰铢至最高 44 泰铢。支持 EMV Contactless 刷卡乘车，30 分钟内换乘蓝线或其他捷运线路可免除第二次起步费。'
                                        : (isEn
                                            ? 'Calculated based on distance traveled starting from ฿17 up to ฿44 maximum. Passengers with EMV Contactless cards receive transfer fee waivers when connecting to other MRT lines within 30 minutes.'
                                            : 'คิดค่าโดยสารตามระยะทางเริ่มต้น 17 บาท สูงสุดไม่เกิน 44 บาท รองรับบัตร EMV Contactless และได้รับยกเว้นค่าแรกเข้าเมื่อเปลี่ยนถ่ายกับสายสีน้ำเงินหรือสายสีอื่นในระบบภายใน 30 นาที')
                                    }
                                </div>
                            </div>
                        `;
                    }

                    bodyHtml = `
                        <!-- Line Hero Card -->
                        <div class="line-hero-card" style="border-left:5px solid ${activeLine.color}">
                            <div class="line-hero-header" style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;">
                                <div style="display:flex;align-items:flex-start;gap:10px;min-width:0;flex:1;">
                                    <div style="flex-shrink:0;margin-top:2px;">${getLineIconSvg(activeLine.id, false, 28)}</div>
                                    <div style="min-width:0;flex:1;">
                                        <div class="line-hero-title-wrap">${formatLineTitleWithTag(lineName, activeLine.color)}</div>
                                        <div style="font-size:12px;color:var(--muted);line-height:1.45;word-break:break-word;margin-top:3px;">
                                            <div>${esc(operator)}</div>
                                            <div style="margin-top:2px;">${esc(terminus)}</div>
                                        </div>
                                    </div>
                                </div>
                                <button type="button" class="btn btn-ghost" style="padding:5px 10px;font-size:11.5px;margin-left:auto;white-space:nowrap;flex-shrink:0;" onclick="App.setFaresLine(0)">
                                    ${isZh ? '查看全部线路' : (isEn ? 'View All Lines' : 'ดูทุกสาย')} ↺
                                </button>
                            </div>

                            <div class="line-metrics-grid">
                                <div class="line-metric-box">
                                    <div class="label">${isZh ? '起步票价' : (isEn ? 'Starting Fare' : 'ราคาเริ่มต้น')}</div>
                                    <div class="val" style="color:${activeLine.color}">฿${activeLine.minFare}</div>
                                </div>
                                <div class="line-metric-box">
                                    <div class="label">${isZh ? '最高封顶票价' : (isEn ? 'Maximum Fare' : 'ราคาสูงสุด')}</div>
                                    <div class="val" style="color:${activeLine.color}">฿${activeLine.maxFare}</div>
                                </div>
                                <div class="line-metric-box full-col">
                                    <div class="label">${isZh ? '计费方式' : (isEn ? 'Pricing Basis' : 'การคำนวณราคา')}</div>
                                    <div class="val">${esc(isZh ? (activeLine.pricingModelZH || activeLine.pricingModelEN) : (isEn ? activeLine.pricingModelEN : activeLine.pricingModelTH))}</div>
                                </div>
                                <div class="line-metric-box full-col">
                                    <div class="label">${isZh ? '支持车票/乘车卡' : (isEn ? 'Tickets & Cards' : 'บัตรโดยสารที่รองรับ')}</div>
                                    <div class="val" style="color:var(--muted);">${esc(isZh ? (activeLine.ticketsZH || activeLine.ticketsEN) : (isEn ? activeLine.ticketsEN : activeLine.ticketsTH))}</div>
                                </div>
                            </div>
                        </div>

                        ${specificContent}

                        <!-- Action Button to Switch to Timetables of this Line -->
                        <div style="text-align:center;margin:16px 0 6px;">
                            <button type="button" class="btn btn-primary" style="background:${activeLine.color};border-color:${activeLine.color};box-shadow:0 4px 14px ${activeLine.color}40;display:inline-flex;align-items:center;gap:8px;white-space:nowrap;padding:11px 22px;max-width:100%;"
                                onclick="App.switchView('timetables');App.setTimetablesLine(${activeLine.id})">
                                <span>${getUiIcon('clock', 14, '#fff')} ${isZh ? '查看该线路列车时刻与发车频次' : (isEn ? 'View Timetables of This Line' : 'ดูเวลาเดินรถ & ความถี่สายนี้')}</span>
                                <span>➔</span>
                            </button>
                        </div>
                    `;
                }

                const existingBar = document.getElementById('faresLineFilterBar');
                const existingBody = document.getElementById('faresViewBody');
                const langMatches = existingBar && existingBar.getAttribute('data-lang') === lang;

                if (!forceRebuild && existingBar && existingBody && langMatches) {
                    existingBody.innerHTML = bodyHtml;
                    const pills = existingBar.querySelectorAll('.line-filter-pill');
                    let activePill = null;
                    pills.forEach((p) => {
                        const lineId = Number(p.getAttribute('data-line-id'));
                        const isActive = lineId === activeId;
                        const isBrt = lineId === 201;
                        p.classList.toggle('active', isActive);
                        p.classList.toggle('tab-brt', isBrt);
                        const lineData = TRANSIT_LINES_CATALOG.find(l => l.id === lineId);
                        if (lineData) {
                            p.style.cssText = isActive
                                ? (isBrt ? '' : `background:${lineData.color};color:#ffffff;border-color:${lineData.color};font-weight:700;box-shadow:0 3px 10px ${lineData.color}55;`)
                                : '';
                            const iconWrap = p.querySelector('.pill-icon');
                            if (iconWrap) {
                                iconWrap.innerHTML = getLineIconSvg(lineData.id, isActive, 15);
                            }
                        }
                        if (isActive) activePill = p;
                    });
                    if (activePill) {
                        scrollActivePillIntoView(existingBar, activePill, true);
                    }
                } else {
                    el.innerHTML = `
                        <div style="margin-bottom:12px;">
                            <h2 style="font-size:18px;font-weight:800;color:var(--ink);margin:0 0 4px;display:flex;align-items:center;gap:8px;">
                                <span>${getUiIcon('coins', 18, '#f59e0b')}</span>
                                <span>${T('faresTitle')}</span>
                            </h2>
                            <div style="font-size:12px;color:var(--muted)">
                                ${isZh ? '选择下方轨道交通线路，查看具体票价、计费规则及支持的车票支付方式' : (isEn ? 'Select a transit line below to view fare rates, pricing models, and payment methods' : 'เลือกสายรถไฟฟ้าด้านล่าง เพื่อดูอัตราค่าโดยสาร โครงสร้างราคา และบัตรโดยสารที่รองรับ')}
                            </div>
                        </div>
                        ${renderLineFilterBar(activeId, 'setFaresLine', 'faresLineFilterBar')}
                        <div id="faresViewBody">
                            ${bodyHtml}
                        </div>
                    `;
                    const newBar = document.getElementById('faresLineFilterBar');
                    const activePill = newBar ? newBar.querySelector('.line-filter-pill.active') : null;
                    if (newBar && activePill) {
                        requestAnimationFrame(() => {
                            scrollActivePillIntoView(newBar, activePill, false);
                        });
                    }
                }
            },

            /* ---------- THE SKYTRAINs: Timetables View (เวลาเดินรถ & ความถี่ตามสาย) ---------- */
            renderTimetablesView(forceRebuild = false) {
                const el = document.getElementById('timetablesViewContent');
                if (!el) return;

                const isEn = lang === 'en';
                const isZh = lang === 'zh';
                const activeId = this.timetablesActiveLine || 0;
                const activeLine = TRANSIT_LINES_CATALOG.find(l => l.id === activeId) || TRANSIT_LINES_CATALOG[0];

                let bodyHtml = '';

                if (activeId === 0) {
                    // ทั้งหมด (All Lines Timetables Overview)
                    const formatTimetableStat = (rawStr) => {
                        if (!rawStr) return '<span class="stat-main-val">-</span>';
                        const s = String(rawStr).trim();
                        const match = s.match(/^(.*?)\s*(\([^)]*\))\s*$/);
                        if (match) {
                            return `<span class="stat-main-val">${esc(match[1])}</span><span class="stat-sub-val">${esc(match[2])}</span>`;
                        }
                        if (!/\d/.test(s) && s.length >= 6) {
                            return `<span class="stat-long-val">${esc(s)}</span>`;
                        }
                        return `<span class="stat-main-val">${esc(s)}</span>`;
                    };

                    bodyHtml = `
                        <!-- All Lines Timetable Overview Table -->
                        <div class="info-card">
                            <h3 style="display:flex;align-items:center;gap:8px">
                                <span>${getUiIcon('clock', 16, 'var(--primary,#0284c7)')}</span>
                                <span>${isZh ? '全曼谷 12 条轨道交通线列车时刻表速查' : (isEn ? 'All Lines Timetable Overview' : 'ตารางสรุปเวลาเดินรถทั้งระบบ (12 สาย)')}</span>
                            </h3>
                            <div style="font-size:12px;color:var(--muted);margin-bottom:8px">
                                ${isZh ? '点击下方各线路的“查看时刻”按钮或上方导航标签，即可查看该线路详细发车时刻表与频次' : (isEn ? 'Tap "Timetable" button below or use the pills above to view official frequency schedule table' : 'แตะที่ปุ่ม "ดูตาราง" ของแต่ละสายหรือแถบด้านบนเพื่อดูตารางความถี่การเดินรถแบบละเอียด')}
                            </div>
                            <div class="timetable-cards-list">
                                ${TRANSIT_LINES_CATALOG.filter(l => l.id !== 0).map(l => {
                                    const lineName = isZh ? (l.nameZH || l.nameEN) : (isEn ? l.nameEN : l.nameTH);
                                    const firstTrainRaw = isZh ? (l.firstTrainZH || l.firstTrainEN) : (isEn ? l.firstTrainEN : l.firstTrainTH);
                                    const lastTrainRaw = isZh ? (l.lastTrainZH || l.lastTrainEN) : (isEn ? l.lastTrainEN : l.lastTrainTH);
                                    const peakFreqRaw = isZh ? (l.peakFreqZH || l.peakFreqEN) : (isEn ? l.peakFreqEN : l.peakFreqTH);
                                    const actionText = isZh ? '查看时刻' : (isEn ? 'Timetable' : 'ดูตาราง');
                                    const firstLbl = isZh ? '首班车' : (isEn ? 'First Train' : 'ขบวนแรก');
                                    const lastLbl = isZh ? '末班车' : (isEn ? 'Last Train' : 'ขบวนสุดท้าย');
                                    const peakLbl = isZh ? '高峰间隔' : (isEn ? 'Peak Frequency' : 'ความถี่เร่งด่วน');
                                    return `
                                        <div class="timetable-line-card">
                                            <div class="timetable-card-head">
                                                <div class="timetable-card-title">
                                                    ${getLineIconSvg(l.id, false, 17)}
                                                    <div class="timetable-card-title-wrap">${formatLineTitleWithTag(lineName, l.color, 'card')}</div>
                                                </div>
                                                <button type="button" class="timetable-card-action" onclick="App.setTimetablesLine(${l.id})" aria-label="${actionText} ${esc(lineName)}">
                                                    <span>${actionText}</span> ➔
                                                </button>
                                            </div>
                                            <div class="timetable-card-grid">
                                                <div class="timetable-stat-box">
                                                    <span class="timetable-stat-lbl" style="color:#f59e0b;">
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2v4M4.93 10.93l2.83 2.83M19.07 10.93l-2.83 2.83M2 18h20M17 18a5 5 0 0 0-10 0"/></svg>
                                                        <span>${firstLbl}</span>
                                                    </span>
                                                    <div class="timetable-stat-val">${formatTimetableStat(firstTrainRaw)}</div>
                                                </div>
                                                <div class="timetable-stat-box">
                                                    <span class="timetable-stat-lbl" style="color:#818cf8;">
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#818cf8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
                                                        <span>${lastLbl}</span>
                                                    </span>
                                                    <div class="timetable-stat-val">${formatTimetableStat(lastTrainRaw)}</div>
                                                </div>
                                                <div class="timetable-stat-box" style="background:${l.color}14;border-color:${l.color}38;">
                                                    <span class="timetable-stat-lbl" style="color:${l.color};">
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${l.color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                                                        <span>${peakLbl}</span>
                                                    </span>
                                                    <div class="timetable-stat-val" style="color:${l.color};">${formatTimetableStat(peakFreqRaw)}</div>
                                                </div>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>

                        <!-- General Operating Tips -->
                        <div class="info-card">
                            <h3>${getUiIcon('bulb', 16, '#0284c7')} ${isZh ? '曼谷轨道交通运营与出行时间建议' : (isEn ? 'Bangkok Transit Operating Guidelines' : 'ข้อแนะนำเวลาการให้บริการและการเดินทาง')}</h3>
                            <div style="font-size:12.5px;color:var(--ink);line-height:1.6">
                                <ul style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:12px;">
                                    <li>
                                        <div style="font-weight:700;color:var(--ink);margin-bottom:5px">${isZh ? '早间始发运营时间' : (isEn ? 'Morning Services' : 'เวลาเปิดให้บริการตอนเช้า')}</div>
                                        <div style="display:flex;flex-direction:column;gap:4px;color:var(--ink);opacity:0.92;line-height:1.6">
                                            <div><b>SRT</b> ${isZh ? '红线最早自 05:00 开始运营' : (isEn ? 'Red Line starts earliest at 05:00' : 'สายสีแดงเปิดให้บริการเร็วที่สุดตั้งแต่ 05:00 นาที')}</div>
                                            <div><b>BTS</b> ${isZh ? '轻轨约为 05:15–05:30' : (isEn ? 'starts at 05:15–05:30' : 'เริ่ม 05:15–05:30 นาที')}</div>
                                            <div><b>ARL</b> ${isZh ? '机场快线为 05:30' : (isEn ? 'starts at 05:30' : 'เริ่ม 05:30 นาที')}</div>
                                            <div><b>MRT</b> ${isZh ? '各条地铁线约为 05:30–06:00' : (isEn ? 'lines start at 05:30–06:00' : 'สายต่างๆ เริ่ม 05:30–06:00 นาที')}</div>
                                        </div>
                                    </li>
                                    <li>
                                        <div style="font-weight:700;color:var(--ink);margin-bottom:3px">${isZh ? '夜间末班收车时间' : (isEn ? 'Night Closing' : 'เวลาปิดให้บริการตอนกลางคืน')}</div>
                                        <div style="color:var(--ink);opacity:0.92;line-height:1.6">
                                            ${isZh
                                                ? '全路网所有线路通常于 24:00 (午夜) 至 00:30 之间结束运营。'
                                                : (isEn ? 'All transit lines close between 24:00 (Midnight) and 00:30.' : 'ทุกสายสิ้นสุดการให้บริการประมาณ 24:00 นาที (เที่ยงคืน) ถึง 00:30 นาที')
                                            }
                                        </div>
                                    </li>
                                    <li>
                                        <div style="font-weight:700;color:var(--ink);margin-bottom:3px">${isZh ? '换乘跨线乘客注意事项' : (isEn ? 'Connecting Trains' : 'คำแนะนำสำหรับผู้โดยสารที่ต้องเปลี่ยนสาย')}</div>
                                        <div style="color:var(--ink);opacity:0.92;line-height:1.6">
                                            ${isZh
                                                ? '深夜乘车如需跨线换乘，建议在 23:30 前到达换乘枢纽车站，以免错过换乘线路的末班车。'
                                                : (isEn ? 'For late night journeys requiring interchanges, plan to reach transfer stations before 23:30 to avoid missing the final train.' : 'ในเที่ยวเดินทางรอบดึกที่ต้องเปลี่ยนสาย ควรเดินทางถึงสถานีเปลี่ยนสายก่อน 23:30 นาที เพื่อให้ทันขบวนสุดท้ายของอีกสาย')
                                            }
                                        </div>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    `;
                } else {
                    // ข้อมูลเวลาเดินรถเฉพาะสาย (Specific Line Timetable)
                    const lineName = isZh ? (activeLine.nameZH || activeLine.nameEN) : (isEn ? activeLine.nameEN : activeLine.nameTH);
                    const operator = isZh ? (activeLine.operatorZH || activeLine.operatorEN) : (isEn ? activeLine.operatorEN : activeLine.operatorTH);

                    // ปลายทางเส้นทาง
                    const tRaw = isZh ? (activeLine.terminusZH || activeLine.terminusEN) : (isEn ? activeLine.terminusEN : activeLine.terminusTH);
                    const terminusHtml = esc(tRaw);

                    // ข้อมูลทิศทางปลายทางและรหัสสถานี
                    const d1Code = activeLine.dir1?.code || '';
                    const d1Name = isZh ? (activeLine.dir1?.toZH || activeLine.dir1?.toEN || '') : (isEn ? (activeLine.dir1?.toEN || '') : (activeLine.dir1?.toTH || ''));
                    const d2Code = activeLine.dir2?.code || '';
                    const d2Name = isZh ? (activeLine.dir2?.toZH || activeLine.dir2?.toEN || '') : (isEn ? (activeLine.dir2?.toEN || '') : (activeLine.dir2?.toTH || ''));

                    const timeUnit = isZh ? '' : (isEn ? '' : ' นาที');
                    const d1First = activeLine.dir1?.first ? `${activeLine.dir1.first}${activeLine.dir1.first !== '-' ? timeUnit : ''}` : '-';
                    const d1Last = activeLine.dir1?.last ? `${activeLine.dir1.last}${activeLine.dir1.last !== '-' ? timeUnit : ''}` : '-';
                    const d2First = activeLine.dir2?.first ? `${activeLine.dir2.first}${activeLine.dir2.first !== '-' ? timeUnit : ''}` : '-';
                    const d2Last = activeLine.dir2?.last ? `${activeLine.dir2.last}${activeLine.dir2.last !== '-' ? timeUnit : ''}` : '-';

                    // คำนวณความถี่สด
                    const liveFreq = getCurrentMrtFreq(activeLine.id);
                    let liveFreqHtml = '';
                    if (activeLine.id === 106) {
                        // สายสีส้ม ยังไม่เปิดให้บริการ
                        liveFreqHtml = `
                            <div style="display:inline-flex;align-items:center;gap:6px;background:rgba(245,130,32,0.15);color:#ea580c;padding:5px 12px;border-radius:20px;font-size:12px;font-weight:700;white-space:nowrap;border:1px solid rgba(245,130,32,0.3);">
                                <span>🚧</span>
                                <span>${isZh ? 'MRT 橙线 (尚未开通)' : (isEn ? 'Orange Line (Not in Service)' : 'สายสีส้ม (ยังไม่เปิดให้บริการ)')}</span>
                            </div>
                        `;
                    } else if (liveFreq) {
                        const cleanLabel = String(liveFreq.label || '').replace(/^~/, '');
                        liveFreqHtml = `
                            <div style="display:inline-flex;align-items:center;gap:6px;background:#22c55e18;color:#16a34a;padding:5px 12px;border-radius:20px;font-size:12px;font-weight:700;white-space:nowrap;">
                                <span class="live-dot" style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#16a34a;animation:pulse 1.5s infinite;"></span>
                                <span>${isZh ? `当前发车间隔: 约 ~${cleanLabel} 分钟` : (isEn ? `Current Headway: ~${cleanLabel} min` : `ความถี่ขณะนี้: รถมาทุก ~${cleanLabel} นาที`)}</span>
                            </div>
                        `;
                    } else {
                        liveFreqHtml = `
                            <div style="display:inline-flex;align-items:center;gap:6px;background:var(--line);color:var(--muted);padding:5px 12px;border-radius:20px;font-size:12px;font-weight:600;white-space:nowrap;">
                                <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--muted);margin-right:2px;vertical-align:middle;"></span>
                                <span>${isZh ? '当前非运营时段' : (isEn ? 'Currently Out of Service Hours' : 'ขณะนี้นอกเวลาให้บริการ')}</span>
                            </div>
                        `;
                    }

                    // ขบวนแรก-สุดท้ายแยกทิศทาง พร้อมป้ายรหัสสถานีและการจัดช่องเวลาให้สวยงาม ไม่หลุดกรอบ/ตกบรรทัด
                    const dirCards = `
                        <div class="dir-timetables-grid">
                            <div class="dir-time-card">
                                <div class="dir-card-header">
                                    <span class="dir-label">${isZh ? '开往方向' : (isEn ? 'Towards Direction' : 'ทิศทางมุ่งหน้า')}</span>
                                    <div class="dir-dest-wrap">
                                        ${d1Code ? `<span class="stn-code-badge" style="background:${activeLine.color}">${esc(d1Code)}</span>` : ''}
                                        <b class="dir-dest-title">${esc(d1Name)}</b>
                                    </div>
                                </div>
                                <div class="dir-times-grid">
                                    <div class="dir-time-item">
                                        <span class="dir-time-sub">${isZh ? '首班车' : (isEn ? 'First Train' : 'ขบวนแรก')}</span>
                                        <b class="dir-time-num" style="color:${activeLine.color}">${esc(d1First)}</b>
                                    </div>
                                    <div class="dir-time-item">
                                        <span class="dir-time-sub">${isZh ? '末班车' : (isEn ? 'Last Train' : 'ขบวนสุดท้าย')}</span>
                                        <b class="dir-time-num">${esc(d1Last)}</b>
                                    </div>
                                </div>
                            </div>
                            <div class="dir-time-card">
                                <div class="dir-card-header">
                                    <span class="dir-label">${isZh ? '开往方向' : (isEn ? 'Towards Direction' : 'ทิศทางมุ่งหน้า')}</span>
                                    <div class="dir-dest-wrap">
                                        ${d2Code ? `<span class="stn-code-badge" style="background:${activeLine.color}">${esc(d2Code)}</span>` : ''}
                                        <b class="dir-dest-title">${esc(d2Name)}</b>
                                    </div>
                                </div>
                                <div class="dir-times-grid">
                                    <div class="dir-time-item">
                                        <span class="dir-time-sub">${isZh ? '首班车' : (isEn ? 'First Train' : 'ขบวนแรก')}</span>
                                        <b class="dir-time-num" style="color:${activeLine.color}">${esc(d2First)}</b>
                                    </div>
                                    <div class="dir-time-item">
                                        <span class="dir-time-sub">${isZh ? '末班车' : (isEn ? 'Last Train' : 'ขบวนสุดท้าย')}</span>
                                        <b class="dir-time-num">${esc(d2Last)}</b>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;

                    // ตารางความถี่ทางการ
                    const sched = getLineScheduleTables(activeLine.id);
                    const schedTablesHtml = renderFrequencyTablesHtml(sched, activeLine, this.freqTab);

                    // รายชื่อสถานีประจำสายพร้อมป้ายรหัสสถานีขนาดกะทัดรัด
                    const lineStations = getLineStationsList(activeLine.id);
                    let stnDirectoryHtml = '';
                    if (lineStations && lineStations.length > 0) {
                        const color = activeLine.color || '#7AB420';
                        const isBright = isBrightColor(color);
                        const codeTextColor = '#ffffff';

                        const stationChips = lineStations.map(s => {
                            const sKey = s.StationKey;
                            const name = stName(s);
                            const nameLen = name.length;
                            const sizeClass = nameLen > 20 ? 'chip-name-xxlong' : (nameLen > 15 ? 'chip-name-xlong' : (nameLen > 11 ? 'chip-name-long' : ''));
                            return `
                                <button type="button" class="line-stn-chip"
                                    onclick="App.showStationDetail('${esc(sKey)}')"
                                    title="${esc(name)}">
                                    <span class="chip-code" style="background:${color};color:${codeTextColor}">${esc(sKey)}</span>
                                    <span class="chip-name ${sizeClass}" title="${esc(name)}">${esc(name)}</span>
                                </button>
                            `;
                        }).join('');

                        stnDirectoryHtml = `
                            <div class="info-card">
                                <div style="position:relative;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:2px 24px;text-align:center;" onclick="App.toggleTimetableStations()">
                                    <h3 style="margin:0;display:inline-flex;align-items:center;justify-content:center;gap:8px;text-align:center;">
                                        <span style="display:inline-flex;align-items:center;justify-content:center;">${getLineIconSvg(activeLine.id, activeLine.color, 18)}</span>
                                        <span>${isZh ? `线路车站一览与代码 (${lineStations.length} 站)` : (isEn ? `Stations on Line (${lineStations.length})` : `รายชื่อสถานี & รหัสสถานีในสายนี้ (${lineStations.length} สถานี)`)}</span>
                                    </h3>
                                    <span id="stnListChev" style="position:absolute;right:0;font-size:12px;color:var(--muted);transition:transform .2s ease;display:inline-flex;align-items:center;justify-content:center;">▼</span>
                                </div>
                                <div id="stnListBody" style="display:none;margin-top:10px;">
                                    <div class="line-stations-grid">
                                        ${stationChips}
                                    </div>
                                </div>
                            </div>
                        `;
                    }

                    bodyHtml = `
                        <!-- Line Hero Card -->
                        <div class="line-hero-card" style="border-left:5px solid ${activeLine.color}">
                            <div class="line-hero-header" style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;">
                                <div style="display:flex;align-items:flex-start;gap:10px;min-width:0;flex:1;">
                                    <div style="flex-shrink:0;margin-top:2px;">${getLineIconSvg(activeLine.id, false, 28)}</div>
                                    <div style="min-width:0;flex:1;">
                                        <div class="line-hero-title-wrap">${formatLineTitleWithTag(lineName, activeLine.color)}</div>
                                        <div style="font-size:12px;color:var(--muted);line-height:1.45;word-break:break-word;margin-top:3px;">
                                            <div>${esc(operator)}</div>
                                            <div style="margin-top:2px;">${terminusHtml}</div>
                                        </div>
                                    </div>
                                </div>
                                <button type="button" class="btn btn-ghost" style="padding:5px 10px;font-size:11.5px;margin-left:auto;white-space:nowrap;flex-shrink:0;" onclick="App.setTimetablesLine(0)">
                                    ${isZh ? '查看全部线路' : (isEn ? 'View All Lines' : 'ดูทุกสาย')} ↺
                                </button>
                            </div>

                            <div style="margin:8px 0 12px;">
                                ${liveFreqHtml}
                            </div>

                            <div class="line-metrics-grid">
                                <div class="line-metric-box">
                                    <div class="label">${isZh ? '首班发车时间' : (isEn ? 'First Train Service' : 'เวลาขบวนแรก')}</div>
                                    <div class="val" style="color:${activeLine.color};">${esc(isZh ? (activeLine.firstTrainZH || activeLine.firstTrainEN) : (isEn ? activeLine.firstTrainEN : activeLine.firstTrainTH))}</div>
                                </div>
                                <div class="line-metric-box">
                                    <div class="label">${isZh ? '末班收车时间' : (isEn ? 'Last Train Service' : 'เวลาขบวนสุดท้าย')}</div>
                                    <div class="val">${esc(isZh ? (activeLine.lastTrainZH || activeLine.lastTrainEN) : (isEn ? activeLine.lastTrainEN : activeLine.lastTrainTH))}</div>
                                </div>
                                <div class="line-metric-box">
                                    <div class="label">${isZh ? '高峰发车间隔' : (isEn ? 'Peak Hour Headway' : 'ความถี่ช่วงเร่งด่วน')}</div>
                                    <div class="val" style="font-size:13px;color:${activeLine.color};">${esc(isZh ? (activeLine.peakFreqZH || activeLine.peakFreqEN) : (isEn ? activeLine.peakFreqEN : activeLine.peakFreqTH))}</div>
                                </div>
                                <div class="line-metric-box">
                                    <div class="label">${isZh ? '平峰发车间隔' : (isEn ? 'Off-Peak Headway' : 'ความถี่ช่วงปกติ')}</div>
                                    <div class="val" style="font-size:13px;">${esc(isZh ? (activeLine.offPeakFreqZH || activeLine.offPeakFreqEN) : (isEn ? activeLine.offPeakFreqEN : activeLine.offPeakFreqTH))}</div>
                                </div>
                            </div>
                        </div>

                        <!-- Terminal Directions Timetable -->
                        <div class="info-card">
                            <h3>${getUiIcon('compass', 16, activeLine.color)} ${isZh ? '按终点方向首末班发车时刻' : (isEn ? 'First & Last Train by Terminal Direction' : 'เวลาขบวนแรกและขบวนสุดท้ายแยกตามทิศทาง')}</h3>
                            ${dirCards}
                        </div>

                        <!-- Official Frequency Schedule Tables -->
                        <div class="info-card sched-freq-card" style="border-top:3px solid ${activeLine.color};">
                            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:6px;">
                                <h3 style="margin:0;display:flex;align-items:center;gap:8px;">
                                    <span>${getUiIcon('calendar', 16, activeLine.color)}</span>
                                    <span>${isZh ? '官方列车发车频次时刻表' : (isEn ? 'Official Headway Frequency Schedule' : 'ตารางความถี่การเดินรถอย่างเป็นทางการ')}</span>
                                </h3>
                                <span style="background:${activeLine.color}18;color:${activeLine.color};border:1px solid ${activeLine.color}35;padding:3px 10px;border-radius:12px;font-size:11.5px;font-weight:700;">
                                    ${esc(isZh ? (activeLine.nameZH || activeLine.nameEN) : (isEn ? activeLine.nameEN : activeLine.nameTH))}
                                </span>
                            </div>
                            <div class="freq-notice-box">
                                <span class="freq-pulse-dot"></span>
                                <span>${isZh ? '绿色高亮行带 <span class="live-dot" style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#16a34a;margin-right:2px;vertical-align:middle;"></span> 当前 标签表示当前时刻正在执行的发车间隔' : (isEn ? 'Highlighted row indicates active operational headway right now' : 'แถบไฮไลต์สีเขียวพร้อมป้าย <span class="live-dot" style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#16a34a;margin-right:2px;vertical-align:middle;"></span> ขณะนี้ แสดงช่วงเวลาเดินรถที่กำลังให้บริการอยู่ ณ ปัจจุบัน')}</span>
                            </div>
                            ${schedTablesHtml}
                        </div>

                        ${stnDirectoryHtml}

                        <!-- Action Button to Switch to Fares of this Line -->
                        <div style="text-align:center;margin:16px 0 6px;">
                            <button type="button" class="btn btn-primary" style="background:${activeLine.color};border-color:${activeLine.color};box-shadow:0 4px 14px ${activeLine.color}40;display:inline-flex;align-items:center;gap:8px;white-space:nowrap;padding:11px 22px;max-width:100%;"
                                onclick="App.switchView('fares');App.setFaresLine(${activeLine.id})">
                                <span>${getUiIcon('card', 14, '#fff')} ${isZh ? '查询该线路票价与计费' : (isEn ? 'Check Fares of This Line' : 'เช็คอัตราค่าโดยสารสายนี้')}</span>
                                <span>➔</span>
                            </button>
                        </div>
                    `;
                }

                const existingBar = document.getElementById('timetablesLineFilterBar');
                const existingBody = document.getElementById('timetablesViewBody');
                const langMatches = existingBar && existingBar.getAttribute('data-lang') === lang;

                if (!forceRebuild && existingBar && existingBody && langMatches) {
                    existingBody.innerHTML = bodyHtml;
                    const pills = existingBar.querySelectorAll('.line-filter-pill');
                    let activePill = null;
                    pills.forEach((p) => {
                        const lineId = Number(p.getAttribute('data-line-id'));
                        const isActive = lineId === activeId;
                        const isBrt = lineId === 201;
                        p.classList.toggle('active', isActive);
                        p.classList.toggle('tab-brt', isBrt);
                        const lineData = TRANSIT_LINES_CATALOG.find(l => l.id === lineId);
                        if (lineData) {
                            p.style.cssText = isActive
                                ? (isBrt ? '' : `background:${lineData.color};color:#ffffff;border-color:${lineData.color};font-weight:700;box-shadow:0 3px 10px ${lineData.color}55;`)
                                : '';
                            const iconWrap = p.querySelector('.pill-icon');
                            if (iconWrap) {
                                iconWrap.innerHTML = getLineIconSvg(lineData.id, isActive, 15);
                            }
                        }
                        if (isActive) activePill = p;
                    });
                    if (activePill) {
                        scrollActivePillIntoView(existingBar, activePill, true);
                    }
                } else {
                    el.innerHTML = `
                        <div style="margin-bottom:12px;">
                            <h2 style="font-size:18px;font-weight:800;color:var(--ink);margin:0 0 4px;display:flex;align-items:center;gap:8px;">
                                <span>${getUiIcon('clock', 18, 'var(--primary,#0284c7)')}</span>
                                <span>${T('timetablesTitle')}</span>
                            </h2>
                            <div style="font-size:12px;color:var(--muted)">
                                ${isZh ? '选择下方轨道交通线路，查看首末班车时间及官方发车频次表' : (isEn ? 'Select a transit line below to view first & last trains and official frequency schedules' : 'เลือกสายรถไฟฟ้าด้านล่าง เพื่อดูเวลาขบวนแรก ขบวนสุดท้าย และตารางความถี่การเดินรถ')}
                            </div>
                        </div>
                        ${renderLineFilterBar(activeId, 'setTimetablesLine', 'timetablesLineFilterBar')}
                        <div id="timetablesViewBody">
                            ${bodyHtml}
                        </div>
                    `;
                    const newBar = document.getElementById('timetablesLineFilterBar');
                    const activePill = newBar ? newBar.querySelector('.line-filter-pill.active') : null;
                    if (newBar && activePill) {
                        requestAnimationFrame(() => {
                            scrollActivePillIntoView(newBar, activePill, false);
                        });
                    }
                }
            },



            /* ---------- theme (dark mode) ---------- */
            setTheme(t) {
                const cur = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
                const next = t || (cur === 'dark' ? 'light' : 'dark');
                document.documentElement.classList.toggle('dark', next === 'dark');
                try { localStorage.setItem('bts_theme', next); } catch (e) { }
                this.updateThemeBtn();
                this.updateMapTheme();
                this.renderMoreView();
            },

            updateThemeBtn() {
                const b = document.getElementById('themeBtn');
                if (b) b.innerHTML = document.documentElement.classList.contains('dark') ? getUiIcon('sun', 16, '#f59e0b') : getUiIcon('moon', 16, 'currentColor');
                const isDark = document.documentElement.classList.contains('dark');
                const darkBtn = document.getElementById('themeOptDark');
                const lightBtn = document.getElementById('themeOptLight');
                if (darkBtn) darkBtn.classList.toggle('active', isDark);
                if (lightBtn) lightBtn.classList.toggle('active', !isDark);
            },

            /* ---------- background geofencing & more settings ---------- */
            isBgGeofenceNotifEnabled() {
                try {
                    const val = localStorage.getItem('bkk_bg_geofence_enabled');
                    return val === null ? true : val === 'true';
                } catch (e) {
                    return true;
                }
            },

            toggleBgGeofence(enabled) {
                try {
                    localStorage.setItem('bkk_bg_geofence_enabled', enabled ? 'true' : 'false');
                } catch (e) {}

                if (enabled && typeof Notification !== 'undefined') {
                    if (Notification.permission === 'default') {
                        try {
                            Notification.requestPermission().then(() => {
                                this.renderMoreView();
                            });
                        } catch (e) {}
                    }
                }
                if (!enabled && window.BKKLiveBridge && typeof window.BKKLiveBridge.postMessage === 'function') {
                    try {
                        window.BKKLiveBridge.postMessage(JSON.stringify({ action: 'cancelLiveStation' }));
                    } catch (e) {}
                }
                this.renderMoreView();
            },

            renderMoreView() {
                // 1. Notification Switch & Status Badge
                const isEnabled = this.isBgGeofenceNotifEnabled();
                const switchEl = document.getElementById('bgGeofenceSwitch');
                if (switchEl) switchEl.checked = isEnabled;

                const badgeEl = document.getElementById('moreNotifStatusBadge');
                const dotEl = document.getElementById('moreNotifDot');
                const statusTxtEl = document.getElementById('moreNotifStatusText');
                if (badgeEl && dotEl && statusTxtEl) {
                    if (isEnabled) {
                        badgeEl.classList.add('active');
                        dotEl.classList.add('active');
                        statusTxtEl.textContent = T('moreNotifActive');
                    } else {
                        badgeEl.classList.remove('active');
                        dotEl.classList.remove('active');
                        statusTxtEl.textContent = T('moreNotifInactive');
                    }
                }

                // 2. Language Segmented Buttons
                const curLang = lang || 'th';
                ['th', 'en', 'zh'].forEach(l => {
                    const btn = document.getElementById('langOpt' + l.charAt(0).toUpperCase() + l.slice(1));
                    if (btn) btn.classList.toggle('active', curLang === l);
                });

                // 3. Theme Segmented Buttons
                const isDark = document.documentElement.classList.contains('dark');
                const darkBtn = document.getElementById('themeOptDark');
                const lightBtn = document.getElementById('themeOptLight');
                if (darkBtn) darkBtn.classList.toggle('active', isDark);
                if (lightBtn) lightBtn.classList.toggle('active', !isDark);

                // 4. Clock Format Segmented Buttons
                const curClockFmt = this.clockFormat || '24';
                const clock24Btn = document.getElementById('clockOpt24');
                const clock12Btn = document.getElementById('clockOpt12');
                if (clock24Btn) clock24Btn.classList.toggle('active', curClockFmt === '24');
                if (clock12Btn) clock12Btn.classList.toggle('active', curClockFmt === '12');

                // 5. Date Format & Era Segmented Buttons
                const curStyle = this.dateStyle || 'full_day';
                const styleIds = {
                    'full_day': 'dateStyleFullDay',
                    'slash': 'dateStyleSlash',
                    'text': 'dateStyleText',
                    'weekday': 'dateStyleWeekday'
                };
                Object.keys(styleIds).forEach(s => {
                    const btn = document.getElementById(styleIds[s]);
                    if (btn) btn.classList.toggle('active', curStyle === s);
                });

                const curEra = this.dateEra || (lang === 'en' || lang === 'zh' ? 'ce' : 'be');
                const eraBeBtn = document.getElementById('dateEraBe');
                const eraCeBtn = document.getElementById('dateEraCe');
                if (eraBeBtn) eraBeBtn.classList.toggle('active', curEra === 'be');
                if (eraCeBtn) eraCeBtn.classList.toggle('active', curEra === 'ce');

                // Update live samples on date style buttons according to selected era
                const sampleFull = document.getElementById('dateStyleFullDaySub');
                const sampleSlash = document.getElementById('dateStyleSlashSub');
                const sampleText = document.getElementById('dateStyleTextSub');
                const sampleWeekday = document.getElementById('dateStyleWeekdaySub');
                const sampleEraBe = document.getElementById('dateEraBeSub');
                const sampleEraCe = document.getElementById('dateEraCeSub');

                const nowSample = new Date();
                const yCE = nowSample.getFullYear();
                const yBE = yCE + 543;
                const d = nowSample.getDate();
                const m = nowSample.getMonth() + 1;
                const ds = String(d).padStart(2, '0');
                const ms = String(m).padStart(2, '0');
                const yr = (curEra === 'be') ? yBE : yCE;

                const TH_W = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
                const TH_M = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

                const wText = (lang === 'th') ? TH_W[nowSample.getDay()] : nowSample.toLocaleDateString(T('clockLocale'), { weekday: 'short' });
                const mText = (lang === 'th') ? TH_M[nowSample.getMonth()] : (lang === 'zh' ? `${m}月` : nowSample.toLocaleDateString('en-US', { month: 'short' }));

                if (sampleFull) {
                    if (lang === 'zh') sampleFull.textContent = `${wText} ${yr}年${mText}${d}日`;
                    else if (lang === 'th') sampleFull.textContent = `${wText} ${d} ${mText} ${yr}`;
                    else sampleFull.textContent = `${wText}, ${d} ${mText} ${yr}`;
                }
                if (sampleSlash) sampleSlash.textContent = `${ds}/${ms}/${yr}`;
                if (sampleText) {
                    if (lang === 'zh') sampleText.textContent = `${yr}年${mText}${d}日`;
                    else sampleText.textContent = `${d} ${mText} ${yr}`;
                }
                if (sampleWeekday) {
                    sampleWeekday.textContent = nowSample.toLocaleDateString(T('clockLocale'), { weekday: 'short', day: 'numeric', month: 'short' });
                }
                if (sampleEraBe) sampleEraBe.textContent = `ปี ${yBE}`;
                if (sampleEraCe) sampleEraCe.textContent = `ปี ${yCE}`;

                // 6. Platform info
                const platEl = document.getElementById('morePlatformValue');
                if (platEl) {
                    platEl.textContent = (typeof window !== 'undefined' && window.isFlutterApp) ? 'Flutter Hybrid Native' : 'PWA / Web Mobile';
                }

                // 6. Traffic Disruption Card (แสดงเมื่อมีประกาศแจ้งเตือนรถไฟขัดข้อง เท่านั้น)
                this.renderTraffic();
            },

            /* ---------- language ---------- */
            setLang(l) {
                if (l) {
                    lang = l;
                } else {
                    if (lang === 'th') lang = 'en';
                    else if (lang === 'en') lang = 'zh';
                    else lang = 'th';
                }
                localStorage.setItem('bts_lang', lang);
                this.applyStaticLang();
                this.renderTabs();
                this.renderNearest();
                this.renderNearestExit();
                this.renderStrip();
                this.renderTraffic();
                this.renderJourney();
                this.renderInteractiveMap(true);
                this.renderFaresView(true);
                this.renderTimetablesView(true);
                this.renderQuickHubChips();
                this.renderExitsView(this.selectedExitKey);
                if (this.journey.picking) this.renderPicker();
            },

            /* ---------- native app bridge hook ---------- */
            onNativeBridgeReady() {
                try {
                    document.documentElement.classList.add('is-flutter-app');
                } catch (e) { }
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
                set('relocateBtn', `${getUiIcon('compass', 14, 'currentColor')} ${T('relocate')}`);
                set('homePlannerTitle', T('homeJourneyTitle'));
                set('homePlannerSub', T('homeJourneySub'));
                set('homePlannerBtn', T('homeJourneyBtn'));

                const si = document.getElementById('searchInput');
                if (si) si.placeholder = T('searchPh');

                // Map view
                set('mapModeTabSchematicText', T('mapModeSchematic'));
                set('mapModeTabHybridText', T('mapModeHybrid'));
                set('mapGeoLocateText', T('mapMyLocation'));
                set('mapGeoRecenterText', T('mapBkkCenter'));
                const curLayer = this.geoCurrentLayer || 'hybrid';
                const layerEl = document.getElementById('mapGeoLayerText');
                if (layerEl) {
                    layerEl.textContent = curLayer === 'hybrid' ? 'Hybrid' : (curLayer === 'roadmap' ? (lang === 'en' ? 'Road' : (lang === 'zh' ? '道路' : 'ถนน')) : (lang === 'en' ? 'Satellite' : (lang === 'zh' ? '卫星' : 'ดาวเทียม')));
                }
                set('mapTitle', T('mapTitle'));
                set('mapZoomInBtn', T('mapZoomIn'));
                set('mapZoomOutBtn', T('mapZoomOut'));
                set('mapResetBtn', T('mapReset'));
                set('mapHintCard', T('mapHint'));
                const sheet = document.getElementById('mapLegendSheet');
                const isLegendActive = sheet && sheet.classList.contains('active');
                const legendLabel = isLegendActive ? (lang === 'en' ? 'Close' : (lang === 'zh' ? '关闭图例' : 'ปิดสัญลักษณ์')) : T('mapLegendBtn');
                const mapLegendBtn = document.getElementById('mapLegendBtnText');
                if (mapLegendBtn) mapLegendBtn.textContent = legendLabel;
                const mapGeoLegendBtn = document.getElementById('mapGeoLegendText');
                if (mapGeoLegendBtn) mapGeoLegendBtn.textContent = legendLabel;

                // Map legend sheet
                set('mapLegendSheetTitle', T('legTitle'));
                set('legTxt1', T('legSukhumvit'));
                set('legTxt2', T('legSilom'));
                set('legTxt3', T('legGold'));
                set('legTxt4', T('legBlue'));
                set('legTxt5', T('legPurple'));
                set('legTxtBrt', T('legBrt'));
                set('legTxt6', T('legPink'));
                set('legTxt7', T('legYellow'));
                set('legTxt8', T('legDarkRed'));
                set('legTxt9', T('legLightRed'));
                set('legTxt10', T('legArl'));
                set('legTxtOrange', T('legOrange'));
                set('legTxtInter', T('legInter'));
                set('legTxtAirport', T('legAirport'));
                set('legTxtBoat', T('legBoat'));
                set('legTxtTrain', T('legTrain'));
                set('legTxtBus', T('legBus'));
                set('legTxtPark', T('legPark'));
                set('legTxtTap', T('legTap'));

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
                const hubChev = this.hubOpen ? '▲' : '▼';
                const hubTitle = lang === 'th'
                    ? `${getUiIcon('star', 15, '#f59e0b')} <span>สถานียอดนิยม (แตะเพื่อเลือกด่วน)</span> <span class="hub-toggle-chev" id="plannerHubChev">${hubChev}</span>`
                    : (lang === 'zh'
                        ? `${getUiIcon('star', 15, '#f59e0b')} <span>热门车站（快捷选择）</span> <span class="hub-toggle-chev" id="plannerHubChev">${hubChev}</span>`
                        : `${getUiIcon('star', 15, '#f59e0b')} <span>Popular Stations (Quick Select)</span> <span class="hub-toggle-chev" id="plannerHubChev">${hubChev}</span>`);
                set('plannerHubTitle', hubTitle);
                setAttr('plannerHubToggle', 'aria-expanded', String(!!this.hubOpen));

                // Exits view
                set('nearestExitTitle', T('nearestExitTitle') || (lang === 'zh' ? '离您最近的出入口' : (lang === 'th' ? 'ทางออกใกล้คุณที่สุด' : 'Nearest Exit to You')));
                set('exitRelocateBtn', `${getUiIcon('compass', 14, 'currentColor')} ${T('relocate')}`);
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
                set('navLblMore', T('navMore'));
                setAttr('tab-home', 'aria-label', T('navHome'));
                setAttr('tab-map', 'aria-label', T('navMap'));
                setAttr('tab-planner', 'aria-label', T('navPlanner'));
                setAttr('tab-fares', 'aria-label', T('navFares'));
                setAttr('tab-timetables', 'aria-label', T('navTimetables'));
                setAttr('tab-more', 'aria-label', T('navMore'));
                setAttr('tab-home', 'title', T('navHome'));
                setAttr('tab-map', 'title', T('navMap'));
                setAttr('tab-planner', 'title', T('navPlanner'));
                setAttr('tab-fares', 'title', T('navFares'));
                setAttr('tab-timetables', 'title', T('navTimetables'));
                setAttr('tab-more', 'title', T('navMore'));

                // More / Settings View
                set('moreNotifTitle', T('moreNotifTitle'));
                set('moreNotifDesc', T('moreNotifDesc'));
                set('moreLangTitle', T('moreLangTitle'));
                set('moreLangDesc', T('moreLangDesc'));
                set('moreThemeTitle', T('moreThemeTitle'));
                set('moreThemeDesc', T('moreThemeDesc'));
                set('moreThemeDarkLbl', T('themeDark'));
                set('moreThemeLightLbl', T('themeLight'));
                set('moreClockTitle', T('moreClockTitle'));
                set('moreClockDesc', T('moreClockDesc'));
                set('moreClock24Lbl', T('moreClock24Lbl'));
                set('moreClock12Lbl', T('moreClock12Lbl'));
                set('moreDateTitle', T('moreDateTitle'));
                set('moreDateDesc', T('moreDateDesc'));
                set('moreDateStyleLabel', T('moreDateStyleLabel'));
                set('dateStyleFullDayLbl', T('dateStyleFullDayLbl'));
                set('dateStyleSlashLbl', T('dateStyleSlashLbl'));
                set('dateStyleTextLbl', T('dateStyleTextLbl'));
                set('dateStyleWeekdayLbl', T('dateStyleWeekdayLbl'));
                set('moreDateEraLabel', T('moreDateEraLabel'));
                set('dateEraBeLbl', T('dateEraBeLbl'));
                set('dateEraCeLbl', T('dateEraCeLbl'));
                set('moreVersionTitle', T('moreVersionTitle'));
                set('moreVersionUpToDate', T('moreVersionUpToDate'));
                set('moreVersionLabel', T('moreVersionLabel'));
                set('moreNetworkLabel', T('moreNetworkLabel'));
                set('moreGatewayLabel', T('moreGatewayLabel'));
                set('moreGatewayValue', T('moreGatewayValue'));
                set('morePlatformLabel', T('morePlatformLabel'));
                set('moreTrafficTitle', T('moreTrafficTitle'));
                set('moreTrafficDesc', T('moreTrafficDesc'));
                set('trafficDialogTitle', T('trafficDisruptionTitle'));
                set('trafficDialogSub', T('trafficDialogSub'));
                set('trafficDialogDismissLbl', T('trafficDismiss'));
                set('trafficDialogRefreshLbl', T('trafficRefresh'));
                this.renderMoreView();

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
                let savedClockFmt = '24';
                let savedDateStyle = 'full_day';
                let savedDateEra = (lang === 'en' || lang === 'zh') ? 'ce' : 'be';
                try {
                    savedClockFmt = localStorage.getItem('bkk_skytrains_clock_format') || '24';
                    savedDateStyle = localStorage.getItem('bkk_skytrains_date_style') || 'full_day';
                    savedDateEra = localStorage.getItem('bkk_skytrains_date_era') || ((lang === 'en' || lang === 'zh') ? 'ce' : 'be');
                } catch (e) { }
                this.clockFormat = savedClockFmt;
                this.dateStyle = savedDateStyle;
                this.dateEra = savedDateEra;
                this.initResponsiveAutoDetect();
                this.setupMobileZoomLock();
                if (typeof window !== 'undefined' && window.isFlutterApp) {
                    try { document.documentElement.classList.add('is-flutter-app'); } catch (e) { }
                }
                this.applyStaticLang();
                this.updateThemeBtn();   // ธีมถูกตั้งไว้แล้วจากสคริปต์ใน <head> — ปรับไอคอนปุ่มให้ตรง
                this.updateMapTheme();
                this.startClock();
                // Initialize more view and notification state
                this.renderMoreView();
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
                    this.lines = sanitizeStationData(await fetchStationList());
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
                    if (t) t.textContent = lang === 'en' ? 'Reloading...' : (lang === 'zh' ? '正在刷新页面...' : 'กำลังรีโหลดหน้าเว็บ...');
                }
                if (navigator.vibrate) try { navigator.vibrate(25); } catch(e) {}
                setTimeout(() => {
                    window.location.reload();
                }, 220);
            },

            device: null,

            initResponsiveAutoDetect() {
                this.device = (typeof window !== 'undefined' && window.__BKK_DEVICE__) ? window.__BKK_DEVICE__ : {
                    isDesktop: false,
                    isMobile: true,
                    hasTouch: true,
                    isPointerFine: false
                };
                this.setupDesktopShortcuts();
            },

            onEnvironmentChange(newEnv) {
                this.device = newEnv;
                if (this.currentView === 'planner') {
                    this.checkJourneyMarquee();
                }
            },

            setupDesktopShortcuts() {
                if (typeof window === 'undefined') return;
                window.addEventListener('keydown', (e) => {
                    const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
                    const isInput = tag === 'input' || tag === 'textarea' || (e.target && e.target.isContentEditable);

                    if (e.key === 'Escape') {
                        this.closeMapActionSheet();
                        this.closeStationPicker();
                        this.closeExitDropdown();
                        return;
                    }

                    if (isInput) return;

                    if (e.key === '/' || e.key === 's' || e.key === 'S') {
                        const searchInput = document.getElementById('searchInput');
                        if (searchInput) {
                            e.preventDefault();
                            if (this.currentView !== 'home') this.switchView('home');
                            searchInput.focus();
                            searchInput.select();
                        }
                        return;
                    }

                    if (e.key === '1') {
                        this.switchView('home');
                    } else if (e.key === '2') {
                        this.switchView('map');
                    } else if (e.key === '3') {
                        this.switchView('planner');
                    } else if (e.key === '4') {
                        this.switchView('fares');
                    } else if (e.key === '5') {
                        this.switchView('timetables');
                    } else if (e.key === '6') {
                        this.switchView('more');
                    }
                });
            },

            initScrollNav() {
                // 1. Dynamic Auto-Hide Bottom Navigation on Scroll ("เลื่อนขึ้นซ่อน เลื่อนลงแสดง")
                let lastScrollY = window.pageYOffset || document.documentElement.scrollTop;
                let scrollTicking = false;
                const nav = document.querySelector('.bottom-nav');

                window.addEventListener('scroll', () => {
                    // On desktop computers, maintain floating dock stability while scrolling with mouse wheel
                    if (this.device?.isDesktop) {
                        nav?.classList.remove('nav-hidden');
                        return;
                    }
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
                    // ป้องกันการรีเฟรชเมื่อเลื่อนหรือลากดูผังโครงข่ายรถไฟฟ้า 12 สาย
                    if (this.currentView === 'map' || (e.target && e.target.closest('#viewMap, #interactiveMapContainer, #networkMapContainer, #mapViewport, .map-viewport, .map-card, .network-map-container'))) {
                        isPullingTop = false;
                        pullDistance = 0;
                        return;
                    }
                    startY = e.touches[0].clientY;
                    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
                    isPullingTop = (scrollY <= 2);
                    pullDistance = 0;
                }, { passive: true });

                window.addEventListener('touchmove', (e) => {
                    if (!isPullingTop) return;
                    if (this.currentView === 'map' || (e.target && e.target.closest('#viewMap, #interactiveMapContainer, #networkMapContainer, #mapViewport, .map-viewport, .map-card, .network-map-container'))) {
                        isPullingTop = false;
                        pullDistance = 0;
                        if (topIndicator) {
                            topIndicator.style.transform = '';
                            topIndicator.classList.remove('visible', 'refreshing');
                        }
                        return;
                    }
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
                            if (text) text.textContent = pullDistance >= 45 ? (lang === 'en' ? 'Release to reload...' : (lang === 'zh' ? '释放以刷新页面...' : 'ปล่อยเพื่อรีโหลดหน้าเว็บ...')) : (lang === 'en' ? 'Pull down to reload' : (lang === 'zh' ? '下拉刷新' : 'เลื่อนลงเพื่อรีโหลด'));
                        }
                    }
                }, { passive: true });

                window.addEventListener('touchend', () => {
                    if (this.currentView === 'map') {
                        isPullingTop = false;
                        pullDistance = 0;
                        if (topIndicator) {
                            topIndicator.style.transform = '';
                            topIndicator.classList.remove('visible', 'refreshing');
                        }
                        return;
                    }
                    if (isPullingTop && pullDistance >= 45) {
                        if (topIndicator) {
                            topIndicator.classList.add('refreshing');
                            const text = topIndicator.querySelector('.pull-refresh-text');
                            if (text) text.textContent = lang === 'en' ? 'Reloading...' : (lang === 'zh' ? '正在刷新页面...' : 'กำลังรีโหลดหน้าเว็บ...');
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

            /* ---------- clock & date ---------- */
            startClock() {
                const f = () => {
                    const n = new Date(), loc = T('clockLocale');
                    const is12 = (this.clockFormat === '12');
                    const clockTElem = document.getElementById('clockT');
                    const clockDElem = document.getElementById('clockD');
                    if (clockTElem) {
                        clockTElem.textContent = n.toLocaleTimeString(loc, { hour12: is12 });
                    }
                    if (clockDElem) {
                        clockDElem.textContent = this.formatHeaderDate(n, loc);
                    }
                };
                f();
                if (this._clockInterval) clearInterval(this._clockInterval);
                this._clockInterval = setInterval(f, 1000);
            },

            setClockFormat(fmt) {
                if (fmt !== '12' && fmt !== '24') fmt = '24';
                this.clockFormat = fmt;
                try {
                    localStorage.setItem('bkk_skytrains_clock_format', fmt);
                } catch (e) { }
                this.startClock();
                this.renderMoreView();
            },

            toggleClockFormat() {
                const nextFmt = this.clockFormat === '12' ? '24' : '12';
                this.setClockFormat(nextFmt);
            },

            setDateStyle(style) {
                if (!['full_day', 'slash', 'text', 'weekday'].includes(style)) style = 'full_day';
                this.dateStyle = style;
                try {
                    localStorage.setItem('bkk_skytrains_date_style', style);
                } catch (e) { }
                this.startClock();
                this.renderMoreView();
            },

            setDateEra(era) {
                if (era !== 'be' && era !== 'ce') era = 'be';
                this.dateEra = era;
                try {
                    localStorage.setItem('bkk_skytrains_date_era', era);
                } catch (e) { }
                this.startClock();
                this.renderMoreView();
            },

            formatHeaderDate(n, loc) {
                if (!n) n = new Date();
                const curStyle = this.dateStyle || 'full_day';
                const curEra = this.dateEra || (lang === 'en' || lang === 'zh' ? 'ce' : 'be');
                const yCE = n.getFullYear();
                const yBE = yCE + 543;
                const year = (curEra === 'be') ? yBE : yCE;
                const day = n.getDate();
                const dayStr = String(day).padStart(2, '0');
                const monthNum = n.getMonth() + 1;
                const monthStr = String(monthNum).padStart(2, '0');

                if (curStyle === 'weekday') {
                    return n.toLocaleDateString(loc, { weekday: 'short', day: 'numeric', month: 'short' });
                }

                if (curStyle === 'slash') {
                    return `${dayStr}/${monthStr}/${year}`;
                }

                const TH_W = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
                const TH_M = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
                const wText = (lang === 'th') ? TH_W[n.getDay()] : n.toLocaleDateString(loc, { weekday: 'short' });
                const mText = (lang === 'th') ? TH_M[n.getMonth()] : (lang === 'zh' ? `${monthNum}月` : n.toLocaleDateString('en-US', { month: 'short' }));

                if (curStyle === 'text') {
                    if (lang === 'zh') return `${year}年${mText}${day}日`;
                    return `${day} ${mText} ${year}`;
                }

                // full_day: วันสัปดาห์+ว/ด/ป
                if (lang === 'zh') return `${wText} ${year}年${mText}${day}日`;
                if (lang === 'th') return `${wText} ${day} ${mText} ${year}`;
                return `${wText}, ${day} ${mText} ${year}`;
            },

            /* ---------- connections (สถานีต่างสายที่อยู่ใกล้กัน = จุดเชื่อมต่อ) ---------- */
            buildConnections() {
                this.connections = {};
                const flat = [];
                const allNetworkLines = [...this.lines, ...MRT_STATIC_DB.lines];
                for (const l of allNetworkLines)
                    for (const s of l.StationList)
                        if (s.Latitude && s.Longitude) flat.push({ s, l });
                for (let i = 0; i < flat.length; i++) {
                    for (let j = i + 1; j < flat.length; j++) {
                        const a = flat[i], b = flat[j];
                        // สถานี key เดียวกันคนละสาย (สยาม CEN สุขุมวิท+สีลม, RN01 สายสีแดงเข้ม+แดงอ่อน) คือจุดเปลี่ยนสาย
                        if (a.l.LineId === b.l.LineId) continue;
                        if (haversineKm(a.s.Latitude, a.s.Longitude, b.s.Latitude, b.s.Longitude) > 0.35) continue;
                        if (!(this.connections[a.s.StationKey] || []).some(c => c.key === b.s.StationKey && c.lineId === b.l.LineId)) {
                            (this.connections[a.s.StationKey] ??= []).push({ key: b.s.StationKey, lineId: b.l.LineId, color: b.l.LineColor });
                        }
                        if (!(this.connections[b.s.StationKey] || []).some(c => c.key === a.s.StationKey && c.lineId === a.l.LineId)) {
                            (this.connections[b.s.StationKey] ??= []).push({ key: a.s.StationKey, lineId: a.l.LineId, color: a.l.LineColor });
                        }
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

                // จุดเชื่อมต่อสายแยกเมืองทองธานี (PK10 <-> MT01 / MT02)
                const pinkColor = LINE_BRAND_COLORS[5] || '#D76886';
                if (!this.connections['PK10']) this.connections['PK10'] = [];
                if (!this.connections['PK10'].some(c => c.key === 'MT01')) {
                    this.connections['PK10'].push({
                        key: 'MT01',
                        lineId: 5,
                        color: pinkColor,
                        isBranch: true,
                        labelTh: 'สายแยกเมืองทอง',
                        labelEn: 'Muang Thong Branch',
                        labelZh: '通城支线'
                    });
                }
                if (!this.connections['MT01']) this.connections['MT01'] = [];
                if (!this.connections['MT01'].some(c => c.key === 'PK10')) {
                    this.connections['MT01'].push({
                        key: 'PK10',
                        lineId: 5,
                        color: pinkColor,
                        isBranch: true,
                        labelTh: 'สายหลัก (PK10)',
                        labelEn: 'Main Line (PK10)',
                        labelZh: '主线 (PK10)'
                    });
                }
                if (!this.connections['MT02']) this.connections['MT02'] = [];
                if (!this.connections['MT02'].some(c => c.key === 'PK10')) {
                    this.connections['MT02'].push({
                        key: 'PK10',
                        lineId: 5,
                        color: pinkColor,
                        isBranch: true,
                        labelTh: 'สายหลัก (PK10)',
                        labelEn: 'Main Line (PK10)',
                        labelZh: '主线 (PK10)'
                    });
                }
            },

            // กดป้ายเชื่อมต่อ → กระโดดไปสถานีนั้นบนอีกสาย หรือสายแยก
            jumpTo(key, lineId) {
                if (this.currentView !== 'home') {
                    if (this.closeMapActionSheet) this.closeMapActionSheet();
                    this.switchView('home');
                }
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

            // แตะชิปสายใน Footer → สลับไปยังสายนั้นในหน้าแรกทันที
            jumpToLine(lineId) {
                const id = Number(lineId) || 1;
                this.switchView('home');
                this.setLine(id);
                window.scrollTo({ top: 0, behavior: 'smooth' });
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
            hubOpen: false,

            togglePopularHubs() {
                this.hubOpen = !this.hubOpen;
                const chipsEl = document.getElementById('quickHubChips');
                const chevEl = document.getElementById('plannerHubChev');
                const btnEl = document.getElementById('plannerHubToggle');
                if (chipsEl) {
                    chipsEl.style.display = this.hubOpen ? 'grid' : 'none';
                }
                if (chevEl) {
                    chevEl.textContent = this.hubOpen ? '▲' : '▼';
                }
                if (btnEl) {
                    btnEl.setAttribute('aria-expanded', String(this.hubOpen));
                }
            },

            swapJourney() {
                const j = this.journey;
                [j.from, j.to] = [j.to, j.from];
                j.result = null;
                this.renderJourney();
                this.syncUrl();
                if (j.from && j.to) this.findRoute();
            },

            clearJourneyStation(which) {
                const j = this.journey;
                if (which === 'from') j.from = null;
                else if (which === 'to') j.to = null;
                else if (which === 'all') { j.from = null; j.to = null; }
                j.result = null;
                j.error = null;
                this.renderJourney();
                this.syncUrl();
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
                    if (j.from === j.to) {
                        j.result = await buildSameStationJourney(j.from);
                    } else {
                        j.result = (isMrtStationKey(j.from) || isMrtStationKey(j.to))
                            ? await buildHybridJourney(j.from, j.to)
                            : await fetchJourney(j.from, j.to);
                    }
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
                    const isYellow = st && (st.StationLineId === 4 || (st.StationLineColor && String(st.StationLineColor).toUpperCase() === '#FFD100'));
                    const isBrt = st && (st.StationLineId === 201 || (st.StationKey && String(st.StationKey).startsWith('B') && !String(st.StationKey).startsWith('BL')));
                    const keyStyle = st
                        ? (isBrt ? '' : `background:${st.StationLineColor};color:#ffffff;text-shadow:0 1px 2px rgba(0,0,0,0.35);`)
                        : '';
                    const nameStr = st ? stName(st) : T('jSelect');
                    const nameLen = nameStr.length;
                    const sizeClass = nameLen > 18 ? 'st-name-xlong' : (nameLen > 12 ? 'st-name-long' : '');
                    return `<button class="j-field" onclick="App.openPicker('${which}')" title="${st ? esc(stName(st)) : T(which === 'from' ? 'jFrom' : 'jTo')}">
                        <div class="j-head">
                            <span class="lbl">${T(which === 'from' ? 'jFrom' : 'jTo')}</span>
                            ${st ? `
                                <span class="j-clear-btn" onclick="event.stopPropagation();App.clearJourneyStation('${which}')" title="${lang === 'zh' ? '清除选择' : (lang === 'th' ? 'ล้างการเลือก' : 'Clear')}" aria-label="Clear">✕</span>
                            ` : ''}
                        </div>
                        <div class="val ${st ? '' : 'ph'}">
                            ${st ? `<span class="st-key ${isBrt ? 'st-key-brt' : ''}" style="${keyStyle}">${esc(st.StationKey)}</span>` : ''}
                            <div class="nm-marquee-wrap" title="${st ? esc(stName(st)) : T('jSelect')}">
                                <div class="nm-marquee-track">
                                    <span class="nm ${sizeClass}">${esc(nameStr)}</span>
                                    ${st ? `<span class="nm ${sizeClass} nm-clone" aria-hidden="true">${esc(nameStr)}</span>` : ''}
                                </div>
                            </div>
                        </div>
                    </button>`;
                };
                el.innerHTML = `
                    <div class="card-head" style="padding:14px 16px 12px;border-bottom:1px solid var(--line, rgba(255,255,255,0.06));">
                        <div class="card-title" style="display:flex;align-items:center;gap:8px;font-size:15px;font-weight:700;color:var(--ink);">
                            ${getUiIcon('compass', 16, 'currentColor')} <span>${T('jTitle')}</span>
                        </div>
                    </div>
                    <div class="j-body" style="padding:14px 16px 16px;">
                        <div class="j-fields">
                            ${field('from', j.from)}
                            <button class="j-swap" onclick="App.swapJourney()" title="swap">⇅</button>
                            ${field('to', j.to)}
                        </div>
                        ${j.loading ? `<div class="empty-note"><span class="spin dark"></span> ${T('jSearching')}</div>` : ''}
                        ${j.error ? `<div class="err-box">${esc(j.error)}
                            <button class="btn btn-ghost" onclick="App.findRoute()">${T('retry')}</button></div>` : ''}
                        ${j.result ? (j.result.RoutesMap || []).map((rm, i) => renderJourneyRoute(rm, i, j.openRoute === i)).join('') : ''}
                    </div>`;
                this.renderQuickHubChips();
                this.checkJourneyMarquee();
            },

            checkJourneyMarquee() {
                requestAnimationFrame(() => {
                    const card = document.getElementById('journeyCard');
                    if (!card) return;
                    const wraps = card.querySelectorAll('.nm-marquee-wrap');
                    if (!wraps.length) return;

                    // If not laid out yet (e.g. view hidden/switching), retry shortly
                    if (wraps[0].clientWidth === 0) {
                        setTimeout(() => this.checkJourneyMarquee(), 60);
                        return;
                    }

                    wraps.forEach(wrap => {
                        const primary = wrap.querySelector('.nm:not(.nm-clone)');
                        const clone = wrap.querySelector('.nm-clone');
                        if (!primary || !clone) {
                            wrap.classList.remove('is-marquee');
                            wrap.style.removeProperty('--marquee-dur');
                            return;
                        }

                        // Temporarily remove is-marquee to measure natural unclipped width
                        wrap.classList.remove('is-marquee');
                        const wrapWidth = wrap.clientWidth;
                        const textWidth = primary.scrollWidth;

                        if (wrapWidth > 0 && textWidth > wrapWidth + 2) {
                            wrap.classList.add('is-marquee');
                            // Smooth speed ~24px per second, matching footer lines smooth slider
                            const duration = Math.max(6, Math.round((textWidth + 24) / 24));
                            wrap.style.setProperty('--marquee-dur', duration + 's');
                        } else {
                            wrap.classList.remove('is-marquee');
                            wrap.style.removeProperty('--marquee-dur');
                        }
                    });
                });
            },

            renderQuickHubChips() {
                const el = document.getElementById('quickHubChips');
                if (!el) return;
                el.style.display = this.hubOpen ? 'grid' : 'none';
                const hubs = [
                    { key: 'CEN', lineId: 1, nameTh: 'สยาม', nameEn: 'Siam', nameZh: '暹罗', subTh: 'BTS สุขุมวิท ⇄ สีลม', subEn: 'BTS Sukhumvit ⇄ Silom', subZh: 'BTS 素坤逸 ⇄ 是隆' },
                    { key: 'E4', lineId: 1, nameTh: 'อโศก', nameEn: 'Asok', nameZh: '阿索克', subTh: 'เชื่อม MRT สุขุมวิท', subEn: 'Connect MRT Sukhumvit', subZh: '换乘 MRT 素坤逸' },
                    { key: 'N8', lineId: 1, nameTh: 'หมอชิต', nameEn: 'Mo Chit', nameZh: '莫奇', subTh: 'เชื่อม MRT จตุจักร', subEn: 'Connect MRT Chatuchak', subZh: '换乘 MRT 乍都节' },
                    { key: 'S2', lineId: 2, nameTh: 'ศาลาแดง', nameEn: 'Sala Daeng', nameZh: '萨拉丹', subTh: 'เชื่อม MRT สีลม', subEn: 'Connect MRT Si Lom', subZh: '换乘 MRT 是隆' },
                    { key: 'N2', lineId: 1, nameTh: 'พญาไท', nameEn: 'Phaya Thai', nameZh: '帕亚泰', subTh: 'เชื่อม แอร์พอร์ตลิงก์', subEn: 'Connect Airport Link', subZh: '换乘机场快线 ARL' },
                    { key: 'BL11', lineId: 101, nameTh: 'บางซื่อ', nameEn: 'Bang Sue', nameZh: '挽赐', subTh: 'เชื่อม SRT สายสีแดง', subEn: 'Connect SRT Red Line', subZh: '换乘 SRT 红线' },
                    { key: 'BL15', lineId: 101, nameTh: 'ลาดพร้าว', nameEn: 'Lat Phrao', nameZh: '拉抛', subTh: 'เชื่อม MRT สายสีเหลือง', subEn: 'Connect Yellow Line', subZh: '换乘 MRT 黄线' },
                    { key: 'YL23', lineId: 4, nameTh: 'สำโรง', nameEn: 'Samrong', nameZh: '三隆', subTh: 'เชื่อม BTS สุขุมวิท', subEn: 'Connect BTS Sukhumvit', subZh: '换乘 BTS 素坤逸' },
                    { key: 'PP11', lineId: 102, nameTh: 'ศูนย์ราชการฯ', nameEn: 'Nonthaburi CC', nameZh: '暖武里政务中心', subTh: 'สายสีม่วง ⇄ ชมพู', subEn: 'Purple ⇄ Pink Line', subZh: '紫线 ⇄ 粉红线' },
                    { key: 'A1', lineId: 104, nameTh: 'สุวรรณภูมิ', nameEn: 'Suvarnabhumi', nameZh: '素万那普', subTh: 'ท่าอากาศยานสุวรรณภูมิ', subEn: 'Suvarnabhumi Airport', subZh: '素万那普国际机场' }
                ];
                const theme = {
                    1: { bg: 'rgba(122,180,32,0.12)', border: 'rgba(122,180,32,0.3)', pillBg: '#7AB420', pillText: '#ffffff' },
                    2: { bg: 'rgba(0,128,125,0.12)', border: 'rgba(0,128,125,0.3)', pillBg: '#00807D', pillText: '#ffffff' },
                    3: { bg: 'rgba(201,160,56,0.12)', border: 'rgba(201,160,56,0.3)', pillBg: '#C9A038', pillText: '#ffffff' },
                    101: { bg: 'rgba(2,132,199,0.12)', border: 'rgba(2,132,199,0.3)', pillBg: '#0284C7', pillText: '#ffffff' },
                    102: { bg: 'rgba(138,44,155,0.12)', border: 'rgba(138,44,155,0.3)', pillBg: '#8A2C9B', pillText: '#ffffff' },
                    4: { bg: 'rgba(255,209,0,0.15)', border: 'rgba(255,209,0,0.35)', pillBg: '#FFD100', pillText: '#ffffff' },
                    5: { bg: 'rgba(236,72,153,0.12)', border: 'rgba(236,72,153,0.3)', pillBg: '#EC4899', pillText: '#ffffff' },
                    103: { bg: 'rgba(185,28,28,0.12)', border: 'rgba(185,28,28,0.3)', pillBg: '#B91C1C', pillText: '#ffffff' },
                    105: { bg: 'rgba(248,113,113,0.15)', border: 'rgba(248,113,113,0.35)', pillBg: '#F87171', pillText: '#ffffff' },
                    104: { bg: 'rgba(138,21,56,0.12)', border: 'rgba(138,21,56,0.3)', pillBg: '#8A1538', pillText: '#ffffff' }
                };
                el.innerHTML = hubs.map(h => {
                    const s = this.findStation(h.key);
                    const name = s ? stName(s) : (lang === 'zh' ? (h.nameZh || h.nameEn) : (lang === 'en' ? h.nameEn : h.nameTh));
                    const sub = lang === 'zh' ? (h.subZh || h.subEn) : (lang === 'en' ? h.subEn : h.subTh);
                    const isFrom = this.journey.from === h.key;
                    const isTo = this.journey.to === h.key;
                    const isSel = isFrom || isTo;
                    const tag = isFrom ? (lang === 'th' ? 'ต้นทาง' : (lang === 'zh' ? '起点' : 'From')) : isTo ? (lang === 'th' ? 'ปลายทาง' : (lang === 'zh' ? '终点' : 'To')) : '';
                    const tagCls = isFrom ? 'from' : 'to';
                    const t = theme[h.lineId] || { bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.3)', pillBg: '#64748B', pillText: '#ffffff' };
                    return `<button type="button" class="quick-hub-card ${isSel ? 'on' : ''}" onclick="App.quickSelectHub('${h.key}')" title="${esc(name)} (${esc(sub)})" aria-label="${esc(name)}">
                        <div class="quick-hub-icon-box" style="background:${t.bg};border-color:${t.border}">
                            ${getLineIconSvg(h.lineId, false, 18)}
                        </div>
                        <div class="quick-hub-info">
                            <div class="quick-hub-title-row">
                                <span class="quick-hub-code-pill" style="background:${t.pillBg};color:${t.pillText}">${esc(h.key)}</span>
                                <span class="quick-hub-name">${esc(name)}</span>
                            </div>
                            <div class="quick-hub-sub">${esc(sub)}</div>
                        </div>
                        ${tag ? `<span class="quick-hub-tag ${tagCls}">${esc(tag)}</span>` : ''}
                    </button>`;
                }).join('');
            },

            renderPicker() {
                const el = document.getElementById('pickerOverlay');
                if (!el) return;
                const j = this.journey;
                const curKey = j.picking === 'from' ? j.from : j.to;
                const curSt = curKey ? this.findStation(curKey) : null;
                const whichLabel = j.picking === 'from' ? (lang === 'zh' ? '起点站' : (lang === 'th' ? 'สถานีต้นทาง' : 'origin')) : (lang === 'zh' ? '终点站' : (lang === 'th' ? 'สถานีปลายทาง' : 'destination'));
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
                        ${this.nearest ? `<div class="picker-nearest-wrap" style="padding:4px 14px 8px; display:flex; justify-content:center; align-items:center; width:100%; box-sizing:border-box;"><button class="alt-chip" style="margin:0 auto; display:inline-flex; align-items:center; justify-content:center; text-align:center; letter-spacing:0;"
                            onclick="App.pickJourneyStation('${esc(this.nearest.station.StationKey)}')">
                            ${T('jUseNearest')} · <span class="st-key ${this.nearest.station.StationLineId === 201 ? 'st-key-brt' : ''}" style="${this.nearest.station.StationLineId === 201 ? '' : 'background:' + (this.nearest.station.StationLineColor || '#7AB420') + ';'}">${esc(this.nearest.station.StationKey)}</span> ${esc(stName(this.nearest.station))}</button></div>` : ''}
                        <div class="picker-list" id="pickerList"></div>
                    </div>`;
                this.renderPickerTabs();
                document.getElementById('pickerSearch').addEventListener('input', () => this.onPickerSearchInput());
                this.renderPickerList();
            },

            renderPickerTabs() {
                const el = document.getElementById('pickerTabs');
                if (!el) return;
                const isAll = this.journey.pickerLine === 0;
                const allLines = allJourneyLines();
                const existingTabs = el.querySelectorAll('.tab');
                const totalExpected = 1 + allLines.length;

                if (existingTabs.length === totalExpected) {
                    const allBtn = existingTabs[0];
                    allBtn.className = `tab ${isAll ? 'on' : ''}`;
                    allBtn.style.cssText = isAll ? 'background:var(--primary,#0284c7);color:#fff;' : '';
                    allBtn.setAttribute('aria-pressed', isAll ? 'true' : 'false');
                    allBtn.innerHTML = `
                        ${getLineIconSvg(0, isAll, 18)}
                        <span>${lang === 'th' ? 'ทุกสาย' : (lang === 'zh' ? '全部线路' : 'All Lines')}</span>`;

                    allLines.forEach((l, idx) => {
                        const btn = existingTabs[idx + 1];
                        const on = l.LineId === this.journey.pickerLine;
                        const st = this.traffic?.lines?.find(x => x.LineId === l.LineId);
                        const warn = st && st.TrafficStatus !== 1 ? ` ${getUiIcon('alert', 12, '#ef4444')}` : '';
                        const isBrt = l.LineId === 201;
                        const textColor = on ? '#ffffff' : '';
                        btn.className = `tab ${isBrt ? 'tab-brt' : ''} ${on ? 'on' : ''}`;
                        btn.setAttribute('data-line', l.LineId);
                        btn.style.cssText = on ? (isBrt ? '' : `background:${l.LineColor};color:${textColor};`) : '';
                        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
                        btn.innerHTML = `
                            ${getLineIconSvg(l.LineId, on, 18)}
                            <span>${esc(getLineOptLabel(l))}${warn}</span>`;
                    });
                } else {
                    el.innerHTML = `
                        <button class="tab ${isAll ? 'on' : ''}" style="${isAll ? 'background:var(--primary,#0284c7);color:#fff;' : ''}"
                            aria-pressed="${isAll ? 'true' : 'false'}" onclick="App.setPickerLine(0)">
                            ${getLineIconSvg(0, isAll, 18)}
                            <span>${lang === 'th' ? 'ทุกสาย' : (lang === 'zh' ? '全部线路' : 'All Lines')}</span>
                        </button>` + allLines.map(l => {
                        const on = l.LineId === this.journey.pickerLine;
                        const st = this.traffic?.lines?.find(x => x.LineId === l.LineId);
                        const warn = st && st.TrafficStatus !== 1 ? ` ${getUiIcon('alert', 12, '#ef4444')}` : '';
                        const isBrt = l.LineId === 201;
                        const textColor = on ? '#ffffff' : '';
                        const bgStyle = on ? (isBrt ? '' : `background:${l.LineColor};color:${textColor};`) : '';
                        return `<button class="tab ${isBrt ? 'tab-brt' : ''} ${on ? 'on' : ''}" data-line="${l.LineId}" style="${bgStyle}"
                            aria-pressed="${on ? 'true' : 'false'}" onclick="App.setPickerLine(${l.LineId})">
                            ${getLineIconSvg(l.LineId, on, 18)}
                            <span>${esc(getLineOptLabel(l))}${warn}</span></button>`;
                    }).join('');
                }

                const activePickerTab = el.querySelector('.tab.on');
                if (activePickerTab) {
                    requestAnimationFrame(() => {
                        scrollContainerChildToCenter(el, activePickerTab, true);
                    });
                }
            },

            setPickerLine(id) {
                this.journey.pickerLine = id;
                this.renderPickerTabs();
                this.renderPickerList();
            },

            onPickerSearchInput() {
                const qRaw = (document.getElementById('pickerSearch')?.value || '').trim();
                const allLines = allJourneyLines();
                if (qRaw) {
                    const matchedLineByName = allLines.find(l => matchQueryWithLine(qRaw, l, lang));
                    if (matchedLineByName) {
                        // เมื่อคำค้นหาตรงกับสายสี/ไลน์ไหน ให้เลื่อนแท็บไปที่สายสี/ไลน์นั้น ๆ ตามภาษาที่ใช้อยู่เท่านั้น
                        if (this.journey.pickerLine !== matchedLineByName.LineId) {
                            this.journey.pickerLine = matchedLineByName.LineId;
                            this.renderPickerTabs();
                        }
                    } else {
                        // ค้นหาด้วยชื่อสถานีใด ๆ หรือเมื่อยังพิมพ์คำค้นหาไม่ครบ ให้แสดงผลลัพธ์คำค้นหาใกล้เคียงรวมทุกสายสี (แท็บ ทุกสาย)
                        if (this.journey.pickerLine !== 0) {
                            this.journey.pickerLine = 0;
                            this.renderPickerTabs();
                        }
                    }
                }
                this.renderPickerList();
            },

            renderPickerList() {
                const listEl = document.getElementById('pickerList');
                if (!listEl) return;
                const qRaw = (document.getElementById('pickerSearch')?.value || '').trim();
                const q = qRaw.toLowerCase();
                const allLines = allJourneyLines();
                const curPickerLine = this.journey.pickerLine;

                // Determine lines to show based on tab filter & search
                let linesToShow;
                if (curPickerLine && curPickerLine !== 0) {
                    linesToShow = allLines.filter(l => l.LineId === curPickerLine);
                } else {
                    linesToShow = allLines;
                }

                const selectedKey = this.journey.picking === 'from' ? this.journey.from : this.journey.to;
                let html = '';
                let totalMatching = 0;

                for (const line of linesToShow) {
                    let stations = line.StationList || [];
                    const seen = new Set();
                    stations = stations.filter(s => (s.StaticJourney || (s.Latitude && s.Longitude) || s.StationKey) && !seen.has(s.StationKey) && seen.add(s.StationKey));

                    if (q) {
                        stations = stations.filter(s => matchQueryWithStation(qRaw, s, lang));
                    }

                    if (stations.length === 0) continue;
                    totalMatching += stations.length;

                    const color = line.LineColor || '#7AB420';
                    const groupLabel = getLineOptLabel(line);
                    const isBright = isBrightColor(color);
                    const codeTextColor = '#ffffff';

                    const isSingle = stations.length === 1;
                    const stationChips = stations.map(s => {
                        const isSelected = s.StationKey === selectedKey;
                        const name = stName(s);
                        const nameLen = name.length;
                        const sizeClass = nameLen > 20 ? 'chip-name-xxlong' : (nameLen > 15 ? 'chip-name-xlong' : (nameLen > 11 ? 'chip-name-long' : ''));
                        return `
                            <button type="button" class="station-picker-chip ${isSelected ? 'selected' : ''}${isSingle ? ' chip-centered' : ''}"
                                onclick="App.pickJourneyStation('${esc(s.StationKey)}')">
                                <span class="chip-code" style="background:${color};color:${codeTextColor}">${esc(s.StationKey)}</span>
                                <span class="chip-name ${sizeClass}" title="${esc(name)}">${esc(name)}</span>
                            </button>`;
                    }).join('');

                    html += `
                        <div class="line-frame-box" style="border-color:${color}; background:${color}08;">
                            <div class="line-frame-head">
                                <div class="line-frame-title">
                                    ${getLineIconSvg(line.LineId, false, 18)}
                                    ${formatLineTitleWithTag(groupLabel, color, 'frame')}
                                </div>
                                <span class="line-frame-count" style="background:${color}22; color:${isBright ? '#ca8a04' : color}; border:1px solid ${color}44;">
                                    ${stations.length} ${lang === 'th' ? 'สถานี' : 'stations'}
                                </span>
                            </div>
                            <div class="line-stations-grid${isSingle ? ' is-single' : ''}">
                                ${stationChips}
                            </div>
                        </div>`;
                }

                if (totalMatching === 0) {
                    html = `<div style="text-align:center; padding:32px 14px; color:var(--muted); font-size:13px;">
                        ${getUiIcon('search', 16, 'var(--muted)')} ${T('notFound', esc(qRaw))}
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

            /* ---------- location / nearest ---------- */
            saveUserPosition(pos, stationKey, isCalibrated = false) {
                try {
                    // ไม่บันทึกตำแหน่งหยาบมาก (เช่น IP Geolocation หรือ Cell tower ที่ความแม่นยำต่ำกว่า 1 กม.) ลงหน่วยความจำถาวร
                    if (pos && pos.accuracy && pos.accuracy >= 1000 && !isCalibrated) return;
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
                    // หากผู้ใช้จงใจเลือกสถานีเอง (calibrated) จำไว้ 14 วัน
                    // หากเป็นตำแหน่ง GPS อัตโนมัติ จำไว้ไม่เกิน 30 นาที เพื่อป้องกันการแสดงสถานีเก่าข้ามวันข้ามเขต
                    const maxAge = data.calibrated ? (14 * 24 * 3600 * 1000) : (30 * 60 * 1000);
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
                clearTimeout(this._nativeLocationTimer);
                clearTimeout(this._geoMasterTimer);
                clearTimeout(this._ipFallbackTimer);
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
                if (this._lastLocateInteractive && this.nearest?.station) {
                    this.showNearestStationToast(this.nearest.station, this.nearest.km, false);
                }
            },

            onNativeLocationError(reason) {
                clearTimeout(this.fallbackTimer);
                clearTimeout(this._nativeLocationTimer);
                clearTimeout(this._geoMasterTimer);
                clearTimeout(this._ipFallbackTimer);
                this.locating = false;
                this.updateRelocateBtn();

                if (reason === 'permission_denied' || reason === 'permission_denied_forever') {
                    this.locError = T('geoDenied');
                    if (this._lastLocateInteractive) this.showToast(this.locError);
                } else {
                    // หากสัญญาณดาวเทียมไม่พร้อมหรือหลุด: ดึง IP Geolocation ชั่วคราว (ไม่บันทึกลงถาวร)
                    if (typeof fetch === 'function') {
                        fetchIpLocation(3500)
                            .then(coords => {
                                this.userPos = { lat: coords.lat, lon: coords.lon, accuracy: 2000, calibrated: false };
                                this.computeNearest();
                                this.locError = null;
                                this.renderNearest();
                                this.renderNearestExit();
                                this.renderStrip();
                                if (this._lastLocateInteractive && this.nearest?.station) {
                                    this.showNearestStationToast(this.nearest.station, this.nearest.km, true);
                                }
                            })
                            .catch(() => {
                                if (this._lastLocateInteractive) this.showToast(T('geoFail'));
                                if (!this.nearest) this.useFallbackStation();
                                this.renderNearest();
                                this.renderNearestExit();
                            });
                        return;
                    }
                    if (this._lastLocateInteractive) this.showToast(T('geoFail'));
                    if (!this.nearest) this.useFallbackStation();
                }
                this.renderNearest();
                this.renderNearestExit();
            },

            locate(interactive) {
                if (interactive) {
                    this.userPickedLineManually = false;
                    this.lastSyncedStationKey = null;
                }
                this._lastLocateInteractive = !!interactive;

                // หากกำลังระบุตำแหน่งอยู่ แล้วผู้ใช้กดซ้ำ ให้ยกเลิกคำขอเดิมและเริ่มใหม่ทันที
                clearTimeout(this.fallbackTimer);
                clearTimeout(this._nativeLocationTimer);
                clearTimeout(this._geoMasterTimer);
                clearTimeout(this._ipFallbackTimer);

                this.locating = true;
                this.locError = null;
                this.renderNearest();
                this.renderNearestExit();
                this.updateRelocateBtn();

                // หากรันใน Flutter Native Mobile App (iOS / Android)
                if (isNativeFlutterEnvironment()) {
                    // Safety Timer สำหรับ Native GPS (ให้เวลาจับสัญญาณดาวเทียมสูงสุด 18 วินาที)
                    this._geoMasterTimer = setTimeout(() => {
                        if (this.locating) {
                            this.locating = false;
                            this.updateRelocateBtn();
                            this.renderNearest();
                            this.renderNearestExit();
                            if (interactive && !this.userPos) {
                                this.showToast(`${getUiIcon('alert', 16, '#f59e0b')} ค้นหาตำแหน่งนานเกินกำหนด โปรดลองใหม่อีกครั้ง`);
                            }
                        }
                    }, 18000);

                    const dispatchNativeLocation = () => {
                        if (window.FlutterLocation && typeof window.FlutterLocation.postMessage === 'function') {
                            window.FlutterLocation.postMessage(JSON.stringify({ action: 'getLocation', interactive: !!interactive }));
                            return true;
                        }
                        return false;
                    };

                    if (!dispatchNativeLocation()) {
                        // หาก Bridge กำลังเชื่อมต่อในเสี้ยววินาทีแรก ให้รอและลองใหม่จนกว่า Bridge จะพร้อม
                        let bridgeRetries = 0;
                        const bridgeTimer = setInterval(() => {
                            bridgeRetries++;
                            if (dispatchNativeLocation()) {
                                clearInterval(bridgeTimer);
                            } else if (bridgeRetries >= 10) {
                                clearInterval(bridgeTimer);
                                this._locateBrowser(interactive);
                            }
                        }, 150);
                    }
                    return;
                }

                // สำหรับ Web Browser ทั่วไป (https://, http://, file://)
                this._geoMasterTimer = setTimeout(() => {
                    if (this.locating) {
                        this.locating = false;
                        this.updateRelocateBtn();
                        this.renderNearest();
                        this.renderNearestExit();
                        if (interactive && !this.userPos) {
                            this.showToast(`${getUiIcon('alert', 16, '#f59e0b')} ค้นหาตำแหน่งนานเกินกำหนด โปรดลองใหม่อีกครั้ง`);
                        }
                    }
                }, 9000);

                this._locateBrowser(interactive);
            },

            _locateBrowser(interactive) {
                if (!this.nearest) {
                    this.fallbackTimer = setTimeout(() => this.useFallbackStation(), 3500);
                }

                let resolvedByGps = false;
                let ipApplied = false;

                const applyIpFallback = (err) => {
                    if (resolvedByGps || ipApplied) return;
                    if (typeof fetch !== 'function') {
                        clearTimeout(this.fallbackTimer);
                        clearTimeout(this._geoMasterTimer);
                        this.locating = false;
                        this.updateRelocateBtn();
                        if (interactive || (err && err.code !== 1)) {
                            this.locError = (err && err.code === 1) ? T('geoDenied') : T('geoFail');
                            if (interactive) this.showToast(this.locError);
                        }
                        this.renderNearest();
                        this.renderNearestExit();
                        if (!this.nearest) this.useFallbackStation();
                        return;
                    }

                    fetchIpLocation(3000)
                        .then(coords => {
                            if (resolvedByGps) return;
                            ipApplied = true;
                            clearTimeout(this.fallbackTimer);
                            clearTimeout(this._geoMasterTimer);
                            this.locating = false;
                            this.userPos = { lat: coords.lat, lon: coords.lon, accuracy: 2000, calibrated: false };
                            this.computeNearest();
                            this.locError = null;
                            this.updateRelocateBtn();
                            this.renderNearest();
                            this.renderNearestExit();
                            this.renderStrip();
                            if (interactive && this.nearest?.station) {
                                this.showNearestStationToast(this.nearest.station, this.nearest.km, true);
                            }
                        })
                        .catch(() => {
                            if (resolvedByGps) return;
                            clearTimeout(this.fallbackTimer);
                            clearTimeout(this._geoMasterTimer);
                            this.locating = false;
                            this.updateRelocateBtn();
                            if (interactive || (err && err.code !== 1)) {
                                this.locError = (err && err.code === 1) ? T('geoDenied') : T('geoFail');
                                if (interactive) this.showToast(this.locError);
                            }
                            if (!this.nearest) this.useFallbackStation();
                            this.renderNearest();
                            this.renderNearestExit();
                        });
                };

                if (!navigator.geolocation) {
                    applyIpFallback({ code: 2 });
                    return;
                }

                // บน Desktop PC หรือ file:// ที่ไม่มีฮาร์ดแวร์ GPS ดาวเทียม ให้ดึงตำแหน่งผ่านเครือข่ายควบคู่ไปพร้อมกันหากรอนานเกิน 1.2 วินาที
                this._ipFallbackTimer = setTimeout(() => {
                    if (!resolvedByGps) {
                        applyIpFallback(null);
                    }
                }, 1200);

                const onPositionSuccess = (pos) => {
                    resolvedByGps = true;
                    clearTimeout(this.fallbackTimer);
                    clearTimeout(this._geoMasterTimer);
                    clearTimeout(this._ipFallbackTimer);
                    this.locating = false;
                    const acc = pos.coords.accuracy || 999;
                    const lat = pos.coords.latitude;
                    const lon = pos.coords.longitude;

                    this.userPos = { lat, lon, accuracy: acc, calibrated: false };
                    this.saveUserPosition(this.userPos, null, false);
                    this.computeNearest();
                    this.locError = null;
                    this.updateRelocateBtn();
                    this.renderNearest();
                    this.renderNearestExit();
                    this.renderStrip();

                    if (interactive && this.nearest?.station) {
                        this.showNearestStationToast(this.nearest.station, this.nearest.km, false);
                    }
                };

                // ขั้นที่ 1: ลองค้นหาด้วยความแม่นยำสูง (Timeout 3.5 วินาที, maximumAge 15 วินาที)
                try {
                    navigator.geolocation.getCurrentPosition(
                        onPositionSuccess,
                        (err1) => {
                            if (err1 && err1.code === 1) {
                                clearTimeout(this._ipFallbackTimer);
                                applyIpFallback(err1);
                                return;
                            }
                            // ขั้นที่ 2: สลับมาลอง Cellular / Wi-Fi Positioning ทันที (Timeout 3 วินาที, maximumAge 60 วินาที)
                            try {
                                navigator.geolocation.getCurrentPosition(
                                    onPositionSuccess,
                                    (err2) => {
                                        clearTimeout(this._ipFallbackTimer);
                                        applyIpFallback(err2);
                                    },
                                    { enableHighAccuracy: false, maximumAge: 60000, timeout: 3000 }
                                );
                            } catch (e2) {
                                clearTimeout(this._ipFallbackTimer);
                                applyIpFallback(err1);
                            }
                        },
                        { enableHighAccuracy: true, maximumAge: 15000, timeout: 3500 }
                    );
                } catch (e) {
                    clearTimeout(this._ipFallbackTimer);
                    applyIpFallback({ code: 2 });
                }
            },

            // แจ้งเตือนข้อความแบบ Toast
            showToast(msg, isCustomHtml = false) {
                const el = document.getElementById('appToast');
                if (!el) return;
                el.innerHTML = msg;
                el.classList.toggle('toast-custom', Boolean(isCustomHtml));
                el.style.display = 'inline-flex';
                requestAnimationFrame(() => el.classList.add('visible'));
                clearTimeout(this._toastTimer);
                this._toastTimer = setTimeout(() => {
                    el.classList.remove('visible');
                    setTimeout(() => {
                        if (!el.classList.contains('visible')) {
                            el.style.display = 'none';
                            el.classList.remove('toast-custom');
                        }
                    }, 260);
                }, 2800);
            },

            // แจ้งเตือนสถานีที่ตรวจพบแบบ Custom Hybrid (สไตล์ Dynamic Island พร้อมรหัสสถานี และ Live Status Chip)
            showNearestStationToast(station, km, isApprox = false) {
                if (!station) return;
                const code = station.StationKey || station.StationId || station.StationCode || '';
                const name = stName(station);
                const lineColor = station.StationLineColor || (typeof LINE_BRAND_COLORS !== 'undefined' && LINE_BRAND_COLORS[station.StationLineId || station.LineId]) || '#7AB420';
                const isYellow = (station.StationLineId === 4 || station.LineId === 4 || /ffd100|fad53d/i.test(String(lineColor)));
                const textColor = isYellow ? '#000000' : '#ffffff';

                const header = isApprox
                    ? (lang === 'en' ? 'Approximate Nearest Station' : (lang === 'zh' ? '大约最近车站' : 'พบสถานีโดยประมาณ'))
                    : (lang === 'en' ? 'Nearest Station Detected' : (lang === 'zh' ? '检测到附近车站' : 'ตรวจพบสถานีใกล้คุณ'));

                const isAtStation = (km != null && km <= 0.12) || (this.userPos && this.userPos.calibrated && (!km || km <= 0.3));
                let chipHtml = '';
                if (isAtStation) {
                    chipHtml = `<span class="toast-status-chip"><span class="live-dot"></span><span>${esc(T('atStation'))}</span></span>`;
                } else if (km != null) {
                    chipHtml = `<span class="toast-dist-chip"><span>${esc(fmtDist(km))}</span></span>`;
                }

                const html = `
                    <div class="toast-station-code" style="background:${lineColor};color:${textColor};">${esc(code)}</div>
                    <div class="toast-content-col">
                        <div class="toast-header-text">${esc(header)}</div>
                        <div class="toast-name-row">
                            <span class="toast-name-text">${esc(name)}</span>
                            ${chipHtml}
                        </div>
                    </div>
                `.trim();

                this.showToast(html, true);
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

            // ปุ่ม "หาใหม่" บนหัวการ์ด: แสดง spin เล็ก ๆ ระหว่างหาตำแหน่ง (ไม่ disabled เพื่อให้กดซ้ำได้ตลอดเวลา)
            updateRelocateBtn() {
                const b = document.getElementById('relocateBtn');
                if (b) {
                    b.classList.toggle('loading', !!this.locating);
                    b.innerHTML = this.locating
                        ? `<span class="spin dark sm"></span> ${T('locating')}`
                        : `${getUiIcon('compass', 14, 'currentColor')} ${T('relocate')}`;
                }
                const eb = document.getElementById('exitRelocateBtn');
                if (eb) {
                    eb.classList.toggle('loading', !!this.locating);
                    eb.innerHTML = this.locating
                        ? `<span class="spin dark sm"></span> ${T('locating')}`
                        : `${getUiIcon('compass', 14, 'currentColor')} ${T('relocate')}`;
                }
                this.updatePopupDistance();
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
                // ซิงค์สถานีใกล้คุณที่สุด ให้ตรงกันเสมอ 100% ระหว่างการ์ดหน้าแรกและป๊อปอัป
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
                    this.triggerNearestStationAlert(this.nearest, !!this._lastLocateInteractive);
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
                            return `${T('mrtFreqNow', cleanFreq)}`;
                        }
                        return `${T('mrtOutOfService')}`;
                    }
                    return lang === 'en' ? 'Loading live trains...' : (lang === 'zh' ? '正在加载实时列车…' : 'กำลังโหลดเวลาเดินรถสด...');
                }
                const plats = visiblePlatformsForStation(station, arr.platforms);
                const lines = plats.map(p => {
                    const isOutOfService = !!p.isOutOfService || (station.StationKey === 'YL23' && String(p.platform) === '1');
                    const isTerminating = !isOutOfService && (p.isDropOffOnly || p.DestinationStation_key === station.StationKey);
                    const dest = isOutOfService
                        ? (lang === 'en' ? 'Out of Service' : (lang === 'zh' ? '暂不营运' : 'ไม่ให้บริการ'))
                        : isTerminating
                            ? (lang === 'en' ? 'Drop-off only' : (lang === 'zh' ? '仅供下车' : 'ส่งผู้โดยสารเท่านั้น'))
                            : shortDest(destName(p.DestinationStation));
                    const trains = isOutOfService ? [] : displayTrains(station.StationKey, p.platform, p.train_list, arr.fetchedAt);
                    let timeStr = '';
                    if (isOutOfService) {
                        timeStr = '';
                    } else if (trains.length) {
                        const eta = bestEta(station.StationKey, p.platform, trains[0], arr.fetchedAt);
                        if (trains[0].status === 'arriving') {
                            timeStr = T('arrived');
                        } else if (eta) {
                            const m = Math.round(eta.base - (Date.now() - eta.at) / 60000);
                            timeStr = m <= 0 ? T('arrived') : `${m} ${lang === 'en' ? 'min' : (lang === 'zh' ? '分钟' : 'นาที')}`;
                        }
                    } else if (isTerminating) {
                        timeStr = lang === 'en' ? 'No boarding train' : (lang === 'zh' ? '非载客列车' : 'ขบวนไม่รับผู้โดยสาร');
                    }
                    const prefix = isOutOfService ? '' : (lang === 'en' ? 'To ' : (lang === 'zh' ? '开往 ' : 'ไป'));
                    return `${lang === 'en' ? 'Platform' : (lang === 'zh' ? '站台' : 'ชานชาลา')} ${p.platform}: ${prefix}${dest} ${timeStr ? `(${timeStr})` : ''}`.trim();
                });
                return lines.join('\n');
            },

            triggerNearestStationAlert(nearestItem, forcePopup = false) {
                if (!nearestItem || !nearestItem.station) return;
                const s = nearestItem.station;
                const key = s.StationKey;
                const km = nearestItem.km;

                // ตรวจสอบระยะทางที่อยู่ในรัศมีบริการ (ถ้ากดค้นหาเอง forcePopup ให้แสดงเสมอ)
                if (km > 5.0 && !forcePopup) return;

                const isStationChanged = (this.lastAlertStationKey !== key);
                const isFirstOpenAlert = !this.hasShownPopupOnOpen;
                const isInteractive = this._lastLocateInteractive || forcePopup;
                const modal = document.getElementById('nearestStationPopup');
                const isPopupOpen = modal && modal.style.display !== 'none';

                // หาก Popup กำลังเปิดอยู่ ให้อัปเดตสถานีและข้อมูลให้ตรงกันเสมอทันที
                if (isPopupOpen) {
                    this.showNearestPopupFor(s, true);
                }

                // ถ้าไม่ใช่เปิดครั้งแรก และไม่ใช่สถานีเปลี่ยน และไม่ใช่ interactive และแอปไม่ได้กำลังพับอยู่ และป๊อปอัปยังไม่ได้เปิด
                if (!isInteractive && !isStationChanged && !isFirstOpenAlert && !this.isAppFolded && !isPopupOpen) {
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

                // 4. จัดการ Popup: แสดงหรืออัปเดตพร้อมกันกับการ์ดสถานีใกล้ฉันที่สุดทันที
                if (this.isAppFolded) {
                    this.pendingFoldedAlert = { station: s };
                } else {
                    // หากเปิดอยู่ แสดง Popup แจ้งเตือนสถานี/แพลตฟอร์ม/เวลา ทันที
                    this.showNearestPopupFor(s, true);
                }

                // 5. แจ้งเตือน Web / Native Notification (True Background Geofencing) เมื่อเปิดใช้งาน
                if (this.isBgGeofenceNotifEnabled()) {
                    const notifTitle = lang === 'en'
                        ? `Nearest Station: ${s.StationKey} ${stName(s)} (${distText})`
                        : (lang === 'zh'
                            ? `离您最近的车站: ${s.StationKey} ${stName(s)} (${distText})`
                            : `สถานีใกล้คุณ: ${s.StationKey} ${stName(s)} (${distText})`);
                    const notifBody = platSummary || (lang === 'en'
                        ? `${distText} away · Tap to view timetable & platforms`
                        : (lang === 'zh'
                            ? `距您 ${distText} · 点击查看时刻表与站台`
                            : `ห่าง ${distText} · แตะเพื่อดูเวลาขบวนรถและชานชาลา`));

                    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                        try {
                            navigator.serviceWorker.ready.then(reg => {
                                if (reg && reg.showNotification) {
                                    reg.showNotification(notifTitle, {
                                        body: notifBody,
                                        icon: 'icon.svg',
                                        badge: 'icon.svg',
                                        tag: 'nearest-station',
                                        data: { stationKey: key }
                                    });
                                }
                            });
                        } catch(e){}
                    } else if (typeof Notification !== 'undefined') {
                        if (Notification.permission === 'granted') {
                            try {
                                new Notification(notifTitle, {
                                    body: notifBody,
                                    icon: 'icon.svg',
                                    badge: 'icon.svg',
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
                            window.AndroidBridge.showNotification(
                                notifTitle,
                                notifBody,
                                key
                            );
                        } catch(e){}
                    }
                }

                // 7. ซิงค์ข้อมูลสถานีและเวลาเดินรถไปยัง Lock Screen Live Notification & Home Screen Widget
                this.syncToNativeLiveWidgets(s, distText);
            },

            syncToNativeLiveWidgets(station, distText) {
                if (!station) return;
                const key = station.StationKey;
                const arr = this.arrivals[key];
                const plats = (arr && arr.platforms) ? visiblePlatformsForStation(station, arr.platforms) : [];
                
                let p1Dest = '1 ชานชาลา 1', p1Time = '--';
                let p2Dest = '2 ชานชาลา 2', p2Time = '--';

                if (plats.length > 0) {
                    const p1 = plats[0];
                    const dest1 = shortDest(destName(p1.DestinationStation));
                    p1Dest = `1 ไป${dest1}`;
                    const trains1 = (arr && arr.fetchedAt) ? displayTrains(key, p1.platform, p1.train_list, arr.fetchedAt) : [];
                    if (trains1.length) {
                        const eta1 = bestEta(key, p1.platform, trains1[0], arr.fetchedAt);
                        if (trains1[0].status === 'arriving') p1Time = T('arrived');
                        else if (eta1) {
                            const m = Math.round(eta1.base - (Date.now() - eta1.at) / 60000);
                            p1Time = m <= 0 ? T('arrived') : `${m} นาที`;
                        }
                    }
                }

                if (plats.length > 1) {
                    const p2 = plats[1];
                    const dest2 = shortDest(destName(p2.DestinationStation));
                    p2Dest = `2 ไป${dest2}`;
                    const trains2 = (arr && arr.fetchedAt) ? displayTrains(key, p2.platform, p2.train_list, arr.fetchedAt) : [];
                    if (trains2.length) {
                        const eta2 = bestEta(key, p2.platform, trains2[0], arr.fetchedAt);
                        if (trains2[0].status === 'arriving') p2Time = T('arrived');
                        else if (eta2) {
                            const m = Math.round(eta2.base - (Date.now() - eta2.at) / 60000);
                            p2Time = m <= 0 ? T('arrived') : `${m} นาที`;
                        }
                    }
                }

                const payload = {
                    action: 'updateLiveStation',
                    stationKey: key || '',
                    stationName: station.StationNameTH || station.StationName || '',
                    distanceText: distText || (this.nearest?.km != null ? fmtDist(this.nearest.km) : ''),
                    lineColor: station.StationLineColor || '#7AB420',
                    plat1Dest: p1Dest,
                    plat1Time: p1Time,
                    plat2Dest: p2Dest,
                    plat2Time: p2Time
                };

                // ส่งข้อมูลไปยัง Flutter Native Bridge สำหรับ Lock Screen & Home Screen Widget
                if (window.BKKLiveBridge && typeof window.BKKLiveBridge.postMessage === 'function') {
                    try {
                        window.BKKLiveBridge.postMessage(JSON.stringify(payload));
                    } catch (e) {}
                }
            },

            showNearestPopupFor(station, openModal = true) {
                const modal = document.getElementById('nearestStationPopup');
                if (!modal || !station) return;
                this.popupStation = station;
                this.nearestPopupRouteOpen = false;

                const badge = document.getElementById('nearestPopupLineBadge');
                const nameTH = document.getElementById('nearestPopupNameTH');
                const nameEN = document.getElementById('nearestPopupNameEN');
                const platContainer = document.getElementById('nearestPopupPlatforms');
                const routeTrigger = document.getElementById('nearestPopupRouteTrigger');
                const routePanel = document.getElementById('nearestPopupRoutePanel');
                const routeTitle = document.getElementById('nearestPopupRouteTitleText');

                if (routeTrigger) routeTrigger.setAttribute('aria-expanded', 'false');
                if (routePanel) routePanel.hidden = true;
                if (routeTitle) routeTitle.textContent = lang === 'en' ? 'Train positions' : (lang === 'zh' ? '列车实时位置' : 'ตำแหน่งขบวนรถ');

                const color = station.StationLineColor || '#7AB420';
                const isBright = color === '#FFD100' || color === '#F5C242';
                if (badge) {
                    badge.style.background = color;
                    badge.style.color = '#ffffff';
                    badge.style.textShadow = '0 1px 2px rgba(0,0,0,0.45)';
                    badge.textContent = station.StationKey || '';
                }
                if (nameTH) nameTH.textContent = stName(station);
                if (nameEN) nameEN.textContent = lang === 'en' ? (station.StationNameTH || station.StationName_TH || '') : (station.StationNameEN || station.StationName_EN || '');

                this.updatePopupDistance(station);

                // พรีโหลดตำแหน่งขบวนรถรอบสถานีรอไว้
                this.loadRoute(station);

                // เรนเดอร์ชานชาลา & เวลาเดินรถสดในป๊อปอัปสถานี
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
                                if (this.nearestPopupRouteOpen) {
                                    this.renderNearestPopupRoute();
                                }
                            }
                        });
                    }
                }

                if (openModal) {
                    modal.style.display = 'flex';
                }
            },

            toggleNearestPopupRoute() {
                const panel = document.getElementById('nearestPopupRoutePanel');
                const trigger = document.getElementById('nearestPopupRouteTrigger');
                if (!panel || !trigger || !this.popupStation) return;
                this.nearestPopupRouteOpen = !this.nearestPopupRouteOpen;
                trigger.setAttribute('aria-expanded', this.nearestPopupRouteOpen ? 'true' : 'false');
                panel.hidden = !this.nearestPopupRouteOpen;
                if (this.nearestPopupRouteOpen) {
                    this.renderNearestPopupRoute();
                    if (!this.routes[this.popupStation.StationKey]?.ready) {
                        this.loadRoute(this.popupStation);
                    }
                }
            },

            renderNearestPopupRoute() {
                const content = document.getElementById('nearestPopupRouteContent');
                if (!content || !this.popupStation) return;
                content.innerHTML = renderRouteSection(this.popupStation);
            },

            updatePopupDistance(station) {
                const targetStation = station || this.popupStation || this.pinnedStation();
                if (!targetStation) return;
                const chipEl = document.getElementById('nearestPopupDistanceChip');
                const distEl = document.getElementById('nearestPopupDistance');
                const distLbl = document.getElementById('nearestPopupDistLbl');
                if (!distEl && !distLbl) return;

                if (this.locating) {
                    if (distEl) distEl.innerHTML = `<span class="spin dark sm"></span>`;
                    if (distLbl) distLbl.textContent = T('locating');
                    return;
                }

                const pin = this.nearestList.find(r => r.station.StationKey === targetStation.StationKey)
                    || (this.nearest?.station?.StationKey === targetStation.StationKey ? this.nearest : null);
                const km = pin ? pin.km : ((this.userPos && targetStation.Latitude && targetStation.Longitude)
                    ? haversineKm(this.userPos.lat, this.userPos.lon, targetStation.Latitude, targetStation.Longitude)
                    : null);

                const isAtStation = km != null && km <= 0.12;
                if (chipEl) {
                    chipEl.classList.toggle('at-station', isAtStation);
                }
                if (distEl) {
                    distEl.innerHTML = km != null
                        ? (isAtStation ? `${getUiIcon('pin', 13, '#10b981')} ${T('atStation')}` : fmtDist(km))
                        : (lang === 'en' ? 'Near you' : (lang === 'zh' ? '附近' : 'ใกล้คุณ'));
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
                this.popupStation = null;
                this.nearestPopupRouteOpen = false;
                const trigger = document.getElementById('nearestPopupRouteTrigger');
                const panel = document.getElementById('nearestPopupRoutePanel');
                if (trigger) trigger.setAttribute('aria-expanded', 'false');
                if (panel) panel.hidden = true;
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
                    const modal = document.getElementById('nearestStationPopup');
                    if (modal && modal.style.display !== 'none') {
                        this.showNearestPopupFor(pinned, true);
                    }
                }
                this.renderStrip();
                if (pinned) this.loadArrivals(pinned);
            },

            /* ---------- arrivals ---------- */
            async loadArrivals(station, force) {
                if (!station) return;
                const key = station.StationKey;
                const cur = this.arrivals[key];
                const isTargetVisible = (this.pinnedStation()?.StationKey === key
                    || this.expandedKey === key
                    || this.popupStation?.StationKey === key);

                if (usesStaticTimetable(station)) {
                    const data = generateTimetableArrivals(station);
                    if (data) {
                        this.storeArrivals(key, data);
                        if (isTargetVisible && this.arrivals[key].platforms.length) {
                            // ดึงตำแหน่งขบวนรถ (route map) แบบพร้อมกันทันที
                            await this.loadRoute(station);
                        }
                    } else {
                        this.arrivals[key] = { ...(cur || {}), loading: false, error: null, fetchedAt: Date.now(), time: null, platforms: [] };
                    }
                    this.renderArrivalTargets(key);
                    return;
                }

                if (cur?.loading) {
                    if (isTargetVisible && (!this.routes[key] || !this.routes[key].ready)) {
                        this.loadRoute(station);
                    }
                    return;
                }

                if (!force && cur && Date.now() - cur.fetchedAt < 8000 && !cur.error) {
                    if (isTargetVisible && (!this.routes[key] || !this.routes[key].ready)) {
                        this.loadRoute(station);
                    }
                    this.renderArrivalTargets(key);
                    return;
                }

                this.arrivals[key] = { ...(cur || {}), loading: true };
                this.renderArrivalTargets(key);

                // ดึงเวลาเดินรถ (arrival) และตำแหน่งขบวนรอบสถานี (route map) แบบพร้อมกันทันที (Concurrent Execution)
                const routePromise = isTargetVisible ? this.loadRoute(station) : Promise.resolve();

                const arrivalPromise = (async () => {
                    try {
                        let data = await fetchArrivals(station);
                        const hasTrains = Array.isArray(data?.platform_list) && data.platform_list.some(p => Array.isArray(p.train_list) && p.train_list.length > 0);
                        if (!hasTrains && isTransitOperatingHours(station.StationLineId, station.StationKey)) {
                            const fallbackData = generateTimetableArrivals(station);
                            if (fallbackData?.platform_list?.length) {
                                data = fallbackData;
                            }
                        }
                        if (!data) data = { time: null, fetchedAt: Date.now(), platform_list: [] };
                        this.storeArrivals(key, data);
                    } catch (e) {
                        let fallbackData = generateTimetableArrivals(station);
                        if (fallbackData?.platform_list?.length) {
                            this.storeArrivals(key, fallbackData);
                        } else {
                            const isOff = isOffServiceError(e.message);
                            if (isOff) {
                                const ensuredPlats = visiblePlatformsForStation(station, []);
                                this.arrivals[key] = {
                                    ...(cur || {}), loading: false,
                                    error: null,
                                    fetchedAt: Date.now(),
                                    platforms: ensuredPlats
                                };
                            } else {
                                this.arrivals[key] = {
                                    ...(cur || {}), loading: false,
                                    error: e.message || T('connectFail', '?')
                                };
                            }
                        }
                    }
                    this.renderArrivalTargets(key);
                })();

                await Promise.all([arrivalPromise, routePromise]);
                this.renderArrivalTargets(key);
            },

            // เก็บผล TTA + จำเวลาเลขล่าสุดของทุกขบวนไว้ — เมื่อรอบถัดไป API ตอบ "--"
            // จะได้แสดงเวลานับถอยหลังจากค่าเดิมแทน ไม่ให้ตัวเลขวูบหายจนผู้ใช้งง
            storeArrivals(key, data) {
                const fetchedAt = data.fetchedAt || Date.now();
                const st = this.findStation(key);
                const lineId = st ? (st.StationLineId || st.LineId || 0) : 0;
                const isOperating = isTransitOperatingHours(lineId, key);
                let platList = data.platform_list || [];
                if (st) {
                    platList = visiblePlatformsForStation(st, platList);
                }
                // ช่วงเวลานอกการให้บริการ (Transit Closed): เคลียร์ขบวนรถออกทั้งหมด ไม่ให้จำ Telemetry ค้าง
                if (!isOperating && Array.isArray(platList)) {
                    for (const p of platList) {
                        p.train_list = [];
                    }
                }
                // พิเศษสำหรับ YL23: ขบวนรถวิ่งไป-กลับแค่ P2 ไม่เข้า P1 (P1 ชานชาลา 1 ไม่ให้บริการ)
                if (key === 'YL23' && Array.isArray(platList)) {
                    for (const p of platList) {
                        if (String(p.platform) === '1') {
                            p.train_list = [];
                            p.isDropOffOnly = false;
                            p.isOutOfService = true;
                            p.DestinationStation = (typeof lang !== 'undefined' && lang === 'en') ? 'Out of Service' : ((typeof lang !== 'undefined' && lang === 'zh') ? '暂不营运' : 'ไม่ให้บริการ');
                            p.DestinationStation_key = 'YL23';
                        }
                    }
                }
                // พิเศษสำหรับ MT01 และ MT02:
                // MT01 มี 2 ชานชาลา (3 และ 4)
                // MT02 มี 2 ชานชาลา (3 และ 4)
                if ((key === 'MT01' || key === 'MT02') && Array.isArray(platList)) {
                    platList = platList.filter(p => String(p.platform) === '3' || String(p.platform) === '4');
                }
                for (const p of platList) {
                    // กรองขบวนรถศูนย์ซ่อมบำรุง / ขบวนรถเปล่า (เช่น YL00, PK00) ออกตั้งแต่ต้น
                    if (Array.isArray(p.train_list)) {
                        p.train_list = p.train_list.filter(t => {
                            const isDepot = (t.station_key && /^[A-Z]{1,3}00$/i.test(t.station_key))
                                || (t.trainNo && /depot|test|empty/i.test(t.trainNo));
                            return !isDepot;
                        });
                    }
                    if (isOperating) {
                        for (const t of p.train_list || []) {
                            const num = (t.time_come !== '--' && t.time_come != null) ? parseFloat(t.time_come) : NaN;
                            const base = (!isNaN(num) && num >= 0) ? num : (t.time_come_double != null ? t.time_come_double : null);
                            if (base != null)
                                this.etaMem[key + '|' + p.platform + '|' + t.trainNo] =
                                    { base, at: fetchedAt };
                        }
                    }
                }
                if (!isOperating) {
                    for (const k in this.etaMem) {
                        if (k.startsWith(key + '|')) delete this.etaMem[k];
                    }
                }
                for (const k in this.etaMem)
                    if (fetchedAt - this.etaMem[k].at > 1800000) delete this.etaMem[k];
                this.arrivals[key] = {
                    loading: false, error: null, fetchedAt,
                    isTimetable: !!data.isTimetable,
                    time: data.time, platforms: platList
                };
            },

            /* ---------- สถานะการเดินรถ & ประกาศแจ้งเหตุขัดข้อง (TrafficTrainDialogView from th.btsc.theskytrains) ---------- */
            async loadTraffic(manual = false) {
                try {
                    const d = await fetchTraffic();
                    this.traffic = {
                        at: Date.now(),
                        updated: d.TrafficInfoTime || new Date().toISOString(),
                        lines: Array.isArray(d.MainLineStatus) ? d.MainLineStatus : [],
                        alerts: Array.isArray(d.TrafficAlerList) ? d.TrafficAlerList : []
                    };
                    if (manual && typeof this.showToast === 'function') {
                        this.showToast(T('trafficRefreshed') || 'อัปเดตสถานะการเดินรถเรียบร้อย');
                    }
                } catch (e) {
                    if (!this.traffic) {
                        this.traffic = { at: Date.now(), updated: '', lines: [], alerts: [] };
                    }
                    if (manual && typeof this.showToast === 'function') {
                        this.showToast(T('trafficRefreshed') || 'อัปเดตสถานะการเดินรถเรียบร้อย');
                    }
                }
                this.renderTraffic();
                this.renderTabs();
            },

            getSimulatedAlert() {
                const nowStr = new Date().toLocaleTimeString(lang === 'zh' ? 'zh-CN' : (lang === 'en' ? 'en-US' : 'th-TH'), { hour: '2-digit', minute: '2-digit' }) + (lang === 'th' ? ' น.' : '');
                if (lang === 'en') {
                    return {
                        TrAlertID: 9999,
                        LineID: 1,
                        LineName: 'BTS Sukhumvit Line',
                        LineColor: '#7AB420',
                        PlanName: 'Temporary Service Delay',
                        TypeName: 'Train Technical Incident / Rerouted',
                        AlertTime: nowStr,
                        Detail: 'Due to a rolling stock technical inspection between Siam and Asok stations, train frequency may be delayed by 5-10 minutes. Technicians are on-site resolving the issue.',
                        isSimulated: true
                    };
                } else if (lang === 'zh') {
                    return {
                        TrAlertID: 9999,
                        LineID: 1,
                        LineName: 'BTS 素坤逸线',
                        LineColor: '#7AB420',
                        PlanName: '列车临时运行调整公告',
                        TypeName: '列车设备检修 / 运营延误',
                        AlertTime: nowStr,
                        Detail: '由于在暹罗站至阿索克站之间进行列车设备临时检修，素坤逸线列车可能延误约 5-10 分钟。工程团队正在全力抢修中。',
                        isSimulated: true
                    };
                } else {
                    return {
                        TrAlertID: 9999,
                        LineID: 1,
                        LineName: 'BTS สายสุขุมวิท',
                        LineColor: '#7AB420',
                        PlanName: 'แจ้งเหตุขัดข้องชั่วคราว',
                        TypeName: 'ขบวนรถขัดข้อง / ปรับรูปแบบการเดินรถ',
                        AlertTime: nowStr,
                        Detail: 'เนื่องจากมีขบวนรถขัดข้องระหว่างสถานีสยามและอโศก กำลังเร่งแก้ไข มีผลให้ขบวนรถล่าช้าประมาณ 5-10 นาที ขออภัยในความไม่สะดวก',
                        isSimulated: true
                    };
                }
            },

            toggleSimulatedDisruption() {
                this._simulatedDisruption = !this._simulatedDisruption;
                if (!this._simulatedDisruption) {
                    this._disruptionPrompted = false;
                    this._disruptionDismissedByUser = false;
                }
                this.renderTraffic();
                if (typeof this.showToast === 'function') {
                    this.showToast(this._simulatedDisruption ? (lang === 'en' ? 'Disruption simulation enabled' : (lang === 'zh' ? '已开启故障公告模拟' : 'เปิดการจำลองเหตุขัดข้องแล้ว')) : (lang === 'en' ? 'Simulation reset to normal' : (lang === 'zh' ? '已重置模拟状态' : 'ยกเลิกการจำลองเหตุขัดข้องแล้ว')));
                }
            },

            async refreshTraffic(manual = true) {
                await this.loadTraffic(manual);
                const modal = document.getElementById('trafficDisruptionPopup');
                if (modal && modal.style.display === 'flex') {
                    this.renderTrafficDialog();
                }
            },

            openTrafficDialog() {
                const modal = document.getElementById('trafficDisruptionPopup');
                if (!modal) return;
                this.renderTrafficDialog();
                modal.style.display = 'flex';
                document.body.style.overflow = 'hidden';
            },

            closeTrafficDialog() {
                const modal = document.getElementById('trafficDisruptionPopup');
                if (modal) {
                    modal.style.display = 'none';
                    document.body.style.overflow = '';
                    this._disruptionDismissedByUser = true;
                }
            },

            renderTraffic() {
                const alerts = (this.traffic?.alerts || []).slice();
                if (this._simulatedDisruption) {
                    alerts.unshift(this.getSimulatedAlert());
                }

                // ตรวจสอบสายที่มีสถานะล่าช้าหรือขัดข้อง (TrafficStatus > 1)
                const delayedLines = (this.traffic?.lines || []).filter(l => {
                    if (this._simulatedDisruption && l.LineId === 1) return true;
                    return l.TrafficStatus && Number(l.TrafficStatus) > 1;
                });

                // มีประกาศแจ้งเตือนรถไฟขัดข้องหรือไม่
                const hasDisruption = alerts.length > 0 || delayedLines.length > 0;

                // 1. ปุ่มแจ้งเตือนบน Header (#trafficAlertHeaderBtn):
                // แสดงเมื่อมีประกาศแจ้งเตือนรถไฟขัดข้อง เท่านั้น! (หากสถานะปกติจะซ่อนไว้ 100%)
                const headerBtn = document.getElementById('trafficAlertHeaderBtn');
                const badgeText = document.getElementById('trafficStatusBadgeText');
                if (headerBtn) {
                    if (hasDisruption) {
                        headerBtn.style.display = 'inline-flex';
                        headerBtn.classList.add('has-disruption');
                        if (badgeText) badgeText.textContent = T('trafficDisruption') || 'ขัดข้อง';
                    } else {
                        headerBtn.style.display = 'none';
                        headerBtn.classList.remove('has-disruption');
                    }
                }

                // 2. แถบประกาศแจ้งเตือนด่วนบนหน้าหลัก (#disruptionBannerCard):
                // แสดงเมื่อมีประกาศแจ้งเตือนรถไฟขัดข้อง เท่านั้น! (หากสถานะปกติจะซ่อนไว้ 100%)
                const bannerCard = document.getElementById('disruptionBannerCard');
                if (bannerCard) {
                    if (hasDisruption) {
                        bannerCard.style.display = 'block';
                        const titleEl = document.getElementById('disruptionBannerTitleText');
                        const subEl = document.getElementById('disruptionBannerSub');
                        const btnEl = document.getElementById('disruptionBannerBtnText');

                        if (alerts.length > 0) {
                            const firstAlert = alerts[0];
                            if (titleEl) titleEl.textContent = firstAlert.PlanName || firstAlert.TypeName || T('trafficDisruptionTitle');
                            if (subEl) subEl.textContent = firstAlert.Detail || (firstAlert.LineName ? `${firstAlert.LineName}: ${firstAlert.TypeName || ''}` : '');
                        } else {
                            const lineNames = delayedLines.map(l => (lang === 'en' ? (l.LineName || l.LineNameTH) : (lang === 'zh' ? (l.LineNameTH || l.LineName) : (l.LineNameTH || l.LineName)))).join(', ');
                            if (titleEl) titleEl.textContent = T('trafficDisruptionTitle');
                            if (subEl) subEl.textContent = `${T('trafficMinorDelay')}: ${lineNames}`;
                        }
                        if (btnEl) btnEl.textContent = T('trafficDetails');
                    } else {
                        bannerCard.style.display = 'none';
                    }
                }

                // 3. การ์ดสถานะในแท็บเพิ่มเติม (#moreTrafficCard):
                // ให้แสดงเมื่อมีการแจ้งเตือนประกาศแจ้งรถไฟขัดข้อง เท่านั้น! (หากสถานะปกติจะซ่อนไว้ 100%)
                const moreTrafficCard = document.getElementById('moreTrafficCard');
                const moreBadge = document.getElementById('moreTrafficBadge');
                if (moreTrafficCard) {
                    if (hasDisruption) {
                        moreTrafficCard.style.display = 'block';
                        if (moreBadge) {
                            moreBadge.classList.remove('normal');
                            moreBadge.classList.add('disrupted');
                            moreBadge.textContent = T('trafficDisruption') || 'ขัดข้อง';
                        }
                    } else {
                        moreTrafficCard.style.display = 'none';
                    }
                }

                // 4. หากมีเหตุขัดข้องใหม่ และยังไม่เคยแจ้งเตือนในเซสชันนี้ -> แสดงป๊อปอัปอัตโนมัติ 1 ครั้ง (ตามแบบ th.btsc.theskytrains)
                if (hasDisruption && !this._disruptionPrompted && !this._disruptionDismissedByUser) {
                    this._disruptionPrompted = true;
                    this.openTrafficDialog();
                } else if (!hasDisruption) {
                    this._disruptionPrompted = false;
                    this._disruptionDismissedByUser = false;
                }

                // 5. อัปเดตเนื้อหาโมดอลหากกำลังเปิดอยู่
                const modal = document.getElementById('trafficDisruptionPopup');
                if (modal && modal.style.display === 'flex') {
                    this.renderTrafficDialog();
                }
            },

            renderTrafficDialog() {
                const body = document.getElementById('trafficDialogBody');
                if (!body) return;

                const esc = str => String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

                const alerts = (this.traffic?.alerts || []).slice();
                if (this._simulatedDisruption) {
                    alerts.unshift(this.getSimulatedAlert());
                }

                const primaryLinesConfig = [
                    { id: 1, nameTH: 'BTS สายสุขุมวิท', nameEN: 'BTS Sukhumvit Line', nameZH: 'BTS 素坤逸线', routeTH: 'คูคต ↔ เคหะฯ', routeEN: 'Khu Khot ↔ Kheha', routeZH: '库括 ↔ 凯哈', color: '#7AB420' },
                    { id: 2, nameTH: 'BTS สายสีลม', nameEN: 'BTS Silom Line', nameZH: 'BTS 是隆线', routeTH: 'สนามกีฬาแห่งชาติ ↔ บางหว้า', routeEN: 'National Stadium ↔ Bang Wa', routeZH: '国家体育场 ↔ 曼瓦', color: '#00807D' },
                    { id: 3, nameTH: 'BTS สายสีทอง', nameEN: 'BTS Gold Line', nameZH: 'BTS 金线', routeTH: 'กรุงธนบุรี ↔ คลองสาน', routeEN: 'Krung Thon Buri ↔ Khlong San', routeZH: '吞武里城 ↔ 空讪', color: '#C9A038' },
                    { id: 4, nameTH: 'MRT สายสีเหลือง', nameEN: 'MRT Yellow Line', nameZH: 'MRT 黄线', routeTH: 'ลาดพร้าว ↔ สำโรง', routeEN: 'Lat Phrao ↔ Samrong', routeZH: '拉抛 ↔ 三隆', color: '#FFD100' },
                    { id: 5, nameTH: 'MRT สายสีชมพู', nameEN: 'MRT Pink Line', nameZH: 'MRT 粉线', routeTH: 'ศูนย์ราชการนนทบุรี ↔ มีนบุรี', routeEN: 'Nonthaburi Civic Center ↔ Min Buri', routeZH: '暖武里市民中心 ↔ 民武里', color: '#EC4899' }
                ];

                const linesStatus = primaryLinesConfig.map(cfg => {
                    const st = (this.traffic?.lines || []).find(l => l.LineId === cfg.id);
                    let trafficStatus = st ? (Number(st.TrafficStatus) || 1) : 1;
                    if (this._simulatedDisruption && cfg.id === 1) {
                        trafficStatus = 2; // Simulated delay
                    }
                    return { ...cfg, trafficStatus };
                });

                const hasDisruptions = alerts.length > 0 || linesStatus.some(l => l.trafficStatus > 1);

                let html = '';

                // Section 1: Active Announcements / Incident Alert Boxes
                if (alerts.length > 0) {
                    alerts.forEach(a => {
                        const lineCfg = primaryLinesConfig.find(p => p.id === a.LineID) || { color: a.LineColor || '#f59e0b', nameTH: a.LineName || 'BTS' };
                        const lineName = lang === 'en' ? (lineCfg.nameEN || a.LineName) : (lang === 'zh' ? (lineCfg.nameZH || a.LineName) : (lineCfg.nameTH || a.LineName));
                        html += `
                        <div class="traffic-incident-alert-box">
                            <div class="traffic-incident-header">
                                <div class="traffic-incident-badge" style="background:${lineCfg.color};">
                                    ${getLineIconSvg(a.LineID || 1, '#ffffff', 14)}
                                    <span>${esc(lineName)}</span>
                                </div>
                                ${a.AlertTime ? `
                                <div class="traffic-incident-time">
                                    <svg class="ui-ic" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:block;margin:auto;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                    <span>${T('trafficNewsTime')}: ${esc(a.AlertTime)}</span>
                                </div>` : ''}
                            </div>
                            <div class="traffic-incident-plan">${esc(a.PlanName || a.TypeName || T('trafficDisruptionTitle'))}</div>
                            <div class="traffic-incident-detail">${esc(a.Detail || '')}</div>
                            ${a.isSimulated ? `<div style="margin-top:8px;font-size:11px;color:#f59e0b;font-weight:700;">⚡ ${T('trafficSimulatedTag')}</div>` : ''}
                        </div>`;
                    });
                } else if (!hasDisruptions) {
                    // Normal Reassurance Card
                    html += `
                    <div class="traffic-normal-card">
                        <img src="images/icon_traffic_information.png" alt="Normal Operation" class="traffic-normal-icon" width="60" height="60" style="display:block;margin:auto;">
                        <div class="traffic-normal-title">${T('trafficAllNormal')}</div>
                        <div class="traffic-normal-desc">${T('trafficAllNormalDesc')}</div>
                    </div>`;
                }

                // Section 2: Primary Lines Status Grid
                html += `
                <div style="margin-top:4px;">
                    <div class="traffic-line-section-title">${T('trafficLineStatus')}</div>
                    <div class="traffic-line-list">`;

                linesStatus.forEach(line => {
                    const lineName = lang === 'en' ? line.nameEN : (lang === 'zh' ? line.nameZH : line.nameTH);
                    const routeStr = lang === 'en' ? line.routeEN : (lang === 'zh' ? line.routeZH : line.routeTH);
                    let chipCls = 'normal';
                    let chipText = T('trafficNormal');

                    if (line.trafficStatus === 2) {
                        chipCls = 'delay';
                        chipText = T('trafficMinorDelay');
                    } else if (line.trafficStatus === 3) {
                        chipCls = 'disrupted';
                        chipText = T('trafficSevereDelay');
                    }

                    html += `
                        <div class="traffic-line-row">
                            <div class="traffic-line-info">
                                <div class="traffic-line-icon-badge" style="background:${line.color};">
                                    ${getLineIconSvg(line.id, '#ffffff', 16)}
                                </div>
                                <div>
                                    <div class="traffic-line-name">${esc(lineName)}</div>
                                    <div style="font-size:11px;color:var(--muted);margin-top:2px;">${esc(routeStr)}</div>
                                </div>
                            </div>
                            <span class="traffic-severity-chip ${chipCls}">${chipText}</span>
                        </div>`;
                });

                html += `
                    </div>
                </div>`;

                // Section 3: Simulation Toggle
                html += `
                <div class="traffic-sim-box">
                    <button type="button" class="traffic-sim-toggle-btn" onclick="App.toggleSimulatedDisruption()">
                        ${this._simulatedDisruption ? `
                            <span style="color:#10b981;">●</span> ${T('trafficSimulateResetBtn')}
                        ` : `
                            <span style="color:#f59e0b;">⚡</span> ${T('trafficSimulateBtn')}
                        `}
                    </button>
                </div>`;

                body.innerHTML = html;
            },

            // โหลดข้อมูลสถานีข้างเคียง (prev/next ของทุกสายที่ผ่านสถานีนี้) เพื่อวาดตำแหน่งขบวน
            // ดึงสถานีข้างเคียงทุกสายแบบพร้อมกันคู่ขนาน (Promise.all)
            // เก็บข้อมูลเดิมไว้จนกว่าชุดใหม่จะพร้อม (atomic swap) — ขบวนบน map จะไม่กระพริบหาย
            async loadRoute(station) {
                if (!station) return;
                const key = station.StationKey;
                if (this.routes[key]?.loading) return;
                this.routes[key] = { ...(this.routes[key] || {}), loading: true };
                const allLines = this.getAllLines();
                const linePromises = allLines.map(async line => {
                    const list = line.StationList;
                    const idx = list.findIndex(s => s.StationKey === key);
                    // กรองเฉพาะสายที่ผ่านสถานีนี้เท่านั้น ป้องกันการดึงตำแหน่งขบวนรถสีอื่นที่ไม่เกี่ยวข้องมาปนกัน
                    if (idx < 0) return null;
                    let prev = idx > 0 ? list[idx - 1] : null;
                    let next = idx < list.length - 1 ? list[idx + 1] : null;
                    if (key === 'PK10') {
                        prev = list.find(s => s.StationKey === 'PK09') || prev;
                        next = list.find(s => s.StationKey === 'PK11') || next;
                    } else if (key === 'PK11') {
                        prev = list.find(s => s.StationKey === 'PK10') || prev;
                        next = list.find(s => s.StationKey === 'PK12') || next;
                    } else if (key === 'MT01') {
                        prev = list.find(s => s.StationKey === 'PK10') || prev;
                        next = list.find(s => s.StationKey === 'MT02') || next;
                    } else if (key === 'MT02') {
                        prev = list.find(s => s.StationKey === 'MT01') || prev;
                        next = null;
                    }
                    return { lineId: line.LineId, color: line.LineColor, list, idx, prev, next };
                });
                const blocks = (await Promise.all(linePromises)).filter(Boolean);
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
                    this.syncToNativeLiveWidgets(this.pinnedStation(), this.nearest?.km != null ? fmtDist(this.nearest.km) : '');
                }
                if (this.expandedKey === key) this.renderStrip();
                if (this.popupStation?.StationKey === key) {
                    const platContainer = document.getElementById('nearestPopupPlatforms');
                    if (platContainer) {
                        const s = this.popupStation;
                        platContainer.innerHTML = renderPlatformSection(s, this.arrivals[key]);
                    }
                    if (this.nearestPopupRouteOpen) {
                        this.renderNearestPopupRoute();
                    }
                }
            },

            /* ---------- countdown tick (อัปเดตตัวเลขโดยไม่ re-render ทั้งหน้า) ---------- */
            tickCountdowns() {
                let hasExpired = false;
                document.querySelectorAll('[data-eta-base]').forEach(el => {
                    const base = parseFloat(el.dataset.etaBase);
                    const at = parseInt(el.dataset.etaAt, 10);
                    if (isNaN(base) || isNaN(at)) return;
                    const approx = el.dataset.etaApprox === '1';
                    const remaining = base - (Date.now() - at) / 60000;
                    if (remaining < -0.75) hasExpired = true;
                    if (el.dataset.etaFormat === 'chip') {
                        const isNow = remaining >= -0.75 && remaining <= 0.5;
                        const disp = isNow ? '0m' : (remaining < -0.75 ? '--' : `${approx ? '~' : ''}${Math.max(0, Math.round(remaining))}m`);
                        el.textContent = disp;
                        const chipEl = el.closest('.rt-chip');
                        if (chipEl) chipEl.classList.toggle('at', isNow);
                        return;
                    }
                    const { text, now } = etaText(remaining, approx);
                    el.innerHTML = text;
                    el.classList.toggle('now', now);
                    const btn = el.closest('.train');
                    if (btn) {
                        btn.classList.toggle('is-arriving', now);
                        if (btn.classList.contains('first')) {
                            const lineCol = btn.style.getPropertyValue('--line-color') || '';
                            if (now) {
                                btn.style.borderColor = '';
                            } else if (lineCol) {
                                btn.style.borderColor = lineCol;
                            }
                        }
                    }
                });
                if (hasExpired && (!this._lastExpireRefresh || Date.now() - this._lastExpireRefresh > 8000)) {
                    this._lastExpireRefresh = Date.now();
                    setTimeout(() => this.refreshAll(), 1000);
                }
            },

            /* ---------- station train icon color dynamic transition ---------- */
            getStationTrainIconColor(r, lineId) {
                const brandColor = r.station.StationLineColor || LINE_BRAND_COLORS[lineId] || '#7AB420';

                // 1. ตรวจจับว่าตรวจพบว่าอยู่ที่สถานีแล้วหรือไม่ (ระยะห่าง <= 120 เมตร หรือสถานีที่ calibrate ตำแหน่งแล้ว)
                const isAtStation = (r.km != null && r.km <= 0.12) || (this.userPos?.calibrated && r.station.StationKey === this.pinnedKey);
                if (isAtStation) {
                    return brandColor; // อยู่ที่สถานีแล้ว → มีสีเต็ม 100%
                }

                // ตรวจสอบข้อมูลขบวนรถ real-time ว่ามีขบวนกำลังเข้าสถานีหรือไม่
                let arrivalRatio = 0;
                const arr = this.arrivals?.[r.station.StationKey];
                if (arr && arr.platforms && arr.platforms.length) {
                    for (const p of arr.platforms) {
                        if (p.train_list && p.train_list.length) {
                            for (const tr of p.train_list) {
                                const min = parseFloat(tr.min_left ?? tr.eta ?? 999);
                                if (!isNaN(min) && min <= 1.5) {
                                    const rEta = Math.max(0, Math.min(1, (1.5 - min) / 1.5));
                                    if (rEta > arrivalRatio) arrivalRatio = rEta;
                                }
                            }
                        }
                    }
                }

                // 2. ตรวจสอบระยะทาง: หากอยู่นอกสถานี (r.km == null หรือ r.km > 0.8 กม.) และไม่มีรถไฟกำลังเข้าสถานี
                if ((r.km == null || r.km > 0.8) && arrivalRatio <= 0) {
                    return '#ffffff'; // อยู่นอกสถานี → เป็นสีขาว
                }

                // 3. เมื่อรถไฟกำลังเข้าสถานีใหม่ (ระยะ 0.8 กม. ลงมาจนถึง 0.12 กม. หรือตามเวลาที่รถไฟกำลังเข้าสถานี)
                // ค่อย ๆ เริ่มมีสีจนเต็ม เมื่อถึงสถานีใหม่
                const distRatio = (r.km != null && r.km <= 0.8) ? Math.max(0, Math.min(1, (0.8 - r.km) / (0.8 - 0.12))) : 0;
                const effectiveRatio = Math.max(distRatio, arrivalRatio);

                if (effectiveRatio >= 0.98) return brandColor;
                if (effectiveRatio <= 0.02) return '#ffffff';

                return interpolateColor('#ffffff', brandColor, effectiveRatio);
            },

            /* ---------- render: nearest card ---------- */
            renderNearest() {
                const el = document.getElementById('nearestBody');
                if (!el) return;
                if (this.locating && !this.nearest) {
                    el.innerHTML = `<button class="btn btn-big" onclick="App.locate(true)"><span class="spin"></span> ${T('locating')}</button>`;
                    return;
                }
                if (!this.nearest) {
                    el.innerHTML =
                        (this.locError ? `<div class="err-box" style="margin:0 0 10px">${this.locError}</div>` : '') +
                        `<button class="btn btn-big" onclick="App.locate(true)">${getUiIcon('pin', 16, '#ffffff')} ${T('findNearest')}</button>`;
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
                    const stColor = r.station.StationLineColor || LINE_BRAND_COLORS[lineId] || '#7AB420';
                    const distStr = fmtDist(r.km);
                    const nm = stName(r.station);
                    const nameClass = nm.length > 14 ? 'chip-name xxlong' : (nm.length > 9 ? 'chip-name xlong' : (nm.length > 5 ? 'chip-name long' : 'chip-name'));
                    const iconColor = this.getStationTrainIconColor(r, lineId);
                    const isBrt = lineId === 201;
                    return `<button type="button" class="alt-chip ${isSel ? 'on' : ''}"
                        onclick="App.pinStation('${r.station.StationKey}')">
                        <span class="chip-row-top">
                            ${getLineIconSvg(lineId, iconColor, 15)}
                            <span class="st-key ${isBrt ? 'st-key-brt' : ''}" style="${isBrt ? '' : 'background:' + stColor}">${esc(r.station.StationKey)}</span>
                            <span class="${nameClass}">${esc(nm)}</span>
                        </span>
                        <span class="km km-bottom">${distStr}</span></button>`;
                }).join('');

                const crowded = s.IsCrowded === true;
                // ยังไม่รู้ตำแหน่งจริง (km == null) — แสดงปุ่มค้นหาสถานีใกล้ฉัน
                const isFallback = pin.km == null;
                const isAtStation = pin.km != null && pin.km <= 0.12;

                const fallbackBtn = !isFallback ? '' : (this.locating
                    ? `<button class="btn btn-big" style="margin-bottom:10px" onclick="App.locate(true)"><span class="spin"></span> ${T('locating')}</button>`
                    : `<button class="btn btn-big" style="margin-bottom:10px" onclick="App.locate(true)">${getUiIcon('pin', 16, '#ffffff')} ${T('findNearest')}</button>`);

                const distChip = isFallback
                    ? `<div class="dist-chip" onclick="App.locate(true)" style="cursor:pointer;" title="${T('findNearest')}">
                        <div class="v" style="color:var(--muted)">-- km</div>
                        <div class="l">${T('fromYou')}</div>
                       </div>`
                    : (this.locating
                        ? `<div class="dist-chip"><div class="v" style="display:flex;align-items:center;justify-content:center;gap:4px;"><span class="spin dark sm"></span></div><div class="l">${T('locating')}</div></div>`
                        : (isAtStation
                            ? `<div class="dist-chip at-station" style="background:rgba(16,185,129,0.12);border:1px solid #10b981"><div class="v" style="color:#10b981;font-weight:700">${getUiIcon('pin', 13, '#10b981')} ${T('atStation')}</div><div class="l" style="color:var(--text-sub,#64748b)">${T('currentLocation')}</div></div>`
                            : `<div class="dist-chip"><div class="v">${fmtDist(pin.km)}</div><div class="l">${T('fromYou')}</div></div>`));

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
                    <div class="alt-row nearest-alt-row" id="nearestAltRow" data-count="${this.nearestList.length}">${chips}</div>
                    ${renderPlatformSection(s, arr)}
                    ${renderRouteSection(s)}`;

                this.updatePopupDistance(s);
                const modal = document.getElementById('nearestStationPopup');
                if (modal && modal.style.display !== 'none' && this.popupStation?.StationKey !== s.StationKey) {
                    this.showNearestPopupFor(s, true);
                }
            },

            /* ---------- render: line tabs ---------- */
            renderTabs() {
                if (!this.lines.length) return;
                const tabsEl = document.getElementById('lineTabs');
                if (!tabsEl) return;
                const allLines = [...this.lines, ...MRT_STATIC_DB.lines];
                const existingTabs = tabsEl.querySelectorAll('.tab');
                if (existingTabs.length === allLines.length) {
                    existingTabs.forEach((tabBtn, idx) => {
                        const l = allLines[idx];
                        const on = l.LineId === this.activeLine;
                        const st = this.traffic?.lines?.find(x => x.LineId === l.LineId);
                        const warn = st && st.TrafficStatus !== 1 ? ` ${getUiIcon('alert', 12, '#ef4444')}` : '';
                        const isBrt = l.LineId === 201;
                        tabBtn.className = `tab ${isBrt ? 'tab-brt' : ''} ${on ? 'on' : ''}`;
                        tabBtn.setAttribute('data-line', l.LineId);
                        if (isBrt) {
                            tabBtn.style.removeProperty('background');
                            tabBtn.style.removeProperty('background-color');
                        } else {
                            tabBtn.style.background = on ? l.LineColor : '';
                        }
                        tabBtn.innerHTML = `
                            ${getLineIconSvg(l.LineId, on, 18)}
                            <span>${esc(getLineOptLabel(l))}${warn}</span>`;
                    });
                    return;
                }
                tabsEl.innerHTML = allLines.map(l => {
                    const on = l.LineId === this.activeLine;
                    const st = this.traffic?.lines?.find(x => x.LineId === l.LineId);
                    const warn = st && st.TrafficStatus !== 1 ? ` ${getUiIcon('alert', 12, '#ef4444')}` : '';
                    const isBrt = l.LineId === 201;
                    const bgStyle = on ? (isBrt ? '' : 'background:' + l.LineColor) : '';
                    return `<button class="tab ${isBrt ? 'tab-brt' : ''} ${on ? 'on' : ''}" data-line="${l.LineId}" style="${bgStyle}"
                        onclick="App.setLine(${l.LineId})">
                        ${getLineIconSvg(l.LineId, on, 18)}
                            <span>${esc(getLineOptLabel(l))}${warn}</span></button>`;
                }).join('');
            },

            getLineRepresentativeStation(lineId) {
                const allLines = this.getAllLines();
                const line = allLines.find(l => l.LineId === lineId);
                if (!line || !line.StationList || !line.StationList.length) return null;
                const stations = line.StationList;
                const pin = this.pinnedStation();
                if (pin && stations.some(s => s.StationKey === pin.StationKey)) {
                    return pin;
                }
                if (this.userPos && this.userPos.lat && this.userPos.lon) {
                    let best = null, bestDist = Infinity;
                    for (const s of stations) {
                        if (s.Latitude && s.Longitude) {
                            const d = haversineKm(this.userPos.lat, this.userPos.lon, s.Latitude, s.Longitude);
                            if (d < bestDist) {
                                bestDist = d;
                                best = s;
                            }
                        }
                    }
                    if (best) return best;
                }
                const keyStationMap = {
                    1: 'CEN',   // Sukhumvit -> Siam
                    2: 'CEN',   // Silom -> Siam
                    3: 'G1',    // Gold -> Krung Thon Buri
                    4: 'YL01',  // Yellow -> Lat Phrao
                    5: 'PK16',  // Pink -> Wat Phra Sri Mahathat
                    101: 'BL15',// Blue -> Lat Phrao
                    102: 'PP16',// Purple -> Tao Poon
                    103: 'RN01',// Dark Red -> Bang Sue
                    105: 'RW01',// Light Red -> Bang Sue
                    104: 'A1',  // ARL -> Suvarnabhumi
                    201: 'B1',  // BRT -> Sathorn
                    106: 'OR01' // Orange -> Bang Khun Non
                };
                const prefKey = keyStationMap[lineId];
                if (prefKey) {
                    const st = stations.find(s => s.StationKey === prefKey);
                    if (st) return st;
                }
                return stations[0];
            },

            setLine(id) {
                this.userPickedLineManually = true;
                this.activeLine = id;
                this.expandedKey = null;
                const searchEl = document.getElementById('searchInput');
                if (searchEl && searchEl.value) {
                    searchEl.value = '';
                }
                this.renderTabs();
                this.renderStrip();
                this.syncUrl();
                this.scrollActiveTabIntoView();
                // ดึงเวลาและตำแหน่งขบวนรถของสถานีตัวแทนประจำสายแบบพร้อมกันล่วงหน้า (Concurrent Pre-fetch)
                const repStation = this.getLineRepresentativeStation(id);
                if (repStation) {
                    this.loadArrivals(repStation);
                    this.loadRoute(repStation);
                }
            },

            scrollActiveTabIntoView(smooth = true) {
                requestAnimationFrame(() => {
                    const tabsEl = document.getElementById('lineTabs');
                    const activeTab = tabsEl ? tabsEl.querySelector('.tab.on') : null;
                    if (tabsEl && activeTab) {
                        scrollContainerChildToCenter(tabsEl, activeTab, smooth);
                    }
                });
            },

            syncLineToStation(station, force = false) {
                if (!station || !station.StationLineId) return;
                const stationKey = station.StationKey;
                const lineId = station.StationLineId;

                // หากผู้ใช้จงใจเลือกสายด้วยตนเองไปแล้ว และไม่ได้เป็นการสั่งบังคับ (force) ให้คงสายที่ผู้ใช้เลือกไว้เสมอ ไม่สลับสายกลับไปกวนใจ
                if (!force && this.userPickedLineManually) {
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
                this.scrollActiveTabIntoView(true);
            },

            /* ---------- render: strip (line map) ---------- */
            renderStrip() {
                const el = document.getElementById('strip');
                if (!this.lines.length) return;
                const qRaw = (document.getElementById('searchInput')?.value || '').trim();
                const q = qRaw.toLowerCase();
                const qNoSpace = q.replace(/\s+/g, '');
                const isMrtLine = isMrtLineId(this.activeLine);

                let stations, lineColor;
                if (q) {
                    // ค้นหารวมทุกสายในโปรเจกต์ (BTS + MRT + SRT + ARL + BRT ทุกรหัสและชื่อสถานีตามภาษาที่ใช้อยู่เท่านั้น)
                    const seen = new Set();
                    const allLines = this.getAllLines();
                    const allSt = allLines.flatMap(l => l.StationList || []);
                    stations = allSt.filter(s => matchQueryWithStation(qRaw, s, lang) && !seen.has(s.StationKey) && seen.add(s.StationKey));

                    // ตรวจสอบว่าคำค้นหาตรงกับชื่อสายหรือไม่ ตามภาษาที่ใช้อยู่เท่านั้น
                    const matchedLineByName = allLines.find(l => matchQueryWithLine(qRaw, l, lang));

                    if (stations.length === 0 && matchedLineByName && matchedLineByName.StationList) {
                        stations = matchedLineByName.StationList;
                    }

                    // เมื่อคำค้นหาตรงกับสายสี/ไลน์ไหน ให้เลื่อนแท็บไปที่สายสี/ไลน์นั้น ๆ ตามภาษาที่ใช้อยู่เท่านั้น
                    let targetLineId = null;
                    if (matchedLineByName) {
                        targetLineId = matchedLineByName.LineId;
                    } else if (stations.length > 0) {
                        const activeHasMatch = stations.some(s => s.StationLineId === this.activeLine);
                        if (!activeHasMatch) {
                            targetLineId = stations[0].StationLineId;
                        }
                    }

                    if (targetLineId && this.activeLine !== targetLineId) {
                        this.activeLine = targetLineId;
                        this.renderTabs();
                        this.scrollActiveTabIntoView();
                    }

                    lineColor = isMrtLineId(this.activeLine) ? MRT_LINE_BY_ID[this.activeLine]?.LineColor : this.lineById[this.activeLine]?.LineColor;
                    if (!stations.length) {
                        el.innerHTML = `<div class="empty-note" style="padding:24px">${T('notFound', esc(qRaw))}</div>`;
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

                el.setAttribute('data-active-line', this.activeLine);
                el.innerHTML = stations.map(s => {
                    const staticTime = usesStaticTimetable(s);
                    const color = (q ? (s.StationLineColor || LINE_BRAND_COLORS[s.StationLineId] || lineColor) : (lineColor || s.StationLineColor)) || '#64748B';
                    const isBrt = s.StationLineId === 201 || (this.activeLine === 201 && (!s.StationLineId || s.StationLineId === 201));
                    // สถานีสำรอง (km == null) ไม่ใช่ "ใกล้คุณ" จริง — ไม่ติด badge/วงแหวน
                    const isNear = this.nearest && this.nearest.km != null
                        && s.StationKey === this.nearest.station.StationKey;
                    const isSiam = s.StationKey === SIAM_KEY;
                    const isBranch = s.StationKey === 'MT01' || s.StationKey === 'MT02';
                    const isTerminus = s.StationKey === 'MT02';
                    const open = this.expandedKey === s.StationKey;
                    const km = (this.userPos && s.Latitude && s.Longitude)
                        ? haversineKm(this.userPos.lat, this.userPos.lon, s.Latitude, s.Longitude) : null;
                    const arr = open ? this.arrivals[s.StationKey] : null;
                    // IsCrowded มีเฉพาะสายจาก StationList API — สาย MRT static ไม่มีฟิลด์นี้
                    const crowded = s.IsCrowded === true;
                    return `
                    <div class="st-row${crowded ? ' crowded' : ''}${isBranch ? ' branch-row' : ''}${isBrt ? ' brt-row' : ''}" id="row-${esc(s.StationKey)}-${s.StationLineId}">
                        <div class="st-rail">
                            <div class="track${isBrt ? ' track-brt' : ''}" style="${isBrt ? '' : 'background:' + color + (q ? '22' : '')}"></div>
                            <div class="node ${isSiam ? 'inter' : ''} ${isNear ? 'near' : ''}${isBrt ? ' node-brt' : ''}" style="${isBrt ? '' : 'border-color:' + color}"></div>
                        </div>
                        <div class="st-main">
                            <button class="st-btn" onclick="App.toggleStation('${esc(s.StationKey)}')">
                                <span class="st-key${isBrt ? ' st-key-brt' : ''}" style="${isBrt ? '' : 'background:' + color}">${esc(s.StationKey)}</span>
                                <div class="names">
                                    <div class="th">${esc(stName(s))}
                                        ${crowded ? `<span class="badge crowd-b">${T('crowded')}</span>` : ''}
                                        ${isNear ? `<span class="badge near-b">${T('nearYou')}</span>` : ''}
                                        ${isSiam ? `<span class="badge inter-b">${T('fourPlat')}</span>` : ''}
                                        ${isTerminus ? `<span class="badge" style="background:var(--bg-subtle);color:var(--muted);border:1px solid var(--line);font-size:9.5px;font-weight:600;padding:2px 6px;border-radius:var(--radius-full);display:inline-flex;align-items:center;justify-content:center;line-height:1;box-sizing:border-box;letter-spacing:0;vertical-align:middle;">${lang === 'en' ? 'Terminus' : (lang === 'zh' ? '终点站' : 'ปลายทาง')}</span>` : ''}
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
                const station = this.findStation(key);
                if (station && station.StationLineId && station.StationLineId !== this.activeLine) {
                    this.activeLine = station.StationLineId;
                    this.renderTabs();
                    this.scrollActiveTabIntoView();
                }
                this.renderStrip();
                this.syncUrl();
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
                // นอกเวลาให้บริการ (เช่น 01:00–05:00) ให้สร้างชานชาลามาตรฐานที่มี train_list: []
                const emptyPlats = visiblePlatformsForStation(station, []);
                return {
                    isTimetable: true,
                    time: null,
                    fetchedAt: Date.now(),
                    platform_list: emptyPlats
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

            // 0. BTS สถานีสยาม (CEN) — มีทั้งสายสุขุมวิท (ชานชาลา 1, 2) และสายสีลม (ชานชาลา 3, 4)
            if (key === 'CEN') {
                const sukColor = LINE_BRAND_COLORS[1] || '#7AB420';
                const silomColor = LINE_BRAND_COLORS[2] || '#00807D';
                const destE23 = getDestPair('E23', 'เคหะฯ', 'Kheha');
                const destN24 = getDestPair('N24', 'คูคต', 'Khu Khot');
                const destS12 = getDestPair('S12', 'บางหว้า', 'Bang Wa');
                const destW1 = getDestPair('W1', 'สนามกีฬาแห่งชาติ', 'National Stadium');

                platforms.push({
                    platform: 1,
                    LineId: 1,
                    LineColor: sukColor,
                    DestinationStation: destE23,
                    DestinationStation_key: 'E23',
                    isDropOffOnly: false,
                    train_list: makeTrains(1, destE23, 'E23', 0, false)
                });
                platforms.push({
                    platform: 2,
                    LineId: 1,
                    LineColor: sukColor,
                    DestinationStation: destN24,
                    DestinationStation_key: 'N24',
                    isDropOffOnly: false,
                    train_list: makeTrains(2, destN24, 'N24', interval * 0.5, false)
                });
                platforms.push({
                    platform: 3,
                    LineId: 2,
                    LineColor: silomColor,
                    DestinationStation: destS12,
                    DestinationStation_key: 'S12',
                    isDropOffOnly: false,
                    train_list: makeTrains(3, destS12, 'S12', 0, false)
                });
                platforms.push({
                    platform: 4,
                    LineId: 2,
                    LineColor: silomColor,
                    DestinationStation: destW1,
                    DestinationStation_key: 'W1',
                    isDropOffOnly: false,
                    train_list: makeTrains(4, destW1, 'W1', interval * 0.5, false)
                });
            }

            // 0.1 BTS สายสุขุมวิท (LineId: 1) — N24 (คูคต) <-> E23 (เคหะฯ)
            else if (lineId === 1 || (/^[NE]\d+$/i.test(key) && key !== 'CEN')) {
                const sukColor = station.StationLineColor || LINE_BRAND_COLORS[1] || '#7AB420';
                const sukLine = (App.lineById && App.lineById[1]) || (typeof FALLBACK_STATION_LIST !== 'undefined' ? FALLBACK_STATION_LIST.find(l => l.LineId === 1) : null);
                const list = sukLine?.StationList || [];
                const idx = Math.max(0, list.findIndex(s => s.StationKey === key));
                const travelPerStation = 1.9;

                // Platform 1: ไปเคหะฯ (E23)
                const isTerm1 = (key === 'E23');
                const dest1 = getDestPair('E23', 'เคหะฯ', 'Kheha');
                platforms.push({
                    platform: 1,
                    LineId: 1,
                    LineColor: sukColor,
                    DestinationStation: dest1,
                    DestinationStation_key: 'E23',
                    isDropOffOnly: isTerm1,
                    train_list: makeTrains(1, dest1, 'E23', idx * travelPerStation, isTerm1)
                });

                // Platform 2: ไปคูคต (N24)
                const isTerm2 = (key === 'N24');
                const dest2 = getDestPair('N24', 'คูคต', 'Khu Khot');
                platforms.push({
                    platform: 2,
                    LineId: 1,
                    LineColor: sukColor,
                    DestinationStation: dest2,
                    DestinationStation_key: 'N24',
                    isDropOffOnly: isTerm2,
                    train_list: makeTrains(2, dest2, 'N24', (Math.max(0, list.length - 1 - idx)) * travelPerStation + (interval * 0.5), isTerm2)
                });
            }

            // 0.2 BTS สายสีลม (LineId: 2) — W1 (สนามกีฬาแห่งชาติ) <-> S12 (บางหว้า)
            else if (lineId === 2 || (/^[SW]\d+$/i.test(key) && key !== 'CEN')) {
                const silomColor = station.StationLineColor || LINE_BRAND_COLORS[2] || '#00807D';
                const silomLine = (App.lineById && App.lineById[2]) || (typeof FALLBACK_STATION_LIST !== 'undefined' ? FALLBACK_STATION_LIST.find(l => l.LineId === 2) : null);
                const list = silomLine?.StationList || [];
                const idx = Math.max(0, list.findIndex(s => s.StationKey === key));
                const travelPerStation = 2.0;

                // Platform 3: ไปบางหว้า (S12)
                const isTerm3 = (key === 'S12');
                const dest3 = getDestPair('S12', 'บางหว้า', 'Bang Wa');
                platforms.push({
                    platform: 3,
                    LineId: 2,
                    LineColor: silomColor,
                    DestinationStation: dest3,
                    DestinationStation_key: 'S12',
                    isDropOffOnly: isTerm3,
                    train_list: makeTrains(3, dest3, 'S12', idx * travelPerStation, isTerm3)
                });

                // Platform 4: ไปสนามกีฬาแห่งชาติ (W1)
                const isTerm4 = (key === 'W1');
                const dest4 = getDestPair('W1', 'สนามกีฬาแห่งชาติ', 'National Stadium');
                platforms.push({
                    platform: 4,
                    LineId: 2,
                    LineColor: silomColor,
                    DestinationStation: dest4,
                    DestinationStation_key: 'W1',
                    isDropOffOnly: isTerm4,
                    train_list: makeTrains(4, dest4, 'W1', (Math.max(0, list.length - 1 - idx)) * travelPerStation + (interval * 0.5), isTerm4)
                });
            }

            // 1. สายสีทอง (LineId: 3) — G1 (กรุงธนบุรี) <-> G3 (คลองสาน)
            else if (isGoldLineId(lineId)) {
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

            // 4. สายสีแดงเข้ม (LineId: 103) & สายสีแดงอ่อน (LineId: 105)
            else if (lineId === MRT_LINE_IDS.DARK_RED || lineId === MRT_LINE_IDS.LIGHT_RED || lineId === 103 || lineId === 105 || lineId === MRT_LINE_IDS.RED) {
                const isWest = (lineId === 105 || key.startsWith('RW'));
                const travelPerStation = 2.4;

                if (key === 'RN01' || key === 'RW01') {
                    // ชุมทางกลางกรุงเทพอภิวัฒน์
                    if (lineId === 105 || key === 'RW01') {
                        // สายสีแดงอ่อน (นครวิถี) มุ่งหน้า ตลิ่งชัน
                        const dest1 = getDestPair('RW04', 'ตลิ่งชัน', 'Taling Chan');
                        const dest2 = getDestPair('RW01', 'กรุงเทพอภิวัฒน์ (ขบวนสิ้นสุด)', 'Krung Thep Aphiwat (Terminating)');
                        platforms.push({
                            platform: 1,
                            LineId: 105,
                            LineColor: '#F87171',
                            DestinationStation: dest1,
                            DestinationStation_key: 'RW04',
                            isDropOffOnly: false,
                            train_list: makeTrains(1, dest1, 'RW04', 0, false)
                        });
                        platforms.push({
                            platform: 2,
                            LineId: 105,
                            LineColor: '#F87171',
                            DestinationStation: dest2,
                            DestinationStation_key: 'RW01',
                            isDropOffOnly: true,
                            train_list: makeTrains(2, dest2, 'RW01', 0, true)
                        });
                    } else if (lineId === 103) {
                        // สายสีแดงเข้ม (ธานีรัถยา) มุ่งหน้า รังสิต
                        const dest1 = getDestPair('RN10', 'รังสิต', 'Rangsit');
                        const dest2 = getDestPair('RN01', 'กรุงเทพอภิวัฒน์ (ขบวนสิ้นสุด)', 'Krung Thep Aphiwat (Terminating)');
                        platforms.push({
                            platform: 1,
                            LineId: 103,
                            LineColor: '#B91C1C',
                            DestinationStation: dest1,
                            DestinationStation_key: 'RN10',
                            isDropOffOnly: false,
                            train_list: makeTrains(1, dest1, 'RN10', 0, false)
                        });
                        platforms.push({
                            platform: 2,
                            LineId: 103,
                            LineColor: '#B91C1C',
                            DestinationStation: dest2,
                            DestinationStation_key: 'RN01',
                            isDropOffOnly: true,
                            train_list: makeTrains(2, dest2, 'RN01', 0, true)
                        });
                    } else {
                        // ภาพรวมชุมทาง (ทั้งสองสาย)
                        const dest1 = getDestPair('RN10', 'รังสิต', 'Rangsit');
                        const dest2 = getDestPair('RW04', 'ตลิ่งชัน', 'Taling Chan');
                        platforms.push({
                            platform: 1,
                            LineId: 103,
                            LineColor: '#B91C1C',
                            DestinationStation: dest1,
                            DestinationStation_key: 'RN10',
                            isDropOffOnly: false,
                            train_list: makeTrains(1, dest1, 'RN10', 0, false)
                        });
                        platforms.push({
                            platform: 2,
                            LineId: 105,
                            LineColor: '#F87171',
                            DestinationStation: dest2,
                            DestinationStation_key: 'RW04',
                            isDropOffOnly: false,
                            train_list: makeTrains(2, dest2, 'RW04', interval * 0.5, false)
                        });
                    }
                } else if (isWest) {
                    // สายสีแดงอ่อน (RW02..RW04)
                    const orderWest = { 'RW04': 0, 'RW03': 1, 'RW02': 2 };
                    const idx = orderWest[key] != null ? orderWest[key] : 1;
                    const dest1 = getDestPair('RW04', 'ตลิ่งชัน', 'Taling Chan');
                    const dest2 = getDestPair('RN01', 'กรุงเทพอภิวัฒน์', 'Krung Thep Aphiwat');
                    const isTerm1 = (key === 'RW04');

                    platforms.push({
                        platform: 1,
                        LineId: 105,
                        LineColor: '#F87171',
                        DestinationStation: dest1,
                        DestinationStation_key: 'RW04',
                        isDropOffOnly: isTerm1,
                        train_list: makeTrains(1, dest1, 'RW04', (2 - idx) * travelPerStation, isTerm1)
                    });
                    platforms.push({
                        platform: 2,
                        LineId: 105,
                        LineColor: '#F87171',
                        DestinationStation: dest2,
                        DestinationStation_key: 'RN01',
                        isDropOffOnly: false,
                        train_list: makeTrains(2, dest2, 'RN01', idx * travelPerStation + (interval * 0.5), false)
                    });
                } else {
                    // สายสีแดงเข้ม (RN02..RN10)
                    const num = parseInt(key.replace(/\D/g, ''), 10) || 1;
                    const idx = Math.max(0, Math.min(9, num - 1));
                    const isTerm1 = (key === 'RN10');
                    const dest1 = getDestPair('RN10', 'รังสิต', 'Rangsit');
                    const dest2 = getDestPair('RN01', 'กรุงเทพอภิวัฒน์', 'Krung Thep Aphiwat');

                    platforms.push({
                        platform: 1,
                        LineId: 103,
                        LineColor: '#B91C1C',
                        DestinationStation: dest1,
                        DestinationStation_key: 'RN10',
                        isDropOffOnly: isTerm1,
                        train_list: makeTrains(1, dest1, 'RN10', idx * travelPerStation, isTerm1)
                    });
                    platforms.push({
                        platform: 2,
                        LineId: 103,
                        LineColor: '#B91C1C',
                        DestinationStation: dest2,
                        DestinationStation_key: 'RN01',
                        isDropOffOnly: false,
                        train_list: makeTrains(2, dest2, 'RN01', (9 - idx) * travelPerStation + (interval * 0.5), false)
                    });
                }
            }
            // 5. รถโดยสารด่วนพิเศษ BRT (LineId: 201) — B1 (สาทร) <-> B12 (ราชพฤกษ์)
            else if (lineId === MRT_LINE_IDS.BRT) {
                const num = parseInt(key.replace(/\D/g, ''), 10) || 1;
                const idx = Math.max(0, Math.min(11, num - 1));
                const travelPerStation = 2.5;

                // Platform 1: ไปราชพฤกษ์ (B12)
                const isTerm1 = (key === 'B12');
                const offset1 = idx * travelPerStation;
                const dest1 = getDestPair('B12', 'ราชพฤกษ์', 'Ratchaphruek');
                platforms.push({
                    platform: 1,
                    LineId: lineId,
                    LineColor: color,
                    DestinationStation: dest1,
                    DestinationStation_key: 'B12',
                    isDropOffOnly: isTerm1,
                    train_list: makeTrains(1, dest1, 'B12', offset1, isTerm1)
                });

                // Platform 2: ไปสาทร (B1)
                const isTerm2 = (key === 'B1');
                const offset2 = (11 - idx) * travelPerStation + (interval * 0.5);
                const dest2 = getDestPair('B1', 'สาทร', 'Sathorn');
                platforms.push({
                    platform: 2,
                    LineId: lineId,
                    LineColor: color,
                    DestinationStation: dest2,
                    DestinationStation_key: 'B1',
                    isDropOffOnly: isTerm2,
                    train_list: makeTrains(2, dest2, 'B1', offset2, isTerm2)
                });
            }

            // 6. MRT สายสีส้ม (LineId: 106) — OR01 (บางขุนนนท์) <-> OR28 (แยกร่มเกล้า)
            else if (lineId === MRT_LINE_IDS.ORANGE) {
                const num = parseInt(key.replace(/\D/g, ''), 10) || 1;
                const idx = Math.max(0, Math.min(27, num - 1));
                const travelPerStation = 2.2;

                // Platform 1: ไปแยกร่มเกล้า (OR28)
                const isTerm1 = (key === 'OR28');
                const offset1 = idx * travelPerStation;
                const dest1 = getDestPair('OR28', 'แยกร่มเกล้า', 'Yaek Rom Klao');
                platforms.push({
                    platform: 1,
                    LineId: lineId,
                    LineColor: color,
                    DestinationStation: dest1,
                    DestinationStation_key: 'OR28',
                    isDropOffOnly: isTerm1,
                    train_list: makeTrains(1, dest1, 'OR28', offset1, isTerm1)
                });

                // Platform 2: ไปบางขุนนนท์ (OR01)
                const isTerm2 = (key === 'OR01');
                const offset2 = (27 - idx) * travelPerStation + (interval * 0.5);
                const dest2 = getDestPair('OR01', 'บางขุนนนท์', 'Bang Khun Non');
                platforms.push({
                    platform: 2,
                    LineId: lineId,
                    LineColor: color,
                    DestinationStation: dest2,
                    DestinationStation_key: 'OR01',
                    isDropOffOnly: isTerm2,
                    train_list: makeTrains(2, dest2, 'OR01', offset2, isTerm2)
                });
            }

            // 7. MRT สายสีชมพู (LineId: 5) — PK01 (ศูนย์ราชการนนทบุรี) <-> PK30 (มีนบุรี)
            else if (isPinkLineId(lineId) || (key && (key.startsWith('PK') || key.startsWith('MT')))) {
                const pinkColor = station.StationLineColor || LINE_BRAND_COLORS[5] || '#D76886';
                if (key === 'MT01') {
                    // MT01 มี 2 ชานชาลา ได้แก่ ชานชาลา 3 (ไปทะเลสาบเมืองทองธานี) และ ชานชาลา 4 (ไปเมืองทองธานี)
                    const dest1 = getDestPair('MT02', 'ทะเลสาบเมืองทองธานี', 'Lake Muang Thong Thani');
                    const dest2 = getDestPair('PK10', 'เมืองทองธานี', 'Muang Thong Thani');
                    platforms.push({
                        platform: 3,
                        LineId: 5,
                        LineColor: pinkColor,
                        DestinationStation: dest1,
                        DestinationStation_key: 'MT02',
                        isDropOffOnly: false,
                        train_list: makeTrains(3, dest1, 'MT02', 0, false)
                    });
                    platforms.push({
                        platform: 4,
                        LineId: 5,
                        LineColor: pinkColor,
                        DestinationStation: dest2,
                        DestinationStation_key: 'PK10',
                        isDropOffOnly: false,
                        train_list: makeTrains(4, dest2, 'PK10', interval * 0.5, false)
                    });
                } else if (key === 'MT02') {
                    // MT02 มี 2 ชานชาลา ได้แก่ ชานชาลา 3 (สิ้นสุดสาย ส่งผู้โดยสารเท่านั้น) และ ชานชาลา 4 (ไปเมืองทองธานี)
                    const dest1 = getDestPair('MT02', 'ทะเลสาบเมืองทองธานี', 'Lake Muang Thong Thani');
                    const dest2 = getDestPair('PK10', 'เมืองทองธานี', 'Muang Thong Thani');
                    platforms.push({
                        platform: 3,
                        LineId: 5,
                        LineColor: pinkColor,
                        DestinationStation: dest1,
                        DestinationStation_key: 'MT02',
                        isDropOffOnly: true,
                        train_list: []
                    });
                    platforms.push({
                        platform: 4,
                        LineId: 5,
                        LineColor: pinkColor,
                        DestinationStation: dest2,
                        DestinationStation_key: 'PK10',
                        isDropOffOnly: false,
                        train_list: makeTrains(4, dest2, 'PK10', 0, false)
                    });
                } else {
                    const num = parseInt(key.replace(/\D/g, ''), 10) || 1;
                    const idx = Math.max(0, Math.min(29, num - 1));
                    const travelPerStation = 1.76;

                    // Platform 1: ไปมีนบุรี (PK30)
                    const isTerm1 = (key === 'PK30');
                    const offset1 = idx * travelPerStation;
                    const dest1 = getDestPair('PK30', 'มีนบุรี', 'Min Buri');
                    platforms.push({
                        platform: 1,
                        LineId: 5,
                        LineColor: pinkColor,
                        DestinationStation: dest1,
                        DestinationStation_key: 'PK30',
                        isDropOffOnly: isTerm1,
                        train_list: makeTrains(1, dest1, 'PK30', offset1, isTerm1)
                    });

                    // Platform 2: ไปศูนย์ราชการนนทบุรี (PK01)
                    const isTerm2 = (key === 'PK01');
                    const offset2 = (29 - idx) * travelPerStation + (interval * 0.5);
                    const dest2 = getDestPair('PK01', 'ศูนย์ราชการนนทบุรี', 'Nonthaburi Civic Center');
                    platforms.push({
                        platform: 2,
                        LineId: 5,
                        LineColor: pinkColor,
                        DestinationStation: dest2,
                        DestinationStation_key: 'PK01',
                        isDropOffOnly: isTerm2,
                        train_list: makeTrains(2, dest2, 'PK01', offset2, isTerm2)
                    });
                }
            }

            // 8. MRT สายสีเหลือง (LineId: 4) — YL01 (ลาดพร้าว) <-> YL23 (สำโรง)
            else if (lineId === 4 || (key && key.startsWith('YL'))) {
                const yellowColor = station.StationLineColor || LINE_BRAND_COLORS[4] || '#FAD53D';
                const num = parseInt(key.replace(/\D/g, ''), 10) || 1;
                const idx = Math.max(0, Math.min(22, num - 1));
                const travelPerStation = 1.95;

                // Platform 1: ไปสำโรง (YL23) — หากเป็น YL23 ชานชาลา 1 ไม่ให้บริการ
                const isTerm1 = (key === 'YL23');
                const offset1 = idx * travelPerStation;
                const dest1 = isTerm1
                    ? ((typeof lang !== 'undefined' && lang === 'en') ? 'Out of Service' : ((typeof lang !== 'undefined' && lang === 'zh') ? '暂不营运' : 'ไม่ให้บริการ'))
                    : getDestPair('YL23', 'สำโรง', 'Samrong');
                platforms.push({
                    platform: 1,
                    LineId: 4,
                    LineColor: yellowColor,
                    DestinationStation: dest1,
                    DestinationStation_key: 'YL23',
                    isDropOffOnly: false,
                    isOutOfService: isTerm1,
                    train_list: isTerm1 ? [] : makeTrains(1, dest1, 'YL23', offset1, false)
                });

                // Platform 2: ไปลาดพร้าว (YL01)
                const isTerm2 = (key === 'YL01');
                const offset2 = (22 - idx) * travelPerStation + (interval * 0.5);
                const dest2 = getDestPair('YL01', 'ลาดพร้าว', 'Lat Phrao');
                platforms.push({
                    platform: 2,
                    LineId: 4,
                    LineColor: yellowColor,
                    DestinationStation: dest2,
                    DestinationStation_key: 'YL01',
                    isDropOffOnly: isTerm2,
                    train_list: makeTrains(2, dest2, 'YL01', offset2, isTerm2)
                });
            }

            // 9. สายสีน้ำเงิน (LineId: 101) — BL01..BL38
            else if (lineId === MRT_LINE_IDS.BLUE || lineId === 101 || (key && key.startsWith('BL'))) {
                const blueColor = station.StationLineColor || LINE_BRAND_COLORS[101] || '#0284c7';
                const blueLine = MRT_STATIC_DB.lines.find(l => l.LineId === MRT_LINE_IDS.BLUE);
                const list = blueLine?.StationList || [];
                const idx = Math.max(0, list.findIndex(s => s.StationKey === key));
                const travelPerStation = 2.0;

                const isTerm1 = (key === 'BL38');
                const dest1 = getDestPair('BL38', 'หลักสอง', 'Lak Song');
                const dest2 = getDestPair('BL01', 'ท่าพระ', 'Tha Phra');

                platforms.push({
                    platform: 1,
                    LineId: 101,
                    LineColor: blueColor,
                    DestinationStation: dest1,
                    DestinationStation_key: 'BL38',
                    isDropOffOnly: isTerm1,
                    train_list: makeTrains(1, dest1, 'BL38', idx * travelPerStation, isTerm1)
                });
                platforms.push({
                    platform: 2,
                    LineId: 101,
                    LineColor: blueColor,
                    DestinationStation: dest2,
                    DestinationStation_key: 'BL01',
                    isDropOffOnly: false,
                    train_list: makeTrains(2, dest2, 'BL01', (Math.max(0, list.length - 1 - idx)) * travelPerStation + (interval * 0.5), false)
                });
            } else {
                return null;
            }

            return {
                isTimetable: true,
                time: timeStr,
                fetchedAt: Date.now(),
                platform_list: platforms
            };
        }

        /* ===== BTS Green Line frequency table helper ===== */
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

        /* ================= COLOR INTERPOLATION HELPERS ================= */
        function hexToRgb(hex) {
            let c = String(hex || '').replace('#', '');
            if (c.length === 3) c = c.split('').map(x => x + x).join('');
            const num = parseInt(c, 16);
            if (isNaN(num)) return { r: 255, g: 255, b: 255 };
            return {
                r: (num >> 16) & 255,
                g: (num >> 8) & 255,
                b: num & 255
            };
        }

        function rgbToHex(r, g, b) {
            const toHex = x => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0');
            return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
        }

        function interpolateColor(hexFrom, hexTo, ratio) {
            const clampedRatio = Math.max(0, Math.min(1, ratio));
            if (clampedRatio <= 0) return hexFrom;
            if (clampedRatio >= 1) return hexTo;
            const c1 = hexToRgb(hexFrom);
            const c2 = hexToRgb(hexTo);
            const r = c1.r + (c2.r - c1.r) * clampedRatio;
            const g = c1.g + (c2.g - c1.g) * clampedRatio;
            const b = c1.b + (c2.b - c1.b) * clampedRatio;
            return rgbToHex(r, g, b);
        }

        /* ================= SHARED RENDER HELPERS ================= */

        function getLineIconSvg(lineId, activeOrColor = false, size = 18) {
            const id = Number(lineId) || 0;
            const color = LINE_BRAND_COLORS[id] || '#64748B';
            let c;
            if (typeof activeOrColor === 'string' && (activeOrColor.startsWith('#') || activeOrColor.startsWith('rgb'))) {
                c = activeOrColor;
            } else {
                c = activeOrColor ? '#ffffff' : color;
            }
            const isYellow = id === 4;
            const filter = (String(c).toLowerCase() === '#ffffff' && isYellow) ? 'filter: drop-shadow(0 1px 2px rgba(0,0,0,0.6));' : '';

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
                // SRT Dark Red Line: State Railway Commuter EMU (Hitachi) with overhead Catenary Pantograph
                inner = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M12 2l-3.5 3.5h7L12 2m0 3.5v2" stroke-width="1.5"/>
                    <path d="M5 7.5h14c1 0 1.5.5 1.5 1.8v7.4c0 1-.5 1.5-1.5 1.5H5c-1 0-1.5-.5-1.5-1.5V9.3c0-1.3.5-1.8 1.5-1.8z" fill="${c}" fill-opacity="0.22"/>
                    <rect x="6.5" y="9.5" width="11" height="4" rx="1" fill="${c}"/>
                    <circle cx="8" cy="15.2" r="1.3" fill="${c}"/>
                    <circle cx="16" cy="15.2" r="1.3" fill="${c}"/>
                    <line x1="2" y1="21" x2="22" y2="21" stroke-width="2"/>
                    <line x1="6" y1="18.2" x2="18" y2="18.2" stroke-width="1.5" opacity="0.6"/>
                </svg>`;
            } else if (id === 105) {
                // SRT Light Red Line: Light Commuter EMU with single-arm pantograph & distinct light red profile
                inner = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M8 2.5l5 2.5h-5" stroke-width="1.5" stroke-linecap="round"/>
                    <line x1="10.5" y1="5" x2="10.5" y2="7.5" stroke-width="1.5"/>
                    <path d="M5 7.5h14c1 0 1.5.5 1.5 1.8v7.4c0 1-.5 1.5-1.5 1.5H5c-1 0-1.5-.5-1.5-1.5V9.3c0-1.3.5-1.8 1.5-1.8z" fill="${c}" fill-opacity="0.28"/>
                    <path d="M7 9.5h10v4H7z" rx="1" fill="${c}"/>
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
            } else if (id === 201) {
                // Bangkok BRT: Bus Rapid Transit - Modern transit bus with dedicated lane (เขียวคาดเหลือง)
                inner = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display:block;margin:auto;">
                    <line x1="2" y1="21" x2="22" y2="21" stroke="#82C341" stroke-width="2"/>
                    <path d="M5 18v2M19 18v2" stroke="#1e293b" stroke-width="2.2"/>
                    <rect x="4" y="4" width="16" height="14" rx="3" fill="#82C341" stroke="#5f9628" stroke-width="1.6"/>
                    <line x1="8" y1="5.5" x2="16" y2="5.5" stroke="#ffffff" stroke-width="1.3"/>
                    <rect x="6" y="7" width="12" height="3.8" rx="0.8" fill="#0f172a" fill-opacity="0.8"/>
                    <rect x="4" y="11.6" width="16" height="2.4" fill="#FFD100" stroke="#ca8a04" stroke-width="0.3"/>
                    <circle cx="7.5" cy="15.3" r="1.2" fill="#FFD100" stroke="#365314" stroke-width="0.5"/>
                    <circle cx="16.5" cy="15.3" r="1.2" fill="#FFD100" stroke="#365314" stroke-width="0.5"/>
                    <line x1="10" y1="15.3" x2="14" y2="15.3" stroke="#ffffff" stroke-width="1.4"/>
                </svg>`;
            } else if (id === 106) {
                // MRT Orange Line: Underground Tunnel Metro with modern aerodynamic front
                inner = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display:block;margin:auto;">
                    <path d="M3 19V10a9 9 0 0 1 18 0v9" stroke-width="1.5" opacity="0.6"/>
                    <line x1="2" y1="21" x2="22" y2="21" stroke-width="2"/>
                    <path d="M5 6.5h14c1 0 1.5.8 1.5 1.8v8.4c0 1-.5 1.5-1.5 1.5H5c-1 0-1.5-.5-1.5-1.5V8.3c0-1 .5-1.8 1.5-1.8z" fill="${c}" fill-opacity="0.22"/>
                    <path d="M7 9h10c0 2-1 4-5 4s-5-2-5-4z" fill="${c}"/>
                    <circle cx="7.5" cy="15" r="1.2" fill="${c}"/>
                    <circle cx="16.5" cy="15" r="1.2" fill="${c}"/>
                    <line x1="10" y1="15" x2="14" y2="15" stroke-width="1.4"/>
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
                || (lang === 'en' ? (l.LineName_EN || l.LineName_TH) : (lang === 'zh' ? (LINE_NAMES_ZH[l.LineId] || l.LineName_EN || l.LineName_TH) : (l.LineName_TH || l.LineName_EN)));
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

        const LINE_ROYAL_NAMES = {
            4: { th: 'นัคราพิพัฒน์', en: 'Nakkhara Phiphat', zh: '纳卡拉披帕' },
            5: { th: 'วิวัฒน์นคร', en: 'Wiwat Nakhon', zh: '威瓦那空' },
            101: { th: 'เฉลิมรัชมงคล', en: 'Chaloem Ratchamongkhon', zh: '差隆拉差蒙坤' },
            102: { th: 'ฉลองรัชธรรม', en: 'Chalong Ratchatham', zh: '差隆拉差探' },
            103: { th: 'ธานีรัถยา', en: 'Thani Ratthaya', zh: '塔尼拉塔雅' },
            105: { th: 'นครวิถี', en: 'Nakhon Withi', zh: '那空威提' }
        };

        function matchQueryWithLine(qRaw, line, currentLang) {
            if (!qRaw || !line) return false;
            const q = qRaw.toLowerCase().trim();
            const qNoSpace = q.replace(/\s+/g, '');
            if (!q) return false;
            const optLabel = (getLineOptLabel(line) || '').toLowerCase();
            const optNoSpace = optLabel.replace(/\s+/g, '');
            if (optLabel.includes(q) || (qNoSpace && optNoSpace.includes(qNoSpace))) {
                return true;
            }

            if (currentLang === 'zh') {
                const nameZh = (LINE_NAMES_ZH[line.LineId] || I18N.zh?.lines?.[line.LineId] || shortLineName(line) || '').toLowerCase();
                const royalZh = (LINE_ROYAL_NAMES[line.LineId]?.zh || '').toLowerCase();
                const nameZhNoSpace = nameZh.replace(/\s+/g, '');
                const royalZhNoSpace = royalZh.replace(/\s+/g, '');
                return nameZh.includes(q) || q.includes(nameZh)
                    || (qNoSpace && (nameZhNoSpace.includes(qNoSpace) || qNoSpace.includes(nameZhNoSpace)))
                    || (royalZh && (royalZh.includes(q) || q.includes(royalZh)))
                    || (royalZhNoSpace && qNoSpace && (royalZhNoSpace.includes(qNoSpace) || qNoSpace.includes(royalZhNoSpace)));
            } else if (currentLang === 'th') {
                const nameTh = (shortLineName(line) || line.LineName_TH || line.LineNameTH || '').toLowerCase();
                const nameFullTh = (line.LineNameTH || line.LineName_TH || '').toLowerCase();
                const royalTh = (LINE_ROYAL_NAMES[line.LineId]?.th || '').toLowerCase();
                const nameThNoSpace = nameTh.replace(/\s+/g, '');
                const nameFullNoSpace = nameFullTh.replace(/\s+/g, '');
                const royalThNoSpace = royalTh.replace(/\s+/g, '');
                return nameTh.includes(q) || q.includes(nameTh)
                    || (qNoSpace && (nameThNoSpace.includes(qNoSpace) || qNoSpace.includes(nameThNoSpace)))
                    || nameFullTh.includes(q) || q.includes(nameFullTh)
                    || (qNoSpace && (nameFullNoSpace.includes(qNoSpace) || qNoSpace.includes(nameFullNoSpace)))
                    || (royalTh && (royalTh.includes(q) || q.includes(royalTh)))
                    || (royalThNoSpace && qNoSpace && (royalThNoSpace.includes(qNoSpace) || qNoSpace.includes(royalThNoSpace)));
            } else {
                const nameEn = (line.LineName_EN || line.LineNameEN || shortLineName(line) || '').toLowerCase();
                const royalEn = (LINE_ROYAL_NAMES[line.LineId]?.en || '').toLowerCase();
                const nameEnNoSpace = nameEn.replace(/\s+/g, '');
                const royalEnNoSpace = royalEn.replace(/\s+/g, '');
                return nameEn.includes(q) || q.includes(nameEn)
                    || (qNoSpace && (nameEnNoSpace.includes(qNoSpace) || qNoSpace.includes(nameEnNoSpace)))
                    || (royalEn && (royalEn.includes(q) || q.includes(royalEn)))
                    || (royalEnNoSpace && qNoSpace && (royalEnNoSpace.includes(qNoSpace) || qNoSpace.includes(royalEnNoSpace)));
            }
        }

        function matchQueryWithStation(qRaw, station, currentLang) {
            if (!qRaw || !station) return false;
            const q = qRaw.toLowerCase().trim();
            const qNoSpace = q.replace(/\s+/g, '');
            if (!q) return false;

            // StationKey (รหัสสถานีสากล เช่น YL20, CEN, N8) ค้นหาได้เสมอ
            const key = (station.StationKey || '').toLowerCase();
            const keyNoSpace = key.replace(/\s+/g, '');
            if (key.includes(q) || (qNoSpace && keyNoSpace.includes(qNoSpace))) return true;

            if (currentLang === 'zh') {
                const nameZh = (stName(station) || '').toLowerCase();
                const nameZhNoSpace = nameZh.replace(/\s+/g, '');
                const nameEn = (station.StationNameEN || station.StationName_EN || '').toLowerCase();
                const nameEnNoSpace = nameEn.replace(/\s+/g, '');
                return nameZh.includes(q) || (qNoSpace && nameZhNoSpace.includes(qNoSpace))
                    || nameEn.includes(q) || (qNoSpace && nameEnNoSpace.includes(qNoSpace));
            } else if (currentLang === 'th') {
                const nameTh = (station.StationNameTH || stName(station) || '').toLowerCase();
                const nameThNoSpace = nameTh.replace(/\s+/g, '');
                return nameTh.includes(q) || (qNoSpace && nameThNoSpace.includes(qNoSpace));
            } else {
                const nameEn = (station.StationNameEN || station.StationName_EN || stName(station) || '').toLowerCase();
                const nameEnNoSpace = nameEn.replace(/\s+/g, '');
                return nameEn.includes(q) || (qNoSpace && nameEnNoSpace.includes(qNoSpace));
            }
        }

        function getLineOptLabel(l) {
            if (!l) return '';
            const id = Number(l.LineId ?? l.id) || 0;
            if (id === 0) {
                return lang === 'zh' ? '全部线路' : (lang === 'en' ? 'All Lines' : 'ทั้งหมด');
            }
            if (id === 1) {
                return lang === 'zh' ? 'BTS 素坤逸线' : (lang === 'en' ? 'BTS Sukhumvit Line' : 'BTS สายสุขุมวิท');
            }
            if (id === 2) {
                return lang === 'zh' ? 'BTS 是隆线' : (lang === 'en' ? 'BTS Silom Line' : 'BTS สายสีลม');
            }
            if (id === 3) {
                return lang === 'zh' ? 'BTS 金线' : (lang === 'en' ? 'BTS Gold Line' : 'BTS สายสีทอง');
            }
            if (id === 4) {
                return lang === 'zh' ? 'MRT 黄线 | (纳卡拉披帕)' : (lang === 'en' ? 'MRT Yellow Line | (Nakkhara Phiphat)' : 'MRT สายสีเหลือง | (นัคราพิพัฒน์)');
            }
            if (id === 5) {
                return lang === 'zh' ? 'MRT 粉红线 | (威瓦那空)' : (lang === 'en' ? 'MRT Pink Line | (Wiwat Nakhon)' : 'MRT สายสีชมพู | (วิวัฒน์นคร)');
            }
            if (id === 101) {
                return lang === 'zh' ? 'MRT 蓝线 | (差隆拉差蒙坤)' : (lang === 'en' ? 'MRT Blue Line | (Chaloem Ratchamongkhon)' : 'MRT สายสีน้ำเงิน | (เฉลิมรัชมงคล)');
            }
            if (id === 102) {
                return lang === 'zh' ? 'MRT 紫线 | (差隆拉差探)' : (lang === 'en' ? 'MRT Purple Line | (Chalong Ratchatham)' : 'MRT สายสีม่วง | (ฉลองรัชธรรม)');
            }
            if (id === 103) {
                return lang === 'zh' ? 'SRT 暗红线 | (塔尼拉塔雅)' : (lang === 'en' ? 'SRT Dark Red Line | (Thani Ratthaya)' : 'SRT สายสีแดงเข้ม | (ธานีรัถยา)');
            }
            if (id === 105) {
                return lang === 'zh' ? 'SRT 浅红线 | (那空威提)' : (lang === 'en' ? 'SRT Light Red Line | (Nakhon Withi)' : 'SRT สายสีแดงอ่อน | (นครวิถี)');
            }
            if (id === 104) {
                return lang === 'zh' ? 'ARL 机场快线' : (lang === 'en' ? 'ARL Airport Rail Link' : 'ARL แอร์พอร์ต ลิงก์');
            }
            if (id === 201) {
                return 'BRT';
            }
            if (id === 106) {
                return lang === 'zh' ? 'MRT 橙线 (尚未开通)' : (lang === 'en' ? 'MRT Orange Line (Not in Service)' : 'MRT สายสีส้ม (ยังไม่เปิดให้บริการ)');
            }
            const th = l.LineName_TH || l.LineNameTH || '';
            const en = l.LineName_EN || l.LineNameEN || '';
            if (lang === 'zh') return LINE_NAMES_ZH[id] || en || th;
            if (lang === 'en') return en || th;
            return th || en;
        }

        // คืน {text, now} สำหรับ ETA (นาทีคงเหลือ ณ ตอนนี้) — approx = ค่าจากความจำ ใส่ ~ นำหน้า
        function etaText(mins, approx) {
            if (isNaN(mins)) return { text: '<small>--</small>', now: false };
            if (mins < -0.75) return { text: '<small>--</small>', now: false }; // ขบวนออกไปแล้ว
            if (mins <= 0.5) return { text: T('arrived'), now: true };
            return { text: (approx ? '~' : '') + Math.round(mins) + `<small>${T('minUnit')}</small>`, now: false };
        }

        // เวลา "ที่ดีที่สุดที่รู้" ของขบวน: ใช้ค่าจาก API ถ้ามี — ถ้าตอบ "--" ใช้ค่าเลขรอบก่อน
        // จาก etaMem (นับถอยหลังต่อเนื่อง) จนกว่าจะได้เลขใหม่ ผู้ใช้จะไม่เห็นเวลาวูบหาย
        function bestEta(stationKey, platform, t, fetchedAt) {
            const nowMs = Date.now();
            const at = t?.syntheticAt || fetchedAt || nowMs;
            if (t.time_come !== '--' && t.time_come != null) {
                const num = parseFloat(t.time_come);
                const base = (!isNaN(num) && num >= 0) ? num : (t.time_come_double != null ? t.time_come_double : null);
                if (base != null) {
                    const rem = base - (nowMs - at) / 60000;
                    if (rem > -0.75) return { base, at, approx: !!t.isApprox };
                }
            }
            if (t.time_come_double != null) {
                const rem = t.time_come_double - (nowMs - at) / 60000;
                if (rem > -0.75) return { base: t.time_come_double, at, approx: !!t.isApprox };
            }
            if (t.status === 'arriving') {
                const rem = 0 - (nowMs - at) / 60000;
                if (rem > -0.75) return { base: 0, at, approx: false };
            }
            const m = App.etaMem[stationKey + '|' + platform + '|' + t.trainNo];
            if (m && (m.base - (nowMs - m.at) / 60000) > -0.75)
                return { base: m.base, at: m.at, approx: true };
            return null;
        }

        // ตรวจสอบช่วงเวลาเปิดให้บริการจริงของสายรถไฟฟ้า (Transit Operating Hours)
        // เพื่อป้องกันไม่ให้นำ Telemetry ทดสอบในศูนย์ซ่อมบำรุงหรือข้อมูลค้างมาแสดงเป็นรถไฟจริง
        function isTransitOperatingHours(lineId, stationKey) {
            const now = new Date();
            const nowMin = now.getHours() * 60 + now.getMinutes();
            let id = Number(lineId) || 0;
            if (!id && stationKey) {
                if (/^YL/i.test(stationKey)) id = 4;
                else if (/^(PK|MT)/i.test(stationKey)) id = 5;
                else if (/^G/i.test(stationKey)) id = 3;
                else if (/^BL/i.test(stationKey)) id = 101;
                else if (/^PP/i.test(stationKey)) id = 102;
                else if (/^RN/i.test(stationKey)) id = 103;
                else if (/^RW/i.test(stationKey)) id = 105;
                else if (/^A/i.test(stationKey)) id = 104;
                else if (/^B\d/i.test(stationKey)) id = 201;
                else if (/^[NE]/i.test(stationKey)) id = 1;
                else if (/^[SW]/i.test(stationKey)) id = 2;
            }
            // สายสีเหลือง (4) และสายสีชมพู (5): ให้บริการ 06:00 - 24:00 น. (ปิด 00:30 - 05:25 น.)
            if (id === 4 || id === 5) {
                if (nowMin >= 30 && nowMin < 325) return false;
            } else if (id === 3) {
                // สายสีทอง (3): ให้บริการ 06:00 - 24:00 น. (ปิด 00:20 - 05:45 น.)
                if (nowMin >= 20 && nowMin < 345) return false;
            } else if (id === 103 || id === 105) {
                // รถไฟฟ้าชานเมืองสายสีแดง (103, 105): ให้บริการ 05:00 - 24:00 น. (ปิด 00:30 - 04:55 น.)
                if (nowMin >= 30 && nowMin < 295) return false;
            } else {
                // สายอื่นๆ ในกรุงเทพฯ (BTS/MRT/ARL/BRT): ให้บริการ 05:30 - 24:00 น. (ปิด 00:45 - 05:15 น.)
                if (nowMin >= 45 && nowMin < 315) return false;
            }
            return true;
        }

        // กรองขบวนที่แสดงได้ของชานชาลา (จัดการขบวนที่ API ตอบ time_come = "--" หรือขบวนศูนย์ซ่อมบำรุง):
        // - กรองขบวนรถศูนย์ซ่อมบำรุง/รถเปล่า (เช่น YL00, PK00) ออกทั้งหมด
        // - ช่วงเวลานอกการให้บริการ (Transit Closed) ไม่อนุญาตให้นำขบวนหลอกหรือ Telemetry ค้างมาแสดงเป็นรถไฟ
        // - กรองขบวนที่เวลาผ่านไปแล้ว (Departed / Expired) ออกทันที
        // - "--" และไม่มีความจำ (เช่นเพิ่งเปิดเว็บครั้งแรก) → ตัดทิ้ง ขบวนถัดไปเลื่อนขึ้นมาแทน
        // - "--" มีความจำ แต่มีขบวนอื่นที่เวลาจริง "น้อยกว่า" ค่าที่จำไว้ → ขบวนนี้ออกไปแล้ว ตัดทิ้ง
        function displayTrains(stationKey, platform, list, fetchedAt, targetLineId) {
            let lineId = Number(targetLineId) || 0;
            if (!lineId) {
                if (stationKey === 'CEN') {
                    lineId = (String(platform) === '3' || String(platform) === '4') ? 2 : 1;
                } else {
                    const st = App.findStation(stationKey);
                    lineId = st ? (st.StationLineId || st.LineId || 0) : 0;
                }
            }
            const isOperating = isTransitOperatingHours(lineId, stationKey);

            // 1. นอกเวลาให้บริการเดินรถโดยสาร (Transit Closed / Off-hours)
            //    ไม่อนุญาตให้นำ Telemetry ค้างหรือขบวนทดสอบในศูนย์ซ่อมมาแสดงเป็นขบวนรถโดยสาร
            if (!isOperating) {
                return [];
            }

            const out = [];
            const nowMs = Date.now();
            for (const t of list || []) {
                // 2. กรองขบวนศูนย์ซ่อมบำรุง/รถเปล่า (Depot / Non-passenger Trains) เช่น YL00, PK00
                const isDepotTrain = (t.station_key && /^[A-Z]{1,3}00$/i.test(t.station_key))
                    || (t.trainNo && /depot|test|empty/i.test(t.trainNo));
                if (isDepotTrain) continue;

                // 3. คำนวณเวลา ETA ที่ดีที่สุด
                const eta = bestEta(stationKey, platform, t, fetchedAt);

                // 4. ตรวจสอบว่าขบวนออกไปแล้วหรือไม่ (หากเวลาติดลบเกิน 45 วินาที [-0.75 นาที] ขบวนออกไปแล้ว ตัดทิ้ง)
                if (eta) {
                    const remaining = eta.base - (nowMs - eta.at) / 60000;
                    if (remaining < -0.75) continue;
                } else if (t.status === 'arriving') {
                    // status arriving แต่ไม่มี eta: ตรวจสอบ fetchedAt หากข้อมูลเก่าเกิน 3 นาที แสดงว่าค้าง
                    if (fetchedAt && (nowMs - fetchedAt) > 180000) continue;
                } else if (t.time_come === '--' && (t.time_come_double == null || isNaN(t.time_come_double))) {
                    // ขบวน "--" ที่ไม่มีเวลาและไม่มีประวัติเดิม ตัดทิ้ง
                    continue;
                }

                // 5. ตรวจสอบเฉพาะขบวนที่เป็นค่าประมาณ (~approx จาก etaMem) หากมีขบวนจริงที่มาถึงก่อนและเวลาขัดแย้ง
                if (t.time_come === '--' && eta && eta.approx) {
                    const remaining = eta.base - (nowMs - eta.at) / 60000;
                    const overtaken = (list || []).some(o => o !== t
                        && o.time_come !== '--' && o.time_come_double != null
                        && (o.time_come_double - (nowMs - fetchedAt) / 60000) < remaining);
                    if (overtaken) continue;
                }

                out.push(t);
            }

            // จัดเรียงตามเวลานับถอยหลังคงเหลือจริง (จากน้อยไปมาก)
            out.sort((a, b) => {
                const etaA = bestEta(stationKey, platform, a, fetchedAt);
                const etaB = bestEta(stationKey, platform, b, fetchedAt);
                const remA = etaA ? (etaA.base - (nowMs - etaA.at) / 60000) : (a.status === 'arriving' ? 0 : 999);
                const remB = etaB ? (etaB.base - (nowMs - etaB.at) / 60000) : (b.status === 'arriving' ? 0 : 999);
                return remA - remB;
            });

            // 6. เติมเวลานับถอยหลังของขบวนถัดไป (ขบวนที่ 2 และ 3) เสมอตามความถี่เดินรถ (Headway Interval)
            // เพื่อให้ผู้ใช้เห็นเวลานับถอยหลังของขบวนถัดไปเสมอเหมือนภาพที่สอง
            if (out.length > 0 && out.length < 3) {
                const freq = getCurrentMrtFreq(lineId, stationKey);
                const interval = (freq && Number(freq.minutes)) || 10;
                const lastT = out[out.length - 1];
                const lastEta = bestEta(stationKey, platform, lastT, fetchedAt);
                let lastRem = 0;
                if (lastEta) {
                    lastRem = Math.max(0, lastEta.base - (nowMs - lastEta.at) / 60000);
                } else if (lastT.status === 'arriving') {
                    lastRem = 0;
                } else {
                    const parsed = parseFloat(lastT.time_come);
                    lastRem = (!isNaN(parsed) && parsed >= 0) ? parsed : 0;
                }

                const dest = lastT.station || '';
                const destKey = lastT.station_key || '';
                let nextIdx = 1;
                while (out.length < 3) {
                    const nextEtaMin = (lastRem === 0 ? 0 : lastRem) + (interval * nextIdx);
                    out.push({
                        trainNo: lastT.trainNo ? `${lastT.trainNo}+${nextIdx}` : `T${platform}-${out.length + 1}`,
                        platform: platform,
                        status: 'pending',
                        time_come: String(Math.max(1, Math.round(nextEtaMin))),
                        time_come_double: nextEtaMin,
                        station: dest,
                        station_key: destKey,
                        isApprox: false,
                        syntheticAt: nowMs
                    });
                    nextIdx++;
                }
            }

            return out.slice(0, 3);
        }

        function ensureTwoPlatformsForTerminal(station, platforms) {
            const result = [...(platforms || [])];
            const lineIds = [...new Set(result.map(p => p.LineId))];
            if (station.StationKey === 'CEN') {
                if (!lineIds.includes(1)) lineIds.push(1);
                if (!lineIds.includes(2)) lineIds.push(2);
            } else if (!lineIds.length && station.StationLineId) {
                lineIds.push(station.StationLineId);
            }

            for (const lid of lineIds) {
                const line = (App.lineById && App.lineById[lid])
                    || (typeof MRT_LINE_BY_ID !== 'undefined' ? MRT_LINE_BY_ID[lid] : null)
                    || (App.getAllLines ? App.getAllLines().find(l => l.LineId === lid) : null);
                if (!line || !line.StationList || line.StationList.length < 2) continue;
                const list = line.StationList;
                const idx = list.findIndex(s => s.StationKey === station.StationKey);
                if (idx < 0) continue;

                const linePlats = result.filter(p => p.LineId === lid);

                if (station.StationKey === 'MT01') {
                    // MT01 มี 2 ชานชาลา ได้แก่ ชานชาลา 3 (ไปทะเลสาบเมืองทองธานี) และ ชานชาลา 4 (ไปเมืองทองธานี)
                    const p3 = linePlats.find(p => String(p.platform) === '3');
                    const p4 = linePlats.find(p => String(p.platform) === '4');
                    const dest1 = (typeof lang !== 'undefined' && lang === 'en') ? 'Lake Muang Thong Thani' : ((typeof lang !== 'undefined' && lang === 'zh') ? '通城湖' : 'ทะเลสาบเมืองทองธานี');
                    const dest2 = (typeof lang !== 'undefined' && lang === 'en') ? 'Muang Thong Thani' : ((typeof lang !== 'undefined' && lang === 'zh') ? '通城' : 'เมืองทองธานี');
                    if (!p3) {
                        result.push({
                            platform: 3,
                            LineId: lid,
                            LineColor: line.LineColor,
                            DestinationStation: dest1,
                            DestinationStation_key: 'MT02',
                            isDropOffOnly: false,
                            train_list: []
                        });
                    } else if (!p3.DestinationStation) {
                        p3.DestinationStation = dest1;
                        p3.DestinationStation_key = 'MT02';
                    }
                    if (!p4) {
                        result.push({
                            platform: 4,
                            LineId: lid,
                            LineColor: line.LineColor,
                            DestinationStation: dest2,
                            DestinationStation_key: 'PK10',
                            isDropOffOnly: false,
                            train_list: []
                        });
                    } else if (!p4.DestinationStation) {
                        p4.DestinationStation = dest2;
                        p4.DestinationStation_key = 'PK10';
                    }
                    const filtered = result.filter(p => p.LineId !== lid || String(p.platform) === '3' || String(p.platform) === '4');
                    result.length = 0;
                    result.push(...filtered);
                    continue;
                }

                if (station.StationKey === 'MT02') {
                    // MT02 มี 2 ชานชาลา ได้แก่ ชานชาลา 3 (สิ้นสุดสาย ส่งผู้โดยสารเท่านั้น) และ ชานชาลา 4 (ไปเมืองทองธานี)
                    const p3 = linePlats.find(p => String(p.platform) === '3');
                    const p4 = linePlats.find(p => String(p.platform) === '4');
                    const dest1 = (typeof lang !== 'undefined' && lang === 'en') ? 'Lake Muang Thong Thani' : ((typeof lang !== 'undefined' && lang === 'zh') ? '通城湖' : 'ทะเลสาบเมืองทองธานี');
                    const dest2 = (typeof lang !== 'undefined' && lang === 'en') ? 'Muang Thong Thani' : ((typeof lang !== 'undefined' && lang === 'zh') ? '通城' : 'เมืองทองธานี');
                    if (!p3) {
                        result.push({
                            platform: 3,
                            LineId: lid,
                            LineColor: line.LineColor,
                            DestinationStation: dest1,
                            DestinationStation_key: 'MT02',
                            isDropOffOnly: true,
                            train_list: []
                        });
                    } else {
                        p3.isDropOffOnly = true;
                        if (!p3.DestinationStation) {
                            p3.DestinationStation = dest1;
                            p3.DestinationStation_key = 'MT02';
                        }
                    }
                    if (!p4) {
                        result.push({
                            platform: 4,
                            LineId: lid,
                            LineColor: line.LineColor,
                            DestinationStation: dest2,
                            DestinationStation_key: 'PK10',
                            isDropOffOnly: false,
                            train_list: []
                        });
                    } else if (!p4.DestinationStation) {
                        p4.DestinationStation = dest2;
                        p4.DestinationStation_key = 'PK10';
                    }
                    const filtered = result.filter(p => p.LineId !== lid || String(p.platform) === '3' || String(p.platform) === '4');
                    result.length = 0;
                    result.push(...filtered);
                    continue;
                }

                const isSilom = (lid === 2);
                // สายสีลม (Line 2) ใช้ชานชาลา 3 และ 4
                const pNumA = isSilom ? 3 : 1;
                const pNumB = isSilom ? 4 : 2;

                const hasPlatA = linePlats.some(p => String(p.platform) === String(pNumA));
                const hasPlatB = linePlats.some(p => String(p.platform) === String(pNumB));

                let isDropOffA = false;
                let destNameA = '';
                let destKeyA = '';

                let isDropOffB = false;
                let destNameB = '';
                let destKeyB = '';
                    let endStation = list[list.length - 1];
                    let startStation = list[0];
                    if (lid === 5) {
                        endStation = list.find(s => s.StationKey === 'PK30') || endStation;
                        startStation = list.find(s => s.StationKey === 'PK01') || startStation;
                    }

                    isDropOffA = (station.StationKey === endStation.StationKey || idx === list.length - 1);
                    destNameA = isDropOffA
                        ? (station.StationNameTH || station.StationName || 'สิ้นสุดปลายทาง')
                        : (endStation.StationNameTH || endStation.StationName);
                    destKeyA = isDropOffA ? station.StationKey : endStation.StationKey;

                    isDropOffB = (station.StationKey === startStation.StationKey || idx === 0);
                    destNameB = isDropOffB
                        ? (station.StationNameTH || station.StationName || 'สิ้นสุดปลายทาง')
                        : (startStation.StationNameTH || startStation.StationName);
                    destKeyB = isDropOffB ? station.StationKey : startStation.StationKey;

                if (!hasPlatA) {
                    result.push({
                        platform: pNumA,
                        LineId: lid,
                        LineColor: line.LineColor,
                        DestinationStation: destNameA,
                        DestinationStation_key: destKeyA,
                        isDropOffOnly: isDropOffA,
                        train_list: []
                    });
                }
                if (!hasPlatB) {
                    result.push({
                        platform: pNumB,
                        LineId: lid,
                        LineColor: line.LineColor,
                        DestinationStation: destNameB,
                        DestinationStation_key: destKeyB,
                        isDropOffOnly: isDropOffB,
                        train_list: []
                    });
                }
            }

            // กฎเฉพาะสำหรับสถานี YL23 (สำโรง สายสีเหลือง):
            // มี 2 ชานชาลา แต่รถไฟวิ่งไป-กลับแค่ P2 ไม่เข้า P1 (P1 เป็นชานชาลาที่ไม่ให้บริการ)
            if (station && station.StationKey === 'YL23') {
                const p1 = result.find(p => p.LineId === 4 && String(p.platform) === '1');
                const p2 = result.find(p => p.LineId === 4 && String(p.platform) === '2');
                if (p1) {
                    p1.isDropOffOnly = false;
                    p1.isOutOfService = true;
                    p1.DestinationStation = (typeof lang !== 'undefined' && lang === 'en') ? 'Out of Service' : ((typeof lang !== 'undefined' && lang === 'zh') ? '暂不营运' : 'ไม่ให้บริการ');
                    p1.DestinationStation_key = 'YL23';
                    p1.train_list = []; // ไม่เข้า P1 เด็ดขาด
                }
                if (p2) {
                    p2.isDropOffOnly = false;
                    p2.DestinationStation = (typeof lang !== 'undefined' && lang === 'en') ? 'Lat Phrao' : ((typeof lang !== 'undefined' && lang === 'zh') ? '拉抛' : 'ลาดพร้าว');
                    p2.DestinationStation_key = 'YL01';
                }
            }

            result.sort((a, b) => {
                if (a.LineId !== b.LineId) return a.LineId - b.LineId;
                return (parseInt(a.platform, 10) || 0) - (parseInt(b.platform, 10) || 0);
            });
            return result;
        }

        function visiblePlatformsForStation(station, platforms) {
            if (!station) return platforms || [];
            const validLines = new Set();
            if (station.StationKey === 'CEN') {
                validLines.add(1);
                validLines.add(2);
            } else {
                if (station.StationLineId) validLines.add(Number(station.StationLineId));
                if (station.LineId) validLines.add(Number(station.LineId));
                if (typeof App !== 'undefined' && App.keyLines && App.keyLines[station.StationKey]) {
                    for (const kl of App.keyLines[station.StationKey]) {
                        if (kl.lineId) validLines.add(Number(kl.lineId));
                    }
                }
            }
            const cleanPlats = (platforms || []).filter(p => !p.LineId || validLines.size === 0 || validLines.has(Number(p.LineId)));
            return ensureTwoPlatformsForTerminal(station, cleanPlats);
        }

        // error จาก TTA ที่แปลว่า "นอกเวลาให้บริการ" ไม่ใช่เน็ตล่ม — ช่วงกลางคืน (เช่น 00:30–05:25 น.)
        // API จะตอบทำนอง "this Line is unavailable" หรืออยู่ในช่วงที่ไม่มีรถวิ่งจริง ๆ
        function isOffServiceError(msg) {
            const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
            const inOffWindow = nowMin >= 30 && nowMin < 325; // 00:30–05:25 นอกเวลาเดินรถของ กทม.
            // อย่าตีความว่า network error หรือ Failed to fetch คือนอกเวลาให้บริการ
            const isNetErr = /failed to fetch|network|connectfail|abort|timeout/i.test(msg || '');
            if (isNetErr) return false;
            return inOffWindow
                || /unavailable|out of service|no\s*service|not\s*available|ไม่ให้บริการ|ปิดให้บริการ|หมดเวลา/i.test(msg || '');
        }

        // แสดงชานชาลาทั้งหมดของสถานี — จัดกลุ่มตามสาย (สยามมี 2 สาย × 2 ชานชาลา = 4)
        function renderPlatformSection(station, arr) {
            if (station && (station.StationLineId === 106 || station.StationKey?.startsWith('OR'))) {
                const orangeTitle = lang === 'en' ? 'Orange Line (Not in Service)' : (lang === 'zh' ? '橙线 (尚未开通)' : 'สายสีส้ม (ยังไม่เปิดให้บริการ)');
                const orangeDesc = lang === 'en'
                    ? 'This line is currently under construction and testing. Commercial passenger service has not yet commenced.'
                    : (lang === 'zh'
                        ? '捷运橙线目前正在进行系统测试及施工中，尚未向公众开放商业营运。'
                        : 'โครงการรถไฟฟ้าสายสีส้มอยู่ระหว่างการทดสอบระบบและดำเนินงานก่อสร้าง ยังไม่เปิดให้บริการเดินรถแก่ประชาชน');
                return `<div class="empty-note" style="padding:24px 16px;text-align:center;">
                    <div style="display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:50%;background:rgba(245,130,32,0.12);color:#f58220;margin-bottom:12px;font-size:24px;">🚧</div>
                    <div style="font-size:16px;font-weight:800;color:var(--ink);margin-bottom:6px;">${orangeTitle}</div>
                    <div style="font-size:13px;color:var(--muted);max-width:320px;margin:0 auto;line-height:1.5;">${orangeDesc}</div>
                </div>`;
            }
            if (!arr || (arr.loading && !arr.platforms))
                return `<div class="empty-note"><span class="spin dark"></span><br>${T('loadingTrains')}</div>`;
            if (arr.error && (!arr.platforms || !arr.platforms.length)) {
                if (!isOffServiceError(arr.error)) {
                    return `<div class="err-box">${esc(arr.error)}
                    <button class="btn btn-ghost" onclick="App.loadArrivals(App.findStation('${esc(station.StationKey)}'), true)">${T('retry')}</button></div>`;
                }
            }
            let platforms = visiblePlatformsForStation(station, arr?.platforms || []);
            if (!platforms.length) {
                const fb = generateTimetableArrivals(station);
                if (fb?.platform_list?.length) {
                    platforms = visiblePlatformsForStation(station, fb.platform_list);
                }
            }
            if (!platforms.length) {
                platforms = visiblePlatformsForStation(station, []);
            }

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
                const line = App.lineById[g.lineId] || MRT_LINE_BY_ID[g.lineId];
                const head = multiLine ? `
                    <div class="line-group-head" style="color:${g.color};display:flex;align-items:center;gap:6px;">
                        ${getLineIconSvg(g.lineId, false, 18)}
                        <span class="bar" style="background:${g.color}"></span>
                        ${T('line', esc(line ? shortLineName(line) : g.lineId))}</div>` : '';
                const cards = g.list.map(p => renderPlatform(p, arr.fetchedAt, station.StationKey)).join('');
                return `<div class="line-group">${head}<div class="plat-grid">${cards}</div></div>`;
            }).join('');

            let branchCard = '';
            if (station && station.StationKey === 'PK10') {
                const bTitle = lang === 'en' ? 'Muang Thong Thani Branch Interchange' : (lang === 'zh' ? '通城支线换乘站' : 'จุดเชื่อมต่อ · สายแยกเมืองทองธานี');
                const bDesc = lang === 'en' ? 'Transfer to MT01 (IMPACT) & MT02 (Lake)' : (lang === 'zh' ? '换乘至 MT01 挑战者展馆 与 MT02 通城湖' : 'เปลี่ยนขบวนไป MT01 อิมแพ็ค และ MT02 ทะเลสาบเมืองทองธานี');
                const bBtn = lang === 'en' ? 'View MT01 ➔' : (lang === 'zh' ? '查看 MT01 ➔' : 'ดูสถานี MT01 ➔');
                branchCard = `
                <div class="branch-transfer-box" style="margin:4px 0 12px 0;padding:10px 14px;background:var(--bg-subtle);border:1px solid var(--line);border-left:3px solid #D76886;border-radius:10px;display:flex;align-items:center;justify-content:space-between;gap:12px;box-sizing:border-box;">
                    <div style="display:flex;align-items:center;gap:10px;min-width:0;">
                        <div style="flex-shrink:0;display:flex;align-items:center;justify-content:center;">${getLineIconSvg(5, false, 20)}</div>
                        <div style="min-width:0;">
                            <div style="font-size:12.5px;font-weight:700;color:var(--ink);line-height:1.3;">${bTitle}</div>
                            <div style="font-size:11.5px;color:var(--muted);line-height:1.35;margin-top:2px;white-space:normal;">${bDesc}</div>
                        </div>
                    </div>
                    <button type="button" class="btn btn-sm" style="flex-shrink:0;background:rgba(215,104,134,0.1);color:#D76886;border:1px solid rgba(215,104,134,0.25);border-radius:20px;padding:6px 12px;font-size:11.5px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;line-height:1;letter-spacing:0;box-sizing:border-box;transition:all 0.2s;" onclick="event.stopPropagation();App.jumpTo('MT01', 5);">
                        ${bBtn}
                    </button>
                </div>`;
            } else if (station && (station.StationKey === 'MT01' || station.StationKey === 'MT02')) {
                const bTitle = lang === 'en' ? 'Pink Line Main Interchange' : (lang === 'zh' ? '粉红线主线换乘站' : 'จุดเชื่อมต่อ · สายสีชมพูสายหลัก');
                const bDesc = lang === 'en' ? 'Transfer at PK10 to Min Buri or Nonthaburi Civic Center' : (lang === 'zh' ? '在 PK10 换乘前往民武里或暖武里政务中心' : 'เปลี่ยนขบวนไปสถานีเมืองทองธานี (PK10) เพื่อไปมีนบุรีหรือศูนย์ราชการนนทบุรี');
                const bBtn = lang === 'en' ? 'View PK10 ➔' : (lang === 'zh' ? '查看 PK10 ➔' : 'ดูสถานี PK10 ➔');
                branchCard = `
                <div class="branch-transfer-box" style="margin:4px 0 12px 0;padding:10px 14px;background:var(--bg-subtle);border:1px solid var(--line);border-left:3px solid #D76886;border-radius:10px;display:flex;align-items:center;justify-content:space-between;gap:12px;box-sizing:border-box;">
                    <div style="display:flex;align-items:center;gap:10px;min-width:0;">
                        <div style="flex-shrink:0;display:flex;align-items:center;justify-content:center;">${getLineIconSvg(5, false, 20)}</div>
                        <div style="min-width:0;">
                            <div style="font-size:12.5px;font-weight:700;color:var(--ink);line-height:1.3;">${bTitle}</div>
                            <div style="font-size:11.5px;color:var(--muted);line-height:1.35;margin-top:2px;white-space:normal;">${bDesc}</div>
                        </div>
                    </div>
                    <button type="button" class="btn btn-sm" style="flex-shrink:0;background:rgba(215,104,134,0.1);color:#D76886;border:1px solid rgba(215,104,134,0.25);border-radius:20px;padding:6px 12px;font-size:11.5px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;line-height:1;letter-spacing:0;box-sizing:border-box;transition:all 0.2s;" onclick="event.stopPropagation();App.jumpTo('PK10', 5);">
                        ${bBtn}
                    </button>
                </div>`;
            }

            return branchCard + platHtml;
        }

        function renderPlatform(p, fetchedAt, stationKey) {
            let tList = p.train_list;
            const isOutOfService = !!p.isOutOfService || (stationKey === 'YL23' && String(p.platform) === '1');
            if ((!tList || !tList.length) && !p.isDropOffOnly && !isOutOfService && isTransitOperatingHours(p.LineId, stationKey)) {
                const fb = generateTimetableArrivals(App.findStation(stationKey));
                const fbPlat = fb?.platform_list?.find(fp => Number(fp.LineId) === Number(p.LineId) && String(fp.platform) === String(p.platform));
                if (fbPlat?.train_list?.length) {
                    tList = fbPlat.train_list;
                }
            }
            // กรองขบวน "--" ที่ไม่มีข้อมูลพอจะแสดงออกก่อน (ดู displayTrains) — เหลือสูงสุด 3 ขบวน
            const trains = isOutOfService ? [] : displayTrains(stationKey, p.platform, tList, fetchedAt, p.LineId);
            // ขบวนที่ user เลือกไว้ (แตะขบวนเพื่อดูปลายทางของขบวนนั้น) — ตรวจ trainNo กันข้อมูล refresh แล้วลำดับเลื่อน
            const sel = App.selTrain[stationKey + '|' + p.platform];
            const selIdx = (sel && trains[sel.idx]?.trainNo === sel.trainNo) ? sel.idx : -1;
            const selT = selIdx >= 0 ? trains[selIdx] : null;
            const isTerminating = !isOutOfService && (p.isDropOffOnly || p.DestinationStation_key === stationKey);
            const rawDest = (selT && selT.station) || p.DestinationStation;
            const dest = isOutOfService
                ? (lang === 'en' ? 'Out of Service' : (lang === 'zh' ? '暂不营运' : 'ไม่ให้บริการ'))
                : isTerminating
                    ? (lang === 'en' ? 'Drop-off only' : (lang === 'zh' ? '仅供下车' : 'ส่งผู้โดยสารเท่านั้น'))
                    : shortDest(destName(rawDest));
            const destLabel = isOutOfService
                ? (lang === 'en' ? `Platform ${esc(p.platform)} · Terminus` : (lang === 'zh' ? `${esc(p.platform)} 号站台 · 终点站` : `ชานชาลา ${esc(p.platform)} · สิ้นสุดสาย`))
                : isTerminating
                    ? (lang === 'en' ? `Platform ${esc(p.platform)} · Terminus` : (lang === 'zh' ? `${esc(p.platform)} 号站台 · 终点站` : `ชานชาลา ${esc(p.platform)} · สิ้นสุดสาย`))
                    : T('platformTo', esc(p.platform));
            const isBrightLine = p.LineColor === '#FFD100' || p.LineColor === '#F5C242' || p.LineId === 4;
            const platTextColor = '#ffffff';
            const trainTextColor = isBrightLine ? '#ca8a04' : p.LineColor;
            const isEvenPlat = false;

            const trainBtn = (t, i) => {
                const eta = bestEta(stationKey, p.platform, t, fetchedAt);
                const rem = eta ? (eta.base - (Date.now() - eta.at) / 60000) : NaN;
                const isArriving = t.status === 'arriving' && (isNaN(rem) || (rem >= -0.75 && rem <= 0.5));
                const init = isArriving
                    ? { text: T('arrived'), now: true }
                    : eta ? etaText(rem, eta.approx) : etaText(NaN);
                // ขบวนนี้ปลายทางต่างจากปลายทางหลักของชานชาลา → ติดป้ายบอก
                const diffDest = t.station_key && p.DestinationStation_key
                    && t.station_key !== p.DestinationStation_key;
                const destTag = diffDest
                    ? `<span class="t-dest">→ ${esc(shortDest(destName(t.station)))}</span>` : '';
                const sizeClass = i === 0 ? 'first' : i === 1 ? 'second' : 'third';
                const baseVal = eta ? eta.base : (isArriving ? 0 : '');
                const atVal = eta ? eta.at : (isArriving ? fetchedAt : '');
                const hasEtaData = baseVal !== '' && atVal !== '';
                const firstTrainBorder = (i === 0 && !init.now) ? `border: 2px solid ${p.LineColor};` : '';
                return `<div class="train ${sizeClass} ${init.now ? 'is-arriving' : ''}" style="color:${trainTextColor};--line-color:${p.LineColor};${firstTrainBorder}">
                    <span class="no">${destTag}</span>
                    <span class="eta ${init.now ? 'now' : ''}"
                        ${hasEtaData ? `data-eta-base="${baseVal}" data-eta-at="${atVal}" data-eta-approx="${eta?.approx ? '1' : ''}"` : ''}
                        >${init.text}</span></div>`;
            };

            let rows;
            if (isOutOfService) {
                rows = `<div class="dropoff-note out-of-service-note" style="padding:4px 6px;text-align:center;background:rgba(255,255,255,0.02);border-radius:10px;border:1px dashed rgba(148,163,184,0.2);min-height:48px;width:100%;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;box-sizing:border-box;">
                    <div style="margin-bottom:2px;display:flex;align-items:center;justify-content:center;">${getUiIcon('ban', 15, 'var(--muted)')}</div>
                    <div style="font-weight:700;font-size:11px;line-height:1.2;color:var(--ink);text-align:center;letter-spacing:0;">${lang === 'en' ? 'Out of Service' : (lang === 'zh' ? '暂不营运' : 'ไม่ให้บริการ')}</div>
                </div>`;
            } else if (trains.length) {
                const restHtml = trains.slice(1).map((t, j) => trainBtn(t, j + 1)).join('');
                rows = trainBtn(trains[0], 0) + (restHtml ? `<div class="train-rest">${restHtml}</div>` : '');
            } else if (isTerminating) {
                rows = `<div class="dropoff-note" style="padding:4px 6px;text-align:center;background:rgba(255,255,255,0.02);border-radius:10px;border:1px dashed rgba(148,163,184,0.2);min-height:48px;width:100%;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;box-sizing:border-box;">
                    <div style="margin-bottom:2px;display:flex;align-items:center;justify-content:center;">${getUiIcon('flag', 15, 'var(--muted)')}</div>
                    <div style="font-weight:700;font-size:11px;line-height:1.2;color:var(--ink);text-align:center;letter-spacing:0;">${lang === 'en' ? 'Drop-off only' : (lang === 'zh' ? '仅供下车' : 'ส่งผู้โดยสารเท่านั้น')}</div>
                    <div style="font-size:9px;line-height:1.1;color:var(--muted);margin-top:1px;text-align:center;letter-spacing:0;">${lang === 'en' ? 'No boarding train' : (lang === 'zh' ? '非载客列车' : 'ขบวนไม่รับผู้โดยสาร')}</div>
                </div>`;
            } else {
                rows = `<div class="empty-note" style="padding:6px;width:100%;flex:1;min-height:48px;display:flex;align-items:center;justify-content:center;text-align:center;box-sizing:border-box;letter-spacing:0;">${T('noTrains')}</div>`;
            }

            return `
                <div class="plat ${isEvenPlat ? 'mirror' : ''}" style="--line-color:${p.LineColor};">
                    <div class="plat-head">
                        <span class="plat-no" style="background:${p.LineColor};color:#ffffff;text-shadow:0 1px 2px rgba(0,0,0,0.45);">${esc(p.platform)}</span>
                        <div class="plat-dest"><div class="l">${destLabel}</div>
                            <div class="v">${esc(dest)}</div></div>
                    </div>
                    <div class="trains">${rows}</div>
                </div>`;
        }

        // ป้าย "เชื่อมต่อสาย X" สำหรับสถานีเปลี่ยนสาย หรือสายแยก — กดเพื่อกระโดดไปสายนั้น
        // ctxLineId = สายที่กำลังแสดงอยู่ จะไม่โชว์ป้ายของสายตัวเอง (สยามดูจากสุขุมวิท → เห็น ⇄ สายสีลม) เว้นแต่เป็นสายแยก (isBranch)
        function connBadges(stationKey, ctxLineId) {
            return (App.connections[stationKey] || [])
                .filter(c => c.isBranch || c.lineId !== ctxLineId)
                .map(c => {
                    const line = App.lineById[c.lineId] || MRT_LINE_BY_ID[c.lineId];
                    const label = c.isBranch
                        ? (lang === 'en' ? (c.labelEn || 'Branch') : (lang === 'zh' ? (c.labelZh || '支线') : (c.labelTh || 'สายแยก')))
                        : T('connLine', esc(line ? shortLineName(line) : ''));
                    const titleText = c.isBranch
                        ? (lang === 'en' ? `Connect to ${c.labelEn || c.key}` : (lang === 'zh' ? `换乘至 ${c.labelZh || c.key}` : `เชื่อมต่อ ${c.labelTh || c.key}`))
                        : T('connTitle', esc(c.key));
                    return ` <span class="badge conn-b" style="color:${c.color};background:${c.color}14;border:1px solid ${c.color}32;border-radius:var(--radius-full);font-size:10px;font-weight:600;padding:2px 7px;display:inline-flex;align-items:center;justify-content:center;line-height:1;box-sizing:border-box;letter-spacing:0;gap:4px;vertical-align:middle;"
                    onclick="event.stopPropagation();App.jumpTo('${esc(c.key)}',${c.lineId})"
                    title="${titleText}">${getLineIconSvg(c.lineId, false, 12)} <span>${label}</span></span>`;
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

                const isBrtKey = pick.lineId === 201 || (st.StationCode && String(st.StationCode).startsWith('B') && !String(st.StationCode).startsWith('BL'));
                const stepClasses = [
                    'j-step',
                    isFirst ? 'first' : '',
                    isLast ? 'last' : '',
                    isEnd ? 'end' : '',
                    hasTransferBefore ? 'post-transfer' : '',
                    hasTransferAfter ? 'pre-transfer' : '',
                    isBrtKey ? 'step-brt' : ''
                ].filter(Boolean).join(' ');

                rows.push(`<div class="${stepClasses}" style="color:${pick.color}">
                    <span class="ndw"><span class="nd${isBrtKey ? ' node-brt' : ''}"></span></span>
                    <span class="nm" style="color:var(--ink)"><span class="st-key ${isBrtKey ? 'st-key-brt' : ''}" style="${isBrtKey ? '' : 'background:' + pick.color + ';'}font-size:9.5px;padding:1px 5px;min-width:28px;height:18px;margin-right:6px;border-radius:4px;display:inline-flex;align-items:center;justify-content:center;color:#fff;line-height:1;">${esc(st.StationCode)}</span>${esc(destName(st.Title))}</span>
                    <span class="tm">${esc(st.TimeRoute || '')}</span></div>`);
            });

            // FareRateInfo เป็น array ที่มีสมาชิกเดียว
            const fi = Array.isArray(rm.FareRateInfo) ? rm.FareRateInfo[0] : rm.FareRateInfo;
            const FARE_DETAIL_ZH = {
                'บุคคลทั่วไป': '普通成人单程票',
                'นักเรียน นักศึกษา': '学生优惠卡',
                'นักเรียน/นักศึกษา': '学生优惠卡',
                'ผู้สูงอายุ': '长者优待卡',
                'Single Journey Card': '单程票',
                'Rabbit Card': '兔子卡 (成人)',
                'Student Card': '学生卡',
                'Senior Card': '长者卡'
            };
            const fares = (fi?.FareRate_List || []).map(f => {
                const fName = lang === 'zh'
                    ? (FARE_DETAIL_ZH[f.FareDetail] || FARE_DETAIL_ZH[f.FareDetail_ENG] || f.FareDetail_ENG || f.FareDetail)
                    : (lang === 'en' ? (f.FareDetail_ENG || f.FareDetail) : f.FareDetail);
                return `<div class="j-fare-row"><span>${esc(fName)}</span>
                 <b>฿${esc(f.FarePrice)}</b></div>`;
            }).join('');

            const isSameStation = steps.length === 1 || (rm.TotalTime === 0 && (rm.Count_Station ?? steps.length) <= 1);
            const badgeLabel = rm.LabelTag || (isSameStation ? T('jSameStation') : (i === 0 ? T('jRecommended') : ''));
            const fareDisplay = rm.FareRate_Total != null ? rm.FareRate_Total : '-';
            const timeDisplay = rm.TotalTime != null ? rm.TotalTime : '?';
            const kmDisplay = rm.TotalKm != null ? rm.TotalKm : '?';
            return `<div class="j-route ${open ? 'open' : ''}">
                <button class="j-route-head" onclick="App.toggleRoute(${i})">
                    <span class="rname">${T('jRoute', i + 1)}</span>
                    ${badgeLabel ? `<span class="j-badge" style="${isSameStation ? 'background:rgba(2,132,199,0.15);color:#0284c7;border:1px solid rgba(2,132,199,0.3);' : ''}">${esc(badgeLabel)}</span>` : ''}
                    <span class="j-fare">฿${esc(fareDisplay)}</span>
                    <span class="j-sum">${getUiIcon('timer', 13, 'currentColor')} <b>${T('jMin', timeDisplay)}</b> · ${T('jStations', rm.Count_Station ?? steps.length)}
                        · ${kmDisplay} ${T('kmUnit').trim()}${rm.Count_InterChange ? ' · ' + (lang === 'zh' ? '换乘' : (lang === 'en' ? 'Transfer' : 'เปลี่ยนสาย')) + ' ×' + rm.Count_InterChange : ''}</span>
                </button>
                ${open ? `<div class="j-steps">
                    ${isSameStation ? `<div class="same-station-banner" style="margin-bottom:10px;padding:9px 12px;background:rgba(2,132,199,0.08);border-left:3px solid #0284c7;border-radius:6px;font-size:12px;line-height:1.45;color:var(--ink);">
                        <div style="font-weight:700;display:flex;align-items:center;gap:5px;margin-bottom:2px;">
                            <span>${getUiIcon('pin', 14, '#0284c7')}</span> <span>${esc(T('jAlreadyAtStation'))}</span>
                        </div>
                        <div style="color:var(--muted);font-size:11.5px;">
                            ${esc(lang === 'en'
                                ? `Origin and destination are the same station. Fare is charged at the 1-station rate (฿${fareDisplay}) for this line.`
                                : (lang === 'zh'
                                    ? `起点站与终点站为同一车站。本线路按 1 站票价 (฿${fareDisplay}) 计费。`
                                    : `สถานีต้นทางและปลายทางเป็นสถานีเดียวกัน คิดค่าโดยสารเท่ากับ 1 สถานีตามอัตราของสายนี้ (฿${fareDisplay})`))}
                        </div>
                    </div>` : ''}
                    ${rows.join('')}
                </div>
                ${fares ? `<div class="j-fares"><div class="ft">${T('jFareTypes')}</div>${fares}</div>` : ''}
                ${rm.StaticMapSrc ? `<div class="j-map-wrap"><a class="j-map-link" href="${esc(rm.StaticMapSrc)}" target="_blank" rel="noopener">${getUiIcon('map', 14, 'currentColor')} <span>${T('jMap')}</span></a></div>` : ''}` : ''}
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
            const { list, idx, prev, next, color } = block;
            const plats = (arr.platforms || []).filter(p => Number(p.LineId) === Number(block.lineId));
            if (!plats.length) return '';

            // ทิศทางของแต่ละชานชาลา:
            // 'prev' = วิ่งไปทางเลขสถานีมากขึ้น (→ รางบน)
            // 'next' = วิ่งไปทางเลขสถานีน้อยลง (← รางล่าง)
            const fromOf = (p) => {
                const dIdx = list.findIndex(s => s.StationKey === (p.DestinationStation_key || ''));
                if (dIdx >= 0 && dIdx !== idx) {
                    return dIdx > idx ? 'prev' : 'next';
                }
                const isDropOff = p.isDropOffOnly || (p.DestinationStation_key && p.DestinationStation_key === station.StationKey);
                if (isDropOff) {
                    if (!prev) return 'next';
                    if (!next) return 'prev';
                }
                const pNum = parseInt(p.platform, 10);
                if (pNum === 1 || pNum === 3) return 'prev';
                if (pNum === 2 || pNum === 4) return 'next';
                return prev ? 'prev' : 'next';
            };

            const formatPlatLabel = (p, dirStation) => {
                if (!p) {
                    const fallbackName = dirStation ? stName(dirStation) : '';
                    return fallbackName ? (lang === 'en' ? `Towards ${fallbackName}` : (lang === 'zh' ? `开往 ${fallbackName}` : `ไปทาง ${fallbackName}`)) : '';
                }
                const pNum = p.platform != null ? p.platform : '';
                const pText = pNum ? (lang === 'en' ? `Platform ${pNum}` : (lang === 'zh' ? `${pNum} 号站台` : `ชานชาลา ${pNum}`)) : '';
                const isOutOfService = !!p.isOutOfService || (station.StationKey === 'YL23' && String(p.platform) === '1');
                const isTerminating = !isOutOfService && (p.isDropOffOnly || (p.DestinationStation_key && p.DestinationStation_key === station.StationKey));
                let dest = isOutOfService
                    ? (lang === 'en' ? 'Out of Service' : (lang === 'zh' ? '暂不营运' : 'ไม่ให้บริการ'))
                    : isTerminating
                        ? (lang === 'en' ? 'Terminus · Drop-off only' : (lang === 'zh' ? '终点站 · 仅供下车' : 'สิ้นสุดสาย ส่งผู้โดยสารเท่านั้น'))
                        : (destName(p.DestinationStation) || (dirStation ? stName(dirStation) : ''));
                if (dest) {
                    const toPrefix = (isTerminating || isOutOfService) ? '' : (lang === 'en' ? 'To ' : (lang === 'zh' ? '开往 ' : 'ไปทาง '));
                    return pText ? `${pText} · ${toPrefix}${dest}` : `${toPrefix}${dest}`;
                }
                return pText;
            };

            const Z = { prev: [], next: [] };
            for (const p of plats) {
                const from = fromOf(p);
                for (const t of displayTrains(station.StationKey, p.platform, p.train_list, arr.fetchedAt, block.lineId)) {
                    if (t.status !== 'pending') {
                        Z[from].push({ t, m: 0, approx: false, eta: null });
                        continue;
                    }
                    // ใช้เวลาเลขล่าสุดที่รู้ (รวมค่าจำจากรอบก่อนเมื่อ API ตอบ --)
                    // ขบวนที่ไม่รู้เวลาเลย → ไม่วาดบน map (ตำแหน่งระบุไม่ได้)
                    const eta = bestEta(station.StationKey, p.platform, t, arr.fetchedAt);
                    if (!eta) continue;
                    const m = eta.base - (Date.now() - eta.at) / 60000;
                    if (m < -0.75 || m > 200) continue;
                    Z[from].push({ t, m, approx: eta.approx, eta });
                }
            }
            const asc = (a, b) => a.m - b.m;
            Z.prev.sort(asc);
            Z.next.sort(asc);

            const chip = (e, at) => {
                if (!e) return '';
                const isAt = at || e.m <= 0.5 || (e.t && e.t.status === 'arriving');
                const dispM = isAt ? 0 : Math.max(0, Math.round(e.m));
                const approx = e.approx ? '~' : '';
                const etaAttr = (!isAt && e.eta)
                    ? ` data-eta-base="${e.eta.base}" data-eta-at="${e.eta.at}" data-eta-approx="${e.approx ? '1' : ''}" data-eta-format="chip"`
                    : '';
                return `<span class="rt-chip ${isAt ? 'at' : ''}" style="border-color:${color};color:${color}"><i${etaAttr}>${isAt ? '0' : `${approx}${dispM}`}m</i></span>`;
            };
            const chips = (arr2, at) => (arr2 || []).map(e => chip(e, at)).join('');

            // แถวกลาง: ราง + จุดสถานี (เส้นครึ่งซ้าย/ขวาตามว่ามีเพื่อนบ้านฝั่งนั้นไหม)
            // pos: 'up' (ชื่อสถานีขึ้นบน) | 'down' (ชื่อสถานีลงล่าง) | 'both' (แสดงทั้งบนและล่างตามรถเข้าชานชาลา)
            const mid = (st, l, r, cur, pos = 'down') => {
                let lblHtml = '';
                if (st) {
                    const stLbl = `<b style="${cur ? 'color:' + color : ''}">${esc(st.StationKey)}</b><i>${esc(shortDest(stName(st)))}</i>`;
                    if (pos === 'both') {
                        lblHtml = `<span class="lbl lbl-top">${stLbl}</span><span class="lbl lbl-btm">${stLbl}</span>`;
                    } else {
                        lblHtml = `<span class="lbl">${stLbl}</span>`;
                    }
                }
                return `<div class="rt-mid ${st ? `lbl-${pos}` : ''}">
                    ${l ? `<span class="tl l" style="background:${color}"></span>` : ''}
                    ${r ? `<span class="tl r" style="background:${color}"></span>` : ''}
                    ${st ? `<span class="nd ${cur ? 'cur near' : ''}" style="${cur ? '' : 'border-color:' + color}"></span>${lblHtml}` : ''}
                </div>`;
            };

            let pTop = plats.find(p => fromOf(p) === 'prev');
            let pBtm = plats.find(p => fromOf(p) === 'next');
            if (plats.length > 1) {
                if (!pTop && pBtm) pTop = plats.find(p => p !== pBtm);
                if (!pBtm && pTop) pBtm = plats.find(p => p !== pTop);
                if (pTop === pBtm) {
                    pTop = plats[0];
                    pBtm = plats[1];
                }
            } else if (plats.length === 1) {
                if (fromOf(plats[0]) === 'prev') {
                    pTop = plats[0];
                    pBtm = null;
                } else {
                    pTop = null;
                    pBtm = plats[0];
                }
            }

            const topLabel = pTop ? formatPlatLabel(pTop, next || list[list.length - 1]) : '';
            const btmLabel = pBtm ? formatPlatLabel(pBtm, prev || list[0]) : '';

            const topPlatHdr = topLabel ? `
                <div class="rt-plat-hdr top" style="justify-self: end; width: fit-content;">
                    <span class="p-tag">
                        <span class="p-badge" style="background:${color};color:#ffffff;text-shadow:0 1px 2px rgba(0,0,0,0.45);">${pTop?.platform != null ? pTop.platform : ''}</span>
                        <span>${esc(topLabel)}</span>
                    </span>
                </div>` : '';

            const btmPlatHdr = btmLabel ? `
                <div class="rt-plat-hdr btm" style="justify-self: start; width: fit-content;">
                    <span class="p-tag">
                        <span class="p-badge" style="background:${color};color:#ffffff;text-shadow:0 1px 2px rgba(0,0,0,0.45);">${pBtm?.platform != null ? pBtm.platform : ''}</span>
                        <span>${esc(btmLabel)}</span>
                    </span>
                </div>` : '';

            const lineObj = App.lineById[block.lineId] || MRT_LINE_BY_ID[block.lineId];
            const lineName = lineObj ? shortLineName(lineObj) : '';

            // รางบน (วิ่ง →):
            const allP1 = Z.prev;
            const atP1 = allP1.find(x => x.m <= 0.5 || (x.t && x.t.status === 'arriving'));
            const incP1 = allP1.filter(x => x !== atP1);

            let topLanes;
            if (!prev) {
                // สถานีต้นทาง (เช่น YL01): ขบวนเริ่มออกจากสถานีนี้
                // คิวขบวนที่รอออกอยู่ในช่อง Col 1 เรียงลำดับใกล้ถึงเวลาที่สุดอยู่หน้าสุด (ขวา)
                const queueP1 = [...incP1].sort((a, b) => b.m - a.m);
                topLanes = `
                    <div class="rt-lane rail je">${chips(queueP1)}</div>
                    <div class="rt-lane rail"></div>
                    <div class="rt-lane rail"></div>
                    <div class="rt-lane rail jc">${atP1 ? chip(atP1, true) : ''}</div>
                    <div class="rt-lane rail arrow-lane"><span class="rt-arrow">→</span></div>
                    <div class="rt-lane rail"></div>
                    <div class="rt-lane rail"></div>`;
            } else if (!next) {
                // สถานีปลายทาง (เช่น YL23): ขบวนวิ่งมาจากฝั่ง prev เข้าสู่สถานีปลายทาง
                const nearP1 = incP1.find(x => x.m <= 2.5);
                const farP1 = incP1.filter(x => x !== nearP1);
                const queueP1 = [...farP1].sort((a, b) => b.m - a.m);
                topLanes = `
                    <div class="rt-lane rail je">${chips(queueP1)}</div>
                    <div class="rt-lane rail"></div>
                    <div class="rt-lane rail je">${nearP1 ? chip(nearP1) : (allP1.length ? '<span class="rt-arrow">→</span>' : '')}</div>
                    <div class="rt-lane rail jc">${atP1 ? chip(atP1, true) : ''}</div>
                    <div class="rt-lane rail"></div>
                    <div class="rt-lane rail"></div>
                    <div class="rt-lane rail"></div>`;
            } else {
                // สถานีระหว่างทาง:
                const nearP1 = incP1.find(x => x.m <= 2.5);
                const farP1 = incP1.filter(x => x !== nearP1);
                const queueP1 = [...farP1].sort((a, b) => b.m - a.m);
                topLanes = `
                    <div class="rt-lane rail je">${chips(queueP1)}</div>
                    <div class="rt-lane rail"></div>
                    <div class="rt-lane rail je">${nearP1 ? chip(nearP1) : ''}</div>
                    <div class="rt-lane rail jc">${atP1 ? chip(atP1, true) : ''}</div>
                    <div class="rt-lane rail arrow-lane">${allP1.length ? '<span class="rt-arrow">→</span>' : ''}</div>
                    <div class="rt-lane rail"></div>
                    <div class="rt-lane rail"></div>`;
            }

            // รางล่าง (วิ่ง ←):
            const allP2 = Z.next;
            const atP2 = allP2.find(x => x.m <= 0.5 || (x.t && x.t.status === 'arriving'));
            const incP2 = allP2.filter(x => x !== atP2);

            let btmLanes;
            if (!prev) {
                // สถานีต้นทาง (เช่น YL01): ขบวนวิ่งมาจากฝั่ง next สิ้นสุดที่สถานีนี้
                const nearP2 = incP2.find(x => x.m <= 2.5);
                const farP2 = incP2.filter(x => x !== nearP2);
                const queueP2 = [...farP2].sort((a, b) => a.m - b.m);
                btmLanes = `
                    <div class="rt-lane rail"></div>
                    <div class="rt-lane rail"></div>
                    <div class="rt-lane rail"></div>
                    <div class="rt-lane rail jc">${atP2 ? chip(atP2, true) : ''}</div>
                    <div class="rt-lane rail arrow-lane">${nearP2 ? chip(nearP2) : (allP2.length ? '<span class="rt-arrow">←</span>' : '')}</div>
                    <div class="rt-lane rail"></div>
                    <div class="rt-lane rail js">${chips(queueP2)}</div>`;
            } else if (!next) {
                // สถานีปลายทาง (เช่น YL23): ขบวนเริ่มออกจากสถานีปลายทางวิ่งกลับไปทาง prev
                const queueP2 = [...incP2].sort((a, b) => a.m - b.m);
                btmLanes = `
                    <div class="rt-lane rail"></div>
                    <div class="rt-lane rail"></div>
                    <div class="rt-lane rail arrow-lane"><span class="rt-arrow">←</span></div>
                    <div class="rt-lane rail jc">${atP2 ? chip(atP2, true) : ''}</div>
                    <div class="rt-lane rail"></div>
                    <div class="rt-lane rail"></div>
                    <div class="rt-lane rail js">${chips(queueP2)}</div>`;
            } else {
                // สถานีระหว่างทาง:
                const nearP2 = incP2.find(x => x.m <= 2.5);
                const farP2 = incP2.filter(x => x !== nearP2);
                const queueP2 = [...farP2].sort((a, b) => a.m - b.m);
                btmLanes = `
                    <div class="rt-lane rail"></div>
                    <div class="rt-lane rail"></div>
                    <div class="rt-lane rail arrow-lane">${allP2.length ? '<span class="rt-arrow">←</span>' : ''}</div>
                    <div class="rt-lane rail jc">${atP2 ? chip(atP2, true) : ''}</div>
                    <div class="rt-lane rail">${nearP2 ? chip(nearP2) : ''}</div>
                    <div class="rt-lane rail"></div>
                    <div class="rt-lane rail js">${chips(queueP2)}</div>`;
            }

            // ตรวจสอบสถานะรถเข้าชานชาลา:
            // สลับขึ้นบน (ชานชาลา 1 รางบน) หรือลงล่าง (ชานชาลา 2 รางล่าง) ตามรถเข้าชานชาลานั้นๆ
            // ถ้าหากรถเข้าชานชาลาพร้อมกันให้แสดงทั้งบน และ ล่าง (both)
            const isEntering1 = !!atP1 || (allP1.length > 0 && (allP1[0].m <= 1.0 || allP1[0].t?.status === 'arriving'));
            const isEntering2 = !!atP2 || (allP2.length > 0 && (allP2[0].m <= 1.0 || allP2[0].t?.status === 'arriving'));

            const etaP1 = allP1[0]?.m ?? 999;
            const etaP2 = allP2[0]?.m ?? 999;

            let curPos = 'down';
            if (isEntering1 && isEntering2) {
                curPos = 'both';
            } else if (isEntering1) {
                curPos = 'up';
            } else if (isEntering2) {
                curPos = 'down';
            } else {
                // หากยังไม่มีขบวนใดกำลังเข้าสถานี ให้สลับตามชานชาลาที่รถกำลังจะมาถึงก่อน
                if (Math.abs(etaP1 - etaP2) < 0.25 && etaP1 < 900) {
                    curPos = 'both';
                } else if (etaP1 <= etaP2) {
                    curPos = 'up';
                } else {
                    curPos = 'down';
                }
            }

            // สถานีข้างเคียง (prev, next) สลับตำแหน่งเพื่อความสมดุล
            const prevPos = curPos === 'up' ? 'down' : 'up';
            const nextPos = curPos === 'up' ? 'down' : 'up';

            return `<div class="route-box">
                <div class="route-title" style="display:flex;align-items:center;gap:6px;">
                    ${getLineIconSvg(block.lineId, false, 16)}
                    <span class="bar" style="background:${color}"></span>
                    ${T('routeTitle')}${lineName ? T('routeLine', esc(lineName)) : ''}</div>
                <div class="rt-grid" style="--rt-color:${color}">
                    ${topPlatHdr}
                    <!-- บน: ขบวนที่มาจากฝั่ง prev (วิ่ง → ไปทางเลขสถานีมากขึ้น) -->
                    ${topLanes}
                    <!-- กลาง: ราง + สถานี (ระยะห่างเท่ากัน & สลับขึ้น-ลง ตามขบวนเวลารถเข้า) -->
                    ${mid(null, false, !!prev)}
                    ${mid(prev, !!prev, !!prev, false, prevPos)}
                    ${mid(null, !!prev, !!prev)}
                    ${mid(station, !!prev, !!next, true, curPos)}
                    ${mid(null, !!next, !!next)}
                    ${mid(next, !!next, !!next, false, nextPos)}
                    ${mid(null, !!next, false)}
                    <!-- ล่าง: ขบวนที่มาจากฝั่ง next (วิ่ง ← ไปทางเลขสถานีน้อยลง) -->
                    ${btmLanes}
                    ${btmPlatHdr}
                </div>
            </div>`;
        }

        /* ================= START ================= */
        window.App = App;
        window.__test = { bestEta, etaText, shortDest, mrtBlueFare, mrtOrangeFare, buildHybridJourney, displayTrains, generateTimetableArrivals, renderPlatformSection, renderRouteSection, visiblePlatformsForStation, ensureTwoPlatformsForTerminal, TRANSIT_LINES_CATALOG, getLineScheduleTables, buildSameStationJourney };   // hook สำหรับ test-app.mjs
        App.init();
    