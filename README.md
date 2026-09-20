# Randomizer — Tirage au sort

Petite application web statique pour tirer un nom au sort dans une liste (import `.txt`, durée de tirage réglable, animation avec confettis).

## Structure

```
index.html        Page principale
css/style.css      Styles
scripts/randomizer.js  Logique de l'application
icon.png           Icône / favicon
```

## Utiliser en local

Aucune dépendance ni build : servez le dossier avec n'importe quel serveur statique.

```bash
python3 -m http.server 8080
```

Puis ouvrez `http://localhost:8080`.

## Déployer

Le projet est 100% statique (HTML/CSS/JS) : il peut être déployé tel quel sur GitHub Pages, Netlify, Vercel, ou n'importe quel hébergeur de fichiers statiques.
