import { recipe, $ } from "./src/lib";

export const clean = recipe(
  "Remove build artifacts",
  () => $`rm -f cli.js lib.js lib.d.ts`,
);

export const build = recipe(
  "Build the project",
  async () => {
    await $`bun build ./src/cli.ts ./src/lib.ts --production --outdir ./ --target bun`;
    await $`bunx tsc ./src/lib.ts --declaration --emitDeclarationOnly --outDir .`;
  },
  [clean],
);
