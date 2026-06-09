import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "beamadmin_troll_tools"
OUT = ROOT / "beamadmin_troll_tools.zip"

FILES = {
    SOURCE / "scripts" / "modScript.lua": "scripts/modScript.lua",
    SOURCE / "lua" / "ge" / "extensions" / "beamadmin_troll_tools.lua": "lua/ge/extensions/beamadmin_troll_tools.lua",
}


def main():
    with zipfile.ZipFile(OUT, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for source, archive_name in FILES.items():
            zf.write(source, archive_name)
    print(OUT)


if __name__ == "__main__":
    main()
