"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Phone,
  Mail,
  User,
  Plus,
  Trash2,
  HeartPulse,
  GraduationCap,
  Flame,
  Droplets,
  Car,
  HelpCircle,
  Search,
  ChevronRight,
  MapPin,
  FileText,
  Paperclip,
  Calendar,
  X,
  PhoneCall,
  Copy,
  Check,
  Pencil
} from "lucide-react";

interface Contact {
  id: string;
  family_id: string;
  created_by: string;
  name: string;
  category: "doctor" | "school" | "electrician" | "plumber" | "driver" | "other";
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

const CATEGORY_MAP: Record<
  string,
  { label: string; color: string; bg: string; border: string; icon: any }
> = {
  doctor: {
    label: "Doctor",
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-950/20",
    border: "border-rose-200 dark:border-rose-500/20",
    icon: HeartPulse,
  },
  school: {
    label: "School",
    color: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-50 dark:bg-indigo-950/20",
    border: "border-indigo-200 dark:border-indigo-500/20",
    icon: GraduationCap,
  },
  electrician: {
    label: "Electrician",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/20",
    border: "border-amber-200 dark:border-amber-500/20",
    icon: Flame,
  },
  plumber: {
    label: "Plumber",
    color: "text-sky-600 dark:text-sky-400",
    bg: "bg-sky-50 dark:bg-sky-950/20",
    border: "border-sky-200 dark:border-sky-500/20",
    icon: Droplets,
  },
  driver: {
    label: "Driver",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/20",
    border: "border-emerald-200 dark:border-emerald-500/20",
    icon: Car,
  },
  other: {
    label: "Other",
    color: "text-slate-600 dark:text-slate-400",
    bg: "bg-slate-50 dark:bg-slate-900/60",
    border: "border-slate-200 dark:border-slate-500/20",
    icon: HelpCircle,
  },
};

const PROTOTYPE_PHOTOS: Record<string, string> = {
  "Sarah Bennett": "https://lh3.googleusercontent.com/aida-public/AB6AXuDAYrNAndXkkxP26pwLfm3ur6LUkjypZdZzf5GyO-IQdDiYe_s-KdwG5c0GEhiI_vtJaxY8OFiJ8nEibjXAvf5tTsY48tUNU2D5MtzLQ6AdOY_JIvJ9d4jQOWYLOvJ5Gjh3cmfszqiSmSA1BhVrWHKZrE4r30AWf0kSXWdcNMgDRmr4cIWcSq3ZokRonJNs8Psx3QuAK-LFvFBicr4iM_9pVwPdZ5cs1HRX4uIH1gR0pugZ0RXbswXaQw",
  "Sarah Bennett, Sarah": "https://lh3.googleusercontent.com/aida-public/AB6AXuDAYrNAndXkkxP26pwLfm3ur6LUkjypZdZzf5GyO-IQdDiYe_s-KdwG5c0GEhiI_vtJaxY8OFiJ8nEibjXAvf5tTsY48tUNU2D5MtzLQ6AdOY_JIvJ9d4jQOWYLOvJ5Gjh3cmfszqiSmSA1BhVrWHKZrE4r30AWf0kSXWdcNMgDRmr4cIWcSq3ZokRonJNs8Psx3QuAK-LFvFBicr4iM_9pVwPdZ5cs1HRX4uIH1gR0pugZ0RXbswXaQw",
  "Dr. Sarah Bennett": "https://lh3.googleusercontent.com/aida-public/AB6AXuDAYrNAndXkkxP26pwLfm3ur6LUkjypZdZzf5GyO-IQdDiYe_s-KdwG5c0GEhiI_vtJaxY8OFiJ8nEibjXAvf5tTsY48tUNU2D5MtzLQ6AdOY_JIvJ9d4jQOWYLOvJ5Gjh3cmfszqiSmSA1BhVrWHKZrE4r30AWf0kSXWdcNMgDRmr4cIWcSq3ZokRonJNs8Psx3QuAK-LFvFBicr4iM_9pVwPdZ5cs1HRX4uIH1gR0pugZ0RXbswXaQw",
  "Dr. Aris Thorne": "https://lh3.googleusercontent.com/aida-public/AB6AXuD271PVEYStHIhRr0ZPNKUpwXtZwAc6-qsDrmqjm2bIq8q0qfpKG9ZDjtkz-J_DNj0htcxvh3PCULJiCA3E9H6iRoWaFtY9dh7iOd3_elXH3QCHgOLh9llcnyBsq43opHl1I4m0j5c50GfS9F8fayDkjKCsLqSFthQ4hAfs5SsMYMKaQBO9MvosXCtRffuKDqNaPtJcrejqiPwEmceLvQQqgj6RkSitBiUw5XpqEOdWg6xV0izKULKCjQ",
  "Aris Thorne": "https://lh3.googleusercontent.com/aida-public/AB6AXuD271PVEYStHIhRr0ZPNKUpwXtZwAc6-qsDrmqjm2bIq8q0qfpKG9ZDjtkz-J_DNj0htcxvh3PCULJiCA3E9H6iRoWaFtY9dh7iOd3_elXH3QCHgOLh9llcnyBsq43opHl1I4m0j5c50GfS9F8fayDkjKCsLqSFthQ4hAfs5SsMYMKaQBO9MvosXCtRffuKDqNaPtJcrejqiPwEmceLvQQqgj6RkSitBiUw5XpqEOdWg6xV0izKULKCjQ",
  "Ben's Plumbing": "https://lh3.googleusercontent.com/aida-public/AB6AXuDYUDB0-Z123h8SBgCpGTMfdHoKk71t9Yr55ldlfw6SQ4MwdTgeTlAOS5YWjduL6yJi7uJWelbE9KTEjY2gen5n54ERV2r4K8u7mijt_Eu2XgaYwwmM9LjDUc3JJSzPyBo_a2QDu_w3ZZiCHoiG_2eKdrSUCUvPHX4n_2WYVXzCV0Q1oiSU27Wz1dS1cZTvYGqlXh_sC0kn-uWenIzIXazoh3chyuTNXk0lahVVQTgNdwLNHMou9wE3-g",
  "Bobby's Plumbing": "https://lh3.googleusercontent.com/aida-public/AB6AXuDYUDB0-Z123h8SBgCpGTMfdHoKk71t9Yr55ldlfw6SQ4MwdTgeTlAOS5YWjduL6yJi7uJWelbE9KTEjY2gen5n54ERV2r4K8u7mijt_Eu2XgaYwwmM9LjDUc3JJSzPyBo_a2QDu_w3ZZiCHoiG_2eKdrSUCUvPHX4n_2WYVXzCV0Q1oiSU27Wz1dS1cZTvYGqlXh_sC0kn-uWenIzIXazoh3chyuTNXk0lahVVQTgNdwLNHMou9wE3-g",
  "Bobby’s Plumbing": "https://lh3.googleusercontent.com/aida-public/AB6AXuDYUDB0-Z123h8SBgCpGTMfdHoKk71t9Yr55ldlfw6SQ4MwdTgeTlAOS5YWjduL6yJi7uJWelbE9KTEjY2gen5n54ERV2r4K8u7mijt_Eu2XgaYwwmM9LjDUc3JJSzPyBo_a2QDu_w3ZZiCHoiG_2eKdrSUCUvPHX4n_2WYVXzCV0Q1oiSU27Wz1dS1cZTvYGqlXh_sC0kn-uWenIzIXazoh3chyuTNXk0lahVVQTgNdwLNHMou9wE3-g",
  "Sunnydale Elementary": "https://lh3.googleusercontent.com/aida-public/AB6AXuBgq2d1ZXbqPyrCODj_UiF3RrdJLZFiX5HMSdZTytPPJLiZKE06dAc1iLXCqgzoACDPG3bnVucVdxJ6JPdKkXtRx6ffF3b8Y6EcwIS8ZWoHMuyY0rgQRrTY6DlhC00coXqDyxZoefF8dlDChiZnlYGzEXj-1DA-UDXCOfDa2S-QxMpnfvrSdjnFy466oTh9ggtL10b3e9g_pDQAjQadDvYZiN9QK9_-VYRj-fMHaBzI3c56DjX8sh-ygQ",
  "Bright Path Preschool": "https://lh3.googleusercontent.com/aida-public/AB6AXuBgq2d1ZXbqPyrCODj_UiF3RrdJLZFiX5HMSdZTytPPJLiZKE06dAc1iLXCqgzoACDPG3bnVucVdxJ6JPdKkXtRx6ffF3b8Y6EcwIS8ZWoHMuyY0rgQRrTY6DlhC00coXqDyxZoefF8dlDChiZnlYGzEXj-1DA-UDXCOfDa2S-QxMpnfvrSdjnFy466oTh9ggtL10b3e9g_pDQAjQadDvYZiN9QK9_-VYRj-fMHaBzI3c56DjX8sh-ygQ",
};

const getContactPhoto = (name: string) => {
  const norm = name.toLowerCase();
  for (const [key, val] of Object.entries(PROTOTYPE_PHOTOS)) {
    if (norm.includes(key.toLowerCase())) {
      return val;
    }
  }
  return null;
};

const getMockDetails = (contact: Contact) => {
  if (contact.category === "doctor") {
    return {
      address: "Northside Family Medical, Suite 402, Metro City",
      membersCount: 3,
      lastInteraction: "March 12, 2024",
      attachments: ["InsuranceCard_Front.jpg", "MedicationList_2024.pdf"]
    };
  } else if (contact.category === "school") {
    return {
      address: "Bright Path Learning Center, Metro City",
      membersCount: 2,
      lastInteraction: "June 25, 2026",
      attachments: ["SchoolCalendar_2026.pdf"]
    };
  } else if (contact.category === "plumber" || contact.category === "electrician") {
    return {
      address: "Metro Maintenance Services & Repairs",
      membersCount: 1,
      lastInteraction: "January 14, 2026",
      attachments: ["MaintenanceContract_2026.pdf"]
    };
  } else {
    return {
      address: "Home Service / Contact Direct",
      membersCount: 1,
      lastInteraction: "None logged",
      attachments: [] as string[]
    };
  }
};

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export default function ContactsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Selection / Form States
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  
  // Mobile Dialog States
  const [showMobileDetails, setShowMobileDetails] = useState(false);
  const [showMobileAdd, setShowMobileAdd] = useState(false);

