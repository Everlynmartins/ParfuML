# ParfuML

[Acessar o site](https://everlynmartins.github.io/ParfuML/) · [Código-fonte](https://github.com/Everlynmartins/ParfuML) · [Privacidade](PRIVACIDADE.md) · [Fontes dos dados](DATA_SOURCES.md)

Recomendador de perfumes baseado em dados históricos agregados do mercado brasileiro. A aplicação combina similaridade olfativa, agrupamento de perfis, preço observado por 100 ml e ranking de custo-benefício; toda a recomendação é calculada localmente no navegador.

## Publicação

Esta é a edição pública e sanitizada do projeto, preparada para execução local e publicação estática no GitHub Pages. A aplicação não depende de API, autenticação ou banco de dados de usuários.

## Versão 0.6.1

1. Dados coletados em 5 de agosto de 2026.
2. Modelos treinados em 7 de agosto de 2026.
3. 3.176 perfumes no catálogo público agregado.
4. Exportação estática automatizada pelo GitHub Actions para o GitHub Pages.
5. Catálogo público sanitizado, sem URLs externas, vendedores, SKUs ou estoque individual.
6. Aviso de privacidade, proveniência e limites de uso para publicação pública.

Consulte [DATA_SOURCES.md](DATA_SOURCES.md) para a proveniência e os cuidados de redistribuição dos dados.
Consulte também o [aviso de privacidade](PRIVACIDADE.md), a [política de segurança](SECURITY.md) e os [limites de uso educacional](USO_EDUCACIONAL.md).

## Componentes

1. `scripts/sanitize_public_data.py`: remoção de URLs, lojas, vendedores, SKUs e ofertas individuais.
2. `ml/train_models.py`: treinamento e incorporação dos resultados ao JSON.
3. `public/perfumes.json`: dados agregados usados diretamente pelo navegador, sem links externos.
4. `app/page.tsx`: lógica do recomendador e interface principal.
5. `app/globals.css`: identidade visual e comportamento responsivo.
6. `.github/workflows/pages.yml`: workflow de validação e publicação no GitHub Pages.
7. `PRIVACIDADE.md`, `SECURITY.md`, `LICENSE`, `NOTICE.md` e `USO_EDUCACIONAL.md`: compromissos, licença e limites de uso.

Os diretórios `dist` e `out` são artefatos gerados e não fazem parte do histórico Git.

## Execução local

Requisitos: Node.js 22.13 ou superior e npm.

```bash
npm ci
npm run dev
```

Acesse `http://127.0.0.1:3000`. O lançador local `abrir_versao_local.bat` não faz parte do repositório público porque contém comportamento específico do ambiente Windows desta máquina.

Para testar a exportação estática localmente:

```bash
GITHUB_PAGES=true \
NEXT_PUBLIC_BASE_PATH=/ParfuML \
npm run build:pages

NEXT_PUBLIC_BASE_PATH=/ParfuML npm run test:pages
```

O workflow configura esses valores automaticamente no GitHub e publica somente o conteúdo estático de `out`.

## Reprodução dos dados e modelos

Requisitos: Python 3.12 e os pacotes listados em `requirements.txt`.

```bash
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r requirements.txt
python3 ml/train_models.py
```

O treinamento original foi executado separadamente. Esta edição pública distribui apenas o JSON sanitizado e os resultados agregados; a base bruta e os artefatos serializados não fazem parte dela.

As métricas registradas abaixo pertencem à execução histórica publicada. Um novo treinamento sobre o catálogo sanitizado pode produzir valores diferentes; para avaliar atualizações de bibliotecas, compare as versões usando o mesmo JSON de entrada e o mesmo ambiente.

## Como a aplicação atende uma consulta

O navegador lê `public/perfumes.json`. Cada perfume já contém um vetor com 48 componentes, grupo, confiança do grupo, preço esperado, avaliação bayesiana e pontuação de custo-benefício. As respostas do questionário formam outro vetor de 48 componentes a partir dos centroides aprendidos. A aplicação calcula similaridades de cosseno, aplica filtros e monta o ranking localmente.

O navegador não carrega arquivos `joblib` e não executa Python. Essa escolha permite hospedar o site como aplicação estática e reduz o tempo de resposta.

## Métricas registradas

| Componente | Medida | Resultado |
| --- | --- | ---: |
| Vetor olfativo | atributos antes da redução | 1.487 |
| Vetor olfativo | dimensões finais | 48 |
| Vetor olfativo | variância explicada | 0,8373 |
| KNN | concordância de perfil nos 5 vizinhos | 0,9904 |
| KNN | concordância de família nos 5 vizinhos | 0,9419 |
| Agrupamento | amostras | 2.404 |
| Agrupamento | grupos | 8 |
| Agrupamento | silhueta | 0,3689 |
| Preço | amostras | 2.582 |
| Preço | R² no log fora da amostra | 0,7698 |
| Preço | erro absoluto médio por 100 ml | R$ 192,82 |
| Preço | erro percentual absoluto médio | 39,69% |

## Monte Carlo

Esta versão não usa integração de Monte Carlo, cadeia de Markov, amostragem de posterior ou simulação estocástica. A semente 42 controla a separação de validação, a redução SVD e a amostra usada no cálculo da silhueta. Esses usos de pseudoaleatoriedade não constituem um método de Monte Carlo.

## Limitações dos dados

1. Preço observado representa uma fotografia de 5 de agosto de 2026; não é oferta atual.
2. 977 perfumes possuem ao menos uma nota de topo, corpo ou fundo.
3. 2.404 perfumes possuem informação olfativa suficiente para o agrupamento.
4. 1.742 perfumes possuem avaliação.
5. A base não contém compras, cliques, favoritos ou avaliações individuais de usuários.
6. Ocasião, clima, período, intensidade e perfil inicial incluem classificações derivadas.
7. O site não identifica lojas, não possui links de compra, não recebe pagamentos e não participa da contratação, entrega, troca ou atendimento.
8. A publicação do repositório não substitui a verificação dos termos das fontes de dados.

Consulte `documentation/notebook_parfuml_clustering_gradient_boosting.ipynb` para a auditoria executável do catálogo e dos resultados publicados.

## Licença

O código original é licenciado sob MIT. A licença não se estende automaticamente ao catálogo, às marcas ou a conteúdos de terceiros. A fonte Geist usa SIL Open Font License 1.1; consulte `NOTICE.md`, `DATA_SOURCES.md`, `TERMOS.md` e `THIRD_PARTY_NOTICES.md`.
