"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

type Notes = {
  topo: string[];
  corpo: string[];
  fundo: string[];
};

type PerfumeML = {
  embedding: number[];
  dataLevel: "detalhado" | "geral" | "limitado";
  cluster: number | null;
  clusterName: string;
  clusterConfidence: number | null;
  expectedPrice100ml: number | null;
  priceOpportunityPct: number | null;
  bayesianRating: number | null;
  valueScore: number | null;
};

type LearnedProfile = {
  id: number;
  name: string;
  description: string;
  count: number;
  medianPrice: number | null;
  families: string[];
  accords: string[];
  notes: string[];
  profiles: string[];
  color: string;
};

type QueryCentroids = Record<string, Record<string, number[]>>;

type Perfume = {
  id: string;
  marca: string;
  nome: string;
  concentracao: string;
  genero: string;
  familia: string;
  familiaSecundaria: string;
  acordes: string[];
  notas: Notes;
  perfil: string;
  ocasioes: string[];
  climas: string[];
  periodo: string;
  intensidade: string;
  avaliacao: number | null;
  avaliacoes: number | null;
  precoMin: number | null;
  preco100ml: number | null;
  faixaPreco: string;
  quantidadeLojas: number;
  confianca: number | null;
  ml: PerfumeML;
};

type Database = {
  meta: {
    dataColeta: string;
    perfumes: number;
    ml: {
      trainedAt: string;
      contentModel: {
        algorithm: string;
        features: number;
        embeddingDimensions: number;
        explainedVariance: number;
        meanTop5Similarity: number;
        profilePrecisionAt5: number;
        familyPrecisionAt5: number;
      };
      clusterModel: {
        algorithm: string;
        samples: number;
        clusters: number;
        silhouette: number;
      };
      priceModel: {
        algorithm: string;
        target: string;
        samples: number;
        trainSamples: number;
        testSamples: number;
        split: string;
        r2Log: number;
        maeBrl100ml: number;
        mape: number;
      };
      profiles: LearnedProfile[];
      queryCentroids: QueryCentroids;
    };
  };
  perfumes: Perfume[];
};

type Answers = {
  genero: string;
  perfil: string;
  ocasiao: string;
  clima: string;
  intensidade: string;
  orcamento: string;
};

type RankedPerfume = Perfume & {
  match: number;
  motivos: string[];
};

type ExplorerMode = "similares" | "valor" | "perfis";

const publicPath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const logoPath = `${publicPath}/parfuml-logo.png`;
const repositoryUrl =
  process.env.NEXT_PUBLIC_REPOSITORY_URL ??
  "https://github.com/Everlynmartins/ParfuML";

const questions = [
  {
    key: "genero" as const,
    eyebrow: "Para quem",
    title: "Como você prefere explorar o catálogo?",
    help: "A opção unissex mantém perfumes classificados dessa forma na fonte.",
    options: [
      ["Masculino", "Masculino"],
      ["Feminino", "Feminino"],
      ["Unissex", "Unissex"],
      ["Tanto faz", "Todos os gêneros"],
    ],
  },
  {
    key: "perfil" as const,
    eyebrow: "Sensação olfativa",
    title: "Qual perfil mais chama sua atenção?",
    help: "O perfil combina família, acordes e classificação inicial.",
    options: [
      ["Fresco", "Cítrico, aquático ou verde"],
      ["Floral", "Flores claras ou intensas"],
      ["Amadeirado", "Madeiras, couro ou chipre"],
      ["Doce", "Gourmand, baunilha ou cremoso"],
      ["Especiado", "Âmbar, especiarias ou calor"],
      ["Equilibrado", "Sem uma direção dominante"],
    ],
  },
  {
    key: "ocasiao" as const,
    eyebrow: "Momento",
    title: "Quando você pretende usar?",
    help: "A mesma fragrância pode funcionar em mais de uma ocasião.",
    options: [
      ["Dia a dia", "Rotina e compromissos leves"],
      ["Trabalho", "Ambientes compartilhados"],
      ["Encontro", "Presença com proximidade"],
      ["Noite", "Eventos e ocasiões especiais"],
      ["Ao ar livre", "Atividades e dias abertos"],
    ],
  },
  {
    key: "clima" as const,
    eyebrow: "Temperatura",
    title: "Em qual clima ele será mais usado?",
    help: "A classificação usa as ocasiões e famílias registradas na base.",
    options: [
      ["Quente", "Dias de calor"],
      ["Ameno", "Temperaturas moderadas"],
      ["Frio", "Dias frios ou ambientes climatizados"],
      ["Qualquer", "Uso ao longo do ano"],
    ],
  },
  {
    key: "intensidade" as const,
    eyebrow: "Presença",
    title: "Quanta intensidade você procura?",
    help: "Esta intensidade é uma estimativa derivada do perfil olfativo.",
    options: [
      ["Leve", "Discreto e próximo da pele"],
      ["Média", "Perceptível sem dominar"],
      ["Alta", "Marcante e persistente"],
      ["Qualquer", "Sem preferência"],
    ],
  },
  {
    key: "orcamento" as const,
    eyebrow: "Orçamento",
    title: "Quanto você pretende gastar?",
    help: "Usamos o menor preço observado em 5 de agosto de 2026.",
    options: [
      ["200", "Até R$ 200"],
      ["400", "Até R$ 400"],
      ["700", "Até R$ 700"],
      ["1000", "Até R$ 1.000"],
      ["1500", "Até R$ 1.500"],
      ["0", "Sem limite"],
    ],
  },
];

