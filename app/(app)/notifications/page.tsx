import { requireAccess } from "@/lib/auth";
import { storeApi } from "@/lib/data/store";
import { NotificationCenter } from "@/components/notification-center";
import { PageHeader } from "@/components/page-header";

export default async function NotificationsPage() {
  const user = await requireAccess("notifications");
  const notifications = storeApi.getNotifications();
  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Anomaly alerts, pipeline failures and KPI breaches pushed to every stakeholder. Critical items never miss the board."
      />
      <NotificationCenter initial={notifications} />
    </div>
  );
}
