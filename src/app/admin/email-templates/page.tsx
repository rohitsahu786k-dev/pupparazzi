"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Mail, RotateCcw, Eye, Send, Save } from "lucide-react";

type TemplateSummary = { key: string; name: string; subject: string; is_active: boolean; is_customized: boolean };
type TemplateDetail = {
  key: string; name: string; subject: string; html_body: string; text_body: string;
  is_active: boolean; is_customized: boolean; variables: string[];
  defaults: { subject: string; html_body: string; text_body: string };
};

export default function EmailTemplatesPage() {
  const [list, setList] = useState<TemplateSummary[]>([]);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [detail, setDetail] = useState<TemplateDetail | null>(null);
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [text, setText] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/email-templates");
    if (res.ok) {
      const data: TemplateSummary[] = await res.json();
      setList(data);
      // Select the first template only if none is chosen yet (functional guard
      // avoids depending on activeKey, so selecting a template never re-fetches
      // the whole list).
      setActiveKey((cur) => cur || (data.length ? data[0].key : null));
    } else setError("Unable to load templates.");
    setLoading(false);
  }, []);

  const loadDetail = useCallback(async (key: string) => {
    const res = await fetch(`/api/admin/email-templates/${key}`);
    if (res.ok) {
      const d: TemplateDetail = await res.json();
      setDetail(d); setSubject(d.subject); setHtml(d.html_body); setText(d.text_body); setIsActive(d.is_active);
      setPreviewHtml(null);
    }
  }, []);

  useEffect(() => { loadList(); }, [loadList]);
  useEffect(() => { if (activeKey) loadDetail(activeKey); }, [activeKey, loadDetail]);

  function flash(m: string) { setNotice(m); setError(""); setTimeout(() => setNotice(""), 4000); }

  async function save() {
    if (!activeKey) return;
    setSaving(true); setError("");
    const res = await fetch(`/api/admin/email-templates/${activeKey}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, html_body: html, text_body: text, is_active: isActive }),
    });
    if (res.ok) { flash("Template saved."); await loadList(); await loadDetail(activeKey); }
    else setError("Could not save template.");
    setSaving(false);
  }

  async function reset() {
    if (!activeKey || !confirm("Restore this template to its default? Your customizations will be removed.")) return;
    const res = await fetch(`/api/admin/email-templates/${activeKey}/reset`, { method: "POST" });
    if (res.ok) { flash("Template reset to default."); await loadList(); await loadDetail(activeKey); }
    else setError("Could not reset template.");
  }

  async function preview() {
    if (!activeKey) return;
    setError("");
    const res = await fetch(`/api/admin/email-templates/${activeKey}/preview`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, html_body: html, text_body: text }),
    });
    if (res.ok) { const d = await res.json(); setPreviewHtml(d.html); }
    else setError("Preview failed.");
  }

  async function sendTest() {
    if (!activeKey) return;
    const to = prompt("Send a test copy of this template to which email address?");
    if (!to) return;
    const res = await fetch(`/api/admin/email-templates/${activeKey}/test`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to }),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok && d.success) flash(`Test sent to ${to}.`);
    else setError(d.message || "Test send failed.");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Email Templates</h1>
        <p className="mt-1 text-sm text-muted-foreground">Edit the reminder emails. Blank fields fall back to the built-in default; disabled templates are not sent.</p>
      </div>

      {notice && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">{notice}</div>}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700">{error}</div>}

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        {/* List */}
        <div className="rounded-lg border bg-white p-2">
          {loading ? (
            <div className="flex h-24 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : list.map((t) => (
            <button key={t.key} onClick={() => setActiveKey(t.key)}
              className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${activeKey === t.key ? "bg-primary/10 font-semibold text-primary" : "hover:bg-muted"}`}>
              <Mail className="h-3.5 w-3.5 shrink-0" />
              <span className="flex-1 truncate">{t.name}</span>
              {!t.is_active && <span className="text-[10px] text-muted-foreground">off</span>}
              {t.is_customized && t.is_active && <span className="h-1.5 w-1.5 rounded-full bg-primary" title="Customized" />}
            </button>
          ))}
        </div>

        {/* Editor */}
        {detail && (
          <div className="space-y-4 rounded-lg border bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-bold">{detail.name}</h2>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> Enabled
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">Subject</span>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">HTML body</span>
              <textarea value={html} onChange={(e) => setHtml(e.target.value)} rows={12}
                className="w-full rounded-lg border bg-white p-3 font-mono text-xs" spellCheck={false} />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">Plain-text body</span>
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5}
                className="w-full rounded-lg border bg-white p-3 font-mono text-xs" spellCheck={false} />
            </label>

            <div>
              <p className="mb-1 text-xs font-semibold text-muted-foreground">Available variables (click to copy)</p>
              <div className="flex flex-wrap gap-1.5">
                {detail.variables.map((v) => (
                  <button key={v} type="button" onClick={() => navigator.clipboard?.writeText(`{{${v}}}`)}
                    className="rounded-full border bg-muted/40 px-2 py-0.5 font-mono text-[11px] hover:bg-muted">{`{{${v}}}`}</button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={save} disabled={saving}>{saving ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-2 h-3.5 w-3.5" />}Save</Button>
              <Button size="sm" variant="outline" onClick={preview}><Eye className="mr-2 h-3.5 w-3.5" />Preview</Button>
              <Button size="sm" variant="outline" onClick={sendTest}><Send className="mr-2 h-3.5 w-3.5" />Send test</Button>
              <Button size="sm" variant="ghost" onClick={reset}><RotateCcw className="mr-2 h-3.5 w-3.5" />Restore default</Button>
            </div>

            {previewHtml !== null && (
              <div className="rounded-lg border">
                <p className="border-b bg-muted/40 px-3 py-2 text-xs font-semibold text-muted-foreground">Preview (sample data)</p>
                <iframe title="Email preview" sandbox="" srcDoc={previewHtml} className="h-[520px] w-full rounded-b-lg bg-white" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
