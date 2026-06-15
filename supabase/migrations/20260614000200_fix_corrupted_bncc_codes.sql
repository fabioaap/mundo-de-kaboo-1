-- ============================================================
-- Migration: corrige códigos BNCC corrompidos em collections.bncc_skills
-- Dois códigos foram salvos com o caractere grego "Ε" (U+0395) no lugar
-- do "E" latino, ficando inválidos:
--   'ΕI03ΕF03' -> 'EI03EF03'
--   'ΕI03ΕO02' -> 'EI03EO02'
-- ============================================================

UPDATE public.collections
SET bncc_skills = array_replace(
                    array_replace(bncc_skills, 'ΕI03ΕF03', 'EI03EF03'),
                  'ΕI03ΕO02', 'EI03EO02')
WHERE bncc_skills && ARRAY['ΕI03ΕF03', 'ΕI03ΕO02']::text[];
