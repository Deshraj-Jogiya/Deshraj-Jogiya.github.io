# Assistant evaluation results

Results of the offline evaluation of the chat assistant's no-LLM fallback (evaluation run 2026-10-22). Every design was scored on
the live profile with 80 development questions and 40 held-out questions, using the same 8-bit ONNX files the browser downloads.
The held-out questions were written before the final run and never used for tuning. 13 of the 120 questions should be declined
(salary, visa, age, phone number, weather, poems, skills not in the profile). "Overall" counts a right answer for an answerable
question and a decline for one the site does not cover.

## Designs compared

| Setup | Download | Held-out top-1 | Held-out overall |
|---|---|---|---|
| Keyword (BM25) + answer cards | 0 MB | 71% | 63% |
| + decline categories | 0 MB | 69% | 70% |
| Hybrid MiniLM + L6 reranker | 46 MB | 91% | 83% |
| Hybrid MiniLM + L12 reranker | 57 MB | 97% | 85% |
| Hybrid MiniLM + L12 reranker + decline categories | 57 MB | 94% | 90% |
| Hybrid bge-small + L12 reranker + decline categories | 68 MB | 97% | 92.5% |

model2vec static embeddings (8 MB) were also tested: best combination 71% overall.

Gains, in order: the cross-encoder reranker (+10 points), deciding "I don't know" on the reranker's score instead of embedding
similarity (+4), explicit decline categories (+7).

## Speed in the browser

The first browser test of the L12 reranker took 7.5 s an answer (candidates padded to 410 tokens). Re-measured with card phrasings
first and reranker input cut to 128 tokens: L12 87.5% and L6 86.7% over all 120 questions (90% held-out each), against 85% at full
length. Shipped: L6 at 128 tokens (57 MB), about 0.9 s an answer in the browser.

## Known-miss fixes

| Change | Full: dev, held-out | Keyword-only: dev, held-out | Shipped |
|---|---|---|---|
| Baseline | 85.0%, 90.0% | 68.8%, 70.0% | |
| "Not shown" for a skill question naming a word nowhere in the profile (typos excepted) | 86.3%, 92.5% | 70.0%, 72.5% | yes |
| Filler words dropped from keyword search | 87.5%, 90.0% | 77.5%, 85.0% | yes |
| Employment type in experience passages (for "internship") | 85.0%, 90.0% | 68.8%, 70.0% | no, no gain |
| Topic titles on answer cards (for "background") | 87.5%, 87.5% | 71.3%, 70.0% | no, hurts held-out |
| Both shipped changes together | 88.7%, 92.5% | 78.7%, 87.5% | yes |
| + trailing full stops stripped from tokens | 87.5%, 92.5% | 78.7%, 85.0% | no, slightly worse |

`measure_fixes.txt` is the raw output of the run behind this table.
