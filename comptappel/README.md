# Cahier d'appel

Calcul du pourcentage de présents et d'absents du cahier d'appel, par mois, pour la classe entière et par niveau (PS à CM2, TPS, ULIS, UPE2A, UEMA), avec cumul de l'année, export PDF et sauvegarde dans un fichier.

## Utiliser

Site 100 % statique, sans build ni dépendance :

```bash
python3 -m http.server 8080
```

Puis ouvrez `http://localhost:8080/comptappel/`. La saisie reste dans le navigateur ; enregistrez un fichier pour la retrouver ailleurs.

## Méthode de calcul

- Demi-journées de classe du mois : lundi à vendredi hors vacances de la zone et jours fériés ; mercredi = 1 demi-journée en rythme 4,5 jours, 0 en 4 jours. Les jours sans classe saisis (grève, fermeture…) sont retirés ; le total reste modifiable à la main.
- Présences possibles = élèves × demi-journées + demi-journées d'inscription des élèves arrivés (à partir du jour d'arrivée inclus) ou partis (jusqu'au jour du départ inclus, constante `DEPART_INCLUS` dans `scripts/core.js`).
- % absents = absences / possibles ; % présents = 100 − % absents. Cumul de l'année : somme des possibles et des absences de chaque mois.
- Chaque mois garde ses propres réglages (zone, rythme, niveaux, total, jours sans classe).

## Calendriers

Années 2026-2027 et 2027-2028 dans `scripts/calendar.js` (sources et date de vérification en tête du fichier). Le lundi de Pentecôte est compté sans classe.

Non gérés automatiquement : **Corse** (suit le calendrier de la zone A : choisissez la zone A), **Alsace-Moselle** (Vendredi saint, 26 décembre) et **outre-mer**. Ajoutez ces jours via « Jours sans classe ».

## Structure

```
index.html            Page
css/style.css         Styles
scripts/prefs.js      Préférences d'affichage (appliquées avant le rendu)
scripts/calendar.js   Calendriers et calcul des demi-journées
scripts/core.js       État, normalisation des données importées, calculs, cumul, migration
scripts/pdf.js        Génération du PDF (sans bibliothèque)
scripts/app.js        Interface
tests/                Contrôles : node comptappel/tests/run.js
```
