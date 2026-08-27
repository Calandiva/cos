/* 포뮬라랩 — 부팅 */
(function () {
  'use strict';
  function start() {
    try { window.APP.boot(); }
    catch (e) {
      if (window.console) console.error(e);
      document.body.insertAdjacentHTML('afterbegin',
        '<pre style="padding:16px;color:#c33;font:12px monospace;white-space:pre-wrap">' +
        '부팅 오류\n' + (e && e.stack || e) + '</pre>');
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
