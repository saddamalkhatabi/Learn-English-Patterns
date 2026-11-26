"""Publish the runtime files of an existing English Patterns installation over FTPS."""

import contextlib
import ftplib
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import ssl
import string
import subprocess
import sys
import urllib.parse
import urllib.request
import uuid


RUNTIME = ('public', 'db', 'server.js', 'share-preview.cjs', 'runtime-env.cjs',
           'knexfile.cjs', 'package.json', 'package-lock.json')
MANIFEST = 'public/offline-manifest.json'
VERSION = 'public/app-version.json'
PUBLISH_LAST = ('public/app-version.js', VERSION)
PENDING_MEDIA = '.english-patterns-ftps-pending.json'


def retrieve(client, path):
    result = io.BytesIO()
    client.retrbinary(f'RETR {path}', result.write)
    return result.getvalue()


def remote_digest(client, path):
    digest = hashlib.sha256()
    client.retrbinary(f'RETR {path}', digest.update)
    return digest.hexdigest()


def local_digest(path):
    with Path(path).open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def media_index(manifest):
    return {'public/' + entry['path']: (entry['sha256'], entry['bytes'])
            for entry in manifest['media']}


def public_file(site, path):
    url = urllib.parse.urljoin(site, path) + '?deploy-check=' + uuid.uuid4().hex
    request = urllib.request.Request(url, headers={
        'Cache-Control': 'no-cache',
        'User-Agent': 'English-Patterns-Deploy/1.0',
        'Accept': 'application/json, text/plain;q=0.9, */*;q=0.1',
    })
    with urllib.request.urlopen(request, timeout=30) as response:
        if urllib.parse.urlsplit(response.geturl()).scheme != 'https':
            raise ValueError('The site redirected the verification request away from HTTPS.')
        return response.read(32768)


def atomic_upload(client, path, stream):
    temporary = f'{path}.ftps-{uuid.uuid4().hex}.part'
    try:
        client.storbinary(f'STOR {temporary}', stream)
        client.rename(temporary, path)
    except Exception:
        with contextlib.suppress(ftplib.Error, OSError):
            client.delete(temporary)
        raise


def upload(client, path):
    with Path(path).open('rb') as stream:
        atomic_upload(client, path, stream)


def prove_document_root(client, site):
    token = uuid.uuid4().hex
    name = 'ftps-deploy-check-' + token + '.txt'
    path = 'public/' + name
    payload = token.encode('ascii')
    try:
        atomic_upload(client, path, io.BytesIO(b'checking'))
        atomic_upload(client, path, io.BytesIO(payload))
        if public_file(site, name) != payload:
            raise ValueError('The FTPS directory did not serve the verification file at the specified site.')
    finally:
        with contextlib.suppress(ftplib.Error, OSError):
            client.delete(path)


def runtime_files():
    output = subprocess.check_output(['git', 'ls-files', '-z', '--', *RUNTIME])
    files = sorted(set(output.decode('utf-8').split('\0')) - {''})
    for path in files:
        if any(char in path for char in '\r\n') or not Path(path).is_file() or Path(path).is_symlink():
            raise ValueError(f'Unexpected runtime path: {path!r}')
    return files


def partitioned_listing(client, folder, names):
    files = {}
    safe = set(string.ascii_letters + string.digits + '-_.')

    def inspect(prefix, candidates):
        if prefix and len(candidates) <= 2000:
            lines = []
            try:
                reply = client.retrlines(f'LIST -lda {folder}/{prefix}*', lines.append)
            except ftplib.error_perm as exc:
                if not str(exc).startswith('550 '):
                    raise
                return
            if 'truncated' not in reply.lower():
                for line in lines:
                    if not line.startswith('-'):
                        continue
                    columns = line.split(maxsplit=8)
                    if len(columns) != 9:
                        raise ValueError(f'Unrecognized FTP listing for {folder}.')
                    name = PurePosixPath(columns[8]).name
                    if name in candidates:
                        files[name] = int(columns[4])
                return
        groups = {}
        for name in candidates:
            if len(name) == len(prefix) or name[len(prefix)] not in safe:
                client.voidcmd('TYPE I')
                try:
                    size = client.size(f'{folder}/{name}')
                except ftplib.error_perm as exc:
                    if not str(exc).startswith('550 '):
                        raise
                else:
                    if size is not None:
                        files[name] = size
            else:
                groups.setdefault(name[len(prefix)], set()).add(name)
        for next_char, group in sorted(groups.items()):
            inspect(prefix + next_char, group)

    inspect('', names)
    return files


def remote_inventory(client, paths):
    folders = {}
    for path in paths:
        file = PurePosixPath(path)
        folders.setdefault(file.parent.as_posix(), set()).add(file.name)
    inventory = {}
    client.sendcmd('OPTS MLST type;size;')
    for folder, names in sorted(folders.items()):
        lines = []
        try:
            reply = client.retrlines(f'MLSD {folder}', lines.append)
        except ftplib.error_perm as exc:
            if not str(exc).startswith('550 '):
                raise
            continue
        listed = {}
        for line in lines:
            metadata, _, name = line.partition(' ')
            facts = dict(fact.split('=', 1) for fact in metadata.lower().split(';') if '=' in fact)
            if facts.get('type') == 'file':
                listed[PurePosixPath(name).name] = int(facts.get('size', -1))
        if 'truncated' in reply.lower():
            print(f'FTPS shortened the listing for {folder}; listing by file prefix.', flush=True)
            complete = partitioned_listing(client, folder, names)
            if any(complete.get(name) != size for name, size in listed.items() if name in names and size >= 0):
                raise ValueError(f'Could not verify the full FTPS listing for {folder}.')
            listed.update(complete)
        inventory.update({(PurePosixPath(folder) / name).as_posix(): size for name, size in listed.items()})
    return inventory


