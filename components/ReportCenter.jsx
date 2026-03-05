import React, { useEffect, useState } from 'react'
import { BellRing, Eye, Send, Siren, ShieldBan, ShieldCheck } from 'lucide-react'

function ReportCenter({ selectedEvent }) {
  const sampleDirectiveOrders = [
    {
      id: 'order-seed-01',
      type: '全网联合处置通告',
      priority: '高',
      scope: '全网单位',
      target: '互联网终端',
      status: '已完成',
      signoff: '值长已签收',
      feedback: '值长已通过 eLink 下发联合处置指令，各目标单位按预案执行。',
      time: '08:46:12',
      body: '请值长通过 eLink 向全网单位下发联合处置通告：针对互联网终端钓鱼攻击立即启用柔性引流、会话冻结与证据回传机制。',
    },
    {
      id: 'order-seed-02',
      type: '重点单位协同拦截',
      priority: '高',
      scope: '核心单位',
      target: '员工邮箱',
      status: '执行中',
      signoff: '值长已签收',
      feedback: '值长已转发协同拦截任务，重点单位正在执行会话冻结与链接阻断。',
      time: '09:03:25',
      body: '请值长通过 eLink 向核心单位下发协同拦截指令：员工邮箱异常会话执行分级拦截并同步返回执行日志。',
    },
    {
      id: 'order-seed-03',
      type: '关停系统指令',
      priority: '严重',
      scope: '指定单位',
      target: '远程办公账号',
      status: '执行中',
      signoff: '值长已签收',
      feedback: '值长已确认关停指令并下发目标单位，正在分阶段切断访问。',
      time: '09:28:40',
      body: '请值长通过 eLink 向指定单位下发关停指令：远程办公账号关联系统执行临时关停与审计留存，待复核后逐步恢复。',
    },
    {
      id: 'order-seed-04',
      type: '应急升级通告',
      priority: '严重',
      scope: '省级单位',
      target: '企业IM账号',
      status: '已签收',
      signoff: '值长已签收',
      feedback: '值长已签收应急升级通告并完成下发，等待各单位回执汇总。',
      time: '09:41:09',
      body: '请值长通过 eLink 下发应急升级通告：省级单位统一提升防护等级并进入连续值守模式，按小时回报处置进度。',
    },
  ]

  const [isCreatingOrder, setIsCreatingOrder] = useState(false)
  const [directiveType, setDirectiveType] = useState('全网联合处置通告')
  const [directiveScope, setDirectiveScope] = useState('全网单位')
  const [directivePriority, setDirectivePriority] = useState('高')
  const [directiveTarget, setDirectiveTarget] = useState(selectedEvent.target)
  const [directiveBody, setDirectiveBody] = useState('')
  const [orders, setOrders] = useState(sampleDirectiveOrders)
  const [previewOrder, setPreviewOrder] = useState(null)

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
      signoff: '值长已签收',
      feedback: isShutdown
        ? `值长已通过 eLink 下发关停指令，${directiveTarget} 正在执行分阶段流量切断。`
        : `值长已通过 eLink 下发处置指令，${directiveScope} 正在回传执行回执。`,
      time: timestamp,
      body: directiveBody,
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
                    <div className="directive-item-head-right">
                      <em>{order.time}</em>
                      <button type="button" className="detail-btn directive-detail-btn" onClick={() => setPreviewOrder(order)}>
                        <Eye size={13} />
                        指令详情
                      </button>
                    </div>
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

      {previewOrder ? (
        <div className="alert-modal-mask" onClick={() => setPreviewOrder(null)}>
          <div className="alert-modal" onClick={(event) => event.stopPropagation()}>
            <div className="alert-modal-head">
              <strong>{previewOrder.type} - 指令详情</strong>
              <button type="button" className="close-btn" onClick={() => setPreviewOrder(null)}>
                关闭
              </button>
            </div>

            <div className="alert-meta-grid">
              <div className="alert-meta-item">
                <span>下发对象</span>
                <strong>{previewOrder.target}</strong>
              </div>
              <div className="alert-meta-item">
                <span>下发范围</span>
                <strong>{previewOrder.scope}</strong>
              </div>
              <div className="alert-meta-item">
                <span>紧急级别</span>
                <strong>{previewOrder.priority}</strong>
              </div>
              <div className="alert-meta-item">
                <span>当前状态</span>
                <strong>{previewOrder.status}</strong>
              </div>
              <div className="alert-meta-item">
                <span>签收状态</span>
                <strong>{previewOrder.signoff}</strong>
              </div>
              <div className="alert-meta-item">
                <span>下发时间</span>
                <strong>{previewOrder.time}</strong>
              </div>
            </div>

            <div className="alert-raw-block">
              <strong>指令内容</strong>
              <pre>{previewOrder.body ?? previewOrder.feedback}</pre>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default ReportCenter
