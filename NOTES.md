# Notes de suivi — Randomizer

Dernière mise à jour : 21/09/2026, branche `claude/multi-tirage-onglets`.

## État actuel

- Onglet **Noms** : tirage au sort d'une liste, import `.txt`, durée réglable, option "retirer le nom tiré", confettis.
- Onglet **Dés** : 1 à 6 dés, 3 styles (Points, Chiffres, Doigts — images fournies par l'utilisateur dans `assets/dice-hands/`), valeur max adaptée au style, animation de chute/rebond, taille des tuiles dynamique selon le nombre de dés, bordure bleue outline.
- Fonctionnalités transverses : historique des tirages (Noms + Dés mêlés), plein écran (bouton + raccourci `F`), raccourcis clavier (`Espace`/`Entrée` pour lancer, `Échap` pour quitter le plein écran), bandeau de notifications transitoire, pied de page crédit "Mission numérique 76".

## Demandé par l'utilisateur pour la prochaine session

1. **Revoir le graphisme général de l'appli** (pas seulement les dés) — passe de cohérence visuelle à prévoir.
2. **Dés** : retravailler le visuel et harmoniser les tailles (actuellement dynamique selon le nombre de dés, mais l'utilisateur veut repasser dessus — probablement harmoniser avec le reste de l'interface, vérifier la cohérence entre les 3 styles).
3. **Continuer le développement** des onglets restants : **Images** et **Sons**, discutés en amont (voir feasibility ci-dessous).
4. Poursuivre en pensant à l'ensemble des onglets, pas seulement Dés/Noms — veiller à ce que l'architecture reste cohérente en ajoutant Images/Sons.

## Rappel de faisabilité (déjà discuté)

- **Images** : import multi-fichiers local (`<input type="file" multiple accept="image/*">`), tirage aléatoire, pas de sauvegarde entre sessions (réimport à chaque fois, décision déjà validée par l'utilisateur).
- **Sons** : import de dossier (`webkitdirectory`, non supporté Safari → prévoir un repli par sélection multiple de fichiers), lecture via `<audio>`, même limite de persistance que les images.
- Import "depuis un dossier en ligne via manifeste" : **écarté** par l'utilisateur, à ne pas faire.

## Suggestions personnelles pour la reprise

- Avant d'ajouter Images/Sons, envisager de **factoriser** le code partagé (historique, confettis, structure d'onglet) pour éviter de dupliquer la logique une 3e et 4e fois — le fichier `scripts/randomizer.js` commence à être long et mélange plusieurs domaines.
- Pour l'harmonisation visuelle des dés : clarifier avec l'utilisateur si le souci porte sur la taille du texte/pips à l'intérieur des tuiles, la cohérence entre les 3 styles (Points/Chiffres/Doigts n'ont pas le même poids visuel), ou autre chose précis avant de retoucher.
- Envisager une revue d'accessibilité rapide une fois les 4 onglets en place (contrastes, focus clavier, aria-live) plutôt qu'au fil de l'eau.
- Cette branche (`claude/multi-tirage-onglets`) n'est pas encore fusionnée dans `main` — à faire quand l'utilisateur jugera l'ensemble stable.
