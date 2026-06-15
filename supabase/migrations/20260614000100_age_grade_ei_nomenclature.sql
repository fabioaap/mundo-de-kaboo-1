-- ============================================================
-- Migration: nomenclatura de ano escolar (Educação Infantil)
-- Converte os valores de Educação Infantil no array collections.age_grade:
--   '3 anos' -> 'G3'
--   '4 anos' -> 'G4'
--   '5 anos' -> 'G5'
-- Ensino Fundamental (1º..5º ano) permanece inalterado.
-- A coluna suitable_ages (Idade Adequada) NÃO é afetada.
-- ============================================================

UPDATE public.collections
SET age_grade = array_replace(
                  array_replace(
                    array_replace(age_grade, '3 anos', 'G3'),
                  '4 anos', 'G4'),
                '5 anos', 'G5')
WHERE age_grade && ARRAY['3 anos', '4 anos', '5 anos']::text[];
