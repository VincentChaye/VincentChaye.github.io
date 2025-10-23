# Guide rapide - Mise à jour des données des spots

## 🎯 Objectif

Compléter automatiquement les champs `orientation`, `niveau_min` et `niveau_max` des spots d'escalade en extrayant les données depuis ClimbingAway.fr.

## 📦 Installation rapide

```bash
cd backend
npm install
```

## 🚀 Utilisation

### 1. Tester l'extraction (recommandé en premier)

```bash
npm run test-extraction
```

Ce script teste l'extraction sur l'exemple "École d'Escalade de Pont Julien" et affiche :
- ✅ Les données extraites
- 🔧 La structure HTML de la page
- 📊 Un diagnostic complet

### 2. Mettre à jour les spots

```bash
npm run update-spots
```

Le script va :
1. Normaliser les orientations existantes
2. Extraire les données manquantes depuis ClimbingAway
3. Mettre à jour la base de données

**Attention** : Maximum 50 spots par exécution (protection contre la surcharge).

## 📊 Exemple de données transformées

### Avant l'exécution

```json
{
  "_id": "68f1f105051762ba8bd2d1e8",
  "name": "École d'Escalade de Pont Julien",
  "url": "https://climbingaway.fr/fr/site-escalade/pont-julien",
  "niveau_min": "",
  "niveau_max": "",
  "orientation": "",
  "info_complementaires": {
    "orientation": ""
  }
}
```

### Après l'exécution

```json
{
  "_id": "68f1f105051762ba8bd2d1e8",
  "name": "École d'Escalade de Pont Julien",
  "url": "https://climbingaway.fr/fr/site-escalade/pont-julien",
  "niveau_min": "4",
  "niveau_max": "7c",
  "orientation": "SE",
  "info_complementaires": {
    "orientation": "SE"
  }
}
```

## 🔍 Vérification des résultats

### Via MongoDB Shell

```javascript
// Connexion
use grimpe

// Voir les spots mis à jour
db.climbing_spot.find({ 
  url: /climbingaway/,
  orientation: { $ne: null, $ne: '' }
}).pretty()

// Compter les spots avec orientation
db.climbing_spot.countDocuments({ 
  orientation: { $ne: null, $ne: '' } 
})

// Compter les spots avec niveaux
db.climbing_spot.countDocuments({ 
  niveau_min: { $ne: null, $ne: '' },
  niveau_max: { $ne: null, $ne: '' }
})
```

### Via l'application web

1. Ouvrir la carte : http://localhost:3000/map.html
2. Cliquer sur un spot
3. Vérifier que l'orientation et les niveaux s'affichent dans la fiche

## ⚙️ Configuration avancée

### Variables d'environnement

Créer un fichier `.env` dans `/backend` :

```bash
MONGODB_URI=mongodb://localhost:27017
DB_NAME=grimpe
```

Ou passer directement en ligne de commande :

```bash
MONGODB_URI=mongodb://votre-uri npm run update-spots
```

## 🐛 Problèmes courants

### "cheerio is not defined"

```bash
cd backend
npm install cheerio
```

### "Cannot connect to MongoDB"

Vérifier que MongoDB est démarré :

```bash
# Linux/Mac
sudo systemctl status mongod

# Ou avec Docker
docker ps | grep mongo
```

### "Aucune donnée extraite"

Lancer le test d'extraction pour diagnostiquer :

```bash
npm run test-extraction
```

Si la structure HTML a changé, ajuster les sélecteurs dans `scripts/update-spot-data.js`.

## 📈 Workflow recommandé

1. **Premier test** : `npm run test-extraction`
   - Vérifier que l'extraction fonctionne
   - Comprendre la structure des données

2. **Exécution limitée** : Modifier le script pour traiter 5-10 spots d'abord
   ```javascript
   // Dans update-spot-data.js, ligne ~81
   .limit(5) // Au lieu de 50
   ```

3. **Vérification** : Contrôler les résultats dans MongoDB

4. **Exécution complète** : `npm run update-spots`

5. **Re-exécution** : Répéter jusqu'à ce que tous les spots soient traités

## 🎯 Résultat attendu

Après exécution complète, vous devriez voir dans les logs :

```
=== Mise à jour des données des spots ===

Connecté à MongoDB

1. Normalisation des orientations...
Trouvé X spots avec orientation à normaliser
✓ Spot 1: orientation normalisée -> SE
✓ Spot 2: orientation normalisée -> S
...

2. Recherche des spots à compléter...
Trouvé Y spots à compléter depuis ClimbingAway

Traitement: École d'Escalade de Pont Julien
Fetching: https://climbingaway.fr/fr/site-escalade/pont-julien
Données extraites: { orientation: 'SE', niveau_min: '4', niveau_max: '7c' }
✓ Mis à jour: { niveau_min: '4', niveau_max: '7c', orientation: 'SE' }

=== Résumé ===
Spots normalisés: X
Spots mis à jour: Y
Échecs: Z

Connexion fermée
```

## 📝 Notes importantes

- ✅ Les données existantes ne sont **jamais écrasées**
- ✅ Pause de **1 seconde** entre chaque requête (respect du serveur)
- ✅ Limite de **50 spots** par exécution (sécurité)
- ✅ Les erreurs sont **logguées** mais n'arrêtent pas le script

## 🚀 Prochaines étapes

Après avoir mis à jour les spots :

1. Vérifier l'affichage sur la carte
2. Tester les filtres par orientation
3. Vérifier les recommandations de spots (qui utilisent l'orientation)
4. Améliorer les sélecteurs si nécessaire

## 📚 Ressources

- Documentation complète : `/workspace/SCRIPT_UPDATE_SPOTS.md`
- README du script : `/workspace/backend/scripts/README.md`
- Code source : `/workspace/backend/scripts/update-spot-data.js`
