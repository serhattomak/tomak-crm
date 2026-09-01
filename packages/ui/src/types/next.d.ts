declare module "next/image" {
  import type * as React from "react";
  export interface StaticImageData {
    height: number;
    src: string;
    width: number;
  }
  export interface ImageProps
    extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> {
    alt: string;
    fill?: boolean;
    priority?: boolean;
    sizes?: string;
    src: string | StaticImageData;
  }
  const Image: React.ComponentType<ImageProps>;
  export default Image;
}

declare module "next/link" {
  import type * as React from "react";
  export interface LinkProps
    extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
    href: string;
  }
  const Link: React.ComponentType<LinkProps>;
  export default Link;
}
