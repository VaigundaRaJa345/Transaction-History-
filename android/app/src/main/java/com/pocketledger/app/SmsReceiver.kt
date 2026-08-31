package com.pocketledger.app

import android.content.BroadcastReceiver
import android.content.ContentResolver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import org.json.JSONArray
import org.json.JSONObject

class SmsReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        try {
            Telephony.Sms.Intents.getMessagesFromIntent(intent)?.forEach { sms ->
                val body = sms.displayMessageBody ?: ""
                val sender = sms.displayOriginatingAddress ?: ""
                if (SmsRepository.isBankingMessage(body)) {
                    context.sendBroadcast(
                        Intent(NEW_SMS_ACTION)
                            .setPackage(context.packageName)
                            .putExtra("body", body)
                            .putExtra("sender", sender)
                    )
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    companion object { 
        const val NEW_SMS_ACTION = "com.pocketledger.app.NEW_SMS" 
    }
}

object SmsRepository {
    fun isBankingMessage(body: String): Boolean {
        val s = body.uppercase()
        val hasTxKeyword = "DEBIT" in s || "CREDIT" in s || "SPENT" in s || "WITHDRAW" in s || "PAID" in s || "SENT" in s || "TRANSFER" in s
        val hasCurrency = "RS" in s || "INR" in s || "₹" in s
        return hasTxKeyword && hasCurrency
    }

    fun messageJson(sender: String?, body: String, time: Long): String {
        return JSONObject()
            .put("sender", sender ?: "")
            .put("body", body)
            .put("time", time)
            .toString()
    }

    fun readBankingSms(resolver: ContentResolver): String {
        val items = JSONArray()
        val projection = arrayOf("address", "body", "date")
        try {
            resolver.query(Telephony.Sms.CONTENT_URI, projection, null, null, "date ASC")?.use { c ->
                val a = c.getColumnIndexOrThrow("address")
                val b = c.getColumnIndexOrThrow("body")
                val d = c.getColumnIndexOrThrow("date")
                while (c.moveToNext()) {
                    val body = c.getString(b) ?: ""
                    if (isBankingMessage(body)) {
                        items.put(
                            JSONObject()
                                .put("sender", c.getString(a) ?: "")
                                .put("body", body)
                                .put("time", c.getLong(d))
                        )
                    }
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return items.toString()
    }
}
