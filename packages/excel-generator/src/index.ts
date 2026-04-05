import type { WorkingPaper } from '@icet/shared';
import * as XLSX from 'xlsx';

/**
 * 从 WorkingPaper 数据构建 Excel 工作簿
 * 纯函数，前后端通用
 */
export function buildWorkbook(data: WorkingPaper): ArrayBuffer {
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: 工作底稿 ──
  const ws = buildWorkingPaperSheet(data);
  XLSX.utils.book_append_sheet(wb, ws, '工作底稿');

  // ── Sheet 2: 差异记录 ──
  if (data.anomalies.length > 0) {
    const anomalyWs = buildAnomalySheet(data);
    XLSX.utils.book_append_sheet(wb, anomalyWs, '差异记录');
  }

  // ── Sheet 3: 图例说明 ──
  const legendWs = buildLegendSheet();
  XLSX.utils.book_append_sheet(wb, legendWs, '图例说明');

  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}

/**
 * 构建工作底稿主表
 */
function buildWorkingPaperSheet(data: WorkingPaper): XLSX.WorkSheet {
  const rows: (string | number)[][] = [];
  let rowIdx = 0;

  // §1 标题行
  rows.push([data.documentName]);
  rowIdx++;

  // §2 基本信息
  rows.push(['测试底稿编号', data.paperId]);
  rows.push(['测试单位名称', data.unitName]);
  rows.push(['测试执行人', data.testerName]);
  rows.push(['测试审阅人', data.reviewerName]);
  rows.push(['完成日期', data.completionDate]);
  rowIdx += 5;

  // §3 流程信息
  rows.push(['一级流程', data.processLevel1]);
  rows.push(['二级流程', data.processLevel2]);
  rows.push(['三级流程', data.processLevel3]);
  rowIdx += 3;

  // §4 控制点描述
  rows.push(['控制点描述', data.controlDescription]);
  rowIdx++;

  // §5 测试结果
  rows.push(['控制编号', data.testResult.controlIds]);
  rows.push(['测试结果', data.testResult.result]);
  rowIdx += 2;

  // §6 抽样信息
  rows.push(['抽样方法', data.sampling.method]);
  rows.push(['抽样期间', data.sampling.period]);
  rows.push(['样本数量', data.sampling.sampleCount]);
  rows.push(['样本来源', data.sampling.sampleSource]);
  rowIdx += 4;

  // §7 测试步骤 + 样本矩阵
  const stepHeaders = ['样本序号', '样本内容', ...data.steps.map(s => `步骤${s.index}`), '备注'];
  rows.push(stepHeaders);
  rowIdx++;

  for (const sample of data.samples) {
    const row: (string | number)[] = [
      sample.no,
      sample.content,
      ...sample.stepResults,
      sample.remark ?? '',
    ];
    rows.push(row);
    rowIdx++;
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // 设置列宽
  ws['!cols'] = [
    { wch: 10 },  // 样本序号
    { wch: 30 },  // 样本内容
    ...data.steps.map(() => ({ wch: 20 })),  // 步骤列
    { wch: 20 },  // 备注
  ];

  // 合并单元格 — 标题行
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: stepHeaders.length - 1 } },
  ];

  return ws;
}

/**
 * 构建差异记录表
 */
function buildAnomalySheet(data: WorkingPaper): XLSX.WorkSheet {
  const headers = ['缺陷序号', '情况说明', '步骤号', '样本序号', '支持性文档'];
  const rows: (string | number)[][] = [headers];

  for (const anomaly of data.anomalies) {
    rows.push([
      anomaly.findingNo,
      anomaly.description,
      anomaly.stepNo,
      anomaly.sampleNo,
      anomaly.supportingDoc,
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 10 },
    { wch: 40 },
    { wch: 10 },
    { wch: 10 },
    { wch: 30 },
  ];

  return ws;
}

/**
 * 构建图例说明表
 */
function buildLegendSheet(): XLSX.WorkSheet {
  const rows = [
    ['图例说明'],
    [],
    ['符号', '含义'],
    ['✓', '通过 — 找到满足要求的明确证据'],
    ['×', '不通过 — 发现明确的缺失或不符合情况'],
    ['N/A', '不适用 — 该步骤不适用于本样本'],
    ['PENDING', '待执行 — 尚未执行该步骤'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 10 },
    { wch: 50 },
  ];
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
  ];

  return ws;
}
