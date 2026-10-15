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
- Apply offscreen positioning only to an uncaptured staging parent, never the captured report, because computed logical insets can produce blank PDF and PNG exports.
- Query reports by exact date with pagination and render every player response separately, preserving each response's pain map instead of merging or dropping entries.
- Keep report-only visual summaries in shared staff report components, using container-based layouts and static SVG charts so fixed-width local exports stay readable at any viewport width.
- Set report SVG paint through explicit semantic-token fill/stroke attributes, since class-based SVG paint can disappear in local image exports; paginate oversized PDF sections at full readable width rather than shrinking entire sections.
