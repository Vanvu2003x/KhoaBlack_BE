-- Migration: Add user levels and level-based pricing
-- Run this SQL on your MySQL database

-- Add level to users (1=Basic, 2=Pro, 3=Plus)
ALTER TABLE users ADD COLUMN level INT DEFAULT 1;

-- Add level-based pricing to topup_packages
ALTER TABLE topup_packages ADD COLUMN price_basic INT NULL;
ALTER TABLE topup_packages ADD COLUMN price_pro INT NULL;
ALTER TABLE topup_packages ADD COLUMN price_plus INT NULL;

-- Add level-based pricing to acc (account market)
ALTER TABLE acc ADD COLUMN price_basic INT NULL;
ALTER TABLE acc ADD COLUMN price_pro INT NULL;
ALTER TABLE acc ADD COLUMN price_plus INT NULL;
