package com.bkkskytrains.app

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.os.Build
import android.view.View
import android.widget.RemoteViews
import androidx.core.app.NotificationCompat
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private val CHANNEL_ID = "bkk_live_station_channel"
    private val NOTIFICATION_ID = 1002
    private val METHOD_CHANNEL = "com.bkkskytrains.app/persistent_notification"

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        createNotificationChannel()
        requestNotificationPermissionIfNeeded()

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, METHOD_CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "showPersistentLockScreenNotification" -> {
                    val stationKey = call.argument<String>("stationKey") ?: ""
                    val stationName = call.argument<String>("stationName") ?: ""
                    val stationNameEN = call.argument<String>("stationNameEN") ?: ""
                    val distanceText = call.argument<String>("distanceText") ?: ""
                    val plat1Text = call.argument<String>("plat1Text") ?: ""
                    val plat1Time = call.argument<String>("plat1Time") ?: ""
                    val plat1Num = call.argument<String>("plat1Num") ?: "1"
                    val plat1DestName = call.argument<String>("plat1DestName") ?: plat1Text
                    val plat1Time2 = call.argument<String>("plat1Time2") ?: "-- นาที"
                    val plat1Time3 = call.argument<String>("plat1Time3") ?: "-- นาที"
                    val plat2Text = call.argument<String>("plat2Text") ?: ""
                    val plat2Time = call.argument<String>("plat2Time") ?: ""
                    val plat2Num = call.argument<String>("plat2Num") ?: "2"
                    val plat2DestName = call.argument<String>("plat2DestName") ?: plat2Text
                    val plat2Time2 = call.argument<String>("plat2Time2") ?: "-- นาที"
                    val plat2Time3 = call.argument<String>("plat2Time3") ?: "-- นาที"
                    val lineColor = call.argument<String>("lineColor") ?: "#7AB420"
                    val statusLabel = call.argument<String>("statusLabel") ?: "กำลังเข้า / นับถอยหลังสด"

                    showLockScreenNotification(
                        stationKey, stationName, stationNameEN, distanceText,
                        plat1Text, plat1Num, plat1DestName, plat1Time, plat1Time2, plat1Time3,
                        plat2Text, plat2Num, plat2DestName, plat2Time, plat2Time2, plat2Time3,
                        lineColor, statusLabel
                    )
                    result.success(true)
                }
                "cancelPersistentNotification" -> {
                    cancelLockScreenNotification()
                    result.success(true)
                }
                else -> result.notImplemented()
            }
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val name = "สถานีใกล้ฉันและเวลาขบวนรถสด (Lock Screen)"
            val descriptionText = "แสดงสถานีและเวลาเดินรถแบบเรียลไทม์บนหน้าจอล็อก"
            val importance = NotificationManager.IMPORTANCE_HIGH
            val channel = NotificationChannel(CHANNEL_ID, name, importance).apply {
                description = descriptionText
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                enableVibration(false)
                setShowBadge(true)
            }
            val notificationManager: NotificationManager =
                getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }

    private fun requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1001)
            }
        }
    }

    private fun parseLineColor(colorHex: String): Int {
        return try {
            Color.parseColor(colorHex.ifBlank { "#7AB420" })
        } catch (_: Exception) {
            Color.parseColor("#7AB420")
        }
    }

    private fun contrastTextColor(bgColor: Int): Int {
        val lum = 0.299 * Color.red(bgColor) + 0.587 * Color.green(bgColor) + 0.114 * Color.blue(bgColor)
        return if (lum > 178.0) Color.parseColor("#0F172A") else Color.WHITE
    }

    private fun tintBadge(views: RemoteViews, bgId: Int, textId: Int, text: String, bgColor: Int, fgColor: Int) {
        views.setTextViewText(textId, text)
        views.setTextColor(textId, fgColor)
        views.setInt(bgId, "setColorFilter", bgColor)
    }

    private fun isArrivingText(txt: String): Boolean {
        return txt.contains("กำลังเข้า") || txt.equals("Arriving", ignoreCase = true) || txt.contains("即将进站")
    }

    private fun applyPlatformSlot(
        views: RemoteViews,
        bgId: Int,
        numId: Int,
        labelId: Int,
        destId: Int,
        t1Id: Int,
        t2Id: Int,
        t3Id: Int,
        numText: String,
        destText: String,
        t1Text: String,
        t2Text: String,
        t3Text: String,
        badgeColor: Int,
        badgeFgColor: Int
    ) {
        val cleanNum = numText.ifBlank { "1" }
        tintBadge(views, bgId, numId, cleanNum, badgeColor, badgeFgColor)
        views.setTextViewText(labelId, "ชานชาลา $cleanNum · ไปทาง")
        views.setTextViewText(destId, destText.ifBlank { "ชานชาลา $cleanNum" })

        val mainTxt = t1Text.ifBlank { "--" }
        views.setTextViewText(t1Id, mainTxt)
        if (isArrivingText(mainTxt)) {
            views.setInt(t1Id, "setBackgroundResource", R.drawable.notif_time_main_arriving_bg)
            views.setTextColor(t1Id, Color.parseColor("#34D399"))
        } else if (mainTxt == "--" || mainTxt == "-- นาที") {
            views.setInt(t1Id, "setBackgroundResource", R.drawable.notif_time_sub_bg)
            views.setTextColor(t1Id, Color.parseColor("#94A3B8"))
        } else {
            views.setInt(t1Id, "setBackgroundResource", R.drawable.notif_time_main_bg)
            views.setTextColor(t1Id, Color.parseColor("#A3E635"))
        }

        views.setTextViewText(t2Id, t2Text.ifBlank { "-- นาที" })
        views.setTextViewText(t3Id, t3Text.ifBlank { "-- นาที" })
    }

    private fun showLockScreenNotification(
        stationKey: String,
        stationName: String,
        stationNameEN: String,
        distanceText: String,
        plat1Text: String,
        plat1Num: String,
        plat1DestName: String,
        plat1Time: String,
        plat1Time2: String,
        plat1Time3: String,
        plat2Text: String,
        plat2Num: String,
        plat2DestName: String,
        plat2Time: String,
        plat2Time2: String,
        plat2Time3: String,
        lineColor: String = "#7AB420",
        statusLabel: String = "กำลังเข้า / นับถอยหลังสด"
    ) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                requestNotificationPermissionIfNeeded()
                return
            }
        }

        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val badgeBg = parseLineColor(lineColor)
        val badgeFg = contrastTextColor(badgeBg)
        val distClean = distanceText.ifBlank { "ใกล้คุณ" }
        val cleanP1Time = plat1Time.ifBlank { "--" }
        val cleanP2Time = plat2Time.ifBlank { "--" }

        // Expanded View (แบบที่ 1: เหมือนการ์ด ตรวจพบสถานีใกล้ตัวคุณ ไม่มีตำแหน่งขบวนรถ)
        val expandedViews = RemoteViews(packageName, R.layout.notification_station_expanded).apply {
            tintBadge(this, R.id.notif_station_key_bg, R.id.notif_station_key, stationKey, badgeBg, badgeFg)
            setTextViewText(R.id.notif_station_name_th, stationName)
            if (stationNameEN.isNotBlank()) {
                setViewVisibility(R.id.notif_station_name_en, View.VISIBLE)
                setTextViewText(R.id.notif_station_name_en, stationNameEN)
            } else {
                setViewVisibility(R.id.notif_station_name_en, View.GONE)
            }
            setTextViewText(R.id.notif_distance, distClean)
            setTextViewText(R.id.notif_status_right, statusLabel.ifBlank { "กำลังเข้า / นับถอยหลังสด" })

            applyPlatformSlot(
                this,
                R.id.notif_plat1_num_bg, R.id.notif_plat1_num,
                R.id.notif_plat1_label, R.id.notif_plat1_dest,
                R.id.notif_plat1_time1, R.id.notif_plat1_time2, R.id.notif_plat1_time3,
                plat1Num, plat1DestName.ifBlank { plat1Text }, cleanP1Time, plat1Time2, plat1Time3,
                badgeBg, badgeFg
            )
            applyPlatformSlot(
                this,
                R.id.notif_plat2_num_bg, R.id.notif_plat2_num,
                R.id.notif_plat2_label, R.id.notif_plat2_dest,
                R.id.notif_plat2_time1, R.id.notif_plat2_time2, R.id.notif_plat2_time3,
                plat2Num, plat2DestName.ifBlank { plat2Text }, cleanP2Time, plat2Time2, plat2Time3,
                badgeBg, badgeFg
            )
        }

        // Collapsed View
        val collapsedViews = RemoteViews(packageName, R.layout.notification_station_collapsed).apply {
            tintBadge(this, R.id.notif_collapsed_key_bg, R.id.notif_collapsed_key, stationKey, badgeBg, badgeFg)
            setTextViewText(R.id.notif_collapsed_title, "$stationName · $distClean")
            setTextViewText(R.id.notif_collapsed_sub, "$plat1Text: $cleanP1Time  |  $plat2Text: $cleanP2Time")
        }

        val fallbackTitle = "ตรวจพบสถานีใกล้ตัวคุณ: $stationKey $stationName ($distClean)"
        val fallbackSummary = "$plat1Text: $cleanP1Time | $plat2Text: $cleanP2Time"

        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notif_app_icon)
            .setContentTitle(fallbackTitle)
            .setContentText(fallbackSummary)
            .setStyle(NotificationCompat.DecoratedCustomViewStyle())
            .setCustomContentView(collapsedViews)
            .setCustomBigContentView(expandedViews)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setContentIntent(pendingIntent)
            .setAutoCancel(false)
            .setOnlyAlertOnce(true)
            .setColor(badgeBg)

        notificationManager.notify(NOTIFICATION_ID, builder.build())
    }

    private fun cancelLockScreenNotification() {
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.cancel(NOTIFICATION_ID)
    }
}
