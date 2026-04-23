"""Tests for ingest module — focused on path logic, not FastF1 network calls."""

from pathlib import Path

import pandas as pd

from f1_prediction import ingest


def test_results_path_is_deterministic():
    p = ingest._results_path(2024, 1)
    assert p.name == "round=01.parquet"
    assert p.parent.name == "season=2024"
    assert p.parent.parent.name == "results"


def test_results_path_pads_round():
    assert ingest._results_path(2024, 7).name == "round=07.parquet"
    assert ingest._results_path(2024, 24).name == "round=24.parquet"


def test_parquet_roundtrip(tmp_path: Path, monkeypatch):
    """Write a toy DataFrame to the expected path and read it back."""
    monkeypatch.setattr(ingest, "RAW_DIR", tmp_path / "raw")

    df = pd.DataFrame(
        {
            "Abbreviation": ["VER", "NOR"],
            "Position": [1, 2],
            "Points": [25, 18],
            "season": [2024, 2024],
            "round": [1, 1],
        }
    )
    out = ingest._results_path(2024, 1)
    out.parent.mkdir(parents=True, exist_ok=True)
    df.to_parquet(out, index=False)

    loaded = pd.read_parquet(out)
    assert list(loaded["Abbreviation"]) == ["VER", "NOR"]
    assert loaded.loc[0, "Position"] == 1
