# brec

> A task runner for the Bun ecosystem. (Bun RECipes)

Define recipes in TypeScript. Run them from the command line. Dependencies are resolved as a directed acyclic graph (DAG) and run with maximum concurrency.

## Install

```sh
bun add -d brec
```

## Quick start

Create a `brec.ts` or `brec.js` in your project root:

```js
import { recipe, $ } from "brec";

export const clean = recipe("Remove build artifacts", () => $`rm -rf ./build`);

export const build = recipe(
  () => $`bun build ./src/index.ts --outdir ./build --target bun`,
  [clean],
);
```

List available recipes:

```console
$ brec
  clean  Remove build artifacts
  build
```

Run a recipe:

```console
$ brec build
▶ clean
▶ build
```

## API

### recipe()

Creates a recipe. Call it with a description and a run function. Optionally pass recipe dependencies as a third argument.

```ts
recipe(description: string, run: Task, deps?: Recipe[]): Recipe
recipe(run: Task, deps?: Recipe[]): Recipe
```

- **description**: optional text that appears when you list recipes
- **run**: the function to execute (`Task` is a type alias for `() => void | Promise<any>`)
- **deps**: optional other recipes that must run first

Dependencies run before the recipe. Independent dependencies run concurrently.

Example:

```js
export const lint = recipe("Lint the codebase", () => { ... });
export const test = recipe("Run tests", () => { ... });

// both "lint" and "test" run (in parallel) before "ci"
export const ci = recipe("CI pipeline", async () => { ... }, [lint, test]);

// shorthand (description is optional)
export const build = recipe(() => $`bun build`, [clean]);
```

### $

A re-export of Bun's built-in [shell](https://bun.sh/docs/runtime/shell) tagged template literal. Use it to run shell commands inside recipes.

```js
export const dev = recipe("Start dev server", () => $`bun run dev`);
```

## Recipes

Brec discovers recipes from the exports of your `brec.ts` or `brec.js` file.

### Named exports

Each named export that is a `Recipe` becomes available as a recipe. The export name is the recipe name.

```js
export const lint = recipe("Lint the codebase", () => { ... });
export const test = recipe("Run tests", () => { ... });
```

```console
$ brec
  lint  Lint the codebase
  test  Run tests
```

### Default export

Export a `Recipes` as the default export to create recipes dynamically.

```ts
import { recipe, type Recipes } from "brec";

const services = ["api", "web", "worker"];

export default Object.fromEntries(
  services.map((s) => [
    `deploy-${s}`,
    recipe(`Deploy the ${s} service`, async () => { ... }),
  ]),
) satisfies Recipes;
```

```console
$ brec
  deploy-api     Deploy the api service
  deploy-web     Deploy the web service
  deploy-worker  Deploy the worker service
```

You can use both named exports and a default export in the same file.

## Dependencies

Pass recipe variables directly as dependencies. This gives you type safety and ensures referenced recipes exist.

```js
const clean = recipe(() => $`rm -rf dist`);
const compile = recipe(() => $`bun build src/index.ts --outdir dist`);

export const bundle = recipe(async () => { ... }, [clean, compile]);
```

If there's a cycle in the dependency graph, brec reports an error.

## License

brec is licensed under the MIT License. See [LICENSE](./LICENSE) for details.
