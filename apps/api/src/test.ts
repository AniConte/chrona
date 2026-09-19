import { randomUUID } from "node:crypto";
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import type { IClassificationService } from "./modules/classification/services/IClassificationService.js";
import type { IExportService } from "./modules/Export/services/IExportService.js";
import type { IUploadService } from "./modules/upload/services/IUploadService.js";
import { IDENTIFIERS } from "./shared/di/config.js";
import container from "./shared/di/identifiers.js";

const SOURCE_ARCHIVE = join(process.cwd(), "storage", "test", "photos.zip");

const run = async () => {
	const batchId = randomUUID();

	const batchDirectory = join(process.cwd(), "storage", "test-runs", batchId);

	const incomingDirectory = join(batchDirectory, "incoming");

	await mkdir(incomingDirectory, {
		recursive: true,
	});

	const archivePath = join(incomingDirectory, basename(SOURCE_ARCHIVE));

	await copyFile(SOURCE_ARCHIVE, archivePath);

	const uploadService = container.get<IUploadService>(IDENTIFIERS.UploadService);

	const classificationService = container.get<IClassificationService>(IDENTIFIERS.ClassificationService);

	console.log("Processing archive...");

	const images = await uploadService.processUploads(
		[
			{
				filePath: archivePath,
				originalName: basename(SOURCE_ARCHIVE),
			},
		],
		batchDirectory
	);

	console.log(`Processed images: ${images.length}`);

	console.table(
		images.map((image) => ({
			id: image.id,
			name: image.originalName,
			width: image.width,
			height: image.height,
			sizeKb: Math.round(image.size / 1024),
		}))
	);

	if (images.length === 0) {
		throw new Error("NO_IMAGES_AFTER_UPLOAD_PROCESSING");
	}

	console.log("\nStarting classification...\n");

	const result = await classificationService.classify(images, "child_age");

	const resultPath = join(batchDirectory, "classification.json");

	await writeFile(resultPath, JSON.stringify(result, null, 2), "utf8");

	const exportService = container.get<IExportService>(IDENTIFIERS.ExportService);

	const finalArchivePath = join(batchDirectory, "result.zip");

	await exportService.createOrderedArchive(images, result, finalArchivePath);

	console.log(`Final archive: ${finalArchivePath}`);

	console.log("\nStage 1:");

	console.table(
		result.stageOne.map((item) => ({
			name: item.originalName,
			ageMonths: item.estimatedChildAgeMonths,
			confidence: item.confidence,
			summary: item.summary,
		}))
	);

	console.log("\nFinal ranking:");

	const imageById = new Map(images.map((image) => [image.id, image]));

	console.table(
		result.ranking.map((item) => ({
			rank: item.rank + 1,

			name: imageById.get(item.imageId)?.originalName ?? item.imageId,

			confidence: item.confidence,
		}))
	);

	console.log(`\nResult saved to:\n${resultPath}`);
};

run().catch((error) => {
	console.error(error);

	process.exit(1);
});
