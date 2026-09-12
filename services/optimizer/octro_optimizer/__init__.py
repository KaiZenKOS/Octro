"""Octro deterministic financial engine: no HTTP, LLM or XRPL SDK dependency."""

from .projection import ENGINE_VERSION, calculate_personal_projection

__all__ = ["ENGINE_VERSION", "calculate_personal_projection"]
