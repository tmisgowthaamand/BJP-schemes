// Local high-res scheme banner images (public/schemes/*.png).
// These are ~2120×742 (2.86:1 aspect) wide banners with the scheme artwork on
// the right half and plain space on the left for the desktop text overlay. On
// mobile we display them as a real <img> so the browser keeps the banner's
// aspect ratio instead of cropping with background-size. Vite handles hashing.
const RAW_LOCAL_SCHEME_IMAGES = {
  "ABHA": "/schemes/ABHA.png",
  "APY": "/schemes/APY.png",
  "Ayushman Bharat": "/schemes/Ayushman Bharat.png",
  "e-Shram": "/schemes/e-Shram.png",
  "Jan Dhan": "/schemes/Jan Dhan.png",
  "NSP Scholarship": "/schemes/NSP Scholarship.png",
  "PM Awas Yojana": "/schemes/PM Awas Yojana.png",
  "PM Fasal Bima": "/schemes/PM Fasal Bima.png",
  "PM Kisan Maan Dhan": "/schemes/PM Kisan Maan Dhan.png",
  "PM Kisan": "/schemes/PM Kisan.png",
  "PM Matru Vandana": "/schemes/PM Matru Vandana.png",
  "PM Mudra Kishor": "/schemes/PM Mudra Kishor.png",
  "PM Mudra Shishu": "/schemes/PM Mudra Shishu.png",
  "PM SVANidhi": "/schemes/PM SVANidhi.png",
  "PM Ujjwala": "/schemes/PM Ujjwala.png",
  "PM Vishwakarma": "/schemes/PM Vishwakarma.png",
  "PMJJBY": "/schemes/PMJJBY.png",
  "PMKVY": "/schemes/PMKVY.png",
  "PMSBY": "/schemes/PMSBY.png",
  "Stand Up India": "/schemes/Stand Up India.png",
  "Startup Seed Fund": "/schemes/Startup Seed Fund.png",
  "Sukanya Samridhi": "/schemes/Sukanya Samridhi.png",
  "Udyam": "/schemes/Udyam.png"
};

// No longer needed — local images are served at their native resolution and
// the browser picks the right size via the <img> tag or CSS background-size.
// Kept as a no-op so existing call sites don't break.
export const optimizeCloudinaryUrl = (url, width = 600) => url;

// Pre-optimized mapping (pass-through now that images are local)
export const CLOUDINARY_SCHEME_IMAGES = Object.entries(RAW_LOCAL_SCHEME_IMAGES).reduce((acc, [key, val]) => {
  acc[key] = val;
  return acc;
}, {});

// Vite bundles these images into the build with content-hashed filenames,
// so they are cached on first load. No manual preloading needed.
