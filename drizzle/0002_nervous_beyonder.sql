CREATE TABLE `file_share` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`root_dir_id` text NOT NULL,
	`display_name` text NOT NULL,
	`files` text NOT NULL,
	`starts_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`expires_in_seconds` integer NOT NULL,
	`password_protected` integer NOT NULL,
	`password_salt` text,
	`password_verifier` text
);
--> statement-breakpoint
CREATE INDEX `file_share_expires_at_idx` ON `file_share` (`expires_at`);