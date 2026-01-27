-- Change api_id in orders table from INT to VARCHAR(50) to support alphanumeric Order IDs (e.g. Morishop)
ALTER TABLE orders MODIFY COLUMN api_id VARCHAR(50);
