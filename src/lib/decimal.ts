/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export class Decimal {
  private valueInCents: number;

  constructor(value: number | string) {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) {
      this.valueInCents = 0;
    } else {
      this.valueInCents = Math.round(num * 100);
    }
  }

  static fromCents(cents: number): Decimal {
    const d = new Decimal(0);
    d.valueInCents = cents;
    return d;
  }

  add(other: Decimal | number): Decimal {
    const otherCents = other instanceof Decimal ? other.valueInCents : Math.round(other * 100);
    return Decimal.fromCents(this.valueInCents + otherCents);
  }

  sub(other: Decimal | number): Decimal {
    const otherCents = other instanceof Decimal ? other.valueInCents : Math.round(other * 100);
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

  toString(): string {
    return (this.valueInCents / 100).toFixed(2);
  }
}

export function dec(val: number | string): Decimal {
  return new Decimal(val);
}
