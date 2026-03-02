import React from 'react'
import { Activity, Sparkles } from 'lucide-react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

function AttackPieTooltip({ active, payload }) {
  if (!active || !payload || payload.length === 0) return null

  const item = payload[0]?.payload
  if (!item) return null

  return (
    <div
      style={{
        background: 'rgba(2, 6, 23, 0.96)',
        border: '1px solid rgba(30, 41, 59, 0.95)',
        borderRadius: 8,
        padding: '8px 10px',
        color: '#e2e8f0',
        fontSize: 12,
        lineHeight: 1.5,
        minWidth: 120,
      }}
    >
      <div style={{ color: '#cbd5e1' }}>{item.category}</div>
      <strong style={{ color: '#22d3ee' }}>{item.count} 次</strong>
    </div>
  )
}

function HeaderStats({ noiseReduction, attackClassStats }) {
  return (
    <div className="header-wrap">
      <div className="demo-card">
        <span>【demo】智能安全运营中心</span>
      </div>

      <div className="stat-card">
        <div className="card-title">
          <Sparkles size={16} />
          <span>AI 运营效能</span>
        </div>
        <div className="noise-metrics">
          <div className="metric-row">
            <span>今日告警降噪比</span>
            <strong>
              {noiseReduction.before.toLocaleString()} -&gt; {noiseReduction.after}
            </strong>
          </div>
          <div className="metric-row emphasis">
            <span>降噪率</span>
            <strong>{noiseReduction.rate}</strong>
          </div>
        </div>
      </div>

      <div className="chart-card">
        <div className="card-title">
          <Activity size={16} />
          <span>攻击分类统计</span>
        </div>
        <div className="chart-area">
          <div className="chart-flex">
            <div className="pie-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <Pie
                    data={attackClassStats}
                    dataKey="count"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius="80%"
                    innerRadius="54%"
                    paddingAngle={2}
                    stroke="rgba(2,6,23,0.9)"
                    strokeWidth={1}
                  >
                    {attackClassStats.map((entry) => (
                      <Cell key={entry.category} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={<AttackPieTooltip />}
                    wrapperStyle={{ outline: 'none' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="pie-legend-list">
              {attackClassStats.map((item) => (
                <div key={item.category} className="pie-legend-item">
                  <span className="dot" style={{ backgroundColor: item.color }} />
                  <span className="label">{item.category}</span>
                  <strong>{item.count}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HeaderStats
