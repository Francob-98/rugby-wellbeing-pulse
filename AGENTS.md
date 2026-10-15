<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Reuse the shared `ClubBrand` and `ClubCrest` components for CBMM identity so the official crest remains consistent and restrained across screens.
- Keep shareable coach reports as browser-rendered authenticated views exported locally to PNG or PDF so player data is not sent to another service.
- Export reports from a fixed-width offscreen copy with embedded fonts; compose local PDFs with pdf-lib to avoid Worker package resolution and clipped browser-font layouts.
- Query reports by exact date with pagination and render every player response separately, preserving each response's pain map instead of merging or dropping entries.
