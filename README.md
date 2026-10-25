# Saksham Singh | Multi-page Portfolio

🌐 **Live Website:** [https://saakshhh.github.io/](https://saakshhh.github.io/)

A five-page personal portfolio featuring interactive 3D visualizations, projects, research, and professional experience.


A five-page static portfolio made from the original single-page HTML file. Designed around the original night-racing theme, with separate interactive Three.js visualizations on each page.

## Pages

- `index.html`: Welcome page. Retains the original rotating 3D racetrack scene and animated tool marquee.
- `about.html`: Original Purdue education, background, and complete skill groups; 3D network sculpture.
- `experience.html`: All five original experience entries, dates, achievements, tools, and original research poster/publication links; expandable role cards and 3D career trajectory.
- `projects.html`: All four original projects, descriptions, bullet details, tools, and GitHub URLs; expandable project breakdowns, hover-tilting cards and 3D floating project sculptures.
- `contact.html`: Email, copy button, LinkedIn and GitHub; 3D signal beacon.

## Run locally

Open `index.html` in a modern browser with internet access. You can also run a static server from this directory:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

No Node.js build, React, or framework is needed. The website uses relative file links to work when hosted in a GitHub Pages repository or project subdirectory.

## Publish to GitHub Pages

1. Copy **the contents of this folder** into the root of the repository used for your website. Do not place `index.html` one directory too deep.
2. Commit and push to your GitHub repository.
3. Open the repository's **Settings → Pages**.
4. Choose **Deploy from a branch**, your intended branch (usually `main`), and the **`/(root)`** folder.
5. Visit the URL GitHub Pages provides.

## Edit the site

- Update text, project links, or dates in the relevant `.html` page.
- Update colors and layout in `assets/style.css`.
- Adjust 3D sculptures in `assets/scenes.js`.
- Adjust the original home racetrack in `assets/track.js`.
- General navigation, experience expansion, 3D hover tilt, and email copying live in `assets/site.js`.

The site loads the same Three.js r128 CDN version as the original file, along with Google Fonts. Internet access is needed to load those resources. The site remains navigable if 3D graphics are unsupported; decorative fallback shapes and all page content remain available. Animations pause when the relevant content is out of view, and the layout respects reduced-motion settings.
