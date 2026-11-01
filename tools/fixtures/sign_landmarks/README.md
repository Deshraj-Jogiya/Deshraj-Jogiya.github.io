# MediaPipe in the browser vs Python

Seven hand photos from MediaPipe's own test images (google-ai-edge/mediapipe, Apache 2.0), saved as PNG so both sides read the
same pixels. `landmarks.json` holds what MediaPipe Python 1.1.1 (IMAGE mode, `word_signs/models/hand_landmarker.task`) found on each,
plus the 140 frame features `word_signs/features.py` computes from them.

Tolerance, set before testing: landmark x and y within 0.01 of the frame.

Result in Chrome on 2026-11-01, with `@mediapipe/tasks-vision@1.1.1` and the same `.task` file, through `lab/lab-signs.js`:

| Image | Handedness (Python / browser) | Largest landmark difference | Largest normalised-point difference | Largest hand-shape difference |
|---|---|---|---|---|
| fist | Right / Right | 1.60e-5 | 8.66e-5 | 4.82e-7 |
| left_hands | Left+Left / Left+Left | 2.41e-5 | 3.45e-5 | 4.01e-7 |
| pointing_up | Right / Right | 2.41e-5 | 1.21e-4 | 1.26e-7 |
| pointing_up_rotated | Right / Right | 1.83e-5 | 6.56e-5 | 4.70e-7 |
| right_hands | Right+Right / Right+Right | 2.39e-5 | 4.35e-5 | 4.06e-7 |
| thumb_up | Right / Right | 1.34e-5 | 9.38e-5 | 3.72e-7 |
| victory | Right / Right | 8.37e-6 | 8.67e-5 | 3.77e-7 |

All seven pass. This check needs a real browser (MediaPipe's WebAssembly build), so it is recorded here rather than run in CI;
`tools/check_lab_signs.js` runs the OpenCV.js and model checks on every deploy.
