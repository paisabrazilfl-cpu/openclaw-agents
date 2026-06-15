# 📊 Tabular ML — TabPFN-3

[TabPFN-3](https://huggingface.co/Prior-Labs/tabpfn_3) (Prior Labs) is a tabular
**foundation model** — it solves classification/regression on structured data in
a single forward pass. It is **not** a chat LLM, so it isn't in the model picker.
Instead it's wired as the `tabular_predict` **tool** for the Coder agent.

## How it works

1. Upload a CSV in chat (📎) and ask the **Coder** to predict a column.
2. The agent calls `tabular_predict` with the CSV, target column, and task.
3. The tool runs in the **E2B sandbox**: `pip install tabpfn`, split, fit
   `TabPFNClassifier`/`TabPFNRegressor`, predict, and return metrics.

Returns: accuracy (classification) or R²/MAE (regression), train/test sizes, and
sample predictions.

Also exposed directly at `POST /api/tabular` `{ csv, target?, task?, test_size? }`.

## Requirements & caveats

- **Needs `E2B_API_KEY`** (the sandbox) **and `TABPFN_TOKEN`** (Prior Labs
  license). One-time: register at https://ux.priorlabs.ai, accept the license,
  copy your key from https://ux.priorlabs.ai/account, and add `TABPFN_TOKEN` in
  Settings → Secrets Vault. The integration shows On once both are set.
- **Slow first run:** the sandbox installs `tabpfn` (pulls torch) and downloads
  weights — expect a minute or more. Keep datasets small/medium for the MVP.
- Non-numeric feature columns are factorized automatically; missing values → 0.
- **License: research / evaluation only — non-commercial.** Don't use outputs for
  production or commercial decisions. Commercial use needs Prior Labs' enterprise
  license (sales@priorlabs.ai).
