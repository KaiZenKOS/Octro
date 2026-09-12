// Money — objet de valeur du domaine (DATA-03). Arithmetique en bigint mis a
// l'echelle 10^18 (NUMERIC(38,18) cote PostgreSQL, CDC chapitre 11) : jamais
// de float binaire pour la comptabilite, et jamais de melange d'actifs.
import { AssetIdSchema, DecimalStringSchema, type AssetId, type Money as MoneyDTO } from "@octro/contracts";

const SCALE_DIGITS = 18;
const SCALE_FACTOR = 10n ** BigInt(SCALE_DIGITS);

function toScaled(decimal: string): bigint {
  const negative = decimal.startsWith("-");
  const unsigned = negative ? decimal.slice(1) : decimal;
  const [intPart, fracPart = ""] = unsigned.split(".");
  const paddedFrac = (fracPart + "0".repeat(SCALE_DIGITS)).slice(0, SCALE_DIGITS);
  const scaled = BigInt(intPart ?? "0") * SCALE_FACTOR + BigInt(paddedFrac === "" ? "0" : paddedFrac);
  return negative ? -scaled : scaled;
}

function fromScaled(value: bigint): string {
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const intPart = abs / SCALE_FACTOR;
  const fracDigits = (abs % SCALE_FACTOR).toString().padStart(SCALE_DIGITS, "0").replace(/0+$/, "");
  const body = fracDigits.length > 0 ? `${intPart}.${fracDigits}` : `${intPart}`;
  return negative && value !== 0n ? `-${body}` : body;
}

export class AssetMismatchError extends Error {
  constructor(a: AssetId, b: AssetId) {
    super(`cannot combine amounts of different assets: ${a} vs ${b}`);
    this.name = "AssetMismatchError";
  }
}

export class Money {
  private constructor(
    private readonly scaled: bigint,
    readonly assetId: AssetId,
  ) {}

  // Le seul point d'entree accepte une chaine decimale validee : un `number`
  // JS ne type-checke pas ici, ce qui empeche un float d'entrer par erreur.
  static of(amountDecimal: string, assetId: string): Money {
    const parsedAsset = AssetIdSchema.parse(assetId);
    const parsedDecimal = DecimalStringSchema.parse(amountDecimal);
    return new Money(toScaled(parsedDecimal), parsedAsset);
  }

  static zero(assetId: string): Money {
    return Money.of("0", assetId);
  }

  toDecimalString(): string {
    return fromScaled(this.scaled);
  }

  toDTO(): MoneyDTO {
    return { amount_decimal: this.toDecimalString(), asset_id: this.assetId };
  }

  private assertSameAsset(other: Money): void {
    if (other.assetId !== this.assetId) {
      throw new AssetMismatchError(this.assetId, other.assetId);
    }
  }

  add(other: Money): Money {
    this.assertSameAsset(other);
    return new Money(this.scaled + other.scaled, this.assetId);
  }

  subtract(other: Money): Money {
    this.assertSameAsset(other);
    return new Money(this.scaled - other.scaled, this.assetId);
  }

  isNegative(): boolean {
    return this.scaled < 0n;
  }

  compare(other: Money): -1 | 0 | 1 {
    this.assertSameAsset(other);
    if (this.scaled === other.scaled) return 0;
    return this.scaled < other.scaled ? -1 : 1;
  }
}
