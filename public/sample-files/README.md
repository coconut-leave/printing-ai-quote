# Sample PDF Files

Place development-only PDF samples in this directory.

Suggested usage:
- knowledge reference sample: `/sample-files/packaging-knowledge-reference.pdf`
- design file sample: `/sample-files/customer-design-sample.pdf`
- dieline PDF sample: `/sample-files/mailer-box-dieline-sample.pdf`

When you add a new PDF here, also register its metadata in `src/lib/sampleFiles.ts` so other modules can refer to a stable `fileName`, `fileUrl`, and `fileCategory`.