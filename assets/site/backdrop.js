/* ------------------------------------------------------------------
   backdrop.js — slow drifting warm orbs behind the page.
   Canvas + radial gradients, blurred by CSS. Decorative only.
------------------------------------------------------------------ */

(function () {
  var canvas = document.getElementById('backdrop');
  if (!canvas) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var ctx = canvas.getContext('2d');
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var w = 0, h = 0;

  var PALETTE = [
    [245, 147, 0],
    [242, 107, 15],
    [232, 48, 12],
    [240, 21, 122],
    [255, 194, 75],
    [255, 181, 156]
  ];

  function resize() {
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  var orbs = PALETTE.map(function (rgb, i) {
    return {
      rgb: rgb,
      x: Math.random(),
      y: Math.random(),
      r: 0.20 + Math.random() * 0.20,
      phase: Math.random() * Math.PI * 2,
      speed: 0.00006 + i * 0.000018,
      driftX: 0.10 + Math.random() * 0.14,
      driftY: 0.08 + Math.random() * 0.12
    };
  });

  function draw(t) {
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';

    var base = Math.min(w, h);

    orbs.forEach(function (o) {
      var a = o.phase + t * o.speed;
      var cx = (o.x + Math.cos(a) * o.driftX) * w;
      var cy = (o.y + Math.sin(a * 1.23) * o.driftY) * h;
      var rad = o.r * base * (1 + 0.12 * Math.sin(a * 0.8));

      var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      var c = o.rgb.join(',');
      g.addColorStop(0, 'rgba(' + c + ',0.85)');
      g.addColorStop(0.45, 'rgba(' + c + ',0.32)');
      g.addColorStop(1, 'rgba(' + c + ',0)');

      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.fill();
    });

    requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener('resize', resize);
  requestAnimationFrame(draw);
})();
