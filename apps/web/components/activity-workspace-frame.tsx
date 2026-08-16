import styles from "@/app/empreendedor/atividade/[stepInstanceId]/layout.module.css";

export function ActivityWorkspaceFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.activityLayout} data-activity-workspace>
      <div className={styles.activityPage} data-activity-page>
        {children}
      </div>
    </div>
  );
}
