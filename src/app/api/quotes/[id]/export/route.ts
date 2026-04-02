import { NextResponse } from 'next/server'
import { getQuoteById } from '@/server/db/conversations'
import { createErrorResponse, withErrorHandler, ErrorCode } from '@/server/api/response'

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatMoney(cents: number | null | undefined) {
  if (cents == null || Number.isNaN(cents)) return '¥0.00'
  return `¥${(cents / 100).toFixed(2)}`
}

function quoteParameterSummary(params: Record<string, any>) {
  if (!params) return 'N/A'

  const fields = [
    params.finishedSize && `尺寸: ${params.finishedSize}`,
    params.pageCount && `页数: ${params.pageCount}`,
    params.coverPaper && `封面纸: ${params.coverPaper}`,
    params.coverWeight && `封面克重: ${params.coverWeight}g`,
    params.innerPaper && `内页纸: ${params.innerPaper}`,
    params.innerWeight && `内页克重: ${params.innerWeight}g`,
    params.bindingType && `装订: ${params.bindingType}`,
    params.paperType && `纸张: ${params.paperType}`,
    params.paperWeight && `克重: ${params.paperWeight}g`,
    params.printSides && `单双面: ${params.printSides}`,
    params.lamination && `覆膜: ${params.lamination}`,
    params.finishType && `工艺: ${params.finishType}`,
    params.quantity && `数量: ${params.quantity}`,
  ].filter(Boolean)

  return fields.length > 0 ? fields.join('，') : 'N/A'
}

export async function GET(_request: Request, { params }: { params: { id?: string } }) {
  return withErrorHandler(async () => {
    const quoteId = Number(params.id)
    if (!Number.isInteger(quoteId) || quoteId <= 0) {
      return createErrorResponse('报价ID无效', ErrorCode.VALIDATION_ERROR, 400)
    }

    const quote = await getQuoteById(quoteId)
    if (!quote) {
      return createErrorResponse('报价不存在', ErrorCode.NOT_FOUND, 404)
    }

  const parameters = (quote.parameters as Record<string, any>) ?? {}
  const pricing = (quote.pricingDetails as Record<string, any>) ?? {}
  const unitPrice = pricing.unitPrice ?? (parameters.quantity ? quote.subtotalCents / 100 / parameters.quantity : 0)
  const summary = escapeHtml(String(parameters.summary || (quote.parameters as Record<string, any>)?.summary || quote.productCategory?.name || '报价信息'))
  const specSummary = escapeHtml(quoteParameterSummary(parameters))
  const productType = escapeHtml(String(parameters.productType || quote.productCategory?.name || 'N/A'))
  const quoteStatus = escapeHtml(String(quote.status))
  const createdAtText = escapeHtml(new Date(quote.createdAt).toLocaleString())

  const html = `<!doctype html>
  <html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>报价单 #${quote.id}</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", Arial, sans-serif; color: #111; padding: 24px; }
      .container { max-width: 900px; margin: 0 auto; border: 1px solid #ccc; padding: 20px; background: #fff; }
      h1 { font-size: 1.6rem; margin-bottom: 8px; }
      .meta { margin-bottom: 20px; }
      .meta div { margin: 4px 0; }
      table { width: 100%; border-collapse: collapse; margin-top: 12px; }
      th, td { border: 1px solid #bbb; padding: 8px 10px; text-align: left; }
      th { background: #f8f8f8; }
      .value { font-weight: 600; }
      .footnote { margin-top: 20px; color: #666; font-size: 0.85rem; }
      @media print { .no-print { display: none; } }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>报价单 #${quote.id}</h1>
      <div class="meta">
        <div><strong>Quote ID：</strong>${quote.id}</div>
        <div><strong>Conversation ID：</strong>${quote.conversationId}</div>
        <div><strong>状态：</strong>${quoteStatus}</div>
        <div><strong>创建时间：</strong>${createdAtText}</div>
      </div>

      <table>
        <tbody>
          <tr><th>产品类型</th><td>${productType}</td></tr>
          <tr><th>规格参数摘要</th><td>${specSummary}</td></tr>
          <tr><th>单价</th><td>${typeof unitPrice === 'number' ? `¥${Number(unitPrice).toFixed(2)}` : unitPrice}</td></tr>
          <tr><th>总价（产品小计）</th><td>${formatMoney(quote.subtotalCents)}</td></tr>
          <tr><th>运费</th><td>${formatMoney(quote.shippingCents)}</td></tr>
          <tr><th>税费</th><td>${formatMoney(quote.taxCents)}</td></tr>
          <tr><th>最终价格</th><td>${formatMoney(quote.totalCents)}</td></tr>
          <tr><th>系统摘要</th><td>${summary}</td></tr>
        </tbody>
      </table>

      <div class="footnote">
        说明：本报价单基于系统中现有数据生成，仅供参考，最终报价请以商务确认为准。
      </div>

      <div class="no-print" style="margin-top: 16px;">
        <button onclick="window.print()" style="padding: 8px 14px; border-radius: 4px; border: 1px solid #888; background: #f5f5f5; cursor: pointer;">打印此页</button>
      </div>
    </div>
  </body>
  </html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  })
  }, 'quote-export')
}
