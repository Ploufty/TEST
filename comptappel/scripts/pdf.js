/* PDF écrit à la main (A4, Helvetica / Helvetica-Bold, WinAnsiEncoding), sans bibliothèque. */
(function (root) {
  const isNode = typeof module !== 'undefined';
  const Core = isNode ? require('./core.js') : root.Core;
  const Cal = isNode ? require('./calendar.js') : root.Calendrier;

  // CP1252 : caractères hors Latin-1 placés en 0x80-0x9F
  const CP1252 = {
    '€': 0x80, '‚': 0x82, 'ƒ': 0x83, '„': 0x84, '…': 0x85, '†': 0x86, '‡': 0x87, 'ˆ': 0x88, '‰': 0x89, 'Š': 0x8A, '‹': 0x8B, 'Œ': 0x8C, 'Ž': 0x8E,
    '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97, '˜': 0x98, '™': 0x99, 'š': 0x9A, '›': 0x9B, 'œ': 0x9C, 'ž': 0x9E, 'Ÿ': 0x9F,
    ' ': 0x20, ' ': 0x20, ' ': 0x20
  };
  const code = c => { const n = c.charCodeAt(0); return CP1252[c] || (n < 256 && (n < 0x80 || n > 0x9F) ? n : 63); };

  // Largeurs approchées (/1000) : chiffres, espace, ponctuation et % exacts ; capitales et minuscules en moyenne ; gras +8 %.
  // ponytail: valeurs moyennes hors chiffres ; reprendre les tables AFM si le retour à la ligne des motifs longs dérive.
  const charW = (c, bold) => (/\d/.test(c) ? 556 : c === '%' ? 889 : /[ ,.:;·'’|!ilI]/.test(c) ? 278 : /[MW]/.test(c) ? 850 : /[A-ZÀ-ÖØ-Þ]/.test(c) ? 670 : /[mwœ–—…]/.test(c) ? 780 : 520) * (bold ? 1.08 : 1);
  const textW = (s, z, bold) => [...String(s)].reduce((a, c) => a + charW(c, bold), 0) * z / 1000;
  const enc = s => [...String(s)].map(c => String.fromCharCode(code(c))).join('').replace(/[\\()]/g, '\\$&');
  // Tronque avec « … » pour tenir dans maxW
  function fit(s, z, bold, maxW) {
    s = String(s);
    if (textW(s, z, bold) <= maxW) return s;
    while (s && textW(s + '…', z, bold) > maxW) s = s.slice(0, -1);
    return s + '…';
  }
  function wrap(s, z, bold, maxW) {
    const lines = [];
    let cur = '';
    for (const w of String(s).split(' ')) {
      const t = cur ? cur + ' ' + w : w;
      if (cur && textW(t, z, bold) > maxW) { lines.push(cur); cur = w; } else cur = t;
    }
    if (cur) lines.push(fit(cur, z, bold, maxW));
    return lines;
  }

  const INK = '.137 .157 .259 rg', GREY = '.35 .38 .47 rg', BLUE = '.267 .322 .659 rg', MINT = '.753 .902 .871 rg', SOFT = '.91 .93 .95 rg';
  const TOP = 800, BOTTOM = 60, L = 40, R = 555, RH = 18;
  const pc = x => Core.fmt(x) + ' %';
  const dfr = d => d.slice(8) + '/' + d.slice(5, 7);
  const zr = s => (s.rhythm === '4' ? '4 jours' : '4,5 jours');

  // state : état normalisé ; today : 'JJ/MM/AAAA' pour le pied de page. Renvoie null s'il n'y a rien à exporter.
  function buildPdf(state, today) {
    const cum = Core.cumul(state);
    if (!cum.rows.length) return null;
    const pages = [[]];
    let y = TOP;
    const emit = t => pages[pages.length - 1].push(t);
    const need = h => { if (y - h < BOTTOM) { pages.push([]); y = TOP; } };
    const put = (x, t, z, bold, right, col) => emit(`BT ${col || INK} /F${bold ? 2 : 1} ${z} Tf ${(right ? x - textW(t, z, bold) : x).toFixed(2)} ${y.toFixed(2)} Td (${enc(t)}) Tj ET`);

    // Tableau quadrillé : bd = bords des colonnes ; rows = [{c:[...], b:1 pour la ligne grisée en gras}]
    const tableH = rows => RH * (rows.length + 1);
    function table(bd, head, rows) {
      const n = bd.length - 1, h = tableH(rows), w = bd[n] - bd[0], top = y;
      emit(`${MINT} ${bd[0]} ${top - RH} ${w} ${RH} re f`);
      rows.forEach((r, i) => { if (r.b) emit(`${SOFT} ${bd[0]} ${top - RH * (i + 2)} ${w} ${RH} re f`); });
      emit('.47 .52 .62 RG .6 w');
      for (let i = 0; i <= rows.length + 1; i++) emit(`${bd[0]} ${top - RH * i} m ${bd[n]} ${top - RH * i} l S`);
      bd.forEach(x => emit(`${x} ${top} m ${x} ${top - h} l S`));
      const line = (cells, i, b) => {
        y = top - RH * (i + 1) + 5.5;
        cells.forEach((c, j) => {
          const t = fit(c, 9.5, b, bd[j + 1] - bd[j] - 12);
          if (j) put(bd[j + 1] - 6, t, 9.5, b, 1); else put(bd[0] + 6, t, 9.5, b);
        });
      };
      line(head, 0, 1);
      rows.forEach((r, i) => line(r.c, i + 1, r.b));
      y = top - h;
    }

    put(L, "ComptAppel", 20, 1, 0, BLUE);
    y -= 22; put(L, 'Année scolaire ' + state.year, 12, 1);
    emit(`.91 .553 .404 RG 2.5 w ${L} ${y - 9} m 130 ${y - 9} l S`);
    y -= 10;

    const BD = [40, 130, 193, 263, 333, 403, 479, 555];
    for (const { mk } of cum.rows) {
      const { D, rows, tot, month: m } = Core.compute(state, mk);
      const trows = rows.map(r => ({ c: [r.l, r.eff, r.poss, r.abs, r.real, pc(r.pct), r.poss ? pc(100 - r.pct) : '–'] }));
      if (rows.length > 1) trows.push({ b: 1, c: [tot.l, tot.eff, tot.poss, tot.abs, tot.real, pc(tot.pct), pc(100 - tot.pct)] });
      const offTxt = m.off.length ? `${m.off.length} jour${m.off.length > 1 ? 's' : ''} sans classe retiré${m.off.length > 1 ? 's' : ''} : ` +
        m.off.map(o => dfr(o.date) + (o.label ? ' (' + o.label + ')' : '')).join(', ') : '';
      const offLines = offTxt ? wrap(offTxt, 9, 0, R - L) : [];
      need(30 + 16 + 8 + tableH(trows) + offLines.length * 12 + 4); // bloc du mois jamais coupé
      y -= 30; put(L, Core.mlabel(mk), 13, 1, 0, BLUE);
      put(R, `${D} demi-journées de classe${m.days !== null ? ' (saisie manuelle)' : ''}`, 9.5, 0, 1, GREY);
      y -= 16; put(L, fit(`${Cal.zoneLabel(m.zone)} · ${zr(m)} · niveaux : ${rows.map(r => r.l).join(' ')}`, 9.5, 0, R - L), 9.5, 0, 0, GREY);
      y -= 8;
      table(BD, ['Niveau', 'Élèves', 'Possibles', 'Absences', 'Présences', '% absents', '% présents'], trows);
      offLines.forEach(t => { y -= 12; put(L, t, 9, 0, 0, GREY); });
    }

    const crows = cum.rows.map(r => ({ c: [Core.mlabel(r.mk), r.D, r.poss, r.abs, pc(100 - r.pct)] }));
    crows.push({ b: 1, c: ['Année', '', cum.tot.poss, cum.tot.abs, pc(100 - cum.tot.pct)] });
    need(38 + tableH(crows));
    y -= 30; put(L, "Cumul de l'année", 13, 1, 0, BLUE); y -= 8;
    table([40, 200, 280, 380, 470, 555], ['Mois', 'Demi-j.', 'Possibles', 'Absences', '% présents'], crows);
    if (cum.levels.length > 1) {
      const lrows = cum.levels.map(r => ({ c: [r.l, r.poss, r.abs, r.poss ? pc(100 - r.pct) : '–'] }));
      need(38 + tableH(lrows));
      y -= 30; put(L, "Par niveau sur l'année", 13, 1, 0, BLUE); y -= 8;
      table([40, 200, 320, 440, 555], ['Niveau', 'Possibles', 'Absences', '% présents'], lrows);
    }

    pages.forEach((c, i) => {
      y = 28;
      const foot = (t, x, right) => c.push(`BT ${GREY} /F1 8 Tf ${(right ? x - textW(t, 8) : x).toFixed(2)} ${y} Td (${enc(t)}) Tj ET`);
      foot("ComptAppel · édité le " + today, L);
      foot(`Page ${i + 1} / ${pages.length}`, R, 1);
    });

    const o = [];
    o[1] = '<</Type/Catalog/Pages 2 0 R>>';
    o[2] = `<</Type/Pages/Kids[${pages.map((_, i) => `${6 + 2 * i} 0 R`).join(' ')}]/Count ${pages.length}>>`;
    o[3] = '<</Type/Font/Subtype/Type1/BaseFont/Helvetica/Encoding/WinAnsiEncoding>>';
    o[4] = '<</Type/Font/Subtype/Type1/BaseFont/Helvetica-Bold/Encoding/WinAnsiEncoding>>';
    o[5] = `<</Title(${enc("ComptAppel " + state.year)})/Creator(${enc("ComptAppel")})>>`;
    pages.forEach((c, i) => {
      const t = c.join('\n');
      o[6 + 2 * i] = `<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Resources<</Font<</F1 3 0 R/F2 4 0 R>>>>/Contents ${7 + 2 * i} 0 R>>`;
      o[7 + 2 * i] = `<</Length ${t.length}>>\nstream\n${t}\nendstream`;
    });
    let out = '%PDF-1.4\n';
    const off = [];
    for (let i = 1; i < o.length; i++) { off[i] = out.length; out += `${i} 0 obj\n${o[i]}\nendobj\n`; }
    const x = out.length;
    out += `xref\n0 ${o.length}\n0000000000 65535 f \n` + off.slice(1).map(v => String(v).padStart(10, '0') + ' 00000 n \n').join('') +
      `trailer\n<</Size ${o.length}/Root 1 0 R/Info 5 0 R>>\nstartxref\n${x}\n%%EOF\n`;
    return Uint8Array.from(out, c => c.charCodeAt(0));
  }

  const api = { buildPdf, textW, fit };
  if (isNode) module.exports = api; else root.Pdf = api;
})(this);
