// MotionSites motion language: scroll-scrub video, staggered reveals, mask headlines, count-up.
// Policy: the "Pause motion" button is the ONLY off-switch. prefers-reduced-motion calms
// (half-speed video, no parallax) but keeps scroll reveals alive.
(function(){
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var motionOff = localStorage.getItem("nhhr-motion") === "off";
  var vids = [].slice.call(document.querySelectorAll("video"));
  var scrubVideo = document.querySelector(".scrollband-vid");
  var root = document.documentElement;

  root.classList.toggle("motion-off", motionOff);

  function tryPlay(v){ var p = v.play(); if (p && p.catch) p.catch(function(){}); }

  function applyMotion(){
    vids.forEach(function(v){
      if (v === scrubVideo && !motionOff) { v.pause(); return; }
      v.loop = true;
      v.playbackRate = reduce ? 0.5 : 1;
      if (motionOff) v.pause(); else tryPlay(v);
    });
  }

  // play only what's on screen (defeats offscreen autoplay suspension)
  if ("IntersectionObserver" in window) {
    vids.forEach(function(v){
      new IntersectionObserver(function(en){
        en.forEach(function(e){
          if (v === scrubVideo && !motionOff) return;
          if (e.isIntersecting && !motionOff) tryPlay(v); else v.pause();
        });
      }, {threshold: 0.05}).observe(v);
    });
  }
  applyMotion();

  // scroll-scrub needs a SEEKABLE source: a paused streaming video never buffers
  // (seekable.end(0) === 0, currentTime snaps back). Blob it.
  if (!motionOff) {
    [document.querySelector(".hero-vid"), scrubVideo].forEach(function(v){
      if (!v) return;
      var srcEl = v.querySelector("source");
      var srcUrl = srcEl ? srcEl.src : v.currentSrc;
      fetch(srcUrl).then(function(r){ return r.blob(); }).then(function(bv){
        v.src = URL.createObjectURL(bv);
        v.load();
        var p = v.play(); if (p && p.catch) p.catch(function(){});
      }).catch(function(){});
    });
  }

  // motion toggle (WCAG 2.2.2) and the single off-switch
  var btn = document.getElementById("motionToggle");
  function syncBtn(){
    btn.textContent = motionOff ? "Resume motion" : "Pause motion";
    btn.setAttribute("aria-pressed", motionOff ? "true" : "false");
    root.classList.toggle("motion-off", motionOff);
  }
  if (btn) {
    syncBtn();
    btn.addEventListener("click", function(){
      motionOff = !motionOff;
      localStorage.setItem("nhhr-motion", motionOff ? "off" : "on");
      syncBtn();
      applyMotion();
      if (motionOff) document.querySelectorAll(".reveal,.kb,.mask-in").forEach(function(el){ el.classList.add("is-in"); });
    });
  }

  if (!("IntersectionObserver" in window)) {
    document.querySelectorAll(".reveal,.kb,.mask-in").forEach(function(el){ el.classList.add("is-in"); });
    return;
  }

  // headline mask reveals
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
    if (motionOff) inner.classList.add("is-in");
    else new IntersectionObserver(function(en, o){
      en.forEach(function(e){ if (e.isIntersecting){ inner.classList.add("is-in"); o.unobserve(e.target); } });
    }, {threshold: 0.2}).observe(h);
  });

  // staggered card entrances
  document.querySelectorAll(".paths, .tiles, .plans").forEach(function(g){
    [].slice.call(g.children).forEach(function(el, i){
      el.style.transitionDelay = (i * 110) + "ms";
    });
  });

  if (motionOff) {
    document.querySelectorAll(".reveal,.kb,.mask-in").forEach(function(el){ el.classList.add("is-in"); });
    return;
  }

  var els = document.querySelectorAll(".reveal, .kb");
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

  // ===== SCROLL-VIDEO ENGINE (M4: exact math) =====
  // p     = clamp(-rect.top / (stageH - vh), 0, 1)   scroll progress through a pinned stage
  // hero  target = p*0.85*(dur-0.05) + drift        drift = (now*0.00006) mod dur  (breathes at rest)
  // band  target = p*1.00*(dur-0.05)                pure scrub
  // lerp  currentTime += (target - currentTime) * 0.10 per frame  (30fps throttle)
  // copy  opacity  = 1 - clamp((p - 0.75) / 0.25, 0, 1)           (release into next section)
  var heroStage = document.getElementById("heroStage");
  var heroVideo = document.querySelector(".hero-vid");
  var heroIn = document.querySelector(".hero-in");
  var band = document.querySelector(".scrollband");
  var SPAN_HERO = 0.85, SPAN_BAND = 1.0, LERP = 0.10, FADE_FROM = 0.75;

  function progress(stage){
    var r = stage.getBoundingClientRect();
    var total = r.height - window.innerHeight;
    return total <= 0 ? 0 : Math.min(Math.max(-r.top / total, 0), 1);
  }
  function wrap(t, dur){ return ((t % dur) + dur) % dur; }

  var lastFrame = 0;
  function engine(now){
    requestAnimationFrame(engine);
    if (motionOff || now - lastFrame < 33) return;   // ~30fps
    lastFrame = now;
    var drift = (now * 0.00006);                      // 0.06 s of video per real second
    if (heroStage && heroVideo && heroVideo.duration) {
      var dur = heroVideo.duration;
      var p = progress(heroStage);
      var target = wrap(p * SPAN_HERO * (dur - 0.05) + drift, dur);
      heroVideo.currentTime += (target - heroVideo.currentTime) * LERP;
      if (heroIn) heroIn.style.opacity = 1 - Math.min(Math.max((p - FADE_FROM) / (1 - FADE_FROM), 0), 1);
    }
    if (band && scrubVideo && scrubVideo.duration) {
      var d2 = scrubVideo.duration;
      var p2 = progress(band);
      scrubVideo.currentTime += (p2 * SPAN_BAND * (d2 - 0.05) - scrubVideo.currentTime) * LERP;
    }
  }
  if (!motionOff && !reduce) requestAnimationFrame(engine);
  else if (!motionOff && reduce) requestAnimationFrame(engine);   // scrub is user-driven: keep it

  window.addEventListener("scroll", function(){
    if (motionOff) return;
    if (heroIn && heroStage && heroVideo && !heroVideo.duration) {
      // engine handles fade once running; cheap fallback for first paint
      var p = progress(heroStage);
      heroIn.style.opacity = 1 - Math.min(Math.max((p - FADE_FROM) / (1 - FADE_FROM), 0), 1);
    }
  }, {passive: true});
})();
