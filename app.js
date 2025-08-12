/* ===== קונפיגורציה ===== */
const { MODE, SHEET_ID, API_KEY, RANGE, APPS_SCRIPT_URL } = window.CONFIG || {};
const SITE_ENTRY_CODE = "97531";
const ADMIN_CODE = "1986";

/* ===== SPA Routes ===== */
const routes = { "/": "view-home", "/my-days": "view-my-days", "/event": "view-event", "/admin": "view-admin" };
function showView(id) {
  document.querySelectorAll("main > section").forEach(sec => sec.classList.add("hidden"));
  const el = document.getElementById(id);
  if (el) el.classList.remove("hidden");
  document.querySelectorAll("nav a[data-link]").forEach(a => {
    const href = a.getAttribute("href") || "";
    a.setAttribute("aria-current", (href === location.hash ? "page" : "false"));
  });
}

/* ===== כניסה ראשונית ===== */
const gateOverlay = document.getElementById("gate-overlay");
const gateInput = document.getElementById("gate-input");
const gateMsg = document.getElementById("gate-msg");
function ensureSiteEntry() { const authed = localStorage.getItem("site_authed_97531") === "1"; if (authed) return true; openGate(); return false; }
function openGate() { gateOverlay.style.display = "flex"; gateMsg.textContent = ""; gateInput.value = ""; setTimeout(()=>gateInput.focus(),0); }
function closeGate() { gateOverlay.style.display = "none"; }
function tryGate(code) { if (String(code).trim() === SITE_ENTRY_CODE) { localStorage.setItem("site_authed_97531","1"); closeGate(); return true; } gateMsg.textContent = "קוד שגוי. נסה שוב."; return false; }
document.getElementById("gate-ok").addEventListener("click", ()=> tryGate(gateInput.value));
document.getElementById("gate-cancel").addEventListener("click", ()=> { gateMsg.textContent = "הכניסה בוטלה. יש להזין קוד כדי להמשיך."; });
gateInput.addEventListener("keydown", e => { if (e.key === "Enter") tryGate(gateInput.value); });

/* ===== ניווט ===== */
async function handleRoute() {
  if (!ensureSiteEntry()) return;
  const hash = location.hash.replace("#", "") || "/";
  if (hash === "/admin") {
    const isAuthed = localStorage.getItem("admin_authed_1986") === "1";
    if (!isAuthed) {
      const code = prompt("הכנס קוד מנהל:");
      if (code === null) { location.hash = "#/"; return; }
      if (code.trim() !== ADMIN_CODE) { alert("קוד שגוי."); location.hash = "#/"; return; }
      localStorage.setItem("admin_authed_1986", "1");
    }
  }
  const id = routes[hash] || routes["/"];
  showView(id);
}
window.addEventListener("hashchange", handleRoute);
window.addEventListener("load", () => { setThisMonth(); handleRoute(); tryRegisterSW(); loadAndPopulateNames(); });

/* ===== יציאה מגישת מנהל ===== */
document.addEventListener("click", (e) => {
  if (e.target && e.target.id === "btn-logout-admin") {
    localStorage.removeItem("admin_authed_1986");
    alert("יצאת ממסך המנהל.");
    location.hash = "#/";
  }
});

