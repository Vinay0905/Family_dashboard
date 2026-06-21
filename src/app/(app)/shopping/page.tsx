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
} from "lucide-react";

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
        })
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

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const unpurchasedItems = selectedList?.shopping_items.filter((i: any) => !i.is_purchased) || [];
  const purchasedItems = selectedList?.shopping_items.filter((i: any) => i.is_purchased) || [];

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
              Coordinate grocery and household shopping lists with the entire family in real-time.
            </p>
          </div>

          {selectedListId && (
            <button
              onClick={() => setStoreMode(true)}
              className="bg-secondary text-on-secondary font-sans text-xs font-bold uppercase tracking-widest py-3 px-6 rounded shadow-[0_0_15px_rgba(0,105,112,0.15)] flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all cursor-pointer shrink-0"
            >
              <Smartphone className="h-4 w-4" />
              Store Mode
            </button>
          )}
        </div>
      )}

      {/* Store Mode Header Banner */}
      {storeMode && (
        <div className="rounded bg-primary p-5 text-white shadow-xl flex items-center justify-between animate-slide-in">
          <div>
            <span className="text-[9px] uppercase font-bold tracking-widest bg-white/20 px-2.5 py-0.5 rounded">
              Store Mode Active (Screen Kept Awake)
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

      {/* Main Grid View */}
      <div className="grid gap-6 md:grid-cols-12">
        {/* Lists Selector Sidebar */}
        {!storeMode && (
          <div className="md:col-span-4 space-y-6">
            {/* Sidebar list selection card */}
            <div className="rounded glass-card p-5 bg-surface-container-lowest border border-primary/10">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-primary mb-3">
                Your Family Lists
              </h3>

              {lists.length === 0 ? (
                <p className="text-xs text-on-surface-variant/50 italic py-2">No lists created yet.</p>
              ) : (
                <div className="space-y-1">
                  {lists.map((l) => {
                    const activeCount = l.shopping_items.filter((i: any) => !i.is_purchased).length;
                    return (
                      <div
                        key={l.id}
                        className={`flex items-center justify-between rounded px-3 py-2 text-xs font-semibold transition-all ${
                          selectedListId === l.id
                            ? "bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_rgba(183,0,79,0.03)]"
                            : "text-on-surface-variant hover:text-primary hover:bg-primary/5 border border-transparent"
                        }`}
                      >
                        <button
                          onClick={() => setSelectedListId(l.id)}
                          className="flex-1 text-left truncate mr-2 font-bold cursor-pointer"
                        >
                          {l.name}
                        </button>
                        <div className="flex items-center gap-2">
                          {activeCount > 0 && (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-primary/15 text-primary border border-primary/20">
                              {activeCount}
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

            {/* Create list form card */}
            <div className="rounded glass-card p-5 bg-surface-container-lowest border border-primary/10">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-3">Create New List</h4>
              <form onSubmit={handleCreateList} className="space-y-3">
                <input
                  type="text"
                  placeholder="e.g. Sunday Groceries"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  className="w-full rounded border border-outline-variant bg-white px-3 py-2 text-xs text-on-surface focus:border-primary focus:outline-none transition-colors"
                  required
                />
                <button 
                  type="submit" 
                  className="w-full bg-primary text-on-primary font-sans text-xs font-bold uppercase tracking-widest py-2 rounded hover:brightness-110 active:scale-95 transition-all shadow-[0_0_10px_rgba(183,0,79,0.1)] cursor-pointer"
                >
                  Create List
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Selected List Items Column */}
        <div className={`md:col-span-8 space-y-6 ${storeMode ? "md:col-span-12 max-w-3xl mx-auto w-full" : ""}`}>
          {selectedListId ? (
            <div className="space-y-6">
              
              {/* Add Item form */}
              {!storeMode && (
                <div className="rounded glass-card p-5 bg-surface-container-lowest border border-primary/10">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-3">Add Item to List</h3>
                  <form onSubmit={handleAddItem} className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Item name (e.g. Organic Milk)"
                        value={itemName}
                        onChange={(e) => setItemName(e.target.value)}
                        className="w-full rounded border border-outline-variant bg-white px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none transition-colors"
                        required
                      />
                    </div>
                    <div className="flex gap-2 sm:w-64">
                      <input
                        type="number"
                        placeholder="Qty"
                        value={quantity || ""}
                        onChange={(e) => setQuantity(Number(e.target.value))}
                        className="w-20 rounded border border-outline-variant bg-white px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none transition-colors"
                        min={0.1}
                        step="any"
                      />
                      <input
                        type="text"
                        placeholder="Unit (e.g. L, kg, pack)"
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                        className="flex-1 rounded border border-outline-variant bg-white px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none transition-colors"
                      />
                    </div>
                    <button 
                      type="submit" 
                      className="bg-primary text-on-primary font-sans text-xs font-bold uppercase tracking-widest px-6 py-2 rounded hover:brightness-110 active:scale-95 transition-all shadow-[0_0_10px_rgba(183,0,79,0.1)] cursor-pointer shrink-0"
                    >
                      Add
                    </button>
                  </form>
                </div>
              )}

              {/* Items List */}
              <div className="space-y-6">
                {/* Active Items */}
                <div className="space-y-2">
                  {unpurchasedItems.length === 0 ? (
                    !storeMode && (
                      <div className="rounded border border-dashed border-primary/10 p-10 text-center text-on-surface-variant/50">
                        <ShoppingBag className="mx-auto h-8 w-8 mb-2 opacity-30" />
                        <p className="text-sm font-medium">All items purchased or list is empty.</p>
                      </div>
                    )
                  ) : (
                    unpurchasedItems.map((item: any) => (
                      <div
                        key={item.id}
                        onClick={() => handleToggleItem(item.id, item.is_purchased)}
                        className={`group flex items-center justify-between rounded border transition-all cursor-pointer ${
                          storeMode
                            ? "p-5 border-primary/20 bg-surface-container-lowest hover:bg-primary/5 active:scale-98"
                            : "p-3 border-outline/10 bg-white hover:bg-primary/[0.02]"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <button
                            type="button"
                            className={`flex items-center justify-center rounded-full border transition-all shrink-0 ${
                              storeMode
                                ? "h-8 w-8 border-primary/45 hover:border-primary text-primary"
                                : "h-5 w-5 border-outline/30 hover:border-primary text-primary"
                            } bg-white`}
                          >
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <Check className={storeMode ? "h-5 w-5" : "h-3.5 w-3.5"} />
                            </span>
                          </button>
                          
                          <span
                            className={`font-heading font-extrabold text-on-surface leading-tight ${
                              storeMode ? "text-lg" : "text-sm"
                            }`}
                          >
                            {item.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-4">
                          <span
                            className={`font-sans font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded ${
                              storeMode ? "text-sm" : "text-xs"
                            }`}
                          >
                            {item.quantity} {item.unit || ""}
                          </span>

                          {!storeMode && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteItem(item.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 text-on-surface-variant/40 hover:text-primary transition-opacity cursor-pointer"
                              title="Delete Item"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Purchased / Crossed Off Section */}
                {purchasedItems.length > 0 && (
                  <div className="space-y-2.5 pt-4 border-t border-primary/10">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-primary/60 px-1">
                      Bought / Crossed Off ({purchasedItems.length})
                    </h4>
                    
                    <div className="space-y-2">
                      {purchasedItems.map((item: any) => (
                        <div
                          key={item.id}
                          onClick={() => handleToggleItem(item.id, item.is_purchased)}
                          className={`group flex items-center justify-between rounded border border-outline/5 bg-surface-container-low/50 p-3 opacity-60 hover:opacity-85 transition-opacity cursor-pointer`}
                        >
                          <div className="flex items-center gap-4">
                            <button
                              type="button"
                              className={`flex items-center justify-center rounded-full border border-primary bg-primary text-white shrink-0 ${
                                storeMode ? "h-8 w-8" : "h-5 w-5"
                              }`}
                            >
                              <Check className={storeMode ? "h-5 w-5" : "h-3.5 w-3.5"} />
                            </button>
                            <span className="text-sm line-through text-on-surface-variant font-medium">
                              {item.name}
                            </span>
                          </div>

                          <div className="flex items-center gap-4">
                            <span className="text-xs text-on-surface-variant/60 font-bold">
                              {item.quantity} {item.unit || ""}
                            </span>

                            {!storeMode && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteItem(item.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 text-on-surface-variant/40 hover:text-primary transition-opacity cursor-pointer"
                                title="Delete Item"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded border border-dashed border-primary/10 p-12 text-center text-on-surface-variant/50">
              <ShoppingCart className="mx-auto h-12 w-12 mb-3 opacity-20 text-primary" />
              <h3 className="font-heading text-lg font-bold text-on-surface">Select or Create a List</h3>
              <p className="text-sm text-on-surface-variant mt-1">Choose an existing shopping list on the left or create a new one to begin.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}