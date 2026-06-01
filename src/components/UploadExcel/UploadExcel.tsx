import { useRef, useState, type DragEvent } from "react";
import { parseExcel } from "@/lib/excel";
import { useSchedule } from "@/lib/schedule-store";
import { useI18n } from "@/lib/i18n";
import s from "./UploadExcel.module.css";

export function UploadExcel() {
  const { t } = useI18n();
  const { bulkAdd } = useSchedule();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [active, setActive] = useState(false);

  const handleFile = async (file: File | null | undefined) => {
    if (!file) return;
    setBusy(true);
    setMsg(null);
    try {
      const items = await parseExcel(file);
      bulkAdd(items);
      setMsg({ kind: "ok", text: t("schedule.uploaded") + items.length });
    } catch {
      setMsg({ kind: "err", text: t("schedule.uploadError") });
    } finally {
      setBusy(false);
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setActive(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  return (
    <div>
      <div className={s.wrap}>
        <div
          className={`${s.dropZone} ${active ? s.dropZoneActive : ""}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setActive(true); }}
          onDragLeave={() => setActive(false)}
          onDrop={onDrop}
        >
          {t("schedule.uploadHelp")}
        </div>
        <button className={s.btn} disabled={busy} onClick={() => inputRef.current?.click()}>
          {busy ? "..." : t("schedule.upload")}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className={s.hidden}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
      {msg && <div className={`${s.msg} ${msg.kind === "ok" ? s.msgOk : s.msgErr}`}>{msg.text}</div>}
    </div>
  );
}