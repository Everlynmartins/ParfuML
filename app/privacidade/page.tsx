import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacidade | ParfuML",
  description: "Como o ParfuML protege a privacidade durante o uso do recomendador.",
};

export default function PrivacyPage() {
  return (
    <main className="privacy-page">
      <article className="privacy-content">
        <p className="privacy-kicker">ParfuML</p>
        <h1>Aviso de privacidade</h1>
        <p>Atualizado em 16 de agosto de 2026.</p>

        <h2>Escopo e responsável</h2>
        <p>
          O ParfuML é um projeto educacional e não comercial. O responsável pelo
          projeto define apenas o funcionamento da aplicação e não mantém banco de
          dados de visitantes. Para dúvidas de privacidade ou solicitações relacionadas
          à LGPD, utilize um canal disponível no{" "}
          <a href="https://github.com/Everlynmartins" target="_blank" rel="noreferrer">
            perfil público do responsável
          </a>
          . Não publique dados pessoais em issues, discussões ou comentários públicos.
        </p>

        <h2>Processamento no navegador</h2>
        <p>
          As respostas do questionário — perfil olfativo, ocasião, clima, intensidade,
          gênero e orçamento — permanecem na memória da página e são usadas localmente
          para calcular o ranking. O código do ParfuML não transmite, armazena nem associa
          essas escolhas a uma pessoa.
        </p>

        <h2>Dados que o código do ParfuML não coleta</h2>
        <p>
          Não há cadastro, formulário de contato, login, banco de usuários ou pagamentos.
          A aplicação não solicita nome, e-mail, telefone, CPF, endereço ou senha e não
          instala cookies próprios, analytics, pixels de publicidade ou rastreadores.
        </p>

        <h2>Hospedagem pelo GitHub Pages</h2>
        <p>
          O site é entregue pelo GitHub Pages. Segundo a documentação do GitHub, o
          endereço IP do visitante é registrado e armazenado para finalidades de segurança,
          independentemente de a pessoa estar conectada ao GitHub. O GitHub também pode
          tratar outros dados técnicos conforme sua própria política. O mantenedor do
          ParfuML não recebe acesso a esses registros por meio da aplicação.
        </p>
        <p>
          O prazo de retenção, os pedidos relacionados a esses registros e os controles
          da infraestrutura são definidos pelo GitHub. Consulte a{" "}
          <a
            href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement"
            target="_blank"
            rel="noreferrer"
          >
            declaração de privacidade do GitHub
          </a>
          .
        </p>

        <h2>Dados do catálogo</h2>
        <p>
          O catálogo contém informações agregadas de produtos, atributos olfativos,
          avaliações agregadas e preços históricos. Ele não foi criado para conter dados
          pessoais de consumidores e não publica nomes de lojas, vendedores, SKUs,
          estoque individual ou URLs de compra.
        </p>

        <h2>Direitos e mudanças futuras</h2>
        <p>
          Caso seja identificado dado pessoal indevido no repositório, solicite análise e
          correção pelo canal indicado acima. Se o projeto passar a coletar dados, usar
          cookies não essenciais, analytics, login ou personalização persistente, este
          aviso deverá ser revisto antes da ativação desses recursos.
        </p>

        <div className="privacy-actions">
          <Link className="privacy-back" href="/">Voltar ao recomendador</Link>
          <Link className="privacy-back" href="/termos">Avisos e limites de uso</Link>
        </div>
      </article>
    </main>
  );
}
