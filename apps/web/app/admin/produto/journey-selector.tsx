import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import {
  versionStatus,
  type AdminProductPageModel,
} from "@/lib/admin/product-page-model";

export function JourneySelector({
  model,
}: {
  model: AdminProductPageModel;
}) {
  return (
    <Card className="grid gap-4">
      <div>
        <h2 className="font-semibold text-secondary">
          Qual jornada deseja administrar?
        </h2>
        <p className="mt-1 text-sm text-muted">
          Cada jornada aparece uma única vez: como rascunho ou publicada.
        </p>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="etapa" value={model.etapa} />
        <label className="grid min-w-72 flex-1 gap-1 text-sm font-medium text-ink">
          Jornada
          <Select name="versao" defaultValue={model.selectedVersionId}>
            <option value="">Criar nova jornada</option>
            {model.latestVersions.map((item) => (
              <option value={String(item.id)} key={String(item.id)}>
                {item.definitionName} · {versionStatus(item.status)}
              </option>
            ))}
          </Select>
        </label>
        <Button variant="secondary" type="submit">
          Abrir
        </Button>
      </form>
    </Card>
  );
}
