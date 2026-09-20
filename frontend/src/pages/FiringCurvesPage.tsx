import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../api/client";

interface Segment {
  targetTempC: number;
  rateCPerHour?: number;
  holdMinutes?: number;
}

interface FiringCurve {
  id: string;
  name: string;
  controller: string;
  description: string | null;
  maxTempC: number | null;
  segments: Segment[];
  updatedAt: string;
}

interface FormState {
  name: string;
  controller: string;
  description: string;
  maxTempC: string;
  segments: Segment[];
}

const emptySegment: Segment = { targetTempC: 0, rateCPerHour: undefined, holdMinutes: undefined };

function emptyForm(): FormState {
  return { name: "", controller: "", description: "", maxTempC: "", segments: [{ ...emptySegment }] };
}

export default function FiringCurvesPage() {
  const { t } = useTranslation();
  const [curves, setCurves] = useState<FiringCurve[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<FiringCurve | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get<FiringCurve[]>("/firing-curves");
      setCurves(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm());
    setError(null);
    setShowForm(true);
  };

  const openEdit = (curve: FiringCurve) => {
    setEditing(curve);
    setForm({
      name: curve.name,
      controller: curve.controller,
      description: curve.description ?? "",
      maxTempC: curve.maxTempC?.toString() ?? "",
      segments: curve.segments.length ? curve.segments : [{ ...emptySegment }],
    });
    setError(null);
    setShowForm(true);
  };

  const updateSegment = (index: number, patch: Partial<Segment>) => {
    setForm((f) => ({
      ...f,
      segments: f.segments.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    }));
  };

  const addSegment = () => {
    setForm((f) => ({ ...f, segments: [...f.segments, { ...emptySegment }] }));
  };

  const removeSegment = (index: number) => {
    setForm((f) => ({ ...f, segments: f.segments.filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const payload = {
      name: form.name,
      controller: form.controller,
      description: form.description || null,
      maxTempC: form.maxTempC ? Number(form.maxTempC) : null,
      segments: form.segments.map((s) => ({
        targetTempC: Number(s.targetTempC),
        rateCPerHour: s.rateCPerHour ? Number(s.rateCPerHour) : undefined,
        holdMinutes: s.holdMinutes ? Number(s.holdMinutes) : undefined,
      })),
    };
    try {
      if (editing) {
        await api.put(`/firing-curves/${editing.id}`, payload);
      } else {
        await api.post("/firing-curves", payload);
      }
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.code : t("common.genericError"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("firingCurves.confirmDelete"))) return;
    await api.delete(`/firing-curves/${id}`);
    await load();
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div>
          <h1>{t("firingCurves.title")}</h1>
          <p className="muted">{t("firingCurves.subtitle")}</p>
        </div>
        <button className="btn" onClick={openNew}>
          {t("firingCurves.addNew")}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <h2>{editing ? t("firingCurves.editTitle") : t("firingCurves.newTitle")}</h2>
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>{t("firingCurves.name")}</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="field">
              <label>{t("firingCurves.controller")}</label>
              <input
                required
                value={form.controller}
                onChange={(e) => setForm({ ...form, controller: e.target.value })}
              />
            </div>
            <div className="field">
              <label>{t("firingCurves.maxTempC")}</label>
              <input
                type="number"
                value={form.maxTempC}
                onChange={(e) => setForm({ ...form, maxTempC: e.target.value })}
              />
            </div>
            <div className="field">
              <label>{t("firingCurves.description")}</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div className="field">
              <label>{t("firingCurves.segments")}</label>
              {form.segments.map((segment, index) => (
                <div className="segment-row" key={index}>
                  <input
                    type="number"
                    placeholder={t("firingCurves.segmentTarget") as string}
                    required
                    value={segment.targetTempC}
                    onChange={(e) => updateSegment(index, { targetTempC: Number(e.target.value) })}
                  />
                  <input
                    type="number"
                    placeholder={t("firingCurves.segmentRate") as string}
                    value={segment.rateCPerHour ?? ""}
                    onChange={(e) =>
                      updateSegment(index, { rateCPerHour: e.target.value ? Number(e.target.value) : undefined })
                    }
                  />
                  <input
                    type="number"
                    placeholder={t("firingCurves.segmentHold") as string}
                    value={segment.holdMinutes ?? ""}
                    onChange={(e) =>
                      updateSegment(index, { holdMinutes: e.target.value ? Number(e.target.value) : undefined })
                    }
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => removeSegment(index)}
                    disabled={form.segments.length <= 1}
                  >
                    {t("firingCurves.removeSegment")}
                  </button>
                </div>
              ))}
              <button type="button" className="btn btn-secondary" onClick={addSegment}>
                {t("firingCurves.addSegment")}
              </button>
            </div>

            {error && <p className="error-text">{error}</p>}
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button className="btn" type="submit" disabled={submitting}>
                {t("common.save")}
              </button>
              <button className="btn btn-secondary" type="button" onClick={() => setShowForm(false)}>
                {t("common.cancel")}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p>{t("common.loading")}</p>
      ) : curves.length === 0 ? (
        <p className="muted">{t("firingCurves.empty")}</p>
      ) : (
        <div className="list-grid">
          {curves.map((curve) => (
            <div className="card" key={curve.id}>
              <h3>{curve.name}</h3>
              <p className="muted">{curve.controller}</p>
              {curve.description && <p>{curve.description}</p>}
              {curve.maxTempC && (
                <p>
                  {t("firingCurves.maxTempC")}: {curve.maxTempC}°C
                </p>
              )}
              <ul>
                {curve.segments.map((s, i) => (
                  <li key={i}>
                    {s.targetTempC}°C
                    {s.rateCPerHour ? ` @ ${s.rateCPerHour}°C/h` : ""}
                    {s.holdMinutes ? `, ${t("firingCurves.segmentHold")}: ${s.holdMinutes} min` : ""}
                  </li>
                ))}
              </ul>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button className="btn btn-secondary" onClick={() => openEdit(curve)}>
                  {t("common.edit")}
                </button>
                <button className="btn btn-danger" onClick={() => handleDelete(curve.id)}>
                  {t("common.delete")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
