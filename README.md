<div align="center">
  <img src="public/favicon.svg" alt="Resonate Logo" width="120" height="120" />
  <h1>Resonate — High-Fidelity Music Streaming & Audio Workstation</h1>
  <p><strong>Ad-free music streaming, synchronized multi-platform libraries, floating picture-in-picture player, Listen Together audio rooms, and real-time music recognizer for Android and Web.</strong></p>

  <p>
    <a href="https://github.com/ayushmanchakraborty254-create/Resonate/releases/latest"><img src="https://img.shields.io/badge/Download-APK-orange?style=for-the-badge&logo=android" alt="Download APK" /></a>
    <img src="https://img.shields.io/badge/Platform-Android%20%7C%20Web-green?style=for-the-badge&logo=android" alt="Platform" />
    <img src="https://img.shields.io/badge/Language-TypeScript%20%2B%20Kotlin-purple?style=for-the-badge" alt="TypeScript + Kotlin" />
    <img src="https://img.shields.io/badge/Framework-React%2019%20%2B%20Vite-blue?style=for-the-badge&logo=react" alt="React 19 + Vite" />
    <img src="https://img.shields.io/badge/License-MIT-lightgrey?style=for-the-badge" alt="MIT License" />
  </p>
</div>

---

## ⚡ What is Resonate?

**Resonate** is an all-in-one open-source music streaming application and audio workstation designed for web and Android devices. It gives you unrestricted, seamless playback across millions of songs with rich visual aesthetics, floating player controls when switching apps or browser tabs, synchronized listening rooms with friends, and instant acoustic song recognition.

---

## 📥 Download and Install

Download the latest release APK directly to your Android device:

👉 **[Download Latest Resonate APK](https://github.com/ayushmanchakraborty254-create/Resonate/releases/latest/download/Resonate-v1.0.0.apk)**

1. Tap the download link above on your Android phone or tablet.
2. Open the downloaded `Resonate-v1.0.0.apk` file from your notification bar or Downloads folder.
3. Allow **"Install unknown apps"** in your device settings if prompted.
4. Launch Resonate and enjoy high-fidelity music streaming!

> **Alternative (Web / PWA):** Open [resonate-wine-six.vercel.app](https://resonate-wine-six.vercel.app) in your mobile Chrome or Safari browser, tap the browser menu (⋮), and choose **"Install app"** or **"Add to Home screen"**.

---

## ✨ Key Features

### 🎵 1. Floating Picture-in-Picture Mini-Player
* **Float When Switching Tabs/Windows**: Keep playing music in a sleek floating window with track scrubbing, play/pause, next/prev, and track metadata when you switch tabs or minimize the browser (powered by Document Picture-in-Picture API).
* **Smooth Drag & Docking**: Move the player anywhere on your screen.

### 🎙️ 2. Intelligent Acoustic Music Recognizer
* **Accurate Audio Identification**: Capture and recognize surrounding songs, piano solos, instrumental covers, or humming using real-time audio analysis.
* **Instant In-App Playback**: View song title, artist, album, and launch playback directly inside Resonate with one tap.
* **History Log**: Keeps a log of previously recognized tracks so you never lose a song.

### 👥 3. "Listen Together" Sync Rooms
* **Host a Room**: Create a unique listening room code and invite friends.
* **Join a Room**: Enter any room code to sync audio playback, queue, and playback state in real time.
* **Group Controls**: Room member list and host synchronization controls.

### 🎨 4. Interactive 3D Vinyl Album Artwork
* **Vinyl Slide-Out Animation**: Hovering or tapping any album sleeve slides out a realistic 3D vinyl record disc with concentric audio grooves and custom label art.
* **Zero Black Boxes (Procedural Art Engine)**: Dynamic gradient meshes, equalizer wave bars, and artist monograms automatically render if external imagery is offline or missing.
* **2×2 Dynamic Playlist Collages**: Multi-track playlists automatically generate a 4-quadrant collage with a center frosted glass vinyl spindle.
* **Curated Mood & Genre Badges**: Frosted glass badges (`90s NOSTALGIC`, `ARIJIT HITS`, `RETRO POP`, `NEOCLASSICAL`, `HI-RES LOSSLESS`).

### 🔄 5. Multi-Platform Library & Playlist Sync
* **YouTube Music, Spotify & Apple Music**: Connect your favorite accounts to sync playlists and liked tracks in one unified universal library.
* **Background Auto-Sync**: Automatically syncs playlists upon app launch and periodically every 15 minutes.

### 📜 6. Fullscreen Karaoke Lyrics
* **Immersive Interface**: Dynamic background blur with synchronized line-by-line scrolling lyrics.

### 📊 7. Listening Stats & Insights
* **Listening Metrics**: Track your most-played artists, listening streaks, top genres, and playlist breakdowns.

---

## 🛠️ Step-by-Step: How to Build the APK & Publish to GitHub Releases

Follow these quick steps to build the APK file locally and publish it to GitHub Releases (just like in Graphite):

### Step 1: Build the Web App & Sync Assets
From the root of the Resonate repository, run:
```bash
# Install dependencies (first time only)
npm install

# Build the web bundle and sync assets to Android App
npm run build:app
```
*(This compiles the React + Vite frontend and copies the output into `App/app/src/main/assets/dist/`)*.

---

### Step 2: Compile the Android APK
Navigate into the `App` folder and run the Gradle wrapper:

**On Windows (PowerShell / CMD):**
```powershell
cd App
.\gradlew assembleDebug
```

**On Linux / macOS:**
```bash
cd App
chmod +x gradlew
./gradlew assembleDebug
```

Once the build finishes (`BUILD SUCCESSFUL`), your compiled APK will be located at:
```
App/app/build/outputs/apk/debug/app-debug.apk
```

Rename this file to **`Resonate-v1.0.0.apk`** for publication.

---

### Step 3: Publish to GitHub Releases

1. Open your GitHub Repository:
   👉 **[github.com/ayushmanchakraborty254-create/Resonate/releases](https://github.com/ayushmanchakraborty254-create/Resonate/releases)**
2. Click **"Draft a new release"** (or **"Create a new release"**).
3. In the **Choose a tag** field:
   - Type **`v1.0.0`** and click **Create new tag: v1.0.0 on publish**.
4. In the **Release title** field:
   - Type **`Resonate v1.0.0 — Initial Release`**.
5. In the description box, paste your release notes.
6. Under **Attach binaries by dropping them here or selecting them**:
   - Drag and drop your **`Resonate-v1.0.0.apk`** file.
7. Ensure **"Set as the latest release"** is checked.
8. Click **"Publish release"**.

✅ **Done!** The download link in your `README.md` (`releases/latest/download/Resonate-v1.0.0.apk`) and inside the Resonate app will now immediately download the APK without any 404 error!

---

## 🤖 Automated CI/CD (GitHub Actions)

Resonate also includes an automated GitHub Actions workflow (`.github/workflows/auto-build.yml`) that compiles the APK on every push to `main`.

To allow GitHub Actions to automatically publish releases and update APKs:
1. Go to **Repo Settings** ➔ **Actions** ➔ **General**.
2. Scroll to **Workflow permissions**.
3. Select **"Read and write permissions"** and click **Save**.

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
