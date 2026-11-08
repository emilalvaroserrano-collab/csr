ABI Tech — Talk to Abbie Static Site v5

All browser-side configuration supplied for this project is included.

Structure:
index.html
calling.html
css/styles.css
js/config.js
js/index.js
js/firebase.js
js/calling.js

js/config.js contains:
- Firebase web configuration
- Firebase Realtime Database URL
- Vapi public key
- Vapi assistant ID
- Default assistant voice/model metadata
- Knowledge-base file ID

Important:
This ZIP intentionally contains only browser-safe/public configuration already supplied for this app.
No private server API key, service-account JSON, Firebase Admin credential, Anthropic secret,
Deepgram secret, Gemini secret, or other unprovided private credential has been invented or embedded.

Firebase Console requirements:
1. Anonymous Authentication enabled.
2. Realtime Database created at the configured databaseURL.
3. Deployed hostname included in Authentication > Settings > Authorized domains.
4. Serve over HTTPS for microphone access.

Recommended RTDB rules:
{
  "rules": {
    "leads": {
      "$uid": {
        ".read": false,
        ".write": "auth != null && auth.uid === $uid"
      }
    }
  }
}
