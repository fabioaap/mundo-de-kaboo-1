-- T4.3: índices nas FKs sem cobertura de índice
-- FK sem índice causa full scan na tabela filha a cada DELETE/UPDATE na tabela pai.

CREATE INDEX IF NOT EXISTS idx_profiles_brand_id ON public.profiles (brand_id);
CREATE INDEX IF NOT EXISTS idx_profiles_voucher_id ON public.profiles (voucher_id);
CREATE INDEX IF NOT EXISTS idx_formations_brand_id ON public.formations (brand_id);
CREATE INDEX IF NOT EXISTS idx_materials_brand_id ON public.materials (brand_id);
CREATE INDEX IF NOT EXISTS idx_feature_flag_audit_feature_flag_id ON public.feature_flag_audit (feature_flag_id);
CREATE INDEX IF NOT EXISTS idx_media_shelves_brand_id ON public.media_shelves (brand_id);
