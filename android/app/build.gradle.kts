plugins { id("com.android.application"); id("org.jetbrains.kotlin.android") }

android { namespace = "com.pocketledger.app"; compileSdk = 35
    defaultConfig { applicationId = "com.pocketledger.app"; minSdk = 26; targetSdk = 34; versionCode = 1; versionName = "1.0" }
    
    buildTypes {
        release {
            isMinifyEnabled = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

tasks.register<Copy>("copyWebAssets") {
    from("../../") {
        include("index.html", "styles.css", "app.js", "cloud-sync.js", "cloud-config.js", "manifest.webmanifest")
    }
    into("src/main/assets")
}

tasks.named("preBuild") {
    dependsOn("copyWebAssets")
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.activity:activity-ktx:1.9.1")
    implementation("androidx.core:core-splashscreen:1.0.1")
}
