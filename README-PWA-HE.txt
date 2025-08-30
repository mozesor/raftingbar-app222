
# שעון נוכחות – PWA + Apps Script (ללא אירועים)

## הגדרה מהירה
1. פתח Google Apps Script חדש → הדבק את `Code.gs` (מצורף בתיקייה `apps_script` בזיפ).
2. בקובץ `Code.gs` עדכן:
   - `SHEET_ID = "1BxSOIHpJSY3UrO-x_PL2amHivd4K_UBhK8EbQsSHVGI"` (כבר עודכן עבורך)
   - `ADMIN_TOKEN = "1986"` (אפשר לשנות)
3. פרוס כ־**Web App**: Deploy → New Deployment → Web app
   - Execute as: **Me**
   - Who has access: **Anyone**
   - קבל את ה-URL (web app).
4. בקובץ `index.html` עדכן את:
   ```js
   const webAppUrl = "הדבק כאן את ה-URL שקיבלת";
   ```
5. העלה את תיקיית ה־PWA (התוכן של התיקייה הראשית בזיפ) ל־GitHub Pages או אחסון סטטי.
6. פתח מהנייד → “הוסף למסך הבית”.

## גיליון נתונים (מינימום הכרחי)
- גיליון בשם **Employees**: עמודה A = שם עובד (שורה ראשונה כותרת: `Name`).
- גיליון בשם **Attendance**: כותרות: `Timestamp,Employee,Action`.

## נקודות API
- GET  `?fn=employees&token=...` → { employees: [...] }
- POST body JSON `{fn:'log', token, employee, action:'in'|'out', ts: ISO}`
- GET  `?fn=stats&token=...` → { todayHours: number, activeCount: number }

> ניתן להרחיב בקלות לסטטיסטיקות מתקדמות, דוחות חודשי וכו'.
