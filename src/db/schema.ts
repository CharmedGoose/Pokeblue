import { pgTable, timestamp, varchar, text, serial } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
	id: text("id").primaryKey(),
	name: varchar("name", { length: 28 }).notNull(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const pokemons = pgTable("pokemons", {
	id: serial("id").primaryKey(),
	name: varchar("name", { length: 28 }).notNull(),
	pokemonId: text("pokemon_id").notNull(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id),
	createdAt: timestamp("created_at").notNull().defaultNow(),
});
