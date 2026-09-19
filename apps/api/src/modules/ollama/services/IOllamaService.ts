export interface OllamaJsonRequest {
	prompt: string;

	system?: string;

	images?: Uint8Array[]; //

	think?: boolean;
	numPredict?: number;
}

export interface IOllamaService {
	chatJson<T>(request: OllamaJsonRequest): Promise<T>;
}
