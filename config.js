// ===== ClockWork config (editable) =====
window.RB_API = "https://script.google.com/macros/s/AKfycbzDoSgEMO0y-1YDto0BmSJsN0wFI53qIGyTWjX3vyzHqqO_7pZQxaK2fYm0N262J_5a/exec";

// Allow override via URL: ?api=https://...
(function(){
  try{
    const sp = new URLSearchParams(location.search);
    const api = sp.get('api');
    if (api) window.RB_API = api;
  }catch(e){}
})();
