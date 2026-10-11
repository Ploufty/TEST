(function () {
  'use strict';
  qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];

  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s).replace(/([\;,":])/g, '\\$1'); };       // WiFi escaping
  var vc = function (s) { return String(s).replace(/([\;,])/g, '\\$1').replace(/\n/g, '\\n'); };

  // Each type: fields [id, label, input type, placeholder] and build() -> string ('' = incomplete)
  var TYPES = {
    url: { label: 'Lien', fields: [['u', 'Adresse du site', 'url', 'https://exemple.fr']],
      build: function (v) { var u = v.u.trim(); return u && !/^[a-z][a-z0-9+.-]*:/i.test(u) ? 'https://' + u : u; } },
    text: { label: 'Texte', fields: [['t', 'Message', 'textarea', '']],
      build: function (v) { return v.t; } },
    wifi: { label: 'Wi-Fi', fields: [['s', 'Nom du réseau (SSID)', 'text', ''], ['p', 'Mot de passe', 'text', ''], ['k', 'Sécurité', 'select', ['WPA', 'WEP', 'nopass']]],
      build: function (v) { return v.s ? 'WIFI:T:' + v.k + ';S:' + esc(v.s) + ';' + (v.k === 'nopass' ? '' : 'P:' + esc(v.p) + ';') + ';' : ''; } },
    contact: { label: 'Contact', fields: [['n', 'Nom complet', 'text', ''], ['o', 'Société', 'text', ''], ['f', 'Téléphone', 'tel', ''], ['m', 'E-mail', 'email', '']],
      build: function (v) {
        return v.n ? ['BEGIN:VCARD', 'VERSION:3.0', 'FN:' + vc(v.n), v.o && 'ORG:' + vc(v.o), v.f && 'TEL:' + vc(v.f), v.m && 'EMAIL:' + vc(v.m), 'END:VCARD'].filter(Boolean).join('\n') : '';
      } },
    mail: { label: 'E-mail', fields: [['a', 'Destinataire', 'email', ''], ['j', 'Objet', 'text', ''], ['b', 'Message', 'textarea', '']],
      build: function (v) { return v.a ? 'mailto:' + v.a + '?subject=' + encodeURIComponent(v.j) + '&body=' + encodeURIComponent(v.b) : ''; } },
    tel: { label: 'Téléphone', fields: [['n', 'Numéro', 'tel', '+33 6 00 00 00 00']],
      build: function (v) { return v.n ? 'tel:' + v.n.replace(/[^\d+]/g, '') : ''; } }
  };

  var type = 'url', svg = '', logoURL = '', timer;

  // ---- UI
  function renderTabs() {
    $('tabs').innerHTML = '';
    Object.keys(TYPES).forEach(function (k) {
      var b = document.createElement('button');
      b.textContent = TYPES[k].label; b.type = 'button';
      b.className = k === type ? 'on' : '';
      b.onclick = function () { type = k; renderTabs(); renderFields(); update(); };
      $('tabs').appendChild(b);
    });
  }
  function renderFields() {
    $('fields').innerHTML = '';
    TYPES[type].fields.forEach(function (f) {
      var l = document.createElement('label'), i;
      l.textContent = f[1];
      if (f[2] === 'textarea') i = document.createElement('textarea');
      else if (f[2] === 'select') {
        i = document.createElement('select');
        f[3].forEach(function (o) { i.add(new Option(o === 'nopass' ? 'Aucune' : o, o)); });
      } else { i = document.createElement('input'); i.type = f[2]; i.placeholder = f[3]; }
      i.dataset.f = f[0];
      l.appendChild(i); $('fields').appendChild(l);
    });
  }
  function values() {
    var v = {};
    $('fields').querySelectorAll('[data-f]').forEach(function (i) { v[i.dataset.f] = i.value; });
    return v;
  }

  // ---- QR rendering (SVG string is the single source; PNG is rasterized from it)
  function makeSVG(data) {
    var ec = logoURL ? 'H' : $('ec').value;
    var q = qrcode(0, ec); q.addData(data); q.make();
    var n = q.getModuleCount(), m = 4, size = n + 2 * m, fg = $('fg').value, bg = $('bg').value;
    var round = $('shape').value === 'round', cap = $('caption').value.trim();
    var capH = cap ? 3 : 0, h = size + capH;
    var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + size + ' ' + h + '" shape-rendering="' + (round ? 'auto' : 'crispEdges') + '">' +
      '<rect width="' + size + '" height="' + h + '" fill="' + bg + '"/><g fill="' + fg + '">';
    var logoN = logoURL ? Math.floor(n * 0.22) : 0, lo = Math.floor((n - logoN) / 2) - 1;
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) {
      if (!q.isDark(r, c)) continue;
      if (logoN && r >= lo && r < lo + logoN + 2 && c >= lo && c < lo + logoN + 2) continue; // clear zone for logo
      s += round ? '<circle cx="' + (c + m + .5) + '" cy="' + (r + m + .5) + '" r=".5"/>' : '<rect x="' + (c + m) + '" y="' + (r + m) + '" width="1.02" height="1.02"/>';
    }
    s += '</g>';
    if (logoN) s += '<image href="' + logoURL + '" x="' + (lo + m + 1) + '" y="' + (lo + m + 1) + '" width="' + logoN + '" height="' + logoN + '" preserveAspectRatio="xMidYMid meet"/>';
    if (cap) s += '<text x="' + size / 2 + '" y="' + (size + 1.4) + '" font-family="sans-serif" font-size="1.8" text-anchor="middle" fill="' + fg + '">' + cap.replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }) + '</text>';
    return s + '</svg>';
  }

  function update() {
    var data = TYPES[type].build(values());
    var ok = !!data;
    ['dlPng', 'dlSvg', 'copy', 'print'].forEach(function (id) { $(id).disabled = !ok; });
    if (!ok) { svg = ''; $('out').innerHTML = '<p class="empty">Remplissez le formulaire</p>'; return; }
    try { svg = makeSVG(data); $('out').innerHTML = svg; $('msg').textContent = ''; }
    catch (e) { svg = ''; $('out').innerHTML = '<p class="empty">Contenu trop long pour un QR code</p>'; ['dlPng', 'dlSvg', 'copy', 'print'].forEach(function (id) { $(id).disabled = true; }); }
  }

  function toPNG(cb, px) {
    var img = new Image(), vb = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/), w = px || 1024, h = Math.round(w * vb[2] / vb[1]);
    img.onload = function () {
      var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      cv.getContext('2d').drawImage(img, 0, 0, w, h); cv.toBlob(cb, 'image/png');
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
  function save(blob, name) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }
  var say = function (t) { $('msg').textContent = t; };

  $('dlPng').onclick = function () { toPNG(function (b) { save(b, 'qrcode.png'); }); };
  $('dlSvg').onclick = function () { save(new Blob([svg], { type: 'image/svg+xml' }), 'qrcode.svg'); };
  $('copy').onclick = function () {
    toPNG(function (b) {
      navigator.clipboard.write([new ClipboardItem({ 'image/png': b })]).then(function () { say('Copié !'); }, function () { say('Copie impossible, utilisez PNG.'); });
    }, 512);
  };
  $('print').onclick = function () {
    var w = window.open('', '_blank');
    if (!w) return say('Autorisez les pop-ups pour imprimer.');
    w.document.write('<title>QR code</title><body style="margin:0;display:grid;place-items:center;height:100vh">' + svg.replace('<svg ', '<svg style="width:80vmin" ') + '</body>');
    w.document.close(); w.focus(); w.print();
  };

  $('logo').onchange = function () {
    var f = this.files[0];
    if (!f) { logoURL = ''; return update(); }
    var r = new FileReader();
    r.onload = function () { logoURL = r.result; update(); };
    r.readAsDataURL(f);
  };

  document.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(update, 120); });
  renderTabs(); renderFields(); update();
})();
