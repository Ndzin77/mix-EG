CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.current_tenant_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT tenant_id FROM public.profiles WHERE id = auth.uid() $$;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE OR REPLACE FUNCTION private.is_manager()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT private.has_role(auth.uid(), 'owner') OR private.has_role(auth.uid(), 'manager') $$;

REVOKE ALL ON FUNCTION private.current_tenant_id(), private.is_manager(), private.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.current_tenant_id(), private.is_manager() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO service_role;

-- expenses
DROP POLICY IF EXISTS expenses_select ON public.expenses;
DROP POLICY IF EXISTS expenses_insert ON public.expenses;
DROP POLICY IF EXISTS expenses_update ON public.expenses;
DROP POLICY IF EXISTS expenses_delete ON public.expenses;
CREATE POLICY expenses_select ON public.expenses FOR SELECT TO authenticated USING (tenant_id = private.current_tenant_id());
CREATE POLICY expenses_insert ON public.expenses FOR INSERT TO authenticated WITH CHECK (tenant_id = private.current_tenant_id());
CREATE POLICY expenses_update ON public.expenses FOR UPDATE TO authenticated USING (tenant_id = private.current_tenant_id()) WITH CHECK (tenant_id = private.current_tenant_id());
CREATE POLICY expenses_delete ON public.expenses FOR DELETE TO authenticated USING (tenant_id = private.current_tenant_id() AND private.is_manager());

-- order_items
DROP POLICY IF EXISTS order_items_select ON public.order_items;
DROP POLICY IF EXISTS order_items_insert ON public.order_items;
DROP POLICY IF EXISTS order_items_update ON public.order_items;
DROP POLICY IF EXISTS order_items_delete ON public.order_items;
CREATE POLICY order_items_select ON public.order_items FOR SELECT TO authenticated USING (tenant_id = private.current_tenant_id());
CREATE POLICY order_items_insert ON public.order_items FOR INSERT TO authenticated WITH CHECK (tenant_id = private.current_tenant_id());
CREATE POLICY order_items_update ON public.order_items FOR UPDATE TO authenticated USING (tenant_id = private.current_tenant_id()) WITH CHECK (tenant_id = private.current_tenant_id());
CREATE POLICY order_items_delete ON public.order_items FOR DELETE TO authenticated USING (tenant_id = private.current_tenant_id());

-- orders
DROP POLICY IF EXISTS orders_select ON public.orders;
DROP POLICY IF EXISTS orders_insert ON public.orders;
DROP POLICY IF EXISTS orders_update ON public.orders;
DROP POLICY IF EXISTS orders_delete ON public.orders;
CREATE POLICY orders_select ON public.orders FOR SELECT TO authenticated USING (tenant_id = private.current_tenant_id());
CREATE POLICY orders_insert ON public.orders FOR INSERT TO authenticated WITH CHECK (tenant_id = private.current_tenant_id());
CREATE POLICY orders_update ON public.orders FOR UPDATE TO authenticated USING (tenant_id = private.current_tenant_id()) WITH CHECK (tenant_id = private.current_tenant_id());
CREATE POLICY orders_delete ON public.orders FOR DELETE TO authenticated USING (tenant_id = private.current_tenant_id() AND private.is_manager());

-- products
DROP POLICY IF EXISTS products_select ON public.products;
DROP POLICY IF EXISTS products_insert ON public.products;
DROP POLICY IF EXISTS products_update ON public.products;
DROP POLICY IF EXISTS products_delete ON public.products;
CREATE POLICY products_select ON public.products FOR SELECT TO authenticated USING (tenant_id = private.current_tenant_id());
CREATE POLICY products_insert ON public.products FOR INSERT TO authenticated WITH CHECK (tenant_id = private.current_tenant_id());
CREATE POLICY products_update ON public.products FOR UPDATE TO authenticated USING (tenant_id = private.current_tenant_id()) WITH CHECK (tenant_id = private.current_tenant_id());
CREATE POLICY products_delete ON public.products FOR DELETE TO authenticated USING (tenant_id = private.current_tenant_id() AND private.is_manager());

-- profiles
DROP POLICY IF EXISTS profiles_select_same_tenant ON public.profiles;
CREATE POLICY profiles_select_same_tenant ON public.profiles FOR SELECT TO authenticated USING (tenant_id = private.current_tenant_id());

-- store_settings
DROP POLICY IF EXISTS settings_select ON public.store_settings;
DROP POLICY IF EXISTS settings_insert ON public.store_settings;
DROP POLICY IF EXISTS settings_update ON public.store_settings;
CREATE POLICY settings_select ON public.store_settings FOR SELECT TO authenticated USING (tenant_id = private.current_tenant_id());
CREATE POLICY settings_insert ON public.store_settings FOR INSERT TO authenticated WITH CHECK (tenant_id = private.current_tenant_id() AND private.is_manager());
CREATE POLICY settings_update ON public.store_settings FOR UPDATE TO authenticated USING (tenant_id = private.current_tenant_id() AND private.is_manager()) WITH CHECK (tenant_id = private.current_tenant_id());

-- tenants
DROP POLICY IF EXISTS tenant_select_own ON public.tenants;
DROP POLICY IF EXISTS tenant_update_manager ON public.tenants;
CREATE POLICY tenant_select_own ON public.tenants FOR SELECT TO authenticated USING (id = private.current_tenant_id());
CREATE POLICY tenant_update_manager ON public.tenants FOR UPDATE TO authenticated USING (id = private.current_tenant_id() AND private.is_manager()) WITH CHECK (id = private.current_tenant_id());

-- user_roles
DROP POLICY IF EXISTS user_roles_select_same_tenant ON public.user_roles;
CREATE POLICY user_roles_select_same_tenant ON public.user_roles FOR SELECT TO authenticated USING (tenant_id = private.current_tenant_id());

DROP FUNCTION IF EXISTS public.is_manager();
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
DROP FUNCTION IF EXISTS public.current_tenant_id();