export type GenericParams = { [key: string]: string };

export type Match<T> = {
  params: T;
  url: URL;
};

export type Rule<T> = {
  path?: string;
  search?: { [name: string]: string };
  condition?: (match: Match<T>) => boolean;
};
