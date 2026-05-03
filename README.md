# PrompterNG

> A modern, self-hosted, offline-first browser-based prompter with Remote Control — Arabic & English support, Markdown rendering, and full privacy.

Based on [TelePrompter v1.2.2](https://github.com/manifestinteractive/teleprompter) by Peter Schmalfeldt — extended and modernized by [Mohammed Besar](https://github.com/mmBesar).

---

## Features

- ✅ **Arabic & English support** — Full RTL/LTR auto-detection per paragraph, mixed text works perfectly
- ✅ **Markdown rendering** — Write your scripts in Markdown, rendered beautifully on the display
- ✅ **Remote Control** — Control the prompter from any device on your network
- ✅ **Send script from remote** — Type or paste Markdown on your phone and send it to the display
- ✅ **Edit / Preview mode** — Edit raw Markdown, switch to rendered preview with one click
- ✅ **Fullscreen mode** — Clean display with no UI, exit button always accessible
- ✅ **Text width control** — Narrow the text column for less eye movement on camera
- ✅ **Fading focus overlay** — Soft gradient focus area, not harsh black bars
- ✅ **Offline-first** — All assets bundled locally, no internet required after setup
- ✅ **Self-hosted** — Runs entirely on your home server via Docker
- ✅ **Nginx reverse proxy ready** — Works cleanly behind your existing proxy setup
- ✅ **PWA** — Add to home screen on mobile for fullscreen app experience
- ✅ **Noto Sans Arabic** — Bundled font, beautiful for both Arabic and Latin scripts

---

## Keyboard Shortcuts

### Server (Display) Page

| Key | Action |
|-----|--------|
| `Space` | Play / Pause |
| `Escape` | Reset |
| `↑` | Scroll up |
| `↓` | Scroll down |
| `←` / `Page Up` | Speed down |
| `→` / `Page Down` | Speed up |
| `Alt + ↑` | Font size increase |
| `Alt + ↓` | Font size decrease |
| `Alt + F` | Toggle fullscreen |
| `Alt + E` | Toggle edit / preview |
| `[` | Decrease text width |
| `]` | Increase text width |

### Remote Page

| Key | Action |
|-----|--------|
| `Space` | Play / Pause |
| `↑` | Scroll up |
| `↓` | Scroll down |
| `←` | Speed down |
| `→` | Speed up |
| `Alt + ↑` | Font size increase |
| `Alt + ↓` | Font size decrease |
| `Alt + F` | Toggle fullscreen (remote page) |

---

## Installation

### Requirements

- Docker
- Docker Compose
- Nginx reverse proxy (optional but recommended)

### Quick Start

```bash
git clone https://github.com/mmBesar/PrompterNG.git
cd PrompterNG
docker compose up -d
```

Then open `http://YOUR_SERVER_IP:3000` in your browser.

### With Nginx Reverse Proxy

Add to your existing compose file:

```yaml
  prompterng:
    image: ghcr.io/mmbesar/prompterng:latest
    container_name: prompterng
    command: server
    networks:
      - your_network
    ports:
      - '3000:3000'
    restart: unless-stopped

  prompterng-remote:
    image: ghcr.io/mmbesar/prompterng:latest
    container_name: prompterng-remote
    command: client
    networks:
      - your_network
    ports:
      - '8080:8080'
    restart: unless-stopped
```

Nginx config:

```nginx
server {
    listen 80;
    listen 443 ssl;
    http2 on;

    set $upstream_app prompterng-remote;
    set $upstream_port 8080;
    set $upstream_proto http;

    set $upstream_ws prompterng;
    set $upstream_ws_port 3000;

    server_name prompterng.*;

    # WebSocket — remote control
    location /socket.io/ {
        include /config/nginx/resolver.conf;
        proxy_pass http://$upstream_ws:$upstream_ws_port;

        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }

    # Web UI
    location / {
        include /config/nginx/resolver.conf;
        proxy_pass $upstream_proto://$upstream_app:$upstream_port;

        proxy_set_header Host $host;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $http_connection;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Usage

### Display Page
Open `https://your-domain` on the screen you want to use as a prompter.

- Click the **edit icon** to switch to Markdown editor mode
- Write or paste your script in Markdown
- Click the **edit icon** again to render and display
- Hit **Space** or the **play button** to start scrolling

### Remote Control
Open `https://your-domain/remote` on your phone or tablet.

- Enter the 6-character Remote ID shown on the display page
- Or scan the QR code
- Control play, speed, font size, scroll position and text width from the remote
- Use **✏️ Edit Script** to send a new script to the display

### Script Format (Markdown)

```markdown
# عنوان المقطع

## Ubuntu 26.04

سوف نتحدث اليوم عن توزيعة **Ubuntu 26.04** طويلة الدعم.

### التفاصيل

This is a mixed Arabic and English paragraph — النص العربي والإنجليزي معاً.
```

---

## Development

```bash
# Build image locally
docker build -t prompterng .

# Run locally for testing
docker compose up -d
```

---

## Credits

- Original project: [TelePrompter](https://github.com/manifestinteractive/teleprompter) by [Peter Schmalfeldt](https://github.com/manifestinteractive) — MIT License
- Arabic bidirectional support: [marked-bidi](https://github.com/markedjs/marked-bidi)
- Markdown rendering: [marked](https://github.com/markedjs/marked)
- Font: [Noto Sans Arabic](https://fonts.google.com/noto/specimen/Noto+Sans+Arabic) by Google Fonts

---

## License

MIT License — see [LICENSE](LICENSE) for details.

Original work Copyright (c) 2015 Manifest Interactive
Modified work Copyright (c) 2026 Mohammed Besar