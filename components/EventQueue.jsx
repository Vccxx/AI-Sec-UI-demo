import React, { useMemo, useState } from 'react'
import { AlertTriangle, ChevronRight, Flame } from 'lucide-react'

function EventQueue({ events, noiseEvents, selectedItem, onSelectAttack, onSelectNoise }) {
  const [activeTab, setActiveTab] = useState('attack')
  const [attackFilter, setAttackFilter] = useState('全部')
  const [noiseFilter, setNoiseFilter] = useState('全部')

  const statusCount = useMemo(
    () =>
      events.reduce(
        (acc, event) => {
          acc[event.disposalStatus] = (acc[event.disposalStatus] ?? 0) + 1
          return acc
        },
        { 未处置: 0, 处置中: 0, 已处置: 0 },
      ),
    [events],
  )

  const noiseCount = useMemo(
    () =>
      noiseEvents.reduce(
        (acc, item) => {
          acc[item.reviewStatus] = (acc[item.reviewStatus] ?? 0) + 1
          return acc
        },
        { 已忽略: 0, 待复核: 0 },
      ),
    [noiseEvents],
  )

  const filteredAttackEvents = useMemo(() => {
    if (attackFilter === '全部') return events
    return events.filter((event) => event.disposalStatus === attackFilter)
  }, [attackFilter, events])

  const sortedAttackEvents = useMemo(() => {
    const severityOrder = { 紧急: 3, 高危: 2, 中危: 1 }
    return [...filteredAttackEvents].sort((a, b) => {
      const diff = (severityOrder[b.severity] ?? 0) - (severityOrder[a.severity] ?? 0)
      if (diff !== 0) return diff
      return b.time.localeCompare(a.time)
    })
  }, [filteredAttackEvents])

  const filteredNoiseEvents = useMemo(() => {
    if (noiseFilter === '全部') return noiseEvents
    return noiseEvents.filter((item) => item.reviewStatus === noiseFilter)
  }, [noiseEvents, noiseFilter])

  return (
    <div className="queue-wrap">
      <div className="panel-title">
        <Flame size={16} />
        <span>安全事件队列</span>
      </div>

      <div className="queue-tabs">
        <button
          type="button"
          className={`queue-tab ${activeTab === 'attack' ? 'active' : ''}`}
          onClick={() => setActiveTab('attack')}
        >
          攻击事件
        </button>
        <button
          type="button"
          className={`queue-tab ${activeTab === 'noise' ? 'active' : ''}`}
          onClick={() => setActiveTab('noise')}
        >
          AI降噪
        </button>
      </div>

      {activeTab === 'attack' ? (
        <>
          <div className="queue-summary">
            <div className="summary-total">
              <span>告警总数</span>
              <strong>{filteredAttackEvents.length}/{events.length}</strong>
            </div>
            <div className="summary-status-grid">
              <button
                type="button"
                className={`summary-status unhandled ${attackFilter === '未处置' ? 'active' : ''}`}
                onClick={() => setAttackFilter((prev) => (prev === '未处置' ? '全部' : '未处置'))}
              >
                <span>未处置</span>
                <strong>{statusCount['未处置']}</strong>
              </button>
              <button
                type="button"
                className={`summary-status handling ${attackFilter === '处置中' ? 'active' : ''}`}
                onClick={() => setAttackFilter((prev) => (prev === '处置中' ? '全部' : '处置中'))}
              >
                <span>处置中</span>
                <strong>{statusCount['处置中']}</strong>
              </button>
              <button
                type="button"
                className={`summary-status handled ${attackFilter === '已处置' ? 'active' : ''}`}
                onClick={() => setAttackFilter((prev) => (prev === '已处置' ? '全部' : '已处置'))}
              >
                <span>已处置</span>
                <strong>{statusCount['已处置']}</strong>
              </button>
            </div>
          </div>

          <div className="queue-scrollbox">
            <div className="queue-list">
              {sortedAttackEvents.length === 0 ? <div className="empty-tip">当前筛选条件下暂无告警。</div> : null}
              {sortedAttackEvents.map((event) => {
                const active = selectedItem.type === 'attack' && event.id === selectedItem.id

                return (
                  <button
                    key={event.id}
                    type="button"
                    className={`event-card ${active ? 'active' : ''}`}
                    onClick={() => onSelectAttack(event.id)}
                  >
                    <div className="event-top">
                      <span className={`severity ${event.severity === '紧急' ? 'critical' : 'warning'}`}>
                        <AlertTriangle size={14} />
                        {event.severity}
                      </span>
                      <span className={`dispose-state state-${event.disposalStatus}`}>{event.disposalStatus}</span>
                    </div>
                    <h3>{event.title}</h3>
                    <p>{event.summary}</p>
                    <div className="event-tags">
                      <span className="event-tag focus">{event.focusType}</span>
                      <span className="event-tag window">{event.timeWindow}</span>
                    </div>
                    <div className="event-target">
                      <span>
                        {event.time} · {event.target}
                      </span>
                      <ChevronRight size={14} />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="queue-summary">
            <div className="summary-total">
              <span>AI降噪总量</span>
              <strong>{filteredNoiseEvents.length}/{noiseEvents.length}</strong>
            </div>
            <div className="summary-status-grid noise">
              <button
                type="button"
                className={`summary-status handled ${noiseFilter === '已忽略' ? 'active' : ''}`}
                onClick={() => setNoiseFilter((prev) => (prev === '已忽略' ? '全部' : '已忽略'))}
              >
                <span>已忽略</span>
                <strong>{noiseCount['已忽略']}</strong>
              </button>
              <button
                type="button"
                className={`summary-status handling ${noiseFilter === '待复核' ? 'active' : ''}`}
                onClick={() => setNoiseFilter((prev) => (prev === '待复核' ? '全部' : '待复核'))}
              >
                <span>待复核</span>
                <strong>{noiseCount['待复核']}</strong>
              </button>
              <button
                type="button"
                className={`summary-status neutral ${noiseFilter === '全部' ? 'active' : ''}`}
                onClick={() => setNoiseFilter('全部')}
              >
                <span>无害判定率</span>
                <strong>93.6%</strong>
              </button>
            </div>
          </div>

          <div className="queue-scrollbox">
            <div className="queue-list">
              {filteredNoiseEvents.length === 0 ? <div className="empty-tip">当前筛选条件下暂无告警。</div> : null}
              {filteredNoiseEvents.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={`event-card noise-card ${selectedItem.type === 'noise' && selectedItem.id === item.id ? 'active' : ''}`}
                  onClick={() => onSelectNoise(item.id)}
                >
                  <div className="event-top">
                    <span className="severity warning">
                      <AlertTriangle size={14} />
                      误报
                    </span>
                    <span className={`dispose-state state-${item.reviewStatus}`}>{item.reviewStatus}</span>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.reason}</p>
                  <div className="event-tags">
                    <span className="event-tag focus">{item.tag}</span>
                    <span className="event-tag window">置信度 {item.confidence}</span>
                  </div>
                  <div className="event-target">
                    <span>
                      {item.time} · {item.source}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default EventQueue
