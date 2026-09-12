import { describe, expect, it } from "vitest";
import { AssetMismatchError, Money } from "../src/money.js";

describe("Money (DATA-03)", () => {
  it("reproduces the Lina fixture without float rounding drift", () => {
    // docs/v2.2/personal.fixture.json
    const current = Money.of("650.00", "fiat:EUR");
    const transfer = Money.of("230.00", "fiat:EUR");
    const rent = Money.of("600.00", "fiat:EUR");
    const groceries = Money.of("100.00", "fiat:EUR");
    const transport = Money.of("80.00", "fiat:EUR");
    const salary = Money.of("1600.00", "fiat:EUR");

    const beforeSalary = current.add(transfer).subtract(rent).subtract(groceries).subtract(transport);
    expect(beforeSalary.toDecimalString()).toBe("100");

    const afterSalary = beforeSalary.add(salary);
    expect(afterSalary.toDecimalString()).toBe("1700");

    const savingsRemaining = Money.of("300.00", "fiat:EUR").subtract(transfer);
    expect(savingsRemaining.toDecimalString()).toBe("70");

    const totalAfterSalary = afterSalary.add(savingsRemaining);
    expect(totalAfterSalary.toDecimalString()).toBe("1770");
  });

  it("refuses to mix two assets", () => {
    const eur = Money.of("10", "fiat:EUR");
    const xrp = Money.of("10", "xrpl:XRP");
    expect(() => eur.add(xrp)).toThrow(AssetMismatchError);
  });

  it("refuses an unnamespaced asset id", () => {
    expect(() => Money.of("10", "EUR")).toThrow();
  });

  it("keeps full precision to 18 decimals", () => {
    const a = Money.of("0.000000000000000001", "fiat:EUR");
    const b = Money.of("0.000000000000000002", "fiat:EUR");
    expect(a.add(b).toDecimalString()).toBe("0.000000000000000003");
  });
});
