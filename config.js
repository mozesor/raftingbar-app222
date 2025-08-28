// ===== ClockWork config (editable) =====
window.RB_API = "https://script.google.com/macros/s/AKfycbz23eWcnMM9wCODXxxC_FOrVvhtyJobn8ui08SGI51S2odAu11mG4gFz8u03DiIZM0N/exec";

// Allow override via URL: ?api=https://...
(function(){
  try{
    const sp = new URLSearchParams(location.search);
    const api = sp.get('api');
    if (api) window.RB_API = api;
  }catch(e){}
})();
