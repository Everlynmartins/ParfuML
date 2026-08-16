from __future__ import annotations

import json
import math
import re
import unicodedata
from collections import Counter
from pathlib import Path

import numpy as np
from scipy.stats import rankdata
from sklearn.cluster import AgglomerativeClustering
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.feature_extraction import DictVectorizer
from sklearn.metrics import (
    mean_absolute_error,
    mean_absolute_percentage_error,
    r2_score,
    silhouette_score,
)
from sklearn.model_selection import GroupShuffleSplit
from sklearn.neighbors import NearestNeighbors
from sklearn.preprocessing import OrdinalEncoder, normalize
from sklearn.decomposition import TruncatedSVD


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "public" / "perfumes.json"
REPORT_PATH = ROOT / "ml" / "model_report.json"
RANDOM_STATE = 42
EMBEDDING_DIMENSIONS = 48
N_CLUSTERS = 8


def normalized_text(value: object) -> str:
    text = unicodedata.normalize("NFD", str(value or ""))
    text = "".join(char for char in text if unicodedata.category(char) != "Mn")
    text = re.sub(r"\s+", " ", text).strip().lower()
    return text


def finite_number(value: object, default: float = 0.0) -> float:
    try:
        number = float(value)
        return number if math.isfinite(number) else default
    except (TypeError, ValueError):
        return default


def feature_key(prefix: str, value: object) -> str | None:
    cleaned = normalized_text(value)
    return f"{prefix}:{cleaned}" if cleaned else None


def scent_features(perfume: dict) -> dict[str, float]:
    features: dict[str, float] = {}

    def add(prefix: str, value: object, weight: float) -> None:
        key = feature_key(prefix, value)
        if key:
            features[key] = max(features.get(key, 0.0), weight)

    for note in perfume.get("notas", {}).get("topo", []):
        add("nota_topo", note, 1.00)
    for note in perfume.get("notas", {}).get("corpo", []):
        add("nota_corpo", note, 1.25)
    for note in perfume.get("notas", {}).get("fundo", []):
        add("nota_fundo", note, 1.50)
    for accord in perfume.get("acordes", []):
        add("acorde", accord, 1.15)
    add("familia", perfume.get("familia"), 1.40)
    add("familia_secundaria", perfume.get("familiaSecundaria"), 0.80)
    add("perfil", perfume.get("perfil"), 1.00)
    for occasion in perfume.get("ocasioes", []):
        add("ocasiao", occasion, 0.55)
    for climate in perfume.get("climas", []):
        add("clima", climate, 0.45)
    add("periodo", perfume.get("periodo"), 0.35)
    add("intensidade", perfume.get("intensidade"), 0.45)
    add("genero", perfume.get("genero"), 0.25)
    add("concentracao", perfume.get("concentracao"), 0.20)
    return features


def has_olfactory_data(perfume: dict) -> bool:
    notes = perfume.get("notas", {})
    note_count = sum(len(notes.get(position, [])) for position in ("topo", "corpo", "fundo"))
    family = normalized_text(perfume.get("familia"))
    return note_count > 0 or bool(perfume.get("acordes")) or family not in {"", "nao informada"}


def rounded_vector(vector: np.ndarray) -> list[float]:
    return np.round(vector.astype(float), 5).tolist()


def normalized_centroid(vectors: np.ndarray) -> np.ndarray:
    centroid = np.asarray(vectors, dtype=float).mean(axis=0)
    norm = np.linalg.norm(centroid)
    return centroid / norm if norm > 0 else centroid


def top_values(perfumes: list[dict], key: str, limit: int = 3) -> list[str]:
    values: list[str] = []
    for perfume in perfumes:
        value = perfume.get(key)
        if isinstance(value, list):
            values.extend(str(item) for item in value if item)
        elif value and normalized_text(value) != "nao informada":
            values.append(str(value))
    return [value for value, _ in Counter(values).most_common(limit)]


