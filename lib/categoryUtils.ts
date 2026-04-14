import type { Category, CategoryNode } from "./types";

export function buildCategoryTree(cats: Category[], parentId: string | null = null): CategoryNode[] {
  return cats
    .filter((c) => c.parentId === parentId)
    .map((c) => ({
      ...c,
      level: 0,
      children: buildCategoryTree(cats, c.id),
    }));
}

export function flattenCategoryTree(nodes: CategoryNode[], currentLevel = 0): CategoryNode[] {
  let result: CategoryNode[] = [];
  nodes.forEach((node) => {
    result.push({ ...node, level: currentLevel });
    if (node.children && node.children.length > 0) {
      result = result.concat(flattenCategoryTree(node.children, currentLevel + 1));
    }
  });
  return result;
}

export function getCategoryDescendants(cats: Category[], targetId: string): string[] {
  if (targetId === "All") return [];
  const targetCat = cats.find((c) => c.id === targetId);
  if (!targetCat) return [targetId];

  let result = [targetCat.id];
  const children = cats.filter((c) => c.parentId === targetCat.id);
  for (const child of children) {
    result = result.concat(getCategoryDescendants(cats, child.id));
  }
  return result;
}