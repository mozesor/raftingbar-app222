const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx_UMxeN_-dYeiR4xQa4HzT9ogZPv8BeYkRuUg0BOeEobOQZJVvj7gZU-2U_5LrxEtK/exec";
/* ===== קונפיגורציה ===== */
const SITE_ENTRY_CODE = "97531";   // כניסה ראשונית לאתר
const ADMIN_CODE = "1986";         // ניהול/דוחות מפורטים
// מצב טעינת נתונים: "existing" = attendanceData קיים; "sheets" = קריאה ישירה לגיליון
const MODE = "sheets"; // "existing" | "sheets"
const SHEET_ID = "1SNSdRdJy-vP--spyKmVwDbnaz808KEwTYSKiLreFn0w";     // למצב "sheets": מזהה הגיליון
const API_KEY = "AIzaSyB8MgwEZ7hqS_hiZqTcwzODheuwdBA55j4";     // למצב "sheets": Google API key
const RANGE = "גיליון1!A1:H"; // למצב "sheets": טווח כולל כותרות

/* ===== SPA Routes ===== */
const routes = { "/": "view-home", "/my-days": "view-my-days", "/admin": "view-admin" };

function showView(id) {
  document.querySelectorAll("main > section").forEach(sec => sec.classList.add("hidden"));
  const el = document.getElementById(id);
  if (el) el.classList.remove("hidden");
  document.querySelectorAll("nav a[data-link]").forEach(a => {
    const href = a.getAttribute("href") || "";
    a.setAttribute("aria-current", (href === location.hash ? "page" : "false"));
  });
}

/* ===== נעילת כניסה ראשונית (97531) ===== */
const gateOverlay = document.getElementById("gate-overlay");
const gateInput = document.getElementById("gate-input");
const gateMsg = document.getElementById("gate-msg");

function ensureSiteEntry() {
  const authed = localStorage.getItem("site_authed_97531") === "1";
  if (authed) return true;
  openGate();
  return false;
}
function openGate() { gateOverlay.style.display = "flex"; gateMsg.textContent = ""; gateInput.value = ""; setTimeout(()=>gateInput.focus(),0); }
function closeGate() { gateOverlay.style.display = "none"; }
function tryGate(code) {
  if (String(code).trim() === SITE_ENTRY_CODE) { localStorage.setItem("site_authed_97531","1"); closeGate(); return true; }
  gateMsg.textContent = "קוד שגוי. נסה שוב."; return false;
}
document.getElementById("gate-ok").addEventListener("click", ()=> tryGate(gateInput.value));
document.getElementById("gate-cancel").addEventListener("click", ()=> { gateMsg.textContent = "הכניסה בוטלה. יש להזין קוד כדי להמשיך."; }); // Cancel = לא נכנסים
gateInput.addEventListener("keydown", e => { if (e.key === "Enter") tryGate(gateInput.value); });

/* ===== ניווט ===== */
async function handleRoute() {
  if (!ensureSiteEntry()) return;
  const hash = location.hash.replace("#", "") || "/";
  if (hash === "/admin") {
    const isAuthed = localStorage.getItem("admin_authed_1986") === "1";
    if (!isAuthed) {
      const code = prompt("הכנס קוד מנהל:");
      if (code === null) { location.hash = "#/"; return; } // Cancel => לא נכנס
      if (code.trim() !== ADMIN_CODE) { alert("קוד שגוי."); location.hash = "#/"; return; }
      localStorage.setItem("admin_authed_1986", "1");
    }
  }
  const id = routes[hash] || routes["/"];
  showView(id);
}
window.addEventListener("hashchange", handleRoute);
window.addEventListener("load", () => { setThisMonth(); handleRoute(); tryRegisterSW(); });

/* ===== יציאה מגישת מנהל ===== */
document.addEventListener("click", (e) => {
  if (e.target && e.target.id === "btn-logout-admin") {
    localStorage.removeItem("admin_authed_1986");
    alert("יצאת ממסך המנהל.");
    location.hash = "#/";
  }
});

/* ===== “ימי העבודה שלי” ===== */
const form = document.getElementById("employee-form");
const btnThisMonth = document.getElementById("btn-this-month");
const tblBody = document.querySelector("#emp-table tbody");
const totalEl = document.getElementById("emp-total");
const resultWrap = document.getElementById("emp-result");
const emptyEl = document.getElementById("emp-empty");
const noDataEl = document.getElementById("emp-no-data");
const metaEl = document.getElementById("emp-meta");
const empInput = document.getElementById("emp-name");
const empList  = document.getElementById("emp-list");

btnThisMonth?.addEventListener("click", setThisMonth);

function setThisMonth() {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  document.getElementById("from").value = toInputDate(first);
  document.getElementById("to").value = toInputDate(last);
}
function toInputDate(d) { const m=String(d.getMonth()+1).padStart(2,"0"); const day=String(d.getDate()).padStart(2,"0"); return `${d.getFullYear()}-${m}-${day}`; }

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const empName = empInput.value.trim();
  const from = document.getElementById("from").value;
  const to = document.getElementById("to").value;
  if (!empName || !from || !to) return;
  await ensureDataLoaded();
  buildMyDays(empName, from, to);
});