/* ===== טעינת נתונים מהשיטס ===== */
async function ensureDataLoaded(){
  if (window.attendanceData) return true;
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
    return true;
  } catch(err) { console.error(err); return false; }
}
function valuesToObjects(values){
  const headers = (values[0]||[]).map(h => String(h||"").trim());
  const getCol = (cands)=>{ for (let i=0;i<headers.length;i++){ const h = String(headers[i]||"").trim().toLowerCase(); for (const c of cands){ if (h === c.toLowerCase()) return i; } } return -1; };
  const idx = {
    name:   getCol(["שם העובד","שם עובד","שם"]),
    action: getCol(["פעולה","action"]),
    full:   getCol(["זמן מלא","תאריך מלא"]),
    date:   getCol(["תאריך","date"]),
    time:   getCol(["שעת פעולה","שעת פעילות","שעה","time"]),
    src:    getCol(["מקור","source"]),
    note:   getCol(["הערה","הערות","note"]),
    location: getCol(["מיקום","location"]),
  };
  return values.slice(1).map(row => ({
    "שם עובד": row[idx.name] ?? "",
    "פעולה": row[idx.action] ?? "",
    "תאריך מלא": row[idx.full] ?? "",
    "תאריך": row[idx.date] ?? "",
    "שעת פעילות": row[idx.time] ?? "",
    "מקור": row[idx.src] ?? "PWA",
    "הערה": row[idx.note] ?? "",
    "מיקום": row[idx.location] ?? ""
  }));
}

/* ===== “ימי העבודה שלי” ===== */
const form = document.getElementById("employee-form");
const btnThisMonth = document.getElementById("btn-this-month");
const tblBody = document.querySelector("#emp-table tbody");
const totalEl = document.getElementById("emp-total");
const eventsEl = document.getElementById("emp-events");
const resultWrap = document.getElementById("emp-result");
const emptyEl = document.getElementById("emp-empty");
const noDataEl = document.getElementById("emp-no-data");
const metaEl = document.getElementById("emp-meta");
const empInput = document.getElementById("emp-name");
const empList  = document.getElementById("emp-list");

btnThisMonth?.addEventListener("click", setThisMonth);
form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const empName = empInput.value.trim();
  const from = document.getElementById("from").value;
  const to = document.getElementById("to").value;
  if (!empName || !from || !to) return;
  await ensureDataLoaded();
  buildMyDays(empName, from, to);
});
function setThisMonth() {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  document.getElementById("from").value = toInputDate(first);
  document.getElementById("to").value = toInputDate(last);
}
function toInputDate(d) { const m=String(d.getMonth()+1).padStart(2,"0"); const day=String(d.getDate()).padStart(2,"0"); return `${d.getFullYear()}-${m}-${day}`; }
function ddmmyyyy(d){ const day=String(d.getDate()).padStart(2,"0"); const m=String(d.getMonth()+1).padStart(2,"0"); return `${day}/${m}/${d.getFullYear()}`; }

async function loadAndPopulateNames(){
  const ok = await ensureDataLoaded();
  if (!ok) return;
  const data = window.attendanceData;
  let names = [];
  if (Array.isArray(data)){
    names = [...new Set(data.map(r => String((r["שם עובד"]??r["שם העובד"]??"")).trim()).filter(Boolean))];
  } else if (typeof data === "object") { names = Object.keys(data||{}); }
  names.sort((a,b)=>a.localeCompare(b,"he"));
  empList.innerHTML = names.map(n=>`<option value="${escapeHtml(n)}"></option>`).join("");
}

