export const formatCurrency = (val: number, cur = "TRY") =>
  new Intl.NumberFormat("tr-TR", {
    currency: cur === "TRY" ? "TRY" : cur,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(val);

/**
 * Chip tones follow the shell spec (§3.1, §5): soft surface + ink text, no
 * border. Keep the pairs together — a soft background without its ink is the
 * contrast bug the standards warn about (sec.1.2.1).
 */
export const getPriorityBadgeClass = (priority: string) => {
  switch (priority) {
    case "Urgent":
      return "bg-danger-soft text-danger-ink";
    case "High":
      return "bg-warning-soft text-warning-ink";
    case "Medium":
      return "bg-info-soft text-info-ink";
    default:
      return "bg-muted text-muted-foreground";
  }
};

export const getPriorityLabel = (priority: string) => {
  switch (priority) {
    case "Urgent":
      return "Acil";
    case "High":
      return "Yüksek";
    case "Medium":
      return "Orta";
    case "Low":
      return "Düşük";
    default:
      return priority;
  }
};

export const getSourceBadgeClass = (source: string) => {
  switch (source) {
    case "LiveChat":
      return "bg-accent-soft text-accent-foreground";
    case "WebForm":
    case "Website":
      return "bg-info-soft text-info-ink";
    case "Campaign":
      return "bg-warning-soft text-warning-ink";
    default:
      return "bg-muted text-muted-foreground";
  }
};

export const getSourceLabel = (source: string) => {
  switch (source) {
    case "LiveChat":
      return "Canlı Destek";
    case "WebForm":
    case "Website":
      return "Web Formu";
    case "Campaign":
      return "Kampanya";
    case "Referral":
      return "Tavsiye";
    case "InboundCall":
      return "Gelen Arama";
    default:
      return "Manuel";
  }
};
