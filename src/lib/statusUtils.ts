import type { ProjectStatus } from "@/lib/config/constants";
import type { I18nKey } from "@/i18n";

const STATUS_LABEL_KEYS: Record<ProjectStatus, I18nKey> = {
  "not-started": "dashboard.status.notStarted",
  "in-progress": "dashboard.status.inProgress",
  "in-review": "dashboard.status.inReview",
  "completed": "dashboard.status.completed",
};

export function getProjectStatusLabel(status: ProjectStatus, t: (key: I18nKey) => string): string {
  return t(STATUS_LABEL_KEYS[status]);
}
