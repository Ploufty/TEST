// Préférences d'affichage appliquées avant le rendu (évite le flash). Chargé dans <head>.
var PK = 'cahier-appel-prefs', ROOT = document.documentElement, HOST_THEME = ROOT.dataset.theme;
var P = {};
try { var raw = JSON.parse(localStorage.getItem(PK)); if (raw && typeof raw === 'object') P = raw; } catch (e) { /* stockage indisponible : préférences par défaut */ }
function applyPrefs() {
  var mq = function (q) { return matchMedia(q).matches; };
  if (P.theme === 'dark' || P.theme === 'light') ROOT.dataset.theme = P.theme;
  else if (HOST_THEME) ROOT.dataset.theme = HOST_THEME; else delete ROOT.dataset.theme;
  ROOT.dataset.motion = P.motion === 'reduce' || (P.motion !== 'on' && mq('(prefers-reduced-motion: reduce)')) ? 'reduce' : 'full';
  ROOT.dataset.contrast = P.contrast === true ? 'high' : 'normal';
  ROOT.style.setProperty('--text-scale', ({ 115: 1.15, 130: 1.3 })[P.text] || 1);
}
applyPrefs();
