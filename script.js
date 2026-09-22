// M2 garnish: scroll reveals + one hero parallax. Spine stays static.
(function(){
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var els = document.querySelectorAll(".reveal");
  if (reduce || !("IntersectionObserver" in window)) {
    els.forEach(function(el){ el.classList.add("is-in"); });
    return;
  }
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if (e.isIntersecting){ e.target.classList.add("is-in"); io.unobserve(e.target); }
    });
  }, {rootMargin: "0px 0px -8% 0px", threshold: 0.08});
  els.forEach(function(el){ io.observe(el); });

  // one parallax: hero background drifts slightly slower than scroll
  var bg = document.querySelector(".hero-bg");
  if (bg) {
    var ticking = false;
    window.addEventListener("scroll", function(){
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function(){
        var y = Math.min(window.scrollY, 600);
        bg.style.transform = "translateY(" + (y * 0.18) + "px)";
        ticking = false;
      });
    }, {passive: true});
  }
})();
