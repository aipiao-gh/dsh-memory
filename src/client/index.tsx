/**
 * dsh-memory —— Client 半（Web bundle 入口）
 *
 * 通过 `dsh.client.inject: ['memory']` 注入宿主提供的 `memory` Service
 * （见 src/index.ts 的 MemoryProvider）。注册到 `settings.section`。
 */
import React, { useEffect, useState } from 'react'

type MemoryApi = {
  list(): Promise<{ memories: any[]; profile?: any; config?: any; storeMode?: string; storeReady?: boolean; memCount?: number; debug?: any }>
  add(input: { content: string; source?: string; category?: string[] }): Promise<any>
  rm(input: { id: string; purge?: boolean }): Promise<any>
  restore(id: string): Promise<any>
  pin(input: { id: string; pinned?: boolean }): Promise<any>
  getProfile(): Promise<{ profile?: any }>
  setProfile(input: { patch?: any }): Promise<any>
  setConfig(input: { config?: any }): Promise<any>
}

interface Props { memory: MemoryApi }

export const name = 'dsh-memory-client'
export const inject = ['memory']

export function apply(ctx: any) {
  const slots = ctx.get('slots')
  if (slots === undefined) return
  slots.inject('settings.section', () => slots.register(
    { name: 'settings.section', id: 'dsh-memory', order: 95, label: '记忆管理' },
    () => React.createElement(MemoryView, { memory: ctx.memory }),
  ))
}

function fmtTime(ts: any) { if (!ts) return '无效'; return new Date(ts).toLocaleString() }
function fmtSources(srcs: any) {
  if (!Array.isArray(srcs) || !srcs.length) return '—'
  return srcs.map((s: any) => { if (!s) return '—'; if (s.endSeq != null && s.startSeq != null) return (s.sessionId || '?') + ':' + s.startSeq + '-' + s.endSeq; return String(s.sessionId || s.source || '—') }).join(', ')
}
function objToKV(o: any) { o = o || {}; return Object.keys(o).map((k) => k + ': ' + String(o[k])).join('\n') }
function kvToObj(text: string) { const out: any = {}; String(text || '').split(/\n/).forEach((line) => { line = line.trim(); if (!line) return; const i = line.indexOf(':'); if (i < 0) return; out[line.slice(0, i).trim()] = line.slice(i + 1).trim() }); return out }

function ProfileView({ profile, memory }: { profile: any; memory: MemoryApi }) {
  const [editing, setEditing] = useState(false)
  const [basicText, setBasicText] = useState(''); const [prefText, setPrefText] = useState(''); const [personalityText, setPersonalityText] = useState(''); const [unlikesText, setUnlikesText] = useState(''); const [focusText, setFocusText] = useState(''); const [overrideText, setOverrideText] = useState('')
  const [saveMsg, setSaveMsg] = useState(''); const [saveKind, setSaveKind] = useState('ok')
  if (!profile) return React.createElement('div', null, '（暂无画像）')

  const startEdit = () => {
    setBasicText(objToKV(profile.basicInfo)); setPrefText(objToKV(profile.preferences)); setPersonalityText((profile.personality || []).join(', ')); setUnlikesText((profile.unlikes || []).join(', ')); setFocusText(profile.currentFocus || ''); setOverrideText(objToKV(profile.override)); setEditing(true); setSaveMsg('')
  }
  const save = async () => {
    const patch = { basicInfo: kvToObj(basicText), preferences: kvToObj(prefText), personality: personalityText.split(',').map((s: string) => s.trim()).filter(Boolean), unlikes: unlikesText.split(',').map((s: string) => s.trim()).filter(Boolean), currentFocus: focusText.trim(), override: kvToObj(overrideText) }
    const r = await memory.setProfile({ patch })
    if (r?.ok) { setSaveKind('ok'); setSaveMsg('画像已保存'); setEditing(false) } else { setSaveKind('err'); setSaveMsg('保存失败：' + (r?.error || 'unknown')) }
  }

  const field = (title: string, obj: any) => React.createElement('div', { key: title, className: 'pcard' },
    React.createElement('h4', null, title),
    Object.keys(obj || {}).length
      ? Object.keys(obj).map((k) => React.createElement('div', { key: k, className: 'row' }, React.createElement('b', null, k + '：'), React.createElement('span', null, String(obj[k]))))
      : React.createElement('div', null, '（暂无）'))

  const view = React.createElement('div', { className: 'block-body' },
    React.createElement('div', { className: 'hint' }, '更新于 ' + fmtTime(profile.updatedAt) + ' · 版本 v' + (profile.revision || 1)),
    field('基本信息', profile.basicInfo),
    React.createElement('div', { className: 'pcard' }, React.createElement('h4', null, '性格'), (profile.personality || []).length ? (profile.personality || []).join('、') : '（暂无）'),
    field('偏好', profile.preferences),
    React.createElement('div', { className: 'pcard' }, React.createElement('h4', null, '不喜欢'), (profile.unlikes || []).length ? (profile.unlikes || []).join('、') : '（暂无）'),
    React.createElement('div', { className: 'pcard' }, React.createElement('h4', null, '当前关注'), profile.currentFocus || '（暂无）'),
    React.createElement('details', null, React.createElement('summary', null, '查看原始 JSON'), React.createElement('pre', null, JSON.stringify(profile, null, 2))),
  )
  const editor = React.createElement('div', { className: 'block-body' },
    React.createElement('label', null, '基本信息（每行 键: 值）'), React.createElement('textarea', { rows: 2, value: basicText, onChange: (e) => setBasicText(e.target.value) }),
    React.createElement('label', null, '性格（逗号分隔）'), React.createElement('input', { value: personalityText, onChange: (e) => setPersonalityText(e.target.value) }),
    React.createElement('label', null, '偏好（每行 键: 值）'), React.createElement('textarea', { rows: 2, value: prefText, onChange: (e) => setPrefText(e.target.value) }),
    React.createElement('label', null, '不喜欢（逗号分隔）'), React.createElement('input', { value: unlikesText, onChange: (e) => setUnlikesText(e.target.value) }),
    React.createElement('label', null, '当前关注'), React.createElement('input', { value: focusText, onChange: (e) => setFocusText(e.target.value) }),
    React.createElement('label', null, '画像覆盖 override（每行 键: 值）'), React.createElement('textarea', { rows: 2, value: overrideText, onChange: (e) => setOverrideText(e.target.value) }),
    React.createElement('div', { className: 'row' }, React.createElement('button', { onClick: save }, '保存画像'), saveMsg ? React.createElement('span', { className: saveKind === 'err' ? 'err' : 'ok' }, saveMsg) : null),
  )
  return React.createElement('div', { className: 'profile' },
    React.createElement('div', { className: 'row' }, React.createElement('b', null, '用户画像'), React.createElement('button', { onClick: editing ? () => setEditing(false) : startEdit }, editing ? '取消' : '编辑')),
    editing ? editor : view,
  )
}

