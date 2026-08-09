import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { erroSenha, forcaSenha } from "@/lib/travas";
import { cn } from "@/lib/utils";

const rotulos = ["", "fraca", "boa", "forte"] as const;

/**
 * Campo de senha da casa. Mostra na hora se serve ou não: o olho corrige
 * antes do dedo tentar salvar, então ninguém leva um "não" depois do clique.
 */
export function CampoSenha({
  rotulo,
  valor,
  onChange,
  autoFocus,
  onEnter,
  medidor = true,
  placeholder = "mínimo 4 caracteres",
  className,
}: {
  rotulo: string;
  valor: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
  onEnter?: () => void;
  /** falso no campo "senha atual": ali não faz sentido medir força */
  medidor?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const [ver, setVer] = useState(false);
  const erro = erroSenha(valor);
  const forca = forcaSenha(valor);
  const tocado = valor.length > 0;

  return (
    <label className={cn("block text-sm font-bold", className)}>
      {rotulo}
      <div className="relative mt-1">
        <input
          type={ver ? "text" : "password"}
          value={valor}
          autoFocus={autoFocus}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
          className={cn(
            "money h-14 w-full rounded-xl border-2 bg-secondary/30 px-3 pr-12 text-xl outline-none transition-colors focus:bg-card",
            !tocado
              ? "border-border focus:border-primary"
              : erro
                ? "border-danger"
                : "border-success",
          )}
        />
        <button
          type="button"
          aria-label={ver ? "Esconder a senha" : "Mostrar a senha"}
          onClick={() => setVer((v) => !v)}
          className="press absolute right-1.5 top-1.5 grid size-11 place-items-center rounded-lg text-muted-foreground hover:text-foreground"
        >
          {ver ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
        </button>
      </div>

      {medidor ? (
        <div className="mt-1.5 flex items-center gap-2">
          <div className="flex flex-1 gap-1" aria-hidden>
            {[1, 2, 3].map((n) => (
              <span
                key={n}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors",
                  forca >= n
                    ? forca === 1
                      ? "bg-warning"
                      : forca === 2
                        ? "bg-primary"
                        : "bg-success"
                    : "bg-border",
                )}
              />
            ))}
          </div>
          <span
            className={cn(
              "text-[11px] font-black uppercase tracking-wide",
              erro ? "text-danger" : "text-success",
            )}
          >
            {tocado ? (erro ?? rotulos[forca]) : ""}
          </span>
        </div>
      ) : null}
    </label>
  );
}
