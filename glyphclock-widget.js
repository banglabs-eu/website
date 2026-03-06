(function () {
  'use strict';

  var S = ['\u{1F950}','\u{1F98B}','\u{1F337}','\u2602\uFE0F','\u{1F335}','\u{1F388}','\u{1F453}','\u2693','\u{1F99A}','\u{1F916}','\u2B50','\u2601\uFE0F','\u{1F332}','\u{1FA81}','\u{1FA91}','\u267B'];

  var css = document.createElement('style');
  css.textContent =
    '.gc-widget {' +
      'position: fixed; bottom: 1.5rem; right: 1.5rem; z-index: 9999;' +
      'text-decoration: none; opacity: 0;' +
      'animation: gc-reveal 0.6s ease-out 0.6s forwards;' +
    '}' +
    '@keyframes gc-reveal { to { opacity: 1; } }' +
    '.gc-widget .gc-box {' +
      'height: 80px; width: 80px; position: relative;' +
    '}' +
    '.gc-widget .gc-g {' +
      'position: absolute; font-size: 60px; line-height: 1;' +
      'left: 50%; top: 50%;' +
      'transform: translate(-50%, -50%) scale(0); opacity: 0;' +
      'transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s ease;' +
    '}' +
    '.gc-widget .gc-1 .gc-g:nth-child(1) {' +
      'transform: translate(-50%, -50%) scale(1); opacity: 1;' +
    '}' +
    '.gc-widget .gc-2 .gc-g:nth-child(1) {' +
      'transform: translate(calc(-50% - 20px), -50%) scale(0.6); opacity: 1;' +
    '}' +
    '.gc-widget .gc-2 .gc-g:nth-child(2) {' +
      'transform: translate(calc(-50% + 20px), -50%) scale(0.6); opacity: 1;' +
    '}' +
    '.gc-widget .gc-3 .gc-g:nth-child(1) {' +
      'transform: translate(-50%, calc(-50% - 15px)) scale(0.425); opacity: 1;' +
    '}' +
    '.gc-widget .gc-3 .gc-g:nth-child(2) {' +
      'transform: translate(calc(-50% - 15px), calc(-50% + 12px)) scale(0.425); opacity: 1;' +
    '}' +
    '.gc-widget .gc-3 .gc-g:nth-child(3) {' +
      'transform: translate(calc(-50% + 15px), calc(-50% + 12px)) scale(0.425); opacity: 1;' +
    '}';
  document.head.appendChild(css);

  var a = document.createElement('a');
  a.className = 'gc-widget';
  a.href = 'https://glyphclock.bang-labs.eu';
  a.target = '_blank';
  a.rel = 'noopener';
  a.title = 'GlyphClock';
  a.innerHTML = '<div class="gc-box"><span class="gc-g"></span><span class="gc-g"></span><span class="gc-g"></span></div>';
  document.body.appendChild(a);

  var box = a.querySelector('.gc-box');
  var spans = a.querySelectorAll('.gc-g');

  function update() {
    var now = new Date();
    var m = now.getUTCHours() * 60 + now.getUTCMinutes();
    var block = Math.min(Math.floor(m / 90), 15);
    var sub = Math.min(Math.floor((m % 90) / 30), 2);
    var glyph = S[block];
    for (var i = 0; i < 3; i++) spans[i].textContent = glyph;
    box.className = 'gc-box gc-' + (sub + 1);
  }

  update();
  var now = new Date();
  var secsIntoBlock = (now.getUTCMinutes() % 30) * 60 + now.getUTCSeconds();
  setTimeout(function () { update(); setInterval(update, 30 * 60000); }, (30 * 60 - secsIntoBlock) * 1000);
})();
