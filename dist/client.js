// dsh-memory — client half (web module-loader bundle).
// Format mirrors dsh-notify's lib/client.js: window.__ModuleLoader__.load({id, factory}),
// requires only "react" from the module table, registers a settings.section page.
// Talks to the host half through the injected `memory` Service (dsh.client.inject).
window.__ModuleLoader__.load({
  id: "dsh-memory",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    const React = require("react");
    const { useEffect, useState } = React;
    const h = React.createElement;

    // ---------- helpers ----------
    function fmtTime(ts) { if (!ts) return "无效"; return new Date(ts).toLocaleString(); }
    function fmtSources(srcs) {
      if (!Array.isArray(srcs) || !srcs.length) return "—";
      return srcs.map((s) => { if (!s) return "—"; if (s.endSeq != null && s.startSeq != null) return (s.sessionId || "?") + ":" + s.startSeq + "-" + s.endSeq; return String(s.sessionId || s.source || "—"); }).join(", ");
    }
    function objToKV(o) { o = o || {}; return Object.keys(o).map((k) => k + ": " + String(o[k])).join("\n"); }
    function kvToObj(text) { const out = {}; String(text || "").split(/\n/).forEach((line) => { line = line.trim(); if (!line) return; const i = line.indexOf(":"); if (i < 0) return; out[line.slice(0, i).trim()] = line.slice(i + 1).trim(); }); return out; }
    function listToText(a) { return (a || []).join(", "); }
    function textToList(text) { return String(text || "").split(",").map((s) => s.trim()).filter(Boolean); }

    // ---------- ProfileView ----------
    function ProfileView({ profile, memory }) {
      const [editing, setEditing] = useState(false);
      const [basicText, setBasicText] = useState(""); const [prefText, setPrefText] = useState("");
      const [personalityText, setPersonalityText] = useState(""); const [unlikesText, setUnlikesText] = useState("");
      const [focusText, setFocusText] = useState(""); const [overrideText, setOverrideText] = useState("");
      const [saveMsg, setSaveMsg] = useState(""); const [saveKind, setSaveKind] = useState("ok");
      if (!profile) return h("div", null, "（暂无画像）");
      const startEdit = () => {
        setBasicText(objToKV(profile.basicInfo)); setPrefText(objToKV(profile.preferences));
        setPersonalityText(listToText(profile.personality)); setUnlikesText(listToText(profile.unlikes));
        setFocusText(profile.currentFocus || ""); setOverrideText(objToKV(profile.override));
        setEditing(true); setSaveMsg("");
      };
      const save = async () => {
        const patch = { basicInfo: kvToObj(basicText), preferences: kvToObj(prefText), personality: textToList(personalityText), unlikes: textToList(unlikesText), currentFocus: focusText.trim(), override: kvToObj(overrideText) };
        try {
          const r = await memory.setProfile({ patch });
          if (r && r.ok) { setSaveKind("ok"); setSaveMsg("画像已保存"); setEditing(false); }
          else { setSaveKind("err"); setSaveMsg("保存失败：" + ((r && r.error) || "unknown")); }
        } catch (e) { setSaveKind("err"); setSaveMsg("保存出错：" + String(e && e.message || e)); }
      };
      const field = (title, obj) => h("div", { key: title, className: "dshm-card" },
        h("b", null, title),
        Object.keys(obj || {}).length
          ? Object.keys(obj).map((k) => h("div", { key: k, className: "dshm-row" }, h("b", null, k + "："), h("span", null, String(obj[k]))))
          : h("div", { className: "dshm-hint" }, "（暂无）"));
      const view = h("div", { className: "dshm-body" },
        h("div", { className: "dshm-hint" }, "更新于 " + fmtTime(profile.updatedAt) + " · 版本 v" + (profile.revision || 1)),
        field("基本信息", profile.basicInfo),
        h("div", { className: "dshm-card" }, h("b", null, "性格"), (profile.personality || []).length ? (profile.personality || []).join("、") : h("span", { className: "dshm-hint" }, "（暂无）")),
        field("偏好", profile.preferences),
        h("div", { className: "dshm-card" }, h("b", null, "不喜欢"), (profile.unlikes || []).length ? (profile.unlikes || []).join("、") : h("span", { className: "dshm-hint" }, "（暂无）")),
        h("div", { className: "dshm-card" }, h("b", null, "当前关注"), profile.currentFocus || h("span", { className: "dshm-hint" }, "（暂无）")),
        h("details", null, h("summary", null, "查看原始 JSON"), h("pre", { style: { whiteSpace: "pre-wrap", wordBreak: "break-all", fontSize: 11 } }, JSON.stringify(profile, null, 2))));
      const editor = h("div", { className: "dshm-body" },
        h("label", null, "基本信息（每行 键: 值）"), h("textarea", { rows: 2, value: basicText, onChange: (e) => setBasicText(e.target.value), style: { width: "100%" } }),
        h("label", null, "性格（逗号分隔）"), h("input", { value: personalityText, onChange: (e) => setPersonalityText(e.target.value), style: { width: "100%" } }),
        h("label", null, "偏好（每行 键: 值）"), h("textarea", { rows: 2, value: prefText, onChange: (e) => setPrefText(e.target.value), style: { width: "100%" } }),
        h("label", null, "不喜欢（逗号分隔）"), h("input", { value: unlikesText, onChange: (e) => setUnlikesText(e.target.value), style: { width: "100%" } }),
        h("label", null, "当前关注"), h("input", { value: focusText, onChange: (e) => setFocusText(e.target.value), style: { width: "100%" } }),
        h("label", null, "画像覆盖 override（每行 键: 值）"), h("textarea", { rows: 2, value: overrideText, onChange: (e) => setOverrideText(e.target.value), style: { width: "100%" } }),
        h("div", { className: "dshm-row" }, h("button", { onClick: save }, "保存画像"), saveMsg ? h("span", { className: saveKind === "err" ? "dshm-err" : "dshm-ok" }, saveMsg) : null));
      return h("div", { className: "dshm-card" },
        h("div", { className: "dshm-row" }, h("b", null, "用户画像"), h("button", { onClick: editing ? () => setEditing(false) : startEdit }, editing ? "取消" : "编辑")),
        editing ? editor : view);
    }

    // ---------- MemoryView ----------
    function MemoryView({ memory }) {
      const [data, setData] = useState(null);
      const [filter, setFilter] = useState("active");
      const [kw, setKw] = useState("");
      const [msg, setMsg] = useState(""); const [msgKind, setMsgKind] = useState("ok");
      const [text, setText] = useState(""); const [srcText, setSrcText] = useState("");
      const [cfgDraft, setCfgDraft] = useState(null);
      const [cfgMsg, setCfgMsg] = useState("");

      const load = () => memory.list().then((r) => { setData(r); if (r.config && !cfgDraft) setCfgDraft(JSON.parse(JSON.stringify(r.config))); }).catch(() => setData({ memories: [] }));
      useEffect(() => { load(); }, []);
      const flash = (t, k) => { setMsg(t); setMsgKind(k || "ok"); };
      const add = async () => {
        if (!text.trim()) { flash("内容不能为空", "err"); return; }
        const r = await memory.add({ content: text.trim(), source: srcText.trim() });
        if (r && r.ok) { flash("已添加记忆"); setText(""); setSrcText(""); load(); }
        else flash("添加失败：" + ((r && r.error) || "unknown"), "err");
      };
      const act = async (fn, okMsg) => { const r = await fn(); if (r && r.ok === false) flash("操作失败：" + (r.error || "unknown"), "err"); else flash(okMsg, "ok"); load(); };
      const saveCfg = async () => { const r = await memory.setConfig({ config: cfgDraft }); if (r && r.ok) { setCfgMsg("设置已保存"); load(); } else setCfgMsg("保存失败"); };

      if (!data) return h("div", null, "加载记忆…");
      const all = data.memories || [];
      const memories = all.filter((m) => { if (filter === "active") return m.status === "active"; if (filter === "pending") return m.status === "pending_review"; if (filter === "trashed") return m.status === "trashed"; return true; })
        .filter((m) => (kw ? (m.content + " " + (m.category || []).join(" ")).toLowerCase().includes(kw.toLowerCase()) : true));
      const dbg = data.debug || {};
      const activeCount = all.filter((m) => m.status === "active").length;

      const memItems = memories.map((m) => h("div", { key: m.id, className: "dshm-card" },
        h("div", { className: "dshm-row" }, [m.type, "重要度 " + (m.importance != null ? m.importance : "-"), m.status, m.pinned ? "固定" : "", m.manual ? "手动" : ""].filter(Boolean).map((x, i) => h("span", { key: i, className: "dshm-badge" }, x))),
        h("div", null, m.content),
        h("div", { className: "dshm-hint" }, "来源：" + fmtSources(m.sources)),
        h("div", { className: "dshm-row" },
          h("button", { onClick: () => act(() => memory.pin({ id: m.id, pinned: !m.pinned }), "已更新固定") }, m.pinned ? "取消固定" : "固定"),
          m.status === "trashed"
            ? h("button", { onClick: () => act(() => memory.restore(m.id), "已恢复") }, "恢复")
            : h("button", { onClick: () => act(() => memory.rm({ id: m.id }), "已删除") }, "删除"),
          m.status === "trashed" ? h("button", { onClick: () => act(() => memory.rm({ id: m.id, purge: true }), "已彻底删除") }, "彻底删除") : null)));

      const memoryBlock = h("details", { open: true },
        h("summary", null, "记忆（共 " + all.length + " 条 · active " + activeCount + " 条）"),
        h("div", { className: "dshm-body" },
          h("div", { className: "dshm-row" },
            h("select", { value: filter, onChange: (e) => setFilter(e.target.value) }, h("option", { value: "active" }, "Active"), h("option", { value: "pending" }, "待确认"), h("option", { value: "trashed" }, "回收站"), h("option", { value: "all" }, "全部")),
            h("input", { placeholder: "关键词", value: kw, onChange: (e) => setKw(e.target.value) }),
            h("button", { onClick: load }, "刷新")),
          h("div", { className: "dshm-row" },
            h("input", { placeholder: "记忆内容", value: text, onChange: (e) => setText(e.target.value), style: { flex: 1 } }),
            h("input", { placeholder: "来源（可选）", value: srcText, onChange: (e) => setSrcText(e.target.value), style: { width: 150 } }),
            h("button", { onClick: add }, "添加")),
          msg ? h("div", { className: msgKind === "err" ? "dshm-err" : "dshm-ok" }, msg) : null,
          memories.length === 0 ? h("div", { className: "dshm-hint" }, "（无匹配记忆）") : memItems));

      const settingsBlock = h("details", { style: { marginTop: 4 } },
        h("summary", null, "插件设置（自动记忆默认关闭：开启后对话片段会发送到你选择的提取模型）"),
        h("div", { className: "dshm-body" },
          h("label", null, h("input", { type: "checkbox", checked: !!(cfgDraft && cfgDraft.memory && cfgDraft.memory.enabled), onChange: (e) => { if (cfgDraft) { cfgDraft.memory.enabled = e.target.checked; setCfgDraft(Object.assign({}, cfgDraft)); } } }), " 自动抽取记忆"),
          h("label", null, h("input", { type: "checkbox", checked: !!(cfgDraft && cfgDraft.profile && cfgDraft.profile.enabled), onChange: (e) => { if (cfgDraft) { cfgDraft.profile.enabled = e.target.checked; setCfgDraft(Object.assign({}, cfgDraft)); } } }), " 生成/更新用户画像"),
          h("div", { className: "dshm-row" }, h("label", null, "每 N 条对话自动总结一次 "), h("input", { style: { width: 80 }, value: cfgDraft && cfgDraft.extract ? cfgDraft.extract.windowMessages : "", onChange: (e) => { if (cfgDraft) { cfgDraft.extract.windowMessages = Number(e.target.value) || 0; setCfgDraft(Object.assign({}, cfgDraft)); } } })),
          h("div", { className: "dshm-hint" }, "设 0 = 仅在会话结束（flush）时总结；默认 5。"),
          h("div", { className: "dshm-row" }, h("button", { onClick: saveCfg }, "保存设置"), cfgMsg ? h("span", { className: "dshm-ok" }, cfgMsg) : null)));

      return h("div", { className: "dshm-root" },
        h("h3", null, "记忆管理"),
        h("div", { className: "dshm-hint" }, "存储：" + (data.storeMode || "?") + (data.storeReady ? "" : " (未就绪)") + " · 记忆 " + (data.memCount != null ? data.memCount : all.length) + " 条 · 注入：baseline" + (dbg.baselineCalls || 0) + "/" + (dbg.baselineEmit || 0) + " · recall" + (dbg.recallCalls || 0) + "/" + (dbg.recallInjected || 0)),
        memoryBlock,
        h(ProfileView, { profile: data.profile || null, memory }),
        settingsBlock);
    }

    // ---------- apply ----------
    function apply(ctx) {
      const slots = ctx.get && ctx.get("slots");
      if (!slots) return;
      slots.inject("settings.section", () => slots.register(
        { name: "settings.section", id: "dsh-memory", order: 95, label: "记忆管理" },
        () => h(MemoryView, { memory: ctx.memory })));
    }

    exports.name = "dsh-memory";
    exports.apply = apply;
    return module.exports;
  }
});