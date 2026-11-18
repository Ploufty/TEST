/* Interface : tableau de bord (saisie rapide). Toute valeur interpolée dans du HTML passe par esc(). */
(function () {
  const C = Core, Cal = Calendrier;
  const KEY = 'cahier-appel-v3';
  const $ = id => document.getElementById(id);
  const esc = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const dfr = d => d.slice(8) + '/' + d.slice(5, 7);
  const clamp = (v, max) => v === '' ? '' : Math.min(max, Math.max(0, Math.round(+v) || 0));

  const storeFail = () => { $('storeWarn').hidden = false; };
  function readStore() {
    let raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { storeFail(); return null; }
    try { return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { storeFail(); } }

  let S = C.normalize(readStore());
  const view = () => C.viewMonth(S, S.month);
  const own = () => C.ensureMonth(S, S.month);
  let mvLevel = null, tab = 'saisie';

  // --- En-tête, bandeau calendrier
  function head() {
    const ms = Cal.schoolMonths(S.year), i = ms.indexOf(S.month);
    $('year').innerHTML = C.YEARS.map(y => `<option value="${esc(y)}"${y === S.year ? ' selected' : ''}>${esc(y)}</option>`).join('');
    $('year').hidden = C.YEARS.length < 2;
    $('month').innerHTML = ms.map(k => `<option value="${esc(k)}"${k === S.month ? ' selected' : ''}>${esc(C.mlabel(k))}</option>`).join('');
    $('prev').disabled = i <= 0; $('next').disabled = i >= ms.length - 1;
    $('foot').textContent = `ComptAppel · Année scolaire ${S.year} · Saisie conservée dans ce navigateur`;
  }
  function calTxt() {
    const m = view(), c = C.compute(S, S.month), off = m.off.filter(o => o.date).length;
    $('calTxt').textContent = `${Cal.zoneLabel(m.zone)} · ${m.rhythm === '4' ? '4 jours' : '4,5 jours'} · ${c.D} demi-journées de classe` +
      (c.manual ? ' (modifié)' : '') + (off ? ` · ${off} jour${off > 1 ? 's' : ''} retiré${off > 1 ? 's' : ''}` : '');
  }

  // --- Saisie : une ligne par niveau (construite quand les niveaux ou le mois changent ; jamais pendant la frappe)
  function rows() {
    const m = view(), on = C.LEVELS.filter(l => m.levels.includes(l));
    $('rowsHint').hidden = !on.length;
    if (!on.length) {
      $('rows').innerHTML = '<div class="emptybox"><p>Choisissez les niveaux de la classe pour commencer.</p><button type="button" class="btn primary" data-pick>Choisir les niveaux</button></div>';
      return;
    }
    $('rows').innerHTML = '<div class="lhead" aria-hidden="true"><span></span><span>Élèves</span><span>Absences</span><span class="hmv">Arrivée / départ</span></div>' + on.map(l => {
      const d = C.lvData(m, l), n = d.moves.length;
      return `<div class="lrow" role="group" aria-label="${esc(l)}" data-l="${esc(l)}"><b class="lname">${esc(l)}</b>
        <input class="num" type="number" min="0" max="${C.MAX.eleves}" step="1" inputmode="numeric" data-f="n" value="${esc(d.n)}" aria-label="${esc(l)} : élèves présents tout le mois">
        <input class="num" type="number" min="0" max="${C.MAX.abs}" step="1" inputmode="numeric" data-f="abs" value="${esc(d.abs)}" aria-label="${esc(l)} : absences en demi-journées">
        <button type="button" class="icon-btn mvbtn" data-mv data-tip="Arrivée ou départ d'un élève en cours de mois" aria-label="${esc(l)} : arrivées et départs${n ? ' (' + n + ')' : ''}"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8.5" cy="8" r="3.2"/><path d="M2.5 20c0-3.4 2.7-6 6-6s6 2.6 6 6"/><path d="M17 6.5h4.5m0 0-1.8-1.8M21.5 6.5l-1.8 1.8M21.5 13H17m0 0 1.8-1.8M17 13l1.8 1.8"/></svg>${n ? `<span class="badge" aria-hidden="true">${n}</span>` : ''}</button>
      </div>`;
    }).join('');
  }

  // --- Résultat (met à jour sans toucher aux champs de saisie)
  let announceT = null;
  function results() {
    const k = S.month, { D, rows: rs, tot } = C.compute(S, k), ok = rs.length && tot.poss, pres = ok ? C.fmt(100 - tot.pct) : '–';
    $('bigPct').textContent = pres + (ok ? ' %' : '');
    $('meter').style.width = ok ? (100 - tot.pct).toFixed(1) + '%' : '0';
    $('tabPct').textContent = ok ? pres + ' %' : '';
    $('resCap').textContent = rs.map(r => r.l).join(' ');
    $('stats').innerHTML = [['Possible', tot.poss], ['Présent', tot.real], ['Absent', tot.abs], ['Demi-j.', D]].map(([a, b]) => `<div><dt>${a}</dt><dd>${b}</dd></div>`).join('');
    const tr = (r, c) => `<tr class="${c || ''}"><td>${esc(r.l)}</td><td>${r.poss}</td><td${r.abs > r.poss ? ' class="warn"' : ''}>${r.abs}</td><td>${r.poss ? C.fmt(100 - r.pct) : '–'} %</td></tr>`;
    $('res').innerHTML = '<tr><th scope="col">Niveau</th><th scope="col">Possibles</th><th scope="col">Absences</th><th scope="col">% présents</th></tr>' +
      (rs.length ? rs.map(r => tr(r)).join('') + (rs.length > 1 ? tr(tot, 'tot') : '') : '<tr><td colspan="4" class="empty">Aucun niveau.</td></tr>');
    document.querySelectorAll('.lrow').forEach(row => {
      const r = rs.find(x => x.l === row.dataset.l), bad = !!r && r.abs > r.poss;
      row.querySelectorAll('input').forEach(i => bad ? i.setAttribute('aria-invalid', 'true') : i.removeAttribute('aria-invalid'));
      row.title = bad ? 'Les absences dépassent les présences possibles : vérifiez la saisie.' : '';
    });
    calTxt();
    const cu = C.cumul(S);
    $('recap').innerHTML = '<tr><th scope="col">Mois</th><th scope="col">Demi-j.</th><th scope="col">Possibles</th><th scope="col">Absences</th><th scope="col">% présents</th></tr>' +
      (cu.rows.length ? cu.rows.map(r => `<tr><td>${esc(C.mlabel(r.mk))}</td><td>${r.D}</td><td>${r.poss}</td><td>${r.abs}</td><td>${C.fmt(100 - r.pct)} %</td></tr>`).join('') +
        `<tr class="tot"><td>Année</td><td></td><td>${cu.tot.poss}</td><td>${cu.tot.abs}</td><td>${C.fmt(100 - cu.tot.pct)} %</td></tr>`
        : '<tr><td colspan="5" class="empty">Les mois saisis apparaîtront ici.</td></tr>');
    $('recapLv').hidden = cu.levels.length < 2;
    $('recapLv').innerHTML = '<tr><th scope="col">Niveau (année)</th><th scope="col">Possibles</th><th scope="col">Absences</th><th scope="col">% présents</th></tr>' +
      cu.levels.map(r => `<tr><td>${esc(r.l)}</td><td>${r.poss}</td><td>${r.abs}</td><td>${r.poss ? C.fmt(100 - r.pct) : '–'} %</td></tr>`).join('');
    clearTimeout(announceT);
    if (userTyped) announceT = setTimeout(() => { $('announce').textContent = ok ? `${C.mlabel(k)} : ${pres} % de présents.` : ''; }, 1000);
  }
  let userTyped = false;
  const refresh = () => { head(); rows(); results(); showTab(tab); };

  // --- Onglets : sur grand écran, Saisie et Résultat s'affichent ensemble
  const wide = matchMedia('(min-width: 900px)');
  function showTab(t) {
    tab = t;
    const eff = wide.matches && t === 'resultat' ? 'saisie' : t;
    $('p-saisie').hidden = eff !== 'saisie';
    $('p-resultat').hidden = !(eff === 'resultat' || (wide.matches && eff === 'saisie'));
    $('p-annee').hidden = eff !== 'annee';
    $('views').classList.toggle('two', wide.matches && eff === 'saisie');
    $('t-resultat').hidden = wide.matches;
    ['saisie', 'resultat', 'annee'].forEach(x => $('t-' + x).setAttribute('aria-selected', String(x === eff)));
  }
  ['saisie', 'resultat', 'annee'].forEach(x => { $('t-' + x).onclick = () => showTab(x); });
  wide.addEventListener('change', () => showTab(tab));

  // --- Mois et année
  function goMonth(k) { S.month = k; save(); refresh(); }
  function go(d) { const ms = Cal.schoolMonths(S.year), i = ms.indexOf(S.month) + d; if (i >= 0 && i < ms.length) goMonth(ms[i]); }
  $('prev').onclick = () => go(-1);
  $('next').onclick = () => go(1);
  $('month').onchange = e => goMonth(e.target.value);
  $('year').onchange = e => { S.year = e.target.value; goMonth(Cal.schoolMonths(S.year)[0]); };

  // --- Saisie rapide : sélection au focus, Entrée = champ suivant
  const nums = () => [...document.querySelectorAll('#rows input.num')];
  $('rows').addEventListener('focusin', e => { if (e.target.matches('input.num')) e.target.select(); });
  $('rows').addEventListener('keydown', e => {
    if (e.key !== 'Enter' || !e.target.matches('input.num')) return;
    e.preventDefault();
    const all = nums(), nx = all[all.indexOf(e.target) + 1];
    if (nx) nx.focus(); else e.target.blur();
  });
  $('rows').oninput = e => {
    const t = e.target, row = t.closest('.lrow');
    if (!row || !t.dataset.f) return;
    C.lvData(own(), row.dataset.l)[t.dataset.f] = clamp(t.value, t.dataset.f === 'n' ? C.MAX.eleves : C.MAX.abs);
    userTyped = true; save(); results();
  };
  $('rows').onclick = e => {
    if (e.target.closest('[data-pick]')) return openLv();
    const b = e.target.closest('[data-mv]');
    if (b) { mvLevel = b.closest('.lrow').dataset.l; mvUI(); $('dlgMv').showModal(); }
  };

  // --- Fenêtre niveaux
  function lvUI() {
    const m = view(), chip = l => `<label><input type="checkbox" value="${esc(l)}"${m.levels.includes(l) ? ' checked' : ''}><span>${esc(l)}</span></label>`;
    $('levels').innerHTML = C.MAIN_LEVELS.map(chip).join('');
    $('extraBox').innerHTML = C.EXTRA_LEVELS.map(chip).join('');
  }
  function openLv() { lvUI(); $('dlgLv').showModal(); }
  $('lvBtn').onclick = openLv;
  $('dlgLv').onchange = () => {
    const on = new Set([...document.querySelectorAll('#dlgLv input:checked')].map(i => i.value));
    own().levels = C.LEVELS.filter(l => on.has(l));
    save(); rows(); results();
  };

  // --- Fenêtre arrivées / départs d'un niveau
  function mvUI() {
    const m = view(), k = S.month, d = C.lvData(m, mvLevel);
    $('mv-title').textContent = `${mvLevel} : arrivées et départs`;
    $('mvList').innerHTML = d.moves.map((mv, i) => `<div class="mv" data-i="${i}">
      <select data-k="t" aria-label="Arrivée ou départ"><option value="a"${mv.t === 'a' ? ' selected' : ''}>Arrivé(e) le</option><option value="d"${mv.t === 'd' ? ' selected' : ''}>Parti(e) le</option></select>
      <input type="date" data-k="date" value="${esc(mv.date)}" min="${k}-01" max="${k}-${Cal.daysInMonth(k)}" aria-label="Date">
      <span class="hint" data-dj></span>
      <button type="button" class="btn ghost" data-del>Retirer</button></div>`).join('');
    mvHints();
  }
  function mvHints() {
    const m = view(), d = C.lvData(m, mvLevel);
    document.querySelectorAll('#mvList [data-dj]').forEach((sp, i) => {
      const mv = d.moves[i];
      sp.textContent = mv.date ? `= ${C.moveDJ(m, S.month, mv)} demi-journées` : 'Sans date : mois complet.';
    });
  }
  $('mvAdd').onclick = () => { const d = C.lvData(own(), mvLevel); if (d.moves.length < C.MAX.moves) d.moves.push({ t: 'a', date: '' }); save(); mvUI(); rows(); results(); };
  $('mvList').oninput = e => {
    const t = e.target, row = t.closest('[data-i]');
    if (!row) return;
    const mv = C.lvData(own(), mvLevel).moves[+row.dataset.i];
    if (t.dataset.k === 't') mv.t = t.value === 'd' ? 'd' : 'a';
    else mv.date = t.value.slice(0, 7) === S.month ? t.value : '';
    save(); mvHints(); results();
  };
  $('mvList').onclick = e => {
    const b = e.target.closest('[data-del]');
    if (!b) return;
    C.lvData(own(), mvLevel).moves.splice(+b.closest('[data-i]').dataset.i, 1);
    save(); mvUI(); rows(); results();
  };

  // --- Fenêtre calendrier du mois
  function radios(el, name, opts, val) {
    el.innerHTML = opts.map(([v, t]) => `<label><input type="radio" name="${esc(name)}" value="${esc(v)}"${v === val ? ' checked' : ''}><span>${esc(t)}</span></label>`).join('');
  }
  function calUI() {
    const m = view();
    radios($('zone'), 'zone', Cal.zonesOf(S.year).map(z => [z, Cal.zoneLabel(z)]), m.zone);
    radios($('rhythm'), 'rhythm', [['4', '4 jours'], ['4.5', '4,5 jours (mercredi matin)']], m.rhythm);
    $('offList').innerHTML = m.off.map((o, i) => `<div class="mv" data-o="${i}">
      <input type="date" data-ok="date" value="${esc(o.date)}" min="${S.month}-01" max="${S.month}-${Cal.daysInMonth(S.month)}" aria-label="Date du jour sans classe">
      <input type="text" data-ok="label" value="${esc(o.label)}" maxlength="${C.MAX.label}" placeholder="Motif (facultatif)" aria-label="Motif">
      <button type="button" class="btn ghost" data-odel="${i}">Retirer</button>
      <span class="hint bad" data-oerr hidden>Date hors du mois.</span></div>`).join('');
    daysUI();
  }
  function daysUI() {
    const m = view(), c = C.compute(S, S.month);
    if (document.activeElement !== $('days')) $('days').value = c.D;
    $('autoNote').textContent = c.manual ? `Calcul automatique : ${c.auto}.` : 'Calculé selon le mois, la zone et le rythme. Modifiable.';
    $('reset').hidden = !c.manual;
    const off = m.off.filter(o => o.date), fer = Cal.feriesOf(S.month, m.zone);
    $('offNote').textContent = [
      off.length ? `${off.length} jour${off.length > 1 ? 's' : ''} retiré${off.length > 1 ? 's' : ''} : ` + off.map(o => dfr(o.date) + (o.label ? ' (' + o.label + ')' : '')).join(', ') + '.' : '',
      Cal.zonesOf(S.year).includes(m.zone) ? '' : 'Calendrier ' + m.zone + ' non communiqué pour cette année : zone A utilisée.',
      fer.length ? 'Fériés : ' + fer.map(f => dfr(f.date) + ' (' + f.label + ')').join(', ') + '.' : ''
    ].filter(Boolean).join(' ');
  }
  const calUpdate = () => { save(); daysUI(); results(); };
  $('calBtn').onclick = () => { calUI(); $('dlgCal').showModal(); };
  $('zone').onchange = e => { own().zone = e.target.value; calUpdate(); };
  $('rhythm').onchange = e => { own().rhythm = e.target.value; calUpdate(); };
  function setDays(v) {
    const m = own(), n = clamp(v, C.MAX.days);
    m.days = n === '' ? null : n;
    if (m.days === C.compute(S, S.month).auto) m.days = null;
    calUpdate();
  }
  $('days').oninput = e => setDays(e.target.value);
  $('days').onblur = () => daysUI();
  $('dm').onclick = () => { $('days').value = Math.max(0, (+$('days').value || 0) - 1); setDays($('days').value); };
  $('dp').onclick = () => { $('days').value = Math.min(C.MAX.days, (+$('days').value || 0) + 1); setDays($('days').value); };
  $('reset').onclick = () => { own().days = null; calUpdate(); };
  $('offAdd').onclick = () => {
    const m = own();
    if (m.off.length >= C.MAX.off) return;
    m.off.push({ date: '', label: '' });
    calUI();
    $('offList').lastElementChild.querySelector('input').focus();
  };
  $('offList').oninput = e => {
    const t = e.target, row = t.closest('[data-o]');
    if (!row) return;
    const o = own().off[+row.dataset.o];
    if (t.dataset.ok === 'label') o.label = t.value.slice(0, C.MAX.label);
    else {
      const okDate = !t.value || (t.value.slice(0, 7) === S.month && !own().off.some(x => x !== o && x.date === t.value));
      row.querySelector('[data-oerr]').hidden = okDate;
      row.querySelector('[data-oerr]').textContent = t.value.slice(0, 7) === S.month ? 'Date déjà saisie.' : 'Date hors du mois.';
      o.date = okDate ? t.value : '';
    }
    calUpdate();
  };
  $('offList').onclick = e => {
    const b = e.target.closest('[data-odel]');
    if (!b) return;
    own().off.splice(+b.dataset.odel, 1);
    calUI(); calUpdate();
  };

  // --- Fenêtres : fermeture (bouton, clic à côté) ; la saisie est rafraîchie à la fermeture
  document.querySelectorAll('dialog').forEach(d => {
    d.addEventListener('click', e => { if (e.target === d || e.target.closest('[data-close]')) d.close(); });
  });
  $('dlgCal').addEventListener('close', () => { rows(); results(); });
  $('dlgMv').addEventListener('close', () => { rows(); results(); });

  // --- Copie, fichiers, import
  $('copy').onclick = async () => {
    const { D, rows: rs, tot } = C.compute(S, S.month), m = view();
    const line = r => `${r.l} : ${r.eff} élèves, ${r.poss} présences possibles, ${r.abs} absences, ${r.real} présences, ${r.poss ? C.fmt(100 - r.pct) : '–'} % de présents`;
    const off = m.off.filter(o => o.date);
    const txt = `${C.mlabel(S.month)} (${D} demi-journées de classe)\n` + rs.map(line).join('\n') + (rs.length > 1 ? '\n' + line(tot) : '') +
      (off.length ? '\nJours sans classe retirés : ' + off.map(o => dfr(o.date) + (o.label ? ' (' + o.label + ')' : '')).join(', ') : '');
    try { await navigator.clipboard.writeText(txt); $('copied').textContent = 'Copié.'; }
    catch (e) { $('copied').textContent = 'Copie refusée : sélectionnez le tableau à la main.'; }
  };
  let dl = null;
  try { window.claude.use('downloads').then(x => { dl = x; }).catch(() => {}); } catch (e) { /* hors artifact */ }
  function download(filename, data, type) {
    const msg = t => { $('fileMsg').textContent = t; };
    if (dl) return dl.save({ filename, data }).then(() => msg('Fichier enregistré.'))
      .catch(x => msg(x && x.code === 'declined' ? 'Enregistrement annulé.' : 'Enregistrement impossible ici.'));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([data], { type }));
    a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    msg('Fichier enregistré.');
  }
  $('save').onclick = () => download(`comptappel-${S.year}.json`, JSON.stringify(S, null, 1), 'application/json');
  $('pdf').onclick = () => {
    const b = Pdf.buildPdf(S, new Date().toLocaleDateString('fr-FR'));
    if (!b) { $('fileMsg').textContent = "Rien à exporter : saisissez d'abord un mois."; return; }
    download(`comptappel-${S.year}.pdf`, b, 'application/pdf');
  };
  let pending = null;
  $('loadBtn').onclick = () => $('load').click();
  $('load').onchange = e => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    f.text().then(t => {
      const o = JSON.parse(t);
      if (!o || typeof o !== 'object' || typeof o.months !== 'object') throw new Error('format');
      pending = C.normalize(o);
      const n = Object.keys(pending.months).length;
      $('importTxt').textContent = `${n} mois trouvé${n > 1 ? 's' : ''} dans « ${f.name} ». Remplacer toute la saisie actuelle ?`;
      $('importAsk').hidden = false; $('fileMsg').textContent = '';
      $('importOk').focus();
    }).catch(() => { $('fileMsg').textContent = 'Fichier non reconnu.'; });
  };
  const closeAsk = t => { pending = null; $('importAsk').hidden = true; $('fileMsg').textContent = t; $('loadBtn').focus(); };
  $('importOk').onclick = () => { S = pending; save(); refresh(); closeAsk('Fichier chargé.'); };
  $('importNo').onclick = () => closeAsk('Chargement annulé.');

  // --- Affichage : thème, texte, animations, contraste (P, applyPrefs : scripts/prefs.js)
  const dlg = $('settings');
  const isDark = () => ROOT.dataset.theme ? ROOT.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  const themeBtn = () => { const t = isDark() ? 'Activer le mode clair' : 'Activer le mode sombre'; $('theme-toggle').setAttribute('aria-label', t); $('theme-toggle').title = t; };
  const savePrefs = () => { try { localStorage.setItem(PK, JSON.stringify(P)); } catch (e) { storeFail(); } applyPrefs(); themeBtn(); };
  function syncDlg() {
    for (const n of ['theme', 'text', 'motion']) {
      const v = String(P[n] || (n === 'text' ? '100' : 'auto')), r = dlg.querySelector(`input[name=${n}][value="${CSS.escape(v)}"]`);
      if (r) r.checked = true;
    }
    dlg.querySelector('input[name=contrast]').checked = P.contrast === true;
  }
  $('help-open').onclick = () => $('help').showModal();
  $('settings-open').onclick = () => { syncDlg(); dlg.showModal(); };
  $('settings-close').onclick = $('settings-x').onclick = () => dlg.close();
  dlg.onclick = e => { if (e.target === dlg) dlg.close(); };
  dlg.onchange = e => { const t = e.target; P[t.name] = t.type === 'checkbox' ? t.checked : t.value; if (P.text === '100') delete P.text; savePrefs(); };
  $('prefs-reset').onclick = () => { P = {}; savePrefs(); syncDlg(); };
  $('theme-toggle').onclick = () => { P.theme = isDark() ? 'light' : 'dark'; savePrefs(); };

  document.querySelectorAll('.top .icon-btn[aria-label]').forEach(b => { b.title = b.getAttribute('aria-label'); });
  themeBtn();
  refresh();
})();
