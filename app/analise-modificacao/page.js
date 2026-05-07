import AnaliseView from "@/components/AnaliseView";

export const metadata = {
  title: "Amplify · Análise Atendimentos",
};

export default function AnaliseModificacao() {
  return (
    <AnaliseView
      dateField="last_edited_time"
      pageTitle="Análise Atendimentos"
      pageSubtitle={null}
    />
  );
}
