plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

fun getGitSha(): String {
    return try {
        ProcessBuilder("git", "rev-parse", "--short", "HEAD")
            .start()
            .inputStream
            .bufferedReader()
            .readText()
            .trim()
            .ifEmpty { "d15eb9f" }
    } catch (_: Exception) {
        "d15eb9f"
    }
}

fun getGitCount(): Int {
    return try {
        ProcessBuilder("git", "rev-list", "--count", "HEAD")
            .start()
            .inputStream
            .bufferedReader()
            .readText()
            .trim()
            .toIntOrNull() ?: 41
    } catch (_: Exception) {
        41
    }
}

val gitShaProp = (project.findProperty("gitCommitSha") as? String) ?: getGitSha()
val gitCountProp = (project.findProperty("versionCode") as? String)?.toIntOrNull() ?: getGitCount()

android {
    namespace = "com.resonate.app"
    compileSdk = 35

    buildFeatures {
        buildConfig = true
    }

    defaultConfig {
        applicationId = "com.resonate.app"
        minSdk = 26
        targetSdk = 35
        versionCode = gitCountProp
        versionName = "1.0.1"

        buildConfigField("String", "GIT_COMMIT_SHA", "\"$gitShaProp\"")
        buildConfigField("long", "BUILD_TIME_MILLIS", "${System.currentTimeMillis()}L")

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    signingConfigs {
        create("sharedKey") {
            storeFile = file("../debug.keystore")
            storePassword = "androiddebugkey"
            keyAlias = "androiddebugkey"
            keyPassword = "androiddebugkey"
        }
    }

    buildTypes {
        release {
            signingConfig = signingConfigs.getByName("sharedKey")
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
        debug {
            signingConfig = signingConfigs.getByName("sharedKey")
            isMinifyEnabled = false
            applicationIdSuffix = ""
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

dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.webkit:webkit:1.12.1")
    implementation("androidx.activity:activity-ktx:1.9.3")

    val media3Version = "1.5.1"
    implementation("androidx.media3:media3-exoplayer:$media3Version")
    implementation("androidx.media3:media3-session:$media3Version")
    implementation("androidx.media3:media3-datasource:$media3Version")
    implementation("androidx.media3:media3-common:$media3Version")
}

