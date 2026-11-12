# CyberFort Nexus architecture

Preliminary architecture diagram submitted by [Ben Dan](https://www.linkedin.com/in/bendan7/).

[View the diagram](https://bendan7.github.io/cyberfort-nexus-diagram/)

## Local development

Requires Node.js 22.12 or newer. Run `npm ci`, then `npm run dev`.

Edit `diagrams/overview.mmd` for content and `src/layout.js` for placement. The viewer supports SVG and PNG export.

## Publishing

The compiled website in docs is published through GitHub Pages. Rebuild with `npm run build -- --base=./` and update docs to publish changes.
