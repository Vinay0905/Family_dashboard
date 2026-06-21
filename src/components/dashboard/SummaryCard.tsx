type SummaryCardProps = {
  title: string;
  value: string | number;
  description: string;
};

export function SummaryCard({ title, value, description }: SummaryCardProps) {
  return (
    <article className="rounded-lg border bg-white p-5">
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </article>
  );
}
