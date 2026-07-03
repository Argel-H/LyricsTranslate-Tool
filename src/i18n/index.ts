export { en } from "./en";
export { es } from "./es";
export { pt } from "./pt";

export type I18nKey = keyof typeof import("./en")["en"];
