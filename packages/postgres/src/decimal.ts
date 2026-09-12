const DECIMAL = /^-?(0|[1-9][0-9]*)(\.[0-9]{1,18})?$/;

/** Validate exact PostgreSQL NUMERIC(38,18) inputs without ever converting to JS number. */
export function assertNumeric38Scale18(value: unknown): asserts value is string {
  if (typeof value !== "string" || !DECIMAL.test(value)) {
    throw new TypeError("DATA-03: PostgreSQL amounts must be strict decimal strings (max scale 18)");
  }
  const digits = value.replace(/^-/, "").replace(".", "");
  const integerDigits = value.replace(/^-/, "").split(".")[0]!.length;
  const scale = value.split(".")[1]?.length ?? 0;
  if (digits.length > 38 || integerDigits > 20 || scale > 18) {
    throw new RangeError("DATA-03: amount exceeds NUMERIC(38,18)");
  }
}

/** Normalize PostgreSQL's fixed-scale numeric text for semantic replay checks. */
export function canonicalDecimal(value: string): string {
  assertNumeric38Scale18(value);
  const negative = value.startsWith("-");
  const unsigned = negative ? value.slice(1) : value;
  const [integerPart = "0", fractionalPart = ""] = unsigned.split(".");
  const integer = integerPart.replace(/^0+(?=\d)/, "");
  const fraction = fractionalPart.replace(/0+$/, "");
  if (integer === "0" && fraction.length === 0) return "0";
  return `${negative ? "-" : ""}${integer}${fraction ? `.${fraction}` : ""}`;
}