def top_notes(perfumes: list[dict], limit: int = 3) -> list[str]:
    values: list[str] = []
    for perfume in perfumes:
        notes = perfume.get("notas", {})
        for position in ("topo", "corpo", "fundo"):
            values.extend(str(item) for item in notes.get(position, []) if item)
    return [value for value, _ in Counter(values).most_common(limit)]


def provisional_cluster_name(members: list[dict]) -> str:
    profiles = top_values(members, "perfil", 2)
    families = top_values(members, "familia", 2)
    accords = [normalized_text(value) for value in top_values(members, "acordes", 5)]
    profile = profiles[0] if profiles else "Equilibrado"
    family = families[0] if families else ""

    if family == "Couro":
        return "Couro especiado"
    if family == "Âmbar Oriental":
        return "Âmbar oriental"
    if profile == "Doce" and family == "Gourmand":
        return "Gourmand especiado" if "spicy" in accords else "Gourmand adocicado"
    if profile == "Equilibrado" and family == "Aromática":
        return "Aromático clássico"
    if profile == "Equilibrado" and family == "Frutal":
        return "Frutal suave"
    if profile == "Floral" and "Amadeirada" in families:
        return "Floral amadeirado"
    if profile == "Fresco" and family == "Floral":
        return "Fresco floral"
    if profile == "Fresco" and family == "Cítrica" and "Verde" in families:
        return "Cítrico verde"

    if profile == "Fresco":
        if family in {"Cítrica", "Frutal"} or "citrus" in accords:
            return "Cítrico frutado"
        if family in {"Aquática", "Aromática", "Verde"}:
            return "Fresco aromático"
        return "Fresco contemporâneo"
    if profile == "Floral":
        if "sweet" in accords or "powdery" in accords:
            return "Floral adocicado"
        return "Floral luminoso"
    if profile == "Amadeirado":
        if "spicy" in accords or family in {"Couro", "Especiada"}:
            return "Amadeirado especiado"
        return "Amadeirado seco"
    if profile == "Doce":
        return "Gourmand adocicado"
    if profile == "Quente e especiado":
        return "Âmbar especiado"
    if family == "Floral":
        return "Floral versátil"
    if family == "Amadeirada":
        return "Madeiras versáteis"
    return "Equilibrado versátil"


def make_unique_names(cluster_rows: list[dict]) -> None:
    counts = Counter(row["name"] for row in cluster_rows)
    seen: Counter[str] = Counter()
    for row in cluster_rows:
        name = row["name"]
        if counts[name] <= 1:
            continue
        seen[name] += 1
        qualifier = row["families"][0] if row["families"] else str(seen[name])
        candidate = f"{name} · {qualifier}"
        if any(existing.get("name") == candidate for existing in cluster_rows):
            candidate = f"{name} · {seen[name]}"
        row["name"] = candidate


def intensity_bucket(perfume: dict) -> str:
    value = normalized_text(perfume.get("intensidade"))
    if "alta" in value:
        return "Alta"
    if "media" in value:
        return "Média"
    if "leve" in value:
        return "Leve"
    return "Não informada"


def price_categorical_row(perfume: dict) -> list[str]:
    return [
        str(perfume.get("marca") or "Não informada"),
        str(perfume.get("concentracao") or "Não informada"),
        str(perfume.get("genero") or "Não informado"),
        str(perfume.get("familia") or "Não informada"),
        str(perfume.get("familiaSecundaria") or "Não informada"),
        str(perfume.get("perfil") or "Não informado"),
        str(perfume.get("periodo") or "Não informado"),
        intensity_bucket(perfume),
    ]


