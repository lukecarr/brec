type Task = () => Promise<void>;

interface DagNode {
  id: string;
  deps: string[];
  task: Task;
}

export class VoidAsyncDag {
  private nodes: Map<string, DagNode> = new Map();

  /**
   * Adds a task node to the DAG.
   */
  public addNode(id: string, deps: string[], task: Task) {
    if (this.nodes.has(id)) {
      throw new Error(`Node with id '${id}' already exists.`);
    }
    this.nodes.set(id, { id, deps, task });
  }

  /**
   * Runs the DAG. Returns a promise that resolves when ALL nodes have completed.
   */
  public async run(): Promise<void> {
    this.detectCycles();

    // Cache to ensure each node only runs once
    const executionMap = new Map<string, Promise<void>>();

    const getPromise = (id: string): Promise<void> => {
      // 1. If already started/finished, return that promise
      if (executionMap.has(id)) {
        return executionMap.get(id)!;
      }

      const node = this.nodes.get(id);
      if (!node) {
        throw new Error(`Dependency '${id}' not found.`);
      }

      // 2. Create the promise: Wait for Deps -> Run Task
      const promise = (async () => {
        // Wait for all dependencies to finish
        await Promise.all(node.deps.map((depId) => getPromise(depId)));

        // Execute the task
        await node.task();
      })();

      // 3. Store in cache
      executionMap.set(id, promise);
      return promise;
    };

    // Kick off all nodes
    await Promise.all(Array.from(this.nodes.keys()).map(getPromise));
  }

  private detectCycles() {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const visit = (id: string) => {
      if (recursionStack.has(id))
        throw new Error(`Cycle detected involving node '${id}'`);
      if (visited.has(id)) return;

      visited.add(id);
      recursionStack.add(id);

      const node = this.nodes.get(id);
      if (node) {
        node.deps.forEach(visit);
      }

      recursionStack.delete(id);
    };

    for (const id of this.nodes.keys()) visit(id);
  }
}
