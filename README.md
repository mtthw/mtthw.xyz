# mtthw.xyz

A Hugo site with Markdown content, custom layouts, and Sass styles.

## Local development

The styles use Hugo's Sass pipeline, which requires Hugo Extended, and the
Normalize SCSS Git submodule. Initialize the pinned submodule before building:

```sh
git submodule update --init --recursive
hugo server
```

The submodule URL uses GitHub SSH, so fetching it requires GitHub SSH access.
Build the static site into `public/` with:

```sh
hugo
```

No Hugo version is pinned. The templates and Sass pipeline are legacy code;
compatibility with current Hugo releases has not yet been verified. Dependency
and code upgrades are a separate next step.

## Site files

- `content/`: posts and the contact page, including their existing front matter.
- `layouts/index.html`: homepage text.
- `layouts/`: page templates and shared navigation, logo, and sidebar.
- `assets/sass/`: site styles and the pinned Normalize SCSS submodule.
- `static/`: Inter UI fonts and images.
- `config.toml`: site settings and the existing HTML, JSON, and RSS outputs.

There is no CMS or Node build step. Hugo compiles the Sass and copies the static
assets during the build.
