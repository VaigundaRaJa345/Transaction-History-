package com.pocketledger.app;

import android.Manifest;
import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.ContentResolver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import org.json.JSONArray;
import org.json.JSONObject;

public class MainActivity extends Activity {
    private WebView web;
    private boolean pageReady = false;
    private static final int SMS_PERMISSION_REQUEST = 7;
    public static final String NEW_SMS_ACTION = "com.pocketledger.app.NEW_SMS";

    private final BroadcastReceiver incomingSms = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            try {
                String body = intent.getStringExtra("body");
                String sender = intent.getStringExtra("sender");
                if (body != null && pageReady) {
                    JSONObject obj = new JSONObject();
                    obj.put("sender", sender != null ? sender : "");
                    obj.put("body", body);
                    obj.put("time", System.currentTimeMillis());
                    sendToPage("smsTransaction", obj.toString());
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        try {
            web = new WebView(this);
            WebSettings settings = web.getSettings();
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setAllowFileAccess(true);
            settings.setAllowContentAccess(true);
            settings.setDatabaseEnabled(true);
            
            web.setWebViewClient(new WebViewClient() {
                @Override
                public void onPageFinished(WebView view, String url) {
                    pageReady = true;
                }
            });
            web.setWebChromeClient(new WebChromeClient());
            web.addJavascriptInterface(new Bridge(), "AndroidLedger");
            web.loadUrl("file:///android_asset/index.html");
            setContentView(web);
        } catch (Exception e) {
            e.printStackTrace();
        }

        try {
            IntentFilter filter = new IntentFilter(NEW_SMS_ACTION);
            if (Build.VERSION.SDK_INT >= 33) {
                registerReceiver(incomingSms, filter, Context.RECEIVER_NOT_EXPORTED);
            } else {
                registerReceiver(incomingSms, filter);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    public void onBackPressed() {
        if (web != null && web.canGoBack()) {
            web.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        try {
            unregisterReceiver(incomingSms);
        } catch (Exception ignored) {}
        try {
            if (web != null) web.destroy();
        } catch (Exception ignored) {}
        super.onDestroy();
    }

    private void importHistory() {
        if (checkSelfPermission(Manifest.permission.READ_SMS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.READ_SMS, Manifest.permission.RECEIVE_SMS}, SMS_PERMISSION_REQUEST);
            return;
        }
        String history = readBankingSms(getContentResolver());
        if (pageReady && web != null) {
            web.evaluateJavascript("window.importSMSHistory(" + history + ");", null);
        }
    }

    private void sendToPage(String event, String json) {
        if (web != null) {
            web.evaluateJavascript("window.dispatchEvent(new CustomEvent('" + event + "', {detail:" + json + "}));", null);
        }
    }

    public class Bridge {
        @JavascriptInterface
        public void scanHistory() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    importHistory();
                }
            });
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == SMS_PERMISSION_REQUEST && grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            importHistory();
        }
    }

    public static boolean isBankingMessage(String body) {
        if (body == null) return false;
        String s = body.toUpperCase();
        boolean hasTx = s.contains("DEBIT") || s.contains("CREDIT") || s.contains("SPENT") || s.contains("WITHDRAW") || s.contains("PAID") || s.contains("SENT") || s.contains("TRANSFER");
        boolean hasCurrency = s.contains("RS") || s.contains("INR") || s.contains("₹");
        return hasTx && hasCurrency;
    }

    public static String readBankingSms(ContentResolver resolver) {
        JSONArray items = new JSONArray();
        String[] projection = new String[]{"address", "body", "date"};
        try {
            Cursor c = resolver.query(Uri.parse("content://sms/inbox"), projection, null, null, "date ASC");
            if (c != null) {
                int a = c.getColumnIndexOrThrow("address");
                int b = c.getColumnIndexOrThrow("body");
                int d = c.getColumnIndexOrThrow("date");
                while (c.moveToNext()) {
                    String body = c.getString(b);
                    if (body != null && isBankingMessage(body)) {
                        JSONObject obj = new JSONObject();
                        obj.put("sender", c.getString(a) != null ? c.getString(a) : "");
                        obj.put("body", body);
                        obj.put("time", c.getLong(d));
                        items.put(obj);
                    }
                }
                c.close();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return items.toString();
    }
}