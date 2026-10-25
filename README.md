# Saksham Singh | Multi-page Portfolio

🌐 **Live Website:** [https://saakshhh.github.io/](https://saakshhh.github.io/)

A five-page personal portfolio. Each page opens on its own real-time, physically based 3D Formula 1 scene built with Three.js.

## Pages

| Page | Content | 3D scene |
| --- | --- | --- |
| `index.html` | Intro, tools marquee, links to every page | Studio shot of a detailed F1 car on a polished floor; drag to spin it |
| `about.html` | Background, education, skill groups | F1 steering wheel with live shift lights and dash; it steers with your cursor |
| `experience.html` | All five roles, achievements, tools, research links | Floodlit night circuit; the car laps with a broadcast-style camera and throws sparks on the straights |
| `projects.html` | All four projects with details and GitHub links | Exploded front corner (tyre, glowing carbon brake disc, caliper, duct, upright) |
| `contact.html` | Email, copy button, LinkedIn, GitHub | Start-lights gantry: five lights, lights out, the car launches. Click to rerun |

## Structure

```
assets/
  css/style.css        shared styles (night-race palette, layout, responsive rules)
  js/site.js           mobile menu, project-card tilt, copy email
  js/engine.js         renderer, tone mapping, bloom, environment lighting, render loop
  js/car.js            procedural F1 car (bodywork lofts, wings, halo, wheels, suspension)
  js/scenes/*.js       one scene per page
  vendor/              Three.js r160 (MIT), served locally so the site has no runtime CDN dependency
```

## Run locally

ES modules need a web server (opening the file directly will not load the 3D):

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000. Add `?still` to a URL to render a single frame without animating (handy for screenshots).

## Notes

- No build step or framework; GitHub Pages serves the files as-is.
- The render loop pauses when a scene is off-screen or the tab is hidden, and drops resolution automatically on slow devices.
- With "reduce motion" enabled, scenes render a single still frame and page animations are disabled.
- If WebGL is unavailable, pages fall back to a gradient background and all content remains available.
- Page-to-page navigation uses cross-document view transitions where the browser supports them.
