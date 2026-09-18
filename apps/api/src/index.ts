import type { IArchiveService } from "./modules/upload/services/IArchiveService.js";
import type { IImageService } from "./modules/upload/services/IImageService.js";
import type { IStorageService } from "./modules/upload/services/IStorageService.js";
import { IDENTIFIERS } from "./shared/di/config.js";
import container from "./shared/di/identifiers.js";

console.log("hello, world!");
const imageService = container.get<IImageService>(IDENTIFIERS.ImageService);
const archiveService = container.get<IArchiveService>(IDENTIFIERS.ArchiveService);
const storageSetvice = container.get<IStorageService>(IDENTIFIERS.StorageService);