function MemoryView({ memory }: Props) {
  const [data, setData] = useState<any>(null)
  const [filter, setFilter] = useState('active')
  const [kw, setKw] = useState('')
  const [msg, setMsg] = useState(''); const [msgKind, setMsgKind] = useState('ok')
  const [text, setText] = useState(''); const [srcText, setSrcText] = useState('')
  const [cfgDraft, setCfgDraft] = useState<any>(null)
  const [cfgMsg, setCfgMsg] = useState('')

  const load = () => memory.list().then((r) => { setData(r); if (r.config && !cfgDraft) setCfgDraft(JSON.parse(JSON.stringify(r.config))) }).catch(() => setData({ memories: [] }))
  useEffect(() => { load() }, [])
  const flash = (t: string, k = 'ok') => { setMsg(t); setMsgKind(k) }
  const add = async () => {
    if (!text.trim()) { flash('内容不能为空', 'err'); return }
    const r = await memory.add({ content: text.trim(), source: srcText.trim() })
    if (r?.ok) { flash('已添加记忆'); setText(''); setSrcText(''); load() } else flash('添加失败：' + (r?.error || 'unknown'), 'err')
  }
  const act = async (fn: () => Promise<any>, okMsg: string) => { const r = await fn(); if (r?.ok === false) flash('操作失败：' + (r?.error || 'unknown'), 'err'); else flash(okMsg, 'ok'); load() }
  const saveCfg = async () => { const r = await memory.setConfig({ config: cfgDraft }); if (r?.ok) { setCfgMsg('设置已保存'); load() } else setCfgMsg('保存失败') }

  if (!data) return React.createElement('div', null, '加载记忆…')
  const all = data.memories || []
  const memories = all.filter((m: any) => { if (filter === 'active') return m.status === 'active'; if (filter === 'pending') return m.status === 'pending_review'; if (filter === 'trashed') return m.status === 'trashed'; return true }).filter((m: any) => (kw ? (m.content + ' ' + (m.category || []).join(' ')).toLowerCase().includes(kw.toLowerCase()) : true))
  const dbg = data.debug || {}
  const activeCount = all.filter((m: any) => m.status === 'active').length

  const memItems = memories.map((m: any) => React.createElement('div', { key: m.id, className: 'item' },
    React.createElement('div', { className: 'meta' }, [m.type, '重要度 ' + (m.importance ?? '-'), m.status, m.pinned ? '固定' : '', m.manual ? '手动' : ''].filter(Boolean).map((x, i) => React.createElement('span', { key: i, className: 'badge' }, x))),
    React.createElement('div', null, m.content),
    React.createElement('div', { className: 'hint' }, '来源：' + fmtSources(m.sources)),
    React.createElement('div', { className: 'actions' },
      React.createElement('button', { onClick: () => act(() => memory.pin({ id: m.id, pinned: !m.pinned }), '已更新固定') }, m.pinned ? '取消固定' : '固定'),
      m.status === 'trashed'
        ? React.createElement('button', { onClick: () => act(() => memory.restore(m.id), '已恢复') }, '恢复')
        : React.createElement('button', { onClick: () => act(() => memory.rm({ id: m.id }), '已删除') }, '删除'),
      m.status === 'trashed' ? React.createElement('button', { onClick: () => act(() => memory.rm({ id: m.id, purge: true }), '已彻底删除') }, '彻底删除') : null,
    )))

  const memoryBlock = React.createElement('details', { open: true },
    React.createElement('summary', null, '记忆（共 ' + all.length + ' 条 · active ' + activeCount + ' 条）'),
    React.createElement('div', { className: 'block-body' },
      React.createElement('div', { className: 'row' },
        React.createElement('select', { value: filter, onChange: (e) => setFilter(e.target.value) }, React.createElement('option', { value: 'active' }, 'Active'), React.createElement('option', { value: 'pending' }, '待确认'), React.createElement('option', { value: 'trashed' }, '回收站'), React.createElement('option', { value: 'all' }, '全部')),
        React.createElement('input', { placeholder: '关键词', value: kw, onChange: (e) => setKw(e.target.value) }),
        React.createElement('button', { onClick: load }, '刷新')),
      React.createElement('div', { className: 'row' },
        React.createElement('input', { placeholder: '记忆内容', value: text, onChange: (e) => setText(e.target.value), style: { flex: 1 } }),
        React.createElement('input', { placeholder: '来源（可选）', value: srcText, onChange: (e) => setSrcText(e.target.value), style: { width: 150 } }),
        React.createElement('button', { onClick: add }, '添加')),
      msg ? React.createElement('div', { className: msgKind === 'err' ? 'err' : 'ok' }, msg) : null,
      memories.length === 0 ? React.createElement('div', { className: 'hint' }, '（无匹配记忆）') : memItems,
    ))

  const settingsBlock = React.createElement('details', { style: { marginTop: 4 } },
    React.createElement('summary', null, '插件设置（自动记忆默认关闭：开启后对话片段会发送到你选择的提取模型）'),
    React.createElement('div', { className: 'block-body' },
      React.createElement('label', null, React.createElement('input', { type: 'checkbox', checked: !!(cfgDraft && cfgDraft.memory && cfgDraft.memory.enabled), onChange: (e) => { if (cfgDraft) { cfgDraft.memory.enabled = e.target.checked; setCfgDraft({ ...cfgDraft }) } } }), ' 自动抽取记忆'),
      React.createElement('label', null, React.createElement('input', { type: 'checkbox', checked: !!(cfgDraft && cfgDraft.profile && cfgDraft.profile.enabled), onChange: (e) => { if (cfgDraft) { cfgDraft.profile.enabled = e.target.checked; setCfgDraft({ ...cfgDraft }) } } }), ' 生成/更新用户画像'),
      React.createElement('label', null, '每 N 条对话自动总结一次 '), React.createElement('input', { style: { width: 80 }, value: cfgDraft && cfgDraft.extract ? cfgDraft.extract.windowMessages : '', onChange: (e) => { if (cfgDraft) { cfgDraft.extract.windowMessages = Number(e.target.value) || 0; setCfgDraft({ ...cfgDraft }) } } }),
      React.createElement('div', { className: 'hint' }, '设 0 = 仅在会话结束（flush）时总结；默认 5。'),
      React.createElement('div', { className: 'row' }, React.createElement('button', { onClick: saveCfg }, '保存设置'), cfgMsg ? React.createElement('span', { className: 'ok' }, cfgMsg) : null),
    ))

  return React.createElement('div', { className: 'dsh-memory' },
    React.createElement('h2', null, '记忆管理'),
    React.createElement('div', { className: 'hint' }, '存储：' + (data.storeMode || '?') + (data.storeReady ? '' : ' (未就绪)') + ' · 记忆 ' + (data.memCount ?? all.length) + ' 条 · 注入：baseline' + (dbg.baselineCalls || 0) + '/' + (dbg.baselineEmit || 0) + ' · recall' + (dbg.recallCalls || 0) + '/' + (dbg.recallInjected || 0)),
    memoryBlock,
    React.createElement(ProfileView, { profile: data.profile || null, memory }),
    settingsBlock,
  )
}