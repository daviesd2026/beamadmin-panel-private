import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "beamadmin_troll_tools" / "scripts"
OUT = ROOT / "beamadmin_troll_tools.zip"

FILES = {
    SOURCE / "cl_troll.lua": "scripts/cl_troll.lua",
    SOURCE / "beamadmin_troll_ge.lua": "scripts/beamadmin_troll_ge.lua",
    SOURCE / "modScript.lua": "modScript.lua",
}


def main():
    with zipfile.ZipFile(OUT, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for source, archive_name in FILES.items():
            zf.write(source, archive_name)
    print(OUT)


if __name__ == "__main__":
    main()
