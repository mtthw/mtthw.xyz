set dotenv-load

compose := env("COMPOSE", "docker compose")

# List the available commands and their descriptions.
default:
    @just --list

# Start the development server with live reload (use `just dev -d` to detach).
dev *args:
    {{ compose }} -f compose.dev.yaml up {{ args }}

# Build the production site into public/ using Docker.
build:
    {{ compose }} -f compose.dev.yaml run --rm hugo hugo --cleanDestinationDir

# Follow the development server logs.
logs:
    {{ compose }} -f compose.dev.yaml logs -f hugo

# Restart Hugo, clearing deleted pages from the preview.
restart:
    {{ compose }} -f compose.dev.yaml restart hugo

# Stop the development server without removing its container.
stop:
    {{ compose }} -f compose.dev.yaml stop

# Stop and remove the development container, keeping the cache volume.
down:
    {{ compose }} -f compose.dev.yaml down
