#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import argparse, json, os, sys, shutil
from datetime import datetime

ALLOWED_TYPES = {"exterieur", "interieur"}
ALLOWED_DISCIPLINES = {"bloc", "diff"}

def load_or_init(fc_path: str) -> dict:
    if not os.path.exists(fc_path):
        return {"type": "FeatureCollection", "features": []}
    with open(fc_path, "r", encoding="utf-8") as f:
        try:
            data = json.load(f)
        except json.JSONDecodeError as e:
            sys.exit(f"[ERREUR] Fichier JSON invalide: {e}")
    if not isinstance(data, dict) or data.get("type") != "FeatureCollection":
        sys.exit("[ERREUR] Le fichier n'est pas un FeatureCollection GeoJSON.")
    data.setdefault("features", [])
    return data

def backup_file(path: str) -> None:
    if not os.path.exists(path):
        return
    base, ext = os.path.splitext(path)
    ts = datetime.now().strftime("%Y%m%d-%H%M%S")
    bak = f"{base}.bak.{ts}{ext}"
    shutil.copy2(path, bak)
    print(f"[INFO] Sauvegarde créée: {bak}")

def validate_inputs(args):
    if args.type not in ALLOWED_TYPES:
        sys.exit(f"[ERREUR] --type doit être dans {sorted(ALLOWED_TYPES)}")
    if args.discipline not in ALLOWED_DISCIPLINES:
        sys.exit(f"[ERREUR] --discipline doit être dans {sorted(ALLOWED_DISCIPLINES)}")
    try:
        lon = float(args.lon)
        lat = float(args.lat)
    except ValueError:
        sys.exit("[ERREUR] --lon et --lat doivent être des nombres.")
    if not (-180.0 <= lon <= 180.0 and -90.0 <= lat <= 90.0):
        sys.exit("[ERREUR] Coordonnées hors limites GeoJSON.")
    return lon, lat

def is_duplicate(features, name: str, lon: float, lat: float, eps=1e-6) -> bool:
    for f in features:
        if f.get("type") != "Feature": 
            continue
        prop = f.get("properties", {})
        geom = f.get("geometry", {})
        if geom.get("type") != "Point": 
            continue
        coords = geom.get("coordinates", [])
        if len(coords) != 2:
            continue
        lon2, lat2 = coords
        same_place = abs(lon - float(lon2)) < eps and abs(lat - float(lat2)) < eps
        same_name = (prop.get("name") or "").strip().lower() == name.strip().lower()
        if same_place or same_name:
            return True
    return False

def build_feature(name, lon, lat, topo, ztype, discipline):
    props = {
        "name": name,
        # pour que ton code existant les capte dans l'UI
        "website": topo,          # ton lien topo
        "topo_url": topo,         # alias explicite
        "type": ztype,            # "exterieur" | "interieur"
        "discipline": discipline  # "bloc" | "diff"
    }
    feat = {
        "type": "Feature",
        "properties": props,
        "geometry": {"type": "Point", "coordinates": [lon, lat]}
    }
    return feat

def add_crag(fc_path, name, lon, lat, topo, ztype, discipline, allow_dupe=False):
    fc = load_or_init(fc_path)
    if not allow_dupe and is_duplicate(fc["features"], name, lon, lat):
        sys.exit("[ERREUR] Doublon détecté (même nom ou même coordonnées). Utilise --force pour forcer l'ajout.")
    feature = build_feature(name, lon, lat, topo, ztype, discipline)
    fc["features"].append(feature)
    backup_file(fc_path)
    with open(fc_path, "w", encoding="utf-8") as f:
        json.dump(fc, f, ensure_ascii=False, indent=2, sort_keys=False)
    print(f"[OK] Ajouté: {name} ({lat:.5f}, {lon:.5f})")

def main():
    p = argparse.ArgumentParser(
        description="Ajoute une zone de grimpe (Point) à un GeoJSON FeatureCollection."
    )
    p.add_argument("-f", "--file", required=True, help="Chemin du fichier GeoJSON (ex: ./data/falaise.geojson)")
    p.add_argument("--name", required=True, help="Nom de la zone")
    p.add_argument("--lon", required=True, help="Longitude (ex: 7.1234)")
    p.add_argument("--lat", required=True, help="Latitude (ex: 43.5678)")
    p.add_argument("--topo", required=True, help="URL du topo (site)")
    p.add_argument("--type", required=True, choices=sorted(ALLOWED_TYPES), help="Type: exterieur | interieur")
    p.add_argument("--discipline", required=True, choices=sorted(ALLOWED_DISCIPLINES), help="bloc | diff")
    p.add_argument("--force", action="store_true", help="Autoriser l'ajout même si doublon")
    args = p.parse_args()

    lon, lat = validate_inputs(args)
    add_crag(
        fc_path=args.file,
        name=args.name.strip(),
        lon=lon,
        lat=lat,
        topo=args.topo.strip(),
        ztype=args.type,
        discipline=args.discipline,
        allow_dupe=args.force
    )

if __name__ == "__main__":
    main()
