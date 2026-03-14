#!/usr/bin/env bash
# DepVault CLI installer for Linux and macOS
# Usage: curl -fsSL https://get.depvault.com | bash

set -euo pipefail

REPO="suxrobGM/depvault"
INSTALL_DIR="${DEPVAULT_INSTALL_DIR:-$HOME/.depvault/bin}"
BINARY_NAME="depvault"

info() { printf "\033[0;32m%s\033[0m\n" "$1"; }
error() { printf "\033[0;31mError: %s\033[0m\n" "$1" >&2; exit 1; }

detect_platform() {
  local os arch rid

  os="$(uname -s)"
  arch="$(uname -m)"

  case "$os" in
    Linux*)  os="linux" ;;
    Darwin*) os="osx" ;;
    *)       error "Unsupported OS: $os" ;;
  esac

  case "$arch" in
    x86_64|amd64) arch="x64" ;;
    arm64|aarch64) arch="arm64" ;;
    *)             error "Unsupported architecture: $arch" ;;
  esac

  rid="${os}-${arch}"

  # linux-arm64 is not in the release matrix
  if [ "$rid" = "linux-arm64" ]; then
    error "linux-arm64 builds are not available yet. Please build from source."
  fi

  echo "$rid"
}

get_latest_version() {
  local version
  version=$(curl -fsSL "https://api.github.com/repos/${REPO}/releases" \
    | grep -o '"tag_name": *"cli/v[^"]*"' \
    | head -1 \
    | sed 's/.*"cli\/\(v[^"]*\)".*/\1/')

  if [ -z "$version" ]; then
    error "Could not determine the latest CLI version. Check https://github.com/${REPO}/releases"
  fi

  echo "$version"
}

download_and_install() {
  local rid="$1"
  local version="$2"
  local tag="cli/${version}"
  local archive="depvault-${rid}.tar.gz"
  local url="https://github.com/${REPO}/releases/download/${tag}/${archive}"
  local tmp_dir

  tmp_dir="$(mktemp -d)"
  trap 'rm -rf "$tmp_dir"' EXIT

  info "Downloading DepVault CLI ${version} for ${rid}..."
  if ! curl -fsSL -o "${tmp_dir}/${archive}" "$url"; then
    error "Download failed. Check that the release exists: $url"
  fi

  info "Extracting to ${INSTALL_DIR}..."
  mkdir -p "$INSTALL_DIR"
  tar -xzf "${tmp_dir}/${archive}" -C "$INSTALL_DIR"
  chmod +x "${INSTALL_DIR}/${BINARY_NAME}"
}

setup_path() {
  if echo "$PATH" | tr ':' '\n' | grep -qx "$INSTALL_DIR"; then
    return
  fi

  local shell_config=""
  case "${SHELL:-}" in
    */zsh)  shell_config="$HOME/.zshrc" ;;
    */bash) shell_config="$HOME/.bashrc" ;;
    */fish) shell_config="$HOME/.config/fish/config.fish" ;;
  esac

  local export_line="export PATH=\"${INSTALL_DIR}:\$PATH\""

  if [ -n "$shell_config" ] && [ -f "$shell_config" ]; then
    if ! grep -q "$INSTALL_DIR" "$shell_config" 2>/dev/null; then
      echo "" >> "$shell_config"
      echo "# DepVault CLI" >> "$shell_config"
      echo "$export_line" >> "$shell_config"
      info "Added ${INSTALL_DIR} to PATH in ${shell_config}"
    fi
  fi

  export PATH="${INSTALL_DIR}:$PATH"
}

main() {
  info "DepVault CLI Installer"
  echo ""

  local rid version
  rid="$(detect_platform)"
  version="$(get_latest_version)"

  download_and_install "$rid" "$version"
  setup_path

  echo ""
  info "DepVault CLI ${version} installed successfully!"
  echo ""
  echo "  Location: ${INSTALL_DIR}/${BINARY_NAME}"
  echo ""
  echo "  Run 'depvault --help' to get started."
  echo "  Run 'depvault login' to authenticate."
  echo ""

  if ! command -v depvault &>/dev/null; then
    echo "  NOTE: Restart your shell or run:"
    echo "    export PATH=\"${INSTALL_DIR}:\$PATH\""
    echo ""
  fi
}

main
