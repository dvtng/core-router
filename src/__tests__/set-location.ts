export const setLocation = (href: string): void => {
  Object.defineProperty(global, "location", {
    get() {
      const url = new URL(href);
      return {
        origin: url.origin,
        href
      };
    }
  });
};
