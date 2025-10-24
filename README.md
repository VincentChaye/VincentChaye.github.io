# 🧗‍♂️ ZoneDeGrimpe

**ZoneDeGrimpe** est une application web complète de cartographie et de gestion des sites d'escalade. Elle permet aux grimpeurs de découvrir des spots d'escalade (falaises, blocs, salles), de gérer leur matériel, et d'obtenir des conseils personnalisés.

---

## ⚡ Quick Start (Démarrage rapide)

Pour lancer rapidement le projet en local :

```bash
# 1. Cloner et installer
git clone https://github.com/vincentchaye/ZoneDeGrimpe.git
cd ZoneDeGrimpe

# 2. Installer les dépendances
cd backend && npm install
cd ../frontend && npm install

# 3. Configurer l'environnement
cd ../backend
cp .env.example .env
# Éditez .env et remplacez <VOTRE_USER> et <VOTRE_PASSWORD> par vos identifiants MongoDB

# 4. Lancer le backend (terminal 1)
npm start

# 5. Lancer le frontend (terminal 2)
cd ../frontend
npm run dev

# 6. Ouvrir http://localhost:3001 dans votre navigateur
```

> **Important** : Vous aurez besoin des identifiants MongoDB Atlas. Voir la section [Installation](#️-installation-et-configuration) pour plus de détails.

---

## 📋 Table des matières

1. [À propos du projet](#-à-propos-du-projet)
2. [Fonctionnalités principales](#-fonctionnalités-principales)
3. [Architecture technique](#-architecture-technique)
4. [Technologies utilisées](#-technologies-utilisées)
5. [Prérequis](#-prérequis)
6. [Installation et configuration](#️-installation-et-configuration)
7. [Lancement en local](#-lancement-en-local)
8. [Structure du projet](#-structure-du-projet)
9. [Base de données](#️-base-de-données)
10. [Scripts disponibles](#-scripts-disponibles)
11. [Variables d'environnement](#-variables-denvironnement)
12. [Déploiement](#-déploiement)
13. [Contribution](#-contribution)
14. [Auteur](#-auteur)

---

## 🎯 À propos du projet

ZoneDeGrimpe est une plateforme interactive que j'ai créée pour combiner cartographie intelligente et gestion de matériel d'escalade. L'application s'adresse aux grimpeurs de tous niveaux qui souhaitent :

- **Découvrir** de nouveaux sites d'escalade en France et ailleurs
- **Planifier** leurs sorties avec des informations détaillées (orientation, cotation, type de grimpe)
- **Gérer** leur équipement personnel (cordes, dégaines, chaussons, etc.)
- **Suivre** l'état et la durée de vie de leur matériel
- **Recevoir** des conseils personnalisés basés sur leur matériel et leurs préférences

Le projet intègre des données issues d'**OpenStreetMap** via l'API Overpass, enrichies et stockées dans MongoDB.

### 🏗️ État du projet

- ✅ **Base de données** : Opérationnelle avec ~10 000+ spots d'escalade
- ✅ **Backend API** : Déployée sur Azure (production)
- ✅ **Frontend** : Interface web responsive fonctionnelle
- 🔧 **En développement** : Nouvelles fonctionnalités (voir Roadmap)

> 📌 **Note** : Ce projet est actuellement en développement actif. Les données affichées sont réelles et proviennent d'OpenStreetMap. Certaines fonctionnalités sont encore en phase de test.

---

## 🚀 Fonctionnalités principales

### 🗺️ Cartographie interactive
- Affichage des **spots d'escalade** sur une carte Leaflet dynamique
- Filtrage par type (falaise, bloc, salle), cotation, orientation
- **Clustering intelligent** pour une meilleure visualisation
- Calcul d'**itinéraires** vers les spots
- **Recherche** par nom ou localisation
- Panneau d'informations détaillées pour chaque spot

### 👤 Gestion utilisateur
- **Authentification sécurisée** (JWT + bcryptjs)
- Inscription et connexion
- Gestion de profil personnalisé
- Paramètres et préférences utilisateur

### 🎒 Gestion de matériel
- **Inventaire personnel** de matériel d'escalade
- Suivi de l'**état** et de la **durée de vie** du matériel
- Base de données de **spécifications techniques** (marques, modèles)
- Alertes de renouvellement
- Historique d'utilisation

### 📊 Analytics & Conseils
- Statistiques d'utilisation
- Recommandations personnalisées
- Conseils de sécurité basés sur le matériel

---

## 🏗️ Architecture technique

Le projet suit une architecture **client-serveur** classique :

```
┌─────────────────────────────────────────────────────────┐
│                      FRONTEND                           │
│  HTML/CSS/JS Vanilla + Leaflet.js                       │
│  Pages: Accueil, Carte, Matériel, Paramètres           │
└────────────────┬────────────────────────────────────────┘
                 │ HTTP/REST API
                 │ (Fetch API)
┌────────────────▼────────────────────────────────────────┐
│                      BACKEND                            │
│  Node.js + Express.js                                   │
│  Routes: /api/spots, /api/auth, /api/users,            │
│          /api/user_materiel, /api/materiel_specs       │
│          /api/analytics, /api/advice                    │
└────────────────┬────────────────────────────────────────┘
                 │ MongoDB Driver
                 │
┌────────────────▼────────────────────────────────────────┐
│                   BASE DE DONNÉES                       │
│  MongoDB Atlas (ou local)                               │
│  Collections: climbing_spot, users, user_materiel,     │
│               materiel_specs, analytics                 │
└─────────────────────────────────────────────────────────┘
```

### Flux de données
1. Le **frontend** envoie des requêtes HTTP à l'API backend
2. Le **backend** authentifie, valide (Zod) et traite les requêtes
3. Les données sont lues/écrites dans **MongoDB**
4. Les réponses sont renvoyées au frontend en JSON
5. Le frontend met à jour l'interface utilisateur

---

## 🧠 Technologies utilisées

### Backend
| Technologie | Usage |
|-------------|-------|
| **Node.js** | Runtime JavaScript |
| **Express.js** | Framework web minimaliste |
| **MongoDB** | Base de données NoSQL |
| **JWT** | Authentification par tokens |
| **bcryptjs** | Hachage des mots de passe |
| **Zod** | Validation de schémas |
| **Cheerio** | Web scraping (extraction de données) |
| **dotenv** | Gestion des variables d'environnement |
| **CORS** | Gestion des requêtes cross-origin |

### Frontend
| Technologie | Usage |
|-------------|-------|
| **HTML5/CSS3** | Structure et styles |
| **JavaScript (ES6+)** | Logique applicative |
| **Leaflet.js** | Cartographie interactive |
| **Fetch API** | Requêtes HTTP |
| **LocalStorage** | Cache et stockage local |

### Données
- **Overpass API** (OpenStreetMap) : Source des spots d'escalade
- **GeoJSON** : Format de données géospatiales
- **2dsphere** : Index géospatial MongoDB

---

## ✅ Prérequis

Avant de commencer, assurez-vous d'avoir installé :

- **Node.js** >= 18.x ([télécharger](https://nodejs.org/))
- **npm** >= 9.x (inclus avec Node.js)
- **Git** (pour cloner le projet)
- Un éditeur de code (VS Code recommandé)

### Accès à la base de données

Le projet utilise MongoDB Atlas (cloud). Vous avez besoin de :
- ✅ Accès au cluster MongoDB `zonedegrimpe.qs1fs3v.mongodb.net`
- ✅ Identifiants utilisateur MongoDB (user/password)

> **Note pour les contributeurs externes** : Si vous n'avez pas accès à la base de données de production, vous pouvez créer votre propre cluster MongoDB Atlas gratuit ou utiliser MongoDB en local pour le développement.

---

## ⚙️ Installation et configuration

### 1. Cloner le dépôt

```bash
git clone https://github.com/vincentchaye/ZoneDeGrimpe.git
cd ZoneDeGrimpe
```

> **Note** : Si vous avez déjà cloné le projet, faites simplement `git pull` pour obtenir les dernières modifications.

### 2. Installer les dépendances du backend

```bash
cd backend
npm install
```

**Dépendances installées :**
- express, mongodb, cors, dotenv
- bcryptjs, jsonwebtoken, zod
- cheerio (pour le scraping)

### 3. Installer les dépendances du frontend

```bash
cd ../frontend
npm install
```

**Dépendances installées :**
- servor (serveur de développement)
- eslint, prettier (outils de qualité de code)

### 4. Configurer l'accès à MongoDB

Le projet utilise **MongoDB Atlas** (cloud) avec une base de données déjà configurée.

**Base de données existante :**
- **Cluster** : `zonedegrimpe.qs1fs3v.mongodb.net`
- **Base de données** : `ZoneDeGrimpe`
- **Collections** : `climbing_spot`, `users`, `user_materiel`, `materiel_specs`, etc.

La base contient déjà :
- ✅ ~10 000+ spots d'escalade importés depuis OpenStreetMap
- ✅ Index géospatiaux configurés
- ✅ Données de test pour le matériel

### 5. Créer le fichier `.env` dans le backend

Créez un fichier `.env` dans le dossier `backend/` avec vos identifiants MongoDB :

```bash
cd backend
touch .env
```

Ajoutez le contenu suivant avec **vos propres identifiants** :

```env
# MongoDB Configuration (utilisez vos identifiants MongoDB Atlas)
MONGODB_URI=mongodb+srv://<VOTRE_USER>:<VOTRE_PASSWORD>@zonedegrimpe.qs1fs3v.mongodb.net/?retryWrites=true&w=majority&appName=ZoneDeGrimpe
DB_NAME=ZoneDeGrimpe

# Server Configuration
PORT=3000
NODE_ENV=development

# CORS Configuration (origines autorisées, séparées par des virgules)
ALLOWED_ORIGIN=http://localhost:3001,http://127.0.0.1:5500

# JWT Secret (générez une nouvelle clé sécurisée unique)
JWT_SECRET=votre_cle_secrete_tres_longue_et_complexe_ici_123456789

# JWT Expiration (optionnel)
JWT_EXPIRES_IN=7d
```

> ⚠️ **Important** : 
> - Remplacez `<VOTRE_USER>` et `<VOTRE_PASSWORD>` par vos identifiants MongoDB Atlas
> - Ne commitez JAMAIS le fichier `.env` dans Git ! Il est déjà dans `.gitignore`
> - Générez une nouvelle clé JWT unique (voir ci-dessous)

### 6. Générer une clé JWT sécurisée

Pour générer une clé JWT aléatoire sécurisée unique :

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copiez le résultat et remplacez la valeur de `JWT_SECRET` dans votre `.env`.

### 7. Vérifier l'accès à MongoDB Atlas

Pour vérifier que vous avez bien accès à la base de données :

1. Connectez-vous à [MongoDB Atlas](https://cloud.mongodb.com/)
2. Sélectionnez le cluster **ZoneDeGrimpe**
3. Vérifiez que votre **IP est autorisée** dans Network Access
   - Si ce n'est pas le cas : `Network Access` → `Add IP Address` → `Allow Access from Anywhere` (pour le développement)
4. Vérifiez vos **identifiants utilisateur** dans Database Access

#### 🔑 Récupérer la connection string

Si vous avez perdu votre connection string :

1. Dans MongoDB Atlas, cliquez sur **Connect** sur votre cluster
2. Choisissez **Drivers**
3. Copiez la connection string qui ressemble à :
   ```
   mongodb+srv://<username>:<password>@zonedegrimpe.qs1fs3v.mongodb.net/?retryWrites=true&w=majority&appName=ZoneDeGrimpe
   ```
4. Remplacez `<username>` et `<password>` par vos vrais identifiants
5. Collez dans `MONGODB_URI` de votre fichier `.env`

#### 🔐 Créer un nouvel utilisateur (si nécessaire)

Si vous devez créer de nouveaux identifiants :

1. Dans MongoDB Atlas : `Database Access` → `Add New Database User`
2. Choisissez **Password Authentication**
3. Créez un username et un mot de passe fort
4. Donnez les privilèges **Read and write to any database**
5. Cliquez sur **Add User**
6. Utilisez ces nouveaux identifiants dans votre `.env`

---

## ▶️ Lancement en local

### Démarrage du backend

```bash
cd backend
npm start
```

Le serveur backend démarre sur `http://localhost:3000`

**Vérifiez que tout fonctionne :**
```bash
curl http://localhost:3000/api/health
# Devrait retourner: {"ok":true}
```

### Démarrage du frontend

Dans un **nouveau terminal** :

```bash
cd frontend
npm run dev
```

Le serveur frontend démarre sur `http://localhost:3001`

**Ouvrez votre navigateur** : [http://localhost:3001](http://localhost:3001)

### Alternative : Serveur HTTP simple

Si vous n'avez pas installé les dépendances frontend, vous pouvez utiliser un serveur HTTP basique :

```bash
cd frontend
npx http-server . -p 3001
```

Ou avec Python :

```bash
cd frontend
python3 -m http.server 3001
```

---

## 📁 Structure du projet

```
ZoneDeGrimpe/
├── backend/                      # API Node.js/Express
│   ├── server.js                 # Point d'entrée du serveur
│   ├── package.json              # Dépendances backend
│   ├── .env                      # Variables d'environnement (à créer)
│   ├── dockerfile                # Configuration Docker
│   ├── src/
│   │   ├── db.js                 # Connexion MongoDB
│   │   ├── auth.js               # Middlewares d'authentification
│   │   ├── validators.js         # Schémas de validation Zod
│   │   └── routes/               # Routes de l'API
│   │       ├── spots.routes.js       # Spots d'escalade
│   │       ├── auth.routes.js        # Authentification (login/register)
│   │       ├── users.routes.js       # Gestion des utilisateurs
│   │       ├── userMateriel.routes.js    # Matériel utilisateur
│   │       ├── materielSpecs.routes.js   # Specs techniques matériel
│   │       ├── analytics.routes.js       # Statistiques
│   │       └── advice.routes.js          # Conseils personnalisés
│   └── scripts/
│       ├── update-spot-data.js   # Mise à jour des données spots
│       └── test-extraction.js    # Test de scraping
│
├── frontend/                     # Interface utilisateur
│   ├── index.html                # Page d'accueil
│   ├── map.html                  # Carte interactive
│   ├── materiel.html             # Gestion du matériel
│   ├── parametres.html           # Paramètres utilisateur
│   ├── login.html                # Page de connexion
│   ├── register.html             # Page d'inscription
│   ├── package.json              # Dépendances frontend
│   ├── js/
│   │   ├── main.js               # Script principal
│   │   ├── map.js                # Logique de la carte Leaflet
│   │   ├── api.js                # Appels API
│   │   ├── config.js             # Configuration (URL API)
│   │   ├── login.js              # Logique de connexion
│   │   ├── register.js           # Logique d'inscription
│   │   ├── materiel-smart.js     # Gestion du matériel
│   │   ├── parametres.js         # Gestion des paramètres
│   │   └── ui.js                 # Utilitaires UI
│   ├── style/
│   │   ├── style.css             # Styles principaux
│   │   ├── materiel.css          # Styles page matériel
│   │   └── parametres.css        # Styles page paramètres
│   └── assets/
│       ├── ZoneDeGrimpeIcon.png  # Logo de l'application
│       ├── avatar-default.jpg    # Avatar par défaut
│       └── fonts/                # Polices personnalisées
│
└── README.md                     # Ce fichier
```

---

## 🗃️ Base de données

### Collections MongoDB

| Collection | Description | Documents |
|------------|-------------|-----------|
| **climbing_spot** | Spots d'escalade (source principale) | ~10 000+ spots |
| **climbing_spot_backup_YYYYMMDD** | Sauvegardes des spots | Backups |
| **users** | Utilisateurs de l'application | Profils, authentification |
| **user_materiel** | Matériel personnel des utilisateurs | Inventaire, état |
| **materiel_specs** | Spécifications techniques du matériel | Marques, modèles, caractéristiques |
| **analytics** | Données analytiques | Statistiques d'utilisation |

### Index géospatiaux

Pour des requêtes géospatiales rapides, MongoDB utilise un index **2dsphere** :

```javascript
db.climbing_spot.createIndex({ location: "2dsphere" })
```

Cet index est automatiquement créé au démarrage du serveur.

### Exemple de document `climbing_spot`

```json
{
  "_id": "ObjectId(...)",
  "id": "way/166508622",
  "name": "Baume Rousse",
  "type": "crag",
  "location": {
    "type": "Point",
    "coordinates": [5.12547, 44.4273]
  },
  "climbing:orientation": "S",
  "climbing:grade:french:max": "7c",
  "climbing:grade:french:min": "4a",
  "climbing:routes": 45,
  "description": "Belle falaise calcaire, bien équipée",
  "info_complementaires": "Accès : 15min à pied depuis le parking",
  "url": "https://www.camptocamp.org/waypoints/166508622",
  "source": "OpenStreetMap"
}
```

### Exemple de document `users`

```json
{
  "_id": "ObjectId(...)",
  "email": "grimper@example.com",
  "username": "alpiniste42",
  "password": "$2a$10$hashed_password_here...",
  "createdAt": "2025-10-20T10:30:00.000Z",
  "profile": {
    "firstName": "Marie",
    "lastName": "Dupont",
    "level": "6b",
    "preferences": {
      "climbingTypes": ["crag", "boulder"]
    }
  }
}
```

### Exemple de document `user_materiel`

```json
{
  "_id": "ObjectId(...)",
  "userId": "ObjectId(...)",
  "type": "rope",
  "brand": "Petzl",
  "model": "Volta 9.2mm",
  "purchaseDate": "2024-03-15",
  "state": "good",
  "usageCount": 23,
  "notes": "Corde polyvalente, très légère"
}
```

---

## 🔧 Scripts disponibles

### Backend

| Commande | Description |
|----------|-------------|
| `npm start` | Démarre le serveur API (production) |
| `npm run update-spots` | Met à jour les données de spots depuis Overpass API |
| `npm run test-extraction` | Teste l'extraction de données (web scraping) |

#### 🔄 Mise à jour des données de spots

Pour mettre à jour la base de données avec les dernières données OpenStreetMap :

```bash
cd backend
npm run update-spots
```

Ce script :
- 📡 Interroge l'API Overpass pour récupérer les nouveaux spots
- 🔄 Met à jour les spots existants
- ➕ Ajoute les nouveaux spots découverts
- 📊 Enrichit les données avec des informations complémentaires
- 💾 Sauvegarde tout dans MongoDB

> ⚠️ **Attention** : Cette opération peut prendre plusieurs minutes et consomme des ressources. À utiliser avec parcimonie.

### Frontend

| Commande | Description |
|----------|-------------|
| `npm run dev` | Lance le serveur de développement (port 3001) |
| `npm run lint` | Vérifie la qualité du code JavaScript |
| `npm run format` | Formate le code avec Prettier |

---

## 🔑 Variables d'environnement

Créez un fichier `.env` dans `backend/` avec les variables suivantes :

### Variables obligatoires

```env
# MongoDB - Connection string de votre base de données
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority

# Nom de la base de données MongoDB
DB_NAME=ZoneDeGrimpe

# Secret JWT pour signer les tokens (IMPORTANT: utilisez une clé sécurisée)
JWT_SECRET=your_super_secret_jwt_key_here_min_32_chars
```

### Variables optionnelles

```env
# Port du serveur (défaut: 3000)
PORT=3000

# Environnement (development, production)
NODE_ENV=development

# Durée de validité des tokens JWT (défaut: 7d)
JWT_EXPIRES_IN=7d

# Origines CORS autorisées (séparées par des virgules)
ALLOWED_ORIGIN=http://localhost:3001,http://127.0.0.1:5500

# Logs détaillés (true/false)
DEBUG=false
```

### Génération de JWT_SECRET sécurisé

```bash
# Méthode 1 : avec Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Méthode 2 : avec OpenSSL
openssl rand -hex 64

# Méthode 3 : avec pwgen (Linux)
pwgen -s 64 1
```

---

## 🚀 Déploiement

### Backend (Azure, Heroku, Railway, etc.)

1. Configurez les variables d'environnement sur votre plateforme
2. Assurez-vous que `MONGODB_URI` pointe vers MongoDB Atlas
3. Définissez `NODE_ENV=production`
4. Le `Dockerfile` est prêt pour un déploiement containerisé

**Exemple avec Railway :**
```bash
railway login
railway init
railway up
```

### Frontend (GitHub Pages, Netlify, Vercel, etc.)

1. Modifiez `frontend/js/config.js` avec l'URL de votre backend en production
2. Déployez les fichiers statiques sur votre hébergeur

**URL de production actuelle :**
- Backend : `https://zonedegrimpe-api-f8fehxc0hhcmdfh5.francecentral-01.azurewebsites.net`

---

## 🤝 Contribution

Ce projet est actuellement en développement actif par Vincent Chayé. 

Si vous souhaitez contribuer ou signaler un bug :

1. **Ouvrez une issue** sur GitHub pour discuter des changements
2. **Forkez** le projet si vous souhaitez proposer des modifications
3. Créez une **branche** pour votre feature (`git checkout -b feature/amazing-feature`)
4. **Committez** vos changements (`git commit -m 'Add amazing feature'`)
5. **Pushez** vers la branche (`git push origin feature/amazing-feature`)
6. Ouvrez une **Pull Request** avec une description détaillée

### Standards de code

- Utilisez **ESLint** pour le JavaScript
- Formatez avec **Prettier**
- Commentez les fonctions complexes
- Écrivez des messages de commit descriptifs
- Testez localement avant de soumettre une PR

---

## 📝 Licence

Ce projet est un projet personnel éducatif. Contactez l'auteur pour toute question concernant l'utilisation.

---

## 👤 Auteur

**Vincent Chayé**

- 🧗 Grimpeur passionné & créateur de ZoneDeGrimpe
- 💻 Étudiant & développeur full-stack
- 📍 Valbonne, France
- 📧 Email : [vincent.chaye@icloud.com](mailto:vincent.chaye@icloud.com)
- 💼 LinkedIn : [linkedin.com/in/vincent-chaye](https://linkedin.com/in/vincent-chaye)

> 💡 **À propos** : Ce projet a été créé dans le cadre de mes études et de ma passion pour l'escalade. L'objectif est de créer un outil pratique pour la communauté des grimpeurs, en combinant mes compétences en développement web avec mon expérience de terrain.

---

## 🙏 Remerciements

- **OpenStreetMap** et **Overpass API** pour les données de spots d'escalade
- **MongoDB Atlas** pour l'hébergement de la base de données
- **Leaflet.js** pour la cartographie interactive
- La communauté des grimpeurs pour l'inspiration

---

## 📞 Support et dépannage

### 🔧 Problèmes courants

#### ❌ Erreur : "MongoServerError: Authentication failed"

**Cause** : Identifiants MongoDB incorrects

**Solution** :
1. Vérifiez votre fichier `.env` : les identifiants `MONGODB_URI` sont-ils corrects ?
2. Connectez-vous à [MongoDB Atlas](https://cloud.mongodb.com/)
3. Allez dans `Database Access` → Vérifiez que l'utilisateur existe
4. Si besoin, réinitialisez le mot de passe de l'utilisateur
5. Mettez à jour le `.env` avec les nouveaux identifiants

#### ❌ Erreur : "MongoServerError: IP address not allowed"

**Cause** : Votre IP n'est pas autorisée dans MongoDB Atlas

**Solution** :
1. Connectez-vous à [MongoDB Atlas](https://cloud.mongodb.com/)
2. Allez dans `Network Access`
3. Cliquez sur `Add IP Address`
4. Choisissez `Allow Access from Anywhere` (0.0.0.0/0) pour le développement
5. Sauvegardez et réessayez après ~2 minutes

#### ❌ Erreur : "CORS policy: No 'Access-Control-Allow-Origin'"

**Cause** : Le frontend n'est pas autorisé à communiquer avec le backend

**Solution** :
1. Vérifiez que le backend tourne sur le bon port (3000 par défaut)
2. Vérifiez que `ALLOWED_ORIGIN` dans `.env` contient l'URL de votre frontend
3. Exemple : `ALLOWED_ORIGIN=http://localhost:3001,http://127.0.0.1:5500`
4. Redémarrez le serveur backend après modification du `.env`

#### ❌ Erreur : "Cannot find module"

**Cause** : Dépendances manquantes

**Solution** :
```bash
# Backend
cd backend
rm -rf node_modules package-lock.json
npm install

# Frontend
cd ../frontend
rm -rf node_modules package-lock.json
npm install
```

#### ⚠️ Le serveur démarre mais aucune donnée ne s'affiche

**Vérifications** :
1. Vérifiez que MongoDB est connecté (regardez les logs du serveur)
2. Testez l'API : `curl http://localhost:3000/api/health` → devrait retourner `{"ok":true}`
3. Testez les spots : `curl http://localhost:3000/api/spots` → devrait retourner du GeoJSON
4. Vérifiez la configuration de l'URL API dans `frontend/js/config.js`

### 💬 Besoin d'aide ?

Si vous rencontrez d'autres problèmes :

1. ✅ Consultez les logs du serveur (terminal backend)
2. ✅ Consultez la console du navigateur (F12 → Console)
3. ✅ Vérifiez que toutes les variables d'environnement sont définies
4. ✅ Assurez-vous que MongoDB est bien accessible
5. 📧 Contactez-moi : [vincent.chaye@icloud.com](mailto:vincent.chaye@icloud.com)

---

## 🗺️ Roadmap

### Version 1.0 (Actuelle)
- ✅ Cartographie des spots d'escalade
- ✅ Authentification utilisateur
- ✅ Gestion du matériel personnel
- ✅ Interface responsive

### Version 1.1 (À venir)
- 🔜 Système de favoris et listes de souhaits
- 🔜 Partage de spots entre utilisateurs
- 🔜 Application mobile (React Native)
- 🔜 Notifications de maintenance matériel
- 🔜 Intégration météo en temps réel
- 🔜 Mode hors-ligne (PWA)

---

**Bon courage et bon développement ! 🧗‍♂️🚀**
