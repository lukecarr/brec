export { $ } from "bun";

export interface Recipe {
  __brec: true;
  description: string;
  deps: Recipe[];
  run: () => Promise<any> | void;
}

export type Task = () => Promise<any> | void;

export function recipe(description: string, run: Task, deps?: Recipe[]): Recipe;

export function recipe(run: Task, deps?: Recipe[]): Recipe;

export function recipe(
  descriptionOrRun: string | Task,
  runOrDeps?: Task | Recipe[],
  maybeDeps?: Recipe[],
): Recipe {
  if (typeof descriptionOrRun === "function") {
    const run = descriptionOrRun;
    const deps = Array.isArray(runOrDeps) ? runOrDeps : undefined;
    return {
      __brec: true,
      description: "",
      deps: deps ?? [],
      run,
    };
  }

  const description = descriptionOrRun;
  const run = runOrDeps as () => Promise<void> | void;
  const deps = maybeDeps;

  return {
    __brec: true,
    description,
    deps: deps ?? [],
    run,
  };
}

export type Recipes = Record<string, Recipe>;

export function isRecipe(value: unknown): value is Recipe {
  return (
    typeof value === "object" &&
    value !== null &&
    "__brec" in value &&
    (value as Recipe).__brec === true
  );
}

export function isRecipes(value: unknown): value is Recipes {
  if (typeof value !== "object" || value === null) return false;
  const entries = Object.entries(value);
  return entries.length > 0 && entries.every(([, v]) => isRecipe(v));
}
