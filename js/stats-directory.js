'use strict';

const directory = document.getElementById('animal-directory');

if (directory) {
    const cards = [...directory.querySelectorAll('.roster-card')];
    const controls = document.getElementById('directory-controls');
    const queryInput = document.getElementById('animal-directory-query');
    const clearButton = document.getElementById('directory-clear');
    const resetButton = document.getElementById('directory-reset');
    const sortSelect = document.getElementById('directory-sort');
    const resultCount = document.getElementById('directory-result-count');
    const emptyState = document.getElementById('directory-empty');
    const typeButtons = [...document.querySelectorAll('[data-type]')];
    const validSorts = new Set(['rank', 'name', 'attack', 'defense', 'agility', 'stamina', 'intelligence', 'special', 'weight']);
    const validTypes = new Set(typeButtons.map((button) => button.dataset.type));
    let activeType = 'all';

    const normalize = (value) => String(value || '').trim().toLowerCase();
    const numberFrom = (card, key) => Number(card.dataset[key]) || 0;

    function syncUrl() {
        const url = new URL(window.location.href);
        const query = queryInput.value.trim();
        if (query) url.searchParams.set('q', query);
        else url.searchParams.delete('q');
        if (activeType !== 'all') url.searchParams.set('type', activeType);
        else url.searchParams.delete('type');
        if (sortSelect.value !== 'rank') url.searchParams.set('sort', sortSelect.value);
        else url.searchParams.delete('sort');
        url.searchParams.delete('animal');
        history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
    }

    function sortCards() {
        const sort = sortSelect.value;
        const sorted = [...cards].sort((left, right) => {
            if (sort === 'name') return left.dataset.name.localeCompare(right.dataset.name);
            if (sort === 'rank') return numberFrom(left, 'rank') - numberFrom(right, 'rank');
            return numberFrom(right, sort) - numberFrom(left, sort) || numberFrom(left, 'rank') - numberFrom(right, 'rank');
        });
        const fragment = document.createDocumentFragment();
        sorted.forEach((card) => fragment.append(card));
        directory.append(fragment);
    }

    function applyFilters({ updateUrl = true } = {}) {
        const query = normalize(queryInput.value);
        let visible = 0;
        cards.forEach((card) => {
            const matchesQuery = !query || card.dataset.search.includes(query);
            const matchesType = activeType === 'all' || card.dataset.type === activeType;
            const show = matchesQuery && matchesType;
            card.hidden = !show;
            if (show) visible += 1;
        });
        resultCount.textContent = String(visible);
        emptyState.hidden = visible !== 0;
        clearButton.hidden = !queryInput.value;
        sortCards();
        if (updateUrl) syncUrl();
    }

    function chooseType(type) {
        activeType = validTypes.has(type) ? type : 'all';
        typeButtons.forEach((button) => {
            const active = button.dataset.type === activeType;
            button.classList.toggle('active', active);
            button.setAttribute('aria-pressed', String(active));
        });
    }

    function resetDirectory() {
        queryInput.value = '';
        sortSelect.value = 'rank';
        chooseType('all');
        applyFilters();
        queryInput.focus({ preventScroll: true });
    }

    const params = new URLSearchParams(window.location.search);
    const legacySlug = normalize(params.get('animal'));
    const legacyCard = legacySlug && cards.find((card) => card.dataset.slug === legacySlug);
    if (legacyCard) {
        window.location.replace(`/stats/${legacySlug}`);
    } else {
        queryInput.value = params.get('q') || '';
        chooseType(normalize(params.get('type')) || 'all');
        const requestedSort = normalize(params.get('sort'));
        sortSelect.value = validSorts.has(requestedSort) ? requestedSort : 'rank';
        applyFilters({ updateUrl: false });

        queryInput.addEventListener('input', () => applyFilters());
        sortSelect.addEventListener('change', () => applyFilters());
        controls.addEventListener('submit', (event) => event.preventDefault());
        clearButton.addEventListener('click', () => {
            queryInput.value = '';
            applyFilters();
            queryInput.focus();
        });
        resetButton.addEventListener('click', resetDirectory);
        typeButtons.forEach((button) => button.addEventListener('click', () => {
            chooseType(button.dataset.type);
            applyFilters();
        }));
    }
}
