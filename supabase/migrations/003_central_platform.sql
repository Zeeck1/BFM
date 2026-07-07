-- ============================================================
-- BFM – Step 1: Add 'central' to platform_type enum
-- Run this FIRST, then run 004_migrate_shopee_to_central.sql
--
-- PostgreSQL requires the new enum value to be committed before
-- it can be used in UPDATE statements (error 55P04).
-- ============================================================

alter type platform_type add value if not exists 'central';
