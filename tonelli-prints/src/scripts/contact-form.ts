import { format } from '../lib/format';
import { readJson } from './dom';
import type { EstimateRequest } from './estimator';

interface Labels {
  errors: { summary: string; required: string; email: string; tooShort: string };
  success: { title: string; body: string };
  mailto: { title: string; body: string; subject: string };
  failure: string;
  submit: string;
  sending: string;
  selectedProduct: string;
  removeProduct: string;
  fields: { company: string; email: string; material: string; message: string };
}

type Control = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

function validationMessage(control: Control, labels: Labels): string | null {
  const value = control.value.trim();
  if (control.required && value === '') return labels.errors.required;
  if (
    control instanceof HTMLInputElement &&
    control.type === 'email' &&
    control.validity.typeMismatch
  ) {
    return labels.errors.email;
  }
  if (
    control instanceof HTMLTextAreaElement &&
    control.minLength > 0 &&
    value.length < control.minLength
  ) {
    return labels.errors.tooShort;
  }
  return null;
}

function showError(control: Control, message: string | null): void {
  const error = document.getElementById(`${control.id}-error`);
  if (!error) return;
  error.textContent = message ?? '';
  error.hidden = message === null;
  if (message === null) control.removeAttribute('aria-invalid');
  else control.setAttribute('aria-invalid', 'true');
}

function mailtoUrl(email: string, data: FormData, labels: Labels): string {
  const value = (name: string): string => String(data.get(name) ?? '').trim();
  const lines = [
    `${labels.fields.company}: ${value('azienda')}`,
    `${labels.fields.email}: ${value('email')}`,
    `${labels.fields.material}: ${value('materiale')}`,
    value('prodotto') ? format(labels.selectedProduct, { product: value('prodotto') }) : '',
    '',
    value('messaggio'),
  ].filter((line, index) => line !== '' || index === 4);
  const subject = format(labels.mailto.subject, { company: value('azienda') });
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
}

/** Form contatti: validazione accessibile, invio all'endpoint configurato oppure mailto, stati di esito. */
export function initContactForm(): void {
  const form = document.querySelector<HTMLFormElement>('[data-contact-form]');
  const labels = form ? readJson<Labels>(form, 'labels') : null;
  const status = form?.querySelector<HTMLElement>('[data-form-status]');
  const submit = form?.querySelector<HTMLButtonElement>('[data-submit]');
  const success = document.querySelector<HTMLElement>('[data-form-success]');
  if (!form || !labels || !status || !submit || !success) return;

  const endpoint = form.dataset['endpoint'] || null;
  const email = form.dataset['email'] ?? '';
  const controls = [...form.elements].filter(
    (element): element is Control =>
      (element instanceof HTMLInputElement ||
        element instanceof HTMLTextAreaElement ||
        element instanceof HTMLSelectElement) &&
      element.type !== 'hidden' &&
      element.name !== '_gotcha',
  );

  // La validazione nativa resta attiva senza JS; con JS la sostituiamo con messaggi nostri
  form.noValidate = true;

  for (const control of controls) {
    control.addEventListener('blur', () => showError(control, validationMessage(control, labels)));
    control.addEventListener('input', () => {
      if (control.hasAttribute('aria-invalid') && validationMessage(control, labels) === null) {
        showError(control, null);
      }
    });
  }

  const setStatus = (message: string | null): void => {
    status.textContent = message ?? '';
    status.hidden = message === null;
  };

  const showSuccess = (title: string, body: string): void => {
    const titleElement = success.querySelector('[data-form-success-title]');
    const bodyElement = success.querySelector('[data-form-success-body]');
    if (titleElement) titleElement.textContent = title;
    if (bodyElement) bodyElement.textContent = body;
    form.hidden = true;
    success.hidden = false;
    success.focus();
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    setStatus(null);

    const invalid = controls.filter((control) => {
      const message = validationMessage(control, labels);
      showError(control, message);
      return message !== null;
    });
    if (invalid.length > 0) {
      setStatus(labels.errors.summary);
      invalid[0]?.focus();
      return;
    }

    const data = new FormData(form);
    // Honeypot compilato: è un bot. Rispondiamo come se fosse andato tutto bene, senza inviare nulla.
    if (String(data.get('_gotcha') ?? '') !== '') {
      showSuccess(labels.success.title, labels.success.body);
      return;
    }

    if (!endpoint) {
      window.location.href = mailtoUrl(email, data, labels);
      showSuccess(labels.mailto.title, format(labels.mailto.body, { email }));
      return;
    }

    submit.disabled = true;
    submit.textContent = labels.sending;
    fetch(endpoint, { method: 'POST', body: data, headers: { Accept: 'application/json' } })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        showSuccess(labels.success.title, labels.success.body);
      })
      .catch(() => {
        setStatus(format(labels.failure, { email }));
        submit.disabled = false;
        submit.textContent = labels.submit;
      });
  });

  initPrefill(form, labels);
}

/** Precompilazione: prodotto scelto da una card e produzione confermata dal configuratore. */
function initPrefill(form: HTMLFormElement, labels: Labels): void {
  const chip = form.querySelector<HTMLElement>('[data-selected-product]');
  const chipLabel = form.querySelector<HTMLElement>('[data-selected-product-label]');
  const remove = form.querySelector<HTMLButtonElement>('[data-remove-product]');
  const productInput = form.querySelector<HTMLInputElement>('[data-product-input]');
  const material = form.querySelector<HTMLSelectElement>('select[name="materiale"]');
  const message = form.querySelector<HTMLTextAreaElement>('textarea[name="messaggio"]');

  const setProduct = (title: string | null): void => {
    if (!chip || !chipLabel || !remove || !productInput) return;
    productInput.value = title ?? '';
    chip.hidden = title === null;
    chipLabel.textContent =
      title === null ? '' : format(labels.selectedProduct, { product: title });
    remove.setAttribute(
      'aria-label',
      title === null ? '' : format(labels.removeProduct, { product: title }),
    );
  };

  remove?.addEventListener('click', () => {
    setProduct(null);
    form.querySelector<HTMLElement>('input:not([type="hidden"])')?.focus();
  });

  for (const link of document.querySelectorAll<HTMLElement>('[data-product-link]')) {
    link.addEventListener('click', () => setProduct(link.dataset['productTitle'] ?? null));
  }

  let lastPrefill = '';
  document.addEventListener('tp:estimate', (event) => {
    const { detail } = event as CustomEvent<EstimateRequest>;
    if (material) {
      const option = [...material.options].find(
        (candidate) => candidate.dataset['materialId'] === detail.materialId,
      );
      if (option) material.value = option.value;
    }
    if (message) {
      // Sostituisce una precompilazione precedente, ma non tocca ciò che ha scritto l'utente
      const typed = message.value.replace(lastPrefill, '').trim();
      message.value = typed ? `${detail.message}\n\n${typed}` : detail.message;
      lastPrefill = detail.message;
    }
  });
}
