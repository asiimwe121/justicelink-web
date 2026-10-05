



var LCDJP_THEME_KEY = 'lcdjp_theme';

function lcdjpGetTheme() {
    try {
        return localStorage.getItem(LCDJP_THEME_KEY) || 'light';
    } catch (e) {
        return 'light';
    }
}

function lcdjpApplyTheme(theme) {
    if (theme !== 'dark' && theme !== 'light') theme = 'light';
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem(LCDJP_THEME_KEY, theme); } catch (e) {}
    lcdjpSyncThemeToggles(theme);
}

function lcdjpToggleTheme() {
    var next = (lcdjpGetTheme() === 'dark') ? 'light' : 'dark';
    lcdjpApplyTheme(next);
}



function lcdjpSyncThemeToggles(theme) {
    var checkboxes = document.querySelectorAll('.theme-switch-input');
    checkboxes.forEach(function(cb) {
        cb.checked = (theme === 'dark');
    });
}


function lcdjpRenderThemeToggle() {
    var isDark = lcdjpGetTheme() === 'dark';
    return '' +
    '<div class="theme-toggle-row">' +
        '<div>' +
            '<div class="ttr-label">Dark Mode</div>' +
            '<div class="ttr-sub">Switch between light and dark appearance</div>' +
        '</div>' +
        '<label class="theme-switch">' +
            '<input type="checkbox" class="theme-switch-input" ' + (isDark ? 'checked' : '') + ' onchange="lcdjpToggleTheme()">' +
            '<span class="ts-slider"></span>' +
        '</label>' +
    '</div>';
}



(function() {
    var theme = lcdjpGetTheme();
    document.documentElement.setAttribute('data-theme', theme);
})();





document.addEventListener('DOMContentLoaded', function() {
    lcdjpSyncThemeToggles(lcdjpGetTheme());
});
