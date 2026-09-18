export interface OllamaJsonRequest {
	prompt: string;

	system?: string;

	images?: Uint8Array[]; //
}

export interface IOllamaService {
	chatJson<T>(request: OllamaJsonRequest): Promise<T>;
}
