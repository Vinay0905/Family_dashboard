"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ShoppingCart,
  Plus,
  Trash2,
  Check,
  Smartphone,
  ShoppingBag,
  Loader2,
  X,
  Search,
  ArrowUpDown
} from "lucide-react";

const SECTIONS = [
  { value: "groceries", label: "Groceries", color: "text-emerald-500 border-emerald-500/20" },
  { value: "clothes", label: "Clothes", color: "text-pink-500 border-pink-500/20" },
  { value: "food", label: "Food / Dining", color: "text-amber-500 border-amber-500/20" },
  { value: "electronics", label: "Electronics", color: "text-cyan-500 border-cyan-500/20" },
  { value: "other", label: "Other / General", color: "text-slate-400 border-slate-500/20" }
];

export default function ShoppingPage() {
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [member, setMember] = useState<any>(null);
  
  const [lists, setLists] = useState<any[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>("");
  const [newListName, setNewListName] = useState("");
  
  // Item inputs
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState<number>(1);
  const [unit, setUnit] = useState("");
  const [itemCategory, setItemCategory] = useState("groceries");
  
  // Table filters & sorting
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState<"name" | "quantity" | "created_at">("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Store Mode state
  const [storeMode, setStoreMode] = useState(false);
  const wakeLockRef = useRef<any>(null);

  // Load Initial Data
  useEffect(() => {
    async function loadData() {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;
        setUser(userData.user);

        const { data: memberData } = await supabase
          .from("family_members")
          .select("family_id")
          .eq("user_id", userData.user.id)
          .maybeSingle();

        if (!memberData) return;
        setMember(memberData);

        // Fetch lists
        const { data: listsData } = await supabase
          .from("shopping_lists")
          .select("*, shopping_items(*)")
          .eq("family_id", memberData.family_id)
          .order("created_at");

        if (listsData) {
          setLists(listsData);
          if (listsData.length > 0) {
            setSelectedListId(listsData[0].id);
          }
        }
      } catch (err) {
        console.error("Error loading shopping data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [supabase]);

  // Request/Release WakeLock for Store Mode
  useEffect(() => {
    async function handleWakeLock() {
      if (storeMode) {
        if ("wakeLock" in navigator) {
          try {
            const wakeLock = await (navigator as any).wakeLock.request("screen");
            wakeLockRef.current = wakeLock;
            console.log("Wake Lock active.");
          } catch (err) {
            console.error("Wake Lock request failed:", err);
          }
        }
      } else {
        if (wakeLockRef.current) {
          try {
            await wakeLockRef.current.release();
            wakeLockRef.current = null;
            console.log("Wake Lock released.");
          } catch (err) {
            console.error("Wake Lock release failed:", err);
          }
        }
      }
    }

    handleWakeLock();

    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(console.error);
      }
    };
  }, [storeMode]);

  const selectedList = lists.find((l) => l.id === selectedListId);

  // Actions
  async function handleCreateList(e: React.FormEvent) {
    e.preventDefault();
    if (!newListName.trim() || !user || !member) return;

    try {
      const { data, error } = await supabase
        .from("shopping_lists")
        .insert({
          name: newListName.trim(),
          family_id: member.family_id,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      
      const newList = { ...data, shopping_items: [] };
      setLists([...lists, newList]);
      setSelectedListId(data.id);
      setNewListName("");
    } catch (err) {
      console.error("Failed to create list:", err);
    }
  }

  async function handleDeleteList(listId: string) {
    if (!confirm("Are you sure you want to delete this shopping list?")) return;

    try {
      await supabase.from("shopping_lists").delete().eq("id", listId);
      const remainingLists = lists.filter((l) => l.id !== listId);
      setLists(remainingLists);
      if (remainingLists.length > 0) {
        setSelectedListId(remainingLists[0].id);
      } else {
        setSelectedListId("");
      }
    } catch (err) {
      console.error("Failed to delete list:", err);
    }
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    if (!itemName.trim() || !selectedListId || !user || !member) return;

    try {
      const { data, error } = await supabase
        .from("shopping_items")
        .insert({
          list_id: selectedListId,
          family_id: member.family_id,
          added_by: user.id,
          name: itemName.trim(),
          quantity: quantity || 1,
          unit: unit.trim() || null,
          category: itemCategory
        } as any)
        .select()
        .single();

      if (error) throw error;

      // Update state
      setLists(
        lists.map((l) => {
          if (l.id === selectedListId) {
            return { ...l, shopping_items: [...l.shopping_items, data] };
          }
          return l;
        })
      );

      setItemName("");
      setQuantity(1);
      setUnit("");
      setItemCategory("groceries");
    } catch (err) {
      console.error("Failed to add item:", err);
    }
  }

  async function handleToggleItem(itemId: string, currentStatus: boolean) {
    try {
      await supabase
        .from("shopping_items")
        .update({ is_purchased: !currentStatus })
        .eq("id", itemId);

      setLists(
        lists.map((l) => {
          if (l.id === selectedListId) {
            return {
              ...l,
              shopping_items: l.shopping_items.map((item: any) =>
                item.id === itemId ? { ...item, is_purchased: !currentStatus } : item
              ),
            };
          }
          return l;
        })
      );
    } catch (err) {
      console.error("Failed to toggle item:", err);
    }
  }

  async function handleDeleteItem(itemId: string) {
    try {
      await supabase.from("shopping_items").delete().eq("id", itemId);
      setLists(
        lists.map((l) => {
          if (l.id === selectedListId) {
            return {
              ...l,
              shopping_items: l.shopping_items.filter((item: any) => item.id !== itemId),
            };
          }
          return l;
        })
      );
    } catch (err) {
      console.error("Failed to delete item:", err);
    }
  }

  const toggleSort = (field: "name" | "quantity" | "created_at") => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Rule 15: Green for complete, Yellow for in progress
  const getItemStatus = (item: any) => {
    if (item.is_purchased) {
      return {
        label: "Bought",
        color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
        dotColor: "bg-emerald-500"
      };
    }
    return {
      label: "Pending",
      color: "bg-amber-500/10 text-amber-500 border-amber-500/20",
      dotColor: "bg-amber-500"
    };
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Pre-process, filter and sort items of selected list
  const rawItems = selectedList?.shopping_items || [];
  const processedItems = rawItems
    .filter((item: any) => {
      const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "purchased" && item.is_purchased) ||
        (statusFilter === "pending" && !item.is_purchased);

      return matchSearch && matchStatus;
    })
    .sort((a: any, b: any) => {
      let multiplier = sortDirection === "asc" ? 1 : -1;
      if (sortField === "name") {
        return a.name.localeCompare(b.name) * multiplier;
      } else if (sortField === "quantity") {
        return (Number(a.quantity) - Number(b.quantity)) * multiplier;
      } else {
        // default earliest date first
        return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * multiplier;
      }
    });

  // Group filtered items by section
  const itemsBySection: Record<string, any[]> = {
    groceries: [],
    clothes: [],
    food: [],
    electronics: [],
    other: []
  };

  processedItems.forEach((item: any) => {
    const cat = item.category || "other";
    if (cat in itemsBySection) {
      itemsBySection[cat].push(item);
    } else {
      itemsBySection.other.push(item);
    }
  });

  return (
    <div className={`space-y-8 max-w-5xl mx-auto transition-all ${storeMode ? "pb-32" : ""}`}>
      {/* Header Panel */}
      {!storeMode && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <h1 className="font-heading text-4xl text-on-surface tracking-tight font-extrabold">
              Shopping <span className="text-primary italic">Lists</span>
            </h1>
            <p className="font-sans text-sm text-on-surface-variant mt-2 font-medium">
              Coordinate groceries, clothes, food, and electronics with the family in table view.
            </p>
          </div>

          {selectedListId && (
            <button
              onClick={() => setStoreMode(true)}
              className="bg-secondary text-on-secondary font-sans text-xs font-bold uppercase tracking-widest py-3 px-6 rounded shadow-[0_0_15px_rgba(0,105,112,0.15)] flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all cursor-pointer shrink-0 animate-pulse-slow"
            >
              <Smartphone className="h-4 w-4" />
              Store Mode
            </button>
          )}
        </div>
      )}

      {/* Store Mode Banner */}
      {storeMode && (
        <div className="rounded bg-primary p-5 text-white shadow-xl flex items-center justify-between animate-slide-in">
          <div>
            <span className="text-[9px] uppercase font-bold tracking-widest bg-white/20 px-2.5 py-0.5 rounded">
              Store Mode (Screen Kept Awake)
            </span>
            <h2 className="font-heading text-2xl font-extrabold mt-1.5">{selectedList?.name}</h2>
          </div>
          <button
            onClick={() => setStoreMode(false)}
            className="text-primary bg-white hover:bg-surface font-sans text-xs font-bold uppercase tracking-widest py-2 px-5 rounded active:scale-95 transition-all cursor-pointer shadow-md"
          >
            Exit Mode
          </button>
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="grid gap-6 md:grid-cols-12">
        {/* Lists Sidebar */}
        {!storeMode && (
          <div className="md:col-span-4 space-y-6">
            <div className="rounded glass-card p-5 bg-surface-container-lowest border border-primary/10">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-primary mb-3">
                Family Lists
              </h3>

              {lists.length === 0 ? (
                <p className="text-xs text-on-surface-variant/50 italic py-2">No lists created yet.</p>
              ) : (
                <div className="space-y-1">
                  {lists.map((l) => {
                    const pendingCount = l.shopping_items.filter((i: any) => !i.is_purchased).length;
                    return (
                      <div
                        key={l.id}
                        className={`flex items-center justify-between rounded px-3 py-2 text-xs font-semibold transition-all ${
                          selectedListId === l.id
                            ? "bg-primary/10 text-primary border border-primary/20"
                            : "text-on-surface-variant hover:text-primary hover:bg-primary/5"
                        }`}
                      >
                        <button
                          onClick={() => setSelectedListId(l.id)}
                          className="flex-1 text-left truncate mr-2 font-bold cursor-pointer"
                        >
                          {l.name}
                        </button>
                        <div className="flex items-center gap-2">
                          {pendingCount > 0 && (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-primary/15 text-primary border border-primary/20">
                              {pendingCount}
                            </span>
                          )}
                          <button
                            onClick={() => handleDeleteList(l.id)}
                            className="text-on-surface-variant/40 hover:text-primary transition-colors cursor-pointer"
                            title="Delete List"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Create list form */}
            <div className="rounded glass-card p-5 bg-surface-container-lowest border border-primary/10">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-3">Create List</h4>
              <form onSubmit={handleCreateList} className="space-y-3">
                <input
                  type="text"
                  placeholder="e.g. Weekly Groceries"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  className="w-full rounded border border-outline-variant bg-white px-3 py-2 text-xs text-on-surface focus:border-primary focus:outline-none"
                  required
                />
                <button 
                  type="submit" 
                  className="w-full bg-primary text-on-primary font-sans text-xs font-bold uppercase tracking-widest py-2 rounded hover:brightness-110 active:scale-95 transition-all shadow-sm cursor-pointer"
                >
                  Create List
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Selected List View */}
        <div className={`md:col-span-8 space-y-6 ${storeMode ? "md:col-span-12 max-w-3xl mx-auto w-full" : ""}`}>
          {selectedListId ? (
            <div className="space-y-6">
              
              {/* Add Item form */}
              {!storeMode && (
                <div className="rounded glass-card p-5 bg-surface-container-lowest border border-primary/10">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-3">Add Item</h3>
                  <form onSubmit={handleAddItem} className="space-y-3">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder="Item name (e.g. Bread, T-shirt, iPhone Charger)"
                          value={itemName}
                          onChange={(e) => setItemName(e.target.value)}
                          className="w-full rounded border border-outline-variant bg-white px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                          required
                        />
                      </div>
                      <div className="flex gap-2 sm:w-60">
                        <input
                          type="number"
                          placeholder="Qty"
                          value={quantity || ""}
                          onChange={(e) => setQuantity(Number(e.target.value))}
                          className="w-16 rounded border border-outline-variant bg-white px-2.5 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                          min={0.1}
                          step="any"
                        />
                        <input
                          type="text"
                          placeholder="Unit (e.g. kg, pack)"
                          value={unit}
                          onChange={(e) => setUnit(e.target.value)}
                          className="flex-1 rounded border border-outline-variant bg-white px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-1">
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-primary shrink-0">Section:</label>
                        <select
                          value={itemCategory}
                          onChange={(e) => setItemCategory(e.target.value)}
                          className="rounded border border-outline-variant bg-white px-3 py-1.5 text-xs text-on-surface font-semibold outline-none focus:border-primary transition-all flex-grow sm:flex-none h-8"
                        >
                          {SECTIONS.map((sec) => (
                            <option key={sec.value} value={sec.value}>{sec.label}</option>
                          ))}
                        </select>
                      </div>

                      <button 
                        type="submit" 
                        className="w-full sm:w-auto bg-primary text-on-primary font-sans text-xs font-bold uppercase tracking-widest px-8 py-2 rounded hover:brightness-110 active:scale-95 transition-all shadow-md cursor-pointer shrink-0"
                      >
                        Add Item
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Table search & sort toolbar */}
              {!storeMode && (
                <section className="glass-card rounded p-3 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
                  <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-on-surface-variant/60" />
                    <Input
                      placeholder="Search items..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 bg-surface-container-lowest border-outline-variant text-xs h-8 rounded"
                    />
                  </div>

                  <div className="flex gap-2 w-full sm:w-auto">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="rounded border border-outline-variant bg-surface-container-lowest px-3 py-1 text-xs text-on-surface font-semibold outline-none focus:border-primary transition-all h-8"
                    >
                      <option value="all">All Items</option>
                      <option value="pending">Pending Only</option>
                      <option value="purchased">Bought Only</option>
                    </select>

                    <div className="flex rounded border border-outline-variant bg-surface-container-lowest text-xs h-8 divide-x divide-outline-variant overflow-hidden font-bold">
                      <button 
                        onClick={() => toggleSort("name")}
                        className={`px-3 flex items-center gap-1.5 hover:bg-primary/5 transition-colors ${sortField === "name" ? "text-primary" : "text-on-surface-variant"}`}
                      >
                        Name <ArrowUpDown className="h-3 w-3" />
                      </button>
                      <button 
                        onClick={() => toggleSort("quantity")}
                        className={`px-3 flex items-center gap-1.5 hover:bg-primary/5 transition-colors ${sortField === "quantity" ? "text-primary" : "text-on-surface-variant"}`}
                      >
                        Qty <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </section>
              )}

              {/* Section-Wise Tables Grid */}
              <div className="space-y-8">
                {SECTIONS.map((section) => {
                  const sectionItems = itemsBySection[section.value] || [];
                  if (sectionItems.length === 0) return null;

                  return (
                    <div key={section.value} className="glass-card rounded overflow-hidden border border-primary/5 shadow-sm space-y-3 p-4">
                      {/* Section Title Header */}
                      <h4 className="text-xs font-bold uppercase tracking-wider text-primary border-b border-primary/10 pb-2 flex items-center justify-between">
                        <span>{section.label}</span>
                        <span className="text-[10px] bg-primary/10 text-primary border border-primary/15 px-2 py-0.5 rounded">
                          {sectionItems.length}
                        </span>
                      </h4>

                      {/* Section Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-surface-container-low border-b border-primary/5 font-semibold text-on-surface-variant uppercase tracking-wider">
                              <th className="p-2.5 pl-3 w-10 text-center">Status</th>
                              <th className="p-2.5">Item Name</th>
                              <th className="p-2.5 text-right w-32">Quantity</th>
                              <th className="p-2.5 w-16 text-center">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-surface-container/30">
                            {sectionItems.map((item) => {
                              const statusInfo = getItemStatus(item);

                              return (
                                <tr 
                                  key={item.id} 
                                  onClick={() => handleToggleItem(item.id, item.is_purchased)}
                                  className={`hover:bg-primary/[0.01] transition-colors cursor-pointer ${
                                    item.is_purchased ? "opacity-60" : ""
                                  }`}
                                >
                                  {/* Checkbox / Status dot */}
                                  <td className="p-2.5 pl-3 text-center">
                                    <div className="flex items-center justify-center">
                                      <span 
                                        className={`flex items-center justify-center rounded-full border transition-all ${
                                          item.is_purchased
                                            ? "h-5 w-5 bg-emerald-500 border-emerald-500 text-white"
                                            : storeMode
                                            ? "h-7 w-7 border-primary/40 bg-white"
                                            : "h-4.5 w-4.5 border-outline/30 bg-white"
                                        }`}
                                      >
                                        {item.is_purchased && <Check className="h-3 w-3" />}
                                      </span>
                                    </div>
                                  </td>
                                  
                                  {/* Item Name */}
                                  <td className="p-2.5">
                                    <span className={`font-heading text-sm font-extrabold leading-snug text-on-surface ${
                                      item.is_purchased ? "line-through opacity-70" : ""
                                    }`}>
                                      {item.name}
                                    </span>
                                  </td>

                                  {/* Qty & Unit */}
                                  <td className="p-2.5 text-right font-mono font-bold text-primary">
                                    {item.quantity} {item.unit || ""}
                                  </td>

                                  {/* Actions */}
                                  <td className="p-2.5 text-center">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteItem(item.id);
                                      }}
                                      className="p-1 text-on-surface-variant/40 hover:text-primary hover:bg-primary/10 rounded transition-all cursor-pointer"
                                      title="Delete Item"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}

                {/* If all sections are empty */}
                {processedItems.length === 0 && (
                  <div className="rounded border border-dashed border-primary/10 p-12 text-center text-on-surface-variant/50">
                    <ShoppingBag className="mx-auto h-12 w-12 mb-3 opacity-20 text-primary" />
                    <h3 className="font-heading text-lg font-bold text-on-surface">No Shopping Items</h3>
                    <p className="text-sm text-on-surface-variant mt-1">This shopping list is empty or items match no filters.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded border border-dashed border-primary/10 p-12 text-center text-on-surface-variant/50">
              <ShoppingCart className="mx-auto h-12 w-12 mb-3 opacity-20 text-primary" />
              <h3 className="font-heading text-lg font-bold text-on-surface">Select or Create a List</h3>
              <p className="text-sm text-on-surface-variant mt-1">Choose an existing shopping list on the left to begin.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}