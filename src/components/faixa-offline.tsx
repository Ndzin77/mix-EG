import { useEffect, useState } from "react";
import { CloudUpload, WifiOff } from "lucide-react";
import { useFilaPendente } from "@/lib/offline";

/** Faixa honesta: sem internet, a venda continua — e ela diz quanto está esperando. */
export function FaixaOffline() {
  const [offline, setOffline] = useState(false);
  const pendentes = useFilaPendente();

  useEffect(() => {
    const ler = () => setOffline(!navigator.onLine);
    ler();
    window.addEventListener("online", ler);
    window.addEventListener("offline", ler);
    return () => {
      window.removeEventListener("online", ler);
      window.removeEventListener("offline", ler);
    };
  }, []);

  if (!offline && !pendentes) return null;

  const espera =
    pendentes === 0
      ? ""
      : pendentes === 1
        ? " — 1 lançamento esperando"
        : ` — ${pendentes} lançamentos esperando`;

  return (
    <div
      role="status"
      className={`fixed inset-x-0 top-0 z-[60] flex items-center justify-center gap-2 px-4 py-2 text-center text-sm font-bold shadow-lg ${
        offline ? "bg-warning text-warning-foreground" : "bg-primary text-primary-foreground"
      }`}
    >
      {offline ? (
        <>
          <WifiOff className="size-4 shrink-0" />
          Sem internet{espera}. Pode continuar vendendo: sobe sozinho quando o sinal voltar.
        </>
      ) : (
        <>
          <CloudUpload className="size-4 shrink-0 animate-pulse" />
          Enviando para o sistema{espera}…
        </>
      )}
    </div>
  );
}
