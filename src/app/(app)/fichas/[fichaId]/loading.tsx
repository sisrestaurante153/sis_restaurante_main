import { Loader2 } from "lucide-react";

export default function AppLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] w-full gap-4 text-brand-gray">
      <Loader2 className="w-12 h-12 animate-spin text-brand-primary" />
      <p className="text-lg font-medium animate-pulse">Carregando informações...</p>
    </div>
  );
}
