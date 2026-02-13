const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function parsePlanned(dateStr) {
  if (!dateStr || typeof dateStr !== "string") {
    return null;
  }

  const [datePart, timePart = "00:00:00"] = dateStr.trim().split(" ");
  const datePieces = datePart.split("/").map((part) => Number(part));
  if (datePieces.length !== 3 || datePieces.some(Number.isNaN)) {
    return null;
  }

  const [day, month, year] = datePieces;
  const timePieces = timePart.split(":").map((part) => Number(part));
  if (timePieces.length !== 3 || timePieces.some(Number.isNaN)) {
    return null;
  }

  const [hour, minute, second] = timePieces;
  return new Date(year, month - 1, day, hour, minute, second);
}

export function formatDisplayDate(date) {
  if (!(date instanceof Date)) {
    return "";
  }

  const day = String(date.getDate()).padStart(2, "0");
  const month = MONTHS[date.getMonth()] || "";
  const year = String(date.getFullYear()).slice(-2);
  const base = `${day}-${month}-${year}`;

  if (date.getHours() === 0) {
    return base;
  }

  const time = formatTime(date);
  return `${base} ${time}`;
}

export function formatDisplayDateTime(date) {
  if (!(date instanceof Date)) {
    return "";
  }

  const day = String(date.getDate()).padStart(2, "0");
  const month = MONTHS[date.getMonth()] || "";
  const year = String(date.getFullYear()).slice(-2);
  const time = formatTime(date);
  return `${day}-${month}-${year} ${time}`;
}

export function formatTime(date) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

export function getCountdownTarget(plannedDate) {
  if (!(plannedDate instanceof Date)) {
    return null;
  }

  if (plannedDate.getHours() === 0) {
    return new Date(
      plannedDate.getFullYear(),
      plannedDate.getMonth(),
      plannedDate.getDate(),
      23,
      59,
      59
    );
  }

  return plannedDate;
}

export function formatCountdown(diffMs) {
  const isOverdue = diffMs < 0;
  const absMs = Math.abs(diffMs);
  const totalSeconds = Math.floor(absMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const value = `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
  return {
    isOverdue,
    text: isOverdue ? `Overdue by ${value}` : `Time remaining ${value}`
  };
}
