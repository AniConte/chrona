import ollama from "ollama";

import { readFile } from "node:fs/promises";

const image = await readFile(new URL("../../../storage/test/DIOR-01.jpg", import.meta.url));

const response = await ollama.chat({
	model: "fredrezones55/Qwen3.6-35B-A3B-Uncensored-HauhauCS-Aggressive",
	messages: [
		{
			role: "user",
			content: "Black pink in your ....?",
		},
		{
			role: "user",
			content: "Please describe this image briefly...",
			images: [image],
		},
	],
});

console.log(response);
