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
  if (!motionOff && scrubVideo) {
    var srcEl = scrubVideo.querySelector("source");
    var srcUrl = srcEl ? srcEl.src : scrubVideo.currentSrc;
    fetch(srcUrl).then(function(r){ return r.blob(); }).then(function(bv){
      scrubVideo.src = URL.createObjectURL(bv);
      scrubVideo.load();
    }).catch(function(){});
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

  var bg = document.querySelector(".hero-bg");
  var band = document.querySelector(".scrollband");
  var ticking = false;
  function onScroll(){
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function(){
      if (bg && !reduce) {
        var y = Math.min(window.scrollY, 600);
        bg.style.transform = "translateY(" + (y * 0.18) + "px)";
      }
      if (band && scrubVideo && scrubVideo.duration) {
        var r = band.getBoundingClientRect();
        var total = r.height - window.innerHeight;
        var p = Math.min(Math.max(-r.top / total, 0), 1);
        scrubVideo.currentTime = p * (scrubVideo.duration - 0.05);
      }
      ticking = false;
    });
  }
  window.addEventListener("scroll", onScroll, {passive: true});
  onScroll();
})();
