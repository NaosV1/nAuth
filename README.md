# nAuth - Secure Cross-Platform 2FA Authenticator

A secure, open-source Two-Factor Authentication (2FA) application built with React, Electron, and Capacitor. Works seamlessly on Windows, macOS, Linux, iOS, and Android with a single codebase.

## Features

- **Cross-Platform**: Desktop (Electron) and Mobile (Capacitor)
- **Secure**: AES-256 encryption with Argon2id key derivation
- **No Login Required**: Fully local, zero-knowledge architecture
- **TOTP & HOTP Support**: Compatible with all standard 2FA providers
- **Data Transfer**: Secure transfer between devices via QR codes or encrypted files
- **Biometric Auth**: Optional fingerprint/face unlock (platform-dependent)
- **Auto-Lock**: Automatic vault locking for security
- **Open Source**: MIT Licensed

## Security Features

- Master password with Argon2id key derivation (65MB memory, 3 iterations)
- AES-256-CBC encryption with HMAC integrity checks
- No cloud storage - all data stored locally and encrypted
- Secure storage abstraction (SafeStorage on Electron, SecureStorage on mobile)
- Auto-clipboard clearing after 30 seconds
- Data integrity verification with HMAC
- Encrypted data transfer with separate encryption keys

## Installation

### Prerequisites

- Node.js 18+ and npm
- For mobile development: Android Studio (Android) or Xcode (iOS)

### Setup

1. Clone the repository:
```bash
git clone https://github.com/NaosV1/nAuth.git
cd nAuth
```

2. Install dependencies:
```bash
npm install
```

### Development

#### Web Development
```bash
npm run dev
```
Open http://localhost:5173 in your browser.

#### Desktop Development (Electron)
```bash
npm run dev:electron
```

#### Mobile Development

First, build the web assets:
```bash
npm run build
```

For iOS:
```bash
npm run cap:add:ios
npm run cap:sync
npm run cap:open:ios
```

For Android:
```bash
npm run cap:add:android
npm run cap:sync
npm run cap:open:android
```

### Building for Production

#### Desktop Builds
```bash
npm run build:electron
```

This creates installers for your current platform in the `release/` directory:
- Windows: `.exe` installer
- macOS: `.dmg` installer
- Linux: `.AppImage` and `.deb` packages

#### Mobile Builds

Build the web assets first:
```bash
npm run build
npm run cap:sync
```

Then use Android Studio or Xcode to build the native apps.

## Usage

### First Time Setup

1. Launch the application
2. Create a master password (minimum 8 characters)
3. Remember your password - it cannot be recovered!

### Adding Accounts

**Option 1: Scan QR Code**
1. Click "Add Account"
2. Click "Scan QR Code" tab
3. Scan the QR code from your 2FA provider

**Option 2: Manual Entry**
1. Click "Add Account"
2. Click "Manual Entry" tab
3. Enter the account details and secret key

**Option 3: Paste URI**
1. Click "Add Account"
2. Paste the `otpauth://` URI directly

### Using Codes

- TOTP codes refresh every 30 seconds (default)
- Click on a code to copy it to clipboard
- Clipboard auto-clears after 30 seconds

### Transferring Data

#### Export to Another Device

1. Go to Settings
2. Click "Export Vault"
3. Choose export method:
   - **QR Code**: Display encrypted QR code for scanning
   - **File**: Save encrypted `.nauth` file

#### Import from Another Device

1. Go to Settings
2. Click "Import Vault"
3. Choose import method:
   - **Scan QR**: Scan QR code from other device
   - **File**: Load encrypted `.nauth` file

Note: You'll need the transfer password (can be different from master password).

## Project Structure

```
nAuth/
├── electron/          # Electron main process
│   ├── main.ts       # Main process entry
│   └── preload.ts    # Preload script for IPC
├── src/              # React application
│   ├── components/   # React components
│   ├── services/     # Core services
│   │   ├── encryption.service.ts  # Encryption/decryption
│   │   ├── storage.service.ts     # Secure storage
│   │   ├── vault.service.ts       # Vault management
│   │   ├── otp.service.ts         # TOTP/HOTP generation
│   │   └── account.service.ts     # Account management
│   ├── types/        # TypeScript types
│   ├── utils/        # Utility functions
│   ├── App.tsx       # Main app component
│   └── main.tsx      # React entry point
├── public/           # Static assets
└── capacitor.config.ts  # Capacitor configuration
```

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Desktop**: Electron
- **Mobile**: Capacitor
- **Encryption**: argon2-browser, crypto-js
- **OTP**: otpauth
- **QR Codes**: qrcode, html5-qrcode

## Security Considerations

1. **Master Password**: Your master password is never stored. It's used to derive an encryption key each time you unlock the vault.

2. **Encryption**: All account data is encrypted using AES-256-CBC with a key derived from your master password using Argon2id.

3. **Integrity**: HMAC is used to verify data integrity and detect tampering.

4. **Storage**: Data is stored locally using platform-specific secure storage when available (Electron SafeStorage, Capacitor SecureStorage).

5. **Memory**: Sensitive data is cleared from memory when locking the vault (best effort in JavaScript).

## Future Enhancements

- [ ] Settings screen with customizable options
- [ ] Biometric authentication implementation
- [ ] Auto-lock timer configuration
- [ ] Cloud backup (encrypted, optional)
- [ ] Browser extension
- [ ] Themes and customization
- [ ] Multi-vault support
- [ ] Account backup codes
- [ ] QR code image scanning on desktop

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details.

## Security Disclosure

If you discover a security vulnerability, please email [your-email] instead of using the issue tracker.

## Acknowledgments

- Built with React, Electron, and Capacitor
- Inspired by other great 2FA apps like Authy and Google Authenticator
- Thanks to the open-source community
