DROP POLICY IF EXISTS "Usuarios leem media collection links visiveis" ON public.media_collection_links;
CREATE POLICY "Usuarios leem media collection links visiveis" ON public.media_collection_links FOR SELECT TO authenticated USING (true);
