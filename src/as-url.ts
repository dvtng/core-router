export const asUrl = (urlLike: string | URL): URL => {
  if (urlLike instanceof URL) return urlLike;

  return new URL(urlLike, location.href);
};
