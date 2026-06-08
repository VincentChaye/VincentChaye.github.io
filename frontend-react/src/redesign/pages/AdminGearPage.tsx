import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import type { MaterielSpec, GearCategory } from '@/types';
import { css } from '../lib/css';
import { PageFrame } from '../components/PageFrame';
import { NavBar } from '../components/NavBar';
import { SectionHeader } from '../components/primitives';
import { BackChevronIcon } from '../lib/icons';

/**
 * SWAP — Admin / Matériel (design Liquid Glass) câblé au VRAI backend.
 * Route additive `/redesign/admin/gear`. APIs : `GET /api/materiel-specs?category`,
 * `POST` / `PATCH /:id` / `DELETE /:id` (auth admin). Port de l'écran live `AdminGearPage`.
 * i18n en dur (FR), comme le reste du redesign.
 */

const CAT_LABEL: Record<GearCategory, string> = {
  rope: 'Corde',
  quickdraw: 'Dégaine',
  belay_auto: 'Assureur auto',
  belay_tube: 'Assureur tube',
  harness: 'Baudrier',
  shoes: 'Chaussons',
  carabiner: 'Mousqueton',
  machard: 'Machard',
  crashpad: 'Crashpad',
  quicklink: 'Maillon rapide',
};
const CATEGORIES = Object.keys(CAT_LABEL) as GearCategory[];

const EMPTY = {
  category: '' as GearCategory | '',
  brand: '',
  model: '',
  description: '',
  imageUrl: '',
  uiaaLifetimeYears: '',
  epiTracked: true,
};

const INPUT = 'width:100%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:11px 13px;color:#f0ece6;font-size:14px;outline:none;font-family:inherit';
const LABEL = 'display:block;font-size:12px;font-weight:600;color:rgba(240,236,230,.55);margin-bottom:6px';
const CHIP = 'padding:6px 13px;border-radius:9999px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap';

