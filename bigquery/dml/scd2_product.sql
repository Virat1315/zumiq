-- ============================================================================
-- ZUMIQ — Enterprise Data Intelligence Platform
-- scd2_product.sql
-- SCD Type 2 load for dim_product — demonstrates the "revision" pattern using
-- row_number() over partition by product_id to version products, plus an
-- example of a slowly-changing *hierarchy* (category reassignment).
--
-- Pattern: full incremental "upsert" via MERGE with expiration + insert.
-- ============================================================================

DECLARE run_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP();

MERGE `zumiq-prod.core_layer.dim_product` AS target
USING
  (
    SELECT
      product_id, product_name, product_category, product_subcategory,
      brand, list_price, cost_price,
      ROUND(SAFE_DIVIDE(list_price - cost_price, list_price), 4) AS margin_pct,
      status, run_ts AS valid_from,
      TO_HEX(MD5(CONCAT(product_name, '|', product_category, '|',
        product_subcategory, '|', brand, '|', CAST(list_price AS STRING), '|',
        CAST(cost_price AS STRING), '|', status))) AS record_hash
    FROM `zumiq-prod.staging_layer.stg_product`
    WHERE is_active = TRUE
  ) AS source
ON target.product_id = source.product_id
   AND target.is_current = TRUE

WHEN NOT MATCHED THEN
  INSERT (product_key, product_id, product_name, product_category,
          product_subcategory, brand, list_price, cost_price, margin_pct,
          status, valid_from, valid_to, is_current, record_hash, etl_loaded_at)
  VALUES (
    (SELECT MAX(product_key) FROM `zumiq-prod.core_layer.dim_product`) + 1,
    source.product_id, source.product_name, source.product_category,
    source.product_subcategory, source.brand, source.list_price,
    source.cost_price, source.margin_pct, source.status, source.valid_from,
    NULL, TRUE, source.record_hash, run_ts
  )

WHEN MATCHED AND target.record_hash != source.record_hash THEN
  UPDATE SET
    target.valid_to      = run_ts,
    target.is_current    = FALSE,
    target.etl_loaded_at = run_ts;

-- Insert the new versions (only for changed products).
INSERT INTO `zumiq-prod.core_layer.dim_product`
  (product_key, product_id, product_name, product_category, product_subcategory,
   brand, list_price, cost_price, margin_pct, status, valid_from, valid_to,
   is_current, record_hash, etl_loaded_at)
SELECT
  (SELECT MAX(product_key) FROM `zumiq-prod.core_layer.dim_product`) + ROW_NUMBER() OVER (),
  s.product_id, s.product_name, s.product_category, s.product_subcategory,
  s.brand, s.list_price, s.cost_price, s.margin_pct, s.status, run_ts,
  NULL, TRUE, s.record_hash, run_ts
FROM `zumiq-prod.staging_layer.stg_product` AS s
LEFT JOIN `zumiq-prod.core_layer.dim_product` AS cur
  ON cur.product_id = s.product_id AND cur.is_current = TRUE
WHERE cur.product_key IS NULL   -- no current version (either new or just expired)
  AND s.is_active = TRUE;

-- ============================================================================
-- HISTORY RECONSTRUCTED EXAMPLE — "as-of" product price (temporal query)
-- Used by finance for margin restatements:
--   SELECT price history for a product as of a historical date.
-- ============================================================================
-- SELECT
--   p.product_id,
--   p.list_price AS price_as_of,
--   p.valid_from,
--   p.valid_to
-- FROM `zumiq-prod.core_layer.dim_product` AS p
-- WHERE p.product_id = 'SKU-880231'
--   AND DATE(p.valid_from) <= DATE '2026-03-15'
--   AND (p.valid_to IS NULL OR DATE(p.valid_to) > DATE '2026-03-15');

-- ============================================================================
-- END scd2_product.sql
-- ============================================================================
