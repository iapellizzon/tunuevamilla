(() => {
  // Tema claro/oscuro: claro por defecto; el botón alterna y recuerda la elección.
  // (El tema guardado se aplica antes del primer pintado con un script en el <head>.)
  // Las animaciones al scrollear y la nav compacta viven en motion.js.
  const themeToggle = document.getElementById('themeToggle');
  const themeColor = document.querySelector('meta[name="theme-color"]');
  const applyTheme = (t) => {
    const dark = t === 'dark';
    if (dark) document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
    if (themeColor) themeColor.content = dark ? '#121114' : '#FFFFFF';
    if (themeToggle) {
      const label = dark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro';
      themeToggle.setAttribute('aria-label', label);
      themeToggle.title = label;
    }
  };
  applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try { localStorage.setItem('tnm-theme', next); } catch (e) {}
    });
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

    const messageField = form.querySelector('textarea[name="message"]');
    let lastPrefill = '';
    let currentTopic = '';

    // Cada botón puede traer data-contact-message (texto precargado en el mensaje) y
    // data-contact-topic (se agrega al asunto del mail). Sin esos atributos, el modal
    // queda como siempre ("Charlemos").
    // Pantalla de "mensaje enviado": reemplaza al formulario dentro del mismo modal
    // y queda visible hasta que la persona la cierra (no se cierra sola).
    const success = document.createElement('div');
    success.className = 'modal-success';
    success.innerHTML =
      '<span class="modal-success__icon" aria-hidden="true">' +
        '<svg viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      '</span>' +
      '<div class="tnm-eyebrow">Mensaje enviado</div>' +
      '<h3 class="modal-success__title" tabindex="-1"></h3>' +
      '<p class="modal-lead modal-success__text"></p>' +
      '<button type="button" class="tnm-btn tnm-btn--primary tnm-btn--block modal-success__close">Cerrar</button>';
    modal.appendChild(success);
    const successTitle = success.querySelector('.modal-success__title');
    const successText = success.querySelector('.modal-success__text');

    const showSuccess = (name, email) => {
      successTitle.textContent = name ? '¡Listo, ' + name + '!' : '¡Listo!';
      successText.textContent = email
        ? 'Recibí tu mensaje. Te respondo yo mismo a ' + email + '.'
        : 'Recibí tu mensaje. Te respondo yo mismo a tu correo.';
      modal.classList.add('is-sent');
      modal.scrollTop = 0;
      successTitle.focus();
    };

    const resetSuccess = () => {
      modal.classList.remove('is-sent');
      status.removeAttribute('data-state');
      status.textContent = '';
    };

    const openModal = (trigger) => {
      resetSuccess();
      const prefill = (trigger && trigger.dataset && trigger.dataset.contactMessage) || '';
      currentTopic = (trigger && trigger.dataset && trigger.dataset.contactTopic) || '';
      if (prefill) {
        messageField.value = prefill;
      } else if (messageField.value === lastPrefill) {
        messageField.value = ''; // no arrastrar una precarga anterior
      }
      lastPrefill = prefill;
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
        // solo lo visible: con la pantalla de "enviado", el formulario queda oculto
        const focusables = Array.from(modal.querySelectorAll(focusableSelector))
          .filter((el) => el.getClientRects().length > 0);
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
        openModal(trigger);
      });
    });
    closeBtn.addEventListener('click', closeModal);
    success.querySelector('.modal-success__close').addEventListener('click', closeModal);
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

      // Asunto único por consulta (nombre + tema) para que cada contacto entre como
      // un mail nuevo y Gmail no los agrupe a todos en la misma conversación.
      const senderName = form.name.value.trim();
      const data = {
        access_key: WEB3FORMS_ACCESS_KEY,
        subject: 'Nuevo contacto: ' + (senderName || 'sin nombre') + (currentTopic ? ' · ' + currentTopic : ''),
        from_name: 'Tu Nueva Milla — Landing',
        name: senderName,
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
          showSuccess(senderName, data.email);
          form.reset();
          lastPrefill = '';
        } else {
          throw new Error(json.message || 'submit failed');
        }
      } catch (err) {
        status.dataset.state = 'error';
        status.innerHTML = 'No se pudo enviar. Escribime directo a <a href="mailto:hola@tunuevamilla.com">hola@tunuevamilla.com</a>.';
        // en pantallas bajas el aviso queda debajo del botón: lo traemos a la vista
        status.scrollIntoView({ block: 'nearest' });
      } finally {
        submitBtn.disabled = false;
        submitBtn.querySelector('.btn-label').textContent = 'Enviar mensaje';
      }
    });
  }
})();
