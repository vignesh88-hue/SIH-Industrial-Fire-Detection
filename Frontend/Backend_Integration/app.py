from pathlib import Path

import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


# ============================================================
# APP
# ============================================================

app = FastAPI(
    title="SIH Industrial Fire Detection API",
    version="1.0.0"
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://sih-industrial-fire-detection-frontend.onrender.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# DATA
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

# Backend_Integration/
#       app.py
#
# Project root/
#       data/
#           predictions_final.csv

DATA_FILE = (
    BASE_DIR.parent.parent
    / "Backend"
    / "data"
    / "predictions_final.csv"
)


def load_data():

    if not DATA_FILE.exists():
        raise FileNotFoundError(
            f"Prediction file not found: {DATA_FILE}"
        )

    df = pd.read_csv(DATA_FILE)

    # ========================================================
    # FRONTEND COMPATIBILITY
    # ========================================================

    # ML pipeline uses "frp"
    # Existing frontend expects "current_frp"
    if "frp" in df.columns and "current_frp" not in df.columns:
        df["current_frp"] = df["frp"]

    # ========================================================
    # INDUSTRIAL PREDICTION
    # ========================================================

    if (
        "probability_industrial" in df.columns
        and "prediction" not in df.columns
    ):
        df["prediction"] = (
            df["probability_industrial"] >= 0.50
        ).astype(int)

    # ========================================================
    # RISK LEVEL
    # ========================================================

    # Create risk_level if it is missing
    if (
        "probability_industrial" in df.columns
        and "risk_level" not in df.columns
    ):

        def classify_risk(p):

            if p >= 0.70:
                return "High"

            elif p >= 0.40:
                return "Moderate"

            else:
                return "Low"

        df["risk_level"] = df[
            "probability_industrial"
        ].apply(classify_risk)

    # ========================================================
    # DATE
    # ========================================================

    if "acq_date" in df.columns:

        df["acq_date"] = pd.to_datetime(
            df["acq_date"],
            errors="coerce"
        ).dt.strftime("%Y-%m-%d")

    return df


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/")
def root():

    return {
        "status": "online",
        "service": "SIH Industrial Fire Detection API"
    }


# ============================================================
# ALL DETECTIONS
# ============================================================

@app.get("/api/detections")
def get_detections():

    df = load_data()

    # Convert NaN / NaT → None
    df = df.astype(object).where(
        pd.notnull(df),
        None
    )

    return df.to_dict(
        orient="records"
    )


# ============================================================
# SUMMARY
# ============================================================

@app.get("/api/summary")
def get_summary():

    df = load_data()

    # --------------------------------------------------------
    # Make sure risk_level exists
    # --------------------------------------------------------

    if "risk_level" not in df.columns:

        if "probability_industrial" in df.columns:

            def classify_risk(p):
                if p >= 0.70:
                    return "High"
                elif p >= 0.40:
                    return "Moderate"
                else:
                    return "Low"

            df["risk_level"] = (
                df["probability_industrial"]
                .astype(float)
                .apply(classify_risk)
            )

        else:
            raise ValueError(
                "CSV does not contain probability_industrial"
            )

    # --------------------------------------------------------
    # Summary
    # --------------------------------------------------------

    total = len(df)

    high = int(
        (df["risk_level"] == "High").sum()
    )

    moderate = int(
        (df["risk_level"] == "Moderate").sum()
    )

    low = int(
        (df["risk_level"] == "Low").sum()
    )

    # FRP compatibility
    if "current_frp" in df.columns:
        frp_column = "current_frp"
    elif "frp" in df.columns:
        frp_column = "frp"
    else:
        frp_column = None

    if frp_column:
        max_frp = float(df[frp_column].max())
        avg_frp = float(df[frp_column].mean())
    else:
        max_frp = 0.0
        avg_frp = 0.0

    return {
        "total": total,
        "high": high,
        "moderate": moderate,
        "low": low,
        "max_frp": max_frp,
        "avg_frp": avg_frp
    }