# Application Meteo

Application web Meteo moderne en **HTML/CSS/JavaScript vanilla** avec:
- recherche par ville
- meteo actuelle detaillee
- previsions sur 5 jours
- vue horaire par jour
- carte interactive (Leaflet)
- bascule **mode sombre / mode clair**

## Apercu

Le projet consomme l'API OpenWeatherMap pour afficher les donnees meteo d'une ville, avec une interface "glassmorphism" et un fond anime.

## Fonctionnalites

- Recherche d'une ville (bouton ou touche Entree)
- Affichage de la temperature, ressenti, humidite, pression, visibilite, nuages
- Module vent avec vitesse, direction (boussole), rafales et echelle Beaufort
- Carte de localisation de la ville
- Previsions 5 jours
- Detail horaire au clic sur un jour
- Gestion des etats UI: chargement, erreur, placeholder
- Theme clair/sombre avec memorisation via `localStorage`

## Stack technique

- HTML5
- CSS3 (variables CSS, responsive design)
- JavaScript (ES6+)
- [Leaflet](https://leafletjs.com/) pour la carte
- [OpenWeatherMap API](https://openweathermap.org/api)
- Tuiles cartographiques CARTO

## Installation

1. Clone le depot:

```bash
git clone <url-du-repo>
cd <nom-du-repo>
```

2. Cree ton fichier local de configuration (non versionne):

```bash
cp config.example.js config.js
```

3. Edite `config.js` et renseigne ta cle API:

```js
window.APP_CONFIG = {
  OPENWEATHER_API_KEY: "VOTRE_CLE_API_OPENWEATHER"
};
```

4. Lance un serveur local:

```bash
python -m http.server 5500
```

5. Ouvre l'application:

```text
http://localhost:5500
```

## Structure du projet

```text
.
├── index.html         # Structure de la page
├── style.css          # Styles, animations, themes
├── script.js          # Logique meteo, API, UI, carte
├── config.example.js  # Exemple de configuration
├── config.js          # Configuration locale (ignoree par git)
└── .gitignore         # Fichiers exclus du versioning
```

## Publication GitHub (sans exposer la cle)

- `config.js` est ignore via `.gitignore`
- Seul `config.example.js` est versionne
- Chaque personne cree son propre `config.js` local

Important: si une cle API a deja ete commit dans l'historique Git, regenere-la dans OpenWeatherMap.

## Configuration API

- Cree un compte sur OpenWeatherMap
- Genere une cle API
- Ajoute la cle dans `config.js` (`OPENWEATHER_API_KEY`)

Note: pour un projet public/production, evite d'exposer la cle cote client. Passe plutot par un backend/proxy.

## Idees d'amelioration

- Geolocalisation utilisateur
- Historique des recherches
- Choix de l'unite (C/F)
- Internationalisation (FR/EN)
- Tests unitaires et e2e

