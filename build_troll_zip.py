import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "beamadmin_troll_tools"
OUT = ROOT / "beamadmin_troll_tools.zip"

FILES = {
    SOURCE / "modScript.lua": "modScript.lua",
    SOURCE / "scripts" / "cl_troll.lua": "scripts/cl_troll.lua",
    SOURCE / "beamadmin" / "troll" / "ge.lua": "beamadmin/troll/ge.lua",
}


def main():
    with zipfile.ZipFile(OUT, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for source, archive_name in FILES.items():
            zf.write(source, archive_name)
    print(OUT)


if __name__ == "__main__":
    main()
