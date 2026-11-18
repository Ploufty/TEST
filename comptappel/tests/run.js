// Lance tous les fichiers *.test.js : node comptappel/tests/run.js
const fs = require('fs'), path = require('path'), cp = require('child_process');
let failed = 0;
for (const f of fs.readdirSync(__dirname).filter(f => f.endsWith('.test.js')).sort()) {
  const r = cp.spawnSync(process.execPath, [path.join(__dirname, f)], { stdio: 'inherit' });
  if (r.status !== 0) { failed++; console.error(`ÉCHEC : ${f}`); }
}
console.log(failed ? `${failed} fichier(s) en échec` : 'Tous les tests passent.');
process.exit(failed ? 1 : 0);
