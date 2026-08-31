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
        Telephony.Sms.Intents.getMessagesFromIntent(intent).forEach { sms ->
            if (SmsRepository.isBankingMessage(sms.displayMessageBody)) context.sendBroadcast(Intent(NEW_SMS_ACTION).setPackage(context.packageName).putExtra("body", sms.displayMessageBody).putExtra("sender", sms.displayOriginatingAddress))
        }
    }
    companion object { const val NEW_SMS_ACTION = "com.pocketledger.app.NEW_SMS" }
}

object SmsRepository {
    fun isBankingMessage(body: String): Boolean { val s=body.uppercase(); return ("DEBIT" in s || "CREDIT" in s || "SPENT" in s || "WITHDRAWN" in s || "PAID" in s) && ("RS" in s || "INR" in s || "₹" in s) }
    fun messageJson(sender: String?, body: String, time: Long) = JSONObject().put("sender", sender ?: "").put("body", body).put("time", time).toString()
    fun readBankingSms(resolver: ContentResolver): String {
        val items=JSONArray(); val projection=arrayOf("address","body","date")
        resolver.query(Telephony.Sms.CONTENT_URI, projection, null, null, "date ASC")?.use { c ->
            val a=c.getColumnIndexOrThrow("address"); val b=c.getColumnIndexOrThrow("body"); val d=c.getColumnIndexOrThrow("date")
            while(c.moveToNext()) { val body=c.getString(b) ?: ""; if(isBankingMessage(body)) items.put(JSONObject().put("sender",c.getString(a) ?: "").put("body",body).put("time",c.getLong(d))) }
        }; return items.toString()
    }
}
