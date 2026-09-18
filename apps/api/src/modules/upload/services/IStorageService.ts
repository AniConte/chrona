export interface BatchStorage {
	id: string;

	rootDirectory: string;
	incomingDirectory: string;
	extractedDirectory: string;
	processedDirectory: string;
}

export interface IStorageService {
	createBatch(): Promise<BatchStorage>;
	getBatch(batchId: string): BatchStorage;
	batchExists(batchId: string): Promise<boolean>;
	deleteBatch(batchId: string): Promise<void>;

	saveJson<T>(batchId: string, fileName: string, data: T): Promise<void>;
	readJson<T>(batchId: string, fileName: string): Promise<T>;
}
