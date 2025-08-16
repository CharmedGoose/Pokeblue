import { PokemonGenerationStarters } from "#lib/pokemon";
import { createGIF, fetchGIFInfo } from "#lib/utils/gif";
import { randomNumber } from "#lib/utils/math";

const starters = PokemonGenerationStarters[0];

const grassPokemonGIF = await fetchGIFInfo(
	`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${starters[0].id}.gif`,
);
const firePokemonGIF = await fetchGIFInfo(
	`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${starters[1].id}.gif`,
);
const waterPokemonGIF = await fetchGIFInfo(
	`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${starters[2].id}.gif`,
);

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

for (let i = 0; i < 10; i++) {
	const randomPokemonGIF = await fetchGIFInfo(
		`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${randomNumber(1, 721)}.gif`,
	);
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
}