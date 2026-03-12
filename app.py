"""
VAULT - Secure File Sharing App
================================
Local dev:
    pip install flask gunicorn werkzeug
    python app.py  →  http://localhost:5000

Deploy to Render:
    Push app.py + requirements.txt + render.yaml to GitHub,
    then connect repo on render.com (Free tier).
"""

import os
import secrets
import sqlite3
import hashlib
import mimetypes
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, send_file, abort
from werkzeug.utils import secure_filename

# ─────────────────────────────────────────
#  CONFIG
#  On Render the persistent disk is mounted at /data
#  Locally we just use ./uploads  and  ./fileshare.db
# ─────────────────────────────────────────
_BASE = '/data' if os.path.isdir('/data') else os.path.dirname(os.path.abspath(__file__))

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50 MB
app.config['UPLOAD_FOLDER'] = os.path.join(_BASE, 'uploads')
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', secrets.token_hex(32))

DB_PATH = os.path.join(_BASE, 'fileshare.db')

ALLOWED_EXTENSIONS = {
    'txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'mp4', 'mov', 'avi',
    'mp3', 'wav', 'zip', 'tar', 'gz', '7z', 'rar',
    'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    'csv', 'json', 'xml', 'html', 'css', 'js', 'py', 'md', 'webp', 'svg'
}

BLOCKED_EXTENSIONS = {
    'exe', 'bat', 'cmd', 'sh', 'bash', 'ps1', 'msi', 'dll',
    'vbs', 'vba', 'jar', 'com', 'scr', 'pif', 'reg'
}

