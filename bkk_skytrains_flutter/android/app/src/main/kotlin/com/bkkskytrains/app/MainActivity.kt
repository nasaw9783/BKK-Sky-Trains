package com.bkkskytrains.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
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

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, METHOD_CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "showPersistentLockScreenNotification" -> {
                    val stationKey = call.argument<String>("stationKey") ?: ""
                    val stationName = call.argument<String>("stationName") ?: ""
                    val distanceText = call.argument<String>("distanceText") ?: ""
                    val plat1Text = call.argument<String>("plat1Text") ?: ""
                    val plat1Time = call.argument<String>("plat1Time") ?: ""
                    val plat2Text = call.argument<String>("plat2Text") ?: ""
                    val plat2Time = call.argument<String>("plat2Time") ?: ""

                    showLockScreenNotification(
                        stationKey, stationName, distanceText,
                        plat1Text, plat1Time, plat2Text, plat2Time
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

    private fun showLockScreenNotification(
        stationKey: String,
        stationName: String,
        distanceText: String,
        plat1Text: String,
        plat1Time: String,
        plat2Text: String,
        plat2Time: String
    ) {
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

        val title = "📍 ตรวจพบสถานีใกล้ตัวคุณ: $stationKey $stationName ($distanceText)"
        val summaryLine = "$plat1Text ($plat1Time) | $plat2Text ($plat2Time)"
        val bigText = "📍 $stationKey $stationName (ห่าง $distanceText)\n• $plat1Text: $plat1Time\n• $plat2Text: $plat2Time\nอัปเดตเวลานับถอยหลังสด BKK SkyTrains"

        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(summaryLine)
            .setStyle(NotificationCompat.BigTextStyle().bigText(bigText))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setContentIntent(pendingIntent)
            .setAutoCancel(false)
            .setOnlyAlertOnce(true)

        notificationManager.notify(NOTIFICATION_ID, builder.build())
    }

    private fun cancelLockScreenNotification() {
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.cancel(NOTIFICATION_ID)
    }
}
