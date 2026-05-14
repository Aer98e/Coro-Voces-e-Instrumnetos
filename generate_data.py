import json
import re
import csv
from pathlib import Path
from datetime import datetime

ROOT = Path(__file__).parent
AUDIO_DIR = ROOT / "audios"
PDF_DIR = ROOT / "partituras"
DATA_DIR = ROOT / "data"
OUTPUT_JSON = DATA_DIR / "data.json"
LOG_FILE = DATA_DIR / "generation_log.txt"
CSV_FILE = DATA_DIR / "himnos.csv"

VOICE_MAP = {
    "soprano": "Soprano",
    "alto": "Alto",
    "tenor": "Tenor",
    "bajo": "Bajo",
    "satb": "Score SATB",
    "todos": "Score SATB",
    "score": "Score SATB",
    "score satb": "Score SATB",
    "score satb": "Score SATB",
    "general": "Score SATB",
    "completo": "Score SATB",
    "piano": "Piano",
    "solo": "Solo",
}

STANDARD_VOICES = ["Soprano", "Alto", "Tenor", "Bajo", "Score SATB"]
SPECIAL_VOICES = ["Piano", "Solo"]

VOICE_PATTERN = re.compile(r"^(.*?)(?:\s*-\s*|\s*-\s*)([^-]+)$")


