export type DashboardTab = "Overview" | "Sales" | "Activities"

export type DateRange = "today" | "week" | "month" | "quarter" | "year"

export type WidgetCategory =
  "Sales" | "Leads" | "Activities" | "Team" | "General"

export type WidgetSpan = "full" | "half" | "third" | "two-thirds" | "quarter"

export interface WidgetMeta {
  id: string
  title: string
  description: string
  category: WidgetCategory
  defaultTabs: DashboardTab[]
  defaultSpan: WidgetSpan
  iconName: string
}

export interface TaskItem {
  id: string
  title: string
  dueDate: string
  priority: "low" | "medium" | "high" | "urgent"
  completed: boolean
  assignedTo?: string
  category?: string
}

export interface DealItem {
  id: string
  title: string
  company: string
  value: number
  stage: "Discovery" | "Proposal" | "Negotiation" | "Won" | "Lost"
  closingDate: string
  owner: {
    name: string
    avatar?: string
    initials: string
  }
  probability: number
}

export interface ActivityItem {
  id: string
  user: {
    name: string
    avatar?: string
    initials: string
  }
  action: string
  target: string
  timestamp: string
  type: "deal" | "lead" | "meeting" | "task" | "call"
}

export interface MeetingItem {
  id: string
  title: string
  customer: string
  time: string
  date: string
  type: "video" | "phone" | "in-person"
  link?: string
  attendees: string[]
}

export interface TeamMemberScore {
  id: string
  name: string
  role: string
  initials: string
  avatarColor: string
  target: number
  achieved: number
  dealsClosed: number
  rank: number
}
