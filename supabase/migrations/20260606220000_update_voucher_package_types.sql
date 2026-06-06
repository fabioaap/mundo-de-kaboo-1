-- Atualiza tipos de pacote de voucher para refletir o menu atual do Kaboo.
-- Kit foi renomeado para Coleção; novos tipos: video, audio, formation, material.

ALTER TABLE public.voucher_models
  DROP CONSTRAINT IF EXISTS voucher_models_package_type_check;

ALTER TABLE public.voucher_models
  ADD CONSTRAINT voucher_models_package_type_check
  CHECK (package_type IN ('book', 'collection', 'video', 'audio', 'formation', 'material'));
