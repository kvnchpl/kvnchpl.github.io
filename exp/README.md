# EXP ZINE

## Layout Templates

Use these classes on a container with `exp-layout`.
For split layouts, the first child will render in the left column and the second in the right. On smaller screens, split layouts collapse to a single column.

| Layout | Class | Use |
| --- | --- | --- |
| Split (1/1) | `exp-layout exp-layout--split` | Two-column 1/1 layout. |
| Uneven split (3/2) | `exp-layout exp-layout--split exp-layout--ratio-3-2` | Two-column 3/2 layout. |
| Uneven split (2/3) | `exp-layout exp-layout--split exp-layout--ratio-2-3` | Two-column 2/3 layout. |
| Stacked | `exp-layout exp-layout--stacked` | Single column; image(s) and text stack vertically. |
| Image grid | `exp-layout exp-layout--image-grid` | Multi-image grid; optional text can span full width below. |

## Basic Markup Pattern

```html
<section class="exp-layout exp-layout--split">
  <figure class="exp-image">
    <img src="../i/xxxxx.webp" />
  </figure>
  <div class="exp-block">
    <p>Text goes here…</p>
  </div>
</section>
```

## Notes

- Use `exp-image` for image containers and `exp-block` for text.
- Use `exp-layout--ratio-3-2` or `exp-layout--ratio-2-3` together with `exp-layout--split` for uneven split layouts.
- For split layouts, HTML order controls placement: first child is left column, second child is right column.
- Split layouts are full-height (`100dvh`) and go full-width.
- `exp-layout--image-grid` renders as 3 columns on desktop, 2 columns on medium screens, and 1 column on small screens.
- On smaller screens, split layouts collapse to a single column.
