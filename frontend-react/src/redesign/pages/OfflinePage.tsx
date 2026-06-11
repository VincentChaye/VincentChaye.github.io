import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { css } from '../lib/css';
import { PageFrame } from '../components/PageFrame';
import { NavBar } from '../components/NavBar';
import { GlassCard, SectionHeader } from '../components/primitives';
import { BackChevronIcon } from '../lib/icons';
import { listPacks, deletePack, storageEstimate } from '@/offline/packs';
import type { OfflinePack } from '@/offline/db';
import type { QueuedMutation } from '@/offline/db';
import { listMutations, deleteMutation, flush } from '@/offline/queue';
import { useOfflineStore } from '@/offline/offline.store';
import { formatBytes } from '@/lib/format';

/**
 * Page de gestion des zones hors-ligne (packs téléchargés) + file de synchro.
 * Sous-page sans onglet tab — motif identique à GearPage.
 * Route `/redesign/offline`.
 */

/** Badge de statut du pack */
function StatusBadge({ status }: { status: OfflinePack['status'] }) {
  const styles: Record<OfflinePack['status'], { label: string; style: string }> = {
    ready: { label: 'Prêt', style: 'background:rgba(80,160,80,.18);border:1px solid rgba(80,160,80,.3);color:#88D880' },
    partial: { label: 'Partiel', style: 'background:rgba(212,140,48,.18);border:1px solid rgba(212,140,48,.3);color:#D4A030' },
    error: { label: 'Erreur', style: 'background:rgba(200,80,80,.18);border:1px solid rgba(200,80,80,.3);color:#E88080' },
    downloading: { label: 'En cours…', style: 'background:rgba(136,187,238,.18);border:1px solid rgba(136,187,238,.3);color:#88BBEE' },
  };
  const { label, style } = styles[status];
  return (
    <span style={css(`border-radius:8px;padding:3px 9px;font-size:11px;font-weight:700;${style}`)}>
      {label}
    </span>
  );
}

/** Badge de statut d'une mutation en file */
function MutationBadge({ status }: { status: QueuedMutation['status'] }) {
  if (status === 'pending' || status === 'syncing') {
    return (
      <span style={css('border-radius:8px;padding:3px 9px;font-size:11px;font-weight:700;background:rgba(136,187,238,.18);border:1px solid rgba(136,187,238,.3);color:#88BBEE')}>
        En attente
      </span>
    );
  }
  return (
    <span style={css('border-radius:8px;padding:3px 9px;font-size:11px;font-weight:700;background:rgba(200,80,80,.18);border:1px solid rgba(200,80,80,.3);color:#E88080')}>
      Échec
    </span>
  );
}

/** Libellé lisible d'une mutation */
function mutationLabel(m: QueuedMutation): string {
  // I6 : le body peut être une string JSON (nouveau format) ou un objet (rétro-compat)
  let body: Record<string, unknown> = {};
  try {
    body = (typeof m.body === 'string' ? JSON.parse(m.body) : m.body) as Record<string, unknown>;
  } catch { /* corps non parsable → body reste {} */ }
  if (m.kind === 'spot') {
    const name = typeof body.name === 'string' && body.name ? body.name : 'Sans nom';
    return `Proposition de spot — ${name}`;
  }
  // logbook
  const date = typeof body.date === 'string' ? body.date : '';
  return `Ascension${date ? ` du ${date}` : ''}`;
}

