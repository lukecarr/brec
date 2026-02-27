#!/usr/bin/env bun

import { resolve } from "path";
import { isRecipe, isRecipes, type Recipe } from "./lib";
import { VoidAsyncDag } from "./dag";

const BREC_FILES = ["brec.ts", "brec.js", "brec.mjs"];

async function main() {
  let brecPath: string | undefined;
  for (const name of BREC_FILES) {
    const path = resolve(process.cwd(), name);
    if (await Bun.file(path).exists()) {
      brecPath = path;
      break;
    }
  }

  if (!brecPath) {
    console.error(`Error: No ${BREC_FILES.join(" or ")} found in ${process.cwd()}`);
    process.exit(1);
  }

  // Dynamic import of the user's brec file
  const mod = await import(brecPath);

  // Scan exports for Recipe objects
  const recipes = new Map<string, Recipe>();
  const recipeNames = new Map<Recipe, string>();

  for (const [name, value] of Object.entries(mod)) {
    if (name === "default" && isRecipes(value)) {
      // Default export is a map of name -> Recipe
      for (const [recipeName, recipe] of Object.entries(value)) {
        recipes.set(recipeName, recipe);
        recipeNames.set(recipe, recipeName);
      }
    } else if (isRecipe(value)) {
      recipes.set(name, value);
      recipeNames.set(value, name);
    }
  }

  if (recipes.size === 0) {
    console.error(`Error: No recipes found in ${brecPath}`);
    process.exit(1);
  }

  const recipeName = process.argv[2];

  // No arguments — list all recipes
  if (!recipeName) {
    listRecipes(recipes);
    return;
  }

  // Run the specified recipe
  const target = recipes.get(recipeName);
  if (!target) {
    console.error(`Error: Unknown recipe '${recipeName}'`);
    console.error(`\nAvailable recipes:`);
    listRecipes(recipes);
    process.exit(1);
  }

  await runRecipe(target, recipes, recipeNames);
}

function listRecipes(recipes: Map<string, Recipe>) {
  const maxLen = Math.max(...Array.from(recipes.keys()).map((n) => n.length));

  for (const [name, recipe] of recipes) {
    console.log(`  ${name.padEnd(maxLen)}  ${recipe.description}`);
  }
}

async function runRecipe(
  target: Recipe,
  recipes: Map<string, Recipe>,
  recipeNames: Map<Recipe, string>,
) {
  const dag = new VoidAsyncDag();
  const visited = new Set<Recipe>();

  // Recursively add the target and all its deps to the DAG
  function addToDag(recipe: Recipe) {
    if (visited.has(recipe)) return;
    visited.add(recipe);

    const name = recipeNames.get(recipe);
    if (!name) {
      throw new Error(
        "A recipe dependency was not found among the exports of the brec file. " +
          "All recipes (including dependencies) must be exported.",
      );
    }

    // Add deps first
    for (const dep of recipe.deps) {
      addToDag(dep);
    }

    const depNames = recipe.deps.map((dep) => {
      const depName = recipeNames.get(dep);
      if (!depName) {
        throw new Error(
          `Dependency of '${name}' is not an exported recipe in the brec file.`,
        );
      }
      return depName;
    });

    dag.addNode(name, depNames, async () => {
      console.log(`\x1b[36m▶ ${name}\x1b[0m`);
      await recipe.run();
    });
  }

  addToDag(target);
  await dag.run();
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
