import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth, tenantDoUsuario } from "@/lib/auth-middleware";

/** Um sabor do mesmo produto com preço próprio: "Premium R$ 15,00".
 *  Cada sabor pode cobrar fixo, digitado na hora ou por peso. */
const saborSchema = z.object({
  nome: z.string().trim().min(1).max(40),
  preco: z.number().min(0).max(99999),
  modo: z.enum(["fixed", "manual", "weight"]).default("fixed"),
  precoKg: z.number().min(0).max(999999).default(0),
});

const produtoSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Informe o nome"),
  code: z.string().trim().optional().nullable(),
  category: z.string().trim().optional().nullable(),
  tags: z.array(z.string()).default([]),
  price: z.number().min(0),
  active: z.boolean().default(true),
  image_url: z.string().trim().optional().nullable(),
  /** como o preço nasce: fixo, por sabor, digitado na hora ou por peso */
  pricing_mode: z.enum(["fixed", "flavor", "manual", "weight"]).default("fixed"),
  price_per_kg: z.number().min(0).max(999999).default(0),
  variants: z.array(saborSchema).max(30).default([]),
});

export type ProdutoInput = z.infer<typeof produtoSchema>;

export const listarProdutos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("products")
      .select(
        "id, name, code, category, tags, price, active, image_url, pricing_mode, price_per_kg, variants",
      )
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const salvarProduto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => produtoSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const tenant = await tenantDoUsuario(context);

    const linha = {
      tenant_id: tenant,
      name: data.name,
      code: data.code || null,
      category: data.category || null,
      tags: data.tags,
      price: data.price,
      active: data.active,
      image_url: data.image_url || null,
      pricing_mode: data.pricing_mode,
      price_per_kg: data.pricing_mode === "weight" ? data.price_per_kg : 0,
      variants: data.pricing_mode === "flavor" ? data.variants : [],
    };

    const query = data.id
      ? supabase.from("products").update(linha).eq("id", data.id)
      : supabase.from("products").insert(linha);

    const { error } = await query;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const excluirProduto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const obterLoja = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("store_settings")
      .select(
        "tenant_id, store_name, phone, address, receipt_footer, logo_url, salao_ativo, termo_mesa, qtd_mesas, destinos, meta_diaria, alerta_min, atraso_min, caixa_privado, categorias_saida, categorias_produto, cronometro_ativo, recibo_config, bloqueios, preparo_ativo",
      )
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

const lojaSchema = z.object({
  store_name: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  receipt_footer: z.string().optional().nullable(),
  logo_url: z.string().optional().nullable(),
  salao_ativo: z.boolean().optional(),
  termo_mesa: z.string().min(1).optional(),
  qtd_mesas: z.number().int().min(0).max(60).optional(),
  destinos: z.array(z.string().min(1)).max(12).optional(),
  meta_diaria: z.number().min(0).optional(),
  alerta_min: z.number().int().min(1).max(240).optional(),
  atraso_min: z.number().int().min(1).max(240).optional(),
  caixa_privado: z.boolean().optional(),
  categorias_saida: z.array(z.string().min(1)).max(20).optional(),
  categorias_produto: z.array(z.string().min(1)).max(60).optional(),
  cronometro_ativo: z.boolean().optional(),
  recibo_config: z.any().optional(),
  bloqueios: z.any().optional(),
  preparo_ativo: z.boolean().optional(),
});

export const salvarLoja = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => lojaSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const tenant = await tenantDoUsuario(context);

    const { data: existente } = await supabase
      .from("store_settings")
      .select("tenant_id")
      .eq("tenant_id", tenant)
      .maybeSingle();

    const { error } = existente
      ? await supabase.from("store_settings").update(data).eq("tenant_id", tenant)
      : await supabase
          .from("store_settings")
          .insert({ tenant_id: tenant, store_name: data.store_name ?? "Minha Loja", ...data });
    if (error) throw new Error(error.message);
    return { ok: true };
  });


/**
 * Renomear ou apagar uma categoria do cardápio mexe em todos os produtos que
 * a usam: assim as abas da tela de vendas nunca ficam apontando para o vazio.
 */
export const renomearCategoria = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        de: z.string().trim().min(1),
        para: z.string().trim().max(40).nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("products")
      .update({ category: data.para || null })
      .eq("category", data.de);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
