import os
import re
from pathlib import Path
from typing import Dict, Iterable, Optional

import requests
from flask import Flask, jsonify, request
from flask_cors import CORS


ENV_PATH = Path(__file__).with_name(".env")


def load_dotenv_file() -> bool:
    if not ENV_PATH.exists():
        return False

    for raw_line in ENV_PATH.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value
    return True


ENV_LOADED = load_dotenv_file()

app = Flask(__name__)
CORS(app)

API_URL = "https://api.nal.usda.gov/fdc/v1/foods/search"
API_KEY = (
    os.getenv("USDA_FDC_API_KEY", "").strip()
    or os.getenv("FOODDATA_CENTRAL_API_KEY", "").strip()
    or os.getenv("DATA_GOV_API_KEY", "").strip()
)

FOOD_DB: Dict[str, Dict[str, float]] = {
    "rice": {"cal": 130, "pro": 2.7, "carb": 28},
    "roti": {"cal": 120, "pro": 3, "carb": 20},
    "egg": {"cal": 155, "pro": 13, "carb": 1.1},
    "chicken": {"cal": 165, "pro": 31, "carb": 0},
    "paneer": {"cal": 265, "pro": 18, "carb": 1.2},
    "milk": {"cal": 42, "pro": 3.4, "carb": 5},
    "banana": {"cal": 89, "pro": 1.1, "carb": 23},
    "apple": {"cal": 52, "pro": 0.3, "carb": 14},
    "dal": {"cal": 116, "pro": 9, "carb": 20},
    "bread": {"cal": 265, "pro": 9, "carb": 49},
    "pizza": {"cal": 266, "pro": 11, "carb": 33},
    "burger": {"cal": 295, "pro": 17, "carb": 30},
    "noodles": {"cal": 138, "pro": 4.5, "carb": 25},
    "pasta": {"cal": 131, "pro": 5, "carb": 25},
    "salad": {"cal": 33, "pro": 2, "carb": 6},
    "oats": {"cal": 389, "pro": 16.9, "carb": 66.3},
    "yogurt": {"cal": 59, "pro": 10, "carb": 3.6},
    "tofu": {"cal": 144, "pro": 17.3, "carb": 2.8},
    "potato": {"cal": 77, "pro": 2, "carb": 17},
    "idli": {"cal": 146, "pro": 4.5, "carb": 29},
    "dosa": {"cal": 184, "pro": 4.3, "carb": 29},
    "upma": {"cal": 156, "pro": 4, "carb": 24},
    "poha": {"cal": 130, "pro": 2.6, "carb": 25},
    "peanut butter": {"cal": 588, "pro": 25, "carb": 20},
    "rajma": {"cal": 127, "pro": 8.7, "carb": 22.8},
    "kidney beans": {"cal": 127, "pro": 8.7, "carb": 22.8},
    "chole": {"cal": 164, "pro": 8.9, "carb": 27.4},
    "chickpeas": {"cal": 164, "pro": 8.9, "carb": 27.4},
    "omelette": {"cal": 154, "pro": 11, "carb": 1.7},
    "biryani": {"cal": 180, "pro": 6, "carb": 25},
    "samosa": {"cal": 262, "pro": 4.2, "carb": 24},
    "pav bhaji": {"cal": 151, "pro": 3.6, "carb": 20},
    "grilled fish": {"cal": 128, "pro": 26, "carb": 0},
    "ice cream": {"cal": 207, "pro": 3.5, "carb": 24},
    "khichdi": {"cal": 105, "pro": 3.4, "carb": 18},
    "paratha": {"cal": 260, "pro": 5.5, "carb": 33},
    "aloo paratha": {"cal": 265, "pro": 6, "carb": 36},
    "curd rice": {"cal": 132, "pro": 3.1, "carb": 21},
    "pakora": {"cal": 312, "pro": 6.5, "carb": 27},
    "vada": {"cal": 220, "pro": 7, "carb": 25},
    "dal makhani": {"cal": 170, "pro": 7.3, "carb": 18},
    "palak paneer": {"cal": 140, "pro": 6.5, "carb": 7},
    "butter chicken": {"cal": 220, "pro": 15, "carb": 6},
    "tandoori chicken": {"cal": 190, "pro": 27, "carb": 3},
    "uttapam": {"cal": 180, "pro": 5, "carb": 29},
    "sambar": {"cal": 58, "pro": 2.2, "carb": 9},
    "rasam": {"cal": 35, "pro": 1.2, "carb": 5},
    "lassi": {"cal": 98, "pro": 3.3, "carb": 15},
    "jalebi": {"cal": 459, "pro": 4.6, "carb": 56},
    "gulab jamun": {"cal": 380, "pro": 4, "carb": 54},
    "barfi": {"cal": 420, "pro": 7, "carb": 45},
}

