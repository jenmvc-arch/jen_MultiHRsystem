/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export class Decimal {
  private valueInCents: number;

  constructor(value: number | string) {
    if (typeof value === 'number') {
      this.valueInCents = Math.round(value * 100);
    } else if (typeof value === 'string') {
      const clean = value.trim();
      if (!/^\d+(\.\d+)?$/.test(clean)) {
        this.valueInCents = 0;
        return;
      }
      if (clean.includes('.')) {
        const [intPart, decPart] = clean.split('.');
        const paddedDec = decPart.padEnd(2, '0').slice(0, 2);
        this.valueInCents = parseInt(intPart, 10) * 100 + parseInt(paddedDec, 10);
      } else {
        this.valueInCents = parseInt(clean, 10) * 100;
      }
    } else {
      this.valueInCents = 0;
    }
  }

  static fromCents(cents: number): Decimal {
    const d = new Decimal(0);
    d.valueInCents = Math.round(cents);
    return d;
  }

  add(other: Decimal | number): Decimal {
    const otherCents = other instanceof Decimal ? other.valueInCents : new Decimal(other).valueInCents;
    return Decimal.fromCents(this.valueInCents + otherCents);
  }

  sub(other: Decimal | number): Decimal {
    const otherCents = other instanceof Decimal ? other.valueInCents : new Decimal(other).valueInCents;
    return Decimal.fromCents(this.valueInCents - otherCents);
  }

  mul(factor: number): Decimal {
    return Decimal.fromCents(Math.round(this.valueInCents * factor));
  }

  div(divisor: number): Decimal {
    if (divisor === 0) return Decimal.fromCents(0);
    return Decimal.fromCents(Math.round(this.valueInCents / divisor));
  }

  toNumber(): number {
    return this.valueInCents / 100;
  }

  toIntegerCents(): number {
    return this.valueInCents;
  }

  toString(): string {
    return (this.valueInCents / 100).toFixed(2);
  }
}

export function dec(val: number | string): Decimal {
  return new Decimal(val);
}

export function validateInputAmount(val: string): number {
  const clean = val.trim().replace(/,/g, '');
  if (clean.includes('.')) {
    const decimals = clean.split('.')[1];
    if (decimals.length > 2) {
      throw new Error("Payroll monetary input may contain a maximum of two decimal places.");
    }
  }
  return dec(clean).toIntegerCents();
}
