export type EocSeverity = 'critical' | 'high' | 'medium' | 'low' | 'stable'

export type EocPlatformHealth = 'operational' | 'degraded' | 'critical'

export interface EocExecutiveBrief {
  headline: string
  summary: string
  posture: EocSeverity
  postureLabel: string
  keySignals: string[]
  lastUpdated: string
}

export interface EocRecentActivityItem {
  id: string
  timestamp: string
  relativeTime: string
  coordination: string
  title: string
  type: 'created' | 'escalated' | 'resolved' | 'ai_analysis' | 'status_change'
  severity: EocSeverity
}

export interface EocPrioritySituation {
  id: string
  rank: number
  title: string
  coordination: string
  severity: EocSeverity
  status: string
  waitingSince: string
  reason: string
}

export interface EocPlatformMetric {
  id: string
  label: string
  value: string
  delta?: string
  trend: 'up' | 'down' | 'stable'
  health: EocPlatformHealth
}

export interface EocAiSummary {
  generatedAt: string
  confidence: number
  narrative: string
  highlights: string[]
  recommendedFocus: string
}

export interface EocImpactNode {
  id: string
  label: string
  severity: EocSeverity
  activeSituations: number
  x: number
  y: number
}

export interface EocImpactEdge {
  from: string
  to: string
}

export interface EocImpactMiniMap {
  nodes: EocImpactNode[]
  edges: EocImpactEdge[]
  hotspotCoordination: string
}

export interface EocCoordinationStatus {
  id: string
  name: string
  health: EocPlatformHealth
  activeSituations: number
  criticalCount: number
  lastActivity: string
  coverage: number
}

export interface EocPendingAction {
  id: string
  title: string
  context: string
  dueLabel: string
  priority: EocSeverity
  owner: string
}

export interface EocExecutiveHomeData {
  brief: EocExecutiveBrief
  recentActivity: EocRecentActivityItem[]
  priorityQueue: EocPrioritySituation[]
  platformMetrics: EocPlatformMetric[]
  aiSummary: EocAiSummary
  impactMiniMap: EocImpactMiniMap
  coordinations: EocCoordinationStatus[]
  pendingActions: EocPendingAction[]
  sessionGap: string
}
