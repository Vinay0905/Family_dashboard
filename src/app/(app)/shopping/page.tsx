/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/lib/store";
import { Input } from "@/components/ui/input";
import {
  ShoppingCart,
  Plus,
  Trash2,
  Check,
  Smartphone,
  ShoppingBag,
  Loader2,
  Search,
  ArrowUpDown,
  MessageSquare,
  Sparkles,
  UserPlus,
  MoreHorizontal
} from "lucide-react";

const SECTIONS = [
  { value: "groceries", label: "Groceries" },
  { value: "clothes", label: "Clothes" },
  { value: "food", label: "Food / Dining" },
  { value: "electronics", label: "Electronics" },
  { value: "other", label: "Other / General" }
];

const SECTION_STYLE: Record<string, { label: string; text: string; bg: string; border: string; dot: string }> = {
  groceries: { label: "Groceries", text: "text-tertiary", bg: "bg-tertiary/10", border: "border-tertiary/20", dot: "bg-tertiary" },
  clothes: { label: "Clothes", text: "text-secondary", bg: "bg-secondary/10", border: "border-secondary/20", dot: "bg-secondary" },
  food: { label: "Food / Dining", text: "text-amber-600 dark:text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20", dot: "bg-amber-500" },
  electronics: { label: "Electronics", text: "text-primary", bg: "bg-primary/10", border: "border-primary/20", dot: "bg-primary" },
  other: { label: "Other / General", text: "text-on-surface-variant", bg: "bg-surface-container-high", border: "border-outline-variant/30", dot: "bg-outline" }
};

