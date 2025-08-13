CREATE TABLE "guilds" (
	"id" text PRIMARY KEY NOT NULL,
	"spawn_channel" text NOT NULL,
	"min_spawn_messages" integer NOT NULL,
	"max_spawn_messages" integer NOT NULL,
	"messages_since_last_spawn" integer NOT NULL,
	"messages_needed_for_next_spawn" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pokemons" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(28) NOT NULL,
	"pokemon_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(28) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
