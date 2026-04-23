"""Backward-compatible wrapper around the new monorepo publish pipeline."""

from f1_prediction.publish import app, main


if __name__ == "__main__":
    app()
