/* Direct launch of the preserved games from the 3D playroom.
   Works in the generated static legacy.html and the WordPress template. */
(() => {
  'use strict';
  const selectGame = () => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('game') === 'yakitori' && typeof window.switchGameTab === 'function') {
      window.switchGameTab('yakitori');
    }
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', selectGame, {once: true});
  } else {
    selectGame();
  }
})();
