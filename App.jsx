import React, { useMemo, useState } from 'react'
import HeaderStats from './components/HeaderStats'
import EventQueue from './components/EventQueue'
import CorrelationAnalysis from './components/CorrelationAnalysis'
import ReasoningLog from './components/ReasoningLog'
import ReportCenter from './components/ReportCenter'
import ActionPanel from './components/ActionPanel'
import {
  aiEfficiencyStages,
  aiNoiseEvents,
  attackTrend24h,
  defaultTemplates,
  mockEvents,
  sampleReports,
} from './data/mockData'
import './App.css'

function App() {
  const [attackEvents, setAttackEvents] = useState(
    mockEvents.map((event) => ({
      ...event,
      disposalStatus: event.disposalStatus === '已处置' ? '已处置' : '未处置',
    })),
  )
  const [views, setViews] = useState([
    { id: 'main', title: '主视图', type: 'main', eventIds: [], noiseIds: [] },
  ])
  const [activeViewId, setActiveViewId] = useState('main')
  const [selectedByView, setSelectedByView] = useState({ main: { type: 'attack', id: mockEvents[0].id } })
  const [templates, setTemplates] = useState(defaultTemplates)
  const [selectedTemplate, setSelectedTemplate] = useState(defaultTemplates[0].name)
  const [reports, setReports] = useState(sampleReports)

  const activeView = useMemo(
    () => views.find((view) => view.id === activeViewId) ?? views[0],
    [activeViewId, views],
  )

  const currentEvents = useMemo(() => {
    if (activeView?.type !== 'filter') return attackEvents
    const idSet = new Set(activeView.eventIds)
    return attackEvents.filter((event) => idSet.has(event.id))
  }, [activeView, attackEvents])

  const currentNoiseEvents = useMemo(() => {
    if (activeView?.type !== 'filter') return aiNoiseEvents
    const idSet = new Set(activeView.noiseIds ?? [])
    return aiNoiseEvents.filter((item) => idSet.has(item.id))
  }, [activeView])

  const selectedItem =
    selectedByView[activeViewId] ??
    (currentEvents[0]
      ? { type: 'attack', id: currentEvents[0].id }
      : { type: 'noise', id: currentNoiseEvents[0]?.id ?? aiNoiseEvents[0].id })

  const selectedAttackEvent = useMemo(
    () => currentEvents.find((item) => item.id === selectedItem.id) ?? currentEvents[0] ?? mockEvents[0],
    [currentEvents, selectedItem],
  )

  const selectedNoiseEvent = useMemo(
    () => currentNoiseEvents.find((item) => item.id === selectedItem.id) ?? currentNoiseEvents[0] ?? aiNoiseEvents[0],
    [currentNoiseEvents, selectedItem],
  )

  const selectedEvent = useMemo(() => {
    if (selectedItem.type === 'attack') return selectedAttackEvent

    const noise = selectedNoiseEvent
    const ipMatch = noise.source.match(/\b\d{1,3}(?:\.\d{1,3}){3}\b/)
    const sourceIp = ipMatch?.[0] ?? '10.0.0.1'
    const pending = noise.reviewStatus === '待复核'

    return {
      id: `${noise.id}-denoise`,
      title: `AI降噪研判：${noise.title}`,
      severity: pending ? '高危' : '高危',
      disposalStatus: pending ? '处置中' : '已处置',
      type: 'ai_denoise',
      target: '安全监测系统',
      sourceIp,
      time: noise.time,
      timeWindow: '近15分钟误报聚类分析',
      focusType: 'AI降噪研判',
      attackResult: pending ? '疑似误报（待复核）' : '无害误报',
      summary: noise.reason,
      relatedSources: [
        {
          key: 'asset_map',
          name: '资产安全测绘',
          status: '告警聚合节点为安全域内部资产，外联面受控，业务暴露面低。',
          alerts: [
            'asset=告警聚合节点 zone=安全运营区 exposure=internal only',
            'edge_service=none trusted_source=监控采集链路',
          ],
        },
        {
          key: 'waf',
          name: '规则命中分析',
          status: '仅命中低置信规则，缺少多设备侧证据',
          alerts: [
            `noise_tag=${noise.tag} confidence=${noise.confidence}`,
            'rule_hit=1 response_evidence=none chain_link=absent',
          ],
        },
        {
          key: 'siem',
          name: '跨设备关联结果',
          status: '未形成同源攻击链，风险评分下调',
          alerts: [
            'correlation_result=negative linked_devices<2',
            'attack_path_rebuild=failed downgrade=medium->low',
          ],
        },
        {
          key: 'intel',
          name: '威胁情报核验',
          status: '来源未命中高危IOC库',
          alerts: ['ioc_match=0 malicious_score<20', `source=${noise.source}`],
        },
      ],
      relatedServers: [
        {
          id: `${noise.id}-srv-1`,
          name: '告警聚合节点',
          owner: '安全运营平台组-值班席',
          ip: '10.30.5.19',
          port: '9000',
          zone: '安全运营区',
          risk: pending ? '中危' : '低危',
          alertCount: 3,
          links: ['asset_map', 'waf', 'siem'],
        },
        {
          id: `${noise.id}-srv-2`,
          name: '误报特征库',
          owner: 'AI研判引擎-规则中心',
          ip: '10.30.5.27',
          port: '9200',
          zone: 'AI引擎区',
          risk: '低危',
          alertCount: 2,
          links: ['asset_map', 'siem', 'intel'],
        },
      ],
      rawTraffic: [
        {
          serverId: `${noise.id}-srv-1`,
          time: noise.time,
          srcIp: sourceIp,
          dstIp: '10.30.5.19',
          dstPort: '9000',
          method: 'EVENT',
          path: '/alarm/ingest',
          status: '200',
          payload: `tag=${noise.tag};confidence=${noise.confidence}`,
        },
        {
          serverId: `${noise.id}-srv-1`,
          time: noise.time,
          srcIp: '10.30.5.19',
          dstIp: '10.30.5.27',
          dstPort: '9200',
          method: 'QUERY',
          path: '/feature/noise-match',
          status: '200',
          payload: 'chain_score=0.14; benign_pattern=true',
        },
      ],
      reasoningSteps: [
        `步骤1-规则初筛：识别到告警「${noise.title}」，标签为「${noise.tag}」，初始置信度 ${noise.confidence}。`,
        '步骤2-跨源关联：核验WAF/流量/主机日志，未出现连续攻击链与多跳扩散。',
        '步骤3-情报比对：源地址未命中高危IOC，历史行为与恶意画像不匹配。',
        `步骤4-业务上下文：来源为「${noise.source}」，结合报备/运维场景判定无实质危害。`,
        `步骤5-降噪结论：${pending ? '标记为待复核误报，保留观察。' : '归档为无害误报并下调告警优先级。'}`,
      ],
      reasoningEvidenceLinks: [['E-01', 'E-02'], ['E-03'], ['E-04'], ['E-01'], ['E-02', 'E-04']],
      authenticityEvidence: [
        {
          id: 'E-01',
          sourceKey: 'asset_map',
          name: '资产安全测绘',
          summary: '该告警来源于内网受控采集链路，未见公网攻击入口暴露。',
          raw: 'zone=安全运营区 exposure=internal only trusted_source=monitoring pipeline',
          riskSignal: '低暴露面',
          stepIndex: 0,
        },
        {
          id: 'E-02',
          sourceKey: 'waf',
          name: '规则命中分析',
          summary: '仅单条低置信规则命中，缺少可利用链路证据。',
          raw: `noise_tag=${noise.tag} confidence=${noise.confidence} rule_hit=1 response_evidence=none`,
          riskSignal: '弱命中',
          stepIndex: 0,
        },
        {
          id: 'E-03',
          sourceKey: 'siem',
          name: '跨设备关联结果',
          summary: '未形成同源攻击链，关联设备数量不足。',
          raw: 'correlation_result=negative linked_devices<2 attack_path_rebuild=failed',
          riskSignal: '关联不成立',
          stepIndex: 1,
        },
        {
          id: 'E-04',
          sourceKey: 'intel',
          name: '威胁情报核验',
          summary: '源地址未命中高危IOC库，恶意评分较低。',
          raw: `ioc_match=0 malicious_score<20 source=${noise.source}`,
          riskSignal: '情报侧低风险',
          stepIndex: 2,
        },
      ],
      actions: ['一键封禁攻击IP', '柔性灰度处置'],
    }
  }, [selectedItem, selectedAttackEvent, selectedNoiseEvent])

  const selectedTemplateMeta = useMemo(
    () => templates.find((tpl) => tpl.name === selectedTemplate) ?? templates[0],
    [selectedTemplate, templates],
  )

  const handleGenerateReport = () => {
    const now = new Date()
    const timestamp = `${now.toLocaleDateString('zh-CN')} ${now.toLocaleTimeString('zh-CN', {
      hour12: false,
    })}`

    setReports((prev) => [
      {
        id: `report-${Date.now()}`,
        template: selectedTemplate,
        templateDataSource: selectedTemplateMeta?.dataSource ?? '未配置',
        eventTitle: selectedEvent.title,
        timestamp,
        content: [
          `【模板】${selectedTemplate}`,
          `【数据来源】${selectedTemplateMeta?.dataSource ?? '未配置'}`,
          `【事件】${selectedEvent.title}`,
          `【攻击源IP】${selectedEvent.sourceIp}`,
          `【攻击结果】${selectedEvent.attackResult}`,
          `【研判摘要】${selectedEvent.reasoningSteps[0]}`,
          `【建议处置】${selectedEvent.actions.join('、')}`,
        ].join('\n'),
      },
      ...prev,
    ])
  }

  const handleCreateTemplate = (templateName, dataSource) => {
    const normalizedName = templateName.trim()
    const normalizedSource = dataSource.trim()
    if (!normalizedName || !normalizedSource) return

    setTemplates((prev) =>
      prev.some((tpl) => tpl.name === normalizedName)
        ? prev
        : [...prev, { name: normalizedName, dataSource: normalizedSource }],
    )
  }

  const handleUpdateReport = (reportId, nextContent) => {
    setReports((prev) =>
      prev.map((item) => (item.id === reportId ? { ...item, content: nextContent } : item)),
    )
  }

  const setSelectedItemForView = (viewId, next) => {
    setSelectedByView((prev) => ({ ...prev, [viewId]: next }))
  }

  const handleFilterCommand = (rawQuery) => {
    const query = rawQuery.trim()
    if (!query) {
      return {
        ok: false,
        message:
          '过滤条件为空。可直接用：/filter 电力交易系统；/filter 10.8.21.67；/filter 系统A 系统B 所有IP被攻击情况',
      }
    }

    const aliasMap = {
      系统A: '电力交易系统',
      系统B: '现货交易系统',
      系统C: '边界接入系统',
      系统D: '调度控制系统',
    }

    const expandedQuery = Object.entries(aliasMap).reduce(
      (text, [alias, actual]) => text.replaceAll(alias, actual),
      query,
    )

    const ipMatches = expandedQuery.match(/\b\d{1,3}(?:\.\d{1,3}){3}\b/g) ?? []
    const keywordText = expandedQuery
      .replace(/[，,、]/g, ' ')
      .replace(/我想看|所有|被攻击|情况|系统|告警|原始/g, ' ')
      .trim()
    const keywords = keywordText.split(/\s+/).filter(Boolean)

    const filteredAttack = attackEvents.filter((event) => {
      const textMatched =
        keywords.length === 0 ||
        keywords.some(
          (key) =>
            event.title.includes(key) ||
            event.target.includes(key) ||
            event.summary.includes(key) ||
            event.relatedServers.some((server) => server.name.includes(key) || server.ip.includes(key)),
        )

      const ipMatched =
        ipMatches.length === 0 ||
        ipMatches.some(
          (ip) =>
            event.sourceIp.includes(ip) ||
            event.relatedServers.some((server) => server.ip.includes(ip)) ||
            event.rawTraffic.some((flow) => flow.srcIp.includes(ip) || flow.dstIp.includes(ip)),
        )

      return textMatched && ipMatched
    })

    const filteredNoise = aiNoiseEvents.filter((item) => {
      const textMatched =
        keywords.length === 0 ||
        keywords.some(
          (key) =>
            item.title.includes(key) ||
            item.source.includes(key) ||
            item.reason.includes(key) ||
            item.tag.includes(key),
        )

      const ipMatched =
        ipMatches.length === 0 || ipMatches.some((ip) => item.source.includes(ip) || item.reason.includes(ip))

      return textMatched && ipMatched
    })

    const total = filteredAttack.length + filteredNoise.length

    if (total === 0) {
      return {
        ok: false,
        message:
          '未命中过滤结果。试试：/filter 电力交易系统；/filter 现货交易系统 10.92.34.60；/filter 调度控制系统',
      }
    }

    const viewId = `filter-${Date.now()}`
    const viewTitle = `筛选: ${query.slice(0, 14)}${query.length > 14 ? '...' : ''}`
    setViews((prev) => [
      ...prev,
      {
        id: viewId,
        title: viewTitle,
        type: 'filter',
        eventIds: filteredAttack.map((e) => e.id),
        noiseIds: filteredNoise.map((e) => e.id),
      },
    ])
    if (filteredAttack[0]) {
      setSelectedItemForView(viewId, { type: 'attack', id: filteredAttack[0].id })
    } else {
      setSelectedItemForView(viewId, { type: 'noise', id: filteredNoise[0].id })
    }
    setActiveViewId(viewId)

    return {
      ok: true,
      message: `已创建筛选页，命中 ${total} 条（攻击事件 ${filteredAttack.length}，AI降噪 ${filteredNoise.length}）。`,
    }
  }

  const handleCompleteDisposal = (eventId) => {
    setAttackEvents((prev) =>
      prev.map((event) =>
        event.id === eventId
          ? {
              ...event,
              disposalStatus: '已处置',
            }
          : event,
      ),
    )
  }

  const closeView = (viewId) => {
    if (viewId === 'main') return
    setViews((prev) => prev.filter((view) => view.id !== viewId))
    setSelectedByView((prev) => {
      const next = { ...prev }
      delete next[viewId]
      return next
    })
    if (activeViewId === viewId) setActiveViewId('main')
  }

  return (
    <div className="app-shell">
      <header className="panel header-panel">
        <HeaderStats aiEfficiencyStages={aiEfficiencyStages} attackTrend24h={attackTrend24h} />
      </header>

      <main className="body-grid">
        <aside className="panel left-panel">
          <EventQueue
            events={currentEvents}
            noiseEvents={currentNoiseEvents}
            selectedItem={selectedItem}
            onSelectAttack={(id) => setSelectedItemForView(activeViewId, { type: 'attack', id })}
            onSelectNoise={(id) => setSelectedItemForView(activeViewId, { type: 'noise', id })}
            views={views}
            activeViewId={activeViewId}
            onSwitchView={setActiveViewId}
            onCloseView={closeView}
          />
        </aside>

        <section className="center-panel">
          <div className="panel center-top">
            <CorrelationAnalysis selectedEvent={selectedEvent} />
          </div>
          <div className="panel center-bottom">
            <ReasoningLog
              selectedEvent={selectedEvent}
              onFilterCommand={handleFilterCommand}
            />
          </div>
        </section>

        <aside className="right-panel">
          <div className="panel right-top">
            <ReportCenter
              templates={templates}
              selectedTemplate={selectedTemplate}
              onTemplateChange={setSelectedTemplate}
              onCreateTemplate={handleCreateTemplate}
              onGenerate={handleGenerateReport}
              reports={reports}
              onUpdateReport={handleUpdateReport}
            />
          </div>
          <div className="panel right-bottom">
            <ActionPanel selectedEvent={selectedEvent} onCompleteDisposal={handleCompleteDisposal} />
          </div>
        </aside>
      </main>
    </div>
  )
}

export default App
