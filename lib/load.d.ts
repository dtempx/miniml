import { MinimlModel } from "./common.js";
export declare function createModel(obj: {}, file?: string): MinimlModel;
export declare function loadModel(file: string): Promise<MinimlModel>;
export declare function loadModelSync(file: string): MinimlModel;
