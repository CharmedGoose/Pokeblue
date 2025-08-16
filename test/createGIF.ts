import { PokemonGenerationStarters } from "#lib/pokemon";
import { createGIF, fetchGIFInfo } from "#lib/utils/gif";
import { randomNumber } from "#lib/utils/math";

const starters = PokemonGenerationStarters[0];

const totalTime = Date.now();
console.log("Fetching starter GIFs...");

const grassPokemonGIF = await fetchGIFInfo(
	`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${starters[0].id}.gif`,
);
const firePokemonGIF = await fetchGIFInfo(
	`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${starters[1].id}.gif`,
);
const waterPokemonGIF = await fetchGIFInfo(
	`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${starters[2].id}.gif`,
);

console.log(`Done! ${Date.now() - totalTime}ms`);
console.log("Creating GIF...");

const output = await createGIF(
	1000,
	500,
	[
		{
			gifInfo: grassPokemonGIF,
			x: 250,
			y: 450,
			widthMultiplier: 4,
			heightMultiplier: 4,
			bottomCenterPivot: true,
		},
		{
			gifInfo: firePokemonGIF,
			x: 500,
			y: 450,
			widthMultiplier: 4,
			heightMultiplier: 4,
			bottomCenterPivot: true,
		},
		{
			gifInfo: waterPokemonGIF,
			x: 750,
			y: 450,
			widthMultiplier: 4,
			heightMultiplier: 4,
			bottomCenterPivot: true,
		},
	],
	"./src/assets/starterBackground.jpg",
);
await Bun.file("./test/output/starters.gif").write(output);

console.log(`Starter GIF Done! ${Date.now() - totalTime}ms\n`);
console.log("Creating random GIFs...");

for (let i = 0; i < 10; i++) {
	const time = Date.now();

	console.log(`Creating random GIF ${i + 1}/10...`);
	console.log("Fetching random Pokémon GIF...");

	const randomPokemonGIF = await fetchGIFInfo(
		`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${randomNumber(1, 721)}.gif`,
	);

	console.log(`Done! ${Date.now() - time}ms`);
	console.log("Creating GIF...");

	const randomOutput = await createGIF(
		1000,
		500,
		[
			{
				gifInfo: randomPokemonGIF,
				x: randomNumber(100, 900),
				y: randomNumber(100, 400),
				widthMultiplier: 3,
				heightMultiplier: 3,
				bottomCenterPivot: true,
			},
		],
		"./src/assets/starterBackground.jpg",
	);
	await Bun.file(`./test/output/random-${i}.gif`).write(randomOutput);

	console.log(`GIF ${i + 1} Done! ${Date.now() - time}ms\n`);
}

console.log(`Took ${Date.now() - totalTime}ms total`);