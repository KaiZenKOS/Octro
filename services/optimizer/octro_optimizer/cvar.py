"""CVaR at level alpha over an explicit discrete scenario set (ENG-03, chapter 14).

Rockafellar-Uryasev: CVaR_alpha(L) = min_eta { eta + E[max(0, L-eta)] / (1-alpha) }.
For a finite scenario set with explicit probabilities this has a closed
form equal to the probability-weighted average of the loss in the worst
(1-alpha) tail, which is what this module computes directly instead of
running a generic optimizer for a two-line closed form.
"""
from decimal import Decimal

from .money import to_decimal


def compute_cvar(losses, weights, alpha):
    """losses/weights: same-length sequences of Decimal-coercible values.

    weights must sum to 1 (a normalized probability mass function).
    Returns a Decimal. Raises ValueError on malformed input instead of
    silently normalizing bad data.
    """
    if len(losses) != len(weights):
        raise ValueError("losses and weights must have the same length")
    if not losses:
        raise ValueError("at least one scenario is required")

    alpha = to_decimal(alpha)
    if not (Decimal("0") <= alpha < Decimal("1")):
        raise ValueError("alpha must be in [0, 1)")

    dweights = [to_decimal(w) for w in weights]
    total_weight = sum(dweights, Decimal("0"))
    if abs(total_weight - Decimal("1")) > Decimal("0.0000001"):
        raise ValueError(f"scenario weights must sum to 1, got {total_weight}")

    tail_mass = Decimal("1") - alpha
    if tail_mass == 0:
        # alpha == 1 is not accepted above; kept defensively.
        return Decimal("0")

    pairs = sorted(
        ((to_decimal(l), w) for l, w in zip(losses, dweights)),
        key=lambda p: p[0],
        reverse=True,
    )

    remaining = tail_mass
    weighted_tail_loss = Decimal("0")
    for loss, weight in pairs:
        if remaining <= 0:
            break
        take = weight if weight <= remaining else remaining
        weighted_tail_loss += take * loss
        remaining -= take

    return weighted_tail_loss / tail_mass
