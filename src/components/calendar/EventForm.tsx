import { createEventSchema } from "@/lib/validations/event.schema";

export function EventForm({ action }: { action: (formData: FormData) => Promise<void> }) {
  return (
    <form action={action} className="space-y-5 rounded glass-card p-6 h-fit bg-surface-container-lowest border border-primary/10">
      <div>
        <h3 className="font-heading text-lg font-bold text-on-surface mb-4">Add Family Event</h3>
      </div>
      
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-wider text-primary">Event Title</label>
        <input 
          name="title" 
          type="text"
          className="w-full rounded border border-outline-variant bg-surface-container-low px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none transition-colors" 
          placeholder="e.g. Dentist Appointment" 
          required 
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-wider text-primary">Date & Time</label>
        <input 
          name="start_at" 
          type="datetime-local" 
          className="w-full rounded border border-outline-variant bg-surface-container-low px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none transition-colors" 
          required 
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-wider text-primary">Category</label>
        <select 
          name="category" 
          className="w-full rounded border border-outline-variant bg-surface-container-low px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none transition-colors" 
          defaultValue="family"
        >
          <option value="family">Family</option>
          <option value="school">School</option>
          <option value="work">Work</option>
          <option value="travel">Travel</option>
          <option value="birthday">Birthday</option>
          <option value="medical">Medical</option>
          <option value="other">Other</option>
        </select>
      </div>

      <button 
        type="submit" 
        className="w-full mt-2 bg-primary text-on-primary font-sans text-xs font-bold uppercase tracking-widest py-3 rounded hover:brightness-110 active:scale-95 transition-all shadow-[0_0_15px_rgba(183,0,79,0.15)] flex items-center justify-center gap-2 cursor-pointer"
      >
        <span className="material-symbols-outlined text-[16px]">add</span>
        Add Event
      </button>
    </form>
  );
}

export function parseEventForm(formData: FormData) {
  return createEventSchema.parse({
    title: String(formData.get("title")),
    start_at: new Date(String(formData.get("start_at"))).toISOString(),
    category: String(formData.get("category")),
    is_personal: false,
  });
}