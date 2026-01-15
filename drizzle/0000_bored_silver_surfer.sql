CREATE TABLE `users` (
	`id` varchar(36) NOT NULL,
	`name` varchar(50) NOT NULL,
	`email` varchar(100) NOT NULL,
	`hash_password` varchar(60) NOT NULL,
	`role` varchar(40) DEFAULT 'user',
	`balance` int DEFAULT 0,
	`status` varchar(20) DEFAULT 'active',
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `games` (
	`id` varchar(36) NOT NULL,
	`name` varchar(50) NOT NULL,
	`thumbnail` varchar(500),
	`server` json,
	`gamecode` varchar(50),
	`publisher` varchar(50),
	CONSTRAINT `games_id` PRIMARY KEY(`id`),
	CONSTRAINT `games_gamecode_unique` UNIQUE(`gamecode`)
);
--> statement-breakpoint
CREATE TABLE `topup_packages` (
	`id` varchar(36) NOT NULL,
	`package_name` varchar(255) NOT NULL,
	`game_id` varchar(36) NOT NULL,
	`price` int NOT NULL,
	`thumbnail` varchar(500),
	`package_type` varchar(50),
	`status` varchar(20) DEFAULT 'active',
	`origin_price` int,
	`fileAPI` json,
	`id_server` boolean DEFAULT false,
	`sale` boolean DEFAULT false,
	CONSTRAINT `topup_packages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`package_id` varchar(36) NOT NULL,
	`amount` int NOT NULL,
	`status` varchar(50) DEFAULT 'pending',
	`account_info` json,
	`profit` int DEFAULT 0,
	`user_id_nap` varchar(36),
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `topup_wallet_logs` (
	`id` varchar(20) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`amount` int NOT NULL,
	`status` varchar(50) DEFAULT 'pending',
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `topup_wallet_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `acc` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`game_id` varchar(36) NOT NULL,
	`info` text,
	`image` varchar(255),
	`price` int NOT NULL,
	`status` varchar(50) DEFAULT 'available',
	CONSTRAINT `acc_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `acc_orders` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`acc_id` int NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`price` int NOT NULL,
	`status` varchar(50) DEFAULT 'pending',
	`contact_info` json,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `acc_orders_id` PRIMARY KEY(`id`)
);
