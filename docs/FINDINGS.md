# Findings

Measured results behind the site's chat assistant. When the Gemini call fails, a fallback inside the browser answers from the
profile with no LLM. Every number below comes from [docs/assistant-eval/results.md](assistant-eval/results.md) and the raw run
output in [docs/assistant-eval/measure_fixes.txt](assistant-eval/measure_fixes.txt).

## Which no-LLM design answers recruiter questions best?

**How it was tested.** 120 recruiter-style questions (80 to tune on, 40 held out until the final run), including typos and 13
questions that should be declined, were run against each design using the exact 8-bit ONNX files the browser downloads.

| Setup | Download | Held-out top-1 | Held-out overall |
|---|---|---|---|
| Keyword (BM25) + answer cards | 0 MB | 71% | 63% |
| + decline categories | 0 MB | 69% | 70% |
| Hybrid MiniLM + L6 reranker | 46 MB | 91% | 83% |
| Hybrid MiniLM + L12 reranker | 57 MB | 97% | 85% |
| Hybrid MiniLM + L12 reranker + decline categories | 57 MB | 94% | 90% |
| Hybrid bge-small + L12 reranker + decline categories | 68 MB | 97% | 92.5% |

**Decision.** Hybrid retrieval (BM25 and embeddings fused by reciprocal rank fusion) with a cross-encoder reranker and explicit decline
categories. The biggest gains came from the reranker (+10 points), declining on the reranker's score instead of embedding similarity
(+4) and the decline categories (+7). A small LLM in the browser was ruled out before testing (500 MB+ download, WebGPU only, and
small models invent facts); model2vec static embeddings reached 71% overall.

**Skills shown.** Retrieval (BM25, sentence embeddings, reciprocal rank fusion), cross-encoder reranking, ONNX Runtime with 8-bit
models, held-out evaluation design.

## Can the reranker run fast enough in a browser?

**How it was tested.** The chosen design was timed in the browser, then re-measured with shorter reranker input and the smaller
reranker.

| Reranker | Input length | Accuracy, all 120 questions | Held-out | Time per answer |
|---|---|---|---|---|
| L12 | 410 tokens (padded) | 85% | | 7.5 s |
| L12 | 128 tokens | 87.5% | 90% | |
| L6 | 128 tokens | 86.7% | 90% | about 0.9 s |

**Decision.** Shipped the L6 reranker at 128 tokens (57 MB), loaded only after the first LLM failure: the same held-out score as L12
at a fraction of the wait.

**Skills shown.** transformers.js / ONNX Runtime Web, latency profiling, model size against accuracy trade-off.

## Which fixes for known misses were worth shipping?

**How it was tested.** Each candidate fix was measured alone on the development and held-out questions, in full mode and in
keyword-only mode (the answers shown while the models download), and shipped only if held-out improved.

| Change | Full: dev, held-out | Keyword-only: dev, held-out | Shipped |
|---|---|---|---|
| Baseline | 85.0%, 90.0% | 68.8%, 70.0% | |
| "Not shown" for a skill that appears nowhere in the profile | 86.3%, 92.5% | 70.0%, 72.5% | yes |
| Filler words dropped from keyword search | 87.5%, 90.0% | 77.5%, 85.0% | yes |
| Employment type in experience passages | 85.0%, 90.0% | 68.8%, 70.0% | no |
| Topic titles on answer cards | 87.5%, 87.5% | 71.3%, 70.0% | no |
| Both shipped changes together | 88.7%, 92.5% | 78.7%, 87.5% | yes |

**Decision.** The two changes that raised held-out accuracy shipped; the two that did not were dropped rather than tuned question by
question. Remaining held-out misses: "what has he been working on recently", the typo "tablaeu", and a restaurant question matched to
the profile's location.

**Skills shown.** Ablation testing, BM25 tuning, error analysis on a held-out set.
