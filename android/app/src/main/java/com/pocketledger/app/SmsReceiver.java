package com.pocketledger.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.provider.Telephony;
import android.telephony.SmsMessage;

public class SmsReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        try {
            SmsMessage[] messages = Telephony.Sms.Intents.getMessagesFromIntent(intent);
            if (messages != null) {
                for (SmsMessage sms : messages) {
                    String body = sms.getDisplayMessageBody();
                    String sender = sms.getDisplayOriginatingAddress();
                    if (body != null && MainActivity.isBankingMessage(body)) {
                        Intent broadcast = new Intent(MainActivity.NEW_SMS_ACTION);
                        broadcast.setPackage(context.getPackageName());
                        broadcast.putExtra("body", body);
                        broadcast.putExtra("sender", sender != null ? sender : "");
                        context.sendBroadcast(broadcast);
                    }
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}