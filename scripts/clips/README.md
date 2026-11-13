# Clips

Short looping clips for project pages (`shots[].video` in `src/content/projects/*.md`, shown by `components/Crt.astro`).
Each script drives the app with Playwright, captures device-resolution frames (`cast.mjs`) and encodes WebM + MP4 + a
poster JPEG into `public/shots/<project>/` (`encode.sh`, needs ffmpeg). Uses the Playwright install in `scripts/ux`.

    node scripts/clips/sentinel.mjs                      # public site
    node scripts/clips/habla-lab.mjs                     # local Habla Mucho: API :8765 + `npm --prefix frontend run dev`
    MIC=/path/reading.wav node scripts/clips/habla-game.mjs

    # Habla Mucho platform (teachers-assistant: scripts/run-platform.sh on :8770, Keycloak demo realm)
    TOKEN_OUT=/tmp/x node scripts/clips/habla-connect-ai.mjs   # creates a real MCP token for professor-demo
    node scripts/clips/habla-ai-draft.mjs                      # needs the draft "Mi primera presentación profesional",
                                                                # created with that token via the MCP SDK
    node scripts/clips/habla-flashcards.mjs                    # aluno-demo's own "La comida" deck (CSV import)
    node scripts/clips/habla-revoke-demo-tokens.mjs            # revoke the tokens the takes created
    vhs scripts/clips/mcp.tape                                 # scripted replay of the MCP calls (mcp-replay.sh)

The dev database is full of smoke-test leftovers; `habla-platform.mjs` hides them from JSON responses while
recording instead of deleting anything.

Keep clips 8–15 s, under ~700 KB, and look at the frames for private data before committing.
Terminal clips are recorded with VHS (`brew install vhs`) from the `.tape` files here.
