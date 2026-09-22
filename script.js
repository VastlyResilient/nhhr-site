// MotionSites motion language: scroll-scrub video, mask reveals, Ken Burns, count-up. Garnish only.
(function(){
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var els = document.querySelectorAll(".reveal, .kb");
  if (!("IntersectionObserver" in window)) {
    document.querySelectorAll(".reveal,.kb,.mask-in").forEach(function(el){ el.classList.add("is-in"); });
    return;
  }

  // headline mask reveals (wrap each h2 line once)
  document.querySelectorAll(".h2").forEach(function(h){
    if (h.querySelector(".mask")) return;
    var span = document.createElement("span");
    span.className = "mask";
    var inner = document.createElement("span");
    inner.className = "mask-in";
    inner.innerHTML = h.innerHTML;
    span.appendChild(inner);
    h.innerHTML = "";
    h.appendChild(span);
    if (reduce) inner.classList.add("is-in");
    else new IntersectionObserver(function(en, o){
      en.forEach(function(e){ if (e.isIntersecting){ inner.classList.add("is-in"); o.unobserve(e.target); } });
    }, {threshold: 0.2}).observe(h);
  });

  if (reduce) {
    els.forEach(function(el){ el.classList.add("is-in"); });
    document.querySelectorAll("video").forEach(function(v){ v.pause(); });
    return;
  }

  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if (e.isIntersecting){ e.target.classList.add("is-in"); io.unobserve(e.target); }
    });
  }, {rootMargin: "0px 0px -8% 0px", threshold: 0.08});
  els.forEach(function(el){ io.observe(el); });

  // count-up stats
  var strip = document.querySelector(".strip-in");
  if (strip) new IntersectionObserver(function(en, o){
    en.forEach(function(e){
      if (!e.isIntersecting) return;
      o.unobserve(e.target);
      e.target.querySelectorAll(".stat b").forEach(function(b){
        var m = b.textContent.trim().match(/^[\d,.]+/);
        if (!m) return;
        var end = parseFloat(m[0].replace(/,/g, ""));
        if (!isFinite(end) || end < 5) return;
        var suffix = b.textContent.trim().slice(m[0].length);
        var t0 = performance.now(), dur = 900;
        (function tick(t){
          var p = Math.min((t - t0) / dur, 1);
          var v = Math.round(end * (1 - Math.pow(1 - p, 3)));
          b.textContent = v + suffix;
          if (p < 1) requestAnimationFrame(tick);
        })(t0);
      });
    });
  }, {threshold: 0.4}).observe(strip);

  // one parallax: hero background drifts slightly slower than scroll
  var bg = document.querySelector(".hero-bg");
  // scroll-scrub: the band video plays as you scroll through it
  var band = document.querySelector(".scrollband");
  var bvid = document.querySelector(".scrollband-vid");
  var ticking = false;
  function onScroll(){
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function(){
      if (bg) {
        var y = Math.min(window.scrollY, 600);
        bg.style.transform = "translateY(" + (y * 0.18) + "px)";
      }
      if (band && bvid && bvid.duration) {
        var r = band.getBoundingClientRect();
        var total = r.height - window.innerHeight;
        var p = Math.min(Math.max(-r.top / total, 0), 1);
        bvid.currentTime = p * (bvid.duration - 0.05);
      }
      ticking = false;
    });
  }
  window.addEventListener("scroll", onScroll, {passive: true});
  onScroll();
})();
