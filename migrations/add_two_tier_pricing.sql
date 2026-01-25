-- Add origin_markup_percent to games table
ALTER TABLE games ADD COLUMN origin_markup_percent INT DEFAULT 0 COMMENT '% markup from API price to origin price';

-- Add api_price to topup_packages table
ALTER TABLE topup_packages ADD COLUMN api_price INT COMMENT 'Price from supplier API (harga)';

-- Update existing packages to copy origin_price to api_price
UPDATE topup_packages SET api_price = origin_price WHERE api_price IS NULL;
