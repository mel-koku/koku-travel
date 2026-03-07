import { guide } from "./guide";
import { experience } from "./experience";
import { author } from "./author";
import { locationRef } from "./objects/locationRef";
import { tipCallout } from "./objects/tipCallout";
import { experienceHighlight } from "./objects/experienceHighlight";
import { imageGallery } from "./objects/imageGallery";
import { siteSettings } from "./siteSettings";
import { landingPage } from "./landingPage";
import { tripBuilderConfig } from "./tripBuilderConfig";
import { pagesContent } from "./pagesContent";
import { person } from "./person";
import { blogPost } from "./blogPost";

export const schemaTypes = [
  guide,
  experience,
  author,
  person,
  blogPost,
  locationRef,
  tipCallout,
  experienceHighlight,
  imageGallery,
  siteSettings,
  landingPage,
  tripBuilderConfig,
  pagesContent,
];