export function AdminGearPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin } = useAuthStore();
  const [specs, setSpecs] = useState<MaterielSpec[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<GearCategory | ''>('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MaterielSpec | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const params = filter ? `?category=${filter}` : '';
      const data = await apiFetch<{ items: MaterielSpec[]; total: number }>(`/api/materiel-specs${params}`);
      setSpecs(data?.items ?? []);
      setTotal(data?.total ?? 0);
    } catch { /* silencieux */ } finally { setLoading(false); }
  }
  useEffect(() => { if (isAdmin) load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [isAdmin, filter]);

  function openCreate() { setEditing(null); setForm(EMPTY); setShowForm(true); }
  function openEdit(s: MaterielSpec) {
    setEditing(s);
    setForm({
      category: s.category,
      brand: s.brand,
      model: s.model,
      description: s.description ?? '',
      imageUrl: s.imageUrl ?? '',
      uiaaLifetimeYears: s.uiaaLifetimeYears != null ? String(s.uiaaLifetimeYears) : '',
      epiTracked: s.epiTracked,
    });
    setShowForm(true);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!form.category || !form.brand.trim() || !form.model.trim()) { toast.error('Catégorie, marque et modèle sont requis.'); return; }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        category: form.category,
        brand: form.brand.trim(),
        model: form.model.trim(),
        description: form.description.trim() || null,
        imageUrl: form.imageUrl.trim() || null,
        uiaaLifetimeYears: form.uiaaLifetimeYears ? parseInt(form.uiaaLifetimeYears, 10) : null,
        epiTracked: form.epiTracked,
      };
      if (editing) {
        await apiFetch(`/api/materiel-specs/${editing._id}`, { method: 'PATCH', auth: true, body: JSON.stringify(body) });
        toast.success('Matériel mis à jour.');
      } else {
        await apiFetch('/api/materiel-specs', { method: 'POST', auth: true, body: JSON.stringify(body) });
        toast.success('Matériel ajouté.');
      }
      setShowForm(false);
      load();
    } catch { toast.error('Erreur, réessaie.'); } finally { setSaving(false); }
  }

  async function remove(s: MaterielSpec) {
    if (!confirm(`Supprimer ${s.brand} ${s.model} ?`)) return;
    try {
      await apiFetch(`/api/materiel-specs/${s._id}`, { method: 'DELETE', auth: true });
      toast.success('Matériel supprimé.');
      load();
    } catch (err: unknown) {
      const count = (err as { body?: { count?: number } })?.body?.count;
      toast.error(count != null ? `Utilisé par ${count} équipement(s), suppression impossible.` : 'Erreur, réessaie.');
    }
  }

  const Nav = (
    <NavBar>
      <div className="nbi">
        <div className="back-btn" onClick={() => navigate('/redesign/admin')}><BackChevronIcon width={9} height={15} /> Admin</div>
        <span className="nt">Matériel</span>
        {isAdmin ? (
          <div onClick={openCreate} style={css('padding:7px 13px;border-radius:9999px;background:linear-gradient(145deg,rgba(212,160,48,.88),rgba(232,184,75,.94));color:#1a0f05;font-weight:700;font-size:13px;cursor:pointer')}>+ Ajouter</div>
        ) : <div style={css('width:54px')} />}
      </div>
    </NavBar>
  );

  if (!isAuthenticated || !isAdmin) {
    return (
      <PageFrame>
        {Nav}
        <div style={css('padding:60px 28px;text-align:center;color:rgba(240,236,230,.6);font-size:15px')}>Accès réservé aux administrateurs.</div>
      </PageFrame>
    );
  }

  return (
    <PageFrame>
      {Nav}

      {/* Filtres catégorie */}
      <div style={css('display:flex;gap:8px;overflow-x:auto;padding:6px 20px 2px;scrollbar-width:none')}>
        <div onClick={() => setFilter('')} style={css(`${CHIP};flex-shrink:0;${filter === '' ? 'background:linear-gradient(145deg,rgba(212,160,48,.88),rgba(232,184,75,.94));color:#1a0f05' : 'background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:rgba(240,236,230,.7)'}`)}>Tous ({total})</div>
        {CATEGORIES.map((c) => (
          <div key={c} onClick={() => setFilter(c)} style={css(`${CHIP};flex-shrink:0;${filter === c ? 'background:linear-gradient(145deg,rgba(212,160,48,.88),rgba(232,184,75,.94));color:#1a0f05' : 'background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:rgba(240,236,230,.7)'}`)}>{CAT_LABEL[c]}</div>
        ))}
      </div>

      <SectionHeader small>{loading ? 'Chargement…' : `${specs.length} référence${specs.length > 1 ? 's' : ''}`}</SectionHeader>

      <div style={css('padding:0 20px 24px;display:flex;flex-direction:column;gap:10px')}>
        {loading ? (
          <div className="g" style={css('border-radius:20px;padding:16px;text-align:center;color:rgba(240,236,230,.45);font-size:13px')}>Chargement…</div>
        ) : specs.length === 0 ? (
          <div className="g" style={css('border-radius:20px;padding:16px;text-align:center;color:rgba(240,236,230,.45);font-size:13px')}>Aucune référence.</div>
        ) : specs.map((s) => (
          <div key={s._id} className="g" style={css('border-radius:18px;padding:14px 16px')}>
            <div style={css('position:relative;z-index:2;display:flex;align-items:flex-start;gap:12px')}>
              {s.imageUrl
                ? <img src={s.imageUrl} alt={s.model} style={css('width:44px;height:44px;border-radius:12px;object-fit:cover;flex-shrink:0;border:1px solid rgba(255,255,255,.1)')} />
                : <div style={css('width:44px;height:44px;border-radius:12px;flex-shrink:0;background:rgba(212,160,48,.12);border:1px solid rgba(212,160,48,.2)')} />}
              <div style={css('flex:1;min-width:0')}>
                <div style={css('font-size:15px;font-weight:700;color:#f0ece6;margin-bottom:3px')}>{s.brand} {s.model}</div>
                <div style={css('font-size:12px;color:rgba(240,236,230,.45);display:flex;gap:8px;flex-wrap:wrap')}>
                  <span>{CAT_LABEL[s.category] ?? s.category}</span>
                  {s.uiaaLifetimeYears != null && <span>· {s.uiaaLifetimeYears} ans</span>}
                  {!s.epiTracked && <span>· non-EPI</span>}
                </div>
                {s.description && <div style={css('font-size:12px;color:rgba(240,236,230,.5);margin-top:5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap')}>{s.description}</div>}
              </div>
              <div style={css('display:flex;gap:6px;flex-shrink:0')}>
                <div onClick={() => openEdit(s)} style={css(`${CHIP};background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);color:rgba(240,236,230,.75)`)}>Éditer</div>
                <div onClick={() => remove(s)} style={css(`${CHIP};background:rgba(200,80,80,.12);border:1px solid rgba(200,80,80,.22);color:#E88080`)}>Suppr.</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Formulaire (création / édition) */}
      {showForm && (
        <div onClick={() => setShowForm(false)} className="lg-fade" style={css('position:absolute;inset:0;z-index:400;background:rgba(8,5,3,.80);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:flex;flex-direction:column;justify-content:flex-end;padding:40px 14px 14px')}>
          <div onClick={(e) => e.stopPropagation()} className="g lg-item-in" style={css('border-radius:22px;overflow:hidden;display:flex;flex-direction:column;max-height:100%')}>
            <div style={css('position:relative;z-index:2;display:flex;flex-direction:column;min-height:0')}>
              <div style={css('display:flex;align-items:center;gap:10px;padding:15px 18px;border-bottom:1px solid rgba(255,255,255,.07)')}>
                <span style={css('font-size:16px;font-weight:700;color:#f0ece6;flex:1')}>{editing ? 'Modifier le matériel' : 'Nouveau matériel'}</span>
                <div onClick={() => setShowForm(false)} style={css('font-size:14px;color:#D4A030;font-weight:600;cursor:pointer')}>Fermer</div>
              </div>
              <form onSubmit={submit} style={css('display:flex;flex-direction:column;min-height:0')}>
                <div style={css('padding:16px 18px;overflow-y:auto;display:flex;flex-direction:column;gap:14px')}>
                  <div>
                    <label style={css(LABEL)}>Catégorie *</label>
                    <select required value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as GearCategory }))} style={css(`${INPUT};cursor:pointer`)}>
                      <option value="">Choisir…</option>
                      {CATEGORIES.map((c) => <option key={c} value={c}>{CAT_LABEL[c]}</option>)}
                    </select>
                  </div>
                  <div style={css('display:flex;gap:12px')}>
                    <div style={css('flex:1')}>
                      <label style={css(LABEL)}>Marque *</label>
                      <input required value={form.brand} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))} style={css(INPUT)} />
                    </div>
                    <div style={css('flex:1')}>
                      <label style={css(LABEL)}>Modèle *</label>
                      <input required value={form.model} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} style={css(INPUT)} />
                    </div>
                  </div>
                  <div>
                    <label style={css(LABEL)}>Description</label>
                    <textarea rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} style={css(`${INPUT};resize:none`)} />
                  </div>
                  <div>
                    <label style={css(LABEL)}>URL de l'image</label>
                    <input type="url" value={form.imageUrl} onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))} style={css(INPUT)} />
                  </div>
                  <div style={css('display:flex;gap:14px;align-items:flex-end')}>
                    <div style={css('flex:1')}>
                      <label style={css(LABEL)}>Durée de vie (ans)</label>
                      <input type="number" min={1} max={100} value={form.uiaaLifetimeYears} onChange={(e) => setForm((f) => ({ ...f, uiaaLifetimeYears: e.target.value }))} style={css(INPUT)} />
                    </div>
                    <label style={css('flex:1;display:flex;align-items:center;gap:8px;padding-bottom:11px;cursor:pointer;font-size:13px;color:rgba(240,236,230,.7)')}>
                      <input type="checkbox" checked={form.epiTracked} onChange={(e) => setForm((f) => ({ ...f, epiTracked: e.target.checked }))} style={css('width:16px;height:16px;accent-color:#D4A030;cursor:pointer')} />
                      Suivi EPI
                    </label>
                  </div>
                </div>
                <div style={css('display:flex;gap:10px;padding:14px 18px;border-top:1px solid rgba(255,255,255,.07)')}>
                  <div onClick={() => setShowForm(false)} style={css('flex:1;padding:12px;border-radius:12px;text-align:center;font-size:14px;font-weight:600;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);color:rgba(240,236,230,.75);cursor:pointer')}>Annuler</div>
                  <button type="submit" disabled={saving} style={css(`flex:1;padding:12px;border-radius:12px;text-align:center;font-size:14px;font-weight:700;border:none;background:linear-gradient(145deg,rgba(212,160,48,.92),rgba(232,184,75,.96));color:#1a0f05;cursor:pointer;font-family:inherit${saving ? ';opacity:.6' : ''}`)}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </PageFrame>
  );
}
