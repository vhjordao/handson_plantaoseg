#!/usr/bin/env bash
# PlantãoSeguro: protege o servidor. Quem roda é o Victor, uma vez, com a chave SSH já funcionando.
# Login só por chave, firewall só com 22, 80 e 443, e 2 GB de swap. Rodar de novo não muda nada.
# As mensagens ficam sem acento: no PowerShell 5.1 o acento chega trocado por este caminho.
set -euo pipefail

# Sem chave instalada, fechar a senha deixaria o servidor sem acesso.
if ! grep -qE '^(ssh-ed25519|ecdsa-sha2-|ssh-rsa) ' /root/.ssh/authorized_keys 2>/dev/null; then
  echo "Nenhuma chave em /root/.ssh/authorized_keys. Nada foi alterado." >&2
  exit 1
fi

# O prefixo 00 vem antes de 50-cloud-init.conf, que liga a senha: no sshd vale o primeiro valor lido.
cat > /etc/ssh/sshd_config.d/00-plantaoseguro.conf <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin prohibit-password
EOF
chmod 644 /etc/ssh/sshd_config.d/00-plantaoseguro.conf
sshd -t
systemctl reload ssh
echo "SSH: login por senha desligado"

# O Docker publica portas por fora do ufw: o Compose só pode publicar 80, 443 e o que for 127.0.0.1.
ufw default deny incoming >/dev/null
ufw default allow outgoing >/dev/null
ufw allow 22/tcp >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
ufw --force enable >/dev/null
echo "Firewall: ligado, com 22, 80 e 443"

# Com 1 vCPU e 3,8 GB, a swap evita que um pico de memória derrube serviços na apresentação.
if ! swapon --show=NAME --noheadings | grep -qx /swapfile; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
fi
grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
echo 'vm.swappiness=10' > /etc/sysctl.d/99-plantaoseguro.conf
sysctl -q -p /etc/sysctl.d/99-plantaoseguro.conf
echo "Swap: 2 GB"

echo
sshd -T | grep -Ei '^(permitrootlogin|passwordauthentication|kbdinteractiveauthentication) '
ufw status | grep -E '^(Status|22|80|443)'
swapon --show
echo
echo "Pronto."
