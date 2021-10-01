# React Image Viewer Hook (`useImageViewer`)

Image viewer (aka Lightbox) made for React. Images only (no videos, iframes, custom html, ...), with a focus on touch interactions (swipe between images, pinch to zoom, pan around, swipe down to dismiss). Internal heavy lifting is done by [`react-spring`](https://github.com/pmndrs/react-spring) and [`use-gesture`](https://github.com/pmndrs/use-gesture). Supports code-splitting by default (image viewer code is only loaded once first opened). The image viewer chunk comes at around 37kB gzipped.

Example:

```tsx
import { useImageViewer } from 'react-image-viewer-hook'
function Page() {
  const { getOnClick, ImageViewer } = useImageViewer()
  return (
    <>
      <a href="image1.jpg" onClick={getOnClick(image1.jpg)}><img src="image1_thumb.jpg" /></a>
      <a href="image2.jpg" onClick={getOnClick(image2.jpg)}><img src="image2_thumb.jpg" /></a>

      <ImageViewer /> {/* can be rendered wherever you want - like in a portal */}
    </>
  )
}
```

## License

[MIT](./LICENSE)
