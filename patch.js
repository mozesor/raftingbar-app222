
// ============ Helper ============
function todayStr(){
  const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function dd(x){return document.getElementById(x);}

// ============ Remove any "פתח דוחות" remnants ============
function removeOpenReports(){
  document.querySelectorAll('button,a,div,span').forEach(el=>{
    const t=(el.textContent||'').trim();
    if(/פתח דוחות/.test(t)) el.remove();
  });
}

// ============ Gate (site code 97531) ============
const SITE_CODE = "97531";
function forceGate(){
  const overlay=dd('gate-overlay'), input=dd('gate-input'), msg=dd('gate-msg');
  function open(){ overlay && (overlay.style.display='flex'); msg && (msg.textContent=''); }
  function close(){ overlay && (overlay.style.display='none'); }
  function authed(){ return localStorage.getItem('site_authed_97531')==='1'; }
  if(!authed()) open();
  const ok=dd('gate-ok'), cancel=dd('gate-cancel');
  ok && (ok.onclick=()=>{
    if((input.value||'').trim()===SITE_CODE){ localStorage.setItem('site_authed_97531','1'); close(); }
    else { msg && (msg.textContent='קוד שגוי'); open(); }
  });
  cancel && (cancel.onclick=()=>{
    localStorage.removeItem('site_authed_97531');
    msg && (msg.textContent='הכניסה בוטלה. יש להזין קוד כדי להמשיך.');
    open();
    location.hash='#/';
  });
}

// ============ Employees for Event form ============
async function loadEmployeesForEvents(){
  const sel = dd('eventEmployeeSelect'); if(!sel) return;
  const keep = sel.value;
  sel.innerHTML = '<option value="">-- בחר עובד --</option>';
  let names = Array.isArray(window.employees)? window.employees.slice(): [];
  if(!names.length && window.SHEET_ID && window.API_KEY){
    try{
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(window.SHEET_ID)}/values/A:A?key=${encodeURIComponent(window.API_KEY)}`;
      const res = await fetch(url);
      if(res.ok){
        const js = await res.json();
        names = [...new Set((js.values||[]).slice(1).map(r=>(r[0]||'').trim()).filter(Boolean))];
      }
    }catch(e){}
  }
  names.sort((a,b)=>a.localeCompare(b,'he'));
  for(const n of names){
    const opt=document.createElement('option'); opt.value=n; opt.textContent=n; sel.appendChild(opt);
  }
  if(keep) sel.value = keep;
}

// ============ Default date ============
function setEventDefaultDate(){ const el=dd('eventDate'); if(el) el.value=todayStr(); }

// ============ Save Event ============
async function saveEvent(){
  const name = (dd('eventEmployeeSelect')||{}).value||'';
  const date = (dd('eventDate')||{}).value||'';
  const locationStr = (dd('eventLocation')||{}).value||'';
  const note = (dd('eventNote')||{}).value||'';
  const msgEl = dd('eventMsg');
  if(!name || !date || !locationStr){ msgEl && (msgEl.textContent='יש למלא שם, תאריך ומיקום.'); return; }
  const scriptUrl = window.SCRIPT_URL || window.scriptUrl;
  if(!scriptUrl){ msgEl && (msgEl.textContent='חסר כתובת Web App.'); return; }
  try{
    const ts = new Date().toISOString();
    const row = [name,'event',ts,date,'','PWA',note,locationStr];
    const res = await fetch(scriptUrl, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ values:[row] }) });
    msgEl && (msgEl.textContent = res.ok ? 'האירוע נשמר בהצלחה.' : 'שגיאה בשמירה.');
    if(res.ok){ dd('eventLocation').value=''; dd('eventNote').value=''; setEventDefaultDate(); }
  }catch(e){ msgEl && (msgEl.textContent='שגיאת רשת.'); }
}

// ============ Wiring ============
window.addEventListener('load', ()=>{
  removeOpenReports();
  forceGate();
  setEventDefaultDate();
  loadEmployeesForEvents();
  const btn = dd('btnSaveEvent'); if(btn) btn.onclick=saveEvent;

  // אם יש רשימת עובדים ראשית – תיאום
  const mainSel = document.getElementById('employeeSelect');
  if(mainSel){
    mainSel.addEventListener('change', ()=>{
      const eventSel = dd('eventEmployeeSelect');
      if(eventSel) eventSel.value = mainSel.value||'';
      setEventDefaultDate();
    });
  }
});
window.addEventListener('hashchange', ()=>{
  removeOpenReports();
  setTimeout(loadEmployeesForEvents, 200);
  setEventDefaultDate();
});
setTimeout(loadEmployeesForEvents, 1200);
