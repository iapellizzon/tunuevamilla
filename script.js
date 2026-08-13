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

  // ---------- Modal de contacto ----------
  const WEB3FORMS_ACCESS_KEY = 'f8dc97b1-ea5a-44b7-beb8-078c6a375e9a';

  // "Escribime" (mailto de respaldo) + "Charlemos" del nav y del hero (anchor #contacto
  // de respaldo): todos abren el mismo modal.
  const triggers = document.querySelectorAll('#contactTrigger, .js-contact-trigger');
  const overlay = document.getElementById('contactOverlay');
  const modal = document.getElementById('contactModal');
  const closeBtn = document.getElementById('contactClose');
  const form = document.getElementById('contactForm');
  const submitBtn = document.getElementById('contactSubmit');
  const status = document.getElementById('contactStatus');

  if (triggers.length && overlay && modal && form) {
    let lastFocused = null;

    const focusableSelector = 'a[href],button:not([disabled]),input,textarea,select,[tabindex]:not([tabindex="-1"])';

    const openModal = () => {
      lastFocused = document.activeElement;
      overlay.hidden = false;
      document.body.style.overflow = 'hidden';
      // fuerza reflow para que la transición de entrada corra; setTimeout (no rAF)
      // porque rAF no dispara en pestañas que no están compositando frames.
      void overlay.offsetHeight;
      setTimeout(() => overlay.classList.add('is-open'), 10);
      const firstField = form.querySelector('input[name="name"]');
      (firstField || closeBtn).focus();
      document.addEventListener('keydown', onKeydown);
    };

    const closeModal = () => {
      overlay.classList.remove('is-open');
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKeydown);
      setTimeout(() => { overlay.hidden = true; }, 250);
      if (lastFocused) lastFocused.focus();
    };

    const onKeydown = (e) => {
      if (e.key === 'Escape') {
        closeModal();
        return;
      }
      if (e.key === 'Tab') {
        const focusables = Array.from(modal.querySelectorAll(focusableSelector));
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    triggers.forEach((trigger) => {
      trigger.addEventListener('click', (e) => {
        e.preventDefault(); // evita el mailto:/scroll cuando JS está disponible
        openModal();
      });
    });
    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      // honeypot: si un bot completó este campo oculto, se descarta en silencio
      if (form.botcheck.checked) {
        status.textContent = '¡Gracias! Te respondo a la brevedad.';
        form.reset();
        setTimeout(closeModal, 1800);
        return;
      }

      const data = {
        access_key: WEB3FORMS_ACCESS_KEY,
        subject: 'Nuevo contacto desde tunuevamilla.com',
        from_name: 'Tu Nueva Milla — Landing',
        name: form.name.value.trim(),
        email: form.email.value.trim(),
        message: form.message.value.trim(),
      };

      submitBtn.disabled = true;
      submitBtn.querySelector('.btn-label').textContent = 'Enviando…';
      status.removeAttribute('data-state');
      status.textContent = '';

      try {
        const res = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(data),
        });
        const json = await res.json();

        if (res.ok && json.success) {
          status.dataset.state = 'success';
          status.textContent = '¡Listo! Recibí tu mensaje, te respondo pronto a tu correo.';
          form.reset();
          setTimeout(closeModal, 2200);
        } else {
          throw new Error(json.message || 'submit failed');
        }
      } catch (err) {
        status.dataset.state = 'error';
        status.innerHTML = 'No se pudo enviar. Escribime directo a <a href="mailto:hola@tunuevamilla.com">hola@tunuevamilla.com</a>.';
      } finally {
        submitBtn.disabled = false;
        submitBtn.querySelector('.btn-label').textContent = 'Enviar mensaje';
      }
    });
  }
})();
