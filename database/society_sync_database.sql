-- ============================================================================
-- PlotSync Platform - Complete Production Master MySQL Database Import Script
-- Target Database: society_sync_db & society_sync_database
-- Compatibility: XAMPP / MySQL 5.7+ / MySQL 8.0+ / MariaDB 10.4+
-- ============================================================================

-- 1. Create & Select Database
CREATE DATABASE IF NOT EXISTS `society_sync_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `society_sync_db`;

-- Disable Foreign Key checks during table setup
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------------------------------------------------------
-- Table 1: societies
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `societies`;
CREATE TABLE `societies` (
    `id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `registration_number` VARCHAR(100) NOT NULL,
    `address` TEXT NOT NULL,
    `city` VARCHAR(100) NOT NULL,
    `state` VARCHAR(100) NOT NULL,
    `pincode` VARCHAR(20) NOT NULL,
    `total_wings` INT DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `unique_registration` (`registration_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert Default Parent Society for FK Relationships
INSERT INTO `societies` (`id`, `name`, `registration_number`, `address`, `city`, `state`, `pincode`, `total_wings`)
VALUES ('soc-101', 'PlotSync Real Estate Platform', 'REG-1001', 'Main Boulevard', 'City', 'State', '400001', 2)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- ----------------------------------------------------------------------------
-- Table 2: wings
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `wings`;
CREATE TABLE `wings` (
    `id` VARCHAR(36) NOT NULL,
    `society_id` VARCHAR(36) NOT NULL,
    `wing_name` VARCHAR(50) NOT NULL,
    `total_floors` INT NOT NULL DEFAULT 4,
    `flats_per_floor` INT NOT NULL DEFAULT 4,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `unique_wing_per_society` (`society_id`, `wing_name`),
    CONSTRAINT `fk_wings_society` FOREIGN KEY (`society_id`) REFERENCES `societies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- Table 3: flats
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `flats`;
CREATE TABLE `flats` (
    `id` VARCHAR(36) NOT NULL,
    `wing_id` VARCHAR(36) NOT NULL,
    `flat_number` VARCHAR(50) NOT NULL,
    `floor_number` INT NOT NULL,
    `sq_ft` DECIMAL(10, 2) DEFAULT 1000.00,
    `occupancy_status` VARCHAR(20) NOT NULL DEFAULT 'VACANT',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `unique_flat_per_wing` (`wing_id`, `flat_number`),
    CONSTRAINT `fk_flats_wing` FOREIGN KEY (`wing_id`) REFERENCES `wings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- Table 4: users
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
    `id` VARCHAR(36) NOT NULL,
    `society_id` VARCHAR(36) NOT NULL,
    `flat_id` VARCHAR(36) DEFAULT NULL,
    `full_name` VARCHAR(150) NOT NULL,
    `phone_number` VARCHAR(20) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `email` VARCHAR(150) DEFAULT NULL,
    `role` VARCHAR(20) NOT NULL,
    `resident_type` VARCHAR(20) DEFAULT 'OWNER',
    `designation` VARCHAR(100) DEFAULT 'Member',
    `parking_slot` VARCHAR(50) DEFAULT 'N/A',
    `status` VARCHAR(20) DEFAULT 'ACTIVE',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `unique_user_phone` (`phone_number`),
    KEY `idx_users_society` (`society_id`),
    CONSTRAINT `fk_users_society` FOREIGN KEY (`society_id`) REFERENCES `societies` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_users_flat` FOREIGN KEY (`flat_id`) REFERENCES `flats` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- Table 5: visitor_passes
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `visitor_passes`;
CREATE TABLE `visitor_passes` (
    `id` VARCHAR(36) NOT NULL,
    `flat_id` VARCHAR(36) NOT NULL,
    `created_by_user_id` VARCHAR(36) NOT NULL,
    `visitor_name` VARCHAR(150) NOT NULL,
    `phone_number` VARCHAR(20) NOT NULL,
    `visitor_type` VARCHAR(50) NOT NULL,
    `pass_code` VARCHAR(10) NOT NULL,
    `status` VARCHAR(20) DEFAULT 'EXPECTED',
    `entry_time` TIMESTAMP NULL DEFAULT NULL,
    `exit_time` TIMESTAMP NULL DEFAULT NULL,
    `valid_until` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_visitor_flat` (`flat_id`),
    CONSTRAINT `fk_visitor_flat` FOREIGN KEY (`flat_id`) REFERENCES `flats` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_visitor_user` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- Table 6: helpdesk_tickets
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `helpdesk_tickets`;
CREATE TABLE `helpdesk_tickets` (
    `id` VARCHAR(36) NOT NULL,
    `society_id` VARCHAR(36) NOT NULL,
    `flat_id` VARCHAR(36) NOT NULL,
    `raised_by_user_id` VARCHAR(36) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NOT NULL,
    `category` VARCHAR(50) NOT NULL,
    `priority` VARCHAR(20) DEFAULT 'MEDIUM',
    `status` VARCHAR(20) DEFAULT 'OPEN',
    `assigned_staff_name` VARCHAR(150) DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_tickets_society` (`society_id`),
    CONSTRAINT `fk_tickets_society` FOREIGN KEY (`society_id`) REFERENCES `societies` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_tickets_flat` FOREIGN KEY (`flat_id`) REFERENCES `flats` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_tickets_user` FOREIGN KEY (`raised_by_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- Table 7: plots
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `plots`;
CREATE TABLE `plots` (
    `id` VARCHAR(36) NOT NULL,
    `project_id` VARCHAR(36) NOT NULL DEFAULT 'proj-101',
    `sector_name` VARCHAR(50) NOT NULL DEFAULT 'Sector A',
    `plot_number` VARCHAR(50) NOT NULL,
    `dimensions` VARCHAR(50) NOT NULL DEFAULT '30x50 ft',
    `sq_ft` DECIMAL(10, 2) NOT NULL DEFAULT 1500.00,
    `base_rate` DECIMAL(10, 2) NOT NULL DEFAULT 2500.00,
    `facing_direction` VARCHAR(20) DEFAULT 'EAST',
    `road_width_ft` INT DEFAULT 40,
    `is_corner` TINYINT(1) DEFAULT 0,
    `is_park_facing` TINYINT(1) DEFAULT 0,
    `status` VARCHAR(20) DEFAULT 'AVAILABLE',
    `buyer_name` VARCHAR(150) DEFAULT NULL,
    `buyer_phone` VARCHAR(20) DEFAULT NULL,
    `buyer_id_proof` VARCHAR(100) DEFAULT NULL,
    `payment_plan` VARCHAR(50) DEFAULT 'MILESTONE',
    `hold_expires_at` TIMESTAMP NULL DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `unique_plot_per_sector` (`sector_name`, `plot_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- Table 8: plot_installments
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `plot_installments`;
CREATE TABLE `plot_installments` (
    `id` VARCHAR(36) NOT NULL,
    `plot_id` VARCHAR(36) NOT NULL,
    `milestone_name` VARCHAR(100) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `due_date` VARCHAR(50) DEFAULT NULL,
    `status` VARCHAR(20) DEFAULT 'PENDING',
    `paid_date` TIMESTAMP NULL DEFAULT NULL,
    `receipt_number` VARCHAR(50) DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_installments_plot` FOREIGN KEY (`plot_id`) REFERENCES `plots` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- Table 9: building_materials
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `building_materials`;
CREATE TABLE `building_materials` (
    `id` VARCHAR(36) NOT NULL,
    `material_name` VARCHAR(150) NOT NULL,
    `category` VARCHAR(50) NOT NULL,
    `unit_of_measure` VARCHAR(20) NOT NULL,
    `current_stock` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `reorder_threshold` DECIMAL(10, 2) NOT NULL DEFAULT 100.00,
    `avg_unit_cost` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `supplier_contact` VARCHAR(150) DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `unique_material_name` (`material_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- Table 10: material_inward_logs
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `material_inward_logs`;
CREATE TABLE `material_inward_logs` (
    `id` VARCHAR(36) NOT NULL,
    `material_id` VARCHAR(36) NOT NULL,
    `vendor_name` VARCHAR(150) NOT NULL,
    `invoice_number` VARCHAR(100) NOT NULL,
    `quantity_received` DECIMAL(10, 2) NOT NULL,
    `unit_price` DECIMAL(10, 2) NOT NULL,
    `total_cost` DECIMAL(10, 2) NOT NULL,
    `received_by` VARCHAR(100) DEFAULT 'Site Engineer',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_inward_material` FOREIGN KEY (`material_id`) REFERENCES `building_materials` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- Table 11: material_dispatch_logs
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `material_dispatch_logs`;
CREATE TABLE `material_dispatch_logs` (
    `id` VARCHAR(36) NOT NULL,
    `material_id` VARCHAR(36) NOT NULL,
    `target_location` VARCHAR(100) NOT NULL,
    `quantity_issued` DECIMAL(10, 2) NOT NULL,
    `purpose_milestone` VARCHAR(150) NOT NULL,
    `issued_by` VARCHAR(100) DEFAULT 'Store Manager',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_dispatch_material` FOREIGN KEY (`material_id`) REFERENCES `building_materials` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- Table 12: society_masterplan (Per-User Masterplan Site Maps)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `society_masterplan`;
CREATE TABLE `society_masterplan` (
    `user_id` VARCHAR(100) NOT NULL,
    `blueprint_map_url` LONGTEXT,
    `circle_size` INT DEFAULT 44,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- Table 13: plot_pins (Per-User Mapped Plot Coordinates)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `plot_pins`;
CREATE TABLE `plot_pins` (
    `id` VARCHAR(50) NOT NULL,
    `user_id` VARCHAR(100) NOT NULL DEFAULT 'default',
    `plot_number` VARCHAR(50) NOT NULL,
    `sector_name` VARCHAR(50) DEFAULT 'Sector A',
    `pos_x` DECIMAL(6, 2) NOT NULL DEFAULT 50.00,
    `pos_y` DECIMAL(6, 2) NOT NULL DEFAULT 50.00,
    `dimensions` VARCHAR(50) DEFAULT '30x50 ft',
    `sq_ft` DECIMAL(10, 2) DEFAULT 1500.00,
    `base_rate` DECIMAL(10, 2) DEFAULT 2800.00,
    `facing_direction` VARCHAR(20) DEFAULT 'EAST',
    `status` VARCHAR(20) DEFAULT 'AVAILABLE',
    `buyer_name` VARCHAR(150) DEFAULT NULL,
    `buyer_phone` VARCHAR(20) DEFAULT NULL,
    `is_corner` TINYINT(1) DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_pins_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Re-enable Foreign Key checks
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- SUCCESS: All 13 PlotSync Platform MySQL Tables Created Cleanly!
-- ============================================================================
