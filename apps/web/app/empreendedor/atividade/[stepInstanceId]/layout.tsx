import styles from "./layout.module.css";

export default function ActivityLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.activityLayout} data-activity-workspace>
      <div className={styles.activityPage} data-activity-page>
        {children}
      </div>
    </div>
  );
}
