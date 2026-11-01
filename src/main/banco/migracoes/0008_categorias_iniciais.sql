-- D-062 · o sistema já vem com as categorias Paleta, Picolé e Pote (podem ser removidas).
-- Preços começam em R$ 0,00 e são definidos na receita (R1). Não duplica se já existir.

INSERT INTO categoria (nome, nome_unidade, criado_em, alterado_em)
SELECT n.nome, n.unidade, strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'),
  strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime')
FROM (
  SELECT 1 AS o, 'Paleta' AS nome, 'paleta' AS unidade
  UNION ALL SELECT 2, 'Picolé', 'picolé'
  UNION ALL SELECT 3, 'Pote', 'pote'
) n
WHERE NOT EXISTS (
  SELECT 1 FROM categoria c WHERE c.excluido_em IS NULL AND lower(trim(c.nome)) = lower(n.nome)
)
ORDER BY n.o;
