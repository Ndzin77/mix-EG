import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/lib/auth-middleware";

/**
 * Fila de preparo: o bilhete de papel vira uma tela. O vendedor anota a
 * comanda no PDV e o ajudante vê aqui, na ordem em que chegou.
 */
export type EtapaPreparo = "todo" | "doing" | "done" | "delivered";

const linha =
  "id, product_name, quantity, prep_status, created_at, prep_started_at, prep_done_at, order_id, orders!inner(label, status), products(image_url)";

/** Itens que ainda precisam ser montados ou entregues, mais antigo primeiro. */
export const listarPreparo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    /* Só o movimento das últimas 12h: pedido de ontem não polui a bancada. */
    const desde = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
    const { data, error } = await context.supabase
      .from("order_items")
      .select(linha)
      .gte("created_at", desde)
      .neq("prep_status", "delivered")
      .order("created_at", { ascending: true })
      .limit(200);
    if (error) throw new Error(error.message);

    type Bruto = {
      id: string;
      product_name: string;
      quantity: number | string;
      prep_status: string | null;
      created_at: string;
      prep_started_at: string | null;
      order_id: string;
      orders: { label: string; status: string } | { label: string; status: string }[] | null;
      products: { image_url: string | null } | { image_url: string | null }[] | null;
    };

    const um = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

    return ((data ?? []) as unknown as Bruto[])
      .filter((l) => {
        const o = um(l.orders);
        return o?.status === "open" || o?.status === "paid";
      })
      .map((l) => ({
        id: l.id,
        orderId: l.order_id,
        conta: um(l.orders)?.label ?? "Comanda",
        produto: l.product_name,
        quantidade: Number(l.quantity ?? 1),
        etapa: (l.prep_status ?? "todo") as EtapaPreparo,
        criadoEm: l.created_at,
        iniciadoEm: l.prep_started_at,
        foto: um(l.products)?.image_url ?? null,
      }));
  });

/** Move o item de etapa e carimba a hora — o cronômetro sai daqui. */
export const marcarPreparo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        etapa: z.enum(["todo", "doing", "done", "delivered"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const agora = new Date().toISOString();
    const patch: {
      prep_status: string;
      prep_started_at?: string | null;
      prep_done_at?: string | null;
      delivered_at?: string | null;
    } = { prep_status: data.etapa };
    if (data.etapa === "doing") patch.prep_started_at = agora;
    if (data.etapa === "done") patch.prep_done_at = agora;
    if (data.etapa === "delivered") patch.delivered_at = agora;
    if (data.etapa === "todo") {
      patch.prep_started_at = null;
      patch.prep_done_at = null;
    }

    const { error } = await context.supabase
      .from("order_items")
      .update(patch)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
