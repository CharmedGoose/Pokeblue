import { pgTable, timestamp, varchar, text, serial, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
	id: text("id").primaryKey(),
	name: varchar("name", { length: 28 }).notNull(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
	pokemons: many(pokemons),
}));

export const pokemons = pgTable("pokemons", {
	id: serial("id").primaryKey(),
	name: varchar("name", { length: 28 }).notNull(),
	pokemonId: text("pokemon_id").notNull(),
	userId: text("user_id").notNull(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const pokemonsRelations = relations(pokemons, ({ one }) => ({
	owner: one(users, { fields: [pokemons.userId], references: [users.id] }),
}));

export const guilds = pgTable("guilds", {
	id: text("id").primaryKey(),
	spawnChannel: text("spawn_channel").notNull(),
	minSpawnMessages: integer("min_spawn_messages").notNull(),
	maxSpawnMessages: integer("max_spawn_messages").notNull(),
	messagesSinceLastSpawn: integer("messages_since_last_spawn").notNull(),
	messagesNeededForNextSpawn: integer("messages_needed_for_next_spawn").notNull(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
});
