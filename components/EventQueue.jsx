import React, { useMemo, useState } from 'react'
import { AlertTriangle, ChevronRight, Flame } from 'lucide-react'

function EventQueue({
  events,
  noiseEvents,
  selectedItem,
  onSelectAttack,
  onSelectNoise,
  views,
  activeViewId,
  onSwitchView,
  onCloseView,
}) {
  const [activeTab, setActiveTab] = useState('attack')
  const [attackFilter, setAttackFilter] = useState('全部')
  const [noiseFilter, setNoiseFilter] = useState('全部')
  const [attackSort, setAttackSort] = useState('time')

  const statusCount = useMemo(
    () =>
      events.reduce(
        (acc, event) => {
          const normalized = event.disposalStatus === '已处置' ? '已处置' : '未处置'
          acc[normalized] = (acc[normalized] ?? 0) + 1
          return acc
        },
        { 未处置: 0, 已处置: 0 },
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
    return events.filter((event) => (event.disposalStatus === '已处置' ? '已处置' : '未处置') === attackFilter)
  }, [attackFilter, events])

  const sortedAttackEvents = useMemo(() => {
    const severityOrder = { 紧急: 3, 高危: 2, 中危: 1 }
    return [...filteredAttackEvents].sort((a, b) => {
      if (attackSort === 'severity') {
        const diff = (severityOrder[b.severity] ?? 0) - (severityOrder[a.severity] ?? 0)
        if (diff !== 0) return diff
        return b.time.localeCompare(a.time)
      }

      const timeDiff = b.time.localeCompare(a.time)
      if (timeDiff !== 0) return timeDiff
      return (severityOrder[b.severity] ?? 0) - (severityOrder[a.severity] ?? 0)
    })
  }, [attackSort, filteredAttackEvents])

  const filteredNoiseEvents = useMemo(() => {
    if (noiseFilter === '全部') return noiseEvents
    return noiseEvents.filter((item) => item.reviewStatus === noiseFilter)
  }, [noiseEvents, noiseFilter])

  return (
    <div className="queue-wrap">
      <div className="queue-head">
        <div className="panel-title">
          <Flame size={16} />
          <span>安全事件队列</span>
        </div>

        <div className="workspace-tabs compact">
          {views.map((view) => (
            <div key={view.id} className={`workspace-tab ${activeViewId === view.id ? 'active' : ''}`}>
              <button type="button" onClick={() => onSwitchView(view.id)}>
                {view.title}
              </button>
              {view.id !== 'main' ? (
                <button type="button" className="close" onClick={() => onCloseView(view.id)}>
                  x
                </button>
              ) : null}
            </div>
          ))}
        </div>
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
                className={`summary-status handled ${attackFilter === '已处置' ? 'active' : ''}`}
                onClick={() => setAttackFilter((prev) => (prev === '已处置' ? '全部' : '已处置'))}
              >
                <span>已处置</span>
                <strong>{statusCount['已处置']}</strong>
              </button>
              <button
                type="button"
                className={`summary-status neutral ${attackFilter === '全部' ? 'active' : ''}`}
                onClick={() => setAttackFilter('全部')}
              >
                <span>全部</span>
                <strong>{events.length}</strong>
              </button>
            </div>
          </div>

          <div className="queue-scrollbox">
            <div className="queue-sorter">
              <span>排序方式</span>
              <select value={attackSort} onChange={(event) => setAttackSort(event.target.value)}>
                <option value="time">按时间</option>
                <option value="severity">按危急程度</option>
              </select>
            </div>

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
                      <span className={`dispose-state state-${event.disposalStatus === '已处置' ? '已处置' : '未处置'}`}>
                        {event.disposalStatus === '已处置' ? '已处置' : '未处置'}
                      </span>
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
