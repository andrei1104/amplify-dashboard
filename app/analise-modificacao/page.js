import AnaliseView from "@/components/AnaliseView";

export const metadata = {
  title: "Amplify · Análise (Modificação)",
};

export default function AnaliseModificacao() {
  return (
    <AnaliseView
      dateField="last_edited_time"
      pageTitle="Análise — Data de Modificação"
      pageSubtitle={null}
    />
  );
}
