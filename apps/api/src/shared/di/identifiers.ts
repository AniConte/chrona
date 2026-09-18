import { Container } from "inversify";
import ArchiveService from "../../modules/upload/services/archive.service.js";
import ImageService from "../../modules/upload/services/image.service.js";
import OllamaService from "../../modules/upload/services/ollama.service.js";
import StorageService from "../../modules/upload/services/storage.service.js";
import UploadService from "../../modules/upload/services/upload.service.js";
import { IDENTIFIERS } from "./config.js";

const container = new Container();

container.bind(IDENTIFIERS.ImageService).to(ImageService).inSingletonScope();
container.bind(IDENTIFIERS.ArchiveService).to(ArchiveService).inSingletonScope();
container.bind(IDENTIFIERS.UploadService).to(UploadService).inSingletonScope();
container.bind(IDENTIFIERS.StorageService).to(StorageService).inSingletonScope();
container.bind(IDENTIFIERS.OllamaService).to(OllamaService).inSingletonScope();

export default container;
