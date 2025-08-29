# שעון נוכחות – גרסת PWA ואנדרואיד (ללא אירועים)

גרסה זו מנקה *את כל הפיצ'ר של "אירועים"* ומכינה:

1. **PWA** מוכן להעלאה ל-GitHub Pages / אחסון סטטי.
2. **פרויקט Capacitor** בסיסי לאנדרואיד (`android` ייווצר לאחר `npx cap add android`).

## התקנה והפעלה – PWA
- העלה את כל תוכן התיקייה לשורש ה-Hosting שלך (למשל gh-pages).
- ודא שיש את הקבצים:
  - `index.html`
  - `manifest.webmanifest`
  - `service-worker.js`
  - איקונים (`icon-192.png`, `icon-512.png`, `maskable-512.png`)

## בניית APK לאנדרואיד
1. התקן Node.js ו-Capacitor:
   ```bash
   npm i -g @capacitor/cli
   ```
2. בתיקייה `clockapp_capacitor_android` הרץ:
   ```bash
   npx cap add android
   npx cap copy android
   npx cap open android   # פותח Android Studio לבנייה וחתימה
   ```

> שים לב: אם יש לך קריאות ל-Google Apps Script עבור שעות/דוחות – הן נשארו. רק "אירועים" הוסרו/הוסתרו.