const familyColors: Record<string, string> = {
  Floral: "rose",
  Gourmand: "amber",
  Amadeirada: "wood",
  Cítrica: "citrus",
  Frutal: "berry",
  Aquática: "water",
  Aromática: "sage",
  Verde: "sage",
  Especiada: "amber",
  "Âmbar Oriental": "amber",
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function formatCurrency(value: number | null) {
  if (value === null) return "Preço não informado";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

function formatCount(value: number | null) {
  if (!value) return "poucas avaliações";
  return `${new Intl.NumberFormat("pt-BR", { notation: value >= 1000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(value)} avaliações`;
}

function weightedRating(perfume: Perfume) {
  if (perfume.avaliacao === null) return 6.8;
  const reviews = perfume.avaliacoes ?? 0;
  const confidence = reviews / (reviews + 60);
  return confidence * perfume.avaliacao + (1 - confidence) * 7.2;
}

function cosineSimilarity(left: number[], right: number[]) {
  if (!left.length || left.length !== right.length) return 0;
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftNorm += left[index] ** 2;
    rightNorm += right[index] ** 2;
  }
  const denominator = Math.sqrt(leftNorm) * Math.sqrt(rightNorm);
  return denominator > 0 ? dot / denominator : 0;
}

function normalizedVector(vectors: Array<{ vector: number[]; weight: number }>) {
  if (!vectors.length) return [];
  const length = vectors[0].vector.length;
  const combined = Array.from({ length }, () => 0);
  vectors.forEach(({ vector, weight }) => {
    vector.forEach((value, index) => {
      combined[index] += value * weight;
    });
  });
  const norm = Math.sqrt(combined.reduce((sum, value) => sum + value ** 2, 0));
  return norm > 0 ? combined.map((value) => value / norm) : combined;
}

function buildUserVector(database: Database, answers: Answers) {
  const centroids = database.meta.ml.queryCentroids;
  const profileValue = answers.perfil === "Especiado" ? "Quente e especiado" : answers.perfil;
  const selections = [
    { dimension: "genero", value: answers.genero, weight: 0.55, skip: "Tanto faz" },
    { dimension: "perfil", value: profileValue, weight: 2.2, skip: "" },
    { dimension: "ocasiao", value: answers.ocasiao, weight: 1.15, skip: "" },
    { dimension: "clima", value: answers.clima, weight: 0.9, skip: "Qualquer" },
    { dimension: "intensidade", value: answers.intensidade, weight: 0.85, skip: "Qualquer" },
  ];
  const vectors = selections.flatMap(({ dimension, value, weight, skip }) => {
    if (!value || value === skip) return [];
    const vector = centroids[dimension]?.[value];
    return vector ? [{ vector, weight }] : [];
  });
  return normalizedVector(vectors);
}

function sharedValues(left: string[], right: string[]) {
  const rightNormalized = new Map(right.map((item) => [normalize(item), item]));
  return left.filter((item) => rightNormalized.has(normalize(item)));
}

function dedupeRanked(perfumes: RankedPerfume[]) {
  const seen = new Set<string>();
  return perfumes.filter((perfume) => {
    const key = normalize(`${perfume.marca} ${perfume.nome}`);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function scoreSimilarity(perfume: Perfume, reference: Perfume): RankedPerfume {
  const similarity = cosineSimilarity(perfume.ml.embedding, reference.ml.embedding);
  const motivos: string[] = [];

  const sharedNotes = [
    ...sharedValues(perfume.notas.fundo, reference.notas.fundo),
    ...sharedValues(perfume.notas.corpo, reference.notas.corpo),
    ...sharedValues(perfume.notas.topo, reference.notas.topo),
  ];
  if (sharedNotes.length > 0) {
    motivos.push(`notas em comum: ${sharedNotes.slice(0, 2).join(" e ")}`);
  } else {
    const sharedAccords = sharedValues(perfume.acordes, reference.acordes);
    if (sharedAccords.length > 0) motivos.push(`acordes em comum: ${sharedAccords.slice(0, 2).join(" e ")}`);
  }
  if (perfume.ml.cluster !== null && perfume.ml.cluster === reference.ml.cluster) {
    motivos.push(`mesmo perfil aprendido: ${perfume.ml.clusterName.toLowerCase()}`);
  }
  if (
    perfume.precoMin !== null &&
    reference.precoMin !== null &&
    perfume.precoMin < reference.precoMin
  ) {
    const saving = Math.round((1 - perfume.precoMin / reference.precoMin) * 100);
    motivos.push(`${saving}% abaixo do menor preço da referência`);
  }

  if (motivos.length === 0) motivos.push("proximidade pelo vetor olfativo aprendido");
  const score = similarity * 0.94 + (weightedRating(perfume) / 10) * 0.04 + Math.min(1, perfume.quantidadeLojas / 5) * 0.02;
  return { ...perfume, match: Math.max(1, Math.min(99, Math.round(score * 100))), motivos: motivos.slice(0, 3) };
}

function scoreValue(perfume: Perfume): RankedPerfume {
  const motivos: string[] = [];
  if (perfume.ml.bayesianRating !== null) {
    motivos.push(`avaliação ajustada ${perfume.ml.bayesianRating.toFixed(1)} com ${formatCount(perfume.avaliacoes)}`);
  }
  if (perfume.ml.priceOpportunityPct !== null && perfume.ml.priceOpportunityPct > 0) {
    motivos.push(`${Math.round(perfume.ml.priceOpportunityPct)}% abaixo do preço esperado por 100 ml`);
  } else if (perfume.ml.expectedPrice100ml !== null) {
    motivos.push(`preço esperado ${formatCurrency(perfume.ml.expectedPrice100ml)} por 100 ml`);
  }
  motivos.push(
    perfume.quantidadeLojas > 1
      ? `observado em ${perfume.quantidadeLojas} canais na data da coleta`
      : "preço observado na data da coleta",
  );
  return { ...perfume, match: Math.min(99, perfume.ml.valueScore ?? 1), motivos: motivos.slice(0, 3) };
}

function scoreProfile(perfume: Perfume, profile: LearnedProfile): RankedPerfume {
  const confidence = perfume.ml.clusterConfidence ?? 0;
  const score = confidence * 0.78 + (weightedRating(perfume) / 10) * 0.14 + Math.min(1, perfume.quantidadeLojas / 5) * 0.08;
  const motivos = [
    `agrupado no perfil ${profile.name.toLowerCase()}`,
    perfume.familia !== "Não informada" ? `família ${perfume.familia.toLowerCase()}` : "classificação baseada no vetor disponível",
  ];
  if (perfume.avaliacao !== null) motivos.push(`avaliação ${perfume.avaliacao.toFixed(1)}`);
  return { ...perfume, match: Math.min(99, Math.round(score * 100)), motivos };
}

function scorePerfume(perfume: Perfume, answers: Answers, userVector: number[]): RankedPerfume {
  const similarity = cosineSimilarity(perfume.ml.embedding, userVector);
  const motivos: string[] = [];
  motivos.push(`afinidade vetorial ${Math.max(0, Math.round(similarity * 100))}%`);

  const selectedProfile = answers.perfil === "Especiado" ? "Quente e especiado" : answers.perfil;
  if (perfume.perfil === selectedProfile) motivos.push(`perfil ${selectedProfile.toLowerCase()}`);

  const occasionTargets =
    answers.ocasiao === "Noite"
      ? ["noite", "ocasiao especial"]
      : answers.ocasiao === "Ao ar livre"
        ? ["atividade ao ar livre"]
        : [normalize(answers.ocasiao)];
  const perfumeOccasions = perfume.ocasioes.map(normalize);
  if (occasionTargets.some((target) => perfumeOccasions.includes(target))) {
    motivos.push(`indicado para ${answers.ocasiao.toLowerCase()}`);
  }

  if (answers.clima !== "Qualquer" && perfume.climas.map(normalize).includes(normalize(answers.clima))) {
    motivos.push(`combina com clima ${answers.clima.toLowerCase()}`);
  }

  if (answers.intensidade !== "Qualquer") {
    const intensity = normalize(perfume.intensidade);
    const matches =
      answers.intensidade === "Leve"
        ? intensity.includes("leve")
        : answers.intensidade === "Alta"
          ? intensity.includes("alta")
          : intensity.includes("media");
    if (matches) motivos.push(`intensidade ${perfume.intensidade.toLowerCase()}`);
  }

  const dataScore = perfume.ml.dataLevel === "detalhado" ? 1 : perfume.ml.dataLevel === "geral" ? 0.72 : 0.35;
  const score = similarity * 0.78 + (weightedRating(perfume) / 10) * 0.1 + Math.min(1, perfume.quantidadeLojas / 5) * 0.07 + dataScore * 0.05;
  return { ...perfume, match: Math.max(1, Math.min(99, Math.round(score * 100))), motivos: motivos.slice(0, 3) };
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.8c.5 5.1 2.9 7.6 7.9 8.1c-5 .5-7.4 3-7.9 8.2c-.5-5.2-2.9-7.7-7.9-8.2c5-.5 7.4-3 7.9-8.1Z" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="m7 4 6 6-6 6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="m4.5 10.2 3.2 3.2 7.8-7.8" />
    </svg>
  );
}

function PerfumeCard({ perfume, index }: { perfume: RankedPerfume; index: number }) {
  const notes = [
    ...perfume.notas.topo,
    ...perfume.notas.corpo,
    ...perfume.notas.fundo,
    ...perfume.acordes,
  ].slice(0, 4);
  const color = familyColors[perfume.familia] ?? "neutral";

  return (
    <article className="perfume-card" style={{ animationDelay: `${index * 70}ms` }}>
      <div className={`bottle-stage ${color}`} aria-hidden="true">
        <span className="bottle-cap" />
        <span className="bottle-body">
          <span>{perfume.marca.slice(0, 1)}</span>
        </span>
        <span className="match-pill">{perfume.match}%</span>
      </div>
      <div className="perfume-copy">
        <p className="brand">{perfume.marca}</p>
        <h3>{perfume.nome}</h3>
        <p className="concentration">{perfume.concentracao}</p>
        <div className="perfume-meta">
          <span>{perfume.familia}</span>
          {perfume.avaliacao !== null && <span>★ {perfume.avaliacao.toFixed(1)}</span>}
        </div>
        {perfume.ml.cluster !== null && (
          <span className="model-profile">{perfume.ml.clusterName}</span>
        )}
        {notes.length > 0 && (
          <div className="notes" aria-label="Notas e acordes principais">
            {notes.map((note) => (
              <span key={note}>{note}</span>
            ))}
          </div>
        )}
        <div className="why">
          {perfume.motivos.map((motivo) => (
            <span key={motivo}>
              <CheckIcon /> {motivo}
            </span>
          ))}
        </div>
      </div>
      <div className="card-footer">
        <div>
          <small>Menor preço observado (05/08/2026)</small>
          <strong>{formatCurrency(perfume.precoMin)}</strong>
          <span>
            Observado em {perfume.quantidadeLojas} {perfume.quantidadeLojas === 1 ? "canal" : "canais"}
          </span>
          {perfume.preco100ml !== null && <span>{formatCurrency(perfume.preco100ml)} por 100 ml</span>}
        </div>
        <span className="price-note">Referência informativa; preços, estoque e condições podem ter mudado.</span>
      </div>
    </article>
  );
}

function Explorer({ database }: { database: Database | null }) {
  const [mode, setMode] = useState<ExplorerMode>("similares");
  const [query, setQuery] = useState("MYSLF");
  const [referenceId, setReferenceId] = useState("BRP03150");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [cheaperOnly, setCheaperOnly] = useState(true);
  const [sameGender, setSameGender] = useState(true);
  const [valueGender, setValueGender] = useState("Todos");
  const [valueBudget, setValueBudget] = useState("400");
  const [selectedProfile, setSelectedProfile] = useState(0);

  const reference = database?.perfumes.find((perfume) => perfume.id === referenceId) ?? null;
  const learnedProfiles = database?.meta.ml.profiles ?? [];
  const selectedProfileData = learnedProfiles.find((profile) => profile.id === selectedProfile) ?? learnedProfiles[0] ?? null;

  const suggestions = useMemo(() => {
    if (!database || query.trim().length < 2) return [];
    const terms = normalize(query).split(/\s+/).filter(Boolean);
    return database.perfumes
      .filter((perfume) => {
        const text = normalize(`${perfume.marca} ${perfume.nome} ${perfume.concentracao}`);
        return terms.every((term) => text.includes(term));
      })
      .sort((a, b) => {
        const aData = a.notas.topo.length + a.notas.corpo.length + a.notas.fundo.length + a.acordes.length;
        const bData = b.notas.topo.length + b.notas.corpo.length + b.notas.fundo.length + b.acordes.length;
        return bData - aData || (b.avaliacoes ?? 0) - (a.avaliacoes ?? 0);
      })
      .slice(0, 7);
  }, [database, query]);

  const similarResults = useMemo(() => {
    if (!database || !reference) return [];
    const ranked = database.perfumes
      .filter((perfume) => {
        if (perfume.id === reference.id || perfume.precoMin === null) return false;
        if (cheaperOnly && reference.precoMin !== null && perfume.precoMin >= reference.precoMin) return false;
        if (
          sameGender &&
          perfume.genero !== reference.genero &&
          perfume.genero !== "Unissex" &&
          reference.genero !== "Unissex"
        ) return false;
        return perfume.ml.dataLevel !== "limitado";
      })
      .map((perfume) => scoreSimilarity(perfume, reference))
      .sort((a, b) => b.match - a.match || weightedRating(b) - weightedRating(a));
    return dedupeRanked(ranked).slice(0, 6);
  }, [cheaperOnly, database, reference, sameGender]);

  const valueResults = useMemo(() => {
    if (!database) return [];
    const budget = Number(valueBudget);
    const ranked = database.perfumes
      .filter((perfume) => {
        if (perfume.precoMin === null || perfume.ml.valueScore === null) return false;
        if ((perfume.avaliacoes ?? 0) < 5) return false;
        if (budget > 0 && perfume.precoMin > budget) return false;
        if (valueGender !== "Todos" && perfume.genero !== valueGender && perfume.genero !== "Unissex") return false;
        return true;
      })
      .map(scoreValue)
      .sort((a, b) => b.match - a.match || (b.avaliacoes ?? 0) - (a.avaliacoes ?? 0));
    return dedupeRanked(ranked).slice(0, 6);
  }, [database, valueBudget, valueGender]);

  const profileResults = useMemo(() => {
    if (!database || !selectedProfileData) return [];
    const ranked = database.perfumes
      .filter((perfume) => perfume.ml.cluster === selectedProfileData.id && perfume.precoMin !== null)
      .map((perfume) => scoreProfile(perfume, selectedProfileData))
      .sort((a, b) => b.match - a.match || (b.avaliacoes ?? 0) - (a.avaliacoes ?? 0));
    return dedupeRanked(ranked).slice(0, 6);
  }, [database, selectedProfileData]);

  function pickReference(perfume: Perfume) {
    setReferenceId(perfume.id);
    setQuery(`${perfume.marca} ${perfume.nome}`);
    setShowSuggestions(false);
  }

  const modeCopy = {
    similares: {
      eyebrow: "KNN por similaridade olfativa",
      title: "Parta de um perfume conhecido.",
      body: "O modelo busca os vizinhos mais próximos em 48 dimensões usando distância do cosseno.",
    },
    valor: {
      eyebrow: "Preço esperado e custo benefício",
      title: "Equilibre avaliação, preço e disponibilidade.",
      body: "O modelo estima o preço por 100 ml e identifica perfumes vendidos abaixo do valor esperado para suas características.",
    },
    perfis: {
      eyebrow: "Agrupamento hierárquico",
      title: "Veja o catálogo por sensação dominante.",
      body: "O modelo encontrou 8 grupos entre 2.404 perfumes com dados olfativos suficientes.",
    },
  }[mode];

  return (
    <section className="explorer-section" id="explorar">
      <div className="explorer-heading">
        <div>
          <p className="eyebrow">Outras formas de explorar</p>
          <h2>Uma base. Diferentes perguntas.</h2>
        </div>
        <div className="mode-tabs" role="tablist" aria-label="Modos de exploração">
          <button className={mode === "similares" ? "active" : ""} onClick={() => setMode("similares")} type="button" role="tab" aria-selected={mode === "similares"}>Parecidos</button>
          <button className={mode === "valor" ? "active" : ""} onClick={() => setMode("valor")} type="button" role="tab" aria-selected={mode === "valor"}>Custo benefício</button>
          <button className={mode === "perfis" ? "active" : ""} onClick={() => setMode("perfis")} type="button" role="tab" aria-selected={mode === "perfis"}>Perfis</button>
        </div>
      </div>

      <div className="explorer-panel">
        <div className="explorer-intro">
          <p>{modeCopy.eyebrow}</p>
          <h3>{modeCopy.title}</h3>
          <span>{modeCopy.body}</span>
        </div>

        {mode === "similares" && (
          <div className="similarity-controls">
            <div className="perfume-search">
              <label htmlFor="perfume-search">Perfume de referência</label>
              <div className="search-field">
                <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" /><path d="m12.5 12.5 4 4" /></svg>
                <input
                  id="perfume-search"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Exemplo: MYSLF, Libre ou Good Girl"
                  autoComplete="off"
                />
              </div>
              {showSuggestions && suggestions.length > 0 && (
                <div className="suggestions" role="listbox">
                  {suggestions.map((perfume) => (
                    <button key={perfume.id} type="button" onClick={() => pickReference(perfume)}>
                      <span><b>{perfume.nome}</b><small>{perfume.marca} · {perfume.concentracao}</small></span>
                      <strong>{formatCurrency(perfume.precoMin)}</strong>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {reference && (
              <div className="reference-card">
                <div className={`reference-bottle ${familyColors[reference.familia] ?? "neutral"}`}><span>{reference.marca.slice(0, 1)}</span></div>
                <div>
                  <small>Referência selecionada</small>
                  <strong>{reference.nome}</strong>
                  <span>{reference.marca} · {reference.familia}</span>
                </div>
                <b>{formatCurrency(reference.precoMin)}</b>
              </div>
            )}

            <label className="toggle-row">
              <input type="checkbox" checked={cheaperOnly} onChange={(event) => setCheaperOnly(event.target.checked)} />
              <span className="toggle"><i /></span>
              <span><b>Somente opções mais baratas</b><small>Compara o menor preço observado de cada perfume</small></span>
            </label>
            <label className="toggle-row">
              <input type="checkbox" checked={sameGender} onChange={(event) => setSameGender(event.target.checked)} />
              <span className="toggle"><i /></span>
              <span><b>Manter a classificação de gênero</b><small>Inclui também perfumes unissex quando aplicável</small></span>
            </label>
          </div>
        )}

        {mode === "valor" && (
          <div className="filter-rows">
            <div>
              <label>Gênero</label>
              <div className="filter-chips">
                {["Todos", "Masculino", "Feminino", "Unissex"].map((value) => (
                  <button key={value} className={valueGender === value ? "active" : ""} onClick={() => setValueGender(value)} type="button">{value}</button>
                ))}
              </div>
            </div>
            <div>
              <label>Preço máximo</label>
              <div className="filter-chips">
                {[["200", "R$ 200"], ["400", "R$ 400"], ["700", "R$ 700"], ["1000", "R$ 1.000"], ["0", "Sem limite"]].map(([value, label]) => (
                  <button key={value} className={valueBudget === value ? "active" : ""} onClick={() => setValueBudget(value)} type="button">{label}</button>
                ))}
              </div>
            </div>
            <p className="formula-note">Pontuação: 45% avaliação bayesiana, 35% preço frente ao esperado, 12% confiança das avaliações e 8% disponibilidade.</p>
          </div>
        )}

        {mode === "perfis" && (
          <div className="profile-map">
            {learnedProfiles.map((profile) => (
              <button
                key={profile.id}
                className={selectedProfile === profile.id ? "active" : ""}
                onClick={() => setSelectedProfile(profile.id)}
                type="button"
                style={{ "--profile-color": profile.color } as React.CSSProperties}
              >
                <i />
                <strong>{profile.name}</strong>
                <span>{profile.description}</span>
                <small>{profile.count.toLocaleString("pt-BR")} perfumes · mediana {formatCurrency(profile.medianPrice)}</small>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="explorer-results-heading">
        <div>
          <span>{mode === "similares" ? "Vizinhos mais próximos" : mode === "valor" ? "Melhor relação calculada" : `Destaques do perfil ${selectedProfileData?.name.toLowerCase() ?? ""}`}</span>
          <h3>{mode === "similares" && cheaperOnly ? "Alternativas econômicas" : mode === "similares" ? "Perfumes próximos" : mode === "valor" ? "Custo benefício" : selectedProfileData?.name}</h3>
        </div>
        <p>{mode === "similares" ? "A pontuação vem da distância do cosseno entre os vetores aprendidos." : mode === "valor" ? "A comparação usa preço por 100 ml e avaliação corrigida pela quantidade de respostas." : "Os grupos foram encontrados pelo modelo e receberam nomes a partir das famílias, acordes e notas dominantes."}</p>
      </div>
      <div className="perfume-grid explorer-grid">
        {(mode === "similares" ? similarResults : mode === "valor" ? valueResults : profileResults).map((perfume, index) => (
          <PerfumeCard key={`${mode}-${perfume.id}`} perfume={perfume} index={index} />
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  const [database, setDatabase] = useState<Database | null>(null);
  const [step, setStep] = useState(0);
  const [finished, setFinished] = useState(false);
  const [answers, setAnswers] = useState<Answers>({
    genero: "",
    perfil: "",
    ocasiao: "",
    clima: "",
    intensidade: "",
    orcamento: "",
  });

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/perfumes.json`)
      .then(async (response) => (await response.json()) as Database)
      .then((payload) => setDatabase(payload));
  }, []);

  const question = questions[step];
  const selected = answers[question.key];
  const userVector = useMemo(
    () => (database ? buildUserVector(database, answers) : []),
    [answers, database],
  );

  const recommendations = useMemo(() => {
    if (!database || !finished || !userVector.length) return [];
    const budget = Number(answers.orcamento);
    const ranked = database.perfumes
      .filter((perfume) => {
        if (perfume.precoMin === null) return false;
        if (budget > 0 && perfume.precoMin > budget) return false;
        if (
          answers.genero !== "Tanto faz" &&
          perfume.genero !== answers.genero &&
          perfume.genero !== "Unissex"
        ) {
          return false;
        }
        return true;
      })
      .map((perfume) => scorePerfume(perfume, answers, userVector))
      .sort((a, b) => b.match - a.match || (b.avaliacao ?? 0) - (a.avaliacao ?? 0));
    return dedupeRanked(ranked).slice(0, 6);
  }, [answers, database, finished, userVector]);

  function choose(value: string) {
    setAnswers((current) => ({ ...current, [question.key]: value }));
  }

  function advance() {
    if (!selected) return;
    if (step < questions.length - 1) {
      setStep((current) => current + 1);
    } else {
      setFinished(true);
      window.setTimeout(() => {
        document.getElementById("resultados")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    }
  }

  function restart() {
    setStep(0);
    setFinished(false);
    setAnswers({ genero: "", perfil: "", ocasiao: "", clima: "", intensidade: "", orcamento: "" });
    document.getElementById("recomendador")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <main>
      <header className="site-header">
        <a className="wordmark" href="#inicio" aria-label="ParfuML, início">
          <Image className="wordmark-logo" src={logoPath} alt="ParfuML" width={1294} height={566} priority />
        </a>
        <nav aria-label="Navegação principal">
          <a href="#recomendador">Recomendador</a>
          <a href="#explorar">Explorar</a>
          <a href="#metodo">Como funciona</a>
        </nav>
        <span className="availability"><i /> Catálogo brasileiro</span>
      </header>

      <section className="hero" id="inicio">
        <div className="hero-orb orb-one" />
        <div className="hero-orb orb-two" />
        <div className="hero-copy">
          <p className="kicker"><SparkIcon /> Escolha guiada por dados olfativos</p>
          <h1>Seu próximo perfume começa com uma sensação.</h1>
          <p className="hero-description">
            Responda 6 perguntas. Um modelo de similaridade cruza seu perfil com fragrâncias observadas no mercado brasileiro.
          </p>
          <a className="primary-link" href="#recomendador">
            Encontrar meu perfume <ArrowIcon />
          </a>
        </div>

        <div className="hero-object" aria-hidden="true">
          <span className="halo halo-one" />
          <span className="halo halo-two" />
          <span className="hero-bottle-cap" />
          <span className="hero-bottle-neck" />
          <span className="hero-bottle">
            <Image className="hero-bottle-logo" src={logoPath} alt="" width={1294} height={566} priority />
            <b>BRASIL</b>
          </span>
          <span className="object-note note-one">floral</span>
          <span className="object-note note-two">amadeirado</span>
          <span className="object-note note-three">cítrico</span>
        </div>

        <div className="stats" aria-label="Cobertura da base">
          <span><strong>{database?.meta.perfumes.toLocaleString("pt-BR") ?? "3.176"}</strong> perfumes</span>
          <span><strong>05/08/2026</strong> data da coleta</span>
          <span><strong>100%</strong> processamento local</span>
        </div>
      </section>

      <section className="recommender-section" id="recomendador">
        <div className="section-heading">
          <p className="eyebrow">Recomendação guiada</p>
          <h2>Conte o que você procura.</h2>
          <p>As respostas formam um vetor de preferência. O KNN procura os perfumes mais próximos dentro do orçamento.</p>
        </div>

        <div className="wizard-shell">
          <aside className="wizard-aside">
            <span>Seu perfil</span>
            <strong>{String(step + 1).padStart(2, "0")}</strong>
            <div className="progress-track" aria-label={`Pergunta ${step + 1} de ${questions.length}`}>
              <i style={{ width: `${((step + 1) / questions.length) * 100}%` }} />
            </div>
            <small>{questions.length} perguntas</small>
            <div className="answer-summary">
              {questions.map((item, index) => {
                const value = answers[item.key];
                return (
                  <button
                    key={item.key}
                    className={index === step ? "current" : value ? "answered" : ""}
                    onClick={() => {
                      if (value || index <= step) {
                        setFinished(false);
                        setStep(index);
                      }
                    }}
                    type="button"
                  >
                    <span>{index + 1}</span>
                    <div>
                      <small>{item.eyebrow}</small>
                      <b>{value ? (item.key === "orcamento" ? item.options.find(([v]) => v === value)?.[1] : value) : "A definir"}</b>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="question-panel">
            <div className="question-copy">
              <p>{question.eyebrow}</p>
              <h3>{question.title}</h3>
              <span>{question.help}</span>
            </div>
            <div className={`options-grid ${question.options.length > 4 ? "compact" : ""}`}>
              {question.options.map(([value, description]) => (
                <button
                  key={value}
                  className={selected === value ? "selected" : ""}
                  onClick={() => choose(value)}
                  type="button"
                >
                  <span className="option-check"><CheckIcon /></span>
                  <strong>{question.key === "orcamento" ? description : value}</strong>
                  {question.key !== "orcamento" && <small>{description}</small>}
                </button>
              ))}
            </div>
            <div className="wizard-actions">
              <button
                type="button"
                className="back-button"
                onClick={() => setStep((current) => Math.max(0, current - 1))}
                disabled={step === 0}
              >
                Voltar
              </button>
              <button type="button" className="next-button" onClick={advance} disabled={!selected}>
                {step === questions.length - 1 ? "Ver recomendações" : "Continuar"} <ArrowIcon />
              </button>
            </div>
          </div>
        </div>
      </section>

      {finished && (
        <section className="results-section" id="resultados">
          <div className="results-heading">
            <div>
              <p className="eyebrow">Seleção para você</p>
              <h2>{recommendations.length > 0 ? "6 perfumes para começar." : "Nenhum perfume encontrado."}</h2>
              <p>
                A porcentagem combina afinidade vetorial, avaliação agregada, cobertura de preço e completude dos dados. O preço mostra o menor valor observado na data da coleta.
              </p>
            </div>
            <button type="button" onClick={restart}>Refazer escolhas</button>
          </div>
          <div className="perfume-grid">
            {recommendations.map((perfume, index) => (
              <PerfumeCard key={perfume.id} perfume={perfume} index={index} />
            ))}
          </div>
        </section>
      )}

      <Explorer database={database} />

      <section className="method-section" id="metodo">
        <div>
          <p className="eyebrow">Modelos aplicados</p>
          <h2>O que acontece por trás de cada resultado.</h2>
        </div>
        <div className="method-grid">
          <article>
            <span>01</span>
            <h3>Vetor olfativo</h3>
            <p>1.487 atributos de notas, acordes, famílias e contexto foram reduzidos para 48 dimensões.</p>
          </article>
          <article>
            <span>02</span>
            <h3>KNN</h3>
            <p>A distância do cosseno encontra os vizinhos mais próximos de um perfume ou do vetor das respostas.</p>
          </article>
          <article>
            <span>03</span>
            <h3>8 perfis aprendidos</h3>
            <p>O agrupamento hierárquico separou 2.404 fragrâncias a partir da proximidade entre os vetores.</p>
          </article>
          <article>
            <span>04</span>
            <h3>Preço esperado</h3>
            <p>O gradient boosting estima o preço por 100 ml e alimenta o ranking de custo benefício.</p>
          </article>
        </div>
        <div className="model-audit" aria-label="Métricas dos modelos">
          <span><strong>{database ? database.meta.ml.contentModel.profilePrecisionAt5.toLocaleString("pt-BR", { style: "percent", maximumFractionDigits: 1 }) : "99,0%"}</strong> concordância de perfil nos 5 vizinhos</span>
          <span><strong>{database ? database.meta.ml.clusterModel.silhouette.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) : "0,37"}</strong> silhueta dos agrupamentos</span>
          <span><strong>{database ? database.meta.ml.priceModel.r2Log.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) : "0,77"}</strong> R² fora da amostra no log do preço</span>
        </div>
      </section>

      <section className="project-section" aria-labelledby="sobre-projeto">
        <div className="project-heading">
          <p className="eyebrow">Projeto aberto e auditável</p>
          <h2 id="sobre-projeto">Dados, modelos e interface em uma aplicação estática.</h2>
          <p>
            O ParfuML é um projeto educacional de ciência de dados. O navegador lê um
            catálogo sanitizado com 3.176 perfumes, combina as respostas do questionário
            com vetores de 48 dimensões e calcula o ranking sem enviar as escolhas para um
            servidor do projeto.
          </p>
        </div>
        <div className="project-grid">
          <article>
            <h3>Privacidade por concepção</h3>
            <p>Sem cadastro, cookies próprios, analytics, formulários ou banco de visitantes.</p>
          </article>
          <article>
            <h3>Catálogo sanitizado</h3>
            <p>Sem URLs de compra, nomes de lojas, vendedores, SKUs ou estoque individual.</p>
          </article>
          <article>
            <h3>Limites explícitos</h3>
            <p>Preços são históricos e as previsões dos modelos são estimativas sujeitas a erro.</p>
          </article>
        </div>
        <a className="repository-link" href={repositoryUrl} target="_blank" rel="noreferrer">
          Ver código, metodologia e documentação no GitHub <ArrowIcon />
        </a>
      </section>

      <footer>
        <a className="wordmark" href="#inicio">
          <Image className="wordmark-logo" src={logoPath} alt="ParfuML" width={1294} height={566} />
        </a>
        <div className="footer-notes">
          <p>Referência informativa: dados coletados em 5 de agosto de 2026. Preços e estoque podem mudar.</p>
          <p>Modelos treinados em 7 de agosto de 2026.</p>
          <p>Projeto educacional, sem vínculo comercial, comissão ou indicação de compra.</p>
        </div>
        <div className="footer-links">
          <Link className="privacy-link" href="/privacidade">Privacidade</Link>
          <Link className="privacy-link" href="/termos">Avisos de uso</Link>
        </div>
      </footer>
    </main>
  );
}
