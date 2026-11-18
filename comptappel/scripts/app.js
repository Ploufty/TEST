/* Interface. Toute valeur interpolée dans du HTML passe par esc(). */
(function () {
  const C = Core, Cal = Calendrier;
  const KEY = 'cahier-appel-v3', OLD_KEY = 'cahier-appel-v2';
  const $ = id => document.getElementById(id);
  const esc = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const dfr = d => d.slice(8) + '/' + d.slice(5, 7);
  const clamp = (v, max) => v === '' ? '' : Math.min(max, Math.max(0, Math.round(+v) || 0));

  // --- Stockage : en cas d'échec (lecture ou écriture), bandeau visible
  const storeFail = () => { $('storeWarn').hidden = false; };
  function readStore() {
    let raw = null;
    try { raw = localStorage.getItem(KEY) || localStorage.getItem(OLD_KEY); } catch (e) { storeFail(); return null; }
    try { return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { storeFail(); } }

  let S = C.normalize(readStore());
  let extraOpen = false;
  const view = () => C.viewMonth(S, S.month); // lecture (rendu)
  const own = () => C.ensureMonth(S, S.month);  // écriture : enregistre le mois

  // --- Rendu
  function radios(el, name, opts, val) {
    el.innerHTML = opts.map(([v, t]) => `<label><input type="radio" name="${esc(name)}" value="${esc(v)}"${v === val ? ' checked' : ''}><span>${esc(t)}</span></label>`).join('');
  }
  function head() {
    const ms = Cal.schoolMonths(S.year), i = ms.indexOf(S.month);
    $('yearBox').hidden = C.YEARS.length < 2;
    $('year').innerHTML = C.YEARS.map(y => `<option value="${esc(y)}"${y === S.year ? ' selected' : ''}>${esc(y)}</option>`).join('');
    $('month').innerHTML = ms.map(k => `<option value="${esc(k)}"${k === S.month ? ' selected' : ''}>${esc(C.mlabel(k))}</option>`).join('');
    $('prev').disabled = i <= 0; $('next').disabled = i >= ms.length - 1;
    $('brandYear').textContent = 'Pourcentage de présents, année ' + S.year;
    $('foot').textContent = `Cahier d'appel · Année scolaire ${S.year} · Saisie conservée dans ce navigateur`;
  }
  function calUI() {
    const m = view();
    radios($('zone'), 'zone', Cal.zonesOf(Cal.yearOf(S.month)).map(z => [z, Cal.zoneLabel(z)]), m.zone);
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
      Cal.zonesOf(Cal.yearOf(S.month)).includes(m.zone) ? '' : 'Calendrier ' + m.zone + ' non communiqué pour cette année : zone A utilisée.',
      fer.length ? 'Fériés : ' + fer.map(f => dfr(f.date) + ' (' + f.label + ')').join(', ') + '.' : ''
    ].filter(Boolean).join(' ');
  }
  function levelsUI() {
    const m = view(), chip = l => `<label><input type="checkbox" value="${esc(l)}"${m.levels.includes(l) ? ' checked' : ''}><span>${esc(l)}</span></label>`;
    $('levels').innerHTML = C.MAIN_LEVELS.map(chip).join('');
    $('extraBox').innerHTML = C.EXTRA_LEVELS.map(chip).join('');
    if (m.levels.some(l => C.EXTRA_LEVELS.includes(l))) extraOpen = true;
    $('extraBox').hidden = !extraOpen;
    $('extraBtn').setAttribute('aria-expanded', String(extraOpen));
  }
  const stepper = (id, f, label, val, max) => `<div class="fld"><label for="${id}">${label}</label><div class="step">
    <button type="button" class="stp" data-step="-1" aria-label="${label} : moins un">−</button>
    <input type="number" id="${id}" min="0" max="${max}" step="1" data-f="${f}" value="${esc(val)}" inputmode="numeric">
    <button type="button" class="stp" data-step="1" aria-label="${label} : plus un">+</button></div></div>`;
  function cards() {
    const m = view(), k = S.month;
    if (!m.levels.length) { $('cards').innerHTML = '<p class="empty">Cochez au moins un niveau dans la section Niveaux.</p>'; return; }
    $('cards').innerHTML = C.LEVELS.filter(l => m.levels.includes(l)).map(l => {
      const d = C.lvData(m, l), id = 'f-' + esc(l);
      return `<div class="lv" data-l="${esc(l)}"><h3>${esc(l)}</h3>
      <div class="row">${stepper(id + '-n', 'n', 'Élèves présents tout le mois', d.n, C.MAX.eleves)}${stepper(id + '-a', 'abs', 'Absences (demi-journées)', d.abs, C.MAX.abs)}</div>
      <div class="moves">${d.moves.map((mv, i) => `<div class="mv">
        <select data-m="${i}" data-k="t" aria-label="Arrivée ou départ"><option value="a"${mv.t === 'a' ? ' selected' : ''}>Arrivé(e) le</option><option value="d"${mv.t === 'd' ? ' selected' : ''}>Parti(e) le</option></select>
        <input type="date" data-m="${i}" data-k="date" value="${esc(mv.date)}" min="${k}-01" max="${k}-${Cal.daysInMonth(k)}" aria-label="Date">
        <span class="hint" data-dj="${i}"></span>
        <button type="button" class="btn ghost" data-del="${i}">Retirer</button></div>`).join('')}
        <div><button type="button" class="btn" data-add>+ Élève arrivé(e) ou parti(e) en cours de mois</button></div>
      </div>
      <p class="liveln" data-live="${esc(l)}"></p></div>`;
    }).join('');
  }

  let announceT = null, quiet = true;
  function results() {
    const k = S.month, { D, rows, tot, month: m } = C.compute(S, k), ok = rows.length && tot.poss;
    const pres = ok ? C.fmt(100 - tot.pct) : '–';
    $('sum').innerHTML = `<div class="sumhead"><div><div class="st">Appel – ${esc(C.mlabel(k))}</div><div class="hint">${esc(rows.map(r => r.l).join(' ') || 'Aucun niveau')}</div></div>
      <div class="card"><div class="pct">${pres} %</div><div class="lines"><b>Total</b><span>${D} demi-journées</span><span>Possible ${tot.poss}</span><span>Présent ${tot.real}</span><span>Absent ${tot.abs}</span></div></div></div>`;
    $('live').hidden = !rows.length;
    $('liveIn').innerHTML = `<b>${pres} %</b> <span>de présents · possible ${tot.poss} · absent ${tot.abs} · ${D} demi-j.</span>`;
    document.querySelectorAll('[data-dj]').forEach(sp => {
      const mv = C.lvData(m, sp.closest('.lv').dataset.l).moves[+sp.dataset.dj];
      sp.textContent = mv.date ? `= ${C.moveDJ(m, k, mv)} demi-journées` : 'Sans date : mois complet.';
    });
    document.querySelectorAll('[data-live]').forEach(p => {
      const r = rows.find(x => x.l === p.dataset.live);
      if (!r) return;
      const bad = r.abs > r.poss;
      p.className = 'liveln' + (bad ? ' bad' : '');
      p.innerHTML = bad ? 'Attention : les absences dépassent les présences possibles. Vérifiez la saisie.' :
        r.poss ? `<b>${C.fmt(100 - r.pct)} %</b> de présents · ${r.real} présences sur ${r.poss} possibles` : "Saisissez l'effectif pour voir le pourcentage.";
    });
    const th = '<tr><th scope="col">Niveau</th><th scope="col">Élèves</th><th scope="col">Demi-j. possibles</th><th scope="col">Absences</th><th scope="col">Présences</th><th scope="col">% absents</th><th scope="col">% présents</th></tr>';
    const tr = (r, c) => `<tr class="${c || ''}"><td>${esc(r.l)}</td><td>${r.eff}</td><td>${r.poss}</td><td${r.abs > r.poss ? ' class="warn"' : ''}>${r.abs}</td><td>${r.real}</td><td>${C.fmt(r.pct)} %</td><td>${r.poss ? C.fmt(100 - r.pct) : '–'} %</td></tr>`;
    $('res').innerHTML = th + (rows.length ? rows.map(r => tr(r)).join('') + (rows.length > 1 ? tr(tot, 'tot') : '') : '<tr><td colspan="7" class="empty">Aucun niveau.</td></tr>');

    const cu = C.cumul(S);
    $('recap').innerHTML = '<tr><th scope="col">Mois</th><th scope="col">Demi-j.</th><th scope="col">Possibles</th><th scope="col">Absences</th><th scope="col">% présents</th></tr>' +
      (cu.rows.length ? cu.rows.map(r => `<tr><td>${esc(C.mlabel(r.mk))}</td><td>${r.D}</td><td>${r.poss}</td><td>${r.abs}</td><td>${C.fmt(100 - r.pct)} %</td></tr>`).join('') +
        `<tr class="tot"><td>Année</td><td></td><td>${cu.tot.poss}</td><td>${cu.tot.abs}</td><td>${C.fmt(100 - cu.tot.pct)} %</td></tr>`
        : '<tr><td colspan="5" class="empty">Les mois saisis apparaîtront ici.</td></tr>');
    $('recapLv').hidden = cu.levels.length < 2;
    $('recapLv').innerHTML = '<tr><th scope="col">Niveau (année)</th><th scope="col">Possibles</th><th scope="col">Absences</th><th scope="col">% présents</th></tr>' +
      cu.levels.map(r => `<tr><td>${esc(r.l)}</td><td>${r.poss}</td><td>${r.abs}</td><td>${r.poss ? C.fmt(100 - r.pct) : '–'} %</td></tr>`).join('');

    // Annonce lecteur d'écran différée (1 s) : pas d'annonce à chaque frappe
    if (quiet) return;
    clearTimeout(announceT);
    announceT = setTimeout(() => { $('announce').textContent = ok ? `${C.mlabel(k)} : ${pres} % de présents.` : ''; }, 1000);
  }
  function refresh() { head(); calUI(); levelsUI(); cards(); results(); }
  const update = () => { save(); daysUI(); results(); };

  // --- Événements
  function goMonth(k) { S.month = k; extraOpen = false; save(); refresh(); }
  function go(d) { const ms = Cal.schoolMonths(S.year), i = ms.indexOf(S.month) + d; if (i >= 0 && i < ms.length) goMonth(ms[i]); }
  $('prev').onclick = () => go(-1);
  $('next').onclick = () => go(1);
  $('month').onchange = e => goMonth(e.target.value);
  $('year').onchange = e => { S.year = e.target.value; goMonth(Cal.schoolMonths(S.year)[0]); };
  $('zone').onchange = e => { own().zone = e.target.value; update(); };
  $('rhythm').onchange = e => { own().rhythm = e.target.value; update(); };

  function setDays(v) {
    const m = own(), n = clamp(v, C.MAX.days);
    m.days = n === '' ? null : n;
    if (m.days === C.compute(S, S.month).auto) m.days = null;
    update();
  }
  $('days').oninput = e => setDays(e.target.value);
  $('days').onblur = () => daysUI();
  $('dm').onclick = () => { $('days').value = Math.max(0, (+$('days').value || 0) - 1); setDays($('days').value); };
  $('dp').onclick = () => { $('days').value = Math.min(C.MAX.days, (+$('days').value || 0) + 1); setDays($('days').value); };
  $('reset').onclick = () => { own().days = null; update(); };

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
    update();
  };
  $('offList').onclick = e => {
    const b = e.target.closest('[data-odel]');
    if (!b) return;
    own().off.splice(+b.dataset.odel, 1);
    calUI(); update();
  };

  function onLevels() {
    const on = new Set([...document.querySelectorAll('#levels input:checked, #extraBox input:checked')].map(i => i.value));
    own().levels = C.LEVELS.filter(l => on.has(l));
    save(); cards(); results();
  }
  $('levels').onchange = onLevels;
  $('extraBox').onchange = onLevels;
  $('extraBtn').onclick = () => { extraOpen = !extraOpen; $('extraBox').hidden = !extraOpen; $('extraBtn').setAttribute('aria-expanded', String(extraOpen)); };

  $('cards').oninput = e => {
    const t = e.target, box = t.closest('.lv');
    if (!box) return;
    const d = C.lvData(own(), box.dataset.l);
    if (t.dataset.f) d[t.dataset.f] = clamp(t.value, t.dataset.f === 'n' ? C.MAX.eleves : C.MAX.abs);
    else if (t.dataset.m !== undefined) {
      const mv = d.moves[+t.dataset.m];
      if (t.dataset.k === 't') mv.t = t.value === 'd' ? 'd' : 'a';
      else mv.date = t.value.slice(0, 7) === S.month ? t.value : '';
    }
    save(); results();
  };
  $('cards').onclick = e => {
    const st = e.target.closest('[data-step]');
    if (st) {
      const i = st.parentNode.querySelector('input');
      i.value = Math.min(+i.max, Math.max(0, (+i.value || 0) + +st.dataset.step));
      i.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }
    const t = e.target.closest('button'), box = t && t.closest('.lv');
    if (!box) return;
    const d = C.lvData(own(), box.dataset.l);
    if ('add' in t.dataset) { if (d.moves.length < C.MAX.moves) d.moves.push({ t: 'a', date: '' }); }
    else if (t.dataset.del !== undefined) d.moves.splice(+t.dataset.del, 1);
    else return;
    save(); cards(); results();
  };

  $('copy').onclick = async () => {
    const { D, rows, tot } = C.compute(S, S.month), m = view();
    const line = r => `${r.l} : ${r.eff} élèves, ${r.poss} présences possibles, ${r.abs} absences, ${r.real} présences, ${r.poss ? C.fmt(100 - r.pct) : '–'} % de présents`;
    const off = m.off.filter(o => o.date);
    const txt = `${C.mlabel(S.month)} (${D} demi-journées de classe)\n` + rows.map(line).join('\n') + (rows.length > 1 ? '\n' + line(tot) : '') +
      (off.length ? '\nJours sans classe retirés : ' + off.map(o => dfr(o.date) + (o.label ? ' (' + o.label + ')' : '')).join(', ') : '');
    try { await navigator.clipboard.writeText(txt); $('copied').textContent = 'Copié.'; }
    catch (e) { $('copied').textContent = 'Copie refusée : sélectionnez le tableau à la main.'; }
  };

  // --- Fichiers : capacité « downloads » si présente (artifact), sinon Blob + lien
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
  $('save').onclick = () => download(`cahier-appel-${S.year}.json`, JSON.stringify(S, null, 1), 'application/json');
  $('pdf').onclick = () => {
    const b = Pdf.buildPdf(S, new Date().toLocaleDateString('fr-FR'));
    if (!b) { $('fileMsg').textContent = "Rien à exporter : saisissez d'abord un mois."; return; }
    download(`cahier-appel-${S.year}.pdf`, b, 'application/pdf');
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

  // --- Section active dans la navigation
  const links = [...document.querySelectorAll('.catnav a')];
  const setCurrent = id => links.forEach(a => a.getAttribute('href') === '#' + id ? a.setAttribute('aria-current', 'location') : a.removeAttribute('aria-current'));
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(x => { if (x.isIntersecting) setCurrent(x.target.id); }), { rootMargin: '-35% 0px -60% 0px' });
    document.querySelectorAll('main .panel').forEach(p => io.observe(p));
  }
  links.forEach(a => a.addEventListener('click', () => setCurrent(a.getAttribute('href').slice(1))));

  // --- Affichage : thème, texte, animations, contraste (P, applyPrefs : scripts/prefs.js)
  const dlg = $('settings');
  const isDark = () => ROOT.dataset.theme ? ROOT.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  const themeBtn = () => $('theme-toggle').setAttribute('aria-label', isDark() ? 'Activer le mode clair' : 'Activer le mode sombre');
  const savePrefs = () => { try { localStorage.setItem(PK, JSON.stringify(P)); } catch (e) { storeFail(); } applyPrefs(); themeBtn(); };
  function syncDlg() {
    for (const n of ['theme', 'text', 'motion']) {
      const v = String(P[n] || (n === 'text' ? '100' : 'auto')), r = dlg.querySelector(`input[name=${n}][value="${CSS.escape(v)}"]`);
      if (r) r.checked = true;
    }
    dlg.querySelector('input[name=contrast]').checked = P.contrast === true;
  }
  const hd = $('help');
  $('help-open').onclick = () => hd.showModal();
  $('help-close').onclick = $('help-x').onclick = () => hd.close();
  hd.onclick = e => { if (e.target === hd) hd.close(); };
  $('settings-open').onclick = () => { syncDlg(); dlg.showModal(); };
  $('settings-close').onclick = $('settings-x').onclick = () => dlg.close();
  dlg.onclick = e => { if (e.target === dlg) dlg.close(); };
  dlg.onchange = e => { const t = e.target; P[t.name] = t.type === 'checkbox' ? t.checked : t.value; if (P.text === '100') delete P.text; savePrefs(); };
  $('prefs-reset').onclick = () => { P = {}; savePrefs(); syncDlg(); };
  $('theme-toggle').onclick = () => { P.theme = isDark() ? 'light' : 'dark'; savePrefs(); };

  themeBtn();
  refresh();
  save();
  quiet = false;
})();
