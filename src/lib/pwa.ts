/**
 * Registro do app offline. O trabalhador só entra em cena no app publicado:
 * dentro do editor, de um iframe ou em desenvolvimento ele é desligado (e
 * qualquer registro antigo é removido), para ninguém ver tela velha em cache.
 */
const CAMINHO = "/sw.js";

function proibido(): boolean {
  if (!import.meta.env.PROD) return true;
  if (typeof window === "undefined") return true;
  if (window.self !== window.top) return true;
  const h = window.location.hostname;
  if (h.startsWith("id-preview--") || h.startsWith("preview--")) return true;
  if (h === "lovableproject.com" || h.endsWith(".lovableproject.com")) return true;
  if (h === "lovableproject-dev.com" || h.endsWith(".lovableproject-dev.com")) return true;
  if (h === "beta.lovable.dev" || h.endsWith(".beta.lovable.dev")) return true;
  if (new URLSearchParams(window.location.search).has("sw")) {
    return new URLSearchParams(window.location.search).get("sw") === "off";
  }
  return false;
}

async function limpar() {
  if (!("serviceWorker" in navigator)) return;
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.allSettled(
    regs
      .filter((r) => (r.active?.scriptURL ?? r.installing?.scriptURL ?? "").endsWith(CAMINHO))
      .map((r) => r.unregister()),
  );
}

export function registrarApp() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  if (proibido()) {
    void limpar();
    return;
  }
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register(CAMINHO, { scope: "/" }).catch(() => {
      /* sem app offline: o site continua funcionando normalmente */
    });
  });
}
