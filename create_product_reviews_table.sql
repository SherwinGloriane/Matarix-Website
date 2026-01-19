-- =====================================================
-- Create product_reviews Table
-- =====================================================
-- This table stores individual product ratings and reviews
-- Customers can rate and review each product they purchased
-- =====================================================

-- Drop table if exists (use with caution - this will delete all existing reviews)
-- DROP TABLE IF EXISTS `product_reviews`;

-- Create the product_reviews table
CREATE TABLE IF NOT EXISTS `product_reviews` (
  `Review_ID` int(11) NOT NULL AUTO_INCREMENT,
  `Order_ID` int(11) NOT NULL COMMENT 'The order this review belongs to',
  `Product_ID` int(11) NOT NULL COMMENT 'The product being reviewed',
  `User_ID` int(11) NOT NULL COMMENT 'The user who wrote the review',
  `Rating` tinyint(4) NOT NULL CHECK (`Rating` BETWEEN 1 AND 5) COMMENT 'Rating from 1 to 5 stars',
  `Review_Text` text DEFAULT NULL COMMENT 'Optional review text/comment',
  `Created_At` timestamp NOT NULL DEFAULT current_timestamp() COMMENT 'When the review was created',
  `Updated_At` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'When the review was last updated',
  PRIMARY KEY (`Review_ID`),
  KEY `fk_product_reviews_order` (`Order_ID`),
  KEY `fk_product_reviews_product` (`Product_ID`),
  KEY `fk_product_reviews_user` (`User_ID`),
  UNIQUE KEY `unique_order_product_user` (`Order_ID`, `Product_ID`, `User_ID`) COMMENT 'Prevents duplicate reviews for same product in same order by same user'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Stores product reviews and ratings from customers';

-- Add foreign key constraints
-- Note: These will only be added if the referenced tables exist
-- If you get errors, make sure your orders, products, and users tables exist first

ALTER TABLE `product_reviews`
  ADD CONSTRAINT `fk_product_reviews_order` 
    FOREIGN KEY (`Order_ID`) 
    REFERENCES `orders` (`Order_ID`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_product_reviews_product` 
    FOREIGN KEY (`Product_ID`) 
    REFERENCES `products` (`Product_ID`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_product_reviews_user` 
    FOREIGN KEY (`User_ID`) 
    REFERENCES `users` (`User_ID`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE;

-- =====================================================
-- Table Structure Summary:
-- =====================================================
-- Review_ID: Auto-increment primary key
-- Order_ID: Links to orders table
-- Product_ID: Links to products table  
-- User_ID: Links to users table
-- Rating: 1-5 star rating (required)
-- Review_Text: Optional text review/comment
-- Created_At: Timestamp when review was created
-- Updated_At: Timestamp when review was last updated
-- 
-- Unique Constraint: Prevents same user from reviewing 
--   same product multiple times in the same order
-- =====================================================

