#!/bin/bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/Backend"
FRONTEND_DIR="$PROJECT_DIR/Frontend"
SYMLINK_DIR="/tmp/tron_frontend_public"
NGINX_CONF="/tmp/tron_nginx.conf"

# Load NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use v20.20.2 > /dev/null 2>&1

echo -e "${YELLOW}=== TRON V26 ===${NC}"

# Cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}Остановка...${NC}"
    pkill -f "node $BACKEND_DIR/server.js" 2>/dev/null || true
    nginx -s stop -c "$NGINX_CONF" 2>/dev/null || true
    rm -f "$SYMLINK_DIR" 2>/dev/null || true
    echo -e "${GREEN}Готово${NC}"
    exit 0
}
trap cleanup SIGINT SIGTERM

# 1. Build frontend
echo -e "\n${YELLOW}[1/3] Сборка Frontend...${NC}"
cd "$FRONTEND_DIR"
if [ ! -f "public/bundle.js" ]; then
    npm run build 2>&1 | tail -3
fi
echo -e "${GREEN}✓ bundle.js готов${NC}"

# 2. Start Backend
echo -e "\n${YELLOW}[2/3] Запуск Backend...${NC}"
cd "$BACKEND_DIR"
PORT=3000 NODE_ENV=production node server.js > /tmp/tron_backend.log 2>&1 &
BACKEND_PID=$!
sleep 2

if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${RED}✗ Backend упал, лог:${NC}"
    tail -10 /tmp/tron_backend.log
    exit 1
fi
echo -e "${GREEN}✓ Backend запущен на :3000 (PID: $BACKEND_PID)${NC}"

# 3. Create symlink to avoid nginx issues with spaces/brackets in path
rm -f "$SYMLINK_DIR"
ln -s "$FRONTEND_DIR/public" "$SYMLINK_DIR"

# 4. Generate nginx config
cat > "$NGINX_CONF" <<EOF
pid /tmp/tron_nginx.pid;
error_log /tmp/tron_nginx_error.log warn;

events {
    worker_connections 256;
}

http {
    include /opt/homebrew/etc/nginx/mime.types;
    default_type application/octet-stream;

    access_log /tmp/tron_nginx_access.log;

    sendfile on;
    keepalive_timeout 65;

    upstream backend {
        server localhost:3000;
    }

    # Frontend — port 8080
    server {
        listen 8080;
        server_name localhost;

        root $SYMLINK_DIR;
        index index.html;

        # Proxy API and backend routes to backend
        location ~ ^/(api|send_connection_data|send_signedTx|send_message|get_unsigned_tx)(/.*)?$ {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_redirect off;
        }

        # Static files
        location / {
            try_files \$uri \$uri/ /index.html;
        }
    }

    # Backend API — port 80
    server {
        listen 80;
        server_name localhost;

        location / {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_redirect off;
        }
    }
}
EOF

# 5. Start Nginx
echo -e "\n${YELLOW}[3/3] Запуск Nginx...${NC}"
nginx -c "$NGINX_CONF"
sleep 1
echo -e "${GREEN}✓ Nginx запущен${NC}"

echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Frontend → http://localhost:8080${NC}"
echo -e "${GREEN}  Backend  → http://localhost${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "\n${YELLOW}Логи:${NC}"
echo -e "  Backend: tail -f /tmp/tron_backend.log"
echo -e "  Nginx:   tail -f /tmp/tron_nginx_error.log"
echo -e "\n${YELLOW}Ctrl+C для остановки${NC}\n"

wait $BACKEND_PID
