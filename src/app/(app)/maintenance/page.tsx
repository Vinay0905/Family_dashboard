import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentFamilyForUser } from "@/services/dashboard.service";
import { getMaintenanceAssets, createMaintenanceAsset, deleteMaintenanceAsset } from "@/services/planning.service";
import { Wrench, Calendar, Phone, Plus, Trash2, AlertTriangle, ShieldAlert } from "lucide-react";

export default async function MaintenancePage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const member = await getCurrentFamilyForUser(userData.user.id);
  if (!member) redirect("/onboarding");
  const assets = await getMaintenanceAssets(member.family_id);

  // Server Action
  async function addAsset(formData: FormData) {
    "use server";
    const name = String(formData.get("name") || "").trim();
    const lastServiceDate = String(formData.get("lastServiceDate") || "");
    const nextDueDate = String(formData.get("nextDueDate") || "");
    const vendor = String(formData.get("vendor") || "").trim();
    const notes = String(formData.get("notes") || "").trim();

    if (!name) return;

    const supabase = await createClient();
    const { data: userSession } = await supabase.auth.getUser();
    if (!userSession.user) redirect("/login");

    const mem = await getCurrentFamilyForUser(userSession.user.id);
    if (!mem) return;

    await createMaintenanceAsset({
      family_id: mem.family_id,
      created_by: userSession.user.id,
      name,
      last_service_date: lastServiceDate || undefined,
      next_due_date: nextDueDate || undefined,
      vendor: vendor || undefined,
      notes: notes || undefined,
    });

    revalidatePath("/maintenance");
  }

  async function removeAsset(formData: FormData) {
    "use server";
    const assetId = String(formData.get("assetId"));
    if (!assetId) return;

    await deleteMaintenanceAsset(assetId);
    revalidatePath("/maintenance");
  }

  const today = new Date().toISOString().slice(0, 10);
  
  // Calculate dynamic overdue items
  const overdueAssets = assets.filter(asset => asset.next_due_date && asset.next_due_date < today);

  return (
    <div className="space-y-10">
      {/* Header */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="font-heading text-4xl text-on-surface tracking-tight font-extrabold">
            Maintenance <span className="text-primary italic">Tracker</span>
          </h1>
          <p className="font-sans text-sm text-on-surface-variant mt-2 font-medium">
            Monitor ACs, water filters, vehicles, and home appliances to keep your home running smoothly.
          </p>
        </div>
      </section>

      {/* Overdue Warning Banner */}
      {overdueAssets.length > 0 && (
        <section className="mb-6">
          <div className="relative overflow-hidden bg-white border border-primary/20 rounded p-6 neon-glow flex flex-col md:flex-row items-center gap-6 group">
            <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-700 pointer-events-none">
              <span className="material-symbols-outlined text-[100px] text-primary">warning</span>
            </div>
            <div className="flex-shrink-0 w-16 h-16 bg-primary/10 rounded border border-primary/20 flex items-center justify-center text-primary">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <div className="flex-grow">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 bg-primary/10 text-primary rounded font-sans text-[10px] font-bold uppercase tracking-wider mb-1.5">
                Attention Required
              </div>
              <h2 className="font-heading text-xl font-extrabold text-on-surface mb-1">
                {overdueAssets.length} Item{overdueAssets.length > 1 ? "s" : ""} Overdue for Service
              </h2>
              <p className="font-sans text-xs text-on-surface-variant font-medium">
                {overdueAssets.map(a => a.name).join(", ")} {overdueAssets.length > 1 ? "require" : "requires"} immediate checkup.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Grid Container */}
      <section className="grid gap-8 lg:grid-cols-[1fr_320px]">
        {/* Active Assets Grid */}
        <div className="space-y-6">
          <h3 className="font-heading text-lg font-bold text-on-surface flex items-center gap-3 border-b border-primary/10 pb-2">
            <span className="w-6 h-1 bg-primary rounded-full"></span> Active Appliances & Assets
          </h3>
          
          {assets.length === 0 ? (
            <div className="rounded border border-dashed border-primary/10 p-10 text-center text-on-surface-variant/50">
              <Wrench className="mx-auto h-8 w-8 mb-2 opacity-30 text-primary" />
              <p className="text-sm font-medium">No assets registered yet.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {assets.map((asset) => {
                const isOverdue = asset.next_due_date && asset.next_due_date < today;
                return (
                  <div
                    key={asset.id}
                    className="bg-white border border-outline-variant hover:border-primary group transition-all duration-300 rounded overflow-hidden flex flex-col hover:shadow-[0_0_20px_rgba(183,0,79,0.03)]"
                  >
                    <div className="p-5 flex-grow space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-heading text-base font-extrabold text-on-surface leading-tight">
                            {asset.name}
                          </h4>
                          {asset.vendor && (
                            <p className="text-[10px] text-on-surface-variant/70 font-semibold uppercase mt-0.5 tracking-wider">
                              Vendor: {asset.vendor}
                            </p>
                          )}
                        </div>
                        {isOverdue && (
                          <span className="bg-error text-on-error px-2 py-0.5 rounded text-[8px] font-bold tracking-wider uppercase">
                            Overdue
                          </span>
                        )}
                      </div>

                      <div className="space-y-2 text-xs font-semibold text-on-surface-variant">
                        <div className="flex justify-between border-b border-primary/5 pb-1.5">
                          <span>Last Service:</span>
                          <span className="text-on-surface">
                            {asset.last_service_date ? new Date(asset.last_service_date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between pb-1.5">
                          <span>Next Due:</span>
                          <span className={isOverdue ? "text-error font-bold" : "text-on-surface"}>
                            {asset.next_due_date ? new Date(asset.next_due_date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : "Not set"}
                          </span>
                        </div>
                      </div>

                      {asset.notes && (
                        <div className="bg-surface-container p-2.5 rounded border border-primary/5 text-[11px] text-on-surface-variant font-medium">
                          {asset.notes}
                        </div>
                      )}
                    </div>

                    <div className="p-3 bg-surface-container-low/50 border-t border-primary/5 flex justify-end">
                      <form action={removeAsset}>
                        <input type="hidden" name="assetId" value={asset.id} />
                        <button
                          type="submit"
                          className="flex items-center gap-1 py-1.5 px-3 bg-primary/5 hover:bg-primary text-primary hover:text-white border border-primary/10 hover:border-transparent text-[10px] font-bold uppercase tracking-wider rounded transition-all cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Remove
                        </button>
                      </form>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Log Asset Sidebar */}
        <div>
          <form action={addAsset} className="space-y-4 rounded glass-card p-6 bg-surface-container-lowest border border-primary/10 h-fit">
            <div>
              <h3 className="font-heading text-lg font-bold text-on-surface mb-4">Register Asset</h3>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-primary">Asset Name</label>
              <input
                name="name"
                type="text"
                placeholder="e.g. Living Room AC, Tesla Model 3"
                className="w-full rounded border border-outline-variant bg-white px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none transition-colors"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-primary">Last Serviced</label>
              <input
                name="lastServiceDate"
                type="date"
                className="w-full rounded border border-outline-variant bg-white px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-primary">Next Due Date</label>
              <input
                name="nextDueDate"
                type="date"
                className="w-full rounded border border-outline-variant bg-white px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-primary">Vendor Contact / Phone</label>
              <input
                name="vendor"
                type="text"
                placeholder="e.g. Kent Purifiers, Urban Company"
                className="w-full rounded border border-outline-variant bg-white px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-primary">Notes</label>
              <input
                name="notes"
                type="text"
                placeholder="e.g. Filter size, service plans..."
                className="w-full rounded border border-outline-variant bg-white px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              className="w-full mt-2 bg-primary text-on-primary font-sans text-xs font-bold uppercase tracking-widest py-3 rounded hover:brightness-110 active:scale-95 transition-all shadow-[0_0_15px_rgba(183,0,79,0.15)] flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Add Asset
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
