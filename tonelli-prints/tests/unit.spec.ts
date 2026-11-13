import { expect, test } from '@playwright/test';
import { pricing } from '../src/config/pricing';
import { format } from '../src/lib/format';
import { responsiveWidths } from '../src/lib/images';
import { assertPricingConfig, estimate, unitFactor } from '../src/lib/pricing';
import { contentSecurityPolicy } from '../src/lib/security-headers';
import { localMoment, studioStatus } from '../src/lib/studio-hours';

const WEEK = {
  mon: ['09:00', '18:00'],
  tue: ['09:00', '18:00'],
  wed: ['09:00', '18:00'],
  thu: ['09:00', '18:00'],
  fri: ['09:00', '18:00'],
  sat: null,
  sun: null,
} satisfies Parameters<typeof studioStatus>[0];

test.describe('pricing', () => {
  test('la configurazione è valida', () => {
    expect(() => assertPricingConfig(pricing)).not.toThrow();
  });

  test('rispetta i due punti reali del PLA+ 2.0', () => {
    expect(estimate('pla-plus', 100, pricing)).toMatchObject({
      available: true,
      unitPrice: 3.4,
      total: 340,
      leadDays: 4,
    });
    expect(estimate('pla-plus', 150, pricing)).toMatchObject({
      available: true,
      unitPrice: 2.99,
      total: 449,
      leadDays: 5,
    });
  });

  test('il prezzo unitario non sale e il totale non scende mai al crescere della quantità', () => {
    const { min, max, step } = pricing.quantity;
    let previous = estimate('pla-plus', min, pricing);
    for (let quantity = min + step; quantity <= max; quantity += step) {
      const current = estimate('pla-plus', quantity, pricing);
      if (!previous.available || !current.available) throw new Error('stima non disponibile');
      expect(current.unitPrice).toBeLessThanOrEqual(previous.unitPrice);
      expect(current.total).toBeGreaterThanOrEqual(previous.total);
      previous = current;
    }
  });

  test('i materiali senza prezzo risultano "su richiesta"', () => {
    expect(estimate('petg', 150, pricing)).toEqual({ available: false, quantity: 150 });
  });

  test('la quantità viene riportata nell’intervallo e allo step', () => {
    expect(estimate('pla-plus', 5, pricing).quantity).toBe(pricing.quantity.min);
    expect(estimate('pla-plus', 99_999, pricing).quantity).toBe(pricing.quantity.max);
    expect(estimate('pla-plus', 154, pricing).quantity).toBe(150);
    expect(unitFactor(125, pricing.curve)).toBeCloseTo(0.94, 5);
  });
});

test.describe('studio-hours', () => {
  test('converte un istante nel fuso dello studio', () => {
    // 13 novembre 2026, 21:30 UTC = venerdì 22:30 a Roma (CET)
    expect(localMoment(new Date('2026-11-13T21:30:00Z'), 'Europe/Rome')).toEqual({
      weekday: 'fri',
      minutes: 22 * 60 + 30,
    });
  });

  test('aperto in orario', () => {
    expect(studioStatus(WEEK, { weekday: 'tue', minutes: 10 * 60 })).toEqual({
      state: 'open',
      closesAt: '18:00',
    });
  });

  test('chiuso prima dell’apertura, dopo la chiusura e nel weekend', () => {
    expect(studioStatus(WEEK, { weekday: 'tue', minutes: 7 * 60 })).toMatchObject({
      state: 'closed',
      reopens: 'later-today',
      at: '09:00',
    });
    expect(studioStatus(WEEK, { weekday: 'tue', minutes: 19 * 60 })).toMatchObject({
      state: 'closed',
      reopens: 'tomorrow',
      weekday: 'wed',
    });
    expect(studioStatus(WEEK, { weekday: 'fri', minutes: 19 * 60 })).toMatchObject({
      state: 'closed',
      reopens: 'later',
      weekday: 'mon',
    });
    expect(studioStatus(WEEK, { weekday: 'sun', minutes: 12 * 60 })).toMatchObject({
      state: 'closed',
      reopens: 'tomorrow',
      weekday: 'mon',
    });
  });
});

test.describe('utilità', () => {
  test('format sostituisce i segnaposto noti e lascia gli altri', () => {
    expect(format('{a} e {b}', { a: 1 })).toBe('1 e {b}');
  });

  test('responsiveWidths non supera mai la larghezza originale', () => {
    expect(responsiveWidths(782)).toEqual([400, 640, 782]);
    expect(responsiveWidths(2000)).toEqual([400, 640, 800, 1080, 1440]);
  });

  test('la CSP include l’origine del form e nessun unsafe-inline', () => {
    const csp = contentSecurityPolicy({
      formEndpoint: 'https://formspree.io/f/abc',
      analyticsScriptUrl: null,
    });
    expect(csp).toContain("connect-src 'self' https://formspree.io");
    expect(csp).toContain("form-action 'self' https://formspree.io");
    expect(csp).not.toContain('unsafe-inline');
    expect(contentSecurityPolicy({ formEndpoint: null, analyticsScriptUrl: null })).toContain(
      "form-action 'self' mailto:",
    );
  });
});
