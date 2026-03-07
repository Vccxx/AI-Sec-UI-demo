import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Send, ShieldCheck } from 'lucide-react'

function ActionPanel({ selectedEvent, grayResult, onCompleteDisposal }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [awaitingConfirm, setAwaitingConfirm] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [executionLocked, setExecutionLocked] = useState(selectedEvent.disposalStatus === '已处置')
  const actionListRef = useRef(null)
  const executionTokenRef = useRef(0)
  const latestGrayResultIdRef = useRef('')

  const inputPlaceholder = useMemo(() => {
    return '输入 /confirm 执行、/cancel 取消，或点击快捷按钮'
  }, [selectedEvent.id])

  useEffect(() => {
    executionTokenRef.current += 1
    latestGrayResultIdRef.current = ''
    setAwaitingConfirm(false)
    setExecuting(false)
    setExecutionLocked(selectedEvent.disposalStatus === '已处置')
    setInput('')
    setMessages([
      {
        id: `boot-${selectedEvent.id}`,
        role: 'bot',
        text: `处置场景已就绪。当前可执行操作：${selectedEvent.actions.join('、')}。`,
      },
      {
        id: `sample-${selectedEvent.id}`,
        role: 'bot',
        text: '等待“柔性灰度平台”回传处置步骤。收到后将提示确认或自动执行。',
      },
    ])
  }, [selectedEvent.id])

  const appendMessages = (newItems) => {
    setMessages((prev) => [...prev, ...newItems])
  }

  useEffect(() => {
    const node = actionListRef.current
    if (!node) return

    const raf = window.requestAnimationFrame(() => {
      node.scrollTop = node.scrollHeight
    })

    return () => window.cancelAnimationFrame(raf)
  }, [messages])

  const getRoleMeta = (role) => {
    if (role === 'user') return { label: '用户', className: 'user' }
    if (role === 'bot-warning') return { label: '系统提示', className: 'warning' }
    if (role === 'bot-success') return { label: '系统回执', className: 'success' }
    return { label: '大瓦特安运智能体', className: 'ai' }
  }

  const startExecution = async (plan, autoMode = false) => {
    if (!plan || executing || executionLocked) return

    const token = Date.now()
    executionTokenRef.current = token
    setExecuting(true)
    setAwaitingConfirm(false)

    appendMessages([
      {
        id: `dispatch-${token}`,
        role: 'bot',
        text: `已将 ${plan.steps.length} 条柔性处置步骤下发至柔性灰度平台，开始等待逐步执行回执。`,
      },
    ])

    for (let index = 0; index < plan.steps.length; index += 1) {
      if (executionTokenRef.current !== token) return

      const step = plan.steps[index]
      const stageStart = Date.now()
      await new Promise((resolve) => window.setTimeout(resolve, 1000 + index * 120))

      if (executionTokenRef.current !== token) return

      appendMessages([
        {
          id: `ok-${token}-${index}`,
          role: 'bot-success',
          text: `步骤${index + 1}/${plan.steps.length}：${step} -> 执行成功（耗时 ${Date.now() - stageStart}ms）`,
        },
      ])
    }

    if (executionTokenRef.current !== token) return

    appendMessages([
      {
        id: `done-${token}`,
        role: 'bot-success',
        text: `${autoMode ? '自动' : '确认后'}柔性灰度处置已完成，事件已回传闭环状态。`,
      },
    ])
    setExecutionLocked(true)
    onCompleteDisposal?.(selectedEvent.id)
    setExecuting(false)
  }

  useEffect(() => {
    if (!grayResult) return

    if (executionLocked || selectedEvent.disposalStatus === '已处置') return

    const signature = `${grayResult.eventId}-${grayResult.updatedAt ?? 0}`
    if (latestGrayResultIdRef.current === signature) return
    latestGrayResultIdRef.current = signature

    appendMessages([
      {
        id: `gray-recv-${Date.now()}`,
        role: 'bot',
        text: `柔性灰度平台已回传：灰度值 ${grayResult.score}（${grayResult.level}），处置步骤 ${grayResult.steps.length} 条。`,
      },
      {
        id: `gray-steps-${Date.now() + 1}`,
        role: 'bot',
        text: grayResult.steps.map((step, index) => `步骤${index + 1}：${step}`).join('\n'),
      },
    ])

    if (grayResult.autoExecute) {
      appendMessages([
        {
          id: `gray-auto-${Date.now() + 2}`,
          role: 'bot-warning',
          text: '该事件属于钓鱼事件，按策略无需人工确认，已自动执行柔性灰度处置。',
        },
      ])
      startExecution(grayResult, true)
      return
    }

    setAwaitingConfirm(true)
    appendMessages([
      {
        id: `gray-ask-${Date.now() + 3}`,
        role: 'bot',
        text: '是否执行上述柔性灰度处置步骤？请输入 /confirm 执行或 /cancel 取消。',
      },
    ])
  }, [grayResult, executionLocked, selectedEvent.disposalStatus])

  const handleCommand = (rawText) => {
    const text = rawText.trim()
    if (!text) return

    if (text === '/confirm') {
      appendMessages([{ id: `u-${Date.now()}`, role: 'user', text }])
      if (executionLocked || selectedEvent.disposalStatus === '已处置') {
        appendMessages([
          { id: `done-warn-${Date.now() + 1}`, role: 'bot-warning', text: '当前事件已完成处置，无需重复执行。' },
        ])
        setInput('')
        return
      }
      if (!awaitingConfirm || !grayResult) {
        appendMessages([
          { id: `warn-${Date.now() + 1}`, role: 'bot-warning', text: '当前没有待确认的柔性处置任务。' },
        ])
      } else {
        startExecution(grayResult)
      }
      setInput('')
      return
    }

    if (text === '/cancel') {
      appendMessages([{ id: `u-${Date.now()}`, role: 'user', text }])
      if (!awaitingConfirm) {
        appendMessages([
          { id: `warn-${Date.now() + 1}`, role: 'bot-warning', text: '当前没有可取消的待执行柔性处置。' },
        ])
      } else {
        setAwaitingConfirm(false)
        appendMessages([
          { id: `cancel-${Date.now() + 1}`, role: 'bot-warning', text: '已取消本次柔性灰度处置执行。' },
        ])
      }
      setInput('')
      return
    }

    if (text === '/柔性灰度处置') {
      appendMessages([{ id: `u-${Date.now()}`, role: 'user', text }])
      if (executionLocked || selectedEvent.disposalStatus === '已处置') {
        appendMessages([
          { id: `done-tip-${Date.now() + 1}`, role: 'bot', text: '该事件已完成处置，当前展示为最终结果。' },
        ])
        setInput('')
        return
      }
      if (!grayResult) {
        appendMessages([
          {
            id: `wait-${Date.now() + 1}`,
            role: 'bot-warning',
            text: '灰度分析结果尚未回传，请稍候。',
          },
        ])
      } else if (grayResult.autoExecute) {
        appendMessages([
          { id: `auto-tip-${Date.now() + 2}`, role: 'bot', text: '该钓鱼事件已自动执行，无需重复触发。' },
        ])
      } else {
        setAwaitingConfirm(true)
        appendMessages([
          { id: `ask-${Date.now() + 2}`, role: 'bot', text: '已准备好柔性处置步骤，请输入 /confirm 执行。' },
        ])
      }
      setInput('')
      return
    }

    if (text === '/一键封禁攻击IP') {
      appendMessages([
        { id: `u-${Date.now()}`, role: 'user', text },
        {
          id: `legacy-${Date.now() + 1}`,
          role: 'bot-success',
          text: `传统处置已执行：攻击源 ${selectedEvent.sourceIp} 已加入临时封禁名单。`,
        },
      ])
      onCompleteDisposal?.(selectedEvent.id)
      setInput('')
      return
    }

    appendMessages([
      { id: `u-${Date.now()}`, role: 'user', text },
      {
        id: `bw-${Date.now() + 1}`,
        role: 'bot-warning',
        text: '请输入 /confirm、/cancel、/柔性灰度处置 或 /一键封禁攻击IP。',
      },
    ])
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const text = input.trim()
    if (!text) return
    handleCommand(text)
    setInput('')
  }

  return (
    <div className="action-wrap">
      <div className="panel-title conversation-header">
        <ShieldCheck size={16} />
        <span>处置场景</span>
      </div>

      <div className="action-intro">
        <strong>当前事件：</strong>
        <span>{selectedEvent.title}</span>
      </div>

      <div ref={actionListRef} className="action-dialog-list chat-stream">
        {messages.map((msg) => (
          <div key={msg.id} className={`action-dialog-item chat-card ${getRoleMeta(msg.role).className}`}>
            <div className="chat-role">{getRoleMeta(msg.role).label}</div>
            <div className="chat-text">{msg.text}</div>
          </div>
        ))}
      </div>

      <form className="action-input-form" onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={inputPlaceholder}
        />
        <button type="submit" className="primary-btn">
          <Send size={14} />
          发送
        </button>
      </form>

      {awaitingConfirm ? (
        <div className="action-confirm-row">
          <button
            type="button"
            className="primary-btn"
            onClick={() => {
              handleCommand('/confirm')
            }}
            disabled={executing}
          >
            确认执行柔性处置
          </button>
          <button
            type="button"
            className="secondary-btn"
            onClick={() => {
              handleCommand('/cancel')
            }}
            disabled={executing}
          >
            取消处置
          </button>
        </div>
      ) : null}
      </div>
  )
}

export default ActionPanel
