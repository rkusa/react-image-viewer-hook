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
  useEffect,
  FunctionComponent,
  ComponentType,
} from "react";
import {
  ChildrenHandler,
  ImageViewerProps as InternalImageViewerProps,
} from "./ImageViewer";

const LazyImageViewer = lazy(() => import("./ImageViewer"));

export interface ImageViewerProps<T = void> {
  /**
   * The fallback that should be rendered while the image viewer is being loaded (the image viewer
   * is lazily loaded once it is first opened).
   */
  fallback?: ReactNode;

  /**
   * Replace the default buttons (close, next, prev) by providing your own children.
   */
  children?(handler: ChildrenHandler<T>): ReactNode;
}

export interface ImageOptsBase {
  /**
   * A map of mime types to source sets. Will be added as additional sources to the picture tag.
   */
  sources?: Record<string, string>;
}

export interface ImageOptsWithData<T> extends ImageOptsBase {
  /**
   * Custom data that is provided to `children` when custom buttons are rendered.
   */
  data: T;
}

export type ImageOpts<T = void> = T extends void
  ? ImageOptsBase
  : ImageOptsWithData<T>;

/**
 * Create an image viewer component and a `onClick` factory (`getOnClick`) used to add images to the
 * viewer and open it.
 */
export function useImageViewer<T = void>() {
  // Keep track of all images added via `getOnClick`. Re-create the list on each render.
  const images = useRef<Array<[string, ImageOpts<T> | undefined]>>([]);
  images.current = [];

  // Keep track of all dispatch functions used to open all `<ImageViewer />` instances.
  const setOpens = useRef<Set<Dispatch<SetStateAction<undefined | number>>>>(
    new Set()
  );

  // A wrapper around `LazyImageViewer` that connects it with the images of this hook.
  const ImageViewer = useCallback(function ImageViewer({
    fallback,
    children,
  }: ImageViewerProps<T>) {
    const [isOpen, setOpen] = useState<undefined | number>(undefined);
    useEffect(() => {
      setOpens.current.add(setOpen);
      return () => {
        setOpens.current.delete(setOpen);
      };
    }, [setOpen]);

    const handleClose = useCallback(() => setOpen(undefined), []);

    if (isOpen === undefined || typeof window === "undefined") {
      return null;
    }

    const Viewer = LazyImageViewer as ComponentType<
      InternalImageViewerProps<T>
    >;

    return (
      <Suspense fallback={fallback ?? null}>
        <Viewer
          images={images.current}
          onClose={handleClose}
          defaultIndex={isOpen}
          children={children}
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
    getOnClick(url?: string, opts?: ImageOpts<T>): MouseEventHandler {
      const index = images.current.length;
      if (url) {
        images.current.push([url, opts]);
      }

      return (e) => {
        e.preventDefault();

        for (const setOpen of setOpens.current) {
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
