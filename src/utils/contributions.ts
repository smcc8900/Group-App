// Date and amount calculation utilities for contributions
import { getStoredGroupInfo } from './paymentSettings';

export function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * @deprecated Use getContributionAmountForToday instead.
 */
export function getDefaultContributionAmount() {
  return getContributionAmountForToday();
}

// New logic that uses cumulative fine rules from group settings
export function getContributionAmountForToday() {
  const groupInfo = getStoredGroupInfo();
  if (!groupInfo || !groupInfo.group) {
    // Fallback to default values if no group info
    const today = new Date().getDate();
    if (today >= 1 && today <= 5) return 1000;
    if (today >= 6 && today <= 10) return 1100;
    return 1600;
  }

  const { group } = groupInfo;
  const baseAmount = group.baseAmount || 1000;
  const fineRules = group.fineRules || [];
  const today = new Date();
  const currentYear = today.getFullYear();
  const todayDateOnly = new Date(currentYear, today.getMonth(), today.getDate());

  // Cumulative fine logic: sum all fines whose fromDate <= today
  let totalFine = 0;
  for (const rule of fineRules) {
    if (rule.fromDate && rule.amount) {
      const fromDate = new Date(rule.fromDate);
      const ruleFromDate = new Date(currentYear, fromDate.getMonth(), fromDate.getDate());
      if (todayDateOnly >= ruleFromDate) {
        totalFine += Number(rule.amount);
      }
    }
  }
  return baseAmount + totalFine;
}

// Get detailed contribution breakdown (cumulative fines)
export function getContributionBreakdown() {
  const groupInfo = getStoredGroupInfo();
  if (!groupInfo || !groupInfo.group) {
    return {
      baseAmount: 1000,
      fineAmount: 0,
      totalAmount: 1000,
      appliedRules: [] as any[]
    };
  }

  const { group } = groupInfo;
  const baseAmount = group.baseAmount || 1000;
  const fineRules = group.fineRules || [];
  const today = new Date();
  const currentYear = today.getFullYear();
  const todayDateOnly = new Date(currentYear, today.getMonth(), today.getDate());
  let fineAmount = 0;
  let appliedRules: any[] = [];
  for (const rule of fineRules) {
    if (rule.fromDate && rule.amount) {
      const fromDate = new Date(rule.fromDate);
      const ruleFromDate = new Date(currentYear, fromDate.getMonth(), fromDate.getDate());
      if (todayDateOnly >= ruleFromDate) {
        fineAmount += Number(rule.amount);
        appliedRules.push(rule);
      }
    }
  }
  return {
    baseAmount,
    fineAmount,
    totalAmount: baseAmount + fineAmount,
    appliedRules
  };
}

// Get all fine rules for display
export function getAllFineRules() {
  const groupInfo = getStoredGroupInfo();
  if (!groupInfo || !groupInfo.group) {
    return [];
  }
  return groupInfo.group.fineRules || [];
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