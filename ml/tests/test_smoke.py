"""Smoke test — imports work and version is set."""

from f1_prediction import __version__


def test_version_is_set():
    assert __version__ == "0.1.0"
