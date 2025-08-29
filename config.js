// ===== ClockWork config (editable) =====
window.RB_API = "https://script.google.com/macros/s/AKfycbz1OM7zGXcyFk7nwC0ZK-8ph3K_gOqTeYH38Uc4QdMZ_lJ5lUd02HLv0D9oG90mqxHR/exec";

// Optional: allow override via URL: ?api=https://...
(function(){
  try{
    const sp = new URLSearchParams(location.search);
    const api = sp.get('api');
    if (api) window.RB_API = api;
  }catch(e){}
})();
