# 双插盒组件整单报价图转写

- Expected image file: `data/quotes/images/2026-04-05-tuck-end-bundle-quote.png`
- Source type: image quote document
- Source status: original_image_pending_manual_copy

## Whole Order Sample

- Sample label: `tuck_end_bundle_quote_sheet`
- Document shape: bundle quote with one main packaging item and three companion items
- Whole-order interpretation: bundle / kit-style quoted order, not a clean subset as a whole

Whole-order lines:

1. `双插盒 | 7*5*5CM | 350克白卡+正反四色+专印+正面过哑胶+啤+粘合 | 5000 | ￥0.55`
2. `内托 | 20*12CM左右 | WEB特种纸板 | 5000 | ￥0.32`
3. `说明书 | 20*5CM | 80克双铜纸+双面四色印+折3折 | 5000 | ￥0.20`
4. `透明贴纸 | 2.4*3cm的封口贴 | 透明贴纸 | 5000 | ￥0.03`

## Main Item Sample

### Line 1: 双插盒主件

- Product name: `双插盒`
- Spec: `7*5*5CM`
- Material/process: `350克白卡+正反四色+专印+正面过哑胶+啤+粘合`
- Quantity: `5000`
- Unit price: `0.55`
- Packaging family candidate: `tuck_end_box`
- Recommended sample bucket: `tuck_end_box_clean_subset_pending_review`
- Why it is valuable:
- explicit `双插盒`
- explicit `粘合`
- no window, no film, no hanging tab, no insert card in the main-item line itself
- no high-complexity UV/emboss process
- clean main-material path: `350克白卡`
- clear print path: `正反四色+专印`
- clear finishing path: `正面过哑胶+啤+粘合`
- Caution:
- this should be treated as a main-item pending-review candidate, not as an admitted clean subset or a whole-order clean subset

## Companion Item Samples

### Line 2: 内托

- Product name: `内托`
- Spec: `20*12CM左右`
- Material/process: `WEB特种纸板`
- Quantity: `5000`
- Unit price: `0.32`
- Recommended bucket: `bundle companion insert sample`
- Notes: not part of the standard tuck-end clean subset; should remain separated from the main-item sample

### Line 3: 说明书

- Product name: `说明书`
- Spec: `20*5CM`
- Material/process: `80克双铜纸+双面四色印+折3折`
- Quantity: `5000`
- Unit price: `0.20`
- Recommended bucket: `leaflet companion sample`
- Notes: flat-print companion component, not part of the tuck-end clean subset

### Line 4: 透明贴纸

- Product name: `透明贴纸`
- Spec: `2.4*3cm的封口贴`
- Material/process: `透明贴纸`
- Quantity: `5000`
- Unit price: `0.03`
- Recommended bucket: `seal_sticker companion sample`
- Notes: closure accessory, not part of the tuck-end clean subset

## Dictionary Candidates

- `正反四色` -> double-side four-color parsing
- `专印` -> spot-color / special print parsing
- `正面过哑胶` -> one-side matte lamination parsing
- `粘合` -> gluing synonym
- `WEB特种纸板` -> special insert-board / unresolved material dictionary candidate
- `封口贴` -> seal sticker / accessory boundary candidate

## Next-Step Value

- Best new candidate from the three images for standard tuck-end clean-subset progress
- Should be ingested as one main-item sample plus three companion-component samples, not as one undifferentiated bundle sample