def planned_updates(client, files, inventory, local_media, remote_media, pending):
    updates = []
    for path in files:
        saved_size = inventory.get(path)
        size = Path(path).stat().st_size
        if saved_size is None or saved_size >= 0 and saved_size != size:
            updates.append(path)
            continue
        audio_or_image = local_media.get(path)
        if path not in pending and audio_or_image and saved_size == size:
            if audio_or_image == remote_media.get(path):
                continue
            if path in remote_media:
                updates.append(path)
                continue
        digest = audio_or_image[0] if audio_or_image else local_digest(path)
        if remote_digest(client, path) != digest:
            updates.append(path)
    return updates


def ensure_directories(client, paths):
    for folder in sorted(paths, key=lambda path: (path.count('/'), path)):
        try:
            client.mkd(folder)
        except ftplib.error_perm as exc:
            if not str(exc).startswith('550 '):
                raise
            base = client.pwd()
            client.cwd(folder)
            client.cwd(base)


def deploy(client, site, mode):
    package = json.loads(retrieve(client, 'package.json'))
    if package.get('name') != 'learn-english-patterns':
        raise ValueError('The FTPS folder does not contain English Patterns.')
    retrieve(client, 'server.js')
    if remote_digest(client, 'package-lock.json') != local_digest('package-lock.json'):
        raise ValueError('The live dependency lock differs. Install the new Node dependencies on the host before publishing.')
    current_build = json.loads(retrieve(client, VERSION))['version']
    if json.loads(public_file(site, 'app-version.json'))['version'] != current_build:
        raise ValueError('The public site and FTPS directory report different application versions.')
    target_build = json.loads(Path(VERSION).read_text(encoding='utf-8'))['version']
    local_media = media_index(json.loads(Path(MANIFEST).read_text(encoding='utf-8')))
    remote_media = media_index(json.loads(retrieve(client, MANIFEST)))
    files = runtime_files()
    inventory = remote_inventory(client, files + [PENDING_MEDIA])
    pending = set(json.loads(retrieve(client, PENDING_MEDIA))) if PENDING_MEDIA in inventory else set()
    updates = planned_updates(client, files, inventory, local_media, remote_media, pending)
    songs = 'public/assets/audio/songs/'
    total_bytes = sum(Path(path).stat().st_size for path in updates)
    print(f'{current_build} -> {target_build}: {len(updates)} files, {total_bytes:,} bytes, '
          f'{sum(path.startswith(songs) for path in updates)} song files.', flush=True)
    server_changes = [path for path in updates if not path.startswith('public/')]
    if server_changes:
        print('Restart Node.js after publishing these runtime files: ' + ', '.join(server_changes), flush=True)
    if mode == 'plan' or not updates and not pending:
        return

    prove_document_root(client, site)
    changed_media = pending | (local_media.keys() & set(updates))
    if changed_media:
        atomic_upload(client, PENDING_MEDIA, io.BytesIO(json.dumps(sorted(changed_media)).encode('utf-8')))
    directories = {parent.as_posix() for path in updates for parent in PurePosixPath(path).parents
                   if parent != PurePosixPath('.')}
    ensure_directories(client, directories)
    tail = (MANIFEST, *PUBLISH_LAST)
    ordered = sorted((path for path in updates if path not in tail), key=lambda path: (path not in local_media, path))
    ordered.extend(path for path in tail if path in updates)
    for index, path in enumerate(ordered, 1):
        upload(client, path)
        if index % 100 == 0:
            print(f'Uploaded {index} of {len(updates)} files.', flush=True)
    if json.loads(public_file(site, 'app-version.json'))['version'] != target_build:
        raise ValueError('Files were transferred, but the site has not served the expected version.')
    if changed_media:
        client.delete(PENDING_MEDIA)
    print(f'The site confirmed version {target_build}.', flush=True)


def main():
    site = os.environ['SMARTERASP_SITE_URL'].strip().rstrip('/') + '/'
    url = urllib.parse.urlsplit(site)
    if url.scheme != 'https' or not url.hostname or url.username or url.password or url.query or url.fragment:
        raise ValueError('Provide the public HTTPS site URL without credentials, query or fragment.')
    mode = os.environ['DEPLOY_MODE']
    if mode not in ('plan', 'publish'):
        raise ValueError('Choose plan or publish.')
    username = os.environ['SMARTERASP_FTPS_USERNAME']
    password = os.environ['SMARTERASP_FTPS_PASSWORD']
    if not username or not password:
        raise ValueError('Set SMARTERASP_FTPS_USERNAME and SMARTERASP_FTPS_PASSWORD in GitHub Actions Secrets.')
    with ftplib.FTP_TLS(context=ssl.create_default_context(), timeout=45) as client:
        client.connect(os.environ['SMARTERASP_FTPS_HOST'], 21)
        client.login(username, password)
        client.prot_p()
        client.cwd(os.environ.get('SMARTERASP_FTPS_ROOT') or '.')
        deploy(client, site, mode)


if __name__ == '__main__':
    try:
        main()
    except (ValueError, KeyError, OSError, ftplib.Error, subprocess.CalledProcessError) as exc:
        sys.exit(f'Deployment stopped: {exc}')
