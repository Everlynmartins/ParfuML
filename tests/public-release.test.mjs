import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const projectRoot = path.resolve(import.meta.dirname, "..");

function trackedFiles() {
  const output = execFileSync("git", ["ls-files", "-z"], {
    cwd: projectRoot,
    encoding: "utf8",
  });
  return output.split("\0").filter(Boolean).map((file) => file.replaceAll("\\", "/"));
}

test("public inventory excludes local and private artifacts", () => {
  const files = trackedFiles();
  const forbiddenExact = new Set([
    "abrir_versao_local.bat",
    "checksums.sha256",
    "documentation/documentacao_parfuml.pdf",
    "documentation/documentacao_parfuml.tex",
  ]);
  const forbiddenExtensions = /\.(?:csv|db|joblib|npy|npz|parquet|pickle|pkl|sqlite3?|xls|xlsx|zip)$/i;

  for (const file of files) {
    assert.equal(forbiddenExact.has(file), false, `Local-only file is tracked: ${file}`);
    assert.doesNotMatch(file, /^(?:data|private|raw|node_modules|out|\.next)\//i);
    assert.doesNotMatch(file, forbiddenExtensions, `Private/binary artifact is tracked: ${file}`);
  }
});

test("catalog is sanitized, unique and structurally valid", async () => {
  const raw = await readFile(path.join(projectRoot, "public", "perfumes.json"), "utf8");
  const database = JSON.parse(raw);
  const ids = new Set();

  assert.equal(database.meta.perfumes, 3176);
  assert.equal(database.perfumes.length, 3176);
  assert.doesNotMatch(raw, /https?:\/\/|www\./i);
  assert.doesNotMatch(raw, /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  assert.doesNotMatch(raw, /(?<!\d)\d{3}\.?\d{3}\.?\d{3}[-.]?\d{2}(?!\d)/);

  const forbiddenKeys = [
    "url", "urlFonte", "lojas", "loja", "vendedor", "seller", "sku",
    "estoque", "stock", "ofertas", "quantidadeOfertas", "fonteOlfativa",
  ];

  for (const perfume of database.perfumes) {
    assert.equal(ids.has(perfume.id), false, `Duplicate perfume id: ${perfume.id}`);
    ids.add(perfume.id);
    assert.equal(perfume.ml.embedding.length, 48, `Invalid embedding: ${perfume.id}`);
    assert.doesNotMatch(`${perfume.marca} ${perfume.nome}`, /<|>|javascript:/i);
    for (const forbidden of forbiddenKeys) {
      assert.equal(forbidden in perfume, false, `Public data exposes ${forbidden}`);
    }
  }
});

test("application has no first-party tracking or unsafe HTML injection", async () => {
  const sourceFiles = [
    "app/layout.tsx",
    "app/page.tsx",
    "app/privacidade/page.tsx",
    "app/termos/page.tsx",
  ];
  const source = (
    await Promise.all(sourceFiles.map((file) => readFile(path.join(projectRoot, file), "utf8")))
  ).join("\n");

  assert.doesNotMatch(source, /dangerouslySetInnerHTML|\binnerHTML\b|\beval\s*\(|new Function/i);
  assert.doesNotMatch(source, /google-analytics|gtag\s*\(|posthog|mixpanel|segment\.com|plausible\.io/i);
  assert.doesNotMatch(source, /document\.cookie|localStorage|sessionStorage/i);
});

test("public text contains no credentials or personal machine paths", async () => {
  const textExtensions = /\.(?:css|html|js|json|md|mjs|py|svg|ts|tsx|txt|yml)$/i;
  const files = trackedFiles().filter((file) => textExtensions.test(file) && file !== "package-lock.json");
  const text = (
    await Promise.all(files.map((file) => readFile(path.join(projectRoot, file), "utf8")))
  ).join("\n");

  assert.doesNotMatch(text, /C:\\Users\\|\/Users\/[^/]+\/|\/home\/[^/]+\//i);
  assert.doesNotMatch(text, /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/);
  assert.doesNotMatch(text, /\bghp_[A-Za-z0-9]{20,}\b|\bgithub_pat_[A-Za-z0-9_]{20,}\b/);
  assert.doesNotMatch(text, /\bsk-[A-Za-z0-9_-]{20,}\b/);
});

test("published version metadata is synchronized", async () => {
  const packageJson = JSON.parse(await readFile(path.join(projectRoot, "package.json"), "utf8"));
  const versionJson = JSON.parse(await readFile(path.join(projectRoot, "VERSAO.json"), "utf8"));
  const readme = await readFile(path.join(projectRoot, "README.md"), "utf8");
  const changelog = await readFile(path.join(projectRoot, "CHANGELOG.md"), "utf8");

  assert.equal(packageJson.version, versionJson.versao_codigo);
  assert.match(readme, new RegExp(`Versão ${packageJson.version.replaceAll(".", "\\.")}`));
  assert.match(changelog, new RegExp(`\\[${packageJson.version.replaceAll(".", "\\.")}\\]`));
});
