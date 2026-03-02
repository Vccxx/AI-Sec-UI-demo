import React, { useEffect, useMemo, useState } from 'react'
import { PlayCircle, Send, ShieldCheck } from 'lucide-react'

function ActionPanel({ selectedEvent, onCompleteDisposal }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [workflow, setWorkflow] = useState(null)

  const actionExamples = useMemo(
    () => selectedEvent.actions.map((action) => `/+${action}`),
    [selectedEvent],
  )

  const workflowTemplates = useMemo(
    () =>
      Object.fromEntries(
        selectedEvent.actions.map((action) => [
          action,
          [
            `步骤1：执行前检查 - 确认资产 ${selectedEvent.target} 与攻击源 ${selectedEvent.sourceIp} 关联无误。`,
            `步骤2：准备执行 - 下发操作「${action}」到处置引擎，等待人工复核授权。`,
            `步骤3：执行后验证 - 核查拦截结果、业务可用性与日志回传，完成闭环。`,
          ],
        ]),
      ),
    [selectedEvent],
  )

  useEffect(() => {
    setWorkflow(null)
    setInput('')
    setMessages([
      {
        id: `boot-${selectedEvent.id}`,
        role: 'bot',
        text: `可执行处置操作：${selectedEvent.actions.join('、')}。可点击下方操作，或输入 /+处置操作名称。`,
      },
      {
        id: `sample-${selectedEvent.id}`,
        role: 'bot',
        text: `交互样例：输入 /+${selectedEvent.actions[0]} -> 系统会逐步提示，并要求每一步人工确认。`,
      },
    ])
  }, [selectedEvent])

  const startWorkflow = (action) => {
    const steps = workflowTemplates[action]
    if (!steps) {
      setMessages((prev) => [
        ...prev,
        { id: `warn-${Date.now()}`, role: 'bot-warning', text: `未识别的处置操作：${action}` },
      ])
      return
    }

    setWorkflow({ action, stepIndex: 0, steps })
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: 'user', text: `/+${action}` },
      {
        id: `b-${Date.now() + 1}`,
        role: 'bot',
        text: `${steps[0]}\n请输入 /confirm 进行人工确认，或 /cancel 取消。`,
      },
    ])
  }

  const handleConfirm = () => {
    if (!workflow) return
    const nextIndex = workflow.stepIndex + 1

    if (nextIndex >= workflow.steps.length) {
      setMessages((prev) => [
        ...prev,
        { id: `c-${Date.now()}`, role: 'user', text: '/confirm' },
        {
          id: `done-${Date.now() + 1}`,
          role: 'bot-success',
          text: `处置完成：${workflow.action}。已将该告警标记为已处置。`,
        },
      ])
      onCompleteDisposal?.(selectedEvent.id)
      setWorkflow(null)
      return
    }

    setWorkflow((prev) => ({ ...prev, stepIndex: nextIndex }))
    setMessages((prev) => [
      ...prev,
      { id: `c-${Date.now()}`, role: 'user', text: '/confirm' },
      {
        id: `n-${Date.now() + 1}`,
        role: 'bot',
        text: `${workflow.steps[nextIndex]}\n请输入 /confirm 进行人工确认，或 /cancel 取消。`,
      },
    ])
  }

  const handleCancel = () => {
    if (!workflow) return
    setMessages((prev) => [
      ...prev,
      { id: `x-${Date.now()}`, role: 'user', text: '/cancel' },
      { id: `bx-${Date.now() + 1}`, role: 'bot-warning', text: `已取消处置流程：${workflow.action}` },
    ])
    setWorkflow(null)
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const text = input.trim()
    if (!text) return

    if (text.startsWith('/+')) {
      const action = text.replace('/+', '').trim()
      startWorkflow(action)
      setInput('')
      return
    }

    if (text === '/confirm') {
      handleConfirm()
      setInput('')
      return
    }

    if (text === '/cancel') {
      handleCancel()
      setInput('')
      return
    }

    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: 'user', text },
      {
        id: `bw-${Date.now() + 1}`,
        role: 'bot-warning',
        text: '请输入 /+处置操作名称，或使用 /confirm、/cancel 控制当前流程。',
      },
    ])
    setInput('')
  }

  return (
    <div className="action-wrap">
      <div className="panel-title">
        <ShieldCheck size={16} />
        <span>处置场景</span>
      </div>

      <div className="action-intro">
        <strong>当前事件：</strong>
        <span>{selectedEvent.title}</span>
      </div>

      <div className="action-dialog-list">
        {messages.map((msg) => (
          <div key={msg.id} className={`action-dialog-item ${msg.role}`}>
            {msg.text}
          </div>
        ))}
      </div>

      <div className="action-quick-ops">
        {selectedEvent.actions.map((action) => (
          <button type="button" key={action} className="action-btn" onClick={() => startWorkflow(action)}>
            <PlayCircle size={15} />
            {action}
          </button>
        ))}

        <div className="action-sample-list">
          {actionExamples.map((cmd) => (
            <button type="button" key={cmd} onClick={() => setInput(cmd)}>
              {cmd}
            </button>
          ))}
        </div>
      </div>

      <form className="action-input-form" onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="输入 /+处置操作名称，或 /confirm、/cancel"
        />
        <button type="submit" className="primary-btn">
          <Send size={14} />
          发送
        </button>
      </form>

      {workflow ? (
        <div className="action-confirm-row">
          <button type="button" className="primary-btn" onClick={handleConfirm}>
            人工确认本步
          </button>
          <button type="button" className="secondary-btn" onClick={handleCancel}>
            取消处置
          </button>
        </div>
      ) : null}
      </div>
  )
}

export default ActionPanel
