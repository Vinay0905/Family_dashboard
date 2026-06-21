import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentFamilyForUser } from "@/services/dashboard.service";
import { getContacts, createContact, deleteContact } from "@/services/contact.service";
import { Phone, Mail, User, Plus, Trash2, HeartPulse, GraduationCap, Flame, Droplets, Car, HelpCircle } from "lucide-react";

const CATEGORY_MAP: Record<
  string,
  { label: string; color: string; bg: string; icon: any }
> = {
  doctor: { label: "Doctor", color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950/20 border-rose-500/20", icon: HeartPulse },
  school: { label: "School", color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-950/20 border-indigo-500/20", icon: GraduationCap },
  electrician: { label: "Electrician", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/20 border-amber-500/20", icon: Flame },
  plumber: { label: "Plumber", color: "text-sky-600 dark:text-sky-400", bg: "bg-sky-50 dark:bg-sky-950/20 border-sky-500/20", icon: Droplets },
  driver: { label: "Driver", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500/20", icon: Car },
  other: { label: "Other", color: "text-slate-655 dark:text-slate-400", bg: "bg-slate-50 dark:bg-slate-900/60 border-slate-500/20", icon: HelpCircle },
};

export default async function ContactsPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const member = await getCurrentFamilyForUser(userData.user.id);
  if (!member) redirect("/onboarding");
  const contacts = await getContacts(member.family_id);

  // Server Action
  async function addContact(formData: FormData) {
    "use server";
    const name = String(formData.get("name") || "").trim();
    const category = String(formData.get("category")) as any;
    const phone = String(formData.get("phone") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const notes = String(formData.get("notes") || "").trim();

    if (!name || !category) return;

    const supabase = await createClient();
    const { data: userSession } = await supabase.auth.getUser();
    if (!userSession.user) redirect("/login");

    const mem = await getCurrentFamilyForUser(userSession.user.id);
    if (!mem) return;

    await createContact({
      family_id: mem.family_id,
      created_by: userSession.user.id,
      name,
      category,
      phone: phone || undefined,
      email: email || undefined,
      notes: notes || undefined,
    });

    revalidatePath("/contacts");
  }

  async function removeContact(formData: FormData) {
    "use server";
    const contactId = String(formData.get("contactId"));
    if (!contactId) return;

    await deleteContact(contactId);
    revalidatePath("/contacts");
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="font-heading text-4xl text-on-surface tracking-tight font-extrabold">
            Useful <span className="text-primary italic">Contacts</span>
          </h1>
          <p className="font-sans text-sm text-on-surface-variant mt-2 font-medium">
            Keep essential household phone numbers and email contacts shared in a single workspace directory.
          </p>
        </div>
      </section>

      {/* Grid Container */}
      <section className="grid gap-8 lg:grid-cols-[1fr_320px]">
        {/* Contacts Directory List */}
        <div className="space-y-6">
          <h3 className="font-heading text-lg font-bold text-on-surface flex items-center gap-3 border-b border-primary/10 pb-2">
            <span className="w-6 h-1 bg-primary rounded-full"></span> Shared Directory
          </h3>

          {contacts.length === 0 ? (
            <div className="rounded border border-dashed border-primary/10 p-10 text-center text-on-surface-variant/50">
              <User className="mx-auto h-8 w-8 mb-2 opacity-30 text-primary" />
              <p className="text-sm font-medium">No contacts added to the directory yet.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {contacts.map((contact) => {
                const categoryConf = CATEGORY_MAP[contact.category] || CATEGORY_MAP.other;
                const Icon = categoryConf.icon;

                return (
                  <article
                    key={contact.id}
                    className="group relative flex flex-col justify-between rounded border border-outline/10 bg-white p-4.5 hover:shadow-[0_0_20px_rgba(183,0,79,0.03)] hover:border-primary transition-all duration-300"
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded border ${categoryConf.bg} ${categoryConf.color}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-heading text-sm font-extrabold text-on-surface truncate" title={contact.name}>
                              {contact.name}
                            </h4>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-on-surface-variant/60 block mt-0.5">
                              {categoryConf.label}
                            </span>
                          </div>
                        </div>

                        {/* Delete contact trigger */}
                        <form action={removeContact} className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <input type="hidden" name="contactId" value={contact.id} />
                          <button
                            type="submit"
                            className="flex h-7 w-7 items-center justify-center rounded text-on-surface-variant/45 hover:text-primary transition-colors cursor-pointer"
                            title="Remove Contact"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </form>
                      </div>

                      <div className="space-y-1.5 text-xs text-on-surface-variant font-semibold">
                        {contact.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
                            <a href={`tel:${contact.phone}`} className="hover:text-primary transition-colors">
                              {contact.phone}
                            </a>
                          </div>
                        )}
                        {contact.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-3.5 w-3.5 text-primary shrink-0" />
                            <a href={`mailto:${contact.email}`} className="hover:text-primary transition-colors truncate">
                              {contact.email}
                            </a>
                          </div>
                        )}
                      </div>

                      {contact.notes && (
                        <div className="bg-surface-container p-2.5 rounded border border-primary/5 text-[10px] text-on-surface-variant/90 leading-relaxed font-semibold">
                          {contact.notes}
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar Creation Form */}
        <div>
          <form action={addContact} className="space-y-4 rounded glass-card p-6 bg-surface-container-lowest border border-primary/10 h-fit">
            <div>
              <h3 className="font-heading text-lg font-bold text-on-surface mb-4">Add Contact</h3>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-primary">Name</label>
              <input
                name="name"
                type="text"
                placeholder="e.g. Dr. Verma (Pediatrician)"
                className="w-full rounded border border-outline-variant bg-white px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none transition-colors"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-primary">Category</label>
              <select
                name="category"
                className="w-full rounded border border-outline-variant bg-white px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none transition-colors"
                required
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
                name="phone"
                type="tel"
                placeholder="e.g. +91 98765 43210"
                className="w-full rounded border border-outline-variant bg-white px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-primary">Email Address</label>
              <input
                name="email"
                type="email"
                placeholder="e.g. clinic@pediatric.com"
                className="w-full rounded border border-outline-variant bg-white px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-primary">Notes</label>
              <input
                name="notes"
                type="text"
                placeholder="Visiting hours, backup numbers..."
                className="w-full rounded border border-outline-variant bg-white px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              className="w-full mt-2 bg-primary text-on-primary font-sans text-xs font-bold uppercase tracking-widest py-3 rounded hover:brightness-110 active:scale-95 transition-all shadow-[0_0_15px_rgba(183,0,79,0.15)] flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Save Contact
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
