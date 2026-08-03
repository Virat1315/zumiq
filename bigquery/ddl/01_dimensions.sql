-- ============================================================================
-- ZUMIQ - Enterprise Data Intelligence Platform
-- 01_dimensions.sql
-- Conformed dimensions. Includes:
--   dim_date          (date spine / time dimension)
--   dim_region        (region + country + timezone + currency)
--   dim_business_unit (BU: RTL, BNK, TEL, INS, MNF, LOG)
--   dim_channel       (sales/service channel)
--   dim_employee      (employee dimension, self-referencing for hierarchy)
--   dim_customer      (SCD Type 2 - see dml/scd2_customer.sql for load)
--   dim_account       (SCD Type 2)
--   dim_product       (SCD Type 2)
--
-- DESIGN NOTES
--   * Surrogate keys (int) decouple the warehouse from source natural keys.
--   * SCD2 dims carry valid_from / valid_to / is_current + a record_hash used
--     by the MERGE load to detect changes cheaply.
--   * dim_date is a full date spine built by a stored procedure; it is
--     clustered/ordered for high-performance date joins.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- dim_date - the time dimension (populated by stored procedure sp_load_dim_date)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `zumiq-prod.core_layer.dim_date`
(
  date_key            DATE    NOT NULL,   -- the natural calendar date (also PK)
  date_iso            DATE    NOT NULL,
  day_of_week         INT64   NOT NULL,   -- 0=Sunday … 6=Saturday
  day_name            STRING  NOT NULL,
  day_of_month        INT64   NOT NULL,
  day_of_year         INT64   NOT NULL,
  week_of_year        INT64   NOT NULL,
  week_start_date     DATE    NOT NULL,
  month_number        INT64   NOT NULL,
  month_name          STRING  NOT NULL,
  year                INT64   NOT NULL,
  quarter             INT64   NOT NULL,
  quarter_name        STRING  NOT NULL,
  is_weekend          BOOL    NOT NULL,
  is_month_end        BOOL    NOT NULL,
  is_quarter_end      BOOL    NOT NULL,
  is_year_end         BOOL    NOT NULL,
  is_holiday          BOOL    NOT NULL,
  holiday_name        STRING,
  fiscal_year         INT64   NOT NULL,   -- ZUMIQ fiscal year starts Feb 1
  fiscal_quarter      INT64   NOT NULL,
  fiscal_period       STRING  NOT NULL    -- e.g. 'FY2026-P01'
)
OPTIONS (description = 'Conformed time dimension (ZUMIQ fiscal calendar starts Feb 1).',
         labels = [("layer", "core"), ("criticality", "t1")]);

-- ----------------------------------------------------------------------------
-- dim_region - region / country / timezone / currency
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `zumiq-prod.core_layer.dim_region`
(
  region_key        INT64   NOT NULL,
  region_code       STRING  NOT NULL,   -- 'AMER', 'EMEA', 'APAC'
  region_name       STRING  NOT NULL,
  country_code      STRING  NOT NULL,   -- ISO-2
  country_name      STRING  NOT NULL,
  currency_code     STRING  NOT NULL,   -- ISO-4217
  timezone          STRING  NOT NULL,
  sales_org         STRING  NOT NULL,
  is_active         BOOL    NOT NULL DEFAULT TRUE
)
OPTIONS (description = 'Conformed region/country dimension (grain: country).',
         labels = [("layer", "core")]);

-- ----------------------------------------------------------------------------
-- dim_business_unit
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `zumiq-prod.core_layer.dim_business_unit`
(
  bu_key            INT64   NOT NULL,
  bu_code           STRING  NOT NULL,   -- 'RTL','BNK','TEL','INS','MNF','LOG'
  bu_name           STRING  NOT NULL,   -- 'Retail','Banking','Telecom','Insurance','Manufacturing','Logistics'
  segment           STRING  NOT NULL,   -- 'B2C','B2B','Hybrid'
  pnl_owner         STRING  NOT NULL,   -- executive accountable for the BU P&L
  cost_center       STRING  NOT NULL,
  data_product_owner STRING NOT NULL,   -- product owner for BU data products
  sla_hours         INT64   NOT NULL,   -- data freshness SLA (hours) for this BU
  classification    STRING  NOT NULL    -- 'INTERNAL','CONFIDENTIAL','RESTRICTED'
)
OPTIONS (description = 'Conformed business unit dimension.',
         labels = [("layer", "core")]);

-- ----------------------------------------------------------------------------
-- dim_channel
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `zumiq-prod.core_layer.dim_channel`
(
  channel_key     INT64   NOT NULL,
  channel_code    STRING  NOT NULL,  -- 'WEB','MOBILE','CALL','BRANCH','POS','API','PARTNER'
  channel_name    STRING  NOT NULL,
  channel_type    STRING  NOT NULL   -- 'DIGITAL','PHYSICAL','INDIRECT','SERVICE'
)
OPTIONS (description = 'Conformed channel dimension.',
         labels = [("layer", "core")]);

