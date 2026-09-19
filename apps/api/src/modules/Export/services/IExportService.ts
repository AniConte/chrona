import type { ClassificationResult } from "../../classification/services/IClassificationService.js";
import type { UploadedImage } from "../../upload/services/IUploadService.js";

export interface IExportService {
	createOrderedArchive(images: UploadedImage[], result: ClassificationResult, outputPath: string): Promise<string>;
}