QUERY_ALIASES = {
    "rajma chawal": "kidney beans rice",
    "rajma": "kidney beans",
    "chole bhature": "chickpeas fried bread",
    "chole": "chickpeas",
    "paneer bhurji": "paneer scramble",
    "omelette": "omelet",
    "pav bhaji": "vegetable curry bread roll",
    "poha": "flattened rice cooked",
    "upma": "semolina upma",
    "idli": "idli steamed rice cake",
}

ENERGY_KEYS = {"1008", "208"}
PROTEIN_KEYS = {"1003", "protein"}
CARB_KEYS = {"1005", "carbohydrate, by difference", "carbohydrate"}


def normalize_query(query: str) -> str:
    lowered = query.lower()
    for source, target in QUERY_ALIASES.items():
        if source in lowered:
            return lowered.replace(source, target)
    return query


def search_query_from_input(query: str) -> str:
    cleaned = normalize_query(query.lower())
    cleaned = re.sub(r"\b\d+(\.\d+)?\s*(g|gm|grams|gram|kg|ml|l|oz)\b", " ", cleaned)
    cleaned = re.sub(r"\b\d+(\.\d+)?\b", " ", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned or query


def fallback_estimate(food_name: str):
    lowered = food_name.lower()

    for item, macros in FOOD_DB.items():
        if item in lowered:
            return {
                "cal": macros["cal"],
                "pro": macros["pro"],
                "carb": macros["carb"],
                "fallback": True,
                "source": "local_database",
                "note": f"Estimated from local database match: {item}",
            }

    if "juice" in lowered:
        return {
            "cal": 45,
            "pro": 0.5,
            "carb": 11,
            "fallback": True,
            "source": "heuristic",
            "note": "Estimated beverage value",
        }

    if any(word in lowered for word in ("sweet", "cake", "chocolate", "dessert")):
        return {
            "cal": 250,
            "pro": 3,
            "carb": 40,
            "fallback": True,
            "source": "heuristic",
            "note": "Estimated dessert value",
        }

    return {
        "cal": 180,
        "pro": 6,
        "carb": 25,
        "fallback": True,
        "source": "heuristic",
        "note": "General fallback estimate",
    }


def with_api_debug(payload, attempted=False, status_code=None, detail=None):
    payload["api_attempted"] = attempted
    payload["api_status_code"] = status_code
    if detail:
        payload["api_detail"] = detail
    return payload


def nutrient_value(nutrients: Iterable[dict], keys: set[str], unit_name: Optional[str] = None) -> Optional[float]:
    for nutrient in nutrients:
        number = str(nutrient.get("nutrientNumber", "")).lower()
        name = str(nutrient.get("nutrientName", "")).lower()
        unit = str(nutrient.get("unitName", "")).lower()
        if number in keys or name in keys:
            if unit_name and unit != unit_name.lower():
                continue
            value = nutrient.get("value")
            if value is not None:
                try:
                    return float(value)
                except (TypeError, ValueError):
                    return None
    return None


def extract_macros(food: dict) -> Optional[dict]:
    nutrients = food.get("foodNutrients", [])
    cal = nutrient_value(nutrients, ENERGY_KEYS, unit_name="kcal")
    pro = nutrient_value(nutrients, PROTEIN_KEYS)
    carb = nutrient_value(nutrients, CARB_KEYS)

    if cal is None and pro is None and carb is None:
        return None

    return {
        "cal": cal or 0,
        "pro": pro or 0,
        "carb": carb or 0,
        "fallback": False,
        "source": "api",
        "note": f"USDA match: {food.get('description', 'Food item')}",
    }


def food_match_score(query: str, food: dict) -> int:
    description = str(food.get("description", "")).lower()
    query_words = [word for word in query.lower().split() if len(word) > 1]
    matched_words = sum(1 for word in query_words if word in description)

    score = matched_words * 10

    data_type = str(food.get("dataType", "")).lower()
    if "foundation" in data_type:
        score += 8
    elif "sr legacy" in data_type:
        score += 6
    elif "survey" in data_type:
        score += 4
    elif "branded" in data_type:
        score -= 4

    if description.startswith(query.lower()):
        score += 8
    elif query.lower() in description:
        score += 4

    prefers_cooked = any(word in query.lower() for word in ("cooked", "boiled", "steamed", "omelet", "omelette"))
    if prefers_cooked:
        if any(word in description for word in ("cooked", "boiled", "steamed", "omelet", "omelette")):
            score += 10
        if "raw" in description:
            score -= 10
    else:
        if "raw" in description:
            score -= 2

    if "dry" in description and "cooked" not in query.lower():
        score -= 4
    if "unprepared" in description:
        score -= 4

    return score


def best_food_match(query: str, foods: list[dict]) -> Optional[dict]:
    ranked = sorted(foods, key=lambda food: food_match_score(query, food), reverse=True)
    for food in ranked:
        macros = extract_macros(food)
        if macros:
            return macros
    return None


@app.route("/")
def home():
    return jsonify({"status": "ok", "message": "NutriTrack backend is running"})


@app.route("/health")
def health():
    return jsonify(
        {
            "status": "healthy",
            "api_key_configured": bool(API_KEY),
            "api_provider": "USDA FoodData Central",
            "fallback_items": len(FOOD_DB),
            "dotenv_found": ENV_PATH.exists(),
            "dotenv_loaded": ENV_LOADED,
            "dotenv_path": str(ENV_PATH),
        }
    )


@app.route("/foods")
def foods():
    return jsonify({"items": sorted(FOOD_DB.keys())})


@app.route("/nutrition")
def get_nutrition():
    query = (request.args.get("query") or "").strip()

    if not query:
        return jsonify({"error": "No food provided"}), 400

    if API_KEY:
        try:
            api_query = search_query_from_input(query)
            response = requests.get(
                API_URL,
                params={
                    "api_key": API_KEY,
                    "query": api_query,
                    "pageSize": 10,
                },
                timeout=8,
            )

            if response.ok:
                data = response.json()
                foods = data.get("foods", [])
                if foods:
                    macros = best_food_match(api_query, foods)
                    if macros:
                        return jsonify(macros)
                return jsonify(
                    with_api_debug(
                        fallback_estimate(query),
                        attempted=True,
                        status_code=response.status_code,
                        detail="USDA returned no usable nutrition item for this query",
                    )
                )

            return jsonify(
                with_api_debug(
                    fallback_estimate(query),
                    attempted=True,
                    status_code=response.status_code,
                    detail=response.text[:200],
                )
            )
        except requests.RequestException:
            return jsonify(
                with_api_debug(
                    fallback_estimate(query),
                    attempted=True,
                    detail="Request to USDA FoodData Central failed",
                )
            )

    return jsonify(
        with_api_debug(
            fallback_estimate(query),
            attempted=False,
            detail="No API key configured",
        )
    )


if __name__ == "__main__":
    app.run(debug=True)
