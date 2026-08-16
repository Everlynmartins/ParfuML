#!/usr/bin/env python3
"""Remove purchase-identifying fields before distributing the browser dataset."""

from __future__ import annotations

import json
import sys
from pathlib import Path


PUBLIC_KEYS = {
    "id", "marca", "nome", "concentracao", "genero", "familia",
    "familiaSecundaria", "acordes", "notas", "perfil", "ocasioes",
    "climas", "periodo", "intensidade", "avaliacao", "avaliacoes",
    "precoMin", "preco100ml", "faixaPreco", "quantidadeLojas",
    "confianca", "ml",
}


def sanitize(source: Path, destination: Path) -> None:
    payload = json.loads(source.read_text(encoding="utf-8"))
    payload["perfumes"] = [
        {key: perfume[key] for key in PUBLIC_KEYS if key in perfume}
        for perfume in payload["perfumes"]
    ]
    destination.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("uso: sanitize_public_data.py ENTRADA SAIDA")
    sanitize(Path(sys.argv[1]), Path(sys.argv[2]))
