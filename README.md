# 🧗‍♂️ ZoneDeGrimpe

**ZoneDeGrimpe** est une application web complète de cartographie et de gestion des sites d'escalade. Elle permet aux grimpeurs de découvrir des spots d'escalade (falaises, blocs, salles), de gérer leur matériel, et d'obtenir des conseils personnalisés.

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

ZoneDeGrimpe est une plateforme interactive qui combine cartographie intelligente et gestion de matériel d'escalade. L'application s'adresse aux grimpeurs de tous niveaux qui souhaitent :

- **Découvrir** de nouveaux sites d'escalade en France et ailleurs
- **Planifier** leurs sorties avec des informations détaillées (orientation, cotation, type de grimpe)
- **Gérer** leur équipement personnel (cordes, dégaines, chaussons, etc.)
- **Suivre** l'état et la durée de vie de leur matériel
- **Recevoir** des conseils personnalisés basés sur leur matériel et leurs préférences

Le projet intègre des données issues d'**OpenStreetMap** via l'API Overpass, enrichies et stockées dans MongoDB.

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
- **MongoDB** (local ou compte [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))
- **Git** (pour cloner le projet)
- Un éditeur de code (VS Code recommandé)

---

## ⚙️ Installation et configuration

### 1. Cloner le dépôt

```bash
git clone https://github.com/<votre-utilisateur>/ZoneDeGrimpe.git
cd ZoneDeGrimpe
```

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

### 4. Configurer MongoDB

#### Option A : MongoDB Atlas (Cloud - Recommandé)

1. Créez un compte gratuit sur [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Créez un nouveau cluster (Free Tier M0)
3. Créez un utilisateur de base de données (Database Access)
4. Autorisez votre IP (Network Access → Allow Access from Anywhere)
5. Récupérez votre **connection string** :
   ```
   mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
   ```

#### Option B : MongoDB local

1. Installez MongoDB Community Edition
2. Démarrez le service MongoDB :
   ```bash
   # Linux/macOS
   sudo systemctl start mongod
   
   # Windows (dans Services)
   net start MongoDB
   ```
3. Votre connection string sera :
   ```
   mongodb://localhost:27017
   ```

### 5. Créer le fichier `.env` dans le backend

Créez un fichier `.env` dans le dossier `backend/` :

```bash
cd backend
touch .env
```

Ajoutez le contenu suivant (adaptez selon vos besoins) :

```env
# MongoDB Configuration
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
DB_NAME=ZoneDeGrimpe

# Server Configuration
PORT=3000
NODE_ENV=development

# CORS Configuration (origines autorisées, séparées par des virgules)
ALLOWED_ORIGIN=http://localhost:3001,http://127.0.0.1:5500

# JWT Secret (générez une clé sécurisée)
JWT_SECRET=votre_cle_secrete_tres_longue_et_complexe_ici_123456789

# JWT Expiration (optionnel)
JWT_EXPIRES_IN=7d
```

> ⚠️ **Important** : Ne commitez JAMAIS le fichier `.env` dans Git ! Il est déjà dans `.gitignore`.

### 6. Générer une clé JWT sécurisée

Pour générer une clé JWT aléatoire sécurisée :

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copiez le résultat dans `JWT_SECRET` de votre `.env`.

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
| `npm run update-spots` | Met à jour les données de spots depuis Overpass |
| `npm run test-extraction` | Teste l'extraction de données |

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

Les contributions sont les bienvenues ! Pour contribuer :

1. **Forkez** le projet
2. Créez une **branche** pour votre feature (`git checkout -b feature/amazing-feature`)
3. **Committez** vos changements (`git commit -m 'Add amazing feature'`)
4. **Pushez** vers la branche (`git push origin feature/amazing-feature`)
5. Ouvrez une **Pull Request**

### Standards de code

- Utilisez **ESLint** pour le JavaScript
- Formatez avec **Prettier**
- Commentez les fonctions complexes
- Écrivez des messages de commit descriptifs

---

## 📝 Licence

Ce projet est un projet personnel éducatif. Contactez l'auteur pour toute question concernant l'utilisation.

---

## 👤 Auteur

**Vincent Chayé**

- 🧗 Grimpeur passionné
- 💻 Étudiant & développeur full-stack
- 📍 Valbonne, France
- 📧 Email : [vincent.chaye@icloud.com](mailto:vincent.chaye@icloud.com)
- 🔗 GitHub : [github.com/vincentchaye](https://github.com/vincentchaye) *(ajustez selon votre profil)*

---

## 🙏 Remerciements

- **OpenStreetMap** et **Overpass API** pour les données de spots d'escalade
- **MongoDB Atlas** pour l'hébergement de la base de données
- **Leaflet.js** pour la cartographie interactive
- La communauté des grimpeurs pour l'inspiration

---

## 📞 Support

Si vous rencontrez des problèmes :

1. Vérifiez que MongoDB est accessible
2. Vérifiez que les variables d'environnement sont correctes
3. Consultez les logs du serveur (`npm start`)
4. Ouvrez une issue sur GitHub

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
