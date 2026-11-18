const assert = require('assert');
const fs = require('fs'), os = require('os'), path = require('path'), cp = require('child_process');
const C = require('../scripts/core.js');
const { buildPdf, textW, fit } = require('../scripts/pdf.js');
let n = 0;
const test = (name, fn) => { fn(); n++; };

const months = {};
for (const mk of ['2026-09', '2026-10', '2026-11', '2026-12', '2027-01', '2027-02', '2027-03', '2027-04', '2027-05', '2027-06', '2027-07']) {
  months[mk] = { zone: 'A', rhythm: '4', levels: ['TPS', 'PS', 'MS', 'GS', 'ULIS'], days: null, off: [],
    lv: { TPS: { n: 2, abs: 1 }, PS: { n: 8, abs: 12 }, MS: { n: 9, abs: 7 }, GS: { n: 10, abs: 3 }, ULIS: { n: 1, abs: 0 } } };
}
months['2026-10'].off = [{ date: '2026-10-12', label: 'Grève – œuvre « Noël » … 5 €' }];
months['2026-11'].levels = ['MS'];
const s = C.normalize({ version: 3, year: '2026-2027', months }, '2026-11-18');
const bytes = buildPdf(s, '18/11/2026');
const pdf = Buffer.from(bytes).toString('latin1');

test('rien à exporter → null', () => assert.strictEqual(buildPdf(C.normalize(null, '2026-11-18'), 'x'), null));
test('startxref pointe sur xref', () => {
  const x = +pdf.match(/startxref\n(\d+)\n%%EOF/)[1];
  assert.strictEqual(pdf.slice(x, x + 4), 'xref');
});
test('chaque offset d’objet pointe sur « N 0 obj »', () => {
  const x = +pdf.match(/startxref\n(\d+)/)[1];
  const [, count] = pdf.slice(x).match(/xref\n0 (\d+)\n/);
  const entries = pdf.slice(x).split('\n').slice(3, 2 + +count);
  assert.strictEqual(entries.length, count - 1);
  entries.forEach((e, i) => { const off = +e.slice(0, 10); assert.strictEqual(pdf.slice(off, off + `${i + 1} 0 obj`.length), `${i + 1} 0 obj`); });
  assert.ok(new RegExp(`/Size ${count}/Root 1 0 R/Info 5 0 R`).test(pdf));
});
test('/Length exact pour chaque flux', () => {
  const re = /<<\/Length (\d+)>>\nstream\n/g;
  let m, k = 0;
  while ((m = re.exec(pdf))) {
    const start = m.index + m[0].length, len = +m[1];
    assert.strictEqual(pdf.slice(start + len, start + len + 10), '\nendstream');
    k++;
  }
  assert.ok(k >= 2, 'au moins deux pages attendues');
});
test('dictionnaire Info et titre = année de l’état', () => {
  assert.ok(pdf.includes("/Title(ComptAppel 2026-2027)"));
  assert.ok(pdf.includes("/Creator(ComptAppel)"));
});
test('CP1252 : œ € – … « » ’ encodés', () => {
  assert.ok(pdf.includes('\x96 \x9cuvre \xab No\xebl \xbb \x85 5 \x80'));
});
test('largeurs : chiffres exacts, gras plus large, troncature', () => {
  assert.strictEqual(textW('0123456789', 1000, 0), 5560);
  assert.strictEqual(textW('12,5 %', 1000, 0), 556 * 3 + 278 + 278 + 889);
  assert.ok(textW('Niveau', 10, 1) > textW('Niveau', 10, 0));
  const t = fit('Septembre 2026 très très long libellé', 9.5, 1, 60);
  assert.ok(textW(t, 9.5, 1) <= 60 && t.endsWith('…'));
});
test('pages numérotées « Page n / N »', () => {
  const pages = +pdf.match(/\/Count (\d+)/)[1];
  assert.ok(pages >= 2);
  for (let i = 1; i <= pages; i++) assert.ok(pdf.includes(`(Page ${i} / ${pages})`));
});
let hasPdftotext = true;
try { cp.execFileSync('pdftotext', ['-v'], { stdio: 'ignore' }); } catch (e) { hasPdftotext = false; }
if (hasPdftotext) test('pdftotext : accents et contenu', () => {
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'appel-')), 'a.pdf');
  fs.writeFileSync(f, bytes);
  const txt = cp.execFileSync('pdftotext', ['-layout', f, '-']).toString('utf8');
  for (const w of ['Année scolaire 2026-2027', 'Élèves', 'Présences', '% présents', 'Février 2027', 'œuvre « Noël » … 5 €', "Cumul de l'année", 'ULIS', 'TPS', 'jour sans classe retiré']) assert.ok(txt.includes(w), w);
  // un tableau par mois avec ses propres niveaux : novembre n'a que MS
  const nov = txt.slice(txt.indexOf('Novembre 2026'), txt.indexOf('Décembre 2026'));
  assert.ok(nov.includes('MS') && !nov.includes('ULIS'));
});
else console.log('pdftotext absent : contrôle des accents ignoré');
console.log(`pdf : ${n} tests OK`);
