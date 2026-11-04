package com.bkkskytrains.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.graphics.Color
import android.os.Build
import android.widget.RemoteViews
import es.antonborri.home_widget.HomeWidgetProvider

class StationWidgetProvider : HomeWidgetProvider() {
    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray,
        widgetData: SharedPreferences
    ) {
        appWidgetIds.forEach { widgetId ->
            val views = RemoteViews(context.packageName, R.layout.station_widget).apply {
                val stationKey = widgetData.getString("station_key", "YL20") ?: "YL20"
                val stationName = widgetData.getString("station_name", "ศรีด่าน") ?: "ศรีด่าน"
                val distance = widgetData.getString("distance", "501 ม.") ?: "501 ม."
                val plat1Dest = widgetData.getString("plat1_dest", "1 ไปสำโรง") ?: "1 ไปสำโรง"
                val plat1Time = widgetData.getString("plat1_time", "กำลังเข้า") ?: "กำลังเข้า"
                val plat2Dest = widgetData.getString("plat2_dest", "2 ไปลาดพร้าว") ?: "2 ไปลาดพร้าว"
                val plat2Time = widgetData.getString("plat2_time", "2 นาที") ?: "2 นาที"
                val lineColor = widgetData.getString("line_color", "#FFD100") ?: "#FFD100"

                setTextViewText(R.id.widget_station_key, stationKey)
                setTextViewText(R.id.widget_station_name, stationName)
                setTextViewText(R.id.widget_distance, distance)
                setTextViewText(R.id.widget_plat1_dest, plat1Dest)
                setTextViewText(R.id.widget_plat1_time, plat1Time)
                setTextViewText(R.id.widget_plat2_dest, plat2Dest)
                setTextViewText(R.id.widget_plat2_time, plat2Time)

                // Dynamic Line Color Tint for Station Code badge
                try {
                    val colorInt = Color.parseColor(lineColor)
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                        setColorStateList(
                            R.id.widget_station_key,
                            "setBackgroundTintList",
                            android.content.res.ColorStateList.valueOf(colorInt)
                        )
                    } else {
                        setInt(R.id.widget_station_key, "setBackgroundColor", colorInt)
                    }
                } catch (_: Exception) {}

                // Open App on tap
                val intent = Intent(context, MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                }
                val pendingIntent = PendingIntent.getActivity(
                    context,
                    0,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                setOnClickPendingIntent(R.id.widget_root, pendingIntent)
            }
            appWidgetManager.updateAppWidget(widgetId, views)
        }
    }
}
