import React, { useMemo, useState } from 'react'
import { Download, Eye, FileText, PlusCircle, Save, Settings2 } from 'lucide-react'

function ReportGeneratorDock({
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
  const [activePopover, setActivePopover] = useState('')

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
    <>
      <div className="report-dock compact" onMouseLeave={() => setActivePopover('')}>
        <button type="button" className="report-dock-icon primary" onClick={onGenerate} title="生成报告">
          <PlusCircle size={13} />
          <span>生成</span>
        </button>

        <div className="report-dock-pop-wrap">
          <button
            type="button"
            className="report-dock-icon"
            onClick={() => setActivePopover((prev) => (prev === 'template' ? '' : 'template'))}
            onMouseEnter={() => setActivePopover('template')}
            title="模板管理"
          >
            <Settings2 size={13} />
            <span>模板</span>
          </button>

          {activePopover === 'template' ? (
            <div className="report-dock-popover">
              <div className="report-dock-pop-head">报告模板</div>
              <select
                className="report-dock-select"
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

              <div className="report-dock-source">
                <span title={selectedTemplateMeta?.name ?? '未配置模板'}>{selectedTemplateMeta?.name ?? '未配置模板'}</span>
                <strong title={selectedTemplateMeta?.dataSource ?? '未配置'}>
                  {selectedTemplateMeta?.dataSource ?? '未配置'}
                </strong>
              </div>

              {isCreatingTemplate ? (
                <div className="report-dock-create">
                  <input
                    value={newTemplateName}
                    onChange={(event) => setNewTemplateName(event.target.value)}
                    placeholder="新模板"
                  />
                  <input
                    value={newTemplateSource}
                    onChange={(event) => setNewTemplateSource(event.target.value)}
                    placeholder="数据来源"
                  />
                  <button type="button" className="secondary-btn" onClick={handleCreate}>
                    新增
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="report-dock-pop-wrap">
          <button
            type="button"
            className="report-dock-icon"
            onClick={() => setActivePopover((prev) => (prev === 'recent' ? '' : 'recent'))}
            onMouseEnter={() => setActivePopover('recent')}
            title="最近报告"
          >
            <FileText size={13} />
            <span>报告</span>
          </button>

          {activePopover === 'recent' ? (
            <div className="report-dock-popover report-dock-popover-wide">
              <div className="report-dock-pop-head">最近报告</div>
              <div className="report-dock-list">
                {reports.slice(0, 5).map((report) => (
                  <div key={report.id} className="report-dock-item">
                    <strong title={report.eventTitle}>{report.eventTitle}</strong>
                    <em>{report.timestamp}</em>
                    <div className="report-dock-actions">
                      <button type="button" onClick={() => openPreview(report)} title="查看">
                        <Eye size={12} />
                      </button>
                      <button type="button" onClick={() => downloadReport(report)} title="下载">
                        <Download size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
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

            <div className="report-editor">
              <div className="raw-head">报告正文</div>
              <textarea value={draftContent} onChange={(event) => setDraftContent(event.target.value)} />
            </div>

            <div className="report-editor-actions">
              <button type="button" className="primary-btn" onClick={saveDraft}>
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
        </div>
      ) : null}
    </>
  )
}

export default ReportGeneratorDock
