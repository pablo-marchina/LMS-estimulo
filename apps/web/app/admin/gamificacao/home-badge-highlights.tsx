import type { AdminHomeBadgeHighlights } from "@/lib/engagement/contracts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Table, TableScroll, Td, Th } from "@/components/ui/table";
import { saveHomeBadgeHighlightsAction } from "./actions";

export function HomeBadgeHighlights({ workspace }: { workspace: AdminHomeBadgeHighlights }) {
  return (
    <Card>
      <div>
        <h2 className="text-lg font-black text-secondary">Selos em destaque na Home</h2>
        <p className="mt-1 text-sm text-muted">Defina quais selos serão exibidos e a ordem. Use 0 para retirar um selo do destaque.</p>
      </div>
      <form action={saveHomeBadgeHighlightsAction} className="mt-5 grid gap-4">
        <Label className="max-w-xs">Limite de selos exibidos<Input name="max_items" type="number" min={1} max={12} defaultValue={workspace.max_items} required /></Label>
        {workspace.badges.length ? (
          <TableScroll><Table><thead><tr><Th>Selo</Th><Th>Descrição</Th><Th className="w-32">Ordem</Th></tr></thead><tbody>{workspace.badges.map((badge) => (
            <tr key={badge.badge_version_id}>
              <Td><strong>{badge.title}</strong></Td>
              <Td>{badge.description}</Td>
              <Td><Input aria-label={`Ordem de ${badge.title}`} name={`badge_position_${badge.badge_version_id}`} type="number" min={0} max={99} defaultValue={badge.position ?? 0} /></Td>
            </tr>
          ))}</tbody></Table></TableScroll>
        ) : <p className="text-sm text-muted">Publique ao menos um selo para configurá-lo como destaque.</p>}
        <Button type="submit" className="w-fit">Salvar destaques</Button>
      </form>
    </Card>
  );
}
