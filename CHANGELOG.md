# Changelog

## [0.6.1] - 2026-10-24

- Atualizado Next.js de 16.3.1 para 16.4.3 para corrigir vulnerabilidades conhecidas e desbloquear a auditoria obrigatória do GitHub Pages.
- Atualizadas no lockfile as dependências transitivas vulneráveis, preservando a atualização de source-map-js 1.2.2 da PR #19.
- Mantidos o código de treinamento, as versões Python e os dados publicados; a comparação de compatibilidade do NumPy foi executada em cópias isoladas.
- Esclarecida a distinção entre as métricas históricas publicadas e um novo treinamento sobre o catálogo sanitizado.

## [0.6.0] - 2026-08-16

- Preparada a primeira publicação pública com workflow de GitHub Pages.
- Auditado o catálogo contra URLs, dados pessoais, identificadores de lojas, ofertas e conteúdo injetável.
- Reescritos os avisos de privacidade, fontes, marcas, limites de uso e segurança.
- Documentado o tratamento técnico realizado pelo GitHub Pages e o processamento local do questionário.
- Removidos do pacote público o lançador Windows, checksums locais e documentação LaTeX/PDF interna.
- Removidas dependências e scripts herdados de Cloudflare, Drizzle e Vite sem uso na aplicação.
- Atualizado Next.js para 16.3.1 para corrigir vulnerabilidades divulgadas nas versões anteriores.
- Adicionados inventário público, termos, avisos de terceiros, licença OFL da fonte e Dependabot.
- Substituídos favicon e imagem social antigos pela identidade ParfuML.
- Aplicada política de segurança de conteúdo, com compatibilidade local restrita ao modo de desenvolvimento.
- Validada a navegação responsiva e esclarecida a composição da pontuação exibida nas recomendações.

## [0.5.3] - 2026-08-16

- Reescrito o notebook de clustering e gradient boosting para refletir o fluxo público real do ParfuML.
- Removidas as premissas incorretas sobre planilha distribuída, ofertas individuais, URLs, lojas e modelos joblib publicados.
- Documentada a diferença entre preços observados/agregados e estimativas derivadas do modelo.

## [0.5.2] - 2026-08-16

- Corrigido o fluxo de dados da documentação para refletir os arquivos realmente presentes no repositório.
- Removidas referências fictícias à planilha, ao ETL ausente e aos modelos serializados não distribuídos.

## [0.5.1] - 2026-08-15

- Consolidada a identidade ParfuML conforme a referência visual anexada.
- Removidas referências de configuração ao nome anterior `essencia-br`.
- Mantida a indicação de referência informativa no rodapé para a exportação estática.
- Ajustadas as URLs de metadados e imagem social para respeitar a subpasta `/parfuml`.
- Refinados cabeçalho, wordmark, espaçamento do hero e rótulo do frasco para corresponder à referência visual.
- Reposicionados o conteúdo do cabeçalho e o objeto principal para alinhar a composição desktop à referência.
- Incorporado o logotipo transparente anexado como asset oficial da interface.

## [0.5.0] - 2026-08-15

- Ajustado o lançador local para usar o Node.js do runtime Codex quando o Node.js não estiver no `PATH`.
- Adicionado fallback para instalar dependências com o `pnpm` disponibilizado pelo runtime.
- Corrigido o comando de inicialização para usar o servidor de desenvolvimento do Next.js.
