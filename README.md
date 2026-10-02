# mtthw.xyz

A Hugo site with Markdown content, custom layouts, and Sass styles.

## Development in Docker

You need Git, `just`, and a running Docker installation with Compose. Hugo and
its Sass compiler run in the container; you do not need to install them on your
host. Run `just` to list the available commands and their descriptions.

From the repository root, start the development server:

```sh
just dev
```

Open [localhost:1313](http://localhost:1313). Edit files in your usual editor;
the repository is mounted into the container and Hugo rebuilds and reloads the
browser as you save. Drafts are included during development. File changes are
polled every second so live reload also works with Docker VM file sharing. The
development server renders pages in memory, keeping `public/` for production
builds.

With polling enabled, Hugo can retain deleted pages and report rebuild errors
until it restarts. After deleting or renaming content, clear the preview with:

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

The [Compose configuration](compose.dev.yaml) pins the official
[Hugo image](https://gohugo.io/installation/linux/#docker) to Hugo Extended
0.167.0 and an image digest. It includes Dart Sass 1.79.3, which Hugo uses via
`css.Sass`. Site styles use Sass modules (`@use`) instead of legacy `@import`.
There are no Git submodules to initialize.

## Site files

- `content/_index.md`: homepage text.
- `content/styleguide.md`: the Markdown style guide at `/styleguide/`, linked from
  the sidebar.
- `content/projects.md`: projects from the CV, linked from the main navigation.
- `content/publications.md`: research publications and preprints, linked from the main navigation.
- `content/contact/`: the contact page.
- `content/privacy.md`: the privacy policy at `/privacy/`, linked from the footer and sidebar.
- `layouts/home.html`: homepage layout.
- `layouts/`: page templates, with shared templates in `_partials/`.
- `assets/sass/`: site styles compiled with Dart Sass.
- `assets/css/vendor/`: the existing Normalize defaults as plain CSS, with
  their [license and provenance](assets/css/vendor/README.md).
- `static/`: Inter UI fonts and images.
- `config.toml`: site settings and the existing HTML, JSON, and RSS outputs.

There is no CMS or Node build step. Hugo compiles the Sass and copies the static
assets during the build.

Pages can set `pageLogo` to `site` or `adapt` for the built-in animated SVGs, or
to an image path (with `pageLogoAlt` for its alternative text) in front matter.
Pages without `pageLogo` show no image above the content. The homepage uses the
site logo; the ADAPT Projects page uses the ADAPT logo. Both logos render inline
through HTML partials that include SVG partials in `layouts/_partials/logo/`.
This lets their paths animate without JavaScript.

## Page navigation

The site works with ordinary HTML links. In browsers with JavaScript, a plain
click on an internal page link fetches that page's `index.json` and replaces the
main content without reloading the shared layout, styles, or fonts. The page
title, current navigation link, sidebar table of contents, URL, and browser
back/forward history update with the page. Modified clicks, external links,
same-page anchors, and links with query strings retain their usual browser
behaviour. If the JSON request fails, the browser loads the normal HTML page.

Hugo builds the HTML page and its JSON version from the same hero and content
partials. The JSON has a separate `hero` component; navigation keeps the
current hero when its key matches, so its animation does not restart. The small
script is in `static/js/navigation.js`; no JavaScript build tool or dependency
is needed.
