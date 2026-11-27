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

    // ---------- Validación: todos los campos obligatorios ----------
    const fields = {
      name: form.querySelector('[name="name"]'),
      email: form.querySelector('[name="email"]'),
      phone: form.querySelector('[name="phone"]'),
      message: messageField,
    };
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@.]{2,}$/;
    const rules = {
      name: (v) => (v.trim().length >= 2 ? '' : 'Escribí tu nombre.'),
      email: (v) => {
        if (!v.trim()) return 'Escribí tu mail.';
        return EMAIL_RE.test(v.trim()) ? '' : 'Revisá el mail, parece que está mal escrito (ej: nombre@empresa.com).';
      },
      phone: (v) => {
        if (!v.trim()) return 'Dejá un teléfono para contactarte.';
        const digits = v.replace(/\D/g, '');
        const okChars = /^[\d\s()+.\-]+$/.test(v.trim());
        return okChars && digits.length >= 8 && digits.length <= 15
          ? ''
          : 'Revisá el teléfono: incluí el código de área (ej: 341 555 1234).';
      },
      message: (v) => (v.trim().length >= 3 ? '' : 'Contame brevemente qué necesitás.'),
    };

    // un aviso de error debajo de cada campo
    const errors = {};
    Object.keys(fields).forEach((key) => {
      const input = fields[key];
      const p = document.createElement('p');
      p.className = 'field-error';
      p.id = 'contact-err-' + key;
      p.hidden = true;
      input.closest('.tnm-field').after(p);
      input.setAttribute('aria-describedby', p.id);
      errors[key] = p;
    });

    const setError = (key, msg) => {
      errors[key].textContent = msg;
      errors[key].hidden = !msg;
      if (msg) fields[key].setAttribute('aria-invalid', 'true');
      else fields[key].removeAttribute('aria-invalid');
    };
    const validateField = (key) => {
      const msg = rules[key](fields[key].value);
      setError(key, msg);
      return !msg;
    };

    // Mail mal tipeado en dominios comunes (gmial.com, hotmail.con…): sugerimos la
    // corrección. Si la persona confirma que está bien, no insistimos.
    const KNOWN_DOMAINS = ['gmail.com', 'hotmail.com', 'hotmail.com.ar', 'outlook.com', 'outlook.com.ar',
      'yahoo.com', 'yahoo.com.ar', 'live.com', 'live.com.ar', 'icloud.com'];
    const distance = (a, b) => {
      const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
      for (let j = 1; j <= b.length; j++) d[0][j] = j;
      for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
          d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
          if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
        }
      }
      return d[a.length][b.length];
    };
    const suggestEmail = (value) => {
      const at = value.lastIndexOf('@');
      if (at < 1) return null;
      const user = value.slice(0, at);
      const domain = value.slice(at + 1).toLowerCase();
      if (KNOWN_DOMAINS.includes(domain)) return null;
      let best = null;
      let bestDist = 3;
      KNOWN_DOMAINS.forEach((k) => {
        const dist = distance(domain, k);
        if (dist < bestDist) { bestDist = dist; best = k; }
      });
      if (best) return user + '@' + best;
      const fixedTld = domain.replace(/\.(con|cmo|cpm|vom|xom|comm)$/, '.com');
      return fixedTld !== domain ? user + '@' + fixedTld : null;
    };

    const suggestBox = document.createElement('div');
    suggestBox.className = 'email-suggest';
    suggestBox.hidden = true;
    suggestBox.setAttribute('role', 'status');
    suggestBox.innerHTML =
      '<span class="email-suggest__text"></span>' +
      '<span class="email-suggest__actions">' +
        '<button type="button" class="email-suggest__btn" data-choice="yes">Sí, corregir</button>' +
        '<button type="button" class="email-suggest__btn" data-choice="no">No, está bien</button>' +
      '</span>';
    errors.email.after(suggestBox);
    let pendingSuggestion = null;
    let emailConfirmed = '';

    const checkSuggestion = () => {
      const v = fields.email.value.trim();
      pendingSuggestion = EMAIL_RE.test(v) && v !== emailConfirmed ? suggestEmail(v) : null;
      if (pendingSuggestion) {
        suggestBox.querySelector('.email-suggest__text').textContent = '¿Quisiste decir ' + pendingSuggestion + '?';
      }
      suggestBox.hidden = !pendingSuggestion;
      return !pendingSuggestion;
    };
    suggestBox.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-choice]');
      if (!btn) return;
      if (btn.dataset.choice === 'yes') {
        fields.email.value = pendingSuggestion;
        validateField('email');
      } else {
        emailConfirmed = fields.email.value.trim();
      }
      checkSuggestion();
      fields.phone.focus();
    });

    Object.keys(fields).forEach((key) => {
      const input = fields[key];
      // al salir del campo avisamos si está mal (no mientras escribe)
      input.addEventListener('blur', () => {
        if (input.value.trim() || input.hasAttribute('aria-invalid')) validateField(key);
        if (key === 'email' && !input.hasAttribute('aria-invalid')) checkSuggestion();
      });
      // si ya estaba marcado con error, se limpia apenas lo corrige
      input.addEventListener('input', () => {
        if (input.hasAttribute('aria-invalid')) validateField(key);
        if (key === 'email' && !suggestBox.hidden) { suggestBox.hidden = true; pendingSuggestion = null; }
      });
    });

    const validateAll = () => {
      const allOk = Object.keys(fields).map(validateField).every(Boolean);
      const emailOk = allOk ? checkSuggestion() : true;
      if (!allOk) {
        const firstBad = Object.keys(fields).find((k) => fields[k].hasAttribute('aria-invalid'));
        fields[firstBad].focus();
      } else if (!emailOk) {
        fields.email.focus();
      }
      return allOk && emailOk;
    };

    const clearErrors = () => {
      Object.keys(fields).forEach((key) => setError(key, ''));
      suggestBox.hidden = true;
      pendingSuggestion = null;
      emailConfirmed = '';
    };

    const resetSuccess = () => {
      modal.classList.remove('is-sent');
      status.removeAttribute('data-state');
      status.textContent = '';
      clearErrors();
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

      // todos los campos son obligatorios; si algo falta o está mal, no se envía
      if (!validateAll()) return;

      // Asunto único por consulta (nombre + tema) para que cada contacto entre como
      // un mail nuevo y Gmail no los agrupe a todos en la misma conversación.
      const senderName = fields.name.value.trim();
      const data = {
        access_key: WEB3FORMS_ACCESS_KEY,
        subject: 'Nuevo contacto: ' + (senderName || 'sin nombre') + (currentTopic ? ' · ' + currentTopic : ''),
        from_name: 'Tu Nueva Milla — Landing',
        name: senderName,
        email: fields.email.value.trim(),
        phone: fields.phone.value.trim(),
        message: fields.message.value.trim(),
      };

      submitBtn.disabled = true;
      submitBtn.querySelector('.btn-label').textContent = 'Enviando…';
      status.removeAttribute('data-state');
      status.textContent = '';

      // Web3Forms a veces rechaza un envío válido y acepta el siguiente: probamos
      // hasta 3 veces (con una pausa corta) antes de pasar al plan B.
      const send = async () => {
        const res = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(data),
        });
        const json = await res.json().catch(() => ({}));
        return res.ok && json.success ? json : Promise.reject(new Error(json.message || 'submit failed'));
      };

      try {
        let lastError;
        let sent = false;
        for (let attempt = 0; attempt < 3 && !sent; attempt++) {
          if (attempt) await new Promise((r) => setTimeout(r, 1200));
          try { await send(); sent = true; } catch (e) { lastError = e; }
        }

        if (sent) {
          showSuccess(senderName, data.email);
          form.reset();
          lastPrefill = '';
        } else {
          throw lastError;
        }
      } catch (err) {
        // Plan B si Web3Forms falla: abrimos el correo de la persona con el mensaje
        // ya escrito para hola@, y dejamos un link por si el navegador no lo abre solo.
        const firma = '\n\n— ' + senderName + ' · ' + data.email + ' · Tel: ' + data.phone;
        const mailto = 'mailto:hola@tunuevamilla.com'
          + '?subject=' + encodeURIComponent(data.subject)
          + '&body=' + encodeURIComponent(data.message + firma);

        status.dataset.state = 'error';
        status.textContent = '';
        const link = document.createElement('a');
        link.href = mailto;
        link.textContent = 'Abrir mi correo con el mensaje';
        status.append('No se pudo enviar desde acá. ', link,
          ' (ya va escrito) o escribime a hola@tunuevamilla.com.');
        // en pantallas bajas el aviso queda debajo del botón: lo traemos a la vista
        status.scrollIntoView({ block: 'nearest' });
        window.location.href = mailto;
      } finally {
        submitBtn.disabled = false;
        submitBtn.querySelector('.btn-label').textContent = 'Enviar mensaje';
      }
    });
  }
})();
