# Servier Medical Art assets

The images in this directory are adapted as generic anatomical foundations for
deterministic, structured annotations.

- `ear-cutaway.png`
  - Source page: https://smart.servier.com/smart_image/smart-ear/
  - Source image: https://smart.servier.com/wp-content/uploads/2016/10/Oreille_vide.png
- `inner-ear.png`
  - Source page: https://smart.servier.com/smart_image/inner-ear/
  - Source image: https://smart.servier.com/wp-content/uploads/2016/10/Oreille_interne.png
- `inner-ear-components/`
  - Official transparent source layers for the eardrum, malleus, incus,
    stapes, cochlea/vestibule, and auditory nerve.
  - Source images:
    `https://smart.servier.com/wp-content/uploads/2016/10/Oreille_interne_1.png`
    through
    `https://smart.servier.com/wp-content/uploads/2016/10/Oreille_interne_6.png`

Creator: Servier Medical Art by Servier.

License: [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/).

Modifications: source layers are positioned on their original 584 × 370 canvas
and deterministically clipped or omitted when structured findings document an
eroded or absent ossicle. Tympanic perforation and graft polygons are mapped to
the source TM contour rather than placed on a generic screen-space anchor. No
generative alteration is used.
