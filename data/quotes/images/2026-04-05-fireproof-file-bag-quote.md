# 防火风琴文件包报价图转写

- Expected image file: `data/quotes/images/2026-04-05-fireproof-file-bag-quote.png`
- Source type: image quote document
- Source status: original_image_pending_manual_copy

## Whole Order Sample

- Sample label: `fireproof_file_bag_quote_sheet`
- Document shape: two independent product lines on one image, not a bundle with shared companion parts
- Main observations:
- `防火风琴文件包飞机盒 | 365*270*53MM | 300克牛纸+AE加强芯+印黑色+裱+啤 | 1000 | ￥2.25`
- `防火风琴文件包双插盒 | 365*270*53MM | 300克牛纸+AE加强芯+印黑色+裱+啤 | 1000 | ￥2.15`

## Main Item Samples

### Line 1

- Product name: `防火风琴文件包飞机盒`
- Spec: `365*270*53MM`
- Material/process: `300克牛纸+AE加强芯+印黑色+裱+啤`
- Quantity: `1000`
- Unit price: `2.25`
- Packaging family candidate: `mailer_box`
- Recommended sample bucket: `mailer_box reinforced boundary sample`
- Decision use: reinforced corrugated path boundary, not a clean-subset quoted sample
- Why it matters: adds `AE加强芯` and `印黑色` to real factory terminology coverage

### Line 2

- Product name: `防火风琴文件包双插盒`
- Spec: `365*270*53MM`
- Material/process: `300克牛纸+AE加强芯+印黑色+裱+啤`
- Quantity: `1000`
- Unit price: `2.15`
- Packaging family candidate: `tuck_end_box`
- Recommended sample bucket: `tuck_end_box_reinforced_estimated_boundary_samples`
- Decision use: reinforced tuck-end boundary, not standard tuck-end clean subset
- Why not clean subset:
- `AE加强芯` is a reinforced path, not the cleanest standard double-insert path
- The process string does not explicitly show a gluing step, so the quoted-clean interpretation is still weaker than a textbook tuck-end sample

## Dictionary Candidates

- `AE加强芯` -> material recipe parsing
- `印黑色` -> print mode parsing
- `牛纸` -> face paper material normalization

## Next-Step Value

- Useful for reinforced tuck-end versus reinforced mailer boundary coverage
- Not the best next sample for standard tuck-end clean subset promotion