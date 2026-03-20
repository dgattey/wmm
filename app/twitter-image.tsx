import {
  createSocialOgImage,
  socialOgImageAlt,
  socialOgImageContentType,
  socialOgImageSize,
} from "@/lib/socialOgImage";

export const alt = socialOgImageAlt;
export const size = socialOgImageSize;
export const contentType = socialOgImageContentType;

export default async function Image() {
  return createSocialOgImage();
}
