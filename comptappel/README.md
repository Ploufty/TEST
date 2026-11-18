# ComptAppel

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

**Corse** : gérée pour 2026-2027 (rentrée le 3 septembre, vacances d'hiver et de printemps de la zone A ; Toussaint, Noël et été supposés communs, cases vides sur l'infographie officielle). Pour 2027-2028 le calendrier Corse est « non communiqué » : la zone A est utilisée en attendant.

Non gérés automatiquement : **Alsace-Moselle** (Vendredi saint, 26 décembre) et **outre-mer**. Ajoutez ces jours via « Jours sans classe ».

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

## Intégration dans Apps1D76

Copier ce dossier sous `Outils/comptappel/` (fiche `outil.json` incluse), puis `npm run generer`. L'icône maison de l'en-tête renvoie vers `../../index.html` (accueil) et le pied de page vers `../../accessibilite.html` : ces deux liens ne fonctionnent qu'une fois le dossier à cet emplacement.
