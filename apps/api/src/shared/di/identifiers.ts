import { Container } from "inversify";
import ImageService from "../../modules/upload/services/image.service.js";
import { IDENTIFIERS } from "./config.js";

const container = new Container();

container.bind(IDENTIFIERS.ImageService).to(ImageService).inSingletonScope();

export default container;
