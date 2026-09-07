# Apex INN - Flutter Mobile App (Android & iOS)

This is the native Flutter mobile application for **Apex INN Property Management System**, complementing the live web application at `https://apex-inn.vercel.app`.

---

## Features
- **Live Cloud Sync**: Directly connects to the live Neon PostgreSQL database via REST API.
- **Same-Day Checkout**: Allows selecting same check-in & check-out dates computed as 1 day.
- **Multi-Room Category Selection**: Book multiple room types (e.g. 1 Deluxe + 2 Standard) with dynamic rate calculation.
- **12 OTA / Booking Sources**: Filter and book across all 12 channels (`GOMMT`, `B.COM`, `AIRBNB`, `BREVISTAY`, `B2B`, `CLEARTRIP`, `YATRA`, `EXPEDIA`, `AGODA`, `Fab`, `Corporate`, `Walk inn`).
- **No GST / Direct Receipts**: Clean receipts with WhatsApp sharing directly to guests.
- **Fast UPI Payments**: Instant one-tap UPI collection without requiring UTR/reference numbers.
- **Add-on Services**: Early check-in, late checkout, and extra mattress charges.

---

## How to Run & Build

### 1. Install Flutter (if not installed on Mac)
```bash
brew install --cask flutter
```

### 2. Get Dependencies
```bash
cd mobile
flutter pub get
```

### 3. Run on Simulator / Connected Phone
```bash
flutter run
```

### 4. Build Android APK
```bash
flutter build apk --release
```
The resulting `.apk` will be in `build/app/outputs/flutter-apk/app-release.apk`.
