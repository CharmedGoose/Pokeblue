CREATE TABLE "guilds" (
	"id" text PRIMARY KEY NOT NULL,
	"spawn_channel" text NOT NULL,
	"min_spawn_time" text NOT NULL,
	"max_spawn_time" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
