package com.pocketledger.app

import android.Manifest
import android.content.*
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.core.installSplashScreen

class MainActivity : AppCompatActivity() {
    private lateinit var web: WebView
    private var pageReady = false
    private val incomingSms = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            val body = intent.getStringExtra("body") ?: return
            val sender = intent.getStringExtra("sender") ?: ""
            if (pageReady) sendToPage("smsTransaction", SmsRepository.messageJson(sender, body, System.currentTimeMillis()))
        }
    }
    override fun onCreate(state: Bundle?) { 
        installSplashScreen()
        enableEdgeToEdge()
        super.onCreate(state)
        web = WebView(this).apply {
            settings.javaScriptEnabled = true; settings.domStorageEnabled = true
            webViewClient = object : WebViewClient() { override fun onPageFinished(v: WebView?, url: String?) { pageReady = true } }
            webChromeClient = WebChromeClient(); addJavascriptInterface(Bridge(), "AndroidLedger")
            loadUrl("file:///android_asset/index.html")
        }
        setContentView(web)

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (web.canGoBack()) web.goBack() else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })

        if (Build.VERSION.SDK_INT >= 33) registerReceiver(incomingSms, IntentFilter(SmsReceiver.NEW_SMS_ACTION), Context.RECEIVER_NOT_EXPORTED)
        else registerReceiver(incomingSms, IntentFilter(SmsReceiver.NEW_SMS_ACTION))
    }
    override fun onDestroy() { unregisterReceiver(incomingSms); web.destroy(); super.onDestroy() }
    private fun importHistory() {
        if (checkSelfPermission(Manifest.permission.READ_SMS) != PackageManager.PERMISSION_GRANTED) { requestPermissions(arrayOf(Manifest.permission.READ_SMS, Manifest.permission.RECEIVE_SMS), SMS_PERMISSION_REQUEST); return }
        val history = SmsRepository.readBankingSms(contentResolver)
        if (pageReady) web.evaluateJavascript("window.importSMSHistory(${history});", null)
    }
    private fun sendToPage(event: String, json: String) { web.evaluateJavascript("window.dispatchEvent(new CustomEvent('$event', {detail:$json}));", null) }
    inner class Bridge { @JavascriptInterface fun scanHistory() { runOnUiThread { importHistory() } } }
    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, results: IntArray) { super.onRequestPermissionsResult(requestCode, permissions, results); if (requestCode == SMS_PERMISSION_REQUEST && results.isNotEmpty() && results[0] == PackageManager.PERMISSION_GRANTED) importHistory() }
    companion object { const val SMS_PERMISSION_REQUEST = 7 }
}
