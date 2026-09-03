import { pathToFileURL } from "node:url";

/** Maps the tsconfig `@/*` alias to `src/*` and adds the `.ts` extension. */
const SRC = pathToFileURL(`${process.cwd()}/src/`).href;

export function resolve(specifier, context, next) {
  if (specifier.startsWith("@/")) {
    let target = SRC + specifier.slice(2);
    if (!/\.[a-z]+$/i.test(target)) target += ".ts";
    return next(target, context);
  }
  return next(specifier, context);
}
