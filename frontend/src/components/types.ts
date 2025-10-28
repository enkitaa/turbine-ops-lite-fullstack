export interface Turbine {
  id: string;
  name: string;
  manufacturer?: string;
  mwRating?: number;
  lat?: number;
  lng?: number;
}

export interface Inspection {
  id: string;
  date: string;
  inspectorName?: string;
  dataSource: string;
  rawPackageUrl?: string;
  turbine: Turbine;
  findings: Finding[];
  repairPlan?: RepairPlan;
}

export interface Finding {
  id: string;
  category: string;
  severity: number;
  estimatedCost: number;
  notes?: string;
  inspectionId: string;
}

export interface RepairPlan {
  id: string;
  priority: string;
  totalEstimatedCost: number;
  inspectionId: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "ENGINEER" | "VIEWER";
}

