"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getAllCategories, saveCategory, deleteCategory } from "@/lib/storage";
import { useCategoryData } from "@/hooks/useCategoryData";
import { useAuth } from "@/app/providers";
import { ShopLogo } from "@/components/ShopLogo";
import type { Category, CategoryNode } from "@/lib/types";

export default function CategoriesPage() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryParentId, setNewCategoryParentId] = useState<string>("");
  const [newCategoryCustomParent, setNewCategoryCustomParent] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [collapsedCategoryIds, setCollapsedCategoryIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [reparentingCategoryId, setReparentingCategoryId] = useState<string | null>(null);
  const [newParentId, setNewParentId] = useState<string>("");
  const [newParentCustomName, setNewParentCustomName] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/admin");
  }, [loading, user, router]);

  useEffect(() => {
    async function loadCategories() {
      const data = await getAllCategories();
      setCategories(data);
    }
    if (user) loadCategories();
  }, [user]);



  const { categoryTree, flattenedCategories } = useCategoryData({ categories });

  if (loading || !user) return null;

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const name = newCategoryName.trim();
    if (!name) return setError("Category name is required.");

    let parentIdToUse = newCategoryParentId || null;

    setIsSubmitting(true);

    // If "custom" parent is selected, create that parent first
    if (newCategoryParentId === "custom") {
      const customParentName = newCategoryCustomParent.trim();
      if (!customParentName) {
        setIsSubmitting(false);
        return setError("Custom parent name is required.");
      }

      // Check if custom parent already exists at top level
      const existingParent = categories.find(c => c.name.toLowerCase() === customParentName.toLowerCase() && c.parentId === null);
      if (existingParent) {
        parentIdToUse = existingParent.id;
      } else {
        // Create the new parent category
        const newParentCat: Category = {
          id: Date.now().toString(36) + Math.random().toString(36).substring(2),
          name: customParentName,
          parentId: null,
        };
        try {
          await saveCategory(newParentCat);
          // Manually push to state immediately so we can reference it, though we will setCategories fully below
          categories.push(newParentCat);
          parentIdToUse = newParentCat.id;
        } catch (err: any) {
          setIsSubmitting(false);
          return setError("Failed to create custom parent category.");
        }
      }
    }

    if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase() && c.parentId === parentIdToUse)) {
      setIsSubmitting(false);
      return setError("This category already exists under the selected parent.");
    }

    try {
      const newCategory: Category = {
        id: Date.now().toString(36) + Math.random().toString(36).substring(2),
        name,
        parentId: parentIdToUse,
      };
      await saveCategory(newCategory);
      setCategories([...categories, newCategory]);
      setNewCategoryName("");
      setNewCategoryParentId("");
      setNewCategoryCustomParent("");
    } catch (err: any) {
      setError(err.message || "Failed to add category.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditCategory = async (id: string) => {
    setError("");
    const name = editingCategoryName.trim();
    if (!name) return setError("Category name is required.");

    const originalCategory = categories.find(c => c.id === id);
    if (!originalCategory) return setError("Category not found.");

    if (categories.some((c) => c.id !== id && c.name.toLowerCase() === name.toLowerCase() && c.parentId === originalCategory.parentId)) {
      return setError("This category already exists under the same parent.");
    }

    try {
      const updatedCategory: Category = { id, name, parentId: originalCategory.parentId };
      await saveCategory(updatedCategory);
      setCategories(categories.map((c) => (c.id === id ? updatedCategory : c)));
      setEditingCategoryId(null);
      setEditingCategoryName("");
    } catch (err: any) {
      setError(err.message || "Failed to edit category.");
    }
  };

  const handleSetParent = async (id: string) => {
    setError("");
    const originalCategory = categories.find(c => c.id === id);
    if (!originalCategory) return setError("Category not found.");

    let parentIdToUse = newParentId || null;

    if (newParentId === "custom") {
      const customParentName = newParentCustomName.trim();
      if (!customParentName) {
        return setError("Custom parent name is required.");
      }

      const existingParent = categories.find(c => c.name.toLowerCase() === customParentName.toLowerCase() && c.parentId === null);
      if (existingParent) {
        parentIdToUse = existingParent.id;
      } else {
        const newParentCat: Category = {
          id: Date.now().toString(36) + Math.random().toString(36).substring(2),
          name: customParentName,
          parentId: null,
        };
        try {
          await saveCategory(newParentCat);
          categories.push(newParentCat);
          parentIdToUse = newParentCat.id;
        } catch (err: any) {
          return setError("Failed to create custom parent category.");
        }
      }
    }

    if (id === parentIdToUse) {
      return setError("A category cannot be its own parent.");
    }

    // Basic cycle detection (prevent parent becoming child of its own child)
    let currentParent = parentIdToUse;
    while (currentParent) {
      if (currentParent === id) {
         return setError("Cannot set a child category as a parent.");
      }
      const parentCat = categories.find(c => c.id === currentParent);
      currentParent = parentCat?.parentId || "";
    }

    if (categories.some((c) => c.id !== id && c.name.toLowerCase() === originalCategory.name.toLowerCase() && c.parentId === parentIdToUse)) {
      return setError("This category already exists under the selected parent.");
    }

    try {
      const updatedCategory: Category = { ...originalCategory, parentId: parentIdToUse };
      await saveCategory(updatedCategory);
      setCategories(categories.map((c) => (c.id === id ? updatedCategory : c)));
      setReparentingCategoryId(null);
      setNewParentId("");
      setNewParentCustomName("");
    } catch (err: any) {
      setError(err.message || "Failed to change parent.");
    }
  };

  const handleDeleteCategory = async (id: string) => {
    // Check if it has children
    const hasChildren = categories.some(c => c.parentId === id);
    if (hasChildren) {
      alert("Cannot delete this category because it has sub-categories. Please delete or reassign them first.");
      return;
    }

    if (!confirm("Are you sure you want to delete this category?")) return;
    try {
      await deleteCategory(id);
      setCategories(categories.filter((c) => c.id !== id));
    } catch (err: any) {
      alert("Failed to delete category: " + err.message);
    }
  };

  const flattenTreeForView = (tree: CategoryNode[], level = 0): CategoryNode[] => {
    let result: CategoryNode[] = [];
    for (const node of tree) {
      result.push({ ...node, level });
      if (!collapsedCategoryIds.has(node.id) && node.children && node.children.length > 0) {
        result = result.concat(flattenTreeForView(node.children, level + 1));
      }
    }
    return result;
  };

  const displayCategories = flattenTreeForView(categoryTree);

  const toggleCollapse = (id: string) => {
    const newSet = new Set(collapsedCategoryIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setCollapsedCategoryIds(newSet);
  };



  const getDescendantIds = (cats: Category[], parentId: string): string[] => {
    let ids: string[] = [];
    const children = cats.filter(c => c.parentId === parentId);
    for (const child of children) {
      ids.push(child.id);
      ids = ids.concat(getDescendantIds(cats, child.id));
    }
    return ids;
  };

  return (
    <>
      <div className="relative z-10 flex-1 flex flex-col max-w-5xl mx-auto w-full p-6 sm:p-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-white leading-tight">Categories</h1>
          <p className="text-sm text-gray-400 font-medium">Manage product categories</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1">
            <div className="bg-zinc-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6 shadow-xl sticky top-6">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-400 mb-6">
                Add Category
              </h2>

              {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium flex items-start gap-3">
                  {error}
                </div>
              )}

              <form onSubmit={handleAddCategory} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
                    Parent Category
                  </label>
                  <select
                    value={newCategoryParentId}
                    onChange={(e) => setNewCategoryParentId(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 text-white text-sm font-medium px-4 py-3 rounded-xl focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all appearance-none"
                  >
                    <option value="" className="bg-zinc-900 text-white">None (Top Level)</option>
                    <option value="custom" className="bg-zinc-900 text-purple-400 font-bold">+ Create New Parent...</option>
                    {flattenedCategories.map(cat => (
                      <option key={cat.id} value={cat.id} className="bg-zinc-900 text-white">
                        {"\u00A0\u00A0".repeat(cat.level)}{cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                {newCategoryParentId === "custom" && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-purple-400 mb-2">
                      New Parent Name
                    </label>
                    <input
                      type="text"
                      value={newCategoryCustomParent}
                      onChange={(e) => setNewCategoryCustomParent(e.target.value)}
                      placeholder="e.g. Computers"
                      required
                      className="w-full bg-purple-500/5 border border-purple-500/20 text-white text-sm font-medium px-4 py-3 rounded-xl focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all placeholder:text-gray-600"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
                    Category Name
                  </label>
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="e.g. Electronics"
                    required
                    className="w-full bg-white/5 border border-white/10 text-white text-sm font-medium px-4 py-3 rounded-xl focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all placeholder:text-gray-600"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Saving..." : "Add Category"}
                </button>
              </form>
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="bg-zinc-900/50 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-6 border-b border-white/5 bg-black/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">
                    Existing Categories ({categories.length})
                  </h2>
                </div>
              </div>
              
              {categories.length === 0 ? (
                <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                  <p className="font-medium text-lg text-gray-300">No categories yet</p>
                  <p className="text-sm mt-1">Use the form to create your first category.</p>
                </div>
              ) : (
                <ul className="divide-y divide-white/5">
                  {displayCategories.map((category) => (
                    <li key={category.id} className={`flex items-center justify-between p-5 transition-colors hover:bg-white/5`}>
                      <div className="flex items-center gap-3 flex-1">
                        <div className="flex-1 flex items-center gap-2" style={{ paddingLeft: `${category.level * 24}px` }}>
                          {editingCategoryId === category.id ? (
                            <div className="flex gap-2 flex-1">
                              <input
                                type="text"
                                value={editingCategoryName}
                                onChange={(e) => setEditingCategoryName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleEditCategory(category.id);
                                  if (e.key === "Escape") setEditingCategoryId(null);
                                }}
                                autoFocus
                                className="flex-1 bg-white/5 border border-white/10 text-white text-sm font-medium px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all placeholder:text-gray-600"
                              />
                            </div>
                          ) : reparentingCategoryId === category.id ? (
                            <div className="flex gap-2 flex-1 items-center">
                              <div className="flex flex-col gap-1 w-full max-w-[200px]">
                                <select
                                  value={newParentId}
                                  onChange={(e) => setNewParentId(e.target.value)}
                                  className="w-full bg-white/5 border border-white/10 text-white text-sm font-medium px-3 py-2 rounded-lg focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all appearance-none"
                                >
                                  <option value="" className="bg-zinc-900 text-white">None (Top Level)</option>
                                  <option value="custom" className="bg-zinc-900 text-purple-400 font-bold">+ Create New Parent...</option>
                                  {flattenedCategories
                                    .filter(c => c.id !== category.id)
                                    .map(cat => (
                                    <option key={cat.id} value={cat.id} className="bg-zinc-900 text-white">
                                      {"\u00A0\u00A0".repeat(cat.level)}{cat.name}
                                    </option>
                                  ))}
                                </select>
                                {newParentId === "custom" && (
                                  <input
                                    type="text"
                                    value={newParentCustomName}
                                    onChange={(e) => setNewParentCustomName(e.target.value)}
                                    placeholder="New parent name..."
                                    className="w-full bg-purple-500/5 border border-purple-500/20 text-white text-xs font-medium px-3 py-1.5 rounded-lg focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all placeholder:text-gray-600 animate-in fade-in slide-in-from-top-1"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") handleSetParent(category.id);
                                      if (e.key === "Escape") setReparentingCategoryId(null);
                                    }}
                                  />
                                )}
                              </div>
                              <span className="font-bold text-white shrink-0">{category.name}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              {category.level > 0 && (
                                <div className="w-4 h-4 border-b-2 border-l-2 border-white/10 rounded-bl-lg -mt-4 mr-1 shrink-0"></div>
                              )}
                              {category.children && category.children.length > 0 ? (
                                <button
                                  onClick={() => toggleCollapse(category.id)}
                                  className="w-4 h-4 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded text-gray-400 hover:text-white transition-colors"
                                >
                                  {collapsedCategoryIds.has(category.id) ? (
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                    </svg>
                                  ) : (
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
                                    </svg>
                                  )}
                                </button>
                              ) : (
                                <div className="w-4 h-4" />
                              )}
                              <span className="font-bold text-white">{category.name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        {editingCategoryId === category.id ? (
                          <>
                            <button
                              onClick={() => handleEditCategory(category.id)}
                              className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 hover:text-emerald-300 transition-colors px-3 py-2 rounded-lg hover:bg-emerald-500/10"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingCategoryId(null)}
                              className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-gray-300 transition-colors px-3 py-2 rounded-lg hover:bg-white/5"
                            >
                              Cancel
                            </button>
                          </>
                        ) : reparentingCategoryId === category.id ? (
                          <>
                            <button
                              onClick={() => handleSetParent(category.id)}
                              className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 hover:text-emerald-300 transition-colors px-3 py-2 rounded-lg hover:bg-emerald-500/10"
                            >
                              Save Parent
                            </button>
                            <button
                              onClick={() => setReparentingCategoryId(null)}
                              className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-gray-300 transition-colors px-3 py-2 rounded-lg hover:bg-white/5"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setReparentingCategoryId(category.id);
                                setNewParentId(category.parentId || "");
                              }}
                              className="text-[10px] font-bold uppercase tracking-widest text-purple-400 hover:text-purple-300 transition-colors px-3 py-2 rounded-lg hover:bg-purple-500/10"
                            >
                              Set Parent
                            </button>
                            <button
                              onClick={() => {
                                setEditingCategoryId(category.id);
                                setEditingCategoryName(category.name);
                              }}
                              className="text-[10px] font-bold uppercase tracking-widest text-blue-400 hover:text-blue-300 transition-colors px-3 py-2 rounded-lg hover:bg-blue-500/10"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(category.id)}
                              className="text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-red-400 transition-colors px-3 py-2 rounded-lg hover:bg-red-500/10"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
