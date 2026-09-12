"""One-shot JSON subprocess interface for the Node application service."""
import json
import sys

from .projection import calculate_personal_projection


def main() -> int:
    try:
        request = json.load(sys.stdin)
        result = calculate_personal_projection(request)
        sys.stdout.write(json.dumps(result, separators=(",", ":"), sort_keys=True))
        sys.stdout.write("\n")
        return 0
    except Exception as exc:  # the API maps failures to a non-action error
        sys.stderr.write(f"optimizer request failed: {type(exc).__name__}: {exc}\n")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
