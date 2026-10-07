/**
 * Fixed-precision decimal arithmetic helper for inventory quantities.
 * Prevents IEEE 754 floating-point inaccuracies (e.g., 0.1 + 0.2 !== 0.3).
 */

const PRECISION = 4; // internal calculation precision
const SCALE = 2;     // standard database storage scale

function toScaled(val) {
  const num = typeof val === 'string' ? parseFloat(val) : Number(val);
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

function fromScaled(scaled) {
  return parseFloat((scaled / 100).toFixed(SCALE));
}

class DecimalUtil {
  static round(val, decimals = SCALE) {
    const factor = Math.pow(10, decimals);
    return Math.round((Number(val) + Number.EPSILON) * factor) / factor;
  }

  static add(a, b) {
    const sum = toScaled(a) + toScaled(b);
    return fromScaled(sum);
  }

  static subtract(a, b) {
    const diff = toScaled(a) - toScaled(b);
    return fromScaled(diff);
  }

  static isLessThan(a, b) {
    return toScaled(a) < toScaled(b);
  }

  static isGreaterThan(a, b) {
    return toScaled(a) > toScaled(b);
  }

  static equals(a, b) {
    return toScaled(a) === toScaled(b);
  }

  static parseQuantity(val) {
    const num = typeof val === 'string' ? parseFloat(val) : Number(val);
    if (isNaN(num) || !isFinite(num)) {
      return NaN;
    }
    return DecimalUtil.round(num, SCALE);
  }
}

module.exports = DecimalUtil;
