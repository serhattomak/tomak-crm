export type DashboardTab = "Overview" | "Sales" | "Activities";

export type DateRange = "today" | "week" | "month" | "quarter" | "year";

export type WidgetCategory =
  | "Sales"
  | "Leads"
  | "Activities"
  | "Team"
  | "General";

export type WidgetSpan = "full" | "half" | "third" | "two-thirds" | "quarter";

export interface WidgetMeta {
  category: WidgetCategory;
  defaultSpan: WidgetSpan;
  defaultTabs: DashboardTab[];
  description: string;
  iconName: string;
  id: string;
  title: string;
}

export interface TaskItem {
  assignedTo?: string;
  category?: string;
  completed: boolean;
  dueDate: string;
  id: string;
  priority: "low" | "medium" | "high" | "urgent";
  title: string;
}

export interface DealItem {
  closingDate: string;
  company: string;
  id: string;
  owner: {
    name: string;
    avatar?: string;
    initials: string;
  };
  probability: number;
  stage: "Discovery" | "Proposal" | "Negotiation" | "Won" | "Lost";
  title: string;
  value: number;
}

export interface ActivityItem {
  action: string;
  id: string;
  target: string;
  timestamp: string;
  type: "deal" | "lead" | "meeting" | "task" | "call";
  user: {
    name: string;
    avatar?: string;
    initials: string;
  };
}

export interface MeetingItem {
  attendees: string[];
  customer: string;
  date: string;
  id: string;
  link?: string;
  time: string;
  title: string;
  type: "video" | "phone" | "in-person";
}

export interface TeamMemberScore {
  achieved: number;
  avatarColor: string;
  dealsClosed: number;
  id: string;
  initials: string;
  name: string;
  rank: number;
  role: string;
  target: number;
}
