# Política de Segurança

## Escopo

O site público é uma aplicação estática hospedada no GitHub Pages. Ele não possui autenticação, formulário de envio, API pública nem armazenamento de dados de visitantes.

O repositório público não distribui arquivos `joblib`, `pickle`, `npy` ou outros artefatos de desserialização. Nunca carregue arquivos desse tipo quando vierem de fonte desconhecida.

## Relatar uma vulnerabilidade

Não publique detalhes de uma vulnerabilidade em uma issue pública. Quando o repositório estiver publicado, use a advisory privada do próprio GitHub, descrevendo o impacto, a forma de reprodução e uma possível mitigação.

## Atualizações

Dependências e configurações de publicação devem ser revisadas antes de incluir recursos que coletem dados, exijam autenticação ou adicionem serviços externos.

## Controles do repositório

- O branch de publicação deve aceitar alterações somente por pull request revisado.
- A conta mantenedora deve usar autenticação multifator ou passkey e revisar tokens ativos.
- Workflows devem usar permissões mínimas, não expor segredos em logs e fixar Actions em versões confiáveis.
- Dependências devem permanecer no lockfile e ser verificadas por alertas de segurança antes de cada publicação.
- O Dependabot deve revisar semanalmente dependências npm e GitHub Actions.
- O artefato do Pages deve continuar sendo estático; não adicione APIs, formulários, analytics ou armazenamento sem revisar esta política e o aviso de privacidade.
