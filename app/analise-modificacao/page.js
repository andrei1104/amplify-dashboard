import AnaliseView from "@/components/AnaliseView";

export const metadata = {
  title: "Amplify · Análise Atendimentos",
};

export default function AnaliseModificacao() {
  return (
    <AnaliseView
      dateField="Última mensagem enviada"
      pageTitle="Análise Atendimentos"
      pageSubtitle={null}
    />
  );
}
