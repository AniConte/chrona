import { Container } from "inversify";
import ArchiveService from "../../modules/archive/services/archive.service.js";
import ClassificationService from "../../modules/classification/services/classification.service.js";
import ExportService from "../../modules/Export/services/ExportService.js";
import ImageService from "../../modules/image/services/image.service.js";
import OllamaService from "../../modules/ollama/services/ollama.service.js";
import StorageService from "../../modules/storage/services/storage.service.js";
import UploadService from "../../modules/upload/services/upload.service.js";
import { IDENTIFIERS } from "./config.js";

const container = new Container();

container.bind(IDENTIFIERS.ImageService).to(ImageService).inSingletonScope();
container.bind(IDENTIFIERS.ArchiveService).to(ArchiveService).inSingletonScope();
container.bind(IDENTIFIERS.UploadService).to(UploadService).inSingletonScope();
container.bind(IDENTIFIERS.StorageService).to(StorageService).inSingletonScope();
container.bind(IDENTIFIERS.OllamaService).to(OllamaService).inSingletonScope();
container.bind(IDENTIFIERS.ClassificationService).to(ClassificationService).inSingletonScope();
container.bind(IDENTIFIERS.ExportService).to(ExportService).inSingletonScope();

export default container;
