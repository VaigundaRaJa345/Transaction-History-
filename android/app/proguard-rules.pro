# Pocket Ledger ProGuard Rules

# Keep WebView Javascript Interface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep SmsRepository for JS interaction
-keep class com.pocketledger.app.SmsRepository { *; }

# General Android optimization rules
-keepattributes SourceFile,LineNumberTable
-keepattributes *Annotation*
-keepattributes EnclosingMethod
-keepattributes InnerClasses
-keepattributes Signature
