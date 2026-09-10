/* Hallmark · pipeline-helpers · genre: modern-minimal */

export const formatCurrency = (val: number, cur = "TRY") =>
  new Intl.NumberFormat("tr-TR", {
    currency: cur === "TRY" ? "TRY" : cur,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(val);

export const getPriorityBadgeClass = (priority: string) => {
  switch (priority) {
    case "Urgent":
      return "bg-rose-500/10 text-rose-600 border-rose-500/20";
    case "High":
      return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    case "Medium":
      return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    default:
      return "bg-muted text-muted-foreground border-border";
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
      return "bg-purple-500/10 text-purple-600 border-purple-500/20";
    case "WebForm":
    case "Website":
      return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    case "Campaign":
      return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    default:
      return "bg-muted text-muted-foreground border-border";
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
