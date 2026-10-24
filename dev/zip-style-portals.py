"""Create and validate a root-entry ZIP containing only the verified release files."""
import hashlib
import json
import pathlib
import sys
import zipfile

source, manifest_file, archive_file = map(pathlib.Path, sys.argv[1:])
source = source.resolve()
manifest = json.loads(manifest_file.read_text(encoding="utf-8"))
with zipfile.ZipFile(archive_file, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
    for entry in manifest["files"]:
        file = (source / entry["file"]).resolve()
        if not file.is_relative_to(source):
            raise ValueError("Archive entry escapes the release directory")
        payload = file.read_bytes()
        if len(payload) != entry["bytes"] or hashlib.sha256(payload).hexdigest() != entry["sha256"]:
            raise ValueError("Archive source differs from verified manifest")
        archive.writestr(entry["file"], payload)
with zipfile.ZipFile(archive_file) as archive:
    assert set(archive.namelist()) == {entry["file"] for entry in manifest["files"]}
    assert "index.html" in archive.namelist()
    assert archive.testzip() is None
    for entry in manifest["files"]:
        assert hashlib.sha256(archive.read(entry["file"])).hexdigest() == entry["sha256"]
print(f"Portal ZIP verified: {archive_file} ({archive_file.stat().st_size} bytes)")