-- ----------------------------------------------------------------------------
-- dim_employee - with self-referencing manager hierarchy
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `zumiq-prod.core_layer.dim_employee`
(
  employee_key     INT64   NOT NULL,
  employee_id      STRING  NOT NULL,   -- natural HR id
  full_name        STRING  NOT NULL,
  department       STRING  NOT NULL,
  role_title       STRING  NOT NULL,
  manager_employee_key INT64,          -- self-reference to manager row (hierarchy)
  region_key       INT64   NOT NULL,
  hire_date        DATE    NOT NULL,
  employment_status STRING NOT NULL,   -- 'ACTIVE','TERMINATED','ON_LEAVE'
  cost_center      STRING  NOT NULL,
  email            STRING,
  is_active        BOOL    NOT NULL DEFAULT TRUE
)
OPTIONS (description = 'Conformed employee dimension with manager hierarchy.',
         labels = [("layer", "core")]);

-- ----------------------------------------------------------------------------
-- dim_customer - SCD Type 2
-- Grain: one row per customer per valid version
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `zumiq-prod.core_layer.dim_customer`
(
  customer_key      INT64   NOT NULL,
  customer_id       STRING  NOT NULL,     -- natural id from CRM
  full_name         STRING  NOT NULL,
  email             STRING,               -- PII - stored as hashed in prod, restricted
  phone             STRING,               -- PII
  customer_segment  STRING  NOT NULL,     -- 'Enterprise','Mid-Market','SMB'
  tier              STRING  NOT NULL,     -- 'Platinum','Gold','Silver','Bronze'
  country_code      STRING  NOT NULL,
  region_key        INT64   NOT NULL,
  industry          STRING,
  annual_revenue    NUMERIC(18,2),
  acquisition_date  DATE    NOT NULL,
  credit_rating     STRING,
  is_active         BOOL    NOT NULL,
  valid_from        TIMESTAMP NOT NULL,
  valid_to          TIMESTAMP,            -- NULL = current version
  is_current        BOOL    NOT NULL,
  record_hash       STRING  NOT NULL,     -- MD5 of SCD attributes for change detection
  etl_loaded_at     TIMESTAMP NOT NULL,
  dq_quality_score  NUMERIC(5,2)          -- DQ engine per-key score
)
PARTITION BY DATE(valid_from)
CLUSTER BY customer_id, is_current
OPTIONS (description = 'Conformed customer dimension - SCD Type 2, partitioned by valid_from.',
         labels = [("layer", "core"), ("criticality", "t1")]);

-- ----------------------------------------------------------------------------
-- dim_account - SCD Type 2
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `zumiq-prod.core_layer.dim_account`
(
  account_key      INT64   NOT NULL,
  account_id       STRING  NOT NULL,
  customer_key     INT64   NOT NULL,      -- FK to dim_customer (current version join)
  account_type     STRING  NOT NULL,      -- 'Checking','Savings','Loan','CreditCard','Trade','Deposit'
  status           STRING  NOT NULL,      -- 'OPEN','CLOSED','FROZEN','PENDING'
  open_date        DATE    NOT NULL,
  close_date       DATE,
  balance          NUMERIC(18,2) NOT NULL DEFAULT 0,
  interest_rate    NUMERIC(6,4),
  credit_limit     NUMERIC(18,2),
  branch_code      STRING,
  valid_from       TIMESTAMP NOT NULL,
  valid_to         TIMESTAMP,
  is_current       BOOL    NOT NULL,
  record_hash      STRING  NOT NULL,
  etl_loaded_at    TIMESTAMP NOT NULL
)
PARTITION BY DATE(valid_from)
CLUSTER BY customer_key, account_id
OPTIONS (description = 'Conformed account dimension - SCD Type 2.',
         labels = [("layer", "core")]);

-- ----------------------------------------------------------------------------
-- dim_product - SCD Type 2
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `zumiq-prod.core_layer.dim_product`
(
  product_key        INT64   NOT NULL,
  product_id         STRING  NOT NULL,    -- SKU / product code
  product_name       STRING  NOT NULL,
  product_category   STRING  NOT NULL,    -- e.g. 'Consumer Electronics'
  product_subcategory STRING NOT NULL,
  brand              STRING  NOT NULL,
  list_price         NUMERIC(18,2) NOT NULL,
  cost_price         NUMERIC(18,2) NOT NULL,
  margin_pct         NUMERIC(6,4),
  status             STRING  NOT NULL,    -- 'ACTIVE','DISCONTINUED','SEASONAL'
  valid_from         TIMESTAMP NOT NULL,
  valid_to           TIMESTAMP,
  is_current         BOOL    NOT NULL,
  record_hash        STRING  NOT NULL,
  etl_loaded_at      TIMESTAMP NOT NULL
)
PARTITION BY DATE(valid_from)
CLUSTER BY product_category, product_id
OPTIONS (description = 'Conformed product dimension - SCD Type 2.',
         labels = [("layer", "core")]);

-- ============================================================================
-- END 01_dimensions.sql
-- ============================================================================
