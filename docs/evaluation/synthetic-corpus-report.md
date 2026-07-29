# Synthetic Corpus Evaluation

Generated: 2026-07-29T03:48:26.003Z

## Provider Field Accuracy

| Provider | Matched fields | Total fields | Accuracy |
|---|---:|---:|---:|
| mock | 60 | 60 | 100.0% |
| rules | 60 | 60 | 100.0% |

## Rules Extractor Mismatches

- normal-ossicular-chain: none
- incus-long-process-erosion: none
- is-joint-discontinuity: none
- hero-otomimix-is-joint: none
- porp-reconstruction: none
- torp-reconstruction: none

## Adversarial Rules Checks

| Case | Passed | Extracted summary |
|---|---:|---|
| negated-incus-erosion | yes | {"laterality":"right","family":"tympanoplasty","incus":"not_documented","stapes":"not_documented","incudostapedialJoint":"not_documented","reconstructionType":"not_documented","reconstructionMaterial":"not_documented","ambiguityCount":0,"containsPossiblePhi":false,"suitableForRendering":true} |
| uncertain-incus-erosion | yes | {"laterality":"left","family":"tympanoplasty","incus":"not_documented","stapes":"not_documented","incudostapedialJoint":"not_documented","reconstructionType":"not_documented","reconstructionMaterial":"not_documented","ambiguityCount":1,"containsPossiblePhi":false,"suitableForRendering":true} |
| contradictory-stapes-porp | yes | {"laterality":"left","family":"tympanoplasty_with_ossiculoplasty","incus":"not_documented","stapes":"superstructure_absent","incudostapedialJoint":"not_documented","reconstructionType":"porp","reconstructionMaterial":"not_documented","ambiguityCount":2,"containsPossiblePhi":false,"suitableForRendering":true} |
| missing-laterality | yes | {"laterality":"not_documented","family":"tympanoplasty_with_ossiculoplasty","incus":"not_documented","stapes":"not_documented","incudostapedialJoint":"discontinuous","reconstructionType":"bone_cement_bridge","reconstructionMaterial":"hydroxyapatite_bone_cement","ambiguityCount":1,"containsPossiblePhi":false,"suitableForRendering":true} |
| unsupported-ossiculoplasty-inference | yes | {"laterality":"left","family":"ossiculoplasty","incus":"not_documented","stapes":"not_documented","incudostapedialJoint":"not_documented","reconstructionType":"not_documented","reconstructionMaterial":"not_documented","ambiguityCount":0,"containsPossiblePhi":false,"suitableForRendering":true} |
| abbreviation-heavy | yes | {"laterality":"right","family":"tympanoplasty","incus":"not_documented","stapes":"not_documented","incudostapedialJoint":"discontinuous","reconstructionType":"bone_cement_bridge","reconstructionMaterial":"hydroxyapatite_bone_cement","ambiguityCount":0,"containsPossiblePhi":false,"suitableForRendering":true} |
| unsupported-procedure | yes | {"laterality":"not_documented","family":"unsupported","incus":"not_documented","stapes":"not_documented","incudostapedialJoint":"not_documented","reconstructionType":"not_documented","reconstructionMaterial":"not_documented","ambiguityCount":1,"containsPossiblePhi":false,"suitableForRendering":false} |
| phi-like-input | yes | {"laterality":"left","family":"tympanoplasty","incus":"not_documented","stapes":"not_documented","incudostapedialJoint":"not_documented","reconstructionType":"not_documented","reconstructionMaterial":"not_documented","ambiguityCount":0,"containsPossiblePhi":true,"suitableForRendering":false} |

