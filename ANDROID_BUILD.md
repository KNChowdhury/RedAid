# Building the Android app locally

The `android/` folder is a Capacitor-wrapped build of this same React app (see
`capacitor.config.ts`). It needs its own toolchain, separate from the web
app's Node/npm setup.

## Requirements

- **Android SDK** — command-line tools are enough to build; you don't need
  the full Android Studio IDE just to produce an APK.
  - Download: https://developer.android.com/studio#command-tools (pick your OS)
  - Extract so the layout is `<sdk-root>/cmdline-tools/latest/bin/...`
  - Accept licenses: `sdkmanager --licenses`
  - Install what's needed: `sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"`
  - Set `ANDROID_HOME` to `<sdk-root>`, or write it directly into
    `android/local.properties` as `sdk.dir=<sdk-root>` (that file is
    gitignored — machine-specific, never commit it)

- **JDK 21+** — the Capacitor Android Gradle plugin currently requires this;
  a JDK 17 (otherwise fine for the rest of this repo's tooling) will fail
  with `error: invalid source release: 21`. Download a Temurin 21 build from
  https://adoptium.net/temurin/releases/?version=21 and set `JAVA_HOME` to
  it when building this folder specifically (it doesn't need to be your
  system-wide default JDK).

## Build

```
cd android
./gradlew assembleDebug        # unsigned debug APK, for testing
```

Output: `android/app/build/outputs/apk/debug/app-debug.apk` — install directly
on a device/emulator with `adb install app-debug.apk`, or drag it onto a
running emulator window.

## After changing the web app

Capacitor doesn't watch the web app automatically — after any change to
`src/`, rebuild and re-sync before rebuilding the Android app:

```
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
```

## Still needed before a real release (not a debug build)

- Real app icon/splash — see `resources/` (source images already generated
  from the brand favicon) and run `npx capacitor-assets generate --android`
  to apply them into `android/app/src/main/res/`.
- A release signing keystore (`keytool -genkey ...`) and the corresponding
  `signingConfigs` block in `android/app/build.gradle` — a debug build is
  not installable from the Play Store.
- A Google Play Console developer account (one-time $25 fee) to actually
  publish.
