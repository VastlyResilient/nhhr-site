// NHHR . motion layer: scroll reveals + one parallax on hero (M-rules; transform/opacity only)
(function(){
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var els = document.querySelectorAll('.reveal');
  if (reduce || !('IntersectionObserver' in window)) {
    els.forEach(function(el){ el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if (e.isIntersecting){ e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, {rootMargin: '0px 0px -8% 0px', threshold: 0.12});
    els.forEach(function(el){ io.observe(el); });
    // hero parallax: background drifts slower than content (scroll garnish only)
    var bg = document.querySelector('.hero-bg');
    var ticking = false;
    addEventListener('scroll', function(){
      if (ticking) return; ticking = true;
      requestAnimationFrame(function(){
        var y = Math.min(scrollY, innerHeight);
        bg.style.transform = 'translateY(' + (y * 0.18).toFixed(1) + 'px)';
        ticking = false;
      });
    }, {passive: true});
  }
})();