async function ensureDataLoaded(){
  if (window.attendanceData) { populateNames(); return true; }
  if (MODE !== "sheets") return false;
  if (!SHEET_ID || !API_KEY || !RANGE) return false;
  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(SHEET_ID)}/values/${encodeURIComponent(RANGE)}?key=${encodeURIComponent(API_KEY)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Sheets API error");
    const json = await res.json();
    if (!json || !json.values || !json.values.length) return false;
    const rows = valuesToObjects(json.values);
    window.attendanceData = rows;
    populateNames();
    return true;
  } catch(err) {
    console.error(err);
    return false;
  }
}

// מילוי רשימת שמות עובדים
function populateNames(){
  const data = window.attendanceData;
  if (!data) return;
  let names = [];
  if (Array.isArray(data)){
    names = [...new Set(data.map(r => String((r["שם עובד"]??"")).trim()).filter(Boolean))];
  } else if (typeof data === "object"){
    names = Object.keys(data||{});
  }
  names.sort((a,b)=>a.localeCompare(b,"he"));
  empList.innerHTML = names.map(n=>`<option value="${escapeHtml(n)}"></option>`).join("");
}

function valuesToObjects(values){
  const headers = (values[0]||[]).map(h => String(h||"").trim());
  const col = (names)=>{
    for (let i=0;i<headers.length;i++){
      const h = String(headers[i]||"").trim().toLowerCase();
      for (const n of names){ if (h === n.toLowerCase()) return i; }
    }
    return -1;
  };
  const idx = {
    name: col(["שם עובד","שם","עובד"]),
    action: col(["פעולה","action"]),
    full: col(["תאריך מלא"]),
    date: col(["תאריך","date"]),
    time: col(["שעת פעילות","שעה","time"])
  };
  return values.slice(1).map(row => ({
    "שם עובד": row[idx.name] ?? "",
    "פעולה": row[idx.action] ?? "",
    "תאריך מלא": row[idx.full] ?? "",
    "תאריך": row[idx.date] ?? "",
    "שעת פעילות": row[idx.time] ?? ""
  }));
}

