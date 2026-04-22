import DashboardView from "@/components/DashboardView";

export default function Home() {
  return (
    <DashboardView 
      filterType="day" 
      title="Aquisição Hoje" 
      subtitle="Acompanhamento de funil e SDRs filtrado estritamente por conversas do próprio dia." 
    />
  );
}
