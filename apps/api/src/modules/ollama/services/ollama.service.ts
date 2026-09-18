import { injectable } from "inversify";
import { Ollama, type Message } from "ollama";
import type { IOllamaService, OllamaJsonRequest } from "./IOllamaService.js";

const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "fredrezones55/Qwen3.6-35B-A3B-Uncensored-HauhauCS-Aggressive";
const OLLAMA_HOST = process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434";
const OLLAMA_KEEP_ALIVE = process.env.OLLAMA_KEEP_ALIVE ?? "15m";

@injectable()
class OllamaService implements IOllamaService {
	private readonly client: Ollama;

	constructor() {
		this.client = new Ollama({
			host: OLLAMA_HOST,
		});
	}

	async chatJson<T>(request: OllamaJsonRequest): Promise<T> {
		const messages: Message[] = [];

		if (request.system) {
			messages.push({
				role: "system" as const,
				content: request.system,
			});
		}

		messages.push({
			role: "user" as const,
			content: request.prompt,
			...(request.images?.length ? { images: request.images } : {}),
		});

		const response = await this.client.chat({
			model: OLLAMA_MODEL!,
			messages,
			format: "json",
			stream: false,
			keep_alive: OLLAMA_KEEP_ALIVE,
		});

		try {
			return JSON.parse(response.message.content) as T;
		} catch {
			throw new Error("OLLAMA_INVALID_JSON_RESPONSE");
		}
	}
}

export default OllamaService;