def price_numeric_row(perfume: dict) -> list[float]:
    notes = perfume.get("notas", {})
    note_count = sum(len(notes.get(position, [])) for position in ("topo", "corpo", "fundo"))
    return [
        finite_number(perfume.get("avaliacao"), np.nan),
        math.log1p(max(0.0, finite_number(perfume.get("avaliacoes")))),
        finite_number(perfume.get("quantidadeLojas")),
        finite_number(perfume.get("quantidadeOfertas")),
        float(note_count),
        float(len(perfume.get("acordes", []))),
        finite_number(perfume.get("confianca"), np.nan),
    ]


def fit_price_model(perfumes: list[dict]) -> tuple[np.ndarray, dict]:
    price_indices = [
        index
        for index, perfume in enumerate(perfumes)
        if finite_number(perfume.get("preco100ml")) > 0
    ]
    price_perfumes = [perfumes[index] for index in price_indices]
    categorical = np.asarray([price_categorical_row(perfume) for perfume in price_perfumes], dtype=object)
    numeric = np.asarray([price_numeric_row(perfume) for perfume in price_perfumes], dtype=float)
    target = np.log1p(
        np.asarray([finite_number(perfume.get("preco100ml")) for perfume in price_perfumes], dtype=float)
    )
    groups = np.asarray(
        [normalized_text(f"{perfume.get('marca')} {perfume.get('nome')}") for perfume in price_perfumes]
    )

    splitter = GroupShuffleSplit(n_splits=1, test_size=0.25, random_state=RANDOM_STATE)
    train_index, test_index = next(splitter.split(categorical, target, groups=groups))

    encoder = OrdinalEncoder(
        handle_unknown="use_encoded_value",
        unknown_value=np.nan,
        encoded_missing_value=np.nan,
        min_frequency=2,
        max_categories=250,
    )
    train_categorical = encoder.fit_transform(categorical[train_index])
    test_categorical = encoder.transform(categorical[test_index])
    medians = np.nanmedian(numeric[train_index], axis=0)
    train_numeric = np.where(np.isnan(numeric[train_index]), medians, numeric[train_index])
    test_numeric = np.where(np.isnan(numeric[test_index]), medians, numeric[test_index])
    train_matrix = np.column_stack([train_categorical, train_numeric])
    test_matrix = np.column_stack([test_categorical, test_numeric])
    categorical_mask = [True] * categorical.shape[1] + [False] * numeric.shape[1]

    validation_model = HistGradientBoostingRegressor(
        learning_rate=0.055,
        max_iter=420,
        max_leaf_nodes=31,
        min_samples_leaf=18,
        l2_regularization=1.2,
        early_stopping=True,
        validation_fraction=0.16,
        random_state=RANDOM_STATE,
        categorical_features=categorical_mask,
    )
    validation_model.fit(train_matrix, target[train_index])
    predicted_log = validation_model.predict(test_matrix)
    actual_price = np.expm1(target[test_index])
    predicted_price = np.expm1(predicted_log)

    metrics = {
        "algorithm": "HistGradientBoostingRegressor",
        "target": "log do preço por 100 ml",
        "samples": len(price_indices),
        "trainSamples": len(train_index),
        "testSamples": len(test_index),
        "split": "25% fora da amostra, agrupado por marca e nome",
        "r2Log": round(float(r2_score(target[test_index], predicted_log)), 4),
        "maeBrl100ml": round(float(mean_absolute_error(actual_price, predicted_price)), 2),
        "mape": round(float(mean_absolute_percentage_error(actual_price, predicted_price)), 4),
    }

    final_encoder = OrdinalEncoder(
        handle_unknown="use_encoded_value",
        unknown_value=np.nan,
        encoded_missing_value=np.nan,
        min_frequency=2,
        max_categories=250,
    )
    all_categorical = final_encoder.fit_transform(categorical)
    all_medians = np.nanmedian(numeric, axis=0)
    all_numeric = np.where(np.isnan(numeric), all_medians, numeric)
    all_matrix = np.column_stack([all_categorical, all_numeric])
    final_model = HistGradientBoostingRegressor(
        learning_rate=0.055,
        max_iter=max(120, int(getattr(validation_model, "n_iter_", 260) * 1.15)),
        max_leaf_nodes=31,
        min_samples_leaf=18,
        l2_regularization=1.2,
        early_stopping=False,
        random_state=RANDOM_STATE,
        categorical_features=categorical_mask,
    )
    final_model.fit(all_matrix, target)

    every_categorical = np.asarray([price_categorical_row(perfume) for perfume in perfumes], dtype=object)
    every_numeric = np.asarray([price_numeric_row(perfume) for perfume in perfumes], dtype=float)
    every_matrix = np.column_stack(
        [
            final_encoder.transform(every_categorical),
            np.where(np.isnan(every_numeric), all_medians, every_numeric),
        ]
    )
    expected_price = np.expm1(final_model.predict(every_matrix))
    return expected_price, metrics


