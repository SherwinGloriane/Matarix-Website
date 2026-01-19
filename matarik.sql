-- phpMyAdmin SQL Dump
-- version 5.2.0
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Dec 03, 2025 at 12:42 AM
-- Server version: 10.4.24-MariaDB
-- PHP Version: 8.1.6

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `matarik`
--

-- --------------------------------------------------------

--
-- Table structure for table `customer_feedback`
--

CREATE TABLE `customer_feedback` (
  `Feedback_ID` int(11) NOT NULL,
  `Rating` tinyint(4) DEFAULT NULL CHECK (`Rating` between 1 and 5),
  `Message` text DEFAULT NULL,
  `Created_At` timestamp NOT NULL DEFAULT current_timestamp(),
  `Delivery_ID` int(11) NOT NULL,
  `is_Anonymous` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `customer_feedback`
--

INSERT INTO `customer_feedback` (`Feedback_ID`, `Rating`, `Message`, `Created_At`, `Delivery_ID`, `is_Anonymous`) VALUES
(1, 5, 'Very great', '2025-11-30 10:45:40', 12, 0),
(2, 5, 'WOWERS', '2025-11-30 10:52:01', 13, 0),
(3, 5, 'Shuta ka dildo na receive ko', '2025-11-30 11:20:05', 14, 0);

-- --------------------------------------------------------

--
-- Table structure for table `deliveries`
--

CREATE TABLE `deliveries` (
  `Delivery_ID` int(11) NOT NULL,
  `Order_ID` int(11) DEFAULT NULL,
  `delivery_details` text DEFAULT NULL,
  `Delivery_Status` enum('Pending','Preparing','Out for Delivery','Delivered','Cancelled') DEFAULT 'Pending',
  `Created_At` timestamp NOT NULL DEFAULT current_timestamp(),
  `Updated_At` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `Vehicle_ID` int(11) DEFAULT NULL,
  `Driver_ID` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `deliveries`
--

INSERT INTO `deliveries` (`Delivery_ID`, `Order_ID`, `delivery_details`, `Delivery_Status`, `Created_At`, `Updated_At`, `Vehicle_ID`, `Driver_ID`) VALUES
(9, 20, NULL, 'Delivered', '2025-11-30 09:53:10', '2025-11-30 10:48:04', NULL, 1),
(10, 21, NULL, 'Delivered', '2025-11-30 10:16:57', '2025-11-30 10:44:27', NULL, 1),
(11, 22, NULL, 'Delivered', '2025-11-30 10:17:29', '2025-11-30 10:44:24', NULL, 1),
(12, 23, NULL, 'Delivered', '2025-11-30 10:36:38', '2025-11-30 10:44:19', NULL, 1),
(13, 24, NULL, 'Delivered', '2025-11-30 10:49:54', '2025-11-30 10:50:52', NULL, 1),
(14, 25, NULL, 'Delivered', '2025-11-30 11:14:58', '2025-11-30 11:16:25', NULL, 1),
(15, 26, NULL, 'Pending', '2025-12-02 01:59:46', '2025-12-02 01:59:46', NULL, NULL),
(16, 27, NULL, 'Pending', '2025-12-02 02:35:00', '2025-12-02 02:35:00', NULL, NULL),
(17, 28, NULL, 'Pending', '2025-12-02 02:45:36', '2025-12-02 02:45:36', NULL, NULL),
(18, 29, NULL, 'Pending', '2025-12-02 05:46:16', '2025-12-02 05:46:16', NULL, NULL),
(19, 30, NULL, 'Pending', '2025-12-02 05:47:21', '2025-12-02 05:47:21', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `fleet`
--

CREATE TABLE `fleet` (
  `Vehicle_ID` int(20) NOT NULL,
  `vehicle_model` varchar(50) NOT NULL,
  `status` enum('In Use','Available') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `fleet`
--

INSERT INTO `fleet` (`Vehicle_ID`, `vehicle_model`, `status`) VALUES
(8, 'Spacship', 'In Use'),
(9, 'Ferrarirocher', 'In Use'),
(10, 'noah\'s arc', 'In Use');

-- --------------------------------------------------------

--
-- Table structure for table `orders`
--

CREATE TABLE `orders` (
  `Order_ID` int(11) NOT NULL,
  `User_ID` int(11) DEFAULT NULL,
  `order_date` datetime DEFAULT current_timestamp(),
  `status` enum('Pending Approval','Waiting Payment','Processing','Ready','Rejected') NOT NULL DEFAULT 'Pending Approval',
  `payment` enum('Paid','To Pay') NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `availability_date` date DEFAULT NULL,
  `availability_time` time DEFAULT NULL,
  `last_updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `rejection_reason` text DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `rejected_at` datetime DEFAULT NULL,
  `approved_by` int(11) DEFAULT NULL,
  `Employee_ID` int(11) DEFAULT NULL,
  `payment_method` enum('GCash','On-Site') DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `orders`
--

INSERT INTO `orders` (`Order_ID`, `User_ID`, `order_date`, `status`, `payment`, `amount`, `availability_date`, `availability_time`, `last_updated`, `rejection_reason`, `approved_at`, `rejected_at`, `approved_by`, `Employee_ID`, `payment_method`) VALUES
(20, 1, '2025-11-30 17:53:10', '', 'Paid', '753.75', '2025-11-30', '23:52:00', '2025-11-30 10:48:04', NULL, NULL, NULL, NULL, NULL, 'GCash'),
(21, 1, '2025-11-30 18:16:57', 'Ready', 'Paid', '250.50', '2025-11-28', '18:22:00', '2025-11-30 10:47:45', NULL, NULL, NULL, NULL, NULL, 'GCash'),
(22, 2, '2025-11-30 18:17:29', 'Ready', 'Paid', '250.50', '2025-11-30', '18:23:00', '2025-11-30 10:47:02', NULL, NULL, NULL, NULL, NULL, 'GCash'),
(23, 2, '2025-11-30 18:36:38', 'Ready', 'Paid', '250.50', '2025-11-30', '18:42:00', '2025-11-30 10:46:58', NULL, NULL, NULL, NULL, NULL, 'GCash'),
(24, 2, '2025-11-30 18:49:54', '', 'Paid', '900.00', '2025-11-30', '18:55:00', '2025-11-30 10:50:52', NULL, NULL, NULL, NULL, NULL, 'GCash'),
(25, 2, '2025-11-30 19:14:58', '', 'Paid', '753.75', '2025-11-30', '19:20:00', '2025-11-30 11:16:25', NULL, NULL, NULL, NULL, NULL, 'GCash'),
(26, 2, '2025-12-02 09:59:46', '', 'To Pay', '250.50', '2025-12-04', '09:59:00', '2025-12-02 01:59:46', NULL, NULL, NULL, NULL, NULL, NULL),
(27, 2, '2025-12-02 10:35:00', 'Waiting Payment', 'To Pay', '250.50', '2025-12-03', '10:34:00', '2025-12-02 05:21:47', NULL, '2025-12-02 13:20:22', NULL, 1, NULL, 'On-Site'),
(28, 2, '2025-12-02 10:45:36', 'Waiting Payment', 'To Pay', '250.50', '2025-12-02', '10:45:00', '2025-12-02 05:19:51', NULL, '2025-12-02 12:42:14', NULL, 1, NULL, 'On-Site'),
(29, 2, '2025-12-02 13:46:16', 'Waiting Payment', 'To Pay', '250.50', '2025-12-06', '13:46:00', '2025-12-02 05:46:34', NULL, '2025-12-02 13:46:34', NULL, 1, NULL, NULL),
(30, 2, '2025-12-02 13:47:21', 'Rejected', 'To Pay', '250.50', '2025-12-04', '13:47:00', '2025-12-02 05:47:47', 'ayaw ko nyan', NULL, '2025-12-02 13:47:47', NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `Product_ID` int(11) NOT NULL,
  `Product_Name` varchar(100) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `image_path` varchar(255) DEFAULT NULL,
  `category` enum('Cement & Concrete Products','Masonry','Sand & Gravel','Lumber & Wood','Steel & Metal','Roofing & Insulation','Pipes & Plumbing','Paints & Finishes','Tools & Hardware','Electrical') NOT NULL,
  `stock_level` int(11) NOT NULL,
  `Minimum_Stock` int(11) DEFAULT 0,
  `stock_status` enum('In Stock','Low Stock','Out of Stock') NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `length` varchar(50) DEFAULT NULL,
  `last_restock` date DEFAULT NULL,
  `Width` decimal(10,2) DEFAULT NULL,
  `Unit` enum('mm','cm','m','inch','ft') DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `products`
--

INSERT INTO `products` (`Product_ID`, `Product_Name`, `description`, `image_path`, `category`, `stock_level`, `Minimum_Stock`, `stock_status`, `price`, `length`, `last_restock`, `Width`, `Unit`) VALUES
(1, 'Concrete Mix', 'Concrete Mix is a pre-blended mixture of cement, sand, and aggregates designed for ready-to-use concrete applications. Perfect for small to medium construction projects, this high-quality mix ensures consistent strength and durability. Ideal for foundations, slabs, driveways, and general concrete work.', NULL, 'Cement & Concrete Products', 114, 20, 'In Stock', '250.50', '50.00', NULL, '30.00', 'cm'),
(2, 'Lumber Plank', 'Lumber Plank is premium quality wood lumber suitable for various construction and carpentry applications. Made from high-grade timber, these planks are properly seasoned and treated for enhanced durability. Perfect for framing, decking, furniture making, and general construction projects.', NULL, 'Lumber & Wood', 32, 10, 'In Stock', '150.75', '200.00', NULL, '25.00', 'cm'),
(3, 'Sample', 'Sample Product', 'uploads/products/692843bf3f8b2_1764246463.jpg', 'Steel & Metal', 76, 50, 'In Stock', '90.00', NULL, '2025-11-27', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `product_reviews`
--

CREATE TABLE `product_reviews` (
  `Review_ID` int(11) NOT NULL,
  `Order_ID` int(11) NOT NULL,
  `Product_ID` int(11) NOT NULL,
  `User_ID` int(11) NOT NULL,
  `Rating` tinyint(4) NOT NULL CHECK (`Rating` between 1 and 5),
  `Review_Text` text DEFAULT NULL,
  `Created_At` timestamp NOT NULL DEFAULT current_timestamp(),
  `Updated_At` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `product_reviews`
--

INSERT INTO `product_reviews` (`Review_ID`, `Order_ID`, `Product_ID`, `User_ID`, `Rating`, `Review_Text`, `Created_At`, `Updated_At`) VALUES
(1, 23, 1, 2, 5, 'Wonderful!', '2025-11-30 10:45:40', '2025-11-30 10:48:40'),
(2, 24, 3, 2, 5, 'HHHHHHHHHAHUH', '2025-11-30 10:53:19', '2025-11-30 10:53:19'),
(3, 25, 2, 2, 5, 'Okay nman cya', '2025-11-30 11:20:05', '2025-11-30 11:20:05');

-- --------------------------------------------------------

--
-- Table structure for table `product_variations`
--

CREATE TABLE `product_variations` (
  `Variation_ID` int(11) NOT NULL,
  `Product_ID` int(11) NOT NULL,
  `variation_name` varchar(100) NOT NULL,
  `variation_value` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `product_variations`
--

INSERT INTO `product_variations` (`Variation_ID`, `Product_ID`, `variation_name`, `variation_value`) VALUES
(1, 3, 'Color', 'Red'),
(2, 3, 'Material', 'Sample');

-- --------------------------------------------------------

--
-- Table structure for table `transactions`
--

CREATE TABLE `transactions` (
  `Transaction_ID` int(11) NOT NULL,
  `Order_ID` int(11) DEFAULT NULL,
  `Base_Fee` decimal(10,2) DEFAULT 0.00,
  `Distance_Fee` decimal(10,2) DEFAULT 0.00,
  `Subtotal` decimal(10,2) NOT NULL,
  `Delivery_Fee` decimal(10,2) GENERATED ALWAYS AS (`Base_Fee` + `Distance_Fee`) STORED,
  `Total` decimal(10,2) NOT NULL,
  `Payment_Method` enum('GCash','Cash on Delivery') DEFAULT 'GCash',
  `Payment_Status` enum('Pending','Paid','Failed') DEFAULT 'Pending',
  `Created_At` timestamp NOT NULL DEFAULT current_timestamp(),
  `Updated_At` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `proof_of_payment` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `transactions`
--

INSERT INTO `transactions` (`Transaction_ID`, `Order_ID`, `Base_Fee`, `Distance_Fee`, `Subtotal`, `Total`, `Payment_Method`, `Payment_Status`, `Created_At`, `Updated_At`, `proof_of_payment`) VALUES
(9, 20, '0.00', '0.00', '753.75', '753.75', 'GCash', 'Paid', '2025-11-30 09:53:10', '2025-11-30 09:53:10', 'uploads/proof_of_payment/692c14065d7ad_1764496390.png'),
(10, 21, '0.00', '0.00', '250.50', '250.50', 'GCash', 'Paid', '2025-11-30 10:16:57', '2025-11-30 10:16:57', 'uploads/proof_of_payment/692c1999c93e7_1764497817.png'),
(11, 22, '0.00', '0.00', '250.50', '250.50', 'GCash', 'Paid', '2025-11-30 10:17:29', '2025-11-30 10:17:29', 'uploads/proof_of_payment/692c19b95558e_1764497849.png'),
(12, 23, '0.00', '0.00', '250.50', '250.50', 'GCash', 'Paid', '2025-11-30 10:36:38', '2025-11-30 10:36:38', 'uploads/proof_of_payment/692c1e36e16b6_1764498998.png'),
(13, 24, '0.00', '0.00', '900.00', '900.00', 'GCash', 'Paid', '2025-11-30 10:49:54', '2025-11-30 10:49:54', 'uploads/proof_of_payment/692c2151f2ef9_1764499793.png'),
(14, 25, '0.00', '0.00', '753.75', '753.75', 'GCash', 'Paid', '2025-11-30 11:14:58', '2025-11-30 11:14:58', 'uploads/proof_of_payment/692c2732ccfad_1764501298.png'),
(15, 26, '0.00', '0.00', '250.50', '250.50', NULL, 'Pending', '2025-12-02 01:59:46', '2025-12-02 01:59:46', NULL),
(16, 27, '0.00', '0.00', '250.50', '250.50', 'Cash on Delivery', 'Pending', '2025-12-02 02:35:00', '2025-12-02 05:21:47', NULL),
(17, 28, '0.00', '0.00', '250.50', '250.50', 'Cash on Delivery', 'Pending', '2025-12-02 02:45:36', '2025-12-02 05:19:51', NULL),
(18, 29, '0.00', '0.00', '250.50', '250.50', 'GCash', 'Pending', '2025-12-02 05:46:16', '2025-12-02 05:46:16', NULL),
(19, 30, '0.00', '0.00', '250.50', '250.50', 'GCash', 'Pending', '2025-12-02 05:47:21', '2025-12-02 05:47:21', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `transaction_items`
--

CREATE TABLE `transaction_items` (
  `Item_ID` int(11) NOT NULL,
  `Product_ID` int(11) NOT NULL,
  `Quantity` int(11) NOT NULL,
  `Price` decimal(10,2) NOT NULL,
  `Order_ID` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `transaction_items`
--

INSERT INTO `transaction_items` (`Item_ID`, `Product_ID`, `Quantity`, `Price`, `Order_ID`) VALUES
(12, 2, 5, '150.75', 20),
(13, 1, 1, '250.50', 21),
(14, 1, 1, '250.50', 22),
(15, 1, 1, '250.50', 23),
(16, 3, 10, '90.00', 24),
(17, 2, 5, '150.75', 25),
(18, 1, 1, '250.50', 26),
(19, 1, 1, '250.50', 27),
(20, 1, 1, '250.50', 28),
(21, 1, 1, '250.50', 29),
(22, 1, 1, '250.50', 30);

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `User_ID` int(11) NOT NULL,
  `First_Name` varchar(25) DEFAULT NULL,
  `Middle_Name` varchar(25) DEFAULT NULL,
  `Last_Name` varchar(25) DEFAULT NULL,
  `Phone_Number` int(11) DEFAULT NULL,
  `email` varchar(100) NOT NULL,
  `address` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('Customer','Store Employee','Delivery Driver','Admin') NOT NULL DEFAULT 'Customer',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `profile_picture` varchar(255) DEFAULT NULL,
  `status` enum('active','inactive','pending','archived') DEFAULT 'active',
  `last_login` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`User_ID`, `First_Name`, `Middle_Name`, `Last_Name`, `Phone_Number`, `email`, `address`, `password`, `role`, `created_at`, `profile_picture`, `status`, `last_login`) VALUES
(1, 'Admin', NULL, 'User', NULL, 'admin@matarik.com', '123 Admin Street', '$2y$10$lEqpsi2kGSD7GL3SzwNb0.N3W264IDK3YcgK2Ii7AC5qFv/Gp7YZK', 'Admin', '2025-11-12 16:46:33', NULL, 'active', '2025-12-02 04:42:09'),
(2, 'Customer', NULL, 'User', NULL, 'customer@matarik.com', '456 Customer Avenue', '$2y$10$4U.hWW3qUxaVcGl75Zs7i.HKZnmeXBQTCZ/X3SzKxrjNN6//V8VRi', 'Customer', '2025-11-12 16:46:33', NULL, 'active', '2025-12-02 02:34:39'),
(3, 'he', NULL, 'he', 2147483647, 'he@he.com', 'hehehehehehehe', '$2y$10$9TeJVp/pFJ5t1RXBZ7fakOldeIpebD58waaN35AJQqmu/k82NcQQS', 'Customer', '2025-11-12 17:01:46', NULL, 'active', NULL),
(4, 'Marie Chelsea', NULL, 'y mercado bautista', NULL, 'henzomariecar@matarik.com', 'bagong silang', '$2y$10$0g52qpaMxdKqfDRx9jNN3eMSt2m8bmTG6TWqK2OHlpKkqF4C/poFO', 'Delivery Driver', '2025-11-27 15:24:06', NULL, 'active', NULL),
(5, 'katnissSSSS', 'optional', 'evergreen', 2147483647, 'katdriver@matarik.com', 'taga jan lang', '$2y$10$/CSUIIzpCjvOym9V6W0F3eW9Wk.TNk1o5HA8Hpo0UvtFv67IS.PA2', 'Delivery Driver', '2025-11-27 15:52:23', NULL, 'active', NULL),
(7, 'allyssa', NULL, 'quito', 2147483647, 'davidmariakhellyc@gmail.com', 'Trees residences', '$2y$10$bNq4lIjEbnJqFNcY0OaOsec5OU9.rtGKwxeC.y/fkge5JfKasV22S', 'Admin', '2025-11-30 06:54:55', NULL, 'active', NULL),
(8, 'lala', 'shishi', 'lolo', 2147483647, 'lalallalalala@gmail.com', 'Trees residences', '$2y$10$Q2eyiBv9qY9MF7W7nnyKvOL3LvIRvuh6mnhfKD7xfWnZycsgKq4OC', 'Customer', '2025-11-30 07:05:36', NULL, 'active', NULL);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `customer_feedback`
--
ALTER TABLE `customer_feedback`
  ADD PRIMARY KEY (`Feedback_ID`),
  ADD KEY `fk_feedback_delivery` (`Delivery_ID`);

--
-- Indexes for table `deliveries`
--
ALTER TABLE `deliveries`
  ADD PRIMARY KEY (`Delivery_ID`) USING BTREE,
  ADD KEY `fk_deliveries_vehicle` (`Vehicle_ID`),
  ADD KEY `fk_deliveries_driver` (`Driver_ID`),
  ADD KEY `fk_deliveries_order` (`Order_ID`);

--
-- Indexes for table `fleet`
--
ALTER TABLE `fleet`
  ADD PRIMARY KEY (`Vehicle_ID`) USING BTREE;

--
-- Indexes for table `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`Order_ID`) USING BTREE,
  ADD KEY `User_ID` (`User_ID`) USING BTREE,
  ADD KEY `fk_orders_employee` (`Employee_ID`),
  ADD KEY `fk_orders_approved_by` (`approved_by`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`Product_ID`);

--
-- Indexes for table `product_reviews`
--
ALTER TABLE `product_reviews`
  ADD PRIMARY KEY (`Review_ID`),
  ADD UNIQUE KEY `unique_order_product_user` (`Order_ID`,`Product_ID`,`User_ID`),
  ADD KEY `fk_product_reviews_order` (`Order_ID`),
  ADD KEY `fk_product_reviews_product` (`Product_ID`),
  ADD KEY `fk_product_reviews_user` (`User_ID`);

--
-- Indexes for table `product_variations`
--
ALTER TABLE `product_variations`
  ADD PRIMARY KEY (`Variation_ID`),
  ADD KEY `Product_ID` (`Product_ID`);

--
-- Indexes for table `transactions`
--
ALTER TABLE `transactions`
  ADD PRIMARY KEY (`Transaction_ID`),
  ADD KEY `fk_transactions_order` (`Order_ID`);

--
-- Indexes for table `transaction_items`
--
ALTER TABLE `transaction_items`
  ADD PRIMARY KEY (`Item_ID`),
  ADD KEY `Product_ID` (`Product_ID`),
  ADD KEY `fk_transaction_items_order` (`Order_ID`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`User_ID`) USING BTREE,
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `customer_feedback`
--
ALTER TABLE `customer_feedback`
  MODIFY `Feedback_ID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `deliveries`
--
ALTER TABLE `deliveries`
  MODIFY `Delivery_ID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT for table `fleet`
--
ALTER TABLE `fleet`
  MODIFY `Vehicle_ID` int(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `orders`
--
ALTER TABLE `orders`
  MODIFY `Order_ID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=31;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `Product_ID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `product_reviews`
--
ALTER TABLE `product_reviews`
  MODIFY `Review_ID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `product_variations`
--
ALTER TABLE `product_variations`
  MODIFY `Variation_ID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `transactions`
--
ALTER TABLE `transactions`
  MODIFY `Transaction_ID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT for table `transaction_items`
--
ALTER TABLE `transaction_items`
  MODIFY `Item_ID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=23;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `User_ID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `customer_feedback`
--
ALTER TABLE `customer_feedback`
  ADD CONSTRAINT `fk_feedback_delivery` FOREIGN KEY (`Delivery_ID`) REFERENCES `deliveries` (`Delivery_ID`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `deliveries`
--
ALTER TABLE `deliveries`
  ADD CONSTRAINT `fk_deliveries_driver` FOREIGN KEY (`Driver_ID`) REFERENCES `users` (`User_ID`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_deliveries_order` FOREIGN KEY (`Order_ID`) REFERENCES `orders` (`Order_ID`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_deliveries_vehicle` FOREIGN KEY (`Vehicle_ID`) REFERENCES `fleet` (`Vehicle_ID`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `orders`
--
ALTER TABLE `orders`
  ADD CONSTRAINT `fk_orders_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users` (`User_ID`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_orders_employee` FOREIGN KEY (`Employee_ID`) REFERENCES `users` (`User_ID`),
  ADD CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`User_ID`) REFERENCES `users` (`User_ID`),
  ADD CONSTRAINT `orders_ibfk_2` FOREIGN KEY (`User_ID`) REFERENCES `users` (`User_ID`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `product_reviews`
--
ALTER TABLE `product_reviews`
  ADD CONSTRAINT `fk_product_reviews_order` FOREIGN KEY (`Order_ID`) REFERENCES `orders` (`Order_ID`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_product_reviews_product` FOREIGN KEY (`Product_ID`) REFERENCES `products` (`Product_ID`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_product_reviews_user` FOREIGN KEY (`User_ID`) REFERENCES `users` (`User_ID`) ON DELETE CASCADE;

--
-- Constraints for table `product_variations`
--
ALTER TABLE `product_variations`
  ADD CONSTRAINT `product_variations_ibfk_1` FOREIGN KEY (`Product_ID`) REFERENCES `products` (`Product_ID`),
  ADD CONSTRAINT `product_variations_ibfk_2` FOREIGN KEY (`Product_ID`) REFERENCES `products` (`Product_ID`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `transactions`
--
ALTER TABLE `transactions`
  ADD CONSTRAINT `fk_transactions_order` FOREIGN KEY (`Order_ID`) REFERENCES `orders` (`Order_ID`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `transaction_items`
--
ALTER TABLE `transaction_items`
  ADD CONSTRAINT `fk_transaction_items_order` FOREIGN KEY (`Order_ID`) REFERENCES `orders` (`Order_ID`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `transaction_items_ibfk_2` FOREIGN KEY (`Product_ID`) REFERENCES `products` (`Product_ID`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
