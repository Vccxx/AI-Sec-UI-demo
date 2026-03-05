import React from 'react'
import { Activity, Sparkles } from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

function TrendTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null

  const count = payload[0]?.value

  return (
    <div
      style={{
        background: 'rgba(250, 253, 255, 0.98)',
        border: '1px solid #bfd4ee',
        borderRadius: 8,
        padding: '8px 10px',
        color: '#17385f',
        fontSize: 12,
        lineHeight: 1.5,
        minWidth: 120,
        boxShadow: '0 10px 24px rgba(42, 88, 163, 0.16)',
      }}
    >
      <div style={{ color: '#4f6788' }}>时间：{label}</div>
      <strong style={{ color: '#1c5fb4' }}>攻击次数：{count} 次</strong>
    </div>
  )
}

function HeaderStats({ aiEfficiencyStages, attackTrend24h }) {
  const totalAlerts24h = attackTrend24h.reduce((sum, item) => sum + item.count, 0)
  const peak = Math.max(...attackTrend24h.map((item) => item.count))
  const avg = Math.round(attackTrend24h.reduce((sum, item) => sum + item.count, 0) / attackTrend24h.length)

  const stageNames = [
    aiEfficiencyStages?.[0]?.level ?? '规则过滤',
    aiEfficiencyStages?.[1]?.level ?? '语义分析模型过滤',
    aiEfficiencyStages?.[2]?.level ?? '大模型过滤',
  ]

  const initialBefore = Math.max(aiEfficiencyStages?.[0]?.before ?? 12403, totalAlerts24h + 200)
  let stage1After = Math.max(aiEfficiencyStages?.[0]?.after ?? Math.round(initialBefore * 0.2), totalAlerts24h + 120)
  let stage2After = Math.max(aiEfficiencyStages?.[1]?.after ?? Math.round(stage1After * 0.3), totalAlerts24h + 40)

  if (stage1After <= stage2After) {
    stage1After = stage2After + Math.max(12, Math.round(stage2After * 0.15))
  }
  if (stage2After <= totalAlerts24h) {
    stage2After = totalAlerts24h + Math.max(8, Math.round(totalAlerts24h * 0.12))
  }

  const stages = [
    { level: stageNames[0], before: initialBefore, after: stage1After },
    { level: stageNames[1], before: stage1After, after: stage2After },
    { level: stageNames[2], before: stage2After, after: totalAlerts24h },
  ].map((item) => ({
    ...item,
    rate: `${(((item.before - item.after) / item.before) * 100).toFixed(1)}%`,
  }))

  return (
    <div className="header-wrap">
      <div className="demo-card">
        <span>【demo】智能安全运营中心</span>
      </div>

      <div className="stat-card">
        <div className="card-title">
          <Sparkles size={16} />
          <span>AI三级降噪</span>
        </div>
        <div className="efficiency-flow">
          {stages.map((stage, index) => (
            <React.Fragment key={stage.level}>
              <div className="efficiency-stage">
                <span className="stage-name">{stage.level}</span>
                <strong className="stage-ratio">{stage.rate}</strong>
                <em className="stage-flow">
                  {stage.before.toLocaleString()} -&gt; {stage.after.toLocaleString()}
                </em>
              </div>
              {index < stages.length - 1 ? <span className="efficiency-arrow">→</span> : null}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="chart-card">
        <div className="card-title">
          <Activity size={16} />
          <span>24h攻击趋势图</span>
        </div>
        <div className="chart-area">
          <div className="trend-wrap">
            <div className="trend-chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={attackTrend24h} margin={{ top: 4, right: 6, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(47, 125, 246, 0.42)" />
                      <stop offset="100%" stopColor="rgba(47, 125, 246, 0.04)" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(109, 141, 184, 0.26)" vertical={false} />
                  <XAxis
                    dataKey="hour"
                    tick={{ fill: '#5f7897', fontSize: 10 }}
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(109, 141, 184, 0.36)' }}
                    interval={2}
                  />
                  <YAxis
                    tick={{ fill: '#5f7897', fontSize: 10 }}
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(109, 141, 184, 0.36)' }}
                    width={28}
                  />
                  <Tooltip content={<TrendTooltip />} wrapperStyle={{ outline: 'none' }} />
                  <Area type="monotone" dataKey="count" stroke="none" fill="url(#trendFill)" />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#2f7df6"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 3, strokeWidth: 0, fill: '#2f7df6' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="trend-meta">
              <div className="trend-meta-item">
                <span>峰值</span>
                <strong>{peak}</strong>
              </div>
              <div className="trend-meta-item">
                <span>均值</span>
                <strong>{avg}</strong>
              </div>
              <div className="trend-meta-item">
                <span>总告警</span>
                <strong>{totalAlerts24h}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HeaderStats