def percentile(values: np.ndarray) -> np.ndarray:
    if len(values) == 0:
        return values
    return (rankdata(values, method="average") - 1) / max(1, len(values) - 1)


def query_centroids(perfumes: list[dict], embeddings: np.ndarray) -> dict:
    dimensions: dict[str, dict[str, np.ndarray]] = {
        "genero": {},
        "perfil": {},
        "ocasiao": {},
        "clima": {},
        "intensidade": {},
    }

    def add(dimension: str, value: str, mask: np.ndarray) -> None:
        if mask.any():
            dimensions[dimension][value] = normalized_centroid(embeddings[mask])

    for value in ("Masculino", "Feminino", "Unissex"):
        add("genero", value, np.asarray([perfume.get("genero") == value for perfume in perfumes]))
    for value in ("Fresco", "Floral", "Amadeirado", "Doce", "Quente e especiado", "Equilibrado"):
        add("perfil", value, np.asarray([perfume.get("perfil") == value for perfume in perfumes]))
    occasion_map = {
        "Dia a dia": "Dia a dia",
        "Trabalho": "Trabalho",
        "Encontro": "Encontro",
        "Noite": "Noite",
        "Ao ar livre": "Atividade ao ar livre",
    }
    for answer, stored_value in occasion_map.items():
        add(
            "ocasiao",
            answer,
            np.asarray([stored_value in perfume.get("ocasioes", []) for perfume in perfumes]),
        )
    for value in ("Quente", "Ameno", "Frio"):
        add("clima", value, np.asarray([value in perfume.get("climas", []) for perfume in perfumes]))
    intensity_terms = {"Leve": "leve", "Média": "media", "Alta": "alta"}
    for value, term in intensity_terms.items():
        add(
            "intensidade",
            value,
            np.asarray([term in normalized_text(perfume.get("intensidade")) for perfume in perfumes]),
        )

    return {
        dimension: {value: rounded_vector(vector) for value, vector in values.items()}
        for dimension, values in dimensions.items()
    }


