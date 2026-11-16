# Working agreement (UTCTC)

- `index.html` is the whole app and the only source. There is no build step. Edit it directly.
- Several people and agents commit here. Run `git pull --rebase` before you start and again before you push. If someone else changed `index.html` in between, merge their change in. Do not overwrite the file with an older copy.
- Keep each commit small and say what it changed in the message.
- Bump the cache number in `sw.js` whenever `index.html` changes, or phones keep the old version.
- Do not change the MUTCD / T9 numbers (spacing, taper, buffer) without the table they come from.
- Road data: the app asks the OpenStreetMap server and the Overpass servers at the same time. The "Test the map connection" button (Map tab, Road data) shows which one a phone can reach.
