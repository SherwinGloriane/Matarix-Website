-- phpMyAdmin SQL Dump
-- version 5.2.0
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Nov 11, 2025 at 03:40 PM
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
  `Delivery_ID` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `deliveries`
--

CREATE TABLE `deliveries` (
  `Delivery_ID` int(11) NOT NULL,
  `Order_ID` int(11) DEFAULT NULL,
  `delivery_details` text DEFAULT NULL,
  `Delivery_Status` enum('Pending','On the Way','Delivered','Cancelled') DEFAULT 'Pending',
  `Created_At` timestamp NOT NULL DEFAULT current_timestamp(),
  `Updated_At` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `delivery_distance` decimal(10,2) DEFAULT NULL,
  `Vehicle_ID` int(11) DEFAULT NULL,
  `Driver_ID` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `fleet`
--

CREATE TABLE `fleet` (
  `Vehicle_ID` int(20) NOT NULL,
  `vehicle_name` varchar(50) NOT NULL,
  `status` enum('In Use','Available') NOT NULL,
  `capacity` varchar(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `orders`
--

CREATE TABLE `orders` (
  `Order_ID` int(11) NOT NULL,
  `User_ID` int(11) DEFAULT NULL,
  `order_date` datetime DEFAULT current_timestamp(),
  `status` enum('Order Confirmed','Being Processed','On the Way','Completed') NOT NULL,
  `payment` enum('Paid','To Pay') NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `availability_date` date DEFAULT NULL,
  `availability_time` time DEFAULT NULL,
  `last_updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `Product_ID` int(11) NOT NULL,
  `Product_Name` varchar(100) DEFAULT NULL,
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

INSERT INTO `products` (`Product_ID`, `Product_Name`, `category`, `stock_level`, `Minimum_Stock`, `stock_status`, `price`, `length`, `last_restock`, `Width`, `Unit`) VALUES
(1, 'Concrete Mix', 'Cement & Concrete Products', 120, 20, 'In Stock', '250.50', '50.00', NULL, '30.00', 'cm'),
(2, 'Lumber Plank', 'Lumber & Wood', 40, 10, 'Low Stock', '150.75', '200.00', NULL, '25.00', 'cm');

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
  `Updated_At` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `transaction_items`
--

CREATE TABLE `transaction_items` (
  `Item_ID` int(11) NOT NULL,
  `Transaction_ID` int(11) NOT NULL,
  `Product_ID` int(11) NOT NULL,
  `Quantity` int(11) NOT NULL,
  `Price` decimal(10,2) NOT NULL,
  `Total` decimal(10,2) GENERATED ALWAYS AS (`Quantity` * `Price`) STORED,
  `Order_ID` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `User_ID` int(11) NOT NULL,
  `First_Name` varchar(50) DEFAULT NULL,
  `Last_Name` varchar(50) DEFAULT NULL,
  `Phone_Number` varchar(20) DEFAULT NULL,
  `email` varchar(100) NOT NULL,
  `address` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('Customer','Store Employee','Delivery Driver','Admin') NOT NULL DEFAULT 'Customer',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
  ADD KEY `User_ID` (`User_ID`) USING BTREE;

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`Product_ID`);

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
  ADD KEY `Transaction_ID` (`Transaction_ID`),
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
  MODIFY `Feedback_ID` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `orders`
--
ALTER TABLE `orders`
  MODIFY `Order_ID` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `Product_ID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `product_variations`
--
ALTER TABLE `product_variations`
  MODIFY `Variation_ID` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `transactions`
--
ALTER TABLE `transactions`
  MODIFY `Transaction_ID` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `transaction_items`
--
ALTER TABLE `transaction_items`
  MODIFY `Item_ID` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `User_ID` int(11) NOT NULL AUTO_INCREMENT;

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
  ADD CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `orders_ibfk_2` FOREIGN KEY (`User_ID`) REFERENCES `users` (`User_ID`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `product_variations`
--
ALTER TABLE `product_variations`
  ADD CONSTRAINT `product_variations_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`),
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
  ADD CONSTRAINT `transaction_items_ibfk_1` FOREIGN KEY (`Transaction_ID`) REFERENCES `transactions` (`Transaction_ID`),
  ADD CONSTRAINT `transaction_items_ibfk_2` FOREIGN KEY (`Product_ID`) REFERENCES `products` (`product_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
