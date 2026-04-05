# 开窗彩盒报价图转写

- Expected image file: `data/quotes/images/2026-04-05-window-color-box-quote.png`
- Source type: image quote document
- Source status: original_image_pending_manual_copy

## Whole Order Sample

- Sample label: `window_color_box_quote_sheet`
- Document shape: single main-item quote image
- Main observation:
- `开窗彩盒 | 21*17*31cm | 400克单铜+印四色+表面过光+裱+开窗贴0.2厚胶片23.5*14CM+啤+粘 | 500 | ￥5.00 | ￥2,500.00`

## Main Item Sample

- Product name: `开窗彩盒`
- Spec: `21*17*31cm`
- Material/process: `400克单铜+印四色+表面过光+裱+开窗贴0.2厚胶片23.5*14CM+啤+粘`
- Quantity: `500`
- Unit price: `5.00`
- Amount: `2500.00`
- Packaging family candidate: `window_box`
- Recommended sample bucket: `window_box_deferred_glossary_samples`
- Decision use: window-related boundary and glossary coverage
- Why it matters:
- provides explicit `0.2厚胶片`
- provides explicit window size `23.5*14CM`
- provides `表面过光` wording as a gloss-process synonym

## Dictionary Candidates

- `表面过光` -> gloss process parsing
- `开窗贴` -> window-feature parsing
- `0.2厚胶片` -> window film thickness parsing
- `23.5*14CM` -> window-size parsing

## Next-Step Value

- Strong for `window_box` boundary refinement and deferred-path evidence
- Not useful for standard tuck-end clean subset