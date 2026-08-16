import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Avisos e limites de uso | ParfuML",
  description: "Finalidade, fontes, limitações e direitos aplicáveis ao ParfuML.",
};

export default function TermsPage() {
  return (
    <main className="privacy-page">
      <article className="privacy-content">
        <p className="privacy-kicker">ParfuML</p>
        <h1>Avisos e limites de uso</h1>
        <p>Atualizado em 16 de agosto de 2026.</p>

        <h2>Finalidade</h2>
        <p>
          O ParfuML é um projeto de portfólio para demonstração de ciência de dados,
          aprendizado de máquina e desenvolvimento web. Não é loja, marketplace,
          comparador de ofertas, consultoria de compra ou sistema de recomendação
          profissional.
        </p>

        <h2>Preços e resultados dos modelos</h2>
        <p>
          Os preços são observações históricas agregadas da data informada no site e
          podem estar desatualizados. O preço esperado, a oportunidade de preço, os
          agrupamentos e as pontuações são estimativas matemáticas sujeitas a erro. Nada
          no site constitui oferta, promessa de disponibilidade ou garantia de economia.
        </p>

        <h2>Marcas e produtos</h2>
        <p>
          Nomes de marcas e perfumes são usados apenas para identificar produtos e
          contextualizar a análise. O projeto não possui vínculo, patrocínio, autorização,
          comissão ou afiliação com fabricantes, varejistas, Parfumo, TidyTuesday ou
          qualquer outra fonte citada.
        </p>

        <h2>Dados e licenças</h2>
        <p>
          A licença MIT cobre somente o código original. O catálogo reúne fatos,
          observações agregadas, conteúdo de fontes indicadas e resultados derivados.
          A presença desses dados no repositório não concede licença adicional sobre
          marcas, conteúdos de terceiros ou bases de origem. Consulte os arquivos
          <code> DATA_SOURCES.md</code>, <code>NOTICE.md</code> e <code>LICENSE</code> no
          repositório antes de reutilizar o material.
        </p>

        <h2>Correção ou remoção</h2>
        <p>
          Titulares de direitos ou pessoas que identifiquem informação incorreta podem
          solicitar revisão pelo perfil público do responsável no GitHub. O pedido deve
          indicar o registro e a justificativa, sem publicar dados pessoais em área pública.
        </p>

        <div className="privacy-actions">
          <Link className="privacy-back" href="/">Voltar ao recomendador</Link>
          <Link className="privacy-back" href="/privacidade">Privacidade</Link>
        </div>
      </article>
    </main>
  );
}
