-- ── Migration: add content.offline feature flag ──────────────────────────────
-- Adds a global feature flag that controls whether end-users can download
-- content for offline usage. Disabled by default; admin enables per brand.

INSERT INTO public.feature_flags (key, description, default_enabled)
VALUES ('content.offline', 'Permite download de conteúdo para uso offline', false)
ON CONFLICT (key) DO NOTHING;
