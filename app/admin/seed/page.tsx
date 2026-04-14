"use client";

import { useState } from "react";
import { getAllCategories, saveArticle } from "@/lib/storage";
import type { Article } from "@/lib/types";

export default function SeedPage() {
  const [status, setStatus] = useState("Ready to seed.");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSeed = async () => {
    setIsProcessing(true);
    setStatus("Fetching categories...");
    
    try {
      const categories = await getAllCategories();
      if (categories.length === 0) {
        setStatus("No categories found! Please create some categories first.");
        setIsProcessing(false);
        return;
      }

      setStatus(`Found ${categories.length} categories. Generating articles...`);
      let createdCount = 0;

      // Find leaf categories (categories that are NOT a parent to any other category)
      const leafCategories = categories.filter(
        cat => !categories.some(otherCat => otherCat.parentId === cat.id)
      );

      setStatus(`Found ${leafCategories.length} leaf categories. Generating articles...`);

      for (const cat of leafCategories) {
        // Generate 3 articles for each leaf category
        for (let i = 1; i <= 3; i++) {
          const netPrice = Math.floor(Math.random() * 50) + 10; // Random net price between $10 and $60
          const salesPrice = netPrice + Math.floor(Math.random() * 40) + 20; // Sales price is always higher
          
          const articleId = Date.now().toString(36) + Math.random().toString(36).substring(2);
          
          const article: Article = {
            id: articleId,
            name: `${cat.name} Sample Item ${i}`,
            category: cat.id,
            slogan: `A high-quality product in the ${cat.name.toLowerCase()} collection.`,
            imageUrl: `https://picsum.photos/seed/${articleId}/800/600`, // Random consistent image via Picsum
            netPrice,
            salesPrice,
            vatRatio: 20,
            stock: Math.floor(Math.random() * 100) + 5,
            discounts: [],
            createdAt: new Date().toISOString().split('T')[0],
          };
          
          await saveArticle(article);
          createdCount++;
          setStatus(`Created ${createdCount} articles... (${article.name})`);
        }
      }

      setStatus(`Success! Generated ${createdCount} articles across ${leafCategories.length} leaf categories.`);
    } catch (error: any) {
      console.error(error);
      setStatus(`Error: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="relative z-10 flex-1 flex flex-col max-w-3xl mx-auto w-full p-6 sm:p-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-white leading-tight">Data Seeder</h1>
        <p className="text-sm text-gray-400 font-medium">Generate 3 sample articles with images for every category in your database.</p>
      </div>

      <div className="bg-zinc-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-8 shadow-xl">
        <button
          onClick={handleSeed}
          disabled={isProcessing}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-8 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed mb-6"
        >
          {isProcessing ? "Generating Data..." : "Seed Database Now"}
        </button>

        <div className="p-4 bg-black/50 border border-white/5 rounded-xl">
          <p className="text-sm font-mono text-gray-300 break-words">
            Status: <span className={isProcessing ? "text-blue-400 animate-pulse" : "text-emerald-400"}>{status}</span>
          </p>
        </div>
      </div>
    </div>
  );
}