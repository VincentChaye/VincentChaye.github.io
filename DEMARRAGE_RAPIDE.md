# 🚀 Démarrage rapide - Mise à jour Orientation & Niveaux

## ⚡ En 3 commandes

```bash
# 1. Installation
cd /workspace/backend && npm install

# 2. Test (optionnel mais recommandé)
npm run test-extraction

# 3. Mise à jour automatique
npm run update-spots
```

## 📊 Résultat

Vos spots auront maintenant :
- ✅ **Orientation** : SE, S, NE, etc. (au lieu de "")
- ✅ **Niveau min** : 4, 6a, 7b+ (au lieu de "")
- ✅ **Niveau max** : 7c, 8a, 9a (au lieu de "")

## 🎯 Exemple

**Avant :**
```json
{
  "name": "École d'Escalade de Pont Julien",
  "niveau_min": "",
  "niveau_max": "",
  "orientation": ""
}
```

**Après :**
```json
{
  "name": "École d'Escalade de Pont Julien",
  "niveau_min": "4",
  "niveau_max": "7c",
  "orientation": "SE"
}
```

## ℹ️ Plus d'infos

- **Guide complet** : `GUIDE_RAPIDE_UPDATE_SPOTS.md`
- **Documentation technique** : `SCRIPT_UPDATE_SPOTS.md`
- **Récapitulatif** : `RECAPITULATIF_SOLUTION.md`

## 🔍 Vérification

```bash
# Dans MongoDB
mongo grimpe
db.climbing_spot.find({ orientation: { $ne: "", $ne: null } }).limit(5).pretty()
```

Ou ouvrez `map.html` et cliquez sur un spot ! 🗺️

---

**C'est tout ! 🎉**
