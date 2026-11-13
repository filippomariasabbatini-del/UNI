import { MATERIAL_IDS, pricing, type MaterialId } from '../config/pricing';
import { format, formatCurrency } from '../lib/format';
import { estimate, type Estimate } from '../lib/pricing';
import { intlLocale, readJson } from './dom';
import { tween } from './motion';

interface Labels {
  pieces: string;
  days: string;
  onRequest: string;
  prefill: string;
  prefillOnRequest: string;
  total: string;
}

/** Dettaglio dell'evento `tp:estimate`, ascoltato dal form contatti. */
export interface EstimateRequest {
  materialId: MaterialId;
  message: string;
}

const THUMB_WIDTH_REM = 1.75;

function isMaterialId(value: string): value is MaterialId {
  return (MATERIAL_IDS as readonly string[]).includes(value);
}

/** Configuratore: ricalcola la stima a ogni modifica e fa scorrere i numeri. */
export function initEstimator(): void {
  const root = document.querySelector<HTMLElement>('[data-estimator]');
  const labels = root ? readJson<Labels>(root, 'labels') : null;
  const select = root?.querySelector<HTMLSelectElement>('[data-estimator-material]');
  const range = root?.querySelector<HTMLInputElement>('[data-estimator-range]');
  const quantityOutput = root?.querySelector<HTMLElement>('[data-estimator-quantity]');
  const totalOutput = root?.querySelector<HTMLElement>('[data-estimator-total]');
  const unitOutput = root?.querySelector<HTMLElement>('[data-estimator-unit]');
  const leadOutput = root?.querySelector<HTMLElement>('[data-estimator-lead]');
  const note = root?.querySelector<HTMLElement>('[data-estimator-note]');
  const live = root?.querySelector<HTMLElement>('[data-estimator-live]');
  const cta = root?.querySelector<HTMLElement>('[data-estimator-cta]');
  const ticks = root?.querySelector<HTMLElement>('[data-estimator-ticks]');
  if (
    !root ||
    !labels ||
    !select ||
    !range ||
    !quantityOutput ||
    !totalOutput ||
    !unitOutput ||
    !leadOutput
  ) {
    return;
  }

  const locale = intlLocale();
  const money = (value: number, digits: 0 | 2): string =>
    formatCurrency(value, locale, pricing.currency, digits);
  const { min, max } = pricing.quantity;

  let shown: Estimate = estimate(pricing.defaultMaterial, pricing.quantity.default, pricing);
  let stopTotal: () => void = () => undefined;
  let stopUnit: () => void = () => undefined;
  let liveTimer = 0;

  const current = (): Estimate => {
    const material = isMaterialId(select.value) ? select.value : pricing.defaultMaterial;
    return estimate(material, Number(range.value), pricing);
  };

  const materialName = (): string => select.selectedOptions[0]?.textContent?.trim() ?? '';

  const render = (): void => {
    const next = current();
    const previous = shown;
    shown = next;

    quantityOutput.textContent = format(labels.pieces, { quantity: next.quantity });
    range.style.setProperty('--range-progress', `${((next.quantity - min) / (max - min)) * 100}%`);
    if (note) note.hidden = next.available;
    stopTotal();
    stopUnit();

    if (!next.available) {
      totalOutput.textContent = labels.onRequest;
      unitOutput.textContent = labels.onRequest;
      leadOutput.textContent = labels.onRequest;
    } else {
      const fromTotal = previous.available ? previous.total : next.total;
      const fromUnit = previous.available ? previous.unitPrice : next.unitPrice;
      stopTotal = tween(fromTotal, next.total, 450, (value) => {
        totalOutput.textContent = money(Math.round(value), 0);
      });
      stopUnit = tween(fromUnit, next.unitPrice, 450, (value) => {
        unitOutput.textContent = money(value, 2);
      });
      leadOutput.textContent =
        next.leadDays === null ? labels.onRequest : format(labels.days, { days: next.leadDays });
    }

    // Annuncio per screen reader, a modifiche ferme: non a ogni passo dello slider
    if (live) {
      window.clearTimeout(liveTimer);
      liveTimer = window.setTimeout(() => {
        const total = next.available ? money(next.total, 0) : labels.onRequest;
        live.textContent = `${materialName()}, ${quantityOutput.textContent ?? ''}. ${labels.total}: ${total}.`;
      }, 600);
    }
  };

  // Etichette delle tacche allineate al centro del cursore
  if (ticks) {
    for (const tick of ticks.querySelectorAll<HTMLElement>('[data-tick]')) {
      const ratio = (Number(tick.dataset['tick']) - min) / (max - min);
      tick.style.left = `calc(${ratio} * (100% - ${THUMB_WIDTH_REM}rem) + ${THUMB_WIDTH_REM / 2}rem)`;
    }
    ticks.hidden = false;
  }

  select.addEventListener('change', render);
  range.addEventListener('input', render);

  cta?.addEventListener('click', () => {
    const result = current();
    const material = isMaterialId(select.value) ? select.value : pricing.defaultMaterial;
    const values = {
      quantity: result.quantity,
      material: materialName(),
      total: result.available ? money(result.total, 0) : '',
    };
    document.dispatchEvent(
      new CustomEvent<EstimateRequest>('tp:estimate', {
        detail: {
          materialId: material,
          message: format(result.available ? labels.prefill : labels.prefillOnRequest, values),
        },
      }),
    );
  });

  render();
}
