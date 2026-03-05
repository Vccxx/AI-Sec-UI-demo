import React, { useMemo, useState } from 'react'
import { Download, Eye, FileText, PlusCircle, Save } from 'lucide-react'

function ReportCenter({
  templates,
  selectedTemplate,
  onTemplateChange,
  onCreateTemplate,
  onGenerate,
  reports,
  onUpdateReport,
}) {
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState('')
  const [newTemplateSource, setNewTemplateSource] = useState('')
  const [previewReportId, setPreviewReportId] = useState('')
  const [draftContent, setDraftContent] = useState('')

  const selectedTemplateMeta = useMemo(
    () => templates.find((tpl) => tpl.name === selectedTemplate) ?? templates[0],
    [selectedTemplate, templates],
  )

  const previewReport = useMemo(
    () => reports.find((report) => report.id === previewReportId),
    [previewReportId, reports],
  )

  const handleTemplateSelect = (value) => {
    if (value === '__create_new__') {
      setIsCreatingTemplate(true)
      return
    }

    setIsCreatingTemplate(false)
    onTemplateChange(value)
  }

  const handleCreate = () => {
    const name = newTemplateName.trim()
    const source = newTemplateSource.trim()
    if (!name || !source) return
    onCreateTemplate(name, source)
    onTemplateChange(name)
    setNewTemplateName('')
    setNewTemplateSource('')
    setIsCreatingTemplate(false)
  }

  const openPreview = (report) => {
    setPreviewReportId(report.id)
    setDraftContent(report.content ?? '')
  }

  const saveDraft = () => {
    if (!previewReportId) return
    onUpdateReport(previewReportId, draftContent)
  }

  const downloadReport = (report) => {
    const fileName = `${report.template}-${report.eventTitle}-${report.timestamp.replace(/[\s:/]/g, '-')}.txt`
    const text = [
      `报告模板: ${report.template}`,
      `数据来源: ${report.templateDataSource ?? '未配置'}`,
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
    <div className="report-wrap">
      <div className="panel-title">
        <FileText size={16} />
        <span>报告中心</span>
      </div>

      <div className="report-controls">
        <label htmlFor="template-select">模板选择</label>
        <select
          id="template-select"
          value={selectedTemplate}
          onChange={(event) => handleTemplateSelect(event.target.value)}
        >
          {templates.map((tpl) => (
            <option key={tpl.name} value={tpl.name}>
              {tpl.name}
            </option>
          ))}
          <option value="__create_new__">+ 创建新模板</option>
        </select>

        <div className="template-source-tip">
          <span className="template-name-inline" title={selectedTemplateMeta?.name ?? '未配置模板'}>
            模板：{selectedTemplateMeta?.name ?? '未配置模板'}
          </span>
          <strong
            className="template-source-inline"
            title={selectedTemplateMeta?.dataSource ?? '未配置'}
          >
            数据来源：{selectedTemplateMeta?.dataSource ?? '未配置'}
          </strong>
        </div>

        {isCreatingTemplate ? (
          <div className="template-create-box">
            <input
              value={newTemplateName}
              onChange={(event) => setNewTemplateName(event.target.value)}
              placeholder="输入新模板名称"
            />
            <input
              value={newTemplateSource}
              onChange={(event) => setNewTemplateSource(event.target.value)}
              placeholder="配置数据来源，例如：WAF日志、EDR、流量分析"
            />
            <button type="button" className="secondary-btn" onClick={handleCreate}>
              新增模板
            </button>
          </div>
        ) : null}

        <button type="button" className="primary-btn" onClick={onGenerate}>
          <PlusCircle size={16} />
          生成AI报告
        </button>
      </div>

      <div className="report-list">
        {reports.length === 0 ? (
          <div className="empty-tip">暂无报告，请先生成。</div>
        ) : (
          reports.map((report) => (
            <div key={report.id} className="report-item">
              <div className="report-main">
                <div className="report-head-inline">
                  <strong title={report.template}>{report.template}</strong>
                  <em
                    className="report-source-inline"
                    title={`数据来源：${report.templateDataSource ?? '未配置'}`}
                  >
                    数据来源：{report.templateDataSource ?? '未配置'}
                  </em>
                </div>
                <span>{report.eventTitle}</span>
                <em>{report.timestamp}</em>
              </div>
              <div className="report-actions">
                <button type="button" className="detail-btn" onClick={() => openPreview(report)}>
                  <Eye size={13} />
                  查看
                </button>
                <button type="button" className="detail-btn" onClick={() => downloadReport(report)}>
                  <Download size={13} />
                  下载
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {previewReport ? (
        <div className="alert-modal-mask" onClick={() => setPreviewReportId('')}>
          <div className="alert-modal" onClick={(event) => event.stopPropagation()}>
            <div className="alert-modal-head">
              <strong>{previewReport.template} - 报告查看与编辑</strong>
              <button type="button" className="close-btn" onClick={() => setPreviewReportId('')}>
                关闭
              </button>
            </div>

            <div className="alert-meta-grid">
              <div className="alert-meta-item">
                <span>报告模板</span>
                <strong>{previewReport.template}</strong>
              </div>
              <div className="alert-meta-item">
                <span>数据来源</span>
                <strong>{previewReport.templateDataSource ?? '未配置'}</strong>
              </div>
              <div className="alert-meta-item">
                <span>关联事件</span>
                <strong>{previewReport.eventTitle}</strong>
              </div>
              <div className="alert-meta-item">
                <span>生成时间</span>
                <strong>{previewReport.timestamp}</strong>
              </div>
              <div className="alert-meta-item">
                <span>报告编号</span>
                <strong>{previewReport.id}</strong>
              </div>
            </div>

            <div className="report-editor">
              <div className="raw-head">报告正文</div>
              <textarea value={draftContent} onChange={(event) => setDraftContent(event.target.value)} />
            </div>

            <div className="report-editor-actions">
              <button type="button" className="primary-btn" onClick={saveDraft}>
                <Save size={14} />
                保存修改
              </button>
              <button type="button" className="secondary-btn" onClick={() => downloadReport({ ...previewReport, content: draftContent })}>
                <Download size={14} />
                下载当前内容
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default ReportCenter
