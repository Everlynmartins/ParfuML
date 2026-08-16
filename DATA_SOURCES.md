# Fontes e uso dos dados

O ParfuML combina uma fotografia histórica de preços observados no Brasil com informações olfativas usadas para análise e recomendação. Este documento registra a proveniência sem substituir os termos das fontes originais.

## Fontes

- Preços e disponibilidade: levantamento exploratório próprio em páginas públicas brasileiras, realizado em 5 de agosto de 2026. O repositório público mantém somente valores agregados, sem URLs, lojas, vendedores, SKUs ou estoque individual.
- Notas, acordes, famílias e avaliações: conjunto "The Scent of Data — Exploring the Parfumo Fragrance Dataset", publicado pelo TidyTuesday em 10 de dezembro de 2024 e originado de dados do Parfumo coletados por web scraping.
- Resultados de modelos: derivados locais produzidos pelos scripts deste repositório a partir da base consolidada.

Referências:

- <https://rfordatascience.github.io/tidytuesday/data/2024/2024-12-10/readme.html>
- <https://github.com/rfordatascience/tidytuesday/blob/main/LICENSE>
- <https://www.parfumo.com/>

## Limites de uso

- Marcas, nomes de produtos, avaliações e descrições continuam pertencendo aos respectivos titulares.
- A licença do repositório TidyTuesday não deve ser interpretada como garantia sobre direitos independentes das fontes originais.
- Antes de redistribuir os dados ou usá-los comercialmente, confira os termos atuais de cada fonte e a legislação aplicável.
- A coleta própria não implica autorização, licença ou endosso das páginas consultadas.
- Os preços e a disponibilidade são históricos e exclusivamente informativos; o site não encaminha para ofertas nem participa de compras.
- A licença MIT aplica-se somente ao código original. Os dados de terceiros não recebem autorização adicional por este repositório.

## Escopo da distribuição pública

`public/perfumes.json` contém o catálogo agregado usado pelo navegador: identidade
do perfume, atributos olfativos, métricas de avaliação, preço mínimo observado,
preço normalizado por 100 ml, data da coleta no campo `meta` e resultados dos
modelos. Não contém URLs de compra, nomes de lojas, vendedores, SKUs, estoque
individual ou a aba completa de ofertas.

## Licenças e risco residual

O repositório TidyTuesday declara licença CC0 1.0 e sua página incentiva a criação de visualizações, modelos e aplicações. A própria CC0, contudo, não concede direitos sobre marcas e não oferece garantia de titularidade ou de liberação de direitos de terceiros. A licença MIT do ParfuML cobre somente o código original e não relicencia o catálogo.

Nenhum modelo `joblib`, `pickle`, `npy` ou equivalente é distribuído. Pedidos fundamentados de correção ou remoção podem ser encaminhados pelo canal indicado em `PRIVACIDADE.md`, sem publicação de dados pessoais em áreas públicas.
