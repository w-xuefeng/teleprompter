(function() {
  var LUCIDE_VERSION = '1.18.0';
  var urls = [
    'https://unpkg.com/lucide@' + LUCIDE_VERSION + '/dist/umd/lucide.min.js',
    'https://cdn.jsdelivr.net/npm/lucide@' + LUCIDE_VERSION + '/dist/umd/lucide.min.js',
    'https://registry.npmmirror.com/lucide/' + LUCIDE_VERSION + '/files/dist/umd/lucide.min.js'
  ];
  var idx = 0;
  var callbacks = [];
  var settled = false;

  window._onLucideReady = function(cb) {
    if (settled) { cb(); return; }
    callbacks.push(cb);
  };

  function done() {
    if (settled) return;
    settled = true;
    callbacks.forEach(function(fn) { fn(); });
    callbacks = [];
  }

  function tryLoad() {
    if (idx >= urls.length) {
      console.warn('Lucide 图标库加载失败，按钮图标可能无法显示');
      done();
      return;
    }
    var s = document.createElement('script');
    s.src = urls[idx];
    s.onload = function() {
      console.log('Lucide loaded: ' + urls[idx].split('/')[2]);
      done();
    };
    s.onerror = function() { idx++; tryLoad(); };
    document.head.appendChild(s);
  }
  tryLoad();

  setTimeout(function() {
    if (!settled) { console.warn('Lucide load timeout'); done(); }
  }, 8000);
})();
