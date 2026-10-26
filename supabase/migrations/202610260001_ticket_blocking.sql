-- Apply before deploying the application. Existing RLS policies are preserved.
BEGIN;

ALTER TABLE public.tickets
    ADD COLUMN IF NOT EXISTS is_blocked boolean NOT NULL DEFAULT false;

CREATE SCHEMA IF NOT EXISTS crm_private;
REVOKE ALL ON SCHEMA crm_private FROM PUBLIC;
GRANT USAGE ON SCHEMA crm_private TO authenticated, anon;

CREATE OR REPLACE FUNCTION crm_private.is_ticket_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (SELECT auth.uid()) AND role = 'admin'
    );
$$;

CREATE OR REPLACE FUNCTION crm_private.guard_ticket_block_flag()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    IF (TG_OP = 'INSERT' AND NEW.is_blocked)
       OR (TG_OP = 'UPDATE' AND NEW.is_blocked IS DISTINCT FROM OLD.is_blocked) THEN
        IF NOT crm_private.is_ticket_admin() THEN
            RAISE EXCEPTION 'Somente administradores podem bloquear ou desbloquear tickets.' USING ERRCODE = '42501';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_ticket_block_flag ON public.tickets;
CREATE TRIGGER guard_ticket_block_flag
    BEFORE INSERT OR UPDATE ON public.tickets
    FOR EACH ROW EXECUTE FUNCTION crm_private.guard_ticket_block_flag();

-- A customer must not be able to grant themselves the role used by these rules.
-- Trusted database jobs without a user JWT retain existing provisioning behavior.
CREATE OR REPLACE FUNCTION crm_private.guard_ticket_profile_role()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    IF auth.uid() IS NOT NULL AND NOT crm_private.is_ticket_admin() THEN
        IF (TG_OP = 'INSERT' AND NEW.role IS DISTINCT FROM 'cliente')
           OR (TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role) THEN
            RAISE EXCEPTION 'Somente administradores podem alterar a função de um usuário.' USING ERRCODE = '42501';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_ticket_profile_role ON public.profiles;
CREATE TRIGGER guard_ticket_profile_role
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION crm_private.guard_ticket_profile_role();

CREATE OR REPLACE FUNCTION crm_private.guard_blocked_ticket_interaction()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    ticket_ids uuid[] := '{}';
    target record;
BEGIN
    IF NOT crm_private.is_ticket_admin() THEN
        IF TG_OP <> 'INSERT' THEN
            ticket_ids := array_append(ticket_ids, OLD.ticket_id);
        END IF;
        IF TG_OP <> 'DELETE' THEN
            ticket_ids := array_append(ticket_ids, NEW.ticket_id);
        END IF;
        -- SHARE conflicts with the admin's UPDATE: a concurrent request cannot
        -- insert after a block has committed using an earlier unlocked read.
        FOR target IN
            SELECT id, is_blocked FROM public.tickets
            WHERE id = ANY(ticket_ids) ORDER BY id FOR SHARE
        LOOP
            IF target.is_blocked THEN
                RAISE EXCEPTION 'Este ticket está bloqueado para novas interações.' USING ERRCODE = '42501';
            END IF;
        END LOOP;
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_blocked_ticket_messages ON public.ticket_messages;
CREATE TRIGGER guard_blocked_ticket_messages
    BEFORE INSERT OR UPDATE OR DELETE ON public.ticket_messages
    FOR EACH ROW EXECUTE FUNCTION crm_private.guard_blocked_ticket_interaction();

DROP TRIGGER IF EXISTS guard_blocked_ticket_attachments ON public.ticket_attachments;
CREATE TRIGGER guard_blocked_ticket_attachments
    BEFORE INSERT OR UPDATE OR DELETE ON public.ticket_attachments
    FOR EACH ROW EXECUTE FUNCTION crm_private.guard_blocked_ticket_interaction();

-- The app stores files as <user-or-admin-folder>/<ticket-uuid>/<filename>.
-- Check Storage separately: rejecting attachment metadata alone would still
-- let a stale tab delete or overwrite the existing file bytes.
CREATE OR REPLACE FUNCTION crm_private.can_modify_ticket_file(bucket text, object_name text)
RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    target record;
    path_ticket text;
BEGIN
    IF bucket <> 'warranty-files' THEN RETURN true; END IF;
    IF crm_private.is_ticket_admin() THEN RETURN true; END IF;
    IF auth.uid() IS NULL THEN RETURN false; END IF;

    -- Include linked metadata so older noncanonical paths cannot evade a block.
    FOR target IN
        SELECT t.id, t.user_id, t.is_blocked
        FROM public.tickets t
        WHERE t.id IN (
            SELECT a.ticket_id FROM public.ticket_attachments a
            WHERE a.file_url = object_name
        ) ORDER BY t.id FOR SHARE
    LOOP
        IF target.is_blocked OR target.user_id IS DISTINCT FROM auth.uid() THEN
            RETURN false;
        END IF;
    END LOOP;

    path_ticket := split_part(object_name, '/', 2);
    IF path_ticket !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       OR split_part(object_name, '/', 3) = '' THEN
        RETURN false;
    END IF;

    SELECT user_id, is_blocked INTO target FROM public.tickets
    WHERE id = path_ticket::uuid FOR SHARE;
    RETURN FOUND AND target.user_id = auth.uid() AND NOT target.is_blocked;
END;
$$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA crm_private FROM PUBLIC;
GRANT EXECUTE ON FUNCTION crm_private.can_modify_ticket_file(text, text) TO authenticated, anon;

-- Restrictive policies AND with existing permissive policies; they never grant
-- additional access. SELECT stays unchanged so history remains readable.
DROP POLICY IF EXISTS ticket_block_storage_insert ON storage.objects;
CREATE POLICY ticket_block_storage_insert ON storage.objects AS RESTRICTIVE
    FOR INSERT TO PUBLIC
    WITH CHECK (crm_private.can_modify_ticket_file(bucket_id, name));

DROP POLICY IF EXISTS ticket_block_storage_update ON storage.objects;
CREATE POLICY ticket_block_storage_update ON storage.objects AS RESTRICTIVE
    FOR UPDATE TO PUBLIC
    USING (crm_private.can_modify_ticket_file(bucket_id, name))
    WITH CHECK (crm_private.can_modify_ticket_file(bucket_id, name));

DROP POLICY IF EXISTS ticket_block_storage_delete ON storage.objects;
CREATE POLICY ticket_block_storage_delete ON storage.objects AS RESTRICTIVE
    FOR DELETE TO PUBLIC
    USING (crm_private.can_modify_ticket_file(bucket_id, name));

COMMIT;
