import pytest

from services.regression import compute_linear_regression


def test_compute_linear_regression_returns_expected_fit():
    data = [
        {"x": 1, "y": 2},
        {"x": 2, "y": 4},
        {"x": 3, "y": 6},
        {"x": 4, "y": 8},
    ]

    result = compute_linear_regression(data, "x", "y")

    assert result["slope"] == pytest.approx(2.0)
    assert result["intercept"] == pytest.approx(0.0)
    assert result["standard_deviation"] == pytest.approx(0.0)
    assert result["x_values"] == [1, 2, 3, 4]
    assert result["y_values"] == [2, 4, 6, 8]
    assert result["line_x_values"] == [1, 4]
    assert result["line_y_values"] == [2, 8]


def test_compute_linear_regression_rejects_non_numeric_values():
    data = [
        {"x": "bad", "y": 2},
        {"x": 2, "y": 4},
    ]

    with pytest.raises(ValueError, match="numeric"):
        compute_linear_regression(data, "x", "y")
