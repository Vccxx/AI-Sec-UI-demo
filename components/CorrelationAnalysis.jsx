import React, { useEffect, useMemo, useState } from 'react'
import {
  Database,
  Network,
  Radar,
  ScanSearch,
  ServerCog,
  ShieldAlert,
  UserRoundCog,
} from 'lucide-react'

const sourceConfig = {
  asset_map: { label: '资产安全测绘', icon: ShieldAlert },
  waf: { label: 'WAF日志', icon: ScanSearch },
  edr: { label: 'EDR记录', icon: ServerCog },
  traffic: { label: '流量分析', icon: Radar },
  intel: { label: '威胁情报', icon: Network },
  siem: { label: 'SIEM事件', icon: Database },
  iam: { label: '身份审计', icon: UserRoundCog },
}

function CorrelationAnalysis({ selectedEvent }) {
  const [activeServerId, setActiveServerId] = useState(selectedEvent.relatedServers?.[0]?.id ?? '')
  const [detailModal, setDetailModal] = useState(null)

  useEffect(() => {
    setActiveServerId(selectedEvent.relatedServers?.[0]?.id ?? '')
  }, [selectedEvent])

  const activeServer = useMemo(
    () =>
      selectedEvent.relatedServers?.find((server) => server.id === activeServerId) ??
      selectedEvent.relatedServers?.[0],
    [activeServerId, selectedEvent],
  )

  const activeSourceSet = new Set(activeServer?.links ?? [])
  const activeSources = selectedEvent.relatedSources.filter((item) => activeSourceSet.has(item.key))
  const serverTraffic = selectedEvent.rawTraffic.filter((item) => item.serverId === activeServer?.id)
  const authenticityEvidence = useMemo(
    () =>
      (selectedEvent.authenticityEvidence ?? []).filter(
        (item) => item.sourceKey === 'asset_map' || activeSourceSet.has(item.sourceKey),
      ),
    [activeSourceSet, selectedEvent],
  )

  const openTrafficDetail = (flow) => {
    const rawText = [
      `[${flow.time}] SRC=${flow.srcIp} DST=${flow.dstIp}:${flow.dstPort}`,
      `METHOD=${flow.method} PATH=${flow.path}`,
      `STATUS=${flow.status} PAYLOAD=${flow.payload}`,
    ].join('\n')

    setDetailModal({
      type: 'traffic',
      title: `原始流量详情 - ${flow.srcIp} -> ${flow.dstIp}:${flow.dstPort}`,
      fields: [
        { label: '告警时间', value: flow.time },
        { label: '攻击源IP', value: flow.srcIp },
        { label: '受害IP', value: flow.dstIp },
        { label: '目的端口', value: flow.dstPort },
        { label: '请求方法', value: flow.method },
        { label: '响应状态', value: flow.status },
        { label: '目标路径', value: flow.path },
      ],
      rawText,
    })
  }

  const openSourceDetail = (source) => {
    const rawText = (source.alerts ?? []).join('\n')
    setDetailModal({
      type: 'device',
      title: `${source.name} - 设备告警详情`,
      fields: [
        { label: '设备类型', value: source.name },
        { label: '关联资产', value: activeServer?.name ?? '-' },
        { label: '资产IP', value: activeServer?.ip ?? '-' },
        { label: '当前状态', value: source.status },
        { label: '事件等级', value: selectedEvent.severity },
        { label: '攻击结果', value: selectedEvent.attackResult },
      ],
      rawText,
    })
  }

  const openEvidenceDetail = (evidence) => {
    setDetailModal({
      type: 'auth',
      title: `真实性依据 ${evidence.id} - ${evidence.name}`,
      fields: [
        { label: '依据编号', value: evidence.id },
        { label: '证据来源', value: evidence.name },
        { label: '对应步骤', value: `步骤 ${evidence.stepIndex + 1}` },
        { label: '关联资产', value: activeServer?.name ?? selectedEvent.target },
        { label: '真实性信号', value: evidence.riskSignal ?? '高关联' },
      ],
      rawText: evidence.raw ?? evidence.summary ?? '暂无证据原文',
    })
  }

  const serverPositions = useMemo(() => {
    const count = Math.max(1, selectedEvent.relatedServers.length)
    if (count === 1) return [{ x: 74, y: 50 }]

    const centerX = 58
    const centerY = 50
    const radiusX = count >= 4 ? 20 : 18
    const radiusY = count >= 4 ? 30 : 26
    const startDeg = -70
    const endDeg = 70
    const step = count === 1 ? 0 : (endDeg - startDeg) / (count - 1)

    return selectedEvent.relatedServers.map((_, index) => {
      const angle = ((startDeg + step * index) * Math.PI) / 180
      return {
        x: centerX + Math.cos(angle) * radiusX,
        y: centerY + Math.sin(angle) * radiusY,
      }
    })
  }, [selectedEvent.relatedServers])

  const attackerPosition = { x: 16, y: 50 }

  return (
    <div className="correlation-wrap">
      <div className="panel-title">
        <Network size={16} />
        <span>关联分析</span>
      </div>

      <div className="topology-board">
        <div className="topology-split">
          <div className="server-canvas">
            <svg className="line-layer" viewBox="0 0 100 100" preserveAspectRatio="none">
              {selectedEvent.relatedServers.map((server, index) => {
                const pos = serverPositions[index % serverPositions.length]
                return (
                  <line
                    key={`attack-link-${server.id}`}
                    x1={attackerPosition.x}
                    y1={attackerPosition.y}
                    x2={pos.x}
                    y2={pos.y}
                    className={`attack-line ${server.id === activeServer?.id ? 'active' : ''}`}
                  />
                )
              })}

              {selectedEvent.relatedServers.map((server, index) => {
                const pos = serverPositions[index % serverPositions.length]
                return (
                  <line
                    key={`server-link-${server.id}`}
                    x1={50}
                    y1={50}
                    x2={pos.x}
                    y2={pos.y}
                    className={`signal-line ${server.id === activeServer?.id ? 'active' : ''}`}
                  />
                )
              })}

            </svg>

            <div className="attacker-node pulse">
              <ShieldAlert size={14} />
              <div>
                <strong>攻击者</strong>
                <span>{selectedEvent.sourceIp}</span>
              </div>
            </div>

            <div className="target-node pulse">
              <ShieldAlert size={20} />
              <span>{selectedEvent.target}</span>
            </div>

            {selectedEvent.relatedServers.map((server, index) => {
              const pos = serverPositions[index % serverPositions.length]
              const isActive = server.id === activeServer?.id
              return (
                <button
                  type="button"
                  key={server.id}
                  className={`server-node ${isActive ? 'active pulse' : ''}`}
                  style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                  onClick={() => setActiveServerId(server.id)}
                >
                  <ServerCog size={14} />
                  <span>{server.name}</span>
                  <em>{server.alertCount}条</em>
                </button>
              )
            })}

          </div>

          <div className="asset-detail-panel">
            <h4>受害资产详情</h4>
            {activeServer ? (
              <>
                <div className="asset-kv"><span>资产名称</span><strong>{activeServer.name}</strong></div>
                <div className="asset-kv"><span>设备主人</span><strong>{activeServer.owner}</strong></div>
                <div className="asset-kv"><span>资产IP</span><strong>{activeServer.ip}</strong></div>
                <div className="asset-kv"><span>暴露端口</span><strong>{activeServer.port}</strong></div>
                <div className="asset-kv"><span>所属区域</span><strong>{activeServer.zone}</strong></div>
                <div className="asset-kv"><span>关联告警</span><strong>{activeServer.alertCount} 条</strong></div>
                <div className="asset-kv"><span>风险等级</span><strong>{activeServer.risk}</strong></div>
              </>
            ) : null}
          </div>
        </div>

        <div className="traffic-panel">
          <div className="traffic-title">原始流量信息</div>
          <div className="traffic-list">
            {serverTraffic.map((flow, index) => (
              <div className="traffic-row" key={`${flow.time}-${index}`}>
                <div className="traffic-row-main">
                  <strong>{flow.time}</strong>
                  <span>{flow.srcIp} -&gt; {flow.dstIp}:{flow.dstPort}</span>
                  <span>{flow.method} | {flow.path}</span>
                </div>
                <div className="traffic-row-side">
                  <em>{flow.status}</em>
                  <button type="button" className="detail-btn" onClick={() => openTrafficDetail(flow)}>
                    详情
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="auth-basis-panel">
          <div className="traffic-title">攻击真实性判定依据</div>
          <div className="auth-basis-list">
            {authenticityEvidence.length === 0 ? (
              <div className="auth-basis-item">
                <div className="auth-basis-main">
                  <strong>暂无真实性依据</strong>
                  <span>当前资产未匹配到可用于真实性判定的设备证据。</span>
                </div>
              </div>
            ) : (
              authenticityEvidence.map((item) => {
                const Icon = sourceConfig[item.sourceKey]?.icon ?? Database
                return (
                  <div key={item.id} className="auth-basis-item">
                    <div className="auth-basis-main">
                      <strong>
                        <Icon size={13} />
                        {item.id} · {item.name}
                      </strong>
                      <span>{item.summary}</span>
                    </div>
                    <button type="button" className="detail-btn" onClick={() => openEvidenceDetail(item)}>
                      查看依据
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div className="source-status-list">
          {activeSources.map((item) => {
            const Icon = sourceConfig[item.key]?.icon ?? Database
            return (
              <div key={item.key} className="status-item interactive">
                <div className="status-main">
                  <strong>
                    <Icon size={13} />
                    {item.name}
                  </strong>
                  <span>{item.status}</span>
                </div>
                <button type="button" className="detail-btn" onClick={() => openSourceDetail(item)}>
                  查看详情
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {detailModal ? (
        <div className="alert-modal-mask" onClick={() => setDetailModal(null)}>
          <div className="alert-modal" onClick={(event) => event.stopPropagation()}>
            <div className="alert-modal-head">
              <strong>{detailModal.title}</strong>
              <button type="button" className="close-btn" onClick={() => setDetailModal(null)}>
                关闭
              </button>
            </div>

            <div className="alert-meta-grid">
              {detailModal.fields.map((field) => (
                <div key={field.label} className="alert-meta-item">
                  <span>{field.label}</span>
                  <strong>{field.value}</strong>
                </div>
              ))}
            </div>

            <div className="alert-raw-block">
              <div className="raw-head">告警原文</div>
              <pre>{detailModal.rawText || '暂无原始告警原文'}</pre>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default CorrelationAnalysis
