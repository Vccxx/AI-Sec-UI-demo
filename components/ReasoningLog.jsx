import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronRight, Send, TerminalSquare } from 'lucide-react'

function ReasoningLog({ selectedEvent, onFilterCommand }) {
  const evidenceById = useMemo(() => {
    const entries = (selectedEvent.authenticityEvidence ?? []).map((item, index) => [
      item.id ?? `E-${String(index + 1).padStart(2, '0')}`,
      item,
    ])
    return Object.fromEntries(entries)
  }, [selectedEvent])

  const reasoningItems = useMemo(
    () =>
      selectedEvent.reasoningSteps.map((step, index) => {
        const rawText = typeof step === 'string' ? step : step?.text ?? ''
        const linkedIds = selectedEvent.reasoningEvidenceLinks?.[index]
        const fallbackId = (selectedEvent.authenticityEvidence ?? [])[index]?.id
        const evidenceIds = Array.isArray(linkedIds)
          ? linkedIds
          : linkedIds
            ? [linkedIds]
            : fallbackId
              ? [fallbackId]
              : ['E-NA']

        const evidenceTag = evidenceIds
          .map((id) => {
            const ref = evidenceById[id]
            if (!ref) return id
            return `${id}/${ref.name ?? ref.sourceName ?? '证据'}`
          })
          .join(', ')

        return {
          stepIndex: index,
          rawText,
          evidenceIds,
          evidenceTag,
        }
      }),
    [selectedEvent, evidenceById],
  )

  const finalAnalysis = useMemo(() => {
    const topActions = (selectedEvent.actions ?? []).slice(0, 2).join('、')

    const attackedHosts = (selectedEvent.relatedServers ?? [])
      .map((server) => `${server.name}(${server.ip})`)
      .join('、')

    const trafficTimes = Array.from(new Set((selectedEvent.rawTraffic ?? []).map((item) => item.time))).sort()
    const timeFeature =
      trafficTimes.length > 0
        ? `${trafficTimes[0]} 至 ${trafficTimes[trafficTimes.length - 1]} 持续出现同源访问，窗口为「${selectedEvent.timeWindow}」`
        : `在「${selectedEvent.timeWindow}」窗口内出现连续攻击行为`

    const methods = Array.from(new Set((selectedEvent.rawTraffic ?? []).map((item) => item.method))).filter(Boolean)
    const paths = Array.from(new Set((selectedEvent.rawTraffic ?? []).map((item) => item.path))).filter(Boolean)
    const statusCodes = Array.from(new Set((selectedEvent.rawTraffic ?? []).map((item) => item.status))).filter(Boolean)

    const methodFeature = methods.length > 0 ? methods.join(' / ') : '多种协议行为混合'
    const pathFeature = paths.length > 0 ? paths.slice(0, 3).join('、') : '关键业务路径'
    const statusFeature = statusCodes.length > 0 ? statusCodes.join(' -> ') : '状态码异常波动'

    return [
      `综合判定：本次告警属于「${selectedEvent.focusType}」场景，攻击结果为「${selectedEvent.attackResult}」，攻击源 ${selectedEvent.sourceIp} 对目标「${selectedEvent.target}」形成持续威胁。`,
      `受攻击主机：${attackedHosts || selectedEvent.target}。`,
      `攻击时间特征：${timeFeature}，呈现高频且阶段性增强的访问节奏。`,
      `攻击手法特征：请求方式以 ${methodFeature} 为主，重点命中 ${pathFeature}，响应结果出现 ${statusFeature} 等可疑变化。`,
      `处置建议：优先执行 ${topActions}，并结合主机侧日志与边界设备告警完成闭环复核。`,
    ].join('\n')
  }, [selectedEvent])

  const [question, setQuestion] = useState('')
  const [dialogues, setDialogues] = useState([])
  const [expandAll, setExpandAll] = useState(false)
  const [typedAnalysis, setTypedAnalysis] = useState('')
  const [analysisTyping, setAnalysisTyping] = useState(false)
  const dialogueListRef = useRef(null)

  const getRoleMeta = (role) => {
    if (role === 'user') return { label: '用户', className: 'user' }
    if (role === 'bot-warning') return { label: '系统提示', className: 'warning' }
    if (role === 'bot-success') return { label: '系统回执', className: 'success' }
    return { label: 'AI', className: 'ai' }
  }

  const commandOptions = [
    { cmd: '/ask', help: '追问当前告警分析' },
    { cmd: '/filter', help: '按系统/IP过滤原始告警并新开筛选页' },
  ]
  const showCommandMenu = question.trim().startsWith('/')
  const showFilterExamples = question.trim().startsWith('/filter')
  const filterExamples = [
    '/filter 电力交易系统',
    '/filter 10.8.21.67',
    '/filter 系统A 系统B 所有IP被攻击情况',
  ]

  const getFollowupReply = (query) => {
    const normalized = query.toLowerCase()

    if (normalized.includes('ip') || query.includes('攻击源')) {
      return `当前核心攻击源为 ${selectedEvent.sourceIp}，建议继续在云盾平台追溯该IP近30天访问记录并核查是否攻击其他站点。`
    }
    if (query.includes('成功') || query.includes('失陷') || query.includes('攻击结果')) {
      return `本事件攻击结果判定为：${selectedEvent.attackResult}。建议结合响应码变化与主机侧日志进一步确认是否形成实际入侵。`
    }
    if (query.includes('处置') || query.includes('怎么做') || query.includes('建议')) {
      return `优先执行：${selectedEvent.actions[0]}。建议结合 ${selectedEvent.actions[1]} 完成后续闭环，并同步提交报告中心归档。`
    }
    return `已结合“${selectedEvent.focusType}”场景复核，该事件时间特征为“${selectedEvent.timeWindow}”。如需我继续深挖，请追问“攻击结果判定依据”或“全流量排查范围”。`
  }

  useEffect(() => {
    setDialogues([])
    setExpandAll(false)
  }, [selectedEvent])

  useEffect(() => {
    let index = 0
    setTypedAnalysis('')
    setAnalysisTyping(true)

    const timer = window.setInterval(() => {
      index += 1
      setTypedAnalysis(finalAnalysis.slice(0, index))
      if (index >= finalAnalysis.length) {
        window.clearInterval(timer)
        setAnalysisTyping(false)
      }
    }, 12)

    return () => window.clearInterval(timer)
  }, [finalAnalysis])

  useEffect(() => {
    const node = dialogueListRef.current
    if (!node) return

    const raf = window.requestAnimationFrame(() => {
      node.scrollTop = node.scrollHeight
    })

    return () => window.cancelAnimationFrame(raf)
  }, [dialogues, reasoningItems])

  const handleAsk = (event) => {
    event.preventDefault()
    const text = question.trim()
    if (!text) return

    if (text.startsWith('/filter')) {
      const filterText = text.replace('/filter', '').trim()
      const result = onFilterCommand?.(filterText) ?? { ok: false, message: '过滤命令未启用。' }
      setDialogues((prev) => [
        ...prev,
        { id: `u-${Date.now()}`, role: 'user', text },
        { id: `b-${Date.now() + 1}`, role: result.ok ? 'bot' : 'bot-warning', text: result.message },
      ])
      setQuestion('')
      return
    }

    const askText = text.startsWith('/ask') ? text.replace('/ask', '').trim() : text
    if (!askText) {
      setDialogues((prev) => [
        ...prev,
        { id: `b-${Date.now()}`, role: 'bot-warning', text: '请输入追问内容，例如：/ask 攻击结果判定依据是什么？' },
      ])
      return
    }

    const userMessage = { id: `u-${Date.now()}`, role: 'user', text }
    const botMessage = { id: `b-${Date.now() + 1}`, role: 'bot', text: getFollowupReply(askText) }

    setDialogues((prev) => [...prev, userMessage, botMessage])
    setQuestion('')
  }

  return (
    <div className="reasoning-wrap">
      <div className="reasoning-dialog-box">
        <div className="conversation-header">
          <TerminalSquare size={16} />
          <span>告警深入分析</span>
        </div>

        <div ref={dialogueListRef} className="dialogue-list combined chat-stream">
          <div className="dialogue-item chat-card ai reasoning-block">
            <div className="chat-role">AI</div>
            <div className="reasoning-controls">
              <button
                type="button"
                className="thinking-toggle"
                onClick={() => setExpandAll((prev) => !prev)}
                aria-expanded={expandAll}
              >
                <ChevronRight size={13} className={`thinking-chevron ${expandAll ? 'expanded' : ''}`} />
                <span>AI 思考过程</span>
                <em>{expandAll ? `已展开 ${reasoningItems.length} 步 · 收起` : `共 ${reasoningItems.length} 步 · 展开`}</em>
              </button>
            </div>

            {!expandAll ? (
              <p className="thinking-collapsed-tip">已生成 {reasoningItems.length} 条推理步骤，点击展开查看完整思考过程。</p>
            ) : (
              <div className="thinking-expanded-body">
                {reasoningItems.map((item) => (
                  <div key={`reasoning-${item.stepIndex}`} className="reasoning-step-item">
                    <div className="reasoning-line-head">
                      <strong className="reasoning-line-label">步骤 {item.stepIndex + 1}</strong>
                      <span className="reasoning-line-evidence">依据 {item.evidenceIds.join(', ')}</span>
                    </div>

                    <p className="reasoning-step-text">{item.rawText}</p>
                    <div className="reasoning-step-link">依据：{item.evidenceTag}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="analysis-result-block">
              <span>分析结果</span>
              <p>
                {typedAnalysis}
                {analysisTyping ? <i className="cursor">|</i> : null}
              </p>
            </div>
          </div>

          {dialogues.map((item) => (
            <div key={item.id} className={`dialogue-item chat-card ${getRoleMeta(item.role).className}`}>
              <div className="chat-role">{getRoleMeta(item.role).label}</div>
              <div className="chat-text">{item.text}</div>
            </div>
          ))}
        </div>

        <form className="followup-form combined" onSubmit={handleAsk}>
          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="提示：可直接输入问题，或使用 /ask 深挖判定依据，使用 /filter 快速筛选系统/IP 事件"
          />
          <button type="submit">
            <Send size={14} />
            发送
          </button>
        </form>

        {showCommandMenu ? (
          <div className="command-menu combined">
            {commandOptions.map((item) => (
              <button
                type="button"
                key={item.cmd}
                onClick={() => setQuestion(`${item.cmd} `)}
              >
                <strong>{item.cmd}</strong>
                <span>{item.help}</span>
              </button>
            ))}

            {showFilterExamples ? (
              <div className="filter-examples">
                <span>过滤用例</span>
                <div className="filter-example-list">
                  {filterExamples.map((example) => (
                    <button type="button" key={example} onClick={() => setQuestion(example)}>
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default ReasoningLog
