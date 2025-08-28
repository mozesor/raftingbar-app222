
(function(){
  const $ = (sel) => document.querySelector(sel);
  const apiInput = $('#api');
  const saveApi = $('#saveApi');
  const clearState = $('#clearState');
  const provOut = $('#provOut');
  const sheetLink = $('#sheetLink');
  const adminCode = $('#adminCode');
  const tenantInfo = $('#tenantInfo');
  const bizName = $('#bizName');
  const bizOut = $('#bizOut');
  const employees = $('#employees');
  const empOut = $('#empOut');
  const diagOut = $('#diagOut');
  const btnDiag = $('#btnDiag');
  const btnCopyPack = $('#btnCopyPack');

  // Load persisted values
  apiInput.value = window.RB_API || '';
  const savedAdmin = localStorage.getItem('rb_admin_code') || '';
  if (savedAdmin) adminCode.value = savedAdmin;
  const savedTenant = localStorage.getItem('rb_tenant') || '';
  if (savedTenant) tenantInfo.value = savedTenant;

  saveApi.onclick = () => {
    window.RB_API = apiInput.value.trim();
    alert('API נשמר לזמן גלישה זה: ' + window.RB_API);
  };
  clearState.onclick = () => {
    localStorage.removeItem('rb_admin_code');
    localStorage.removeItem('rb_tenant');
    alert('נוקה localStorage');
    tenantInfo.value = '';
  };

  // Helper: POST without preflight (text/plain)
  async function postJSON(url, payload){
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type':'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    const text = await res.text();
    try { return JSON.parse(text); } catch(e){ return {ok:false, error:'bad_json', raw:text}; }
  }

  // (1) Auto provision
  $('#btnProvision').onclick = async () => {
    provOut.textContent = 'מבצע...';
    const resp = await postJSON(window.RB_API, {action:'autoProvision'});
    provOut.textContent = JSON.stringify(resp, null, 2);
    if (resp && resp.sheet_id){
      sheetLink.value = 'https://docs.google.com/spreadsheets/d/' + resp.sheet_id + '/edit#gid=0';
      if (resp.admin_code){
        adminCode.value = resp.admin_code;
      }
    }
  };

  // (2) Join with admin code
  $('#btnJoin').onclick = async () => {
    const code = adminCode.value.trim();
    if (!code){ alert('נא להזין קוד מנהל'); return; }
    localStorage.setItem('rb_admin_code', code);
    const resp = await postJSON(window.RB_API, {action:'joinByAdminCode', admin_code: code});
    if (resp && resp.tenant_id && resp.secret){
      const pack = resp.tenant_id + ':' + resp.secret;
      localStorage.setItem('rb_tenant', pack);
      tenantInfo.value = pack;
      alert('הצטרפת בהצלחה');
    }else{
      alert('שגיאה: ' + (resp && (resp.error || resp.message)));
    }
  };

  // (3) Update business name
  $('#btnBiz').onclick = async () => {
    const pack = (localStorage.getItem('rb_tenant')||'').split(':');
    if (pack.length < 2){ alert('אין tenant מקומי — בצע הצטרפות (2)'); return; }
    const [tenant_id, secret] = pack;
    const name = bizName.value.trim();
    if (!name){ alert('נא להזין שם עסק'); return; }
    const resp = await postJSON(window.RB_API, {action:'updateBusiness', tenant_id, secret, business_name: name});
    bizOut.value = (resp && resp.updated) ? 'עודכן' : ('שגיאה: ' + (resp && (resp.error||resp.message)));
  };

  // (4) Add employees
  $('#btnEmployees').onclick = async () => {
    const pack = (localStorage.getItem('rb_tenant')||'').split(':');
    if (pack.length < 2){ alert('אין tenant מקומי — בצע הצטרפות (2)'); return; }
    const [tenant_id, secret] = pack;
    const lines = employees.value.split(/\n+/).map(s=>s.trim()).filter(Boolean);
    const list = lines.map(line => {
      const parts = line.split(',').map(x=>x.trim());
      return { name: parts[0]||'', phone: parts[1]||'', code: parts[2]||'' };
    });
    if (!list.length){ alert('אין נתונים'); return; }
    const resp = await postJSON(window.RB_API, {action:'addEmployees', tenant_id, secret, employees: JSON.stringify(list)});
    empOut.value = resp && resp.added >= 0 ? `נוספו ${resp.added}` : ('שגיאה: ' + (resp && (resp.error||resp.message)));
  };

  // Diagnostics
  btnDiag.onclick = async () => {
    diagOut.textContent = 'בודק...';
    const packStr = localStorage.getItem('rb_tenant') || '';
    const [tenant_id, secret] = packStr.split(':');
    if (!tenant_id || !secret){
      diagOut.textContent = 'אין tenant מקומי — בצע הצטרפות (2)';
      return;
    }
    const resp = await postJSON(window.RB_API, {action:'debugShowTenant', tenant_id, secret});
    if (resp && resp.ok){
      diagOut.textContent = JSON.stringify(resp, null, 2);
    }else{
      diagOut.textContent = 'השרת כנראה לא מכיר action=debugShowTenant. הדבק ל-Code.gs:\n' +
`function debug_showTenant_(tenant_id, secret){
  try{
    const t = _getTenant(tenant_id, secret);
    return _resp(true, { tenant_id: t.tenant_id, sheet_id: t.sheet_id });
  }catch(e){
    return _resp(false, { error: String(e) });
  }
}` + '\nובתוך doPost הוסף:\n' +
`if (action === 'debugShowTenant') return _resp(true, debug_showTenant_(body.tenant_id, body.secret));` +
'\nולא לשכוח Deploy → New version.';
    }
  };

  btnCopyPack.onclick = async () => {
    const pack = localStorage.getItem('rb_tenant') || '';
    try{
      await navigator.clipboard.writeText(pack);
      alert('הועתק: ' + pack);
    }catch(e){
      alert('rb_tenant: ' + pack);
    }
  };

})(); 