def main() -> None:
    payload = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    perfumes: list[dict] = payload["perfumes"]

    feature_rows = [scent_features(perfume) for perfume in perfumes]
    vectorizer = DictVectorizer(sparse=True)
    sparse_features = normalize(vectorizer.fit_transform(feature_rows), norm="l2")
    dimensions = min(EMBEDDING_DIMENSIONS, sparse_features.shape[1] - 1, len(perfumes) - 1)
    svd = TruncatedSVD(n_components=dimensions, n_iter=9, random_state=RANDOM_STATE)
    embeddings = normalize(svd.fit_transform(sparse_features), norm="l2")

    knn = NearestNeighbors(n_neighbors=6, metric="cosine", algorithm="brute")
    knn.fit(embeddings)
    neighbor_distances, neighbor_indices = knn.kneighbors(embeddings)
    profile_hits: list[float] = []
    family_hits: list[float] = []
    neighbor_similarities: list[float] = []
    for index, perfume in enumerate(perfumes):
        neighbors = neighbor_indices[index, 1:]
        similarities = 1 - neighbor_distances[index, 1:]
        neighbor_similarities.extend(similarities.tolist())
        profile = perfume.get("perfil")
        if profile:
            profile_hits.append(float(np.mean([perfumes[item].get("perfil") == profile for item in neighbors])))
        family = perfume.get("familia")
        if family and normalized_text(family) != "nao informada":
            family_hits.append(float(np.mean([perfumes[item].get("familia") == family for item in neighbors])))

    eligible_indices = np.asarray(
        [index for index, perfume in enumerate(perfumes) if has_olfactory_data(perfume)], dtype=int
    )
    cluster_model = AgglomerativeClustering(
        n_clusters=N_CLUSTERS,
        metric="cosine",
        linkage="average",
    )
    eligible_labels = cluster_model.fit_predict(embeddings[eligible_indices])
    all_labels = np.full(len(perfumes), -1, dtype=int)
    all_labels[eligible_indices] = eligible_labels

    palette = ["#789187", "#b8817d", "#96775f", "#c29562", "#a8614e", "#7b8778", "#6d8fa0", "#9b7894"]
    cluster_rows: list[dict] = []
    centroids: dict[int, np.ndarray] = {}
    for cluster_id in range(N_CLUSTERS):
        member_indices = eligible_indices[eligible_labels == cluster_id]
        members = [perfumes[index] for index in member_indices]
        centroid = normalized_centroid(embeddings[member_indices])
        centroids[cluster_id] = centroid
        prices = sorted(
            finite_number(perfume.get("precoMin"))
            for perfume in members
            if finite_number(perfume.get("precoMin")) > 0
        )
        families = top_values(members, "familia", 3)
        accords = top_values(members, "acordes", 4)
        notes = top_notes(members, 4)
        profiles = top_values(members, "perfil", 3)
        if families and accords:
            description = (
                "Predominam as famílias "
                + " e ".join(families[:2]).lower()
                + ", com acordes "
                + ", ".join(accords[:3]).lower()
                + "."
            )
        elif families:
            description = "Predominam as famílias " + " e ".join(families[:2]).lower() + "."
        else:
            description = "Perfil formado pelos dados olfativos disponíveis."
        cluster_rows.append(
            {
                "id": cluster_id,
                "name": provisional_cluster_name(members),
                "description": description,
                "count": len(members),
                "medianPrice": round(float(np.median(prices)), 2) if prices else None,
                "families": families,
                "accords": accords,
                "notes": notes,
                "profiles": profiles,
                "color": palette[cluster_id],
            }
        )
    make_unique_names(cluster_rows)
    cluster_by_id = {row["id"]: row for row in cluster_rows}

    expected_price, price_metrics = fit_price_model(perfumes)
    actual_valid_indices = np.asarray(
        [index for index, perfume in enumerate(perfumes) if finite_number(perfume.get("preco100ml")) > 0],
        dtype=int,
    )
    price_advantage = np.asarray(
        [
            math.log(max(expected_price[index], 1.0))
            - math.log(max(finite_number(perfumes[index].get("preco100ml")), 1.0))
            for index in actual_valid_indices
        ]
    )
    advantage_percentile = percentile(price_advantage)
    advantage_by_index = {
        int(index): float(value) for index, value in zip(actual_valid_indices, advantage_percentile)
    }

    rated_indices = np.asarray(
        [index for index, perfume in enumerate(perfumes) if finite_number(perfume.get("avaliacao")) > 0],
        dtype=int,
    )
    rating_values = np.asarray([finite_number(perfumes[index].get("avaliacao")) for index in rated_indices])
    review_values = np.asarray([finite_number(perfumes[index].get("avaliacoes")) for index in rated_indices])
    global_rating = float(np.average(rating_values, weights=np.minimum(review_values, 1000) + 1))
    bayesian_ratings = (review_values * rating_values + 60 * global_rating) / (review_values + 60)
    rating_percentiles = percentile(bayesian_ratings)
    rating_by_index = {int(index): float(value) for index, value in zip(rated_indices, rating_percentiles)}
    bayesian_by_index = {int(index): float(value) for index, value in zip(rated_indices, bayesian_ratings)}

    for index, perfume in enumerate(perfumes):
        cluster_id = int(all_labels[index])
        note_count = sum(
            len(perfume.get("notas", {}).get(position, [])) for position in ("topo", "corpo", "fundo")
        )
        data_level = (
            "detalhado"
            if note_count > 0 and perfume.get("acordes")
            else "geral"
            if has_olfactory_data(perfume)
            else "limitado"
        )
        actual_price = finite_number(perfume.get("preco100ml"))
        expected = float(expected_price[index])
        opportunity = ((expected - actual_price) / expected * 100) if actual_price > 0 and expected > 0 else None
        value_score = None
        bayesian_rating = bayesian_by_index.get(index)
        if index in advantage_by_index and index in rating_by_index:
            review_count = finite_number(perfume.get("avaliacoes"))
            review_confidence = review_count / (review_count + 60)
            availability = min(1.0, finite_number(perfume.get("quantidadeLojas")) / 5)
            value_score = round(
                100
                * (
                    0.45 * rating_by_index[index]
                    + 0.35 * advantage_by_index[index]
                    + 0.12 * review_confidence
                    + 0.08 * availability
                )
            )

        cluster_confidence = None
        cluster_name = "Dados olfativos limitados"
        if cluster_id >= 0:
            cluster_confidence = max(0.0, float(np.dot(embeddings[index], centroids[cluster_id])))
            cluster_name = cluster_by_id[cluster_id]["name"]

        perfume["ml"] = {
            "embedding": rounded_vector(embeddings[index]),
            "dataLevel": data_level,
            "cluster": cluster_id if cluster_id >= 0 else None,
            "clusterName": cluster_name,
            "clusterConfidence": round(cluster_confidence, 4) if cluster_confidence is not None else None,
            "expectedPrice100ml": round(expected, 2),
            "priceOpportunityPct": round(opportunity, 1) if opportunity is not None else None,
            "bayesianRating": round(bayesian_rating, 3) if bayesian_rating is not None else None,
            "valueScore": value_score,
        }

    sample_size = min(2000, len(eligible_indices))
    silhouette = silhouette_score(
        embeddings[eligible_indices],
        eligible_labels,
        metric="cosine",
        sample_size=sample_size,
        random_state=RANDOM_STATE,
    )
    query_vectors = query_centroids(perfumes, embeddings)
    model_meta = {
        "trainedAt": "2026-08-07",
        "contentModel": {
            "algorithm": "KNN com distância do cosseno",
            "features": int(sparse_features.shape[1]),
            "embeddingDimensions": int(dimensions),
            "explainedVariance": round(float(svd.explained_variance_ratio_.sum()), 4),
            "meanTop5Similarity": round(float(np.mean(neighbor_similarities)), 4),
            "profilePrecisionAt5": round(float(np.mean(profile_hits)), 4),
            "familyPrecisionAt5": round(float(np.mean(family_hits)), 4),
        },
        "clusterModel": {
            "algorithm": "Agrupamento hierárquico com ligação média e distância do cosseno",
            "samples": int(len(eligible_indices)),
            "clusters": N_CLUSTERS,
            "silhouette": round(float(silhouette), 4),
        },
        "priceModel": price_metrics,
        "valueFormula": {
            "bayesianRating": 0.45,
            "priceVersusExpected": 0.35,
            "reviewConfidence": 0.12,
            "availability": 0.08,
        },
        "profiles": cluster_rows,
        "queryCentroids": query_vectors,
    }
    payload["meta"]["ml"] = model_meta

    DATA_PATH.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    REPORT_PATH.write_text(
        json.dumps(model_meta, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(json.dumps(model_meta, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
