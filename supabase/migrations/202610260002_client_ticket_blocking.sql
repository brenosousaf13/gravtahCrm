-- Apply after 202610260001_ticket_blocking.sql and before deploying the UI.
-- A customer block is manual and independent of every ticket's status/block.
BEGIN;

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS is_ticket_creation_blocked boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION crm_private.guard_customer_ticket_creation_flag()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    trusted_database_job boolean := auth.uid() IS NULL
        AND coalesce(current_setting('role', true), 'none') NOT IN ('authenticated', 'anon');
BEGIN
    IF NOT trusted_database_job AND NOT crm_private.is_ticket_admin() THEN
        IF TG_OP = 'DELETE' THEN
            IF OLD.is_ticket_creation_blocked THEN
                RAISE EXCEPTION 'Somente administradores podem remover um cliente bloqueado.' USING ERRCODE = '42501';
            END IF;
        ELSIF TG_OP = 'INSERT' THEN
            IF NEW.is_ticket_creation_blocked THEN
                RAISE EXCEPTION 'Somente administradores podem bloquear clientes.' USING ERRCODE = '42501';
            END IF;
        ELSIF NEW.is_ticket_creation_blocked IS DISTINCT FROM OLD.is_ticket_creation_blocked
           OR (OLD.is_ticket_creation_blocked AND NEW.id IS DISTINCT FROM OLD.id) THEN
            RAISE EXCEPTION 'Somente administradores podem bloquear ou desbloquear clientes.' USING ERRCODE = '42501';
        END IF;
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_customer_ticket_creation_flag ON public.profiles;
CREATE TRIGGER guard_customer_ticket_creation_flag
    BEFORE INSERT OR UPDATE OR DELETE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION crm_private.guard_customer_ticket_creation_flag();

CREATE OR REPLACE FUNCTION crm_private.guard_customer_new_ticket()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    target record;
BEGIN
    IF TG_OP = 'UPDATE' AND NEW.user_id IS NOT DISTINCT FROM OLD.user_id THEN
        RETURN NEW;
    END IF;
    -- Preserve trusted maintenance jobs and administrative operations.
    IF (auth.uid() IS NULL AND coalesce(current_setting('role', true), 'none') NOT IN ('authenticated', 'anon'))
       OR crm_private.is_ticket_admin() THEN
        RETURN NEW;
    END IF;
    IF auth.uid() IS NULL OR NEW.user_id IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'Você não tem permissão para abrir este ticket.' USING ERRCODE = '42501';
    END IF;

    -- SHARE serializes creation against the admin's UPDATE of the profile.
    SELECT role, is_ticket_creation_blocked INTO target
    FROM public.profiles WHERE id = NEW.user_id FOR SHARE;
    IF NOT FOUND OR target.role IS DISTINCT FROM 'cliente' THEN
        RAISE EXCEPTION 'Não foi possível verificar sua permissão para abrir tickets.' USING ERRCODE = '42501';
    END IF;
    IF target.is_ticket_creation_blocked THEN
        RAISE EXCEPTION 'A abertura de novos tickets está bloqueada para seu cadastro. Aguarde a liberação da equipe.' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_customer_new_ticket ON public.tickets;
CREATE TRIGGER guard_customer_new_ticket
    BEFORE INSERT OR UPDATE OF user_id ON public.tickets
    FOR EACH ROW EXECUTE FUNCTION crm_private.guard_customer_new_ticket();

REVOKE ALL ON FUNCTION crm_private.guard_customer_ticket_creation_flag() FROM PUBLIC;
REVOKE ALL ON FUNCTION crm_private.guard_customer_new_ticket() FROM PUBLIC;

COMMIT;
