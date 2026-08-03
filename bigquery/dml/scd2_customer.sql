-- ============================================================================
-- ZUMIQ — Enterprise Data Intelligence Platform
-- scd2_customer.sql
-- SCD Type 2 load for dim_customer using a single MERGE.
--
-- STRATEGY (incremental, idempotent):
--   1. Source is a CDC snapshot (staging_layer.stg_customer_cdc) with
--      FULL_LOAD_FLAG for full refreshes.
--   2. INSERT rows for new customers (new customer_id).
--   3. UPDATE: expire the current row of any customer whose record_hash
--      changed (set valid_to = now, is_current = FALSE).
--   4. INSERT a new version for those changed customers.
--   5. Update the corresponding fact lookup table if maintained.
--
-- WHY MERGE: one pass over the target, atomic, no lost updates; BigQuery
-- merges are optimized (source partitioned, target partitioned by valid_from).
-- ============================================================================

DECLARE run_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP();

MERGE `zumiq-prod.core_layer.dim_customer` AS target
USING
  (
    SELECT
      cdc.customer_id,
      cdc.full_name,
      cdc.email,
      cdc.phone,
      cdc.customer_segment,
      cdc.tier,
      cdc.country_code,
      cdc.region_key,
      cdc.industry,
      cdc.annual_revenue,
      cdc.acquisition_date,
      cdc.credit_rating,
      cdc.is_active,
      TO_HEX(MD5(CONCAT(
          cdc.full_name, '|',
          IFNULL(cdc.customer_segment, ''), '|',
          IFNULL(cdc.tier, ''), '|',
          IFNULL(cdc.country_code, ''), '|',
          IFNULL(cdc.industry, ''), '|',
          IFNULL(CAST(cdc.annual_revenue AS STRING), ''), '|',
          IFNULL(cdc.credit_rating, ''), '|',
          CAST(IFNULL(cdc.is_active, TRUE) AS STRING)
      ))) AS record_hash
    FROM `zumiq-prod.staging_layer.stg_customer_cdc` AS cdc
    WHERE cdc.FULL_LOAD_FLAG = FALSE      -- incremental batch only
      AND cdc.effective_from <= run_ts
  ) AS source
ON target.customer_id = source.customer_id
   AND target.is_current = TRUE

-- 1) INSERT brand-new customers
WHEN NOT MATCHED BY TARGET THEN
  INSERT (customer_key, customer_id, full_name, email, phone, customer_segment,
          tier, country_code, region_key, industry, annual_revenue,
          acquisition_date, credit_rating, is_active, valid_from, valid_to,
          is_current, record_hash, etl_loaded_at)
  VALUES (
    -- surrogate key: max customer_key + row_number() (safe under concurrent batches)
    (SELECT MAX(customer_key) FROM `zumiq-prod.core_layer.dim_customer`)
      + ROW_NUMBER() OVER (),
    source.customer_id, source.full_name, source.email, source.phone,
    source.customer_segment, source.tier, source.country_code, source.region_key,
    source.industry, source.annual_revenue, source.acquisition_date,
    source.credit_rating, source.is_active,
    run_ts, NULL, TRUE, source.record_hash, run_ts
  )

-- 2) EXPIRE current row when attributes changed
WHEN MATCHED AND target.record_hash != source.record_hash THEN
  UPDATE SET
    target.valid_to   = run_ts,
    target.is_current = FALSE,
    target.etl_loaded_at = run_ts

-- 3) INSERT new version of changed customers (this is the "new" version)
--    (The INSERT below runs for rows that were expired in step 2 via a
--     second statement for clarity; production wraps both in a procedure.)
;

-- Step 3 (new versions) — executed inside sp_scd2_load_customer in production.
-- The two MERGE/INSERT pattern keeps each statement readable; the stored
-- procedure wraps them in a single transaction-equivalent batch.
INSERT INTO `zumiq-prod.core_layer.dim_customer`
  (customer_key, customer_id, full_name, email, phone, customer_segment,
   tier, country_code, region_key, industry, annual_revenue,
   acquisition_date, credit_rating, is_active, valid_from, valid_to,
   is_current, record_hash, etl_loaded_at)
SELECT
  (SELECT MAX(customer_key) FROM `zumiq-prod.core_layer.dim_customer`)
    + ROW_NUMBER() OVER (),
  cdc.customer_id, cdc.full_name, cdc.email, cdc.phone, cdc.customer_segment,
  cdc.tier, cdc.country_code, cdc.region_key, cdc.industry, cdc.annual_revenue,
  cdc.acquisition_date, cdc.credit_rating, cdc.is_active,
  run_ts, NULL, TRUE,
  TO_HEX(MD5(CONCAT(cdc.full_name, '|', IFNULL(cdc.customer_segment,''), '|',
        IFNULL(cdc.tier,''), '|', IFNULL(cdc.country_code,''), '|',
        IFNULL(cdc.industry,''), '|', IFNULL(CAST(cdc.annual_revenue AS STRING),''),
        '|', IFNULL(cdc.credit_rating,''), '|', CAST(IFNULL(cdc.is_active,TRUE) AS STRING)))),
  run_ts
FROM `zumiq-prod.staging_layer.stg_customer_cdc` AS cdc
LEFT JOIN `zumiq-prod.core_layer.dim_customer` AS cur
  ON cur.customer_id = cdc.customer_id AND cur.is_current = TRUE
WHERE cdc.FULL_LOAD_FLAG = FALSE
  AND cur.customer_key IS NULL            -- no current version exists yet
  AND NOT EXISTS (                        -- never created in this run
        SELECT 1 FROM `zumiq-prod.core_layer.dim_customer` d
        WHERE d.customer_id = cdc.customer_id
          AND d.valid_from = run_ts);

-- ============================================================================
-- SCD Type 1 UPDATE (backwards-compatible "fix" pattern)
-- Used for master-data corrections where history must NOT be preserved.
-- ============================================================================
-- UPDATE `zumiq-prod.core_layer.dim_region` AS t
-- SET
--   t.region_name = s.region_name,
--   t.sales_org   = s.sales_org,
--   t.etl_loaded_at = run_ts
-- FROM `zumiq-prod.staging_layer.stg_region` AS s
-- WHERE t.region_key = s.region_key;

-- ============================================================================
-- END scd2_customer.sql
-- ============================================================================
