import { ButtonLink } from "@/components/ui/button";

export type AdminSectionNavItem = {
  href: string;
  label: string;
  active: boolean;
};

export function AdminSectionNav({
  items,
  label = "Seções desta área",
}: {
  items: AdminSectionNavItem[];
  label?: string;
}) {
  return (
    <nav className="grid gap-2 rounded-2xl border border-border bg-white p-2 sm:auto-cols-fr sm:grid-flow-col" aria-label={label}>
      {items.map((item) => (
        <ButtonLink
          key={item.href}
          href={item.href}
          variant={item.active ? "primary" : "ghost"}
          size="sm"
          className="w-full"
        >
          {item.label}
        </ButtonLink>
      ))}
    </nav>
  );
}

export function AdminDisclosure({
  title,
  description,
  children,
  open = false,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  open?: boolean;
}) {
  return (
    <details className="rounded-2xl border border-border bg-white" open={open}>
      <summary className="cursor-pointer list-none px-5 py-4 marker:content-none [&::-webkit-details-marker]:hidden">
        <strong className="block text-sm text-secondary">{title}</strong>
        <span className="mt-1 block text-xs leading-5 text-muted">{description}</span>
      </summary>
      <div className="border-t border-border p-5">{children}</div>
    </details>
  );
}
