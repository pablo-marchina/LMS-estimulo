import { ActivityCompactWorkspace } from "@/components/activity-compact-workspace";
import styles from "@/app/empreendedor/atividade/[stepInstanceId]/layout.module.css";

export function ActivityWorkspaceFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.activityLayout} data-activity-workspace data-active-section="conteudo">
      <ActivityCompactWorkspace />
      <div className={styles.activityPage} data-activity-page>
        {children}
      </div>
    </div>
  );
}
