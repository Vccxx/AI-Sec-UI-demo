import React, { useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, ChevronRight, Cpu, GitMerge, Send, Timer, TerminalSquare } from 'lucide-react'

const ANALYSIS_TYPING_INTERVAL_MS = 6

function ReasoningLog({ selectedEvent, onFilterCommand, grayBlueprint, onGrayAnalysisReady }) {
  const isDisposed = selectedEvent.disposalStatus === '已处置'

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
    const isPhishing =
      selectedEvent.eventCategory === '钓鱼事件' ||
      /钓鱼|邮箱|终端|会话|IM/.test(`${selectedEvent.focusType ?? ''}${selectedEvent.target ?? ''}${selectedEvent.title ?? ''}`)
    const isInternal = selectedEvent.eventCategory === '内网事件'
    const impactedNodes = (selectedEvent.relatedServers ?? [])
      .slice(0, 3)
      .map((server) => `${server.name}(${server.ip})`)
      .join('、')

    const traffic = selectedEvent.rawTraffic ?? []
    const trafficTimes = Array.from(new Set(traffic.map((item) => item.time))).sort()
    const methods = Array.from(new Set(traffic.map((item) => item.method))).filter(Boolean)
    const paths = Array.from(new Set(traffic.map((item) => item.path))).filter(Boolean)
    const statusCodes = Array.from(new Set(traffic.map((item) => item.status))).filter(Boolean)
    const sourceNames = (selectedEvent.relatedSources ?? []).slice(0, 4).map((item) => item.name).join('、')
    const evidence = (selectedEvent.authenticityEvidence ?? []).slice(0, 3)

    const sceneType = isPhishing
      ? '互联网账号与终端钓鱼攻击'
      : isInternal
        ? '内网同源攻击活动'
        : '外网对外暴露面攻击'

    const timeLine =
      trafficTimes.length > 0
        ? `${trafficTimes[0]} 至 ${trafficTimes[trafficTimes.length - 1]}（${selectedEvent.timeWindow}）`
        : selectedEvent.timeWindow

    const chainSummary =
      traffic.length > 0
        ? `方式 ${methods.slice(0, 3).join(' / ') || 'N/A'}，路径 ${paths.slice(0, 2).join('、') || 'N/A'}，状态 ${statusCodes.slice(0, 3).join(' -> ') || 'N/A'}`
        : '当前未回传完整原始流量序列'

    const evidenceLine =
      evidence.length > 0
        ? evidence.map((item) => `${item.id}/${item.name}：${item.summary}`).join('；')
        : `关键证据来自 ${sourceNames || '多源设备日志'}，真实性需继续复核。`

    return [
      `事件定性：当前告警归类为「${sceneType}」，攻击结果为「${selectedEvent.attackResult}」，攻击源 ${selectedEvent.sourceIp} 正对「${selectedEvent.target}」发起持续威胁。`,
      `受影响主体：${selectedEvent.target}；关联资产为 ${impactedNodes || selectedEvent.target}。`,
      `攻击链路：时间窗口 ${timeLine}，${chainSummary}。`,
      `真实性依据：${evidenceLine}`,
    ].join('\n')
  }, [selectedEvent])

  const [question, setQuestion] = useState('')
  const [dialogues, setDialogues] = useState([])
  const [expandAll, setExpandAll] = useState(false)
  const [typedAnalysis, setTypedAnalysis] = useState('')
  const [analysisTyping, setAnalysisTyping] = useState(false)
  const [grayPhase, setGrayPhase] = useState(0)
  const [grayLatency, setGrayLatency] = useState(0)
  const [grayDone, setGrayDone] = useState(false)
  const [grayStarted, setGrayStarted] = useState(false)
  const [grayPhaseResult, setGrayPhaseResult] = useState({})
  const dialogueListRef = useRef(null)
  const disposedGrayReportedRef = useRef('')

  const analysisLines = useMemo(() => typedAnalysis.split('\n'), [typedAnalysis])
  const isAnalysisComplete = !analysisTyping && typedAnalysis === finalAnalysis && finalAnalysis.length > 0

  const getRoleMeta = (role) => {
    if (role === 'user') return { label: '用户', className: 'user' }
    if (role === 'bot-warning') return { label: '系统提示', className: 'warning' }
    if (role === 'bot-success') return { label: '系统回执', className: 'success' }
    return { label: '大瓦特安运智能体', className: 'ai' }
  }

  const grayPhases = useMemo(
    () => [
      { key: 'send', label: '发送分析上下文到柔性灰度平台', icon: Timer },
      { key: 'compute', label: '灰度平台计算攻击源灰度值', icon: Cpu },
      { key: 'return', label: '回传柔性处置步骤到处置场景', icon: GitMerge },
    ],
    [],
  )

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
    if (isDisposed) {
      setTypedAnalysis(finalAnalysis)
      setAnalysisTyping(false)
      return undefined
    }

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
    }, ANALYSIS_TYPING_INTERVAL_MS)

    return () => window.clearInterval(timer)
  }, [finalAnalysis, isDisposed])

  useEffect(() => {
    setGrayStarted(false)
    setGrayPhase(0)
    setGrayLatency(0)
    setGrayDone(false)
    setGrayPhaseResult({})
    disposedGrayReportedRef.current = ''
  }, [selectedEvent.id])

  useEffect(() => {
    if (!isAnalysisComplete) return

    if (isDisposed) {
      setGrayStarted(true)
      setGrayPhase(grayPhases.length)
      setGrayLatency(0)
      setGrayDone(true)
      setGrayPhaseResult(
        Object.fromEntries(grayPhases.map((_, index) => [index, '已完成（已处置事件）'])),
      )

      if (disposedGrayReportedRef.current !== selectedEvent.id) {
        disposedGrayReportedRef.current = selectedEvent.id
        onGrayAnalysisReady?.(selectedEvent.id, {
          ...grayBlueprint,
          latencyMs: 0,
        })
      }

      return undefined
    }

    let cancelled = false
    const begin = Date.now()
    setGrayStarted(true)
    setGrayPhase(0)
    setGrayLatency(0)
    setGrayDone(false)
    setGrayPhaseResult({})

    const run = async () => {
      const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms))
      const durations = [1300, 1600, 1400]

      for (let index = 0; index < durations.length; index += 1) {
        const phaseStart = Date.now()
        await wait(durations[index])
        if (cancelled) return
        setGrayPhase(index + 1)
        setGrayLatency(Date.now() - begin)
        setGrayPhaseResult((prev) => ({
          ...prev,
          [index]: `完成（${Date.now() - phaseStart}ms）`,
        }))
      }

      if (cancelled) return

      const latencyMs = Date.now() - begin
      setGrayDone(true)
      setGrayLatency(latencyMs)
      onGrayAnalysisReady?.(selectedEvent.id, {
        ...grayBlueprint,
        latencyMs,
      })
    }

    run()

    return () => {
      cancelled = true
    }
  }, [isAnalysisComplete, isDisposed, selectedEvent.id, grayBlueprint, grayPhases, onGrayAnalysisReady])

  useEffect(() => {
    const node = dialogueListRef.current
    if (!node) return

    const raf = window.requestAnimationFrame(() => {
      node.scrollTop = node.scrollHeight
    })

    return () => window.cancelAnimationFrame(raf)
  }, [
    dialogues,
    reasoningItems,
    typedAnalysis,
    analysisTyping,
    grayStarted,
    grayPhase,
    grayDone,
    grayPhaseResult,
    grayLatency,
  ])

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
            <div className="chat-role">大瓦特安运智能体</div>
            <div className="reasoning-controls">
              <button
                type="button"
                className="thinking-toggle"
                onClick={() => setExpandAll((prev) => !prev)}
                aria-expanded={expandAll}
              >
                <ChevronRight size={13} className={`thinking-chevron ${expandAll ? 'expanded' : ''}`} />
                <span>大瓦特安运智能体思考过程</span>
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
              <div className="analysis-result-content">
                {analysisLines.map((line, index) => {
                  const separatorIndex = line.indexOf('：')
                  if (separatorIndex === -1) {
                    return (
                      <p key={`analysis-line-${index}`} className="analysis-line">
                        {line}
                      </p>
                    )
                  }

                  const label = line.slice(0, separatorIndex + 1)
                  const body = line.slice(separatorIndex + 1)
                  return (
                    <p key={`analysis-line-${index}`} className="analysis-line">
                      <strong>{label}</strong>
                      {body}
                    </p>
                  )
                })}
                {analysisTyping ? <i className="cursor">|</i> : null}
              </div>
            </div>

            <div className="gray-analysis-block">
              <div className="gray-analysis-head">
                <span>灰度分析</span>
                <em>
                  {!grayStarted
                    ? '等待分析结果输出完成...'
                    : grayDone
                      ? `交互完成 · 总时延 ${grayLatency}ms`
                      : `交互中 · 已耗时 ${grayLatency}ms`}
                </em>
              </div>

              <div className="gray-phase-list">
                {grayPhases.map((phase, index) => {
                  const Icon = phase.icon
                  const state = grayPhase > index ? 'done' : grayPhase === index ? 'running' : 'pending'
                  return (
                    <div key={phase.key} className={`gray-phase-item ${state}`}>
                      <Icon size={13} />
                      <span>{phase.label}</span>
                      <em>
                        {state === 'done'
                          ? grayPhaseResult[index] ?? '已完成'
                          : state === 'running'
                            ? '执行中...'
                            : '等待中'}
                      </em>
                    </div>
                  )
                })}
              </div>

              {grayDone ? (
                <div className="gray-result-box">
                  <div className="gray-result-head">
                    <CheckCircle2 size={14} />
                    <strong>灰度值 {grayBlueprint.score}（{grayBlueprint.level}）</strong>
                  </div>
                  <div className="gray-result-policy">
                    执行策略：{grayBlueprint.autoExecute ? '钓鱼事件自动执行柔性处置' : '普通事件需用户确认后执行柔性处置'}
                  </div>
                  <ol>
                    {grayBlueprint.steps.map((step, index) => (
                      <li key={`${selectedEvent.id}-gray-step-${index}`}>{step}</li>
                    ))}
                  </ol>
                </div>
              ) : null}
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