  // Form Inputs
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState<Contact["category"]>("other");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const resetForm = () => {
    setFormName("");
    setFormCategory("other");
    setFormPhone("");
    setFormEmail("");
    setFormNotes("");
    setEditingId(null);
    setIsEditing(false);
  };

  const handleOpenEdit = (contact: Contact) => {
    setEditingId(contact.id);
    setIsEditing(true);
    setFormName(contact.name || "");
    setFormCategory(contact.category || "other");
    setFormPhone(contact.phone || "");
    setFormEmail(contact.email || "");
    setFormNotes(contact.notes || "");
    setIsAddingNew(true);
    setShowMobileAdd(true);
    setShowMobileDetails(false);
  };

  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        router.push("/login");
        return;
      }
      setUser(userData.user);

      const { data: memberData, error: memberError } = await supabase
        .from("family_members")
        .select("family_id, display_name")
        .eq("user_id", userData.user.id)
        .maybeSingle();

      if (memberError || !memberData) {
        router.push("/onboarding");
        return;
      }
      setMember(memberData);

      const { data: contactsData, error: contactsError } = await supabase
        .from("contacts")
        .select("*")
        .eq("family_id", memberData.family_id)
        .order("name");

      if (contactsError) throw contactsError;
      setContacts(contactsData || []);
    } catch (err: any) {
      console.error("Error loading contacts:", err);
      setError(err.message || "Failed to load contacts");
    } finally {
      setLoading(false);
    }
  }, [supabase, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle default desktop pre-selection
  useEffect(() => {
    if (contacts.length > 0 && !selectedContactId && !isAddingNew) {
      setSelectedContactId(contacts[0].id);
    }
  }, [contacts, selectedContactId, isAddingNew]);

  const handleCopyText = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !member || !user) return;
    try {
      setSubmitting(true);
      if (isEditing && editingId) {
        const { error } = await supabase
          .from("contacts")
          .update({
            name: formName.trim(),
            category: formCategory,
            phone: formPhone.trim() || null,
            email: formEmail.trim() || null,
            notes: formNotes.trim() || null,
          })
          .eq("id", editingId);

        if (error) throw error;

        // Reset state
        resetForm();
        setIsAddingNew(false);
        setShowMobileAdd(false);

        // Refresh list
        const { data: contactsData } = await supabase
          .from("contacts")
          .select("*")
          .eq("family_id", member.family_id)
          .order("name");
        setContacts(contactsData || []);

        alert("Contact updated successfully!");
      } else {
        const { data, error } = await supabase
          .from("contacts")
          .insert({
            family_id: member.family_id,
            created_by: user.id,
            name: formName.trim(),
            category: formCategory,
            phone: formPhone.trim() || null,
            email: formEmail.trim() || null,
            notes: formNotes.trim() || null,
          })
          .select()
          .single();

        if (error) throw error;

        // Reset state
        resetForm();
        setIsAddingNew(false);
        setShowMobileAdd(false);

        // Refresh List
        const { data: contactsData } = await supabase
          .from("contacts")
          .select("*")
          .eq("family_id", member.family_id)
          .order("name");
        setContacts(contactsData || []);

        if (data) {
          setSelectedContactId(data.id);
        }
        alert("Contact added successfully!");
      }
    } catch (err) {
      console.error("Error saving contact:", err);
      alert("Failed to save contact. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteContact = async (id: string) => {
    if (!confirm("Are you sure you want to delete this contact?")) return;
    try {
      setDeleting(true);
      const { error } = await supabase
        .from("contacts")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setSelectedContactId(null);
      setShowMobileDetails(false);

      // Refresh list
      const { data: contactsData } = await supabase
        .from("contacts")
        .select("*")
        .eq("family_id", member.family_id)
        .order("name");
      const updatedContacts = contactsData || [];
      setContacts(updatedContacts);

      if (updatedContacts.length > 0) {
        setSelectedContactId(updatedContacts[0].id);
      }
    } catch (err) {
      console.error("Error deleting contact:", err);
      alert("Failed to delete contact.");
    } finally {
      setDeleting(false);
    }
  };

  // Filter contacts logic
  const filteredContacts = contacts.filter((contact) => {
    const matchesCategory = selectedCategory === "all" || contact.category === selectedCategory;
    const matchesSearch =
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (contact.notes && contact.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (contact.phone && contact.phone.includes(searchQuery)) ||
      (contact.email && contact.email.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Group contacts by first letter for rolodex
  const groupedContacts = filteredContacts.reduce((groups, contact) => {
    const firstLetter = contact.name.trim().slice(0, 1).toUpperCase();
    const groupKey = /^[A-Z]$/.test(firstLetter) ? firstLetter : "#";
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(contact);
    return groups;
  }, {} as Record<string, Contact[]>);

  const sortedGroupKeys = Object.keys(groupedContacts).sort((a, b) => {
    if (a === "#") return 1;
    if (b === "#") return -1;
    return a.localeCompare(b);
  });

  const scrollToGroup = (letter: string) => {
    const container = document.getElementById("rolodex-scroll-container");
    const target = document.getElementById(`group-${letter}`);
    if (container && target) {
      container.scrollTo({
        top: target.offsetTop - container.offsetTop,
        behavior: "smooth",
      });
    }
  };

  const selectedContact = contacts.find((c) => c.id === selectedContactId) || null;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-on-surface-variant font-medium">Loading family contacts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center space-y-4">
        <p className="text-error font-semibold">Error: {error}</p>
        <button onClick={fetchData} className="px-4 py-2 bg-primary text-on-primary rounded-xl text-xs font-bold active:scale-95 transition-all">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto h-[calc(100vh-100px)] flex flex-col">
      {/* ─── HEADER SECTION ─────────────────────────────────── */}
      <section className="shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="font-quicksand text-3xl font-extrabold text-on-surface tracking-tight">
            Contacts <span className="text-primary italic">Directory</span>
          </h2>
          <p className="text-sm text-on-surface-variant font-medium mt-1">
            Keep essential household numbers and email contacts shared in a single directory.
          </p>
        </div>
      </section>

      {/* ─── QUICK CATEGORIES (BENTO SYSTEM) ─────────────────── */}
      <section className="shrink-0 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 select-none">
        {[
          { value: "all", label: "All Contacts", bg: "bg-primary/5 text-primary", border: "border-primary/20", icon: User },
          { value: "doctor", label: "Doctor", bg: "bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-300", border: "border-rose-200 dark:border-rose-500/20", icon: HeartPulse },
          { value: "school", label: "School", bg: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-300", border: "border-indigo-200 dark:border-indigo-500/20", icon: GraduationCap },
          { value: "electrician", label: "Electrician", bg: "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-300", border: "border-amber-200 dark:border-amber-500/20", icon: Flame },
          { value: "plumber", label: "Plumber", bg: "bg-sky-50 text-sky-700 dark:bg-sky-950/20 dark:text-sky-300", border: "border-sky-200 dark:border-sky-500/20", icon: Droplets },
          { value: "driver", label: "Driver", bg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-500/20", icon: Car },
          { value: "other", label: "Other", bg: "bg-slate-50 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300", border: "border-slate-200 dark:border-outline-variant/30", icon: HelpCircle },
        ].map((chip) => {
          const active = selectedCategory === chip.value;
          const Icon = chip.icon;
          return (
            <button
              key={chip.value}
              onClick={() => {
                setSelectedCategory(chip.value);
                const filtered = contacts.filter((c) => {
                  const matchesCategory = chip.value === "all" || c.category === chip.value;
                  const matchesSearch =
                    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (c.notes && c.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
                    (c.phone && c.phone.includes(searchQuery)) ||
                    (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()));
                  return matchesCategory && matchesSearch;
                });
                if (filtered.length > 0) {
                  setSelectedContactId(filtered[0].id);
                } else {
                  setSelectedContactId(null);
                }
              }}
              className={`flex items-center gap-2 px-4 py-3 rounded-2xl border text-xs font-bold transition-all duration-200 active:scale-95 cursor-pointer shadow-sm hover:scale-[1.02] ${
                active
                  ? "bg-primary text-on-primary border-primary shadow-[0_4px_12px_rgba(0,93,167,0.15)] scale-[1.02]"
                  : `${chip.bg} ${chip.border} text-on-surface-variant hover:bg-surface-container-high`
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${active ? "text-on-primary" : "text-current"}`} />
              <span>{chip.label}</span>
            </button>
          );
        })}
      </section>

      {/* ─── MAIN RESPONSIVE ROLODEX GRID ───────────────────── */}
      <section className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
        {/* Left/Middle Column: Rolodex List */}
        <div className="lg:col-span-5 flex flex-col bg-surface-container-lowest rounded-2xl border border-outline-variant/25 overflow-hidden h-full">
          {/* Header & Add Button */}
          <div className="p-4 border-b border-outline-variant/25 flex justify-between items-center bg-surface-container-low/40">
            <h3 className="font-heading text-base font-bold text-on-surface">Shared Directory</h3>
            <button
              onClick={() => {
                resetForm();
                setIsAddingNew(true);
                setSelectedContactId(null);
                setShowMobileAdd(true);
              }}
              className="bg-secondary text-on-secondary hover:brightness-110 px-4 py-1.5 rounded-full font-sans text-xs font-bold hover:scale-105 active:scale-95 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Add New
            </button>
          </div>

          {/* Search Box */}
          <div className="p-4 border-b border-outline-variant/25">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant/40" />
              <input
                type="text"
                placeholder="Search family contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2.5 bg-surface-container border-none rounded-full w-full text-xs font-sans text-on-surface focus:outline-none focus:ring-2 focus:ring-primary transition-all shadow-inner"
              />
            </div>
          </div>

          {/* List + Side Jump Scroller */}
          <div className="flex-1 flex overflow-hidden">
            {/* Quick Letter jump index (Desktop Only) */}
            <aside className="hidden sm:flex w-10 border-r border-outline-variant/15 bg-surface-container-low/20 flex-col items-center py-2 overflow-y-auto custom-scrollbar shrink-0 select-none">
              <div className="flex flex-col gap-0.5">
                {"ABCDEFGHIJKLMNOPQRSTUVWXYZ#".split("").map((letter) => {
                  const hasContacts = groupedContacts[letter] && groupedContacts[letter].length > 0;
                  return (
                    <button
                      key={letter}
                      onClick={() => hasContacts && scrollToGroup(letter)}
                      disabled={!hasContacts}
                      className={`w-6 h-6 flex items-center justify-center text-[9px] rounded-full transition-all duration-200 ${
                        hasContacts
                          ? "text-on-surface-variant hover:bg-primary/10 hover:text-primary font-bold cursor-pointer"
                          : "text-on-surface-variant/20 font-normal cursor-not-allowed"
                      }`}
                    >
                      {letter}
                    </button>
                  );
                })}
              </div>
            </aside>

            {/* Contacts Scrolling list */}
            <div
              id="rolodex-scroll-container"
              className="flex-grow overflow-y-auto custom-scrollbar divide-y divide-outline-variant/10 relative"
            >
              {sortedGroupKeys.length === 0 ? (
                <div className="py-16 px-4 text-center text-on-surface-variant/50">
                  <User className="mx-auto h-8 w-8 mb-2 opacity-30 text-primary" />
                  <p className="text-xs font-semibold">No family contacts found</p>
                </div>
              ) : (
                sortedGroupKeys.map((letter) => (
                  <div key={letter} id={`group-${letter}`} className="scroll-mt-2">
                    <div className="px-4 py-1 bg-surface-container text-primary font-heading text-[10px] font-bold sticky top-0 z-10 uppercase tracking-widest border-b border-outline-variant/10">
                      {letter}
                    </div>
                    <div className="divide-y divide-outline-variant/5">
                      {groupedContacts[letter].map((contact) => {
                        const isSelected = selectedContactId === contact.id;
                        const photo = getContactPhoto(contact.name);
                        const categoryConf = CATEGORY_MAP[contact.category] || CATEGORY_MAP.other;
                        const Icon = categoryConf.icon;

                        return (
                          <div
                            key={contact.id}
                            onClick={() => {
                              setSelectedContactId(contact.id);
                              setIsAddingNew(false);
                              setShowMobileDetails(true);
                            }}
                            className={`p-3.5 flex items-center gap-3 cursor-pointer transition-all duration-200 group border-l-4 ${
                              isSelected
                                ? "bg-primary-fixed/30 border-primary"
                                : "border-transparent hover:bg-surface-container-low/40"
                            }`}
                          >
                            <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-outline-variant/10 flex items-center justify-center bg-surface-container shadow-sm">
                              {photo ? (
                                <img src={photo} alt={contact.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className={`w-full h-full flex items-center justify-center font-bold text-xs bg-gradient-to-br ${categoryConf.bg} ${categoryConf.color}`}>
                                  {getInitials(contact.name)}
                                </div>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <h4 className="font-sans text-sm font-bold text-on-surface truncate group-hover:text-primary transition-colors">
                                {contact.name}
                              </h4>
                              <p className="text-[10px] text-on-surface-variant/70 font-bold flex items-center gap-1 mt-0.5 uppercase tracking-wider">
                                <Icon className="h-3 w-3 shrink-0" />
                                {categoryConf.label}
                              </p>
                            </div>

                            <ChevronRight className={`h-4 w-4 text-on-surface-variant/30 group-hover:text-primary transition-all group-hover:translate-x-0.5 ${isSelected ? "text-primary translate-x-0.5" : ""}`} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Detail Pane (Desktop Only, drawer handles Mobile) */}
        <div className="hidden lg:block lg:col-span-7 bg-surface-container-lowest rounded-2xl border border-outline-variant/25 overflow-hidden h-full">
          {isAddingNew ? (
            <form onSubmit={handleAddContact} className="p-6 space-y-5 h-full overflow-y-auto custom-scrollbar">
              <div>
                <h3 className="font-heading text-xl font-extrabold text-on-surface">{isEditing ? "Edit Contact" : "Add New Contact"}</h3>
                <p className="text-xs text-on-surface-variant/70 mt-1">Create or update a shared household entry in the directory.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-primary">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Sarah Bennett"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full rounded-xl border border-outline-variant/40 bg-surface px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-primary">Category</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as any)}
                      className="w-full rounded-xl border border-outline-variant/40 bg-surface px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    >
                      <option value="other">Other</option>
                      <option value="doctor">Doctor</option>
                      <option value="school">School</option>
                      <option value="electrician">Electrician</option>
                      <option value="plumber">Plumber</option>
                      <option value="driver">Driver</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-primary">Phone Number</label>
                    <input
                      type="tel"
                      placeholder="e.g. (555) 019-2348"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      className="w-full rounded-xl border border-outline-variant/40 bg-surface px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-primary">Email Address</label>
                  <input
                    type="email"
                    placeholder="e.g. clinic@northsidemedical.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full rounded-xl border border-outline-variant/40 bg-surface px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-primary">Notes & Instructions</label>
                  <textarea
                    placeholder="E.g., visiting hours, backup numbers, notes..."
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    rows={4}
                    className="w-full rounded-xl border border-outline-variant/40 bg-surface px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setIsAddingNew(false);
                    if (contacts.length > 0) {
                      setSelectedContactId(contacts[0].id);
                    }
                  }}
                  className="flex-1 py-3 border border-outline-variant bg-surface text-on-surface font-sans text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-surface-container-low active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-primary text-on-primary font-sans text-xs font-bold uppercase tracking-wider rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-md flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Saving..." : isEditing ? "Save Changes" : "Save Contact"}
                </button>
              </div>
            </form>
          ) : selectedContact ? (
            <div className="p-6 space-y-6 h-full overflow-y-auto custom-scrollbar">
              {/* Profile Header */}
              <div className="flex flex-col md:flex-row items-start md:items-end gap-6 pb-6 border-b border-outline-variant/20">
                <div className="w-24 h-24 rounded-3xl overflow-hidden shadow-md ring-4 ring-white shrink-0 bg-surface-container border border-outline-variant/10 flex items-center justify-center">
                  {getContactPhoto(selectedContact.name) ? (
                    <img src={getContactPhoto(selectedContact.name)!} alt={selectedContact.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center font-bold text-3xl bg-gradient-to-br ${CATEGORY_MAP[selectedContact.category]?.bg || CATEGORY_MAP.other.bg} ${CATEGORY_MAP[selectedContact.category]?.color || CATEGORY_MAP.other.color}`}>
                      {getInitials(selectedContact.name)}
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="flex flex-wrap gap-2">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-current/10 ${CATEGORY_MAP[selectedContact.category]?.bg || CATEGORY_MAP.other.bg} ${CATEGORY_MAP[selectedContact.category]?.color || CATEGORY_MAP.other.color}`}>
                      {CATEGORY_MAP[selectedContact.category]?.label || "Other"}
                    </span>
                  </div>
                  <h2 className="font-heading text-2xl font-extrabold text-on-surface truncate">
                    {selectedContact.name}
                  </h2>
                  <p className="text-xs text-on-surface-variant/75 font-semibold flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                    {getMockDetails(selectedContact).address}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0 self-end md:self-auto">
                  <button
                    onClick={() => handleOpenEdit(selectedContact)}
                    className="w-10 h-10 rounded-xl border border-outline-variant/30 text-on-surface-variant/50 hover:text-primary hover:bg-primary/10 hover:border-primary/20 flex items-center justify-center active:scale-90 transition-all cursor-pointer"
                    title="Edit Contact"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteContact(selectedContact.id)}
                    disabled={deleting}
                    className="w-10 h-10 rounded-xl border border-error/20 text-error bg-error/5 hover:bg-error/10 flex items-center justify-center active:scale-90 transition-all cursor-pointer"
                    title="Delete Contact"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Bento Grid Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Contact Channels */}
                <div className="p-5 rounded-2xl border border-outline-variant/20 bg-surface-container-low/40 space-y-4">
                  <h4 className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest flex items-center gap-1.5 border-b border-outline-variant/10 pb-2">
                    <Phone className="h-3.5 w-3.5 text-primary" /> Contact Channels
                  </h4>

                  <div className="space-y-3">
                    {selectedContact.phone ? (
                      <div className="p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/15 hover:border-primary/30 transition-all group">
                        <p className="text-[10px] font-bold text-on-surface-variant/50 uppercase">Primary Phone</p>
                        <div className="flex justify-between items-center mt-1">
                          <a href={`tel:${selectedContact.phone}`} className="font-sans text-sm font-bold text-on-surface hover:text-primary transition-colors">
                            {selectedContact.phone}
                          </a>
                          <button
                            onClick={() => handleCopyText(selectedContact.phone!, "phone")}
                            className="p-1 rounded hover:bg-surface-container text-on-surface-variant/40 hover:text-primary transition-colors"
                          >
                            {copiedField === "phone" ? <Check className="h-3.5 w-3.5 text-tertiary" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-surface-container-lowest rounded-xl border border-dashed border-outline-variant/30 text-center">
                        <p className="text-xs text-on-surface-variant/40 font-semibold">No phone listed</p>
                      </div>
                    )}

                    {selectedContact.email ? (
                      <div className="p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/15 hover:border-primary/30 transition-all group">
                        <p className="text-[10px] font-bold text-on-surface-variant/50 uppercase">Email Address</p>
                        <div className="flex justify-between items-center mt-1 min-w-0">
                          <a href={`mailto:${selectedContact.email}`} className="font-sans text-sm font-bold text-on-surface hover:text-primary transition-colors truncate pr-2">
                            {selectedContact.email}
                          </a>
                          <button
                            onClick={() => handleCopyText(selectedContact.email!, "email")}
                            className="p-1 rounded hover:bg-surface-container text-on-surface-variant/40 hover:text-primary transition-colors shrink-0"
                          >
                            {copiedField === "email" ? <Check className="h-3.5 w-3.5 text-tertiary" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-surface-container-lowest rounded-xl border border-dashed border-outline-variant/30 text-center">
                        <p className="text-xs text-on-surface-variant/40 font-semibold">No email listed</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="p-5 rounded-2xl border border-outline-variant/20 bg-primary/5 flex flex-col justify-between">
                  <div>
                    <h4 className="text-[10px] font-bold text-primary/70 uppercase tracking-widest">Quick Actions</h4>
                    <p className="text-xs text-on-surface-variant/85 font-medium mt-1">Directly trigger communication.</p>
                  </div>

                  <div className="space-y-2 mt-4">
                    {selectedContact.phone && (
                      <a
                        href={`tel:${selectedContact.phone}`}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-on-primary hover:brightness-105 active:scale-95 transition-all text-xs font-bold shadow-sm"
                      >
                        <PhoneCall className="h-4 w-4" /> Place Call
                      </a>
                    )}

                    {selectedContact.email && (
                      <a
                        href={`mailto:${selectedContact.email}`}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface hover:bg-surface-container-high active:scale-95 transition-all text-xs font-bold"
                      >
                        <Mail className="h-4 w-4" /> Send Email
                      </a>
                    )}
                  </div>
                </div>

                {/* Notes & Private Info */}
                <div className="md:col-span-2 p-5 rounded-2xl border border-outline-variant/20 bg-surface-container-low/40 space-y-4">
                  <h4 className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest flex items-center gap-1.5 border-b border-outline-variant/10 pb-2">
                    <FileText className="h-3.5 w-3.5 text-primary" /> Notes & Private Info
                  </h4>

                  {selectedContact.notes ? (
                    <div className="p-4 bg-tertiary-container/5 rounded-xl border-l-4 border-tertiary">
                      <p className="font-sans text-sm text-on-surface leading-relaxed italic">
                        "{selectedContact.notes}"
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 bg-surface-container-lowest rounded-xl border border-dashed border-outline-variant/30 text-center">
                      <p className="text-xs text-on-surface-variant/40 font-semibold">No notes logged for this contact.</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/15">
                      <p className="text-[10px] font-bold text-on-surface-variant/50 uppercase">Associated Members</p>
                      <div className="flex gap-1.5 mt-2">
                        {Array.from({ length: getMockDetails(selectedContact).membersCount }).map((_, i) => (
                          <div key={i} className="w-6 h-6 rounded-full bg-secondary-container/20 text-secondary border border-secondary-container/10 flex items-center justify-center text-[10px] font-bold">
                            {member?.display_name ? member.display_name[0] : "H"}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/15">
                      <p className="text-[10px] font-bold text-on-surface-variant/50 uppercase">Last Interaction</p>
                      <p className="font-sans text-xs font-bold text-on-surface mt-2 flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-primary" />
                        {getMockDetails(selectedContact).lastInteraction}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Attachments Card */}
                {getMockDetails(selectedContact).attachments.length > 0 && (
                  <div className="md:col-span-2 p-5 rounded-2xl border border-outline-variant/20 bg-surface-container-low/40 space-y-3">
                    <h4 className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest flex items-center gap-1.5 border-b border-outline-variant/10 pb-2">
                      <Paperclip className="h-3.5 w-3.5 text-primary" /> Shared Attachments
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {getMockDetails(selectedContact).attachments.map((file, i) => (
                        <div key={i} className="p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/15 flex items-center gap-3 hover:border-primary/30 transition-all cursor-pointer">
                          <div className="w-10 h-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center shrink-0">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-on-surface truncate" title={file}>{file}</p>
                            <p className="text-[9px] text-on-surface-variant/50 font-bold uppercase mt-0.5">Static Ref Doc</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-on-surface-variant/40">
              <User className="h-16 w-16 mb-4 stroke-[1] text-primary/30" />
              <h3 className="font-heading text-base font-bold text-on-surface">No Contact Selected</h3>
              <p className="text-xs font-medium max-w-xs mt-2">Select a contact from the list on the left to view details.</p>
            </div>
          )}
        </div>
      </section>

      {/* ─── MOBILE FLOATING ACTION BUTTON ──────────────────── */}
      <button
        onClick={() => {
          resetForm();
          setIsAddingNew(true);
          setSelectedContactId(null);
          setShowMobileAdd(true);
        }}
        className="lg:hidden fixed bottom-24 right-6 w-14 h-14 bg-secondary text-on-secondary rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95 z-40 cursor-pointer"
        title="Add Contact"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* ─── MOBILE DETAILS DRAWER ─────────────────────────── */}
      {showMobileDetails && selectedContact && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end bg-black/40 backdrop-blur-xs">
          <div className="absolute inset-0" onClick={() => setShowMobileDetails(false)} />
          <div className="relative bg-surface rounded-t-3xl max-h-[85vh] overflow-y-auto p-6 space-y-6 shadow-2xl border-t border-outline-variant/30 animate-in slide-in-from-bottom duration-300">
            {/* Handle bar */}
            <div className="w-12 h-1 bg-outline-variant/60 rounded-full mx-auto mb-2" />

            {/* Close button */}
            <button
              onClick={() => setShowMobileDetails(false)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-surface-container hover:bg-surface-container-high active:scale-95 transition-all text-on-surface-variant"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Profile Header */}
            <div className="flex items-center gap-4 pb-4 border-b border-outline-variant/20">
              <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-md shrink-0 bg-surface-container border border-outline-variant/10 flex items-center justify-center">
                {getContactPhoto(selectedContact.name) ? (
                  <img src={getContactPhoto(selectedContact.name)!} alt={selectedContact.name} className="w-full h-full object-cover" />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center font-bold text-xl bg-gradient-to-br ${CATEGORY_MAP[selectedContact.category]?.bg || CATEGORY_MAP.other.bg} ${CATEGORY_MAP[selectedContact.category]?.color || CATEGORY_MAP.other.color}`}>
                    {getInitials(selectedContact.name)}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border border-current/10 ${CATEGORY_MAP[selectedContact.category]?.bg || CATEGORY_MAP.other.bg} ${CATEGORY_MAP[selectedContact.category]?.color || CATEGORY_MAP.other.color}`}>
                  {CATEGORY_MAP[selectedContact.category]?.label || "Other"}
                </span>
                <h2 className="font-heading text-lg font-bold text-on-surface truncate mt-1">
                  {selectedContact.name}
                </h2>
                <p className="text-[10px] text-on-surface-variant/75 font-semibold flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3 text-primary shrink-0" />
                  {getMockDetails(selectedContact).address}
                </p>
              </div>
            </div>

            {/* Details Bento */}
            <div className="space-y-4">
              {/* Contact Channels */}
              <div className="p-4 rounded-2xl border border-outline-variant/20 bg-surface-container-low/45 space-y-3">
                <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-wider">Contact Info</p>
                {selectedContact.phone && (
                  <div className="flex justify-between items-center py-1">
                    <div>
                      <p className="text-[9px] font-bold text-on-surface-variant/50 uppercase">Phone</p>
                      <a href={`tel:${selectedContact.phone}`} className="text-sm font-bold text-primary">{selectedContact.phone}</a>
                    </div>
                    <a href={`tel:${selectedContact.phone}`} className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center active:scale-90 transition-all">
                      <PhoneCall className="h-4 w-4" />
                    </a>
                  </div>
                )}
                {selectedContact.email && (
                  <div className="flex justify-between items-center py-1 border-t border-outline-variant/10">
                    <div>
                      <p className="text-[9px] font-bold text-on-surface-variant/50 uppercase">Email</p>
                      <a href={`mailto:${selectedContact.email}`} className="text-sm font-bold text-primary truncate max-w-[200px] block">{selectedContact.email}</a>
                    </div>
                    <a href={`mailto:${selectedContact.email}`} className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center active:scale-90 transition-all">
                      <Mail className="h-4 w-4" />
                    </a>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="p-4 rounded-2xl border border-outline-variant/20 bg-surface-container-low/45 space-y-2">
                <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-wider">Notes & Details</p>
                {selectedContact.notes ? (
                  <p className="text-xs text-on-surface leading-relaxed italic">"{selectedContact.notes}"</p>
                ) : (
                  <p className="text-xs text-on-surface-variant/40 italic">No notes logged.</p>
                )}
              </div>

              {/* Mock Details */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-surface-container-low/45 rounded-2xl border border-outline-variant/10">
                  <p className="text-[9px] font-bold text-on-surface-variant/50 uppercase">Last Interaction</p>
                  <p className="text-xs font-bold text-on-surface mt-1">{getMockDetails(selectedContact).lastInteraction}</p>
                </div>
                <div className="p-3 bg-surface-container-low/45 rounded-2xl border border-outline-variant/10">
                  <p className="text-[9px] font-bold text-on-surface-variant/50 uppercase">Attachments</p>
                  <p className="text-xs font-bold text-on-surface mt-1">{getMockDetails(selectedContact).attachments.length} items</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => handleOpenEdit(selectedContact)}
                  className="flex-1 py-3 bg-primary text-on-primary font-sans text-xs font-bold uppercase tracking-wider rounded-xl hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Pencil className="h-4 w-4" /> Edit Contact
                </button>
                <button
                  onClick={() => handleDeleteContact(selectedContact.id)}
                  disabled={deleting}
                  className="flex-1 py-3 bg-error text-on-error font-sans text-xs font-bold uppercase tracking-wider rounded-xl hover:brightness-105 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" /> Delete Contact
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MOBILE ADD DRAWER ─────────────────────────────── */}
      {showMobileAdd && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end bg-black/40 backdrop-blur-xs">
          <div className="absolute inset-0" onClick={() => {
            resetForm();
            setShowMobileAdd(false);
          }} />
          <div className="relative bg-surface rounded-t-3xl max-h-[85vh] overflow-y-auto p-6 space-y-5 shadow-2xl border-t border-outline-variant/30 animate-in slide-in-from-bottom duration-300">
            {/* Handle bar */}
            <div className="w-12 h-1 bg-outline-variant/60 rounded-full mx-auto mb-2" />

            {/* Close button */}
            <button
              onClick={() => {
                resetForm();
                setShowMobileAdd(false);
              }}
              className="absolute top-4 right-4 p-2 rounded-xl bg-surface-container hover:bg-surface-container-high active:scale-95 transition-all text-on-surface-variant"
            >
              <X className="h-5 w-5" />
            </button>

            <div>
              <h3 className="font-heading text-xl font-bold text-on-surface">{isEditing ? "Edit Contact" : "Add Contact"}</h3>
              <p className="text-xs text-on-surface-variant/70 mt-1">Create or update a shared household entry.</p>
            </div>

            <form onSubmit={handleAddContact} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase tracking-wider text-primary">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Sarah Bennett"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full rounded-xl border border-outline-variant/40 bg-surface px-4 py-2.5 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase tracking-wider text-primary">Category</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as any)}
                  className="w-full rounded-xl border border-outline-variant/40 bg-surface px-4 py-2.5 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                >
                  <option value="other">Other</option>
                  <option value="doctor">Doctor</option>
                  <option value="school">School</option>
                  <option value="electrician">Electrician</option>
                  <option value="plumber">Plumber</option>
                  <option value="driver">Driver</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase tracking-wider text-primary">Phone Number</label>
                <input
                  type="tel"
                  placeholder="e.g. (555) 019-2348"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full rounded-xl border border-outline-variant/40 bg-surface px-4 py-2.5 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase tracking-wider text-primary">Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. clinic@northsidemedical.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full rounded-xl border border-outline-variant/40 bg-surface px-4 py-2.5 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase tracking-wider text-primary">Notes & Details</label>
                <textarea
                  placeholder="Visiting hours, backup numbers..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-outline-variant/40 bg-surface px-4 py-2.5 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 py-3 bg-primary text-on-primary font-sans text-xs font-bold uppercase tracking-wider rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-md flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
              >
                {submitting ? "Saving..." : isEditing ? "Save Changes" : "Save Contact"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
