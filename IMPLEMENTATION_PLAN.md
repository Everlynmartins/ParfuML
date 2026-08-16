# Plano de implementação — publicação no GitHub Pages

## Objetivo

Publicar o ParfuML em um repositório público do GitHub e disponibilizar a aplicação em uma URL do GitHub Pages após auditoria de privacidade, segurança, licenças e inventário público.

## Escopo

1. Manter o código-fonte e a documentação pública coerente, separando a base bruta e a documentação interna do material distribuído.
2. Criar uma exportação estática própria para GitHub Pages, compatível com a subpasta do repositório.
3. Adicionar um workflow do GitHub Actions para compilar e publicar o site automaticamente.
4. Atualizar a versão e o README com instruções e URLs de publicação.
5. Validar o build existente, a exportação estática e os testes automatizados.
6. Examinar os arquivos que serão públicos em busca de credenciais, chaves, caminhos locais e artefatos indevidos.
7. Criar o repositório, fazer o primeiro commit e confirmar a implantação do GitHub Pages.
8. Remover o lançador Windows, artefatos serializados, dependências sem uso e referências antigas do histórico público.
9. Documentar LGPD, coleta técnica do GitHub Pages, direitos sobre dados, marcas e ativos de terceiros.

## Restrições preservadas

- A aplicação deve continuar funcionando sem servidor Python ou API de inferência.
- O catálogo público deve conter somente dados agregados e históricos, sem links de compra ou identificadores de lojas.
- O arquivo `public/perfumes.json` e os resultados pré-calculados permanecem a fonte usada pelo navegador.
- Dados, métricas e modelos não serão regenerados sem necessidade.

## Critérios de conclusão

- Build de produção atual concluído sem erro.
- Exportação estática gerada com `index.html`, recursos e base de perfumes acessíveis sob a subpasta do GitHub Pages.
- Testes automatizados aprovados.
- Workflow de Pages válido e presente no repositório.
- Repositório público, commit enviado e implantação do Pages concluída com sucesso.
