-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Dec 08, 2025 at 04:41 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

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
-- Table structure for table `categories`
--

CREATE TABLE `categories` (
  `Category_ID` int(11) NOT NULL,
  `category_name` varchar(100) NOT NULL,
  `category_description` text DEFAULT NULL,
  `category_icon` varchar(50) DEFAULT 'fas fa-box',
  `display_order` int(11) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `categories`
--

INSERT INTO `categories` (`Category_ID`, `category_name`, `category_description`, `category_icon`, `display_order`, `is_active`, `created_at`, `updated_at`) VALUES
(4, 'Wood & Steel', '', 'fas fa-tree', 4, 1, '2025-12-04 04:08:18', '2025-12-08 15:17:13'),
(5, 'Construction & Building Materials', '', 'fas fa-industry', 5, 1, '2025-12-04 04:08:18', '2025-12-08 13:10:30'),
(8, 'Paints & Finishes', NULL, 'fas fa-paint-brush', 8, 1, '2025-12-04 04:08:18', '2025-12-04 04:08:18'),
(9, 'Tools & Hardware', NULL, 'fas fa-tools', 9, 1, '2025-12-04 04:08:18', '2025-12-04 04:08:18'),
(10, 'Electrical', '', 'fas fa-bolt', 9, 1, '2025-12-04 04:08:18', '2025-12-08 14:19:47');

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `delivery_drivers`
--

CREATE TABLE `delivery_drivers` (
  `id` int(11) NOT NULL,
  `Delivery_ID` int(11) NOT NULL,
  `Driver_ID` int(11) NOT NULL,
  `Assigned_At` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `delivery_vehicles`
--

CREATE TABLE `delivery_vehicles` (
  `id` int(11) NOT NULL,
  `Delivery_ID` int(11) NOT NULL,
  `Vehicle_ID` int(11) NOT NULL,
  `Assigned_At` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `fleet`
--

CREATE TABLE `fleet` (
  `Vehicle_ID` int(20) NOT NULL,
  `vehicle_model` varchar(50) NOT NULL,
  `status` enum('In Use','Available','Unavailable') NOT NULL,
  `capacity` decimal(10,2) DEFAULT NULL,
  `capacity_unit` enum('kg','g','lb','oz','ton') DEFAULT 'kg'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `fleet`
--

INSERT INTO `fleet` (`Vehicle_ID`, `vehicle_model`, `status`, `capacity`, `capacity_unit`) VALUES
(11, 'Truck#1', 'Available', 1700.00, 'kg'),
(12, 'Truck#2', 'Available', 1800.00, 'kg');

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `order_availability_slots`
--

CREATE TABLE `order_availability_slots` (
  `slot_id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `slot_number` int(11) NOT NULL,
  `availability_date` date NOT NULL,
  `availability_time` time NOT NULL,
  `is_preferred` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `order_settings`
--

CREATE TABLE `order_settings` (
  `setting_key` varchar(50) NOT NULL,
  `setting_value` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `order_settings`
--

INSERT INTO `order_settings` (`setting_key`, `setting_value`, `description`, `updated_at`) VALUES
('allow_below_minimum_with_fee', '0', 'Allow orders below minimum with premium delivery fee (1 = yes, 0 = no).', '2025-12-04 21:32:52'),
('allow_heavy_single_items', '1', 'Allow single items that exceed minimum weight (1 = yes, 0 = no).', '2025-12-04 21:32:52'),
('auto_calculate_from_fleet', '1', 'Auto-calculate minimum from smallest vehicle capacity (1 = yes, 0 = use fixed value).', '2025-12-04 21:32:52'),
('max_advance_notice_days', '30', 'Maximum number of days in advance customers can select delivery date', '2025-12-04 21:32:52'),
('min_advance_notice_days', '3', 'Minimum number of days in advance customers must select delivery date (e.g., 3 = cannot select today, tomorrow, or day after tomorrow)', '2025-12-04 21:32:52'),
('min_order_value', '2000', 'Minimum order value in pesos. Set to 0 to disable. Can be combined with weight minimum (OR condition).', '2025-12-04 21:32:52'),
('min_order_weight_kg', '50', 'Minimum order weight in kilograms. Orders below this weight will be rejected.', '2025-12-04 21:32:52'),
('min_order_weight_percentage', '25', 'Percentage of smallest vehicle capacity to use as minimum (if auto-calculated).', '2025-12-04 21:32:52'),
('premium_delivery_fee', '500', 'Premium delivery fee in pesos for orders below minimum weight.', '2025-12-04 21:32:52');

-- --------------------------------------------------------

--
-- Table structure for table `password_reset_tokens`
--

CREATE TABLE `password_reset_tokens` (
  `id` int(11) NOT NULL,
  `email` varchar(100) NOT NULL,
  `token` varchar(255) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `password_reset_tokens`
--

INSERT INTO `password_reset_tokens` (`id`, `email`, `token`, `expires_at`, `used`, `created_at`) VALUES
(1, 'glorianelectanasherwin@gmail.com', 'f36925880cbe19cdc444f417570a75a3f252ae2bbac8b96a220bf252767b7a32', '2025-12-07 02:27:02', 1, '2025-12-06 17:27:02'),
(2, 'glorianelectanasherwin@gmail.com', '1b9fbdfb1040dbf46f5c0df066c91319c0fff4b0c74fdb2dc15bfe37022e0b33', '2025-12-07 02:27:35', 1, '2025-12-06 17:27:35'),
(3, 'jessicalectana068@gmail.com', '8f2c1ac7d7f59df68ed155acc083e7be9f74e7bf46eec6cfeac0ec34c8d67348', '2025-12-07 02:27:54', 1, '2025-12-06 17:27:54'),
(4, 'glorianelectanasherwin@gmail.com', '6a69e064f743686a3905bdde27dfbfbe2cd8bd96673905ac3cb743a0bc08f4fb', '2025-12-07 02:28:05', 1, '2025-12-06 17:28:05'),
(5, 'glorianelectanasherwin@gmail.com', '00b981e0902a2dab81ab583eab0a3f8df290e1d76332e645ce1f1e6e4f297c61', '2025-12-07 02:30:53', 1, '2025-12-06 17:30:53'),
(6, 'glorianelectanasherwin@gmail.com', 'ac79e20269299402fdde7bdbfe92427cf44a228a2d2417d6ddb42fa66d26dffc', '2025-12-07 02:30:54', 1, '2025-12-06 17:30:54'),
(7, 'glorianelectanasherwin@gmail.com', 'f96e6d0688ad51755457129ea1ed736cb4d5eb1616c0fc78de01c0a4ae314451', '2025-12-07 02:31:15', 1, '2025-12-06 17:31:15'),
(8, 'jessicalectana068@gmail.com', 'f4ca1307b5c270bfc7f93efd8a2ec2c2bcf49a33386a89ef548b5b0be190bf9c', '2025-12-07 02:31:39', 1, '2025-12-06 17:31:39'),
(9, 'glorianelectanasherwin@gmail.com', '4ad8b5066ab3a41cdefd2316c0cd5b6a663d0a28dc034528db8b5daefcc14654', '2025-12-07 02:33:51', 1, '2025-12-06 17:33:51'),
(10, 'glorianelectanasherwin@gmail.com', 'c163a69a870d7ff98a84fab35aed82fb519e02d344298aa85a2f0194d8504e9e', '2025-12-07 02:34:05', 1, '2025-12-06 17:34:05'),
(11, 'glorianelectanasherwin@gmail.com', '213c8efebdcf6cf95352356a070bf155112da95712e658f3ea081addf6eeabc4', '2025-12-07 02:35:22', 1, '2025-12-06 17:35:22'),
(12, 'glorianelectanasherwin@gmail.com', '8a3708726304a7cedfd40f8edf678797f273cede99083c99ffef952947cfe74c', '2025-12-07 02:35:33', 1, '2025-12-06 17:35:33'),
(13, 'jessicalectana068@gmail.com', '7124b46359418bf0c856790e0f24677bf5c08377e32193cb9c24d25d3c6b67e2', '2025-12-07 02:39:54', 0, '2025-12-06 17:39:54'),
(14, 'glorianelectanasherwin@gmail.com', 'e8320de709fbbb8f8cd9bad4c828acb53f1ca78c43210ffa6b02068bbd2c9354', '2025-12-07 02:40:13', 1, '2025-12-06 17:40:13'),
(15, 'koahla.official@gmail.com', 'a65b0c66568c5096b0b022ee47e95cadc035c657808d5ff3a89c4195a594a3d7', '2025-12-08 14:12:51', 1, '2025-12-08 05:12:51'),
(16, 'koahla.official@gmail.com', 'f4d639373b0f3e23e95c4d261d9a253037d45bb49fc8e64a430581aa0f65d36d', '2025-12-08 14:13:42', 1, '2025-12-08 05:13:42'),
(17, 'koahla.official@gmail.com', '37301346a4443d739ac6fcc13d4467d30d9d06f3af65d09fe46597aba4f9caea', '2025-12-08 14:18:35', 1, '2025-12-08 05:18:35'),
(18, 'koahla.official@gmail.com', '4d779ced5d1501ce7d4d8ab15cdb80e8ca753edf248d2a6c0b569e9dcc76d0c3', '2025-12-08 14:18:46', 0, '2025-12-08 05:18:46'),
(19, 'rojasalan293@gmail.com', '845c54b9aec7e9901d4b08585a5f46ba12d4a91a22124e5852e20c7a12216779', '2025-12-08 15:14:22', 1, '2025-12-08 06:14:22');

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `Product_ID` int(11) NOT NULL,
  `Product_Name` varchar(100) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `image_path` varchar(255) DEFAULT NULL,
  `thumbnails` text DEFAULT NULL,
  `category` varchar(100) NOT NULL DEFAULT 'Uncategorized',
  `category_id` int(11) NOT NULL,
  `stock_level` int(11) NOT NULL,
  `stock_unit` varchar(10) DEFAULT 'PC',
  `Minimum_Stock` int(11) DEFAULT 0,
  `stock_status` enum('In Stock','Low Stock','Out of Stock') NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `length` varchar(50) DEFAULT NULL,
  `last_restock` date DEFAULT NULL,
  `Width` decimal(10,2) DEFAULT NULL,
  `Unit` enum('mm','cm','m','inch','ft') DEFAULT NULL,
  `weight` decimal(10,2) DEFAULT NULL,
  `weight_unit` enum('kg','g','lb','oz','ton') DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `products`
--

INSERT INTO `products` (`Product_ID`, `Product_Name`, `description`, `image_path`, `thumbnails`, `category`, `category_id`, `stock_level`, `stock_unit`, `Minimum_Stock`, `stock_status`, `price`, `length`, `last_restock`, `Width`, `Unit`, `weight`, `weight_unit`) VALUES
(9, 'Dual Portable Extension', 'OM WDP-303', 'uploads/products/6936e5d02c383_1765205456.png', '[\"uploads\\/products\\/6936e5d02da7d_1765205456.png\"]', 'Electrical', 10, 20, 'PC', 5, 'In Stock', 150.00, NULL, '2025-12-05', NULL, NULL, 18.00, 'kg'),
(10, 'EL EAGLE #101 Rubber Plug HD', 'best Quality electrical rubber plug,', 'uploads/products/6936e2b078601_1765204656.png', '[\"uploads\\/products\\/6936e2b079fa3_1765204656.png\"]', 'Electrical', 10, 25, 'PC', 5, 'In Stock', 54.00, NULL, '2025-12-08', NULL, NULL, 0.01, 'kg'),
(11, 'Koten KSB-S 20A w/ ACU', 'Koten KSB-S 20A w/ ACU best of best.', 'uploads/products/6936e85470edd_1765206100.png', '[\"uploads\\/products\\/6936e8547311a_1765206100.png\"]', 'Electrical', 10, 6, 'PC', 2, 'In Stock', 565.00, NULL, '2025-12-08', NULL, NULL, 0.08, 'kg'),
(12, 'Royu Wide Outlet', 'Royu Wide Outlet best of best.', 'uploads/products/6936e8ce84203_1765206222.png', '[\"uploads\\/products\\/6936e8ce85d0c_1765206222.png\"]', 'Electrical', 10, 25, 'PC', 3, 'In Stock', 47.00, NULL, '2025-12-08', NULL, NULL, 0.05, 'kg'),
(13, 'Multimeter', 'SS Pocket Size Multimeter', 'uploads/products/6936e983822e7_1765206403.png', '[\"uploads\\/products\\/6936e9838437d_1765206403.png\"]', 'Tools & Hardware', 9, 6, 'PC', 3, 'In Stock', 150.00, NULL, '2025-12-08', NULL, NULL, 0.25, NULL),
(14, 'SS Cable Tie', 'SS Cable Tie 60mm', 'uploads/products/6936e9dc010f3_1765206492.png', '[\"uploads\\/products\\/6936e9dc0295e_1765206492.png\"]', 'Tools & Hardware', 9, 34, 'PC', 2, 'In Stock', 7.00, NULL, '2025-12-08', NULL, NULL, 0.13, 'kg'),
(15, 'Hippo Sandpaper', 'Hippo Sandpaper #100', 'uploads/products/6936ea3797538_1765206583.png', '[\"uploads\\/products\\/6936ea3798f71_1765206583.png\"]', 'Tools & Hardware', 9, 100, 'PC', 5, 'In Stock', 11.60, NULL, '2025-12-08', NULL, NULL, 0.01, 'kg'),
(16, 'Topgrade Masonry Drill Bit', 'Topgrade Masonry Drill Bit 5/16', 'uploads/products/6936ea81b2c34_1765206657.png', '[\"uploads\\/products\\/6936ea81b49bb_1765206657.png\"]', 'Tools & Hardware', 9, 26, 'PC', 4, 'In Stock', 70.00, NULL, '2025-12-08', NULL, NULL, 0.02, 'kg'),
(17, 'Plywood Marine', 'Plywood Marine best of best.', 'uploads/products/6936ec7075e97_1765207152.png', '[\"uploads\\/products\\/6936ec70774bf_1765207152.png\"]', 'Wood & Steel', 4, 23, 'PC', 3, 'In Stock', 650.00, NULL, '2025-12-08', NULL, NULL, 21.00, 'kg'),
(18, 'Round Bar', 'Round Bar 6mm', 'uploads/products/6936eccb3a017_1765207243.png', '[\"uploads\\/products\\/6936eccb3bb5f_1765207243.png\"]', 'Wood & Steel', 4, 25, 'PC', 3, 'In Stock', 85.00, NULL, '2025-12-08', NULL, NULL, 2.20, 'kg'),
(19, 'Coco Lumber', 'Coco Lumber 2x2', 'uploads/products/6936ed1f2036b_1765207327.png', '[\"uploads\\/products\\/6936ed1f2179c_1765207327.png\"]', 'Wood & Steel', 4, 31, 'PC', 2, 'In Stock', 30.00, NULL, '2025-12-08', NULL, NULL, 4.00, NULL),
(20, 'Angle Bar', 'Angle Bar 1\" x 1\"', 'uploads/products/6936ed68c827d_1765207400.png', '[\"uploads\\/products\\/6936ed68c9b19_1765207400.png\"]', 'Wood & Steel', 4, 24, 'PC', 3, 'In Stock', 180.00, NULL, '2025-12-08', NULL, NULL, 5.40, 'kg'),
(21, 'Solo Flat Latex White', '4L CS-88 Solo Flat Latex White', 'uploads/products/6936ee3c4187d_1765207612.png', '[\"uploads\\/products\\/6936ee3c4340d_1765207612.png\"]', 'Paints & Finishes', 8, 8, 'GAL', 2, 'In Stock', 300.00, NULL, '2025-12-08', NULL, NULL, 3.00, 'kg'),
(22, 'Vulcaseal 12/B', '1L Vulcaseal 12/B', 'uploads/products/6936eea87aa2e_1765207720.png', '[\"uploads\\/products\\/6936eea87eafa_1765207720.png\"]', 'Paints & Finishes', 8, 24, 'GAL', 2, 'In Stock', 714.00, NULL, '2025-12-08', NULL, NULL, 4.00, 'kg'),
(23, '4L Acreex ACK-54', '4L Acreex ACK-54 Dark Velvet Gray', 'uploads/products/6936ef1d1c393_1765207837.png', '[\"uploads\\/products\\/6936ef1d1db03_1765207837.png\"]', 'Paints & Finishes', 8, 18, 'GAL', 2, 'In Stock', 1175.00, NULL, '2025-12-08', NULL, NULL, 3.00, 'kg'),
(24, 'Paint Thinner Bottle', 'Painter’s Choice Paint Thinner Bottle', 'uploads/products/6936ef6a33c6d_1765207914.png', '[\"uploads\\/products\\/6936ef6a356ef_1765207914.png\"]', 'Paints & Finishes', 8, 48, 'PCS', 3, 'In Stock', 39.00, NULL, '2025-12-08', NULL, NULL, 0.80, 'kg'),
(25, 'CHB (Concrete Hollow Block)', 'CHB (Concrete Hollow Block)', 'uploads/products/6936efd6413d8_1765208022.png', '[\"uploads\\/products\\/6936efd6427b8_1765208022.png\"]', 'Construction & Building Materials', 5, 89, 'PC', 4, 'In Stock', 12.00, NULL, '2025-12-08', NULL, NULL, 2.00, 'kg'),
(26, 'Cement (Portland Cement)', 'Cement (Portland Cement)', 'uploads/products/6936f05308ae0_1765208147.png', '[\"uploads\\/products\\/6936f05309ff1_1765208147.png\"]', 'Construction & Building Materials', 5, 56, 'BAG', 2, 'In Stock', 270.00, NULL, '2025-12-08', NULL, NULL, 40.00, 'kg'),
(27, 'Gravel', 'Gravel 3/4\"', 'uploads/products/6936f0f30c894_1765208307.png', '[\"uploads\\/products\\/6936f0f30dc94_1765208307.png\"]', 'Construction & Building Materials', 5, 2, 'PC', 23, 'Low Stock', 1700.00, NULL, '2025-12-08', NULL, NULL, 1680.00, 'kg'),
(28, 'Washed Sand', 'Washed Sand', 'uploads/products/6936f136ba660_1765208374.png', '[\"uploads\\/products\\/6936f136bbe2a_1765208374.png\"]', 'Construction & Building Materials', 5, 123, 'UNT', 12, 'In Stock', 1500.00, NULL, '2025-12-08', NULL, NULL, 1600.00, NULL);

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `product_variations`
--

CREATE TABLE `product_variations` (
  `Variation_ID` int(11) NOT NULL,
  `Product_ID` int(11) NOT NULL,
  `variation_name` varchar(100) NOT NULL,
  `variation_value` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `product_variations`
--

INSERT INTO `product_variations` (`Variation_ID`, `Product_ID`, `variation_name`, `variation_value`) VALUES
(7, 10, 'Color', 'Black'),
(8, 9, 'Color', 'White'),
(9, 11, 'Type', 'Koten'),
(10, 12, 'Type', 'Wide'),
(11, 13, 'Color', 'Red'),
(12, 13, 'Size', 'SS pocket size'),
(13, 14, 'Size', '60mm'),
(15, 18, 'Size', '6m'),
(18, 20, 'Material', '1\" x 1\"'),
(19, 20, 'Size', '6m'),
(20, 17, 'Size', '4ft x 8ft'),
(21, 19, 'Length', '2in x 2in x 8ft'),
(22, 19, 'Size', '2x2'),
(23, 21, 'Color', 'White'),
(24, 22, 'Size', '1L'),
(25, 23, 'Color', 'Dark velvet Gray'),
(26, 27, 'Length', '19mm');

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `User_ID` int(11) NOT NULL,
  `First_Name` varchar(25) DEFAULT NULL,
  `Middle_Name` varchar(25) DEFAULT NULL,
  `Last_Name` varchar(25) DEFAULT NULL,
  `Phone_Number` varchar(15) DEFAULT NULL,
  `email` varchar(100) NOT NULL,
  `address` varchar(255) NOT NULL,
  `address_street` varchar(255) DEFAULT NULL,
  `address_city` varchar(100) DEFAULT NULL,
  `address_barangay` varchar(100) DEFAULT NULL,
  `address_district` varchar(100) DEFAULT NULL,
  `address_postal_code` varchar(20) DEFAULT NULL,
  `address_region` varchar(100) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('Customer','Store Employee','Delivery Driver','Admin') NOT NULL DEFAULT 'Customer',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `profile_picture` varchar(255) DEFAULT NULL,
  `status` enum('active','inactive','pending','archived') DEFAULT 'active',
  `last_login` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`User_ID`, `First_Name`, `Middle_Name`, `Last_Name`, `Phone_Number`, `email`, `address`, `address_street`, `address_city`, `address_barangay`, `address_district`, `address_postal_code`, `address_region`, `password`, `role`, `created_at`, `profile_picture`, `status`, `last_login`) VALUES
(1, 'Admin', NULL, 'User', NULL, 'admin@matarik.com', '123 Admin Street', '123 Admin Street', NULL, NULL, NULL, NULL, 'Philippines', '$2y$10$lEqpsi2kGSD7GL3SzwNb0.N3W264IDK3YcgK2Ii7AC5qFv/Gp7YZK', 'Admin', '2025-11-12 16:46:33', 'uploads/profiles/693503ba3358a_1765082042.png', 'active', '2025-12-08 10:36:15'),
(2, 'Customer', NULL, 'User', '09878756756', 'customer@matarik.com', '456 Customer Avenue, National Capital Region (NCR)', '456 Customer Avenue', NULL, NULL, '', NULL, 'National Capital Region (NCR)', '$2y$10$4U.hWW3qUxaVcGl75Zs7i.HKZnmeXBQTCZ/X3SzKxrjNN6//V8VRi', 'Customer', '2025-11-12 16:46:33', 'uploads/profiles/6936a60452b49_1765189124.png', 'active', '2025-12-08 13:59:46'),
(24, 'Delivery', 'Driver', 'User#1', '09000000000', 'Driver1@matarik.com', 'address123, Mexico, Pampanga, Pandacaqui, 1118, Region III (Central Luzon)', 'address123', 'Mexico', 'Pandacaqui', 'Pampanga', '1118', 'Region III (Central Luzon)', '$2y$10$t8Yx9KeEOaUBpRdJ36gr5ulaopkQ6baRX3nZ.sNxFAO5iB1I0X3cW', 'Delivery Driver', '2025-12-08 11:55:24', NULL, 'active', NULL),
(25, 'Delivery', 'Driver', 'User#2', '09000000001', 'Driver2@matarik.com', 'address1234, San Luis, Pampanga, Santo Rosario, 1118, Region III (Central Luzon)', 'address1234', 'San Luis', 'Santo Rosario', 'Pampanga', '1118', 'Region III (Central Luzon)', '$2y$10$r.dWTlyWiZfcKt1ozv8QNunrVx1iIxm3oUstCkJejADlxdM0nVzpq', 'Delivery Driver', '2025-12-08 11:56:26', NULL, 'active', NULL),
(26, 'Store', 'Employee', 'User', '09000000002', 'Employee@matarik.com', 'address12345, City Of Navotas, NCR, Third District, Sipac-Almacen, 1118, National Capital Region (NCR)', 'address12345', 'City Of Navotas', 'Sipac-Almacen', 'NCR, Third District', '1118', 'National Capital Region (NCR)', '$2y$10$9L1wdn89CO7iUmDhJ5WnP.8dz3rUQO1WEd07w5wqf0DgQeCs5W5su', 'Store Employee', '2025-12-08 11:58:23', NULL, 'active', NULL);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`Category_ID`),
  ADD UNIQUE KEY `unique_category_name` (`category_name`);

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
-- Indexes for table `delivery_drivers`
--
ALTER TABLE `delivery_drivers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_delivery_driver` (`Delivery_ID`,`Driver_ID`),
  ADD KEY `Driver_ID` (`Driver_ID`);

--
-- Indexes for table `delivery_vehicles`
--
ALTER TABLE `delivery_vehicles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_delivery_vehicle` (`Delivery_ID`,`Vehicle_ID`),
  ADD KEY `Vehicle_ID` (`Vehicle_ID`);

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
-- Indexes for table `order_availability_slots`
--
ALTER TABLE `order_availability_slots`
  ADD PRIMARY KEY (`slot_id`),
  ADD UNIQUE KEY `unique_order_slot` (`order_id`,`slot_number`),
  ADD KEY `idx_order_id` (`order_id`),
  ADD KEY `idx_availability_date` (`availability_date`);

--
-- Indexes for table `order_settings`
--
ALTER TABLE `order_settings`
  ADD PRIMARY KEY (`setting_key`);

--
-- Indexes for table `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `token` (`token`),
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_token` (`token`),
  ADD KEY `idx_expires_at` (`expires_at`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`Product_ID`),
  ADD KEY `fk_products_category` (`category_id`);

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
-- AUTO_INCREMENT for table `categories`
--
ALTER TABLE `categories`
  MODIFY `Category_ID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `customer_feedback`
--
ALTER TABLE `customer_feedback`
  MODIFY `Feedback_ID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `deliveries`
--
ALTER TABLE `deliveries`
  MODIFY `Delivery_ID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=37;

--
-- AUTO_INCREMENT for table `delivery_drivers`
--
ALTER TABLE `delivery_drivers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT for table `delivery_vehicles`
--
ALTER TABLE `delivery_vehicles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `fleet`
--
ALTER TABLE `fleet`
  MODIFY `Vehicle_ID` int(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `orders`
--
ALTER TABLE `orders`
  MODIFY `Order_ID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=49;

--
-- AUTO_INCREMENT for table `order_availability_slots`
--
ALTER TABLE `order_availability_slots`
  MODIFY `slot_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `Product_ID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=29;

--
-- AUTO_INCREMENT for table `product_reviews`
--
ALTER TABLE `product_reviews`
  MODIFY `Review_ID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `product_variations`
--
ALTER TABLE `product_variations`
  MODIFY `Variation_ID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=27;

--
-- AUTO_INCREMENT for table `transactions`
--
ALTER TABLE `transactions`
  MODIFY `Transaction_ID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=37;

--
-- AUTO_INCREMENT for table `transaction_items`
--
ALTER TABLE `transaction_items`
  MODIFY `Item_ID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=43;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `User_ID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=27;

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
-- Constraints for table `delivery_drivers`
--
ALTER TABLE `delivery_drivers`
  ADD CONSTRAINT `delivery_drivers_ibfk_1` FOREIGN KEY (`Delivery_ID`) REFERENCES `deliveries` (`Delivery_ID`) ON DELETE CASCADE,
  ADD CONSTRAINT `delivery_drivers_ibfk_2` FOREIGN KEY (`Driver_ID`) REFERENCES `users` (`User_ID`) ON DELETE CASCADE;

--
-- Constraints for table `delivery_vehicles`
--
ALTER TABLE `delivery_vehicles`
  ADD CONSTRAINT `delivery_vehicles_ibfk_1` FOREIGN KEY (`Delivery_ID`) REFERENCES `deliveries` (`Delivery_ID`) ON DELETE CASCADE,
  ADD CONSTRAINT `delivery_vehicles_ibfk_2` FOREIGN KEY (`Vehicle_ID`) REFERENCES `fleet` (`Vehicle_ID`) ON DELETE CASCADE;

--
-- Constraints for table `orders`
--
ALTER TABLE `orders`
  ADD CONSTRAINT `fk_orders_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users` (`User_ID`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_orders_employee` FOREIGN KEY (`Employee_ID`) REFERENCES `users` (`User_ID`),
  ADD CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`User_ID`) REFERENCES `users` (`User_ID`),
  ADD CONSTRAINT `orders_ibfk_2` FOREIGN KEY (`User_ID`) REFERENCES `users` (`User_ID`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `order_availability_slots`
--
ALTER TABLE `order_availability_slots`
  ADD CONSTRAINT `order_availability_slots_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`Order_ID`) ON DELETE CASCADE;

--
-- Constraints for table `products`
--
ALTER TABLE `products`
  ADD CONSTRAINT `fk_products_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`Category_ID`) ON UPDATE CASCADE;

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
