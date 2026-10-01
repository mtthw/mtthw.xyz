# mtthw.xyz

A Hugo site with Markdown content, custom layouts, and Sass styles.

## Development in Docker

You need Git, `just`, and a running Docker installation with Compose. Hugo and
its Sass compiler run in the container; you do not need to install them on your
host. Run `just` to list the available commands and their descriptions.

From the repository root, initialize the pinned Normalize SCSS submodule once:

```sh
just setup
```

The public submodule uses HTTPS and does not require GitHub SSH access. Then
start the development server:

```sh
just dev
```

Open [localhost:1313](http://localhost:1313). Edit files in your usual editor;
the repository is mounted into the container and Hugo rebuilds and reloads the
browser as you save. Drafts are included during development. File changes are
polled every second so live reload also works with Docker VM file sharing. The
development server renders pages in memory, keeping `public/` for production
builds.

This pinned Hugo version can keep deleted pages in the preview until it
restarts. After deleting or renaming content, clear the preview with:

```sh
just restart
```

The first start downloads the image. Hugo's cache is kept in a named Docker
volume between runs. Press `Ctrl+C` to stop, or stop and remove the container
from another terminal with:

```sh
just down
```

Build the production site into the local `public/` directory with the same image:

```sh
just build
```

This build uses the production URL in `config.toml` and excludes drafts. Both
`public/` and Hugo's generated `resources/` directory are ignored by Git.

Use `just dev -d` to run in the background, `just logs` to follow the output,
and `just stop` to stop the server while keeping its container. The
[Justfile](Justfile) wraps `docker compose -f compose.dev.yaml`; set `COMPOSE`
in your environment or a local `.env` file to override the Compose command.

The [Compose configuration](compose.dev.yaml) pins Hugo Extended 0.125.7 using
the minimal [HugoMods image](https://docker.hugomods.com/docs/tags/#base). This
keeps the existing templates and LibSass pipeline in place; upgrading Hugo and
the site code is a separate step.

## Site files

- `content/`: posts and the contact page, including their existing front matter.
- `layouts/index.html`: homepage text.
- `layouts/`: page templates and shared navigation, logo, and sidebar.
- `assets/sass/`: site styles and the pinned Normalize SCSS submodule.
- `static/`: Inter UI fonts and images.
- `config.toml`: site settings and the existing HTML, JSON, and RSS outputs.

There is no CMS or Node build step. Hugo compiles the Sass and copies the static
assets during the build.
