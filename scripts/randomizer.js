(function() {
    var nameList = document.getElementById('nameList');
    var countBadge = document.getElementById('countBadge');
    var drawButton = document.getElementById('drawButton');
    var resultName = document.getElementById('resultName');
    var statusText = document.getElementById('statusText');
    var durationRange = document.getElementById('durationRange');
    var durationValue = document.getElementById('durationValue');
    var btnImport = document.getElementById('btnImport');
    var fileImport = document.getElementById('fileImport');
    var btnClear = document.getElementById('btnClear');
    var confettiLayer = document.getElementById('confettiLayer');
    var removeDrawnToggle = document.getElementById('removeDrawnToggle');
    var showCounterToggle = document.getElementById('showCounterToggle');
    var drawCounter = document.getElementById('drawCounter');
    var drawCounterValue = document.getElementById('drawCounterValue');
    var btnResetCounter = document.getElementById('btnResetCounter');
    var isRolling = false;
    var drawCount = 0;

    function bindAction(element, action) {
        var el = typeof element === 'string' ? document.querySelector(element) : element;
        if (!el) { return; }
        function handler(e) {
            e = e || window.event;
            if (e.type === 'keydown') {
                var key = e.which || e.keyCode;
                if (key !== 13 && key !== 32) { return; }
            }
            if (e.type === 'touchstart') {
                el._touchDone = true;
            } else if (e.type === 'click' && el._touchDone) {
                el._touchDone = false;
                if (e.preventDefault) { e.preventDefault(); }
                return false;
            }
            if (e.preventDefault) { e.preventDefault(); }
            action.call(el, e);
            return false;
        }
        el.addEventListener('click', handler, false);
        el.addEventListener('touchstart', handler, false);
        el.addEventListener('keydown', handler, false);
    }

    function parseNames() {
        var raw = nameList.value || '';
        var parts = raw.split(/[\n;,]+/);
        var names = [];
        var seen = {};
        var i, n, key;
        for (i = 0; i < parts.length; i++) {
            n = parts[i].replace(/^\s+|\s+$/g, '');
            key = n.toLowerCase();
            if (n && !seen[key]) {
                seen[key] = true;
                names.push(n);
            }
        }
        return names;
    }

    function removeNameFromList(name) {
        var names = parseNames();
        var key = name.toLowerCase();
        var i;
        for (i = 0; i < names.length; i++) {
            if (names[i].toLowerCase() === key) {
                names.splice(i, 1);
                break;
            }
        }
        nameList.value = names.join('\n');
        updateCount();
    }

    function updateCount() {
        var names = parseNames();
        countBadge.innerHTML = names.length + (names.length > 1 ? ' noms' : ' nom');
        try { localStorage.setItem('randomizer_names', nameList.value); } catch (e) {}
    }

    function updateDuration() {
        durationValue.innerHTML = durationRange.value;
    }

    function updateCounterDisplay() {
        drawCounterValue.innerHTML = drawCount;
        drawCounter.hidden = !showCounterToggle.checked;
    }

    function persistOptions() {
        try {
            localStorage.setItem('randomizer_remove_drawn', removeDrawnToggle.checked ? '1' : '0');
            localStorage.setItem('randomizer_show_counter', showCounterToggle.checked ? '1' : '0');
        } catch (e) {}
    }

    function persistDrawCount() {
        try { localStorage.setItem('randomizer_draw_count', String(drawCount)); } catch (e) {}
    }

    function chooseRandom(names) {
        return names[Math.floor(Math.random() * names.length)];
    }

    function startDraw() {
        if (isRolling) { return; }
        var names = parseNames();
        if (!names.length) {
            resultName.className = '';
            resultName.innerHTML = '—';
            statusText.innerHTML = 'Colle ou importe une liste avant de lancer.';
            return;
        }

        isRolling = true;
        drawButton.disabled = true;
        resultName.className = 'rolling';
        statusText.innerHTML = 'Tirage en cours…';

        var duration = parseInt(durationRange.value, 10) * 1000;
        var start = new Date().getTime();
        var finalName = chooseRandom(names);

        function tick() {
            var now = new Date().getTime();
            var elapsed = now - start;
            var progress = elapsed / duration;
            if (progress >= 1) {
                finishDraw(finalName);
                return;
            }
            resultName.innerHTML = chooseRandom(names);
            var delay = 38 + Math.pow(progress, 2.4) * 190;
            setTimeout(tick, delay);
        }
        tick();
    }

    function finishDraw(name) {
        resultName.innerHTML = name;
        resultName.className = 'winner';
        statusText.innerHTML = 'Résultat du tirage';
        isRolling = false;
        drawButton.disabled = false;
        launchConfetti();

        drawCount += 1;
        updateCounterDisplay();
        persistDrawCount();

        if (removeDrawnToggle.checked) {
            removeNameFromList(name);
        }

        setTimeout(function() {
            resultName.className = '';
        }, 600);
    }

    function launchConfetti() {
        var colors = ['#2563eb', '#34c768', '#f5a623', '#f46274', '#9c7bff', '#f170b0'];
        var resultCard = document.getElementById('resultCard');
        var layerRect = confettiLayer.getBoundingClientRect();
        var cardRect = resultCard ? resultCard.getBoundingClientRect() : layerRect;
        var centerX = (cardRect.left - layerRect.left) + cardRect.width / 2;
        var centerY = (cardRect.top - layerRect.top) + cardRect.height / 2;
        var i, c, angle, distance, dx, dy, rot;
        confettiLayer.innerHTML = '';
        for (i = 0; i < 52; i++) {
            c = document.createElement('div');
            c.className = 'confetti';
            angle = Math.random() * Math.PI * 2;
            distance = 120 + Math.random() * 230;
            dx = Math.cos(angle) * distance;
            dy = Math.sin(angle) * distance + 80;
            rot = (Math.random() * 720 - 360) + 'deg';
            c.style.left = centerX + 'px';
            c.style.top = centerY + 'px';
            c.style.background = colors[i % colors.length];
            c.style.setProperty('--dx', dx + 'px');
            c.style.setProperty('--dy', dy + 'px');
            c.style.setProperty('--rot', rot);
            confettiLayer.appendChild(c);
        }
        setTimeout(function() {
            confettiLayer.innerHTML = '';
        }, 1300);
    }

    bindAction(drawButton, startDraw);
    bindAction(btnClear, function() {
        if (isRolling) { return; }
        nameList.value = '';
        updateCount();
        resultName.innerHTML = '—';
        statusText.innerHTML = 'Ajoute une liste, puis lance le tirage.';
        try { localStorage.removeItem('randomizer_names'); } catch (e) {}
    });
    bindAction(btnImport, function() {
        if (fileImport && fileImport.click) { fileImport.click(); }
    });
    bindAction(btnResetCounter, function() {
        drawCount = 0;
        updateCounterDisplay();
        persistDrawCount();
    });

    if (nameList.addEventListener) {
        nameList.addEventListener('input', updateCount, false);
        nameList.addEventListener('keyup', updateCount, false);
    }

    if (durationRange.addEventListener) {
        durationRange.addEventListener('input', updateDuration, false);
        durationRange.addEventListener('change', updateDuration, false);
    }

    if (removeDrawnToggle.addEventListener) {
        removeDrawnToggle.addEventListener('change', persistOptions, false);
    }

    if (showCounterToggle.addEventListener) {
        showCounterToggle.addEventListener('change', function() {
            persistOptions();
            updateCounterDisplay();
        }, false);
    }

    if (fileImport.addEventListener) {
        fileImport.addEventListener('change', function() {
            var file = fileImport.files && fileImport.files[0];
            if (!file) { return; }
            var reader = new FileReader();
            reader.onload = function(evt) {
                nameList.value = evt.target.result || '';
                updateCount();
                statusText.innerHTML = 'Liste importée. Prêt pour le tirage.';
                resultName.innerHTML = '—';
            };
            reader.readAsText(file, 'UTF-8');
            fileImport.value = '';
        }, false);
    }

    try {
        var saved = localStorage.getItem('randomizer_names');
        if (saved) {
            nameList.value = saved;
        }
        removeDrawnToggle.checked = localStorage.getItem('randomizer_remove_drawn') === '1';
        showCounterToggle.checked = localStorage.getItem('randomizer_show_counter') === '1';
        drawCount = parseInt(localStorage.getItem('randomizer_draw_count'), 10) || 0;
    } catch (e) {}

    updateCount();
    updateDuration();
    updateCounterDisplay();
})();
