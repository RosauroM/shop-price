"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getAllCategories, saveCategory, deleteCategory } from "@/lib/storage";
import { useAuth } from "@/app/providers";
import { ShopLogo } from "@/app/components/ShopLogo";
import type { Category } from "@/lib/types";

export default function CategoriesPage() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");

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

  if (loading || !user) return null;

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const name = newCategoryName.trim();
    if (!name) return setError("Category name is required.");

    // Check if category already exists (case-insensitive)
    if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      return setError("This category already exists.");
    }

    setIsSubmitting(true);
    try {
      const newCategory: Category = {
        id: Date.now().toString(36) + Math.random().toString(36).substring(2),
        name,
      };
      await saveCategory(newCategory);
      setCategories([...categories, newCategory]);
      setNewCategoryName("");
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

    // Check if category already exists (case-insensitive) and it's not the same one
    if (categories.some((c) => c.id !== id && c.name.toLowerCase() === name.toLowerCase())) {
      return setError("This category already exists.");
    }

    try {
      const updatedCategory: Category = { id, name };
      await saveCategory(updatedCategory);
      setCategories(categories.map((c) => (c.id === id ? updatedCategory : c)));
      setEditingCategoryId(null);
      setEditingCategoryName("");
    } catch (err: any) {
      setError(err.message || "Failed to edit category.");
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;
    try {
      await deleteCategory(id);
      setCategories(categories.filter((c) => c.id !== id));
    } catch (err: any) {
      alert("Failed to delete category: " + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-black text-gray-100 flex flex-col relative selection:bg-blue-500/30 selection:text-blue-200 font-sans">
      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-600/10 rounded-full blur-[120px] mix-blend-screen" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col max-w-5xl mx-auto w-full p-6 sm:p-10">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12 bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-md">
          <div className="flex items-center gap-4">
            <Link href="/admin/dashboard" className="hover:opacity-80 transition-opacity">
              <ShopLogo size="md" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white leading-tight">Categories</h1>
              <p className="text-sm text-gray-400 font-medium">Manage product categories</p>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <Link
              href="/admin/dashboard"
              className="hidden sm:inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold px-4 py-2 rounded-full transition-all duration-200"
            >
              Back to Dashboard
            </Link>
            <button
              onClick={() => signOut()}
              className="text-xs font-bold uppercase tracking-widest text-red-400 hover:text-red-300 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Column: Add New Category Form */}
          <div className="md:col-span-1">
            <div className="bg-zinc-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6 shadow-xl sticky top-6">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-400 mb-6">
                Add Category
              </h2>

              {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium flex items-start gap-3">
                  <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {error}
                </div>
              )}

              <form onSubmit={handleAddCategory} className="space-y-4">
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

          {/* Right Column: Categories List */}
          <div className="md:col-span-2">
            <div className="bg-zinc-900/50 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-6 border-b border-white/5 bg-black/20">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">
                  Existing Categories ({categories.length})
                </h2>
              </div>
              
              {categories.length === 0 ? (
                <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                  <svg className="w-12 h-12 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <p className="font-medium text-lg text-gray-300">No categories yet</p>
                  <p className="text-sm mt-1">Use the form to create your first category.</p>
                </div>
              ) : (
                <ul className="divide-y divide-white/5">
                  {categories.map((category) => (
                    <li key={category.id} className="flex items-center justify-between p-5 hover:bg-white/5 transition-colors">
                      {editingCategoryId === category.id ? (
                        <div className="flex-1 flex items-center gap-3">
                          <input
                            type="text"
                            value={editingCategoryName}
                            onChange={(e) => setEditingCategoryName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleEditCategory(category.id);
                              if (e.key === "Escape") setEditingCategoryId(null);
                            }}
                            autoFocus
                            className="bg-white/5 border border-white/10 text-white text-sm font-medium px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all placeholder:text-gray-600 w-full max-w-sm"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                          </div>
                          <span className="font-bold text-white">{category.name}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2">
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
                        ) : (
                          <>
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
    </div>
  );
}