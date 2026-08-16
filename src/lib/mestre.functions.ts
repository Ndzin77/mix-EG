import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import {
  configSessao,
  credenciaisConferem,
  exigirMestre,
  segredosFaltando,
  type LojaMestre,
  type RaioX,
  type SessaoMestre,
} from "@/lib/mestre.server";

/** Entra no modo mestre a partir da tela de login normal. */
export const entrarMestre = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; senha: string }) => ({
    email: String(d?.email ?? "").slice(0, 200),
    senha: String(d?.senha ?? "").slice(0, 200),
  }))
  .handler(async ({ data }) => {
    /* Hospedagem própria sem as variáveis cadastradas: erro de configuração,
       não senha errada. Dizer isso poupa horas de tentativa. */
    const faltando = segredosFaltando();
    if (faltando.length) return { ok: false as const, faltando };
    if (!credenciaisConferem(data.email, data.senha)) return { ok: false as const, faltando: [] };
    const sessao = await useSession<SessaoMestre>(configSessao());
    await sessao.update({ mestre: true, desde: Date.now() });
    return { ok: true as const, faltando: [] };
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

    const [tenants, perfis, assinaturas, produtos, vendas] = await Promise.all([
      supabaseAdmin.from("tenants").select("id, name, created_at, nota_mestre"),
      supabaseAdmin.from("profiles").select("tenant_id, email, full_name"),
      supabaseAdmin
        .from("subscriptions")
        .select("tenant_id, status, plan, price, current_period_end, last_event, buyer_email"),
      supabaseAdmin.from("products").select("tenant_id").eq("active", true).limit(20000),
      supabaseAdmin
        .from("orders")
        .select("tenant_id, closed_at")
        .eq("status", "paid")
        .order("closed_at", { ascending: false })
        .limit(20000),
    ]);
    if (tenants.error) throw new Error(tenants.error.message);

    const perfilPor = new Map((perfis.data ?? []).map((p) => [p.tenant_id as string, p]));
    const assinaturaPor = new Map(
      (assinaturas.data ?? []).map((a) => [a.tenant_id as string, a]),
    );
    const ativosPor = new Map<string, number>();
    for (const p of produtos.data ?? []) {
      const k = p.tenant_id as string;
      ativosPor.set(k, (ativosPor.get(k) ?? 0) + 1);
    }
    /* A lista já vem da mais nova para a mais velha: a primeira de cada loja é
       a última venda dela. */
    const ultimaPor = new Map<string, string>();
    for (const o of vendas.data ?? []) {
      const k = o.tenant_id as string;
      if (!ultimaPor.has(k) && o.closed_at) ultimaPor.set(k, o.closed_at as string);
    }

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
        ultimaVenda: ultimaPor.get(t.id as string) ?? null,
        produtosAtivos: ativosPor.get(t.id as string) ?? 0,
        anotacao: (t.nota_mestre as string | null) ?? null,
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

/** Troca a senha do cliente na hora (ele esqueceu e não recebe e-mail). */
export const definirSenhaCliente = createServerFn({ method: "POST" })
  .inputValidator((d: { tenantId: string; senha: string }) => ({
    tenantId: String(d.tenantId),
    senha: String(d.senha ?? ""),
  }))
  .handler(async ({ data }) => {
    await exigirMestre();
    if (data.senha.length < 6) throw new Error("A senha precisa de pelo menos 6 caracteres.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: perfil } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .eq("tenant_id", data.tenantId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!perfil?.id) throw new Error("Essa loja não tem dono cadastrado.");

    const { error } = await supabaseAdmin.auth.admin.updateUserById(perfil.id as string, {
      password: data.senha,
      email_confirm: true,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const, email: (perfil.email as string | null) ?? null };
  });

/** Manda o link oficial de redefinição para o e-mail do cliente. */
export const enviarLinkSenha = createServerFn({ method: "POST" })
  .inputValidator((d: { tenantId: string }) => ({ tenantId: String(d.tenantId) }))
  .handler(async ({ data }) => {
    await exigirMestre();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: perfil } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("tenant_id", data.tenantId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    const email = (perfil?.email as string | null) ?? null;
    if (!email) throw new Error("Essa loja não tem e-mail cadastrado.");

    const { error } = await supabaseAdmin.auth.admin.generateLink({ type: "recovery", email });
    if (error) throw new Error(error.message);
    return { ok: true as const, email };
  });

/** Anotação interna da loja — só o painel mestre lê e escreve. */
export const anotarLoja = createServerFn({ method: "POST" })
  .inputValidator((d: { tenantId: string; nota: string }) => ({
    tenantId: String(d.tenantId),
    nota: String(d.nota ?? "").slice(0, 1000),
  }))
  .handler(async ({ data }) => {
    await exigirMestre();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("tenants")
      .update({ nota_mestre: data.nota || null })
      .eq("id", data.tenantId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** Libera ou bloqueia várias lojas de uma vez. */
export const lojasEmLote = createServerFn({ method: "POST" })
  .inputValidator((d: { tenantIds: string[]; liberado: boolean; dias: number }) => ({
    tenantIds: (d.tenantIds ?? []).map(String).slice(0, 200),
    liberado: !!d.liberado,
    dias: Math.min(3650, Math.max(1, Math.round(Number(d.dias) || 30))),
  }))
  .handler(async ({ data }) => {
    await exigirMestre();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: perfis } = await supabaseAdmin
      .from("profiles")
      .select("tenant_id, email")
      .in("tenant_id", data.tenantIds);
    const emailPor = new Map(
      (perfis ?? []).map((p) => [p.tenant_id as string, (p.email as string | null) ?? null]),
    );

    const vence = new Date(
      Date.now() + (data.liberado ? data.dias : 0) * 86_400_000,
    ).toISOString();

    const { error } = await supabaseAdmin.from("subscriptions").upsert(
      data.tenantIds.map((tenant_id) => ({
        tenant_id,
        status: data.liberado ? "active" : "canceled",
        plan: "mensal",
        price: 39.9,
        current_period_end: vence,
        buyer_email: emailPor.get(tenant_id) ?? null,
        last_event: data.liberado ? "SALE_APPROVED" : "SUBSCRIPTION_CANCELED",
        updated_at: new Date().toISOString(),
      })),
      { onConflict: "tenant_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true as const, quantas: data.tenantIds.length };
  });

/** Raio-X da loja: diagnóstico completo sem entrar na conta de ninguém. */
export const resumoLoja = createServerFn({ method: "POST" })
  .inputValidator((d: { tenantId: string }) => ({ tenantId: String(d.tenantId) }))
  .handler(async ({ data }): Promise<RaioX> => {
    await exigirMestre();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const t = data.tenantId;

    const agora = Date.now();
    const inicioHoje = new Date();
    inicioHoje.setHours(0, 0, 0, 0);
    const d7 = new Date(agora - 7 * 86_400_000).toISOString();
    const d30 = new Date(agora - 30 * 86_400_000).toISOString();
    const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    const [prods, pagas, abertas, saidas, perfis, tenant] = await Promise.all([
      supabaseAdmin.from("products").select("active, image_url").eq("tenant_id", t).limit(20000),
      supabaseAdmin
        .from("orders")
        .select("total, closed_at")
        .eq("tenant_id", t)
        .eq("status", "paid")
        .gte("closed_at", d30)
        .order("closed_at", { ascending: false })
        .limit(20000),
      supabaseAdmin
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", t)
        .eq("status", "open"),
      supabaseAdmin.from("expenses").select("amount").eq("tenant_id", t).gte("occurred_at", inicioMes),
      supabaseAdmin.from("profiles").select("id").eq("tenant_id", t),
      supabaseAdmin.from("tenants").select("created_at").eq("id", t).maybeSingle(),
    ]);

    const lista = prods.data ?? [];
    const produtosAtivos = lista.filter((p) => p.active).length;
    const produtosInativos = lista.length - produtosAtivos;
    const produtosComFoto = lista.filter((p) => !!p.image_url).length;

    const vendas = (pagas.data ?? []).map((o) => ({
      total: Number(o.total ?? 0),
      quando: (o.closed_at as string | null) ?? null,
    }));
    const desde = (iso: string) => vendas.filter((v) => v.quando && v.quando >= iso);
    const soma = (arr: { total: number }[]) => arr.reduce((s, v) => s + v.total, 0);

    const hoje = desde(inicioHoje.toISOString());
    const sete = desde(d7);

    /* Última venda: pode ser mais velha que 30 dias, então busca à parte. */
    let ultimaVenda = vendas[0]?.quando ?? null;
    if (!ultimaVenda) {
      const { data: ult } = await supabaseAdmin
        .from("orders")
        .select("closed_at")
        .eq("tenant_id", t)
        .eq("status", "paid")
        .order("closed_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      ultimaVenda = (ult?.closed_at as string | null) ?? null;
    }

    let emailConfirmado = false;
    let ultimoLogin: string | null = null;
    const donoId = (perfis.data ?? [])[0]?.id as string | undefined;
    if (donoId) {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(donoId);
      emailConfirmado = !!u?.user?.email_confirmed_at;
      ultimoLogin = u?.user?.last_sign_in_at ?? null;
    }

    const diasSemVender = ultimaVenda
      ? Math.floor((agora - new Date(ultimaVenda).getTime()) / 86_400_000)
      : null;

    const veredito: RaioX["veredito"] =
      produtosAtivos === 0
        ? {
            cor: "danger",
            titulo: "Catálogo vazio",
            texto: "A loja não tem produto ativo — por isso a tela de vendas aparece vazia.",
          }
        : ultimaVenda === null
          ? {
              cor: "warning",
              titulo: "Ainda não vendeu",
              texto: "Catálogo montado, mas nenhuma venda finalizada até agora.",
            }
          : (diasSemVender ?? 0) === 0
            ? { cor: "success", titulo: "Tudo certo", texto: "A loja vendeu hoje." }
            : (diasSemVender ?? 0) <= 3
              ? {
                  cor: "success",
                  titulo: "Em movimento",
                  texto: `Última venda há ${diasSemVender} dia(s).`,
                }
              : {
                  cor: (diasSemVender ?? 0) > 10 ? "danger" : "warning",
                  titulo: "Parada",
                  texto: `Sem vender há ${diasSemVender} dias.`,
                };

    return {
      produtosAtivos,
      produtosInativos,
      produtosComFoto,
      vendasHoje: hoje.length,
      faturouHoje: soma(hoje),
      vendas7: sete.length,
      faturou7: soma(sete),
      vendas30: vendas.length,
      faturou30: soma(vendas),
      ticketMedio30: vendas.length ? soma(vendas) / vendas.length : 0,
      contasAbertas: abertas.count ?? 0,
      saidasMes: (saidas.data ?? []).reduce((s, e) => s + Number(e.amount ?? 0), 0),
      ultimaVenda,
      usuarios: (perfis.data ?? []).length,
      emailConfirmado,
      ultimoLogin,
      criadaEm: (tenant.data?.created_at as string | null) ?? null,
      veredito,
    };
  });
