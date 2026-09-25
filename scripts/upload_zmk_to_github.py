#!/usr/bin/env python3
"""Upload this workspace to arteksrab-cmyk/ZMK using one atomic Git commit."""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

REPO = "arteksrab-cmyk/ZMK"
BRANCH = "main"
API_ROOT = "https://api.github.com"
ROOT = Path(__file__).resolve().parents[1]
ROOT_FILES = (
    ".gitignore",
    ".npmrc",
    "README.md",
    "package.json",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
    "tsconfig.base.json",
    "tsconfig.json",
)
SOURCE_DIRS = ("artifacts", "lib", "scripts")
SKIP_DIRS = {
    ".agents",
    ".cache",
    ".conversation",
    ".git",
    ".local",
    ".replit-artifact",
    "__pycache__",
    "attached_assets",
    "dist",
    "node_modules",
    "screenshots",
}
SKIP_FILES = {".replit", ".replitignore", "replit.md"}


class GitHubApiError(RuntimeError):
    def __init__(self, status: int, message: str) -> None:
        super().__init__(message)
        self.status = status


def api_request(
    method: str,
    path: str,
    token: str,
    payload: dict[str, Any] | None = None,
) -> dict[str, Any]:
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    request = urllib.request.Request(
        f"{API_ROOT}{path}",
        data=data,
        method=method,
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
            "User-Agent": "zmk-website-uploader",
            "X-GitHub-Api-Version": "2022-11-28",
            **({"Content-Type": "application/json"} if data is not None else {}),
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=45) as response:
            body = response.read()
    except urllib.error.HTTPError as error:
        try:
            detail = json.loads(error.read().decode("utf-8")).get("message", "request failed")
        except (ValueError, UnicodeDecodeError):
            detail = "request failed"
        raise GitHubApiError(error.code, str(detail)) from None
    except urllib.error.URLError as error:
        raise RuntimeError(f"GitHub connection failed: {error.reason}") from None
    if not body:
        return {}
    return json.loads(body.decode("utf-8"))


def should_skip(relative_path: Path) -> bool:
    if any(part in SKIP_DIRS for part in relative_path.parts):
        return True
    name = relative_path.name.lower()
    if name in SKIP_FILES:
        return True
    if name == ".env" or name.startswith(".env.") or name in {
        "secrets.env",
        "credentials.json",
    }:
        return True
    if any(marker in name for marker in ("credential", "private-key", "token-secret")):
        return True
    if name.endswith((".pem", ".key", ".p12", ".pfx", ".pyc", ".tsbuildinfo")):
        return True
    return False


def collect_files() -> list[tuple[Path, str]]:
    selected: dict[str, Path] = {}
    for name in ROOT_FILES:
        path = ROOT / name
        if path.is_file():
            selected[name] = path

    for directory in SOURCE_DIRS:
        base = ROOT / directory
        if not base.is_dir():
            continue
        for path in base.rglob("*"):
            if not path.is_file():
                continue
            relative = path.relative_to(ROOT)
            if not should_skip(relative):
                selected[relative.as_posix()] = path
    return [(selected[name], name) for name in sorted(selected)]


def git_blob_sha(content: bytes) -> str:
    header = f"blob {len(content)}\0".encode("ascii")
    return hashlib.sha1(header + content).hexdigest()


def get_branch_ref(token: str) -> dict[str, Any] | None:
    path = f"/repos/{REPO}/git/ref/heads/{urllib.parse.quote(BRANCH, safe='')}"
    try:
        return api_request("GET", path, token)
    except GitHubApiError as error:
        if error.status == 404 or (
            error.status == 409 and "Git Repository is empty" in str(error)
        ):
            return None
        raise


def create_initial_empty_file(token: str) -> None:
    """Bootstrap an empty repository using the Contents API."""
    api_request(
        "PUT",
        f"/repos/{REPO}/contents/.gitkeep",
        token,
        {
            "message": "chore: initialize empty ZMK repository",
            "content": "",
            "branch": BRANCH,
        },
    )
    print("Created the empty .gitkeep file in the initial GitHub commit.")


def upload_changes(files: list[tuple[Path, str]], token: str) -> None:
    ref = get_branch_ref(token)
    if ref is None:
        create_initial_empty_file(token)
        ref = get_branch_ref(token)
    if ref is None:
        raise RuntimeError(f"Branch {BRANCH} was not created.")

    head_sha = ref["object"]["sha"]
    head_commit = api_request("GET", f"/repos/{REPO}/git/commits/{head_sha}", token)
    base_tree_sha = head_commit["tree"]["sha"]
    current_tree = api_request(
        "GET", f"/repos/{REPO}/git/trees/{base_tree_sha}?recursive=1", token
    )
    remote_shas = {
        item["path"]: item["sha"]
        for item in current_tree.get("tree", [])
        if item.get("type") == "blob"
    }

    changed: list[tuple[Path, str, bytes]] = []
    for local_path, repo_path in files:
        content = local_path.read_bytes()
        if remote_shas.get(repo_path) != git_blob_sha(content):
            changed.append((local_path, repo_path, content))

    print(f"Repository: https://github.com/{REPO}")
    print(f"Files selected: {len(files)}; changed: {len(changed)}")
    if not changed:
        print("GitHub already has the latest selected files.")
        return

    tree_items = []
    for index, (local_path, repo_path, content) in enumerate(changed, start=1):
        blob = api_request(
            "POST",
            f"/repos/{REPO}/git/blobs",
            token,
            {
                "content": base64.b64encode(content).decode("ascii"),
                "encoding": "base64",
            },
        )
        mode = "100755" if os.access(local_path, os.X_OK) else "100644"
        tree_items.append(
            {"path": repo_path, "mode": mode, "type": "blob", "sha": blob["sha"]}
        )
        if index % 25 == 0 or index == len(changed):
            print(f"Prepared {index}/{len(changed)} changed files.")

    new_tree = api_request(
        "POST",
        f"/repos/{REPO}/git/trees",
        token,
        {"base_tree": base_tree_sha, "tree": tree_items},
    )
    commit = api_request(
        "POST",
        f"/repos/{REPO}/git/commits",
        token,
        {
            "message": "Update ZMK website, API and SEO files",
            "tree": new_tree["sha"],
            "parents": [head_sha],
        },
    )
    encoded_branch = urllib.parse.quote(BRANCH, safe="")
    api_request(
        "PATCH",
        f"/repos/{REPO}/git/refs/heads/{encoded_branch}",
        token,
        {"sha": commit["sha"], "force": False},
    )
    print(f"Uploaded {len(changed)} files in one commit.")
    print(f"Commit: {commit.get('html_url', commit['sha'])}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="list selected local files without contacting GitHub",
    )
    args = parser.parse_args()
    files = collect_files()
    if args.dry_run:
        print(f"Would upload {len(files)} files to {REPO} ({BRANCH}):")
        for _, repo_path in files:
            print(f"  {repo_path}")
        return 0

    token = os.environ.get("GITHUB_PERSONAL_ACCESS_TOKEN")
    if not token:
        print(
            "GITHUB_PERSONAL_ACCESS_TOKEN is missing from the environment.",
            file=sys.stderr,
        )
        return 1
    try:
        upload_changes(files, token)
    except (GitHubApiError, RuntimeError, KeyError, ValueError) as error:
        print(f"Upload failed: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())