function buildMyDays(empName, fromStr, toStr) {
  resultWrap.classList.remove("hidden");
  emptyEl.classList.add("hidden");
  noDataEl.classList.add("hidden");
  tblBody.innerHTML = "";
  totalEl.textContent = "0";
  eventsEl.textContent = "סה״כ אירועים: 0";
  metaEl.textContent = "";

  const data = window.attendanceData;
  if (!data){ noDataEl.classList.remove("hidden"); return; }

  const from = new Date(fromStr + "T00:00:00");
  const to   = new Date(toStr + "T23:59:59");
  let events = [];

  if (Array.isArray(data)){
    events = data
      .filter(r => String((r["שם עובד"]??r["שם העובד"]??"")).trim() === empName)
      .map(r => ({
        action: String((r["פעולה"]??"")).trim().toLowerCase(),
        ts: parseTimestamp(String(r["תאריך מלא"]??""), String(r["תאריך"]??""), r["שעת פעילות"]),
        note: r["הערה"]||""
      }))
      .filter(ev => ev.ts && ev.ts >= from && ev.ts <= to)
      .sort((a,b)=>a.ts-b.ts);
  } else { noDataEl.classList.remove("hidden"); return; }

  const byDay = {};
  let eventCount = 0;
  for (const ev of events){
    if (ev.action === "event") { eventCount++; continue; }
    const day = toIsoDate(ev.ts);
    (byDay[day] ||= []).push(ev);
  }

  let total = 0, outRows = [];
  for (const day of Object.keys(byDay).sort()){
    let open = null;
    for (const ev of byDay[day]){
      if (ev.action === "checkin"){
        if (open) outRows.push({date:day,start:timeHHMM(open.ts),end:"",hours:0,note:"חסרה יציאה"});
        open = ev;
      } else if (ev.action === "checkout"){
        if (open){
          const h = Math.max(0, (ev.ts - open.ts)/36e5);
          total += h;
          outRows.push({date:day,start:timeHHMM(open.ts),end:timeHHMM(ev.ts),hours:round2(h),note:ev.note||""});
          open = null;
        } else {
          outRows.push({date:day,start:"",end:timeHHMM(ev.ts),hours:0,note:"חסרה כניסה"});
        }
      }
    }
    if (open) outRows.push({date:day,start:timeHHMM(open.ts),end:"",hours:0,note:"חסרה יציאה"});
  }

  if (outRows.length === 0 && eventCount===0){ emptyEl.classList.remove("hidden"); return; }
  for (const r of outRows){
    const tr = document.createElement("tr");
    const d = new Date(r.date+"T00:00:00");
    tr.innerHTML = `<td>${ddmmyyyy(d)}</td><td>${r.start}</td><td>${r.end}</td><td>${r.hours}</td><td>${escapeHtml(r.note)}</td>`;
    tblBody.appendChild(tr);
  }
  totalEl.textContent = String(round2(total));
  eventsEl.textContent = `סה״כ אירועים: ${eventCount}`;
  metaEl.textContent = `עובד: ${empName} | טווח: ${toDDMMYYYY(from)}–${toDDMMYYYY(to)} | שורות: ${outRows.length}`;
}

/* ===== דיווח אירוע ===== */
const evForm = document.getElementById("event-form");
const evMsg  = document.getElementById("event-msg");
evForm?.addEventListener("submit", async (e)=>{
  e.preventDefault();
  const name = document.getElementById("ev-name").value.trim();
  const date = document.getElementById("ev-date").value;
  const locationStr = document.getElementById("ev-location").value.trim();
  const note = document.getElementById("ev-note").value.trim();
  if (!name || !date || !locationStr) { evMsg.textContent = "יש למלא שם, תאריך ומיקום."; return; }
  if (!APPS_SCRIPT_URL) { evMsg.textContent = "חסר URL של ה-Apps Script."; return; }
  try{
    // שליחה בפורמט שתואם לקוד שכבר יש לך (JSON עם values: [])
    const ts = new Date().toISOString();
    const row = [name, "event", ts, date, "", "PWA", note, locationStr];
    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ values: [row] })
    });
    evMsg.textContent = res.ok ? "האירוע נשמר בהצלחה." : "שגיאה בשמירה.";
    if (res.ok){ evForm.reset(); document.getElementById("ev-date").value = toInputDate(new Date()); }
  }catch(err){ evMsg.textContent = "שגיאת רשת בשמירה."; }
});

/* ===== Helpers ===== */
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
function toInputDate(d){ const mm=String(d.getMonth()+1).padStart(2,"0"), dd=String(d.getDate()).padStart(2,"0"); return `${d.getFullYear()}-${mm}-${dd}`; }
function toDDMMYYYY(d){ const day=String(d.getDate()).padStart(2,"0"); const m=String(d.getMonth()+1).padStart(2,"0"); return `${day}/${m}/${d.getFullYear()}`; }

/* ===== PWA SW ===== */
function tryRegisterSW(){ if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{}); }
