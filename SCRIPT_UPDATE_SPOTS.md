# Script de mise à jour des données des spots

## Contexte

Les données des spots d'escalade dans la base de données peuvent avoir des champs vides pour :
- `orientation` : l'exposition de la falaise (N, S, E, W, etc.)
- `niveau_min` : la cotation minimale
- `niveau_max` : la cotation maximale

Ces informations sont parfois disponibles sur les pages ClimbingAway.fr mais pas dans notre base de données.

## Solution

Un script automatique a été créé : `/workspace/backend/scripts/update-spot-data.js`

### Ce que fait le script

1. **Normalisation** : Déplace `info_complementaires.orientation` vers `orientation` à la racine
2. **Extraction web** : Scrape les pages ClimbingAway pour récupérer les données manquantes
3. **Mise à jour intelligente** : Ne remplace jamais les données existantes

### Exemple de transformation

**Avant :**
```json
{
  "niveau_min": "",
  "niveau_max": "",
  "orientation": "",
  "info_complementaires": {
    "orientation": "SE"
  }
}
```

**Après :**
```json
{
  "niveau_min": "6a",
  "niveau_max": "7c",
  "orientation": "SE",
  "info_complementaires": {
    "orientation": "SE"
  }
}
```

## Installation

```bash
cd backend
npm install
```

## Utilisation

### Exécution simple
```bash
npm run update-spots
```

### Avec configuration personnalisée
```bash
MONGODB_URI=mongodb://votre-uri DB_NAME=grimpe npm run update-spots
```

### Variables d'environnement

| Variable | Défaut | Description |
|----------|--------|-------------|
| `MONGODB_URI` | `mongodb://localhost:27017` | URI de connexion MongoDB |
| `DB_NAME` | `grimpe` | Nom de la base de données |

## Limitations et sécurité

- ⏱️ **Rate limiting** : 1 seconde entre chaque requête
- 📊 **Limite** : 50 spots maximum par exécution
- 🔒 **Protection** : Ne remplace pas les données existantes
- ⚠️ **Dépendance** : Structure HTML de ClimbingAway (peut changer)

## Fréquence recommandée

- **Nouveaux spots** : Après l'import de nouveaux spots
- **Maintenance** : 1 fois par mois pour les mises à jour
- **Debug** : À la demande pour des spots spécifiques

## Vérification des résultats

Après exécution, vérifier dans MongoDB :

```javascript
// Spots avec orientation normalisée
db.climbing_spot.countDocuments({ orientation: { $ne: null, $ne: '' } })

// Spots avec niveaux
db.climbing_spot.countDocuments({ 
  niveau_min: { $ne: null, $ne: '' },
  niveau_max: { $ne: null, $ne: '' }
})
```

## Logs

Le script affiche :
- ✅ Nombre de spots normalisés
- ✅ Nombre de spots mis à jour avec succès
- ❌ Nombre d'échecs
- 📝 Détails pour chaque spot traité

## Exemple de sortie

```
=== Mise à jour des données des spots ===

Connecté à MongoDB

1. Normalisation des orientations...
Trouvé 15 spots avec orientation à normaliser
✓ École d'Escalade de Pont Julien: orientation normalisée -> SE

2. Recherche des spots à compléter...
Trouvé 42 spots à compléter depuis ClimbingAway

Traitement: École d'Escalade de Pont Julien
Fetching: https://climbingaway.fr/fr/site-escalade/pont-julien
Données extraites: { orientation: 'SE', niveau_min: '4', niveau_max: '7c' }
✓ Mis à jour: { niveau_min: '4', niveau_max: '7c' }

=== Résumé ===
Spots normalisés: 15
Spots mis à jour: 38
Échecs: 4

Connexion fermée
```

## Problèmes courants

### Le script ne trouve pas de données

- Vérifier que l'URL ClimbingAway est correcte et accessible
- La structure HTML du site peut avoir changé
- Ajouter des logs pour déboguer l'extraction

### Échec de connexion MongoDB

- Vérifier que MongoDB est démarré
- Vérifier l'URI de connexion
- Vérifier les permissions d'accès à la base

### Données incorrectes extraites

- Vérifier manuellement la page web
- Ajuster les sélecteurs CSS/regex dans le script
- Tester avec un seul spot d'abord

## Amélirations futures

- [ ] Support d'autres sources (camptocamp, ffme, etc.)
- [ ] Mode interactif pour valider les données avant mise à jour
- [ ] Export des changements en CSV
- [ ] Notification par email en cas d'erreur
- [ ] API pour déclencher le script à distance
