// TabPFN-3 (Prior-Labs) tabular prediction, run inside the E2B sandbox.
// TabPFN is a tabular foundation model — not a chat LLM — so it can't be a
// provider; instead it's a tool the Coder agent calls on a CSV. The sandbox
// pip-installs `tabpfn` and downloads weights on first use, so runs are slow.
//
// LICENSE: TabPFN-3 weights are research/eval only — non-commercial. Surface
// this to users; don't use outputs for production/commercial decisions.

import { runCode, sandboxConfigured } from "./sandbox";
import { env } from "./env";

export function tabularConfigured(): boolean {
  // Needs the E2B sandbox AND a Prior Labs license token to download weights.
  return sandboxConfigured() && Boolean(env.tabpfnToken);
}

const MAX_CSV_CHARS = 500_000;

export type TabularArgs = {
  csv: string;
  target?: string;
  task?: string;
  test_size?: number;
};

export async function runTabular(args: TabularArgs): Promise<string> {
  const csv = String(args.csv ?? "");
  if (!csv.trim()) return "Missing csv data (pass the dataset as CSV text including a header row).";
  if (csv.length > MAX_CSV_CHARS) return `CSV too large (${csv.length} chars). Use a smaller sample (<${MAX_CSV_CHARS}).`;

  const task = args.task === "regression" ? "regression" : "classification";
  const target = args.target ?? "";
  const testSize =
    typeof args.test_size === "number" && args.test_size > 0 && args.test_size < 1 ? args.test_size : 0.25;
  const b64 = Buffer.from(csv, "utf8").toString("base64");

  const script = `
import subprocess, sys, json, base64, io
# CPU-only torch keeps the sandbox under its disk limit (the default CUDA build
# is ~750MB and overflows the disk). --no-cache-dir frees space too.
subprocess.run([sys.executable,"-m","pip","install","-q","--no-cache-dir","--root-user-action=ignore","torch","--index-url","https://download.pytorch.org/whl/cpu"], check=False, capture_output=True)
subprocess.run([sys.executable,"-m","pip","install","-q","--no-cache-dir","--root-user-action=ignore","tabpfn","scikit-learn","pandas"], check=False, capture_output=True)
import os
os.environ["TABPFN_TOKEN"] = ${JSON.stringify(env.tabpfnToken ?? "")}
os.environ["TABPFN_ALLOW_CLI_INTERACTION"] = "False"
import pandas as pd
from sklearn.model_selection import train_test_split
df = pd.read_csv(io.StringIO(base64.b64decode(${JSON.stringify(b64)}).decode()))
target = ${JSON.stringify(target)} or df.columns[-1]
if target not in df.columns:
    print(json.dumps({"error": "target column '%s' not found" % target, "columns": list(df.columns)})); sys.exit()
y = df[target]
X = df.drop(columns=[target])
for c in X.columns:
    if X[c].dtype == object:
        X[c] = pd.factorize(X[c])[0]
X = X.fillna(0)
Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=${testSize}, random_state=42)
task = ${JSON.stringify(task)}
try:
    if task == "regression":
        from tabpfn import TabPFNRegressor
        from sklearn.metrics import r2_score, mean_absolute_error
        m = TabPFNRegressor(); m.fit(Xtr, ytr); p = m.predict(Xte)
        out = {"task":"regression","target":target,"n_train":int(len(Xtr)),"n_test":int(len(Xte)),
               "r2":round(float(r2_score(yte,p)),4),"mae":round(float(mean_absolute_error(yte,p)),4),
               "sample_predictions":[round(float(v),4) for v in list(p)[:10]]}
    else:
        from tabpfn import TabPFNClassifier
        from sklearn.metrics import accuracy_score
        m = TabPFNClassifier(); m.fit(Xtr, ytr); p = m.predict(Xte)
        out = {"task":"classification","target":target,"n_train":int(len(Xtr)),"n_test":int(len(Xte)),
               "accuracy":round(float(accuracy_score(yte,p)),4),
               "classes":[str(c) for c in sorted(set(map(str,y)))][:20],
               "sample_predictions":[str(v) for v in list(p)[:10]]}
    print(json.dumps(out))
except Exception as e:
    print(json.dumps({"error": str(e)[:600]}))
`;

  const r = await runCode(script, "python", { timeoutMs: 280_000 });
  if (r.error) return `TabPFN run error: ${r.error}\n${(r.stderr ?? "").slice(-400)}`;
  const out = (r.stdout || r.text || "").trim();
  return out
    ? `TabPFN-3 result (research/eval only):\n${out}`
    : `(no output)\n${(r.stderr ?? "").slice(-400)}`;
}
