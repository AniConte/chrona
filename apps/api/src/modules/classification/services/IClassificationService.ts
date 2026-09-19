import type { UploadedImage } from "../../upload/services/IUploadService.js";

export type ClassificationMode = "child_age" | "chronology";

export type BatchStatus = "uploaded" | "processing" | "completed" | "failed";

export interface BatchManifest {
	id: string;
	createdAt: string;
	images: UploadedImage[];
}

export interface BatchState {
	status: BatchStatus;
	updatedAt: string;
	error?: string;
}

export interface StageOneClassification {
	imageId: string;
	originalName: string;

	summary: string;

	childPresent: boolean;
	estimatedChildAgeMonths: number | null;

	estimatedYear: number | null;

	chronologyHints: string[];

	confidence: number;
}

export interface RankedImage {
	imageId: string;
	rank: number;
	confidence: number;
}

export interface ClassificationResult {
	mode: ClassificationMode;

	stageOne: StageOneClassification[];
	ranking: RankedImage[];

	excluded: {
		imageId: string;
		reason: string;
	}[];

	createdAt: string;
}

export interface IClassificationService {
	classify(images: UploadedImage[], mode: ClassificationMode): Promise<ClassificationResult>;
}