def load_hymn_metadata(csv_path: Path) -> dict[str, dict]:
    """Carga títulos, tonos, categorías y fechas desde CSV."""
    metadata: dict[str, dict] = {}
    if not csv_path.exists():
        return metadata

    try:
        with open(csv_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                if not row:
                    continue
                titulo_csv = row.get("titulo", "").strip() if row.get("titulo") else ""
                if not titulo_csv:
                    continue

                key = title_key(titulo_csv)
                categorias_str = row.get("categorias", "").strip() if row.get("categorias") else ""
                categorias = [cat.strip() for cat in categorias_str.split(",") if cat.strip()] if categorias_str else []
                
                metadata[key] = {
                    "titulo": titulo_csv,
                    "tono": row.get("tono", "").strip() if row.get("tono") else "",
                    "fecha_registro": row.get("fecha_registro", "").strip() if row.get("fecha_registro") else "",
                    "categorias": categorias,
                }
    except Exception as e:
        print(f"Error leyendo CSV: {e}")
    return metadata



def normalize_title(title: str) -> str:
    title = title.strip()
    title = re.sub(r"\s+", " ", title)
    title = title.replace("  ", " ")
    return title


def title_key(title: str) -> str:
    return normalize_title(title).casefold()


def normalize_voice(raw_voice: str) -> str | None:
    voice = raw_voice.strip().lower()
    voice = re.sub(r"^voz de\s+", "", voice)
    voice = voice.replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u").replace("ñ", "n")
    voice = voice.replace("  ", " ")
    voice = voice.strip()

    if voice in VOICE_MAP:
        return VOICE_MAP[voice]
    if voice in {"soprano", "alto", "tenor", "bajo", "piano", "solo"}:
        return voice.capitalize()

    return None


def parse_media_file(path: Path) -> tuple[str, str] | None:
    stem = path.stem
    match = VOICE_PATTERN.match(stem)
    if not match:
        return None

    title_part, voice_part = match.group(1), match.group(2)
    title = normalize_title(title_part)
    voice = normalize_voice(voice_part)
    if not voice:
        return None
    return title, voice


def safe_rename(src: Path, dst: Path, log: list[str]) -> None:
    if src == dst:
        return
    if dst.exists():
        if dst.samefile(src):
            return
        log.append(f"Conflicto de nombre: destino ya existe {dst}")
        return
    dst.parent.mkdir(parents=True, exist_ok=True)
    src.rename(dst)
    log.append(f"Renombrado: {src.name} -> {dst.name}")


def collect_files(directory: Path, extensions: set[str], log: list[str], log_unparsed: bool = True) -> tuple[dict[str, list[tuple[Path, str]]], dict[str, str]]:
    items: dict[str, list[tuple[Path, str]]] = {}
    canonical_titles: dict[str, str] = {}
    for path in sorted(directory.iterdir()):
        if path.is_file() and path.suffix.lower() in extensions:
            parsed = parse_media_file(path)
            if parsed is None:
                if log_unparsed:
                    log.append(f"No se pudo parsear: {path.relative_to(ROOT)}")
                continue
            title, voice = parsed
            key = title_key(title)
            canonical_titles.setdefault(key, title)
            items.setdefault(key, []).append((path, voice))
    return items, canonical_titles


def build_entries(audio_groups: dict[str, list[tuple[Path, str]]], pdf_groups: dict[str, list[tuple[Path, str]]], log: list[str], title_map: dict[str, str], metadata: dict[str, dict]) -> list[dict]:
    keys = sorted(set(audio_groups) | set(pdf_groups))
    entries = []
    next_id = 1

    for key in keys:
        title = title_map.get(key, key)
        audio_by_voice: dict[str, list[Path]] = {}
        pdf_by_voice: dict[str, list[Path]] = {}

        for path, voice in audio_groups.get(key, []):
            audio_by_voice.setdefault(voice, []).append(path)
        for path, voice in pdf_groups.get(key, []):
            pdf_by_voice.setdefault(voice, []).append(path)

        versions = []
        file_dates = []
        has_standard_voice = False

        for voice in STANDARD_VOICES:
            audio_paths = audio_by_voice.get(voice, [])
            pdf_paths = pdf_by_voice.get(voice, [])
            if len(audio_paths) > 1 or len(pdf_paths) > 1:
                if len(audio_paths) > 1:
                    log.append(f"Múltiples audios para {title} - {voice}: {[p.name for p in audio_paths]}")
                if len(pdf_paths) > 1:
                    log.append(f"Múltiples partituras para {title} - {voice}: {[p.name for p in pdf_paths]}")
                continue
            if not audio_paths and not pdf_paths:
                continue

            audio_path = audio_paths[0] if audio_paths else None
            pdf_path = pdf_paths[0] if pdf_paths else None

            if audio_path is not None:
                file_dates.append(audio_path.stat().st_mtime)
            elif pdf_path is not None:
                file_dates.append(pdf_path.stat().st_mtime)

            versions.append({
                "voz": voice,
                "audio": f"audios/{audio_path.name}" if audio_path else "",
                "pdf": f"partituras/{pdf_path.name}" if pdf_path else ""
            })
            has_standard_voice = True

        # Agregar versiones especiales (Piano, Solo) si existen voces estándar
        if has_standard_voice:
            for special_voice in SPECIAL_VOICES:
                audio_paths = audio_by_voice.get(special_voice, [])
                pdf_paths = pdf_by_voice.get(special_voice, [])
                
                if len(audio_paths) > 1 or len(pdf_paths) > 1:
                    if len(audio_paths) > 1:
                        log.append(f"Múltiples audios para {title} - {special_voice}: {[p.name for p in audio_paths]}")
                    if len(pdf_paths) > 1:
                        log.append(f"Múltiples partituras para {title} - {special_voice}: {[p.name for p in pdf_paths]}")
                    continue
                
                if not audio_paths and not pdf_paths:
                    continue

                audio_path = audio_paths[0] if audio_paths else None
                pdf_path = pdf_paths[0] if pdf_paths else None

                if audio_path is not None:
                    file_dates.append(audio_path.stat().st_mtime)
                elif pdf_path is not None:
                    file_dates.append(pdf_path.stat().st_mtime)

                versions.append({
                    "voz": special_voice,
                    "audio": f"audios/{audio_path.name}" if audio_path else "",
                    "pdf": f"partituras/{pdf_path.name}" if pdf_path else ""
                })

        if not versions:
            log.append(f"No se encontraron versiones válidas para {title}")
            continue

        # Obtener metadata del CSV si existe
        csv_meta = metadata.get(key, {})
        titulo_final = csv_meta.get("titulo", title)
        tono_final = csv_meta.get("tono", "")
        categorias_final = csv_meta.get("categorias", [])
        fecha_registro = csv_meta.get("fecha_registro", "")

        # Si no hay fecha en CSV, usar la del archivo más antiguo
        if not fecha_registro and file_dates:
            fecha_registro = datetime.fromtimestamp(min(file_dates)).date().isoformat()

        entries.append({
            "id": next_id,
            "titulo": titulo_final,
            "categorias": categorias_final,
            "tono": tono_final,
            "versiones": versions,
            "fecha_registro": fecha_registro or ""
        })
        next_id += 1

    return entries


def standardize_files(audio_groups: dict[str, list[tuple[Path, str]]], pdf_groups: dict[str, list[tuple[Path, str]]], log: list[str]) -> None:
    for title, items in sorted(audio_groups.items()):
        for path, voice in items:
            target_name = f"{title} - {voice}{path.suffix.lower()}"
            target_path = path.parent / target_name
            safe_rename(path, target_path, log)
    for title, items in sorted(pdf_groups.items()):
        for path, voice in items:
            target_name = f"{title} - {voice}{path.suffix.lower()}"
            target_path = path.parent / target_name
            safe_rename(path, target_path, log)


def main() -> None:
    log: list[str] = []
    if not DATA_DIR.exists():
        DATA_DIR.mkdir(parents=True)

    # Cargar metadata del CSV
    metadata = load_hymn_metadata(CSV_FILE)
    if metadata:
        log.append(f"Metadatos cargados del CSV: {len(metadata)} himnos")
    else:
        log.append("No se encontró o no se pudo cargar el archivo CSV de metadatos")

    audio_groups, audio_titles = collect_files(AUDIO_DIR, {".mp3"}, log)
    pdf_groups, pdf_titles = collect_files(PDF_DIR, {".pdf"}, log)
    title_map = {**audio_titles, **pdf_titles}

    log.append(f"Archivos de audio válidos detectados: {sum(len(v) for v in audio_groups.values())}")
    log.append(f"Archivos de partituras válidos detectados: {sum(len(v) for v in pdf_groups.values())}")

    standardize_files(audio_groups, pdf_groups, log)

    # Re-collect after rename to preserve correct paths
    audio_groups, audio_titles = collect_files(AUDIO_DIR, {".mp3"}, log, log_unparsed=False)
    pdf_groups, pdf_titles = collect_files(PDF_DIR, {".pdf"}, log, log_unparsed=False)
    title_map = {**audio_titles, **pdf_titles}

    entries = build_entries(audio_groups, pdf_groups, log, title_map, metadata)

    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(entries, f, indent=2, ensure_ascii=False)
    log.append(f"data.json generado con {len(entries)} himnos")

    with open(LOG_FILE, "w", encoding="utf-8") as f:
        f.write("\n".join(log))

    print("Proceso completado.")
    print(f"Se generó: {OUTPUT_JSON}")
    print(f"Se guardó registro de problemas en: {LOG_FILE}")


if __name__ == "__main__":
    main()
