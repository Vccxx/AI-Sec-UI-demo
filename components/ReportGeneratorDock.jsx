import React, { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Clock3, Download, Eye, FileText, Save, Settings2 } from 'lucide-react'

function ReportGeneratorDock({
  templates,
  selectedTemplate,
  onTemplateChange,
  onCreateTemplate,
  reports,
  onUpdateReport,
  sampleReportLibrary,
  showTitle = true,
}) {
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [showListModal, setShowListModal] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState('')
  const [newTemplateSource, setNewTemplateSource] = useState('')
  const [templateDrafts, setTemplateDrafts] = useState({})
  const [autoGenerateEnabled, setAutoGenerateEnabled] = useState(true)
  const [autoGenerateCycle, setAutoGenerateCycle] = useState('每日')
  const [autoGenerateTime, setAutoGenerateTime] = useState('08:30')
  const [selectedSources, setSelectedSources] = useState(['WAF日志', 'EDR', '流量分析'])
  const [reportScope, setReportScope] = useState('current')
  const [sampleOverrides, setSampleOverrides] = useState({})
  const [previewReport, setPreviewReport] = useState(null)
  const [draftContent, setDraftContent] = useState('')

  const selectedTemplateMeta = useMemo(
    () => templates.find((tpl) => tpl.name === selectedTemplate) ?? templates[0],
    [selectedTemplate, templates],
  )

  const currentTemplateDraft = templateDrafts[selectedTemplate] ?? ''

  const sampleReports = useMemo(() => {
    return (sampleReportLibrary ?? []).map((item) => ({
      ...item,
      content: sampleOverrides[item.id] ?? item.content,
    }))
  }, [sampleOverrides, sampleReportLibrary])

  const listReports = reportScope === 'current' ? reports : sampleReports
  const canPortal = typeof window !== 'undefined' && typeof document !== 'undefined'

  const allSources = ['WAF日志', 'EDR', '流量分析', 'SIEM', '身份审计', '威胁情报']

  useEffect(() => {
    if (!showConfigModal && !showListModal) {
      setPreviewReport(null)
      setDraftContent('')
    }
  }, [showConfigModal, showListModal])

  const toggleSource = (source) => {
    setSelectedSources((prev) =>
      prev.includes(source) ? prev.filter((item) => item !== source) : [...prev, source],
    )
  }

  const createTemplate = () => {
    const name = newTemplateName.trim()
    const source = newTemplateSource.trim()
    if (!name || !source) return
    onCreateTemplate(name, source)
    onTemplateChange(name)
    setNewTemplateName('')
    setNewTemplateSource('')
  }

  const openPreview = (report, sourceType) => {
    setPreviewReport({ ...report, sourceType })
    setDraftContent(report.content ?? '')
  }

  const savePreview = () => {
    if (!previewReport) return
    if (previewReport.sourceType === 'current') {
      onUpdateReport(previewReport.id, draftContent)
      return
    }
    setSampleOverrides((prev) => ({ ...prev, [previewReport.id]: draftContent }))
  }

  const downloadReport = (report) => {
    const fileName = `${report.template}-${report.eventTitle}-${report.timestamp.replace(/[\s:/]/g, '-')}.txt`
    const text = [
      `报告模板: ${report.template}`,
      `报告类别: ${report.category ?? '运行报告'}`,
      `事件名称: ${report.eventTitle}`,
      `生成时间: ${report.timestamp}`,
      '',
      report.content ?? '暂无内容',
    ].join('\n')

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = fileName
    anchor.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <>
      <div className="report-dock compact">
        {showTitle ? <div className="report-hub-title">报告中心</div> : null}
        <div className="report-hub-actions">
          <button type="button" className="report-hub-btn" onClick={() => setShowConfigModal(true)}>
            <Settings2 size={12} />
            报告配置
          </button>
          <button type="button" className="report-hub-btn" onClick={() => setShowListModal(true)}>
            <FileText size={12} />
            报告列表
          </button>
        </div>
      </div>

      {showConfigModal && canPortal
        ? createPortal(
        <div className="alert-modal-mask report-global-mask" onClick={() => setShowConfigModal(false)}>
          <div className="alert-modal report-hub-modal report-global-modal" onClick={(event) => event.stopPropagation()}>
            <div className="alert-modal-head">
              <strong>报告配置</strong>
              <button type="button" className="close-btn" onClick={() => setShowConfigModal(false)}>
                关闭
              </button>
            </div>

            <div className="report-config-grid">
              <div className="report-config-card">
                <span>数据源配置</span>
                <div className="source-chip-list">
                  {allSources.map((source) => (
                    <button
                      key={source}
                      type="button"
                      className={`source-chip ${selectedSources.includes(source) ? 'active' : ''}`}
                      onClick={() => toggleSource(source)}
                    >
                      {source}
                    </button>
                  ))}
                </div>
              </div>

              <div className="report-config-card">
                <span>模板选择</span>
                <select value={selectedTemplate} onChange={(event) => onTemplateChange(event.target.value)}>
                  {templates.map((tpl) => (
                    <option key={tpl.name} value={tpl.name}>
                      {tpl.name}
                    </option>
                  ))}
                </select>
                <em>数据来源：{selectedTemplateMeta?.dataSource ?? '未配置'}</em>
              </div>

              <div className="report-config-card">
                <span>模板编辑</span>
                <textarea
                  value={currentTemplateDraft}
                  onChange={(event) =>
                    setTemplateDrafts((prev) => ({ ...prev, [selectedTemplate]: event.target.value }))
                  }
                  placeholder="编辑模板结构，例如：摘要、攻击链路、处置回执、复盘建议"
                />
              </div>

              <div className="report-config-card">
                <span>模板新建</span>
                <input
                  value={newTemplateName}
                  onChange={(event) => setNewTemplateName(event.target.value)}
                  placeholder="输入模板名称"
                />
                <input
                  value={newTemplateSource}
                  onChange={(event) => setNewTemplateSource(event.target.value)}
                  placeholder="输入模板数据源"
                />
                <button type="button" className="secondary-btn" onClick={createTemplate}>
                  新建模板
                </button>
              </div>

              <div className="report-config-card">
                <span>定时自动生成</span>
                <label className="inline-check">
                  <input
                    type="checkbox"
                    checked={autoGenerateEnabled}
                    onChange={(event) => setAutoGenerateEnabled(event.target.checked)}
                  />
                  启用自动生成
                </label>
                <div className="schedule-row">
                  <select value={autoGenerateCycle} onChange={(event) => setAutoGenerateCycle(event.target.value)}>
                    <option value="每小时">每小时</option>
                    <option value="每日">每日</option>
                    <option value="每周">每周</option>
                  </select>
                  <input
                    type="time"
                    value={autoGenerateTime}
                    onChange={(event) => setAutoGenerateTime(event.target.value)}
                  />
                </div>
                <em>
                  <Clock3 size={12} /> 自动生成策略：{autoGenerateEnabled ? `${autoGenerateCycle} ${autoGenerateTime}` : '已关闭'}
                </em>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )
        : null}

      {showListModal && canPortal
        ? createPortal(
        <div className="alert-modal-mask report-global-mask" onClick={() => setShowListModal(false)}>
          <div className="alert-modal report-hub-modal report-global-modal" onClick={(event) => event.stopPropagation()}>
            <div className="alert-modal-head">
              <strong>报告列表</strong>
              <button type="button" className="close-btn" onClick={() => setShowListModal(false)}>
                关闭
              </button>
            </div>

            <div className="report-list-switch">
              <button
                type="button"
                className={reportScope === 'current' ? 'active' : ''}
                onClick={() => setReportScope('current')}
              >
                当前报告
              </button>
              <button
                type="button"
                className={reportScope === 'sample' ? 'active' : ''}
                onClick={() => setReportScope('sample')}
              >
                样例报告数据
              </button>
            </div>

            <div className="report-list-modal">
              {listReports.map((report) => (
                <div key={report.id} className="report-item">
                  <div className="report-main">
                    <div className="report-head-inline">
                      <strong>{report.template}</strong>
                      <em>{report.category ?? '运行报告'}</em>
                    </div>
                    <span>{report.eventTitle}</span>
                    <em>{report.timestamp}</em>
                  </div>
                  <div className="report-actions">
                    <button
                      type="button"
                      className="detail-btn"
                      onClick={() => openPreview(report, reportScope)}
                    >
                      <Eye size={13} />
                      查看
                    </button>
                    <button type="button" className="detail-btn" onClick={() => downloadReport(report)}>
                      <Download size={13} />
                      下载
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body,
      )
        : null}

      {previewReport && canPortal
        ? createPortal(
        <div className="alert-modal-mask report-global-mask" onClick={() => setPreviewReport(null)}>
          <div className="alert-modal report-global-modal" onClick={(event) => event.stopPropagation()}>
            <div className="alert-modal-head">
              <strong>{previewReport.template} - 报告查看与编辑</strong>
              <button type="button" className="close-btn" onClick={() => setPreviewReport(null)}>
                关闭
              </button>
            </div>

            <div className="report-editor">
              <div className="raw-head">报告正文</div>
              <textarea value={draftContent} onChange={(event) => setDraftContent(event.target.value)} />
            </div>

            <div className="report-editor-actions">
              <button type="button" className="primary-btn" onClick={savePreview}>
                <Save size={14} />
                保存修改
              </button>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => downloadReport({ ...previewReport, content: draftContent })}
              >
                <Download size={14} />
                下载当前内容
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )
        : null}
    </>
  )
}

export default ReportGeneratorDock
