// The kit is dark by default; the panel and settings follow the computer's light or dark look.
(() => { const m = matchMedia('(prefers-color-scheme: light)'), set = () => { if (m.matches) document.documentElement.dataset.theme = 'light'; else delete document.documentElement.dataset.theme; }; set(); m.addEventListener('change', set); })();
