import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * A quantidade também se digita: toca, escreve "12" e confirma.
 * Enquanto o campo está em foco vale o texto; ao sair, vira número.
 */
export function CampoQtd({
  qtd,
  nome,
  destaque,
  onDefinir,
}: {
  qtd: number;
  nome: string;
  destaque?: boolean;
  onDefinir: (n: number) => void;
}) {
  const [texto, setTexto] = useState(String(qtd));
  const [editando, setEditando] = useState(false);

  useEffect(() => {
    if (!editando) setTexto(String(qtd));
  }, [qtd, editando]);

  const confirmar = () => {
    setEditando(false);
    const n = Number(texto.replace(/\D/g, ""));
    if (!Number.isFinite(n) || n === qtd) {
      setTexto(String(qtd));
      return;
    }
    onDefinir(n);
  };

  return (
    <input
      aria-label={`Quantidade de ${nome}`}
      inputMode="numeric"
      value={texto}
      onFocus={(e) => {
        setEditando(true);
        e.currentTarget.select();
      }}
      onChange={(e) => setTexto(e.target.value.replace(/\D/g, "").slice(0, 4))}
      onBlur={confirmar}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          setEditando(false);
          setTexto(String(qtd));
          e.currentTarget.blur();
        }
        e.stopPropagation();
      }}
      className={cn(
        "money h-11 w-14 border-x border-border bg-card px-1 text-center text-xl leading-none outline-none focus:bg-primary-soft",
        destaque && "qty-bump",
      )}
    />
  );
}