# ─────────────────────────────────────────
#  DATABASE
# ─────────────────────────────────────────
def init_db():
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS files (
                id               INTEGER PRIMARY KEY AUTOINCREMENT,
                filename         TEXT NOT NULL,
                original_filename TEXT NOT NULL,
                file_path        TEXT NOT NULL,
                file_size        INTEGER NOT NULL,
                file_type        TEXT,
                upload_time      TEXT NOT NULL,
                expiry_time      TEXT NOT NULL,
                code             TEXT UNIQUE NOT NULL,
                downloaded       INTEGER DEFAULT 0,
                download_time    TEXT,
                is_active        INTEGER DEFAULT 1
            )
        ''')
        conn.commit()

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def allowed_file(filename):
    if '.' not in filename:
        return False
    ext = filename.rsplit('.', 1)[1].lower()
    if ext in BLOCKED_EXTENSIONS:
        return False
    return ext in ALLOWED_EXTENSIONS

def generate_unique_code():
    while True:
        code = ''.join([str(secrets.randbelow(10)) for _ in range(10)])
        db = get_db()
        existing = db.execute('SELECT id FROM files WHERE code = ?', (code,)).fetchone()
        db.close()
        if not existing:
            return code

def format_size(size_bytes):
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size_bytes < 1024:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024
    return f"{size_bytes:.1f} GB"

init_db()

# ─────────────────────────────────────────
#  HTML PAGE (inline)
# ─────────────────────────────────────────
HTML = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>VAULT — Secure File Transfer</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg:           #0a0a0b;
      --surface:      #111114;
      --surface2:     #1a1a1f;
      --border:       #2a2a35;
      --border-hi:    #3d3d52;
      --accent:       #e8ff47;
      --accent2:      #47ffe8;
      --accent3:      #ff4778;
      --text:         #f0f0f5;
      --muted:        #666680;
      --dim:          #888899;
      --success:      #47ffe8;
      --error:        #ff4778;
      --mono:         'Space Mono', monospace;
      --sans:         'Syne', sans-serif;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background: var(--bg);
      color: var(--text);
      font-family: var(--sans);
      min-height: 100vh;
      overflow-x: hidden;
    }
    body::before {
      content: '';
      position: fixed; inset: 0;
      background-image:
        linear-gradient(rgba(232,255,71,.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(232,255,71,.03) 1px, transparent 1px);
      background-size: 60px 60px;
      pointer-events: none; z-index: 0;
    }
    body::after {
      content: '';
      position: fixed;
      width: 600px; height: 600px; border-radius: 50%;
      background: radial-gradient(circle, rgba(232,255,71,.04) 0%, transparent 70%);
      top: -200px; right: -200px;
      pointer-events: none; z-index: 0;
    }

    .wrap { position: relative; z-index: 1; max-width: 900px; margin: 0 auto; padding: 0 24px; }

    /* ── HEADER ── */
    header { padding: 32px 0 0; display: flex; align-items: center; justify-content: space-between; }
    .logo { display: flex; align-items: baseline; gap: 10px; }
    .logo-text { font-weight: 800; font-size: 28px; letter-spacing: .15em; color: var(--accent); }
    .logo-tag {
      font-family: var(--mono); font-size: 10px; color: var(--muted);
      letter-spacing: .1em; border: 1px solid var(--border); padding: 2px 6px;
    }
    .status { display: flex; align-items: center; gap: 8px; font-family: var(--mono); font-size: 11px; color: var(--muted); }
    .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--success); box-shadow: 0 0 8px var(--success); animation: pulse 2s infinite; }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }

    /* ── HERO ── */
    .hero { padding: 60px 0 48px; text-align: center; }
    .eyebrow { font-family: var(--mono); font-size: 11px; letter-spacing: .2em; color: var(--muted); margin-bottom: 20px; text-transform: uppercase; }
    h1 { font-size: clamp(36px,7vw,64px); font-weight: 800; line-height: 1.05; letter-spacing: -.02em; margin-bottom: 20px; }
    h1 .hi { color: var(--accent); display: block; }
    .sub { font-family: var(--mono); font-size: 13px; color: var(--muted); line-height: 1.8; max-width: 480px; margin: 0 auto; }

    /* ── TABS ── */
    .tabs { display: flex; border: 1px solid var(--border); border-radius: 2px; overflow: hidden; margin-bottom: 32px; background: var(--surface); }
    .tab {
      flex: 1; padding: 14px 24px; background: transparent; border: none;
      color: var(--muted); font-family: var(--mono); font-size: 12px;
      letter-spacing: .1em; text-transform: uppercase; cursor: pointer; transition: all .2s;
    }
    .tab.on { background: var(--accent); color: var(--bg); font-weight: 700; }
    .tab:not(.on):hover { color: var(--text); background: var(--surface2); }

    /* ── PANELS ── */
    .panel { display: none; animation: up .3s ease; }
    .panel.on { display: block; }
    @keyframes up { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }

    /* ── CARD ── */
    .card { background: var(--surface); border: 1px solid var(--border); border-radius: 4px; overflow: hidden; }
    .card-head { padding: 20px 28px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 12px; }
    .card-icon { width: 32px; height: 32px; background: var(--accent); display: grid; place-items: center; font-size: 16px; flex-shrink: 0; }
    .card-label { font-size: 14px; font-weight: 700; letter-spacing: .05em; }
    .card-hint { font-family: var(--mono); font-size: 11px; color: var(--muted); margin-top: 2px; }
    .card-body { padding: 28px; }

    /* ── DROP ZONE ── */
    .drop {
      border: 2px dashed var(--border); border-radius: 4px; padding: 48px 32px;
      text-align: center; cursor: pointer; transition: all .25s; background: var(--surface2);
    }
    .drop:hover, .drop.over { border-color: var(--accent); background: rgba(232,255,71,.04); }
    .drop.over .drop-icon { transform: scale(1.1) translateY(-4px); }
    .drop-icon { font-size: 40px; margin-bottom: 16px; display: block; transition: transform .2s; }
    .drop-title { font-size: 16px; font-weight: 700; margin-bottom: 8px; }
    .drop-sub { font-family: var(--mono); font-size: 11px; color: var(--muted); line-height: 1.8; }
    #fileInput { display: none; }
    .btn-browse {
      display: inline-block; margin-top: 20px; padding: 10px 24px;
      background: transparent; border: 1px solid var(--accent); color: var(--accent);
      font-family: var(--mono); font-size: 11px; letter-spacing: .1em; text-transform: uppercase;
      cursor: pointer; transition: all .2s;
    }
    .btn-browse:hover { background: var(--accent); color: var(--bg); }

    /* ── SELECTED FILE ── */
    .sel-file {
      display: none; margin-top: 20px; padding: 16px 20px;
      background: var(--bg); border: 1px solid var(--border-hi); border-radius: 2px;
      align-items: center; gap: 16px;
    }
    .sel-file.show { display: flex; }
    .ficon { width: 40px; height: 40px; background: var(--surface2); border: 1px solid var(--border); display: grid; place-items: center; font-size: 18px; flex-shrink: 0; }
    .finfo { flex: 1; min-width: 0; }
    .fname { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .fmeta { font-family: var(--mono); font-size: 11px; color: var(--muted); margin-top: 3px; }
    .btn-x { background: none; border: none; color: var(--muted); cursor: pointer; font-size: 20px; line-height: 1; transition: color .2s; flex-shrink: 0; }
    .btn-x:hover { color: var(--error); }

    /* ── PROGRESS ── */
    .prog { display: none; margin-top: 20px; }
    .prog.show { display: block; }
    .prog-row { display: flex; justify-content: space-between; font-family: var(--mono); font-size: 11px; color: var(--muted); margin-bottom: 8px; }
    .prog-track { height: 4px; background: var(--surface2); border-radius: 2px; overflow: hidden; }
    .prog-fill { height: 100%; background: linear-gradient(90deg,var(--accent),var(--accent2)); border-radius: 2px; width: 0%; transition: width .3s ease; }

    /* ── BUTTONS ── */
    .btn-primary {
      width: 100%; margin-top: 20px; padding: 16px;
      background: var(--accent); border: none; color: var(--bg);
      font-family: var(--sans); font-size: 14px; font-weight: 700;
      letter-spacing: .08em; text-transform: uppercase; cursor: pointer;
      transition: all .2s; display: flex; align-items: center; justify-content: center; gap: 10px;
    }
    .btn-primary:hover:not(:disabled) { background: #d4f700; transform: translateY(-1px); }
    .btn-primary:disabled { opacity: .4; cursor: not-allowed; }

    /* ── RESULT ── */
    .result { display: none; }
    .result.show { display: block; }
    .result-box {
      background: var(--bg); border: 1px solid var(--success); border-radius: 4px;
      padding: 28px; text-align: center; position: relative; overflow: hidden;
    }
    .result-box::before {
      content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
      background: linear-gradient(90deg,var(--accent),var(--success),var(--accent2));
    }
    .r-check { font-size: 36px; margin-bottom: 12px; display: block; }
    .r-title { font-size: 18px; font-weight: 800; color: var(--success); letter-spacing: .05em; margin-bottom: 8px; }
    .r-sub { font-family: var(--mono); font-size: 11px; color: var(--muted); margin-bottom: 28px; }
    .code-row { display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
    .code-val {
      font-family: var(--mono); font-size: clamp(22px,5vw,36px); font-weight: 700;
      letter-spacing: .25em; color: var(--accent); background: var(--surface);
      border: 1px solid var(--border-hi); border-right: none; padding: 14px 24px; flex: 1; text-align: center;
    }
    .btn-copy {
      padding: 14px 20px; background: var(--surface2); border: 1px solid var(--border-hi);
      color: var(--text); font-family: var(--mono); font-size: 11px; cursor: pointer; transition: all .2s; white-space: nowrap;
    }
    .btn-copy:hover { background: var(--accent); color: var(--bg); border-color: var(--accent); }
    .btn-copy.ok { background: var(--success); color: var(--bg); border-color: var(--success); }
    .warn { font-family: var(--mono); font-size: 10px; color: var(--accent3); letter-spacing: .05em; display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 12px; }
    .btn-again { margin-top: 20px; padding: 10px 24px; background: transparent; border: 1px solid var(--border-hi); color: var(--muted); font-family: var(--mono); font-size: 11px; letter-spacing: .1em; cursor: pointer; transition: all .2s; }
    .btn-again:hover { border-color: var(--text); color: var(--text); }

    /* ── RETRIEVE ── */
    .code-row-input { display: flex; gap: 0; margin-bottom: 8px; }
    .code-in {
      flex: 1; padding: 16px 20px; background: var(--surface2); border: 1px solid var(--border);
      border-right: none; color: var(--text); font-family: var(--mono); font-size: 20px;
      letter-spacing: .2em; outline: none; transition: border-color .2s;
    }
    .code-in::placeholder { color: var(--muted); letter-spacing: .1em; }
    .code-in:focus { border-color: var(--accent); }
    .btn-search {
      padding: 16px 28px; background: var(--accent); border: none; color: var(--bg);
      font-family: var(--mono); font-size: 12px; font-weight: 700; letter-spacing: .1em;
      text-transform: uppercase; cursor: pointer; transition: all .2s; white-space: nowrap;
    }
    .btn-search:hover:not(:disabled) { background: #d4f700; }
    .btn-search:disabled { opacity: .5; cursor: not-allowed; }
    .hint { font-family: var(--mono); font-size: 10px; color: var(--muted); margin-bottom: 24px; }

    /* ── FILE FOUND ── */
    .found { display: none; }
    .found.show { display: block; }
    .found-box { background: var(--bg); border: 1px solid var(--border-hi); border-radius: 4px; overflow: hidden; }
    .found-head { padding: 20px 24px; background: var(--surface2); border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 12px; }
    .found-ico { font-size: 28px; }
    .found-name { font-size: 16px; font-weight: 700; word-break: break-all; }
    .meta-grid { padding: 20px 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .ml { font-family: var(--mono); font-size: 10px; color: var(--muted); letter-spacing: .1em; text-transform: uppercase; margin-bottom: 4px; }
    .mv { font-size: 13px; font-weight: 600; }
    .one-time-notice { margin: 0 24px 20px; padding: 12px 16px; background: rgba(255,71,120,.08); border: 1px solid rgba(255,71,120,.3); border-radius: 2px; font-family: var(--mono); font-size: 11px; color: var(--accent3); display: flex; align-items: center; gap: 8px; }
    .btn-dl {
      display: flex; align-items: center; justify-content: center; gap: 10px;
      width: calc(100% - 48px); margin: 0 24px 24px; padding: 16px;
      background: var(--accent); border: none; color: var(--bg);
      font-family: var(--sans); font-size: 14px; font-weight: 700;
      letter-spacing: .08em; text-transform: uppercase; cursor: pointer; transition: all .2s;
    }
    .btn-dl:hover { background: #d4f700; transform: translateY(-1px); }

    /* ── ALERTS ── */
    .alert { display: none; padding: 14px 18px; border-radius: 2px; font-family: var(--mono); font-size: 12px; margin-top: 16px; align-items: center; gap: 10px; }
    .alert.show { display: flex; }
    .alert-err { background: rgba(255,71,120,.1); border: 1px solid rgba(255,71,120,.4); color: var(--error); }
    .alert-ok  { background: rgba(71,255,232,.1); border: 1px solid rgba(71,255,232,.4); color: var(--success); }

    /* ── FEATURES ── */
    .feats { display: flex; border: 1px solid var(--border); margin-top: 48px; overflow: hidden; }
    .feat { flex: 1; padding: 20px 16px; text-align: center; border-right: 1px solid var(--border); }
    .feat:last-child { border-right: none; }
    .feat-ico { font-size: 20px; margin-bottom: 8px; display: block; }
    .feat-label { font-size: 12px; font-weight: 700; letter-spacing: .05em; margin-bottom: 4px; }
    .feat-desc { font-family: var(--mono); font-size: 10px; color: var(--muted); line-height: 1.6; }

    /* ── FOOTER ── */
    footer { padding: 40px 0 32px; text-align: center; border-top: 1px solid var(--border); margin-top: 64px; }
    footer p { font-family: var(--mono); font-size: 11px; color: var(--muted); }
    footer span { color: var(--accent); }

    /* ── SPINNER ── */
    .spin { width: 16px; height: 16px; border: 2px solid rgba(0,0,0,.2); border-top-color: var(--bg); border-radius: 50%; animation: rot .6s linear infinite; display: inline-block; }
    @keyframes rot { to{transform:rotate(360deg)} }

    @media (max-width: 640px) {
      .feats { flex-direction: column; }
      .feat { border-right: none; border-bottom: 1px solid var(--border); }
      .feat:last-child { border-bottom: none; }
      .meta-grid { grid-template-columns: 1fr; }
      .code-row-input { flex-direction: column; }
      .code-in { border-right: 1px solid var(--border); }
      .btn-search { width: 100%; }
    }
  </style>
</head>
<body>
<div class="wrap">

  <header>
    <div class="logo">
      <span class="logo-text">VAULT</span>
      <span class="logo-tag">v1.0</span>
    </div>
    <div class="status"><span class="dot"></span>SYSTEM ONLINE</div>
  </header>

  <section class="hero">
    <p class="eyebrow">// ENCRYPTED FILE TRANSFER SYSTEM</p>
    <h1>Share Files.<br><span class="hi">Leave No Trace.</span></h1>
    <p class="sub">Upload any file up to 50 MB. Receive a 10-digit access code.<br>One download. Then gone forever.</p>
  </section>

  <!-- TABS -->
  <div class="tabs">
    <button class="tab on" onclick="switchTab('upload')">⬆ Upload File</button>
    <button class="tab"    onclick="switchTab('retrieve')">⬇ Retrieve File</button>
  </div>

  <!-- ════════════════ UPLOAD PANEL ════════════════ -->
  <div class="panel on" id="pUpload">
    <div class="card">
      <div class="card-head">
        <div class="card-icon">📤</div>
        <div>
          <div class="card-label">Upload File</div>
          <div class="card-hint">Max 50 MB · One-time download · 24 h expiry</div>
        </div>
      </div>
      <div class="card-body">

        <div id="uploadForm">
          <!-- drop zone -->
          <div class="drop" id="dropZone" onclick="document.getElementById('fileInput').click()">
            <span class="drop-icon">📦</span>
            <div class="drop-title">Drop file here or click to browse</div>
            <div class="drop-sub">PDF, Images, Video, Audio, Archives, Documents &amp; more<br>Maximum file size: 50 MB</div>
            <button class="btn-browse" onclick="event.stopPropagation();document.getElementById('fileInput').click()">Choose File</button>
          </div>
          <input type="file" id="fileInput" />

          <!-- selected file preview -->
          <div class="sel-file" id="selFile">
            <div class="ficon" id="fIcon">📄</div>
            <div class="finfo">
              <div class="fname" id="fName">—</div>
              <div class="fmeta" id="fMeta">—</div>
            </div>
            <button class="btn-x" onclick="clearFile()">×</button>
          </div>

          <!-- progress -->
          <div class="prog" id="prog">
            <div class="prog-row"><span id="progTxt">Uploading…</span><span id="progPct">0%</span></div>
            <div class="prog-track"><div class="prog-fill" id="progFill"></div></div>
          </div>

          <div class="alert alert-err" id="upErr"></div>

          <button class="btn-primary" id="upBtn" onclick="uploadFile()" disabled>
            <span>⬆</span> Secure Upload
          </button>
        </div>

        <!-- success result -->
        <div class="result" id="uploadResult">
          <div class="result-box">
            <span class="r-check">✅</span>
            <div class="r-title">UPLOAD SUCCESSFUL</div>
            <p class="r-sub" id="rSub">Your file is ready to share</p>
            <p style="font-family:var(--mono);font-size:11px;color:var(--muted);margin-bottom:12px;letter-spacing:.05em;">ACCESS CODE</p>
            <div class="code-row">
              <div class="code-val" id="genCode">0000000000</div>
              <button class="btn-copy" id="cpyBtn" onclick="copyCode()">COPY</button>
            </div>
            <div class="warn">⚠ ONE-TIME DOWNLOAD — File deleted after first access</div>
          </div>
          <button class="btn-again" onclick="resetUpload()">+ Upload Another File</button>
        </div>

      </div>
    </div>
  </div>

  <!-- ════════════════ RETRIEVE PANEL ════════════════ -->
  <div class="panel" id="pRetrieve">
    <div class="card">
      <div class="card-head">
        <div class="card-icon">🔍</div>
        <div>
          <div class="card-label">Retrieve File</div>
          <div class="card-hint">Enter the 10-digit code to access your file</div>
        </div>
      </div>
      <div class="card-body">

        <div class="code-row-input">
          <input class="code-in" id="codeIn" type="text" placeholder="0000000000"
                 maxlength="10" oninput="onCodeInput()" onkeydown="if(event.key==='Enter')retrieveFile()" />
          <button class="btn-search" id="srchBtn" onclick="retrieveFile()" disabled>SEARCH</button>
        </div>
        <p class="hint">// Enter the exact 10-digit numeric code provided by the sender</p>

        <div class="alert alert-err" id="retErr"></div>

        <div class="found" id="fileFound">
          <div class="found-box">
            <div class="found-head">
              <span class="found-ico" id="foundIco">📄</span>
              <div>
                <div class="found-name" id="foundName">—</div>
                <div style="font-family:var(--mono);font-size:11px;color:var(--muted);margin-top:4px;">File found — ready to download</div>
              </div>
            </div>
            <div class="meta-grid">
              <div><div class="ml">File Size</div><div class="mv" id="foundSize">—</div></div>
              <div><div class="ml">Uploaded</div><div class="mv" id="foundDate">—</div></div>
              <div><div class="ml">Type</div><div class="mv" id="foundType">—</div></div>
              <div><div class="ml">Status</div><div class="mv" style="color:var(--success)">Available</div></div>
            </div>
            <div class="one-time-notice">⚠ This file will be permanently deleted after you download it</div>
            <button class="btn-dl" id="dlBtn" onclick="downloadFile()"><span>⬇</span> Download File</button>
          </div>
        </div>

      </div>
    </div>
  </div>

  <!-- FEATURES -->
  <div class="feats">
    <div class="feat"><span class="feat-ico">🔒</span><div class="feat-label">One-Time Access</div><div class="feat-desc">File is destroyed<br>after first download</div></div>
    <div class="feat"><span class="feat-ico">⏱</span><div class="feat-label">24 h Expiry</div><div class="feat-desc">Files auto-expire<br>after 24 hours</div></div>
    <div class="feat"><span class="feat-ico">🎲</span><div class="feat-label">Secure Codes</div><div class="feat-desc">Cryptographically<br>random 10-digit codes</div></div>
    <div class="feat"><span class="feat-ico">🛡</span><div class="feat-label">No Direct URLs</div><div class="feat-desc">Files inaccessible<br>without valid code</div></div>
  </div>

  <footer><p>VAULT — Secure File Transfer &nbsp;·&nbsp; <span>One transfer. No traces.</span></p></footer>

</div><!-- /wrap -->

<script>
  let selFile = null, curCode = null, curRetCode = null;

  /* ── TABS ── */
  function switchTab(t) {
    document.querySelectorAll('.tab').forEach((b,i)=> b.classList.toggle('on',(i===0&&t==='upload')||(i===1&&t==='retrieve')));
    document.getElementById('pUpload').classList.toggle('on',t==='upload');
    document.getElementById('pRetrieve').classList.toggle('on',t==='retrieve');
  }

  /* ── DRAG & DROP ── */
  const dz = document.getElementById('dropZone');
  dz.addEventListener('dragover', e=>{ e.preventDefault(); dz.classList.add('over'); });
  dz.addEventListener('dragleave', ()=> dz.classList.remove('over'));
  dz.addEventListener('drop', e=>{ e.preventDefault(); dz.classList.remove('over'); if(e.dataTransfer.files[0]) pickFile(e.dataTransfer.files[0]); });
  document.getElementById('fileInput').addEventListener('change', e=>{ if(e.target.files[0]) pickFile(e.target.files[0]); });

  /* ── FILE ICONS ── */
  function ico(name) {
    const m = { pdf:'📕',png:'🖼',jpg:'🖼',jpeg:'🖼',gif:'🎨',webp:'🖼',svg:'🎨',
      mp4:'🎬',mov:'🎬',avi:'🎬',mp3:'🎵',wav:'🎵',
      zip:'📦',tar:'📦',gz:'📦',rar:'📦','7z':'📦',
      doc:'📝',docx:'📝',xls:'📊',xlsx:'📊',ppt:'📊',pptx:'📊',
      txt:'📄',md:'📄',csv:'📊',json:'⚙',xml:'⚙',py:'🐍',js:'⚡',html:'🌐',css:'🎨' };
    return m[(name.split('.').pop()||'').toLowerCase()] || '📄';
  }

  function fmtBytes(b) {
    if(b<1024) return b+' B';
    if(b<1048576) return (b/1024).toFixed(1)+' KB';
    return (b/1048576).toFixed(2)+' MB';
  }

  function pickFile(f) {
    hideAlert('upErr');
    if(f.size > 50*1024*1024){ showAlert('upErr',`File too large: ${fmtBytes(f.size)}. Max is 50 MB.`); return; }
    if(f.size === 0){ showAlert('upErr','Cannot upload an empty file.'); return; }
    selFile = f;
    document.getElementById('fIcon').textContent = ico(f.name);
    document.getElementById('fName').textContent = f.name;
    document.getElementById('fMeta').textContent = `${fmtBytes(f.size)} · ${f.type||'Unknown type'}`;
    document.getElementById('selFile').classList.add('show');
    document.getElementById('upBtn').disabled = false;
  }

  function clearFile() {
    selFile = null;
    document.getElementById('fileInput').value = '';
    document.getElementById('selFile').classList.remove('show');
    document.getElementById('upBtn').disabled = true;
    hideAlert('upErr');
  }

  /* ── ALERTS ── */
  function showAlert(id, msg, type='err') {
    const el = document.getElementById(id);
    el.innerHTML = `<span>${type==='err'?'⚠':'✓'}</span> ${msg}`;
    el.className = `alert ${type==='err'?'alert-err':'alert-ok'} show`;
  }
  function hideAlert(id) { document.getElementById(id).classList.remove('show'); }

  /* ── UPLOAD ── */
  async function uploadFile() {
    if(!selFile) return;
    const btn = document.getElementById('upBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spin"></span> Uploading…';
    hideAlert('upErr');

    const fd = new FormData();
    fd.append('file', selFile);

    const prog = document.getElementById('prog');
    const fill = document.getElementById('progFill');
    const pct  = document.getElementById('progPct');
    const ptxt = document.getElementById('progTxt');
    prog.classList.add('show');

    let fp = 0;
    const iv = setInterval(()=>{ fp = Math.min(fp + Math.random()*15, 85); fill.style.width=fp+'%'; pct.textContent=Math.round(fp)+'%'; }, 200);

    try {
      const res  = await fetch('/api/upload', { method:'POST', body:fd });
      const data = await res.json();
      clearInterval(iv);

      if(!res.ok || !data.success) {
        prog.classList.remove('show');
        btn.disabled = false;
        btn.innerHTML = '<span>⬆</span> Secure Upload';
        showAlert('upErr', data.error || 'Upload failed. Please try again.');
        return;
      }

      fill.style.width = '100%'; pct.textContent = '100%'; ptxt.textContent = 'Upload complete!';

      setTimeout(()=>{
        curCode = data.code;
        document.getElementById('genCode').textContent = data.code;
        document.getElementById('rSub').textContent = `${data.filename} · ${data.size} · Expires in ${data.expires}`;
        document.getElementById('uploadForm').style.display = 'none';
        document.getElementById('uploadResult').classList.add('show');
      }, 500);

    } catch(e) {
      clearInterval(iv);
      prog.classList.remove('show');
      btn.disabled = false;
      btn.innerHTML = '<span>⬆</span> Secure Upload';
      showAlert('upErr','Network error. Please check your connection.');
    }
  }

  function copyCode() {
    if(!curCode) return;
    navigator.clipboard.writeText(curCode).then(()=>{
      const b = document.getElementById('cpyBtn');
      b.textContent = '✓ COPIED'; b.classList.add('ok');
      setTimeout(()=>{ b.textContent='COPY'; b.classList.remove('ok'); }, 2000);
    });
  }

  function resetUpload() {
    selFile = null; curCode = null;
    document.getElementById('fileInput').value = '';
    document.getElementById('selFile').classList.remove('show');
    document.getElementById('prog').classList.remove('show');
    document.getElementById('progFill').style.width = '0%';
    document.getElementById('upBtn').disabled = true;
    document.getElementById('upBtn').innerHTML = '<span>⬆</span> Secure Upload';
    document.getElementById('uploadForm').style.display = 'block';
    document.getElementById('uploadResult').classList.remove('show');
    hideAlert('upErr');
  }

  /* ── RETRIEVE ── */
  function onCodeInput() {
    const v = document.getElementById('codeIn').value.replace(/\\D/g,'');
    document.getElementById('codeIn').value = v;
    document.getElementById('srchBtn').disabled = v.length !== 10;
    if(v.length < 10) { document.getElementById('fileFound').classList.remove('show'); hideAlert('retErr'); }
  }

  async function retrieveFile() {
    const code = document.getElementById('codeIn').value.trim();
    if(code.length !== 10) return;
    const btn = document.getElementById('srchBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spin" style="border-top-color:#0a0a0b"></span>';
    document.getElementById('fileFound').classList.remove('show');
    hideAlert('retErr');

    try {
      const res  = await fetch(`/api/retrieve/${code}`);
      const data = await res.json();
      btn.disabled = false; btn.textContent = 'SEARCH';

      if(!res.ok || !data.success) {
        showAlert('retErr', data.error || 'File not found. Please check your code.');
        return;
      }
      curRetCode = code;
      document.getElementById('foundIco').textContent  = ico(data.filename);
      document.getElementById('foundName').textContent = data.filename;
      document.getElementById('foundSize').textContent = data.size;
      document.getElementById('foundDate').textContent = data.uploaded;
      document.getElementById('foundType').textContent = data.file_type || 'Unknown';
      document.getElementById('fileFound').classList.add('show');

    } catch(e) {
      btn.disabled = false; btn.textContent = 'SEARCH';
      showAlert('retErr','Network error. Please try again.');
    }
  }

  function downloadFile() {
    if(!curRetCode) return;
    const btn = document.getElementById('dlBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spin" style="border-top-color:#0a0a0b"></span> Downloading…';

    const a = document.createElement('a');
    a.href = `/api/download/${curRetCode}`;
    a.style.display = 'none';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);

    setTimeout(()=>{
      document.getElementById('fileFound').classList.remove('show');
      document.getElementById('codeIn').value = '';
      document.getElementById('srchBtn').disabled = true;
      curRetCode = null;
      const el = document.getElementById('retErr');
      el.className = 'alert alert-ok show';
      el.innerHTML = '<span>✓</span> Download started! This file is now permanently deleted from our servers.';
    }, 1500);
  }
</script>
</body>
</html>"""

# ─────────────────────────────────────────
#  ROUTES
# ─────────────────────────────────────────
@app.route('/')
def index():
    # Serve index.html from the same folder as app.py
    html_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'index.html')
    with open(html_path, 'r', encoding='utf-8') as f:
        return f.read()

@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    original_filename = file.filename

    if not allowed_file(original_filename):
        ext = original_filename.rsplit('.', 1)[-1].lower() if '.' in original_filename else 'unknown'
        if ext in BLOCKED_EXTENSIONS:
            return jsonify({'error': f'File type .{ext} is not allowed for security reasons'}), 400
        return jsonify({'error': 'File type not supported'}), 400

    file_content = file.read()
    file_size = len(file_content)

    if file_size > 50 * 1024 * 1024:
        return jsonify({'error': 'File size exceeds 50 MB limit'}), 400
    if file_size == 0:
        return jsonify({'error': 'Empty file not allowed'}), 400

    file_hash = hashlib.sha256(file_content + secrets.token_bytes(16)).hexdigest()[:16]
    ext = secure_filename(original_filename).rsplit('.', 1)[-1].lower()
    stored_filename = f"{file_hash}.{ext}"
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], stored_filename)

    with open(file_path, 'wb') as f:
        f.write(file_content)

    code = generate_unique_code()
    upload_time = datetime.utcnow().isoformat()
    expiry_time = (datetime.utcnow() + timedelta(hours=24)).isoformat()
    file_type = mimetypes.guess_type(original_filename)[0] or 'application/octet-stream'

    db = get_db()
    try:
        db.execute('''
            INSERT INTO files (filename, original_filename, file_path, file_size, file_type,
                               upload_time, expiry_time, code, downloaded, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 1)
        ''', (stored_filename, original_filename, file_path, file_size,
              file_type, upload_time, expiry_time, code))
        db.commit()
    except Exception:
        os.remove(file_path)
        return jsonify({'error': 'Database error'}), 500
    finally:
        db.close()

    return jsonify({
        'success': True,
        'code': code,
        'filename': original_filename,
        'size': format_size(file_size),
        'expires': '24 hours'
    })

@app.route('/api/retrieve/<code>', methods=['GET'])
def retrieve_file_info(code):
    if not code.isdigit() or len(code) != 10:
        return jsonify({'error': 'Invalid code format'}), 400

    db = get_db()
    rec = db.execute('SELECT * FROM files WHERE code = ? AND is_active = 1', (code,)).fetchone()
    db.close()

    if not rec:
        return jsonify({'error': 'File not found. Please check your code.'}), 404

    if datetime.utcnow() > datetime.fromisoformat(rec['expiry_time']):
        db = get_db()
        db.execute('UPDATE files SET is_active = 0 WHERE code = ?', (code,))
        db.commit(); db.close()
        return jsonify({'error': 'This file has expired and is no longer available.'}), 410

    if rec['downloaded']:
        return jsonify({'error': 'This file has already been downloaded and is no longer available.'}), 410

    return jsonify({
        'success': True,
        'filename': rec['original_filename'],
        'size': format_size(rec['file_size']),
        'file_type': rec['file_type'],
        'uploaded': rec['upload_time'][:10],
        'code': code,
        'one_time': True
    })

@app.route('/api/download/<code>', methods=['GET'])
def download_file(code):
    if not code.isdigit() or len(code) != 10:
        abort(400)

    db = get_db()
    rec = db.execute('SELECT * FROM files WHERE code = ? AND is_active = 1', (code,)).fetchone()

    if not rec:                           db.close(); abort(404)
    if rec['downloaded']:                 db.close(); abort(410)
    if datetime.utcnow() > datetime.fromisoformat(rec['expiry_time']):
        db.execute('UPDATE files SET is_active = 0 WHERE code = ?', (code,))
        db.commit(); db.close(); abort(410)
    if not os.path.exists(rec['file_path']): db.close(); abort(404)

    # Mark inactive BEFORE sending
    db.execute('UPDATE files SET downloaded = 1, is_active = 0, download_time = ? WHERE code = ?',
               (datetime.utcnow().isoformat(), code))
    db.commit(); db.close()

    return send_file(
        rec['file_path'],
        as_attachment=True,
        download_name=rec['original_filename'],
        mimetype=rec['file_type']
    )

@app.errorhandler(413)
def too_large(e):
    return jsonify({'error': 'File size exceeds the 50 MB maximum limit'}), 413

# ─────────────────────────────────────────
#  ENTRY POINT
# ─────────────────────────────────────────
if __name__ == '__main__':
    print("\n  ╔══════════════════════════════╗")
    print("  ║   VAULT - Secure File Share  ║")
    print("  ╚══════════════════════════════╝")
    print(f"  ► http://localhost:5000\n")
    app.run(debug=True, port=5000)
