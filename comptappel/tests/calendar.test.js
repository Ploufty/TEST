// Demi-journées attendues, comptées à la main sur le calendrier officiel (jours lun-ven hors vacances et fériés).
const assert = require('assert');
const Cal = require('../scripts/calendar.js');
let n = 0;
const test = (name, fn) => { fn(); n++; };

// [rythme 4 jours, rythme 4,5 jours] par zone A, B, C
const EXPECTED = {
  '2026-09': { A: [34, 39], B: [34, 39], C: [34, 39], Corse: [32, 36] }, // rentrée mardi 1er ; Corse jeudi 3/09
  '2026-10': { A: [20, 22], B: [20, 22], C: [20, 22] }, // Toussaint dès le samedi 17
  '2026-11': { A: [34, 37], B: [34, 37], C: [34, 37] }, // reprise lundi 2, 11 novembre (mercredi)
  '2026-12': { A: [22, 25], B: [22, 25], C: [22, 25] }, // Noël dès le samedi 19
  '2027-01': { A: [32, 36], B: [32, 36], C: [32, 36] }, // reprise lundi 4
  '2027-02': { A: [16, 18], B: [24, 27], C: [16, 18], Corse: [16, 18] }, // hiver A 13/02, B 20/02, C 6/02 → 22/02 ; Corse = A
  '2027-03': { A: [34, 39], B: [26, 30], C: [34, 39] }, // B reprend le 8 ; lundi de Pâques 29
  '2027-04': { A: [20, 22], B: [20, 22], C: [20, 22], Corse: [20, 22] }, // printemps A 10-26, B 17-3/05, C 3-19
  '2027-05': { A: [28, 32], B: [28, 32], C: [28, 32] }, // Ascension 6, pont 7, Pentecôte 17
  '2027-06': { A: [34, 39], B: [34, 39], C: [34, 39] },
  '2027-07': { A: [4, 4], B: [4, 4], C: [4, 4] },       // jeudi 1er et vendredi 2
  '2027-09': { A: [34, 38] },                             // rentrée jeudi 2 septembre 2027
  '2027-10': { A: [26, 29] },
  '2028-02': { B: [18, 20] },                             // hiver B 5 → 21 février
  '2028-05': { A: [22, 26], B: [28, 33] },                // A reprend mardi 9 ; 1er et 8 mai ; Ascension 25, pont 26
  '2028-07': { A: [4, 4] }                                // lundi 3 et mardi 4 (départ après la classe)
};
for (const [mk, zones] of Object.entries(EXPECTED)) for (const [z, [d4, d45]] of Object.entries(zones)) {
  test(`${mk} zone ${z}`, () => {
    assert.strictEqual(Cal.autoDays(mk, z, '4'), d4, `${mk} ${z} 4 jours`);
    assert.strictEqual(Cal.autoDays(mk, z, '4.5'), d45, `${mk} ${z} 4,5 jours`);
  });
}
test('toute l’année 2026-2027 couverte', () => {
  assert.deepStrictEqual(Cal.schoolMonths('2026-2027'), Object.keys(EXPECTED).filter(k => k < '2027-08'));
});
test('Pentecôte : jour sans classe', () => assert.strictEqual(Cal.halfDays('2026-2027', '2027-05-17', 'A', '4'), 0));
test('jours sans classe ajoutés', () => {
  assert.strictEqual(Cal.autoDays('2026-10', 'A', '4', { off: ['2026-10-12', '2026-10-14'] }), 18); // lundi retiré, mercredi déjà 0
  assert.strictEqual(Cal.autoDays('2026-10', 'A', '4.5', { off: ['2026-10-12', '2026-10-14'] }), 19);
});
test('fériés affichés', () => {
  assert.deepStrictEqual(Cal.feriesOf('2027-05', 'A').map(f => f.date), ['2027-05-06', '2027-05-07', '2027-05-17']);
  assert.deepStrictEqual(Cal.feriesOf('2028-05', 'A').map(f => f.date), ['2028-05-25', '2028-05-26']); // 1er et 8 mai en vacances
});
console.log(`calendar : ${n} tests OK`);
