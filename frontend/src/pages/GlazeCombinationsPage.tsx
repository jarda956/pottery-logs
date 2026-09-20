import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../api/client";

interface GlazeLayer {
  name: string;
  manufacturer?: string | null;
  layers?: number;
  notes?: string | null;
}

interface GlazeCombination {
  id: string;
  name: string;
  clayBody: string | null;
  firingTempC: number | null;
  firingCone: string | null;
  glazes: GlazeLayer[];
  result: string | null;
  updatedAt: string;
}

interface FormState {
  name: string;
  clayBody: string;
  firingTempC: string;
  firingCone: string;
  result: string;
  glazes: GlazeLayer[];
}

const emptyLayer: GlazeLayer = { name: "", manufacturer: "", layers: 1, notes: "" };

function emptyForm(): FormState {
  return { name: "", clayBody: "", firingTempC: "", firingCone: "", result: "", glazes: [{ ...emptyLayer }] };
}

export default function GlazeCombinationsPage() {
  const { t } = useTranslation();
  const [combos, setCombos] = useState<GlazeCombination[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<GlazeCombination | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get<GlazeCombination[]>("/glaze-combinations");
      setCombos(data);
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

  const openEdit = (combo: GlazeCombination) => {
    setEditing(combo);
    setForm({
      name: combo.name,
      clayBody: combo.clayBody ?? "",
      firingTempC: combo.firingTempC?.toString() ?? "",
      firingCone: combo.firingCone ?? "",
      result: combo.result ?? "",
      glazes: combo.glazes.length ? combo.glazes : [{ ...emptyLayer }],
    });
    setError(null);
    setShowForm(true);
  };

  const updateLayer = (index: number, patch: Partial<GlazeLayer>) => {
    setForm((f) => ({
      ...f,
      glazes: f.glazes.map((g, i) => (i === index ? { ...g, ...patch } : g)),
    }));
  };

  const addLayer = () => setForm((f) => ({ ...f, glazes: [...f.glazes, { ...emptyLayer }] }));
  const removeLayer = (index: number) =>
    setForm((f) => ({ ...f, glazes: f.glazes.filter((_, i) => i !== index) }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const payload = {
      name: form.name,
      clayBody: form.clayBody || null,
      firingTempC: form.firingTempC ? Number(form.firingTempC) : null,
      firingCone: form.firingCone || null,
      result: form.result || null,
      glazes: form.glazes.map((g) => ({
        name: g.name,
        manufacturer: g.manufacturer || null,
        layers: g.layers ? Number(g.layers) : undefined,
        notes: g.notes || null,
      })),
    };
    try {
      if (editing) {
        await api.put(`/glaze-combinations/${editing.id}`, payload);
      } else {
        await api.post("/glaze-combinations", payload);
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
    if (!confirm(t("glazeCombinations.confirmDelete"))) return;
    await api.delete(`/glaze-combinations/${id}`);
    await load();
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div>
          <h1>{t("glazeCombinations.title")}</h1>
          <p className="muted">{t("glazeCombinations.subtitle")}</p>
        </div>
        <button className="btn" onClick={openNew}>
          {t("glazeCombinations.addNew")}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <h2>{editing ? t("glazeCombinations.editTitle") : t("glazeCombinations.newTitle")}</h2>
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>{t("glazeCombinations.name")}</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="field">
              <label>{t("glazeCombinations.clayBody")}</label>
              <input value={form.clayBody} onChange={(e) => setForm({ ...form, clayBody: e.target.value })} />
            </div>
            <div className="field">
              <label>{t("glazeCombinations.firingTempC")}</label>
              <input
                type="number"
                value={form.firingTempC}
                onChange={(e) => setForm({ ...form, firingTempC: e.target.value })}
              />
            </div>
            <div className="field">
              <label>{t("glazeCombinations.firingCone")}</label>
              <input value={form.firingCone} onChange={(e) => setForm({ ...form, firingCone: e.target.value })} />
            </div>

            <div className="field">
              <label>{t("glazeCombinations.glazes")}</label>
              {form.glazes.map((layer, index) => (
                <div className="segment-row" key={index}>
                  <input
                    placeholder={t("glazeCombinations.layerName") as string}
                    required
                    value={layer.name}
                    onChange={(e) => updateLayer(index, { name: e.target.value })}
                  />
                  <input
                    placeholder={t("glazeCombinations.layerManufacturer") as string}
                    value={layer.manufacturer ?? ""}
                    onChange={(e) => updateLayer(index, { manufacturer: e.target.value })}
                  />
                  <input
                    type="number"
                    min={1}
                    placeholder={t("glazeCombinations.layerCount") as string}
                    value={layer.layers ?? 1}
                    onChange={(e) => updateLayer(index, { layers: Number(e.target.value) })}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => removeLayer(index)}
                    disabled={form.glazes.length <= 1}
                  >
                    {t("glazeCombinations.removeLayer")}
                  </button>
                </div>
              ))}
              <button type="button" className="btn btn-secondary" onClick={addLayer}>
                {t("glazeCombinations.addLayer")}
              </button>
            </div>

            <div className="field">
              <label>{t("glazeCombinations.result")}</label>
              <textarea rows={3} value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value })} />
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
      ) : combos.length === 0 ? (
        <p className="muted">{t("glazeCombinations.empty")}</p>
      ) : (
        <div className="list-grid">
          {combos.map((combo) => (
            <div className="card" key={combo.id}>
              <h3>{combo.name}</h3>
              {combo.clayBody && <p className="muted">{combo.clayBody}</p>}
              {(combo.firingTempC || combo.firingCone) && (
                <p>
                  {combo.firingTempC ? `${combo.firingTempC}°C` : ""} {combo.firingCone ?? ""}
                </p>
              )}
              <ul>
                {combo.glazes.map((g, i) => (
                  <li key={i}>
                    {g.name}
                    {g.manufacturer ? ` (${g.manufacturer})` : ""}
                    {g.layers ? ` × ${g.layers}` : ""}
                  </li>
                ))}
              </ul>
              {combo.result && <p>{combo.result}</p>}
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button className="btn btn-secondary" onClick={() => openEdit(combo)}>
                  {t("common.edit")}
                </button>
                <button className="btn btn-danger" onClick={() => handleDelete(combo.id)}>
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
