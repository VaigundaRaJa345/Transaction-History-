# Pocket Ledger

An installable, responsive private finance tracker. Open `index.html` in a browser, or serve this folder from any static hosting service to install it as a PWA.

## What works now

- Income/credit and expense/debit tracking
- Transaction history and filters
- Budgets, recurring payments, category spending, and monthly totals
- Importing a bank SMS by pasting it into the app
- Local-device storage and offline operation

## Android app: SMS history and future transactions

The included `android/` project is an Android WebView shell for this tracker. On first use, it asks for SMS permission. After permission is granted, it scans the SMS inbox, selects messages that look like bank transactions, and imports the parsed records. It then watches new transaction messages and adds them automatically.

```javascript
webView.evaluateJavascript("window.dispatchEvent(new CustomEvent('smsTransaction', {detail: " + JSON.stringify(body) + "}))", null)
```

The parser recognizes common `Rs`, `INR`, and `₹` amount formats, debit/credit phrases, and account endings. It maps common sender codes for HDFC, ICICI, SBI, Axis, Kotak, IDFC, IndusInd, Yes Bank, Paytm, PhonePe, and Google Pay; every detected account gets its own account card and transaction label. It will fall back to “Bank account · Unknown” instead of mixing ambiguous transactions into another account.

Open the `android/` folder in Android Studio, let it install the Android build tools, then build an APK for your own phone. This configuration is intended for private sideloading; apps distributed through Google Play have much stricter SMS-permission rules.

## Google Sheets cloud backup

The supplied Google Sheet is the app's private backup. It stores structured transaction, account, budget, and recurring-payment rows—never raw SMS text.

1. Open the Sheet and choose **Extensions → Apps Script**.
2. Replace the default code with [apps-script/Code.gs](apps-script/Code.gs), then save it.
3. In **Project Settings → Script properties**, add `API_SECRET` with a private random value of at least 16 characters.
4. Choose **Deploy → New deployment → Web app**. Run it as *you* and set access to *Anyone*. Copy the deployment `/exec` URL.
5. Copy `cloud-config.example.js` to `cloud-config.js`, put the deployment URL and same secret in it, then rebuild/install the Android app. This private file is intentionally excluded from GitHub.

The tracker restores the latest backup at startup and syncs every saved or imported transaction. The secret is required on every request.

## Important privacy note

SMS content contains sensitive financial data. Keep the app private, ask for SMS consent transparently, process only bank sender IDs, and avoid uploading raw SMS bodies—save only the parsed transaction details.
