import assert from "node:assert/strict";
import { access, readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const projectRoot = path.resolve(import.meta.dirname, "..");
const outputRoot = path.join(projectRoot, "out");
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

test("exports a complete GitHub Pages artifact", async () => {
  assert.ok(
    basePath === "" || /^\/[A-Za-z0-9._-]+$/.test(basePath),
    `Invalid NEXT_PUBLIC_BASE_PATH: ${basePath}`,
  );

  const htmlPath = path.join(outputRoot, "index.html");
  const html = await readFile(htmlPath, "utf8");

  assert.match(html, /<html[^>]*\blang=["']pt-BR["']/i);
  assert.match(html, /ParfuML/i);
  assert.match(html, /Menor preço observado/i);
  assert.match(html, /Referência informativa/i);
  assert.match(html, /Projeto aberto e auditável/i);
  assert.doesNotMatch(html, /Ver oferta|oferta encontrada|comparador de ofertas/i);
  assert.ok(html.includes(`${basePath}/favicon.svg`));
  assert.ok(html.includes(`${basePath}/og.png`));
  assert.ok(html.includes(`${basePath}/privacidade/`));
  assert.ok(html.includes(`${basePath}/termos/`));
  assert.match(html, /Content-Security-Policy/i);
  assert.doesNotMatch(html, /unsafe-eval/i);

  const rootReferences = [
    ...html.matchAll(/\b(?:href|src)=["'](\/[^"'#?]*)/gi),
  ].map((match) => match[1]);

  if (basePath) {
    for (const reference of rootReferences) {
      assert.ok(
        reference === basePath || reference.startsWith(`${basePath}/`),
        `Root-relative reference escapes the Pages base path: ${reference}`,
      );
    }
  }

  const nextAssetReference = rootReferences.find((reference) =>
    reference.includes("/_next/"),
  );
  assert.ok(nextAssetReference, "The exported HTML has no Next.js asset reference");

  const relativeNextAsset = nextAssetReference
    .slice(basePath.length)
    .replace(/^\//, "");
  await access(path.join(outputRoot, relativeNextAsset));

  const database = JSON.parse(
    await readFile(path.join(outputRoot, "perfumes.json"), "utf8"),
  );
  assert.equal(database.meta.perfumes, 3176);
  assert.equal(database.perfumes.length, 3176);
  for (const perfume of database.perfumes) {
    for (const forbidden of ["url", "urlFonte", "lojas", "quantidadeOfertas", "fonteOlfativa"]) {
      assert.equal(forbidden in perfume, false, `Public data exposes ${forbidden}`);
    }
  }

  const socialCard = await stat(path.join(outputRoot, "og.png"));
  assert.ok(socialCard.size > 100_000, "The social card looks incomplete");

  const privacyHtml = await readFile(
    path.join(outputRoot, "privacidade", "index.html"),
    "utf8",
  );
  assert.match(privacyHtml, /Dados que o código do ParfuML não coleta/i);
  assert.match(privacyHtml, /GitHub Pages/i);
  assert.doesNotMatch(privacyHtml, /joblib/i);

  const termsHtml = await readFile(
    path.join(outputRoot, "termos", "index.html"),
    "utf8",
  );
  assert.match(termsHtml, /Avisos e limites de uso/i);
  assert.match(termsHtml, /não possui vínculo/i);
});