export default function NewShoppingPage() {
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [member, setMember] = useState<any>(null);
  
  const [lists, setLists] = useState<any[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>("");
  const [newListName, setNewListName] = useState("");
  const [showNewListForm, setShowNewListForm] = useState(false);
  
  // Item inputs
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState<number>(1);
  const [unit, setUnit] = useState("");
  const [itemCategory, setItemCategory] = useState("groceries");
  
  // Filters & sorting
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState<"name" | "quantity" | "created_at">("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Store Mode state
  const [storeMode, setStoreMode] = useState(false);
  const wakeLockRef = useRef<any>(null);

  // Success Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const { familyId: cachedFamilyId, currentUser: cachedUser, isInitialized, setAppInfo } = useAppStore();

  // Load Initial Data
  useEffect(() => {
    async function loadData() {
      try {
        let activeUser = cachedUser;
        let activeFamilyId = cachedFamilyId;

        if (!isInitialized) {
          const { data: userData } = await supabase.auth.getUser();
          if (!userData.user) return;
          activeUser = userData.user;
          setUser(userData.user);

          const { data: memberData } = await supabase
            .from("family_members")
            .select("family_id, role")
            .eq("user_id", userData.user.id)
            .maybeSingle();

          if (!memberData) return;
          activeFamilyId = memberData.family_id;
          setMember(memberData);

          const { data: membersData } = await supabase
            .from("family_members")
            .select("user_id, display_name, role")
            .eq("family_id", memberData.family_id);

          const { data: family } = await supabase
            .from("families")
            .select("name")
            .eq("id", memberData.family_id)
            .maybeSingle();

          setAppInfo({
            familyId: memberData.family_id,
            familyMembers: membersData ?? [],
            currentUser: userData.user,
            memberRole: memberData.role,
            familyName: family?.name ?? "Family"
          });
        } else {
          setUser(cachedUser);
          setMember({ family_id: cachedFamilyId });
        }

        if (!activeFamilyId) return;

        // Fetch lists
        const { data: listsData } = await supabase
          .from("shopping_lists")
          .select("*, shopping_items(*)")
          .eq("family_id", activeFamilyId)
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
  }, [supabase, cachedFamilyId, cachedUser, isInitialized, setAppInfo]);

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
      setShowNewListForm(false);
      setToastMessage(`Created list "${data.name}"`);
      setTimeout(() => setToastMessage(null), 3000);
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
      setToastMessage("List deleted");
      setTimeout(() => setToastMessage(null), 3000);
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

      setToastMessage(`Added "${itemName.trim()}"`);
      setTimeout(() => setToastMessage(null), 3000);

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

  async function handleClearChecked() {
    if (!selectedListId || !confirm("Clear all bought items from this list?")) return;

    try {
      const { error } = await supabase
        .from("shopping_items")
        .delete()
        .eq("list_id", selectedListId)
        .eq("is_purchased", true);

      if (error) throw error;

      setLists(
        lists.map((l) => {
          if (l.id === selectedListId) {
            return {
              ...l,
              shopping_items: l.shopping_items.filter((item: any) => !item.is_purchased),
            };
          }
          return l;
        })
      );
      setToastMessage("Cleared bought items");
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error("Failed to clear items:", err);
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
      const multiplier = sortDirection === "asc" ? 1 : -1;
      if (sortField === "name") {
        return a.name.localeCompare(b.name) * multiplier;
      } else if (sortField === "quantity") {
        return (Number(a.quantity) - Number(b.quantity)) * multiplier;
      } else {
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

  const totalItems = selectedList?.shopping_items?.length || 0;
  const completedItems = selectedList?.shopping_items?.filter((i: any) => i.is_purchased).length || 0;
  const remainingItems = totalItems - completedItems;

  return (
    <div className={`space-y-6 max-w-7xl mx-auto transition-all duration-300 ${storeMode ? "pb-32" : ""}`}>
      {/* ─── TOAST NOTIFICATION ───────────────────────────────── */}
      {toastMessage && (
        <div className="fixed bottom-24 right-6 md:top-8 md:right-8 bg-tertiary-container text-on-tertiary-container px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 md:slide-in-from-top-5 duration-300 z-50">
          <Check className="h-5 w-5 text-on-tertiary-container bg-tertiary rounded-full p-0.5" />
          <div>
            <p className="font-bold text-sm">Update</p>
            <p className="text-xs opacity-90">{toastMessage}</p>
          </div>
        </div>
      )}

      {/* ─── HEADER PANEL ────────────────────────────────────── */}
      {!storeMode && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl font-extrabold text-on-surface tracking-tight">
              Shopping <span className="text-primary italic">Lists</span>
            </h1>
            <p className="text-xs text-on-surface-variant font-medium mt-1">
              Coordinate groceries, clothes, food, and electronics with the family.
            </p>
          </div>

          {selectedListId && (
            <button
              onClick={() => setStoreMode(true)}
              className="bg-secondary text-on-secondary font-sans text-xs font-bold uppercase tracking-wider py-2.5 px-5 rounded-2xl shadow-md flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all cursor-pointer shrink-0"
            >
              <Smartphone className="h-4 w-4" />
              Store Mode
            </button>
          )}
        </div>
      )}

      {/* ─── STORE MODE BANNER ───────────────────────────────── */}
      {storeMode && (
        <div className="rounded-2xl bg-primary p-5 text-primary-foreground shadow-xl flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-300">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest bg-primary-foreground/20 px-3 py-1 rounded-full">
              Store Mode (Screen Kept Awake)
            </span>
            <h2 className="font-serif text-2xl font-extrabold mt-2">{selectedList?.name}</h2>
          </div>
          <button
            onClick={() => setStoreMode(false)}
            className="text-primary bg-primary-foreground hover:opacity-90 font-sans text-xs font-bold uppercase tracking-wider py-2 px-5 rounded-2xl active:scale-95 transition-all cursor-pointer shadow-md"
          >
            Exit Mode
          </button>
        </div>
      )}

      {/* ─── MOBILE LIST TABS ────────────────────────────────── */}
      {!storeMode && (
        <div className="block md:hidden">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {lists.map((l) => {
              const isSelected = selectedListId === l.id;
              const pendingCount = l.shopping_items.filter((i: any) => !i.is_purchased).length;
              return (
                <button
                  key={l.id}
                  onClick={() => setSelectedListId(l.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap active:scale-95 transition-all border text-xs font-semibold ${
                    isSelected
                      ? "bg-primary text-on-primary border-primary font-bold shadow-sm"
                      : "bg-surface-container text-on-surface-variant border-transparent hover:bg-surface-container-high"
                  }`}
                >
                  <ShoppingCart className="h-3.5 w-3.5" />
                  <span>{l.name}</span>
                  {pendingCount > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                      isSelected ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/10 text-primary"
                    }`}>
                      {pendingCount}
                    </span>
                  )}
                </button>
              );
            })}
            <button
              onClick={() => setShowNewListForm(!showNewListForm)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full whitespace-nowrap bg-secondary text-on-secondary active:scale-95 transition-all text-xs font-semibold shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New List</span>
            </button>
          </div>

          {showNewListForm && (
            <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/30 mt-2 mb-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-2">Create New List</h4>
              <form onSubmit={handleCreateList} className="flex gap-2">
                <input
                  type="text"
                  placeholder="List Name..."
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  className="flex-1 rounded-xl border border-outline-variant/50 bg-surface px-3 py-2 text-xs text-on-surface focus:border-primary focus:outline-none"
                  required
                />
                <button
                  type="submit"
                  className="bg-primary text-on-primary text-xs font-bold px-4 py-2 rounded-xl hover:opacity-90 active:scale-95 transition-all"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewListForm(false)}
                  className="bg-surface-container-high text-on-surface-variant text-xs font-bold px-3 py-2 rounded-xl hover:opacity-95 active:scale-95"
                >
                  Cancel
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* ─── MAIN GRID LAYOUT ────────────────────────────────── */}
      <div className="grid gap-6 md:grid-cols-12 items-start">
        
        {/* DESKTOP LISTS SIDEBAR */}
        {!storeMode && (
          <aside className="hidden md:flex md:col-span-4 flex-col gap-4">
            <div className="rounded-2xl glass-card p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  Family Lists
                </h3>
              </div>

              {lists.length === 0 ? (
                <p className="text-xs text-on-surface-variant/60 italic py-2">No lists created yet.</p>
              ) : (
                <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                  {lists.map((l) => {
                    const isSelected = selectedListId === l.id;
                    const pendingCount = l.shopping_items.filter((i: any) => !i.is_purchased).length;
                    const itemsSummary = l.shopping_items.slice(0, 3).map((i: any) => i.name).join(", ");
                    
                    return (
                      <div
                        key={l.id}
                        className={`w-full text-left p-3.5 rounded-xl transition-all duration-200 group flex items-start justify-between cursor-pointer border ${
                          isSelected
                            ? "bg-surface-container-lowest border-primary/45 shadow-xs"
                            : "border-transparent hover:bg-surface-container-high"
                        }`}
                        onClick={() => setSelectedListId(l.id)}
                      >
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="flex justify-between items-center mb-1 gap-2">
                            <span className={`text-xs truncate ${isSelected ? "text-primary font-bold" : "text-on-surface font-semibold"}`}>
                              {l.name}
                            </span>
                            {pendingCount > 0 && (
                              <span className={`text-[9px] shrink-0 px-2 py-0.5 rounded-full font-bold ${
                                isSelected ? "bg-primary/10 text-primary" : "bg-surface-container-highest text-on-surface-variant"
                              }`}>
                                {pendingCount} left
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-on-surface-variant truncate">
                            {itemsSummary || <span className="italic opacity-50 text-[10px]">Empty list</span>}
                          </p>
                        </div>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteList(l.id);
                          }}
                          className="text-on-surface-variant/40 hover:text-secondary transition-colors cursor-pointer p-1 shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 rounded-lg"
                          title="Delete List"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Create list inline form */}
              <div className="pt-3 border-t border-outline-variant/30">
                {showNewListForm ? (
                  <form onSubmit={handleCreateList} className="space-y-3">
                    <input
                      type="text"
                      placeholder="e.g. Weekly Groceries"
                      value={newListName}
                      onChange={(e) => setNewListName(e.target.value)}
                      className="w-full rounded-xl border border-outline-variant/50 bg-surface px-3 py-2 text-xs text-on-surface focus:border-primary focus:outline-none"
                      required
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="flex-1 bg-primary text-on-primary font-sans text-[11px] font-bold uppercase tracking-wider py-2 rounded-xl hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowNewListForm(false)}
                        className="flex-1 bg-surface-container-high text-on-surface-variant font-sans text-[11px] font-bold uppercase tracking-wider py-2 rounded-xl hover:opacity-95 active:scale-95 transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => setShowNewListForm(true)}
                    className="w-full py-2.5 px-4 bg-secondary text-on-secondary rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm hover:opacity-90 active:scale-[0.98] transition-all text-xs"
                  >
                    <Plus className="h-4 w-4" />
                    New List
                  </button>
                )}
              </div>
            </div>

            {/* Pro Tip Card */}
            <div className="bg-tertiary-container text-on-tertiary-container p-4 rounded-2xl relative overflow-hidden shadow-sm">
              <div className="relative z-10">
                <p className="font-bold text-xs flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-on-tertiary-container animate-pulse" />
                  Pro Tip
                </p>
                <p className="text-[11px] mt-1 opacity-90 leading-relaxed">
                  Enter <strong>Store Mode</strong> to keep your screen awake and use large checkboxes while walking around the supermarket!
                </p>
              </div>
            </div>
          </aside>
        )}

        {/* SELECTED LIST DETAILED VIEW */}
        <div className={`space-y-6 ${storeMode ? "md:col-span-12 max-w-3xl mx-auto w-full" : "md:col-span-8"}`}>
          {selectedListId ? (
            <div className="space-y-6">
              
              {/* Detailed List Header Info */}
              {!storeMode && (
                <div className="glass-card rounded-2xl p-5 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-1">
                      <ShoppingBag className="h-4 w-4" />
                      <span>Grocery List</span>
                    </div>
                    <h2 className="font-serif text-xl font-bold text-on-surface">{selectedList?.name}</h2>
                    <p className="text-[11px] text-on-surface-variant mt-0.5">
                      Coordinate with family members • {totalItems} items total
                    </p>
                  </div>
                  <div className="flex gap-2 w-full md:w-auto shrink-0 justify-end">
                    {completedItems > 0 && (
                      <button
                        onClick={handleClearChecked}
                        className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-outline-variant/50 hover:bg-surface-container-high transition-colors font-semibold text-xs text-on-surface-variant cursor-pointer"
                      >
                        Clear Checked
                      </button>
                    )}
                    <button className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-outline-variant/50 hover:bg-surface-container-high transition-colors font-semibold text-xs text-on-surface-variant cursor-pointer">
                      <UserPlus className="h-3.5 w-3.5" /> Share
                    </button>
                    <button className="flex items-center justify-center p-2 rounded-xl border border-outline-variant/50 hover:bg-surface-container-high transition-colors font-semibold text-xs text-on-surface-variant cursor-pointer">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Bento Style Stats / Hero */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-tertiary-container text-on-tertiary-container p-5 rounded-2xl flex flex-col justify-between h-28 relative overflow-hidden shadow-sm">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">Remaining</p>
                    <p className="font-serif text-2xl font-extrabold mt-1">{remainingItems} Items</p>
                  </div>
                  <ShoppingBag className="absolute -right-2 -bottom-2 h-20 w-20 opacity-10 pointer-events-none" />
                </div>
                <div className="bg-secondary-container text-on-secondary-container p-5 rounded-2xl flex flex-col justify-between h-28 relative overflow-hidden shadow-sm">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">Bought</p>
                    <p className="font-serif text-2xl font-extrabold mt-1">
                      {completedItems} / {totalItems}
                    </p>
                  </div>
                  <ShoppingCart className="absolute -right-2 -bottom-2 h-20 w-20 opacity-10 pointer-events-none" />
                </div>
              </div>

              {/* Add Item form */}
              {!storeMode && (
                <div className="rounded-2xl glass-card p-5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-3">Add Item</h3>
                  <form onSubmit={handleAddItem} className="space-y-4">
                    <div className="flex flex-col lg:flex-row gap-4 items-end">
                      <div className="flex-1 w-full relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant">
                          <ShoppingCart className="h-4 w-4" />
                        </span>
                        <input
                          type="text"
                          placeholder={`Add item to ${selectedList?.name}...`}
                          value={itemName}
                          onChange={(e) => setItemName(e.target.value)}
                          className="w-full pl-11 pr-4 py-2.5 bg-surface border border-outline-variant/60 rounded-xl text-xs focus:border-primary focus:ring-primary focus:outline-none transition-all placeholder:text-on-surface-variant/50 text-on-surface"
                          required
                        />
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto shrink-0 justify-end">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-outline uppercase mb-1">Qty</span>
                          <input
                            type="number"
                            placeholder="1"
                            value={quantity || ""}
                            onChange={(e) => setQuantity(Number(e.target.value))}
                            className="w-16 p-2 text-center bg-surface border border-outline-variant/60 rounded-xl text-xs focus:border-primary focus:ring-primary focus:outline-none text-on-surface"
                            min={0.1}
                            step="any"
                          />
                        </div>
                        
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-outline uppercase mb-1">Unit</span>
                          <input
                            type="text"
                            placeholder="pcs, kg, bag"
                            value={unit}
                            onChange={(e) => setUnit(e.target.value)}
                            className="w-24 p-2 bg-surface border border-outline-variant/60 rounded-xl text-xs focus:border-primary focus:ring-primary focus:outline-none text-on-surface"
                          />
                        </div>
                        
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-outline uppercase mb-1">Section</span>
                          <select
                            value={itemCategory}
                            onChange={(e) => setItemCategory(e.target.value)}
                            className="w-32 p-2 bg-surface border border-outline-variant/60 rounded-xl text-xs focus:border-primary focus:ring-primary focus:outline-none font-semibold text-on-surface"
                          >
                            {SECTIONS.map((sec) => (
                              <option key={sec.value} value={sec.value}>{sec.label}</option>
                            ))}
                          </select>
                        </div>

                        <button
                          type="submit"
                          className="h-9 px-5 bg-primary text-on-primary rounded-xl shadow-md hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer font-bold mt-5 text-xs"
                        >
                          <Plus className="h-3.5 w-3.5" /> Add
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}

              {/* Table search & sort toolbar */}
              {!storeMode && (
                <section className="glass-card rounded-2xl p-3 flex flex-col sm:flex-row gap-3 items-center justify-between">
                  <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-on-surface-variant/60" />
                    <Input
                      placeholder="Search items..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 bg-surface-container-lowest border-outline-variant/50 text-xs h-9 rounded-xl focus-visible:ring-primary"
                    />
                  </div>

                  <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="rounded-xl border border-outline-variant/60 bg-surface-container-lowest px-3 py-1 text-xs text-on-surface font-semibold outline-none focus:border-primary transition-all h-9"
                    >
                      <option value="all">All Items</option>
                      <option value="pending">Pending Only</option>
                      <option value="purchased">Bought Only</option>
                    </select>

                    <div className="flex rounded-xl border border-outline-variant/60 bg-surface-container-lowest text-xs h-9 divide-x divide-outline-variant/40 overflow-hidden font-bold">
                      <button 
                        onClick={() => toggleSort("name")}
                        className={`px-3.5 flex items-center gap-1.5 hover:bg-primary/5 transition-colors ${sortField === "name" ? "text-primary" : "text-on-surface-variant"}`}
                      >
                        Name <ArrowUpDown className="h-3 w-3" />
                      </button>
                      <button 
                        onClick={() => toggleSort("quantity")}
                        className={`px-3.5 flex items-center gap-1.5 hover:bg-primary/5 transition-colors ${sortField === "quantity" ? "text-primary" : "text-on-surface-variant"}`}
                      >
                        Qty <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </section>
              )}

              {/* Section-Wise items */}
              <div className="space-y-6">
                {SECTIONS.map((section) => {
                  const sectionItems = itemsBySection[section.value] || [];
                  if (sectionItems.length === 0) return null;
                  const sectionStyle = SECTION_STYLE[section.value] || SECTION_STYLE.other;

                  return (
                    <div key={section.value} className="space-y-2.5">
                      {/* Section Title Header */}
                      <h4 className={`text-xs font-bold uppercase tracking-wider ${sectionStyle.text} flex items-center justify-between px-1`}>
                        <span className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${sectionStyle.dot}`}></span>
                          {sectionStyle.label}
                        </span>
                        <span className={`text-[10px] ${sectionStyle.bg} ${sectionStyle.text} border ${sectionStyle.border} px-2 py-0.5 rounded-full font-bold`}>
                          {sectionItems.length} {sectionItems.length === 1 ? "item" : "items"}
                        </span>
                      </h4>

                      {/* Items List */}
                      <div className="grid gap-2">
                        {sectionItems.map((item) => {
                          return (
                            <div 
                              key={item.id} 
                              onClick={() => handleToggleItem(item.id, item.is_purchased)}
                              className={`glass-card border border-outline-variant/15 rounded-2xl p-4 flex items-center justify-between gap-4 group hover:bg-surface-container-low transition-all duration-200 cursor-pointer active:scale-[0.995] ${
                                item.is_purchased ? "opacity-60" : ""
                              }`}
                            >
                              {/* Checkbox / Status dot */}
                              <div className="flex items-center gap-4 min-w-0 flex-1">
                                <div className="relative flex items-center justify-center shrink-0" onClick={(e) => e.stopPropagation()}>
                                  <input 
                                    type="checkbox"
                                    checked={item.is_purchased}
                                    onChange={() => handleToggleItem(item.id, item.is_purchased)}
                                    className={`peer rounded-lg border-2 border-outline-variant text-primary focus:ring-primary bg-surface-container-low cursor-pointer transition-all ${
                                      storeMode ? "h-7 w-7" : "h-5.5 w-5.5"
                                    }`}
                                  />
                                  <Check className={`absolute text-primary-foreground pointer-events-none scale-0 peer-checked:scale-100 transition-transform duration-200 ${
                                    storeMode ? "h-5 w-5" : "h-3.5 w-3.5"
                                  }`} />
                                </div>
                                
                                {/* Item Name */}
                                <div className="min-w-0">
                                  <p className={`font-semibold text-sm leading-snug text-on-surface truncate ${
                                    item.is_purchased ? "line-through text-on-surface-variant opacity-70" : ""
                                  }`}>
                                    {item.name}
                                  </p>
                                </div>
                              </div>

                              {/* Qty & Actions */}
                              <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center bg-surface-container rounded-xl border border-outline-variant/30 px-3 py-1 text-xs">
                                  <span className="font-bold text-primary">{item.quantity}</span>
                                  {item.unit && <span className="text-on-surface-variant ml-1 font-semibold">{item.unit}</span>}
                                </div>

                                <button
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="p-1.5 text-on-surface-variant/40 hover:text-secondary hover:bg-secondary/10 rounded-xl transition-all cursor-pointer md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 shrink-0"
                                  title="Delete Item"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Empty State */}
                {processedItems.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-outline-variant/60 p-12 text-center text-on-surface-variant/55 bg-surface-container-low/40">
                    <ShoppingBag className="mx-auto h-12 w-12 mb-3 opacity-25 text-primary" />
                    <h3 className="font-heading text-base font-bold text-on-surface">No Shopping Items</h3>
                    <p className="text-xs text-on-surface-variant mt-1.5 max-w-xs mx-auto">
                      This list is empty or matches no filters. Start adding items using the form above!
                    </p>
                  </div>
                )}
              </div>

              {/* Collaborative Note Card */}
              {processedItems.length > 0 && (
                <div className="bg-surface-container-low border border-outline-variant/30 p-4 rounded-2xl flex items-center gap-3 shadow-xs">
                  <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                    FM
                  </div>
                  <div className="flex-grow min-w-0">
                    <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Family Collaboration</p>
                    <p className="text-xs font-medium italic text-on-surface-variant mt-0.5 truncate">
                      &quot;Remember, anyone in the family can add, update or check off items in real-time!&quot;
                    </p>
                  </div>
                  <MessageSquare className="h-4 w-4 text-on-surface-variant/40 shrink-0" />
                </div>
              )}

            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-outline-variant/60 p-12 text-center text-on-surface-variant/55 bg-surface-container-low/40">
              <ShoppingCart className="mx-auto h-12 w-12 mb-3 opacity-25 text-primary" />
              <h3 className="font-heading text-base font-bold text-on-surface">Select or Create a List</h3>
              <p className="text-xs text-on-surface-variant mt-1.5 max-w-xs mx-auto">
                Choose an existing shopping list from the options or create a new one to start coordinating.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