function buildMyDays(empName, fromStr, toStr) {
  resultWrap.classList.remove("hidden");
  emptyEl.classList.add("hidden");
  noDataEl.classList.add("hidden");
  tblBody.innerHTML = "";
  totalEl.textContent = "0";
  metaEl.textContent = "";

  const data = window.attendanceData;
  if (!data){ noDataEl.classList.remove("hidden"); return; }

  const from = new Date(fromStr + "T00:00:00");
  const to   = new Date(toStr + "T23:59:59");
  let events = [];

  if (Array.isArray(data)){
    events = data
      .filter(r => String((r["שם עובד"]??"")).trim() === empName)
      .map(r => ({
        action: String((r["פעולה"]??"")).trim().toLowerCase(),
        ts: parseTimestamp(String(r["תאריך מלא"]??""), String(r["תאריך"]??""), r["שעת פעילות"])
      }))
      .filter(ev => ev.ts && ev.ts >= from && ev.ts <= to)
      .sort((a,b)=>a.ts-b.ts);
  } else if (typeof data === "object" && data[empName]) {
    for (const day of Object.keys(data[empName])){
      const rec = data[empName][day] || {};
      if (rec.checkIn){ const ts = new Date(rec.checkIn); if (ts>=from && ts<=to) events.push({ action:"checkin", ts }); }
      if (rec.checkOut){ const ts = new Date(rec.checkOut); if (ts>=from && ts<=to) events.push({ action:"checkout", ts }); }
    }
    events.sort((a,b)=>a.ts-b.ts);
  } else {
    noDataEl.classList.remove("hidden"); return;
  }

  const byDay = {};
  for (const ev of events){
    const day = toIsoDate(ev.ts);
    (byDay[day] ||= []).push(ev);
  }

  let total = 0, outRows = [];
  for (const day of Object.keys(byDay).sort()){
    let open = null;
    for (const ev of byDay[day]){
      const type = ev.action === "in" ? "checkin" : ev.action === "out" ? "checkout" : ev.action;
      if (type === "checkin"){
        if (open) outRows.push({date:day,start:timeHHMM(open.ts),end:"",hours:0,note:"חסרה יציאה"});
        open = ev;
      } else if (type === "checkout"){
        if (open){
          const h = Math.max(0, (ev.ts - open.ts)/36e5);
          total += h;
          outRows.push({date:day,start:timeHHMM(open.ts),end:timeHHMM(ev.ts),hours:round2(h),note:""});
          open = null;
        } else {
          outRows.push({date:day,start:"",end:timeHHMM(ev.ts),hours:0,note:"חסרה כניסה"});
        }
      }
    }
    if (open) outRows.push({date:day,start:timeHHMM(open.ts),end:"",hours:0,note:"חסרה יציאה"});
  }

  if (outRows.length === 0){ emptyEl.classList.remove("hidden"); return; }
  for (const r of outRows){
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${r.date}</td><td>${r.start}</td><td>${r.end}</td><td>${r.hours}</td><td>${escapeHtml(r.note)}</td>`;
    tblBody.appendChild(tr);
  }
  totalEl.textContent = String(round2(total));
  metaEl.textContent = `עובד: ${empName} | טווח: ${fromStr}–${toStr} | שורות: ${outRows.length}`;
}

/* ===== Helpers ===== */
function toInputDate(d){ const m=String(d.getMonth()+1).padStart(2,"0"); const day=String(d.getDate()).padStart(2,"0"); return `${d.getFullYear()}-${m}-${day}`; }
function parseTimestamp(full, dateOnly, timeVal){
  if (full){
    const d = new Date(String(full).replace(" ", "T"));
    if (!isNaN(d)) return d;
  }
  const t = normalizeTime(timeVal);
  const d2 = new Date(`${dateOnly}T${t||"00:00:00"}`);
  return isNaN(d2) ? null : d2;
}
function normalizeTime(v){
  if (v==null || v==="") return "";
  if (v instanceof Date) return hhmmss(v.getHours(), v.getMinutes(), v.getSeconds());
  const s = String(v).trim();
  if (/^\d{1,2}:\d{2}:\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2}):(\d{2})$/); if (m) return `${m[1].padStart(2,"0")}:${m[2]}:00`;
  if (/^\d+(\.\d+)?$/.test(s)){ const minutes = Math.round(Number(s)*24*60); const hh=Math.floor(minutes/60), mm=minutes%60; return hhmmss(hh,mm,0); }
  const d = new Date(s); if (!isNaN(d)) return hhmmss(d.getHours(),d.getMinutes(),d.getSeconds());
  return "";
}
function hhmmss(h,m,s){ return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`; }
function timeHHMM(d){ return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`; }
function toIsoDate(d){ const m=String(d.getMonth()+1).padStart(2,"0"); const day=String(d.getDate()).padStart(2,"0"); return `${d.getFullYear()}-${m}-${day}`; }
function round2(x){ return Math.round(x*100)/100; }
function escapeHtml(v){ return String(v||"").replace(/[&<>"]/g, s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s])); }

/* ===== PWA SW ===== */
function tryRegisterSW(){ if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{}); }


// ===== אירועים: מילוי שמות + תאריך ברירת מחדל + שליחה לשיטס =====
function populateEventEmployees() {
  try {
    var sel = document.getElementById('eventEmployeeSelect');
    if (!sel) return;
    var keep = sel.value;
    sel.innerHTML = '<option value="">-- בחר עובד --</option>';
    var list = (Array.isArray(employees) ? employees.slice() : []);
    if (!list.length && window.attendanceData) {
      if (Array.isArray(window.attendanceData)) {
        list = [...new Set(window.attendanceData
          .map(r => (r["שם עובד"] || r["שם העובד"] || "").trim())
          .filter(Boolean))];
      } else {
        list = Object.keys(window.attendanceData || {});
      }
    }
    list.sort((a,b)=>a.localeCompare(b,'he'));
    list.forEach(name => {
      var opt = document.createElement('option');
      opt.value = name; opt.textContent = name;
      sel.appendChild(opt);
    });
    sel.value = keep || '';
  } catch(e) {}
}

function setDefaultEventDate() {
  var el = document.getElementById('eventDate');
  if (!el) return;
  var d = new Date();
  var y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), day = String(d.getDate()).padStart(2,'0');
  el.value = y+'-'+m+'-'+day;
}

function reportEvent(){
  var name = (document.getElementById('eventEmployeeSelect')||{}).value || '';
  var date = (document.getElementById('eventDate')||{}).value || '';
  var locationStr = (document.getElementById('eventLocation')||{}).value || '';
  var note = (document.getElementById('eventNote')||{}).value || '';
  var msgEl = document.getElementById('eventMsg');
  if (!name || !date || !locationStr) { if (msgEl) msgEl.textContent = 'יש למלא שם, תאריך ומיקום.'; return; }
  if (!scriptUrl) { if (msgEl) msgEl.textContent = 'חסר scriptUrl של ה-Web App.'; return; }
  var ts = new Date().toISOString();
  var row = [name, 'event', ts, date, '', 'PWA', note, locationStr];
  fetch(scriptUrl, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ values: [row] })
  }).then(function(res){
    if (res.ok) {
      if (msgEl) msgEl.textContent = 'האירוע נשמר בהצלחה.';
      document.getElementById('eventLocation').value = '';
      document.getElementById('eventNote').value = '';
      setDefaultEventDate();
    } else {
      if (msgEl) msgEl.textContent = 'שגיאה בשמירה.';
    }
  }).catch(function(){
    if (msgEl) msgEl.textContent = 'שגיאת רשת בשמירה.';
  });
}


// Hook after load to ensure form has data
window.addEventListener('load', function(){
  try { setDefaultEventDate(); populateEventEmployees(); } catch(e){}
  // populate again after potential async sheet load
  setTimeout(function(){ try { populateEventEmployees(); } catch(e){} }, 1500);
});
