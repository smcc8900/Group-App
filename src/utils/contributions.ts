// Date and amount calculation utilities for contributions

export function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * @deprecated Use getContributionAmountForToday instead.
 */
export function getDefaultContributionAmount() {
  const today = new Date().getDate();
  if (today >= 1 && today <= 5) return 1000;
  if (today >= 6 && today <= 10) return 1100;
  return 1600;
}

// New logic as per user request
export function getContributionAmountForToday() {
  const today = new Date().getDate();
  if (today >= 1 && today <= 5) return 1000;
  if (today >= 6 && today <= 10) return 1100;
  return 1600;
}

export function getTimeLeft(dueDate: string) {
  const due = new Date(dueDate);
  const now = new Date();
  const diff = due.getTime() - now.getTime();
  if (isNaN(due.getTime()) || diff <= 0) return 'Due!';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return `${days}d ${hours}h ${minutes}m ${seconds}s left`;
}

export function getNextMonthFirstDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  // Next month, first day
  return new Date(year, month + 1, 1, 0, 0, 0);
}

export function getTimeLeftToNextMonth(nowDate: Date) {
  const due = getNextMonthFirstDate();
  const diff = due.getTime() - nowDate.getTime();
  if (diff <= 0) return 'Due!';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return `${days}d ${hours}h ${minutes}m ${seconds}s left`;
}

export function getUpiQrString(upiId: string, amount: number) {
  return `upi://pay?pa=${encodeURIComponent(upiId)}&pn=GroupContribution&am=${amount}`;
} 