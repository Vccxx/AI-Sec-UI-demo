import React, { useEffect, useState } from 'react'
import { BellRing, Send, Siren, ShieldBan, ShieldCheck } from 'lucide-react'

function ReportCenter({ selectedEvent }) {
  const [isCreatingOrder, setIsCreatingOrder] = useState(false)
  const [directiveType, setDirectiveType] = useState('全网联合处置通告')
  const [directiveScope, setDirectiveScope] = useState('全网单位')
  const [directivePriority, setDirectivePriority] = useState('高')
  const [directiveTarget, setDirectiveTarget] = useState(selectedEvent.target)
  const [directiveBody, setDirectiveBody] = useState('')
  const [orders, setOrders] = useState([])

  const directiveCards = [
    { type: '全网联合处置通告', icon: BellRing, tip: '发现威胁后同步通知各单位联动拦截。' },
    { type: '重点单位协同拦截', icon: ShieldCheck, tip: '指定重点单位先行执行高优先策略。' },
    { type: '关停系统指令', icon: ShieldBan, tip: '对高风险系统执行临时关停与流量切断。' },
    { type: '应急升级通告', icon: Siren, tip: '触发升级响应，统一提升处置级别。' },
  ]

  const buildDirectiveBody = (type, event, scope, target) => {
    const base = `事件「${event.title}」攻击源 ${event.sourceIp} 持续攻击 ${target}，结果判定为${event.attackResult}。`
    if (type === '关停系统指令') {
      return `${base}\n请 ${scope} 立即对 ${target} 执行临时关停与访问切断，保留必要审计链路，待指挥中心复核后恢复。`
    }
    if (type === '重点单位协同拦截') {
      return `${base}\n请 ${scope} 针对该攻击源同步下发拦截策略，优先保障核心业务链路稳定，并回传执行回执。`
    }
    if (type === '应急升级通告') {
      return `${base}\n即刻启动应急升级流程，统一提升防护等级并进入连续值守模式。`
    }
    return `${base}\n请 ${scope} 按联合处置预案执行柔性引流、会话冻结与证据回传，形成全网协同处置闭环。`
  }

  useEffect(() => {
    setDirectiveTarget(selectedEvent.target)
    setDirectiveBody(buildDirectiveBody(directiveType, selectedEvent, directiveScope, selectedEvent.target))
  }, [selectedEvent.id])

  const handleDirectiveType = (type) => {
    setDirectiveType(type)
    setDirectiveBody(buildDirectiveBody(type, selectedEvent, directiveScope, directiveTarget))
  }

  const issueDirective = () => {
    if (!directiveBody.trim()) return
    setIsCreatingOrder(false)
    const id = `order-${Date.now()}`
    const timestamp = new Date().toLocaleTimeString('zh-CN', { hour12: false })
    const isShutdown = directiveType === '关停系统指令'

    const order = {
      id,
      type: directiveType,
      priority: directivePriority,
      scope: directiveScope,
      target: directiveTarget,
      status: isShutdown ? '执行中' : '已签收',
      signoff: isShutdown ? '关键单位 5/6 已签收' : '全网单位 12/12 已签收',
      feedback: isShutdown
        ? `关停指令已下发，${directiveTarget} 正在执行分阶段流量切断。`
        : `${directiveScope} 已完成协同策略加载，等待最终执行回执。`,
      time: timestamp,
    }

    setOrders((prev) => [order, ...prev])
  }

  return (
    <div className="report-wrap">
      <div className="panel-title">
        <Siren size={16} />
        <span>指挥中心</span>
      </div>

      <div className="command-center-wrap command-only">
        <div className="command-brief">
          <strong>当前事件：{selectedEvent.title}</strong>
          <span>
            目标 {selectedEvent.target} | 攻击源 {selectedEvent.sourceIp} | 结果 {selectedEvent.attackResult}
          </span>
        </div>

        <div className="command-section command-main-only">
          <div className="command-section-head">
            <strong>处置指令下发</strong>
            <button type="button" className="secondary-btn" onClick={() => setIsCreatingOrder((prev) => !prev)}>
              {isCreatingOrder ? '收起指令编辑' : '新建处置指令'}
            </button>
          </div>

          <div className="directive-card-grid">
            {directiveCards.map((card) => {
              const Icon = card.icon
              return (
                <button
                  type="button"
                  key={card.type}
                  className={`directive-card ${directiveType === card.type ? 'active' : ''}`}
                  onClick={() => handleDirectiveType(card.type)}
                >
                  <div className="directive-card-head">
                    <Icon size={14} />
                    <strong>{card.type}</strong>
                  </div>
                  <span>{card.tip}</span>
                </button>
              )
            })}
          </div>

          {isCreatingOrder ? (
            <div className="directive-editor">
              <div className="directive-grid">
                <label>
                  下发范围
                  <select value={directiveScope} onChange={(event) => setDirectiveScope(event.target.value)}>
                    <option value="全网单位">全网单位</option>
                    <option value="省级单位">省级单位</option>
                    <option value="核心单位">核心单位</option>
                    <option value="指定单位">指定单位</option>
                  </select>
                </label>
                <label>
                  紧急级别
                  <select value={directivePriority} onChange={(event) => setDirectivePriority(event.target.value)}>
                    <option value="高">高</option>
                    <option value="严重">严重</option>
                  </select>
                </label>
                <label>
                  目标主体
                  <input value={directiveTarget} onChange={(event) => setDirectiveTarget(event.target.value)} />
                </label>
              </div>
              <textarea value={directiveBody} onChange={(event) => setDirectiveBody(event.target.value)} />
              <div className="directive-editor-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() =>
                    setDirectiveBody(buildDirectiveBody(directiveType, selectedEvent, directiveScope, directiveTarget))
                  }
                >
                  重置文案
                </button>
                <button type="button" className="primary-btn" onClick={issueDirective}>
                  <Send size={14} />
                  下发指令
                </button>
              </div>
            </div>
          ) : null}

          <div className="directive-feed">
            {orders.length === 0 ? (
              <div className="empty-tip">暂无指令记录，请先新建并下发。</div>
            ) : (
              orders.map((order) => (
                <div key={order.id} className="directive-item">
                  <div className="directive-item-head">
                    <strong>{order.type}</strong>
                    <em>{order.time}</em>
                  </div>
                  <div className="directive-item-meta">
                    <span>目标：{order.target}</span>
                    <span>范围：{order.scope}</span>
                    <span>级别：{order.priority}</span>
                    <span className={`directive-status status-${order.status}`}>{order.status}</span>
                  </div>
                  <p>{order.feedback}</p>
                  <div className="directive-signoff">{order.signoff}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReportCenter
