(() => {
  // Scroll reveal: agrega .in cuando el elemento entra en viewport.
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: .18 });

  document.querySelectorAll('.reveal, .milestones, .ministats').forEach((el) => io.observe(el));

  // Nav: sombra sutil apenas se hace scroll, para separarla del contenido.
  const nav = document.querySelector('nav');
  if (nav) {
    const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }
})();
