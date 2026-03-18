export interface WebClockInSettings {
  enabled: boolean;
  commentMandatory: boolean;
  ipRestrictionEnabled: boolean;
  allowedIPs: string[];
}

export interface RemoteClockInSettings {
  enabled: boolean;
  capturesLocation: boolean;
  ipRestrictionEnabled: boolean;
  allowedIPs: string[];
}

export interface MobileClockInSettings {
  enabled: boolean;
}

export interface CaptureSettings {
  biometricEnabled: boolean;
  webClockIn: WebClockInSettings;
  remoteClockIn: RemoteClockInSettings;
  mobileClockIn: MobileClockInSettings;
}

export interface PartialDaySubSetting {
  enabled: boolean;
  maxMinutes: number;
}

export interface PartialDaySettings {
  enabled: boolean;
  limitUnit: 'minutes' | 'hours';
  limitValue: number;
  limitPeriod: 'day' | 'week' | 'month';
  lateArrival: PartialDaySubSetting;
  earlyLeaving: PartialDaySubSetting;
  interveningTimeOff: PartialDaySubSetting;
  requestsAllowed: number;
  requestsPeriod: 'monthly' | 'weekly';
  approvalRequired: boolean;
  commentMandatory: boolean;
  advanceDaysLimit: number;
  allowPastDated: boolean;
}

export interface AdjustmentSettings {
  enabled: boolean;
  adjustmentEntries: number;
  adjustmentPeriod: 'week' | 'month';
  pastDaysLimit: number;
  lastDateOfMonth: number;
}

export interface RegularizationSettings {
  enabled: boolean;
  entries: number;
  period: 'week' | 'month';
  pastDaysLimit: number;
  lastDateOfMonth: number;
  reasonRequired: boolean;
}

export interface ApprovalLevel {
  level: number;
  assigneeType: 'reporting_manager' | 'hr' | 'custom';
}

export interface ApprovalSettings {
  enabled: boolean;
  thresholdCount: number;
  thresholdPeriod: 'all' | 'month';
  levels: ApprovalLevel[];
  autoApproveIfMissing: boolean;
  skipApprovalForEveryRequest: boolean;
}

export const DEFAULT_CAPTURE_SETTINGS: CaptureSettings = {
  biometricEnabled: false,
  webClockIn: {
    enabled: true,
    commentMandatory: false,
    ipRestrictionEnabled: false,
    allowedIPs: [],
  },
  remoteClockIn: {
    enabled: false,
    capturesLocation: true,
    ipRestrictionEnabled: false,
    allowedIPs: [],
  },
  mobileClockIn: {
    enabled: false,
  },
};

export const DEFAULT_PARTIAL_DAY_SETTINGS: PartialDaySettings = {
  enabled: false,
  limitUnit: 'minutes',
  limitValue: 120,
  limitPeriod: 'day',
  lateArrival: { enabled: true, maxMinutes: 120 },
  earlyLeaving: { enabled: true, maxMinutes: 120 },
  interveningTimeOff: { enabled: true, maxMinutes: 120 },
  requestsAllowed: 2,
  requestsPeriod: 'monthly',
  approvalRequired: true,
  commentMandatory: false,
  advanceDaysLimit: 7,
  allowPastDated: true,
};

export const DEFAULT_ADJUSTMENT_SETTINGS: AdjustmentSettings = {
  enabled: false,
  adjustmentEntries: 2,
  adjustmentPeriod: 'month',
  pastDaysLimit: 7,
  lastDateOfMonth: 25,
};

export const DEFAULT_REGULARIZATION_SETTINGS: RegularizationSettings = {
  enabled: false,
  entries: 2,
  period: 'month',
  pastDaysLimit: 7,
  lastDateOfMonth: 25,
  reasonRequired: true,
};

export const DEFAULT_APPROVAL_SETTINGS: ApprovalSettings = {
  enabled: false,
  thresholdCount: 3,
  thresholdPeriod: 'month',
  levels: [{ level: 1, assigneeType: 'reporting_manager' }],
  autoApproveIfMissing: false,
  skipApprovalForEveryRequest: false,
};
