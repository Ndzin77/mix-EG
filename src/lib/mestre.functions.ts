import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import {
  configSessao,
  credenciaisConferem,
  exigirMestre,
  type LojaMestre,
  type SessaoMestre,
} from "@/lib/mestre.server";

/** Entra no modo mestre a partir da tela de login normal. */
export const entrarMestre = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; senha: string }) => ({
    email: String(d?.email ?? "").slice(0, 200),
    senha: String(d?.senha ?? "").slice(0, 200),
  }))
  .handler(async ({ data }) => {
    if (!credenciaisConferem(data.email, data.senha)) return { ok: false as const };
    const sessao = await useSession<SessaoMestre>(configSessao());
    await sessao.update({ mestre: true, desde: Date.now() });
    return { ok: true as const };
  });

/** Confere se o cookie do modo mestre ainda vale (usado ao abrir o painel). */
export const souMestre = createServerFn({ method: "GET" }).handler(async () => {
  const sessao = await useSession<SessaoMestre>(configSessao());
  return { ok: sessao.data.mestre === true };
});

export const sairMestre = createServerFn({ method: "POST" }).handler(async () => {
  const sessao = await useSession<SessaoMestre>(configSessao());
  await sessao.clear();
  return { ok: true as const };
});

/** Todas as lojas da plataforma, com a situação da assinatura de cada uma. */
export const listarLojas = createServerFn({ method: "GET" }).handler(
  async (): Promise<LojaMestre[]> => {
    await exigirMestre();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [tenants, perfis, assinaturas] = await Promise.all([
      supabaseAdmin.from("tenants").select("id, name, created_at"),
      supabaseAdmin.from("profiles").select("tenant_id, email, full_name"),
      supabaseAdmin
        .from("subscriptions")
        .select("tenant_id, status, plan, price, current_period_end, last_event, buyer_email"),
    ]);
    if (tenants.error) throw new Error(tenants.error.message);

    const perfilPor = new Map((perfis.data ?? []).map((p) => [p.tenant_id as string, p]));
    const assinaturaPor = new Map(
      (assinaturas.data ?? []).map((a) => [a.tenant_id as string, a]),
    );

    return (tenants.data ?? []).map((t) => {
      const p = perfilPor.get(t.id as string);
      const a = assinaturaPor.get(t.id as string);
      return {
        tenantId: t.id as string,
        loja: (t.name as string) ?? "Loja sem nome",
        email: (p?.email as string | null) ?? (a?.buyer_email as string | null) ?? null,
        nome: (p?.full_name as string | null) ?? null,
        status: (a?.status as string) ?? "pending",
        plano: (a?.plan as string) ?? "mensal",
        preco: Number(a?.price ?? 39.9),
        venceEm: (a?.current_period_end as string | null) ?? null,
        ultimoEvento: (a?.last_event as string | null) ?? null,
        criadaEm: (t.created_at as string | null) ?? null,
      };
    });
  },
);

/** Libera ou bloqueia uma loja por X dias — o que o SQL fazia, num botão. */
export const salvarAssinatura = createServerFn({ method: "POST" })
  .inputValidator(
    (d: { tenantId: string; liberado: boolean; dias: number; preco?: number; plano?: string }) => ({
      tenantId: String(d.tenantId),
      liberado: !!d.liberado,
      dias: Math.min(3650, Math.max(1, Math.round(Number(d.dias) || 30))),
      preco: Number.isFinite(Number(d.preco)) ? Number(d.preco) : 39.9,
      plano: String(d.plano || "mensal").slice(0, 40),
    }),
  )
  .handler(async ({ data }) => {
    await exigirMestre();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: perfil } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("tenant_id", data.tenantId)
      .maybeSingle();

    const vence = new Date(
      Date.now() + (data.liberado ? data.dias : 0) * 86_400_000,
    ).toISOString();

    const { error } = await supabaseAdmin.from("subscriptions").upsert(
      {
        tenant_id: data.tenantId,
        status: data.liberado ? "active" : "canceled",
        plan: data.plano,
        price: data.preco,
        current_period_end: vence,
        buyer_email: (perfil?.email as string | null) ?? null,
        /* `calcular()` só considera pago quando o último evento é de compra. */
        last_event: data.liberado ? "SALE_APPROVED" : "SUBSCRIPTION_CANCELED",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tenant_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true as const, venceEm: vence };
  });

/** Cria a conta do cliente já confirmada e já paga. */
export const criarCliente = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; senha: string; loja: string; nome?: string; dias: number }) => ({
    email: String(d.email ?? "").trim().toLowerCase().slice(0, 200),
    senha: String(d.senha ?? ""),
    loja: String(d.loja ?? "").trim().slice(0, 120),
    nome: String(d.nome ?? "").trim().slice(0, 120),
    dias: Math.min(3650, Math.max(1, Math.round(Number(d.dias) || 30))),
  }))
  .handler(async ({ data }) => {
    await exigirMestre();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) throw new Error("E-mail inválido.");
    if (data.senha.length < 6) throw new Error("A senha precisa de pelo menos 6 caracteres.");
    if (!data.loja) throw new Error("Informe o nome da loja.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: criado, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.senha,
      email_confirm: true,
      user_metadata: { store_name: data.loja, full_name: data.nome || data.loja },
    });
    if (error) throw new Error(error.message);

    /* O gatilho `handle_new_user` monta loja, perfil e papel. Damos um instante
       para ele terminar antes de gravar o pagamento. */
    let tenantId: string | null = null;
    for (let tentativa = 0; tentativa < 6 && !tenantId; tentativa++) {
      const { data: perfil } = await supabaseAdmin
        .from("profiles")
        .select("tenant_id")
        .eq("id", criado.user!.id)
        .maybeSingle();
      tenantId = (perfil?.tenant_id as string | null) ?? null;
      if (!tenantId) await new Promise((r) => setTimeout(r, 400));
    }
    if (!tenantId) throw new Error("Conta criada, mas a loja ainda não apareceu. Recarregue.");

    const vence = new Date(Date.now() + data.dias * 86_400_000).toISOString();
    await supabaseAdmin.from("subscriptions").upsert(
      {
        tenant_id: tenantId,
        status: "active",
        plan: "mensal",
        price: 39.9,
        current_period_end: vence,
        buyer_email: data.email,
        last_event: "SALE_APPROVED",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tenant_id" },
    );

    return { ok: true as const, tenantId, venceEm: vence };
  });

/** Apaga a conta e a loja (usado com muito cuidado, sempre com confirmação). */
export const removerCliente = createServerFn({ method: "POST" })
  .inputValidator((d: { tenantId: string }) => ({ tenantId: String(d.tenantId) }))
  .handler(async ({ data }) => {
    await exigirMestre();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: perfis } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("tenant_id", data.tenantId);
    for (const p of perfis ?? []) {
      await supabaseAdmin.auth.admin.deleteUser(p.id as string);
    }
    await supabaseAdmin.from("tenants").delete().eq("id", data.tenantId);
    return { ok: true as const };
  });
