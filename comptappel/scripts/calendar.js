/* Calendriers scolaires (France métropolitaine, zones A, B, C) et calcul des demi-journées de classe.
 *
 * Format de chaque année :
 *   debut    : jour de la rentrée des élèves
 *   fin      : jour du départ en vacances d'été « après la classe » (inclus : il y a classe ce jour-là si c'est un jour ouvré)
 *   communes : vacances communes aux trois zones, [premier jour de vacances (samedi), jour de reprise (lundi matin)[
 *   zones    : vacances propres à chaque zone, même format
 *   feries   : jours fériés et ponts tombant un jour de semaine pendant l'année scolaire (aucune classe ces jours-là)
 *
 * 2026-2027 : arrêté du 22 octobre 2025 (JO du 23 octobre 2025).
 * 2027-2028 : arrêté du 21 juillet 2026 (JO du 23 juillet 2026).
 * Dates confirmées le 18 novembre 2026 sur les infographies officielles « Vacances scolaires 2026-2027 » et
 * « 2027-2028 » (Famille-Scolarité, Service-Public.fr), en plus du recoupement de plusieurs sources. À revérifier chaque année.
 * Corse : rentrée le 3 septembre 2026, vacances d'hiver et de printemps de la zone A ; Toussaint, Noël et été : dates
 * communes (cases vides sur l'infographie : hypothèse). 2027-2028 : Corse « non communiqué », donc absente de cette année.
 * Pour ajouter une année : copier un bloc, mettre à jour les dates (debutZone : rentrée propre à une zone).
 * Non gérés : Alsace-Moselle (Vendredi saint, 26 décembre), outre-mer.
 */
(function (root) {
  const A26 = [['2027-02-13', '2027-03-01'], ['2027-04-10', '2027-04-26']];
  const CALENDARS = {
    '2026-2027': {
      debut: '2026-09-01', fin: '2027-07-03',
      debutZone: { Corse: '2026-09-03' },
      communes: [['2026-10-17', '2026-11-02'], ['2026-12-19', '2027-01-04']],
      zones: {
        A: A26,
        B: [['2027-02-20', '2027-03-08'], ['2027-04-17', '2027-05-03']],
        C: [['2027-02-06', '2027-02-22'], ['2027-04-03', '2027-04-19']],
        Corse: A26
      },
      feries: [
        { date: '2026-11-11', label: 'Armistice' },
        { date: '2026-12-25', label: 'Noël' },
        { date: '2027-01-01', label: "Jour de l'an" },
        { date: '2027-03-29', label: 'Lundi de Pâques' },
        { date: '2027-05-06', label: 'Ascension' },
        { date: '2027-05-07', label: "Pont de l'Ascension" },
        { date: '2027-05-17', label: 'Lundi de Pentecôte' } // décision : pas d'élève, pas d'appel
      ]
    },
    '2027-2028': {
      debut: '2027-09-02', fin: '2028-07-04',
      communes: [['2027-10-23', '2027-11-08'], ['2027-12-18', '2028-01-03']],
      zones: {
        A: [['2028-02-19', '2028-03-06'], ['2028-04-22', '2028-05-09']],
        B: [['2028-02-05', '2028-02-21'], ['2028-04-08', '2028-04-24']],
        C: [['2028-02-12', '2028-02-28'], ['2028-04-15', '2028-05-02']]
      },
      feries: [
        { date: '2027-11-01', label: 'Toussaint' },
        { date: '2027-11-11', label: 'Armistice' },
        { date: '2028-04-17', label: 'Lundi de Pâques' },
        { date: '2028-05-01', label: 'Fête du travail' },
        { date: '2028-05-08', label: 'Victoire 1945' },
        { date: '2028-05-25', label: 'Ascension' },
        { date: '2028-05-26', label: "Pont de l'Ascension" },
        { date: '2028-06-05', label: 'Lundi de Pentecôte' }
      ]
    }
  };

  const daysInMonth = mk => new Date(Date.UTC(+mk.slice(0, 4), +mk.slice(5, 7), 0)).getUTCDate();

  // Mois d'une année scolaire : ['2026-09', ..., '2027-07']
  function schoolMonths(year) {
    const c = CALENDARS[year], out = [];
    let y = +c.debut.slice(0, 4), m = +c.debut.slice(5, 7);
    const end = c.fin.slice(0, 7);
    for (;;) {
      const k = y + '-' + String(m).padStart(2, '0');
      out.push(k);
      if (k >= end) return out;
      if (++m > 12) { m = 1; y++; }
    }
  }
  const yearOf = mk => Object.keys(CALENDARS).find(y => schoolMonths(y).includes(mk));

  // Demi-journées d'un jour : 2 (lundi, mardi, jeudi, vendredi), mercredi 1 si rythme 4,5 jours, 0 sinon ; 0 hors classe.
  function halfDays(year, date, zone, rhythm, ignoreFeries) {
    const c = CALENDARS[year];
    const w = new Date(date + 'T00:00:00Z').getUTCDay();
    if (w === 0 || w === 6 || date < ((c.debutZone && c.debutZone[zone]) || c.debut) || date > c.fin) return 0;
    if (!ignoreFeries && c.feries.some(f => f.date === date)) return 0;
    if (c.communes.concat(c.zones[zone] || c.zones.A).some(([a, b]) => date >= a && date < b)) return 0;
    return w === 3 ? (rhythm === '4.5' ? 1 : 0) : 2;
  }

  // Demi-journées de classe du mois. opts : from/to (bornes incluses, AAAA-MM-JJ), off (dates sans classe en plus).
  function autoDays(mk, zone, rhythm, opts) {
    const o = opts || {}, year = yearOf(mk);
    if (!year) return 0;
    const off = o.off || [];
    let t = 0;
    for (let d = 1, n = daysInMonth(mk); d <= n; d++) {
      const s = mk + '-' + String(d).padStart(2, '0');
      if ((o.from && s < o.from) || (o.to && s > o.to) || off.includes(s)) continue;
      t += halfDays(year, s, zone, rhythm);
    }
    return t;
  }

  // Fériés du mois qui auraient été un jour de classe (pour l'affichage)
  function feriesOf(mk, zone) {
    const year = yearOf(mk);
    return year ? CALENDARS[year].feries.filter(f => f.date.startsWith(mk) && halfDays(year, f.date, zone, '4.5', true) > 0) : [];
  }

  const zonesOf = year => Object.keys(CALENDARS[year].zones);
  const zoneLabel = z => (z === 'Corse' ? 'Corse' : 'Zone ' + z);
  const api = { CALENDARS, zonesOf, zoneLabel, schoolMonths, yearOf, halfDays, autoDays, feriesOf, daysInMonth };
  if (typeof module !== 'undefined') module.exports = api; else root.Calendrier = api;
})(this);