export function OfflinePage() {
  const navigate = useNavigate();
  const [packs, setPacks] = useState<OfflinePack[]>([]);
  const [storage, setStorage] = useState<{ usage: number; quota: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  /* File de synchro */
  const [mutations, setMutations] = useState<QueuedMutation[]>([]);
  const [syncing, setSyncing] = useState(false);
  const pendingMutations = useOfflineStore((s) => s.pendingMutations);
  const authRequired = useOfflineStore((s) => s.authRequired);

  const refresh = useCallback(async () => {
    const [p, s, m] = await Promise.all([listPacks(), storageEstimate(), listMutations()]);
    setPacks(p);
    setStorage(s);
    setMutations(m);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleDelete = async (pack: OfflinePack) => {
    if (!window.confirm(`Supprimer la zone « ${pack.name} » ?`)) return;
    setDeletingId(pack.id);
    try {
      await deletePack(pack.id);
      await refresh();
    } catch {
      alert('Erreur lors de la suppression.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteMutation = async (id: string) => {
    await deleteMutation(id);
    await refresh();
  };

  const handleFlush = async () => {
    setSyncing(true);
    try {
      await flush();
    } finally {
      setSyncing(false);
      await refresh();
    }
  };

  /* Pourcentage stockage utilisé */
  const storagePercent = storage && storage.quota > 0
    ? Math.min(100, Math.round((storage.usage / storage.quota) * 100))
    : null;

  const hasPendingMutations = mutations.some((m) => m.status === 'pending');

  return (
    <PageFrame>
      <NavBar>
        <div className="nbi">
          <div className="back-btn" onClick={() => navigate(-1)}>
            <BackChevronIcon width={9} height={15} /> Retour
          </div>
          <span className="nt" style={css('position:absolute;left:50%;transform:translateX(-50%)')}>Mode hors ligne</span>
        </div>
      </NavBar>

      <div style={css('padding:0 20px')}>

        {/* Section Stockage */}
        <SectionHeader small>Stockage</SectionHeader>
        <GlassCard style={css('border-radius:20px;padding:18px;margin-bottom:8px')}>
          {storage ? (
            <div style={css('position:relative;z-index:2')}>
              <div style={css('display:flex;justify-content:space-between;align-items:center;margin-bottom:10px')}>
                <span style={css('font-size:14px;font-weight:600;color:#f0ece6')}>Espace utilisé</span>
                <span style={css('font-size:13px;color:rgba(240,236,230,.6)')}>
                  {formatBytes(storage.usage)} / {formatBytes(storage.quota)}
                </span>
              </div>
              <div style={css('height:6px;border-radius:3px;background:rgba(255,255,255,.1);overflow:hidden')}>
                <div style={css(`height:100%;border-radius:3px;background:linear-gradient(90deg,#D4A030,#E8B847);width:${storagePercent ?? 0}%;transition:width .4s`)} />
              </div>
              {storagePercent !== null && (
                <div style={css('font-size:11px;color:rgba(240,236,230,.45);margin-top:6px;text-align:right')}>
                  {storagePercent} % utilisé
                </div>
              )}
            </div>
          ) : (
            <div style={css('position:relative;z-index:2;font-size:13px;color:rgba(240,236,230,.5)')}>
              Estimation non disponible sur ce navigateur.
            </div>
          )}
        </GlassCard>

        {/* Section Zones téléchargées */}
        <SectionHeader small>Zones téléchargées</SectionHeader>

        {loading ? (
          <div style={css('min-height:120px;display:flex;align-items:center;justify-content:center;color:rgba(240,236,230,.45);font-size:14px')}>
            Chargement…
          </div>
        ) : packs.length === 0 ? (
          <GlassCard style={css('border-radius:16px;padding:18px;font-size:13px;color:rgba(240,236,230,.55);text-align:center;line-height:1.5')}>
            Aucune zone téléchargée. Va sur la fiche d'un spot et touche ⤓ pour télécharger sa zone.
          </GlassCard>
        ) : (
          <div style={css('display:flex;flex-direction:column;gap:10px;margin-bottom:8px')}>
            {packs.map((pack) => (
              <GlassCard key={pack.id} style={css('border-radius:18px;padding:16px 18px')}>
                <div style={css('position:relative;z-index:2')}>
                  {/* En-tête : nom + badge */}
                  <div style={css('display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:8px')}>
                    <div style={css('font-size:15px;font-weight:700;color:#f0ece6;flex:1')}>{pack.name}</div>
                    <StatusBadge status={pack.status} />
                  </div>

                  {/* Métadonnées */}
                  <div style={css('display:flex;flex-wrap:wrap;gap:6px 14px;font-size:12px;color:rgba(240,236,230,.55);margin-bottom:12px')}>
                    <span>Rayon {pack.radiusKm} km</span>
                    <span>{pack.tileCount.toLocaleString('fr-FR')} tuiles</span>
                    <span>{formatBytes(pack.bytes)}</span>
                    <span>{new Date(pack.createdAt).toLocaleDateString('fr-FR')}</span>
                  </div>

                  {/* Bouton supprimer */}
                  <div
                    onClick={() => deletingId === null ? handleDelete(pack) : undefined}
                    style={css(`display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:9999px;font-size:12px;font-weight:600;cursor:${deletingId !== null ? 'default' : 'pointer'};background:rgba(200,80,80,.12);border:1px solid rgba(200,80,80,.25);color:${deletingId === pack.id ? 'rgba(232,128,128,.5)' : '#E88080'}`)}>
                    {deletingId === pack.id ? 'Suppression…' : 'Supprimer'}
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}

        {/* Section File de synchro — masquée si vide */}
        {mutations.length > 0 && (
          <>
            <SectionHeader small>
              File de synchro
              {pendingMutations > 0 && (
                <span style={css('margin-left:8px;font-size:11px;font-weight:700;padding:2px 8px;border-radius:9999px;background:rgba(212,160,48,.15);border:1px solid rgba(212,160,48,.25);color:#D4A030;vertical-align:middle')}>
                  {pendingMutations} en attente
                </span>
              )}
            </SectionHeader>

            {/* Bandeau auth requis */}
            {authRequired && (
              <div style={css('margin-bottom:12px;padding:12px 14px;border-radius:14px;background:rgba(212,140,48,.12);border:1px solid rgba(212,140,48,.28);font-size:13px;font-weight:600;color:#D4A030;display:flex;align-items:center;gap:8px')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" /></svg>
                Reconnecte-toi pour synchroniser tes données
              </div>
            )}

            {/* Liste des mutations */}
            <div style={css('display:flex;flex-direction:column;gap:10px;margin-bottom:12px')}>
              {mutations.map((m) => (
                <GlassCard key={m.id} style={css('border-radius:16px;padding:14px 16px')}>
                  <div style={css('position:relative;z-index:2')}>
                    <div style={css('display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:6px')}>
                      <div style={css('font-size:14px;font-weight:600;color:#f0ece6;flex:1;line-height:1.3')}>{mutationLabel(m)}</div>
                      <MutationBadge status={m.status} />
                    </div>
                    <div style={css('font-size:12px;color:rgba(240,236,230,.45);margin-bottom:8px')}>
                      Ajouté le {new Date(m.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      {m.attempts > 0 && ` · ${m.attempts} tentative${m.attempts > 1 ? 's' : ''}`}
                    </div>
                    {m.status === 'error' && m.error && (
                      <div style={css('font-size:12px;color:#E88080;margin-bottom:8px;padding:6px 10px;border-radius:8px;background:rgba(200,80,80,.10)')}>
                        {m.error}
                      </div>
                    )}
                    <div
                      onClick={() => handleDeleteMutation(m.id)}
                      style={css('display:inline-flex;align-items:center;gap:5px;padding:6px 12px;border-radius:9999px;font-size:12px;font-weight:600;cursor:pointer;background:rgba(200,80,80,.10);border:1px solid rgba(200,80,80,.20);color:#E88080')}>
                      Supprimer
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>

            {/* Bouton « Synchroniser maintenant » */}
            {hasPendingMutations && (
              <div
                onClick={syncing ? undefined : handleFlush}
                style={css(`padding:14px;border-radius:12px;font-weight:700;font-size:15px;text-align:center;box-sizing:border-box;margin-bottom:8px;${syncing ? 'background:rgba(255,255,255,.06);color:rgba(240,236,230,.35);cursor:default' : 'background:linear-gradient(145deg,rgba(212,160,48,.88),rgba(232,184,75,.94));color:#1a0f05;cursor:pointer'}`)}>
                {syncing ? 'Synchronisation…' : 'Synchroniser maintenant'}
              </div>
            )}
          </>
        )}

        <div style={css('height:20px')} />
      </div>
    </PageFrame>
  );
}
