import React, {
  Dispatch,
  MouseEventHandler,
  SetStateAction,
  useCallback,
  useRef,
  useState,
  lazy,
  ReactNode,
  Suspense,
} from "react";

const LazyImageViewer = lazy(() => import("./ImageViewer"));

export interface ImageViewerProps {
  /**
   * The fallback that should be rendered while the image viewer is being loaded (the image viewer
   * is lazily loaded once it is first opened).
   */
  fallback?: ReactNode;
}

/**
 * Create an image viewer component and a `onClick` factory (`getOnClick`) used to add images to the
 * viewer and open it.
 */
export function useImageViewer() {
  // Keep track of all images added via `getOnClick`. Re-create the list on each render.
  const images = useRef<Array<string>>([]);
  images.current.length = 0;

  // Keep track of all dispatch functions used to open all `<ImageViewer />` instances.
  const setOpens: Array<Dispatch<SetStateAction<undefined | number>>> = [];

  // A wrapper around `LazyImageViewer` that connects it with the images of this hook.
  const ImageViewer = useCallback(function ImageViewer({
    fallback,
  }: ImageViewerProps) {
    const [isOpen, setOpen] = useState<undefined | number>(undefined);
    setOpens.push(setOpen);

    const handleClose = useCallback(() => setOpen(undefined), []);

    if (isOpen === undefined || typeof window === "undefined") {
      return null;
    }

    return (
      <Suspense fallback={fallback ?? null}>
        <LazyImageViewer
          images={images.current}
          onClose={handleClose}
          defaultIndex={isOpen}
        />
      </Suspense>
    );
  },
  []);

  return {
    /**
     * Create an `onClick` event handler meant to add an image to viewer as well as opening the
     * the viewer once invoked.
     * @param url The URL of the image that should be added to the image viewer.
     */
    getOnClick(url?: string): MouseEventHandler {
      const index = images.current.length;
      if (url) {
        images.current.push(url);
      }

      return (e) => {
        e.preventDefault();

        for (const setOpen of setOpens) {
          setOpen(index);
        }
      };
    },

    /**
     * Render the image viewer. It will only actually render something if the viewer is opened. Can
     * be added everywhere you like including into portals.
     */
    ImageViewer,
  };
}
