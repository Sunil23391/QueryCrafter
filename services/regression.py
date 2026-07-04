import math
from typing import Any, Dict, List

import numpy as np


def _normalize_numeric(value: Any) -> float:
    if isinstance(value, bool):
        raise ValueError("Boolean values are not supported.")
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        stripped = value.strip()
        if not stripped:
            raise ValueError("Empty string is not numeric.")
        try:
            return float(stripped)
        except ValueError as exc:
            raise ValueError("Non-numeric value encountered.") from exc
    raise ValueError("Non-numeric value encountered.")


def _serialize_number(value: float) -> Any:
    if value.is_integer():
        return int(value)
    return round(value, 6)


def compute_linear_regression(data: List[Dict[str, Any]], x_column: str, y_column: str) -> Dict[str, Any]:
    if not isinstance(data, list) or not data:
        raise ValueError("Data must be a non-empty list of rows.")
    if not x_column or not y_column:
        raise ValueError("x_column and y_column are required.")

    x_values: List[Any] = []
    y_values: List[Any] = []
    numeric_x: List[float] = []
    numeric_y: List[float] = []

    for row in data:
        if not isinstance(row, dict):
            raise ValueError("Each row must be an object.")
        try:
            x_value = _normalize_numeric(row.get(x_column))
        except ValueError as exc:
            raise ValueError(f"Column '{x_column}' contains non-numeric values.") from exc
        try:
            y_value = _normalize_numeric(row.get(y_column))
        except ValueError as exc:
            raise ValueError(f"Column '{y_column}' contains non-numeric values.") from exc

        numeric_x.append(x_value)
        numeric_y.append(y_value)
        x_values.append(_serialize_number(x_value))
        y_values.append(_serialize_number(y_value))

    if len(numeric_x) < 2:
        raise ValueError("At least two numeric points are required.")

    x_array = np.array(numeric_x, dtype=float)
    y_array = np.array(numeric_y, dtype=float)
    x_mean = float(np.mean(x_array))
    y_mean = float(np.mean(y_array))
    denominator = float(np.sum((x_array - x_mean) ** 2))
    if math.isclose(denominator, 0.0):
        raise ValueError("x_column values must vary for regression.")

    slope = float(np.sum((x_array - x_mean) * (y_array - y_mean)) / denominator)
    intercept = float(y_mean - slope * x_mean)
    predictions = slope * x_array + intercept
    residuals = y_array - predictions
    standard_deviation = float(np.std(residuals, ddof=0))

    x_min = float(np.min(x_array))
    x_max = float(np.max(x_array))
    line_x_values = [_serialize_number(x_min), _serialize_number(x_max)]
    line_y_values = [_serialize_number(slope * x_min + intercept), _serialize_number(slope * x_max + intercept)]

    return {
        "success": True,
        "slope": round(slope, 6),
        "intercept": round(intercept, 6),
        "standard_deviation": round(standard_deviation, 6),
        "x_values": x_values,
        "y_values": y_values,
        "line_x_values": line_x_values,
        "line_y_values": line_y_values,
    }
