"""Builds lab/data/signs/practice.json for the ASL demo's practice mode, and tools/fixtures/sign_track.json for its CI check.

Usage: python tools/build_sign_refs.py <path to Extending-STEM-across-ASL>

Practice mode compares a signer's frames, as they arrive, with the training clips of the sign they chose. Each training clip is
tracked with open-end dynamic time warping (DTW): at every new frame it finds the best match for "the frames so far" against
the start of the clip, so a slower or faster signer still lines up. Every sign gets a score per frame (the average distance over
the last WINDOW frames of its best-matching clip); the attempt is "off track" when the chosen sign is not among the K closest
signs for N frames in a row, and the flag points at the first of those frames.

K and N are chosen on the 156 training clips only (each clip compared with the other training clips, never with itself or with the clip a switch case borrows from), then
measured on the 58 held-out clips, which no part of this used: correct attempts, attempts that switch to another sign half-way
(the first 16 frames of one held-out clip followed by the last 16 of a clip of a different sign) and whole clips of a different
sign. Values are stored as int16 thousandths; every number here is computed on those stored values, so the browser reproduces it.
WLASL video is for research use only, so only hand points are stored, as in held_out.json.
"""
from __future__ import annotations

import base64
import itertools
import json
import os
import sys

import numpy as np

PER_HAND, WINDOW, CUT, START = 70, 6, 16, 6


def match_features(x: np.ndarray) -> np.ndarray:
    """(32, 140) model features -> (32, 128): each hand's 63 landmark values times its presence, and presence times 3."""
    out = []
    for slot in (0, 1):
        s = slot * PER_HAND
        pres = x[:, s + 63:s + 64]
        out += [x[:, s:s + 63] * pres, pres * 3.0]
    return np.concatenate(out, axis=1)


def quantise(a: np.ndarray) -> np.ndarray:
    return np.clip(np.round(a * 1000), -32768, 32767).astype(np.int16)


def track(user: np.ndarray, ref: np.ndarray) -> np.ndarray:
    """Open-end DTW of user frames against one reference clip; per user frame, the distance to the reference frame the best
    alignment of the frames so far ends on. Ties keep the first candidate (stay, diagonal, then reference-advance)."""
    C = np.sqrt(((user[:, None, :] - ref[None, :, :]) ** 2).mean(axis=2))
    T, n = C.shape
    D, L = np.empty(n), np.empty(n)
    D[0], L[0] = C[0, 0], 1
    for j in range(1, n):
        D[j], L[j] = D[j - 1] + C[0, j], L[j - 1] + 1
    loc = [C[0, int(np.argmin(D / L))]]
    for i in range(1, T):
        nD, nL = np.empty(n), np.empty(n)
        for j in range(n):
            bd, bl = D[j], L[j]
            if j:
                for d, l in ((D[j - 1], L[j - 1]), (nD[j - 1], nL[j - 1])):
                    if d / l < bd / bl:
                        bd, bl = d, l
            nD[j], nL[j] = bd + C[i, j], bl + 1
        D, L = nD, nL
        loc.append(C[i, int(np.argmin(D / L))])
    return np.array(loc)


def smooth(v: np.ndarray) -> np.ndarray:
    return np.array([v[max(0, i - WINDOW + 1):i + 1].mean() for i in range(len(v))])


def sign_scores(user, refs_by, n_signs):
    return np.array([np.min([smooth(track(user, r)) for r in refs_by[c]], axis=0) for c in range(n_signs)])


def rank_curve(scores, target):
    return (scores < scores[target][None, :]).sum(axis=0)


def flag_at(rk, K, N):
    run = 0
    for t in range(START, len(rk)):
        run = run + 1 if rk[t] >= K else 0
        if run >= N:
            return t - N + 1
    return None


