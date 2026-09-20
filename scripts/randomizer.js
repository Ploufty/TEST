(function() {
    var HISTORY_LIMIT = 10;

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
    var showHistoryToggle = document.getElementById('showHistoryToggle');
    var confettiToggle = document.getElementById('confettiToggle');
    var historyPanel = document.getElementById('historyPanel');
    var historyList = document.getElementById('historyList');
    var btnClearHistory = document.getElementById('btnClearHistory');
    var isRolling = false;
    var history = [];

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

    function persistOptions() {
        try {
            localStorage.setItem('randomizer_remove_drawn', removeDrawnToggle.checked ? '1' : '0');
            localStorage.setItem('randomizer_show_history', showHistoryToggle.checked ? '1' : '0');
            localStorage.setItem('randomizer_confetti_enabled', confettiToggle.checked ? '1' : '0');
        } catch (e) {}
    }

    function persistHistory() {
        try { localStorage.setItem('randomizer_history', JSON.stringify(history)); } catch (e) {}
    }

    function formatTime(timestamp) {
        var d = new Date(timestamp);
        var h = d.getHours();
        var m = d.getMinutes();
        return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
    }

    function renderHistory() {
        historyList.innerHTML = '';
        if (!history.length) {
            var empty = document.createElement('li');
            empty.className = 'historyEmpty';
            empty.textContent = "Aucun tirage pour l'instant.";
            historyList.appendChild(empty);
            return;
        }
        var i, item, nameEl, timeEl;
        for (i = 0; i < history.length; i++) {
            item = document.createElement('li');
            nameEl = document.createElement('span');
            nameEl.className = 'historyName';
            nameEl.textContent = history[i].name;
            timeEl = document.createElement('span');
            timeEl.className = 'historyTime';
            timeEl.textContent = formatTime(history[i].time);
            item.appendChild(nameEl);
            item.appendChild(timeEl);
            historyList.appendChild(item);
        }
    }

    function addHistoryEntry(name) {
        history.unshift({ name: name, time: new Date().getTime() });
        if (history.length > HISTORY_LIMIT) {
            history.length = HISTORY_LIMIT;
        }
        persistHistory();
        renderHistory();
    }

    function updateHistoryVisibility() {
        historyPanel.hidden = !showHistoryToggle.checked;
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
        if (confettiToggle.checked) {
            launchConfetti();
        }

        addHistoryEntry(name);

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
        var count = 60;
        var i, c, angle, peakDistance, peakX, peakY, dx, dy, rot, size, duration, delay;
        confettiLayer.innerHTML = '';
        for (i = 0; i < count; i++) {
            c = document.createElement('div');
            c.className = 'confetti ' + (Math.random() < 0.5 ? 'round' : 'square');

            // Upward burst that then falls, like a firework arc.
            angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.15;
            peakDistance = 55 + Math.random() * 95;
            peakX = Math.cos(angle) * peakDistance;
            peakY = Math.sin(angle) * peakDistance;
            dx = peakX + (Math.random() - 0.5) * 70;
            dy = peakY + 170 + Math.random() * 150;
            rot = (Math.random() * 620 - 310) + 'deg';
            size = 7 + Math.random() * 7;
            duration = 1200 + Math.random() * 500;
            delay = Math.random() * 160;

            c.style.left = centerX + 'px';
            c.style.top = centerY + 'px';
            c.style.width = size + 'px';
            c.style.height = (size * 1.4) + 'px';
            c.style.background = colors[i % colors.length];
            c.style.setProperty('--peakX', peakX + 'px');
            c.style.setProperty('--peakY', peakY + 'px');
            c.style.setProperty('--dx', dx + 'px');
            c.style.setProperty('--dy', dy + 'px');
            c.style.setProperty('--rot', rot);
            c.style.animationDuration = duration + 'ms';
            c.style.animationDelay = delay + 'ms';
            confettiLayer.appendChild(c);
        }
        setTimeout(function() {
            confettiLayer.innerHTML = '';
        }, 2100);
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
    bindAction(btnClearHistory, function() {
        history = [];
        persistHistory();
        renderHistory();
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

    if (showHistoryToggle.addEventListener) {
        showHistoryToggle.addEventListener('change', function() {
            persistOptions();
            updateHistoryVisibility();
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
        var savedShowHistory = localStorage.getItem('randomizer_show_history');
        showHistoryToggle.checked = savedShowHistory === null ? true : savedShowHistory === '1';
        var savedHistory = localStorage.getItem('randomizer_history');
        if (savedHistory) {
            history = JSON.parse(savedHistory) || [];
        }
    } catch (e) {}

    updateCount();
    updateDuration();
    updateHistoryVisibility();
    renderHistory();
})();
