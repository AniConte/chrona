import { injectable } from "inversify";
import { randomUUID } from "node:crypto";
import { access, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import type { BatchStorage, IStorageService } from "./IStorageService.js";

const STORAGE_ROOT = join(process.cwd(), "storage", "batches");

@injectable()
class StorageService implements IStorageService {
	constructor() {}

	private validateBatchId(batchId: string): void {
		const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(batchId);

		if (!isUuid) {
			throw new Error("INVALID_BATCH_ID");
		}
	}

	private validateJsonFileName(fileName: string): void {
		if (basename(fileName) !== fileName || !fileName.endsWith(".json")) {
			throw new Error("INVALID_STORAGE_FILE_NAME");
		}
	}

	async createBatch(): Promise<BatchStorage> {
		const id = randomUUID();

		const batch = this.getBatch(id);

		await Promise.all([
			mkdir(batch.incomingDirectory, { recursive: true }),
			mkdir(batch.extractedDirectory, { recursive: true }),
			mkdir(batch.processedDirectory, { recursive: true }),
		]);

		return batch;
	}

	getBatch(batchId: string): BatchStorage {
		this.validateBatchId(batchId);

		const rootDirectory = join(STORAGE_ROOT, batchId);
		const incomingDirectory = join(rootDirectory, "incoming");
		const extractedDirectory = join(rootDirectory, "extracted");
		const processedDirectory = join(rootDirectory, "processed");

		return {
			id: batchId,
			rootDirectory,
			incomingDirectory,
			extractedDirectory,
			processedDirectory,
		};
	}

	async batchExists(batchId: string): Promise<boolean> {
		const batch = this.getBatch(batchId);

		try {
			await access(batch.rootDirectory);

			return true;
		} catch {
			return false;
		}
	}

	async saveJson<T>(batchId: string, fileName: string, data: T): Promise<void> {
		this.validateJsonFileName(fileName);

		const batch = this.getBatch(batchId);

		const finalPath = join(batch.rootDirectory, fileName);

		const temporaryPath = join(batch.rootDirectory, `.${fileName}.${randomUUID()}.tmp`);

		await writeFile(
			temporaryPath,
			JSON.stringify(data, null, 2), // null - no filters, 2 - spaces
			"utf-8"
		);

		// Atomic replacement on the same filesystem.
		// Protect against the crashed bytes (-> avoid 500)
		await rename(temporaryPath, finalPath);
	}

	async readJson<T>(batchId: string, fileName: string): Promise<T> {
		this.validateJsonFileName(fileName);

		const batch = this.getBatch(batchId);

		const path = join(batch.rootDirectory, fileName);

		const content = await readFile(path, "utf-8");

		return JSON.parse(content) as T;
	}

	async deleteBatch(batchId: string): Promise<void> {
		const batch = this.getBatch(batchId);

		await rm(batch.rootDirectory, { recursive: true, force: true });
	}
}

export default StorageService;