def main(asl_repo: str) -> None:
    sys.path.insert(0, asl_repo)
    from word_signs.evaluate import load_features
    from word_signs.model import split

    X, y, vocab = load_features()
    X = np.round(X, 5)
    tr, te = split(y)
    n_signs = len(vocab)
    Q = np.stack([quantise(match_features(x.astype(np.float64))) for x in X])
    F = Q.astype(np.float64) / 1000
    tr_by = {c: [int(k) for k in tr if y[k] == c] for c in range(n_signs)}
    rng = np.random.default_rng(7)

    def collect(pool, refs_for):
        same, switch = [], []
        for i in pool:
            same.append(rank_curve(sign_scores(F[i], refs_for(i, None), n_signs), y[i]))
            for k in rng.choice([k for k in pool if y[k] != y[i]], 2, replace=False):
                u = np.concatenate([F[i][:CUT], F[k][CUT:]])
                switch.append((int(i), int(k), rank_curve(sign_scores(u, refs_for(i, k), n_signs), y[i])))
        return same, switch

    def rates(same, switch, K, N):
        false_alarm = float(np.mean([flag_at(r, K, N) is not None for r in same]))
        flags = [flag_at(r, K, N) for _, _, r in switch]
        caught = [f - CUT for f in flags if f is not None and f >= CUT]
        early = sum(f is not None and f < CUT for f in flags)
        return false_alarm, len(caught) / len(switch), early / len(switch), caught

    # a training clip is never its own reference, and neither is the clip a switch case borrows its second half from
    loo = lambda i, k: {c: [F[j] for j in tr_by[c] if j not in (i, k)] or [F[j] for j in tr_by[c]] for c in range(n_signs)}
    same_tr, switch_tr = collect(tr, loo)
    grid = []
    for K, N in itertools.product((4, 5, 6, 8, 10, 12, 15), (3, 4, 5, 6)):
        fa, caught, early, _ = rates(same_tr, switch_tr, K, N)
        grid.append({"K": K, "N": N, "false_alarm": fa, "switch_caught": caught, "flagged_early": early})
        print(f"train K={K} N={N}: correct attempts flagged {fa:.3f}, switches caught {caught:.3f}, flagged before the switch {early:.3f}")
    allowed = [g for g in grid if g["false_alarm"] <= 0.10] or grid
    pick = max(allowed, key=lambda g: (g["switch_caught"], -g["false_alarm"]))
    K, N = pick["K"], pick["N"]
    print("chosen", pick)

    refs_all = {c: [F[k] for k in tr_by[c]] for c in range(n_signs)}
    same_te, switch_te = collect(te, lambda i, k: refs_all)
    fa, caught, early, delays = rates(same_te, switch_te, K, N)
    wrong = []
    for i in te:
        scores = sign_scores(F[i], refs_all, n_signs)
        for c in rng.choice([c for c in range(n_signs) if c != y[i]], 3, replace=False):
            wrong.append(flag_at(rank_curve(scores, c), K, N) is not None)
    measured = {"correct_flagged": fa, "switch_caught": caught, "switch_flagged_early": early,
                "median_delay_frames": float(np.median(delays)) if delays else None, "wrong_sign_flagged": float(np.mean(wrong)),
                "n_correct": len(same_te), "n_switch": len(switch_te), "n_wrong": len(wrong)}
    print("held-out", measured)

    # the clip the player shows for each sign: the training clip with a hand visible in the most frames (a clip that "matches the
    # others best" tends to be one with few hands seen, since empty frames are close to everything); ties go to the first
    typical = {c: max(tr_by[c], key=lambda k: int(((Q[k][:, 63] > 0) | (Q[k][:, 127] > 0)).sum())) for c in range(n_signs)}

    refs = [{"sign": vocab[int(y[k])], "typical": bool(typical[int(y[k])] == k),
             "q": base64.b64encode(Q[k].astype("<i2").tobytes()).decode()} for k in tr]
    out = {"vocabulary": vocab, "frames": int(Q.shape[1]), "dims": int(Q.shape[2]), "scale": 1000, "window": WINDOW, "start": START,
           "K": K, "N": N, "cut": CUT, "chosen_on_training": pick, "held_out": measured, "refs": refs}
    with open(os.path.join("lab", "data", "signs", "practice.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, separators=(",", ":"))

    # CI fixture: 12 held-out switch cases with Python's rank curves and flag frames
    cases = [{"target": vocab[int(y[i])], "first": int(np.flatnonzero(te == i)[0]), "second": int(np.flatnonzero(te == k)[0]),
              "ranks": [int(v) for v in r], "flag": flag_at(r, K, N)} for i, k, r in switch_te[::10][:12]]
    with open(os.path.join("tools", "fixtures", "sign_track.json"), "w", encoding="utf-8") as f:
        json.dump({"cases": cases}, f, separators=(",", ":"))


if __name__ == "__main__":
    main(sys.argv[1])
